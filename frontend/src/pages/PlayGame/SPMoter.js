import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Dialog } from '../../context/DialogContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000];

export default function SPMotor({
    games_name,
    game_type,
    bidData,
    setBidData,
    submit_bid,
    loading = false,
    status = true,
    bottomInset = Platform.OS === 'android' ? 68 : 16,
}) {
    const [digitId, setDigitId] = useState('');
    const [points, setPoints] = useState('10');
    const [totalPoint, setTotalPoint] = useState(0);
    const [selectedSession, setSelectedSession] = useState(status ? 'Open' : 'Close');

    useEffect(() => {
        if (!status) setSelectedSession('Close');
    }, [status]);

    useEffect(() => {
        const total = bidData.reduce(
            (sum, item) => sum + (Number(item.points_action) || Number(item.points) || 0),
            0
        );
        setTotalPoint(total);
    }, [bidData]);

    const handleSessionChange = (sess) => {
        if (sess === 'Open' && !status) {
            Dialog.show({
                type: 'error',
                text1: 'Session Closed',
                text2: 'Open session is closed for this market. You can only place bids for Close session.',
            });
            return;
        }
        setSelectedSession(sess);
    };

    const handleQuickAmount = (amt) => {
        const cur = parseInt(points, 10) || 0;
        setPoints(String(cur + amt));
    };

    // Generate SP combinations
    const generateCombinations = (digitsStr, pts) => {
        const results = [];
        const sortedDigits = [...new Set(digitsStr.toString().split(''))].sort();

        if (sortedDigits.length < 3) return [];

        for (let i = 0; i < sortedDigits.length; i++) {
            for (let j = i + 1; j < sortedDigits.length; j++) {
                for (let k = j + 1; k < sortedDigits.length; k++) {
                    const pana = [sortedDigits[i], sortedDigits[j], sortedDigits[k]].sort().join('');
                    results.push({
                        pana,
                        point: pts,
                    });
                }
            }
        }
        return results;
    };

    // Preview combination count
    const previewCount = (() => {
        if (!digitId || digitId.length < 3) return 0;
        const unique = [...new Set(digitId.split(''))];
        const n = unique.length;
        if (n < 3) return 0;
        return (n * (n - 1) * (n - 2)) / 6;
    })();

    const add_bid = async () => {
        const phone = await AsyncStorage.getItem('phone');
        const ptsNum = Number(points);

        if (!ptsNum || ptsNum <= 0) {
            Dialog.show({ type: 'error', text1: 'Invalid Points', text2: 'Please enter valid points (min 10).' });
            return;
        }

        if (!digitId || digitId.length < 3) {
            Dialog.show({ type: 'error', text1: 'Enter Digits', text2: 'Please enter at least 3 unique digits (e.g. 12345).' });
            return;
        }

        const list = generateCombinations(digitId, ptsNum);
        if (list.length === 0) {
            Dialog.show({ type: 'error', text1: 'No Combinations', text2: 'Need at least 3 unique digits to generate SP Motor panas.' });
            return;
        }

        const newEntries = list.map((item) => ({
            points_action: ptsNum,
            points: ptsNum,
            phone_number: phone,
            game_name: games_name,
            game_type: game_type || 'SP Motor',
            session: selectedSession,
            open_pana: selectedSession === 'Open' ? item.pana : '',
            close_pana: selectedSession === 'Close' ? item.pana : '',
            open_digit: '',
            close_digit: '',
        }));

        setBidData((prev) => {
            const existingPanas = prev.map((b) => (selectedSession === 'Open' ? b.open_pana : b.close_pana));
            const filtered = newEntries.filter((b) => {
                const target = selectedSession === 'Open' ? b.open_pana : b.close_pana;
                return !existingPanas.includes(target);
            });
            return [...prev, ...filtered];
        });

        Dialog.show({
            type: 'success',
            text1: 'Motor Panas Added',
            text2: `Generated ${list.length} SP Panas from digits ${digitId}.`,
        });

        setDigitId('');
    };

    const delete_row = (index) => {
        setBidData((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 + bottomInset }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Session Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>SELECT SESSION</Text>
                    <View style={styles.sessionToggleRow}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[
                                styles.sessionToggleBtn,
                                selectedSession === 'Open' && styles.sessionToggleBtnActive,
                                !status && styles.sessionToggleBtnDisabled,
                            ]}
                            onPress={() => handleSessionChange('Open')}
                        >
                            <Text
                                style={[
                                    styles.sessionToggleText,
                                    selectedSession === 'Open' && styles.sessionToggleTextActive,
                                    !status && styles.sessionToggleTextDisabled,
                                ]}
                            >
                                🟢 OPEN BID
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[
                                styles.sessionToggleBtn,
                                selectedSession === 'Close' && styles.sessionToggleBtnActive,
                            ]}
                            onPress={() => handleSessionChange('Close')}
                        >
                            <Text
                                style={[
                                    styles.sessionToggleText,
                                    selectedSession === 'Close' && styles.sessionToggleTextActive,
                                ]}
                            >
                                🔒 CLOSE BID
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Motor Digits Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>SP MOTOR DIGITS (3 TO 8 DIGITS)</Text>
                    <TextInput
                        value={digitId}
                        onChangeText={(txt) => setDigitId(txt.replace(/[^0-9]/g, ''))}
                        placeholder="Enter digits (e.g. 12345)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={8}
                        style={styles.motorInput}
                    />

                    {previewCount > 0 && (
                        <View style={styles.previewStrip}>
                            <Text style={styles.previewStripText}>
                                ✨ Will generate <Text style={{ color: '#E2B048', fontWeight: '900' }}>{previewCount} SP Panas</Text> (Total: ₹{previewCount * (parseInt(points, 10) || 0)})
                            </Text>
                        </View>
                    )}

                    {/* Points Input */}
                    <Text style={[styles.cardHeader, { marginTop: 14 }]}>POINTS PER PANA (₹)</Text>
                    <TextInput
                        value={points}
                        onChangeText={setPoints}
                        placeholder="Enter points (min 10)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={6}
                        style={styles.pointsInput}
                    />

                    {/* Quick Amount Chips */}
                    <View style={styles.quickChipsRow}>
                        {QUICK_AMOUNTS.map((amt) => (
                            <TouchableOpacity
                                key={amt}
                                activeOpacity={0.8}
                                style={styles.quickChip}
                                onPress={() => handleQuickAmount(amt)}
                            >
                                <Text style={styles.quickChipText}>+{amt}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.clearChip}
                            onPress={() => setPoints('')}
                        >
                            <Text style={styles.clearChipText}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Add Motor Button */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.addBidBtnTouch}
                        onPress={add_bid}
                    >
                        <LinearGradient
                            colors={['#E2B048', '#C6922A', '#A27018']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.addBidBtnGradient}
                        >
                            <Text style={styles.addBidBtnText}>+ GENERATE & ADD MOTOR BIDS</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Pending Bids Table */}
                {bidData.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.bidsHeaderRow}>
                            <Text style={styles.cardHeader}>PENDING BIDS ({bidData.length})</Text>
                            <TouchableOpacity onPress={() => setBidData([])}>
                                <Text style={styles.clearAllText}>Clear All</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tableHeaderStrip}>
                            <Text style={[styles.tableColHeader, { flex: 2 }]}>PANA</Text>
                            <Text style={[styles.tableColHeader, { flex: 1.5 }]}>POINTS</Text>
                            <Text style={[styles.tableColHeader, { flex: 1 }]}>SESSION</Text>
                            <Text style={[styles.tableColHeader, { flex: 0.8 }]}>DEL</Text>
                        </View>

                        {bidData.map((item, index) => {
                            const pana = item.open_pana || item.close_pana;
                            return (
                                <View key={index} style={styles.tableRow}>
                                    <View style={{ flex: 2 }}>
                                        <View style={styles.panaBadge}>
                                            <Text style={styles.panaBadgeText}>{pana}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={styles.tablePointsText}>
                                            ₹{item.points_action || item.points}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sessionLabelText}>{item.session || 'Open'}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={{ flex: 0.8, alignItems: 'center' }}
                                        onPress={() => delete_row(index)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Text style={styles.deleteIconText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Sticky Bottom Action Bar */}
            {bidData.length > 0 && (
                <View style={[styles.bottomBar, { paddingBottom: bottomInset, paddingTop: 12 }]}>
                    <View style={styles.bottomCol}>
                        <Text style={styles.bottomLabel}>TOTAL BIDS</Text>
                        <Text style={styles.bottomVal}>{bidData.length}</Text>
                    </View>
                    <View style={styles.bottomCol}>
                        <Text style={styles.bottomLabel}>TOTAL POINTS</Text>
                        <Text style={styles.bottomValTotal}>₹{totalPoint}</Text>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.submitBtnTouch}
                        disabled={loading}
                        onPress={submit_bid}
                    >
                        <LinearGradient
                            colors={['#E2B048', '#C6922A', '#A27018']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitBtnGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#061224" size="small" />
                            ) : (
                                <Text style={styles.submitBtnText}>SUBMIT BIDS</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#061224',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 14,
        paddingBottom: 95,
    },
    card: {
        backgroundColor: '#0B1E38',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1A3358',
    },
    cardHeader: {
        fontSize: 12,
        fontWeight: '800',
        color: '#E2B048',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    sessionToggleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    sessionToggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#061224',
        borderWidth: 1.5,
        borderColor: '#1E3A5F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionToggleBtnActive: {
        borderColor: '#E2B048',
        backgroundColor: 'rgba(226, 176, 72, 0.12)',
    },
    sessionToggleBtnDisabled: {
        opacity: 0.45,
    },
    sessionToggleText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
    },
    sessionToggleTextActive: {
        color: '#E2B048',
        fontWeight: '800',
    },
    sessionToggleTextDisabled: {
        color: '#64748B',
    },
    motorInput: {
        height: 50,
        backgroundColor: '#061224',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#1E3A5F',
        paddingHorizontal: 14,
        fontSize: 18,
        fontWeight: '900',
        color: '#E2B048',
        letterSpacing: 2,
    },
    previewStrip: {
        backgroundColor: 'rgba(226, 176, 72, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(226, 176, 72, 0.25)',
    },
    previewStripText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#CBD5E1',
    },
    pointsInput: {
        height: 48,
        backgroundColor: '#061224',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#1E3A5F',
        paddingHorizontal: 14,
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    quickChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    quickChip: {
        backgroundColor: '#0F2A50',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1E4273',
    },
    quickChipText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#E2B048',
    },
    clearChip: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    clearChipText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#EF4444',
    },
    addBidBtnTouch: {
        marginTop: 16,
        borderRadius: 10,
        overflow: 'hidden',
    },
    addBidBtnGradient: {
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBidBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#061224',
        letterSpacing: 0.5,
    },
    bidsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    clearAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
    },
    tableHeaderStrip: {
        flexDirection: 'row',
        backgroundColor: '#061224',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 6,
    },
    tableColHeader: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.3,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#122644',
    },
    panaBadge: {
        backgroundColor: 'rgba(226, 176, 72, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(226, 176, 72, 0.35)',
        alignSelf: 'flex-start',
    },
    panaBadgeText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#E2B048',
        letterSpacing: 1,
    },
    tablePointsText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    sessionLabelText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#22C55E',
    },
    deleteIconText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#EF4444',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0B1E38',
        borderTopWidth: 1,
        borderTopColor: '#1A3358',
        paddingHorizontal: 16,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 16,
        zIndex: 999,
    },
    bottomCol: {
        alignItems: 'flex-start',
    },
    bottomLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.4,
    },
    bottomVal: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    bottomValTotal: {
        fontSize: 16,
        fontWeight: '900',
        color: '#E2B048',
    },
    submitBtnTouch: {
        borderRadius: 10,
        overflow: 'hidden',
        minWidth: 140,
    },
    submitBtnGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#061224',
        letterSpacing: 0.5,
    },
});
