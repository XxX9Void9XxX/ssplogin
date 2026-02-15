import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== SIGNUP =====
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if(!username||!password) return res.json({success:false});
  const { error } = await supabase.from("users").insert({username,password,role:"user",banned:false});
  res.json({success:!error});
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase.from("users").select("*").eq("username", username).single();
  if(!user || error) return res.json({success:false});
  if(user.banned) return res.json({success:false,banned:true});
  if(user.password!==password) return res.json({success:false});
  res.json({success:true,username:user.username,role:user.role});
});

// ===== USERS LIST =====
app.get("/users", async (req,res)=>{
  const { data, error } = await supabase.from("users").select("username,role,banned");
  res.json({users:data});
});

// ===== BAN / UNBAN =====
app.post("/ban", async (req,res)=>{
  const { username } = req.body;
  if(username==="script.add.user") return res.json({success:false});
  await supabase.from("users").update({banned:true}).eq("username",username);
  res.json({success:true});
});
app.post("/unban", async (req,res)=>{
  const { username } = req.body;
  await supabase.from("users").update({banned:false}).eq("username",username);
  res.json({success:true});
});

export default app;
