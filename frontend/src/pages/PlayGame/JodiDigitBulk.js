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
import DropDownCom from '../../component/DropDownCom';
import { gameList2 } from '../../enums/panaList';
import { Dialog } from '../../context/DialogContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000];

export default function JodiDigitBulk({
    games_name,
    game_type,
    bidData,
    setBidData,
    submit_bid,
    loading = false,
    bottomInset = Platform.OS === 'android' ? 68 : 16,
}) {
    const [digitId, setDigitId] = useState('');
    const [digitName, setDigitName] = useState('');
    const [manualJodi, setManualJodi] = useState('');
    const [points, setPoints] = useState('10');
    const [totalPoint, setTotalPoint] = useState(0);

    // Calculate total points whenever bidData changes
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

    // Add new Jodi bid
    const add_bid = async (selectedVal) => {
        const phone = await AsyncStorage.getItem('phone');
        const ptsNum = Number(points);

        if (!ptsNum || isNaN(ptsNum) || ptsNum <= 0) {
            Dialog.show({ type: 'error', text1: 'Invalid Points', text2: 'Please enter a valid point value (min 10).' });
            return;
        }

        const jodiTarget = selectedVal || manualJodi.trim() || digitId;
        if (!jodiTarget || jodiTarget.length !== 2) {
            Dialog.show({ type: 'error', text1: 'Invalid Jodi', text2: 'Please enter or select a 2-digit Jodi (e.g. 05, 42).' });
            return;
        }

        const openD = jodiTarget.charAt(0);
        const closeD = jodiTarget.charAt(1);

        const newBid = {
            points_action: ptsNum,
            points: ptsNum,
            phone_number: phone,
            game_name: games_name,
            game_type: game_type || 'Jodi Digit',
            session: 'Open',
            open_pana: '',
            open_digit: openD,
            close_pana: '',
            close_digit: closeD,
            jodi: jodiTarget,
        };

        setBidData((prev) => [...prev, newBid]);
        setManualJodi('');
        setDigitId('');
        setDigitName('');
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

                {/* Jodi Selection Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>SELECT OR ENTER JODI DIGIT</Text>

                    {/* Direct 2-digit Manual Input */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Enter 2 Digits directly (00-99):</Text>
                        <TextInput
                            value={manualJodi}
                            onChangeText={setManualJodi}
                            placeholder="e.g. 25, 68, 00"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            maxLength={2}
                            style={styles.jodiInput}
                        />
                    </View>

                    <Text style={styles.orDividerText}>— OR SELECT FROM LIST —</Text>

                    {/* Dropdown list for selection */}
                    <DropDownCom
                        width="100%"
                        backgroundColor="#061224"
                        borderColor="#1E3A5F"
                        search={true}
                        name={''}
                        placeholder={'Select Jodi from List (00-99)'}
                        value={digitId}
                        setName={setDigitName}
                        setId={(val) => {
                            setDigitId(val);
                            if (val && val.length === 2) {
                                add_bid(val);
                            }
                        }}
                        list={gameList2}
                        onPress={(e) => {
                            setDigitId(e);
                            if (e && e.length === 2) {
                                add_bid(e);
                            }
                        }}
                        bgType={'White'}
                        id={digitId}
                    />

                    {/* Points Input */}
                    <View style={[styles.inputWrapper, { marginTop: 14 }]}>
                        <Text style={styles.inputLabel}>Bid Points / Amount (₹):</Text>
                        <TextInput
                            value={points}
                            onChangeText={setPoints}
                            placeholder="Enter points (min 10)"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            maxLength={6}
                            style={styles.pointsInput}
                        />
                    </View>

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
                        onPress={() => add_bid(null)}
                    >
                        <LinearGradient
                            colors={['#E2B048', '#C6922A', '#A27018']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.addBidBtnGradient}
                        >
                            <Text style={styles.addBidBtnText}>+ ADD JODI BID</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Pending Bids Table */}
                {bidData.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.bidsHeaderRow}>
                            <Text style={styles.cardHeader}>
                                PENDING BIDS ({bidData.length})
                            </Text>
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
                            const jodiDisplay =
                                item.jodi || (item.open_digit && item.close_digit ? `${item.open_digit}${item.close_digit}` : item.open_digit);

                            return (
                                <View key={index} style={styles.tableRow}>
                                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={styles.jodiBadge}>
                                            <Text style={styles.jodiBadgeText}>{jodiDisplay}</Text>
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
    inputWrapper: {
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#CBD5E1',
        marginBottom: 6,
    },
    jodiInput: {
        height: 48,
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
    orDividerText: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        marginVertical: 10,
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
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(226, 176, 72, 0.35)',
    },
    jodiBadgeText: {
        fontSize: 15,
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
