const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const auth = require("./auth");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false
}));

// Home/Login Page
app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect("/dashboard");
    }

    res.send(`
        <h1>Login</h1>
        <form method="POST" action="/login">
            <input name="username" placeholder="Username" required /><br><br>
            <input type="password" name="password" placeholder="Password" required /><br><br>
            <button type="submit">Login</button>
        </form>
        <br>
        <a href="/register">Register</a>
        ${req.session.message ? `<p style="color:red">${req.session.message}</p>` : ""}
    `);

    req.session.message = null;
});

// Register Page
app.get("/register", (req, res) => {
    res.send(`
        <h1>Register</h1>
        <form method="POST" action="/register">
            <input name="username" placeholder="Username" required /><br><br>
            <input type="password" name="password" placeholder="Password" required /><br><br>
            <button type="submit">Register</button>
        </form>
        <br>
        <a href="/">Back to Login</a>
    `);
});

// Register Logic
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if (auth.users.find(u => u.username === username)) {
        req.session.message = "User already exists";
        return res.redirect("/");
    }

    const hashed = await bcrypt.hash(password, 10);

    auth.users.push({
        username,
        password: hashed,
        banned: false,
        admin: false
    });

    req.session.message = "Registered! Please login.";
    res.redirect("/");
});

// Login Logic
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = auth.users.find(u => u.username === username);

    if (!user) {
        req.session.message = "Login Failed";
        return res.redirect("/");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        req.session.message = "Login Failed";
        return res.redirect("/");
    }

    if (user.banned) {
        req.session.message = "You Have Been Banned";
        return res.redirect("/");
    }

    req.session.user = user;
    res.redirect("/dashboard");
});

// Dashboard
app.get("/dashboard", (req, res) => {
    if (!req.session.user) return res.redirect("/");

    res.send(`
        <h1>Welcome ${req.session.user.username}</h1>
        ${req.session.user.admin ? `<a href="/admin">Admin Panel</a><br><br>` : ""}
        <a href="/logout">Logout</a>
    `);
});

// Admin Panel
app.get("/admin", (req, res) => {
    if (!req.session.user || !req.session.user.admin) {
        return res.redirect("/");
    }

    const userList = auth.users.map(u => `
        <p>
            ${u.username} - 
            ${u.banned ? "BANNED" : "ACTIVE"}
            <form method="POST" action="/toggle-ban" style="display:inline;">
                <input type="hidden" name="username" value="${u.username}">
                <button type="submit">
                    ${u.banned ? "Unban" : "Ban"}
                </button>
            </form>
        </p>
    `).join("");

    res.send(`
        <h1>Admin Panel</h1>
        ${userList}
        <br>
        <a href="/dashboard">Back</a>
    `);
});

// Toggle Ban
app.post("/toggle-ban", (req, res) => {
    if (!req.session.user || !req.session.user.admin) {
        return res.redirect("/");
    }

    const user = auth.users.find(u => u.username === req.body.username);

    if (user) {
        user.banned = !user.banned;
    }

    res.redirect("/admin");
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// IMPORTANT FOR RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
