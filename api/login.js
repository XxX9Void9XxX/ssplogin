export default function handler(req, res) {
  const users = global.users;
  if (req.method !== "POST") return res.status(405).send({ success: false });
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.json({ success: false });
  if (user.banned) return res.json({ success: false, banned: true });
  if (user.password !== password) return res.json({ success: false });
  user.lastLogin = new Date().toISOString();
  res.json({ success: true, username, role: user.role });
}
