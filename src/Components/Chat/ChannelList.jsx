import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useChat } from '../../context/ChatContext';

const ChannelList = ({ projectId }) => {
  const [channels, setChannels] = useState([]);
  const { setCurrentChannel } = useChat();

  useEffect(() => {
    axios.get(`/api/chat/channels/${projectId}`).then(res => setChannels(res.data));
  }, [projectId]);

  return (
    <div>
      {channels.map(channel => (
        <div key={channel._id} onClick={() => setCurrentChannel(channel._id)}>
          {channel.name}
        </div>
      ))}
    </div>
  );
};

export default ChannelList;