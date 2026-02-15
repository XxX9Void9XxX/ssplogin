import express from "express";
import session from "express-session";
import cors from "cors";
import sqlite3 from "sqlite3";

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({
  secret: "ssp-secret",
  resave: false,
  saveUninitialized: false
}));

// SQLite database
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

  const adminUsername = "script.add.user";
  const adminPassword = "script=admin";

  db.get("SELECT * FROM users WHERE username=?", [adminUsername], (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO users (username,password,role) VALUES (?,?,?)",
        [adminUsername, adminPassword, "admin"]
      );
    }
  });
});

// ===== SIGNUP =====
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false });

  db.run(
    "INSERT INTO users (username,password) VALUES (?,?)",
    [username, password],
    err => res.json({ success: !err })
  );
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username=?", [username], (err, user) => {
    if (!user) return res.json({ success: false });
    if (user.banned) return res.json({ success: false, banned: true });
    if (user.password !== password) return res.json({ success: false });

    if (username === "script.add.user" && user.role !== "admin") {
      db.run("UPDATE users SET role='admin' WHERE username=?", [username]);
      user.role = "admin";
    }

    db.run("UPDATE users SET lastLogin=? WHERE username=?", [new Date().toISOString(), username]);
    res.json({ success: true, username, role: user.role });
  });
});

// ===== USERS LIST =====
app.get("/users", (req, res) => {
  db.all("SELECT username,role,banned,lastLogin FROM users", (err, rows) => {
    res.json({ users: rows });
  });
});

// ===== BAN / UNBAN =====
app.post("/ban", (req, res) => {
  const { username } = req.body;
  if (username === "script.add.user") return res.json({ success: false });
  db.run("UPDATE users SET banned=1 WHERE username=?", [username]);
  res.json({ success: true });
});
app.post("/unban", (req, res) => {
  const { username } = req.body;
  db.run("UPDATE users SET banned=0 WHERE username=?", [username]);
  res.json({ success: true });
});

// ===== EXPORT FOR VERCEL =====
export default app;
