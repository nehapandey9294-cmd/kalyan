const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { broadcastToUser, broadcastToAdmins } = require('../socket/chatSocket');

// Ensure local uploads directory exists
const chatUploadsDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

// 1. Get chat history for a specific user
router.get('/history', async (req, res) => {
  const phone = req.query.phone ? String(req.query.phone).replace(/\D/g, '') : null;
  if (!phone) {
    return res.status(400).json({ success: '0', msg: 'Phone number is required' });
  }

  try {
    const [messages] = await db.query(
      `SELECT id, user_phone, sender_type, sender_name, message, message_type, attachment_url, file_name, is_read, created_at
       FROM chat_messages
       WHERE user_phone = ?
       ORDER BY id ASC
       LIMIT 300`,
      [phone]
    );

    return res.json({
      success: '1',
      data: messages
    });
  } catch (err) {
    console.error('[ChatAPI] History error:', err);
    return res.status(500).json({ success: '0', msg: 'Database error fetching messages' });
  }
});

// 2. User sends a message via HTTP fallback
router.post('/send', async (req, res) => {
  const { phone, message, sender_name, message_type, attachment_url, file_name, tempId } = req.body;
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;

  if (!cleanPhone) {
    return res.status(400).json({ success: '0', msg: 'Phone number is required' });
  }

  const msgType = message_type || 'text';
  let text = (message || '').trim();
  if (!text) {
    if (msgType === 'image') text = '📷 Photo';
    else if (msgType === 'audio') text = '🎤 Voice Message';
    else if (msgType === 'file') text = '📎 Attachment';
  }

  if (!text && !attachment_url) {
    return res.status(400).json({ success: '0', msg: 'Message text or attachment is required' });
  }

  const name = sender_name || 'Player';
  const attachUrl = attachment_url || null;
  const fName = file_name || null;

  try {
    const [result] = await db.query(
      `INSERT INTO chat_messages (user_phone, sender_type, sender_name, message, message_type, attachment_url, file_name, is_read, created_at)
       VALUES (?, 'user', ?, ?, ?, ?, ?, 0, NOW())`,
      [cleanPhone, name, text, msgType, attachUrl, fName]
    );

    const newMsg = {
      id: result.insertId,
      user_phone: cleanPhone,
      sender_type: 'user',
      sender_name: name,
      message: text,
      message_type: msgType,
      attachment_url: attachUrl,
      file_name: fName,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    // Realtime broadcast via WebSocket
    broadcastToUser(cleanPhone, { type: 'message', data: newMsg, tempId });
    broadcastToAdmins({ type: 'message', data: newMsg, tempId });

    return res.json({
      success: '1',
      data: newMsg
    });
  } catch (err) {
    console.error('[ChatAPI] Send error:', err);
    return res.status(500).json({ success: '0', msg: 'Failed to send message' });
  }
});

// 3. Upload File / Image / Audio (Base64)
router.post('/upload', async (req, res) => {
  try {
    const { file_data, file_name, file_type } = req.body;
    if (!file_data) {
      return res.status(400).json({ success: '0', msg: 'No file data received' });
    }

    const extMatch = (file_name || '').match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
    let ext = extMatch ? extMatch[1].toLowerCase() : (file_type === 'audio' ? 'webm' : 'jpg');
    if (ext === 'jpeg') ext = 'jpg';

    const uniqueName = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const targetPath = path.join(chatUploadsDir, uniqueName);

    // Strip base64 headers
    const base64Clean = file_data.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(targetPath, Buffer.from(base64Clean, 'base64'));

    const publicUrl = `/uploads/chat/${uniqueName}`;

    return res.json({
      success: '1',
      url: publicUrl,
      file_name: file_name || uniqueName,
      file_type: file_type || 'file'
    });
  } catch (err) {
    console.error('[ChatAPI] Upload error:', err);
    return res.status(500).json({ success: '0', msg: 'Failed to save uploaded file' });
  }
});

// 4. Mark messages as read
router.post('/mark-read', async (req, res) => {
  const { phone, role } = req.body;
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;

  if (!cleanPhone) {
    return res.status(400).json({ success: '0', msg: 'Phone is required' });
  }

  const senderTypeToMark = role === 'admin' ? 'user' : 'admin';

  try {
    await db.query(
      `UPDATE chat_messages SET is_read = 1 WHERE user_phone = ? AND sender_type = ? AND is_read = 0`,
      [cleanPhone, senderTypeToMark]
    );

    const receipt = { type: 'read_receipt', phone: cleanPhone, reader: role || 'user' };
    broadcastToUser(cleanPhone, receipt);
    broadcastToAdmins(receipt);

    return res.json({ success: '1', msg: 'Marked as read' });
  } catch (err) {
    console.error('[ChatAPI] Mark read error:', err);
    return res.status(500).json({ success: '0', msg: 'Database error' });
  }
});

// 5. Get unread count for user
router.get('/unread-count', async (req, res) => {
  const phone = req.query.phone ? String(req.query.phone).replace(/\D/g, '') : null;
  if (!phone) {
    return res.json({ success: '1', count: 0 });
  }

  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as unread FROM chat_messages WHERE user_phone = ? AND sender_type = 'admin' AND is_read = 0`,
      [phone]
    );
    return res.json({ success: '1', count: rows[0]?.unread || 0 });
  } catch (err) {
    return res.json({ success: '1', count: 0 });
  }
});

// ==========================================
// ADMIN CHAT ENDPOINTS
// ==========================================

// 6. Admin: List all conversations with users
router.get('/admin/conversations', async (req, res) => {
  try {
    // Group by user_phone and get last message, time, unread count, and user details from user_info
    const [conversations] = await db.query(`
      SELECT 
        m.user_phone,
        m.message AS last_message,
        m.message_type AS last_message_type,
        m.sender_type AS last_sender,
        m.created_at AS last_time,
        (SELECT COUNT(*) FROM chat_messages unread WHERE unread.user_phone = m.user_phone AND unread.sender_type = 'user' AND unread.is_read = 0) AS unread_count,
        COALESCE(u.name, 'Player') AS user_name,
        COALESCE(u.wallet, 0) AS wallet_balance
      FROM chat_messages m
      INNER JOIN (
        SELECT user_phone, MAX(id) AS max_id
        FROM chat_messages
        GROUP BY user_phone
      ) latest ON m.id = latest.max_id
      LEFT JOIN user_info u ON u.phone = m.user_phone
      ORDER BY m.created_at DESC
      LIMIT 100
    `);

    return res.json({
      success: '1',
      data: conversations
    });
  } catch (err) {
    console.error('[ChatAPI] Admin conversations error:', err);
    return res.status(500).json({ success: '0', msg: 'Error fetching conversations: ' + err.message });
  }
});

// 7. Admin: Search registered users to start new conversation
router.get('/admin/search-users', async (req, res) => {
  const query = req.query.q ? String(req.query.q).trim() : '';
  try {
    let sql = 'SELECT id, name, phone, wallet FROM user_info ';
    const params = [];
    if (query) {
      sql += 'WHERE phone LIKE ? OR name LIKE ? ';
      params.push(`%${query}%`, `%${query}%`);
    }
    sql += 'ORDER BY id DESC LIMIT 20';

    const [users] = await db.query(sql, params);
    return res.json({
      success: '1',
      data: users
    });
  } catch (err) {
    console.error('[ChatAPI] Search users error:', err);
    return res.status(500).json({ success: '0', msg: 'Error searching users' });
  }
});

// 8. Admin: Get chat history with a user
router.get('/admin/history/:phone', async (req, res) => {
  const phone = req.params.phone ? String(req.params.phone).replace(/\D/g, '') : null;
  if (!phone) {
    return res.status(400).json({ success: '0', msg: 'Phone is required' });
  }

  try {
    const [messages] = await db.query(
      `SELECT id, user_phone, sender_type, sender_name, message, message_type, attachment_url, file_name, is_read, created_at
       FROM chat_messages
       WHERE user_phone = ?
       ORDER BY id ASC
       LIMIT 300`,
      [phone]
    );

    // Auto mark user messages as read when admin opens history
    await db.query(
      `UPDATE chat_messages SET is_read = 1 WHERE user_phone = ? AND sender_type = 'user' AND is_read = 0`,
      [phone]
    );

    broadcastToUser(phone, { type: 'read_receipt', phone, reader: 'admin' });

    return res.json({
      success: '1',
      data: messages
    });
  } catch (err) {
    console.error('[ChatAPI] Admin history error:', err);
    return res.status(500).json({ success: '0', msg: 'Database error' });
  }
});

// 9. Admin: Send reply to user
router.post('/admin/send', async (req, res) => {
  const { phone, message, sender_name, message_type, attachment_url, file_name, tempId } = req.body;
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;

  if (!cleanPhone) {
    return res.status(400).json({ success: '0', msg: 'Phone is required' });
  }

  const msgType = message_type || 'text';
  let text = (message || '').trim();
  if (!text) {
    if (msgType === 'image') text = '📷 Photo';
    else if (msgType === 'audio') text = '🎤 Voice Message';
    else if (msgType === 'file') text = '📎 Attachment';
  }

  if (!text && !attachment_url) {
    return res.status(400).json({ success: '0', msg: 'Message or attachment is required' });
  }

  const name = sender_name || 'Kalyan Matka Support';
  const attachUrl = attachment_url || null;
  const fName = file_name || null;

  try {
    const [result] = await db.query(
      `INSERT INTO chat_messages (user_phone, sender_type, sender_name, message, message_type, attachment_url, file_name, is_read, created_at)
       VALUES (?, 'admin', ?, ?, ?, ?, ?, 0, NOW())`,
      [cleanPhone, name, text, msgType, attachUrl, fName]
    );

    const newMsg = {
      id: result.insertId,
      user_phone: cleanPhone,
      sender_type: 'admin',
      sender_name: name,
      message: text,
      message_type: msgType,
      attachment_url: attachUrl,
      file_name: fName,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    // Broadcast to user socket(s) and other admin windows
    broadcastToUser(cleanPhone, { type: 'message', data: newMsg, tempId });
    broadcastToAdmins({ type: 'message', data: newMsg, tempId });

    return res.json({
      success: '1',
      data: newMsg
    });
  } catch (err) {
    console.error('[ChatAPI] Admin send error:', err);
    return res.status(500).json({ success: '0', msg: 'Failed to send admin message' });
  }
});

module.exports = router;
