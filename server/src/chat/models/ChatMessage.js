const mongoose = require('mongoose');
const ChatMessageSchema = new mongoose.Schema({
  channelId: mongoose.Schema.Types.ObjectId,
  senderId: mongoose.Schema.Types.ObjectId,
  message: String,
  attachments: [String],
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ChatMessage', ChatMessageSchema);