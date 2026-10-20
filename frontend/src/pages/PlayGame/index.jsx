import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Search, X, Grid, Wallet, Calendar, Check, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import MaterialDialog from '../../components/common/MaterialDialog';
import {
  SINGLE_DIGITS,
  JODI_DIGITS,
  SINGLE_PANAS,
  DOUBLE_PANAS,
  TRIPLE_PANAS,
  ALL_PANAS,
  isValidSinglePana,
  isValidDoublePana,
  isValidTriplePana,
  isValidJodi,
  isValidPana,
  normalizePana,
  getPanaAnk,
  isPanaInFamily,
  getFamilyPanas,
  generateSPMotor,
  generateDPMotor
} from './panaUtils';
import BidCartTable from './BidCartTable';
import SearchableSelect from '../../components/common/SearchableSelect';

const GAME_TYPES = [
  'Single Digit Bulk',
  'Jodi Bulk',
  'Single Pana Bulk',
  'Double Pana Bulk',
  'Triple Pana',
  'Half Sangam',
  'Full Sangam',
  'SP Motor',
  'DP Motor'
];

const normalizeGameType = (type) => {
  if (!type) return 'Single Digit Bulk';
  const clean = type.toLowerCase().replace(/_/g, ' ').trim();
  if (clean.includes('sp') && clean.includes('motor')) return 'SP Motor';
  if (clean.includes('dp') && clean.includes('motor')) return 'DP Motor';
  if (clean === 'sp motor' || clean === 'sp_motor') return 'SP Motor';
  if (clean === 'dp motor' || clean === 'dp_motor') return 'DP Motor';
  if (clean.includes('single') && clean.includes('digit')) return 'Single Digit Bulk';
  if (clean.includes('single') && clean.includes('ank')) return 'Single Digit Bulk';
  if (clean.includes('jodi')) return 'Jodi Bulk';
  if (clean.includes('double') && clean.includes('pana')) return 'Double Pana Bulk';
  if (clean.includes('single') && clean.includes('pana')) return 'Single Pana Bulk';
  if (clean.includes('triple')) return 'Triple Pana';
  if (clean.includes('half')) return 'Half Sangam';
  if (clean.includes('full')) return 'Full Sangam';
  return type;
};

const getBackendGameType = (type) => {
  if (type === 'SP Motor') return 'SP Motor';
  if (type === 'DP Motor') return 'DP Motor';
  if (type === 'Single Digit Bulk' || type === 'Single Digit') return 'Single Digit';
  if (type === 'Jodi Bulk' || type === 'Jodi Digit' || type === 'Jodi') return 'Jodi Digit';
  if (type === 'Single Pana Bulk' || type === 'Single Pana') return 'Single Pana';
  if (type === 'Double Pana Bulk' || type === 'Double Pana') return 'Double Pana';
  if (type === 'Triple Pana') return 'Triple Pana';
  if (type === 'Half Sangam') return 'Half Sangam';
  if (type === 'Full Sangam') return 'Full Sangam';
  return type;
};

