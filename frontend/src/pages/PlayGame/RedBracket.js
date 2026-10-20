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

const ALL_RED_BRACKETS = [
    '00', '05', '11', '16', '22', '27', '33', '38', '44', '49',
    '50', '55', '61', '66', '72', '77', '83', '88', '94', '99',
];

export default function RedBracket({
    games_name,
    game_type,
    bidData,
    setBidData,
    submit_bid,
    loading = false,
    bottomInset = Platform.OS === 'android' ? 68 : 16,
}) {
    const [digitId, setDigitId] = useState('');
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

    // Add all 20 Red Brackets
    const handleAddAllBrackets = async () => {
        const ptsNum = Number(points);
        if (!ptsNum || ptsNum <= 0) {
            Dialog.show({ type: 'error', text1: 'Enter Points', text2: 'Please enter points first.' });
            return;
        }

        const phone = await AsyncStorage.getItem('phone');
        const newEntries = ALL_RED_BRACKETS.map((bracket) => {
            const openD = bracket.charAt(0);
            const closeD = bracket.charAt(1);
            return {
                points_action: ptsNum,
                points: ptsNum,
                phone_number: phone,
                game_name: games_name,
                game_type: game_type || 'Red Bracket',
                session: 'Open',
                open_pana: '',
                open_digit: openD,
                close_pana: '',
                close_digit: closeD,
                jodi: bracket,
            };
        });

        setBidData((prev) => {
            const existingBrackets = prev.map((b) => b.jodi || (b.open_digit + b.close_digit));
            const filtered = newEntries.filter((b) => !existingBrackets.includes(b.jodi));
            return [...prev, ...filtered];
        });

        Dialog.show({
            type: 'success',
            text1: 'Brackets Added',
            text2: `Added all 20 standard Red Brackets with ₹${ptsNum} each.`,
        });
    };

    // Add individual bracket
    const addSingleBracket = async (bVal) => {
        const ptsNum = Number(points);
        if (!ptsNum || ptsNum <= 0) {
            Dialog.show({ type: 'error', text1: 'Enter Points', text2: 'Please enter points first.' });
            return;
        }

        const target = bVal || digitId.trim();
        if (!target || target.length !== 2) {
            Dialog.show({ type: 'error', text1: 'Invalid Bracket', text2: 'Please enter a 2-digit bracket (e.g. 16, 27).' });
            return;
        }

        const phone = await AsyncStorage.getItem('phone');
        const openD = target.charAt(0);
        const closeD = target.charAt(1);

        const newBid = {
            points_action: ptsNum,
            points: ptsNum,
            phone_number: phone,
            game_name: games_name,
            game_type: game_type || 'Red Bracket',
            session: 'Open',
            open_pana: '',
            open_digit: openD,
            close_pana: '',
            close_digit: closeD,
            jodi: target,
        };

        setBidData((prev) => [...prev, newBid]);
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

                {/* Points Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>BID AMOUNT (₹)</Text>
                    <TextInput
                        value={points}
                        onChangeText={setPoints}
                        placeholder="Enter points (min 10)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={6}
                        style={styles.pointsInput}
                    />

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
                </View>

                {/* Quick All 20 Brackets Button */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>FAST ALL 20 RED BRACKETS</Text>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.allBracketsBtnTouch}
                        onPress={handleAddAllBrackets}
                    >
                        <LinearGradient
                            colors={['#DC2626', '#B91C1C', '#991B1B']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.allBracketsBtnGradient}
                        >
                            <Text style={styles.allBracketsBtnText}>
                                ⚡ ADD ALL 20 RED BRACKETS (₹{20 * (parseInt(points, 10) || 0)})
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Standard Bracket Pills Grid */}
                    <Text style={[styles.cardHeader, { marginTop: 16 }]}>TAP BRACKET TO ADD</Text>
                    <View style={styles.bracketGrid}>
                        {ALL_RED_BRACKETS.map((b) => (
                            <TouchableOpacity
                                key={b}
                                activeOpacity={0.75}
                                style={styles.bracketTile}
                                onPress={() => addSingleBracket(b)}
                            >
                                <Text style={styles.bracketTileText}>{b}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Manual 2-digit Input */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>OR ENTER CUSTOM 2-DIGIT BRACKET</Text>
                    <View style={styles.manualRow}>
                        <TextInput
                            value={digitId}
                            onChangeText={(txt) => setDigitId(txt.replace(/[^0-9]/g, ''))}
                            placeholder="Enter 2 digits (e.g. 55)"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            maxLength={2}
                            style={styles.manualInput}
                        />
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.manualAddBtn}
                            onPress={() => addSingleBracket(null)}
                        >
                            <Text style={styles.manualAddBtnText}>+ ADD</Text>
                        </TouchableOpacity>
                    </View>
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
                            <Text style={[styles.tableColHeader, { flex: 2 }]}>BRACKET</Text>
                            <Text style={[styles.tableColHeader, { flex: 1.5 }]}>POINTS</Text>
                            <Text style={[styles.tableColHeader, { flex: 1 }]}>SESSION</Text>
                            <Text style={[styles.tableColHeader, { flex: 0.8 }]}>DEL</Text>
                        </View>

                        {bidData.map((item, index) => {
                            const bracket = item.jodi || `${item.open_digit}${item.close_digit}`;
                            return (
                                <View key={index} style={styles.tableRow}>
                                    <View style={{ flex: 2 }}>
                                        <View style={styles.bracketBadge}>
                                            <Text style={styles.bracketBadgeText}>{bracket}</Text>
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
    allBracketsBtnTouch: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    allBracketsBtnGradient: {
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    allBracketsBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    bracketGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between',
    },
    bracketTile: {
        width: '18%',
        backgroundColor: '#061224',
        paddingVertical: 9,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1.2,
        borderColor: '#1E3E69',
    },
    bracketTileText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#EF4444',
        letterSpacing: 1,
    },
    manualRow: {
        flexDirection: 'row',
        gap: 10,
    },
    manualInput: {
        flex: 1,
        height: 48,
        backgroundColor: '#061224',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#1E3A5F',
        paddingHorizontal: 14,
        fontSize: 17,
        fontWeight: '900',
        color: '#EF4444',
        letterSpacing: 2,
    },
    manualAddBtn: {
        backgroundColor: '#E2B048',
        paddingHorizontal: 18,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    manualAddBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#061224',
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
    bracketBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
        alignSelf: 'flex-start',
    },
    bracketBadgeText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#EF4444',
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
