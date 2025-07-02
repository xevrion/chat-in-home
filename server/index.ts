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

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  socket.on('chat:message', (msg) => {
    console.log('💬 Message:', msg);
    // broadcast to all *except* sender
    socket.broadcast.emit('chat:message', msg);
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

httpServer.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
