import { useState, useRef } from "react";
import { socket } from "../lib/socket";

type Props = {
  onSend: (text: string) => void;
  username: string;
  receiverId: string;
};

export default function MessageInput({ onSend, username, receiverId }: Props) {
  const [text, setText] = useState("");
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSend = () => {
    if (text.trim() === "") return;
    onSend(text.trim()); // 🔥 send to parent (Chat.tsx)
    setText(""); // 🔄 clear input after send
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
      <input
        type="text"
        className="flex-1 border rounded px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (username !== receiverId) {
            if (!typingTimeout.current) {
              socket.emit("chat:typing", {
                sender: username,
                receiver: receiverId,
              });
              typingTimeout.current = setTimeout(() => {
                typingTimeout.current = null;
              }, 1000);
            }
          }
        }}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800"
        onClick={handleSend}
      >
        Send
      </button>
    </div>
  );
}
