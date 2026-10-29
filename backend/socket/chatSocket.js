const crypto = require('crypto');
const url = require('url');
const db = require('../config/db');

// Connected clients tracking
const userClients = new Map(); // phone -> Set<ChatClient>
const adminClients = new Set(); // Set<ChatClient>

// Create MySQL table if not exists & auto-migrate columns
async function ensureChatTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_phone VARCHAR(20) NOT NULL,
        sender_type ENUM('user', 'admin') NOT NULL,
        sender_name VARCHAR(100) DEFAULT '',
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        attachment_url LONGTEXT DEFAULT NULL,
        file_name VARCHAR(255) DEFAULT NULL,
        is_read TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_phone (user_phone),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure columns exist if table was already created
    const alterQueries = [
      "ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text'",
      "ALTER TABLE chat_messages ADD COLUMN attachment_url LONGTEXT DEFAULT NULL",
      "ALTER TABLE chat_messages ADD COLUMN file_name VARCHAR(255) DEFAULT NULL"
    ];
    for (const q of alterQueries) {
      try { await db.query(q); } catch (e) {}
    }
    console.log('[ChatSocket] chat_messages table and columns verified');
  } catch (err) {
    console.error('[ChatSocket] Error initializing chat table:', err.message);
  }
}

// RFC 6455 Frame Encoder (Server to Client: unmasked)
function encodeFrame(data) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const payload = Buffer.from(jsonStr, 'utf8');
  const length = payload.length;

  let header;
  if (length <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode (0x1)
    header[1] = length;
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

// Ping Frame Encoder
function encodePing() {
  const buf = Buffer.alloc(2);
  buf[0] = 0x89; // FIN + ping (0x9)
  buf[1] = 0;
  return buf;
}

// Pong Frame Encoder
function encodePong(payload) {
  const p = payload || Buffer.alloc(0);
  const header = Buffer.alloc(2);
  header[0] = 0x8A; // FIN + pong (0xA)
  header[1] = p.length;
  return Buffer.concat([header, p]);
}

class ChatClient {
  constructor(socket, req) {
    this.socket = socket;
    this.req = req;
    this.buffer = Buffer.alloc(0);
    this.phone = null;
    this.role = 'user'; // 'user' | 'admin'
    this.name = '';
    this.isAlive = true;

    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => this.handleClose());
    this.socket.on('error', (err) => {
      this.handleClose();
    });
  }

  send(data) {
    try {
      if (this.socket && !this.socket.destroyed && this.socket.writable) {
        this.socket.write(encodeFrame(data));
      }
    } catch (err) {
      console.warn('[ChatSocket] Send error:', err.message);
    }
  }

  handleData(chunk) {
    if (!chunk || chunk.length === 0) return;
    this.isAlive = true;
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 2) {
      const firstByte = this.buffer[0];
      const secondByte = this.buffer[1];

      const opcode = firstByte & 0x0F;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7F;

      let offset = 2;
      if (payloadLen === 126) {
        if (this.buffer.length < 4) return;
        payloadLen = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this.buffer.length < 10) return;
        payloadLen = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let maskKey = null;
      if (isMasked) {
        if (this.buffer.length < offset + 4) return;
        maskKey = this.buffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (this.buffer.length < offset + payloadLen) {
        return; // Wait for full frame
      }

      const rawPayload = this.buffer.slice(offset, offset + payloadLen);
      this.buffer = this.buffer.slice(offset + payloadLen);

      // Unmask payload from client
      let payload = rawPayload;
      if (isMasked && maskKey) {
        payload = Buffer.alloc(rawPayload.length);
        for (let i = 0; i < rawPayload.length; i++) {
          payload[i] = rawPayload[i] ^ maskKey[i % 4];
        }
      }

      if (opcode === 0x8) {
        // Close frame
        try { this.socket.end(); } catch (e) {}
        this.handleClose();
        return;
      }

      if (opcode === 0x9) {
        // Ping -> respond with Pong
        try { this.socket.write(encodePong(payload)); } catch (e) {}
        continue;
      }

      if (opcode === 0xA) {
        // Pong
        this.isAlive = true;
        continue;
      }

      if (opcode === 0x1) {
        // Text JSON message
        try {
          const text = payload.toString('utf8');
          const json = JSON.parse(text);
          this.handleMessage(json);
        } catch (e) {
          // ignore malformed JSON
        }
      }
    }
  }

  async handleMessage(msg) {
    if (!msg || !msg.type) return;
    this.isAlive = true;

    // Heartbeat ping
    if (msg.type === 'ping') {
      this.send({ type: 'pong' });
      return;
    }

    if (msg.type === 'auth') {
      // Clean up previous registration if re-authenticating
      adminClients.delete(this);
      if (this.phone && userClients.has(this.phone)) {
        userClients.get(this.phone).delete(this);
      }

      this.phone = msg.phone ? String(msg.phone).replace(/\D/g, '') : null;
      this.role = msg.role === 'admin' ? 'admin' : 'user';
      this.name = msg.name || (this.role === 'admin' ? 'Support Agent' : 'Player');

      if (this.role === 'admin') {
        adminClients.add(this);
      } else if (this.phone) {
        if (!userClients.has(this.phone)) {
          userClients.set(this.phone, new Set());
        }
        userClients.get(this.phone).add(this);
      }

      this.send({
        type: 'auth_success',
        role: this.role,
        phone: this.phone,
        status: 'connected'
      });
      return;
    }

    if (msg.type === 'message') {
      const targetPhone = this.role === 'admin'
        ? (msg.phone ? String(msg.phone).replace(/\D/g, '') : null)
        : (this.phone || (msg.phone ? String(msg.phone).replace(/\D/g, '') : null));

      if (!targetPhone) {
        this.send({ type: 'error', message: 'Missing phone number' });
        return;
      }

      const msgType = msg.message_type || 'text';
      let text = (msg.message || '').trim();
      if (!text) {
        if (msgType === 'image') text = '📷 Photo';
        else if (msgType === 'audio') text = '🎤 Voice Message';
        else if (msgType === 'file') text = '📎 Attachment';
      }

      if (!text && !msg.attachment_url) {
        this.send({ type: 'error', message: 'Message or attachment is required' });
        return;
      }

      const senderType = this.role === 'admin' ? 'admin' : 'user';
      const senderName = msg.sender_name || this.name || (senderType === 'admin' ? 'Support Team' : 'Player');
      const attachmentUrl = msg.attachment_url || null;
      const fileName = msg.file_name || null;
      const tempId = msg.tempId || null;

      try {
        const [result] = await db.query(
          `INSERT INTO chat_messages (user_phone, sender_type, sender_name, message, message_type, attachment_url, file_name, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
          [targetPhone, senderType, senderName, text, msgType, attachmentUrl, fileName]
        );

        const newMsg = {
          id: result.insertId,
          user_phone: targetPhone,
          sender_type: senderType,
          sender_name: senderName,
          message: text,
          message_type: msgType,
          attachment_url: attachmentUrl,
          file_name: fileName,
          is_read: 0,
          created_at: new Date().toISOString()
        };

        // Broadcast to user socket(s)
        broadcastToUser(targetPhone, { type: 'message', data: newMsg, tempId: tempId });

        // Broadcast to all admin sockets
        broadcastToAdmins({ type: 'message', data: newMsg, tempId: tempId });

        // Send explicit ack back to sender socket
        this.send({
          type: 'message_ack',
          tempId: tempId,
          data: newMsg
        });
      } catch (err) {
        console.error('[ChatSocket] Failed to save chat message:', err);
        this.send({ type: 'error', message: 'Failed to send message' });
      }
      return;
    }

    if (msg.type === 'typing') {
      const targetPhone = this.role === 'admin'
        ? (msg.phone ? String(msg.phone).replace(/\D/g, '') : null)
        : this.phone;

      if (!targetPhone) return;

      const payload = {
        type: 'typing',
        phone: targetPhone,
        isTyping: !!msg.isTyping,
        sender_type: this.role
      };

      if (this.role === 'admin') {
        broadcastToUser(targetPhone, payload);
      } else {
        broadcastToAdmins(payload);
      }
      return;
    }

    if (msg.type === 'mark_read') {
      const targetPhone = msg.phone ? String(msg.phone).replace(/\D/g, '') : this.phone;
      if (!targetPhone) return;

      try {
        const targetSenderType = this.role === 'admin' ? 'user' : 'admin';
        await db.query(
          `UPDATE chat_messages SET is_read = 1 WHERE user_phone = ? AND sender_type = ? AND is_read = 0`,
          [targetPhone, targetSenderType]
        );

        const receipt = { type: 'read_receipt', phone: targetPhone, reader: this.role };
        broadcastToUser(targetPhone, receipt);
        broadcastToAdmins(receipt);
      } catch (e) {
        console.warn('[ChatSocket] Mark read error:', e.message);
      }
      return;
    }
  }

  handleClose() {
    if (this.role === 'admin') {
      adminClients.delete(this);
    } else if (this.phone && userClients.has(this.phone)) {
      const clientSet = userClients.get(this.phone);
      clientSet.delete(this);
      if (clientSet.size === 0) {
        userClients.delete(this.phone);
      }
    }
  }
}

function broadcastToUser(phone, data) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (userClients.has(cleanPhone)) {
    for (const client of userClients.get(cleanPhone)) {
      client.send(data);
    }
  }
}

function broadcastToAdmins(data) {
  for (const client of adminClients) {
    client.send(data);
  }
}

function initChatSocket(server) {
  ensureChatTable();

  server.on('upgrade', (req, socket, head) => {
    const parsedUrl = url.parse(req.url, true);
    const pathName = parsedUrl.pathname || '';
    if (pathName === '/ws/chat' || pathName === '/socket/chat' || pathName === '/ws') {
      const upgradeHeader = req.headers['upgrade'];
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        socket.destroy();
        return;
      }

      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }

      const acceptValue = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptValue}`,
        '\r\n'
      ];

      socket.write(responseHeaders.join('\r\n'));

      const client = new ChatClient(socket, req);
      if (head && head.length > 0) {
        client.handleData(head);
      }

      // Handle optional query auth params on handshake
      if (parsedUrl.query && parsedUrl.query.phone) {
        client.handleMessage({
          type: 'auth',
          phone: parsedUrl.query.phone,
          role: parsedUrl.query.role || 'user',
          name: parsedUrl.query.name || ''
        });
      }
    }
  });

  // Keep-alive heartbeat every 25 seconds
  setInterval(() => {
    const pingBuf = encodePing();
    for (const client of adminClients) {
      try { client.socket.write(pingBuf); } catch (e) {}
    }
    for (const [phone, set] of userClients.entries()) {
      for (const client of set) {
        try { client.socket.write(pingBuf); } catch (e) {}
      }
    }
  }, 25000);

  console.log('[ChatSocket] In-app WebSocket chat server initialized on /ws/chat');
}

module.exports = {
  initChatSocket,
  broadcastToUser,
  broadcastToAdmins
};
