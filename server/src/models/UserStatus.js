import mongoose from 'mongoose';

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