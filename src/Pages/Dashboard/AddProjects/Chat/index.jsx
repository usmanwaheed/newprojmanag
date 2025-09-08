/* eslint-disable no-unused-vars */
// src/Pages/Dashboard/AddProjects/Chat/index.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Stack, Typography, TextField, IconButton, Button,
  Avatar, Paper, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemAvatar, ListItemText,
  ListItemIcon, ListItemButton, Badge, Tooltip, Divider, Menu, MenuItem, CircularProgress,
  Alert, InputAdornment, Checkbox
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  EmojiEmotions as EmojiIcon,
  Settings as SettingsIcon,
  Group as GroupIcon,
  ExitToApp as ExitToAppIcon
} from '@mui/icons-material';
import { useAuth } from '../../../../context/AuthProvider';
import { useSocket } from '../../../../hooks/useSocket';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChatRoom,
  getChatRooms,
  sendMessage as apiSendMessage,
  getMessages,
  uploadChatFile,
  getProjectUsers,
  updateChatRoom,
  leaveChatRoom as apiLeaveChatRoom
} from '../../../../api/chat';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const ProjectChat = ({ projectId }) => {
  const { user, theme, mode } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [createRoomDialog, setCreateRoomDialog] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', description: '', isPrivate: false });
  const [selectedQcAdmins, setSelectedQcAdmins] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewMembersOpen, setViewMembersOpen] = useState(false);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [roomSettingsData, setRoomSettingsData] = useState({ name: '', description: '' });
  
  // Socket connection
  const {
    socket,
    isConnected,
    onlineUsers,
    joinChatRoom,
    leaveChatRoom: socketLeaveChatRoom,
    sendMessage: socketSendMessage,
    sendTypingIndicator,
    updateUserStatus
  } = useSocket(projectId);

  // Fetch chat rooms
  const {
    data: chatRooms,
    isLoading: roomsLoading,
    error: roomsError
  } = useQuery({
    queryKey: ['chatRooms', projectId],
    queryFn: () => getChatRooms(projectId),
    enabled: !!projectId
  });

  // Fetch messages for selected room
  const {
    data: messages,
    isLoading: messagesLoading,
    error: messagesError
  } = useQuery({
    queryKey: ['messages', selectedRoom?._id],
    queryFn: () => getMessages(selectedRoom._id),
    enabled: !!selectedRoom?._id,
    refetchInterval: false
  });

  // Fetch project users for room creation
  const { data: projectUsers } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: () => getProjectUsers(projectId),
    enabled: !!projectId
  });

  useEffect(() => {
    if (!isConnected) return;
    updateUserStatus('online');
    return () => updateUserStatus('offline');
  }, [isConnected, updateUserStatus]);

  useEffect(() => {
    if (roomsError) {
      console.error('Get chat rooms error:', roomsError);
    }
  }, [roomsError]);

  useEffect(() => {
    if (messagesError) {
      console.error('Get messages error:', messagesError);
    }
  }, [messagesError]);

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: createChatRoom,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chatRooms', projectId]);
      setCreateRoomDialog(false);
      setNewRoomData({ name: '', description: '', isPrivate: false });
      setSelectedQcAdmins([]);
      setSelectedMembers([]);
      setSelectedRoom(data.data);
      toast.success('Chat room created successfully!');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create room');
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ roomId, message }) => apiSendMessage(roomId, message),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedRoom._id]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to send message');
    }
  });

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: ({ file, roomId }) => uploadChatFile(file, roomId),
    onSuccess: (data) => {
      const fileMessage = {
        type: 'file',
        content: data.data.fileName,
        fileUrl: data.data.fileUrl,
        fileType: data.data.fileType,
        fileSize: data.data.fileSize
      };
      handleSendMessage(fileMessage);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error('Failed to upload file');
      setSelectedFile(null);
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ roomId, data }) => updateChatRoom(roomId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['chatRooms', projectId]);
      setSelectedRoom(prev => ({ ...prev, ...res.data }));
      setRoomSettingsOpen(false);
      toast.success('Room updated');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update room');
    }
  });

  const leaveRoomMutation = useMutation({
    mutationFn: apiLeaveChatRoom,
    onSuccess: () => {
      socketLeaveChatRoom(selectedRoom._id);
      setLeaveDialogOpen(false);
      setSelectedRoom(null);
      queryClient.invalidateQueries(['chatRooms', projectId]);
      toast.success('Left the room');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to leave room');
    }
  });
  // Separate project users by role
  const allProjectUsers = useMemo(
    () => projectUsers?.data?.filter(u => u._id !== user._id) || [],
    [projectUsers?.data, user._id]
  );
  const qcAdmins = useMemo(
    () => allProjectUsers.filter(u => u.role === 'qcadmin'),
    [allProjectUsers]
  );
  const otherMembers = useMemo(
    () => allProjectUsers.filter(u => u.role !== 'qcadmin'),
    [allProjectUsers]
  );

  const roomMembers = useMemo(() => {
    if (!selectedRoom) return [];
    const map = new Map((projectUsers?.data || []).map(u => [u._id, u]));
    map.set(user._id, { _id: user._id, name: user.name, avatar: user.avatar, role: user.role });
    return (selectedRoom.members || []).map(id => map.get(id)).filter(Boolean);
  }, [selectedRoom, projectUsers?.data, user]);

  const onlineMemberCount = useMemo(() => {
    if (!selectedRoom) return 0;
    const memberIds = (selectedRoom.members || []).map(id => id.toString());
    return onlineUsers.filter(u => memberIds.includes(u.userId)).length;
    // counts how many room members appear in onlineUsers
  }, [selectedRoom, onlineUsers]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      queryClient.invalidateQueries(['messages', message.roomId]);
      
      // Show notification if message is not from current user and room is not active
      if (message.senderId !== user._id && message.roomId !== selectedRoom?._id) {
        toast.info(`New message from ${message.senderName} in ${message.roomName}`);
      }
    };

    const handleTyping = ({ userId, userName, isTyping: typing, roomId }) => {
      if (userId === user._id || roomId !== selectedRoom?._id) return;
      
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== userId);
        if (typing) {
          return [...filtered, { userId, userName }];
        }
        return filtered;
      });
    };

    const handleRoomUpdate = () => {
      queryClient.invalidateQueries(['chatRooms', projectId]);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('room_created', handleRoomUpdate);
    socket.on('room_updated', handleRoomUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('room_created', handleRoomUpdate);
      socket.off('room_updated', handleRoomUpdate);
    };
  }, [socket, user._id, selectedRoom?._id, projectId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join room when selected
  useEffect(() => {
    if (selectedRoom && socket && isConnected) {
      joinChatRoom(selectedRoom._id);
      return () => socketLeaveChatRoom(selectedRoom._id);
    }
  }, [selectedRoom, socket, isConnected, joinChatRoom, socketLeaveChatRoom]);

  // Initialize selected members when dialog opens
  useEffect(() => {
    if (createRoomDialog) {
      const initialAdmins = user.role === 'qcadmin'
        ? [user._id, ...qcAdmins.map(admin => admin._id)]
        : qcAdmins.map(admin => admin._id);
      setSelectedQcAdmins(initialAdmins);
      setSelectedMembers([]);
    }
  }, [createRoomDialog, qcAdmins, user._id, user.role]);

  useEffect(() => {
    if (roomSettingsOpen && selectedRoom) {
      setRoomSettingsData({ name: selectedRoom.name || '', description: selectedRoom.description || '' });
    }
  }, [roomSettingsOpen, selectedRoom]);

  // Handle send message
  const handleSendMessage = (messageData = null) => {
    const messageToSend = messageData || {
      type: 'text',
      content: messageText.trim()
    };

    if (!messageToSend.content && messageToSend.type === 'text') return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      roomId: selectedRoom._id,
      senderId: user._id,
      senderName: user.name,
      senderAvatar: user.avatar,
      createdAt: new Date().toISOString(),
      ...messageToSend
    };

    // Optimistically add message to cache
    queryClient.setQueryData(['messages', selectedRoom._id], old => {
      const prev = old?.data || [];
      return { ...old, data: [...prev, optimisticMessage] };
    });

    // Send via socket for real-time
    socketSendMessage(selectedRoom._id, messageToSend);

    // Send via API for persistence
    sendMessageMutation.mutate({
      roomId: selectedRoom._id,
      message: messageToSend
    }, {
      onError: () => {
        // Remove optimistic message on failure
        queryClient.setQueryData(['messages', selectedRoom._id], old => {
          const prev = old?.data || [];
          return { ...old, data: prev.filter(m => m._id !== tempId) };
        });
      }
    });

    if (!messageData) {
      setMessageText('');
    }
  };

  // Handle typing
  const handleTyping = (e) => {
    setMessageText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(selectedRoom._id, true);
    }

    // Clear typing indicator after 3 seconds of inactivity
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(selectedRoom._id, false);
    }, 3000);
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    uploadFileMutation.mutate({ file, roomId: selectedRoom._id });
  };

  // Toggle QC Admin selection
  const toggleQcAdmin = (id) => {
    setSelectedQcAdmins(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  // Toggle additional member selection
  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleUpdateRoom = () => {
    if (!roomSettingsData.name.trim()) {
      toast.error('Room name is required');
      return;
    }
    updateRoomMutation.mutate({ roomId: selectedRoom._id, data: roomSettingsData });
  };

  const handleLeaveRoom = () => {
    leaveRoomMutation.mutate(selectedRoom._id);
  };

  // Create new room
  const handleCreateRoom = () => {
    if (!newRoomData.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    if (selectedQcAdmins.length === 0 && user.role !== 'qcadmin') {
      toast.error('At least one QC Admin must be selected');
      return;
    }

    const roomData = {
      ...newRoomData,
      projectId,
      members: [...new Set([user._id, ...selectedQcAdmins, ...selectedMembers])]
    };

    createRoomMutation.mutate(roomData);
  };

  // Reset dialog state when closing
  const handleCloseDialog = () => {
    setCreateRoomDialog(false);
    setNewRoomData({ name: '', description: '', isPrivate: false });
    setSelectedQcAdmins([]);
    setSelectedMembers([]);
  };

  // Get user status
  const getUserStatus = (userId) => {
    return onlineUsers.some(u => u.userId === userId?.toString()) ? 'online' : 'offline';
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Filter messages based on search
  const filteredMessages = messages?.data?.filter(message =>
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const styles = {
    container: {
      height: '70vh',
      backgroundColor: theme.palette.background.paper,
      borderRadius: 2,
      boxShadow: theme.shadows[3],
      overflow: 'hidden',
      display: 'flex'
    },
    sidebar: {
      width: 300,
      borderRight: `1px solid ${theme.palette.divider}`,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.palette.background.default
    },
    chatArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    messageArea: {
      flex: 1,
      overflow: 'auto',
      padding: 2,
      backgroundColor: theme.palette.background.default
    },
    inputArea: {
      p: 2,
      borderTop: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper
    }
  };

  if (!isConnected) {
    return (
      <Box sx={styles.container} display="flex" alignItems="center" justifyContent="center">
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">Connecting to chat...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={styles.container}>
      {/* Sidebar */}
      <Box sx={styles.sidebar}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" p={2}>
          <Typography variant="h6">Chat Rooms</Typography>
          <IconButton size="small" onClick={() => setCreateRoomDialog(true)}>
            <AddIcon />
          </IconButton>
        </Stack>

        <Divider />

        {/* Online Users */}
        <Box p={2}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Online ({onlineUsers.length})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {onlineUsers?.map(onlineUser => (
              <Tooltip key={onlineUser.userId} title={onlineUser.userName}>
                <Badge
                  color="success"
                  variant="dot"
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                  <Avatar
                    src={onlineUser.userAvatar}
                    alt={onlineUser.userName}
                    sx={{ width: 32, height: 32 }}
                  />
                </Badge>
              </Tooltip>
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Room List */}
        <Box flex={1} overflow="auto">
          {roomsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : roomsError ? (
            <Box p={2}>
              <Alert severity="error">Failed to load chat rooms</Alert>
            </Box>
          ) : (
            <List>
              {chatRooms?.data?.map(room => (
                <ListItem key={room._id} disablePadding>
                  <ListItemButton
                    selected={selectedRoom?._id === room._id}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        {room.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={room.name}
                      secondary={room.description}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                    {room.unreadCount > 0 && (
                      <Chip
                        size="small"
                        color="primary"
                        label={room.unreadCount}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* Chat Area */}
      <Box sx={styles.chatArea}>
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              p={2}
              borderBottom={`1px solid ${theme.palette.divider}`}
            >
              <Stack>
                <Typography variant="h6">{selectedRoom.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedRoom.members?.length} members, {onlineMemberCount} online
                </Typography>
              </Stack>
              
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                  sx={{ width: 200 }}
                />
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>
            </Stack>

            {/* Messages */}
            <Box sx={styles.messageArea}>
              {messagesLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : messagesError ? (
                <Box p={2}>
                  <Alert severity="error">Failed to load messages</Alert>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {filteredMessages.map(message => (
                    <MessageBubble
                      key={message._id}
                      message={message}
                      isOwn={message.senderId === user._id}
                      onlineStatus={getUserStatus(message.senderId)}
                      formatTime={formatMessageTime}
                    />
                  ))}

                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </Typography>
                    </Box>
                  )}

                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            {/* Input Area */}
            <Box sx={styles.inputArea}>
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadFileMutation.isLoading}
                >
                  {uploadFileMutation.isLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <AttachFileIcon />
                  )}
                </IconButton>

                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={handleTyping}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendMessageMutation.isLoading}
                />

                <IconButton
                  color="primary"
                  onClick={() => handleSendMessage()}
                  disabled={!messageText.trim() || sendMessageMutation.isLoading}
                >
                  <SendIcon />
                </IconButton>
              </Stack>

              {selectedFile && (
                <Box mt={1}>
                  <Chip
                    label={selectedFile.name}
                    onDelete={() => setSelectedFile(null)}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Stack alignItems="center" spacing={2}>
              <Typography variant="h5" color="text.secondary">
                Select a chat room
              </Typography>
              <Typography color="text.secondary">
                Choose a room from the sidebar to start chatting
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Create Room Dialog */}
      <Dialog
        open={createRoomDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Chat Room</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Room Name"
              value={newRoomData.name}
              onChange={(e) => setNewRoomData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Frontend Team, Bug Reports"
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              multiline
              rows={2}
              value={newRoomData.description}
              onChange={(e) => setNewRoomData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the room purpose"
            />
            
            {/* QC Admin Selection */}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>QC Admins</Typography>
            <List dense>
              {qcAdmins.map((admin) => (
                <ListItem key={admin._id} disablePadding>
                  <Checkbox
                    edge="start"
                    checked={selectedQcAdmins.includes(admin._id)}
                    onChange={() => toggleQcAdmin(admin._id)}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemAvatar>
                    <Avatar src={admin.avatar} alt={admin.name} sx={{ width: 32, height: 32 }} />
                  </ListItemAvatar>
                  <ListItemText primary={admin.name} secondary={admin.email} />
                </ListItem>
              ))}
            </List>

            {/* Additional Members Selection */}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Add Members</Typography>
            <List dense>
              {otherMembers.map((member) => (
                <ListItem key={member._id} disablePadding>
                  <Checkbox
                    edge="start"
                    checked={selectedMembers.includes(member._id)}
                    onChange={() => toggleMember(member._id)}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemAvatar>
                    <Avatar src={member.avatar} alt={member.name} sx={{ width: 32, height: 32 }} />
                  </ListItemAvatar>
                  <ListItemText primary={member.name} secondary={member.email} />
                </ListItem>
              ))}
            </List>

            {qcAdmins.length === 0 && (
              <Alert severity="warning">
                No QC Admins found for this project. Please add QC Admins to the project first.
              </Alert>
            )}

            {selectedQcAdmins.length > 0 && (
              <Alert severity="info">
                {selectedQcAdmins.length} QC Admin{selectedQcAdmins.length > 1 ? 's' : ''} selected for this room.
              </Alert>
            )}

            {selectedMembers.length > 0 && (
              <Alert severity="info">
                {selectedMembers.length} additional member{selectedMembers.length > 1 ? 's' : ''} selected.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateRoom}
            disabled={createRoomMutation.isLoading || selectedQcAdmins.length === 0}
          >
            {createRoomMutation.isLoading ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Room Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { setRoomSettingsOpen(true); setAnchorEl(null); }}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          Room Settings
        </MenuItem>
        <MenuItem onClick={() => { setViewMembersOpen(true); setAnchorEl(null); }}>
          <ListItemIcon><GroupIcon fontSize="small" /></ListItemIcon>
          View Members
        </MenuItem>
        <MenuItem onClick={() => { setLeaveDialogOpen(true); setAnchorEl(null); }}>
          <ListItemIcon><ExitToAppIcon fontSize="small" /></ListItemIcon>
          Leave Room
        </MenuItem>
      </Menu>

      {/* View Members Dialog */}
      <Dialog open={viewMembersOpen} onClose={() => setViewMembersOpen(false)} fullWidth>
        <DialogTitle>Room Members</DialogTitle>
        <List>
          {roomMembers.map(member => (
            <ListItem key={member._id}>
              <ListItemAvatar>
                <Badge
                  color={getUserStatus(member._id) === 'online' ? 'success' : 'default'}
                  variant="dot"
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                  <Avatar src={member.avatar} alt={member.name} />
                </Badge>
              </ListItemAvatar>
              <ListItemText primary={member.name} secondary={member.role === 'qcadmin' ? 'QC Admin' : 'Member'} />
            </ListItem>
          ))}
        </List>
      </Dialog>

      {/* Room Settings Dialog */}
      <Dialog open={roomSettingsOpen} onClose={() => setRoomSettingsOpen(false)} fullWidth>
        <DialogTitle>Room Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Room Name"
              value={roomSettingsData.name}
              onChange={(e) => setRoomSettingsData({ ...roomSettingsData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={roomSettingsData.description}
              onChange={(e) => setRoomSettingsData({ ...roomSettingsData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoomSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateRoom} disabled={updateRoomMutation.isLoading}>
            {updateRoomMutation.isLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Room Confirmation */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>Leave this room?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleLeaveRoom} disabled={leaveRoomMutation.isLoading}>
            {leaveRoomMutation.isLoading ? <CircularProgress size={20} /> : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Message Bubble Component
const MessageBubble = ({ message, isOwn, onlineStatus, formatTime }) => {
  const { theme, mode } = useAuth();

  const bubbleStyles = {
    alignSelf: isOwn ? 'flex-end' : 'flex-start',
    maxWidth: '70%',
    mb: 1
  };

  const contentStyles = {
    backgroundColor: isOwn
      ? (mode === 'light' ? '#dcf8c6' : theme.palette.primary.dark)
      : (mode === 'light' ? theme.palette.background.paper : theme.palette.grey[700]),
    color: isOwn
      ? (mode === 'light' ? theme.palette.text.primary : theme.palette.primary.contrastText)
      : theme.palette.text.primary,
    padding: '8px 12px',
    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    boxShadow: theme.shadows[1]
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'file':
        return (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AttachFileIcon fontSize="small" />
              <Typography
                component="a"
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textDecoration: 'underline', color: 'inherit' }}
              >
                {message.content}
              </Typography>
            </Stack>
            {message.fileType?.startsWith('image/') && (
              <Box
                component="img"
                src={message.fileUrl}
                alt={message.content}
                sx={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              />
            )}
          </Stack>
        );
      case 'link':
        return (
          <Stack spacing={1}>
            <Typography>{message.content}</Typography>
            {message.linkPreview && (
              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '8px',
                  p: 1,
                  backgroundColor: theme.palette.background.default
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {message.linkPreview.title}
                </Typography>
              </Box>
            )}
          </Stack>
        );
      default:
        return <Typography>{message.content}</Typography>;
    }
  };

  return (
    <Stack sx={bubbleStyles}>
      {!isOwn && (
        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
          <Badge
            color={onlineStatus === 'online' ? 'success' : 'default'}
            variant="dot"
            overlap="circular"
          >
            <Avatar
              src={message.senderAvatar}
              alt={message.senderName}
              sx={{ width: 24, height: 24 }}
            />
          </Badge>
          <Typography variant="caption" color="text.secondary">
            {message.senderName}
          </Typography>
        </Stack>
      )}
      
      <Paper sx={contentStyles} elevation={0}>
        {renderMessageContent()}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            opacity: 0.7,
            textAlign: 'right'
          }}
        >
          {formatTime(message.createdAt)}
        </Typography>
      </Paper>
    </Stack>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.object.isRequired,
  isOwn: PropTypes.bool.isRequired,
  onlineStatus: PropTypes.string.isRequired,
  formatTime: PropTypes.func.isRequired
};

ProjectChat.propTypes = {
  projectId: PropTypes.string.isRequired
};

export default ProjectChat;