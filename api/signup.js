// Initialize global users array and default admin
let users = global.users || [];
if (!users.find(u => u.username === "script.add.user")) {
  users.push({ username: "script.add.user", password: "script=admin", role: "admin", banned: false, lastLogin: null });
}
global.users = users;

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send({ success: false });

  const body = req.body;
  if (!body) return res.json({ success: false });

  const { username, password } = body;
  if (!username || !password) return res.json({ success: false });
  if (users.find(u => u.username === username)) return res.json({ success: false });

  users.push({ username, password, role: "user", banned: false, lastLogin: null });
  res.json({ success: true });
}
