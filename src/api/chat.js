import axios from 'axios';

const API_BASE = '/api'; // Adjust according to your backend base URL

// Chat Rooms
export const createChatRoom = async (data) => {
  const response = await axios.post(`${API_BASE}/chat/rooms`, data);
  return response.data;
};

export const getChatRooms = async (projectId) => {
  const response = await axios.get(`${API_BASE}/chat/rooms/${projectId}`);
  return response.data;
};

export const updateChatRoom = async (roomId, data) => {
  const response = await axios.put(`${API_BASE}/chat/rooms/${roomId}`, data);
  return response.data;
};

export const deleteChatRoom = async (roomId) => {
  const response = await axios.delete(`${API_BASE}/chat/rooms/${roomId}`);
  return response.data;
};

export const joinChatRoom = async (roomId) => {
  const response = await axios.post(`${API_BASE}/chat/rooms/${roomId}/join`);
  return response.data;
};

export const leaveChatRoom = async (roomId) => {
  const response = await axios.post(`${API_BASE}/chat/rooms/${roomId}/leave`);
  return response.data;
};

// Messages
export const sendMessage = async (roomId, data) => {
  const response = await axios.post(`${API_BASE}/chat/rooms/${roomId}/messages`, data);
  return response.data;
};

export const getMessages = async (roomId, page = 1, limit = 50) => {
  const response = await axios.get(`${API_BASE}/chat/rooms/${roomId}/messages`, {
    params: { page, limit }
  });
  return response.data;
};

export const deleteMessage = async (messageId) => {
  const response = await axios.delete(`${API_BASE}/chat/messages/${messageId}`);
  return response.data;
};

export const editMessage = async (messageId, data) => {
  const response = await axios.put(`${API_BASE}/chat/messages/${messageId}`, data);
  return response.data;
};

// File Upload
export const uploadChatFile = async (file, roomId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('roomId', roomId);
  
  const response = await axios.post(`${API_BASE}/chat/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Online Status
export const updateOnlineStatus = async (status) => {
  const response = await axios.put(`${API_BASE}/users/status`, { status });
  return response.data;
};

export const getOnlineUsers = async (projectId) => {
  const response = await axios.get(`${API_BASE}/users/online/${projectId}`);
  return response.data;
};

// Search Messages
export const searchMessages = async (roomId, query) => {
  const response = await axios.get(`${API_BASE}/chat/rooms/${roomId}/search`, {
    params: { q: query }
  });
  return response.data;
};