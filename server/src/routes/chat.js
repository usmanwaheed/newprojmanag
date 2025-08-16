import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import ChatRoom from '../models/ChatRoom.js';
import { ChatMessage, UserStatus } from '../models/ChatMessage.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { extractLinkPreview } from '../utils/linkPreview.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and other common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Chat Room Routes

// Get all chat rooms for a project
router.get('/rooms/:projectId', protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const rooms = await ChatRoom.find({
      projectId,
      isActive: true,
      members: req.user._id
    })
    .populate('createdBy', 'name avatar')
    .populate('lastMessage.senderId', 'name avatar')
    .sort({ updatedAt: -1 });

    // Add unread count for each room
    const roomsWithUnreadCount = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await ChatMessage.countDocuments({
          roomId: room._id,
          'readBy.userId': { $ne: req.user._id },
          senderId: { $ne: req.user._id },
          isDeleted: false
        });

        return {
          ...room.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: roomsWithUnreadCount
    });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms',
      error: error.message
    });
  }
});

// Create a new chat room
router.post('/rooms', protect, async (req, res) => {
  try {
    const { name, description, projectId, isPrivate = false } = req.body;

    if (!name || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Room name and project ID are required'
      });
    }

    // Check if user has access to the project
    // You should implement project access validation here

    // Get all QC Admins for the project to auto-add them
    const qcAdmins = await User.find({
      role: 'QcAdmin',
      // Add project-specific filtering logic here
    }).select('_id');

    const members = [req.user._id, ...qcAdmins.map(admin => admin._id)];

    const chatRoom = new ChatRoom({
      name: name.trim(),
      description: description?.trim(),
      projectId,
      createdBy: req.user._id,
      members: [...new Set(members)], // Remove duplicates
      admins: [req.user._id, ...qcAdmins.map(admin => admin._id)],
      isPrivate
    });

    await chatRoom.save();
    await chatRoom.populate('createdBy', 'name avatar');

    // Emit socket event for real-time update
    req.io?.to(`project_${projectId}`).emit('room_created', chatRoom);

    res.status(201).json({
      success: true,
      data: chatRoom,
      message: 'Chat room created successfully'
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: error.message
    });
  }
});

// Join a chat room
router.post('/rooms/:roomId/join', protect, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // Check if user is already a member
    if (room.members.includes(req.user._id)) {
      return res.status(200).json({
        success: true,
        message: 'Already a member of this room'
      });
    }

    // Add user to room members
    room.members.push(req.user._id);
    await room.save();

    // Emit socket event
    req.io?.to(`room_${roomId}`).emit('user_joined_room', {
      userId: req.user._id,
      userName: req.user.name,
      roomId
    });

    res.status(200).json({
      success: true,
      message: 'Successfully joined the room'
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room',
      error: error.message
    });
  }
});

// Leave a chat room
router.post('/rooms/:roomId/leave', protect, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // Remove user from room members
    room.members = room.members.filter(memberId => !memberId.equals(req.user._id));
    await room.save();

    // Emit socket event
    req.io?.to(`room_${roomId}`).emit('user_left_room', {
      userId: req.user._id,
      userName: req.user.name,
      roomId
    });

    res.status(200).json({
      success: true,
      message: 'Successfully left the room'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room',
      error: error.message
    });
  }
});

// Message Routes

