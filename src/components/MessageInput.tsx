import { useState } from 'react';

type Props = {
  onSend: (text: string) => void;
};

export default function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() === '') return;
    onSend(text.trim());      // 🔥 send to parent (Chat.tsx)
    setText('');              // 🔄 clear input after send
  };

  return (
    <div className="p-4 border-t flex gap-2">
      <input
        type="text"
        className="flex-1 border rounded px-4 py-2 text-sm"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={handleSend}
      >
        Send
      </button>
    </div>
  );
}
