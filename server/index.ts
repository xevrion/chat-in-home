import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { User, Message } from './models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
require('dotenv').config();
// or, if using ES modules:
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app = express();
app.use(express.json()); // Add JSON body parsing
app.use(cors({
  origin: 'https://xevrion-chatify.vercel.app', // your Vercel frontend URL
  credentials: true
}));
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Map socket.id -> username
const users = new Map();

// --- SOCKET.IO USER MAP FOR FRIEND EVENTS ---
const userSocketMap = new Map();

const uri = process.env.MONGODB_URI;

mongoose.set('strictQuery', true);

mongoose.connect(uri!, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as any).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

function authMiddleware(req: Request, res: Response, next: Function) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Registration endpoint
app.post('/api/register', async (req: Request, res: Response): Promise<void> => {
  const { name, id, email, password } = req.body;
  if (!name || !id || !email || !password) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    const existing = await User.findOne({ $or: [{ id }, { email }] });
    if (existing) {
      res.status(409).json({ error: 'User with that id or email already exists' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, id, email, password: hashed });
    res.json({ message: 'User registered', user: { name: user.name, id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/login', async (req: Request, res: Response): Promise<void> => {
  const { id, email, password } = req.body;
  if ((!id && !email) || !password) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    const user = await User.findOne(id ? { id } : { email });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protect /api/messages
app.get('/api/messages', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) {
    res.status(400).json({ error: 'Missing user1 or user2' });
    return;
  }
  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ date: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/users', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Exclude the current user from the list
    const currentUserId = (req as any).user.id;
    const users = await User.find({ id: { $ne: currentUserId } }, { password: 0 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user info
app.get('/api/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findOne({ id: userId }, { password: 0 });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// --- FRIEND SYSTEM ENDPOINTS ---

// Send a friend request
app.post('/api/friend-request', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const fromId = (req as any).user.id;
  const { to } = req.body;
  if (!to || fromId === to) { res.status(400).json({ error: 'Invalid user' }); return; }
  const toUser = await User.findOne({ id: to });
  if (!toUser) { res.status(404).json({ error: 'User not found' }); return; }
  if (toUser.friends.includes(fromId)) { res.status(409).json({ error: 'Already friends' }); return; }
  const alreadyRequested = toUser.friendRequests.some(r => r.from === fromId && r.to === to && r.status === 'pending');
  if (alreadyRequested) { res.status(409).json({ error: 'Request already sent' }); return; }
  toUser.friendRequests.push({ from: fromId, to, status: 'pending' });
  await toUser.save();
  res.json({ message: 'Friend request sent' });
  // After saving request:
  const toSocket = userSocketMap.get(to);
  if (toSocket) io.to(toSocket).emit('friend:request', { from: fromId, to });
});

// Get all friend requests (incoming and outgoing)
app.get('/api/friend-requests', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;
  const user = await User.findOne({ id: userId });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const incoming = user.friendRequests.filter(r => r.to === userId && r.status === 'pending');
  const outgoing = (await User.find({ 'friendRequests.from': userId })).flatMap(u =>
    u.friendRequests.filter(r => r.from === userId && r.status === 'pending')
  );
  res.json({ incoming, outgoing });
});

// Accept friend request
app.post('/api/friend-request/:requestId/accept', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;
  const { requestId } = req.params;
  const user = await User.findOne({ id: userId });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const request = user.friendRequests.find(r => r._id && r._id.toString() === requestId);
  if (!request || request.to !== userId || request.status !== 'pending') { res.status(404).json({ error: 'Request not found' }); return; }
  request.status = 'accepted';
  if (!user.friends.includes(request.from)) user.friends.push(request.from);
  await user.save();
  const fromUser = await User.findOne({ id: request.from });
  if (fromUser) {
    if (!fromUser.friends.includes(userId)) fromUser.friends.push(userId);
    fromUser.friendRequests = fromUser.friendRequests.map(r =>
      (r.from === userId && r.to === fromUser.id && r.status === 'pending') ? { ...r, status: 'accepted' } : r
    );
    await fromUser.save();
  }
  res.json({ message: 'Friend request accepted' });
  // After updating both users:
  const fromSocket = userSocketMap.get(request.from);
  const toSocket = userSocketMap.get(request.to);
  if (fromSocket) io.to(fromSocket).emit('friend:accept', { from: request.from, to: request.to });
  if (toSocket) io.to(toSocket).emit('friend:accept', { from: request.from, to: request.to });
});

// Decline friend request
app.post('/api/friend-request/:requestId/decline', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;
  const { requestId } = req.params;
  const user = await User.findOne({ id: userId });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const request = user.friendRequests.find(r => r._id && r._id.toString() === requestId);
  if (!request || request.to !== userId || request.status !== 'pending') { res.status(404).json({ error: 'Request not found' }); return; }
  request.status = 'declined';
  await user.save();
  res.json({ message: 'Friend request declined' });
  // After updating request:
  const fromSocket = userSocketMap.get(request.from);
  const toSocket = userSocketMap.get(request.to);
  if (fromSocket) io.to(fromSocket).emit('friend:decline', { from: request.from, to: request.to });
  if (toSocket) io.to(toSocket).emit('friend:decline', { from: request.from, to: request.to });
});

// Get friends list
app.get('/api/friends', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;
  const user = await User.findOne({ id: userId });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const friends = await User.find({ id: { $in: user.friends } }, { password: 0 });
  res.json(friends);
});

// Remove friend (from both users, and delete chat messages)
app.post('/api/remove-friend', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;
  const { friendId } = req.body;
  if (!friendId) { res.status(400).json({ error: 'Missing friendId' }); return; }
  const user = await User.findOne({ id: userId });
  const friend = await User.findOne({ id: friendId });
  if (!user || !friend) { res.status(404).json({ error: 'User not found' }); return; }
  user.friends = user.friends.filter(f => f !== friendId);
  friend.friends = friend.friends.filter(f => f !== userId);
  await user.save();
  await friend.save();
  await Message.deleteMany({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId }
    ]
  });
  res.json({ message: 'Friend removed and chat deleted' });
  // After removing from both users:
  const user1Socket = userSocketMap.get(userId);
  const user2Socket = userSocketMap.get(friendId);
  if (user1Socket) io.to(user1Socket).emit('friend:remove', { from: userId, to: friendId });
  if (user2Socket) io.to(user2Socket).emit('friend:remove', { from: userId, to: friendId });
});

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // User joins with their username
  socket.on('user:join', ({ username }) => {
    users.set(socket.id, username);
    userSocketMap.set(username, socket.id);
    // Send the current online users to the new user
    const onlineUsers = Array.from(users.values());
    socket.emit('user:online-list', { onlineUsers });
    // Notify others this user is online
    socket.broadcast.emit('user:online', { username });
  });

  // Direct messaging
  socket.on('chat:message', async (msg) => {
    // Save to MongoDB
    try {
      await Message.create({
        id: msg.id,
        sender: msg.sender,
        receiver: msg.receiver,
        text: msg.text,
        date: msg.date,
        status: msg.status,
      });
    } catch (err) {
      console.error('Failed to save message:', err);
    }

    // msg should have: id, sender, receiver, text, date, status
    const recipientSocketId = [...users.entries()]
      .find(([id, name]) => name === msg.receiver)?.[0];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('chat:message', msg);
    }
    // Optionally, echo to sender for confirmation (not needed if sender updates UI optimistically)
  });

  // Delivery event
  socket.on('chat:delivered', ({ messageId, sender, receiver }) => {
    const senderSocketId = [...users.entries()]
      .find(([id, name]) => name === sender)?.[0];
    if (senderSocketId) {
      io.to(senderSocketId).emit('chat:delivered', { messageId, receiver });
    }
  });

  // Typing indicator
  socket.on('chat:typing', ({ sender, receiver }) => {
    const recipientSocketId = [...users.entries()]
      .find(([id, name]) => name === receiver)?.[0];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('chat:typing', { sender, receiver });
    }
  });

  // Seen event
  socket.on('chat:seen', ({ messageId, sender, receiver }) => {
    const senderSocketId = [...users.entries()]
      .find(([id, name]) => name === sender)?.[0];
    if (senderSocketId) {
      io.to(senderSocketId).emit('chat:seen', { messageId, receiver });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    userSocketMap.delete(username!); // Remove from userSocketMap on disconnect
    if (username) {
      socket.broadcast.emit('user:offline', { username });
      console.log(`🔴 ${username} disconnected`);
    }
  });
});

httpServer.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});