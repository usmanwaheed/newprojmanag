import React from 'react';
import ChannelList from '../Components/Chat/ChannelList';
import ChatWindow from '../Components/Chat/ChatWindow';
import MessageInput from '../Components/Chat/MessageInput';

const ChatPage = ({ projectId, userId }) => (
  <div>
    <ChannelList projectId={projectId} />
    <ChatWindow />
    <MessageInput senderId={userId} />
  </div>
);

export default ChatPage;