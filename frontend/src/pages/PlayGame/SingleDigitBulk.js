import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dialog } from '../../context/DialogContext';
import DropDownCom from '../../component/DropDownCom';
import { gameList1 } from '../../enums/panaList';

const { width } = Dimensions.get('window');
const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000];
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const SingleDigitBulk = ({
  games_name,
  game_type,
  bidData,
  setBidData,
  submit_bid,
  loading = false,
  status = true,
  walletBalance = 0,
  bottomInset = Platform.OS === 'android' ? 68 : 16,
}) => {
  const [point, setPoint] = useState('10');
  const [selectedSession, setSelectedSession] = useState(status ? 'Open' : 'Close');

  useEffect(() => {
    if (!status) {
      setSelectedSession('Close');
    }
  }, [status]);

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
    const cur = parseInt(point, 10) || 0;
    setPoint(String(cur + amt));
  };

  // Toggle or add points to a specific digit
  const toggleDigit = async (digit) => {
    const value = parseInt(point, 10) || 0;
    if (value <= 0) {
      Dialog.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter points first.' });
      return;
    }

    const phone = await AsyncStorage.getItem('phone');
    const existingIndex = bidData.findIndex((b) => {
      const matchDigit = selectedSession === 'Open' ? b.open_digit === digit : b.close_digit === digit;
      return matchDigit && b.session === selectedSession;
    });

    let newBids = [...bidData];
    if (existingIndex >= 0) {
      newBids[existingIndex].points_action = Number(newBids[existingIndex].points_action || 0) + value;
      newBids[existingIndex].points = newBids[existingIndex].points_action;
    } else {
      newBids.push({
        points_action: value,
        points: value,
        phone_number: phone,
        game_name: games_name,
        game_type: game_type || 'Single Digit',
        session: selectedSession,
        open_pana: '',
        open_digit: selectedSession === 'Open' ? digit : '',
        close_pana: '',
        close_digit: selectedSession === 'Close' ? digit : '',
      });
    }

    setBidData(newBids);
  };

  // Quick batch selection (All, Even, Odd)
  const handleBatchSelect = async (mode) => {
    const value = parseInt(point, 10) || 0;
    if (value <= 0) {
      Dialog.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter points first.' });
      return;
    }

    const phone = await AsyncStorage.getItem('phone');
    let targetDigits = [];
    if (mode === 'all') targetDigits = DIGITS;
    else if (mode === 'even') targetDigits = ['0', '2', '4', '6', '8'];
    else if (mode === 'odd') targetDigits = ['1', '3', '5', '7', '9'];

    let newBids = [...bidData];
    targetDigits.forEach((digit) => {
      const existingIndex = newBids.findIndex((b) => {
        const matchDigit = selectedSession === 'Open' ? b.open_digit === digit : b.close_digit === digit;
        return matchDigit && b.session === selectedSession;
      });

      if (existingIndex >= 0) {
        newBids[existingIndex].points_action = Number(newBids[existingIndex].points_action || 0) + value;
        newBids[existingIndex].points = newBids[existingIndex].points_action;
      } else {
        newBids.push({
          points_action: value,
          points: value,
          phone_number: phone,
          game_name: games_name,
          game_type: game_type || 'Single Digit',
          session: selectedSession,
          open_pana: '',
          open_digit: selectedSession === 'Open' ? digit : '',
          close_pana: '',
          close_digit: selectedSession === 'Close' ? digit : '',
        });
      }
    });

    setBidData(newBids);
  };

  const handleClearDigit = (digit) => {
    setBidData((prev) =>
      prev.filter((b) => {
        const matchDigit = selectedSession === 'Open' ? b.open_digit === digit : b.close_digit === digit;
        return !(matchDigit && b.session === selectedSession);
      })
    );
  };

  const totalPoints = bidData.reduce(
    (sum, b) => sum + (Number(b.points_action) || Number(b.points) || 0),
    0
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 + bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session Selector Card */}
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

        {/* Points & Quick Chips Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>BID AMOUNT (₹)</Text>
          <TextInput
            value={point}
            onChangeText={setPoint}
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
              onPress={() => setPoint('')}
            >
              <Text style={styles.clearChipText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Searchable Dropdown Selection */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>SEARCH & SELECT DIGIT (0-9)</Text>
          <DropDownCom
            width="100%"
            backgroundColor="#061224"
            borderColor="#1E3A5F"
            search={true}
            name={''}
            placeholder={'Select or search digit (0-9)...'}
            value={''}
            setName={() => {}}
            setId={(d) => {
              if (d !== undefined && d !== null && d !== '') {
                toggleDigit(String(d));
              }
            }}
            list={gameList1}
            onPress={(d) => {
              if (d !== undefined && d !== null && d !== '') {
                toggleDigit(String(d));
              }
            }}
            bgType={'White'}
            id={''}
          />
        </View>

        {/* Quick Batch Select Filters */}
        <View style={styles.batchFiltersRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.batchBtn}
            onPress={() => handleBatchSelect('all')}
          >
            <Text style={styles.batchBtnText}>⚡ ALL (0-9)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.batchBtn}
            onPress={() => handleBatchSelect('even')}
          >
            <Text style={styles.batchBtnText}>EVEN (0,2,4,6,8)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.batchBtn}
            onPress={() => handleBatchSelect('odd')}
          >
            <Text style={styles.batchBtnText}>ODD (1,3,5,7,9)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.batchClearBtn}
            onPress={() => setBidData([])}
          >
            <Text style={styles.batchClearBtnText}>✕ CLEAR</Text>
          </TouchableOpacity>
        </View>

        {/* 0-9 Luxury Digit Board Grid */}
        <View style={styles.card}>
          <View style={styles.boardHeaderRow}>
            <Text style={styles.cardHeader}>TAP DIGIT TO ADD ₹{point || 0}</Text>
            <Text style={styles.sessionHint}>
              Session: <Text style={{ color: '#E2B048', fontWeight: '800' }}>{selectedSession}</Text>
            </Text>
          </View>

          <View style={styles.digitGrid}>
            {DIGITS.map((d) => {
              const currentBid = bidData.find((b) => {
                const matchDigit = selectedSession === 'Open' ? b.open_digit === d : b.close_digit === d;
                return matchDigit && b.session === selectedSession;
              });
              const pts = currentBid ? currentBid.points_action || currentBid.points || 0 : 0;
              const isSelected = pts > 0;

              return (
                <TouchableOpacity
                  key={d}
                  activeOpacity={0.75}
                  style={[styles.digitBox, isSelected && styles.digitBoxActive]}
                  onPress={() => toggleDigit(d)}
                  onLongPress={() => handleClearDigit(d)}
                >
                  <Text style={[styles.digitNumText, isSelected && styles.digitNumTextActive]}>
                    {d}
                  </Text>
                  {isSelected ? (
                    <View style={styles.digitPointBadge}>
                      <Text style={styles.digitPointBadgeText}>₹{pts}</Text>
                    </View>
                  ) : (
                    <Text style={styles.digitEmptySubText}>Tap to add</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.tipText}>💡 Tip: Long-press any digit tile to remove its bids.</Text>
        </View>
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
            <Text style={styles.bottomValTotal}>₹{totalPoints}</Text>
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
};

export default SingleDigitBulk;

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
  batchFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  batchBtn: {
    backgroundColor: '#0D2444',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3E69',
  },
  batchBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
  },
  batchClearBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  batchClearBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  boardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionHint: {
    fontSize: 11,
    color: '#94A3B8',
  },
  digitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  digitBox: {
    width: (width - 60) / 5,
    height: 72,
    backgroundColor: '#061224',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  digitBoxActive: {
    borderColor: '#E2B048',
    backgroundColor: 'rgba(226, 176, 72, 0.15)',
  },
  digitNumText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  digitNumTextActive: {
    color: '#E2B048',
  },
  digitPointBadge: {
    backgroundColor: '#E2B048',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  digitPointBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#061224',
  },
  digitEmptySubText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  tipText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 10,
    fontStyle: 'italic',
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
