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

function getAvatar(name: string, id: string) {
  const colors = ["bg-blue-400", "bg-green-400", "bg-pink-400", "bg-yellow-400", "bg-purple-400", "bg-red-400", "bg-indigo-400"];
  const color = colors[(id.charCodeAt(0) + id.length) % colors.length];
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-bold text-xs shadow ${color}`}>{initials}</span>
  );
}

export default function Messages({ messages, username, isTyping, typingUser, bottomRef }: Props) {
  // Only auto-scroll if user is at bottom or new message is sent by self
  useEffect(() => {
    if (!bottomRef?.current) return;
    const container = bottomRef.current.parentElement;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    const lastMsg = messages[messages.length - 1];
    if (isAtBottom || (lastMsg && lastMsg.sender === username)) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, bottomRef, username]);

  function getTickIcon(status: "sent" | "delivered" | "seen") {
    if (status === "sent") return (
      <svg className="inline w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    );
    if (status === "delivered") return (
      <svg className="inline w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l4 4L23 11" /></svg>
    );
    if (status === "seen") return (
      <svg className="inline w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l4 4L23 11" /></svg>
    );
  }

  function shouldShowHeader(curr: Message, prev: Message | undefined) {
    if (!prev) return true;
    if (curr.sender !== prev.sender) return true;
    const currDate = new Date(curr.date);
    const prevDate = new Date(prev.date);
    return currDate.getTime() - prevDate.getTime() > 5 * 60 * 1000;
  }

  return (
    <div className="flex-1 p-6 space-y-3 overflow-y-auto bg-gradient-to-br from-gray-100/90 via-white/80 to-blue-50/80 dark:from-gray-900 dark:via-gray-950 dark:to-blue-950">
      {messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1] : undefined;
        const showHeader = shouldShowHeader(msg, prev);
        const d = new Date(msg.date);
        const isSender = msg.sender === username;
        return (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${isSender ? "justify-end" : "justify-start"}`}
          >
            {/* Avatar for first in group from receiver */}
            {!isSender && showHeader && (
              <div className="mr-1">
                {getAvatar(msg.sender, msg.sender)}
              </div>
            )}
            <div className="flex flex-col max-w-xs w-fit">
              {showHeader && !isSender && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1 font-semibold">
                  {msg.sender}
                </div>
              )}
              <div
                className={`group relative text-sm px-5 py-3 shadow-lg rounded-2xl dark:text-gray-100 transition-all duration-150 ${
                  isSender
                    ? "bg-gradient-to-br from-green-200/80 to-green-400/60 dark:from-green-900/80 dark:to-green-800/60 ml-auto"
                    : "bg-gradient-to-br from-blue-200/80 to-blue-400/60 dark:from-blue-900/80 dark:to-blue-800/60 ml-1"
                }`}
                style={{
                  borderTopLeftRadius: isSender ? 16 : 0,
                  borderTopRightRadius: isSender ? 0 : 16,
                }}
              >
                {msg.text}
                {msg.sender === username && (
                  <span className="ml-2 text-xs align-bottom">
                    {getTickIcon(msg.status)}
                  </span>
                )}
                {/* Timestamp on hover */}
                <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-gray-400 dark:text-gray-500 -bottom-6 left-0 whitespace-nowrap">
                  {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()} {d.getHours()}:{d.getMinutes().toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {isTyping && typingUser && (
        <div className="flex items-center gap-2 mt-2">
          <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-300 font-bold text-xs">...</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <span className="text-xs text-gray-500 italic">{typingUser} is typing...</span>
        </div>
      )}

      {/* Scroll Target */}
      <div ref={bottomRef} />
    </div>
  );
}
