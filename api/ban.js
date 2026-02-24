export default function handler(req, res) {
  const users = global.users;
  const { username } = req.body;
  if (username === "script.add.user") return res.json({ success: false });
  const user = users.find(u => u.username === username);
  if (user) user.banned = true;
  res.json({ success: true });
}
