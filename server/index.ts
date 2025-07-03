import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // allow all for now
  }
});

const users = new Map(); // socket.id -> username

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  socket.on('chat:message', (msg) => {
    console.log('💬 Message:', msg);
    // Find the recipient's socket ID
    const recipientSocketId = [...users.entries()]
      .find(([id, name]) => name === msg.receiver)?.[0];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('chat:message', msg);
    }
    // Optionally, also emit to the sender (for delivery confirmation)
    // socket.emit('chat:message', msg);
  });

  socket.on('chat:typing', ({ sender, receiver }) => {
    // console.log('⌨️ Typing:', sender, '->', receiver);
    socket.broadcast.emit('chat:typing', { sender, receiver });
  });

  socket.on('user:join', ({ username }) => {
    users.set(socket.id, username);
    // Send the current online users to the new user
    const onlineUsers = Array.from(users.values());
    socket.emit('user:online-list', { onlineUsers });
    // Notify others this user is online
    socket.broadcast.emit('user:online', { username });
  });

  socket.on('chat:delivered', ({ messageId, sender, receiver }) => {
    // Find sender's socket
    const senderSocketId = [...users.entries()].find(([id, name]) => name === sender)?.[0];
    if (senderSocketId) {
      io.to(senderSocketId).emit('chat:delivered', { messageId, receiver });
    }
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    if (username) {
      socket.broadcast.emit('user:offline', { username });
      console.log(`🔴 ${username} disconnected`);
    }
  });
});

httpServer.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
