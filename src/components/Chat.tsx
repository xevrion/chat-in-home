import { useState } from 'react';
import ChatHeader from './ChatHeader';
import Messages from './Messages';
import MessageInput from './MessageInput';
import { messages as initialMessages } from '../data/messages';

export default function Chat() {
  const [messages, setMessages] = useState(initialMessages);

  const handleSend = (text: string) => {
    const newMessage = {
      id: Date.now(), // unique id
      sender: 'me',
      text,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="flex flex-col flex-1 bg-white">
      <ChatHeader />
      <Messages messages={messages} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
