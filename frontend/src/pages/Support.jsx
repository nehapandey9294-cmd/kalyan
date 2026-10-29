import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Headphones,
  ShieldCheck,
  Zap,
  PhoneCall,
  CheckCheck,
  Check,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Square,
  Trash2,
  Play,
  Pause,
  Download,
  FileText,
  X,
  Maximize2
} from 'lucide-react';
import api from '../utils/api';
import chatSocket from '../utils/chatSocket';

const QUICK_QUERIES = [
  '⚡ Deposit Not Reflected',
  '💸 Withdrawal Processing Status',
  '🔑 MPIN or Password Reset Help',
  '🎯 Game Winning Verification',
  '📋 How to Place a Bid'
];

// Audio message player bubble component
const ChatAudioPlayer = ({ src, isUser }) => {
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '4px 0',
      minWidth: '220px'
    }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: isUser ? '#ffffff' : 'var(--color-gold, #d6be66)',
          color: isUser ? '#10b981' : '#09121f',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Progress Bar */}
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
            backgroundColor: isUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)',
            borderRadius: '4px',
            cursor: 'pointer',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: isUser ? '#ffffff' : 'var(--color-gold, #d6be66)',
            borderRadius: '4px',
            transition: 'width 0.1s linear'
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          marginTop: '4px',
          opacity: 0.8
        }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

