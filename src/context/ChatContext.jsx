/* eslint-disable react/prop-types */
import { createContext, useContext, useState } from 'react';
import io from 'socket.io-client';
const socket = io();

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [currentChannel, setCurrentChannel] = useState(null);

  return (
    <ChatContext.Provider value={{ socket, currentChannel, setCurrentChannel }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);