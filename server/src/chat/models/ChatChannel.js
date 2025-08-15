const mongoose = require('mongoose');
const ChatChannelSchema = new mongoose.Schema({
  name: String,
  projectId: mongoose.Schema.Types.ObjectId,
  members: [mongoose.Schema.Types.ObjectId],
  createdBy: mongoose.Schema.Types.ObjectId
});
module.exports = mongoose.model('ChatChannel', ChatChannelSchema);