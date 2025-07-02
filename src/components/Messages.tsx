import { useEffect, useState } from 'react';
import { messages as initialMessages } from '../data/messages';

export default function Messages() {
  const [msgs, setMsgs] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setMsgs(prev => [...prev, { id: 4, sender: 'John', text: 'What about you?' }]);
        setIsTyping(false);
      }, 2000);
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-gray-100">
      {msgs.map(msg => (
        <div
          key={msg.id}
          className={`text-sm px-4 py-2 rounded w-fit ${
            msg.sender === 'me' ? 'bg-green-100 ml-auto' : 'bg-blue-100'
          }`}
        >
          {msg.text}
        </div>
      ))}

      {isTyping && (
        <div className="text-sm text-gray-500 italic">John is typing...</div>
      )}
    </div>
  );
}
