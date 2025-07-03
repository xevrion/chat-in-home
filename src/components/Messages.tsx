import { useEffect, useRef, useState } from "react";
import { messages as initialMessages } from "../data/messages";

type Message = {
  id: number;
  sender: string;
  text: string;
  date: Date;
  status: "sent" | "delivered" | "seen";
};

type Props = {
  messages: Message[];
  username: string;
  isTyping: boolean;
  typingUser: string | null;
};

export default function Messages({ messages, username, isTyping, typingUser }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function getTickIcon(status: "sent" | "delivered" | "seen") {
    if (status === "sent") return "✓"; // 1 gray tick
    if (status === "delivered") return "✓✓"; // 2 gray ticks
    if (status === "seen") return <span style={{ color: "#2196f3" }}>✓✓</span>; // 2 blue ticks
  }

  return (
    <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-gray-100">
      {messages.map((msg) => {
        const d = new Date(msg.date);
        const isSender = msg.sender === username;

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${
              isSender ? "items-end" : "items-start"
            }`}
          >
            {!isSender && (
              <div className="text-xs text-gray-500 mb-1 ml-1">
                {msg.sender}
              </div>
            )}

            <div
              className={`text-xs text-gray-500 ${
                isSender ? "ml-auto mr-1" : "ml-1"
              }`}
            >
              {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()} {d.getHours()}:
              {d.getMinutes()}:{d.getSeconds()}
            </div>

            <div
              className={`text-sm px-4 py-2 max-w-xs w-fit shadow rounded-xl ${
                isSender ? "bg-green-100 ml-auto mr-1" : "bg-blue-100 ml-1"
              }`}
              style={{
                borderTopLeftRadius: isSender ? 12 : 0,
                borderTopRightRadius: isSender ? 0 : 12,
              }}
            >
              {msg.text}
              {msg.sender === username && (
                <span className="ml-2 text-xs align-bottom">
                  {getTickIcon(msg.status)}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {isTyping && typingUser && (
        <div className="text-xs text-gray-500 italic">
          {typingUser} is typing...
        </div>
      )}

      {/* Scroll Target */}
      <div ref={bottomRef} />
    </div>
  );
}
