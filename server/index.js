import express from "express";
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
app.use(express.static(path.join(__dirname, "../public")));

const db = new sqlite3.Database("./users.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      coins INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      card TEXT,
      count INTEGER DEFAULT 0
    )
  `);

  db.get("SELECT * FROM users WHERE username='a'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username,password,role,coins) VALUES ('a','a','admin',0)");
    }
  });
});

let onlineUsers = new Set();

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username=?", [username], (err, user) => {
    if (!user || user.password !== password)
      return res.json({ success: false });

    onlineUsers.add(username);

    res.json({
      success: true,
      username,
      role: user.role,
      coins: user.coins
    });
  });
});

/* ===== COIN TICK ===== */
setInterval(() => {
  onlineUsers.forEach(user => {
    db.run("UPDATE users SET coins = coins + 10 WHERE username=?", [user]);
  });
}, 60000);

/* ===== GET USER DATA ===== */
app.get("/userdata/:username", (req, res) => {
  const user = req.params.username;

  db.get("SELECT coins FROM users WHERE username=?", [user], (err, row) => {
    db.all("SELECT card,count FROM cards WHERE username=?", [user], (err2, cards) => {
      res.json({
        coins: row?.coins || 0,
        cards: cards || []
      });
    });
  });
});

/* ===== OPEN PACK ===== */
app.post("/openpack", (req, res) => {
  const { username, card } = req.body;

  db.get("SELECT coins FROM users WHERE username=?", [username], (err, row) => {
    if (!row || row.coins < 100)
      return res.json({ success: false });

    db.run("UPDATE users SET coins = coins - 100 WHERE username=?", [username]);

    db.get(
      "SELECT * FROM cards WHERE username=? AND card=?",
      [username, card],
      (err2, existing) => {
        if (existing) {
          db.run(
            "UPDATE cards SET count = count + 1 WHERE username=? AND card=?",
            [username, card]
          );
        } else {
          db.run(
            "INSERT INTO cards (username,card,count) VALUES (?,?,1)",
            [username, card]
          );
        }
      }
    );

    res.json({ success: true });
  });
});

/* ===== ADMIN BONUS ===== */
app.post("/adminbonus", (req, res) => {
  const { username } = req.body;

  db.get("SELECT role FROM users WHERE username=?", [username], (err, row) => {
    if (row?.role !== "admin")
      return res.json({ success: false });

    db.run("UPDATE users SET coins = coins + 500 WHERE username=?", [username]);
    res.json({ success: true });
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () =>
  console.log("MTG COIN SYSTEM RUNNING")
);
