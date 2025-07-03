import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

interface User {
  id: string;
  name: string;
  email: string;
}

interface FriendRequest {
  _id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface SidebarProps {
  onSelectUser: (id: string) => void;
  selectedUserId: string;
  currentUser: User;
  onlineUsers: string[];
  friends: User[];
}

export default function Sidebar({
  onSelectUser,
  selectedUserId,
  currentUser,
  onlineUsers,
  friends
}: SidebarProps) {
  const [friendInput, setFriendInput] = useState("");
  const [requests, setRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({ incoming: [], outgoing: [] });
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Fetch friend requests
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await axios.get(`${API}/api/friend-requests`);
      setRequests(res.data);
    } catch {
      setRequests({ incoming: [], outgoing: [] });
    }
    setLoadingRequests(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Send friend request
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!friendInput.trim() || friendInput.trim() === currentUser.id) {
      setError("Enter a valid username");
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API}/api/friend-request`, { to: friendInput.trim() });
      setFriendInput("");
      fetchRequests();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to send request");
    }
    setSending(false);
  };

  // Accept/decline friend request
  const handleAccept = async (id: string) => {
    await axios.post(`${API}/api/friend-request/${id}/accept`);
    fetchRequests();
    // Optionally: trigger parent to refresh friends
    window.location.reload(); // quick hack to refresh friends in App
  };
  const handleDecline = async (id: string) => {
    await axios.post(`${API}/api/friend-request/${id}/decline`);
    fetchRequests();
  };

  // Remove friend
  const handleRemoveFriend = async (id: string) => {
    if (!window.confirm('Remove this friend?')) return;
    await axios.post(`${API}/api/remove-friend`, { friendId: id });
    fetchRequests();
    window.location.reload(); // quick hack to refresh friends in App
  };

  // Notification badge for incoming requests
  const incomingCount = requests.incoming.length;

  return (
    <div className="bg-gray-100 dark:bg-gray-950 p-4 space-y-2 overflow-y-auto h-full lg:w-64 flex flex-col">
      <div className="flex items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chats</h2>
        {incomingCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">{incomingCount}</span>
        )}
      </div>
      {/* Friend request input */}
      <form onSubmit={handleSendRequest} className="flex gap-2 mb-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Add friend by username"
          value={friendInput}
          onChange={e => setFriendInput(e.target.value)}
        />
        <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded" disabled={sending}>
          Add
        </button>
      </form>
      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      {/* Requests */}
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Pending Requests</h3>
        {loadingRequests ? <div className="text-xs text-gray-500">Loading...</div> : null}
        {/* Incoming */}
        {requests.incoming.length > 0 && <div className="mb-1">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Incoming</div>
          {requests.incoming.map(req => (
            <div key={req._id} className="flex items-center gap-2 mb-1">
              <span className="flex-1 text-xs">{req.from}</span>
              <button className="text-green-600 text-xs" onClick={() => handleAccept(req._id)}>Accept</button>
              <button className="text-red-600 text-xs" onClick={() => handleDecline(req._id)}>Decline</button>
            </div>
          ))}
        </div>}
        {/* Outgoing */}
        {requests.outgoing.length > 0 && <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Outgoing</div>
          {requests.outgoing.map(req => (
            <div key={req._id} className="flex items-center gap-2 mb-1">
              <span className="flex-1 text-xs">{req.to}</span>
              <span className="text-xs text-gray-400">Pending</span>
            </div>
          ))}
        </div>}
        {requests.incoming.length === 0 && requests.outgoing.length === 0 && !loadingRequests && (
          <div className="text-xs text-gray-400">No pending requests</div>
        )}
      </div>
      {/* Friends list */}
      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 mt-2">Friends</h3>
      {friends.length === 0 && <div className="text-gray-500 dark:text-gray-400">No friends yet.</div>}
      {friends.map((user) => (
        <div key={user.id} className="flex items-center gap-2 mb-1">
          <button
            onClick={() => onSelectUser(user.id)}
            className={`flex-1 block text-left p-2 rounded ${
              selectedUserId === user.id
                ? "bg-white dark:bg-gray-700 font-semibold"
                : "hover:bg-gray-300 dark:hover:bg-gray-800"
            } text-gray-900 dark:text-gray-100`}
          >
            {onlineUsers.includes(user.id) ? "🟢" : "⚪"} {user.name} <span className="text-xs text-gray-400">({user.id})</span>
          </button>
          <button
            className="text-xs text-red-500 hover:underline px-2"
            title="Remove friend"
            onClick={() => handleRemoveFriend(user.id)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
