const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static("public"));

let users = [];
let bannedUsers = [];
let onlineUsers = new Set();

/* Permanent Admin */
const ADMIN_USER = "script.add.user";
const ADMIN_PASS = "script=admin";

/* Login */
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (bannedUsers.includes(username)) {
        return res.json({ success: false, message: "You are banned." });
    }

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        let admin = users.find(u => u.username === ADMIN_USER);
        if (!admin) {
            admin = {
                username: ADMIN_USER,
                password: ADMIN_PASS,
                coins: 1000,
                inventory: {},
                isAdmin: true
            };
            users.push(admin);
        }
        return res.json({ success: true, user: admin });
    }

    let user = users.find(u => u.username === username);

    if (!user) {
        user = {
            username,
            password,
            coins: 200,
            inventory: {},
            isAdmin: false
        };
        users.push(user);
    }

    if (user.password !== password) {
        return res.json({ success: false, message: "Wrong password." });
    }

    res.json({ success: true, user });
});

/* Add Coins (Admin Only) */
app.post("/add-coins", (req, res) => {
    const { admin, target } = req.body;

    const adminUser = users.find(u => u.username === admin);
    if (!adminUser || !adminUser.isAdmin) {
        return res.json({ success: false });
    }

    const targetUser = users.find(u => u.username === target);
    if (!targetUser) return res.json({ success: false });

    targetUser.coins += 100;
    res.json({ success: true, coins: targetUser.coins });
});

/* Buy Pack */
app.post("/buy-pack", (req, res) => {
    const { username } = req.body;
    const user = users.find(u => u.username === username);

    if (!user || user.coins < 100) {
        return res.json({ success: false });
    }

    user.coins -= 100;

    const cards = [
        "Black Lotus",
        "Time Walk",
        "Platinum Angel",
        "The One Ring",
        "Mindslaver"
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];

    if (!user.inventory[card]) user.inventory[card] = 0;
    user.inventory[card]++;

    res.json({
        success: true,
        card,
        coins: user.coins,
        inventory: user.inventory
    });
});

/* Ban */
app.post("/ban", (req, res) => {
    const { admin, target } = req.body;
    const adminUser = users.find(u => u.username === admin);
    if (!adminUser || !adminUser.isAdmin) return res.json({ success: false });

    bannedUsers.push(target);
    res.json({ success: true });
});

/* WebSocket */
wss.on("connection", ws => {
    ws.on("message", msg => {
        const data = JSON.parse(msg);

        if (data.type === "join") {
            onlineUsers.add(data.username);
        }

        if (data.type === "chat") {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "chat",
                        username: data.username,
                        message: data.message
                    }));
                }
            });
        }

        if (data.type === "getOnline") {
            ws.send(JSON.stringify({
                type: "online",
                users: Array.from(onlineUsers)
            }));
        }
    });

    ws.on("close", () => {});
});

server.listen(3000, () => console.log("Server running"));
