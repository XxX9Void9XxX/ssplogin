export default function handler(req, res) {
  const users = global.users;
  res.json({ users, onlineCount: users.length });
}
