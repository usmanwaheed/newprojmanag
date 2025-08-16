import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  messageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatRoomSchema.index({ projectId: 1, isActive: 1 });
chatRoomSchema.index({ members: 1 });
chatRoomSchema.index({ createdAt: -1 });

export default mongoose.model('ChatRoom', chatRoomSchema);

// server/src/models/ChatMessage.js
const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderAvatar: {
    type: String
  },
  content: {
    type: String,
    required: true,
    maxLength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'link', 'system'],
    default: 'text'
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileType: {
    type: String
  },
  fileSize: {
    type: Number
  },
  linkPreview: {
    title: String,
    description: String,
    image: String,
    url: String
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  edited: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    originalContent: String
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes for better performance
chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1 });
chatMessageSchema.index({ isDeleted: 1 });
chatMessageSchema.index({ content: 'text' }); // For text search

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// server/src/models/UserStatus.js
const userStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['online', 'away', 'busy', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  currentProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  socketId: String,
  deviceInfo: {
    type: String
  }
}, {
  timestamps: true
});

// Auto-update lastSeen when status changes
userStatusSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'offline') {
    this.lastSeen = new Date();
  }
  next();
});

export const UserStatus = mongoose.model('UserStatus', userStatusSchema);