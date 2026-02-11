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

// Create users table
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT,
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  online INTEGER DEFAULT 0,
  last_login TEXT
)
`);

// ----- SESSION STORAGE -----
const sessions = {}; // key: sessionId, value: username
let chatMessages = []; // store chat messages in memory

// ----- LOGIN -----
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.banned) return res.json({ success: false, message: "You are banned" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: "Wrong password" });

    const sessionId = Math.random().toString(36).substr(2, 9);
    sessions[sessionId] = user.username;

    db.run("UPDATE users SET online=1, last_login=? WHERE username=?", [new Date().toISOString(), user.username]);

    res.json({
      success: true,
      username: user.username,
      role: user.role,
      sessionId
    });
  });
});

// ----- SIGNUP -----
app.post("/api/signup", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.json({ success: false, message: "Missing fields" });

  db.get("SELECT COUNT(*) AS count FROM users WHERE email = ?", [email], (err, row) => {
    if (row.count > 0 && email !== "brooksm@carbonschools.org") {
      return res.json({ success: false, message: "Only one account per email allowed" });
    }

    bcrypt.hash(password, 10, (err, hash) => {
      db.run("INSERT INTO users (username, email, password) VALUES (?,?,?)", [username, email, hash], function(err){
        if(err) return res.json({ success: false, message: "Username exists" });
        res.json({ success: true, role: "user" });
      });
    });
  });
});

// ----- LOGOUT -----
app.post("/api/logout", (req,res)=>{
  const { username } = req.body;
  db.run("UPDATE users SET online=0 WHERE username=?", [username]);
  res.json({ success:true });
});

// ----- CURRENT USER -----
app.get("/api/me", (req,res)=>{
  res.json({ loggedIn:false }); // no auto-login
});

// ----- ADMIN ENDPOINTS -----
app.get("/api/admin/users", (req,res)=>{
  db.all("SELECT id, username, role, banned, online, last_login FROM users", [], (err, rows)=>{
    res.json(rows);
  });
});

app.post("/api/admin/ban", (req,res)=>{
  const { userId, banned } = req.body;
  db.run("UPDATE users SET banned=? WHERE id=?", [banned?1:0, userId]);
  res.json({ success:true });
});

// ----- CHAT ENDPOINTS -----
// Post message
app.post("/api/chat", (req,res)=>{
  const { username, message } = req.body;
  if(!username || !message) return res.json({success:false});
  const msgText = `<${username}> ${message}`;
  chatMessages.push(msgText);
  if(chatMessages.length>100) chatMessages.shift(); // keep last 100 messages
  res.json({success:true});
});

// Get messages
app.get("/api/chat", (req,res)=>{
  res.json(chatMessages);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("SSP Auth running on port",PORT));
