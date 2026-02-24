import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./database.sqlite");

export default function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const { username } = req.body;
  if(username==="script.add.user") return res.json({success:false});
  db.run("UPDATE users SET banned=1 WHERE username=?", [username], err=>{
    if(err) return res.json({success:false});
    res.json({success:true});
  });
}
