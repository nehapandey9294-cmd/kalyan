import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Users, Gamepad2, TrendingUp, RefreshCw, Calendar, Filter, 
  CheckCircle2, XCircle, Clock, Search, Trophy, Wallet, 
  ArrowUpRight, ShieldCheck, Sparkles, UserCheck, UserX, Eye,
  Home, Share2, Target, FileText, Settings, ChevronDown, ChevronRight, ChevronLeft, Menu, Maximize2, LogOut, Zap,
  CreditCard, MessageSquare, Bell
} from 'lucide-react';
import PaymentGatewayManager from './PaymentGatewayManager';
import AdminSupportChat from './AdminSupportChat';
import chatSocket from '../../utils/chatSocket';
import api from '../../utils/api';
import { useAdminSession, clearAdminSession } from '../../utils/adminSession';
import DataTable, { PaginationBar } from '../../components/common/DataTable';
import { getISTTodayStr, formatDisplayDateTime, formatDisplayDate } from '../../utils/indianTime';
import {
  SINGLE_DIGITS,
  JODI_DIGITS,
  SINGLE_PANAS_BY_ANK,
  DOUBLE_PANAS_BY_ANK,
  TRIPLE_PANAS,
  ALL_PANAS_220
} from '../../utils/gameNumbersData';

const REFERRAL_TYPES_LIST = [
  {
    id: 'signup',
    title: '🎉 Fixed One-Time Bonus on Signup',
    badge: 'Registration Bonus',
    description: 'Referrer receives a fixed bonus amount in their wallet immediately when a new user registers using their referral phone number.'
  },
  {
    id: 'first_deposit',
    title: '💳 First Deposit Commission (%)',
    badge: '1st Deposit',
    description: 'Referrer receives a percentage commission on the FIRST approved deposit made by the referred user.'
  },
  {
    id: 'every_deposit',
    title: '🔄 Every Deposit Commission (%)',
    badge: 'All Deposits',
    description: 'Referrer receives a percentage commission on EVERY approved deposit made by the referred user.'
  },
  {
    id: 'first_bet',
    title: '🎯 First Bet / Bid Commission (%)',
    badge: '1st Game Bid',
    description: 'Referrer receives a percentage commission when the referred user places their VERY FIRST game bid.'
  },
  {
    id: 'every_bet',
    title: '🎰 Every Bet / Bid Commission (%)',
    badge: 'All Game Bids',
    description: 'Referrer receives a percentage commission on EVERY game bid placed by the referred user.'
  }
];