const formatDisplayDate = (d = new Date()) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const PlayGame = () => {
  const [searchParams] = useSearchParams();
  const rawGameName = searchParams.get('game') || searchParams.get('name') || '';
  const gameName = rawGameName.trim();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState('0');
  const [minBid, setMinBid] = useState(10);
  const [maxBid, setMaxBid] = useState(50000);

  // Active game type tab
  const initialType = normalizeGameType(searchParams.get('type') || 'Single Digit Bulk');
  const [selectedType, setSelectedType] = useState(initialType);

  // Core Inputs
  const [session, setSession] = useState('Open');
  const [amount, setAmount] = useState('10');
  const [displayDate] = useState(formatDisplayDate());

  // Ank sub-selection tabs for Bulk games
  const [activeJodiAnk, setActiveJodiAnk] = useState('0');
  const [activeSinglePanaAnk, setActiveSinglePanaAnk] = useState('1');
  const [activeDoublePanaAnk, setActiveDoublePanaAnk] = useState('1');

  // Manual typing inputs for Bulk games
  const [manualJodi, setManualJodi] = useState('');
  const [manualSinglePana, setManualSinglePana] = useState('');
  const [manualDoublePana, setManualDoublePana] = useState('');

  // Sangam specific fields
  const [halfType, setHalfType] = useState('OD_CP'); // 'OD_CP' or 'OP_CD'
  const [openDigit, setOpenDigit] = useState('');
  const [closePana, setClosePana] = useState('');
  const [openPana, setOpenPana] = useState('');
  const [closeDigit, setCloseDigit] = useState('');
  const [fullOpenPana, setFullOpenPana] = useState('');
  const [fullClosePana, setFullClosePana] = useState('');

  // Motor specific fields (SP Motor & DP Motor)
  const [motorDigits, setMotorDigits] = useState('');

  // Staged Bids in Cart
  const [stagedBids, setStagedBids] = useState([]);

  const [loading, setLoading] = useState(false);
  const [canBid, setCanBid] = useState(true);
  const [gameInfo, setGameInfo] = useState(null);

  // Material Dialog state
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    showCancel: false,
    onConfirm: null
  });

  const showMaterialDialog = (type, title, message, options = {}) => {
    setDialog({
      isOpen: true,
      type,
      title,
      message,
      confirmText: options.confirmText || '',
      cancelText: options.cancelText || '',
      showCancel: options.showCancel || false,
      onConfirm: options.onConfirm || null
    });
  };

  const closeMaterialDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Market timing & open/close evaluation
  const [marketStatus, setMarketStatus] = useState({
    isOpen: true,
    isOpenSession: true,
    isClosed: false
  });

  const cleanTimeToToday = (timeStr, refDate = new Date()) => {
    if (!timeStr) return null;
    const clean = String(timeStr).trim().toLowerCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[4];
    if (modifier === 'pm' && hours < 12) hours += 12;
    else if (modifier === 'am' && hours === 12) hours = 0;
    const d = new Date(refDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const evaluateMarket = (g) => {
    if (g && g.is_running !== undefined && g.is_open_session !== undefined) {
      const isRunning = !!g.is_running;
      const isOpenActive = isRunning && !!g.is_open_session;

      setMarketStatus({
        isOpen: isRunning,
        isOpenSession: isOpenActive,
        isClosed: !isRunning
      });

      if (!isOpenActive) {
        setSession('Close');
      }
      return;
    }

    const oTime = g?.open_time || searchParams.get('openTime');
    const cTime = g?.close_time || searchParams.get('closeTime');

    // IST date conversion
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const openTimeObj = cleanTimeToToday(oTime, nowIST);
    const closeTimeObj = cleanTimeToToday(cTime, nowIST);

    if (openTimeObj && closeTimeObj && closeTimeObj.getTime() <= openTimeObj.getTime()) {
      if (nowIST.getTime() >= openTimeObj.getTime()) {
        closeTimeObj.setDate(closeTimeObj.getDate() + 1);
      } else {
        const tempClose = new Date(closeTimeObj);
        if (nowIST.getTime() <= tempClose.getTime()) {
          openTimeObj.setDate(openTimeObj.getDate() - 1);
          closeTimeObj.setTime(tempClose.getTime());
        } else {
          closeTimeObj.setDate(closeTimeObj.getDate() + 1);
        }
      }
    }

    const isGameEnabled = g?.game_status === undefined || String(g.game_status) !== '0';
    const isRunning = isGameEnabled && (closeTimeObj ? nowIST.getTime() <= closeTimeObj.getTime() : true);
    const isOpenActive = isRunning && (openTimeObj ? nowIST.getTime() < openTimeObj.getTime() : true);

    setMarketStatus({
      isOpen: isRunning,
      isOpenSession: isOpenActive,
      isClosed: !isRunning
    });

    if (!isOpenActive) {
      setSession('Close');
    }
  };

  const loadData = async () => {
    try {
      const [walletRes, gamesRes] = await Promise.all([
        api.get('/wallet/info'),
        api.get('/games')
      ]);

      if (walletRes.data.success === '1' && walletRes.data.data) {
        setWallet(walletRes.data.data.wallet || '0');
        const minL = parseInt(walletRes.data.data.min_limit, 10);
        const maxL = parseInt(walletRes.data.data.max_limit, 10);
        setMinBid(!isNaN(minL) && minL > 0 ? minL : 10);
        setMaxBid(!isNaN(maxL) && maxL > 0 ? maxL : 50000);
        if (walletRes.data.data.can_bid !== undefined) {
          setCanBid(walletRes.data.data.can_bid);
        }
      }

      const allGames = gamesRes.data.result || [];
      const currentG = allGames.find(g =>
        (g.games_name && g.games_name.trim().toLowerCase() === gameName.toLowerCase()) ||
        (g.game && g.game.trim().toLowerCase() === gameName.toLowerCase())
      );

      if (currentG) {
        setGameInfo(currentG);
        evaluateMarket(currentG);
      } else {
        evaluateMarket(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!gameName) {
      navigate('/');
      return;
    }
    loadData();
  }, [gameName]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameInfo) {
        evaluateMarket(gameInfo);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [gameInfo]);

  // Sangam, Jodi, Motor, and Full Day indicators
  const isSangam = selectedType === 'Half Sangam' || selectedType === 'Full Sangam';
  const isJodiType = selectedType === 'Jodi Bulk' || selectedType === 'Jodi Digit';
  const isMotorType = selectedType === 'SP Motor' || selectedType === 'DP Motor';
  const isSPMotor = selectedType === 'SP Motor';
  const isFullDayType = isJodiType || isSangam;

  // Determine effective session
  const effectiveSession = (!marketStatus.isOpenSession || isFullDayType)
    ? 'Close'
    : session;

  // Amount points validator helper
  const getValidatedPoints = () => {
    const pts = parseInt(amount, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      showMaterialDialog('warning', 'Invalid Amount', `Amount must be between ₹${minBid} and ₹${maxBid}`);
      return null;
    }
    if (!canBid) {
      showMaterialDialog('warning', 'Betting Blocked 🛑', 'Betting is currently blocked on your account. Please contact Admin.');
      return null;
    }
    if (marketStatus.isClosed) {
      showMaterialDialog('error', 'Market Closed', `Bidding is closed for ${gameName} today.`);
      return null;
    }
    return pts;
  };

  // 1-CLICK ADD FOR SINGLE DIGIT BULK (0-9)
  const handleToggleSingleDigit = (digit) => {
    const pts = getValidatedPoints();
    if (!pts) return;

    if (effectiveSession === 'Open' && !marketStatus.isOpenSession) {
      showMaterialDialog('warning', 'Session Closed', 'Open session is closed for this market.');
      return;
    }

    setStagedBids(prev => {
      const idx = prev.findIndex(b =>
        b.game_type === 'Single Digit' &&
        b.session === effectiveSession &&
        ((effectiveSession === 'Open' && b.open_digit === digit) || (effectiveSession === 'Close' && b.close_digit === digit))
      );

      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          points_action: Number(updated[idx].points_action || 0) + pts
        };
        return updated;
      }

      return [...prev, {
        game_type: 'Single Digit',
        session: effectiveSession,
        open_digit: effectiveSession === 'Open' ? digit : 'NA',
        close_digit: effectiveSession === 'Close' ? digit : 'NA',
        open_pana: 'NA',
        close_pana: 'NA',
        display_number: digit,
        points_action: pts
      }];
    });
  };

  // Batch Select for Single Digit (All, Even, Odd)
  const handleBatchSingleDigit = (mode) => {
    const pts = getValidatedPoints();
    if (!pts) return;

    if (effectiveSession === 'Open' && !marketStatus.isOpenSession) {
      showMaterialDialog('warning', 'Session Closed', 'Open session is closed for this market.');
      return;
    }

    let targetDigits = [];
    if (mode === 'all') targetDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    else if (mode === 'even') targetDigits = ['0', '2', '4', '6', '8'];
    else if (mode === 'odd') targetDigits = ['1', '3', '5', '7', '9'];

    setStagedBids(prev => {
      let current = [...prev];
      targetDigits.forEach(digit => {
        const idx = current.findIndex(b =>
          b.game_type === 'Single Digit' &&
          b.session === effectiveSession &&
          ((effectiveSession === 'Open' && b.open_digit === digit) || (effectiveSession === 'Close' && b.close_digit === digit))
        );
        if (idx >= 0) {
          current[idx] = {
            ...current[idx],
            points_action: Number(current[idx].points_action || 0) + pts
          };
        } else {
          current.push({
            game_type: 'Single Digit',
            session: effectiveSession,
            open_digit: effectiveSession === 'Open' ? digit : 'NA',
            close_digit: effectiveSession === 'Close' ? digit : 'NA',
            open_pana: 'NA',
            close_pana: 'NA',
            display_number: digit,
            points_action: pts
          });
        }
      });
      return current;
    });
  };

  // 1-CLICK ADD FOR JODI BULK (00-99)
  const handleToggleJodi = (jodi) => {
    const pts = getValidatedPoints();
    if (!pts) return;

    if (!marketStatus.isOpenSession) {
      showMaterialDialog('warning', 'Market Closed', 'Jodi betting closes after Open Market time ends.');
      return;
    }

    setStagedBids(prev => {
      const idx = prev.findIndex(b =>
        b.game_type === 'Jodi Digit' &&
        (b.display_number === jodi || (b.open_digit === jodi.charAt(0) && b.close_digit === jodi.charAt(1)))
      );

      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          points_action: Number(updated[idx].points_action || 0) + pts
        };
        return updated;
      }

      return [...prev, {
        game_type: 'Jodi Digit',
        session: 'Close',
        open_digit: jodi.charAt(0),
        close_digit: jodi.charAt(1),
        open_pana: 'NA',
        close_pana: 'NA',
        display_number: jodi,
        points_action: pts
      }];
    });
  };

  // Batch Add 10 Jodis for active Ank
  const handleAddAllAnkJodis = () => {
    const list = activeJodiAnk === 'doubles'
      ? ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99']
      : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `${activeJodiAnk}${i}`);
    list.forEach(j => handleToggleJodi(j));
  };

  // 1-CLICK ADD FOR SINGLE PANA BULK
  const handleToggleSinglePana = (pana) => {
    const pts = getValidatedPoints();
    if (!pts) return;

    if (effectiveSession === 'Open' && !marketStatus.isOpenSession) {
      showMaterialDialog('warning', 'Session Closed', 'Open session is closed for this market.');
      return;
    }

    setStagedBids(prev => {
      const idx = prev.findIndex(b =>
        b.game_type === 'Single Pana' &&
        b.session === effectiveSession &&
        b.display_number === pana
      );

      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          points_action: Number(updated[idx].points_action || 0) + pts
        };
        return updated;
      }

      return [...prev, {
        game_type: 'Single Pana',
        session: effectiveSession,
        open_digit: 'NA',
        close_digit: 'NA',
        open_pana: effectiveSession === 'Open' ? pana : 'NA',
        close_pana: effectiveSession === 'Close' ? pana : 'NA',
        display_number: pana,
        points_action: pts
      }];
    });
  };

  // Batch Add all 12 Single Panas of active Ank
  const handleAddAllSinglePanasOfAnk = () => {
    const list = SINGLE_PANAS.filter(p => getPanaAnk(p) === activeSinglePanaAnk);
    list.forEach(p => handleToggleSinglePana(p));
  };

  // 1-CLICK ADD FOR DOUBLE PANA BULK
  const handleToggleDoublePana = (pana) => {
    const pts = getValidatedPoints();
    if (!pts) return;

    if (effectiveSession === 'Open' && !marketStatus.isOpenSession) {
      showMaterialDialog('warning', 'Session Closed', 'Open session is closed for this market.');
      return;
    }

    setStagedBids(prev => {
      const idx = prev.findIndex(b =>
        b.game_type === 'Double Pana' &&
        b.session === effectiveSession &&
        b.display_number === pana
      );

      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          points_action: Number(updated[idx].points_action || 0) + pts
        };
        return updated;
      }

      return [...prev, {
        game_type: 'Double Pana',
        session: effectiveSession,
        open_digit: 'NA',
        close_digit: 'NA',
        open_pana: effectiveSession === 'Open' ? pana : 'NA',
        close_pana: effectiveSession === 'Close' ? pana : 'NA',
        display_number: pana,
        points_action: pts
      }];
    });
  };

  // Batch Add all Double Panas of active Ank
  const handleAddAllDoublePanasOfAnk = () => {
    const list = DOUBLE_PANAS.filter(p => getPanaAnk(p) === activeDoublePanaAnk);
    list.forEach(p => handleToggleDoublePana(p));
  };

  // 1-CLICK ADD FOR TRIPLE PANA
  const handleToggleTriplePana = (pana) => {
    const pts = getValidatedPoints();
    if (!pts) return;

    if (effectiveSession === 'Open' && !marketStatus.isOpenSession) {
      showMaterialDialog('warning', 'Session Closed', 'Open session is closed for this market.');
      return;
    }

    setStagedBids(prev => {
      const idx = prev.findIndex(b =>
        b.game_type === 'Triple Pana' &&
        b.session === effectiveSession &&
        b.display_number === pana
      );

      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          points_action: Number(updated[idx].points_action || 0) + pts
        };
        return updated;
      }

      return [...prev, {
        game_type: 'Triple Pana',
        session: effectiveSession,
        open_digit: 'NA',
        close_digit: 'NA',
        open_pana: effectiveSession === 'Open' ? pana : 'NA',
        close_pana: effectiveSession === 'Close' ? pana : 'NA',
        display_number: pana,
        points_action: pts
      }];
    });
  };

  // Handle "+ Add Bet" click for Sangam
  const handleAddSangamBet = (e) => {
    e.preventDefault();
    const pts = getValidatedPoints();
    if (!pts) return;

    let newBid = null;

    if (selectedType === 'Half Sangam') {
      if (halfType === 'OD_CP') {
        const normClosePana = normalizePana(closePana);
        if (!/^\d$/.test(openDigit) || !/^\d{3}$/.test(normClosePana)) {
          showMaterialDialog('warning', 'Invalid Input', 'Please select Open Digit (0-9) and enter a 3-digit Close Pana');
          return;
        }
        if (!isValidPana(normClosePana)) {
          showMaterialDialog('warning', 'Invalid Close Pana', `${closePana} is not a valid Pana.`);
          return;
        }
        if (!isPanaInFamily(normClosePana, openDigit, false)) {
          showMaterialDialog(
            'warning',
            'Invalid Pana for Digit',
            `Close Pana ${normClosePana} (Ank ${getPanaAnk(normClosePana)}) does not belong to Open Digit ${openDigit}. Please enter a Pana whose sum is Digit ${openDigit}.`
          );
          return;
        }
        newBid = {
          game_type: 'Half Sangam',
          session: 'Close',
          open_digit: openDigit,
          close_digit: 'NA',
          open_pana: 'NA',
          close_pana: normClosePana,
          display_number: `OD: ${openDigit} × CP: ${normClosePana}`,
          points_action: pts
        };
        setOpenDigit('');
        setClosePana('');
      } else {
        const normOpenPana = normalizePana(openPana);
        if (!/^\d{3}$/.test(normOpenPana) || !/^\d$/.test(closeDigit)) {
          showMaterialDialog('warning', 'Invalid Input', 'Please enter a 3-digit Open Pana and select Close Digit (0-9)');
          return;
        }
        if (!isValidPana(normOpenPana)) {
          showMaterialDialog('warning', 'Invalid Open Pana', `${openPana} is not a valid Pana.`);
          return;
        }
        if (!isPanaInFamily(normOpenPana, closeDigit, false)) {
          showMaterialDialog(
            'warning',
            'Invalid Pana for Digit',
            `Open Pana ${normOpenPana} (Ank ${getPanaAnk(normOpenPana)}) does not belong to Close Digit ${closeDigit}. Please enter a Pana whose sum is Digit ${closeDigit}.`
          );
          return;
        }
        newBid = {
          game_type: 'Half Sangam',
          session: 'Open',
          open_digit: 'NA',
          close_digit: closeDigit,
          open_pana: normOpenPana,
          close_pana: 'NA',
          display_number: `OP: ${normOpenPana} × CD: ${closeDigit}`,
          points_action: pts
        };
        setOpenPana('');
        setCloseDigit('');
      }
    } else if (selectedType === 'Full Sangam') {
      const normOpen = normalizePana(fullOpenPana);
      const normClose = normalizePana(fullClosePana);
      if (!/^\d{3}$/.test(normOpen) || !/^\d{3}$/.test(normClose)) {
        showMaterialDialog('warning', 'Invalid Input', 'Please enter valid 3-digit Open Pana and Close Pana');
        return;
      }
      if (!isValidPana(normOpen)) {
        showMaterialDialog('warning', 'Invalid Open Pana', `${fullOpenPana} is not a valid Pana.`);
        return;
      }
      if (!isValidPana(normClose)) {
        showMaterialDialog('warning', 'Invalid Close Pana', `${fullClosePana} is not a valid Pana.`);
        return;
      }
      newBid = {
        game_type: 'Full Sangam',
        session: 'Close',
        open_digit: 'NA',
        close_digit: 'NA',
        open_pana: normOpen,
        close_pana: normClose,
        display_number: `OP: ${normOpen} × CP: ${normClose}`,
        points_action: pts
      };
      setFullOpenPana('');
      setFullClosePana('');
    }

    if (newBid) {
      setStagedBids(prev => [...prev, newBid]);
    }
  };

  // MOTOR BET HANDLER (SP Motor & DP Motor)
  const handleAddMotorBid = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const pts = getValidatedPoints();
    if (!pts) return;

    if (effectiveSession === 'Open' && !marketStatus.isOpenSession) {
      showMaterialDialog('warning', 'Session Closed', 'Open session is closed for this market.');
      return;
    }

    const cleanDigits = Array.from(new Set(String(motorDigits).replace(/\D/g, '').split('')));
    const isSP = selectedType === 'SP Motor';

    if (isSP && cleanDigits.length < 3) {
      showMaterialDialog('warning', 'Enter SP Digits', 'Please enter at least 3 unique digits (e.g. 12345678) to generate SP Motor panas.');
      return;
    }
    if (!isSP && cleanDigits.length < 2) {
      showMaterialDialog('warning', 'Enter DP Digits', 'Please enter at least 2 unique digits (e.g. 1234) to generate DP Motor panas.');
      return;
    }

    const generatedPanas = isSP ? generateSPMotor(motorDigits) : generateDPMotor(motorDigits);
    if (!generatedPanas || generatedPanas.length === 0) {
      showMaterialDialog('warning', 'No Combinations', `No valid ${selectedType} panas could be generated from digits "${motorDigits}".`);
      return;
    }

    const newEntries = generatedPanas.map(p => ({
      game_type: isSP ? 'SP Motor' : 'DP Motor',
      session: effectiveSession,
      open_pana: effectiveSession === 'Open' ? p : 'NA',
      close_pana: effectiveSession === 'Close' ? p : 'NA',
      open_digit: 'NA',
      close_digit: 'NA',
      display_number: p,
      points_action: pts
    }));

    setStagedBids(prev => {
      const existingKeys = new Set(prev.map(b => `${b.display_number}_${b.session}`));
      const nonDuplicates = newEntries.filter(b => !existingKeys.has(`${b.display_number}_${b.session}`));
      if (nonDuplicates.length === 0) {
        showMaterialDialog('info', 'Already Added', 'All generated panas for this session are already in your bet list.');
        return prev;
      }
      return [...prev, ...nonDuplicates];
    });

    setMotorDigits('');
  };

  // Remove single bid from list
  const handleRemoveBid = (index) => {
    setStagedBids(prev => prev.filter((_, idx) => idx !== index));
  };

  // Clear all staged bids
  const handleClearCart = () => {
    setStagedBids([]);
  };

  // Submit all staged bids in batch
  const handleSubmitCart = async () => {
    if (stagedBids.length === 0) {
      showMaterialDialog('warning', 'Empty Bet List', 'Your bet list is empty. Please add bets before submitting.');
      return;
    }

    if (!canBid) {
      showMaterialDialog('warning', 'Betting Blocked 🛑', 'Betting is currently blocked on your account. Please contact Admin.');
      return;
    }

    if (marketStatus.isClosed) {
      showMaterialDialog('error', 'Market Closed', `Bidding is closed for ${gameName} today.`);
      return;
    }

    const totalPts = stagedBids.reduce((acc, b) => acc + (parseInt(b.points_action, 10) || 0), 0);
    const curBal = parseFloat(wallet || '0');

    if (curBal > 0 && totalPts > curBal) {
      showMaterialDialog(
        'insufficient_funds',
        'Insufficient Wallet Balance',
        `Your current wallet balance is ₹${curBal.toLocaleString('en-IN')}, but total bid amount is ₹${totalPts.toLocaleString('en-IN')}. Please add funds to proceed.`,
        {
          confirmText: 'ADD FUNDS',
          showCancel: true,
          onConfirm: () => navigate('/add-fund')
        }
      );
      return;
    }

    const payload = stagedBids.map(b => ({
      ...b,
      game_type: getBackendGameType(b.game_type),
      game_name: gameInfo?.games_name || gameName
    }));

    setLoading(true);
    try {
      const response = await api.post('/games/bid', payload);

      if (response.data.success === '1') {
        const newBal = response.data.balance !== undefined ? response.data.balance : curBal - totalPts;
        setWallet(newBal);
        window.dispatchEvent(new CustomEvent('wallet_updated', { detail: { balance: newBal } }));
        setStagedBids([]);

        showMaterialDialog(
          'success',
          'Bids Placed Successfully! 🎉',
          `Successfully placed ${payload.length} ${payload.length === 1 ? 'bid' : 'bids'} totaling ₹${totalPts} on ${gameName}!`
        );
      } else {
        const serverMsg = response.data.msg || 'Failed to place bids';
        if (serverMsg.toLowerCase().includes('insufficient') || serverMsg.toLowerCase().includes('balance') || serverMsg.toLowerCase().includes('fund')) {
          showMaterialDialog('insufficient_funds', 'Insufficient Wallet Balance', serverMsg, {
            confirmText: 'ADD FUNDS',
            showCancel: true,
            onConfirm: () => navigate('/add-fund')
          });
        } else {
          showMaterialDialog('error', 'Bid Error', serverMsg);
        }
      }
    } catch (err) {
      console.error(err);
      showMaterialDialog('error', 'Network Error', 'An unexpected error occurred while placing your bids. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if a number is already in cart
  const getNumberCartAmount = (numStr) => {
    const item = stagedBids.find(b => b.display_number === numStr && b.session === effectiveSession);
    return item ? item.points_action : null;
  };

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', padding: '12px 14px 130px 14px' }}>
      {/* TOP HEADER BAR (Matching User Mobile Screenshot) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        borderRadius: '16px',
        color: '#000',
        marginBottom: '14px',
        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
          >
            <ArrowLeft size={22} strokeWidth={2.6} />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{
              margin: 0,
              fontSize: '14.5px',
              fontWeight: 900,
              color: '#000',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {gameName}, {selectedType}
            </h1>
          </div>
        </div>

        {/* Top Wallet Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.12)',
          padding: '6px 12px',
          borderRadius: '10px',
          fontWeight: 900,
          fontSize: '15px',
          color: '#000',
          flexShrink: 0
        }}>
          <Wallet size={17} strokeWidth={2.4} />
          <span>₹{parseFloat(wallet || '0').toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* GAME TYPE SWITCHER TABS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        marginBottom: '12px'
      }}>
        {GAME_TYPES.map(type => {
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: isSelected
                  ? '1.5px solid var(--color-gold, #d6be66)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(214, 190, 102, 0.25), rgba(214, 190, 102, 0.08))'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? 'var(--color-gold, #d6be66)' : '#9ca3af',
                fontWeight: isSelected ? 800 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTAINER: CARD 1 (INPUTS) + CARD 2 (TABLE) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* CARD 1: INPUT & BOARD (Matching User Mobile Screenshot) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '18px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.18)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {isMotorType ? (
            <form onSubmit={handleAddMotorBid} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Field 1: Select Game Type (Session) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 700,
                  marginBottom: '6px'
                }}>
                  Select Game Type:
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#1e293b',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Open" disabled={!marketStatus.isOpenSession}>
                    Open {!marketStatus.isOpenSession ? '(Closed)' : ''}
                  </option>
                  <option value="Close">Close</option>
                </select>
              </div>

              {/* Field 2: Enter digit */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: 700
                  }}>
                    Enter digit:
                  </label>
                  {motorDigits.length >= (isSPMotor ? 3 : 2) && (
                    <span style={{
                      fontSize: '12px',
                      color: '#d97706',
                      fontWeight: 800,
                      background: '#fef3c7',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(217, 119, 6, 0.25)'
                    }}>
                      {isSPMotor ? generateSPMotor(motorDigits).length : generateDPMotor(motorDigits).length} Panas
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={motorDigits}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    const unique = Array.from(new Set(cleaned.split(''))).slice(0, 10).join('');
                    setMotorDigits(unique);
                  }}
                  placeholder={isSPMotor ? "enter SP number" : "enter DP number"}
                  maxLength={10}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '16px',
                    fontWeight: 800,
                    outline: 'none',
                    letterSpacing: '1px'
                  }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {isSPMotor ? 'Enter 3 to 10 unique digits (e.g. 12345678)' : 'Enter 2 to 10 unique digits (e.g. 1234)'}
                </span>
              </div>

              {/* Field 3: Enter Points */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 700,
                  marginBottom: '6px'
                }}>
                  Enter Points:
                </label>
                <input
                  type="number"
                  min={minBid}
                  max={maxBid}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '16px',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Action Button: + ADD BID */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.38)',
                  textTransform: 'uppercase',
                  marginTop: '4px'
                }}
              >
                <Plus size={18} strokeWidth={2.6} /> Add Bid
              </button>
            </form>
          ) : (
            <>
              {/* Row 1: Date Pill + Session Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Date Display Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '46px',
              padding: '0 14px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: '14px'
            }}>
              <span>{displayDate}</span>
              <Calendar size={18} color="#f59e0b" />
            </div>

            {/* Session Selector Dropdown */}
            {isSangam ? (
              <div style={{
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                color: '#d97706',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 10px'
              }}>
                Open & Close
              </div>
            ) : isJodiType ? (
              <div style={{
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                color: '#d97706',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 10px'
              }}>
                Full Day Market
              </div>
            ) : (
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '0 12px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#1e293b',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Open" disabled={!marketStatus.isOpenSession}>
                  Open {!marketStatus.isOpenSession ? '(Closed)' : ''}
                </option>
                <option value="Close">Close</option>
              </select>
            )}
          </div>

          {/* Row 2: Enter Points Input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              color: '#64748b',
              fontWeight: 700,
              marginBottom: '6px'
            }}>
              Enter Points:
            </label>
            <input
              type="number"
              min={minBid}
              max={maxBid}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              style={{
                width: '100%',
                height: '48px',
                padding: '0 14px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '16px',
                fontWeight: 800,
                outline: 'none'
              }}
            />
          </div>

          {/* GAME SPECIFIC CLICK-TO-ADD BOARDS */}

          {/* 1. SINGLE DIGIT BULK BOARD (Matches Screenshot Exactly) */}
          {selectedType === 'Single Digit Bulk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Batch Quick Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  onClick={() => handleBatchSingleDigit('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  All (0-9)
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSingleDigit('even')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Even (0,2,4,6,8)
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSingleDigit('odd')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Odd (1,3,5,7,9)
                </button>
              </div>

              {/* 10 Buttons Grid: Row 1 (1-5) and Row 2 (6-0) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(d => {
                  const cartAmt = getNumberCartAmount(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleToggleSingleDigit(d)}
                      style={{
                        position: 'relative',
                        height: '52px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #fba756 0%, #f58f33 100%)',
                        color: '#421d00',
                        fontSize: '19px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {d}
                      {cartAmt && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#0f172a',
                          color: '#f59e0b',
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '1px 4px',
                          borderRadius: '6px',
                          border: '1px solid #f59e0b'
                        }}>
                          ₹{cartAmt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. JODI BULK BOARD (Click to add Jodis + Ank Filter) */}
          {selectedType === 'Jodi Bulk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Ank Filter Tabs (0-9 + Doubles) */}
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                paddingBottom: '2px'
              }}>
                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'doubles'].map(ank => {
                  const isActive = activeJodiAnk === ank;
                  return (
                    <button
                      key={ank}
                      type="button"
                      onClick={() => setActiveJodiAnk(ank)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: isActive ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                        background: isActive ? '#fef3c7' : '#f8fafc',
                        color: isActive ? '#b45309' : '#475569',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {ank === 'doubles' ? 'Doubles' : `Ank ${ank}`}
                    </button>
                  );
                })}
              </div>

              {/* Quick Action: Add all 10 Jodis of selected Ank */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  Tap any Jodi to add bet:
                </span>
                <button
                  type="button"
                  onClick={handleAddAllAnkJodis}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d97706',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add All 10 Jodis
                </button>
              </div>

              {/* 10 Jodi Buttons Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {(activeJodiAnk === 'doubles'
                  ? ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99']
                  : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `${activeJodiAnk}${i}`)
                ).map(jodi => {
                  const cartAmt = getNumberCartAmount(jodi);
                  return (
                    <button
                      key={jodi}
                      type="button"
                      onClick={() => handleToggleJodi(jodi)}
                      style={{
                        position: 'relative',
                        height: '46px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #fba756 0%, #f58f33 100%)',
                        color: '#421d00',
                        fontSize: '16px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 3px 8px rgba(245, 158, 11, 0.28)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {jodi}
                      {cartAmt && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#0f172a',
                          color: '#f59e0b',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          padding: '1px 3px',
                          borderRadius: '5px',
                          border: '1px solid #f59e0b'
                        }}>
                          ₹{cartAmt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Manual Direct 2-digit Typing Box */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px dashed #e2e8f0'
              }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="Or enter Jodi directly (e.g. 45)"
                  value={manualJodi}
                  onChange={(e) => setManualJodi(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  style={{
                    flex: 1,
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manualJodi.length === 2) {
                      handleToggleJodi(manualJodi);
                      setManualJodi('');
                    } else {
                      showMaterialDialog('warning', 'Invalid Jodi', 'Please enter a 2-digit Jodi');
                    }
                  }}
                  style={{
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* 3. SINGLE PANA BULK BOARD (Click to add Panas + Ank Filter) */}
          {selectedType === 'Single Pana Bulk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Ank Filter Tabs (1-9, 0) */}
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                paddingBottom: '2px'
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(ank => {
                  const isActive = activeSinglePanaAnk === ank;
                  return (
                    <button
                      key={ank}
                      type="button"
                      onClick={() => setActiveSinglePanaAnk(ank)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: isActive ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                        background: isActive ? '#fef3c7' : '#f8fafc',
                        color: isActive ? '#b45309' : '#475569',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      Ank {ank}
                    </button>
                  );
                })}
              </div>

              {/* Quick Action: Add all 12 Panas */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  Tap any Pana of Ank {activeSinglePanaAnk} to add:
                </span>
                <button
                  type="button"
                  onClick={handleAddAllSinglePanasOfAnk}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d97706',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add All 12 Panas
                </button>
              </div>

              {/* 12 Single Panas Grid (4 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {SINGLE_PANAS.filter(p => getPanaAnk(p) === activeSinglePanaAnk).map(pana => {
                  const cartAmt = getNumberCartAmount(pana);
                  return (
                    <button
                      key={pana}
                      type="button"
                      onClick={() => handleToggleSinglePana(pana)}
                      style={{
                        position: 'relative',
                        height: '44px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #fba756 0%, #f58f33 100%)',
                        color: '#421d00',
                        fontSize: '15px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 3px 8px rgba(245, 158, 11, 0.28)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {pana}
                      {cartAmt && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#0f172a',
                          color: '#f59e0b',
                          fontSize: '8px',
                          fontWeight: 800,
                          padding: '1px 3px',
                          borderRadius: '5px',
                          border: '1px solid #f59e0b'
                        }}>
                          ₹{cartAmt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Manual Direct 3-digit Typing Box */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px dashed #e2e8f0'
              }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="Or enter 3-digit Pana (e.g. 128)"
                  value={manualSinglePana}
                  onChange={(e) => setManualSinglePana(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  style={{
                    flex: 1,
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const norm = normalizePana(manualSinglePana);
                    if (isValidSinglePana(norm)) {
                      handleToggleSinglePana(norm);
                      setManualSinglePana('');
                    } else {
                      showMaterialDialog('warning', 'Invalid Pana', `${manualSinglePana} is not a valid Single Pana.`);
                    }
                  }}
                  style={{
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* 4. DOUBLE PANA BULK BOARD (Click to add Panas + Ank Filter) */}
          {selectedType === 'Double Pana Bulk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Ank Filter Tabs (1-9, 0) */}
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                paddingBottom: '2px'
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(ank => {
                  const isActive = activeDoublePanaAnk === ank;
                  return (
                    <button
                      key={ank}
                      type="button"
                      onClick={() => setActiveDoublePanaAnk(ank)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: isActive ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                        background: isActive ? '#fef3c7' : '#f8fafc',
                        color: isActive ? '#b45309' : '#475569',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      Ank {ank}
                    </button>
                  );
                })}
              </div>

              {/* Quick Action: Add all Double Panas of Ank */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  Tap any Double Pana of Ank {activeDoublePanaAnk} to add:
                </span>
                <button
                  type="button"
                  onClick={handleAddAllDoublePanasOfAnk}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d97706',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add All Panas
                </button>
              </div>

              {/* Double Panas Grid (3 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {DOUBLE_PANAS.filter(p => getPanaAnk(p) === activeDoublePanaAnk).map(pana => {
                  const cartAmt = getNumberCartAmount(pana);
                  return (
                    <button
                      key={pana}
                      type="button"
                      onClick={() => handleToggleDoublePana(pana)}
                      style={{
                        position: 'relative',
                        height: '44px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #fba756 0%, #f58f33 100%)',
                        color: '#421d00',
                        fontSize: '15px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 3px 8px rgba(245, 158, 11, 0.28)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {pana}
                      {cartAmt && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#0f172a',
                          color: '#f59e0b',
                          fontSize: '8px',
                          fontWeight: 800,
                          padding: '1px 3px',
                          borderRadius: '5px',
                          border: '1px solid #f59e0b'
                        }}>
                          ₹{cartAmt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Manual Direct 3-digit Typing Box */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px dashed #e2e8f0'
              }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="Or enter Double Pana (e.g. 119)"
                  value={manualDoublePana}
                  onChange={(e) => setManualDoublePana(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  style={{
                    flex: 1,
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const norm = normalizePana(manualDoublePana);
                    if (isValidDoublePana(norm)) {
                      handleToggleDoublePana(norm);
                      setManualDoublePana('');
                    } else {
                      showMaterialDialog('warning', 'Invalid Double Pana', `${manualDoublePana} is not a valid Double Pana.`);
                    }
                  }}
                  style={{
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* 5. TRIPLE PANA BOARD */}
          {selectedType === 'Triple Pana' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Tap any Triple Pana to add bet:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {TRIPLE_PANAS.map(pana => {
                  const cartAmt = getNumberCartAmount(pana);
                  return (
                    <button
                      key={pana}
                      type="button"
                      onClick={() => handleToggleTriplePana(pana)}
                      style={{
                        position: 'relative',
                        height: '48px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #fba756 0%, #f58f33 100%)',
                        color: '#421d00',
                        fontSize: '15px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {pana}
                      {cartAmt && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#0f172a',
                          color: '#f59e0b',
                          fontSize: '8px',
                          fontWeight: 800,
                          padding: '1px 3px',
                          borderRadius: '5px',
                          border: '1px solid #f59e0b'
                        }}>
                          ₹{cartAmt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. HALF SANGAM & FULL SANGAM FORM */}
          {isSangam && (
            <form onSubmit={handleAddSangamBet} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedType === 'Half Sangam' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setHalfType('OD_CP');
                      setOpenDigit('');
                      setClosePana('');
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: halfType === 'OD_CP' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                      background: halfType === 'OD_CP' ? '#fef3c7' : '#f8fafc',
                      color: halfType === 'OD_CP' ? '#b45309' : '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Open Digit + Close Pana
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHalfType('OP_CD');
                      setCloseDigit('');
                      setOpenPana('');
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: halfType === 'OP_CD' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                      background: halfType === 'OP_CD' ? '#fef3c7' : '#f8fafc',
                      color: halfType === 'OP_CD' ? '#b45309' : '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Open Pana + Close Digit
                  </button>
                </div>
              )}

              {/* Sangam Inputs (Search with Dropdown for Open/Close Pana & Digit) */}
              {selectedType === 'Half Sangam' ? (
                halfType === 'OD_CP' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <SearchableSelect
                      theme="light"
                      label="1. Open Digit (0-9)"
                      placeholder="Select Open Digit"
                      options={SINGLE_DIGITS}
                      value={openDigit}
                      onChange={(val) => {
                        setOpenDigit(val);
                        if (closePana && val !== '' && !isPanaInFamily(closePana, val, false)) {
                          setClosePana('');
                        }
                      }}
                      maxLength={1}
                    />

                    <SearchableSelect
                      theme="light"
                      label={openDigit !== '' ? `2. Close Pana (Digit ${openDigit} Family)` : '2. Close Pana'}
                      placeholder={openDigit !== '' ? `Pana of Digit ${openDigit}` : 'Select Open Digit first'}
                      options={openDigit !== '' ? getFamilyPanas(openDigit, false) : []}
                      value={closePana}
                      onChange={(val) => setClosePana(val)}
                      disabled={!openDigit}
                      maxLength={3}
                      isPana={true}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <SearchableSelect
                      theme="light"
                      label="1. Close Digit (0-9)"
                      placeholder="Select Close Digit"
                      options={SINGLE_DIGITS}
                      value={closeDigit}
                      onChange={(val) => {
                        setCloseDigit(val);
                        if (openPana && val !== '' && !isPanaInFamily(openPana, val, false)) {
                          setOpenPana('');
                        }
                      }}
                      maxLength={1}
                    />

                    <SearchableSelect
                      theme="light"
                      label={closeDigit !== '' ? `2. Open Pana (Digit ${closeDigit} Family)` : '2. Open Pana'}
                      placeholder={closeDigit !== '' ? `Pana of Digit ${closeDigit}` : 'Select Close Digit first'}
                      options={closeDigit !== '' ? getFamilyPanas(closeDigit, false) : []}
                      value={openPana}
                      onChange={(val) => setOpenPana(val)}
                      disabled={!closeDigit}
                      maxLength={3}
                      isPana={true}
                    />
                  </div>
                )
              ) : (
                /* Full Sangam */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <SearchableSelect
                    theme="light"
                    label="1. Open Pana (3 Digits)"
                    placeholder="Select Open Pana"
                    options={ALL_PANAS}
                    value={fullOpenPana}
                    onChange={(val) => setFullOpenPana(val)}
                    maxLength={3}
                    isPana={true}
                  />

                  <SearchableSelect
                    theme="light"
                    label="2. Close Pana (3 Digits)"
                    placeholder="Select Close Pana"
                    options={ALL_PANAS}
                    value={fullClosePana}
                    onChange={(val) => setFullClosePana(val)}
                    maxLength={3}
                    isPana={true}
                  />
                </div>
              )}

              {/* Sangam Add Button */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                  textTransform: 'uppercase',
                  marginTop: '4px'
                }}
              >
                <Plus size={18} /> Add Sangam Bet
              </button>
            </form>
          )}
            </>
          )}
        </div>

        {/* CARD 2: STAGED BET LIST TABLE & SUBMIT BAR (Matching User Mobile Screenshot) */}
        <BidCartTable
          bids={stagedBids}
          onRemoveBid={handleRemoveBid}
          onClearCart={handleClearCart}
          onSubmitBids={handleSubmitCart}
          isSubmitting={loading}
          walletBalance={parseFloat(wallet || '0')}
        />
      </div>



      {/* Material Dialog for Alerts & Confirmations */}
      <MaterialDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        showCancel={dialog.showCancel}
        onConfirm={dialog.onConfirm}
        onClose={closeMaterialDialog}
      />
    </div>
  );
};

export default PlayGame;
