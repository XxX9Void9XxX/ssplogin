import express from "express";
import session from "express-session";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.use(session({
  secret: "ssp-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static("../public"));

let users = [
  {
    username: "a",
    password: "a",
    role: "admin",
    banned: false,
    lastLogin: null
  }
];

let onlineUsers = [];
let chatMessages = [];

/* SIGNUP */
app.post("/signup", (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email)
    return res.json({ success: false });

  if (users.find(u => u.username === username))
    return res.json({ success: false, message: "Username taken" });

  const existingEmail = users.find(u => u.email === email);

  if (existingEmail && email !== "brooksm@carbonschools.org")
    return res.json({ success: false, message: "Email already used" });

  users.push({
    username,
    password,
    email,
    role: "user",
    banned: false,
    lastLogin: null
  });

  res.json({ success: true });
});

/* LOGIN */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);

  if (!user) return res.json({ success: false });

  if (user.banned)
    return res.json({ success: false, message: "Banned" });

  if (user.password !== password)
    return res.json({ success: false });

  if (username === "a") {
    user.role = "admin";
  }

  user.lastLogin = new Date().toISOString();

  req.session.user = {
    username: user.username,
    role: user.role
  };

  if (!onlineUsers.includes(user.username))
    onlineUsers.push(user.username);

  res.json({
    success: true,
    username: user.username,
    role: user.role
  });
});

/* LOGOUT */
app.post("/logout", (req, res) => {
  if (req.session.user) {
    onlineUsers = onlineUsers.filter(
      u => u !== req.session.user.username
    );
  }

  req.session.destroy(() => {
    res.json({ success: true });
  });
});

/* USERS LIST */
app.get("/users", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.json([]);

  res.json({
    users,
    online: onlineUsers.length
  });
});

/* BAN */
app.post("/ban", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.json({ success: false });

  const { username } = req.body;

  if (username === "a")
    return res.json({ success: false });

  const user = users.find(u => u.username === username);
  if (user) user.banned = true;

  onlineUsers = onlineUsers.filter(u => u !== username);

  res.json({ success: true });
});

/* UNBAN */
app.post("/unban", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.json({ success: false });

  const { username } = req.body;

  const user = users.find(u => u.username === username);
  if (user) user.banned = false;

  res.json({ success: true });
});

/* CHAT */
app.get("/chat", (req, res) => {
  res.json(chatMessages);
});

app.post("/chat", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  chatMessages.push({
    user: req.session.user.role === "admin"
      ? "Admin"
      : req.session.user.username,
    message: req.body.message
  });

  res.json({ success: true });
});

app.listen(10000, () =>
  console.log("SSP running on 10000")
);
