import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';

const MessageInput = ({ senderId }) => {
  const { socket, currentChannel } = useChat();
  const [message, setMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    socket.emit('sendMessage', { channelId: currentChannel, senderId, message });
    setMessage('');
  };

  return (
    <form onSubmit={handleSend}>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button type="submit">Send</button>
    </form>
  );
};

export default MessageInput;