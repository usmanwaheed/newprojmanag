// server/src/socket/chatSocket.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { UserStatus } from '../models/ChatMessage.js';
import ChatRoom from '../models/ChatRoom.js';

const connectedUsers = new Map(); // Store socket connections
const userRooms = new Map(); // Track which rooms users are in
const typingUsers = new Map(); // Track typing indicators

// Socket authentication middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.userName = user.name;
    socket.userAvatar = user.avatar;
    socket.user = user;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// Initialize Socket.IO with proper CORS
export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`User ${socket.userName} connected with socket ID: ${socket.id}`);
    
    // Store connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      userName: socket.userName,
      userAvatar: socket.userAvatar,
      projects: new Set()
    });

    // Update user status to online
    updateUserStatus(socket.userId, 'online', socket.id);

    // Handle joining a project
    socket.on('join_project', async ({ projectId }) => {
      try {
        if (!projectId) return;

        const projectRoom = `project_${projectId}`;
        await socket.join(projectRoom);
        
        // Add project to user's active projects
        const userConnection = connectedUsers.get(socket.userId);
        if (userConnection) {
          userConnection.projects.add(projectId);
        }

        // Update user status with current project
        await UserStatus.findOneAndUpdate(
          { userId: socket.userId },
          { 
            currentProject: projectId,
            socketId: socket.id,
            status: 'online'
          },
          { upsert: true }
        );

        // Get and emit current online users for this project
        const onlineUsers = await getOnlineUsersForProject(projectId);
        socket.to(projectRoom).emit('user_joined', {
          userId: socket.userId,
          userName: socket.userName,
          userAvatar: socket.userAvatar,
          projectId
        });

        socket.emit('users_online', onlineUsers);
        
        console.log(`User ${socket.userName} joined project ${projectId}`);
      } catch (error) {
        console.error('Join project error:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle leaving a project
    socket.on('leave_project', ({ projectId }) => {
      const projectRoom = `project_${projectId}`;
      socket.leave(projectRoom);
      
      // Remove project from user's active projects
      const userConnection = connectedUsers.get(socket.userId);
      if (userConnection) {
        userConnection.projects.delete(projectId);
      }

      socket.to(projectRoom).emit('user_left', socket.userId);
      console.log(`User ${socket.userName} left project ${projectId}`);
    });

    // Handle joining a chat room
    socket.on('join_room', async ({ roomId }) => {
      try {
        if (!roomId) return;

        // Verify user has access to the room
        const room = await ChatRoom.findOne({
          _id: roomId,
          members: socket.userId
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied to chat room' });
          return;
        }

        const chatRoom = `room_${roomId}`;
        await socket.join(chatRoom);
        
        // Track user's rooms
        if (!userRooms.has(socket.userId)) {
          userRooms.set(socket.userId, new Set());
        }
        userRooms.get(socket.userId).add(roomId);

        socket.to(chatRoom).emit('user_joined_room', {
          userId: socket.userId,
          userName: socket.userName,
          userAvatar: socket.userAvatar,
          roomId
        });

        console.log(`User ${socket.userName} joined chat room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    // Handle leaving a chat room
    socket.on('leave_room', ({ roomId }) => {
      const chatRoom = `room_${roomId}`;
      socket.leave(chatRoom);
      
      // Remove from user's rooms tracking
      const rooms = userRooms.get(socket.userId);
      if (rooms) {
        rooms.delete(roomId);
      }

      socket.to(chatRoom).emit('user_left_room', {
        userId: socket.userId,
        userName: socket.userName,
        roomId
      });

      console.log(`User ${socket.userName} left chat room ${roomId}`);
    });

    // Handle sending messages (real-time broadcast)
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, userId, userName, userAvatar, timestamp } = data;
        
        if (userId !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized message sending' });
          return;
        }

        // Verify user has access to the room
        const room = await ChatRoom.findOne({
          _id: roomId,
          members: socket.userId
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied to chat room' });
          return;
        }

        const chatRoom = `room_${roomId}`;
        
        // Broadcast message to all users in the room
        socket.to(chatRoom).emit('new_message', {
          ...message,
          roomId,
          senderId: userId,
          senderName: userName,
          senderAvatar: userAvatar,
          timestamp,
          roomName: room.name
        });

        console.log(`Message sent in room ${roomId} by ${userName}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ roomId, isTyping }) => {
      try {
        const chatRoom = `room_${roomId}`;
        
        if (isTyping) {
          // Add user to typing list
          if (!typingUsers.has(roomId)) {
            typingUsers.set(roomId, new Set());
          }
          typingUsers.get(roomId).add(socket.userId);
          
          // Clear typing after timeout
          setTimeout(() => {
            const roomTypers = typingUsers.get(roomId);
            if (roomTypers) {
              roomTypers.delete(socket.userId);
              if (roomTypers.size === 0) {
                typingUsers.delete(roomId);
              }
            }
          }, 3000);
        } else {
          // Remove user from typing list
          const roomTypers = typingUsers.get(roomId);
          if (roomTypers) {
            roomTypers.delete(socket.userId);
            if (roomTypers.size === 0) {
              typingUsers.delete(roomId);
            }
          }
        }

        // Broadcast typing status to other users in the room
        socket.to(chatRoom).emit('typing', {
          userId: socket.userId,
          userName: socket.userName,
          isTyping,
          roomId
        });
      } catch (error) {
        console.error('Typing indicator error:', error);
      }
    });

    // Handle status updates
    socket.on('update_status', async ({ status, projectId }) => {
      try {
        await updateUserStatus(socket.userId, status, socket.id, projectId);
        
        // Broadcast status update to project members
        if (projectId) {
          const projectRoom = `project_${projectId}`;
          socket.to(projectRoom).emit('user_status_updated', {
            userId: socket.userId,
            userName: socket.userName,
            userAvatar: socket.userAvatar,
            status
          });
        }

        console.log(`User ${socket.userName} status updated to ${status}`);
      } catch (error) {
        console.error('Status update error:', error);
      }
    });

    // Handle message reactions (optional feature)
    socket.on('react_to_message', ({ messageId, roomId, emoji }) => {
      try {
        const chatRoom = `room_${roomId}`;
        
        socket.to(chatRoom).emit('message_reaction', {
          messageId,
          userId: socket.userId,
          userName: socket.userName,
          emoji,
          roomId
        });
      } catch (error) {
        console.error('Message reaction error:', error);
      }
    });

    // Handle user mentions
    socket.on('mention_user', ({ mentionedUserId, messageContent, roomId }) => {
      try {
        const mentionedUser = connectedUsers.get(mentionedUserId);
        if (mentionedUser) {
          io.to(mentionedUser.socketId).emit('user_mentioned', {
            mentionedBy: socket.userName,
            messageContent,
            roomId,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('User mention error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      try {
        console.log(`User ${socket.userName} disconnected: ${reason}`);
        
        // Clean up typing indicators
        for (const [roomId, typers] of typingUsers.entries()) {
          if (typers.has(socket.userId)) {
            typers.delete(socket.userId);
            if (typers.size === 0) {
              typingUsers.delete(roomId);
            }
            // Notify room that user stopped typing
            io.to(`room_${roomId}`).emit('typing', {
              userId: socket.userId,
              userName: socket.userName,
              isTyping: false,
              roomId
            });
          }
        }

        // Clean up user rooms
        const rooms = userRooms.get(socket.userId);
        if (rooms) {
          rooms.forEach(roomId => {
            socket.to(`room_${roomId}`).emit('user_left_room', {
              userId: socket.userId,
              userName: socket.userName,
              roomId
            });
          });
          userRooms.delete(socket.userId);
        }

        // Clean up project connections
        const userConnection = connectedUsers.get(socket.userId);
        if (userConnection) {
          userConnection.projects.forEach(projectId => {
            socket.to(`project_${projectId}`).emit('user_left', socket.userId);
          });
        }

        // Remove from connected users
        connectedUsers.delete(socket.userId);

        // Update user status to offline
        await updateUserStatus(socket.userId, 'offline');
        
        // Broadcast offline status
        socket.broadcast.emit('user_status_updated', {
          userId: socket.userId,
          userName: socket.userName,
          userAvatar: socket.userAvatar,
          status: 'offline'
        });
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userName}:`, error);
    });

    // Send initial connection confirmation
    socket.emit('connection_confirmed', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Handle server-level errors
  io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
  });

  return io;
};

// Helper function to update user status
async function updateUserStatus(userId, status, socketId = null, projectId = null) {
  try {
    const updateData = {
      status,
      lastSeen: new Date()
    };

    if (socketId) {
      updateData.socketId = socketId;
    }

    if (projectId) {
      updateData.currentProject = projectId;
    }

    await UserStatus.findOneAndUpdate(
      { userId },
      updateData,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Update user status error:', error);
  }
}

// Helper function to get online users for a project
async function getOnlineUsersForProject(projectId) {
  try {
    const onlineUsers = [];
    
    for (const [userId, connection] of connectedUsers.entries()) {
      if (connection.projects.has(projectId)) {
        onlineUsers.push({
          userId,
          userName: connection.userName,
          userAvatar: connection.userAvatar,
          status: 'online'
        });
      }
    }
    
    return onlineUsers;
  } catch (error) {
    console.error('Get online users error:', error);
    return [];
  }
}

// Utility function to broadcast to all project members
export function broadcastToProject(io, projectId, event, data) {
  try {
    io.to(`project_${projectId}`).emit(event, data);
  } catch (error) {
    console.error('Broadcast to project error:', error);
  }
}

// Utility function to broadcast to specific room
export function broadcastToRoom(io, roomId, event, data) {
  try {
    io.to(`room_${roomId}`).emit(event, data);
  } catch (error) {
    console.error('Broadcast to room error:', error);
  }
}

// Utility function to send direct message to user
export function sendDirectMessage(io, userId, event, data) {
  try {
    const userConnection = connectedUsers.get(userId);
    if (userConnection) {
      io.to(userConnection.socketId).emit(event, data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Send direct message error:', error);
    return false;
  }
}

// Cleanup function for graceful shutdown
export function cleanupSocket(io) {
  try {
    // Update all connected users to offline
    connectedUsers.forEach(async (connection, userId) => {
      await updateUserStatus(userId, 'offline');
    });
    
    // Clear maps
    connectedUsers.clear();
    userRooms.clear();
    typingUsers.clear();
    
    // Close socket server
    io.close();
    
    console.log('Socket.IO cleanup completed');
  } catch (error) {
    console.error('Socket cleanup error:', error);
  }
}