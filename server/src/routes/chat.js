/* eslint-disable no-unused-vars */
// Chat routes with unique handlers
import express from 'express';
import multer from 'multer';
import ChatRoom from '../models/ChatRoom.js';
import { ChatMessage, UserStatus } from '../models/ChatMessage.js';
import ProjectRole from '../models/projectRole.js';
import { Project } from '../models/project.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { extractLinkPreview } from '../utils/linkPreview.js';
import { verifyUser } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/roles.js';

const router = express.Router();
router.use(verifyUser());
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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

// Debug logs
console.log('Chat routes loaded');

// ---------------------- Chat Room Routes ----------------------

// Get all users assigned to a project for selection in chat rooms
router.route('/rooms/:projectId/users').get(async (req, res) => {
  try {
    const { projectId } = req.params;

    const companyId = req.user.role === ROLES.COMPANY ? req.user._id : req.user.companyId;

    // Ensure the project belongs to the requesting company
    const project = await Project.findOne({ _id: projectId, companyId });
    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    const projectUsers = await ProjectRole.find({ projectId, isActive: true })
      .populate('userId', 'name avatar email companyId');

    const users = projectUsers
      .filter(pr => {
        if (!pr.userId) return false;
        const userCompany = pr.userId.companyId ? pr.userId.companyId.toString() : pr.userId._id.toString();
        return userCompany === companyId.toString();
      })
      .map(pr => ({
        _id: pr.userId._id,
        name: pr.userId.name,
        avatar: pr.userId.avatar,
        email: pr.userId.email,
        role: pr.role
      }));

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Get project users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project users',
      error: error.message
    });
  }
});

// Get all chat rooms for a project
router.route('/rooms/:projectId').get(async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user.role === ROLES.COMPANY ? req.user._id : req.user.companyId;

    // Verify project belongs to company
    const project = await Project.findOne({ _id: projectId, companyId });
    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    const rooms = await ChatRoom.find({
      projectId,
      isActive: true,
      members: req.user._id
    })
      .populate('createdBy', 'name avatar')
      .populate('lastMessage.senderId', 'name avatar')
      .sort({ updatedAt: -1 });

    const roomsWithUnreadCount = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await ChatMessage.countDocuments({
          roomId: room._id,
          'readBy.userId': { $ne: req.user._id },
          senderId: { $ne: req.user._id },
          isDeleted: false
        });
        return { ...room.toObject(), unreadCount };
      })
    );

    res.status(200).json({ success: true, data: roomsWithUnreadCount });
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
router.route('/rooms').post(async (req, res) => {
  try {
    // Extract ALL data from the request body - including members array sent from frontend
      const {
        name,
        description,
        projectId,
        isPrivate = false,
        members = []
      } = req.body; // members array supplied by the frontend
    
    console.log("Full request body:", req.body);
    console.log("Members from frontend:", members);
    console.log("User from auth middleware:", req.user);
    
    if (!name || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Room name and project ID are required'
      });
    }

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const companyId = req.user.role === ROLES.COMPANY ? req.user._id : req.user.companyId;

    // Ensure project belongs to the requesting company
    const project = await Project.findOne({ _id: projectId, companyId });
    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    // Use the members array sent from frontend and ensure creator is included
    // Filter out any null/undefined values
    const validMembers = members.filter(memberId => memberId != null);

    if (!validMembers.map(id => id.toString()).includes(req.user._id.toString())) {
      validMembers.push(req.user._id);
    }

    console.log("Valid members after filtering:", validMembers);

    // Separate members to validate (excluding creator)
    const membersToCheck = validMembers.filter(id => id.toString() !== req.user._id.toString());

    // Fetch project roles for provided members to ensure they belong to the project and company
    const projectRoles = await ProjectRole.find({
      projectId,
      userId: { $in: validMembers },
      isActive: true
    }).populate('userId', 'name avatar role companyId');

    // Filter out users not in the same company
    const filteredRoles = projectRoles.filter(pr => {
      if (!pr.userId) return false;
      const userCompany = pr.userId.companyId ? pr.userId.companyId.toString() : pr.userId._id.toString();
      return userCompany === companyId.toString();
    });

    const memberIds = filteredRoles.map(pr => pr.userId._id.toString());

    // Validate non-creator members belong to the project and company
    const nonCreatorIds = filteredRoles
      .filter(pr => pr.userId._id.toString() !== req.user._id.toString())
      .map(pr => pr.userId._id.toString());

    if (nonCreatorIds.length !== membersToCheck.length) {
      return res.status(403).json({
        success: false,
        message: 'All members must belong to your company and be assigned to the project'
      });
    }

    // Ensure the creator is included in member list
    if (!memberIds.includes(req.user._id.toString())) {
      memberIds.push(req.user._id.toString());
    }

    // Ensure at least one QC admin is part of the room
    const hasQcAdmin = filteredRoles.some(pr => pr.role === ROLES.QCADMIN);
    if (!hasQcAdmin) {
      return res.status(400).json({
        success: false,
        message: 'At least one QC Admin is required in a chat room'
      });
    }

    const existingUserIds = [...new Set(memberIds)];

    const adminIds = filteredRoles
      .filter(pr => pr.role === ROLES.QCADMIN)
      .map(pr => pr.userId._id.toString());

    const chatRoom = new ChatRoom({
      name: name.trim(),
      description: description?.trim() || '',
      projectId,
      createdBy: req.user._id,
      members: existingUserIds, // Use the members from frontend payload filtered by project/company membership
      admins: [...new Set([req.user._id.toString(), ...adminIds])],
      isPrivate
    });

    console.log("Chat room before save:", chatRoom);

    await chatRoom.save();
    await chatRoom.populate([
      { path: 'createdBy', select: 'name avatar' },
      { path: 'members', select: 'name avatar role' }
    ]);

    console.log("Chat room after save and populate:", chatRoom);

    // Emit socket event
    req.io?.to(`project_${projectId}`).emit('room_created', chatRoom);

    return res.status(201).json({
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
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ success: false, message: 'Failed to update room', error: error.message });
  }
});

