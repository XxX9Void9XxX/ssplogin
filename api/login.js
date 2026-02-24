import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./database.sqlite");

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username=?", [username], (err, user) => {
    if (!user) return res.json({ success: false });
    if (user.banned) return res.json({ success: false, banned: true });
    if (user.password !== password) return res.json({ success: false });
    res.json({ success: true, username: user.username, role: user.role, coins: user.coins });
  });
}
