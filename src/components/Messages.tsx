import { useEffect, useState } from 'react';
import { messages as initialMessages } from '../data/messages';


type Message = {
  id: number;
  sender: string;
  text: string;
};

type Props = {
  messages: Message[];
};



export default function Messages({ messages }: Props) {
  return (
    <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-gray-100">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`text-sm px-4 py-2 rounded w-fit ${
            msg.sender === 'me' ? 'bg-green-100 ml-auto' : 'bg-blue-100'
          }`}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}