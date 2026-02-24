let chatHistory = global.chatHistory || [];
global.chatHistory = chatHistory;

export default function handler(req, res) {
  if (req.method === "GET") return res.json({ history: chatHistory });
  if (req.method === "POST") {
    const { username, role, message } = req.body;
    if (!username || !message) return res.json({ success: false });
    const chatMessage = { username: role === "admin" ? "Admin" : username, message };
    chatHistory.push(chatMessage);
    if (chatHistory.length > 100) chatHistory.shift();
    return res.json({ success: true });
  }
  res.status(405).json({ success: false });
}
