export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold mb-4">Chats</h2>
      <ul className="space-y-2">
        <li className="p-2 rounded hover:bg-gray-800 cursor-pointer">John</li>
        <li className="p-2 rounded hover:bg-gray-800 cursor-pointer">Alice</li>
        <li className="p-2 rounded hover:bg-gray-800 cursor-pointer">Bob</li>
      </ul>
    </div>
  );
}
