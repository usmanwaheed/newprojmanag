const ChatMessage = require('../models/ChatMessage');

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('joinChannel', (channelId) => {
      socket.join(channelId);
    });

    socket.on('sendMessage', async (data) => {
      const message = await ChatMessage.create(data);
      io.to(data.channelId).emit('newMessage', message);
    });
  });
};