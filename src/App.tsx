import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import { AnimatePresence, motion } from "framer-motion";
import { socket } from "./lib/socket";
import users from "./data/users";

const getChatId = (a: string, b: string) => [a, b].sort().join("_");

function App() {
  const [username, setUsername] = useState("");
  const [tempName, setTempName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [messages, setMessages] = useState<{ [key: string]: any[] }>({});
  const storageKey = username ? `chat-messages-${username}` : "";
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Load messages from localStorage when username changes
  useEffect(() => {
    if (!username) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        Object.keys(parsed).forEach((chatId) => {
          parsed[chatId] = parsed[chatId].map((msg: any) => ({
            ...msg,
            date: new Date(msg.date),
          }));
        });
        setMessages(parsed);
      } catch (e) {
        console.error("Failed to parse messages from localStorage", e);
      }
    } else {
      setMessages({});
    }
  }, [storageKey, username]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (username) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [storageKey, messages, username]);

  useEffect(() => {
    if (username) {
      socket.emit("user:join", { username });
    }
  }, [username]);

  useEffect(() => {
    socket.on("user:online", ({ username }) => {
      setOnlineUsers((prev) => [...new Set([...prev, username])]);
    });
    socket.on("user:offline", ({ username }) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== username));
    });

    socket.on("user:online-list", ({ onlineUsers }) => {
      setOnlineUsers(onlineUsers);
    });
    socket.on("chat:delivered", ({ messageId, receiver }) => {
      setMessages((prev) => {
        const chatId = getChatId(username, receiver);
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((msg) =>
          msg.id === messageId ? { ...msg, status: "delivered" } : msg
        );
        return { ...prev, [chatId]: updated };
      });
    });

    // Listen for incoming messages globally
    socket.on("chat:message", (msg) => {
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

    // Listen for delivered events
    socket.on("chat:delivered", ({ messageId, receiver }) => {
      setMessages((prev) => {
        const chatId = getChatId(username, receiver);
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((msg) =>
          msg.id === messageId ? { ...msg, status: "delivered" } : msg
        );
        return { ...prev, [chatId]: updated };
      });
    });

    // Optionally, clean up listeners on unmount
    return () => {
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("user:online-list");
      socket.off("chat:message");
      socket.off("chat:delivered");
    };
  }, []);

  const handleLogin = () => {
    if (tempName.trim()) {
      setUsername(tempName.trim());
    }
  };

  if (!username) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded shadow w-80 flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-center">Enter your name</h2>
          <input
            className="border px-4 py-2 rounded"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="e.g. Yash"
          />
          <button
            className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            onClick={handleLogin}
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      {/* 👨‍💻 DESKTOP layout */}
      <div className="hidden lg:flex w-full">
        <div className="w-64 border-r bg-gray-100 h-screen">
          <Sidebar
            onSelectUser={(id) => {
              setDirection("forward");
              setSelectedUserId(id);
            }}
            selectedUserId={selectedUserId}
            currentUsername={username}
            onlineUsers={onlineUsers}
          />
        </div>
        <div className="flex-1 flex flex-col">
          {selectedUserId ? (
            <div className="flex flex-col h-full">
              <div className="p-2 border-b bg-white z-10">
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => {
                    setDirection("backward");
                    setSelectedUserId("");
                  }}
                >
                  ← Back to users
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Chat
                  username={username}
                  receiverId={selectedUserId}
                  messages={messages}
                  setMessages={setMessages}
                  onlineUsers={onlineUsers}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
              Select a user to chat
            </div>
          )}
        </div>
      </div>

      {/* 📱 MOBILE layout */}
      <div className="flex flex-1 flex-col lg:hidden relative overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {!selectedUserId ? (
            <motion.div
              key="sidebar"
              initial={{ x: direction === "forward" ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: direction === "forward" ? "-100%" : 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="absolute w-full h-screen"
            >
              <Sidebar
                onSelectUser={(id) => {
                  setDirection("forward");
                  setSelectedUserId(id);
                }}
                selectedUserId={selectedUserId}
                currentUsername={username}
                onlineUsers={onlineUsers}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ x: direction === "forward" ? "100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: direction === "forward" ? 0 : "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="absolute w-full h-screen flex flex-col"
            >
              {/* Back Button */}
              <div className="p-2 border-b">
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => {
                    setDirection("backward");
                    setSelectedUserId("");
                  }}
                >
                  ← Back to users
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Chat
                  username={username}
                  receiverId={selectedUserId}
                  messages={messages}
                  setMessages={setMessages}
                  onlineUsers={onlineUsers}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
