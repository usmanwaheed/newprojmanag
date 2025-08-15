import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useChat } from '../../context/ChatContext';

const ChatWindow = () => {
  const { socket, currentChannel } = useChat();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!currentChannel) return;
    socket.emit('joinChannel', currentChannel);
    axios.get(`/api/chat/messages/${currentChannel}`).then(res => setMessages(res.data));
  }, [currentChannel]);

  useEffect(() => {
    socket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    return () => socket.off('newMessage');
  }, []);

  return (
    <div>
      {messages.map(msg => (
        <div key={msg._id}>{msg.message}</div>
      ))}
    </div>
  );
};

export default ChatWindow;