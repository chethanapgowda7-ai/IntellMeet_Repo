const Message = require('../models/Message.model');
const TeamMessage = require('../models/TeamMessage.model');
const Meeting = require('../models/Meeting.model');
const User = require('../models/User.model');

const userSocketMap = new Map();

const initializeSocket = (io) => {
  const meetingRooms = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('register-user', (userId) => {
      if (userId) { userSocketMap.set(userId.toString(), socket.id); socket.userId = userId.toString(); }
    });

    socket.on('join-meeting', async ({ meetingCode, userId, userName }) => {
      socket.join(meetingCode);
      if (!meetingRooms.has(meetingCode)) meetingRooms.set(meetingCode, new Map());
      const room = meetingRooms.get(meetingCode);
      for (const [existingSocketId, participant] of room.entries()) {
        if (participant.userId === userId) {
          room.delete(existingSocketId);
          const oldSocket = io.sockets.sockets.get(existingSocketId);
          if (oldSocket) oldSocket.leave(meetingCode);
          socket.to(meetingCode).emit('user-left', { socketId: existingSocketId, userId });
        }
      }
      const existingParticipants = Array.from(room.values());
      room.set(socket.id, { userId, userName, socketId: socket.id });
      await User.findByIdAndUpdate(userId, { isOnline: true });
      await Meeting.findOneAndUpdate({ meetingCode, 'participants.user': { $ne: userId } }, { $addToSet: { participants: { user: userId, role: 'participant' } } });
      socket.to(meetingCode).emit('user-joined', { socketId: socket.id, userId, userName });
      socket.emit('existing-participants', existingParticipants);
    });

    socket.on('leave-meeting', async ({ meetingCode, userId }) => {
      socket.leave(meetingCode);
      if (meetingRooms.has(meetingCode)) { meetingRooms.get(meetingCode).delete(socket.id); if (meetingRooms.get(meetingCode).size === 0) meetingRooms.delete(meetingCode); }
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      socket.to(meetingCode).emit('user-left', { socketId: socket.id, userId });
    });

    socket.on('webrtc-offer', ({ offer, targetSocketId, fromSocketId }) => io.to(targetSocketId).emit('webrtc-offer', { offer, fromSocketId }));
    socket.on('webrtc-answer', ({ answer, targetSocketId, fromSocketId }) => io.to(targetSocketId).emit('webrtc-answer', { answer, fromSocketId }));
    socket.on('webrtc-ice-candidate', ({ candidate, targetSocketId, fromSocketId }) => io.to(targetSocketId).emit('webrtc-ice-candidate', { candidate, fromSocketId }));

    socket.on('send-message', async ({ meetingCode, meetingId, senderId, senderName, senderAvatar, content }) => {
      try {
        const message = await Message.create({ meeting: meetingId, sender: senderId, content });
        io.to(meetingCode).emit('new-message', { _id: message._id, sender: { _id: senderId, name: senderName, avatar: senderAvatar }, content, createdAt: message.createdAt });
      } catch (error) { console.error('Message error:', error); }
    });

    socket.on('typing', ({ meetingCode, userName }) => socket.to(meetingCode).emit('user-typing', { userName }));
    socket.on('stop-typing', ({ meetingCode, userName }) => socket.to(meetingCode).emit('user-stop-typing', { userName }));
    socket.on('toggle-mute', ({ meetingCode, userId, isMuted }) => socket.to(meetingCode).emit('user-mute-changed', { userId, isMuted }));
    socket.on('toggle-camera', ({ meetingCode, userId, isCameraOff }) => socket.to(meetingCode).emit('user-camera-changed', { userId, isCameraOff }));

    socket.on('force-mute', ({ meetingCode, targetUserId }) => {
      if (meetingRooms.has(meetingCode)) {
        for (const [sid, p] of meetingRooms.get(meetingCode).entries()) {
          if (p.userId === targetUserId) { io.to(sid).emit('you-were-muted'); break; }
        }
      }
      socket.to(meetingCode).emit('user-mute-changed', { userId: targetUserId, isMuted: true });
    });

    socket.on('recording-started', ({ meetingCode }) => socket.to(meetingCode).emit('recording-started'));
    socket.on('recording-stopped', ({ meetingCode }) => socket.to(meetingCode).emit('recording-stopped'));
    socket.on('screen-share-started', ({ meetingCode, userId }) => socket.to(meetingCode).emit('user-screen-sharing', { userId, socketId: socket.id }));
    socket.on('screen-share-stopped', ({ meetingCode, userId }) => socket.to(meetingCode).emit('user-screen-share-stopped', { userId }));
    socket.on('raise-hand', ({ meetingCode, userId, userName }) => io.to(meetingCode).emit('hand-raised', { userId, userName }));

    socket.on('join-team-room', (teamId) => socket.join(`team:${teamId}`));
    socket.on('leave-team-room', (teamId) => socket.leave(`team:${teamId}`));

    socket.on('send-team-message', async ({ teamId, senderId, senderName, senderAvatar, content }) => {
      try {
        const message = await TeamMessage.create({ team: teamId, sender: senderId, content });
        io.to(`team:${teamId}`).emit('new-team-message', { _id: message._id, sender: { _id: senderId, name: senderName, avatar: senderAvatar }, content, createdAt: message.createdAt });
      } catch (error) { console.error('Team message error:', error); }
    });

    socket.on('team-typing', ({ teamId, userName }) => socket.to(`team:${teamId}`).emit('team-user-typing', { userName }));
    socket.on('team-stop-typing', ({ teamId, userName }) => socket.to(`team:${teamId}`).emit('team-user-stop-typing', { userName }));
    socket.on('task-updated', ({ teamId, task }) => { if (teamId) socket.to(`team:${teamId}`).emit('task-updated', { task }); });
    socket.on('task-created', ({ teamId, task }) => { if (teamId) socket.to(`team:${teamId}`).emit('task-created', { task }); });

    socket.on('disconnect', async () => {
      if (socket.userId) userSocketMap.delete(socket.userId);
      for (const [meetingCode, participants] of meetingRooms.entries()) {
        if (participants.has(socket.id)) {
          const user = participants.get(socket.id);
          participants.delete(socket.id);
          if (user?.userId) await User.findByIdAndUpdate(user.userId, { isOnline: false, lastSeen: new Date() });
          socket.to(meetingCode).emit('user-left', { socketId: socket.id, userId: user?.userId });
          if (participants.size === 0) meetingRooms.delete(meetingCode);
          break;
        }
      }
    });
  });
};

const sendNotificationToUser = (io, userId, notification) => {
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) io.to(socketId).emit('new-notification', notification);
};

module.exports = { initializeSocket, sendNotificationToUser };