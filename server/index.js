import express from "express";
import session from "express-session";
import cors from "cors";
import sqlite3 from "sqlite3";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

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

/* ================= DATABASE ================= */

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      role TEXT DEFAULT 'user',
      banned INTEGER DEFAULT 0,
      lastLogin TEXT
    )
  `);
});

/* ================= EMAIL SETUP ================= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

let emailVerifications = new Map();

/* ================= SEND VERIFICATION ================= */

app.post("/send-verification", (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email)
    return res.json({ success: false });

  db.get("SELECT * FROM users WHERE username=?", [username], (err, row) => {
    if (row) return res.json({ success: false, error: "Username taken" });

    const code = Math.floor(100000 + Math.random() * 900000);

    emailVerifications.set(email, { code, username, password });

    transporter.sendMail({
      from: `"SSP Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your SSP Verification Code",
      text: `Your verification code is: ${code}`
    }, (err) => {
      if (err) return res.json({ success: false, error: "Email failed" });
      res.json({ success: true });
    });
  });
});

/* ================= VERIFY CODE ================= */

app.post("/verify-code", (req, res) => {
  const { email, code } = req.body;

  const record = emailVerifications.get(email);
  if (!record) return res.json({ success: false });

  if (record.code.toString() !== code.toString())
    return res.json({ success: false, error: "Wrong code" });

  db.run(
    "INSERT INTO users (username,password,email) VALUES (?,?,?)",
    [record.username, record.password, email],
    err => {
      if (err) return res.json({ success: false });

      emailVerifications.delete(email);
      res.json({ success: true });
    }
  );
});

/* ================= LOGIN ================= */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username=?", [username], (err, user) => {
    if (!user) return res.json({ success: false });
    if (user.banned) return res.json({ success: false, banned: true });
    if (user.password !== password) return res.json({ success: false });

    res.json({
      success: true,
      username,
      role: user.role
    });
  });
});

/* ================= SERVE FRONTEND ================= */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Server running on port", PORT));
