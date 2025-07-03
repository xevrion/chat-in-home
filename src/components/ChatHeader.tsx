function getAvatar(name: string, id: string) {
  const colors = ["bg-blue-400", "bg-green-400", "bg-pink-400", "bg-yellow-400", "bg-purple-400", "bg-red-400", "bg-indigo-400"];
  const color = colors[(id.charCodeAt(0) + id.length) % colors.length];
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg shadow ${color}`}>{initials}</span>
  );
}

export default function ChatHeader({ user, onlineUsers = [] }: { user: any, onlineUsers?: string[] }) {
  if (!user) return null;

  // Format last seen time
  function formatLastSeen(isoString: string) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString(); // You can customize this
  }

  return (
    <div className="sticky top-0 z-10 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-sm">
      {getAvatar(user.name, user.id)}
      <div className="flex flex-col flex-1">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
          {user.name}
          {onlineUsers.includes(user.id) && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Online"></span>}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {onlineUsers.includes(user.id)
            ? "Online"
            : user.lastSeen
              ? `Last seen at ${formatLastSeen(user.lastSeen)}`
              : ""}
        </span>
      </div>
    </div>
  );
}
