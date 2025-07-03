import { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import Messages from "./Messages";
import MessageInput from "./MessageInput";
import { socket } from "../lib/socket";
import { messages as initialMessages } from "../data/messages";
import users from "../data/users";

const getChatId = (a: string, b: string) => [a, b].sort().join("_");

export default function Chat({
  username,
  receiverId,
  messages,
  setMessages,
  onlineUsers = [],
}: {
  username: string;
  receiverId: string;
  messages: { [key: string]: any[] };
  setMessages: React.Dispatch<React.SetStateAction<{ [key: string]: any[] }>>;
  onlineUsers?: string[];
}) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  type Message = {
    id: number;
    sender: string;
    receiver: string;
    text: string;
    date: Date;
    status: "sent" | "delivered" | "seen";
  };

  type ChatMap = {
    [key: string]: Message[]; // key = receiverId
  };

  const receiver = users.find((u) => u.id === receiverId);

  const handleSend = (text: string) => {
    const newMessage: Message = {
      id: Date.now(),
      sender: username,
      receiver: receiverId,
      text,
      date: new Date(),
      status: "sent",
    };

    const chatId = getChatId(username, receiverId);

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage],
    }));

    socket.emit("chat:message", newMessage);
  };

  useEffect(() => {
    socket.on("chat:message", (msg) => {
      // Add the message to state
      setMessages((prev) => {
        const chatId = getChatId(msg.sender, msg.receiver);
        return {
          ...prev,
          [chatId]: [...(prev[chatId] || []), { ...msg, date: new Date(msg.date) }],
        };
      });
      // If this client is the recipient, emit delivered
      if (msg.receiver === username) {
        socket.emit("chat:delivered", { messageId: msg.id, sender: msg.sender, receiver: msg.receiver });
      }
    });

    let typingTimeout: NodeJS.Timeout;

    socket.on("chat:typing", ({ sender, receiver }) => {
      // console.log("TYPING RECEIVED:", sender, "->", receiver); // 👈 test
      if (receiver === username && sender === receiverId) {
        setTypingUser(sender);
        setIsTyping(true);

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          setIsTyping(false);
          setTypingUser(null);
        }, 1500); // hides after 1.5s of no typing
      }
    });

    return () => {
      socket.off("chat:message");
      socket.off("chat:typing");
      clearTimeout(typingTimeout);
    };
  }, []);

  const chatId = getChatId(username, receiverId);
  return (
    <div className="flex flex-col flex-1 bg-white">
      <ChatHeader user={receiver} onlineUsers={onlineUsers} />
      <Messages
        messages={messages[chatId] || []}
        username={username}
        isTyping={isTyping}
        typingUser={typingUser}
      />

      <MessageInput
        onSend={handleSend}
        username={username}
        receiverId={receiverId}
      />
    </div>
  );
}
