import express from "express";
import bcrypt from "bcrypt";
import sqlite3 from "sqlite3";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./users.db");

// ===== DATABASE =====
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT,
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  last_login INTEGER
)
`);

// ===== SIGN UP =====
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.json({ success: false, message: "Missing fields" });

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, email, password) VALUES (?,?,?)",
    [username, email, hash],
    err => {
      if (err)
        return res.json({ success: false, message: "Username already exists" });
      res.json({ success: true });
    }
  );
});

// ===== LOGIN =====
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user)
        return res.json({ success: false, message: "User not found" });

      if (user.banned)
        return res.json({ success: false, message: "You are banned" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return res.json({ success: false, message: "Wrong password" });

      db.run(
        "UPDATE users SET last_login = ? WHERE id = ?",
        [Date.now(), user.id]
      );

      res.json({
        success: true,
        role: user.role,
        username: user.username
      });
    }
  );
});

// ===== ADMIN: GET USERS =====
app.get("/api/admin/users", (req, res) => {
  db.all(
    "SELECT username, role, banned, last_login FROM users",
    [],
    (err, rows) => res.json(rows)
  );
});

// ===== ADMIN: BAN / UNBAN =====
app.post("/api/admin/ban", (req, res) => {
  const { username, banned } = req.body;
  db.run(
    "UPDATE users SET banned = ? WHERE username = ?",
    [banned ? 1 : 0, username],
    () => res.json({ success: true })
  );
});

// ===== ADMIN: PROMOTE / DEMOTE =====
app.post("/api/admin/role", (req, res) => {
  const { username, role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return res.json({ success: false });
  }

  db.run(
    "UPDATE users SET role = ? WHERE username = ?",
    [role, username],
    () => res.json({ success: true })
  );
});

// ===== FALLBACK =====
app.get("*", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("SSP Auth running on port", PORT)
);
