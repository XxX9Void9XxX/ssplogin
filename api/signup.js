import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./database.sqlite");

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false });

  db.run("INSERT INTO users (username,password) VALUES (?,?)", [username, password], function(err) {
    if (err) return res.json({ success: false, error: "Username exists" });
    res.json({ success: true });
  });
}
