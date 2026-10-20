import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
    FlatList,
    TextInput,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Header from '../../Widget/Header';
import DropDownCom from '../../component/DropDownCom';
import { gameList1, gameList2, gameList3, gameList4, gameList5 } from '../../enums/panaList';
import LargeTextInput from '../../component/TextInput/LargeTextInput';
import icon from '../../constants/image';
import { Dialog } from '../../context/DialogContext';
import { base } from '../../config/appConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postDataJsonWithAuth } from '../../services/Ops';
import { get_wallet } from '../../services/User';
import { useLanguage } from '../../context/LanguageContext';
import { BackArrow } from '../../component/MatkaIcons';

// Bulk Panel Components
import SingleDigitBulk from './SingleDigitBulk';
import JodiDigitBulk from './JodiDigitBulk';
import SinglePanaBulk from './SinglePanaBulk';
import DoublePanaBulk from './DoublePanaBulk';
import SPMotor from './SPMoter';
import DPMotor from './DPMotor';
import GroupJodi from './GroupJodi';
import SpDpTp from './SpDpTp';
import OddEven from './OddEven';
import RedBracket from './RedBracket';
import DigitBasedJodi from './DigitBasedJodi';
import PanelGroup from './PanelGroup';
import TwoDigitPanel from './TwoDigitPanel';

const { width } = Dimensions.get('window');

// Normalize game type name
const normalizeGameTypeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    return String(name).trim().replace(/\s+/g, ' ').replace(/Panna/g, 'Pana');
};

// Map game type name to bid panel
const GAME_TYPE_TO_PANEL = {
    'Single Digit': 'SingleDigitBulk',
    'Single': 'SingleDigitBulk',
    'Jodi Digit': 'JodiDigitBulk',
    'Jodi': 'JodiDigitBulk',
    'Single Pana': 'SinglePanaBulk',
    'SP': 'SinglePanaBulk',
    'Double Pana': 'DoublePanaBulk',
    'DP': 'DoublePanaBulk',
    'Triple Pana': 'SpDpTp',
    'TP': 'SpDpTp',
    'TP Motor': 'SpDpTp',
    'Cycle Pana': 'SinglePanaBulk',
    'Family Pana': 'PanelGroup',
    'Motor Pana': 'SPMotor',
    'sp moter': 'SPMotor',
    'dp moter': 'DPMotor',
    'SP Motor': 'SPMotor',
    'DP Motor': 'DPMotor',
    'Group Jodi': 'GroupJodi',
    'GroupJodi': 'GroupJodi',
    'Odd Even': 'OddEven',
    'Red Bracket': 'RedBracket',
    'Digit Based Jodi': 'DigitBasedJodi',
    'Panel Group': 'PanelGroup',
    'Two Digit': 'TwoDigitPanel',
};

const ID_TO_PANEL = {
    '8': 'SingleDigitBulk',
    '9': 'JodiDigitBulk',
    '10': 'SinglePanaBulk',
    '11': 'DoublePanaBulk',
    '12': 'SPMotor',
    '13': 'DPMotor',
    '14': 'GroupJodi',
    '15': 'SpDpTp',
    '16': 'OddEven',
    '17': 'RedBracket',
    '18': 'DigitBasedJodi',
    '20': 'PanelGroup',
    '21': 'TwoDigitPanel',
};

const getBidPanelKey = (details) => {
    if (!details) return null;
    const name = normalizeGameTypeName(details.name);
    return GAME_TYPE_TO_PANEL[name] || (details.id != null && ID_TO_PANEL[String(details.id)]) || null;
};

const isFullSangam = (d) => d && (normalizeGameTypeName(d.name) === 'Full Sangam' || String(d.id) === '7');
const isHalfSangam = (d) => d && (normalizeGameTypeName(d.name) === 'Half Sangam' || String(d.id) === '6');

const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000];

