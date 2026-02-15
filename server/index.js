import express from "express";
import session from "express-session";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(session({
  secret: "ssp-secret",
  resave: false,
  saveUninitialized: false
}));

// ===== MEMORY USERS =====
let users = {
  "admin": { password: "admin123", role: "admin", approved: true }
};

let onlineUsers = new Set();
let clients = new Map();
let chatHistory = [];

// ===== SIGNUP =====
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, msg: "Missing fields" });
  if (users[username]) return res.json({ success: false, msg: "User exists" });

  users[username] = { password, role: "user", approved: false };
  res.json({ success: true, msg: "Waiting for admin approval" });
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) return res.json({ success: false, msg: "No such user" });
  if (!user.approved) return res.json({ success: false, msg: "Waiting for admin approval" });
  if (user.password !== password) return res.json({ success: false, msg: "Wrong password" });

  onlineUsers.add(username);
  res.json({ success: true, username, role: user.role });
});

// ===== LOGOUT =====
app.post("/logout", (req, res) => {
  const { username } = req.body;
  onlineUsers.delete(username);
  res.json({ success: true });
});

// ===== USERS LIST =====
app.get("/users", (req, res) => {
  res.json({ users });
});

// ===== APPROVE USER =====
app.post("/approve", (req, res) => {
  const { username } = req.body;
  if (!users[username]) return res.json({ success: false });
  users[username].approved = true;
  res.json({ success: true });
});

// ===== CHAT =====
wss.on("connection", ws => {
  let currentUser = null;

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      currentUser = data.username;
      clients.set(currentUser, ws);
      ws.send(JSON.stringify({ type: "chatHistory", history: chatHistory }));
      return;
    }

    if (data.type === "chat") {
      const chatMessage = { username: data.username, message: data.message };
      chatHistory.push(chatMessage);
      if (chatHistory.length > 100) chatHistory.shift();
      wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(JSON.stringify(chatMessage));
      });
    }
  });

  ws.on("close", () => {
    if (currentUser) clients.delete(currentUser);
  });
});

// ===== SERVE FRONTEND =====
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`SSP server running on port ${PORT}`));