// Update a chat room
router.route('/rooms/:roomId').put(async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Chat room not found' });

    if (!room.members.some(memberId => memberId.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Access denied to this chat room' });
    }

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description.trim();

    await room.save();

    req.io?.to(`room_${roomId}`).emit('room_updated', {
      roomId,
      name: room.name,
      description: room.description
    });

    res.status(200).json({
      success: true,
      data: { name: room.name, description: room.description }
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ success: false, message: 'Failed to update room', error: error.message });
  }
});

// Update a chat room
router.route('/rooms/:roomId').put(async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Chat room not found' });

    if (!room.members.some(memberId => memberId.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Access denied to this chat room' });
    }

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description.trim();

    await room.save();

    req.io?.to(`room_${roomId}`).emit('room_updated', {
      roomId,
      name: room.name,
      description: room.description
    });

    // Return updated fields so client state stays in sync
    return res.status(200).json({
      success: true,
      data: { name: room.name, description: room.description }
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ success: false, message: 'Failed to update room', error: error.message });
  }
});

// Update a chat room
router.route('/rooms/:roomId').put(async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Chat room not found' });

    if (!room.members.some(memberId => memberId.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Access denied to this chat room' });
    }

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description.trim();

    await room.save();

    req.io?.to(`room_${roomId}`).emit('room_updated', {
      roomId,
      name: room.name,
      description: room.description
    });

    // Return updated fields so client state stays in sync
    return res.status(200).json({
      success: true,
      data: { name: room.name, description: room.description }
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ success: false, message: 'Failed to update room', error: error.message });
  }
});

// Update a chat room
router.route('/rooms/:roomId').put(async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Chat room not found' });

    if (!room.members.some(memberId => memberId.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Access denied to this chat room' });
    }

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description.trim();

    await room.save();

    req.io?.to(`room_${roomId}`).emit('room_updated', {
      roomId,
      name: room.name,
      description: room.description
    });

    // Return updated fields so client state stays in sync
    return res.status(200).json({
      success: true,
      data: { name: room.name, description: room.description }
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ success: false, message: 'Failed to update room', error: error.message });
  }
});

// Join a chat room
router.route('/rooms/:roomId/join').post(async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Chat room not found' });

    if (room.members.includes(req.user._id)) {
      return res.status(200).json({ success: true, message: 'Already a member of this room' });
    }

    room.members.push(req.user._id);
    await room.save();

    req.io?.to(`room_${roomId}`).emit('user_joined_room', {
      userId: req.user._id,
      userName: req.user.name,
      roomId
    });

    res.status(200).json({ success: true, message: 'Successfully joined the room' });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ success: false, message: 'Failed to join room', error: error.message });
  }
});

// Leave a chat room
router.route('/rooms/:roomId/leave').post(async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Chat room not found' });

    room.members = room.members.filter(memberId => !memberId.equals(req.user._id));
    await room.save();

    req.io?.to(`room_${roomId}`).emit('user_left_room', {
      userId: req.user._id,
      userName: req.user.name,
      roomId
    });

    res.status(200).json({ success: true, message: 'Successfully left the room' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave room', error: error.message });
  }
});

// ---------------------- Message Routes ----------------------

// Get messages
router.route('/rooms/:roomId/messages').get(async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(403).json({ success: false, message: 'Access denied to this chat room' });

    const messages = await ChatMessage.find({ roomId, isDeleted: false })
      .populate('senderId', 'name avatar')
      .populate('replyTo', 'content senderId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    await ChatMessage.updateMany(
      { roomId, senderId: { $ne: req.user._id }, 'readBy.userId': { $ne: req.user._id } },
      { $push: { readBy: { userId: req.user._id, readAt: new Date() } } }
    );

    res.status(200).json({
      success: true,
      data: messages.reverse(),
      pagination: { page: parseInt(page), limit: parseInt(limit), total: await ChatMessage.countDocuments({ roomId, isDeleted: false }) }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
  }
});

