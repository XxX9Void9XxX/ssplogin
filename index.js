import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "ssp-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

// ===== IN-MEMORY DB =====
let users = [
  { username: "script.add.user", password: "script=admin", role: "admin", banned: false, lastLogin: null }
];

let chatHistory = [];
let onlineUsers = new Set();

// ===== SIGNUP =====
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false });
  if (users.find(u => u.username === username)) return res.json({ success: false });
  users.push({ username, password, role: "user", banned: false, lastLogin: null });
  res.json({ success: true });
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.json({ success: false });
  if (user.banned) return res.json({ success: false, banned: true });
  if (user.password !== password) return res.json({ success: false });

  user.lastLogin = new Date().toISOString();
  onlineUsers.add(username);

  res.json({
    success: true,
    username,
    role: user.role
  });
});

// ===== LOGOUT =====
app.post("/logout", (req, res) => {
  const { username } = req.body;
  onlineUsers.delete(username);
  res.json({ success: true });
});

// ===== USERS LIST =====
app.get("/users", (req, res) => {
  res.json({
    users: users.map(u => ({
      username: u.username,
      role: u.role,
      banned: u.banned,
      lastLogin: u.lastLogin
    })),
    onlineCount: onlineUsers.size
  });
});

// ===== BAN / UNBAN =====
app.post("/ban", (req, res) => {
  const { username } = req.body;
  if (username === "script.add.user") return res.json({ success: false });
  const user = users.find(u => u.username === username);
  if (user) user.banned = true;
  onlineUsers.delete(username);
  res.json({ success: true });
});

app.post("/unban", (req, res) => {
  const { username } = req.body;
  const user = users.find(u => u.username === username);
  if (user) user.banned = false;
  res.json({ success: true });
});

// ===== CHAT =====
app.get("/chat", (req, res) => {
  res.json({ history: chatHistory });
});

app.post("/chat", (req, res) => {
  const { username, role, message } = req.body;
  if (!username || !message) return res.json({ success: false });
  const chatMessage = { username: role === "admin" ? "Admin" : username, message };
  chatHistory.push(chatMessage);
  if (chatHistory.length > 100) chatHistory.shift();
  res.json({ success: true });
});

// ===== CATCH ALL =====
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SSP running on port ${PORT}`));
