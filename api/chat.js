import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./database.sqlite");

export default function handler(req, res) {
  if (req.method === "GET") {
    db.all("SELECT username,message,timestamp FROM chat ORDER BY id ASC LIMIT 100", (err, rows) => {
      res.json({ history: rows });
    });
  } else if (req.method === "POST") {
    const { username, message } = req.body;
    const timestamp = new Date().toISOString();
    db.run("INSERT INTO chat (username,message,timestamp) VALUES (?,?,?)", [username,message,timestamp], function(err){
      if(err) return res.json({success:false});
      res.json({success:true});
    });
  } else {
    res.status(405).json({error:"Method not allowed"});
  }
}
