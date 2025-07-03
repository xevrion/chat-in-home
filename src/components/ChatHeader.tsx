export default function ChatHeader({ user, onlineUsers = [] }: { user: any, onlineUsers?: string[] }) {
  if (!user) return null;

  // Format last seen time
  function formatLastSeen(isoString: string) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString(); // You can customize this
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
      <span className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {onlineUsers.includes(user.id)
          ? "Online"
          : user.lastSeen
            ? `Last seen at ${formatLastSeen(user.lastSeen)}`
            : ""}
      </span>
    </div>
  );
}
