import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

interface User {
  id: string;
  name: string;
  email: string;
}

interface SidebarProps {
  onSelectUser: (id: string) => void;
  selectedUserId: string;
  currentUser: User;
  onlineUsers: string[];
}

export default function Sidebar({
  onSelectUser,
  selectedUserId,
  currentUser,
  onlineUsers,
}: SidebarProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/users`)
      .then(res => setUsers(res.data))
      .catch(err => console.error('Failed to fetch users', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4">Loading users...</div>;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-950 p-4 space-y-2 overflow-y-auto h-full lg:w-64 flex flex-col">
      <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Chats</h2>
      {users.length === 0 && <div className="text-gray-500 dark:text-gray-400">No other users found.</div>}
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onSelectUser(user.id)}
          className={`block w-full text-left p-2 rounded ${
            selectedUserId === user.id
              ? "bg-white dark:bg-gray-700 font-semibold"
              : "hover:bg-gray-300 dark:hover:bg-gray-800"
          } text-gray-900 dark:text-gray-100`}
        >
          {onlineUsers.includes(user.id) ? "🟢" : "⚪"} {user.name} <span className="text-xs text-gray-400">({user.id})</span>
        </button>
      ))}
    </div>
  );
}
