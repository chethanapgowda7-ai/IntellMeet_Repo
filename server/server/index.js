const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const meetingRoutes = require('./routes/meeting.routes');
const chatRoutes = require('./routes/chat.routes');
const taskRoutes = require('./routes/task.routes');
const teamRoutes = require('./routes/team.routes');
const aiRoutes = require('./routes/ai.routes');
const teamChatRoutes = require('./routes/team-chat.routes');
const notificationRoutes = require('./routes/notification.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const { initializeSocket } = require('./services/socket.service');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: (origin, callback) => callback(null, true), methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true },
});

app.use((req, res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); next(); });
app.use(helmet());
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/team-chat', teamChatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'IntellMeet API is running' }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' }); });

initializeSocket(io);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => { console.log('MongoDB Connected'); httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`)); })
  .catch((err) => { console.error('MongoDB connection error:', err); process.exit(1); });