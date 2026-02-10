import express from "express";
import bcrypt from "bcrypt";
import sqlite3 from "sqlite3";

const app = express();
app.use(express.json());

// ✅ FIXED STATIC SERVING (Render-safe)
app.use(express.static("public"));

const db = new sqlite3.Database("./users.db");

// ✅ CREATE TABLE
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT
)
`);

// ✅ SIGN UP
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.json({ success: false, message: "Missing fields" });
  }

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, email, password) VALUES (?,?,?)",
    [username, email, hash],
    err => {
      if (err) {
        return res.json({ success: false, message: "Username already exists" });
      }
      res.json({ success: true });
    }
  );
});

// ✅ LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.json({ success: false, message: "Wrong password" });
      }

      res.json({ success: true });
    }
  );
});

// ✅ FORCE INDEX.HTML
app.get("*", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SSP Auth running on port", PORT);
});
