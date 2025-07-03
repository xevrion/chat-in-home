import { useState } from "react";
import { socket } from "../lib/socket";

type Props = {
  onSend: (text: string) => void;
  username: string;
  receiverId: string;
};

export default function MessageInput({ onSend, username, receiverId }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim() === "") return;
    onSend(text.trim()); // 🔥 send to parent (Chat.tsx)
    setText(""); // 🔄 clear input after send
  };

  return (
    <div className="p-4 border-t flex gap-2">
      <input
        type="text"
        className="flex-1 border rounded px-4 py-2 text-sm"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          console.log("TYPING EMIT:", username, "->", receiverId); // 👈 test
          socket.emit("chat:typing", {
            sender: username,
            receiver: receiverId,
          });
        }}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
