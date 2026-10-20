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
import { gameList1, gameList2 } from '../../enums/panaList';
import { Dialog } from '../../context/DialogContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownCom from '../../component/DropDownCom';

const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000];

export default function DigitBasedJodi({
    games_name,
    game_type,
    bidData,
    setBidData,
    submit_bid,
    loading = false,
    bottomInset = Platform.OS === 'android' ? 68 : 16,
}) {
    const [leftDigit, setLeftDigit] = useState('');
    const [rightDigit, setRightDigit] = useState('');
    const [points, setPoints] = useState('10');
    const [totalPoint, setTotalPoint] = useState(0);

    useEffect(() => {
        const total = bidData.reduce(
            (sum, item) => sum + (Number(item.points_action) || Number(item.points) || 0),
            0
        );
        setTotalPoint(total);
    }, [bidData]);

    const handleQuickAmount = (amt) => {
        const cur = parseInt(points, 10) || 0;
        setPoints(String(cur + amt));
    };

    const matchingJodis = gameList2.filter((item) => {
        const lMatch = leftDigit !== '' && item.label.startsWith(leftDigit);
        const rMatch = rightDigit !== '' && item.label.endsWith(rightDigit);
        if (leftDigit !== '' && rightDigit !== '') {
            return lMatch || rMatch;
        }
        return lMatch || rMatch;
    });

    const add_bid = async () => {
        const phone = await AsyncStorage.getItem('phone');
        const ptsNum = Number(points);

        if (!ptsNum || ptsNum <= 0) {
            Dialog.show({ type: 'error', text1: 'Invalid Points', text2: 'Please enter valid points (min 10).' });
            return;
        }

        if (leftDigit === '' && rightDigit === '') {
            Dialog.show({ type: 'error', text1: 'Enter Digit', text2: 'Please enter Left Digit, Right Digit, or both.' });
            return;
        }

        if (matchingJodis.length === 0) {
            Dialog.show({ type: 'error', text1: 'No Matches', text2: 'No matching Jodis found for the entered digits.' });
            return;
        }

        const newEntries = matchingJodis.map((item) => {
            const pair = item.label;
            return {
                points_action: ptsNum,
                points: ptsNum,
                phone_number: phone,
                game_name: games_name,
                game_type: game_type || 'Digit Based Jodi',
                session: 'Open',
                open_pana: '',
                close_pana: '',
                open_digit: pair.charAt(0),
                close_digit: pair.charAt(1),
                jodi: pair,
            };
        });

        setBidData((prev) => {
            const existingJodis = prev.map((b) => b.jodi || (b.open_digit + b.close_digit));
            const filtered = newEntries.filter((b) => !existingJodis.includes(b.jodi));
            return [...prev, ...filtered];
        });

        Dialog.show({
            type: 'success',
            text1: 'Jodis Added',
            text2: `Added ${matchingJodis.length} matching Jodis with ₹${ptsNum} each.`,
        });

        setLeftDigit('');
        setRightDigit('');
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
                {/* Session Notice Card */}
                <View style={styles.card}>
                    <View style={styles.sessionNoticeRow}>
                        <View style={styles.sessionPill}>
                            <View style={styles.sessionDot} />
                            <Text style={styles.sessionPillText}>OPEN SESSION ONLY</Text>
                        </View>
                        <Text style={styles.marketNameText}>{games_name}</Text>
                    </View>
                </View>

                {/* Left / Right Digit Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>SEARCH & SELECT LEFT OR RIGHT DIGIT</Text>
                    <View style={styles.digitRow}>
                        <View style={styles.digitCol}>
                            <Text style={styles.inputLabel}>Left Digit (0-9):</Text>
                            <DropDownCom
                                width="100%"
                                backgroundColor="#061224"
                                borderColor="#1E3A5F"
                                search={true}
                                name={''}
                                placeholder={'Left (0-9)'}
                                value={leftDigit}
                                setName={() => {}}
                                setId={(val) => setLeftDigit(val ? String(val) : '')}
                                list={gameList1}
                                onPress={(val) => setLeftDigit(val ? String(val) : '')}
                                bgType={'White'}
                                id={leftDigit}
                            />
                        </View>

                        <View style={styles.digitCol}>
                            <Text style={styles.inputLabel}>Right Digit (0-9):</Text>
                            <DropDownCom
                                width="100%"
                                backgroundColor="#061224"
                                borderColor="#1E3A5F"
                                search={true}
                                name={''}
                                placeholder={'Right (0-9)'}
                                value={rightDigit}
                                setName={() => {}}
                                setId={(val) => setRightDigit(val ? String(val) : '')}
                                list={gameList1}
                                onPress={(val) => setRightDigit(val ? String(val) : '')}
                                bgType={'White'}
                                id={rightDigit}
                            />
                        </View>
                    </View>

                    {matchingJodis.length > 0 && (
                        <View style={styles.previewStrip}>
                            <Text style={styles.previewTitle}>
                                ✨ Matches {matchingJodis.length} Jodis: {matchingJodis.slice(0, 10).map((m) => m.label).join(', ')}{matchingJodis.length > 10 ? '...' : ''}
                            </Text>
                        </View>
                    )}

                    {/* Points Input */}
                    <Text style={[styles.cardHeader, { marginTop: 14 }]}>POINTS PER JODI (₹)</Text>
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

                    {/* Add Bid Button */}
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
                            <Text style={styles.addBidBtnText}>+ ADD MATCHING JODIS</Text>
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
                            <Text style={[styles.tableColHeader, { flex: 2 }]}>JODI</Text>
                            <Text style={[styles.tableColHeader, { flex: 1.5 }]}>POINTS</Text>
                            <Text style={[styles.tableColHeader, { flex: 1 }]}>SESSION</Text>
                            <Text style={[styles.tableColHeader, { flex: 0.8 }]}>DEL</Text>
                        </View>

                        {bidData.map((item, index) => {
                            const jodi = item.jodi || `${item.open_digit}${item.close_digit}`;
                            return (
                                <View key={index} style={styles.tableRow}>
                                    <View style={{ flex: 2 }}>
                                        <View style={styles.jodiBadge}>
                                            <Text style={styles.jodiBadgeText}>{jodi}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={styles.tablePointsText}>
                                            ₹{item.points_action || item.points}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sessionLabelText}>Open</Text>
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
    sessionNoticeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sessionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    sessionDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#22C55E',
        marginRight: 6,
    },
    sessionPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#22C55E',
        letterSpacing: 0.3,
    },
    marketNameText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    cardHeader: {
        fontSize: 12,
        fontWeight: '800',
        color: '#E2B048',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    digitRow: {
        flexDirection: 'row',
        gap: 12,
    },
    digitCol: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#CBD5E1',
        marginBottom: 6,
    },
    digitInput: {
        height: 48,
        backgroundColor: '#061224',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#1E3A5F',
        paddingHorizontal: 14,
        fontSize: 18,
        fontWeight: '900',
        color: '#E2B048',
        textAlign: 'center',
    },
    previewStrip: {
        backgroundColor: 'rgba(226, 176, 72, 0.08)',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(226, 176, 72, 0.25)',
    },
    previewTitle: {
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
    jodiBadge: {
        backgroundColor: 'rgba(226, 176, 72, 0.15)',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(226, 176, 72, 0.35)',
        alignSelf: 'flex-start',
    },
    jodiBadgeText: {
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
