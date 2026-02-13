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
let cardsOwned = {};

// ===== DEFAULT ADMIN =====
users["a"] = { password: "a", coins: 1000, isAdmin: true };
cardsOwned["a"] = {};

// ===== CARD LIST =====
const cards = [
"https://sspv2play.neocities.org/mtg/vma-4-black-lotus.jpg",
"https://sspv2play.neocities.org/mtg/fdn-1-sire-of-seven-deaths.jpg",
"https://sspv2play.neocities.org/mtg/cn2-214-platinum-angel.jpg",
"https://sspv2play.neocities.org/mtg/ltr-246-the-one-ring.jpg",
"https://sspv2play.neocities.org/mtg/som-176-mindslaver.jpg",
"https://sspv2play.neocities.org/mtg/baby-doddin-the-consuming-monstrosity.jpg",
"https://sspv2play.neocities.org/mtg/orange-master-of-the-elements.jpg",
"https://sspv2play.neocities.org/mtg/vma-2-time-walk.jpg",
"https://sspv2play.neocities.org/mtg/c19-51-volrath-the-shapestealer.jpg"
];

// Coins every minute
setInterval(() => {
    for (let u in users) {
        users[u].coins += 10;
    }
}, 60000);

// ===== ROUTES =====
app.get("/", (req, res) => {
    if (!req.session.username) {
        return res.sendFile(path.join(__dirname, "login.html"));
    }
    res.sendFile(path.join(__dirname, "home.html"));
});

app.post("/signup", (req, res) => {
    const { username, password } = req.body;
    if (users[username]) return res.send("User exists");

    users[username] = { password, coins: 500, isAdmin: false };
    cardsOwned[username] = {};
    req.session.username = username;
    res.redirect("/");
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!users[username] || users[username].password !== password)
        return res.send("Wrong login");

    req.session.username = username;
    res.redirect("/");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.get("/me", (req, res) => {
    if (!req.session.username) return res.json(null);
    const u = users[req.session.username];
    res.json({
        username: req.session.username,
        coins: u.coins,
        isAdmin: u.isAdmin,
        cards: cardsOwned[req.session.username]
    });
});

app.post("/open-pack", (req, res) => {
    const username = req.session.username;
    if (!username) return res.json({ error: "Not logged in" });

    if (users[username].coins < 100)
        return res.json({ error: "Not enough coins" });

    users[username].coins -= 100;

    const pull = cards[Math.floor(Math.random() * cards.length)];

    if (!cardsOwned[username][pull])
        cardsOwned[username][pull] = 0;

    cardsOwned[username][pull]++;

    res.json({
        card: pull,
        coins: users[username].coins,
        cards: cardsOwned[username]
    });
});

app.post("/admin/add500", (req, res) => {
    const username = req.session.username;
    if (!username || !users[username].isAdmin)
        return res.json({ error: "Not admin" });

    users[username].coins += 500;
    res.json({ coins: users[username].coins });
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
