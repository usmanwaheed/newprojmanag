import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthProvider';

export const useSocket = (projectId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!user?._id || !projectId) return;

    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      upgrade: false,
      rememberUpgrade: false,
      autoConnect: true,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: {
        userId: user._id,
        projectId: projectId,
        userName: user.name,
        userAvatar: user.avatar
      }
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Join project room
      newSocket.emit('join_project', { projectId, userId: user._id });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from chat server:', reason);
      setIsConnected(false);
      setOnlineUsers([]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        newSocket.disconnect();
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    // Online users events
    newSocket.on('users_online', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user_joined', (user) => {
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.userId !== user.userId);
        return [...filtered, user];
      });
    });

    newSocket.on('user_left', (userId) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_project', { projectId, userId: user._id });
        newSocket.disconnect();
      }
    };
  }, [user?._id, projectId]);

  // Socket event handlers
  const joinChatRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('join_room', { roomId, userId: user._id });
    }
  };

  const leaveChatRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leave_room', { roomId, userId: user._id });
    }
  };

  const sendMessage = (roomId, message) => {
    if (socket && isConnected) {
      socket.emit('send_message', {
        roomId,
        message,
        userId: user._id,
        userName: user.name,
        userAvatar: user.avatar,
        timestamp: new Date().toISOString()
      });
    }
  };

  const sendTypingIndicator = (roomId, isTyping) => {
    if (socket && isConnected) {
      socket.emit('typing', {
        roomId,
        userId: user._id,
        userName: user.name,
        isTyping
      });
    }
  };

  const updateUserStatus = (status) => {
    if (socket && isConnected) {
      socket.emit('update_status', {
        userId: user._id,
        status,
        projectId
      });
    }
  };

  return {
    socket,
    isConnected,
    onlineUsers,
    joinChatRoom,
    leaveChatRoom,
    sendMessage,
    sendTypingIndicator,
    updateUserStatus,
    reconnectAttempts: reconnectAttempts.current
  };
};