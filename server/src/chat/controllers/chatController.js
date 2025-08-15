const ChatChannel = require('../models/ChatChannel');
const ChatMessage = require('../models/ChatMessage');

exports.createChannel = async (req, res) => {
  const { name, projectId, members, createdBy } = req.body;
  const hasQC = await checkQC(members);
  if (!hasQC) return res.status(400).json({ error: 'At least one QC Admin is required' });
  const channel = await ChatChannel.create({ name, projectId, members, createdBy });
  res.json(channel);
};

exports.getChannelsByProject = async (req, res) => {
  const channels = await ChatChannel.find({ projectId: req.params.projectId });
  res.json(channels);
};

exports.getMessages = async (req, res) => {
  const messages = await ChatMessage.find({ channelId: req.params.channelId });
  res.json(messages);
};

const checkQC = async (members) => {
  // Implement your user service to fetch user roles by ID
  return true; // dummy logic, you must replace with actual role check
};