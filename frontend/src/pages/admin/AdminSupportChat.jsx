import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Phone, 
  PhoneCall, 
  User, 
  Check, 
  CheckCheck, 
  Clock, 
  RefreshCw, 
  ArrowLeft, 
  Wallet,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Trash2,
  Play,
  Pause,
  Download,
  FileText,
  X,
  Maximize2,
  UserPlus,
  Users
} from 'lucide-react';
import api from '../../utils/api';
import chatSocket from '../../utils/chatSocket';
import { formatDisplayDateTime } from '../../utils/indianTime';

const QUICK_REPLIES = [
  "Hello! Welcome to Kalyan Matka Support. How can I assist you today?",
  "Your deposit is being verified and will be credited to your wallet in 5-10 minutes.",
  "Please share your registered mobile number and 12-digit UTR screenshot.",
  "Withdrawal requests are processed promptly between 10:00 AM and 06:00 PM.",
  "Thank you for contacting Kalyan Matka Support. Have a great day!"
];

// Inline Audio Player Component for Admin View
const AdminAudioPlayer = ({ src, isAdminMsg }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', minWidth: '220px' }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          backgroundColor: isAdminMsg ? '#ffffff' : '#556ee6',
          color: isAdminMsg ? '#556ee6' : '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration > 0) {
              audioRef.current.currentTime = clickPos * duration;
            }
          }}
          style={{
            height: '6px',
            backgroundColor: isAdminMsg ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.12)',
            borderRadius: '4px',
            cursor: 'pointer',
            overflow: 'hidden'
          }}
        >
          <div style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: isAdminMsg ? '#ffffff' : '#556ee6',
            borderRadius: '4px',
            transition: 'width 0.1s linear'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginTop: '3px', opacity: 0.8 }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

