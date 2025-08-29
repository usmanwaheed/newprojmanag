import { axiosInstance } from "./axiosInstance";

// Chat Rooms
export const createChatRoom = async (data) => {
  const { data: res } = await axiosInstance.post('/chat/rooms', data);
  return res;
};

export const getChatRooms = async (projectId) => {
  const { data } = await axiosInstance.get(`/chat/rooms/${projectId}`);
  return data;
};

export const updateChatRoom = async (roomId, data) => {
  const { data: res } = await axiosInstance.put(`/chat/rooms/${roomId}`, data);
  return res;
};

export const deleteChatRoom = async (roomId) => {
  const { data } = await axiosInstance.delete(`/chat/rooms/${roomId}`);
  return data;
};

export const joinChatRoom = async (roomId) => {
  const { data } = await axiosInstance.post(`/chat/rooms/${roomId}/join`);
  return data;
};

export const leaveChatRoom = async (roomId) => {
  const { data } = await axiosInstance.post(`/chat/rooms/${roomId}/leave`);
  return data;
};

// Messages
export const sendMessage = async (roomId, body) => {
  const { data } = await axiosInstance.post(`/chat/rooms/${roomId}/messages`, body);
  return data;
};

export const getMessages = async (roomId, page = 1, limit = 50) => {
  const { data } = await axiosInstance.get(`/chat/rooms/${roomId}/messages`, {
    params: { page, limit },
  });
  return data;
};

export const deleteMessage = async (messageId) => {
  const { data } = await axiosInstance.delete(`/chat/messages/${messageId}`);
  return data;
};

export const editMessage = async (messageId, body) => {
  const { data } = await axiosInstance.put(`/chat/messages/${messageId}`, body);
  return data;
};

// File Upload
export const uploadChatFile = async (file, roomId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("roomId", roomId);

  const { data } = await axiosInstance.post(`/chat/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// Online Status
export const updateOnlineStatus = async (status) => {
  const { data } = await axiosInstance.put(`/users/status`, { status });
  return data;
};

export const getOnlineUsers = async (projectId) => {
  const { data } = await axiosInstance.get(`/users/online/${projectId}`);
  return data;
};

// Search Messages
export const searchMessages = async (roomId, query) => {
  const { data } = await axiosInstance.get(`/chat/rooms/${roomId}/search`, {
    params: { q: query },
  });
  return data;
};