// Get messages for a room
router.get('/rooms/:roomId/messages', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to the room
    const room = await ChatRoom.findOne({
      _id: roomId,
      members: req.user._id
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    const messages = await ChatMessage.find({
      roomId,
      isDeleted: false
    })
    .populate('senderId', 'name avatar')
    .populate('replyTo', 'content senderId')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        roomId,
        senderId: { $ne: req.user._id },
        'readBy.userId': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            userId: req.user._id,
            readAt: new Date()
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await ChatMessage.countDocuments({ roomId, isDeleted: false })
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// Send a message
router.post('/rooms/:roomId/messages', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text', replyTo } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Check if user has access to the room
    const room = await ChatRoom.findOne({
      _id: roomId,
      members: req.user._id
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    let messageData = {
      roomId,
      senderId: req.user._id,
      senderName: req.user.name,
      senderAvatar: req.user.avatar,
      content: content.trim(),
      type
    };

    // Handle reply
    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    // Handle link preview for URLs
    if (type === 'text') {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = content.match(urlRegex);
      if (urls && urls.length > 0) {
        try {
          const linkPreview = await extractLinkPreview(urls[0]);
          if (linkPreview) {
            messageData.type = 'link';
            messageData.linkPreview = linkPreview;
          }
        } catch (error) {
          console.log('Link preview extraction failed:', error.message);
        }
      }
    }

    const message = new ChatMessage(messageData);
    await message.save();
    
    // Update room's last message
    room.lastMessage = {
      content: content.trim(),
      senderId: req.user._id,
      timestamp: new Date()
    };
    room.messageCount += 1;
    await room.save();

    // Populate message for response
    await message.populate('senderId', 'name avatar');

    // Emit socket event for real-time delivery
    req.io?.to(`room_${roomId}`).emit('new_message', {
      ...message.toObject(),
      roomName: room.name
    });

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// File upload for chat
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Check if user has access to the room
    const room = await ChatRoom.findOne({
      _id: roomId,
      members: req.user._id
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    // Upload to Cloudinary or your preferred storage
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'chat-files',
      resource_type: 'auto'
    });

    res.status(200).json({
      success: true,
      data: {
        fileUrl: uploadResult.secure_url,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        publicId: uploadResult.public_id
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

// Delete a message
router.delete('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findOne({
      _id: messageId,
      senderId: req.user._id
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    // Emit socket event
    req.io?.to(`room_${message.roomId}`).emit('message_deleted', {
      messageId,
      roomId: message.roomId
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

// Edit a message
router.put('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = await ChatMessage.findOne({
      _id: messageId,
      senderId: req.user._id
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // Store original content for history
    if (!message.edited.isEdited) {
      message.edited.originalContent = message.content;
    }

    message.content = content.trim();
    message.edited.isEdited = true;
    message.edited.editedAt = new Date();
    
    await message.save();

    // Emit socket event
    req.io?.to(`room_${message.roomId}`).emit('message_edited', {
      messageId,
      newContent: content.trim(),
      editedAt: message.edited.editedAt,
      roomId: message.roomId
    });

    res.status(200).json({
      success: true,
      data: message,
      message: 'Message updated successfully'
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
      error: error.message
    });
  }
});

// Search messages in a room
router.get('/rooms/:roomId/search', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Check if user has access to the room
    const room = await ChatRoom.findOne({
      _id: roomId,
      members: req.user._id
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    const searchResults = await ChatMessage.find({
      roomId,
      isDeleted: false,
      $text: { $search: q.trim() }
    })
    .populate('senderId', 'name avatar')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(50);

    res.status(200).json({
      success: true,
      data: searchResults,
      query: q.trim()
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message
    });
  }
});

// User Status Routes

// Update user status
router.put('/users/status', protect, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['online', 'away', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    await UserStatus.findOneAndUpdate(
      { userId: req.user._id },
      { 
        status,
        lastSeen: new Date(),
        deviceInfo: req.get('User-Agent')
      },
      { upsert: true, new: true }
    );

    // Emit socket event
    req.io?.emit('user_status_updated', {
      userId: req.user._id,
      status,
      userName: req.user.name,
      userAvatar: req.user.avatar
    });

    res.status(200).json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// Get online users for a project
router.get('/users/online/:projectId', protect, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project members who are online
    const onlineUsers = await UserStatus.find({
      status: { $in: ['online', 'away', 'busy'] },
      currentProject: projectId,
      lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    })
    .populate('userId', 'name avatar email')
    .lean();

    const formattedUsers = onlineUsers.map(status => ({
      userId: status.userId._id,
      userName: status.userId.name,
      userAvatar: status.userId.avatar,
      userEmail: status.userId.email,
      status: status.status,
      lastSeen: status.lastSeen
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch online users',
      error: error.message
    });
  }
});

export default router;