const AdminSupportChat = ({ isMobile }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread'
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isPlayerTyping, setIsPlayerTyping] = useState(false);
  const [socketStatus, setSocketStatus] = useState('connecting');

  // File Picker state
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, size, base64 }
  const [previewImage, setPreviewImage] = useState(null); // lightbox
  const fileInputRef = useRef(null);

  // Audio Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const cancelRecordingRef = useRef(false);

  // New Conversation Search Modal
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [loadingUserSearch, setLoadingUserSearch] = useState(false);

  // Mobile view toggle (conversation list vs chat view)
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  // Dynamic responsive viewport tracking
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Single column toggle on small mobile screens (< 768px). Split side-by-side on tablets & desktops (>= 768px).
  const isMobileLayout = Boolean(isMobile || windowWidth < 768);
  const isTinyScreen = Boolean(windowWidth <= 480);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedUserRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // 1. Fetch Chat History for Selected User
  const fetchHistory = useCallback(async (phone, quiet = false) => {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone) return;

    if (!quiet) setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/admin/history/${cleanPhone}`);
      if (res.data?.success === '1' && Array.isArray(res.data.data)) {
        setMessages(prev => {
          // Preserve any temp/optimistic messages that haven't appeared in DB yet
          const pendingOptimistic = prev.filter(m => 
            String(m.id).startsWith('temp_') &&
            !res.data.data.some(saved => saved.message === m.message && saved.sender_type === m.sender_type)
          );
          return [...res.data.data, ...pendingOptimistic];
        });
        setTimeout(() => scrollToBottom(false), 50);

        // Update local conversation unread count to 0
        setConversations(prev => prev.map(c => 
          String(c.user_phone).replace(/\D/g, '') === cleanPhone ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (err) {
      console.error('[AdminSupportChat] Error fetching history:', err);
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, []);

  // 2. Fetch Conversations List
  const fetchConversations = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingConversations(true);
    try {
      const res = await api.get('/chat/admin/conversations');
      if (res.data?.success === '1' && Array.isArray(res.data.data)) {
        setConversations(res.data.data);
        // On desktop/tablet (>= 768px), auto-select first conversation if none selected
        if (res.data.data.length > 0 && !selectedUserRef.current && typeof window !== 'undefined' && window.innerWidth >= 768) {
          const first = res.data.data[0];
          setSelectedUser(first);
          fetchHistory(first.user_phone, true);
        }
      }
    } catch (err) {
      console.error('[AdminSupportChat] Error fetching conversations:', err);
    } finally {
      if (!quiet) setLoadingConversations(false);
    }
  }, [fetchHistory]);

  // 3. Initialize WebSocket and Subscriptions
  useEffect(() => {
    chatSocket.init({ role: 'admin', name: 'Support Admin' });

    const unsubStatus = chatSocket.onStatus((status) => {
      setSocketStatus(status);
    });

    const unsubMessage = chatSocket.onMessage((newMsg, tempId) => {
      if (!newMsg) return;

      const currentSelected = selectedUserRef.current;
      const msgPhone = String(newMsg.user_phone).replace(/\D/g, '');
      const activeCleanPhone = currentSelected?.user_phone ? String(currentSelected.user_phone).replace(/\D/g, '') : null;

      // Update conversation list item
      setConversations(prev => {
        const index = prev.findIndex(c => String(c.user_phone).replace(/\D/g, '') === msgPhone);
        const isCurrentActive = activeCleanPhone && activeCleanPhone === msgPhone;
        const unreadAdd = (!isCurrentActive && newMsg.sender_type === 'user') ? 1 : 0;

        if (index !== -1) {
          const updatedConv = {
            ...prev[index],
            last_message: newMsg.message,
            last_message_type: newMsg.message_type,
            last_sender: newMsg.sender_type,
            last_time: newMsg.created_at || new Date().toISOString(),
            unread_count: isCurrentActive ? 0 : (Number(prev[index].unread_count || 0) + unreadAdd)
          };
          const next = [...prev];
          next.splice(index, 1);
          return [updatedConv, ...next];
        } else {
          const newConv = {
            user_phone: msgPhone,
            user_name: newMsg.sender_name || 'Player',
            last_message: newMsg.message,
            last_message_type: newMsg.message_type,
            last_sender: newMsg.sender_type,
            last_time: newMsg.created_at || new Date().toISOString(),
            unread_count: isCurrentActive ? 0 : 1,
            wallet_balance: 0
          };
          return [newConv, ...prev];
        }
      });

      // If incoming message belongs to active user
      if (activeCleanPhone && activeCleanPhone === msgPhone) {
        setMessages(prev => {
          // Check if already in list by id
          if (prev.some(m => m.id && m.id === newMsg.id)) return prev;

          // Check if it replaces an optimistic message by tempId
          if (tempId && prev.some(m => m.id === tempId)) {
            return prev.map(m => m.id === tempId ? newMsg : m);
          }

          // Check if it replaces an optimistic message by sender & text
          const optIndex = prev.findIndex(m => 
            String(m.id).startsWith('temp_') && 
            m.sender_type === newMsg.sender_type && 
            m.message === newMsg.message
          );
          if (optIndex !== -1) {
            const next = [...prev];
            next[optIndex] = newMsg;
            return next;
          }

          return [...prev, newMsg];
        });

        if (newMsg.sender_type === 'user') {
          chatSocket.markRead(msgPhone);
        }
        setTimeout(() => scrollToBottom(true), 50);
      }
    });

    const unsubTyping = chatSocket.onTyping((typingEvent) => {
      const currentSelected = selectedUserRef.current;
      if (currentSelected && String(currentSelected.user_phone) === String(typingEvent.phone)) {
        if (typingEvent.sender_type === 'user') {
          setIsPlayerTyping(!!typingEvent.isTyping);
          if (typingEvent.isTyping) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsPlayerTyping(false);
            }, 3500);
          }
        }
      }
    });

    const unsubRead = chatSocket.onRead((readEvent) => {
      const currentSelected = selectedUserRef.current;
      if (currentSelected && String(currentSelected.user_phone) === String(readEvent.phone)) {
        if (readEvent.reader === 'user') {
          setMessages(prev => prev.map(m => m.sender_type === 'admin' ? { ...m, is_read: 1 } : m));
        }
      }
    });

    fetchConversations();

    // 15s poll interval for resilience
    const pollInterval = setInterval(() => {
      fetchConversations(true);
      if (selectedUserRef.current) {
        fetchHistory(selectedUserRef.current.user_phone, true);
      }
    }, 15000);

    return () => {
      unsubStatus();
      unsubMessage();
      unsubTyping();
      unsubRead();
      clearInterval(pollInterval);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [fetchConversations, fetchHistory]);

  // Handle Conversation Selection
  const handleSelectConversation = (conv) => {
    setSelectedUser(conv);
    setIsPlayerTyping(false);
    setSelectedFile(null);
    fetchHistory(conv.user_phone);
    if (isMobileLayout) {
      setMobileView('chat');
    }
  };

  // File Selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Selected file is too large. Please select under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        size: (file.size / 1024).toFixed(1) + ' KB',
        base64: reader.result
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Microphone Voice Recording Handlers
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleSendVoiceNote(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Please allow microphone permissions to record voice messages.');
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      cancelRecordingRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      cancelRecordingRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleSendVoiceNote = async (audioBlob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setSending(true);
      try {
        const uploadRes = await chatSocket.uploadFile(base64Data, `admin_voice_${Date.now()}.webm`, 'audio');
        const fileUrl = uploadRes?.url || base64Data;

        await handleSendMessage('', {
          message_type: 'audio',
          attachment_url: fileUrl,
          file_name: `Voice Note (${recordingTime}s)`
        });
      } catch (err) {
        console.error('Voice send error:', err);
      } finally {
        setSending(false);
      }
    };
  };

  // Handle Send Message
  const handleSendMessage = async (customText = null, customPayload = null) => {
    const text = (customText !== null ? customText : inputText).trim();
    if (!selectedUser || sending) return;

    let msgType = customPayload?.message_type || (selectedFile ? selectedFile.type : 'text');
    let attachmentUrl = customPayload?.attachment_url || null;
    let fileName = customPayload?.file_name || (selectedFile ? selectedFile.name : null);

    if (!text && !attachmentUrl && !selectedFile) return;

    setSending(true);
    if (customText === null) {
      setInputText('');
    }

    // Upload selected file if any
    if (selectedFile && !attachmentUrl) {
      const uploadRes = await chatSocket.uploadFile(selectedFile.base64, selectedFile.name, selectedFile.type);
      attachmentUrl = uploadRes?.url || selectedFile.base64;
      fileName = selectedFile.name;
      msgType = selectedFile.type;
      setSelectedFile(null);
    }

    const cleanTargetPhone = String(selectedUser?.user_phone || '').replace(/\D/g, '');
    if (!cleanTargetPhone) {
      setSending(false);
      return;
    }

    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      id: tempId,
      user_phone: cleanTargetPhone,
      sender_type: 'admin',
      sender_name: 'Support Admin',
      message: text || (msgType === 'image' ? '📷 Photo' : (msgType === 'audio' ? '🎤 Voice Message' : '📎 Attachment')),
      message_type: msgType,
      attachment_url: attachmentUrl,
      file_name: fileName,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await chatSocket.sendMessage({
        message: text,
        message_type: msgType,
        attachment_url: attachmentUrl,
        file_name: fileName,
        phone: cleanTargetPhone,
        sender_name: 'Support Admin',
        tempId: tempId
      });

      if (res && res.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? res : m));
      }

      // Update conversation list locally
      setConversations(prev => {
        const index = prev.findIndex(c => String(c.user_phone).replace(/\D/g, '') === cleanTargetPhone);
        if (index !== -1) {
          const updated = {
            ...prev[index],
            last_message: text || (msgType === 'image' ? '📷 Photo' : (msgType === 'audio' ? '🎤 Voice Message' : '📎 Attachment')),
            last_message_type: msgType,
            last_sender: 'admin',
            last_time: new Date().toISOString()
          };
          const next = [...prev];
          next.splice(index, 1);
          return [updated, ...next];
        }
        return prev;
      });
    } catch (err) {
      console.error('[AdminSupportChat] Send error:', err);
    } finally {
      setSending(false);
    }
  };

  // Debounced typing
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (selectedUser) {
      chatSocket.sendTyping(val.length > 0, selectedUser.user_phone);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Search registered users for starting a new chat
  const handleSearchUsers = async (query) => {
    setUserSearchText(query);
    setLoadingUserSearch(true);
    try {
      const res = await api.get(`/chat/admin/search-users?q=${encodeURIComponent(query)}`);
      if (res.data?.success === '1' && Array.isArray(res.data.data)) {
        setUserSearchResults(res.data.data);
      }
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setLoadingUserSearch(false);
    }
  };

  const handleStartChatWithUser = (u) => {
    setShowUserSearchModal(false);
    const conv = {
      user_phone: u.phone,
      user_name: u.name || 'Player',
      wallet_balance: u.wallet || 0,
      unread_count: 0,
      last_message: '',
      last_time: new Date().toISOString()
    };
    handleSelectConversation(conv);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = 
      (c.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.user_phone || '').includes(searchQuery);

    if (!matchesSearch) return false;
    if (filterType === 'unread') return Number(c.unread_count || 0) > 0;
    return true;
  });

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (Number(c.unread_count || 0) > 0 ? 1 : 0), 0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Hidden File Picker Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx"
        style={{ display: 'none' }}
      />

      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobileLayout ? '8px' : '12px',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ minWidth: isMobileLayout ? 'auto' : '220px' }}>
          <h4 style={{ margin: 0, fontSize: isMobileLayout ? '1.05rem' : '1.2rem', color: '#1e293b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={isMobileLayout ? 18 : 20} style={{ color: '#4f46e5' }} />
            Live Support Chat
          </h4>
          {!isMobileLayout && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Real-time support messages, player inquiry handling, attachments & instant replies.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Socket Connection Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '16px',
            fontSize: '0.72rem',
            fontWeight: '600',
            background: socketStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: socketStatus === 'connected' ? '#059669' : '#dc2626',
            border: `1px solid ${socketStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: socketStatus === 'connected' ? '#10b981' : '#ef4444',
              boxShadow: socketStatus === 'connected' ? '0 0 6px #10b981' : 'none'
            }} />
            <span>{socketStatus === 'connected' ? 'Online' : 'Reconnecting'}</span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              setShowUserSearchModal(true);
              handleSearchUsers('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '6px',
              backgroundColor: '#4f46e5',
              border: 'none',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
          >
            <UserPlus size={13} />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => fetchConversations()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '6px',
              backgroundColor: '#fff',
              border: '1px solid #ced4da',
              color: '#495057',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <RefreshCw size={13} className={loadingConversations ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Mobile Switcher Tab Bar (< 768px) */}
      {isMobileLayout && (
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '8px',
          flexShrink: 0,
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setMobileView('list')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: mobileView === 'list' ? '#ffffff' : 'transparent',
              color: mobileView === 'list' ? '#4f46e5' : '#64748b',
              fontWeight: '700',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: mobileView === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={14} />
            <span>Players ({filteredConversations.length})</span>
            {totalUnreadCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '0.68rem',
                fontWeight: '700'
              }}>
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedUser) {
                setMobileView('chat');
              } else if (conversations.length > 0) {
                handleSelectConversation(conversations[0]);
              } else {
                setShowUserSearchModal(true);
              }
            }}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: mobileView === 'chat' ? '#ffffff' : 'transparent',
              color: mobileView === 'chat' ? '#4f46e5' : '#64748b',
              fontWeight: '700',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: mobileView === 'chat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={14} />
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedUser ? (selectedUser.user_name || selectedUser.user_phone) : 'Chat Screen'}
            </span>
          </button>
        </div>
      )}

      {/* Main Split Layout Container */}
      <div style={{
        display: 'flex',
        backgroundColor: '#ffffff',
        borderRadius: isMobileLayout ? '8px' : '12px',
        boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
        height: '100%',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
      }}>

        {/* LEFT COLUMN: CONVERSATION LIST */}
        <div style={{
          width: isMobileLayout ? '100%' : (windowWidth <= 1100 ? '280px' : '320px'),
          flexShrink: 0,
          borderRight: isMobileLayout ? 'none' : '1px solid #e9ecef',
          display: isMobileLayout && mobileView === 'chat' ? 'none' : 'flex',
          flexDirection: 'column',
          backgroundColor: '#fafbfe',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Search & Filter Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e9ecef', backgroundColor: '#fff' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#74788d' }} />
              <input
                type="text"
                placeholder="Search by phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #ced4da',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: '#f8f9fa',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilterType('all')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'all' ? '#556ee6' : '#f1f3f7',
                  color: filterType === 'all' ? '#fff' : '#495057',
                  transition: 'all 0.2s'
                }}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilterType('unread')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'unread' ? '#ef4444' : '#f1f3f7',
                  color: filterType === 'unread' ? '#fff' : (totalUnreadCount > 0 ? '#ef4444' : '#495057'),
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>Unread</span>
                {totalUnreadCount > 0 && (
                  <span style={{
                    backgroundColor: filterType === 'unread' ? '#fff' : '#ef4444',
                    color: filterType === 'unread' ? '#ef4444' : '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.7rem'
                  }}>
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingConversations && conversations.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#74788d', fontSize: '0.85rem' }}>
                <RefreshCw size={24} className="spin" style={{ marginBottom: '8px', opacity: 0.7 }} />
                <p style={{ margin: 0 }}>Loading live conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#74788d' }}>
                <MessageSquare size={32} style={{ color: '#ced4da', marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '600', color: '#495057' }}>
                  {searchQuery ? 'No matching players' : 'No active chats yet'}
                </p>
                <p style={{ margin: '4px 0 12px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  When players send messages or you initiate a conversation, they appear here.
                </p>
                <button
                  onClick={() => {
                    setShowUserSearchModal(true);
                    handleSearchUsers('');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #556ee6',
                    backgroundColor: '#edf2ff',
                    color: '#556ee6',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Start Chat With Player
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedUser && String(selectedUser.user_phone) === String(conv.user_phone);
                const hasUnread = Number(conv.unread_count || 0) > 0;
                const initial = (conv.user_name || conv.user_phone || 'P').charAt(0).toUpperCase();

                return (
                  <div
                    key={conv.user_phone}
                    onClick={() => handleSelectConversation(conv)}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderBottom: '1px solid #f1f3f7',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#edf2ff' : (hasUnread ? '#fff9f9' : '#fff'),
                      borderLeft: isSelected ? '4px solid #556ee6' : (hasUnread ? '4px solid #ef4444' : '4px solid transparent'),
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* User Avatar */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: hasUnread 
                        ? 'linear-gradient(135deg, #ef4444, #f87171)' 
                        : 'linear-gradient(135deg, #556ee6, #798aec)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1rem',
                      flexShrink: 0
                    }}>
                      {initial}
                    </div>

                    {/* Meta info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <h6 style={{ 
                          margin: 0, 
                          fontSize: '0.88rem', 
                          fontWeight: hasUnread ? '700' : '600', 
                          color: '#2a3042',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {conv.user_name || 'Player'}
                        </h6>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                          {conv.last_time ? formatDisplayDateTime(conv.last_time) : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '0.78rem',
                          color: hasUnread ? '#1e293b' : '#74788d',
                          fontWeight: hasUnread ? '600' : '400',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px'
                        }}>
                          {conv.last_sender === 'admin' && <span style={{ color: '#556ee6', fontWeight: '600' }}>You: </span>}
                          {conv.last_message || 'Conversation opened'}
                        </p>

                        {/* Unread Pill */}
                        {hasUnread && (
                          <span style={{
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            borderRadius: '12px',
                            padding: '1px 6px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            flexShrink: 0
                          }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>📱 {conv.user_phone}</span>
                        {conv.wallet_balance !== undefined && (
                          <span style={{ color: '#059669', fontWeight: '600' }}>₹{Number(conv.wallet_balance || 0).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT SCREEN */}
        <div style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          display: isMobileLayout && mobileView === 'list' ? 'none' : 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8fafc',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {selectedUser ? (
            <>
              {/* Chat Top Bar */}
              <div style={{
                padding: isMobileLayout ? '8px 12px' : '10px 16px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                gap: '8px',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobileLayout ? '8px' : '12px', minWidth: 0, flex: 1 }}>
                  {isMobileLayout && (
                    <button
                      onClick={() => setMobileView('list')}
                      style={{
                        background: '#edf2ff',
                        border: '1px solid #c7d2fe',
                        color: '#4f46e5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        flexShrink: 0
                      }}
                      title="Back to Conversations"
                    >
                      <ArrowLeft size={16} />
                      <span>Players</span>
                    </button>
                  )}

                  <div style={{
                    width: isMobileLayout ? '34px' : '38px',
                    height: isMobileLayout ? '34px' : '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4f46e5, #798aec)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: isMobileLayout ? '0.85rem' : '0.95rem',
                    flexShrink: 0
                  }}>
                    {(selectedUser.user_name || selectedUser.user_phone || 'P').charAt(0).toUpperCase()}
                  </div>

                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h5 style={{ margin: 0, fontSize: isMobileLayout ? '0.88rem' : '0.95rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedUser.user_name || 'Player'}
                    </h5>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span>📱 {selectedUser.user_phone}</span>
                      {selectedUser.wallet_balance !== undefined && (
                        <span style={{ color: '#059669', fontWeight: '600' }}>
                          ₹{Number(selectedUser.wallet_balance || 0).toLocaleString()}
                        </span>
                      )}
                      {isPlayerTyping && (
                        <span style={{ color: '#4f46e5', fontWeight: '600' }}>
                          Typing...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <a
                    href={`tel:${selectedUser.user_phone}`}
                    title="Call Player"
                    style={{
                      padding: isMobileLayout ? '6px 8px' : '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      textDecoration: 'none',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Phone size={13} />
                    {!isTinyScreen && <span>Call</span>}
                  </a>

                  <button
                    onClick={() => fetchHistory(selectedUser.user_phone)}
                    title="Reload Messages"
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f3f7',
                      border: 'none',
                      color: '#495057',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <RefreshCw size={13} className={loadingMessages ? 'spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: isMobileLayout ? '10px 12px' : '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxSizing: 'border-box'
              }}>
                {loadingMessages && messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#74788d' }}>
                    <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading conversation history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: '#94a3b8' }}>
                    <MessageSquare size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>No messages yet</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>Send a reply below or select a quick response.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isAdmin = String(msg.sender_type || '').toLowerCase() === 'admin' || String(msg.sender_type || '').toLowerCase() === 'support';
                    const isAudio = msg.message_type === 'audio';
                    const isImage = msg.message_type === 'image' || (msg.attachment_url && msg.attachment_url.match(/\.(jpg|jpeg|png|webp|gif)/i));
                    const isFile = msg.message_type === 'file' && !isImage && !isAudio;

                    return (
                      <div
                        key={msg.id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAdmin ? 'flex-end' : 'flex-start',
                          alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                          width: '100%',
                          marginBottom: '4px'
                        }}
                      >
                        {/* Bubble */}
                        <div style={{
                          maxWidth: '78%',
                          padding: isImage ? '6px' : '10px 14px',
                          borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          backgroundColor: isAdmin ? '#556ee6' : '#ffffff',
                          color: isAdmin ? '#ffffff' : '#2a3042',
                          boxShadow: isAdmin ? '0 2px 8px rgba(85, 110, 230, 0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                          border: isAdmin ? '1px solid #485ec4' : '1px solid #e9ecef',
                          fontSize: '0.9rem',
                          lineHeight: '1.45',
                          wordBreak: 'break-word',
                          overflow: 'hidden'
                        }}>
                          {/* Sender Label */}
                          <div style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            color: isAdmin ? '#dbe4ff' : '#059669',
                            marginBottom: '3px',
                            padding: isImage ? '4px 6px' : '0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isAdmin ? '👤 You (Support Admin)' : `💬 ${msg.sender_name || 'Player'}`}
                          </div>

                          {/* Image Attachment */}
                          {isImage && msg.attachment_url && (
                            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setPreviewImage(msg.attachment_url)}>
                              <img
                                src={msg.attachment_url}
                                alt="Attachment"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '220px',
                                  borderRadius: '10px',
                                  display: 'block',
                                  objectFit: 'cover'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                right: '6px',
                                bottom: '6px',
                                background: 'rgba(0,0,0,0.6)',
                                borderRadius: '4px',
                                padding: '3px',
                                color: '#fff',
                                display: 'flex'
                              }}>
                                <Maximize2 size={12} />
                              </div>
                            </div>
                          )}

                          {/* Audio Voice Note */}
                          {isAudio && msg.attachment_url && (
                            <AdminAudioPlayer src={msg.attachment_url} isAdminMsg={isAdmin} />
                          )}

                          {/* File Attachment */}
                          {isFile && msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                background: isAdmin ? 'rgba(0,0,0,0.2)' : '#f1f3f7',
                                borderRadius: '8px',
                                color: isAdmin ? '#fff' : '#2a3042',
                                textDecoration: 'none',
                                fontSize: '0.82rem'
                              }}
                            >
                              <FileText size={18} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                {msg.file_name || 'Download Attachment'}
                              </span>
                              <Download size={14} style={{ marginLeft: 'auto' }} />
                            </a>
                          )}

                          {/* Text Message */}
                          {msg.message && (!isImage || msg.message !== '📷 Photo') && (!isAudio || msg.message !== '🎤 Voice Message') && (!isFile || msg.message !== '📎 Attachment') && (
                            <div style={{ marginTop: (isImage || isAudio || isFile) ? '6px' : '0', padding: isImage ? '0 6px 4px' : '0', whiteSpace: 'pre-wrap' }}>
                              {msg.message}
                            </div>
                          )}
                        </div>

                        {/* Timestamp & Read Receipt */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '3px',
                          fontSize: '0.68rem',
                          color: '#94a3b8'
                        }}>
                          <span>{msg.created_at ? formatDisplayDateTime(msg.created_at) : 'Just now'}</span>
                          {isAdmin && (
                            msg.is_read ? (
                              <CheckCheck size={14} style={{ color: '#3b82f6' }} title="Read by player" />
                            ) : (
                              <Check size={14} style={{ color: '#94a3b8' }} title="Sent" />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Player Typing Indicator */}
                {isPlayerTyping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: '#e2e8f0', borderRadius: '12px', width: 'fit-content' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>Player is typing</span>
                    <span className="dot-typing" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Selected File Preview Box (Admin) */}
              {selectedFile && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  backgroundColor: '#edf2ff',
                  borderTop: '1px solid #c7d2fe',
                  borderBottom: '1px solid #c7d2fe'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {selectedFile.type === 'image' ? (
                      <img src={selectedFile.base64} alt="preview" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <FileText size={24} style={{ color: '#556ee6' }} />
                    )}
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1e293b' }}>{selectedFile.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{selectedFile.size}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Quick Reply Suggestions Bar */}
              {/* Quick Reply Suggestions Bar */}
              <div style={{
                padding: isMobileLayout ? '4px 8px' : '6px 14px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #f1f3f7',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                display: 'flex',
                gap: '6px',
                flexShrink: 0,
                scrollbarWidth: 'none'
              }}>
                {QUICK_REPLIES.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(reply)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: isMobileLayout ? '3px 8px' : '4px 12px',
                      fontSize: isMobileLayout ? '0.7rem' : '0.74rem',
                      color: '#475569',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    💬 {reply.length > (isMobileLayout ? 24 : 36) ? reply.substring(0, (isMobileLayout ? 24 : 36)) + '...' : reply}
                  </button>
                ))}
              </div>

              {/* Bottom Message Input Bar or Voice Recording Bar */}
              {isRecording ? (
                /* Admin Voice Recording Bar */
                <div style={{
                  padding: isMobileLayout ? '8px 10px' : '10px 14px',
                  borderTop: '1px solid #fee2e2',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                    <span style={{ color: '#b91c1c', fontSize: isMobileLayout ? '0.78rem' : '0.86rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60) < 10 ? '0' : ''}{recordingTime % 60}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={cancelRecording}
                      style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Cancel Recording"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={stopAndSendRecording}
                      style={{
                        padding: isMobileLayout ? '7px 12px' : '8px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: isMobileLayout ? '0.8rem' : '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
                      }}
                    >
                      <Send size={14} />
                      <span>Send Voice</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Admin Input Bar */
                <div style={{
                  padding: isMobileLayout ? '8px 10px' : '10px 14px',
                  borderTop: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobileLayout ? '6px' : '8px',
                  flexShrink: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                  position: 'relative',
                  zIndex: 10,
                  boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
                }}>
                  {/* File Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Photo or Document"
                    style={{
                      width: isMobileLayout ? '38px' : '40px',
                      height: isMobileLayout ? '38px' : '40px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: selectedFile ? '#edf2ff' : '#f8fafc',
                      color: selectedFile ? '#4f46e5' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Microphone Voice Note Button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    title="Record Voice Note"
                    style={{
                      width: isMobileLayout ? '38px' : '40px',
                      height: isMobileLayout ? '38px' : '40px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#4f46e5',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Mic size={18} />
                  </button>

                  {/* Text Input */}
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedFile ? "Add caption to file..." : (isMobileLayout ? "Type reply..." : "Type reply message... (Press Enter to send)")}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      resize: 'none',
                      padding: isMobileLayout ? '8px 10px' : '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: isMobileLayout ? '0.84rem' : '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      backgroundColor: '#fafbfe',
                      lineHeight: '1.4',
                      height: isMobileLayout ? '38px' : '40px',
                      maxHeight: '80px',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* SEND BUTTON - 100% VISIBLE & PROMINENT */}
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={(!inputText.trim() && !selectedFile) || sending}
                    title="Send Message"
                    style={{
                      height: isMobileLayout ? '38px' : '40px',
                      padding: isMobileLayout ? '0 12px' : '0 18px',
                      minWidth: isMobileLayout ? '42px' : '78px',
                      borderRadius: '8px',
                      border: 'none',
                      background: (inputText.trim() || selectedFile) && !sending
                        ? 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)'
                        : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      opacity: (inputText.trim() || selectedFile) && !sending ? 1 : 0.85,
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: isMobileLayout ? '0.82rem' : '0.88rem',
                      cursor: (inputText.trim() || selectedFile) && !sending ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      flexShrink: 0,
                      boxShadow: (inputText.trim() || selectedFile) && !sending ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send size={16} style={{ flexShrink: 0 }} />
                    {!isMobileLayout && <span style={{ flexShrink: 0, letterSpacing: '0.2px' }}>Send</span>}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* No Conversation Selected Placeholder */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '30px',
              textAlign: 'center',
              color: '#74788d'
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#e0e7ff',
                color: '#556ee6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <MessageSquare size={36} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: '#2a3042', fontWeight: '700' }}>
                Admin Live Support Console
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', maxWidth: '380px', lineHeight: '1.5' }}>
                Select any player from the list on the left, or click "Chat With User" to search registered players and message them directly.
              </p>
              <button
                onClick={() => {
                  setShowUserSearchModal(true);
                  handleSearchUsers('');
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#556ee6',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(85, 110, 230, 0.3)'
                }}
              >
                <UserPlus size={16} />
                <span>Search & Chat With Player</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox Modal for Full Image Zoom */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '-36px', right: 0, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <img src={previewImage} alt="Full Preview" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      {/* Search Registered Users Modal (To Start Chat) */}
      {showUserSearchModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#2a3042' }}>
                Start Live Chat With Player
              </h5>
              <button onClick={() => setShowUserSearchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74788d' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#74788d' }} />
                <input
                  type="text"
                  placeholder="Search registered user by phone or name..."
                  value={userSearchText}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #ced4da',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {loadingUserSearch ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#74788d' }}>
                    <RefreshCw size={20} className="spin" style={{ marginBottom: '6px' }} />
                    <p style={{ margin: 0, fontSize: '0.82rem' }}>Searching players...</p>
                  </div>
                ) : userSearchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#74788d', fontSize: '0.85rem' }}>
                    No registered players found
                  </div>
                ) : (
                  userSearchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleStartChatWithUser(u)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #f1f3f7',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2ff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#2a3042', fontSize: '0.9rem' }}>{u.name || 'Player'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#74788d' }}>📱 {u.phone}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#059669', fontWeight: '700', fontSize: '0.82rem' }}>
                          ₹{Number(u.wallet || 0).toLocaleString()}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#556ee6', fontWeight: '600' }}>Open Chat →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportChat;
