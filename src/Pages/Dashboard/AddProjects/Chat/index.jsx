// src/Pages/Dashboard/AddProjects/Chat/index.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Box, Stack, Typography, TextField, IconButton, Button,
  Avatar, Paper, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemAvatar, ListItemText,
  Badge, Tooltip, Divider, Menu, MenuItem, CircularProgress,
  Alert, Fab, InputAdornment
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
  EmojiEmotions as EmojiIcon
} from '@mui/icons-material';
import { useAuth } from '../../../../context/AuthProvider';
import { useSocket } from '../../../../hooks/useSocket';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChatRoom, getChatRooms, sendMessage as apiSendMessage,
  getMessages, uploadChatFile, joinChatRoom as apiJoinChatRoom
} from '../../../../api/chat';
import { toast } from 'react-toastify';
import { getUserForSubTask } from '../../../../api/userSubTask';
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
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Socket connection
  const {
    socket,
    isConnected,
    onlineUsers,
    joinChatRoom,
    leaveChatRoom,
    sendMessage: socketSendMessage,
    sendTypingIndicator
  } = useSocket(projectId);

  // Fetch chat rooms
  const { data: chatRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['chatRooms', projectId],
    queryFn: () => getChatRooms(projectId),
    enabled: !!projectId
  });

  // Fetch messages for selected room
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedRoom?._id],
    queryFn: () => getMessages(selectedRoom._id),
    enabled: !!selectedRoom?._id,
    refetchInterval: false
  });

  // Fetch project users for room creation
  const { data: projectUsers } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: () => getUserForSubTask(projectId),
    enabled: !!projectId
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: createChatRoom,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chatRooms', projectId]);
      setCreateRoomDialog(false);
      setNewRoomData({ name: '', description: '', isPrivate: false });
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
      return () => leaveChatRoom(selectedRoom._id);
    }
  }, [selectedRoom, socket, isConnected, joinChatRoom, leaveChatRoom]);

  // Handle send message
  const handleSendMessage = (messageData = null) => {
    const messageToSend = messageData || {
      type: 'text',
      content: messageText.trim()
    };

    if (!messageToSend.content && messageToSend.type === 'text') return;

    // Send via socket for real-time
    socketSendMessage(selectedRoom._id, messageToSend);
    
    // Send via API for persistence
    sendMessageMutation.mutate({
      roomId: selectedRoom._id,
      message: messageToSend
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

  // Create new room
  const handleCreateRoom = () => {
    if (!newRoomData.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    // Ensure at least one QC admin is included
    const qcAdmins = projectUsers?.data?.filter(user => user.role === 'QcAdmin') || [];
    if (qcAdmins.length === 0) {
      toast.error('At least one QC Admin must be available');
      return;
    }

    const roomData = {
      ...newRoomData,
      projectId,
      members: [user._id, ...qcAdmins.map(admin => admin._id)]
    };

    createRoomMutation.mutate(roomData);
  };

  // Get user status
  const getUserStatus = (userId) => {
    return onlineUsers.find(u => u.userId === userId) ? 'online' : 'offline';
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
      height: '600px',
      backgroundColor: theme.palette.background.paper,
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex'
    },
    sidebar: {
      width: '300px',
      borderRight: `1px solid ${theme.palette.divider}`,
      display: 'flex',
      flexDirection: 'column'
    },
    chatArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    messageArea: {
      flex: 1,
      overflow: 'auto',
      padding: '16px',
      backgroundColor: theme.palette.background.default
    },
    inputArea: {
      padding: '16px',
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
            {onlineUsers.map(onlineUser => (
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
          ) : (
            <List>
              {chatRooms?.data?.map(room => (
                <ListItem
                  key={room._id}
                  button
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
                  {selectedRoom.members?.length} members
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
        onClose={() => setCreateRoomDialog(false)}
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
            <Alert severity="info">
              All QC Admins will be automatically added to ensure proper oversight.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoomDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateRoom}
            disabled={createRoomMutation.isLoading}
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
        <MenuItem onClick={() => setAnchorEl(null)}>
          Room Settings
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          View Members
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          Leave Room
        </MenuItem>
      </Menu>
    </Box>
  );
};

// Message Bubble Component
const MessageBubble = ({ message, isOwn, onlineStatus, formatTime }) => {
  const { theme } = useAuth();
  
  const bubbleStyles = {
    alignSelf: isOwn ? 'flex-end' : 'flex-start',
    maxWidth: '70%',
    mb: 1
  };

  const contentStyles = {
    backgroundColor: isOwn ? theme.palette.primary.main : theme.palette.background.paper,
    color: isOwn ? theme.palette.primary.contrastText : theme.palette.text.primary,
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