const Support = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [adminPhone, setAdminPhone] = useState('');

  // User and Guest Auth
  const [userPhone, setUserPhone] = useState(() => {
    return localStorage.getItem('phone') || sessionStorage.getItem('support_guest_phone') || '';
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('name') || sessionStorage.getItem('support_guest_name') || 'Guest Player';
  });
  const [guestPhoneInput, setGuestPhoneInput] = useState('');

  // Attachment (File/Image) State
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, size, base64 }
  const [previewImage, setPreviewImage] = useState(null); // for Lightbox zoom modal
  const fileInputRef = useRef(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const cancelRecordingRef = useRef(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    const clean = guestPhoneInput.replace(/\D/g, '');
    if (clean.length >= 10) {
      sessionStorage.setItem('support_guest_phone', clean);
      sessionStorage.setItem('support_guest_name', 'Guest Player');
      setUserPhone(clean);
      setUserName('Guest Player');
    }
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // 1. Load chat history & admin helpline
  useEffect(() => {
    let isMounted = true;

    const fetchHistoryAndInfo = async () => {
      try {
        if (userPhone) {
          const res = await api.get(`/chat/history?phone=${userPhone}`);
          if (isMounted && res.data?.success === '1' && Array.isArray(res.data.data)) {
            setMessages(res.data.data);
            setTimeout(() => scrollToBottom('auto'), 150);
          }
        }

        // Fetch support helpline phone
        const infoRes = await api.get('/wallet/info').catch(() => null);
        if (isMounted && infoRes?.data?.data) {
          setAdminPhone(infoRes.data.data.admin_mobile || '');
        }
      } catch (err) {
        console.error('Support fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistoryAndInfo();

    return () => {
      isMounted = false;
    };
  }, [userPhone]);

  // 2. Connect to In-App WebSocket Chat
  useEffect(() => {
    if (!userPhone) return;

    chatSocket.init({
      phone: userPhone,
      role: 'user',
      name: userName
    });

    const unsubStatus = chatSocket.onStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubMsg = chatSocket.onMessage((newMsg, tempId) => {
      const myCleanPhone = String(userPhone || '').replace(/\D/g, '');
      const msgCleanPhone = String(newMsg?.user_phone || '').replace(/\D/g, '');

      if (newMsg && myCleanPhone && myCleanPhone === msgCleanPhone) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          if (tempId && prev.some((m) => m.id === tempId)) {
            return prev.map((m) => (m.id === tempId ? newMsg : m));
          }
          const optIdx = prev.findIndex(
            (m) =>
              String(m.id).startsWith('temp_') &&
              m.sender_type === newMsg.sender_type &&
              m.message === newMsg.message
          );
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = newMsg;
            return next;
          }
          return [...prev, newMsg];
        });
        setTimeout(() => scrollToBottom('smooth'), 100);

        if (newMsg.sender_type === 'admin') {
          chatSocket.markRead(myCleanPhone);
        }
      }
    });

    const unsubTyping = chatSocket.onTyping((data) => {
      if (data.sender_type === 'admin') {
        setAdminTyping(data.isTyping);
      }
    });

    const unsubRead = chatSocket.onRead(() => {
      setMessages((prev) =>
        prev.map((m) => (m.sender_type === 'user' ? { ...m, is_read: 1 } : m))
      );
    });

    return () => {
      unsubStatus();
      unsubMsg();
      unsubTyping();
      unsubRead();
    };
  }, [userPhone, userName]);

  // Handle File Selection (Photo / Screenshot / Document)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      alert('Selected file is too large. Please select a file under 15MB.');
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
      setIsSending(true);
      try {
        const uploadRes = await chatSocket.uploadFile(base64Data, `voice_${Date.now()}.webm`, 'audio');
        const fileUrl = uploadRes?.url || base64Data;

        await handleSendMessage('', {
          message_type: 'audio',
          attachment_url: fileUrl,
          file_name: `Voice Note (${recordingTime}s)`
        });
      } catch (err) {
        console.error('Voice send error:', err);
      } finally {
        setIsSending(false);
      }
    };
  };

  // Handle message sending (Text, Image, File, Audio)
  const handleSendMessage = async (textToSend, customPayload = null) => {
    const text = (textToSend || inputText).trim();
    if (!userPhone || isSending) return;

    let msgType = customPayload?.message_type || (selectedFile ? selectedFile.type : 'text');
    let attachmentUrl = customPayload?.attachment_url || null;
    let fileName = customPayload?.file_name || (selectedFile ? selectedFile.name : null);

    if (!text && !attachmentUrl && !selectedFile) return;

    setIsSending(true);
    setInputText('');

    // If a file was picked in the UI
    if (selectedFile && !attachmentUrl) {
      const uploadRes = await chatSocket.uploadFile(selectedFile.base64, selectedFile.name, selectedFile.type);
      attachmentUrl = uploadRes?.url || selectedFile.base64;
      fileName = selectedFile.name;
      msgType = selectedFile.type;
      setSelectedFile(null);
    }

    const tempId = 'temp_' + Date.now();
    const tempMsg = {
      id: tempId,
      user_phone: userPhone,
      sender_type: 'user',
      sender_name: userName,
      message: text || (msgType === 'image' ? '📷 Photo' : (msgType === 'audio' ? '🎤 Voice Message' : '📎 Attachment')),
      message_type: msgType,
      attachment_url: attachmentUrl,
      file_name: fileName,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      chatSocket.sendTyping(false, userPhone);
      const savedMsg = await chatSocket.sendMessage({
        message: text,
        message_type: msgType,
        attachment_url: attachmentUrl,
        file_name: fileName,
        phone: userPhone,
        sender_name: userName,
        tempId: tempId
      });

      if (savedMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? savedMsg : m))
        );
      }
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (userPhone) {
      chatSocket.sendTyping(true, userPhone);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        chatSocket.sendTyping(false, userPhone);
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const cleanAdminDigits = adminPhone.replace(/\D/g, '');
  const helplineCall = cleanAdminDigits ? `tel:+91${cleanAdminDigits.slice(-10)}` : null;

  return (
    <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: '12px 14px 20px',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      maxHeight: '840px'
    }}>
      {/* Hidden File Picker Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx"
        style={{ display: 'none' }}
      />

      {/* Top Header Card */}
      <div
        className="card-glass-v2"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          marginBottom: '10px',
          borderRadius: '18px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #d6be66 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09121f',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}>
              <Headphones size={22} />
            </div>
            <span style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected' ? '#10b981' : '#ef4444',
              border: '2px solid #09121f'
            }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                Live Support Chat
              </h3>
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '10px',
                background: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: connectionStatus === 'connected' ? '#10b981' : '#ef4444',
                fontWeight: '700'
              }}>
                {connectionStatus === 'connected' ? 'ONLINE' : 'CONNECTING'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', margin: '2px 0 0 0' }}>
              Instant response from Kalyan Matka Help Desk
            </p>
          </div>
        </div>

        {/* Call Helpline Button */}
        {helplineCall && (
          <a
            href={helplineCall}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10b981',
              fontSize: '0.78rem',
              fontWeight: '700',
              textDecoration: 'none'
            }}
            title="Call Support Helpline"
          >
            <PhoneCall size={14} />
            <span>Call Helpline</span>
          </a>
        )}
      </div>

      {/* Main Chat Box Container */}
      <div
        className="card-glass-v2"
        style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          borderRadius: '20px',
          padding: '12px',
          overflow: 'hidden',
          backgroundColor: 'rgba(8, 16, 30, 0.78)'
        }}
      >
        {/* Messages Scroll Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Welcome Intro Banner */}
          <div style={{
            textAlign: 'center',
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'rgba(214, 190, 102, 0.08)',
            border: '1px dashed rgba(214, 190, 102, 0.3)',
            marginBottom: '4px'
          }}>
            <Sparkles size={18} style={{ color: 'var(--color-gold)', margin: '0 auto 4px' }} />
            <h4 style={{ fontSize: '0.88rem', color: '#ffffff', margin: '0 0 2px', fontWeight: '700' }}>
              Welcome to Kalyan Matka Live Support
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
              Send text messages, screenshot photos, or voice audio notes. We are here to help 24/7!
            </p>
          </div>

          {!userPhone ? (
            <div style={{
              margin: 'auto',
              maxWidth: '380px',
              padding: '24px 20px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              textAlign: 'center'
            }}>
              <Headphones size={36} style={{ color: 'var(--color-gold)', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.05rem', color: '#fff', margin: '0 0 6px', fontWeight: '700' }}>
                Start Live Support Chat
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 16px', lineHeight: '1.4' }}>
                Please enter your 10-digit mobile number to connect directly with our support team in real time.
              </p>
              <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-Digit Mobile Number"
                  value={guestPhoneInput}
                  onChange={(e) => setGuestPhoneInput(e.target.value.replace(/\D/g, ''))}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '0.92rem',
                    textAlign: 'center',
                    letterSpacing: '1px'
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={guestPhoneInput.length < 10}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: guestPhoneInput.length >= 10 ? 'linear-gradient(135deg, #d6be66, #10b981)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.92rem',
                    cursor: guestPhoneInput.length >= 10 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  Connect With Support
                </button>
              </form>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.5)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.85rem' }}>Loading conversation history...</div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(255,255,255,0.45)' }}>
              <HelpCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.86rem', margin: 0 }}>No messages yet. Ask a question or send a screenshot to get started!</p>
            </div>
          ) : (
            messages.map((m, index) => {
              const isUser = m.sender_type === 'user';
              const isAudio = m.message_type === 'audio';
              const isImage = m.message_type === 'image' || (m.attachment_url && m.attachment_url.match(/\.(jpg|jpeg|png|webp|gif)/i));
              const isFile = m.message_type === 'file' && !isImage && !isAudio;

              return (
                <div
                  key={m.id || index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      padding: isImage ? '6px' : '10px 14px',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isUser
                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.14)',
                      fontSize: '0.88rem',
                      lineHeight: '1.45',
                      wordBreak: 'break-word',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                      overflow: 'hidden'
                    }}
                  >
                    {!isUser && (
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: 'var(--color-gold, #d6be66)',
                        marginBottom: '4px',
                        padding: isImage ? '4px 6px' : '0'
                      }}>
                        {m.sender_name || 'Kalyan Matka Support'}
                      </div>
                    )}

                    {/* Image Attachment */}
                    {isImage && m.attachment_url && (
                      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setPreviewImage(m.attachment_url)}>
                        <img
                          src={m.attachment_url}
                          alt="Attachment"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '220px',
                            borderRadius: '12px',
                            display: 'block',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          right: '8px',
                          bottom: '8px',
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
                    {isAudio && m.attachment_url && (
                      <ChatAudioPlayer src={m.attachment_url} isUser={isUser} />
                    )}

                    {/* Generic File Attachment */}
                    {isFile && m.attachment_url && (
                      <a
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '8px',
                          color: '#fff',
                          textDecoration: 'none',
                          fontSize: '0.82rem'
                        }}
                      >
                        <FileText size={18} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {m.file_name || 'Download Attachment'}
                        </span>
                        <Download size={14} style={{ marginLeft: 'auto' }} />
                      </a>
                    )}

                    {/* Text Message Content */}
                    {m.message && (!isImage || m.message !== '📷 Photo') && (!isAudio || m.message !== '🎤 Voice Message') && (!isFile || m.message !== '📎 Attachment') && (
                      <div style={{ marginTop: (isImage || isAudio || isFile) ? '6px' : '0', padding: isImage ? '0 6px 4px' : '0' }}>
                        {m.message}
                      </div>
                    )}
                  </div>

                  {/* Timestamp & Read Receipt */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    color: 'rgba(255, 255, 255, 0.45)',
                    marginTop: '3px',
                    padding: '0 4px'
                  }}>
                    <span>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </span>
                    {isUser && (
                      m.is_read ? (
                        <CheckCheck size={14} style={{ color: '#38bdf8' }} />
                      ) : (
                        <Check size={14} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator Bubble */}
          {adminTyping && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '16px 16px 16px 4px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: 'fit-content'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Support is typing
              </span>
              <span className="dot-typing" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Selected File Preview Box (Before Send) */}
        {selectedFile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            margin: '6px 0',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {selectedFile.type === 'image' ? (
                <img
                  src={selectedFile.base64}
                  alt="preview"
                  style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                />
              ) : (
                <FileText size={24} style={{ color: '#10b981' }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                  {selectedFile.size}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: 'none',
                color: '#ef4444',
                padding: '4px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Quick Question Chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '6px 0 4px',
          flexShrink: 0,
          scrollbarWidth: 'none'
        }}>
          {QUICK_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              style={{
                flexShrink: 0,
                padding: '5px 12px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar or Voice Recording Bar */}
        {isRecording ? (
          /* Live Voice Recording UI Bar */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginTop: '6px',
            padding: '10px 14px',
            borderRadius: '14px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                animation: 'pulse 1s infinite'
              }} />
              <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: '700' }}>
                Recording Audio... {Math.floor(recordingTime / 60)}:{(recordingTime % 60) < 10 ? '0' : ''}{recordingTime % 60}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={cancelRecording}
                title="Cancel Recording"
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex'
                }}
              >
                <Trash2 size={18} />
              </button>

              <button
                type="button"
                onClick={stopAndSendRecording}
                title="Send Voice Note"
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={16} />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Bar */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '6px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0
          }}>
            {/* File Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!userPhone}
              title="Attach Photo or Document"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--color-gold, #d6be66)',
                cursor: userPhone ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Paperclip size={18} />
            </button>

            {/* Microphone Voice Note Button */}
            <button
              type="button"
              onClick={startRecording}
              disabled={!userPhone}
              title="Record Voice Note"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#38bdf8',
                cursor: userPhone ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Mic size={18} />
            </button>

            {/* Input Field */}
            <input
              type="text"
              className="form-input"
              placeholder={userPhone ? (selectedFile ? "Add caption to file..." : "Type your message...") : "Enter mobile number above..."}
              value={inputText}
              disabled={!userPhone}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '0.88rem',
                backgroundColor: 'rgba(6, 12, 22, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                opacity: userPhone ? 1 : 0.6
              }}
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!userPhone || (!inputText.trim() && !selectedFile) || isSending}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: 'none',
                background: (inputText.trim() || selectedFile) && userPhone
                  ? 'linear-gradient(135deg, #d6be66 0%, #10b981 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                color: (inputText.trim() || selectedFile) && userPhone ? '#09121f' : 'rgba(255, 255, 255, 0.3)',
                cursor: (inputText.trim() || selectedFile) && userPhone ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal for Zooming Images */}
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
              style={{
                position: 'absolute',
                top: '-36px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
            <img
              src={previewImage}
              alt="Full Preview"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
