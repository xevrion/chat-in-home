import { useEffect, useState } from "react";
import axios from "axios";
import { socket } from "../lib/socket";

const API = import.meta.env.VITE_API_URL;

function getAvatar(name: string, id: string) {
  // Simple colored circle with initials
  const colors = ["bg-blue-400", "bg-green-400", "bg-pink-400", "bg-yellow-400", "bg-purple-400", "bg-red-400", "bg-indigo-400"];
  const color = colors[(id.charCodeAt(0) + id.length) % colors.length];
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-base shadow ${color}`}>{initials}</span>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-2 animate-bounce inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 to-red-500 text-white shadow">
      {count}
    </span>
  );
}

function Modal({ open, onClose, onConfirm, children }: { open: boolean, onClose: () => void, onConfirm: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-80 flex flex-col items-center">
        <div className="mb-4 text-center">{children}</div>
        <div className="flex gap-4">
          <button className="px-4 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition" onClick={onClose}>Cancel</button>
          <button className="px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </div>
  );
}

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
  onFriendsChange?: () => void;
}

export default function Sidebar({
  onSelectUser,
  selectedUserId,
  currentUser,
  onlineUsers,
  friends,
  onFriendsChange
}: SidebarProps) {
  const [friendInput, setFriendInput] = useState("");
  const [requests, setRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({ incoming: [], outgoing: [] });
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

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
  // Fetch friends
  const fetchFriends = async () => {
    if (onFriendsChange) onFriendsChange();
  };

  useEffect(() => {
    fetchRequests();
    // Listen for real-time friend events
    socket.on("friend:request", fetchRequests);
    socket.on("friend:accept", () => { fetchRequests(); fetchFriends(); });
    socket.on("friend:decline", fetchRequests);
    socket.on("friend:remove", () => { fetchRequests(); fetchFriends(); });
    return () => {
      socket.off("friend:request", fetchRequests);
      socket.off("friend:accept");
      socket.off("friend:decline", fetchRequests);
      socket.off("friend:remove");
    };
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
    // fetchRequests and fetchFriends will be triggered by socket event
  };
  const handleDecline = async (id: string) => {
    await axios.post(`${API}/api/friend-request/${id}/decline`);
    fetchRequests();
  };

  // Remove friend with modal
  const handleRemoveFriend = (id: string) => {
    setPendingRemove(id);
    setModalOpen(true);
  };
  const confirmRemove = async () => {
    if (!pendingRemove) return;
    await axios.post(`${API}/api/remove-friend`, { friendId: pendingRemove });
    setModalOpen(false);
    setPendingRemove(null);
    // fetchRequests and fetchFriends will be triggered by socket event
  };

  // Notification badge for incoming requests
  const incomingCount = requests.incoming.length;

  return (
    <div className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 space-y-4 overflow-y-auto h-full lg:w-72 flex flex-col transition-all duration-300">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={confirmRemove}>
        <div className="text-lg font-semibold mb-2">Remove Friend?</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">This will also delete your chat history with this user.</div>
      </Modal>
      <div className="flex items-center mb-2">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Chats</h2>
        {incomingCount > 0 && <Badge count={incomingCount} />}
      </div>
      {/* Friend request input */}
      <form onSubmit={handleSendRequest} className="flex gap-2 mb-2">
        <input
          className="flex-1 border-none rounded-full px-4 py-2 text-base bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Add friend by username"
          value={friendInput}
          onChange={e => setFriendInput(e.target.value)}
        />
        <button type="submit" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-white px-5 py-2 rounded-full font-semibold shadow transition-colors duration-150" disabled={sending}>
          Add
        </button>
      </form>
      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      {/* Requests */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">Pending Requests</h3>
        {loadingRequests ? <div className="text-xs text-gray-500 dark:text-gray-400">Loading...</div> : null}
        {/* Incoming */}
        {requests.incoming.length > 0 && <div className="mb-1 space-y-1">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Incoming</div>
          {requests.incoming.map(req => (
            <div key={req._id} className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 rounded-lg px-3 py-2 shadow-sm">
              {getAvatar(req.from, req.from)}
              <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-medium">{req.from}</span>
              <button className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-xs font-semibold px-2 py-1 rounded transition" onClick={() => handleAccept(req._id)}>Accept</button>
              <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-semibold px-2 py-1 rounded transition" onClick={() => handleDecline(req._id)}>Decline</button>
            </div>
          ))}
        </div>}
        {/* Outgoing */}
        {requests.outgoing.length > 0 && <div className="space-y-1">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Outgoing</div>
          {requests.outgoing.map(req => (
            <div key={req._id} className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 rounded-lg px-3 py-2 shadow-sm">
              {getAvatar(req.to, req.to)}
              <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-medium">{req.to}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">Pending</span>
            </div>
          ))}
        </div>}
        {requests.incoming.length === 0 && requests.outgoing.length === 0 && !loadingRequests && (
          <div className="text-xs text-gray-400 dark:text-gray-500">No pending requests</div>
        )}
      </div>
      {/* Friends list */}
      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 mt-2 uppercase tracking-wide">Friends</h3>
      {friends.length === 0 && <div className="text-gray-500 dark:text-gray-400">No friends yet.</div>}
      <div className="space-y-1">
        {friends.map((user) => (
          <div key={user.id} className={`flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 rounded-lg px-3 py-2 shadow-sm transition-all duration-150 ${selectedUserId === user.id ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}>
            <button
              onClick={() => onSelectUser(user.id)}
              className={`flex-1 flex items-center gap-2 text-left focus:outline-none group`}
            >
              {getAvatar(user.name, user.id)}
              <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:underline">{user.name}</span>
              <span className="text-xs text-gray-400">({user.id})</span>
              {onlineUsers.includes(user.id) && <span className="ml-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Online"></span>}
            </button>
            <button
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full transition-colors duration-150"
              title="Remove friend"
              onClick={() => handleRemoveFriend(user.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
