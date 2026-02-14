import express from "express";
import session from "express-session";
import cors from "cors";
import sqlite3 from "sqlite3";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

app.use(session({
  secret: "ssp-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "../public")));

const db = new sqlite3.Database("./users.db");

// ===== DATABASE SETUP =====
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      banned INTEGER DEFAULT 0,
      lastLogin TEXT
    )
  `);

  // Create admin if it doesn't exist
  db.get("SELECT * FROM users WHERE username='script.add.user'", (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO users (username,password,role) VALUES ('script.add.user','script=admin','admin')"
      );
    }
  });
});

// ===== MEMORY =====
let onlineUsers = new Set();
let clients = new Map();
let chatHistory = []; // stores last 100 messages

// ===== BROADCAST ONLINE USERS =====
function broadcastOnline() {
  const payload = JSON.stringify({
    type: "onlineUpdate",
    online: Array.from(onlineUsers)
  });

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

// ===== SIGNUP =====
app.post("/signup", (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email)
    return res.json({ success: false });

  db.run(
    "INSERT INTO users (username,password) VALUES (?,?)",
    [username, password],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username=?",
    [username],
    (err, user) => {
      if (!user) return res.json({ success: false });
      if (user.banned) return res.json({ success: false, banned: true });
      if (user.password !== password)
        return res.json({ success: false });

      db.run(
        "UPDATE users SET lastLogin=? WHERE username=?",
        [new Date().toISOString(), username]
      );

      onlineUsers.add(username);
      broadcastOnline();

      res.json({
        success: true,
        username,
        role: user.role
      });
    }
  );
});

// ===== LOGOUT =====
app.post("/logout", (req, res) => {
  const { username } = req.body;
  onlineUsers.delete(username);
  broadcastOnline();
  res.json({ success: true });
});

// ===== USERS LIST =====
app.get("/users", (req, res) => {
  db.all("SELECT username,role,banned,lastLogin FROM users", (err, rows) => {
    res.json({
      users: rows,
      onlineCount: onlineUsers.size
    });
  });
});

// ===== BAN =====
app.post("/ban", (req, res) => {
  const { username } = req.body;
  if (username === "script.add.user") return res.json({ success: false });

  db.run("UPDATE users SET banned=1 WHERE username=?", [username]);
  onlineUsers.delete(username);

  if (clients.has(username)) {
    clients.get(username).send(JSON.stringify({ type: "banned" }));
    clients.get(username).close();
  }

  broadcastOnline();
  res.json({ success: true });
});

// ===== UNBAN =====
app.post("/unban", (req, res) => {
  const { username } = req.body;
  db.run("UPDATE users SET banned=0 WHERE username=?", [username]);
  res.json({ success: true });
});

// ===== WEBSOCKET CHAT =====
wss.on("connection", ws => {
  let currentUser = null;

  ws.on("message", message => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      currentUser = data.username;
      clients.set(currentUser, ws);

      // SEND CHAT HISTORY
      ws.send(JSON.stringify({
        type: "chatHistory",
        history: chatHistory
      }));

      broadcastOnline();
      return;
    }

    if (data.type === "chat") {
      const chatMessage = {
        type: "chat",
        username: data.role === "admin" ? "Admin" : data.username,
        message: data.message
      };

      // Store last 100 messages
      chatHistory.push(chatMessage);
      if (chatHistory.length > 100) chatHistory.shift();

      wss.clients.forEach(client => {
        if (client.readyState === 1)
          client.send(JSON.stringify(chatMessage));
      });
    }
  });

  ws.on("close", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      clients.delete(currentUser);
      broadcastOnline();
    }
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () =>
  console.log("SSP FULL SYSTEM running on port", PORT)
);
