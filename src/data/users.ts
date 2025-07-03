// src/data/users.ts
const users = [
  {
    id: "john",
    name: "John",
    online: true, // true if online, false if offline
    lastSeen: null, // null if online, otherwise ISO string
  },
  {
    id: "riya",
    name: "Riya",
    online: false,
    lastSeen: "2024-05-30T12:34:56.000Z",
  },
  // ...add for all users
];

export default users;