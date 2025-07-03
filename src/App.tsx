import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import AuthForm from "./components/AuthForm";
import { AnimatePresence, motion } from "framer-motion";
import { socket } from "./lib/socket";
import axios from "axios";
import { useRef } from "react";
import ThemeSwitch from "./components/ThemeSwitch";

// Message type
export type Message = {
  id: number;
  sender: string;
  receiver: string;
  text: string;
  date: Date;
  status: "sent" | "delivered" | "seen";
};

const getChatId = (a: string, b: string): string => [a, b].sort().join("_");

type ChatMap = { [key: string]: Message[] };

type User = { id: string; name: string; email: string };

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [messages, setMessages] = useState<ChatMap>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Global loader state
  const [globalLoading, setGlobalLoading] = useState(true);
  // Track when users and chat receiver are loaded
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);

  // Set axios default auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // On login, emit user:join with real user id
  useEffect(() => {
    if (user) {
      socket.emit("user:join", { username: user.id });
    }
  }, [user]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Socket listeners for online status, messages, and delivery
  useEffect(() => {
    if (!user) return;
    function handleOnline({ username }: { username: string }) {
      setOnlineUsers((prev) => [...new Set([...prev, username])]);
    }
    function handleOffline({ username }: { username: string }) {
      setOnlineUsers((prev) => prev.filter((u) => u !== username));
    }
    function handleOnlineList({ onlineUsers }: { onlineUsers: string[] }) {
      setOnlineUsers(onlineUsers);
    }
    function handleMessage(msg: Message) {
      setMessages((prev) => {
        const chatId = getChatId(msg.sender, msg.receiver);
        const updated: ChatMap = { ...prev };
        const arr = [...(prev[chatId] || []), { ...msg, date: new Date(msg.date), status: (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'seen') ? msg.status : 'sent' } as Message];
        updated[chatId] = arr;
        return updated;
      });
      // If this client is the recipient, emit delivered
      if (msg.receiver === user!.id) {
        socket.emit("chat:delivered", { messageId: msg.id, sender: msg.sender, receiver: msg.receiver });
      }
    }
    function handleDelivered({ messageId, receiver }: { messageId: number, receiver: string }) {
      setMessages((prev) => {
        const chatId = getChatId(user!.id, receiver);
        const chatMsgs = prev[chatId] || [];
        const updatedMsgs: Message[] = chatMsgs.map((msg) =>
          msg.id === messageId ? { ...msg, status: "delivered" as const } : msg
        );
        return { ...prev, [chatId]: updatedMsgs };
      });
    }
    function handleSeen({ messageId, receiver }: { messageId: number, receiver: string }) {
      setMessages((prev) => {
        const chatId = getChatId(user!.id, receiver);
        const chatMsgs = prev[chatId] || [];
        const updatedMsgs: Message[] = chatMsgs.map((msg) =>
          msg.id === messageId ? { ...msg, status: "seen" as const } : msg
        );
        return { ...prev, [chatId]: updatedMsgs };
      });
    }
    socket.on("user:online", handleOnline);
    socket.on("user:offline", handleOffline);
    socket.on("user:online-list", handleOnlineList);
    socket.on("chat:message", handleMessage);
    socket.on("chat:delivered", handleDelivered);
    socket.on("chat:seen", handleSeen);
    return () => {
      socket.off("user:online", handleOnline);
      socket.off("user:offline", handleOffline);
      socket.off("user:online-list", handleOnlineList);
      socket.off("chat:message", handleMessage);
      socket.off("chat:delivered", handleDelivered);
      socket.off("chat:seen", handleSeen);
    };
  }, [user]);

  // On mount, if token exists but user is null, fetch user info
  useEffect(() => {
    if (token && !user) {
      axios.get(`${import.meta.env.VITE_API_URL}/api/me`)
        .then(res => setUser(res.data))
        .catch(() => {
          setToken(null);
          localStorage.removeItem('token');
        });
    }
  }, [token, user]);

  // Logout handler
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setSelectedUserId("");
    setMessages({});
    localStorage.removeItem('token');
  };

  // Show loader until both are loaded
  useEffect(() => {
    if (usersLoaded && (selectedUserId ? chatLoaded : true)) {
      setGlobalLoading(false);
    } else {
      setGlobalLoading(true);
    }
  }, [usersLoaded, chatLoaded, selectedUserId]);

  if (!user || !token) {
    return <AuthForm onLogin={(user, token) => { setUser(user); setToken(token); }} theme={theme} setTheme={setTheme} />;
  }

  if (globalLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-lg text-gray-700 dark:text-gray-200">Loading app...</span>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Top-right controls (desktop and mobile sidebar only) */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-50 hidden sm:flex lg:flex">
        <ThemeSwitch theme={theme} setTheme={setTheme} />
        <button
          className="bg-red-500 text-white px-3 py-1 rounded"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
      {/* DESKTOP layout */}
      <div className="hidden lg:flex w-full">
        <div className="w-64 border-r bg-gray-100 h-screen">
          {token && (
            <Sidebar
              onSelectUser={(id: string) => {
                setDirection("forward");
                setSelectedUserId(id);
              }}
              selectedUserId={selectedUserId}
              currentUser={user!}
              onlineUsers={onlineUsers}
              setUsersLoaded={setUsersLoaded}
            />
          )}
        </div>
        <div className="flex-1 flex flex-col h-full">
          {selectedUserId ? (
            <div className="flex-1 flex flex-col h-full">
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
              <div className="flex-1 flex flex-col h-full">
                <Chat
                  username={user!.id}
                  receiverId={selectedUserId}
                  messages={messages}
                  setMessages={setMessages}
                  onlineUsers={onlineUsers}
                  setChatLoaded={setChatLoaded}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-400 text-lg bg-white dark:bg-gray-950">
              Select a user to chat
            </div>
          )}
        </div>
      </div>

      {/* MOBILE layout */}
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
                onSelectUser={(id: string) => {
                  setDirection("forward");
                  setSelectedUserId(id);
                }}
                selectedUserId={selectedUserId}
                currentUser={user!}
                onlineUsers={onlineUsers}
                setUsersLoaded={setUsersLoaded}
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
              {/* Mobile Chat Header: Back, Theme, Logout */}
              <div className="sticky top-0 z-20 flex items-center justify-between p-2 border-b bg-white dark:bg-gray-900">
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => {
                    setDirection("backward");
                    setSelectedUserId("");
                  }}
                >
                  ← Back to users
                </button>
                <div className="flex items-center gap-2">
                  <ThemeSwitch theme={theme} setTheme={setTheme} />
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col h-full">
                <Chat
                  username={user!.id}
                  receiverId={selectedUserId}
                  messages={messages}
                  setMessages={setMessages}
                  onlineUsers={onlineUsers}
                  setChatLoaded={setChatLoaded}
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
