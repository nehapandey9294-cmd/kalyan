import api from './api';

const getWsURL = () => {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // On localhost/127.0.0.1 connect directly to backend port 5001 to prevent proxy timeouts
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${protocol}//${window.location.hostname}:5001/ws/chat`;
  }
  return `${protocol}//${window.location.host}/ws/chat`;
};

class ChatSocketManager {
  constructor() {
    this.ws = null;
    this.userPhone = null;
    this.role = 'user';
    this.name = '';
    this.isConnected = false;
    this.listeners = {
      message: new Set(),
      messageAck: new Set(),
      typing: new Set(),
      read: new Set(),
      status: new Set()
    };
    this.reconnectTimer = null;
    this.heartbeatInterval = null;
  }

  init({ phone, role = 'user', name = '' }) {
    if (phone) {
      this.userPhone = String(phone).replace(/\D/g, '');
    } else {
      this.userPhone = null;
    }
    this.role = role;
    this.name = name;

    // If socket is already open, immediately authenticate new role
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        type: 'auth',
        phone: this.userPhone,
        role: this.role,
        name: this.name
      });
      this.notifyStatus('connected');
    } else {
      this.connect();
    }
  }

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = getWsURL();
    if (!wsUrl) return;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus('connected');

        // Authenticate with server
        this.sendRaw({
          type: 'auth',
          phone: this.userPhone,
          role: this.role,
          name: this.name
        });

        // 20s heartbeat keep-alive
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendRaw({ type: 'ping' });
          }
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncoming(data);
        } catch (e) {
          // not JSON
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus('disconnected');
        clearInterval(this.heartbeatInterval);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.notifyStatus('error');
      };
    } catch (err) {
      console.warn('[ChatSocket] Init failed, retrying in 3s...', err);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  sendRaw(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(obj));
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  async uploadFile(base64Data, fileName, fileType = 'image') {
    try {
      const res = await api.post('/chat/upload', {
        file_data: base64Data,
        file_name: fileName,
        file_type: fileType
      });
      if (res.data?.success === '1') {
        return res.data;
      }
    } catch (err) {
      console.error('[ChatSocket] Upload failed:', err);
    }
    return null;
  }

  sendMessage(payload, targetPhone, senderName) {
    let text = '';
    let msgType = 'text';
    let attachmentUrl = null;
    let fileName = null;
    let tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    if (typeof payload === 'object' && payload !== null) {
      text = (payload.message || payload.text || '').trim();
      msgType = payload.message_type || payload.type || 'text';
      attachmentUrl = payload.attachment_url || payload.url || null;
      fileName = payload.file_name || null;
      if (payload.phone) targetPhone = payload.phone;
      if (payload.sender_name) senderName = payload.sender_name;
      if (payload.tempId) tempId = payload.tempId;
    } else {
      text = (payload || '').trim();
    }

    if (!text && !attachmentUrl) return Promise.resolve(null);

    const phone = targetPhone ? String(targetPhone).replace(/\D/g, '') : this.userPhone;
    const name = senderName || this.name || (this.role === 'admin' ? 'Support Admin' : 'Player');

    const msgObj = {
      type: 'message',
      message: text,
      message_type: msgType,
      attachment_url: attachmentUrl,
      file_name: fileName,
      phone: phone,
      sender_name: name,
      tempId: tempId
    };

    return new Promise(async (resolve) => {
      let resolved = false;

      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          this.listeners.messageAck.delete(onAck);
          resolve(result);
        }
      };

      const onAck = (ackMsg) => {
        if (!ackMsg) return;
        const ackData = ackMsg.data || ackMsg;
        const ackTempId = ackMsg.tempId;
        if (ackTempId === tempId || (ackData && ackData.message === text && String(ackData.user_phone) === phone)) {
          finish(ackData);
        }
      };

      // Attempt WebSocket send first if open
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.listeners.messageAck.add(onAck);
        const sentOverWs = this.sendRaw(msgObj);

        if (sentOverWs) {
          // If ack not received within 2.5s, execute REST fallback seamlessly
          setTimeout(async () => {
            if (!resolved) {
              try {
                const endpoint = this.role === 'admin' ? '/chat/admin/send' : '/chat/send';
                const res = await api.post(endpoint, {
                  phone: phone,
                  message: text,
                  message_type: msgType,
                  attachment_url: attachmentUrl,
                  file_name: fileName,
                  sender_name: name
                });
                if (res.data?.success === '1' && res.data.data) {
                  finish(res.data.data);
                  return;
                }
              } catch (err) {}
              finish(null);
            }
          }, 2500);
          return;
        }
      }

      // If socket is not open, use REST fallback directly
      try {
        const endpoint = this.role === 'admin' ? '/chat/admin/send' : '/chat/send';
        const res = await api.post(endpoint, {
          phone: phone,
          message: text,
          message_type: msgType,
          attachment_url: attachmentUrl,
          file_name: fileName,
          sender_name: name
        });
        if (res.data?.success === '1' && res.data.data) {
          finish(res.data.data);
          return;
        }
      } catch (err) {
        console.error('[ChatSocket] REST send failed:', err);
      }
      finish(null);
    });
  }

  sendTyping(isTyping, targetPhone) {
    const phone = targetPhone ? String(targetPhone).replace(/\D/g, '') : this.userPhone;
    this.sendRaw({
      type: 'typing',
      phone: phone,
      isTyping: !!isTyping
    });
  }

  markRead(targetPhone) {
    const phone = targetPhone ? String(targetPhone).replace(/\D/g, '') : this.userPhone;
    this.sendRaw({
      type: 'mark_read',
      phone: phone,
      role: this.role
    });

    api.post('/chat/mark-read', { phone: phone, role: this.role }).catch(() => {});
  }

  handleIncoming(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'message' && msg.data) {
      this.listeners.message.forEach((cb) => {
        try { cb(msg.data, msg.tempId); } catch (e) {}
      });
    } else if (msg.type === 'message_ack' && msg.data) {
      this.listeners.messageAck.forEach((cb) => {
        try { cb(msg); } catch (e) {}
      });
      this.listeners.message.forEach((cb) => {
        try { cb(msg.data, msg.tempId); } catch (e) {}
      });
    } else if (msg.type === 'typing') {
      this.listeners.typing.forEach((cb) => {
        try { cb(msg); } catch (e) {}
      });
    } else if (msg.type === 'read_receipt') {
      this.listeners.read.forEach((cb) => {
        try { cb(msg); } catch (e) {}
      });
    }
  }

  onMessage(cb) {
    this.listeners.message.add(cb);
    return () => this.listeners.message.delete(cb);
  }

  onTyping(cb) {
    this.listeners.typing.add(cb);
    return () => this.listeners.typing.delete(cb);
  }

  onRead(cb) {
    this.listeners.read.add(cb);
    return () => this.listeners.read.delete(cb);
  }

  onStatus(cb) {
    this.listeners.status.add(cb);
    cb(this.isConnected ? 'connected' : 'disconnected');
    return () => this.listeners.status.delete(cb);
  }

  notifyStatus(status) {
    this.listeners.status.forEach((cb) => {
      try { cb(status); } catch (e) {}
    });
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatInterval);
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
  }
}

const chatSocket = new ChatSocketManager();
export default chatSocket;
