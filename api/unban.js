import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./database.sqlite");

export default function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const { username } = req.body;
  db.run("UPDATE users SET banned=0 WHERE username=?", [username], err=>{
    if(err) return res.json({success:false});
    res.json({success:true});
  });
}
