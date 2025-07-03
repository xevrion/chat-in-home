import { useEffect, useRef } from "react";

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
  bottomRef?: React.RefObject<HTMLDivElement | null>;
};

export default function Messages({ messages, username, isTyping, typingUser, bottomRef }: Props) {
  useEffect(() => {
    bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bottomRef]);

  function getTickIcon(status: "sent" | "delivered" | "seen") {
    if (status === "sent") return "✓"; // 1 gray tick
    if (status === "delivered") return "✓✓"; // 2 gray ticks
    if (status === "seen") return <span style={{ color: "#2196f3" }}>✓✓</span>; // 2 blue ticks
  }

  function shouldShowHeader(curr: Message, prev: Message | undefined) {
    if (!prev) return true;
    if (curr.sender !== prev.sender) return true;
    const currDate = new Date(curr.date);
    const prevDate = new Date(prev.date);
    return currDate.getTime() - prevDate.getTime() > 5 * 60 * 1000;
  }

  return (
    <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-gray-100 dark:bg-gray-900">
      {messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1] : undefined;
        const showHeader = shouldShowHeader(msg, prev);
        const d = new Date(msg.date);
        const isSender = msg.sender === username;

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${
              isSender ? "items-end" : "items-start"
            }`}
          >
            {showHeader && !isSender && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                {msg.sender}
              </div>
            )}
            {showHeader && (
              <div
                className={`text-xs text-gray-500 dark:text-gray-400 ${
                  isSender ? "ml-auto mr-1" : "ml-1"
                }`}
              >
                {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()} {d.getHours()}:
                {d.getMinutes()}:{d.getSeconds()}
              </div>
            )}
            <div
              className={`text-sm px-4 py-2 max-w-xs w-fit shadow rounded-xl dark:text-gray-100 ${
                isSender
                  ? "bg-green-100 dark:bg-green-900 ml-auto mr-1"
                  : "bg-blue-100 dark:bg-blue-900 ml-1"
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
