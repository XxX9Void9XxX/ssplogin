import express from "express";
import session from "express-session";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true
}));

// ===== MEMORY STORAGE =====
let users = {};
let chatMessages = [];
let onlineUsers = {};
let coins = {};

// ===== DEFAULT ADMIN =====
users["a"] = { password: "a", isAdmin: true };
coins["a"] = 1000;

// Coins every minute
setInterval(() => {
    for (let u in users) {
        if (!coins[u]) coins[u] = 0;
        coins[u] += 10;
    }
}, 60000);

// ===== ROUTES =====
app.get("/", (req, res) => {
    if (!req.session.username) return res.sendFile(path.join(__dirname, "login.html"));
    res.sendFile(path.join(__dirname, "home.html"));
});

app.post("/signup", (req, res) => {
    const { username, password } = req.body;
    if (users[username]) return res.send("User exists");
    users[username] = { password, isAdmin: false };
    coins[username] = 500;
    req.session.username = username;
    res.redirect("/");
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!users[username] || users[username].password !== password) return res.send("Wrong login");
    req.session.username = username;
    res.redirect("/");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.get("/me", (req, res) => {
    if (!req.session.username) return res.json(null);
    res.json({
        username: req.session.username,
        isAdmin: users[req.session.username].isAdmin,
        coins: coins[req.session.username] || 0
    });
});

// ===== ADMIN BONUS =====
app.post("/admin/add500", (req, res) => {
    const username = req.session.username;
    if (!username || !users[username].isAdmin) return res.json({ error: "Not admin" });
    coins[username] += 500;
    res.json({ coins: coins[username] });
});

// ===== SOCKET =====
io.on("connection", (socket) => {
    socket.on("join", (username) => {
        onlineUsers[socket.id] = username;
        io.emit("online", Object.values(onlineUsers));
        socket.emit("chat-history", chatMessages);
    });

    socket.on("message", (msg) => {
        chatMessages.push(msg);
        io.emit("message", msg);
    });

    socket.on("disconnect", () => {
        delete onlineUsers[socket.id];
        io.emit("online", Object.values(onlineUsers));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
