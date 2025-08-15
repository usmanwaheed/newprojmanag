const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/channel', chatController.createChannel);
router.get('/channels/:projectId', chatController.getChannelsByProject);
router.get('/messages/:channelId', chatController.getMessages);

module.exports = router;