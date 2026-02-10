import express from "express";
import bcrypt from "bcrypt";
import sqlite3 from "sqlite3";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

/* ---------- SESSIONS ---------- */
app.use(session({
  secret: 'SUPER_SECRET_KEY_CHANGE_THIS',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 days
}));

/* ---------- DATABASE ---------- */
const dbPath = path.join(__dirname, "users.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    process.exit(1);
  } else {
    console.log("Database opened at", dbPath);
  }
});

/* ---------- CREATE TABLE ---------- */
db.serialize(() => {
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
  `, (err) => {
    if (err) {
      console.error("Table creation failed:", err.message);
      process.exit(1);
    }
    console.log("Table 'users' ready.");

    // Make initial admin safely (only if user exists)
    db.run(
      "UPDATE users SET role = 'admin' WHERE username = ?",
      ["admin"],
      (err2) => {
        if(err2) console.error("Initial admin setup failed:", err2.message);
        else console.log("Initial admin setup done (if user exists).");
      }
    );
  });
});

/* ---------- SIGNUP ---------- */
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.json({ success: false, message: "Missing fields" });

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, email, password) VALUES (?,?,?)",
    [username, email, hash],
    (err) => {
      if (err) return res.json({ success: false, message: "Username exists" });
      res.json({ success: true });
    }
  );
});

/* ---------- LOGIN ---------- */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.banned) return res.json({ success: false, message: "Account banned" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: "Wrong password" });

    req.session.userId = user.id;
    req.session.role = user.role;

    db.run("UPDATE users SET last_login = ? WHERE id = ?", [Date.now(), user.id]);
    res.json({ success: true, username: user.username, role: user.role });
  });
});

/* ---------- CURRENT USER ---------- */
app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });

  db.get("SELECT username, role FROM users WHERE id = ?", [req.session.userId], (err, user) => {
    if (!user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, username: user.username, role: user.role });
  });
});

/* ---------- LOGOUT ---------- */
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

/* ---------- ADMIN: LIST USERS ---------- */
app.get("/api/admin/users", (req, res) => {
  if (!req.session.role || req.session.role !== 'admin') return res.sendStatus(403);

  db.all("SELECT id, username, role, banned, last_login FROM users", [], (err, rows) => {
    res.json(rows);
  });
});

/* ---------- ADMIN: BAN / UNBAN ---------- */
app.post("/api/admin/ban", (req, res) => {
  if (!req.session.role || req.session.role !== 'admin') return res.sendStatus(403);

  const { userId, banned } = req.body;
  db.run("UPDATE users SET banned = ? WHERE id = ?", [banned ? 1 : 0, userId], () => res.json({ success: true }));
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("SSP Auth running on port", PORT));