const AdminDashboard = ({ setAdminAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('admin_token');

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Handle auto logout when session expires (30m inactive or 1h max session)
  const handleSessionExpire = (reason) => {
    if (setAdminAuth) {
      setAdminAuth(false);
    }
    navigate(`/admin/login?reason=${reason || 'expired'}`, { replace: true });
  };

  const { warning, extendInactivity } = useAdminSession(handleSessionExpire);

  // Active navigation tab (Restored from URL query param or localStorage on refresh)
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryTab = searchParams.get('tab');
    if (queryTab) return queryTab;
    return localStorage.getItem('admin_active_tab') || 'dashboards';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Mobile responsive sidebar state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 992);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [adminName, setAdminName] = useState(() => localStorage.getItem('admin_name') || 'Admin');
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Real-time Badge Counts state for Menu and Notifications
  const [badgeCounts, setBadgeCounts] = useState({
    pending_deposits: 0,
    pending_withdrawals: 0,
    pending_auto_deposits: 0,
    unread_chats: 0,
    unapproved_users: 0,
    total_wallet_pending: 0,
    total_notifications: 0
  });
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [adminToast, setAdminToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const prevBadgeTotalsRef = useRef(null);

  const showAdminToast = ({ title, message, tab }) => {
    playNotificationChime();
    setAdminToast({ title, message, tab });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setAdminToast(null);
    }, 7000);
  };

  // Synthesized notification audio chime (friendly dual tone)
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
    } catch (e) {
      // Audio autoplay policy handled
    }
  };

  // Fetch badge counts from backend
  const fetchBadgeCounts = async (allowSound = false) => {
    try {
      const res = await api.get('/admin/badge-counts', getHeaders());
      if (res.data && res.data.success === '1' && res.data.data) {
        const counts = res.data.data;
        const newTotal = Number(counts.total_notifications || 0);
        if (allowSound && prevBadgeTotalsRef.current !== null && newTotal > prevBadgeTotalsRef.current) {
          playNotificationChime();
        }
        prevBadgeTotalsRef.current = newTotal;
        setBadgeCounts(counts);
        if (typeof counts.unread_chats === 'number') {
          setChatUnreadCount(counts.unread_chats);
        }
      }
    } catch (e) {
      // badge counts error ignored silently
    }
  };

  // Poll & listen to real-time badge updates and chat messages
  useEffect(() => {
    // Authenticate & connect Admin WebSocket immediately
    chatSocket.init({ role: 'admin', name: adminName || 'Admin' });

    fetchBadgeCounts(false);
    const interval = setInterval(() => {
      fetchBadgeCounts(true);
    }, 12000);

    const unsubBadge = chatSocket.onBadgeUpdate((data) => {
      fetchBadgeCounts(true);
      if (data && data.message) {
        showAdminToast({
          title: data.title || (data.event === 'new_user' ? 'New User Registered' : 'Notification Alert'),
          message: data.message,
          tab: data.event === 'new_user' ? 'user_management' : (data.event === 'new_deposit' ? 'deposits' : (data.event === 'new_withdraw' ? 'withdrawals' : ''))
        });
      }
    });

    const unsubMsg = chatSocket.onMessage((msg) => {
      if (msg && msg.sender_type === 'user') {
        fetchBadgeCounts(true);
        if (activeTab !== 'support_chat') {
          showAdminToast({
            title: 'New Chat Message',
            message: `💬 ${msg.sender_name || msg.user_phone || 'User'}: ${msg.message || 'Sent an attachment'}`,
            tab: 'support_chat'
          });
        }
      }
    });

    return () => {
      clearInterval(interval);
      unsubBadge();
      unsubMsg();
    };
  }, [adminName, activeTab]);

  useEffect(() => {
    if (activeTab === 'support_chat') {
      setChatUnreadCount(0);
      setBadgeCounts(prev => ({
        ...prev,
        unread_chats: 0,
        total_notifications: Math.max(0, (prev.total_notifications || 0) - (prev.unread_chats || 0))
      }));
    }
  }, [activeTab]);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showNotificationsDropdown && !e.target.closest('#admin-notifications-container')) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showNotificationsDropdown]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 992;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(prev => !prev);
    } else {
      setIsDesktopSidebarCollapsed(prev => !prev);
    }
  };

  // Persist activeTab to localStorage & update URL search parameter
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('admin_active_tab', activeTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== activeTab) {
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [activeTab]);

  // Submenu collapse states
  const [openMenus, setOpenMenus] = useState({
    commission: true,
    reports: false,
    wallet: false,
    games: false,
    numbers: false,
    settings: false
  });

  // Automatically open relevant sidebar menu based on activeTab
  useEffect(() => {
    if (['user_commission', 'user_commission_pay_list'].includes(activeTab)) {
      setOpenMenus(prev => ({ ...prev, commission: true }));
    } else if (['bid_history_report', 'customer_sell_report', 'winning_report', 'transfer_report', 'withdraw_report', 'add_fund_report', 'report_bid_history', 'report_sell', 'report_winning', 'report_transfer', 'report_bid_win', 'report_withdraw', 'report_auto_deposit', 'report_add_fund', 'winning_prediction'].includes(activeTab)) {
      setOpenMenus(prev => ({ ...prev, reports: true }));
    } else if (['deposits', 'withdrawals', 'add_fund_wallet', 'bid_revert'].includes(activeTab)) {
      setOpenMenus(prev => ({ ...prev, wallet: true }));
    } else if (['game_names', 'rates'].includes(activeTab)) {
      setOpenMenus(prev => ({ ...prev, games: true }));
    } else if (activeTab.startsWith('num_')) {
      setOpenMenus(prev => ({ ...prev, numbers: true }));
    } else if (['settings', 'contact_settings', 'sliders', 'how_to_play'].includes(activeTab)) {
      setOpenMenus(prev => ({ ...prev, settings: true }));
    }
  }, [activeTab]);

  const toggleMenu = (menuKey) => {
    setOpenMenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  // Top-Right Profile Dropdown & Change Password Modal
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [retypePass, setRetypePass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  // General State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminCoins, setAdminCoins] = useState(0);

  // Dashboard Stats (Image 2)
  const [metrics, setMetrics] = useState({
    total_users: 0,
    unapproved_users: 0,
    approved_users: 0,
    total_games: 0,
    today_bid_amount: 0,
    admin_wallet: 0
  });

  const [games, setGames] = useState([]);
  const [selectedGameForMarket, setSelectedGameForMarket] = useState('');
  const [marketBidAmount, setMarketBidAmount] = useState('N/A');

  // 10 Single Ank Cards State
  const [ankGameName, setAnkGameName] = useState('');
  const [ankMarketStatus, setAnkMarketStatus] = useState('open_digit');
  const [ankDate, setAnkDate] = useState(new Date().toISOString().slice(0, 10));
  const [ankBids, setAnkBids] = useState({
    0: { bids: 0, amount: 0 },
    1: { bids: 0, amount: 0 },
    2: { bids: 0, amount: 0 },
    3: { bids: 0, amount: 0 },
    4: { bids: 0, amount: 0 },
    5: { bids: 0, amount: 0 },
    6: { bids: 0, amount: 0 },
    7: { bids: 0, amount: 0 },
    8: { bids: 0, amount: 0 },
    9: { bids: 0, amount: 0 }
  });

  // Bid Winning Report State
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportGameName, setReportGameName] = useState('all');
  const [bidWinData, setBidWinData] = useState({ total_bid: 0, total_win: 0, profit: 0 });

  // Auto Deposits State (Dashboard Grid Row 3)
  const [autoDepositDate, setAutoDepositDate] = useState(() => getISTTodayStr());
  const [autoDeposits, setAutoDeposits] = useState([]);
  const [autoDepositSearch, setAutoDepositSearch] = useState('');
  const [autoDepositPage, setAutoDepositPage] = useState(1);
  const [autoDepositPerPage, setAutoDepositPerPage] = useState(10);
  const [autoDepositTotalCount, setAutoDepositTotalCount] = useState(0);
  const [autoDepositTotals, setAutoDepositTotals] = useState({ total_transfer: 0, total_approved: 0, total_rejected: 0, total_pending: 0 });
  const [autoDepositsLoading, setAutoDepositsLoading] = useState(false);

  // User Management State (Image 3)
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('all'); // 'all' or 'unapproved'
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPerPage, setUserPerPage] = useState(25);
  const [userTotal, setUserTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [walletAdjustPoints, setWalletAdjustPoints] = useState('');
  const [walletAdjustType, setWalletAdjustType] = useState('add');

  // Dedicated User Details View State
  const [selectedUserId, setSelectedUserId] = useState(() => localStorage.getItem('admin_selected_user_id') || null);
  const [userDetailsData, setUserDetailsData] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [walletAdjAmount, setWalletAdjAmount] = useState('');
  const [walletAdjType, setWalletAdjType] = useState('add');
  const [walletAdjRemark, setWalletAdjRemark] = useState('');
  const [walletAdjSubmitting, setWalletAdjSubmitting] = useState(false);
  const [activeUserSubTab, setActiveUserSubTab] = useState('deposits');

  // Referral Report State (Image 4)
  const [referrals, setReferrals] = useState([]);
  const [referralSearch, setReferralSearch] = useState('');
  const [referralPage, setReferralPage] = useState(1);
  const [referralPerPage, setReferralPerPage] = useState(25);
  const [referralTotal, setReferralTotal] = useState(0);
  const [referralsLoading, setReferralsLoading] = useState(false);

  // User Commission Pending State (Image 5)
  const [commissionFromDate, setCommissionFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [commissionToDate, setCommissionToDate] = useState(new Date().toISOString().slice(0, 10));
  const [commissionList, setCommissionList] = useState([]);
  const [selectedCommissionIds, setSelectedCommissionIds] = useState([]);
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionPerPage, setCommissionPerPage] = useState(25);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [commissionsLoading, setCommissionsLoading] = useState(false);

  // User Commission Pay List State (Matching User Screenshot)
  const [commissionPayList, setCommissionPayList] = useState([]);
  const [payListFromDate, setPayListFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [payListToDate, setPayListToDate] = useState(new Date().toISOString().slice(0, 10));
  const [payListPage, setPayListPage] = useState(1);
  const [payListPerPage, setPayListPerPage] = useState(25);
  const [payListTotal, setPayListTotal] = useState(0);
  const [payListLoading, setPayListLoading] = useState(false);

  // Existing Modules: Rates, Settings, Sliders, Deposits, Withdrawals
  const [rates, setRates] = useState([]);
  const [settingsData, setSettingsData] = useState({});
  const [contactData, setContactData] = useState({});
  const [withdrawDays, setWithdrawDays] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const [contactLoading, setContactLoading] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [contactError, setContactError] = useState('');

  const [howToPlayContent, setHowToPlayContent] = useState('');
  const [howToPlayLoading, setHowToPlayLoading] = useState(false);
  const [howToPlayMsg, setHowToPlayMsg] = useState('');

  const [sliders, setSliders] = useState([]);
  const [slidersLoading, setSlidersLoading] = useState(false);
  const [showAddSliderModal, setShowAddSliderModal] = useState(false);
  const [newSliderForm, setNewSliderForm] = useState({ slider_image: '', display_order: '1' });
  const [addSliderLoading, setAddSliderLoading] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);

  // ==========================================
  // GAMES MANAGEMENT STATES (PHP PARITY)
  // ==========================================
  const [adminGamesList, setAdminGamesList] = useState([]);
  const [adminGamesSearch, setAdminGamesSearch] = useState('');
  const [adminGamesLoading, setAdminGamesLoading] = useState(false);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [newGameForm, setNewGameForm] = useState({ game_name: '', open_time: '', close_time: '' });
  const [addGameLoading, setAddGameLoading] = useState(false);
  const [addGameError, setAddGameError] = useState('');
  const [addGameSuccess, setAddGameSuccess] = useState('');

  // Edit Week Game Modal State
  const [editWeekModal, setEditWeekModal] = useState(null);
  const [editWeekLoading, setEditWeekLoading] = useState(false);
  const [editWeekSaving, setEditWeekSaving] = useState(false);

  // Game Rates Form State
  const [gameRatesForm, setGameRatesForm] = useState({});
  const [gameRatesLoading, setGameRatesLoading] = useState(false);
  const [gameRatesMsg, setGameRatesMsg] = useState('');
  const [gameRatesError, setGameRatesError] = useState('');

  // Declare Result State
  const [declareSelectedGame, setDeclareSelectedGame] = useState('');
  const [declareDate, setDeclareDate] = useState(new Date().toISOString().slice(0, 10));
  const [declareSession, setDeclareSession] = useState('open');
  const [declareOpenPana, setDeclareOpenPana] = useState('');
  const [declareOpenResult, setDeclareOpenResult] = useState('');
  const [declareClosePana, setDeclareClosePana] = useState('');
  const [declareCloseResult, setDeclareCloseResult] = useState('');
  const [declareLoading, setDeclareLoading] = useState(false);
  const [declareError, setDeclareError] = useState('');
  const [declareSuccess, setDeclareSuccess] = useState('');

  // Declared Results List & Winner Preview Modal States
  const [declaredResultsList, setDeclaredResultsList] = useState([]);
  const [declaredResultsLoading, setDeclaredResultsLoading] = useState(false);
  const [showWinnerPreviewModal, setShowWinnerPreviewModal] = useState(false);
  const [previewWinnersData, setPreviewWinnersData] = useState({ totalWinners: 0, totalPayout: 0, winners: [] });
  const [previewLoading, setPreviewLoading] = useState(false);

  // Searchable Pana Dropdown & Auto Digit Calculation Helpers
  const [showOpenPanaDropdown, setShowOpenPanaDropdown] = useState(false);
  const [showClosePanaDropdown, setShowClosePanaDropdown] = useState(false);

  const getPanaSingleDigit = (panaStr) => {
    if (!panaStr || panaStr.length !== 3) return '';
    const d1 = parseInt(panaStr[0], 10) || 0;
    const d2 = parseInt(panaStr[1], 10) || 0;
    const d3 = parseInt(panaStr[2], 10) || 0;
    const sum = d1 + d2 + d3;
    return (sum % 10).toString();
  };

  const handleOpenPanaSelect = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 3);
    setDeclareOpenPana(digitsOnly);
    if (digitsOnly.length === 3) {
      setDeclareOpenResult(getPanaSingleDigit(digitsOnly));
    }
  };

  const handleClosePanaSelect = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 3);
    setDeclareClosePana(digitsOnly);
    if (digitsOnly.length === 3) {
      setDeclareCloseResult(getPanaSingleDigit(digitsOnly));
    }
  };

  // Image File Picker Helper (Converts selected file to Data URL base64)
  const handleImageFilePick = (e, callback) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please select a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Str = uploadEvent.target.result;
        callback(base64Str);
      };
      reader.readAsDataURL(file);
    }
  };

  // ==========================================
  // REPORT MANAGEMENT STATES
  // ==========================================
  // 1. Users Bid History
  const [bidHistoryDate, setBidHistoryDate] = useState(getISTTodayStr());
  const [bidHistoryGame, setBidHistoryGame] = useState('all');
  const [bidHistoryType, setBidHistoryType] = useState('all');
  const [bidHistoryList, setBidHistoryList] = useState([]);
  const [bidHistoryPage, setBidHistoryPage] = useState(1);
  const [bidHistoryPerPage, setBidHistoryPerPage] = useState(25);
  const [bidHistoryTotalCount, setBidHistoryTotalCount] = useState(0);
  const [bidHistorySearch, setBidHistorySearch] = useState('');
  const [bidHistoryLoading, setBidHistoryLoading] = useState(false);
  const [editBidModal, setEditBidModal] = useState(null);
  const [editBidForm, setEditBidForm] = useState({ open_pana: '', open_digit: '', close_pana: '', close_digit: '', points_action: '' });
  const [editBidLoading, setEditBidLoading] = useState(false);
  const [showEditOpenPanaDropdown, setShowEditOpenPanaDropdown] = useState(false);
  const [showEditOpenDigitDropdown, setShowEditOpenDigitDropdown] = useState(false);
  const [showEditClosePanaDropdown, setShowEditClosePanaDropdown] = useState(false);
  const [showEditCloseDigitDropdown, setShowEditCloseDigitDropdown] = useState(false);

  // 2. Customer Sell Report
  const [sellDate, setSellDate] = useState(new Date().toISOString().slice(0, 10));
  const [sellGame, setSellGame] = useState('all');
  const [sellType, setSellType] = useState('all');
  const [sellSession, setSellSession] = useState('open');
  const [sellReportData, setSellReportData] = useState({});
  const [sellGrandTotal, setSellGrandTotal] = useState(0);
  const [sellLoading, setSellLoading] = useState(false);

  // 3. Winning Report
  const [winningDate, setWinningDate] = useState(new Date().toISOString().slice(0, 10));
  const [winningGame, setWinningGame] = useState('all');
  const [winningSession, setWinningSession] = useState('all');
  const [winningList, setWinningList] = useState([]);
  const [winningPage, setWinningPage] = useState(1);
  const [winningPerPage, setWinningPerPage] = useState(25);
  const [winningTotalCount, setWinningTotalCount] = useState(0);
  const [winningSearch, setWinningSearch] = useState('');
  const [winningTotalAmt, setWinningTotalAmt] = useState(0);
  const [winningTotalPoints, setWinningTotalPoints] = useState(0);
  const [winningLoading, setWinningLoading] = useState(false);

  // 4. Transfer Point Report
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferList, setTransferList] = useState([]);
  const [transferTotal, setTransferTotal] = useState(0);
  const [transferPage, setTransferPage] = useState(1);
  const [transferPerPage, setTransferPerPage] = useState(25);
  const [transferTotalCount, setTransferTotalCount] = useState(0);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // 5. Bid Win Report
  const [bidWinRepDate, setBidWinRepDate] = useState(new Date().toISOString().slice(0, 10));
  const [bidWinRepGame, setBidWinRepGame] = useState('all');
  const [bidWinRepData, setBidWinRepData] = useState({ total_bid: 0, total_win: 0, profit: 0 });
  const [bidWinRepDetails, setBidWinRepDetails] = useState('none');
  const [bidWinRepDetailList, setBidWinRepDetailList] = useState([]);
  const [bidWinRepLoading, setBidWinRepLoading] = useState(false);

  // 6. Withdraw Report
  const [withdrawRepDate, setWithdrawRepDate] = useState('');
  const [withdrawRepList, setWithdrawRepList] = useState([]);
  const [withdrawRepTotal, setWithdrawRepTotal] = useState(0);
  const [withdrawRepPage, setWithdrawRepPage] = useState(1);
  const [withdrawRepPerPage, setWithdrawRepPerPage] = useState(25);
  const [withdrawRepTotalCount, setWithdrawRepTotalCount] = useState(0);
  const [withdrawRepSearch, setWithdrawRepSearch] = useState('');
  const [withdrawRepLoading, setWithdrawRepLoading] = useState(false);

  // 7. Auto Deposit History
  const [autoDepDate, setAutoDepDate] = useState('');
  const [autoDepList, setAutoDepList] = useState([]);
  const [autoDepTotals, setAutoDepTotals] = useState({ total_transfer: 0, total_approved: 0, total_rejected: 0, total_pending: 0 });
  const [autoDepPage, setAutoDepPage] = useState(1);
  const [autoDepPerPage, setAutoDepPerPage] = useState(25);
  const [autoDepTotalCount, setAutoDepTotalCount] = useState(0);
  const [autoDepSearch, setAutoDepSearch] = useState('');
  const [autoDepLoading, setAutoDepLoading] = useState(false);

  // ==========================================
  // WALLET MANAGEMENT & ADD FUND REPORT STATES
  // ==========================================
  // 1. Fund Request (deposits)
  const [fundReqDate, setFundReqDate] = useState('');
  const [fundReqList, setFundReqList] = useState([]);
  const [fundReqTotal, setFundReqTotal] = useState(0);
  const [fundReqPage, setFundReqPage] = useState(1);
  const [fundReqPerPage, setFundReqPerPage] = useState(10);
  const [fundReqTotalCount, setFundReqTotalCount] = useState(0);
  const [fundReqSearch, setFundReqSearch] = useState('');
  const [fundReqLoading, setFundReqLoading] = useState(false);

  // 2. Withdraw Request (withdrawals)
  const [withReqDate, setWithReqDate] = useState('');
  const [withReqList, setWithReqList] = useState([]);
  const [withReqTotals, setWithReqTotals] = useState({ total_amount: 0, total_approved: 0, total_rejected: 0, total_pending: 0 });
  const [withReqPage, setWithReqPage] = useState(1);
  const [withReqPerPage, setWithReqPerPage] = useState(10);
  const [withReqTotalCount, setWithReqTotalCount] = useState(0);
  const [withReqSearch, setWithReqSearch] = useState('');
  const [withReqStatus, setWithReqStatus] = useState('all');
  const [withReqLoading, setWithReqLoading] = useState(false);
  const [selectedWithdrawModal, setSelectedWithdrawModal] = useState(null);
  const [modalUserData, setModalUserData] = useState(null);
  const [modalUserLoading, setModalUserLoading] = useState(false);

  useEffect(() => {
    if (selectedWithdrawModal && (selectedWithdrawModal.username || selectedWithdrawModal.phone)) {
      const userPhone = selectedWithdrawModal.username || selectedWithdrawModal.phone;
      setModalUserLoading(true);
      api.get(`/admin/user-details/${userPhone}`, getHeaders())
        .then(res => {
          if (res.data.success === '1' && res.data.user) {
            setModalUserData(res.data.user);
          } else {
            setModalUserData(null);
          }
        })
        .catch(() => setModalUserData(null))
        .finally(() => setModalUserLoading(false));
    } else {
      setModalUserData(null);
    }
  }, [selectedWithdrawModal]);

  // 3. Add Fund (User Wallet)
  const [addFundUserPhone, setAddFundUserPhone] = useState('');
  const [addFundAmount, setAddFundAmount] = useState('');
  const [addFundLoading, setAddFundLoading] = useState(false);
  const [addFundMsg, setAddFundMsg] = useState('');
  const [addFundError, setAddFundError] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userDetailSearchQuery, setUserDetailSearchQuery] = useState('');
  const [showAddFundUserDropdown, setShowAddFundUserDropdown] = useState(false);

  // 4. Bid Revert
  const [bidRevertDate, setBidRevertDate] = useState(new Date().toISOString().slice(0, 10));
  const [bidRevertGame, setBidRevertGame] = useState('');
  const [bidRevertList, setBidRevertList] = useState([]);
  const [bidRevertLoading, setBidRevertLoading] = useState(false);
  const [bidRevertMsg, setBidRevertMsg] = useState('');
  const [showRevertConfirmModal, setShowRevertConfirmModal] = useState(false);

  // 5. Add Fund Report
  const [addFundRepDate, setAddFundRepDate] = useState('');
  const [addFundRepList, setAddFundRepList] = useState([]);
  const [addFundRepPage, setAddFundRepPage] = useState(1);
  const [addFundRepPerPage, setAddFundRepPerPage] = useState(25);
  const [addFundRepTotalCount, setAddFundRepTotalCount] = useState(0);
  const [addFundRepSearch, setAddFundRepSearch] = useState('');
  const [addFundRepLoading, setAddFundRepLoading] = useState(false);
  // (getHeaders defined at top scope)

  const fetchAdminCoins = async () => {
    if (!token) return;
    try {
      const res = await api.get('/admin/metrics', getHeaders());
      if (res.data.success === '1') {
        setAdminCoins(res.data.metrics.admin_wallet || 0);
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserFullDetails = async (userId) => {
    setUserDetailsLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}/details`, getHeaders());
      if (res.data.success === '1') {
        setUserDetailsData(res.data.data);
        if (res.data.data?.user?.id) {
          setSelectedUserId(res.data.data.user.id);
          localStorage.setItem('admin_selected_user_id', res.data.data.user.id);
        }
      } else {
        alert(res.data.msg || 'Failed to fetch user details');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching user details');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleOpenUserDetails = (user, initialSubTab) => {
    let target = user;
    if (typeof user === 'object' && user !== null) {
      target = user.user_id || user.id || user.user_phone || user.phone || user.username || user.phone_number;
    }
    if (!target) return;
    if (initialSubTab) {
      setActiveUserSubTab(initialSubTab);
    }
    setSelectedUserId(target);
    localStorage.setItem('admin_selected_user_id', target);
    if (activeTab === 'user-details') {
      fetchUserFullDetails(target);
    } else {
      setActiveTab('user-details');
    }
  };

  useEffect(() => {
    if (activeTab === 'user-details') {
      if (users.length === 0) {
        fetchUsers();
      }
      const targetId = localStorage.getItem('admin_selected_user_id') || selectedUserId || 'first';
      fetchUserFullDetails(targetId);
    }
  }, [activeTab]);

  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.trim() === '') {
      alert('Please enter a new password');
      return;
    }
    setPasswordUpdating(true);
    try {
      const res = await api.post('/admin/users/update-password', {
        userId: selectedUserId,
        newPassword: newPasswordInput.trim()
      }, getHeaders());
      if (res.data.success === '1') {
        alert(res.data.msg || 'Password updated successfully!');
        setNewPasswordInput('');
        fetchUserFullDetails(selectedUserId);
        fetchUsers();
      } else {
        alert(res.data.msg || 'Failed to update password');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating password');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleAdjustWalletSubmit = async (e) => {
    e.preventDefault();
    if (!walletAdjAmount || parseFloat(walletAdjAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!userDetailsData || !userDetailsData.user) return;

    setWalletAdjSubmitting(true);
    try {
      const res = await api.post('/admin/users/adjust-wallet', {
        phone: userDetailsData.user.phone,
        type: walletAdjType,
        amount: walletAdjAmount,
        remark: walletAdjRemark
      }, getHeaders());

      if (res.data.success === '1') {
        alert(res.data.msg || 'Wallet updated successfully!');
        setWalletAdjAmount('');
        setWalletAdjRemark('');
        fetchUserFullDetails(selectedUserId);
        fetchUsers();
      } else {
        alert(res.data.msg || 'Failed to adjust wallet');
      }
    } catch (err) {
      console.error(err);
      alert('Error adjusting wallet');
    } finally {
      setWalletAdjSubmitting(false);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await api.get('/games', getHeaders());
      setGames(res.data.result || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnkBids = async () => {
    try {
      const res = await api.get(`/admin/metrics/ank-bids?game_name=${ankGameName}&market_status=${ankMarketStatus}&date=${ankDate}`, getHeaders());
      if (res.data.success === '1') {
        setAnkBids(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBidWinReport = async () => {
    try {
      const res = await api.get(`/admin/metrics/bid-win-report?date=${reportDate}&game_name=${reportGameName}`, getHeaders());
      if (res.data.success === '1') {
        setBidWinData({
          total_bid: res.data.total_bid,
          total_win: res.data.total_win,
          profit: res.data.profit
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAutoDeposits = async (selectedDate = autoDepositDate, page = autoDepositPage, limit = autoDepositPerPage, search = autoDepositSearch) => {
    setAutoDepositsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate && selectedDate !== 'all') params.append('date', selectedDate);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/auto-deposits${queryStr}`, getHeaders());
      if (res.data.success === '1') {
        setAutoDeposits(res.data.data || []);
        setAutoDepositTotalCount(res.data.pagination?.total || (res.data.data || []).length);
        if (res.data.totals) setAutoDepositTotals(res.data.totals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAutoDepositsLoading(false);
    }
  };

  const fetchUsers = async (page = userPage, limit = userPerPage, search = userSearch, filter = userFilter) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      if (filter === 'unapproved') params.append('filter', 'unapproved');
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/users${queryStr}`, getHeaders());
      if (res.data.success === '1') {
        setUsers(res.data.data || []);
        setUserTotal(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchReferrals = async (page = referralPage, limit = referralPerPage, search = referralSearch) => {
    setReferralsLoading(true);
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/referrals${queryStr}`, getHeaders());
      if (res.data.success === '1') {
        setReferrals(res.data.data || []);
        setReferralTotal(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReferralsLoading(false);
    }
  };

  const fetchCommissions = async (fromDate = commissionFromDate, toDate = commissionToDate, page = commissionPage, limit = commissionPerPage) => {
    setCommissionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      const res = await api.get(`/admin/commission/pending?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setCommissionList(res.data.data || []);
        setCommissionTotal(res.data.pagination?.total || (res.data.data || []).length);
        setSelectedCommissionIds([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommissionsLoading(false);
    }
  };

  const fetchCommissionPayList = async (fromDate = payListFromDate, toDate = payListToDate, page = payListPage, limit = payListPerPage) => {
    setPayListLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      const res = await api.get(`/admin/commission/paid?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setCommissionPayList(res.data.data || []);
        setPayListTotal(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayListLoading(false);
    }
  };

  const format12To24 = (time12) => {
    if (!time12) return '';
    if (!time12.toLowerCase().includes('am') && !time12.toLowerCase().includes('pm')) {
      return time12.trim();
    }
    const parts = time12.trim().split(' ');
    if (parts.length < 2) return time12;
    const [hm, modifier] = parts;
    let [h, m] = hm.split(':').map(Number);
    if (modifier.toLowerCase() === 'pm' && h < 12) h += 12;
    if (modifier.toLowerCase() === 'am' && h === 12) h = 0;
    return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
  };

  // ==========================================
  // GAMES MANAGEMENT FETCH & ACTION FUNCTIONS
  // ==========================================
  const fetchAdminGames = async () => {
    setAdminGamesLoading(true);
    try {
      const res = await api.get('/admin/games', getHeaders());
      if (res.data.success === '1') {
        setAdminGamesList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdminGamesLoading(false);
    }
  };

  const handleAddGameSubmit = async (e) => {
    e.preventDefault();
    if (!newGameForm.game_name || !newGameForm.open_time || !newGameForm.close_time) {
      setAddGameError('Please fill in Game Name, Open Time and Close Time');
      return;
    }
    setAddGameLoading(true);
    setAddGameError('');
    setAddGameSuccess('');
    try {
      const res = await api.post('/admin/games/add', newGameForm, getHeaders());
      if (res.data.success === '1') {
        setAddGameSuccess(res.data.msg || 'Game Added Successfully');
        setNewGameForm({ game_name: '', open_time: '', close_time: '' });
        fetchAdminGames();
        fetchGames();
        setTimeout(() => {
          setShowAddGameModal(false);
          setAddGameSuccess('');
        }, 1200);
      } else {
        setAddGameError(res.data.msg || 'Failed to add game');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.msg || err.response?.data?.error || 'Error adding game';
      setAddGameError(msg);
    } finally {
      setAddGameLoading(false);
    }
  };

  const handleOpenEditWeek = async (gameName) => {
    setEditWeekLoading(true);
    try {
      const res = await api.get(`/admin/games/week/${encodeURIComponent(gameName)}`, getHeaders());
      if (res.data.success === '1') {
        const formattedDays = (res.data.days || []).map(d => ({
          ...d,
          open_time_24: format12To24(d.open_time),
          close_time_24: format12To24(d.close_time),
          status: String(d.status)
        }));
        setEditWeekModal({ game_name: gameName, days: formattedDays });
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching game week schedule');
    } finally {
      setEditWeekLoading(false);
    }
  };

  const handleSaveWeekSchedule = async (e) => {
    e.preventDefault();
    if (!editWeekModal) return;
    setEditWeekSaving(true);
    try {
      const payload = {
        game_name: editWeekModal.game_name,
        days: editWeekModal.days.map(d => ({
          day: d.day,
          open_time: d.open_time_24,
          close_time: d.close_time_24,
          status: d.status
        }))
      };
      const res = await api.post('/admin/games/week/update', payload, getHeaders());
      if (res.data.success === '1') {
        alert(res.data.msg || 'Game Week Schedule Updated Successfully');
        setEditWeekModal(null);
        fetchAdminGames();
      } else {
        alert(res.data.msg || 'Failed to update week schedule');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating week schedule');
    } finally {
      setEditWeekSaving(false);
    }
  };

  const handleDeleteGame = async (gameName) => {
    if (!window.confirm(`Are you sure you want to delete "${gameName}"?`)) return;
    try {
      const res = await api.post('/admin/games/delete', { game_name: gameName }, getHeaders());
      if (res.data.success === '1') {
        fetchAdminGames();
        fetchGames();
      } else {
        alert(res.data.msg || 'Failed to delete game');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting game');
    }
  };

  const fetchRates = async () => {
    setGameRatesLoading(true);
    try {
      const res = await api.get('/admin/rates', getHeaders());
      if (res.data.success === '1') {
        setRates(res.data.data || []);
        const formData = {};
        (res.data.data || []).forEach(r => {
          formData[r.type] = { min_value: r.min_value, max_value: r.max_value, id: r.id };
          const norm = (r.type || '').replace(/\s+/g, '').toLowerCase();
          if (norm.includes('triple') || norm.includes('tripple')) {
            formData['Triple Pana'] = { min_value: r.min_value, max_value: r.max_value, id: r.id };
            formData['Tripple Pana'] = { min_value: r.min_value, max_value: r.max_value, id: r.id };
          }
        });
        setGameRatesForm(formData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGameRatesLoading(false);
    }
  };

  const handleUpdateGameRates = async (e) => {
    e.preventDefault();
    setGameRatesLoading(true);
    setGameRatesMsg('');
    setGameRatesError('');
    try {
      const ratesArray = Object.entries(gameRatesForm).map(([type, vals]) => ({
        id: vals.id,
        type,
        min_value: vals.min_value,
        max_value: vals.max_value
      }));
      const res = await api.post('/admin/rates/update', { rates: ratesArray }, getHeaders());
      if (res.data.success === '1') {
        setGameRatesMsg(res.data.msg || 'Game Rates Updated Successfully!');
        fetchRates();
      } else {
        setGameRatesError(res.data.msg || 'Failed to update rates');
      }
    } catch (err) {
      console.error(err);
      setGameRatesError('Error updating game rates');
    } finally {
      setGameRatesLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/admin/settings', getHeaders());
      if (res.data.success === '1') {
        setSettingsData(res.data.settings || {});
        setContactData(res.data.contact || {});
        setWithdrawDays(res.data.withdraw_days || []);
        setHowToPlayContent(res.data.settings?.how_to_play || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    setSettingsError('');
    try {
      const res = await api.post('/admin/settings/update', {
        settings: {
          ac_name: settingsData.ac_name || '',
          ac_number: settingsData.ac_number || '',
          ifsc_code: settingsData.ifsc_code || ''
        }
      }, getHeaders());
      if (res.data.success === '1') {
        setSettingsMsg('Bank Details Updated Successfully!');
        fetchSettings();
      } else {
        setSettingsError(res.data.msg || 'Failed to update bank details');
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Error updating bank details');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveUpiQr = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    setSettingsError('');
    try {
      const isShowUpi = settingsData.show_upi === 1 || settingsData.show_upi === '1' || settingsData.show_upi === true;
      const isShowQr = settingsData.show_qr === 1 || settingsData.show_qr === '1' || settingsData.show_qr === true;
      const res = await api.post('/admin/settings/update', {
        settings: {
          payment_upi_id: settingsData.payment_upi_id || settingsData.upi_payment_id || '',
          payment_barcode_image: settingsData.payment_barcode_image || '',
          show_upi: isShowUpi ? 1 : 0,
          show_qr: isShowQr ? 1 : 0
        }
      }, getHeaders());
      if (res.data.success === '1') {
        setSettingsMsg('UPI / QR Settings Updated Successfully!');
        fetchSettings();
      } else {
        setSettingsError(res.data.msg || 'Failed to update UPI/QR');
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Error updating UPI/QR');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveMpinSetting = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    setSettingsError('');
    try {
      const res = await api.post('/admin/settings/update', {
        settings: {
          mpin_status: settingsData.mpin_status !== undefined ? String(settingsData.mpin_status) : '1'
        }
      }, getHeaders());
      if (res.data.success === '1') {
        setSettingsMsg('M-PIN Lock Screen Setting Updated Successfully!');
        fetchSettings();
      } else {
        setSettingsError(res.data.msg || 'Failed to update M-PIN Setting');
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Error updating M-PIN setting');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveAutoActiveSetting = async (e) => {
    if (e) e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    setSettingsError('');
    try {
      const res = await api.post('/admin/settings/update', {
        settings: {
          auto_active_status: settingsData.auto_active_status !== undefined ? String(settingsData.auto_active_status) : '1'
        }
      }, getHeaders());
      if (res.data.success === '1') {
        setSettingsMsg('Auto Active Mode Setting Updated Successfully!');
        fetchSettings();
      } else {
        setSettingsError(res.data.msg || 'Failed to update Auto Active Setting');
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Error updating Auto Active setting');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSliderSetting = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    setSettingsError('');
    try {
      const res = await api.post('/admin/settings/update', {
        settings: {
          slider_status: settingsData.slider_status !== undefined ? String(settingsData.slider_status) : '1'
        }
      }, getHeaders());
      if (res.data.success === '1') {
        setSettingsMsg('Slider Images Display Setting Updated Successfully!');
        fetchSettings();
      } else {
        setSettingsError(res.data.msg || 'Failed to update Slider Setting');
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Error updating slider setting');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveValuesAndLimits = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    setSettingsError('');
    try {
      const res = await api.post('/admin/settings/update', {
        settings: {
          min_deposite: settingsData.min_deposite,
          max_deposite: settingsData.max_deposite,
          min_withdrawal: settingsData.min_withdrawal,
          max_withdrawal: settingsData.max_withdrawal,
          min_transfer: settingsData.min_transfer,
          max_transfer: settingsData.max_transfer,
          min_bid_amt: settingsData.min_bid_amt,
          max_bid_amt: settingsData.max_bid_amt,
          Dragon_bonus: settingsData.Dragon_bonus,
          referral_commission: settingsData.referral_commission,
          referral_status: settingsData.referral_status !== undefined ? String(settingsData.referral_status) : '1',
          referral_type: settingsData.referral_type || 'signup',
          min_wallet_amount: settingsData.min_wallet_amount,
          withdraw_open_time: settingsData.withdraw_open_time,
          withdraw_close_time: settingsData.withdraw_close_time,
          alert_message: settingsData.alert_message,
          app_link: settingsData.app_link,
          how_to_play: settingsData.how_to_play,
          privacy_policy_url: settingsData.privacy_policy_url,
          data_deletion_url: settingsData.data_deletion_url,
          withdraw_days: withdrawDays
        }
      }, getHeaders());
      if (res.data.success === '1') {
        setSettingsMsg('System Values & Limits Updated Successfully!');
        fetchSettings();
      } else {
        setSettingsError(res.data.msg || 'Failed to update limits');
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Error updating limits');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggleWithdrawDay = (dayName) => {
    if (withdrawDays.includes(dayName)) {
      setWithdrawDays(withdrawDays.filter(d => d !== dayName));
    } else {
      setWithdrawDays([...withdrawDays, dayName]);
    }
  };

  const handleSaveContactDetails = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    setContactMsg('');
    setContactError('');
    try {
      const res = await api.post('/admin/settings/contact/update', contactData, getHeaders());
      if (res.data.success === '1') {
        setContactMsg('Contact Details Updated Successfully!');
        fetchSettings();
      } else {
        setContactError(res.data.msg || 'Failed to update contact details');
      }
    } catch (err) {
      console.error(err);
      setContactError('Error updating contact details');
    } finally {
      setContactLoading(false);
    }
  };

  const fetchSliders = async () => {
    setSlidersLoading(true);
    try {
      const res = await api.get('/admin/sliders', getHeaders());
      if (res.data.success === '1') setSliders(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSlidersLoading(false);
    }
  };

  const handleAddSliderSubmit = async (e) => {
    e.preventDefault();
    if (!newSliderForm.slider_image) {
      alert('Please enter image URL or path');
      return;
    }
    setAddSliderLoading(true);
    try {
      const res = await api.post('/admin/sliders/add', newSliderForm, getHeaders());
      if (res.data.success === '1') {
        setNewSliderForm({ slider_image: '', display_order: '1' });
        setShowAddSliderModal(false);
        fetchSliders();
      } else {
        alert(res.data.msg || 'Failed to add slider');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding slider');
    } finally {
      setAddSliderLoading(false);
    }
  };

  const handleToggleSliderStatus = async (id) => {
    try {
      const res = await api.post('/admin/sliders/status', { id }, getHeaders());
      if (res.data.success === '1') {
        fetchSliders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSlider = async (id) => {
    if (!window.confirm('Are you sure you want to delete this slider image?')) return;
    try {
      const res = await api.post('/admin/sliders/delete', { id }, getHeaders());
      if (res.data.success === '1') {
        fetchSliders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveHowToPlay = async (e) => {
    e.preventDefault();
    setHowToPlayLoading(true);
    setHowToPlayMsg('');
    try {
      const res = await api.post('/admin/settings/update', {
        settings: {
          how_to_play: howToPlayContent
        }
      }, getHeaders());
      if (res.data.success === '1') {
        setHowToPlayMsg('How To Play Content Saved Successfully!');
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHowToPlayLoading(false);
    }
  };

  const fetchDeposits = async () => {
    try {
      const res = await api.get('/admin/deposits/pending', getHeaders());
      if (res.data.success === '1') setPendingDeposits(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await api.get('/admin/withdrawals/pending', getHeaders());
      if (res.data.success === '1') setPendingWithdrawals(res.data.data);
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // REPORT MANAGEMENT FETCH FUNCTIONS
  // ==========================================
  const fetchReportBidHistory = async (date = bidHistoryDate, game = bidHistoryGame, type = bidHistoryType, page = bidHistoryPage, limit = bidHistoryPerPage, search = bidHistorySearch) => {
    setBidHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (game && game !== 'all') params.append('game_name', game);
      if (type && type !== 'all') params.append('game_type', type);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/reports/bid-history?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setBidHistoryList(res.data.data || []);
        setBidHistoryTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBidHistoryLoading(false);
    }
  };

  const handleUpdateBid = async (e) => {
    e.preventDefault();
    if (!editBidModal) return;
    setEditBidLoading(true);
    try {
      const res = await api.post('/admin/reports/bid-history/update', {
        id: editBidModal.id,
        ...editBidForm
      }, getHeaders());
      if (res.data.success === '1') {
        setEditBidModal(null);
        fetchReportBidHistory();
        if (showWinnerPreviewModal) {
          handlePreviewWinners();
        }
      } else {
        alert(res.data.msg || 'Failed to update bid');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating bid');
    } finally {
      setEditBidLoading(false);
    }
  };

  const fetchReportSell = async () => {
    setSellLoading(true);
    try {
      const res = await api.get(`/admin/reports/customer-sell?date=${sellDate}&game_name=${sellGame}&game_type=${sellType}&market_status=${sellSession}`, getHeaders());
      if (res.data.success === '1') {
        setSellReportData(res.data.results || {});
        setSellGrandTotal(res.data.grand_total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSellLoading(false);
    }
  };

  const fetchReportWinning = async (date = winningDate, game = winningGame, session = winningSession, page = winningPage, limit = winningPerPage, search = winningSearch) => {
    setWinningLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (game && game !== 'all') params.append('game_name', game);
      if (session && session !== 'all') params.append('market_status', session);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/reports/winning?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setWinningList(res.data.data || []);
        setWinningTotalAmt(res.data.total_winning || 0);
        setWinningTotalPoints(res.data.total_points || 0);
        setWinningTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWinningLoading(false);
    }
  };

  const fetchReportTransfer = async (date = transferDate, page = transferPage, limit = transferPerPage, search = transferSearch) => {
    setTransferLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/reports/transfers?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setTransferList(res.data.data || []);
        setTransferTotal(res.data.total_amount || 0);
        setTransferTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransferLoading(false);
    }
  };

  const fetchReportBidWin = async () => {
    setBidWinRepLoading(true);
    try {
      const res = await api.get(`/admin/metrics/bid-win-report?date=${bidWinRepDate}&game_name=${bidWinRepGame}`, getHeaders());
      if (res.data.success === '1') {
        setBidWinRepData({
          total_bid: res.data.total_bid || 0,
          total_win: res.data.total_win || 0,
          profit: res.data.profit || 0
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBidWinRepLoading(false);
    }
  };

  const handleOpenBidWinDetails = async (detailType) => {
    setBidWinRepDetails(detailType);
    try {
      if (detailType === 'bids') {
        const res = await api.get(`/admin/reports/bid-history?date=${bidWinRepDate}&game_name=${bidWinRepGame}&game_type=all`, getHeaders());
        if (res.data.success === '1') setBidWinRepDetailList(res.data.data || []);
      } else if (detailType === 'wins') {
        const res = await api.get(`/admin/reports/winning?date=${bidWinRepDate}&game_name=${bidWinRepGame}&market_status=all`, getHeaders());
        if (res.data.success === '1') setBidWinRepDetailList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReportWithdraw = async (date = withdrawRepDate, page = withdrawRepPage, limit = withdrawRepPerPage, search = withdrawRepSearch) => {
    setWithdrawRepLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/reports/withdrawals?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setWithdrawRepList(res.data.data || []);
        setWithdrawRepTotal(res.data.total_amount || 0);
        setWithdrawRepTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWithdrawRepLoading(false);
    }
  };

  const fetchReportAutoDeposit = async (date = autoDepDate, page = autoDepPage, limit = autoDepPerPage, search = autoDepSearch) => {
    setAutoDepLoading(true);
    try {
      const params = new URLSearchParams();
      if (date && date !== 'all' && date.trim()) params.append('date', date.trim());
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/auto-deposits?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setAutoDepList(res.data.data || []);
        setAutoDepTotals(res.data.totals || { total_transfer: 0, total_approved: 0, total_rejected: 0, total_pending: 0 });
        setAutoDepTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAutoDepLoading(false);
    }
  };

  // ==========================================
  // WALLET MANAGEMENT & ADD FUND REPORT FUNCTIONS
  // ==========================================
  const fetchFundRequests = async (date = fundReqDate, page = fundReqPage, limit = fundReqPerPage, search = fundReqSearch) => {
    setFundReqLoading(true);
    try {
      const params = new URLSearchParams();
      if (date && date !== 'all' && date.trim()) params.append('date', date.trim());
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/deposits/requests?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setFundReqList(res.data.data || []);
        setFundReqTotal(res.data.total_amount || 0);
        setFundReqTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFundReqLoading(false);
    }
  };

  const handleFundRequestAction = async (id, action) => {
    const confirmMsg = action === 'approve' ? 'Are you sure you want to Approve this fund request?' : 'Are you sure you want to Reject this fund request?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const endpoint = action === 'approve' ? '/admin/deposits/approve' : '/admin/deposits/reject';
      const res = await api.post(endpoint, { requestId: id }, getHeaders());
      if (res.data.success === '1') {
        alert(res.data.msg || (action === 'approve' ? 'Fund request approved successfully' : 'Fund request rejected'));
        fetchFundRequests();
        fetchAdminCoins();
        fetchBadgeCounts(false);
        if (selectedUserId) {
          fetchUserFullDetails(selectedUserId);
        }
      } else {
        alert(res.data.msg || 'Failed to process fund request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing fund request');
    }
  };

  const fetchWithRequests = async (date = withReqDate, page = withReqPage, limit = withReqPerPage, search = withReqSearch, status = withReqStatus) => {
    setWithReqLoading(true);
    try {
      const params = new URLSearchParams();
      if (date && date !== 'all' && date.trim()) params.append('date', date.trim());
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      if (status && status !== 'all') params.append('status', status);
      const res = await api.get(`/admin/withdrawals/requests?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setWithReqList(res.data.data || []);
        setWithReqTotals(res.data.totals || { total_amount: 0, total_approved: 0, total_rejected: 0, total_pending: 0 });
        setWithReqTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWithReqLoading(false);
    }
  };

  const handleWithRequestAction = async (id, action) => {
    const confirmMsg = action === 'approve' ? 'Are you sure you want to Approve?' : 'Are you sure you want to Reject?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const endpoint = action === 'approve' ? '/admin/withdrawals/approve' : '/admin/withdrawals/reject';
      const res = await api.post(endpoint, { withdrawId: id, requestId: id, id: id }, getHeaders());
      if (res.data.success === '1') {
        alert(res.data.msg || (action === 'approve' ? 'Withdrawal request approved successfully' : 'Withdrawal request rejected'));
        fetchWithRequests();
        fetchAdminCoins();
        fetchBadgeCounts(false);
        if (selectedWithdrawModal) setSelectedWithdrawModal(null);
        if (selectedUserId) {
          fetchUserFullDetails(selectedUserId);
        }
      } else {
        alert(res.data.msg || 'Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing withdrawal request');
    }
  };

  const handleAddFundSubmit = async (e) => {
    e.preventDefault();
    if (!addFundUserPhone || !addFundAmount) {
      setAddFundError('Please select a user and enter an amount');
      return;
    }
    setAddFundLoading(true);
    setAddFundMsg('');
    setAddFundError('');
    try {
      const res = await api.post('/admin/wallet/add-fund', {
        phone: addFundUserPhone,
        amount: addFundAmount
      }, getHeaders());
      if (res.data.success === '1') {
        setAddFundMsg(res.data.msg || 'Points added to user wallet successfully!');
        setAddFundAmount('');
        setAddFundUserPhone('');
        setUserSearchQuery('');
        fetchAdminCoins();
        fetchUsers();
      } else {
        setAddFundError(res.data.msg || 'Failed to add fund');
      }
    } catch (err) {
      console.error(err);
      setAddFundError('Error adding points to user wallet');
    } finally {
      setAddFundLoading(false);
    }
  };

  const fetchBidRevertList = async () => {
    setBidRevertLoading(true);
    setBidRevertMsg('');
    try {
      const game = bidRevertGame || (games[0]?.games_name || '');
      const res = await api.get(`/admin/wallet/bid-revert?date=${bidRevertDate}&game_name=${encodeURIComponent(game)}`, getHeaders());
      if (res.data.success === '1') {
        setBidRevertList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBidRevertLoading(false);
    }
  };

  const handleExecuteBidRevert = async () => {
    const game = bidRevertGame || (games[0]?.games_name || '');
    setShowRevertConfirmModal(false);
    setBidRevertLoading(true);
    try {
      const res = await api.post('/admin/wallet/bid-revert/execute', {
        date: bidRevertDate,
        game_name: game
      }, getHeaders());
      if (res.data.success === '1') {
        setBidRevertMsg(res.data.msg || 'All bids reverted and points refunded successfully!');
        fetchBidRevertList();
        fetchAdminCoins();
      } else {
        alert(res.data.msg || 'Failed to revert bids');
      }
    } catch (err) {
      console.error(err);
      alert('Error reverting bids');
    } finally {
      setBidRevertLoading(false);
    }
  };

  const fetchAddFundReport = async (date = addFundRepDate, page = addFundRepPage, limit = addFundRepPerPage, search = addFundRepSearch) => {
    setAddFundRepLoading(true);
    try {
      const params = new URLSearchParams();
      if (date && date !== 'all' && date.trim()) params.append('date', date.trim());
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search && search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/reports/add-fund?${params.toString()}`, getHeaders());
      if (res.data.success === '1') {
        setAddFundRepList(res.data.data || []);
        setAddFundRepTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddFundRepLoading(false);
    }
  };

  useEffect(() => {
    const curToken = localStorage.getItem('admin_token');
    if (!curToken) {
      if (setAdminAuth) setAdminAuth(false);
      navigate('/admin/login', { replace: true });
      return;
    }
    fetchAdminCoins();
    api.get('/app-info').then(res => {
      if (res.data?.app_name) setAdminName(res.data.app_name);
    }).catch(() => { });
    fetchGames();
    fetchAnkBids();
    fetchBidWinReport();
    fetchAutoDeposits();
    fetchSettings();
  }, [setAdminAuth]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);

  useEffect(() => {
    if (activeTab === 'dashboards') {
      fetchAdminCoins();
      fetchAnkBids();
      fetchBidWinReport();
      fetchAutoDeposits();
    } else if (activeTab === 'user_management') {
      fetchUsers();
    } else if (activeTab === 'referrals') {
      fetchReferrals();
    } else if (activeTab === 'user_commission') {
      fetchCommissions();
    } else if (activeTab === 'user_commission_pay_list') {
      fetchCommissionPayList();
    } else if (activeTab === 'game_names') {
      fetchAdminGames();
    } else if (activeTab === 'rates') {
      fetchRates();
    } else if (['settings', 'contact_settings', 'how_to_play', 'auto_active'].includes(activeTab)) {
      fetchSettings();
    } else if (activeTab === 'sliders') {
      fetchSliders();
    } else if (activeTab === 'deposits') {
      fetchFundRequests();
    } else if (activeTab === 'withdrawals') {
      fetchWithRequests();
    } else if (activeTab === 'add_fund_wallet') {
      fetchUsers();
    } else if (activeTab === 'bid_revert') {
      if (games.length > 0 && !bidRevertGame) {
        setBidRevertGame(games[0].games_name);
      }
      fetchBidRevertList();
    } else if (activeTab === 'declare_result') {
      fetchDeclaredResults(declareDate);
    } else if (activeTab === 'report_bid_history') {
      fetchReportBidHistory();
    } else if (activeTab === 'report_sell') {
      fetchReportSell();
    } else if (activeTab === 'report_winning') {
      fetchReportWinning();
    } else if (activeTab === 'report_transfer') {
      fetchReportTransfer();
    } else if (activeTab === 'report_bid_win') {
      fetchReportBidWin();
    } else if (activeTab === 'report_withdraw') {
      fetchReportWithdraw();
    } else if (activeTab === 'report_auto_deposit') {
      fetchReportAutoDeposit();
    } else if (activeTab === 'report_add_fund') {
      fetchAddFundReport();
    }
  }, [activeTab]);

  // Event Handlers
  const handleToggleUserField = async (userId, field) => {
    try {
      const res = await api.post('/admin/users/toggle-field', { userId, field }, getHeaders());
      if (res.data.success === '1') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: res.data.newVal } : u));
        if (field === 'status') {
          fetchBadgeCounts(false);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update field');
    }
  };

  const handleWalletAdjust = async () => {
    if (!selectedUserModal || !walletAdjustPoints) return;
    try {
      const currentWallet = Number(selectedUserModal.wallet) || 0;
      const adjustPoints = Number(walletAdjustPoints) || 0;
      const newWallet = walletAdjustType === 'add' ? (currentWallet + adjustPoints) : Math.max(0, currentWallet - adjustPoints);

      const res = await api.post('/admin/users/update', {
        userId: selectedUserModal.id,
        wallet: newWallet
      }, getHeaders());

      if (res.data.success === '1') {
        alert('Wallet updated successfully');
        setUsers(prev => prev.map(u => u.id === selectedUserModal.id ? { ...u, wallet: newWallet } : u));
        setSelectedUserModal(null);
        setWalletAdjustPoints('');
      } else {
        alert(res.data.msg || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating user wallet');
    }
  };

  const handleAutoDepositAction = async (id, responseVal) => {
    const confirmMsg = responseVal === '1' ? 'Are you sure you want to Approve this deposit?' : 'Are you sure you want to Decline this deposit?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await api.post('/admin/auto-deposits/status', { id, response: responseVal }, getHeaders());
      if (res.data.success === '1') {
        alert(res.data.msg || (responseVal === '1' ? 'Deposit Approved' : 'Deposit Rejected'));
        fetchAutoDeposits();
        fetchReportAutoDeposit();
        fetchAdminCoins();
      } else {
        alert(res.data.msg || 'Failed to process auto deposit.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process auto deposit');
    }
  };

  const handleCommissionApprove = async (ids) => {
    try {
      const res = await api.post('/admin/commission/approve', { ids }, getHeaders());
      if (res.data.success === '1') {
        alert('Commission approved successfully');
        fetchCommissions();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to approve commission');
    }
  };

  const handleDeclareSubmit = async (e) => {
    e.preventDefault();
    setDeclareError('');
    setDeclareSuccess('');

    const targetGame = declareSelectedGame || (games[0]?.games_name || '');
    if (!targetGame) {
      setDeclareError('Please select a game');
      return;
    }

    const payload = {
      game_name: targetGame,
      date: declareDate,
      session: declareSession
    };

    if (declareSession === 'open') {
      if (!/^\d{3}$/.test(declareOpenPana) || !/^\d$/.test(declareOpenResult)) {
        setDeclareError('Open Pana must be 3 digits and Open Digit must be a single digit');
        return;
      }
      payload.open_pana = declareOpenPana;
      payload.open_result = declareOpenResult;
    } else {
      if (!/^\d{3}$/.test(declareClosePana) || !/^\d$/.test(declareCloseResult)) {
        setDeclareError('Close Pana must be 3 digits and Close Digit must be a single digit');
        return;
      }
      payload.close_pana = declareClosePana;
      payload.close_result = declareCloseResult;
    }

    const existingRow = declaredResultsList.find(
      r => String(r.game_name).trim().toLowerCase() === String(targetGame).trim().toLowerCase() &&
           (r.date === declareDate || String(r.date).startsWith(declareDate))
    );
    const isUpdate = declareSession === 'open' 
      ? Boolean(existingRow && existingRow.open_panna && existingRow.open_digit)
      : Boolean(existingRow && existingRow.close_panna && existingRow.close_digit);

    if (isUpdate) {
      const confirmUpdate = window.confirm(
        `Result for "${targetGame}" (${declareSession.toUpperCase()}) on ${declareDate} is already declared!\n\nUpdating it will DEDUCT/REVERT previous winning amounts from user wallets (including Jodi and Sangam winnings) and credit new winners.\n\nDo you want to proceed?`
      );
      if (!confirmUpdate) return;
    }

    setDeclareLoading(true);
    try {
      const res = await api.post('/admin/declare-result', payload, getHeaders());
      if (res.data.success === '1') {
        setDeclareSuccess(res.data.msg || 'Result declared successfully!');
        setDeclareOpenPana('');
        setDeclareOpenResult('');
        setDeclareClosePana('');
        setDeclareCloseResult('');
        fetchDeclaredResults(declareDate);
        fetchAdminCoins();
      } else {
        setDeclareError(res.data.msg || 'Declaration failed');
      }
    } catch (err) {
      console.error(err);
      setDeclareError('Error declaring result. Please check open result is declared before close.');
    } finally {
      setDeclareLoading(false);
    }
  };

  const fetchDeclaredResults = async (dateVal = declareDate) => {
    setDeclaredResultsLoading(true);
    try {
      const res = await api.get(`/admin/declare-result/list?date=${dateVal}`, getHeaders());
      if (res.data.success === '1') {
        setDeclaredResultsList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeclaredResultsLoading(false);
    }
  };

  const handleDeleteDeclaredResult = async (game_name, date, session = 'all') => {
    const sessText = session === 'open' ? 'Open Result' : session === 'close' ? 'Close Result' : 'Full Result';
    const confirmMsg = `Are you sure you want to delete ${sessText} for "${game_name}" on ${date}? Any winning payouts credited to user wallets will be REVERTED.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.post('/admin/declare-result/delete', { game_name, date, session }, getHeaders());
      if (res.data.success === '1') {
        alert(res.data.msg);
        fetchDeclaredResults(declareDate);
        fetchAdminCoins();
      } else {
        alert(res.data.msg || 'Failed to delete result');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting result');
    }
  };

  const handlePreviewWinners = async () => {
    const targetGame = declareSelectedGame || (games[0]?.games_name || '');
    if (!targetGame) {
      alert('Please select a game first');
      return;
    }

    if (declareSession === 'open') {
      if (!/^\d{3}$/.test(declareOpenPana) || !/^\d$/.test(declareOpenResult)) {
        alert('Open Pana must be 3 digits and Open Digit must be a single digit');
        return;
      }
    } else {
      if (!/^\d{3}$/.test(declareClosePana) || !/^\d$/.test(declareCloseResult)) {
        alert('Close Pana must be 3 digits and Close Digit must be a single digit');
        return;
      }
    }

    setPreviewLoading(true);
    try {
      const res = await api.post('/admin/declare-result/preview', {
        game_name: targetGame,
        date: declareDate,
        session: declareSession,
        open_pana: declareOpenPana,
        open_result: declareOpenResult,
        close_pana: declareClosePana,
        close_result: declareCloseResult
      }, getHeaders());

      if (res.data.success === '1') {
        setPreviewWinnersData({
          totalWinners: res.data.totalWinners || 0,
          totalPayout: res.data.totalPayout || 0,
          winners: res.data.winners || []
        });
        setShowWinnerPreviewModal(true);
      } else {
        alert(res.data.msg || 'Failed to preview winners');
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.msg || err.response?.data?.error || 'Error previewing winners';
      alert(errorMsg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteBidInPreview = async (bidId) => {
    if (!window.confirm('Are you sure you want to delete this bid?')) return;
    try {
      const res = await api.post('/admin/reports/bid-history/delete', { id: bidId }, getHeaders());
      if (res.data.success === '1') {
        alert('Bid deleted successfully');
        handlePreviewWinners();
      } else {
        alert(res.data.msg || 'Failed to delete bid');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting bid');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassMsg('');
    if (newPass !== retypePass) {
      setPassError('New password and confirm password do not match');
      return;
    }
    try {
      const res = await api.post('/admin/change-password', {
        oldpass: oldPass,
        newpass: newPass,
        retypepass: retypePass
      }, getHeaders());
      if (res.data.success === '1') {
        setPassMsg('Password updated successfully');
        setOldPass('');
        setNewPass('');
        setRetypePass('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPassMsg('');
        }, 1500);
      } else {
        setPassError(res.data.msg || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      setPassError('Failed to update password');
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    if (setAdminAuth) {
      setAdminAuth(false);
    }
    navigate('/admin/login', { replace: true });
  };

  // Ank Card Colors (Matching PHP card_0 to card_9)
  const ankColors = [
    { border: '#556ee6', header: '#556ee6', footer: '#556ee6' }, // 0
    { border: '#34c38f', header: '#34c38f', footer: '#34c38f' }, // 1
    { border: '#50a5f1', header: '#50a5f1', footer: '#50a5f1' }, // 2
    { border: '#f1b44c', header: '#f1b44c', footer: '#f1b44c' }, // 3
    { border: '#af3ede', header: '#af3ede', footer: '#af3ede' }, // 4
    { border: '#f1673e', header: '#f1673e', footer: '#f1673e' }, // 5
    { border: '#ea31ba', header: '#ea31ba', footer: '#ea31ba' }, // 6
    { border: '#5a3cff', header: '#5a3cff', footer: '#5a3cff' }, // 7
    { border: '#ff3c84', header: '#ff3c84', footer: '#ff3c84' }, // 8
    { border: '#0dcebc', header: '#0dcebc', footer: '#0dcebc' }, // 9
  ];

  // Helper styles
  const sidebarItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    color: isActive ? '#ffffff' : '#a6b0cf',
    backgroundColor: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
    borderLeft: isActive ? '4px solid #f1673e' : '4px solid transparent',
    fontSize: '0.88rem',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s ease'
  });

  const submenuItemStyle = (isActive) => ({
    display: 'block',
    padding: '9px 20px 9px 48px',
    color: isActive ? '#ffffff' : '#7985a9',
    fontSize: '0.84rem',
    fontWeight: isActive ? '600' : '400',
    cursor: 'pointer',
    backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
    transition: 'all 0.15s ease'
  });

  const digitBoxStyle = {
    border: '1px solid #34c38f',
    borderRadius: '4px',
    backgroundColor: 'rgba(52, 195, 143, 0.15)',
    color: '#1e7e34',
    fontWeight: '700',
    width: '45px',
    height: '42px',
    margin: '6px 8px',
    fontSize: '0.95rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'default',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  };

  const panaBoxStyle = {
    border: '1px solid #34c38f',
    borderRadius: '4px',
    backgroundColor: 'rgba(52, 195, 143, 0.15)',
    color: '#1e7e34',
    fontWeight: '700',
    minWidth: '52px',
    padding: '0 8px',
    height: '42px',
    margin: '6px 8px',
    fontSize: '0.88rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'default',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  };

  const ankBoxStyle = {
    border: '1px solid #f46a6a',
    borderRadius: '4px',
    backgroundColor: 'rgba(244, 106, 106, 0.18)',
    color: '#f46a6a',
    width: '45px',
    height: '42px',
    margin: '0',
    fontWeight: '700',
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'default',
    outline: 'none'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f5f8', color: '#495057', fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif", position: 'relative', overflowX: 'hidden' }}>

      <style>{`
        @keyframes badgePulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Floating Live Notification Toast */}
      {adminToast && (
        <div
          onClick={() => {
            if (adminToast.tab) handleTabClick(adminToast.tab);
            setAdminToast(null);
          }}
          style={{
            position: 'fixed',
            top: '20px',
            right: isMobile ? '10px' : '24px',
            zIndex: 999999,
            backgroundColor: '#1e293b',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            padding: '14px 18px',
            maxWidth: '90vw',
            width: '360px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(241, 103, 62, 0.5)',
            cursor: adminToast.tab ? 'pointer' : 'default',
            animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(241, 103, 62, 0.2)',
            color: '#f1673e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bell size={20} className="admin-badge-pulse" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: '#f1673e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {adminToast.title || 'New Activity Alert'}
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: '600', color: '#f8fafc', marginTop: '2px', wordBreak: 'break-word' }}>
              {adminToast.message}
            </div>
            {adminToast.tab && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                Click to view details &rarr;
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAdminToast(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.3rem',
              lineHeight: 1,
              padding: '2px 4px'
            }}
            title="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobile && isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 99998,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* 1. Left Sidebar Navigation */}
      <div style={{
        width: isMobile ? '270px' : (isDesktopSidebarCollapsed ? '75px' : '260px'),
        backgroundColor: '#2a3042',
        color: '#a6b0cf',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 15px rgba(0,0,0,0.15)',
        position: isMobile ? 'fixed' : 'sticky',
        left: 0,
        top: 0,
        bottom: isMobile ? 0 : undefined,
        height: '100vh',
        overflowY: 'auto',
        zIndex: isMobile ? 99999 : 100,
        transition: 'all 0.25s ease',
        transform: isMobile ? (isMobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none'
      }}>
        {/* Brand Header */}
        <div style={{
          textAlign: 'center',
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <img
            src="/img/logo.png"
            alt="Logo"
            style={{ height: '36px', maxWidth: '140px', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {!isDesktopSidebarCollapsed || isMobile ? (
            <h3 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {adminName || 'Admin'}
            </h3>
          ) : null}
        </div>

        {/* Menu Items */}
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>

          {/* Dashboards */}
          <div onClick={() => handleTabClick('dashboards')} style={sidebarItemStyle(activeTab === 'dashboards')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <Home size={18} style={{ flexShrink: 0, color: activeTab === 'dashboards' ? '#f1673e' : '#a6b0cf' }} />
              {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Dashboards</span>}
            </div>
          </div>

          {/* User Management */}
          <div onClick={() => handleTabClick('user_management')} style={sidebarItemStyle(activeTab === 'user_management')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <Users size={18} style={{ flexShrink: 0, color: activeTab === 'user_management' ? '#f1673e' : '#a6b0cf' }} />
                  {badgeCounts.unapproved_users > 0 && isDesktopSidebarCollapsed && !isMobile && (
                    <span style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#a855f7',
                      boxShadow: '0 0 6px #a855f7'
                    }} />
                  )}
                </div>
                {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>User Management</span>}
              </div>
              {badgeCounts.unapproved_users > 0 && (!isDesktopSidebarCollapsed || isMobile) && (
                <span style={{
                  backgroundColor: '#a855f7',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 6px rgba(168, 85, 247, 0.4)'
                }}>
                  {badgeCounts.unapproved_users > 99 ? '99+' : badgeCounts.unapproved_users}
                </span>
              )}
            </div>
          </div>

          {/* Referral Report */}
          <div onClick={() => handleTabClick('referrals')} style={sidebarItemStyle(activeTab === 'referrals')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <Share2 size={18} style={{ flexShrink: 0, color: activeTab === 'referrals' ? '#f1673e' : '#a6b0cf' }} />
              {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Referral Report</span>}
            </div>
          </div>

          {/* Declare Result */}
          <div onClick={() => handleTabClick('declare_result')} style={sidebarItemStyle(activeTab === 'declare_result')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <Target size={18} style={{ flexShrink: 0, color: activeTab === 'declare_result' ? '#f1673e' : '#a6b0cf' }} />
              {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Declare Result</span>}
            </div>
          </div>

          {/* Report Management (Collapsible) */}
          <div>
            <div onClick={() => toggleMenu('reports')} style={sidebarItemStyle(activeTab.startsWith('report_'))}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <FileText size={18} style={{ flexShrink: 0, color: activeTab.startsWith('report_') ? '#f1673e' : '#a6b0cf' }} />
                    {badgeCounts.pending_auto_deposits > 0 && isDesktopSidebarCollapsed && !isMobile && (
                      <span style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b',
                        boxShadow: '0 0 6px #f59e0b'
                      }} />
                    )}
                  </div>
                  {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Report Management</span>}
                </div>
                {(!isDesktopSidebarCollapsed || isMobile) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a6b0cf' }}>
                    {badgeCounts.pending_auto_deposits > 0 && !openMenus.reports && (
                      <span style={{
                        backgroundColor: '#f59e0b',
                        color: '#ffffff',
                        fontSize: '0.66rem',
                        fontWeight: '700',
                        padding: '1px 6px',
                        borderRadius: '10px'
                      }}>
                        {badgeCounts.pending_auto_deposits}
                      </span>
                    )}
                    {openMenus.reports ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </div>
            </div>
            {openMenus.reports && (!isDesktopSidebarCollapsed || isMobile) && (
              <div>
                <div onClick={() => handleTabClick('report_bid_history')} style={submenuItemStyle(activeTab === 'report_bid_history')}>
                  Users Bid History
                </div>
                <div onClick={() => handleTabClick('report_sell')} style={submenuItemStyle(activeTab === 'report_sell')}>
                  Customer Sell Report
                </div>
                <div onClick={() => handleTabClick('report_winning')} style={submenuItemStyle(activeTab === 'report_winning')}>
                  Winning Report
                </div>
                <div onClick={() => handleTabClick('report_bid_win')} style={submenuItemStyle(activeTab === 'report_bid_win')}>
                  Bid Win Report
                </div>
                <div onClick={() => handleTabClick('report_withdraw')} style={submenuItemStyle(activeTab === 'report_withdraw')}>
                  Withdraw Report
                </div>
                <div onClick={() => handleTabClick('report_auto_deposit')} style={{
                  ...submenuItemStyle(activeTab === 'report_auto_deposit'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Auto Deposit History</span>
                  {badgeCounts.pending_auto_deposits > 0 && (
                    <span style={{
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      marginRight: '8px'
                    }}>
                      {badgeCounts.pending_auto_deposits}
                    </span>
                  )}
                </div>
                <div onClick={() => handleTabClick('report_add_fund')} style={submenuItemStyle(activeTab === 'report_add_fund')}>
                  Add Fund Report
                </div>
              </div>
            )}
          </div>

          {/* Wallet Management (Collapsible) */}
          <div>
            <div onClick={() => toggleMenu('wallet')} style={sidebarItemStyle(['deposits', 'withdrawals', 'add_fund_wallet', 'bid_revert'].includes(activeTab))}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <Wallet size={18} style={{ flexShrink: 0, color: ['deposits', 'withdrawals', 'add_fund_wallet', 'bid_revert'].includes(activeTab) ? '#f1673e' : '#a6b0cf' }} />
                    {badgeCounts.total_wallet_pending > 0 && isDesktopSidebarCollapsed && !isMobile && (
                      <span style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        boxShadow: '0 0 6px #ef4444'
                      }} />
                    )}
                  </div>
                  {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Wallet Management</span>}
                </div>
                {(!isDesktopSidebarCollapsed || isMobile) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a6b0cf' }}>
                    {badgeCounts.total_wallet_pending > 0 && (
                      <span
                        className="admin-badge-pulse"
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          fontSize: '0.66rem',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                        }}
                      >
                        {badgeCounts.total_wallet_pending > 99 ? '99+' : badgeCounts.total_wallet_pending}
                      </span>
                    )}
                    {openMenus.wallet ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </div>
            </div>
            {openMenus.wallet && (!isDesktopSidebarCollapsed || isMobile) && (
              <div>
                <div onClick={() => handleTabClick('deposits')} style={{
                  ...submenuItemStyle(activeTab === 'deposits'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Fund Request</span>
                  {badgeCounts.pending_deposits > 0 && (
                    <span style={{
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      marginRight: '8px',
                      boxShadow: '0 1px 4px rgba(16, 185, 129, 0.4)'
                    }}>
                      {badgeCounts.pending_deposits}
                    </span>
                  )}
                </div>
                <div onClick={() => handleTabClick('withdrawals')} style={{
                  ...submenuItemStyle(activeTab === 'withdrawals'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Withdraw Request</span>
                  {badgeCounts.pending_withdrawals > 0 && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      marginRight: '8px',
                      boxShadow: '0 1px 4px rgba(239, 68, 68, 0.4)'
                    }}>
                      {badgeCounts.pending_withdrawals}
                    </span>
                  )}
                </div>
                <div onClick={() => handleTabClick('add_fund_wallet')} style={submenuItemStyle(activeTab === 'add_fund_wallet')}>
                  Add Fund (User Wallet)
                </div>
                <div onClick={() => handleTabClick('bid_revert')} style={submenuItemStyle(activeTab === 'bid_revert')}>
                  Bid Revert
                </div>
              </div>
            )}
          </div>

          {/* Payment Gateway (NEW MENU) */}
          <div onClick={() => handleTabClick('payment_gateway')} style={sidebarItemStyle(activeTab === 'payment_gateway')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <CreditCard size={18} style={{ flexShrink: 0, color: activeTab === 'payment_gateway' ? '#f1673e' : '#a6b0cf' }} />
              {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>UPI & Payment Apps</span>}
            </div>
          </div>

          {/* Games Management (Collapsible) */}
          <div>
            <div onClick={() => toggleMenu('games')} style={sidebarItemStyle(['game_names', 'rates'].includes(activeTab))}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <Gamepad2 size={18} style={{ flexShrink: 0, color: ['game_names', 'rates'].includes(activeTab) ? '#f1673e' : '#a6b0cf' }} />
                {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Games Management</span>}
              </div>
              {(!isDesktopSidebarCollapsed || isMobile) && (
                <div style={{ display: 'flex', alignItems: 'center', color: '#a6b0cf' }}>
                  {openMenus.games ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
            </div>
            {openMenus.games && (!isDesktopSidebarCollapsed || isMobile) && (
              <div>
                <div onClick={() => handleTabClick('game_names')} style={submenuItemStyle(activeTab === 'game_names')}>
                  Game Name
                </div>
                <div onClick={() => handleTabClick('rates')} style={submenuItemStyle(activeTab === 'rates')}>
                  Game Rates
                </div>
              </div>
            )}
          </div>

          {/* Game & Numbers (Collapsible) */}
          <div>
            <div onClick={() => toggleMenu('numbers')} style={sidebarItemStyle(activeTab.startsWith('num_'))}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <Sparkles size={18} style={{ flexShrink: 0, color: activeTab.startsWith('num_') ? '#f1673e' : '#a6b0cf' }} />
                {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Game & Numbers</span>}
              </div>
              {(!isDesktopSidebarCollapsed || isMobile) && (
                <div style={{ display: 'flex', alignItems: 'center', color: '#a6b0cf' }}>
                  {openMenus.numbers ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
            </div>
            {openMenus.numbers && (!isDesktopSidebarCollapsed || isMobile) && (
              <div>
                <div onClick={() => handleTabClick('num_single')} style={submenuItemStyle(activeTab === 'num_single')}>Single Digit</div>
                <div onClick={() => handleTabClick('num_jodi')} style={submenuItemStyle(activeTab === 'num_jodi')}>Jodi Digit</div>
                <div onClick={() => handleTabClick('num_single_pana')} style={submenuItemStyle(activeTab === 'num_single_pana')}>Single Pana</div>
                <div onClick={() => handleTabClick('num_double_pana')} style={submenuItemStyle(activeTab === 'num_double_pana')}>Double Pana</div>
                <div onClick={() => handleTabClick('num_triple_pana')} style={submenuItemStyle(activeTab === 'num_triple_pana')}>Tripple Pana</div>
                <div onClick={() => handleTabClick('num_half_sangam')} style={submenuItemStyle(activeTab === 'num_half_sangam')}>Half Sangam</div>
                <div onClick={() => handleTabClick('num_full_sangam')} style={submenuItemStyle(activeTab === 'num_full_sangam')}>Full Sangam</div>
              </div>
            )}
          </div>

          {/* Auto Active Sidebar Item */}
          <div onClick={() => handleTabClick('auto_active')} style={sidebarItemStyle(activeTab === 'auto_active')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <Zap size={18} style={{ flexShrink: 0, color: activeTab === 'auto_active' ? '#f1673e' : '#a6b0cf' }} />
              {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Auto Active</span>}
            </div>
          </div>

          {/* Settings (Collapsible) */}
          <div>
            <div onClick={() => toggleMenu('settings')} style={sidebarItemStyle(['settings', 'contact_settings', 'sliders', 'how_to_play', 'auto_active'].includes(activeTab))}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <Settings size={18} style={{ flexShrink: 0, color: ['settings', 'contact_settings', 'sliders', 'how_to_play', 'auto_active'].includes(activeTab) ? '#f1673e' : '#a6b0cf' }} />
                {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Settings</span>}
              </div>
              {(!isDesktopSidebarCollapsed || isMobile) && (
                <div style={{ display: 'flex', alignItems: 'center', color: '#a6b0cf' }}>
                  {openMenus.settings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
            </div>
            {openMenus.settings && (!isDesktopSidebarCollapsed || isMobile) && (
              <div>
                <div onClick={() => handleTabClick('auto_active')} style={submenuItemStyle(activeTab === 'auto_active')}>
                  Auto Active Mode
                </div>
                <div onClick={() => handleTabClick('settings')} style={submenuItemStyle(activeTab === 'settings')}>
                  Main Settings
                </div>
                <div onClick={() => handleTabClick('payment_gateway')} style={submenuItemStyle(activeTab === 'payment_gateway')}>
                  UPI & Payment Apps
                </div>
                <div onClick={() => handleTabClick('contact_settings')} style={submenuItemStyle(activeTab === 'contact_settings')}>
                  Contact Settings
                </div>
                <div onClick={() => handleTabClick('sliders')} style={submenuItemStyle(activeTab === 'sliders')}>
                  Slider Images
                </div>
                <div onClick={() => handleTabClick('how_to_play')} style={submenuItemStyle(activeTab === 'how_to_play')}>
                  How To Play
                </div>
              </div>
            )}
          </div>

          {/* Live Support Chat */}
          <div onClick={() => handleTabClick('support_chat')} style={sidebarItemStyle(activeTab === 'support_chat')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <MessageSquare size={18} style={{ flexShrink: 0, color: activeTab === 'support_chat' ? '#f1673e' : '#a6b0cf' }} />
                  {(badgeCounts.unread_chats > 0 || chatUnreadCount > 0) && isDesktopSidebarCollapsed && !isMobile && (
                    <span style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      boxShadow: '0 0 6px #ef4444'
                    }} />
                  )}
                </div>
                {(!isDesktopSidebarCollapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>Live Support Chat</span>}
              </div>
              {(badgeCounts.unread_chats > 0 || chatUnreadCount > 0) && (!isDesktopSidebarCollapsed || isMobile) && (
                <span
                  className="admin-badge-pulse"
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  {(badgeCounts.unread_chats || chatUnreadCount) > 99 ? '99+' : (badgeCounts.unread_chats || chatUnreadCount)}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar Footer Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'transparent',
              color: '#f46a6a',
              border: '1px solid rgba(244,106,106,0.4)',
              borderRadius: '4px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* 2. Main Content Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: activeTab === 'support_chat' ? 'hidden' : 'auto',
        height: activeTab === 'support_chat' ? 'calc(100vh - 70px)' : 'auto',
        maxHeight: activeTab === 'support_chat' ? 'calc(100dvh - 70px)' : 'none',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%'
      }}>

        {/* Top Header Navbar */}
        <div style={{
          height: '70px',
          backgroundColor: '#2a3042',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: isMobile ? '0 12px' : '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px' }}>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Toggle Navigation Menu"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              ☰
            </button>
            <span
              style={{ color: '#ffffff', fontSize: isMobile ? '0.88rem' : '0.98rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => handleTabClick('dashboards')}
            >
              Kalyan Matka Admin
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', position: 'relative' }}>

            {/* Notification Bell with Badge & Dropdown */}
            <div id="admin-notifications-container" style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotificationsDropdown(prev => !prev)}
                style={{
                  background: showNotificationsDropdown ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  color: badgeCounts.total_notifications > 0 ? '#ffffff' : '#a6b0cf',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '7px 9px',
                  borderRadius: '8px',
                  position: 'relative',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                title="Pending Requests & Alerts"
              >
                <Bell size={20} />
                {badgeCounts.total_notifications > 0 && (
                  <span
                    className="admin-badge-pulse"
                    style={{
                      position: 'absolute',
                      top: '1px',
                      right: '1px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      minWidth: '17px',
                      height: '17px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.6)'
                    }}
                  >
                    {badgeCounts.total_notifications > 99 ? '99+' : badgeCounts.total_notifications}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Popover */}
              {showNotificationsDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: isMobile ? '-75px' : '0px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                    borderRadius: '10px',
                    width: '320px',
                    maxWidth: '88vw',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    zIndex: 9999
                  }}
                >
                  <div style={{
                    padding: '13px 16px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #334155'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={16} style={{ color: '#f1673e' }} />
                      <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>Pending Requests</span>
                    </div>
                    <span style={{
                      backgroundColor: badgeCounts.total_notifications > 0 ? '#ef4444' : '#10b981',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {badgeCounts.total_notifications > 0 ? `${badgeCounts.total_notifications} Pending` : 'All Clear'}
                    </span>
                  </div>

                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {/* Fund Requests */}
                    <div
                      onClick={() => {
                        setShowNotificationsDropdown(false);
                        handleTabClick('deposits');
                      }}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Wallet size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>Fund Deposit Requests</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Pending deposit approvals</div>
                        </div>
                      </div>
                      {badgeCounts.pending_deposits > 0 ? (
                        <span style={{ backgroundColor: '#10b981', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                          {badgeCounts.pending_deposits}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>0</span>
                      )}
                    </div>

                    {/* Withdraw Requests */}
                    <div
                      onClick={() => {
                        setShowNotificationsDropdown(false);
                        handleTabClick('withdrawals');
                      }}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ArrowUpRight size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>Withdraw Requests</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Pending payout requests</div>
                        </div>
                      </div>
                      {badgeCounts.pending_withdrawals > 0 ? (
                        <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                          {badgeCounts.pending_withdrawals}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>0</span>
                      )}
                    </div>

                    {/* Auto Deposit History */}
                    <div
                      onClick={() => {
                        setShowNotificationsDropdown(false);
                        handleTabClick('report_auto_deposit');
                      }}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>Auto Deposit Transactions</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Pending UPI gateway verifications</div>
                        </div>
                      </div>
                      {badgeCounts.pending_auto_deposits > 0 ? (
                        <span style={{ backgroundColor: '#f59e0b', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                          {badgeCounts.pending_auto_deposits}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>0</span>
                      )}
                    </div>

                    {/* Live Support Chat */}
                    <div
                      onClick={() => {
                        setShowNotificationsDropdown(false);
                        handleTabClick('support_chat');
                      }}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MessageSquare size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>Support Chat Messages</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Unread client inquiries</div>
                        </div>
                      </div>
                      {(badgeCounts.unread_chats > 0 || chatUnreadCount > 0) ? (
                        <span style={{ backgroundColor: '#3b82f6', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                          {badgeCounts.unread_chats || chatUnreadCount}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>0</span>
                      )}
                    </div>

                    {/* Unapproved Users */}
                    <div
                      onClick={() => {
                        setShowNotificationsDropdown(false);
                        handleTabClick('user_management');
                      }}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>Unapproved Users</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>New accounts pending approval</div>
                        </div>
                      </div>
                      {badgeCounts.unapproved_users > 0 ? (
                        <span style={{ backgroundColor: '#a855f7', color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                          {badgeCounts.unapproved_users}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>0</span>
                      )}
                    </div>

                    {/* Recent Notifications & Registrations List */}
                    {Array.isArray(badgeCounts.recent_notifications) && badgeCounts.recent_notifications.length > 0 && (
                      <div style={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#fcfcfc' }}>
                        <div style={{ padding: '8px 16px', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '#f8fafc' }}>
                          Recent Registrations & Activity
                        </div>
                        {badgeCounts.recent_notifications.map((notif, idx) => (
                          <div
                            key={notif.id || idx}
                            onClick={() => {
                              setShowNotificationsDropdown(false);
                              if (notif.tab) handleTabClick(notif.tab);
                            }}
                            style={{
                              padding: '10px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {notif.message}
                              </div>
                              {notif.date && (
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                                  {notif.date}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#f1673e', fontWeight: '600', flexShrink: 0 }}>
                              View &rarr;
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{
                    padding: '10px 16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <button
                      onClick={() => fetchBadgeCounts(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 6px'
                      }}
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                    <button
                      onClick={() => setShowNotificationsDropdown(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f1673e',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a6b0cf',
                fontSize: '1.3rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '6px'
              }}
              title="Fullscreen"
            >
              ⛶
            </button>

            {/* User Profile Button */}
            <div
              onClick={() => setShowProfileDropdown(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: showProfileDropdown ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'background 0.2s ease'
              }}
            >
              <img
                src="/assets/images/avatar-1.jpg"
                alt="Avatar"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.25)' }}
                onError={(e) => { e.target.src = '/assets/images/logo1.png'; }}
              />
              <span style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: '500' }}>Admin</span>
              <span style={{ fontSize: '0.75rem', color: '#a6b0cf' }}>▾</span>
            </div>

            {/* Top-Right Profile Dropdown Card (Matching Screenshot) */}
            {showProfileDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '55px',
                  right: '0px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 5px 20px rgba(0,0,0,0.18)',
                  borderRadius: '6px',
                  width: '180px',
                  border: '1px solid #eff2f7',
                  overflow: 'hidden',
                  zIndex: 999
                }}
              >
                <div
                  onClick={() => {
                    setShowProfileDropdown(false);
                    setShowPasswordModal(true);
                  }}
                  style={{
                    padding: '11px 16px',
                    color: '#495057',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Users size={16} style={{ color: '#556ee6' }} />
                  <span>Change Password</span>
                </div>

                <div
                  onClick={() => {
                    setShowProfileDropdown(false);
                    setActiveTab('settings');
                  }}
                  style={{
                    padding: '11px 16px',
                    color: '#495057',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Settings size={16} style={{ color: '#556ee6' }} />
                  <span>Settings</span>
                </div>

                <div style={{ height: '1px', backgroundColor: '#eff2f7', margin: '2px 0' }} />

                <div
                  onClick={() => {
                    setShowProfileDropdown(false);
                    handleLogout();
                  }}
                  style={{
                    padding: '11px 16px',
                    color: '#f46a6a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(244,106,106,0.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <LogOut size={16} style={{ color: '#f46a6a' }} />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Screen Views */}
        <div style={{
          padding: activeTab === 'support_chat'
            ? (isMobile ? '6px 8px' : '10px 16px')
            : (isMobile ? '12px 14px' : '24px 28px'),
          flex: 1,
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          display: activeTab === 'support_chat' ? 'flex' : 'block',
          flexDirection: activeTab === 'support_chat' ? 'column' : undefined,
          height: activeTab === 'support_chat' ? '100%' : 'auto',
          minHeight: 0,
          overflow: activeTab === 'support_chat' ? 'hidden' : 'visible'
        }}>



          {/* VIEW 1: DASHBOARDS */}
          {activeTab === 'dashboards' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              {/* Header Title & Quick Action Toolbar */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '16px',
                marginBottom: '24px',
                backgroundColor: '#ffffff',
                padding: '18px 24px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                border: '1px solid #eff2f7'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: '800', letterSpacing: '-0.02em' }}>
                      Dashboard Overview
                    </h4>
                    <span style={{
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' }}></span>
                      Live Updates
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Real-time platform metrics, user statistics, bid analytics & auto deposit history.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#475569',
                    fontWeight: '500'
                  }}>
                    <Calendar size={15} style={{ color: '#64748b' }} />
                    <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>

                  <button
                    onClick={() => {
                      fetchAdminCoins();
                      fetchAnkBids();
                      fetchBidWinReport();
                      fetchAutoDeposits();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#556ee6',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(85, 110, 230, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4458c8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#556ee6'}
                  >
                    <RefreshCw size={14} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Grid Row 1: Left Profile & Market Bid + Right Stat Cards & Single Ank Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2.3fr', gap: '20px', marginBottom: '24px' }}>

                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Welcome Profile Card */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #eff2f7',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                      padding: '24px 20px',
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ zIndex: 2 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '600', marginBottom: '8px' }}>
                          <Sparkles size={12} /> Console
                        </div>
                        <h5 style={{ color: '#ffffff', fontSize: '1.15rem', margin: '0 0 4px 0', fontWeight: '700' }}>
                          Welcome Back!
                        </h5>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', margin: 0 }}>
                          Kalyan Matka Admin Console
                        </p>
                      </div>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        backdropFilter: 'blur(4px)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        zIndex: 2
                      }}>
                        👑
                      </div>
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#ffffff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '1.2rem',
                          border: '2px solid #3b82f6',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
                        }}>
                          {(adminName || 'Admin').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h6 style={{ margin: 0, fontSize: '0.98rem', color: '#1e293b', fontWeight: '700' }}>
                            {adminName || 'Admin Console'}
                          </h6>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>Super Admin</span>
                          </div>
                        </div>
                      </div>

                      {/* User Stats Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <div
                          onClick={() => { handleTabClick('user_management'); setUserFilter('unapproved'); }}
                          style={{
                            cursor: 'pointer',
                            padding: '12px 10px',
                            backgroundColor: '#fef2f2',
                            borderRadius: '10px',
                            textAlign: 'center',
                            border: '1px solid #fee2e2',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#ef4444', marginBottom: '2px' }}>
                            <UserX size={15} />
                            <h5 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{metrics.unapproved_users || 0}</h5>
                          </div>
                          <span style={{ fontSize: '0.73rem', color: '#991b1b', fontWeight: '600' }}>Unapproved Users</span>
                        </div>

                        <div
                          onClick={() => { handleTabClick('user_management'); setUserFilter('all'); }}
                          style={{
                            cursor: 'pointer',
                            padding: '12px 10px',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '10px',
                            textAlign: 'center',
                            border: '1px solid #dcfce7',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#10b981', marginBottom: '2px' }}>
                            <UserCheck size={15} />
                            <h5 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{metrics.approved_users || 0}</h5>
                          </div>
                          <span style={{ fontSize: '0.73rem', color: '#166534', fontWeight: '600' }}>Approved Users</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market Bid Details Card */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #eff2f7',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={18} />
                      </div>
                      <h5 style={{ margin: 0, fontSize: '0.98rem', color: '#1e293b', fontWeight: '700' }}>
                        Market Bid Details
                      </h5>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                        Select Game Market
                      </label>
                      <select
                        value={selectedGameForMarket}
                        onChange={(e) => {
                          setSelectedGameForMarket(e.target.value);
                          setMarketBidAmount(e.target.value ? '0' : 'N/A');
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          color: '#1e293b',
                          backgroundColor: '#f8fafc',
                          outline: 'none',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Select Game --</option>
                        <option value="all">⭐ All Games Combined</option>
                        {games.map(g => (
                          <option key={g.id} value={g.games_name}>{g.games_name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Market Bid Volume
                      </span>
                      <h3 style={{ margin: '6px 0 0 0', fontSize: '1.65rem', color: '#0f172a', fontWeight: '800' }}>
                        ₹ {marketBidAmount || 0}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* 3 Top Executive Stat Cards Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                    
                    {/* Stat Card 1: Total Users */}
                    <div
                      onClick={() => handleTabClick('user_management')}
                      style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        padding: '16px 18px',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: 0,
                        height: '84px',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        border: '1px solid #bfdbfe',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.08)',
                        transition: 'all 0.25s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', lineHeight: 1.2 }}>
                          Total Users
                        </span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', color: '#1e3a8a', fontWeight: '800', lineHeight: 1 }}>
                          {metrics.total_users || 0}
                        </h4>
                      </div>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        minWidth: '44px',
                        flexShrink: 0,
                        borderRadius: '12px',
                        backgroundColor: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                      }}>
                        <Users size={22} />
                      </div>
                    </div>

                    {/* Stat Card 2: Total Games */}
                    <div
                      onClick={() => handleTabClick('rates')}
                      style={{
                        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                        padding: '16px 18px',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: 0,
                        height: '84px',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        border: '1px solid #fecdd3',
                        boxShadow: '0 4px 15px rgba(244, 63, 94, 0.08)',
                        transition: 'all 0.25s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', lineHeight: 1.2 }}>
                          Total Games
                        </span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', color: '#881337', fontWeight: '800', lineHeight: 1 }}>
                          {metrics.total_games || games.length || 0}
                        </h4>
                      </div>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        minWidth: '44px',
                        flexShrink: 0,
                        borderRadius: '12px',
                        backgroundColor: '#e11d48',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)'
                      }}>
                        <Gamepad2 size={22} />
                      </div>
                    </div>

                    {/* Stat Card 3: Today Bid Amount */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        padding: '16px 18px',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: 0,
                        height: '84px',
                        boxSizing: 'border-box',
                        border: '1px solid #fde68a',
                        boxShadow: '0 4px 15px rgba(217, 119, 6, 0.08)',
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', lineHeight: 1.2 }}>
                          Today Bid Amount
                        </span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', color: '#78350f', fontWeight: '800', lineHeight: 1 }}>
                          ₹ {metrics.today_bid_amount || 0}
                        </h4>
                      </div>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        minWidth: '44px',
                        flexShrink: 0,
                        borderRadius: '12px',
                        backgroundColor: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 4px 10px rgba(217, 119, 6, 0.3)'
                      }}>
                        <TrendingUp size={22} />
                      </div>
                    </div>

                  </div>

                  {/* Total Bids On Single Ank Section */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '22px',
                    border: '1px solid #eff2f7',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Filter size={18} />
                        </div>
                        <div>
                          <h5 style={{ margin: 0, fontSize: '0.98rem', color: '#1e293b', fontWeight: '700' }}>
                            Single Ank Bid Analytics
                          </h5>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Selected Date: {ankDate ? new Date(ankDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Filter Inputs Toolbar */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 2fr 2fr 1fr',
                      gap: '12px',
                      backgroundColor: '#f8fafc',
                      padding: '14px',
                      borderRadius: '10px',
                      marginBottom: '20px',
                      border: '1px solid #f1f5f9'
                    }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Date</label>
                        <input
                          type="date"
                          value={ankDate}
                          onChange={(e) => setAnkDate(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#1e293b', backgroundColor: '#fff' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Game Name</label>
                        <select
                          value={ankGameName}
                          onChange={(e) => setAnkGameName(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#1e293b', backgroundColor: '#fff' }}
                        >
                          <option value="">-- All Games --</option>
                          <option value="all">All Games</option>
                          {games.map(g => (
                            <option key={g.id} value={g.games_name}>{g.games_name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Market Session</label>
                        <select
                          value={ankMarketStatus}
                          onChange={(e) => setAnkMarketStatus(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#1e293b', backgroundColor: '#fff' }}
                        >
                          <option value="open_digit">Open Market</option>
                          <option value="close_digit">Close Market</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: isMobile ? 'span 2' : 'auto' }}>
                        <button
                          onClick={fetchAnkBids}
                          style={{
                            width: '100%',
                            padding: '9px 14px',
                            backgroundColor: '#f1673e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(241, 103, 62, 0.25)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d95328'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1673e'}
                        >
                          Fetch
                        </button>
                      </div>
                    </div>

                    {/* 10 Ank Cards Grid (Ank 0 - 9) */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px' }}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((ank) => {
                        const styleConfig = ankColors[ank];
                        const data = ankBids[ank] || { bids: 0, amount: 0 };
                        return (
                          <div
                            key={ank}
                            style={{
                              border: `1px solid ${styleConfig.border}`,
                              borderRadius: '10px',
                              overflow: 'hidden',
                              backgroundColor: '#ffffff',
                              textAlign: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-3px)';
                              e.currentTarget.style.boxShadow = `0 6px 16px ${styleConfig.border}33`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                            }}
                          >
                            <div style={{
                              padding: '8px 10px',
                              backgroundColor: `${styleConfig.header}12`,
                              borderBottom: `1px solid ${styleConfig.border}30`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{
                                backgroundColor: styleConfig.header,
                                color: '#ffffff',
                                fontSize: '0.7rem',
                                fontWeight: '800',
                                padding: '2px 8px',
                                borderRadius: '12px'
                              }}>
                                Ank {ank}
                              </span>
                              <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: '600' }}>
                                {data.bids} Bids
                              </span>
                            </div>
                            <div style={{ padding: '12px 8px' }}>
                              <h3 style={{ margin: '0 0 2px 0', fontSize: '1.25rem', color: '#1e293b', fontWeight: '800' }}>
                                ₹ {data.amount}
                              </h3>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '500' }}>Total Amount</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>

                </div>

              </div>

              {/* Grid Row 2: Bid Winning Executive Summary */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #eff2f7',
                marginBottom: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={18} />
                  </div>
                  <h5 style={{ margin: 0, fontSize: '0.98rem', color: '#1e293b', fontWeight: '700' }}>
                    Bid Winning & Profit Analytics
                  </h5>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 2fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Date</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Game Name</label>
                    <select
                      value={reportGameName}
                      onChange={(e) => setReportGameName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="all">⭐ All Games</option>
                      {games.map(g => (
                        <option key={g.id} value={g.games_name}>{g.games_name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={fetchBidWinReport}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#556ee6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(85, 110, 230, 0.25)'
                      }}
                    >
                      Submit Report
                    </button>
                  </div>
                </div>

                {/* Summary Cards Row */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.2fr', gap: '14px' }}>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Total Bid Amount</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: '800' }}>₹ {bidWinData.total_bid}</h4>
                    </div>
                    <button
                      onClick={() => setActiveTab('report_bid_history')}
                      style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </div>

                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Total Win Amount</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: '800' }}>₹ {bidWinData.total_win}</h4>
                    </div>
                    <button
                      onClick={() => setActiveTab('report_winning')}
                      style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </div>

                  <div style={{
                    background: (parseFloat(bidWinData.profit) >= 0 || !bidWinData.profit)
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    padding: '14px 20px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '600' }}>
                        {parseFloat(bidWinData.profit) >= 0 ? 'Total Net Profit' : 'Total Net Loss'}
                      </span>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: '1.35rem', fontWeight: '800' }}>₹ {bidWinData.profit}</h4>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={18} />
                    </div>
                  </div>
                </div>

              </div>

              {/* Grid Row 3: Fund Request Auto Deposit History Table */}
              {(() => {
                const totalItems = autoDepositTotalCount;
                const totalAmount = autoDepositTotals.total_transfer || 0;
                const approvedCount = autoDepositTotals.total_approved || 0;
                const pendingCount = autoDepositTotals.total_pending || 0;
                const declinedCount = autoDepositTotals.total_rejected || 0;

                return (
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #eff2f7',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                  }}>
                    {/* Header + Title & Stats */}
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: '14px',
                      marginBottom: '18px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Wallet size={20} />
                        </div>
                        <div>
                          <h5 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: '800' }}>
                            Fund Request Auto Deposit History
                          </h5>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Deposit requests: <strong style={{ color: '#4338ca' }}>{autoDepositDate ? (autoDepositDate === getISTTodayStr() ? `Today (${autoDepositDate})` : autoDepositDate) : 'All Dates'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Summary Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                          Total: ₹ {totalAmount.toLocaleString('en-IN')} ({totalItems})
                        </span>
                        {pendingCount > 0 && (
                          <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                            ⏳ {pendingCount} Pending
                          </span>
                        )}
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                          ✓ ₹ {approvedCount.toLocaleString('en-IN')} Accepted
                        </span>
                        {declinedCount > 0 && (
                          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                            ✕ ₹ {declinedCount.toLocaleString('en-IN')} Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'stretch' : 'center',
                      gap: '12px',
                      backgroundColor: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '16px'
                    }}>
                      {/* Left: Date Filter controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={16} style={{ color: '#64748b' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Date:</span>
                        </div>
                        <input
                          type="date"
                          value={autoDepositDate}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setAutoDepositDate(newDate);
                            setAutoDepositPage(1);
                            fetchAutoDeposits(newDate, 1, autoDepositPerPage, autoDepositSearch);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            fontWeight: '600',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const today = getISTTodayStr();
                            setAutoDepositDate(today);
                            setAutoDepositPage(1);
                            fetchAutoDeposits(today, 1, autoDepositPerPage, autoDepositSearch);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: autoDepositDate === getISTTodayStr() ? '#4338ca' : '#ffffff',
                            color: autoDepositDate === getISTTodayStr() ? '#ffffff' : '#334155',
                            boxShadow: autoDepositDate === getISTTodayStr() ? '0 2px 6px rgba(67, 56, 202, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Today (1 Din)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAutoDepositDate('');
                            setAutoDepositPage(1);
                            fetchAutoDeposits('', 1, autoDepositPerPage, autoDepositSearch);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: !autoDepositDate ? '#4338ca' : '#ffffff',
                            color: !autoDepositDate ? '#ffffff' : '#334155',
                            boxShadow: !autoDepositDate ? '0 2px 6px rgba(67, 56, 202, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          All Dates
                        </button>
                      </div>

                      {/* Right: Search & Per Page */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Show:</span>
                          <select
                            value={autoDepositPerPage}
                            onChange={(e) => {
                              const sz = Number(e.target.value);
                              setAutoDepositPerPage(sz);
                              setAutoDepositPage(1);
                              fetchAutoDeposits(autoDepositDate, 1, sz, autoDepositSearch);
                            }}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              backgroundColor: '#ffffff',
                              color: '#1e293b',
                              fontWeight: '600',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>

                        <div style={{ position: 'relative', width: isMobile ? '100%' : '240px' }}>
                          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          <input
                            type="text"
                            placeholder="Search UTR, User, Req..."
                            value={autoDepositSearch}
                            onChange={(e) => setAutoDepositSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setAutoDepositPage(1);
                                fetchAutoDeposits(autoDepositDate, 1, autoDepositPerPage, e.target.value);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px 6px 30px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              backgroundColor: '#ffffff',
                              outline: 'none'
                            }}
                          />
                          {autoDepositSearch && (
                            <button
                              onClick={() => {
                                setAutoDepositSearch('');
                                setAutoDepositPage(1);
                                fetchAutoDeposits(autoDepositDate, 1, autoDepositPerPage, '');
                              }}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                border: 'none',
                                background: 'transparent',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => fetchAutoDeposits(autoDepositDate, autoDepositPage, autoDepositPerPage, autoDepositSearch)}
                          disabled={autoDepositsLoading}
                          title="Refresh Deposits"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <RefreshCw size={14} style={{ animation: autoDepositsLoading ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                      </div>
                    </div>

                    {/* Table Container */}
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#1e293b', color: '#f8fafc', textAlign: 'left' }}>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>#</th>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>User Name</th>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>Amount</th>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>UTR / Txn ID</th>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>Req ID</th>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>Date & Time</th>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>Status</th>
                            <th style={{ padding: '12px 14px', fontWeight: '700' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoDepositsLoading ? (
                            <tr>
                              <td colSpan="8" style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', color: '#4338ca' }} />
                                  <span style={{ fontWeight: '600' }}>Loading deposit requests...</span>
                                </div>
                              </td>
                            </tr>
                          ) : autoDeposits.length > 0 ? (
                            autoDeposits.map((dep, idx) => (
                              <tr key={dep.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600' }}>
                                  {(autoDepositPage - 1) * autoDepositPerPage + idx + 1}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b' }}>
                                  {dep.user_name || dep.username || 'N/A'}
                                  {dep.username && dep.user_name && dep.username !== dep.user_name && (
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
                                      {dep.username}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: '800', color: '#10b981' }}>
                                  ₹ {parseFloat(dep.amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#475569', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                  {dep.txt_request || dep.txt_id || '-'}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600' }}>
                                  #{dep.id}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>
                                  {dep.txt_date}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  {dep.status === '1' || dep.status === 1 ? (
                                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <CheckCircle2 size={12} /> Accepted
                                    </span>
                                  ) : dep.status === '0' || dep.status === 0 ? (
                                    <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Clock size={12} /> Pending
                                    </span>
                                  ) : (
                                    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <XCircle size={12} /> Rejected
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  {dep.status === '0' || dep.status === 0 ? (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        onClick={() => handleAutoDepositAction(dep.id, '1')}
                                        style={{
                                          backgroundColor: '#10b981',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 10px',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <CheckCircle2 size={12} /> Approve
                                      </button>
                                      <button
                                        onClick={() => handleAutoDepositAction(dep.id, '-1')}
                                        style={{
                                          backgroundColor: '#ef4444',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 10px',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <XCircle size={12} /> Decline
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>--</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <Wallet size={36} style={{ color: '#cbd5e1' }} />
                                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
                                    {autoDepositDate ? `No deposit requests found for ${autoDepositDate === getISTTodayStr() ? 'Today' : autoDepositDate}` : 'No deposit requests found'}
                                  </span>
                                  {autoDepositDate && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAutoDepositDate('');
                                        setAutoDepositPage(1);
                                        fetchAutoDeposits('', 1, autoDepositPerPage, autoDepositSearch);
                                      }}
                                      style={{
                                        backgroundColor: '#f1f5f9',
                                        color: '#4338ca',
                                        border: '1px solid #cbd5e1',
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        marginTop: '4px'
                                      }}
                                    >
                                      View All Dates →
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <PaginationBar
                      currentPage={autoDepositPage}
                      pageSize={autoDepositPerPage}
                      totalItems={autoDepositTotalCount}
                      onPageChange={(p) => {
                        setAutoDepositPage(p);
                        fetchAutoDeposits(autoDepositDate, p, autoDepositPerPage, autoDepositSearch);
                      }}
                      onPageSizeChange={(sz) => {
                        setAutoDepositPerPage(sz);
                        setAutoDepositPage(1);
                        fetchAutoDeposits(autoDepositDate, 1, sz, autoDepositSearch);
                      }}
                      itemName="auto deposits"
                    />
                  </div>
                );
              })()}

            </div>
          )}

          {/* VIEW 2: USER MANAGEMENT (Matching Image 3) */}
          {activeTab === 'user_management' && (
            <div>
              {/* Header Title & Breadcrumb */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  User List
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Dashboards / <span style={{ color: '#556ee6' }}>User List</span>
                </div>
              </div>

              {/* Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                {/* Top Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setUserPage(1);
                      fetchUsers(1, userPerPage, userSearch, userFilter);
                    }}
                    style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <input
                      type="text"
                      placeholder="Search users (name, phone, email)..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ width: '280px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                    />
                    <button
                      type="submit"
                      disabled={usersLoading}
                      style={{
                        backgroundColor: '#556ee6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {usersLoading ? 'Searching...' : 'Search'}
                    </button>
                    {userSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch('');
                          setUserPage(1);
                          fetchUsers(1, userPerPage, '', userFilter);
                        }}
                        style={{
                          backgroundColor: '#6c757d',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </form>
                  <button
                    onClick={() => {
                      const nextFilter = userFilter === 'all' ? 'unapproved' : 'all';
                      setUserFilter(nextFilter);
                      setUserPage(1);
                      fetchUsers(1, userPerPage, userSearch, nextFilter);
                    }}
                    style={{
                      backgroundColor: '#f1673e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {userFilter === 'all' ? 'Un-approved Users List' : 'All Users List'}
                  </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>#</th>
                        <th style={{ padding: '12px' }}>User Name</th>
                        <th style={{ padding: '12px' }}>Mobile</th>
                        <th style={{ padding: '12px' }}>Email</th>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Balance</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Betting</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Transfer</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Active</th>
                        <th style={{ padding: '12px' }}>Referral (Referred by)</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, idx) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '12px' }}>{(userPage - 1) * userPerPage + idx + 1}</td>
                          <td style={{ padding: '12px', color: '#f1673e', fontWeight: '500' }}>{u.name || 'User'}</td>
                          <td style={{ padding: '12px' }}>{u.phone}</td>
                          <td style={{ padding: '12px' }}>{u.email || '-'}</td>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{u.date || '-'}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.wallet || 0}</td>

                          {/* Betting Toggle */}
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span
                              onClick={() => handleToggleUserField(u.id, 'betting_status')}
                              style={{
                                cursor: 'pointer',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: (u.betting_status === '1' || u.betting_status === 1) ? '#2BC155' : '#FF4847',
                                backgroundColor: (u.betting_status === '1' || u.betting_status === 1) ? 'rgba(43,193,85,0.18)' : 'rgba(255,72,71,0.18)'
                              }}
                            >
                              {(u.betting_status === '1' || u.betting_status === 1) ? 'Yes' : 'No'}
                            </span>
                          </td>

                          {/* Transfer Toggle */}
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span
                              onClick={() => handleToggleUserField(u.id, 'transfer_status')}
                              style={{
                                cursor: 'pointer',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: (u.transfer_status === '1' || u.transfer_status === 1) ? '#2BC155' : '#FF4847',
                                backgroundColor: (u.transfer_status === '1' || u.transfer_status === 1) ? 'rgba(43,193,85,0.18)' : 'rgba(255,72,71,0.18)'
                              }}
                            >
                              {(u.transfer_status === '1' || u.transfer_status === 1) ? 'Yes' : 'No'}
                            </span>
                          </td>

                          {/* Active Toggle */}
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span
                              onClick={() => handleToggleUserField(u.id, 'status')}
                              style={{
                                cursor: 'pointer',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: (u.status === '1' || u.status === 1) ? '#2BC155' : '#FF4847',
                                backgroundColor: (u.status === '1' || u.status === 1) ? 'rgba(43,193,85,0.18)' : 'rgba(255,72,71,0.18)'
                              }}
                            >
                              {(u.status === '1' || u.status === 1) ? 'Yes' : 'No'}
                            </span>
                          </td>

                          <td style={{ padding: '12px' }}>{u.referred_by_phone || '-'}</td>

                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleOpenUserDetails(u)}
                              style={{
                                backgroundColor: '#f1673e',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 12px',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && !usersLoading && (
                        <tr>
                          <td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                            No users found.
                          </td>
                        </tr>
                      )}
                      {usersLoading && (
                        <tr>
                          <td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>
                            Loading users...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Server-Side Pagination Bar */}
                <PaginationBar
                  currentPage={userPage}
                  pageSize={userPerPage}
                  totalItems={userTotal}
                  onPageChange={(p) => {
                    setUserPage(p);
                    fetchUsers(p, userPerPage, userSearch, userFilter);
                  }}
                  onPageSizeChange={(sz) => {
                    setUserPerPage(sz);
                    setUserPage(1);
                    fetchUsers(1, sz, userSearch, userFilter);
                  }}
                  itemName="users"
                />
              </div>
            </div>
          )}

          {/* VIEW: DEDICATED USER DETAILS */}
          {activeTab === 'user-details' && (
            <div>
              {/* Page Title & Back Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActiveTab('user_management')}
                    style={{
                      backgroundColor: '#556ee6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ← Back to User List
                  </button>
                  <select
                    value={selectedUserId || ''}
                    onChange={(e) => {
                      const uId = e.target.value;
                      if (uId) {
                        setSelectedUserId(uId);
                        localStorage.setItem('admin_selected_user_id', uId);
                        fetchUserFullDetails(uId);
                      }
                    }}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', backgroundColor: '#ffffff', outline: 'none' }}
                  >
                    <option value="">-- Select User --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                    ))}
                  </select>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', fontWeight: '700' }}>
                    User Details {userDetailsData?.user ? `| ${userDetailsData.user.name} (${userDetailsData.user.phone})` : ''}
                  </h4>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Dashboards / User List / <span style={{ color: '#556ee6' }}>User Details</span>
                </div>
              </div>

              {userDetailsLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#74788d' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
                  Fetching full user profile & transaction data...
                </div>
              ) : userDetailsData && userDetailsData.user ? (
                <div>
                  {/* PENDING REQUESTS ATTENTION BANNER */}
                  {((userDetailsData.depositRequests || []).some(d => d.status === '0' || d.status === 0) ||
                    (userDetailsData.withdrawRequests || []).some(w => w.status === '0' || w.status === 0)) && (
                    <div style={{
                      backgroundColor: '#fff8e6',
                      border: '1px solid #ffeeba',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>⚡</span>
                        <div>
                          <strong style={{ color: '#856404', fontSize: '0.92rem' }}>Pending Requests Attention</strong>
                          <div style={{ color: '#856404', fontSize: '0.82rem' }}>
                            This user has{' '}
                            <strong>{(userDetailsData.depositRequests || []).filter(d => d.status === '0' || d.status === 0).length} pending deposit(s)</strong>
                            {' '}and{' '}
                            <strong>{(userDetailsData.withdrawRequests || []).filter(w => w.status === '0' || w.status === 0).length} pending withdrawal(s)</strong>.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(userDetailsData.depositRequests || []).some(d => d.status === '0' || d.status === 0) && (
                          <button
                            type="button"
                            onClick={() => setActiveUserSubTab('deposits')}
                            style={{
                              backgroundColor: '#28a745',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Review Deposits ({(userDetailsData.depositRequests || []).filter(d => d.status === '0' || d.status === 0).length}) →
                          </button>
                        )}
                        {(userDetailsData.withdrawRequests || []).some(w => w.status === '0' || w.status === 0) && (
                          <button
                            type="button"
                            onClick={() => setActiveUserSubTab('withdrawals')}
                            style={{
                              backgroundColor: '#f46a6a',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Review Withdrawals ({(userDetailsData.withdrawRequests || []).filter(w => w.status === '0' || w.status === 0).length}) →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Top Control Grid: 3 Main Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>

                    {/* CARD 1: USER PROFILE & PERMISSIONS */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', borderBottom: '1px solid #eff2f7', paddingBottom: '14px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#556ee6', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                          👤
                        </div>
                        <div>
                          <h5 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '700' }}>
                            {userDetailsData.user.name || 'User Profile'}
                          </h5>
                          <span style={{ fontSize: '0.8rem', color: '#74788d' }}>
                            Phone: <strong>{userDetailsData.user.phone}</strong> | Email: {userDetailsData.user.email || 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem', marginBottom: '16px' }}>
                        <div>
                          <span style={{ color: '#74788d', display: 'block', fontSize: '0.75rem' }}>Wallet Balance</span>
                          <span style={{ color: '#2bc155', fontWeight: 'bold', fontSize: '1.1rem' }}>₹{userDetailsData.user.wallet || 0}</span>
                        </div>
                        <div>
                          <span style={{ color: '#74788d', display: 'block', fontSize: '0.75rem' }}>Registration Date</span>
                          <span style={{ color: '#495057', fontWeight: '600' }}>{userDetailsData.user.date || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#74788d', display: 'block', fontSize: '0.75rem' }}>Referred By</span>
                          <span style={{ color: '#556ee6', fontWeight: '600' }}>{userDetailsData.user.referred_by_phone || 'None'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#74788d', display: 'block', fontSize: '0.75rem' }}>M-PIN</span>
                          <span style={{ color: '#495057', fontWeight: '600' }}>{userDetailsData.user.m_pin || 'Not Set'}</span>
                        </div>
                      </div>

                      {/* Permissions Toggles */}
                      <div style={{ borderTop: '1px dashed #ced4da', paddingTop: '12px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#74788d', fontWeight: '600', display: 'block', marginBottom: '8px' }}>User Permissions (Click to Toggle)</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={async () => {
                              await handleToggleUserField(userDetailsData.user.id, 'status');
                              fetchUserFullDetails(selectedUserId);
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              color: '#ffffff',
                              backgroundColor: (userDetailsData.user.status === '1' || userDetailsData.user.status === 1) ? '#2bc155' : '#ef4444'
                            }}
                          >
                            Account: {(userDetailsData.user.status === '1' || userDetailsData.user.status === 1) ? 'Active ✅' : 'Inactive ❌'}
                          </button>

                          <button
                            onClick={async () => {
                              await handleToggleUserField(userDetailsData.user.id, 'betting_status');
                              fetchUserFullDetails(selectedUserId);
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              color: '#ffffff',
                              backgroundColor: (userDetailsData.user.betting_status === '1' || userDetailsData.user.betting_status === 1) ? '#2bc155' : '#ef4444'
                            }}
                          >
                            Betting: {(userDetailsData.user.betting_status === '1' || userDetailsData.user.betting_status === 1) ? 'Allowed 🎯' : 'Blocked 🛑'}
                          </button>

                          <button
                            onClick={async () => {
                              await handleToggleUserField(userDetailsData.user.id, 'transfer_status');
                              fetchUserFullDetails(selectedUserId);
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              color: '#ffffff',
                              backgroundColor: (userDetailsData.user.transfer_status === '1' || userDetailsData.user.transfer_status === 1) ? '#2bc155' : '#ef4444'
                            }}
                          >
                            Transfer: {(userDetailsData.user.transfer_status === '1' || userDetailsData.user.transfer_status === 1) ? 'Yes 💸' : 'No 🔒'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: PASSWORD SECURITY & CHANGE PASSWORD */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                      <h5 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: '#495057', fontWeight: '700', borderBottom: '1px solid #eff2f7', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🔑 Password & Security
                      </h5>

                      {/* Show Password Widget */}
                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e9ecef' }}>
                        <span style={{ fontSize: '0.75rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>Current User Password</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#2a3042' }}>
                            {showPassword ? (userDetailsData.user.password || 'Not Set') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#556ee6', fontWeight: '600' }}
                          >
                            {showPassword ? '🙈 Hide' : '👁️ Show Password'}
                          </button>
                        </div>
                      </div>

                      {/* Change Password Form */}
                      <form onSubmit={handleUpdatePasswordSubmit}>
                        <label style={{ fontSize: '0.78rem', color: '#495057', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                          Change User Password
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Enter new password"
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            required
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                          />
                          <button
                            type="submit"
                            disabled={passwordUpdating}
                            style={{
                              backgroundColor: '#556ee6',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '8px 12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {passwordUpdating ? 'Updating...' : 'Update Password'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* CARD 3: WALLET ADD / MINUS AMOUNT CONTROLS */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                      <h5 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: '#495057', fontWeight: '700', borderBottom: '1px solid #eff2f7', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💰 Wallet Control (Add / Deduct)
                      </h5>

                      <form onSubmit={handleAdjustWalletSubmit}>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '0.75rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>Operation Type</label>
                          <div style={{ display: 'flex', gap: '14px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', cursor: 'pointer', color: '#2bc155', fontWeight: 'bold' }}>
                              <input
                                type="radio"
                                name="walletType"
                                value="add"
                                checked={walletAdjType === 'add'}
                                onChange={() => setWalletAdjType('add')}
                              />
                              ➕ Add Amount (+)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>
                              <input
                                type="radio"
                                name="walletType"
                                value="deduct"
                                checked={walletAdjType === 'deduct'}
                                onChange={() => setWalletAdjType('deduct')}
                              />
                              ➖ Deduct Amount (-)
                            </label>
                          </div>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '0.75rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>Amount (₹)</label>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={walletAdjAmount}
                            onChange={(e) => setWalletAdjAmount(e.target.value)}
                            min="1"
                            required
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ fontSize: '0.75rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>Remark</label>
                          <input
                            type="text"
                            placeholder="Remark (e.g. Deposit Bonus / Correction)"
                            value={walletAdjRemark}
                            onChange={(e) => setWalletAdjRemark(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={walletAdjSubmitting}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            backgroundColor: walletAdjType === 'add' ? '#2bc155' : '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.88rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {walletAdjSubmitting ? 'Processing...' : walletAdjType === 'add' ? 'Add Amount To Wallet' : 'Deduct Amount From Wallet'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* USER BANK ACCOUNT & PAYMENT DETAILS CARD */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                    <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '700', borderBottom: '1px solid #eff2f7', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏦 User Bank Account & UPI Payment Details
                    </h5>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.86rem' }}>
                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Bank Name</span>
                        <strong style={{ color: '#2a3042', fontSize: '0.92rem' }}>{userDetailsData.user.bank_name || 'Not Added'}</strong>
                      </div>

                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Account Holder Name</span>
                        <strong style={{ color: '#2a3042', fontSize: '0.92rem' }}>{userDetailsData.user.account_holder_name || 'Not Added'}</strong>
                      </div>

                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Account Number</span>
                        <strong style={{ color: '#556ee6', fontSize: '0.95rem', fontFamily: 'monospace' }}>{userDetailsData.user.account_number || 'Not Added'}</strong>
                      </div>

                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>IFSC Code</span>
                        <strong style={{ color: '#2a3042', fontSize: '0.92rem', fontFamily: 'monospace' }}>{userDetailsData.user.ifsc_code || 'Not Added'}</strong>
                      </div>

                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Branch Name</span>
                        <strong style={{ color: '#2a3042', fontSize: '0.92rem' }}>{userDetailsData.user.branch_name || 'Not Added'}</strong>
                      </div>

                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Paytm Number</span>
                        <strong style={{ color: '#2a3042', fontSize: '0.92rem' }}>{userDetailsData.user.paytm || 'Not Added'}</strong>
                      </div>

                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>PhonePe Number</span>
                        <strong style={{ color: '#2a3042', fontSize: '0.92rem' }}>{userDetailsData.user.phonepay || 'Not Added'}</strong>
                      </div>

                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <span style={{ color: '#74788d', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Google Pay Number</span>
                        <strong style={{ color: '#2a3042', fontSize: '0.92rem' }}>{userDetailsData.user.googlepay || 'Not Added'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM SECTION: RICH INTERACTIVE DATA TABLES */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #eff2f7', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setActiveUserSubTab('deposits')}
                        style={{
                          padding: '10px 18px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderBottom: activeUserSubTab === 'deposits' ? '3px solid #556ee6' : '3px solid transparent',
                          color: activeUserSubTab === 'deposits' ? '#556ee6' : '#74788d',
                          fontWeight: activeUserSubTab === 'deposits' ? 'bold' : '500',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📥 Deposit Requests ({(userDetailsData.depositRequests || []).length})
                        {(userDetailsData.depositRequests || []).filter(d => d.status === '0' || d.status === 0).length > 0 && (
                          <span style={{ backgroundColor: '#f1b44c', color: '#fff', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 'bold' }}>
                            {(userDetailsData.depositRequests || []).filter(d => d.status === '0' || d.status === 0).length} Pending
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveUserSubTab('withdrawals')}
                        style={{
                          padding: '10px 18px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderBottom: activeUserSubTab === 'withdrawals' ? '3px solid #556ee6' : '3px solid transparent',
                          color: activeUserSubTab === 'withdrawals' ? '#556ee6' : '#74788d',
                          fontWeight: activeUserSubTab === 'withdrawals' ? 'bold' : '500',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📤 Withdraw Requests ({(userDetailsData.withdrawRequests || []).length})
                        {(userDetailsData.withdrawRequests || []).filter(w => w.status === '0' || w.status === 0).length > 0 && (
                          <span style={{ backgroundColor: '#f46a6a', color: '#fff', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 'bold' }}>
                            {(userDetailsData.withdrawRequests || []).filter(w => w.status === '0' || w.status === 0).length} Pending
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveUserSubTab('wallet')}
                        style={{
                          padding: '10px 18px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderBottom: activeUserSubTab === 'wallet' ? '3px solid #556ee6' : '3px solid transparent',
                          color: activeUserSubTab === 'wallet' ? '#556ee6' : '#74788d',
                          fontWeight: activeUserSubTab === 'wallet' ? 'bold' : '500',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        💳 Wallet History ({(userDetailsData.walletHistory || []).length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveUserSubTab('bids')}
                        style={{
                          padding: '10px 18px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderBottom: activeUserSubTab === 'bids' ? '3px solid #556ee6' : '3px solid transparent',
                          color: activeUserSubTab === 'bids' ? '#556ee6' : '#74788d',
                          fontWeight: activeUserSubTab === 'bids' ? 'bold' : '500',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        🎲 Bid History ({(userDetailsData.bids || []).length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveUserSubTab('winnings')}
                        style={{
                          padding: '10px 18px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderBottom: activeUserSubTab === 'winnings' ? '3px solid #556ee6' : '3px solid transparent',
                          color: activeUserSubTab === 'winnings' ? '#556ee6' : '#74788d',
                          fontWeight: activeUserSubTab === 'winnings' ? 'bold' : '500',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        🏆 Winning Report ({(userDetailsData.winnings || []).length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveUserSubTab('referrals')}
                        style={{
                          padding: '10px 18px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderBottom: activeUserSubTab === 'referrals' ? '3px solid #556ee6' : '3px solid transparent',
                          color: activeUserSubTab === 'referrals' ? '#556ee6' : '#74788d',
                          fontWeight: activeUserSubTab === 'referrals' ? 'bold' : '500',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        👥 Referrals List ({(userDetailsData.referrals || []).length})
                      </button>
                    </div>

                    {/* TAB: DEPOSIT REQUESTS */}
                    {activeUserSubTab === 'deposits' && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px' }}>#</th>
                              <th style={{ padding: '10px 12px' }}>Request ID</th>
                              <th style={{ padding: '10px 12px' }}>Amount</th>
                              <th style={{ padding: '10px 12px' }}>Points</th>
                              <th style={{ padding: '10px 12px' }}>UTR / Reference</th>
                              <th style={{ padding: '10px 12px' }}>Receipt Screenshot</th>
                              <th style={{ padding: '10px 12px' }}>Date</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userDetailsData.depositRequests || []).map((dep, idx) => (
                              <tr key={dep.id || idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                                <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>#{dep.id}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#28a745' }}>
                                  ₹ {dep.amount}
                                </td>
                                <td style={{ padding: '10px 12px' }}>{dep.points || dep.amount}</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#495057', fontSize: '0.82rem' }}>
                                  {dep.trans_details || '—'}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  {dep.receipe_image ? (
                                    <a
                                      href={
                                        dep.receipe_image.startsWith('http')
                                          ? dep.receipe_image
                                          : (dep.receipe_image.startsWith('/') 
                                              ? dep.receipe_image 
                                              : (dep.receipe_image.startsWith('uploads/') ? `/${dep.receipe_image}` : `/uploads/${dep.receipe_image}`))
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#556ee6', textDecoration: 'underline', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      🖼️ View Receipt
                                    </a>
                                  ) : (
                                    <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>No Receipt</span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px' }}>{dep.date || dep.created_at || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {(dep.status === '1' || dep.status === 1) && (
                                    <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      Approved
                                    </span>
                                  )}
                                  {(dep.status === '0' || dep.status === 0) && (
                                    <span style={{ backgroundColor: '#e1effe', color: '#1e429f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      Pending
                                    </span>
                                  )}
                                  {(dep.status === '-1' || dep.status === -1) && (
                                    <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      Rejected
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {(dep.status === '0' || dep.status === 0) ? (
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleFundRequestAction(dep.id, 'approve')}
                                        style={{
                                          backgroundColor: '#28a745',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          fontWeight: 'bold',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        ✓ Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleFundRequestAction(dep.id, 'reject')}
                                        style={{
                                          backgroundColor: '#dc3545',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          fontWeight: 'bold',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        ✕ Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.78rem', color: '#74788d' }}>Resolved</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {(userDetailsData.depositRequests || []).length === 0 && (
                              <tr>
                                <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                                  No deposit requests found for this user
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB: WITHDRAW REQUESTS */}
                    {activeUserSubTab === 'withdrawals' && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px' }}>#</th>
                              <th style={{ padding: '10px 12px' }}>Request ID</th>
                              <th style={{ padding: '10px 12px' }}>Amount</th>
                              <th style={{ padding: '10px 12px' }}>Payout / Bank Info</th>
                              <th style={{ padding: '10px 12px' }}>Date & Time</th>
                              <th style={{ padding: '10px 12px' }}>Remark</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userDetailsData.withdrawRequests || []).map((w, idx) => (
                              <tr key={w.id || idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                                <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>#{w.id}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#f46a6a' }}>
                                  ₹ {w.points || w.amount}
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>
                                  {userDetailsData.user.account_number || userDetailsData.user.bank_name || userDetailsData.user.paytm || userDetailsData.user.phonepay || userDetailsData.user.googlepay ? (
                                    <div style={{ lineHeight: '1.4' }}>
                                      {userDetailsData.user.bank_name && <div><span style={{ color: '#74788d' }}>Bank:</span> <strong>{userDetailsData.user.bank_name}</strong></div>}
                                      {userDetailsData.user.account_number && <div><span style={{ color: '#74788d' }}>A/C:</span> <strong style={{ fontFamily: 'monospace', color: '#556ee6' }}>{userDetailsData.user.account_number}</strong></div>}
                                      {userDetailsData.user.ifsc_code && <div><span style={{ color: '#74788d' }}>IFSC:</span> <strong>{userDetailsData.user.ifsc_code}</strong></div>}
                                      {userDetailsData.user.account_holder_name && <div><span style={{ color: '#74788d' }}>Name:</span> {userDetailsData.user.account_holder_name}</div>}
                                      {userDetailsData.user.paytm && <div><span style={{ color: '#74788d' }}>Paytm:</span> {userDetailsData.user.paytm}</div>}
                                      {userDetailsData.user.phonepay && <div><span style={{ color: '#74788d' }}>PhonePe:</span> {userDetailsData.user.phonepay}</div>}
                                      {userDetailsData.user.googlepay && <div><span style={{ color: '#74788d' }}>GPay:</span> {userDetailsData.user.googlepay}</div>}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>No bank details</span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  {w.date} {w.time ? `(${w.time})` : ''}
                                </td>
                                <td style={{ padding: '10px 12px', color: '#74788d', fontSize: '0.8rem' }}>
                                  {w.remark || '—'}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {(w.status === '1' || w.status === 1) && (
                                    <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      Approved
                                    </span>
                                  )}
                                  {(w.status === '0' || w.status === 0) && (
                                    <span style={{ backgroundColor: '#e1effe', color: '#1e429f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      Pending
                                    </span>
                                  )}
                                  {(w.status === '-1' || w.status === -1) && (
                                    <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      Rejected
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {(w.status === '0' || w.status === 0) ? (
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleWithRequestAction(w.id, 'approve')}
                                        style={{
                                          backgroundColor: '#28a745',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          fontWeight: 'bold',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        ✓ Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleWithRequestAction(w.id, 'reject')}
                                        style={{
                                          backgroundColor: '#dc3545',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          fontWeight: 'bold',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        ✕ Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.78rem', color: '#74788d' }}>Resolved</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {(userDetailsData.withdrawRequests || []).length === 0 && (
                              <tr>
                                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                                  No withdraw requests found for this user
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB: WALLET HISTORY */}
                    {activeUserSubTab === 'wallet' && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px' }}>#</th>
                              <th style={{ padding: '10px 12px' }}>Date & Time</th>
                              <th style={{ padding: '10px 12px' }}>Amount</th>
                              <th style={{ padding: '10px 12px' }}>Updated Balance</th>
                              <th style={{ padding: '10px 12px' }}>Remark</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userDetailsData.walletHistory || []).map((w, idx) => {
                              const isPlus = (w.amount || '').toString().startsWith('+') || parseFloat(w.amount || '0') > 0;
                              return (
                                <tr key={w.id || idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                                  <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{w.date} {w.time || ''}</td>
                                  <td style={{ padding: '10px 12px', fontWeight: 'bold', color: isPlus ? '#2bc155' : '#ef4444' }}>
                                    {w.amount}
                                  </td>
                                  <td style={{ padding: '10px 12px', fontWeight: '600' }}>₹{w.updated_amount || w.amount}</td>
                                  <td style={{ padding: '10px 12px' }}>{w.remark || '-'}</td>
                                </tr>
                              );
                            })}
                            {(!userDetailsData.walletHistory || userDetailsData.walletHistory.length === 0) && (
                              <tr>
                                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                                  No wallet transaction records found for this user.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB 2: BID HISTORY */}
                    {activeUserSubTab === 'bids' && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px' }}>#</th>
                              <th style={{ padding: '10px 12px' }}>Game Name</th>
                              <th style={{ padding: '10px 12px' }}>Game Type</th>
                              <th style={{ padding: '10px 12px' }}>Session</th>
                              <th style={{ padding: '10px 12px' }}>Open Pana / Digit</th>
                              <th style={{ padding: '10px 12px' }}>Close Pana / Digit</th>
                              <th style={{ padding: '10px 12px' }}>Points (₹)</th>
                              <th style={{ padding: '10px 12px' }}>Date & Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userDetailsData.bids || []).map((b, idx) => (
                              <tr key={b.id || idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                                <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#556ee6' }}>{b.game_name}</td>
                                <td style={{ padding: '10px 12px' }}>{b.game_type}</td>
                                <td style={{ padding: '10px 12px' }}>
                                  {(b.game_type === 'Jodi Digit' || b.game_type === 'Jodi')
                                    ? 'Jodi'
                                    : (b.game_type === 'Half Sangam' || b.game_type === 'Full Sangam')
                                      ? 'Sangam'
                                      : (b.session || '-')}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  {b.game_type === 'Jodi Digit' || b.game_type === 'Jodi'
                                    ? (b.open_digit && b.open_digit !== 'NA' && b.open_digit !== 'N/A' ? b.open_digit : '-')
                                    : `${b.open_pana && b.open_pana !== 'NA' && b.open_pana !== 'N/A' ? `${b.open_pana}${b.open_digit && b.open_digit !== 'NA' && b.open_digit !== 'N/A' ? ' - ' : ''}` : ''}${b.open_digit && b.open_digit !== 'NA' && b.open_digit !== 'N/A' ? b.open_digit : (!b.open_pana || b.open_pana === 'NA' ? '-' : '')}`}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  {b.game_type === 'Jodi Digit' || b.game_type === 'Jodi'
                                    ? (b.close_digit && b.close_digit !== 'NA' && b.close_digit !== 'N/A' ? b.close_digit : '-')
                                    : `${b.close_pana && b.close_pana !== 'NA' && b.close_pana !== 'N/A' ? `${b.close_pana}${b.close_digit && b.close_digit !== 'NA' && b.close_digit !== 'N/A' ? ' - ' : ''}` : ''}${b.close_digit && b.close_digit !== 'NA' && b.close_digit !== 'N/A' ? b.close_digit : (!b.close_pana || b.close_pana === 'NA' ? '-' : '')}`}
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#f1673e' }}>₹{b.points_action}</td>
                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatDisplayDateTime(b.date, b.time)}</td>
                              </tr>
                            ))}
                            {(!userDetailsData.bids || userDetailsData.bids.length === 0) && (
                              <tr>
                                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                                  No bid records found for this user.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB 3: WINNING REPORT */}
                    {activeUserSubTab === 'winnings' && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px' }}>#</th>
                              <th style={{ padding: '10px 12px' }}>Game Name</th>
                              <th style={{ padding: '10px 12px' }}>Game Type</th>
                              <th style={{ padding: '10px 12px' }}>Session</th>
                              <th style={{ padding: '10px 12px' }}>Winning Points (₹)</th>
                              <th style={{ padding: '10px 12px' }}>Date & Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userDetailsData.winnings || []).map((w, idx) => (
                              <tr key={w.id || idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                                <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#556ee6' }}>{w.game_name}</td>
                                <td style={{ padding: '10px 12px' }}>{w.game_type || '-'}</td>
                                <td style={{ padding: '10px 12px' }}>{w.session || '-'}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#2bc155' }}>₹{w.winning_points}</td>
                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{w.date} {w.time || ''}</td>
                              </tr>
                            ))}
                            {(!userDetailsData.winnings || userDetailsData.winnings.length === 0) && (
                              <tr>
                                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                                  No winning records found for this user.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB 4: REFERRALS LIST */}
                    {activeUserSubTab === 'referrals' && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px' }}>#</th>
                              <th style={{ padding: '10px 12px' }}>Referred User Name</th>
                              <th style={{ padding: '10px 12px' }}>Mobile Phone</th>
                              <th style={{ padding: '10px 12px' }}>Email</th>
                              <th style={{ padding: '10px 12px' }}>Registration Date</th>
                              <th style={{ padding: '10px 12px' }}>Wallet Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userDetailsData.referrals || []).map((ref, idx) => (
                              <tr key={ref.id || idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                                <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#f1673e' }}>{ref.name}</td>
                                <td style={{ padding: '10px 12px' }}>{ref.phone}</td>
                                <td style={{ padding: '10px 12px' }}>{ref.email || '-'}</td>
                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{ref.date || '-'}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>₹{ref.wallet || 0}</td>
                              </tr>
                            ))}
                            {(!userDetailsData.referrals || userDetailsData.referrals.length === 0) && (
                              <tr>
                                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                                  No referral registrations found for this user.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                  Failed to load user profile. User not found.
                </div>
              )}
            </div>
          )}

          {/* User Modal with Contrast Fix */}
          {selectedUserModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}>
              <div style={{ backgroundColor: '#ffffff', color: '#495057', width: '460px', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, color: '#343a40', fontWeight: 'bold', fontSize: '1.05rem' }}>User Profile & Wallet Points</h5>
                  <span style={{ cursor: 'pointer', fontSize: '1.3rem', color: '#74788d', lineHeight: 1 }} onClick={() => setSelectedUserModal(null)}>✕</span>
                </div>

                <div style={{ marginBottom: '16px', fontSize: '0.88rem', color: '#495057', backgroundColor: '#f8f9fa', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                  <p style={{ margin: '6px 0', color: '#495057' }}><strong style={{ color: '#343a40', minWidth: '120px', display: 'inline-block' }}>Name:</strong> {selectedUserModal.name}</p>
                  <p style={{ margin: '6px 0', color: '#495057' }}><strong style={{ color: '#343a40', minWidth: '120px', display: 'inline-block' }}>Phone:</strong> {selectedUserModal.phone}</p>
                  <p style={{ margin: '6px 0', color: '#495057' }}><strong style={{ color: '#343a40', minWidth: '120px', display: 'inline-block' }}>Email:</strong> {selectedUserModal.email || 'N/A'}</p>
                  <p style={{ margin: '6px 0', color: '#495057' }}><strong style={{ color: '#343a40', minWidth: '120px', display: 'inline-block' }}>Current Wallet:</strong> <span style={{ color: '#2BC155', fontWeight: 'bold', fontSize: '1.05rem' }}>₹{selectedUserModal.wallet || 0}</span></p>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedUserModal.id || selectedUserModal.phone || selectedUserModal.name;
                      setSelectedUserModal(null);
                      handleOpenUserDetails(target);
                    }}
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      backgroundColor: '#556ee6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '7px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    View Full User Details Page →
                  </button>
                </div>

                <h6 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#343a40', fontWeight: 'bold' }}>Adjust Wallet Balance</h6>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <select
                    value={walletAdjustType}
                    onChange={(e) => setWalletAdjustType(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', backgroundColor: '#ffffff', outline: 'none' }}
                  >
                    <option value="add">Add (+)</option>
                    <option value="deduct">Deduct (-)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Enter points"
                    value={walletAdjustPoints}
                    onChange={(e) => setWalletAdjustPoints(e.target.value)}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', backgroundColor: '#ffffff', outline: 'none' }}
                  />
                </div>

                <button
                  onClick={handleWalletAdjust}
                  style={{
                    width: '100%',
                    backgroundColor: '#556ee6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '11px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(85, 110, 230, 0.3)'
                  }}
                >
                  Update Wallet
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: REFERRAL REPORT (Matching Image 4) */}
          {activeTab === 'referrals' && (
            <div>
              {/* Header Title & Breadcrumb */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Referral Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  User Management / <span style={{ color: '#556ee6' }}>Referral Report</span>
                </div>
              </div>

              {/* Card Container */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#74788d', fontWeight: '600' }}>Referrals List ({referralTotal})</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search referrer, user, phone..."
                      value={referralSearch}
                      onChange={(e) => setReferralSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setReferralPage(1);
                          fetchReferrals(1, referralPerPage, e.target.value);
                        }
                      }}
                      style={{ width: '260px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReferralPage(1);
                        fetchReferrals(1, referralPerPage, referralSearch);
                      }}
                      style={{
                        backgroundColor: '#556ee6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Search
                    </button>
                    {referralSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setReferralSearch('');
                          setReferralPage(1);
                          fetchReferrals(1, referralPerPage, '');
                        }}
                        style={{
                          backgroundColor: '#eff2f7',
                          color: '#495057',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>#</th>
                        <th style={{ padding: '12px' }}>Referred User (Name)</th>
                        <th style={{ padding: '12px' }}>Referred User (Phone)</th>
                        <th style={{ padding: '12px' }}>Referred By (Phone)</th>
                        <th style={{ padding: '12px' }}>Referrer Name</th>
                        <th style={{ padding: '12px' }}>Signup Date</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralsLoading ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>
                            Loading referrals...
                          </td>
                        </tr>
                      ) : referrals.length > 0 ? (
                        referrals.map((row, idx) => (
                          <tr key={row.id || idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                            <td style={{ padding: '12px' }}>{(referralPage - 1) * referralPerPage + idx + 1}</td>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{row.name}</td>
                            <td style={{ padding: '12px' }}>{row.phone}</td>
                            <td style={{ padding: '12px' }}>{row.referred_by_phone}</td>
                            <td style={{ padding: '12px', color: '#556ee6', fontWeight: '500' }}>{row.referrer_name || '—'}</td>
                            <td style={{ padding: '12px' }}>{row.date}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  const found = users.find(u => u.phone === row.phone);
                                  if (found) setSelectedUserModal(found);
                                }}
                                style={{
                                  backgroundColor: '#f1673e',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 12px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                            No referral data found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  currentPage={referralPage}
                  pageSize={referralPerPage}
                  totalItems={referralTotal}
                  onPageChange={(p) => {
                    setReferralPage(p);
                    fetchReferrals(p, referralPerPage, referralSearch);
                  }}
                  onPageSizeChange={(sz) => {
                    setReferralPerPage(sz);
                    setReferralPage(1);
                    fetchReferrals(1, sz, referralSearch);
                  }}
                  itemName="referrals"
                />
              </div>
            </div>
          )}

          {/* VIEW 4A: USER COMMISSION (PENDING APPROVAL - Matching Image 5) */}
          {activeTab === 'user_commission' && (
            <div>
              {/* Header Title & Breadcrumb */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  USER COMMISSION (PENDING APPROVAL)
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  User Commission / <span style={{ color: '#556ee6' }}>Pending List</span>
                </div>
              </div>

              {/* Card Container */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7' }}>
                <p style={{ color: '#74788d', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                  Referral commission list (date-wise). Approve single or select multiple and approve.
                </p>

                {/* Filters Row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>From Date</label>
                    <input
                      type="date"
                      value={commissionFromDate}
                      onChange={(e) => setCommissionFromDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>To Date</label>
                    <input
                      type="date"
                      value={commissionToDate}
                      onChange={(e) => setCommissionToDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setCommissionPage(1);
                      fetchCommissions(commissionFromDate, commissionToDate, 1, commissionPerPage);
                    }}
                    style={{
                      backgroundColor: '#f1673e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '9px 18px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Filter
                  </button>

                  {selectedCommissionIds.length > 0 && (
                    <button
                      onClick={() => handleCommissionApprove(selectedCommissionIds)}
                      style={{
                        backgroundColor: '#34c38f',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '9px 18px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Approve Selected ({selectedCommissionIds.length})
                    </button>
                  )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '12px', width: '30px' }}>
                          <input
                            type="checkbox"
                            checked={commissionList.length > 0 && selectedCommissionIds.length === commissionList.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCommissionIds(commissionList.map(c => c.id));
                              } else {
                                setSelectedCommissionIds([]);
                              }
                            }}
                          />
                        </th>
                        <th style={{ padding: '12px' }}>#</th>
                        <th style={{ padding: '12px' }}>Referrer (Name)</th>
                        <th style={{ padding: '12px' }}>Referrer (Phone)</th>
                        <th style={{ padding: '12px' }}>Referred User</th>
                        <th style={{ padding: '12px' }}>Amount (₹)</th>
                        <th style={{ padding: '12px' }}>Game / Date</th>
                        <th style={{ padding: '12px' }}>Created</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionsLoading ? (
                        <tr>
                          <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>
                            Loading commissions...
                          </td>
                        </tr>
                      ) : commissionList.length > 0 ? (
                        commissionList.map((comm, idx) => (
                          <tr key={comm.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                            <td style={{ padding: '12px' }}>
                              <input
                                type="checkbox"
                                checked={selectedCommissionIds.includes(comm.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCommissionIds(prev => [...prev, comm.id]);
                                  } else {
                                    setSelectedCommissionIds(prev => prev.filter(id => id !== comm.id));
                                  }
                                }}
                              />
                            </td>
                            <td style={{ padding: '12px' }}>{(commissionPage - 1) * commissionPerPage + idx + 1}</td>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{comm.referrer_name || '-'}</td>
                            <td style={{ padding: '12px' }}>{comm.referrer_phone}</td>
                            <td style={{ padding: '12px' }}>{comm.referred_user_phone}</td>
                            <td style={{ padding: '12px', fontWeight: '600', color: '#28a745' }}>₹{comm.amount}</td>
                            <td style={{ padding: '12px' }}>{comm.game_name} ({comm.bid_date})</td>
                            <td style={{ padding: '12px' }}>{comm.created_at}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleCommissionApprove([comm.id])}
                                style={{
                                  backgroundColor: '#51bb25',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Approve
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                            No pending commission in this date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  currentPage={commissionPage}
                  pageSize={commissionPerPage}
                  totalItems={commissionTotal}
                  onPageChange={(p) => {
                    setCommissionPage(p);
                    fetchCommissions(commissionFromDate, commissionToDate, p, commissionPerPage);
                  }}
                  onPageSizeChange={(sz) => {
                    setCommissionPerPage(sz);
                    setCommissionPage(1);
                    fetchCommissions(commissionFromDate, commissionToDate, 1, sz);
                  }}
                  itemName="commissions"
                />
              </div>

            </div>
          )}

          {/* VIEW 4B: USER COMMISSION PAY LIST (Matching User Screenshot) */}
          {activeTab === 'user_commission_pay_list' && (
            <div>
              {/* Header Title & Breadcrumb */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  USER COMMISSION PAY LIST
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  User Commission / <span style={{ color: '#556ee6' }}>Pay List</span>
                </div>
              </div>

              {/* Card Container */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7' }}>
                <p style={{ color: '#74788d', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                  Report of commission already paid to referrers (date-wise).
                </p>

                {/* Filters Row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>From Date</label>
                    <input
                      type="date"
                      value={payListFromDate}
                      onChange={(e) => setPayListFromDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>To Date</label>
                    <input
                      type="date"
                      value={payListToDate}
                      onChange={(e) => setPayListToDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setPayListPage(1);
                      fetchCommissionPayList(payListFromDate, payListToDate, 1, payListPerPage);
                    }}
                    style={{
                      backgroundColor: '#f1673e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '9px 18px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Filter
                  </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#2a3042', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>#</th>
                        <th style={{ padding: '12px' }}>Referrer (Name)</th>
                        <th style={{ padding: '12px' }}>Referrer (Phone)</th>
                        <th style={{ padding: '12px' }}>Referred User (Phone)</th>
                        <th style={{ padding: '12px' }}>Amount (₹)</th>
                        <th style={{ padding: '12px' }}>Game / Bid Date</th>
                        <th style={{ padding: '12px' }}>Approved (Created)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payListLoading ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>
                            Loading paid commissions...
                          </td>
                        </tr>
                      ) : commissionPayList.length > 0 ? (
                        commissionPayList.map((comm, idx) => (
                          <tr key={comm.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                            <td style={{ padding: '12px' }}>{(payListPage - 1) * payListPerPage + idx + 1}</td>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{comm.referrer_name || '-'}</td>
                            <td style={{ padding: '12px' }}>{comm.referrer_phone}</td>
                            <td style={{ padding: '12px' }}>{comm.referred_user_phone}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#2BC155' }}>₹{comm.amount}</td>
                            <td style={{ padding: '12px' }}>{comm.game_name} ({comm.bid_date})</td>
                            <td style={{ padding: '12px' }}>{comm.created_at}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                            No paid commission in this date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  currentPage={payListPage}
                  pageSize={payListPerPage}
                  totalItems={payListTotal}
                  onPageChange={(p) => {
                    setPayListPage(p);
                    fetchCommissionPayList(payListFromDate, payListToDate, p, payListPerPage);
                  }}
                  onPageSizeChange={(sz) => {
                    setPayListPerPage(sz);
                    setPayListPage(1);
                    fetchCommissionPayList(payListFromDate, payListToDate, 1, sz);
                  }}
                  itemName="paid commissions"
                />
              </div>

            </div>
          )}

          {/* VIEW: GAMES MANAGEMENT - GAME NAME (PHP game-name.php parity) */}
          {activeTab === 'game_names' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Game Name List
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Games Management / <span style={{ color: '#556ee6' }}>Game Name</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h5 style={{ margin: 0, fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>Game Name List</h5>
                    <span style={{ fontSize: '0.82rem', color: '#74788d', backgroundColor: '#f8f9fa', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                      Total: {adminGamesList.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search game..."
                      value={adminGamesSearch}
                      onChange={(e) => setAdminGamesSearch(e.target.value)}
                      style={{ padding: '7px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem', width: '200px' }}
                    />
                    <button
                      onClick={() => setShowAddGameModal(true)}
                      style={{
                        backgroundColor: '#556ee6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      + Add Game
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Today Open</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Today Close</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Active</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Market Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminGamesList
                        .filter(g => !adminGamesSearch || g.game.toLowerCase().includes(adminGamesSearch.toLowerCase()))
                        .map((g, idx) => (
                          <tr key={g.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                            <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#343a40' }}>{g.game}</td>
                            <td style={{ padding: '10px 12px' }}>{g.open_time}</td>
                            <td style={{ padding: '10px 12px' }}>{g.close_time}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {(g.status === '1' || g.status === 1) ? (
                                <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>YES</span>
                              ) : (
                                <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>NO</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {g.market_status === 'Market Running' ? (
                                <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Market Running</span>
                              ) : (
                                <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Market Closed</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleOpenEditWeek(g.game)}
                                  style={{ backgroundColor: '#556ee6', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  EDIT
                                </button>
                                <button
                                  onClick={() => handleDeleteGame(g.game)}
                                  style={{ backgroundColor: '#f46a6a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  DELETE
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {adminGamesList.length === 0 && !adminGamesLoading && (
                        <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Games Added!</td></tr>
                      )}
                      {adminGamesLoading && (
                        <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Games...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: GAMES MANAGEMENT - GAME RATES (PHP game-rates.php parity) */}
          {activeTab === 'rates' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Game Rates Management
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Games Management / <span style={{ color: '#556ee6' }}>Game Rates</span>
                </div>
              </div>

              <div style={{ maxWidth: '850px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '28px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 18px 0', fontSize: '1.1rem', color: '#495057', fontWeight: '600' }}>
                  Add Games Rate
                </h5>

                {gameRatesMsg && (
                  <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                    ✓ {gameRatesMsg}
                  </div>
                )}
                {gameRatesError && (
                  <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                    ⚠️ {gameRatesError}
                  </div>
                )}

                <form onSubmit={handleUpdateGameRates}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    {[
                      { key: 'Single Digit', label: 'Single Digit' },
                      { key: 'Jodi Digit', label: 'Jodi Digit' },
                      { key: 'Single Pana', label: 'Single Pana' },
                      { key: 'Double Pana', label: 'Double Pana' },
                      { key: 'Triple Pana', label: 'Tripple Pana' },
                      { key: 'Half Sangam', label: 'Half Sangam' },
                      { key: 'Full Sangam', label: 'Full Sangam' }
                    ].map(({ key, label }) => {
                      const currentVal = gameRatesForm[key] || { min_value: '', max_value: '' };
                      return (
                        <React.Fragment key={key}>
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                              {label} Value 1
                            </label>
                            <input
                              type="number"
                              value={currentVal.min_value || ''}
                              onChange={(e) => setGameRatesForm({
                                ...gameRatesForm,
                                [key]: { ...currentVal, min_value: e.target.value }
                              })}
                              required
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                              {label} Value 2
                            </label>
                            <input
                              type="number"
                              value={currentVal.max_value || ''}
                              onChange={(e) => setGameRatesForm({
                                ...gameRatesForm,
                                [key]: { ...currentVal, max_value: e.target.value }
                              })}
                              required
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={gameRatesLoading}
                    style={{
                      backgroundColor: '#556ee6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '11px 28px',
                      fontSize: '0.92rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(85, 110, 230, 0.3)'
                    }}
                  >
                    {gameRatesLoading ? 'Saving...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: GAME & NUMBERS - SINGLE DIGIT (PHP single-digit.php parity) */}
          {activeTab === 'num_single' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Single Digit Numbers
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game & Numbers / <span style={{ color: '#556ee6' }}>Single Digit</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  Single Digit Numbers
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {SINGLE_DIGITS.map(d => (
                    <button key={d} style={digitBoxStyle}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: GAME & NUMBERS - JODI DIGIT (PHP jodi-digit.php parity) */}
          {activeTab === 'num_jodi' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Jodi Digit Numbers
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game & Numbers / <span style={{ color: '#556ee6' }}>Jodi Digit</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  Jodi Digit Numbers (Total 100)
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {JODI_DIGITS.map(j => (
                    <button key={j} style={digitBoxStyle}>{j}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: GAME & NUMBERS - SINGLE PANA (PHP single-pana.php parity) */}
          {activeTab === 'num_single_pana' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Single Pana Numbers
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game & Numbers / <span style={{ color: '#556ee6' }}>Single Pana</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  Single Pana Numbers
                </h5>

                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(ank => (
                  <div key={ank} style={{ marginBottom: '22px', paddingBottom: '16px', borderBottom: ank !== '9' ? '1px dashed #eff2f7' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h6 style={{ margin: 0, fontSize: '0.92rem', color: '#495057', fontWeight: '700' }}>Single Ank</h6>
                      <button style={ankBoxStyle}>{ank}</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(SINGLE_PANAS_BY_ANK[ank] || []).map(p => (
                        <button key={p} style={panaBoxStyle}>{p}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: GAME & NUMBERS - DOUBLE PANA (PHP double-pana.php parity) */}
          {activeTab === 'num_double_pana' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Double Pana Numbers
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game & Numbers / <span style={{ color: '#556ee6' }}>Double Pana</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  Double Pana Numbers
                </h5>

                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(ank => (
                  <div key={ank} style={{ marginBottom: '22px', paddingBottom: '16px', borderBottom: ank !== '9' ? '1px dashed #eff2f7' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h6 style={{ margin: 0, fontSize: '0.92rem', color: '#495057', fontWeight: '700' }}>Single Ank</h6>
                      <button style={ankBoxStyle}>{ank}</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(DOUBLE_PANAS_BY_ANK[ank] || []).map(p => (
                        <button key={p} style={panaBoxStyle}>{p}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: GAME & NUMBERS - TRIPPLE PANA (PHP tripple-pana.php parity) */}
          {activeTab === 'num_triple_pana' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Tripple Pana Numbers
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game & Numbers / <span style={{ color: '#556ee6' }}>Tripple Pana</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  Tripple Pana Numbers
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {TRIPLE_PANAS.map(p => (
                    <button key={p} style={panaBoxStyle}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: GAME & NUMBERS - HALF SANGAM (PHP half-sangam.php parity) */}
          {activeTab === 'num_half_sangam' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Half Sangam Numbers
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game & Numbers / <span style={{ color: '#556ee6' }}>Half Sangam</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ marginBottom: '28px' }}>
                  <h5 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '700' }}>
                    Open Ank
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {SINGLE_DIGITS.map(d => (
                      <button key={d} style={digitBoxStyle}>{d}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '700' }}>
                    Close Ank (Total 220 Panas)
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {ALL_PANAS_220.map(p => (
                      <button key={'hs_' + p} style={panaBoxStyle}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: GAME & NUMBERS - FULL SANGAM (PHP full-sangam.php parity) */}
          {activeTab === 'num_full_sangam' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Full Sangam Numbers
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game & Numbers / <span style={{ color: '#556ee6' }}>Full Sangam</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ marginBottom: '28px' }}>
                  <h5 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '700' }}>
                    Open Ank (Total 220 Panas)
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {ALL_PANAS_220.map(p => (
                      <button key={'fs_open_' + p} style={panaBoxStyle}>{p}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '700' }}>
                    Close Ank (Total 220 Panas)
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {ALL_PANAS_220.map(p => (
                      <button key={'fs_close_' + p} style={panaBoxStyle}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AUTO ACTIVE SETTINGS */}
          {activeTab === 'auto_active' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#ffffff', padding: '18px 24px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eff2f7' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: '800' }}>
                    Auto Active Mode Configuration
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Control app behavior for new registered users (Direct Gaming vs Quiz App Mode).
                  </p>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Dashboard / <span style={{ color: '#556ee6', fontWeight: '700' }}>Auto Active</span>
                </div>
              </div>

              {settingsMsg && (
                <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '12px 18px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '20px', fontWeight: '600' }}>
                  ✓ {settingsMsg}
                </div>
              )}
              {settingsError && (
                <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4', padding: '12px 18px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '20px', fontWeight: '600' }}>
                  ⚠️ {settingsError}
                </div>
              )}

              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '28px', border: '1px solid #eff2f7', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', maxWidth: '720px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={24} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: '700' }}>
                      Auto Active Mode Status
                    </h5>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Select option via radio buttons</span>
                  </div>
                </div>

                <form onSubmit={handleSaveAutoActiveSetting}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>

                    {/* Radio Option 1: ON (Direct Play Game) */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '18px 20px',
                      borderRadius: '12px',
                      border: String(settingsData.auto_active_status ?? '1') === '1' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: String(settingsData.auto_active_status ?? '1') === '1' ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="auto_active_status"
                        value="1"
                        checked={String(settingsData.auto_active_status ?? '1') === '1'}
                        onChange={(e) => setSettingsData({ ...settingsData, auto_active_status: e.target.value })}
                        style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: '800', color: '#1e3a8a' }}>ON - Direct Play Game</span>
                          <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>
                            LIVE GAMING MODE
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.45' }}>
                          New registered users immediately access the gaming dashboard, markets, live bidding, and wallet system upon registration.
                        </p>
                      </div>
                    </label>

                    {/* Radio Option 2: OFF (Quiz App Mode) */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '18px 20px',
                      borderRadius: '12px',
                      border: String(settingsData.auto_active_status ?? '1') === '0' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                      backgroundColor: String(settingsData.auto_active_status ?? '1') === '0' ? '#fff7ed' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="auto_active_status"
                        value="0"
                        checked={String(settingsData.auto_active_status ?? '1') === '0'}
                        onChange={(e) => setSettingsData({ ...settingsData, auto_active_status: e.target.value })}
                        style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#ea580c', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: '800', color: '#7c2d12' }}>OFF - Quiz App Mode</span>
                          <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>
                            QUIZ & Q&A DISPLAY
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.45' }}>
                          Frontend app displays an interactive Question & Answer Quiz App for users instead of the gaming dashboard.
                        </p>
                      </div>
                    </label>

                  </div>

                  <button
                    type="submit"
                    disabled={settingsLoading}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 28px',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {settingsLoading ? 'Saving Settings...' : 'Save Auto Active Settings'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: LIVE SUPPORT SOCKET CHAT MODULE */}
          {activeTab === 'support_chat' && (
            <AdminSupportChat isMobile={isMobile} />
          )}

          {/* VIEW: PAYMENT GATEWAYS & DEPOSIT MODE MANAGEMENT */}
          {activeTab === 'payment_gateway' && (
            <PaymentGatewayManager isMobile={isMobile} />
          )}

          {/* VIEW: SETTINGS - MAIN SETTINGS (PHP main-settings.php parity) */}
          {activeTab === 'settings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Main Settings
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Settings / <span style={{ color: '#556ee6' }}>Main Settings</span>
                </div>
              </div>

              {settingsMsg && (
                <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                  ✓ {settingsMsg}
                </div>
              )}
              {settingsError && (
                <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                  ⚠️ {settingsError}
                </div>
              )}

              {/* Top Row: Bank Details & UPI/QR */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* 1. Add Bank Details */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                    Add Bank Details
                  </h5>
                  <form onSubmit={handleSaveBankDetails}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="Enter Account Holder Name"
                        value={settingsData.ac_name || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, ac_name: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Account Number</label>
                      <input
                        type="text"
                        placeholder="Enter Account Number"
                        value={settingsData.ac_number || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, ac_number: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>IFSC Code</label>
                      <input
                        type="text"
                        placeholder="Enter IFSC Code"
                        value={settingsData.ifsc_code || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, ifsc_code: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={settingsLoading}
                      style={{ backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '9px 24px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {settingsLoading ? 'Saving...' : 'Submit'}
                    </button>
                  </form>
                </div>

                {/* 2. M-PIN Lock Screen Setting */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                    M-PIN Lock Screen Setting
                  </h5>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#74788d' }}>
                    User app opening par 4-digit M-PIN lock screen enable/disable karein.
                  </p>
                  <form onSubmit={handleSaveMpinSetting}>
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '8px' }}>M-PIN Status</label>
                      <select
                        value={String(settingsData.mpin_status ?? '1')}
                        onChange={(e) => setSettingsData({ ...settingsData, mpin_status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '4px',
                          border: '1px solid #ced4da',
                          fontSize: '0.88rem',
                          fontWeight: '600',
                          color: settingsData.mpin_status === '0' ? '#e53e3e' : '#28a745',
                          backgroundColor: '#f8f9fa'
                        }}
                      >
                        <option value="1">🟢 Active (Enable M-PIN Lock Screen)</option>
                        <option value="0">🔴 Inactive (Disable M-PIN Lock Screen)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={settingsLoading}
                      style={{ backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '9px 24px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {settingsLoading ? 'Saving...' : 'Update M-PIN Setting'}
                    </button>
                  </form>
                </div>

                {/* 3. Slider Images Display Setting */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                    Slider Images Display Setting
                  </h5>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#74788d' }}>
                    Home page par Multiple Slider Images dikhane ya chhipane ki setting.
                  </p>
                  <form onSubmit={handleSaveSliderSetting}>
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '8px' }}>Slider Display Status</label>
                      <select
                        value={String(settingsData.slider_status ?? '1')}
                        onChange={(e) => setSettingsData({ ...settingsData, slider_status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '4px',
                          border: '1px solid #ced4da',
                          fontSize: '0.88rem',
                          fontWeight: '600',
                          color: settingsData.slider_status === '0' ? '#e53e3e' : '#28a745',
                          backgroundColor: '#f8f9fa'
                        }}
                      >
                        <option value="1">🟢 Active (Show Slider Images on Home Page)</option>
                        <option value="0">🔴 Inactive (Hide Slider Images on Home Page)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={settingsLoading}
                      style={{ backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '9px 24px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {settingsLoading ? 'Saving...' : 'Update Slider Setting'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Bottom Card: Add Value's (System Limits & Times) */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  Add Value's
                </h5>
                <form onSubmit={handleSaveValuesAndLimits}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Minimum Deposite</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.min_deposite ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, min_deposite: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Maximum Deposite</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.max_deposite ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, max_deposite: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Minimum Withdrawal</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.min_withdrawal ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, min_withdrawal: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Maximum Withdrawal</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.max_withdrawal ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, max_withdrawal: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Minimum Transfer</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.min_transfer ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, min_transfer: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Maximum Transfer</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.max_transfer ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, max_transfer: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Minimum Bid Amount</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.min_bid_amt ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, min_bid_amt: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Maximum Bid Amount</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.max_bid_amt ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, max_bid_amt: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Welcome Bonus</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.Dragon_bonus ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, Dragon_bonus: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Minimum Wallet Amount</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsData.min_wallet_amount ?? ''}
                        onChange={(e) => setSettingsData({ ...settingsData, min_wallet_amount: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Alert Marquee Message</label>
                      <input
                        type="text"
                        value={settingsData.alert_message || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, alert_message: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  {/* DEDICATED LANDING WEBSITE & APK DOWNLOAD CONTROLS CARD */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)',
                    marginBottom: '24px',
                    borderLeft: '4px solid #007bff'
                  }}>
                    <div style={{ marginBottom: '18px', borderBottom: '1px solid #eff2f7', paddingBottom: '14px' }}>
                      <h5 style={{ margin: 0, fontSize: '1.08rem', color: '#343a40', fontWeight: '700' }}>
                        🌐 App URLs & Legal Compliance (Play Store & Privacy Policy)
                      </h5>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#74788d' }}>
                        Configure the APK Download Button Link, How to Play Website Link, Google Play Privacy Policy URL, and Data Deletion Link for Kalyan Matka.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      <div>
                        <label style={{ fontSize: '0.84rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                          📲 Official APK Download Link (app_link)
                        </label>
                        <input
                          type="text"
                          placeholder="https://yourdomain.com/apk/Kalyan-Matka.apk"
                          value={settingsData.app_link || ''}
                          onChange={(e) => setSettingsData({ ...settingsData, app_link: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>Controls the 'Download App' button link.</small>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.84rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                          ▶️ How to Play Website / Video Link (how_to_play)
                        </label>
                        <input
                          type="text"
                          placeholder="https://www.youtube.com/watch?v=... or guide URL"
                          value={settingsData.how_to_play || ''}
                          onChange={(e) => setSettingsData({ ...settingsData, how_to_play: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>Controls the 'How to Play' button link.</small>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.84rem', fontWeight: '600', color: '#495057', margin: 0 }}>
                            🔒 Privacy Policy URL (privacy_policy_url)
                          </label>
                          {settingsData.privacy_policy_url && (
                            <a
                              href={settingsData.privacy_policy_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '0.78rem', color: '#556ee6', fontWeight: '600', textDecoration: 'none' }}
                            >
                              Test Link ↗
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="https://yourdomain.com/privacy-policy or /privacy-policy"
                          value={settingsData.privacy_policy_url || ''}
                          onChange={(e) => setSettingsData({ ...settingsData, privacy_policy_url: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>Required by Google Play Store. Default: /privacy-policy</small>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.84rem', fontWeight: '600', color: '#495057', margin: 0 }}>
                            🗑️ Data Deletion Link (data_deletion_url)
                          </label>
                          {settingsData.data_deletion_url && (
                            <a
                              href={settingsData.data_deletion_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '0.78rem', color: '#556ee6', fontWeight: '600', textDecoration: 'none' }}
                            >
                              Test Link ↗
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="https://yourdomain.com/data-deletion or /data-deletion"
                          value={settingsData.data_deletion_url || ''}
                          onChange={(e) => setSettingsData({ ...settingsData, data_deletion_url: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>Google Play Data Safety deletion request URL. Default: /data-deletion</small>
                      </div>
                    </div>
                  </div>

                  {/* DEDICATED REFERRAL COMMISSION SETTINGS CARD */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)',
                    marginBottom: '24px',
                    borderLeft: (settingsData.referral_status === '0' || settingsData.referral_status === 0) ? '4px solid #dc3545' : '4px solid #28a745'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #eff2f7', paddingBottom: '14px' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '1.08rem', color: '#343a40', fontWeight: '700' }}>
                          🎁 Referral Program & Commission Settings
                        </h5>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#74788d' }}>
                          Configure referral commission rates, toggle system active/inactive status, and select active referral model.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#495057' }}>Referral Status:</span>
                        <button
                          type="button"
                          onClick={() => setSettingsData(prev => ({ ...prev, referral_status: prev.referral_status === '0' || prev.referral_status === 0 ? '1' : '0' }))}
                          style={{
                            padding: '7px 18px',
                            borderRadius: '20px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            backgroundColor: (settingsData.referral_status === '0' || settingsData.referral_status === 0) ? '#dc3545' : '#28a745',
                            color: '#ffffff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {(settingsData.referral_status === '0' || settingsData.referral_status === 0) ? '🔴 INACTIVE (Disabled)' : '🟢 ACTIVE (Enabled)'}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', maxWidth: '700px' }}>
                      <div>
                        <label style={{ fontSize: '0.84rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                          Referral Commission / Bonus Value (% or ₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter value (e.g. 5 for 5% or 50 for ₹50)"
                          value={settingsData.referral_commission ?? ''}
                          onChange={(e) => setSettingsData({ ...settingsData, referral_commission: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.9rem', fontWeight: '600', color: '#343a40' }}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#74788d', marginTop: '4px', display: 'block' }}>
                          * For Deposit / Bid types, this value acts as Percentage (%). For Signup type, this value acts as Fixed Points (₹).
                        </span>
                      </div>
                    </div>

                    <h6 style={{ margin: '16px 0 12px 0', fontSize: '0.92rem', color: '#343a40', fontWeight: '700' }}>
                      Select Active Referral Model (Only One Can Be Active):
                    </h6>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {REFERRAL_TYPES_LIST.map((typeObj) => {
                        const isSelected = (settingsData.referral_type || 'signup') === typeObj.id;
                        return (
                          <div
                            key={typeObj.id}
                            onClick={() => setSettingsData({ ...settingsData, referral_type: typeObj.id })}
                            style={{
                              border: isSelected ? '2px solid #556ee6' : '1px solid #eff2f7',
                              backgroundColor: isSelected ? '#f4f6ff' : '#f8f9fa',
                              borderRadius: '8px',
                              padding: '14px 18px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 4px 10px rgba(85,110,230,0.1)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="radio"
                                  name="referral_type_radio"
                                  checked={isSelected}
                                  onChange={() => setSettingsData({ ...settingsData, referral_type: typeObj.id })}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#556ee6' }}
                                />
                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isSelected ? '#556ee6' : '#343a40' }}>
                                  {typeObj.title}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ backgroundColor: isSelected ? '#e0e7ff' : '#e9ecef', color: isSelected ? '#4338ca' : '#495057', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', fontWeight: '600' }}>
                                  {typeObj.badge}
                                </span>
                                {isSelected && (
                                  <span style={{ backgroundColor: '#28a745', color: '#ffffff', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                                    ✓ ACTIVE
                                  </span>
                                )}
                              </div>
                            </div>
                            <p style={{ margin: '4px 0 0 26px', fontSize: '0.83rem', color: '#74788d', lineHeight: '1.4' }}>
                              {typeObj.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', maxWidth: '500px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Withdraw Open Time</label>
                      <input
                        type="time"
                        value={settingsData.withdraw_open_time ? String(settingsData.withdraw_open_time).slice(0, 5) : ''}
                        onChange={(e) => setSettingsData({ ...settingsData, withdraw_open_time: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Withdraw Close Time</label>
                      <input
                        type="time"
                        value={settingsData.withdraw_close_time ? String(settingsData.withdraw_close_time).slice(0, 5) : ''}
                        onChange={(e) => setSettingsData({ ...settingsData, withdraw_close_time: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  {/* Allowed Withdrawal Days */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: '700', color: '#495057', display: 'block', marginBottom: '10px' }}>
                      Allowed Withdrawal Days:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                        const isSelected = withdrawDays.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => handleToggleWithdrawDay(day)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              border: isSelected ? '1px solid #34c38f' : '1px solid #ced4da',
                              backgroundColor: isSelected ? '#def7ec' : '#f8f9fa',
                              color: isSelected ? '#03543f' : '#74788d',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{isSelected ? '✓' : '✕'}</span>
                            <span>{day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={settingsLoading}
                    style={{ backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '10px 28px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {settingsLoading ? 'Saving...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS - CONTACT SETTINGS (PHP contact-settings.php parity) */}
          {activeTab === 'contact_settings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Contact Settings
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Settings / <span style={{ color: '#556ee6' }}>Contact Settings</span>
                </div>
              </div>

              {contactMsg && (
                <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                  ✓ {contactMsg}
                </div>
              )}
              {contactError && (
                <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                  ⚠️ {contactError}
                </div>
              )}

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '28px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', maxWidth: '900px' }}>
                <h5 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  Contact Settings
                </h5>
                <form onSubmit={handleSaveContactDetails}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Mobile Number</label>
                      <input
                        type="text"
                        placeholder="eg. 9876543210"
                        value={contactData.mobile || ''}
                        onChange={(e) => setContactData({ ...contactData, mobile: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>WhatsApp Number</label>
                      <input
                        type="text"
                        placeholder="Enter Whatsapp Number"
                        value={contactData.wp_mobile || ''}
                        onChange={(e) => setContactData({ ...contactData, wp_mobile: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Landline 1 (Optional)</label>
                      <input
                        type="text"
                        placeholder="eg. 0141-9999999"
                        value={contactData.landline || ''}
                        onChange={(e) => setContactData({ ...contactData, landline: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Landline 2 (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter Landline Number (Optional)"
                        value={contactData.alt_landline || ''}
                        onChange={(e) => setContactData({ ...contactData, alt_landline: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Email 1</label>
                      <input
                        type="email"
                        placeholder="Enter Email Id"
                        value={contactData.email || ''}
                        onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Email 2 (Optional)</label>
                      <input
                        type="email"
                        placeholder="Enter Email Id (Optional)"
                        value={contactData.alt_email || ''}
                        onChange={(e) => setContactData({ ...contactData, alt_email: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Facebook (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter Facebook Link"
                        value={contactData.facebook || ''}
                        onChange={(e) => setContactData({ ...contactData, facebook: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Twitter (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter Twitter Link"
                        value={contactData.twitter || ''}
                        onChange={(e) => setContactData({ ...contactData, twitter: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Address</label>
                    <textarea
                      rows="3"
                      placeholder="Enter Address"
                      value={contactData.address || ''}
                      onChange={(e) => setContactData({ ...contactData, address: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactLoading}
                    style={{ backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '10px 28px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {contactLoading ? 'Saving...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS - SLIDER IMAGES (PHP slider-images-management.php parity) */}
          {activeTab === 'sliders' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Slider Image Management
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Settings / <span style={{ color: '#556ee6' }}>Slider Images</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h5 style={{ margin: 0, fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>Slider Images List</h5>
                  <button
                    onClick={() => setShowAddSliderModal(true)}
                    style={{ backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    + Add Slider Image
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Slider Image</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Display Order</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Creation Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sliders.map((s, idx) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <img
                              src={
                                s.slider_image?.startsWith('http://') || s.slider_image?.startsWith('https://') || s.slider_image?.startsWith('data:')
                                  ? s.slider_image
                                  : s.slider_image?.startsWith('/')
                                  ? s.slider_image
                                  : `/uploads/${s.slider_image}`
                              }
                              alt="slider"
                              style={{ width: '150px', height: '65px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eff2f7', backgroundColor: '#f8f9fa' }}
                              onError={(e) => {
                                if (!e.target.dataset.triedFallback && !s.slider_image?.startsWith('http') && !s.slider_image?.startsWith('data:')) {
                                  e.target.dataset.triedFallback = 'true';
                                  e.target.src = `/${s.slider_image?.replace(/^\//, '')}`;
                                } else {
                                  e.target.src = 'https://placehold.co/150x65?text=Slider+Image';
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>{s.display_order}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#74788d' }}>
                            {s.creation_date ? String(s.creation_date).slice(0, 10) : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleSliderStatus(s.id)}
                              style={{
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                padding: '3px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                backgroundColor: (s.status === '1' || s.status === 1) ? '#def7ec' : '#fde8e8',
                                color: (s.status === '1' || s.status === 1) ? '#03543f' : '#9b1c1c'
                              }}
                            >
                              {(s.status === '1' || s.status === 1) ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleDeleteSlider(s.id)}
                              style={{ backgroundColor: '#f46a6a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sliders.length === 0 && !slidersLoading && (
                        <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Data Found!</td></tr>
                      )}
                      {slidersLoading && (
                        <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Slider Images...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS - HOW TO PLAY (PHP how-to-play.php parity) */}
          {activeTab === 'how_to_play' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  How To Play
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Settings / <span style={{ color: '#556ee6' }}>How To Play</span>
                </div>
              </div>

              {howToPlayMsg && (
                <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                  ✓ {howToPlayMsg}
                </div>
              )}

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '28px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', maxWidth: '850px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                  How To Play Content
                </h5>
                <form onSubmit={handleSaveHowToPlay}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                      Instructions / Rules Content
                    </label>
                    <textarea
                      rows="8"
                      placeholder="Enter How To Play instructions..."
                      value={howToPlayContent}
                      onChange={(e) => setHowToPlayContent(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', lineHeight: 1.6 }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={howToPlayLoading}
                    style={{ backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '10px 28px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {howToPlayLoading ? 'Saving...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW 8: WALLET MANAGEMENT - FUND REQUESTS */}
          {activeTab === 'deposits' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Fund Request & Deposit Management
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Wallet Management / <span style={{ color: '#556ee6' }}>Fund Request</span>
                </div>
              </div>

              {/* Date Filter Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px', maxWidth: '320px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Filter Date (Optional)</label>
                    <input
                      type="date"
                      value={fundReqDate}
                      onChange={(e) => setFundReqDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setFundReqPage(1);
                      fetchFundRequests(fundReqDate, 1, fundReqPerPage, fundReqSearch);
                    }}
                    style={{ backgroundColor: '#34c38f', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Filter Date
                  </button>
                  <button
                    onClick={() => {
                      setFundReqDate('');
                      setFundReqPage(1);
                      fetchFundRequests('', 1, fundReqPerPage, fundReqSearch);
                    }}
                    style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Show All
                  </button>
                </div>
              </div>

              {/* Data Table with Search & Server/Client Pagination */}
              <DataTable
                headerTitle="Fund Request List"
                actions={(
                  <span style={{ backgroundColor: '#556ee6', color: '#ffffff', padding: '6px 14px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
                    Total Amount is ₹ {fundReqTotal}
                  </span>
                )}
                columns={[
                  { title: 'S.No.', key: 'id', render: (_, idx) => (fundReqPage - 1) * fundReqPerPage + idx + 1 },
                  {
                    title: 'User Name',
                    key: 'username',
                    render: (item) => (
                      <div>
                        <button
                          type="button"
                          onClick={() => handleOpenUserDetails(item.user_id || item.username || item.user_phone, 'deposits')}
                          title="Click to view user details"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            margin: 0,
                            font: 'inherit',
                            color: '#556ee6',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          <span>{item.user_name || item.username}</span>
                          <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>🔗</span>
                        </button>
                      </div>
                    )
                  },
                  { title: 'Phone Number', key: 'username', render: (item) => item.username },
                  { title: 'Amount', key: 'amount', render: (item) => <strong style={{ color: '#28a745' }}>₹ {item.amount}</strong> },
                  { title: 'Points', key: 'points', render: (item) => item.points || item.amount },
                  {
                    title: 'UTR / Details',
                    key: 'trans_details',
                    render: (item) => (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
                        {item.trans_details || '—'}
                      </span>
                    )
                  },
                  {
                    title: 'Receipt Image',
                    key: 'receipe_image',
                    render: (item) => {
                      if (!item.receipe_image) return '-';
                      const imgSrc = item.receipe_image.startsWith('http')
                        ? item.receipe_image
                        : (item.receipe_image.startsWith('/') 
                            ? item.receipe_image 
                            : (item.receipe_image.startsWith('uploads/') ? `/${item.receipe_image}` : `/uploads/${item.receipe_image}`));
                      return (
                        <a href={imgSrc} target="_blank" rel="noreferrer" style={{ color: '#556ee6', textDecoration: 'underline', fontWeight: '700' }}>
                          View Receipt
                        </a>
                      );
                    }
                  },
                  { title: 'Date', key: 'date', render: (item) => item.date || item.created_at || '—' },
                  {
                    title: 'Status',
                    key: 'status',
                    style: { textAlign: 'center' },
                    render: (item) => (
                      <>
                        {(item.status === '1' || item.status === 1) && (
                          <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Accepted</span>
                        )}
                        {(item.status === '0' || item.status === 0) && (
                          <span style={{ backgroundColor: '#e1effe', color: '#1e429f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Pending</span>
                        )}
                        {(item.status === '-1' || item.status === -1) && (
                          <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Rejected</span>
                        )}
                      </>
                    )
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    style: { textAlign: 'center' },
                    render: (item) => (
                      (item.status === '0' || item.status === 0) ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleFundRequestAction(item.id, 'approve')}
                            style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleFundRequestAction(item.id, 'reject')}
                            style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#74788d' }}>Resolved</span>
                      )
                    )
                  }
                ]}
                data={fundReqList}
                loading={fundReqLoading}
                serverSide={true}
                totalItems={fundReqTotalCount}
                currentPage={fundReqPage}
                pageSize={fundReqPerPage}
                onPageChange={(p) => {
                  setFundReqPage(p);
                  fetchFundRequests(fundReqDate, p, fundReqPerPage, fundReqSearch);
                }}
                onPageSizeChange={(sz) => {
                  setFundReqPerPage(sz);
                  setFundReqPage(1);
                  fetchFundRequests(fundReqDate, 1, sz, fundReqSearch);
                }}
                onSearchChange={(s) => {
                  setFundReqSearch(s);
                  setFundReqPage(1);
                  fetchFundRequests(fundReqDate, 1, fundReqPerPage, s);
                }}
                searchPlaceholder="Search by Name, Phone, Amount..."
              />
            </div>
          )}

          {/* VIEW 9: WALLET MANAGEMENT - WITHDRAW REQUESTS */}
          {activeTab === 'withdrawals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Withdraw Request Management
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Wallet Management / <span style={{ color: '#556ee6' }}>Withdraw Request</span>
                </div>
              </div>

              {/* Date Filter Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', marginBottom: '20px' }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setWithReqPage(1);
                    fetchWithRequests(withReqDate, 1, withReqPerPage, withReqSearch, withReqStatus);
                  }}
                  style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: '180px', maxWidth: '240px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                    <input
                      type="date"
                      value={withReqDate}
                      onChange={(e) => setWithReqDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '220px', maxWidth: '300px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Search User / Phone / Remark</label>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={withReqSearch}
                      onChange={(e) => setWithReqSearch(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div style={{ width: '160px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Status</label>
                    <select
                      value={withReqStatus}
                      onChange={(e) => setWithReqStatus(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    >
                      <option value="all">All Status</option>
                      <option value="0">Pending</option>
                      <option value="1">Approved</option>
                      <option value="-1">Rejected</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={withReqLoading}
                    style={{ backgroundColor: '#34c38f', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {withReqLoading ? 'Loading...' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWithReqDate('');
                      setWithReqSearch('');
                      setWithReqStatus('all');
                      setWithReqPage(1);
                      fetchWithRequests('', 1, withReqPerPage, '', 'all');
                    }}
                    style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                </form>
              </div>

              {/* Data Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <h5 style={{ margin: 0, fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>Withdraw Request List</h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#556ee6', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                      Total Amount is ₹ {withReqTotals.total_amount}
                    </span>
                    <span style={{ backgroundColor: '#34c38f', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                      Total Approved is ₹ {withReqTotals.total_approved}
                    </span>
                    <span style={{ backgroundColor: '#f46a6a', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                      Total Rejected is ₹ {withReqTotals.total_rejected}
                    </span>
                    <span style={{ backgroundColor: '#f1b44c', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                      Total Pending is ₹ {withReqTotals.total_pending}
                    </span>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>User Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Mobile</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Bank & Payout Details</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Amount</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Request No.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withReqList.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px' }}>{(withReqPage - 1) * withReqPerPage + idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetails(item.user_id || item.username || item.user_phone, 'withdrawals')}
                              title="Click to view user details"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                font: 'inherit',
                                color: '#556ee6',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <span>{item.user_name || item.username}</span>
                              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>🔗</span>
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{item.username}</td>
                          <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>
                            {item.account_number || item.bank_name || item.paytm || item.phonepay || item.googlepay ? (
                              <div style={{ lineHeight: '1.4' }}>
                                {item.bank_name && <div><span style={{ color: '#74788d' }}>Bank:</span> <strong>{item.bank_name}</strong></div>}
                                {item.account_number && <div><span style={{ color: '#74788d' }}>A/C:</span> <strong style={{ fontFamily: 'monospace', color: '#556ee6' }}>{item.account_number}</strong></div>}
                                {item.ifsc_code && <div><span style={{ color: '#74788d' }}>IFSC:</span> <strong>{item.ifsc_code}</strong></div>}
                                {item.account_holder_name && <div><span style={{ color: '#74788d' }}>Name:</span> {item.account_holder_name}</div>}
                                {item.paytm && <div><span style={{ color: '#74788d' }}>Paytm:</span> {item.paytm}</div>}
                                {item.phonepay && <div><span style={{ color: '#74788d' }}>PhonePe:</span> {item.phonepay}</div>}
                                {item.googlepay && <div><span style={{ color: '#74788d' }}>GPay:</span> {item.googlepay}</div>}
                              </div>
                            ) : (
                              <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>No bank details</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#f46a6a' }}>₹ {item.points}</td>
                          <td style={{ padding: '10px 12px' }}>{item.id}</td>
                          <td style={{ padding: '10px 12px' }}>{item.date}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {(item.status === '1' || item.status === 1) && (
                              <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Accepted</span>
                            )}
                            {(item.status === '0' || item.status === 0) && (
                              <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Pending</span>
                            )}
                            {(item.status === '-1' || item.status === -1) && (
                              <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Rejected</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                              {(item.status === '0' || item.status === 0) && (
                                <>
                                  <button
                                    onClick={() => handleWithRequestAction(item.id, 'approve')}
                                    style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleWithRequestAction(item.id, 'reject')}
                                    style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setSelectedWithdrawModal(item)}
                                title="View Details"
                                style={{ backgroundColor: '#556ee6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                              >
                                👁
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {withReqList.length === 0 && !withReqLoading && (
                        <tr><td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Report Found</td></tr>
                      )}
                      {withReqLoading && (
                        <tr><td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Withdraw Requests...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Server-Side Pagination Bar */}
                <PaginationBar
                  currentPage={withReqPage}
                  pageSize={withReqPerPage}
                  totalItems={withReqTotalCount}
                  onPageChange={(p) => {
                    setWithReqPage(p);
                    fetchWithRequests(withReqDate, p, withReqPerPage, withReqSearch, withReqStatus);
                  }}
                  onPageSizeChange={(sz) => {
                    setWithReqPerPage(sz);
                    setWithReqPage(1);
                    fetchWithRequests(withReqDate, 1, sz, withReqSearch, withReqStatus);
                  }}
                  itemName="withdrawals"
                />
              </div>
            </div>
          )}

          {/* VIEW 10: WALLET MANAGEMENT - ADD FUND (USER WALLET) */}
          {activeTab === 'add_fund_wallet' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Add Fund (User Wallet)
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Wallet Management / <span style={{ color: '#556ee6' }}>Add Fund</span>
                </div>
              </div>

              <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '28px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#495057', fontWeight: '600' }}>
                  Add Balance In User Wallet
                </h5>

                {addFundError && (
                  <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    ⚠️ {addFundError}
                  </div>
                )}
                {addFundMsg && (
                  <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    ✓ {addFundMsg}
                  </div>
                )}

                <form onSubmit={handleAddFundSubmit}>
                  {/* SEARCHABLE USER SELECTION BOX */}
                  {/* DECLARE-RESULT STYLE FLOATING SUGGESTIONS SEARCH USER INPUT */}
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                      Select User (Search Name / Phone) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search or Select User (e.g. Rahul 9876543210)"
                        value={userSearchQuery}
                        onFocus={() => setShowAddFundUserDropdown(true)}
                        onBlur={() => setTimeout(() => setShowAddFundUserDropdown(false), 200)}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          setAddFundUserPhone('');
                          setShowAddFundUserDropdown(true);
                        }}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required={!addFundUserPhone}
                      />
                      {userSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserSearchQuery('');
                            setAddFundUserPhone('');
                            setShowAddFundUserDropdown(true);
                          }}
                          title="Clear Search"
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#74788d',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Floating Dropdown List (exact declare_result Open Pana pattern) */}
                    {showAddFundUserDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '220px',
                        overflowY: 'auto',
                        backgroundColor: '#ffffff',
                        border: '1px solid #ced4da',
                        borderRadius: '0 0 6px 6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000
                      }}>
                        {(() => {
                          const filtered = users.filter(u => {
                            if (!userSearchQuery.trim()) return true;
                            const q = userSearchQuery.toLowerCase().trim();
                            return (u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q);
                          });

                          if (filtered.length === 0) {
                            return (
                              <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#74788d', textAlign: 'center' }}>
                                No matching user found for "{userSearchQuery}"
                              </div>
                            );
                          }

                          return filtered.map(u => (
                            <div
                              key={u.id}
                              onMouseDown={() => {
                                setAddFundUserPhone(u.phone);
                                setUserSearchQuery(`${u.name} (${u.phone})`);
                                setShowAddFundUserDropdown(false);
                              }}
                              style={{
                                padding: '9px 14px',
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #f0f0f0',
                                backgroundColor: addFundUserPhone === u.phone ? '#eef2ff' : '#ffffff'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = addFundUserPhone === u.phone ? '#eef2ff' : '#ffffff'}
                            >
                              <div>
                                <strong style={{ color: '#343a40' }}>{u.name}</strong>{' '}
                                <span style={{ color: '#556ee6', fontSize: '0.82rem' }}>({u.phone})</span>
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#28a745' }}>
                                Balance: ₹{u.wallet || 0}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* Selected User Confirmation Badge */}
                    {addFundUserPhone && (() => {
                      const selUser = users.find(u => u.phone === addFundUserPhone);
                      if (!selUser) return null;
                      return (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#def7ec',
                          border: '1px solid #bcf0da',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                          color: '#03543f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>✓ Selected User: <strong>{selUser.name}</strong> ({selUser.phone})</span>
                          <span>Current Wallet: <strong>₹{selUser.wallet || 0}</strong></span>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                      Amount *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter Amount"
                      value={addFundAmount}
                      onChange={(e) => setAddFundAmount(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addFundLoading}
                    style={{
                      backgroundColor: '#556ee6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '11px 24px',
                      fontSize: '0.92rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow: '0 2px 6px rgba(85, 110, 230, 0.3)'
                    }}
                  >
                    {addFundLoading ? 'Processing...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW 11: WALLET MANAGEMENT - BID REVERT */}
          {activeTab === 'bid_revert' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Bid Revert Management
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Wallet Management / <span style={{ color: '#556ee6' }}>Bid Revert</span>
                </div>
              </div>

              {bidRevertMsg && (
                <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                  ✓ {bidRevertMsg}
                </div>
              )}

              {/* Filter Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                    <input
                      type="date"
                      value={bidRevertDate}
                      onChange={(e) => setBidRevertDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Game Name</label>
                    <select
                      value={bidRevertGame || (games[0]?.games_name || '')}
                      onChange={(e) => setBidRevertGame(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    >
                      {games.map(g => (
                        <option key={g.id} value={g.games_name}>{g.games_name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={fetchBidRevertList}
                    style={{ backgroundColor: '#556ee6', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Submit
                  </button>
                </div>
              </div>

              {/* Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <h5 style={{ margin: 0, fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>Bid History List</h5>
                  {bidRevertList.length > 0 && (
                    <button
                      onClick={() => setShowRevertConfirmModal(true)}
                      style={{ backgroundColor: '#f46a6a', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Clear &amp; Refund All
                    </button>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Username</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Type</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bidRevertList.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>{item.date}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetails(item.user_id || item.username || item.user_phone)}
                              title="Click to view user details"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                font: 'inherit',
                                color: '#556ee6',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <span>{item.user_name || item.username}</span>
                              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>🔗</span>
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{item.game_type}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#34c38f' }}>{item.points_action}</td>
                        </tr>
                      ))}
                      {bidRevertList.length === 0 && !bidRevertLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Bid Found</td></tr>
                      )}
                      {bidRevertLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Bids...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: DECLARE RESULT */}
          {activeTab === 'declare_result' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Declare Game Result
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Game Operations / <span style={{ color: '#556ee6' }}>Declare Result</span>
                </div>
              </div>

              <div style={{ maxWidth: '650px', backgroundColor: '#ffffff', borderRadius: '8px', padding: '28px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#495057', fontWeight: '600' }}>Declare Numbers</h5>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#74788d' }}>
                    Declare Open/Close Pana & Result digits. Winner settlements and payouts will be executed automatically.
                  </p>
                </div>

                {declareError && (
                  <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                    ⚠️ {declareError}
                  </div>
                )}
                {declareSuccess && (
                  <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '10px 16px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '18px' }}>
                    ✓ {declareSuccess}
                  </div>
                )}

                <form onSubmit={handleDeclareSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Select Game *</label>
                    <select
                      value={declareSelectedGame || (games[0]?.games_name || '')}
                      onChange={(e) => setDeclareSelectedGame(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      required
                    >
                      {games.map(g => (
                        <option key={g.id} value={g.games_name}>{g.games_name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Result Date *</label>
                      <input
                        type="date"
                        value={declareDate}
                        onChange={(e) => setDeclareDate(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Session *</label>
                      <select
                        value={declareSession}
                        onChange={(e) => setDeclareSession(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required
                      >
                        <option value="open">OPEN SESSION</option>
                        <option value="close">CLOSE SESSION</option>
                      </select>
                    </div>
                  </div>

                  {declareSession === 'open' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                          Open Pana (3 Digits) *
                        </label>
                        <input
                          type="text"
                          maxLength="3"
                          placeholder="Search or Select Pana (e.g. 123)"
                          value={declareOpenPana}
                          onFocus={() => setShowOpenPanaDropdown(true)}
                          onBlur={() => setTimeout(() => setShowOpenPanaDropdown(false), 200)}
                          onChange={(e) => {
                            handleOpenPanaSelect(e.target.value);
                            setShowOpenPanaDropdown(true);
                          }}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                          required
                        />
                        {showOpenPanaDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            backgroundColor: '#ffffff',
                            border: '1px solid #ced4da',
                            borderRadius: '0 0 6px 6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000
                          }}>
                            {ALL_PANAS_220.filter(p => !declareOpenPana || p.includes(declareOpenPana)).slice(0, 60).map(p => {
                              const digit = getPanaSingleDigit(p);
                              return (
                                <div
                                  key={p}
                                  onMouseDown={() => {
                                    handleOpenPanaSelect(p);
                                    setShowOpenPanaDropdown(false);
                                  }}
                                  style={{
                                    padding: '8px 14px',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid #f0f0f0',
                                    backgroundColor: declareOpenPana === p ? '#eef2ff' : '#ffffff'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = declareOpenPana === p ? '#eef2ff' : '#ffffff'}
                                >
                                  <span><strong>Pana:</strong> {p}</span>
                                  <span style={{ color: '#556ee6', fontWeight: 'bold', backgroundColor: '#eff2f7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                    Digit: {digit}
                                  </span>
                                </div>
                              );
                            })}
                            {ALL_PANAS_220.filter(p => !declareOpenPana || p.includes(declareOpenPana)).length === 0 && (
                              <div style={{ padding: '10px', fontSize: '0.85rem', color: '#74788d', textAlign: 'center' }}>
                                No matching Pana found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Open Single Digit (0-9) *</label>
                        <input
                          type="text"
                          maxLength="1"
                          placeholder="Auto-calculated (e.g. 6)"
                          value={declareOpenResult}
                          onChange={(e) => setDeclareOpenResult(e.target.value.replace(/\D/g, ''))}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none', backgroundColor: '#f8f9fa' }}
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                          Close Pana (3 Digits) *
                        </label>
                        <input
                          type="text"
                          maxLength="3"
                          placeholder="Search or Select Pana (e.g. 456)"
                          value={declareClosePana}
                          onFocus={() => setShowClosePanaDropdown(true)}
                          onBlur={() => setTimeout(() => setShowClosePanaDropdown(false), 200)}
                          onChange={(e) => {
                            handleClosePanaSelect(e.target.value);
                            setShowClosePanaDropdown(true);
                          }}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                          required
                        />
                        {showClosePanaDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            backgroundColor: '#ffffff',
                            border: '1px solid #ced4da',
                            borderRadius: '0 0 6px 6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000
                          }}>
                            {ALL_PANAS_220.filter(p => !declareClosePana || p.includes(declareClosePana)).slice(0, 60).map(p => {
                              const digit = getPanaSingleDigit(p);
                              return (
                                <div
                                  key={p}
                                  onMouseDown={() => {
                                    handleClosePanaSelect(p);
                                    setShowClosePanaDropdown(false);
                                  }}
                                  style={{
                                    padding: '8px 14px',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid #f0f0f0',
                                    backgroundColor: declareClosePana === p ? '#eef2ff' : '#ffffff'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = declareClosePana === p ? '#eef2ff' : '#ffffff'}
                                >
                                  <span><strong>Pana:</strong> {p}</span>
                                  <span style={{ color: '#556ee6', fontWeight: 'bold', backgroundColor: '#eff2f7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                    Digit: {digit}
                                  </span>
                                </div>
                              );
                            })}
                            {ALL_PANAS_220.filter(p => !declareClosePana || p.includes(declareClosePana)).length === 0 && (
                              <div style={{ padding: '10px', fontSize: '0.85rem', color: '#74788d', textAlign: 'center' }}>
                                No matching Pana found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Close Single Digit (0-9) *</label>
                        <input
                          type="text"
                          maxLength="1"
                          placeholder="Auto-calculated (e.g. 5)"
                          value={declareCloseResult}
                          onChange={(e) => setDeclareCloseResult(e.target.value.replace(/\D/g, ''))}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none', backgroundColor: '#f8f9fa' }}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={handlePreviewWinners}
                      disabled={previewLoading}
                      style={{
                        padding: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        backgroundColor: '#eff2f7',
                        color: '#556ee6',
                        border: '1px solid #556ee6',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {previewLoading ? 'Loading Preview...' : '👁️ SHOW WINNERS PREVIEW'}
                    </button>

                    <button
                      type="submit"
                      disabled={declareLoading}
                      style={{
                        padding: '12px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        backgroundColor: '#556ee6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(85, 110, 230, 0.3)',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {declareLoading
                        ? 'Declaring & Processing Payouts...'
                        : (() => {
                            const curGame = declareSelectedGame || (games[0]?.games_name || '');
                            const existing = declaredResultsList.find(
                              r => String(r.game_name).trim().toLowerCase() === String(curGame).trim().toLowerCase() &&
                                   (r.date === declareDate || String(r.date).startsWith(declareDate))
                            );
                            const alreadyDeclared = declareSession === 'open'
                              ? Boolean(existing && existing.open_panna && existing.open_digit)
                              : Boolean(existing && existing.close_panna && existing.close_digit);
                            return alreadyDeclared ? '🔄 UPDATE RESULT & REVERT PREVIOUS PAYOUTS' : 'DECLARE GAME RESULT';
                          })()
                      }
                    </button>
                  </div>
                </form>
              </div>

              {/* DECLARED RESULTS LIST TABLE */}
              <div style={{ marginTop: '28px', backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#495057', fontWeight: '600' }}>
                      Declared Results History
                    </h5>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#74788d' }}>
                      View declared results, edit/update numbers, or delete to revert winning payouts.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#495057' }}>Filter Date:</label>
                    <input
                      type="date"
                      value={declareDate}
                      onChange={(e) => {
                        setDeclareDate(e.target.value);
                        fetchDeclaredResults(e.target.value);
                      }}
                      style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', color: '#495057' }}>Game Name</th>
                        <th style={{ padding: '10px 14px', color: '#495057' }}>Result Date</th>
                        <th style={{ padding: '10px 14px', color: '#495057', textAlign: 'center' }}>Open Result</th>
                        <th style={{ padding: '10px 14px', color: '#495057', textAlign: 'center' }}>Close Result</th>
                        <th style={{ padding: '10px 14px', color: '#495057', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {declaredResultsList.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#74788d' }}>
                            {declaredResultsLoading ? 'Loading declared results...' : 'No declared results found for selected date.'}
                          </td>
                        </tr>
                      ) : (
                        declaredResultsList.map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 'bold', color: '#343a40' }}>{row.game_name}</td>
                            <td style={{ padding: '10px 14px', color: '#74788d' }}>{row.date}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {row.open_panna ? (
                                <span style={{ backgroundColor: '#eef2ff', color: '#556ee6', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                                  {row.open_panna} - {row.open_digit}
                                </span>
                              ) : (
                                <span style={{ color: '#adb5bd', fontSize: '0.8rem' }}>Not Declared</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {row.close_panna ? (
                                <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                                  {row.close_panna} - {row.close_digit}
                                </span>
                              ) : (
                                <span style={{ color: '#adb5bd', fontSize: '0.8rem' }}>Not Declared</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {row.open_panna && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeclareSelectedGame(row.game_name);
                                      setDeclareDate(row.date);
                                      setDeclareSession('open');
                                      setDeclareOpenPana(row.open_panna);
                                      setDeclareOpenResult(row.open_digit);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    title="Edit Open Result"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#556ee6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                  >
                                    Edit Open
                                  </button>
                                )}
                                {row.close_panna && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeclareSelectedGame(row.game_name);
                                      setDeclareDate(row.date);
                                      setDeclareSession('close');
                                      setDeclareClosePana(row.close_panna);
                                      setDeclareCloseResult(row.close_digit);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    title="Edit Close Result"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#34c38f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                  >
                                    Edit Close
                                  </button>
                                )}
                                {row.open_panna && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeclaredResult(row.game_name, row.date, 'open')}
                                    title="Delete Open Result and revert winning payouts (including Jodi/Sangam)"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#f87171', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                  >
                                    Delete Open
                                  </button>
                                )}
                                {row.close_panna && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeclaredResult(row.game_name, row.date, 'close')}
                                    title="Delete Close Result and revert winning payouts (including Jodi/Sangam)"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                  >
                                    Delete Close
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDeclaredResult(row.game_name, row.date, 'all')}
                                  title="Delete entire result and revert all payouts"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#991b1b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  Delete Full
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: 1. USERS BID HISTORY */}
          {activeTab === 'report_bid_history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Bid History Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Bid History</span>
                </div>
              </div>

              {/* Filter Form Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Filter Bids</h5>
                <form onSubmit={(e) => { e.preventDefault(); setBidHistoryPage(1); fetchReportBidHistory(bidHistoryDate, bidHistoryGame, bidHistoryType, 1, bidHistoryPerPage, bidHistorySearch); }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                      <input
                        type="date"
                        value={bidHistoryDate}
                        onChange={(e) => setBidHistoryDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Game Name</label>
                      <select
                        value={bidHistoryGame}
                        onChange={(e) => setBidHistoryGame(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="all">All Games</option>
                        {games.map(g => (
                          <option key={g.id} value={g.games_name}>{g.games_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Game Type</label>
                      <select
                        value={bidHistoryType}
                        onChange={(e) => setBidHistoryType(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="all">All</option>
                        <option value="Single Digit">Single Digit</option>
                        <option value="Jodi Digit">Jodi Digit</option>
                        <option value="Single Pana">Single Pana</option>
                        <option value="Double Pana">Double Pana</option>
                        <option value="Triple Pana">Triple Pana</option>
                        <option value="Half Sangam">Half Sangam</option>
                        <option value="Full Sangam">Full Sangam</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Search User / Pana / Digit</label>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={bidHistorySearch}
                        onChange={(e) => setBidHistorySearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={bidHistoryLoading}
                        style={{ width: '100%', padding: '10px 16px', backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 6px rgba(85, 110, 230, 0.3)' }}
                      >
                        {bidHistoryLoading ? 'Loading...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Data Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Bid History List</h5>
                  <span style={{ fontSize: '0.82rem', color: '#74788d' }}>Total Bids: <strong>{bidHistoryTotalCount}</strong></span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Username</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Type</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Session</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Open Pana</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Open Result</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Close Pana</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Close Result</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Points</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bidHistoryList.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatDisplayDateTime(b.date, b.time)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div>
                              <strong>{b.user_name || b.username}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#74788d' }}>{b.username}</div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{b.game_name}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ backgroundColor: '#edf2f7', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>{b.game_type}</span>
                          </td>
                          <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>
                            {(b.game_type === 'Jodi Digit' || b.game_type === 'Jodi')
                              ? 'Jodi'
                              : (b.game_type === 'Half Sangam' || b.game_type === 'Full Sangam')
                                ? 'Sangam'
                                : (b.session || '-')}
                          </td>
                          <td style={{ padding: '10px 12px' }}>{(!b.open_pana || b.open_pana === 'NA' || b.open_pana === 'N/A') ? '-' : b.open_pana}</td>
                          <td style={{ padding: '10px 12px' }}>{(!b.open_digit || b.open_digit === 'NA' || b.open_digit === 'N/A') ? '-' : b.open_digit}</td>
                          <td style={{ padding: '10px 12px' }}>{(!b.close_pana || b.close_pana === 'NA' || b.close_pana === 'N/A') ? '-' : b.close_pana}</td>
                          <td style={{ padding: '10px 12px' }}>{(!b.close_digit || b.close_digit === 'NA' || b.close_digit === 'N/A') ? '-' : b.close_digit}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#556ee6' }}>₹ {b.points_action}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setEditBidModal(b);
                                setEditBidForm({
                                  open_pana: b.open_pana || '',
                                  open_digit: b.open_digit || '',
                                  close_pana: b.close_pana || '',
                                  close_digit: b.close_digit || '',
                                  points_action: b.points_action || ''
                                });
                              }}
                              style={{ padding: '4px 10px', fontSize: '0.75rem', border: '1px solid #556ee6', backgroundColor: '#fff', color: '#556ee6', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                            >
                              EDIT BID
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bidHistoryList.length === 0 && !bidHistoryLoading && (
                        <tr><td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Bids Found for selected filters.</td></tr>
                      )}
                      {bidHistoryLoading && (
                        <tr><td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Bids...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Server-Side Pagination Bar */}
                <PaginationBar
                  currentPage={bidHistoryPage}
                  pageSize={bidHistoryPerPage}
                  totalItems={bidHistoryTotalCount}
                  onPageChange={(p) => {
                    setBidHistoryPage(p);
                    fetchReportBidHistory(bidHistoryDate, bidHistoryGame, bidHistoryType, p, bidHistoryPerPage, bidHistorySearch);
                  }}
                  onPageSizeChange={(sz) => {
                    setBidHistoryPerPage(sz);
                    setBidHistoryPage(1);
                    fetchReportBidHistory(bidHistoryDate, bidHistoryGame, bidHistoryType, 1, sz, bidHistorySearch);
                  }}
                  itemName="bids"
                />
              </div>
            </div>
          )}

          {/* VIEW: 2. CUSTOMER SELL REPORT */}
          {activeTab === 'report_sell' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Customer Sell Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Customer Sell Report</span>
                </div>
              </div>

              {/* Filter Form Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Select Report Criteria</h5>
                <form onSubmit={(e) => { e.preventDefault(); fetchReportSell(); }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                      <input
                        type="date"
                        value={sellDate}
                        onChange={(e) => setSellDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Game Name</label>
                      <select
                        value={sellGame}
                        onChange={(e) => setSellGame(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="all">All Games</option>
                        {games.map(g => (
                          <option key={g.id} value={g.games_name}>{g.games_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Game Type</label>
                      <select
                        value={sellType}
                        onChange={(e) => setSellType(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="all">All</option>
                        <option value="Single Digit">Single Digit</option>
                        <option value="Jodi Digit">Jodi Digit</option>
                        <option value="Single Pana">Single Pana</option>
                        <option value="Double Pana">Double Pana</option>
                        <option value="Triple Pana">Triple Pana</option>
                        <option value="Half Sangam">Half Sangam</option>
                        <option value="Full Sangam">Full Sangam</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Session</label>
                      <select
                        value={sellSession}
                        onChange={(e) => setSellSession(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="open">Open</option>
                        <option value="close">Close</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={sellLoading}
                        style={{ width: '100%', padding: '10px 16px', backgroundColor: '#50a5f1', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 6px rgba(80, 165, 241, 0.3)' }}
                      >
                        {sellLoading ? 'Loading...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Total Sell Badge */}
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#28a745', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '0.92rem', fontWeight: 'bold' }}>
                  Total Sell Points: ₹ {sellGrandTotal}
                </span>
              </div>

              {/* Sell Grid Sections */}
              {Object.keys(sellReportData).map(typeKey => {
                const section = sellReportData[typeKey];
                return (
                  <div key={typeKey} style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dotted #495057', paddingBottom: '8px', marginBottom: '16px' }}>
                      <h5 style={{ margin: 0, fontWeight: 'bold', color: '#343a40', fontSize: '1.05rem' }}>{typeKey}</h5>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#556ee6' }}>Subtotal: ₹ {section.total_points}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '8px' }}>
                      {section.data.map(item => (
                        <div
                          key={item.number}
                          style={{
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            padding: '6px',
                            textAlign: 'center',
                            backgroundColor: '#fafbfe'
                          }}
                        >
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#495057', marginBottom: '4px' }}>{item.number}</div>
                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                minWidth: '40px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                backgroundColor: item.sum > 0 ? '#28a745' : '#dc3545'
                              }}
                            >
                              {item.sum}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(sellReportData).length === 0 && !sellLoading && (
                <div style={{ backgroundColor: '#fff', padding: '30px', textAlign: 'center', borderRadius: '8px', border: '1px solid #eff2f7', color: '#74788d' }}>
                  Please select filters and click Submit to view the sell report.
                </div>
              )}
            </div>
          )}

          {/* VIEW: 3. WINNING REPORT */}
          {activeTab === 'report_winning' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Winning History Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Winning Report</span>
                </div>
              </div>

              {/* Filter Form Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Filter Winners</h5>
                <form onSubmit={(e) => { e.preventDefault(); setWinningPage(1); fetchReportWinning(winningDate, winningGame, winningSession, 1, winningPerPage, winningSearch); }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                      <input
                        type="date"
                        value={winningDate}
                        onChange={(e) => setWinningDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Game Name</label>
                      <select
                        value={winningGame}
                        onChange={(e) => setWinningGame(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="all">All Games</option>
                        {games.map(g => (
                          <option key={g.id} value={g.games_name}>{g.games_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Market Time</label>
                      <select
                        value={winningSession}
                        onChange={(e) => setWinningSession(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="all">All</option>
                        <option value="open">Open</option>
                        <option value="close">Close</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Search Phone / Name</label>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={winningSearch}
                        onChange={(e) => setWinningSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={winningLoading}
                        style={{ width: '100%', padding: '10px 16px', backgroundColor: '#50a5f1', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 6px rgba(80, 165, 241, 0.3)' }}
                      >
                        {winningLoading ? 'Loading...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Data Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Winning List</h5>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '4px 10px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                      Total Winning: ₹ {winningTotalAmt}
                    </span>
                    <span style={{ backgroundColor: '#e1effe', color: '#1e429f', padding: '4px 10px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                      Total Points: {winningTotalPoints}
                    </span>
                    <span style={{ backgroundColor: '#edf2f7', color: '#495057', padding: '4px 10px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                      Total Records: {winningTotalCount}
                    </span>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>User Phone</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>User Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Type</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Open Pana</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Open Digit</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Close Pana</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Close Digit</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Winning Amount</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {winningList.map(w => (
                        <tr key={w.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{w.date}</td>
                          <td style={{ padding: '10px 12px' }}>{w.username}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong>{w.user_name || 'N/A'}</strong>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{w.game_name}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ backgroundColor: '#edf2f7', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>{w.game_type}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{w.open_pana}</td>
                          <td style={{ padding: '10px 12px' }}>{w.open_digit}</td>
                          <td style={{ padding: '10px 12px' }}>{w.close_pana}</td>
                          <td style={{ padding: '10px 12px' }}>{w.close_digit}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#28a745' }}>₹ {w.winning_points}</td>
                          <td style={{ padding: '10px 12px' }}>{w.points_action || w.points || 0}</td>
                        </tr>
                      ))}
                      {winningList.length === 0 && !winningLoading && (
                        <tr><td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Winners Found!!</td></tr>
                      )}
                      {winningLoading && (
                        <tr><td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Winners...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Server-Side Pagination Bar */}
                <PaginationBar
                  currentPage={winningPage}
                  pageSize={winningPerPage}
                  totalItems={winningTotalCount}
                  onPageChange={(p) => {
                    setWinningPage(p);
                    fetchReportWinning(winningDate, winningGame, winningSession, p, winningPerPage, winningSearch);
                  }}
                  onPageSizeChange={(sz) => {
                    setWinningPerPage(sz);
                    setWinningPage(1);
                    fetchReportWinning(winningDate, winningGame, winningSession, 1, sz, winningSearch);
                  }}
                  itemName="winners"
                />
              </div>
            </div>
          )}

          {/* VIEW: 4. TRANSFER POINT REPORT */}
          {activeTab === 'report_transfer' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Transfer Point Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Transfer Point Report</span>
                </div>
              </div>

              {/* Filter Form Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Filter Transfers</h5>
                <form onSubmit={(e) => { e.preventDefault(); setTransferPage(1); fetchReportTransfer(transferDate, 1, transferPerPage, transferSearch); }}>
                  <div style={{ display: 'flex', gap: '16px', maxWidth: '640px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                      <input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Search Sender / Receiver / Phone</label>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={transferSearch}
                        onChange={(e) => setTransferSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={transferLoading}
                        style={{ padding: '10px 24px', backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 6px rgba(85, 110, 230, 0.3)' }}
                      >
                        {transferLoading ? 'Loading...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Data Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Transfer List</h5>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ backgroundColor: '#556ee6', color: '#ffffff', padding: '6px 14px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Total Transfer Amount: ₹ {transferTotal}
                    </span>
                    <span style={{ backgroundColor: '#edf2f7', color: '#495057', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                      Total Records: {transferTotalCount}
                    </span>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Sender Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Receiver Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Amount</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferList.map((t, idx) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px' }}>{(transferPage - 1) * transferPerPage + idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong>{t.sender_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#74788d' }}>{t.sender_phone}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong>{t.receiver_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#74788d' }}>{t.receiver_phone}</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#556ee6' }}>₹ {t.amount}</td>
                          <td style={{ padding: '10px 12px' }}>{t.date} {t.time ? `(${t.time})` : ''}</td>
                        </tr>
                      ))}
                      {transferList.length === 0 && !transferLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Report Found</td></tr>
                      )}
                      {transferLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Transfers...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Server-Side Pagination Bar */}
                <PaginationBar
                  currentPage={transferPage}
                  pageSize={transferPerPage}
                  totalItems={transferTotalCount}
                  onPageChange={(p) => {
                    setTransferPage(p);
                    fetchReportTransfer(transferDate, p, transferPerPage, transferSearch);
                  }}
                  onPageSizeChange={(sz) => {
                    setTransferPerPage(sz);
                    setTransferPage(1);
                    fetchReportTransfer(transferDate, 1, sz, transferSearch);
                  }}
                  itemName="transfers"
                />
              </div>
            </div>
          )}

          {/* VIEW: 5. BID WIN REPORT */}
          {activeTab === 'report_bid_win' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Bid Winning Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Bid Win Report</span>
                </div>
              </div>

              {/* Filter Form Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Select Date & Game</h5>
                <form onSubmit={(e) => { e.preventDefault(); fetchReportBidWin(); }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                      <input
                        type="date"
                        value={bidWinRepDate}
                        onChange={(e) => setBidWinRepDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Game Name</label>
                      <select
                        value={bidWinRepGame}
                        onChange={(e) => setBidWinRepGame(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      >
                        <option value="all">-All Games-</option>
                        {games.map(g => (
                          <option key={g.id} value={g.games_name}>{g.games_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={bidWinRepLoading}
                        style={{ width: '100%', padding: '10px 16px', backgroundColor: '#28a745', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 6px rgba(40, 167, 69, 0.3)' }}
                      >
                        {bidWinRepLoading ? 'Loading...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Total Bid Amount */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px dashed #74788d', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#74788d', fontWeight: '500', marginBottom: '6px' }}>Total Bid Amount</div>
                      <h4 style={{ margin: 0, fontSize: '1.4rem', color: '#343a40', fontWeight: 'bold' }}>₹ {bidWinRepData.total_bid}</h4>
                    </div>
                    <button
                      onClick={() => handleOpenBidWinDetails('bids')}
                      style={{ padding: '6px 14px', backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </div>
                </div>

                {/* Total Win Amount */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px dashed #74788d', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#74788d', fontWeight: '500', marginBottom: '6px' }}>Total Win Amount</div>
                      <h4 style={{ margin: 0, fontSize: '1.4rem', color: '#343a40', fontWeight: 'bold' }}>₹ {bidWinRepData.total_win}</h4>
                    </div>
                    <button
                      onClick={() => handleOpenBidWinDetails('wins')}
                      style={{ padding: '6px 14px', backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </div>
                </div>

                {/* Profit / Loss */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '20px',
                  border: bidWinRepData.profit >= 0 ? '2px solid #28a745' : '2px solid #f1673e',
                  boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)'
                }}>
                  <div style={{ fontSize: '0.85rem', color: bidWinRepData.profit >= 0 ? '#28a745' : '#f1673e', fontWeight: '600', marginBottom: '6px' }}>
                    {bidWinRepData.profit >= 0 ? 'Total Profit Amount' : 'Total Loss Amount'}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.4rem', color: bidWinRepData.profit >= 0 ? '#28a745' : '#f1673e', fontWeight: 'bold' }}>
                    ₹ {Math.abs(bidWinRepData.profit)}
                  </h4>
                </div>
              </div>

              {/* Details Table if opened */}
              {bidWinRepDetails !== 'none' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h5 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>
                      {bidWinRepDetails === 'bids' ? 'Detailed Bids List' : 'Detailed Winners List'}
                    </h5>
                    <button
                      onClick={() => setBidWinRepDetails('none')}
                      style={{ padding: '4px 10px', fontSize: '0.78rem', backgroundColor: '#f46a6a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Close Details
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>User</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Name</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Game Type</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Session</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Points / Win</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidWinRepDetailList.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eff2f7' }}>
                            <td style={{ padding: '10px 12px' }}>{item.user_name || item.username} ({item.username})</td>
                            <td style={{ padding: '10px 12px' }}>{item.game_name}</td>
                            <td style={{ padding: '10px 12px' }}>{item.game_type}</td>
                            <td style={{ padding: '10px 12px' }}>{item.session}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: bidWinRepDetails === 'bids' ? '#556ee6' : '#28a745' }}>
                              ₹ {bidWinRepDetails === 'bids' ? item.points_action : item.winning_points}
                            </td>
                          </tr>
                        ))}
                        {bidWinRepDetailList.length === 0 && (
                          <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No records found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: 6. WITHDRAW REPORT */}
          {activeTab === 'report_withdraw' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Withdraw History Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Withdraw Report</span>
                </div>
              </div>

              {/* Filter Form Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Filter Withdrawals</h5>
                <form onSubmit={(e) => { e.preventDefault(); setWithdrawRepPage(1); fetchReportWithdraw(withdrawRepDate, 1, withdrawRepPerPage, withdrawRepSearch); }}>
                  <div style={{ display: 'flex', gap: '16px', maxWidth: '700px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                      <input
                        type="date"
                        value={withdrawRepDate}
                        onChange={(e) => setWithdrawRepDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Search User / Phone</label>
                      <input
                        type="text"
                        placeholder="Search name, phone..."
                        value={withdrawRepSearch}
                        onChange={(e) => setWithdrawRepSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={withdrawRepLoading}
                        style={{ padding: '10px 24px', backgroundColor: '#28a745', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 6px rgba(40, 167, 69, 0.3)' }}
                      >
                        {withdrawRepLoading ? 'Loading...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Data Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Withdraw List ({withdrawRepTotalCount})</h5>
                  <span style={{ backgroundColor: '#28a745', color: '#ffffff', padding: '6px 14px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Total Transfer Amount is ₹ {withdrawRepTotal}
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>S.No.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>User Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Phone Number</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Amount</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawRepList.map(w => (
                        <tr key={w.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px' }}>{w.sno}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetails(w.user_id || w.phone_number || w.user_name)}
                              title="Click to view user details"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                font: 'inherit',
                                color: '#556ee6',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <span>{w.user_name}</span>
                              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>🔗</span>
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{w.phone_number}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#dc3545' }}>₹ {w.amount}</td>
                          <td style={{ padding: '10px 12px' }}>{w.date} {w.time ? `(${w.time})` : ''}</td>
                        </tr>
                      ))}
                      {withdrawRepList.length === 0 && !withdrawRepLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Report Found</td></tr>
                      )}
                      {withdrawRepLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Withdrawals...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  currentPage={withdrawRepPage}
                  pageSize={withdrawRepPerPage}
                  totalItems={withdrawRepTotalCount}
                  onPageChange={(p) => {
                    setWithdrawRepPage(p);
                    fetchReportWithdraw(withdrawRepDate, p, withdrawRepPerPage, withdrawRepSearch);
                  }}
                  onPageSizeChange={(sz) => {
                    setWithdrawRepPerPage(sz);
                    setWithdrawRepPage(1);
                    fetchReportWithdraw(withdrawRepDate, 1, sz, withdrawRepSearch);
                  }}
                  itemName="withdrawals"
                />
              </div>
            </div>
          )}

          {/* VIEW: 7. AUTO DEPOSIT HISTORY */}
          {activeTab === 'report_auto_deposit' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Auto Deposit History
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Auto Deposit</span>
                </div>
              </div>

              {/* Filter Form Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Filter Auto Deposits</h5>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAutoDepPage(1);
                    fetchReportAutoDeposit(autoDepDate, 1, autoDepPerPage, autoDepSearch);
                  }}
                  style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: '180px', maxWidth: '240px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                    <input
                      type="date"
                      value={autoDepDate}
                      onChange={(e) => setAutoDepDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '220px', maxWidth: '300px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Search User / Phone / ID</label>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={autoDepSearch}
                      onChange={(e) => setAutoDepSearch(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={autoDepLoading}
                    style={{ padding: '10px 20px', backgroundColor: '#556ee6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {autoDepLoading ? 'Loading...' : 'Search'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoDepDate('');
                      setAutoDepSearch('');
                      setAutoDepPage(1);
                      fetchReportAutoDeposit('', 1, autoDepPerPage, '');
                    }}
                    style={{ padding: '10px 16px', backgroundColor: '#6c757d', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                </form>

                {/* Summary Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
                  <span style={{ backgroundColor: '#556ee6', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                    Total Transfer: ₹ {autoDepTotals.total_transfer}
                  </span>
                  <span style={{ backgroundColor: '#28a745', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                    Total Approved: ₹ {autoDepTotals.total_approved}
                  </span>
                  <span style={{ backgroundColor: '#dc3545', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                    Total Rejected: ₹ {autoDepTotals.total_rejected}
                  </span>
                  <span style={{ backgroundColor: '#ffc107', color: '#212529', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                    Total Pending: ₹ {autoDepTotals.total_pending}
                  </span>
                </div>
              </div>

              {/* Data Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Auto Deposit List</h5>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>S.No.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>User Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Phone Number</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Amount</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#495057' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoDepList.map((d, index) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px' }}>{(autoDepPage - 1) * autoDepPerPage + index + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong>{d.user_name || 'N/A'}</strong>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{d.username}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#28a745' }}>₹ {d.amount}</td>
                          <td style={{ padding: '10px 12px' }}>{d.txt_date}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {(d.status === '1' || d.status === 1) && (
                              <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Sent</span>
                            )}
                            {(d.status === '-1' || d.status === -1) && (
                              <span style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Cancelled</span>
                            )}
                            {(d.status === '0' || d.status === 0) && (
                              <span style={{ backgroundColor: '#e1effe', color: '#1e429f', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Pending</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {(d.status === '0' || d.status === 0) ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleAutoDepositAction(d.id, '1')}
                                  style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleAutoDepositAction(d.id, '-1')}
                                  style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#74788d' }}>Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {autoDepList.length === 0 && !autoDepLoading && (
                        <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Report Found</td></tr>
                      )}
                      {autoDepLoading && (
                        <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Auto Deposits...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Server-Side Pagination Bar */}
                <PaginationBar
                  currentPage={autoDepPage}
                  pageSize={autoDepPerPage}
                  totalItems={autoDepTotalCount}
                  onPageChange={(p) => {
                    setAutoDepPage(p);
                    fetchReportAutoDeposit(autoDepDate, p, autoDepPerPage, autoDepSearch);
                  }}
                  onPageSizeChange={(sz) => {
                    setAutoDepPerPage(sz);
                    setAutoDepPage(1);
                    fetchReportAutoDeposit(autoDepDate, 1, sz, autoDepSearch);
                  }}
                  itemName="auto deposits"
                />
              </div>
            </div>
          )}

          {/* VIEW: REPORT MANAGEMENT - ADD FUND REPORT */}
          {activeTab === 'report_add_fund' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#495057', textTransform: 'uppercase', fontWeight: '700' }}>
                  Add Fund Report
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#74788d' }}>
                  Report Management / <span style={{ color: '#556ee6' }}>Add Fund Report</span>
                </div>
              </div>

              {/* Date Filter Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #eff2f7', marginBottom: '20px' }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAddFundRepPage(1);
                    fetchAddFundReport(addFundRepDate, 1, addFundRepPerPage, addFundRepSearch);
                  }}
                  style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: '180px', maxWidth: '240px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Date</label>
                    <input
                      type="date"
                      value={addFundRepDate}
                      onChange={(e) => setAddFundRepDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '220px', maxWidth: '300px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>Search Phone / Name</label>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={addFundRepSearch}
                      onChange={(e) => setAddFundRepSearch(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addFundRepLoading}
                    style={{ backgroundColor: '#34c38f', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {addFundRepLoading ? 'Loading...' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddFundRepDate('');
                      setAddFundRepSearch('');
                      setAddFundRepPage(1);
                      fetchAddFundReport('', 1, addFundRepPerPage, '');
                    }}
                    style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '4px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                </form>
              </div>

              {/* Data Table Card */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #eff2f7', boxShadow: '0 0.75rem 1.5rem rgba(18,38,63,.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>Add Fund List</h5>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>S.No.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>User Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Phone Number</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Amount</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#495057' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addFundRepList.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                          <td style={{ padding: '10px 12px' }}>{(addFundRepPage - 1) * addFundRepPerPage + idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetails(item.user_id || item.phone_number || item.user_name)}
                              title="Click to view user details"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                font: 'inherit',
                                color: '#556ee6',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <span>{item.user_name || item.phone_number}</span>
                              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>🔗</span>
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{item.phone_number}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#28a745' }}>₹ {item.amount}</td>
                          <td style={{ padding: '10px 12px' }}>{item.date}</td>
                        </tr>
                      ))}
                      {addFundRepList.length === 0 && !addFundRepLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>No Report Found</td></tr>
                      )}
                      {addFundRepLoading && (
                        <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#556ee6' }}>Loading Add Fund Report...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Server-Side Pagination Bar */}
                <PaginationBar
                  currentPage={addFundRepPage}
                  pageSize={addFundRepPerPage}
                  totalItems={addFundRepTotalCount}
                  onPageChange={(p) => {
                    setAddFundRepPage(p);
                    fetchAddFundReport(addFundRepDate, p, addFundRepPerPage, addFundRepSearch);
                  }}
                  onPageSizeChange={(sz) => {
                    setAddFundRepPerPage(sz);
                    setAddFundRepPage(1);
                    fetchAddFundReport(addFundRepDate, 1, sz, addFundRepSearch);
                  }}
                  itemName="records"
                />
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Edit Bid Modal */}
      {editBidModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 12000,
          padding: '16px'
        }}>
          <div style={{ backgroundColor: '#ffffff', color: '#495057', width: '100%', maxWidth: '480px', borderRadius: '10px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #eff2f7', paddingBottom: '12px' }}>
              <div>
                <h5 style={{ margin: 0, color: '#343a40', fontWeight: 'bold', fontSize: '1.1rem' }}>Update Bid (#{editBidModal.id})</h5>
                <span style={{ fontSize: '0.78rem', color: '#74788d' }}>
                  {editBidModal.game_name} • {editBidModal.game_type} • Session: {editBidModal.session || 'Open'}
                </span>
              </div>
              <span
                style={{ cursor: 'pointer', fontSize: '1.4rem', color: '#74788d', lineHeight: 1 }}
                onClick={() => {
                  setEditBidModal(null);
                  setShowEditOpenPanaDropdown(false);
                  setShowEditOpenDigitDropdown(false);
                  setShowEditClosePanaDropdown(false);
                  setShowEditCloseDigitDropdown(false);
                }}
              >
                ✕
              </span>
            </div>

            <form onSubmit={handleUpdateBid}>
              {/* Row 1: Open Pana & Open Result Digit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Open Pana with Search Dropdown */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Open Pana (3 Digits)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search / Enter Pana"
                      value={editBidForm.open_pana}
                      onFocus={() => setShowEditOpenPanaDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditOpenPanaDropdown(false), 220)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const digitsOnly = val.replace(/\D/g, '').slice(0, 3);
                        setEditBidForm(prev => ({
                          ...prev,
                          open_pana: val,
                          open_digit: digitsOnly.length === 3 ? getPanaSingleDigit(digitsOnly) : prev.open_digit
                        }));
                        setShowEditOpenPanaDropdown(true);
                      }}
                      style={{ width: '100%', padding: '9px 28px 9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', outline: 'none' }}
                    />
                    <span
                      onClick={() => setShowEditOpenPanaDropdown(!showEditOpenPanaDropdown)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.75rem', color: '#74788d' }}
                    >
                      ▼
                    </span>
                  </div>

                  {showEditOpenPanaDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '190px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid #ced4da',
                      borderRadius: '0 0 6px 6px',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                      zIndex: 100
                    }}>
                      <div
                        onMouseDown={() => {
                          setEditBidForm(prev => ({ ...prev, open_pana: 'NA' }));
                          setShowEditOpenPanaDropdown(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: editBidForm.open_pana === 'NA' ? '#eff2f7' : '#ffffff',
                          fontWeight: 'bold',
                          color: '#e02d1b'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editBidForm.open_pana === 'NA' ? '#eff2f7' : '#ffffff'}
                      >
                        ✕ NA (Not Applicable / Clear)
                      </div>
                      {ALL_PANAS_220.filter(p => !editBidForm.open_pana || editBidForm.open_pana === 'NA' || p.includes(editBidForm.open_pana)).slice(0, 60).map(p => {
                        const digit = getPanaSingleDigit(p);
                        return (
                          <div
                            key={p}
                            onMouseDown={() => {
                              setEditBidForm(prev => ({
                                ...prev,
                                open_pana: p,
                                open_digit: digit || prev.open_digit
                              }));
                              setShowEditOpenPanaDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f0f0f0',
                              backgroundColor: editBidForm.open_pana === p ? '#eef2ff' : '#ffffff'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editBidForm.open_pana === p ? '#eef2ff' : '#ffffff'}
                          >
                            <span><strong>Pana:</strong> {p}</span>
                            <span style={{ color: '#556ee6', fontWeight: 'bold', backgroundColor: '#eff2f7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                              Digit: {digit}
                            </span>
                          </div>
                        );
                      })}
                      {ALL_PANAS_220.filter(p => !editBidForm.open_pana || editBidForm.open_pana === 'NA' || p.includes(editBidForm.open_pana)).length === 0 && (
                        <div style={{ padding: '10px', fontSize: '0.82rem', color: '#74788d', textAlign: 'center' }}>
                          No matching Pana found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Open Result Digit with Search Dropdown */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Open Result Digit (0-9)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Select Digit"
                      value={editBidForm.open_digit}
                      onFocus={() => setShowEditOpenDigitDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditOpenDigitDropdown(false), 220)}
                      onChange={(e) => {
                        setEditBidForm({ ...editBidForm, open_digit: e.target.value });
                        setShowEditOpenDigitDropdown(true);
                      }}
                      style={{ width: '100%', padding: '9px 28px 9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', outline: 'none' }}
                    />
                    <span
                      onClick={() => setShowEditOpenDigitDropdown(!showEditOpenDigitDropdown)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.75rem', color: '#74788d' }}
                    >
                      ▼
                    </span>
                  </div>

                  {showEditOpenDigitDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '190px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid #ced4da',
                      borderRadius: '0 0 6px 6px',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                      zIndex: 100
                    }}>
                      {['NA', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].filter(d => !editBidForm.open_digit || d.toLowerCase().includes(String(editBidForm.open_digit).toLowerCase())).map(d => (
                        <div
                          key={d}
                          onMouseDown={() => {
                            setEditBidForm(prev => ({ ...prev, open_digit: d }));
                            setShowEditOpenDigitDropdown(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: editBidForm.open_digit === d ? '#eef2ff' : '#ffffff',
                            color: d === 'NA' ? '#e02d1b' : '#343a40',
                            fontWeight: d === 'NA' ? 'bold' : 'normal'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editBidForm.open_digit === d ? '#eef2ff' : '#ffffff'}
                        >
                          <span><strong>Digit:</strong> {d}</span>
                          <span style={{ color: '#74788d', fontSize: '0.76rem' }}>{d === 'NA' ? 'Clear' : 'Select'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Close Pana & Close Result Digit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Close Pana with Search Dropdown */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Close Pana (3 Digits)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search / Enter Pana"
                      value={editBidForm.close_pana}
                      onFocus={() => setShowEditClosePanaDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditClosePanaDropdown(false), 220)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const digitsOnly = val.replace(/\D/g, '').slice(0, 3);
                        setEditBidForm(prev => ({
                          ...prev,
                          close_pana: val,
                          close_digit: digitsOnly.length === 3 ? getPanaSingleDigit(digitsOnly) : prev.close_digit
                        }));
                        setShowEditClosePanaDropdown(true);
                      }}
                      style={{ width: '100%', padding: '9px 28px 9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', outline: 'none' }}
                    />
                    <span
                      onClick={() => setShowEditClosePanaDropdown(!showEditClosePanaDropdown)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.75rem', color: '#74788d' }}
                    >
                      ▼
                    </span>
                  </div>

                  {showEditClosePanaDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '190px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid #ced4da',
                      borderRadius: '0 0 6px 6px',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                      zIndex: 100
                    }}>
                      <div
                        onMouseDown={() => {
                          setEditBidForm(prev => ({ ...prev, close_pana: 'NA' }));
                          setShowEditClosePanaDropdown(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: editBidForm.close_pana === 'NA' ? '#eff2f7' : '#ffffff',
                          fontWeight: 'bold',
                          color: '#e02d1b'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editBidForm.close_pana === 'NA' ? '#eff2f7' : '#ffffff'}
                      >
                        ✕ NA (Not Applicable / Clear)
                      </div>
                      {ALL_PANAS_220.filter(p => !editBidForm.close_pana || editBidForm.close_pana === 'NA' || p.includes(editBidForm.close_pana)).slice(0, 60).map(p => {
                        const digit = getPanaSingleDigit(p);
                        return (
                          <div
                            key={p}
                            onMouseDown={() => {
                              setEditBidForm(prev => ({
                                ...prev,
                                close_pana: p,
                                close_digit: digit || prev.close_digit
                              }));
                              setShowEditClosePanaDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f0f0f0',
                              backgroundColor: editBidForm.close_pana === p ? '#eef2ff' : '#ffffff'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editBidForm.close_pana === p ? '#eef2ff' : '#ffffff'}
                          >
                            <span><strong>Pana:</strong> {p}</span>
                            <span style={{ color: '#556ee6', fontWeight: 'bold', backgroundColor: '#eff2f7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                              Digit: {digit}
                            </span>
                          </div>
                        );
                      })}
                      {ALL_PANAS_220.filter(p => !editBidForm.close_pana || editBidForm.close_pana === 'NA' || p.includes(editBidForm.close_pana)).length === 0 && (
                        <div style={{ padding: '10px', fontSize: '0.82rem', color: '#74788d', textAlign: 'center' }}>
                          No matching Pana found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Close Result Digit with Search Dropdown */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Close Result Digit (0-9)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Select Digit"
                      value={editBidForm.close_digit}
                      onFocus={() => setShowEditCloseDigitDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditCloseDigitDropdown(false), 220)}
                      onChange={(e) => {
                        setEditBidForm({ ...editBidForm, close_digit: e.target.value });
                        setShowEditCloseDigitDropdown(true);
                      }}
                      style={{ width: '100%', padding: '9px 28px 9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', outline: 'none' }}
                    />
                    <span
                      onClick={() => setShowEditCloseDigitDropdown(!showEditCloseDigitDropdown)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.75rem', color: '#74788d' }}
                    >
                      ▼
                    </span>
                  </div>

                  {showEditCloseDigitDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '190px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid #ced4da',
                      borderRadius: '0 0 6px 6px',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                      zIndex: 100
                    }}>
                      {['NA', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].filter(d => !editBidForm.close_digit || d.toLowerCase().includes(String(editBidForm.close_digit).toLowerCase())).map(d => (
                        <div
                          key={d}
                          onMouseDown={() => {
                            setEditBidForm(prev => ({ ...prev, close_digit: d }));
                            setShowEditCloseDigitDropdown(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: editBidForm.close_digit === d ? '#eef2ff' : '#ffffff',
                            color: d === 'NA' ? '#e02d1b' : '#343a40',
                            fontWeight: d === 'NA' ? 'bold' : 'normal'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = editBidForm.close_digit === d ? '#eef2ff' : '#ffffff'}
                        >
                          <span><strong>Digit:</strong> {d}</span>
                          <span style={{ color: '#74788d', fontSize: '0.76rem' }}>{d === 'NA' ? 'Clear' : 'Select'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Points Action */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Points Action (₹) *
                </label>
                <input
                  type="number"
                  placeholder="Enter bid points"
                  value={editBidForm.points_action}
                  onChange={(e) => setEditBidForm({ ...editBidForm, points_action: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditBidModal(null);
                    setShowEditOpenPanaDropdown(false);
                    setShowEditOpenDigitDropdown(false);
                    setShowEditClosePanaDropdown(false);
                    setShowEditCloseDigitDropdown(false);
                  }}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#74788d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBidLoading}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#556ee6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
                >
                  {editBidLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ backgroundColor: '#ffffff', color: '#495057', width: '420px', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h5 style={{ margin: 0, color: '#343a40', fontWeight: 'bold', fontSize: '1.05rem' }}>Change Password</h5>
              <span style={{ cursor: 'pointer', fontSize: '1.3rem', color: '#74788d', lineHeight: 1 }} onClick={() => setShowPasswordModal(false)}>✕</span>
            </div>

            {passError && (
              <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '14px' }}>
                {passError}
              </div>
            )}
            {passMsg && (
              <div style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '14px' }}>
                {passMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Old Password</label>
                <input
                  type="password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="Enter Old Password"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '500', display: 'block', marginBottom: '6px' }}>New Password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Enter New Password"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', color: '#495057', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Confirm Password</label>
                <input
                  type="password"
                  value={retypePass}
                  onChange={(e) => setRetypePass(e.target.value)}
                  placeholder="Enter Confirm Password"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem', color: '#495057', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#556ee6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '11px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(85, 110, 230, 0.3)'
                }}
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bid Revert Confirmation Modal */}
      {showRevertConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ backgroundColor: '#ffffff', color: '#495057', width: '440px', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h5 style={{ margin: 0, color: '#343a40', fontWeight: 'bold', fontSize: '1.05rem' }}>Confirm Bid Revert</h5>
              <span style={{ cursor: 'pointer', fontSize: '1.3rem', color: '#74788d', lineHeight: 1 }} onClick={() => setShowRevertConfirmModal(false)}>✕</span>
            </div>

            <p style={{ margin: '0 0 20px 0', fontSize: '0.92rem', color: '#495057', lineHeight: 1.5 }}>
              Are you sure you want to clean and refund bid amount for <strong>{bidRevertGame || games[0]?.games_name}</strong> on <strong>{bidRevertDate}</strong>?
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowRevertConfirmModal(false)}
                style={{ padding: '9px 18px', backgroundColor: '#74788d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBidRevert}
                style={{ padding: '9px 18px', backgroundColor: '#f46a6a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >
                Yes, Clean &amp; Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Request Detail Modal */}
      {selectedWithdrawModal && (() => {
        const uData = modalUserData || {};
        const userName = uData.name || selectedWithdrawModal.user_name || selectedWithdrawModal.username || 'User';
        const userPhone = uData.phone || selectedWithdrawModal.username || selectedWithdrawModal.phone || 'N/A';
        const phonePay = uData.phonepay || uData.phonepe || uData.phonpe || selectedWithdrawModal.phonepay || selectedWithdrawModal.phonepe || selectedWithdrawModal.phonpe || '';
        const gPay = uData.googlepay || uData.gpay || selectedWithdrawModal.googlepay || selectedWithdrawModal.gpay || '';
        const paytm = uData.paytm || uData.upi_id || uData.upi || selectedWithdrawModal.paytm || selectedWithdrawModal.upi_id || selectedWithdrawModal.upi || '';
        const bankName = uData.bank_name || selectedWithdrawModal.bank_name || '';
        const holderName = uData.account_holder_name || selectedWithdrawModal.account_holder_name || '';
        const accNo = uData.account_number || selectedWithdrawModal.account_number || '';
        const ifsc = uData.ifsc_code || selectedWithdrawModal.ifsc_code || '';
        const branch = uData.branch_name || selectedWithdrawModal.branch_name || '';
        const walletBal = uData.wallet !== undefined ? uData.wallet : selectedWithdrawModal.wallet;

        const reqRemark = selectedWithdrawModal.remark || '';
        const isPhonePeReq = reqRemark.toLowerCase().includes('phonepe') || reqRemark.toLowerCase().includes('phonepay');
        const isGPayReq = reqRemark.toLowerCase().includes('gpay') || reqRemark.toLowerCase().includes('googlepay') || reqRemark.toLowerCase().includes('google pay');
        const isPaytmReq = reqRemark.toLowerCase().includes('paytm');

        const displayPhonePay = phonePay || (isPhonePeReq ? `${userPhone} (Registered Mobile)` : '');
        const displayGPay = gPay || (isGPayReq ? `${userPhone} (Registered Mobile)` : '');
        const displayPaytm = paytm || (isPaytmReq ? `${userPhone} (Registered Mobile)` : '');

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              color: '#333333',
              width: '520px',
              maxWidth: '92vw',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                <div>
                  <h5 style={{ margin: 0, color: '#1a202c', fontWeight: '800', fontSize: '1.1rem' }}>Withdraw Request Detail</h5>
                  <span style={{ fontSize: '0.78rem', color: '#718096' }}>Request #{selectedWithdrawModal.id}</span>
                </div>
                <span style={{ cursor: 'pointer', fontSize: '1.4rem', color: '#a0aec0', lineHeight: 1 }} onClick={() => setSelectedWithdrawModal(null)}>✕</span>
              </div>

              {modalUserLoading && (
                <div style={{ textAlign: 'center', padding: '6px', fontSize: '0.82rem', color: '#556ee6' }}>
                  Fetching live user payment details...
                </div>
              )}

              {/* Request Info Box */}
              <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.88rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                  <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>User Name:</strong> <span style={{ color: '#2d3748', fontWeight: '700' }}>{userName}</span></p>
                  <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>Mobile:</strong> <span style={{ color: '#2d3748', fontWeight: '700' }}>{userPhone}</span></p>
                  <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>Requested Amount:</strong> <span style={{ color: '#e53e3e', fontWeight: '800', fontSize: '1.05rem' }}>₹{selectedWithdrawModal.points}</span></p>
                  {walletBal !== undefined && (
                    <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>Wallet Balance:</strong> <span style={{ color: '#38a169', fontWeight: '700' }}>₹{walletBal}</span></p>
                  )}
                  <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>Date:</strong> <span style={{ color: '#2d3748' }}>{selectedWithdrawModal.date}</span></p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#4a5568' }}>Status: </strong>
                    {(selectedWithdrawModal.status === '1' || selectedWithdrawModal.status === 1) && (
                      <span style={{ backgroundColor: '#c6f6d5', color: '#22543d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Accepted</span>
                    )}
                    {(selectedWithdrawModal.status === '0' || selectedWithdrawModal.status === 0) && (
                      <span style={{ backgroundColor: '#feebc8', color: '#744210', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Pending</span>
                    )}
                    {(selectedWithdrawModal.status === '-1' || selectedWithdrawModal.status === -1) && (
                      <span style={{ backgroundColor: '#fed7d7', color: '#742a2a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Rejected</span>
                    )}
                  </p>
                </div>
                {selectedWithdrawModal.remark && (
                  <p style={{ margin: '8px 0 0 0', borderTop: '1px dashed #cbd5e0', paddingTop: '6px' }}>
                    <strong style={{ color: '#4a5568' }}>Remark / Method:</strong> <span style={{ color: '#2b6cb0', fontWeight: '600' }}>{selectedWithdrawModal.remark}</span>
                  </p>
                )}
              </div>

              {/* Bank & UPI Payment Details Box */}
              <div style={{ backgroundColor: '#edf2f7', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e0', marginBottom: '18px', fontSize: '0.85rem' }}>
                <h6 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#1a202c', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💳 User Payout & Payment Details
                </h6>

                {/* UPI Section */}
                <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', color: '#2b6cb0', marginBottom: '6px', fontSize: '0.82rem' }}>⚡ UPI Payment IDs</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#4a5568' }}>PhonePe:</strong>
                      <span style={{ fontWeight: '700', color: displayPhonePay ? '#2b6cb0' : '#a0aec0' }}>
                        {displayPhonePay || 'Not Added'}
                      </span>
                    </p>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#4a5568' }}>Google Pay:</strong>
                      <span style={{ fontWeight: '700', color: displayGPay ? '#2b6cb0' : '#a0aec0' }}>
                        {displayGPay || 'Not Added'}
                      </span>
                    </p>
                    <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#4a5568' }}>Paytm:</strong>
                      <span style={{ fontWeight: '700', color: displayPaytm ? '#2b6cb0' : '#a0aec0' }}>
                        {displayPaytm || 'Not Added'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Bank Account Details Section */}
                <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '700', color: '#2c5282', marginBottom: '6px', fontSize: '0.82rem' }}>🏦 Bank Account Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>Bank Name:</strong> {bankName || 'Not Added'}</p>
                    <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>A/C Holder:</strong> {holderName || 'Not Added'}</p>
                    <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>A/C Number:</strong> <span style={{ fontFamily: 'monospace', color: '#3182ce', fontWeight: 'bold' }}>{accNo || 'Not Added'}</span></p>
                    <p style={{ margin: 0 }}><strong style={{ color: '#4a5568' }}>IFSC Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{ifsc || 'Not Added'}</span></p>
                    <p style={{ margin: 0, gridColumn: '1 / -1' }}><strong style={{ color: '#4a5568' }}>Branch:</strong> {branch || 'Not Added'}</p>
                  </div>
                </div>
              </div>

              {(selectedWithdrawModal.status === '0' || selectedWithdrawModal.status === 0) ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleWithRequestAction(selectedWithdrawModal.id, 'approve')}
                    style={{ flex: 1, padding: '12px', backgroundColor: '#38a169', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}
                  >
                    ✓ Approve Payout
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWithRequestAction(selectedWithdrawModal.id, 'reject')}
                    style={{ flex: 1, padding: '12px', backgroundColor: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}
                  >
                    ✕ Reject & Refund
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawModal(null)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#4a5568', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Add Game Modal (PHP game-name.php parity) */}
      {showAddGameModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ backgroundColor: '#ffffff', color: '#495057', width: '480px', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h5 style={{ margin: 0, color: '#343a40', fontWeight: 'bold', fontSize: '1.05rem' }}>Add Game</h5>
              <span
                style={{ cursor: 'pointer', fontSize: '1.3rem', color: '#74788d', lineHeight: 1 }}
                onClick={() => { setShowAddGameModal(false); setAddGameError(''); setAddGameSuccess(''); }}
              >
                ✕
              </span>
            </div>

            {addGameError && (
              <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '12px' }}>
                ⚠️ {addGameError}
              </div>
            )}
            {addGameSuccess && (
              <div style={{ backgroundColor: '#def7ec', color: '#03543f', border: '1px solid #bcf0da', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '12px' }}>
                ✓ {addGameSuccess}
              </div>
            )}

            <form onSubmit={handleAddGameSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                  Game Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Game Name (e.g. KALYAN)"
                  value={newGameForm.game_name}
                  onChange={(e) => setNewGameForm({ ...newGameForm, game_name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                    Open Time
                  </label>
                  <input
                    type="time"
                    value={newGameForm.open_time}
                    onChange={(e) => setNewGameForm({ ...newGameForm, open_time: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                    Close Time
                  </label>
                  <input
                    type="time"
                    value={newGameForm.close_time}
                    onChange={(e) => setNewGameForm({ ...newGameForm, close_time: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddGameModal(false); setAddGameError(''); setAddGameSuccess(''); }}
                  style={{ padding: '8px 18px', backgroundColor: '#74788d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addGameLoading}
                  style={{ padding: '8px 20px', backgroundColor: '#556ee6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {addGameLoading ? 'Adding...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Game Week Schedule Modal (PHP edit-week-game.php parity) */}
      {editWeekModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            padding: '24px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h5 style={{ margin: 0, color: '#343a40', fontWeight: 'bold', fontSize: '1.05rem' }}>
                Edit Game Time - {editWeekModal.game_name}
              </h5>
              <span
                style={{ cursor: 'pointer', fontSize: '1.3rem', color: '#74788d', lineHeight: 1 }}
                onClick={() => setEditWeekModal(null)}
              >
                ✕
              </span>
            </div>

            <form onSubmit={handleSaveWeekSchedule} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '4px' }}>
                  Game Name
                </label>
                <input
                  type="text"
                  value={editWeekModal.game_name}
                  readOnly
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', backgroundColor: '#e9ecef', fontWeight: 'bold', color: '#343a40' }}
                />
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '55vh', paddingRight: '6px', marginBottom: '16px' }}>
                {editWeekModal.days.map((dayItem, idx) => (
                  <div key={dayItem.day} style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '12px', marginBottom: '10px', backgroundColor: '#f8f9fa' }}>
                    <div style={{ fontWeight: '700', color: '#343a40', marginBottom: '8px', fontSize: '0.88rem' }}>
                      {dayItem.day}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>Open Time</label>
                        <input
                          type="time"
                          value={dayItem.open_time_24 || ''}
                          onChange={(e) => {
                            const updated = [...editWeekModal.days];
                            updated[idx] = { ...updated[idx], open_time_24: e.target.value };
                            setEditWeekModal({ ...editWeekModal, days: updated });
                          }}
                          required
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>Close Time</label>
                        <input
                          type="time"
                          value={dayItem.close_time_24 || ''}
                          onChange={(e) => {
                            const updated = [...editWeekModal.days];
                            updated[idx] = { ...updated[idx], close_time_24: e.target.value };
                            setEditWeekModal({ ...editWeekModal, days: updated });
                          }}
                          required
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: '#74788d', display: 'block', marginBottom: '4px' }}>Status</label>
                        <select
                          value={String(dayItem.status)}
                          onChange={(e) => {
                            const updated = [...editWeekModal.days];
                            updated[idx] = { ...updated[idx], status: e.target.value };
                            setEditWeekModal({ ...editWeekModal, days: updated });
                          }}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.85rem', backgroundColor: '#fff' }}
                        >
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #eff2f7' }}>
                <button
                  type="button"
                  onClick={() => setEditWeekModal(null)}
                  style={{ padding: '8px 18px', backgroundColor: '#74788d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editWeekSaving}
                  style={{ padding: '8px 22px', backgroundColor: '#34c38f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {editWeekSaving ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Slider Image Modal */}
      {showAddSliderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h5 style={{ margin: 0, color: '#343a40', fontWeight: 'bold', fontSize: '1.05rem' }}>
                Add Slider Image
              </h5>
              <span
                style={{ cursor: 'pointer', fontSize: '1.3rem', color: '#74788d', lineHeight: 1 }}
                onClick={() => setShowAddSliderModal(false)}
              >
                ✕
              </span>
            </div>

            <form onSubmit={handleAddSliderSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                  Select Slider Image File *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFilePick(e, (base64) => setNewSliderForm(prev => ({ ...prev, slider_image: base64 })))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      fontSize: '0.85rem',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer'
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Or enter image URL / filename (e.g. banner.jpg)"
                    value={newSliderForm.slider_image}
                    onChange={(e) => setNewSliderForm({ ...newSliderForm, slider_image: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.82rem', color: '#495057' }}
                  />

                  {newSliderForm.slider_image && (
                    <div style={{ marginTop: '4px', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px dashed #ced4da' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#74788d', fontWeight: 'bold' }}>Image Preview:</p>
                      <img
                        src={
                          newSliderForm.slider_image.startsWith('http://') || newSliderForm.slider_image.startsWith('https://') || newSliderForm.slider_image.startsWith('data:')
                            ? newSliderForm.slider_image
                            : newSliderForm.slider_image.startsWith('/')
                            ? newSliderForm.slider_image
                            : `/uploads/${newSliderForm.slider_image}`
                        }
                        alt="Slider Preview"
                        style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
                        onError={(e) => {
                          if (!e.target.dataset.triedFallback && !newSliderForm.slider_image.startsWith('http') && !newSliderForm.slider_image.startsWith('data:')) {
                            e.target.dataset.triedFallback = 'true';
                            e.target.src = `/${newSliderForm.slider_image.replace(/^\//, '')}`;
                          } else {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#495057', display: 'block', marginBottom: '6px' }}>
                  Display Order
                </label>
                <input
                  type="number"
                  placeholder="Enter Image Display Order"
                  value={newSliderForm.display_order}
                  onChange={(e) => setNewSliderForm({ ...newSliderForm, display_order: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #eff2f7' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNewSliderForm({ slider_image: '', display_order: '1' });
                    setShowAddSliderModal(false);
                  }}
                  style={{ padding: '8px 18px', backgroundColor: '#74788d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSliderLoading}
                  style={{ padding: '8px 22px', backgroundColor: '#556ee6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {addSliderLoading ? 'Adding...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WINNER PREVIEW MODAL */}
      {showWinnerPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 10500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eff2f7', paddingBottom: '12px' }}>
              <div>
                <h5 style={{ margin: 0, fontSize: '1.15rem', color: '#343a40', fontWeight: '700' }}>
                  🏆 Winner Preview - {declareSelectedGame || (games[0]?.games_name || '')} ({declareSession.toUpperCase()})
                </h5>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#74788d' }}>
                  Date: {declareDate} | Pana: {declareSession === 'open' ? declareOpenPana : declareClosePana} | Digit: {declareSession === 'open' ? declareOpenResult : declareCloseResult}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWinnerPreviewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#74788d' }}
              >
                ✕
              </button>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 'bold' }}>TOTAL WINNING USERS</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: '#3730a3', fontWeight: '800' }}>
                  {previewWinnersData.totalWinners}
                </h3>
              </div>
              <div style={{ backgroundColor: '#def7ec', border: '1px solid #bcf0da', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#03543f', fontWeight: 'bold' }}>ESTIMATED TOTAL PAYOUT</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: '#046c4e', fontWeight: '800' }}>
                  ₹ {previewWinnersData.totalPayout}
                </h3>
              </div>
            </div>

            {/* Winners Table */}
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eff2f7', textAlign: 'left' }}>
                    <th style={{ padding: '10px', color: '#495057' }}>User Details</th>
                    <th style={{ padding: '10px', color: '#495057' }}>Win Type</th>
                    <th style={{ padding: '10px', color: '#495057', textAlign: 'center' }}>Bid Points</th>
                    <th style={{ padding: '10px', color: '#495057', textAlign: 'center' }}>Rate</th>
                    <th style={{ padding: '10px', color: '#495057', textAlign: 'center' }}>Estimated Win Amount</th>
                    <th style={{ padding: '10px', color: '#495057', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {previewWinnersData.winners.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#74788d' }}>
                        No winning bids found for this result selection.
                      </td>
                    </tr>
                  ) : (
                    previewWinnersData.winners.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid #eff2f7' }}>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ color: '#343a40' }}>{w.user_fullname || w.username}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#74788d' }}>📞 {w.username}</div>
                        </td>
                        <td style={{ padding: '10px', fontWeight: '600', color: '#556ee6' }}>{w.winType || w.game_type}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>₹ {w.points_action}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#74788d' }}>1 : {w.rate}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#10b981', fontSize: '0.95rem' }}>
                          ₹ {w.winAmount}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditBidModal(w);
                                setEditBidForm({
                                  open_pana: w.open_pana || '',
                                  open_digit: w.open_digit || '',
                                  close_pana: w.close_pana || '',
                                  close_digit: w.close_digit || '',
                                  points_action: w.points_action || ''
                                });
                              }}
                              style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#556ee6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ✏️ Edit Bid
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBidInPreview(w.id)}
                              style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowWinnerPreviewModal(false)}
                style={{ padding: '9px 18px', backgroundColor: '#74788d', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWinnerPreviewModal(false);
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }}
                style={{ padding: '9px 20px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✓ CONFIRM & DECLARE RESULT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Timeout Warning Modal */}
      {warning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: warning.type === 'inactivity' ? '#fef3c7' : '#fee2e2',
              color: warning.type === 'inactivity' ? '#d97706' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px auto'
            }}>
              {warning.type === 'inactivity' ? '⏱️' : '🔒'}
            </div>

            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              {warning.type === 'inactivity'
                ? 'Session Inactivity Warning'
                : '1-Hour Session Expiry Warning'}
            </h3>

            <p style={{
              margin: '0 0 20px 0',
              fontSize: '0.92rem',
              color: '#4b5563',
              lineHeight: '1.5'
            }}>
              {warning.type === 'inactivity' ? (
                <>You have been inactive for almost 30 minutes. Your session will automatically log out in <strong style={{ color: '#d97706', fontSize: '1.05rem' }}>{warning.secondsLeft}s</strong> unless you stay active.</>
              ) : (
                <>Your admin session is reaching the maximum 1-hour limit in <strong style={{ color: '#dc2626', fontSize: '1.05rem' }}>{warning.secondsLeft}s</strong>. Please finish and save your work.</>
              )}
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              {warning.type === 'inactivity' && (
                <button
                  type="button"
                  onClick={extendInactivity}
                  style={{
                    padding: '10px 22px',
                    backgroundColor: '#556ee6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(85, 110, 230, 0.3)'
                  }}
                >
                  Stay Logged In
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Log Out Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