// Send a message
router.route('/rooms/:roomId/messages').post(async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text', replyTo } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Message content is required' });

    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(403).json({ success: false, message: 'Access denied to this chat room' });

    let messageData = {
      roomId,
      senderId: req.user._id,
      senderName: req.user.name,
      senderAvatar: req.user.avatar,
      content: content.trim(),
      type
    };

    if (replyTo) messageData.replyTo = replyTo;

    if (type === 'text') {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = content.match(urlRegex);
      if (urls?.length > 0) {
        try {
          const linkPreview = await extractLinkPreview(urls[0]);
          if (linkPreview) {
            messageData.type = 'link';
            messageData.linkPreview = linkPreview;
          }
        } catch (err) {
          console.log('Link preview extraction failed:', err.message);
        }
      }
    }

    const message = new ChatMessage(messageData);
    await message.save();

    room.lastMessage = { content: content.trim(), senderId: req.user._id, timestamp: new Date() };
    room.messageCount += 1;
    await room.save();

    await message.populate('senderId', 'name avatar');

    req.io?.to(`room_${roomId}`).emit('new_message', { ...message.toObject(), roomName: room.name });

    res.status(201).json({ success: true, data: message, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
});

// Upload file
router.route('/upload').post(upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ success: false, message: 'Room ID is required' });

    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(403).json({ success: false, message: 'Access denied to this chat room' });

    const uploadResult = await uploadOnCloudinary(req.file.buffer, { folder: 'chat-files', resource_type: 'auto' });

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
    res.status(500).json({ success: false, message: 'Failed to upload file', error: error.message });
  }
});

// Delete a message
router.route('/messages/:messageId').delete(async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await ChatMessage.findOne({ _id: messageId, senderId: req.user._id });
    if (!message) return res.status(404).json({ success: false, message: 'Message not found or access denied' });

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    req.io?.to(`room_${message.roomId}`).emit('message_deleted', { messageId, roomId: message.roomId });

    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message', error: error.message });
  }
});

// Edit a message
router.route('/messages/:messageId').put(async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Message content is required' });

    const message = await ChatMessage.findOne({ _id: messageId, senderId: req.user._id });
    if (!message) return res.status(404).json({ success: false, message: 'Message not found or access denied' });

    if (!message.edited.isEdited) message.edited.originalContent = message.content;
    message.content = content.trim();
    message.edited.isEdited = true;
    message.edited.editedAt = new Date();
    await message.save();

    req.io?.to(`room_${message.roomId}`).emit('message_edited', {
      messageId,
      newContent: content.trim(),
      editedAt: message.edited.editedAt,
      roomId: message.roomId
    });

    res.status(200).json({ success: true, data: message, message: 'Message updated successfully' });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ success: false, message: 'Failed to edit message', error: error.message });
  }
});

// Search messages
router.route('/rooms/:roomId/search').get(async (req, res) => {
  try {
    const { roomId } = req.params;
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters long' });

    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(403).json({ success: false, message: 'Access denied to this chat room' });

    const searchResults = await ChatMessage.find({ roomId, isDeleted: false, $text: { $search: q.trim() } })
      .populate('senderId', 'name avatar')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: searchResults, query: q.trim() });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to search messages', error: error.message });
  }
});

// ---------------------- User Status Routes ----------------------

// Update user status
router.route('/users/status').put(async (req, res) => {
  try {
    const { status } = req.body;
    if (!['online', 'away', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    await UserStatus.findOneAndUpdate(
      { userId: req.user._id },
      { status, lastSeen: new Date(), deviceInfo: req.get('User-Agent') },
      { upsert: true, new: true }
    );

    req.io?.emit('user_status_updated', {
      userId: req.user._id,
      status,
      userName: req.user.name,
      userAvatar: req.user.avatar
    });

    res.status(200).json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
});

// Get online users
router.route('/users/online/:projectId').get(async (req, res) => {
  try {
    const { projectId } = req.params;

    const onlineUsers = await UserStatus.find({
      status: { $in: ['online', 'away', 'busy'] },
      currentProject: projectId,
      lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).populate('userId', 'name avatar email').lean();

    const formattedUsers = onlineUsers.map(status => ({
      userId: status.userId._id,
      userName: status.userId.name,
      userAvatar: status.userId.avatar,
      userEmail: status.userId.email,
      status: status.status,
      lastSeen: status.lastSeen
    }));

    res.status(200).json({ success: true, data: formattedUsers });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch online users', error: error.message });
  }
});

export default router;
