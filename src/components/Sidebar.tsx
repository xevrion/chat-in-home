import users from "../data/users";


export default function Sidebar({
  onSelectUser,
  selectedUserId,
  currentUsername,
  onlineUsers=[],
}: {
  onSelectUser: (id: string) => void;
  selectedUserId: string;
  currentUsername: string;
  onlineUsers?: string[];
}) {
  const filteredUsers = users.filter((u) => u.id !== currentUsername);

  return (
    <div className="bg-gray-200 p-4 space-y-2 overflow-y-auto h-full lg:w-64">
      <h2 className="text-lg font-semibold mb-2">Chats</h2>
      {filteredUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => onSelectUser(user.id)}
          className={`block w-full text-left p-2 rounded ${
            selectedUserId === user.id
              ? "bg-white font-semibold"
              : "hover:bg-gray-300"
          }`}
        >
          {onlineUsers.includes(user.id) ? "🟢" : "⚪"} {user.name}
        </button>
      ))}
    </div>
  );
}
