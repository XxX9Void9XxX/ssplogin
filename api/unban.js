export default function handler(req, res) {
  const users = global.users;
  const { username } = req.body;
  const user = users.find(u => u.username === username);
  if (user) user.banned = false;
  res.json({ success: true });
}