export default function BidScreen(props) {
    const insets = useSafeAreaInsets();
    const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom + 12, 68) : (insets.bottom > 0 ? insets.bottom + 12 : 16);
    const { strings } = useLanguage();
    const { details = {}, selectItem = {}, status = true } = props.route?.params || {};

    const [walletBalance, setWalletBalance] = useState(0);
    const [digitName, setDigitName] = useState('');
    const [digitId, setDigitId] = useState('');
    const [closePanaName, setClosePanaName] = useState('');
    const [closePanaId, setClosePanaId] = useState('');
    const [openPanaName, setOpenPanaName] = useState('');
    const [openPanaId, setOpenPanaId] = useState('');
    const [closeDigitName, setCloseDigitName] = useState('');
    const [closeDigitId, setCloseDigitId] = useState('');
    const [points, setPoints] = useState('');
    const [loading, setLoading] = useState(false);
    const [bidData, setBidData] = useState([]);
    const [totalPoint, setTotalPoint] = useState(0);

    // Session state: status === true means open session is active
    const [selectedSession, setSelectedSession] = useState(status ? 'Open' : 'Close');

    // Half Sangam type switcher: 'T1' (Open Digit + Close Pana) or 'T2' (Open Pana + Close Digit)
    const [halfSangamType, setHalfSangamType] = useState('T1');

    // Fetch user wallet balance
    const fetchWallet = useCallback(async () => {
        try {
            const bal = await get_wallet();
            setWalletBalance(Number(bal) || 0);
        } catch (e) {
            console.log('Error fetching wallet in BidScreen:', e);
        }
    }, []);

    useEffect(() => {
        fetchWallet();
        if (!status) {
            setSelectedSession('Close');
        }
    }, [fetchWallet, status]);

    // Update total points whenever bidData changes
    useEffect(() => {
        const total = bidData.reduce((sum, item) => sum + (Number(item.points_action) || Number(item.points) || 0), 0);
        setTotalPoint(total);
    }, [bidData]);

    const _goBack = () => {
        props.navigation.goBack();
    };

    const isOpenOnly = isFullSangam(details) || isHalfSangam(details) ||
        normalizeGameTypeName(details.name) === 'Jodi Digit' ||
        normalizeGameTypeName(details.name) === 'Jodi' ||
        normalizeGameTypeName(details.name) === 'Red Bracket';

    const handleSessionSelect = (sess) => {
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

    const digitListForForm = (() => {
        const n = normalizeGameTypeName(details?.name);
        if (n === 'Jodi Digit' || n === 'Jodi') return gameList2;
        if (n === 'Single Pana' || n === 'SP' || n === 'Cycle Pana') return gameList3;
        if (n === 'Double Pana' || n === 'DP') return gameList4;
        if (n === 'Triple Pana' || n === 'TP') return gameList5;
        if (details?.id == '2') return gameList2;
        if (details?.id == '3') return gameList3;
        if (details?.id == '4') return gameList4;
        if (details?.id == '5') return gameList5;
        return gameList1;
    })();

    const add_bid = async () => {
        const phone = await AsyncStorage.getItem('phone');
        const ptsNum = Number(points);
        if (points == null || String(points).trim() === '' || isNaN(ptsNum) || ptsNum <= 0) {
            Dialog.show({ type: 'error', text1: 'Invalid Points', text2: 'Please enter a valid point value.' });
            return;
        }

        let openDigit = '';
        let openPana = '';
        let closeDigit = '';
        let closePana = '';

        if (isFullSangam(details)) {
            if (!digitId || !closePanaId) {
                Dialog.show({ type: 'error', text1: 'Selection Missing', text2: 'Please select both Open Pana and Close Pana.' });
                return;
            }
            openPana = String(digitId);
            closePana = String(closePanaId);
        } else if (isHalfSangam(details)) {
            if (halfSangamType === 'T1') {
                if (!digitId || !closePanaId) {
                    Dialog.show({ type: 'error', text1: 'Selection Missing', text2: 'Please select Open Digit and Close Pana.' });
                    return;
                }
                openDigit = String(digitId);
                closePana = String(closePanaId);
            } else {
                if (!openPanaId || !closeDigitId) {
                    Dialog.show({ type: 'error', text1: 'Selection Missing', text2: 'Please select Open Pana and Close Digit.' });
                    return;
                }
                openPana = String(openPanaId);
                closeDigit = String(closeDigitId);
            }
        } else {
            if (!digitId) {
                Dialog.show({ type: 'error', text1: 'Selection Missing', text2: 'Please select a digit/pana.' });
                return;
            }
            if (selectedSession === 'Open') {
                if (details.name === 'Single Digit' || details.name === 'Single') {
                    openDigit = String(digitId);
                } else {
                    openPana = String(digitId);
                }
            } else {
                if (details.name === 'Single Digit' || details.name === 'Single') {
                    closeDigit = String(digitId);
                } else {
                    closePana = String(digitId);
                }
            }
        }

        const newEntry = {
            points_action: ptsNum,
            points: ptsNum,
            phone_number: phone,
            game_name: selectItem.games_name || selectItem.market_name || selectItem.game_name,
            game_type: details.name,
            session: selectedSession,
            open_pana: openPana,
            open_digit: openDigit,
            close_pana: closePana,
            close_digit: closeDigit,
        };

        setBidData((prev) => [...prev, newEntry]);
        setPoints('');
        setDigitId('');
        setDigitName('');
        setCloseDigitId('');
        setCloseDigitName('');
        setOpenPanaId('');
        setOpenPanaName('');
        setClosePanaId('');
        setClosePanaName('');
    };

    const getBidDate = () => {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    const buildBetPlacePayload = (item) => {
        const session = (item.session || selectedSession).toString().toLowerCase();
        let openDigit = item.open_digit != null && item.open_digit !== '' ? String(item.open_digit) : null;
        let closeDigit = item.close_digit != null && item.close_digit !== '' ? String(item.close_digit) : null;
        let openPanna = item.open_pana != null && item.open_pana !== '' ? String(item.open_pana) : null;
        let closePanna = item.close_pana != null && item.close_pana !== '' ? String(item.close_pana) : null;
        const amount = Number(item.points_action || item.points || 0) || 0;

        // Auto-shift to close if session is close and open field was populated
        if (session === 'close' && !isHalfSangam(details) && !isFullSangam(details)) {
            if (!closeDigit && openDigit) {
                closeDigit = openDigit;
                openDigit = null;
            }
            if (!closePanna && openPanna) {
                closePanna = openPanna;
                openPanna = null;
            }
        }

        const jodi = openDigit && closeDigit && (details?.name === 'Jodi Digit' || getBidPanelKey(details) === 'JodiDigitBulk') ? openDigit + closeDigit : null;

        return {
            game_name: selectItem.games_name || selectItem.market_name || selectItem.game_name,
            game_type: details.name,
            market_id: Number(selectItem.id) || selectItem.id,
            gtype_id: Number(details.id) || details.id,
            bid_date: getBidDate(),
            session: session === 'close' ? 'Close' : 'Open',
            open_digit: openDigit,
            close_digit: closeDigit,
            jodi: jodi,
            open_pana: openPanna,
            close_pana: closePanna,
            open_panna: openPanna,
            close_panna: closePanna,
            points_action: amount,
            amount: amount,
            points: amount,
            half_sangam_a: item.half_sangam_a != null ? item.half_sangam_a : null,
            half_sangam_b: item.half_sangam_b != null ? item.half_sangam_b : null,
            full_sangam: item.full_sangam != null ? item.full_sangam : null,
        };
    };

    const submit_bid = async () => {
        if (!bidData || bidData.length === 0) {
            Dialog.show({ type: 'error', text1: 'Bids Error', text2: 'Please add at least one bid.' });
            return;
        }

        const totalNeeded = bidData.reduce((sum, b) => sum + (Number(b.points_action) || Number(b.points) || 0), 0);
        if (totalNeeded > walletBalance) {
            Dialog.show({
                type: 'error',
                text1: 'Insufficient Balance',
                text2: `You need ₹${totalNeeded} but only have ₹${walletBalance} in your wallet.`,
            });
            return;
        }

        const token = await AsyncStorage.getItem('token');
        if (!token || !token.trim()) {
            Dialog.show({ type: 'error', text1: 'Session Expired', text2: 'Please login again.' });
            return;
        }

        setLoading(true);
        let successCount = 0;
        let lastError = null;

        try {
            for (let i = 0; i < bidData.length; i++) {
                const payload = buildBetPlacePayload(bidData[i]);
                const result = await postDataJsonWithAuth(base.betPlace, payload);
                const ok = result && (result.status === true || result.success === 1 || result.success === '1');
                if (ok) {
                    successCount++;
                } else {
                    lastError = result?.message || result?.msg || (result?.data?.message) || 'Bid failed';
                }
            }

            if (successCount === bidData.length) {
                Dialog.show({
                    type: 'success',
                    text1: 'Congratulations!',
                    text2: `${successCount} bid(s) placed successfully.`,
                });
                setBidData([]);
                setTotalPoint(0);
                fetchWallet();
            } else if (successCount > 0) {
                Dialog.show({
                    type: 'error',
                    text1: 'Partial Success',
                    text2: `${successCount}/${bidData.length} bids placed. ${lastError || ''}`,
                });
                fetchWallet();
            } else {
                Dialog.show({ type: 'error', text1: 'Bids Error', text2: lastError || 'Could not place bids.' });
            }
        } catch (e) {
            const errMsg = e?.response?.data?.message || e?.response?.data?.msg || e?.message || 'Network error';
            Dialog.show({ type: 'error', text1: 'Bids Error', text2: String(errMsg) });
        } finally {
            setLoading(false);
        }
    };

    const delete_row = (index) => {
        setBidData((prev) => prev.filter((_, i) => i !== index));
    };

    const marketTitle = selectItem.games_name || selectItem.market_name || selectItem.game_name || 'MARKET';
    const gameTypeName = details?.name || 'Bid';
    const rateBadge = details?.rate || '';

    // Render specialized panel if matched
    const panelKey = getBidPanelKey(details);
    const commonProps = {
        navigation: props.navigation,
        games_name: marketTitle,
        game_type: gameTypeName,
        bidData,
        setBidData,
        submit_bid,
        loading,
        walletBalance,
        status,
        details,
        selectItem,
        refreshWallet: fetchWallet,
        bottomInset,
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#061224" translucent={false} />

            {/* Custom Luxury Header Bar */}
            <View style={styles.headerBar}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={_goBack}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <BackArrow size={20} color="#E2B048" />
                </TouchableOpacity>

                <View style={styles.headerTitleCol}>
                    <Text style={styles.headerMarketTitle} numberOfLines={1}>
                        {marketTitle}
                    </Text>
                    <View style={styles.gameTypePill}>
                        <Text style={styles.gameTypePillText}>{gameTypeName}</Text>
                    </View>
                </View>

                {/* Live Wallet Chip */}
                <TouchableOpacity activeOpacity={0.8} onPress={fetchWallet} style={styles.walletChip}>
                    <Text style={styles.walletIconText}>💰</Text>
                    <Text style={styles.walletAmountText}>₹{walletBalance}</Text>
                </TouchableOpacity>
            </View>

            {/* Top Market Info Strip */}
            <View style={styles.marketInfoStrip}>
                <View style={styles.infoLeftCol}>
                    <Text style={styles.infoTimingText}>
                        🕒 {selectItem.open_time || '10:00 AM'} - {selectItem.close_time || '11:00 PM'}
                    </Text>
                    {rateBadge ? (
                        <View style={styles.rateBadge}>
                            <Text style={styles.rateBadgeText}>{rateBadge}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={[styles.sessionStatusBadge, !status && styles.sessionStatusBadgeClosed]}>
                    <View style={[styles.sessionStatusDot, !status && styles.sessionStatusDotClosed]} />
                    <Text style={[styles.sessionStatusText, !status && styles.sessionStatusTextClosed]}>
                        {status ? 'OPEN SESSION' : 'CLOSE SESSION'}
                    </Text>
                </View>
            </View>

            {/* Specialized Child Panels */}
            {panelKey === 'SingleDigitBulk' && <SingleDigitBulk {...commonProps} />}
            {panelKey === 'JodiDigitBulk' && <JodiDigitBulk {...commonProps} />}
            {panelKey === 'SinglePanaBulk' && <SinglePanaBulk {...commonProps} />}
            {panelKey === 'DoublePanaBulk' && <DoublePanaBulk {...commonProps} />}
            {panelKey === 'SPMotor' && <SPMotor {...commonProps} />}
            {panelKey === 'DPMotor' && <DPMotor {...commonProps} />}
            {panelKey === 'GroupJodi' && <GroupJodi {...commonProps} />}
            {panelKey === 'SpDpTp' && <SpDpTp {...commonProps} />}
            {panelKey === 'OddEven' && <OddEven {...commonProps} />}
            {panelKey === 'RedBracket' && <RedBracket {...commonProps} />}
            {panelKey === 'DigitBasedJodi' && <DigitBasedJodi {...commonProps} />}
            {panelKey === 'PanelGroup' && <PanelGroup {...commonProps} />}
            {panelKey === 'TwoDigitPanel' && <TwoDigitPanel {...commonProps} />}

            {/* Fallback Form for Sangam (Half/Full) or Unmapped Games */}
            {!panelKey && (
                <View style={styles.fallbackContainer}>
                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={[styles.formContent, { paddingBottom: 130 + bottomInset }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Session Segmented Selector */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>SELECT SESSION</Text>
                            <View style={styles.sessionToggleRow}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[
                                        styles.sessionToggleBtn,
                                        selectedSession === 'Open' && styles.sessionToggleBtnActive,
                                        !status && styles.sessionToggleBtnDisabled,
                                    ]}
                                    onPress={() => handleSessionSelect('Open')}
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

                                {!isOpenOnly && (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[
                                            styles.sessionToggleBtn,
                                            selectedSession === 'Close' && styles.sessionToggleBtnActive,
                                        ]}
                                        onPress={() => handleSessionSelect('Close')}
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
                                )}
                            </View>
                        </View>

                        {/* Half Sangam Type Switcher */}
                        {isHalfSangam(details) && (
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>SANGAM COMBINATION TYPE</Text>
                                <View style={styles.sessionToggleRow}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[
                                            styles.sessionToggleBtn,
                                            halfSangamType === 'T1' && styles.sessionToggleBtnActive,
                                        ]}
                                        onPress={() => {
                                            setHalfSangamType('T1');
                                            setPoints('');
                                            setDigitId('');
                                            setClosePanaId('');
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.sessionToggleText,
                                                halfSangamType === 'T1' && styles.sessionToggleTextActive,
                                            ]}
                                        >
                                            Type A: Open Digit + Close Pana
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[
                                            styles.sessionToggleBtn,
                                            halfSangamType === 'T2' && styles.sessionToggleBtnActive,
                                        ]}
                                        onPress={() => {
                                            setHalfSangamType('T2');
                                            setPoints('');
                                            setOpenPanaId('');
                                            setCloseDigitId('');
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.sessionToggleText,
                                                halfSangamType === 'T2' && styles.sessionToggleTextActive,
                                            ]}
                                        >
                                            Type B: Open Pana + Close Digit
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Betting Inputs Card */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>SELECT SELECTION & POINTS</Text>

                            {isFullSangam(details) ? (
                                <>
                                    <DropDownCom
                                        width="100%"
                                        backgroundColor="#061224"
                                        borderColor="#1E3A5F"
                                        search={true}
                                        name={'Open Pana'}
                                        placeholder={'Select Open Pana'}
                                        value={digitId}
                                        setName={setDigitName}
                                        setId={setDigitId}
                                        list={[...gameList3, ...gameList4, ...gameList5]}
                                        onPress={(e) => setDigitId(e)}
                                        bgType={'White'}
                                        id={digitId}
                                    />
                                    <DropDownCom
                                        width="100%"
                                        backgroundColor="#061224"
                                        borderColor="#1E3A5F"
                                        search={true}
                                        name={'Close Pana'}
                                        placeholder={'Select Close Pana'}
                                        value={closePanaId}
                                        setName={setClosePanaName}
                                        setId={setClosePanaId}
                                        list={[...gameList3, ...gameList4, ...gameList5]}
                                        onPress={(e) => setClosePanaId(e)}
                                        bgType={'White'}
                                        id={closePanaId}
                                    />
                                </>
                            ) : isHalfSangam(details) ? (
                                halfSangamType === 'T1' ? (
                                    <>
                                        <DropDownCom
                                            width="100%"
                                            backgroundColor="#061224"
                                            borderColor="#1E3A5F"
                                            search={true}
                                            name={'Open Digit'}
                                            placeholder={'Select Open Digit (0-9)'}
                                            value={digitId}
                                            setName={setDigitName}
                                            setId={setDigitId}
                                            list={gameList1}
                                            onPress={(e) => setDigitId(e)}
                                            bgType={'White'}
                                            id={digitId}
                                        />
                                        <DropDownCom
                                            width="100%"
                                            backgroundColor="#061224"
                                            borderColor="#1E3A5F"
                                            search={true}
                                            name={'Close Pana'}
                                            placeholder={'Select Close Pana'}
                                            value={closePanaId}
                                            setName={setClosePanaName}
                                            setId={setClosePanaId}
                                            list={[...gameList3, ...gameList4, ...gameList5]}
                                            onPress={(e) => setClosePanaId(e)}
                                            bgType={'White'}
                                            id={closePanaId}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <DropDownCom
                                            width="100%"
                                            backgroundColor="#061224"
                                            borderColor="#1E3A5F"
                                            search={true}
                                            name={'Open Pana'}
                                            placeholder={'Select Open Pana'}
                                            value={openPanaId}
                                            setName={setOpenPanaName}
                                            setId={setOpenPanaId}
                                            list={[...gameList3, ...gameList4, ...gameList5]}
                                            onPress={(e) => setOpenPanaId(e)}
                                            bgType={'White'}
                                            id={openPanaId}
                                        />
                                        <DropDownCom
                                            width="100%"
                                            backgroundColor="#061224"
                                            borderColor="#1E3A5F"
                                            search={true}
                                            name={'Close Digit'}
                                            placeholder={'Select Close Digit (0-9)'}
                                            value={closeDigitId}
                                            setName={setCloseDigitName}
                                            setId={setCloseDigitId}
                                            list={gameList1}
                                            onPress={(e) => setCloseDigitId(e)}
                                            bgType={'White'}
                                            id={closeDigitId}
                                        />
                                    </>
                                )
                            ) : (
                                <DropDownCom
                                    width="100%"
                                    backgroundColor="#061224"
                                    borderColor="#1E3A5F"
                                    search={true}
                                    name={'Digit / Pana'}
                                    placeholder={'Select Digit or Pana'}
                                    value={digitId}
                                    setName={setDigitName}
                                    setId={setDigitId}
                                    list={digitListForForm}
                                    onPress={(e) => setDigitId(e)}
                                    bgType={'White'}
                                    id={digitId}
                                />
                            )}

                            {/* Points Input */}
                            <View style={styles.pointsInputRow}>
                                <Text style={styles.inputLabel}>Points / Amount (₹)</Text>
                                <TextInput
                                    style={styles.pointsTextInput}
                                    placeholder="Enter points (min 10)"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    maxLength={7}
                                    value={points}
                                    onChangeText={setPoints}
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
                                onPress={add_bid}
                            >
                                <LinearGradient
                                    colors={['#E2B048', '#C6922A', '#A27018']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.addBidBtnGradient}
                                >
                                    <Text style={styles.addBidBtnText}>+ ADD TO BID LIST</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Pending Bids Table */}
                        {bidData.length > 0 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.bidsHeaderRow}>
                                    <Text style={styles.sectionTitle}>
                                        PENDING BIDS ({bidData.length})
                                    </Text>
                                    <TouchableOpacity onPress={() => setBidData([])}>
                                        <Text style={styles.clearAllText}>Clear All</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.tableHeaderStrip}>
                                    <Text style={[styles.tableColHeader, { flex: 2 }]}>SELECTION</Text>
                                    <Text style={[styles.tableColHeader, { flex: 1.2 }]}>SESSION</Text>
                                    <Text style={[styles.tableColHeader, { flex: 1.2 }]}>POINTS</Text>
                                    <Text style={[styles.tableColHeader, { flex: 0.8 }]}>DEL</Text>
                                </View>

                                {bidData.map((item, index) => {
                                    const selectionLabel =
                                        [item.open_pana, item.open_digit, item.close_digit, item.close_pana]
                                            .filter(Boolean)
                                            .join(' - ') || '—';

                                    return (
                                        <View key={index} style={styles.tableRow}>
                                            <View style={{ flex: 2 }}>
                                                <Text style={styles.tableSelectionText}>
                                                    {selectionLabel}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1.2 }}>
                                                <View
                                                    style={[
                                                        styles.sessionMiniPill,
                                                        item.session === 'Close' && styles.sessionMiniPillClose,
                                                    ]}
                                                >
                                                    <Text style={styles.sessionMiniPillText}>
                                                        {item.session || 'Open'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ flex: 1.2 }}>
                                                <Text style={styles.tablePointsText}>
                                                    ₹{item.points_action || item.points}
                                                </Text>
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
                            <View style={styles.bottomSummaryCol}>
                                <Text style={styles.bottomSummaryLabel}>TOTAL BIDS</Text>
                                <Text style={styles.bottomSummaryVal}>{bidData.length}</Text>
                            </View>
                            <View style={styles.bottomSummaryCol}>
                                <Text style={styles.bottomSummaryLabel}>TOTAL AMOUNT</Text>
                                <Text style={styles.bottomSummaryTotal}>₹{totalPoint}</Text>
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
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#061224',
    },
    headerBar: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#061224',
        borderBottomWidth: 1,
        borderBottomColor: '#122644',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: '#E2B048',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(226, 176, 72, 0.08)',
    },
    backBtnText: {
        color: '#E2B048',
        fontSize: 26,
        fontWeight: '300',
        marginTop: -3,
    },
    headerTitleCol: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    headerMarketTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    gameTypePill: {
        backgroundColor: 'rgba(226, 176, 72, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 3,
        borderWidth: 1,
        borderColor: 'rgba(226, 176, 72, 0.3)',
    },
    gameTypePillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#E2B048',
        letterSpacing: 0.3,
    },
    walletChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F264A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#E2B048',
    },
    walletIconText: {
        fontSize: 14,
        marginRight: 4,
    },
    walletAmountText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#E2B048',
    },
    marketInfoStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0B1E38',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1A3358',
    },
    infoLeftCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoTimingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    rateBadge: {
        backgroundColor: 'rgba(226, 176, 72, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(226, 176, 72, 0.35)',
    },
    rateBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#E2B048',
    },
    sessionStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    sessionStatusBadgeClosed: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    sessionStatusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#22C55E',
        marginRight: 6,
    },
    sessionStatusDotClosed: {
        backgroundColor: '#EF4444',
    },
    sessionStatusText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#22C55E',
        letterSpacing: 0.3,
    },
    sessionStatusTextClosed: {
        color: '#EF4444',
    },
    fallbackContainer: {
        flex: 1,
        backgroundColor: '#061224',
    },
    formScroll: {
        flex: 1,
    },
    formContent: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionCard: {
        backgroundColor: '#0B1E38',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#1A3358',
    },
    sectionTitle: {
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
    pointsInputRow: {
        marginTop: 12,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#CBD5E1',
        marginBottom: 6,
    },
    pointsTextInput: {
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
        paddingHorizontal: 12,
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
        paddingHorizontal: 12,
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
        fontSize: 14,
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
    tableSelectionText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    sessionMiniPill: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    sessionMiniPillClose: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    sessionMiniPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#22C55E',
    },
    tablePointsText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#E2B048',
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
    bottomSummaryCol: {
        alignItems: 'flex-start',
    },
    bottomSummaryLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.4,
    },
    bottomSummaryVal: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    bottomSummaryTotal: {
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