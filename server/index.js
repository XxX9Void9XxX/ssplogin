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
  secret: "ssp-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Serve public folder correctly
app.use(express.static(path.join(__dirname, "../public")));

// ====== MEMORY STORAGE ======
let users = [
  {
    username: "a",
    password: "a",
    role: "admin",
    banned: false,
    lastLogin: null
  }
];

let onlineUsers = new Set();

// ====== SIGNUP ======
app.post("/signup", (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.json({ success: false, message: "Missing fields" });
  }

  if (users.find(u => u.username === username)) {
    return res.json({ success: false, message: "Username exists" });
  }

  users.push({
    username,
    password,
    role: "user",
    banned: false,
    lastLogin: null
  });

  res.json({ success: true });
});

// ====== LOGIN ======
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);

  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  if (user.banned) {
    return res.json({ success: false, message: "You are banned." });
  }

  if (user.password !== password) {
    return res.json({ success: false, message: "Wrong password" });
  }

  // Force admin
  if (user.username === "a") {
    user.role = "admin";
  }

  user.lastLogin = new Date().toISOString();

  req.session.user = null; // DO NOT REMEMBER LOGIN

  onlineUsers.add(user.username);

  res.json({
    success: true,
    username: user.username,
    role: user.role
  });
});

// ====== LOGOUT ======
app.post("/logout", (req, res) => {
  if (req.session.user) {
    onlineUsers.delete(req.session.user.username);
  }

  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ====== GET USERS (ADMIN PANEL) ======
app.get("/users", (req, res) => {
  res.json({
    users,
    onlineCount: onlineUsers.size
  });
});

// ====== BAN USER ======
app.post("/ban", (req, res) => {
  const { username } = req.body;

  if (username === "a") {
    return res.json({ success: false });
  }

  const user = users.find(u => u.username === username);
  if (user) {
    user.banned = true;
    onlineUsers.delete(username);
  }

  res.json({ success: true });
});

// ====== UNBAN USER ======
app.post("/unban", (req, res) => {
  const { username } = req.body;

  const user = users.find(u => u.username === username);
  if (user) {
    user.banned = false;
  }

  res.json({ success: true });
});

// ====== FALLBACK FOR RENDER ======
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("SSP running on port", PORT);
});
