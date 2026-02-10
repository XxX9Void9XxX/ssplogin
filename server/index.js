import express from "express";
import bcrypt from "bcrypt";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const db = new sqlite3.Database("./users.db");

/* ---------- DATABASE ---------- */
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

/* 🔐 ONE-TIME ADMIN SETUP (DELETE AFTER USE)
db.run(
  "UPDATE users SET role = 'admin' WHERE username = 'YOUR_USERNAME'"
);
*/

/* ---------- SIGNUP ---------- */
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
        return res.json({ success: false, message: "Username exists" });
      res.json({ success: true });
    }
  );
});

/* ---------- LOGIN ---------- */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user)
        return res.json({ success: false, message: "User not found" });

      if (user.banned)
        return res.json({ success: false, message: "Account banned" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return res.json({ success: false, message: "Wrong password" });

      db.run(
        "UPDATE users SET last_login = ? WHERE id = ?",
        [Date.now(), user.id]
      );

      res.json({
        success: true,
        username: user.username,
        role: user.role
      });
    }
  );
});

/* ---------- ADMIN: LIST USERS ---------- */
app.get("/api/admin/users", (req, res) => {
  if (req.query.admin !== "true") return res.sendStatus(403);

  db.all(
    "SELECT id, username, role, banned, last_login FROM users",
    [],
    (err, rows) => res.json(rows)
  );
});

/* ---------- ADMIN: BAN / UNBAN ---------- */
app.post("/api/admin/ban", (req, res) => {
  const { admin, userId, banned } = req.body;
  if (!admin) return res.sendStatus(403);

  db.run(
    "UPDATE users SET banned = ? WHERE id = ?",
    [banned ? 1 : 0, userId],
    () => res.json({ success: true })
  );
});

/* ---------- START ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("SSP Auth running on port", PORT)
);
