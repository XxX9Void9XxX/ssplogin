import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./database.sqlite");

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  db.all("SELECT username, role, banned, coins FROM users", (err, rows) => {
    res.json({ users: rows });
  });
}
