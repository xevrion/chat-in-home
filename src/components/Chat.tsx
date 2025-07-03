import ChatHeader from "./ChatHeader";
import Messages from "./Messages";
import MessageInput from "./MessageInput";
import { socket } from "../lib/socket";
import type { Message } from "../App";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const getChatId = (a: string, b: string): string => [a, b].sort().join("_");

type ChatMap = { [key: string]: Message[] };

type ChatProps = {
  username: string;
  receiverId: string;
  messages: ChatMap;
  setMessages: React.Dispatch<React.SetStateAction<ChatMap>>;
  friends: any[];
  onlineUsers?: string[];
  setChatLoaded?: (v: boolean) => void;
};

const statusRank = (status: string) => {
  if (status === "seen") return 2;
  if (status === "delivered") return 1;
  return 0;
};

const mergeMessages = (oldMsgs: Message[], newMsgs: Message[]) => {
  const byId = new Map<number, Message>();
  [...oldMsgs, ...newMsgs].forEach(msg => {
    if (!byId.has(msg.id) || statusRank(msg.status) > statusRank(byId.get(msg.id)!.status)) {
      byId.set(msg.id, msg);
    }
  });
  return Array.from(byId.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
};

export default function Chat({
  username,
  receiverId,
  messages,
  setMessages,
  friends,
  onlineUsers = [],
  setChatLoaded
}: ChatProps) {
  const [receiver, setReceiver] = useState<any>(null);
  const chatId = getChatId(username, receiverId);
  const chatMessages = messages[chatId] || [];
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  useEffect(() => {
    if (!receiverId || !Array.isArray(friends)) {
      setReceiver(null);
      setChatLoaded && setChatLoaded(true);
      return;
    }
    const found = friends.find(u => u.id === receiverId);
    setReceiver(found || null);
    setChatLoaded && setChatLoaded(true);
  }, [receiverId, friends, setChatLoaded]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length]);

  const handleSend = (text: string) => {
    const newMessage: Message = {
      id: Date.now(),
      sender: username,
      receiver: receiverId,
      text,
      date: new Date(),
      status: "sent",
    };
    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage],
    }));
    socket.emit("chat:message", newMessage);
  };

  useEffect(() => {
    const chatId = getChatId(username, receiverId);
    const chatMessages = messages[chatId] || [];
    // Find all unseen messages from the other user
    const unseen = chatMessages.filter(
      (msg) => msg.sender === receiverId && msg.status !== "seen"
    );
    if (unseen.length > 0) {
      unseen.forEach((msg) => {
        socket.emit("chat:seen", {
          messageId: msg.id,
          sender: msg.sender,
          receiver: msg.receiver,
        });
      });
    }
  }, [receiverId, messages, username]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!username || !receiverId) return;
      const chatId = getChatId(username, receiverId);
      try {
        const res = await axios.get(`${API}/api/messages?user1=${username}&user2=${receiverId}`);
        // Convert date strings to Date objects and status to correct type
        const loaded = res.data.map((msg: any) => ({
          ...msg,
          date: new Date(msg.date),
          status: (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'seen') ? msg.status : 'sent'
        }));
        setMessages((prev) => ({
          ...prev,
          [chatId]: mergeMessages(prev[chatId] || [], loaded),
        }));
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };
    fetchHistory();
  }, [username, receiverId]);

  // Typing indicator logic
  useEffect(() => {
    function handleTyping({ sender, receiver }: { sender: string; receiver: string }) {
      if (receiver === username && sender === receiverId) {
        setIsTyping(true);
        setTypingUser(sender);
        // Hide after 2s
        setTimeout(() => setIsTyping(false), 2000);
      }
    }
    socket.on("chat:typing", handleTyping);
    return () => {
      socket.off("chat:typing", handleTyping);
    };
  }, [username, receiverId]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-xl m-2 overflow-hidden">
      {receiver && (
        <ChatHeader user={receiver} onlineUsers={onlineUsers} />
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Messages
          messages={chatMessages}
          username={username}
          isTyping={isTyping}
          typingUser={typingUser}
          bottomRef={bottomRef}
        />
      </div>
      <MessageInput
        onSend={handleSend}
        username={username}
        receiverId={receiverId}
      />
    </div>
  );
}
