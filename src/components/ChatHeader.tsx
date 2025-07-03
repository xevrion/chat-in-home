export default function ChatHeader({ user, onlineUsers = [] }: { user: any, onlineUsers?: string[] }) {
  if (!user) return null;

  // Format last seen time
  function formatLastSeen(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString(); // You can customize this
  }

  return (
    <div className="p-4 border-b flex flex-col">
      <span className="font-semibold">{user.name}</span>
      <span className="text-xs text-gray-500">
        {onlineUsers.includes(user.id)
          ? "Online"
          : user.lastSeen
            ? `Last seen at ${formatLastSeen(user.lastSeen)}`
            : ""}
      </span>
    </div>
  );
}
