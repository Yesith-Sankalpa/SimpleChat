const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

const users = new Map();
const rooms = new Map();

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/rooms", (req, res) => {
  const roomList = Array.from(rooms.keys()).map((roomId) => ({
    id: roomId,
    name: rooms.get(roomId).name,
    userCount: rooms.get(roomId).users.size,
  }));
  res.json(roomList);
});

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.on("join", (userData) => {
    const { username, room } = userData;

    users.set(socket.id, {
      username,
      room,
      id: socket.id,
    });

    socket.join(room);

    if (!rooms.has(room)) {
      rooms.set(room, {
        name: room,
        users: new Set(),
        messages: [],
      });
    }

    rooms.get(room).users.add(socket.id);

    socket.emit("message", {
      id: Date.now(),
      username: "System",
      text: `Welcome to ${room}!`,
      timestamp: new Date().toISOString(),
      isSystem: true,
    });

    socket.to(room).emit("message", {
      id: Date.now(),
      username: "System",
      text: `${username} joined the chat`,
      timestamp: new Date().toISOString(),
      isSystem: true,
    });

    const roomData = rooms.get(room);
    if (roomData.messages.length > 0) {
      socket.emit("recent_messages", roomData.messages.slice(-50));
    }

    const roomUsers = Array.from(roomData.users)
      .map((userId) => {
        const user = users.get(userId);
        return user ? { id: userId, username: user.username } : null;
      })
      .filter(Boolean);

    io.to(room).emit("room_users", roomUsers);

    console.log(`${username} joined room: ${room}`);
  });

  socket.on("send_message", (messageData) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message = {
      id: Date.now(),
      username: user.username,
      text: messageData.text,
      timestamp: new Date().toISOString(),
      isSystem: false,
    };

    const roomData = rooms.get(user.room);
    if (roomData) {
      roomData.messages.push(message);

      if (roomData.messages.length > 100) {
        roomData.messages = roomData.messages.slice(-100);
      }
    }

    io.to(user.room).emit("message", message);
  });

  socket.on("typing", (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.to(user.room).emit("user_typing", {
      username: user.username,
      isTyping,
    });
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);

    if (user) {
      const { username, room } = user;

      const roomData = rooms.get(room);
      if (roomData) {
        roomData.users.delete(socket.id);

        if (roomData.users.size === 0) {
          rooms.delete(room);
        } else {
          socket.to(room).emit("message", {
            id: Date.now(),
            username: "System",
            text: `${username} left the chat`,
            timestamp: new Date().toISOString(),
            isSystem: true,
          });

          const roomUsers = Array.from(roomData.users)
            .map((userId) => {
              const u = users.get(userId);
              return u ? { id: userId, username: u.username } : null;
            })
            .filter(Boolean);

          socket.to(room).emit("room_users", roomUsers);
        }
      }

      // Remove user
      users.delete(socket.id);
      console.log(`${username} disconnected from room: ${room}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
