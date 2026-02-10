let signup = false;
let currentUser = null;
let currentRole = null;

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authBtn = document.getElementById("authBtn");
const switchMode = document.getElementById("switchMode");
const authTitle = document.getElementById("authTitle");
const authError = document.getElementById("authError");

// SWITCH MODE
switchMode.onclick = () => {
  signup = !signup;
  authTitle.textContent = signup ? "Sign Up" : "Login";
  authBtn.textContent = signup ? "Create Account" : "Login";
  emailInput.style.display = signup ? "block" : "none";
  switchMode.textContent = signup
    ? "Already have an account?"
    : "Create an account";
  authError.textContent = "";
};

// AUTH
authBtn.onclick = async () => {
  const body = {
    username: usernameInput.value,
    password: passwordInput.value
  };
  if (signup) body.email = emailInput.value;

  const res = await fetch("/api/" + (signup ? "signup" : "login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!data.success) {
    authError.textContent = data.message;
    return;
  }

  currentUser = data.username;
  currentRole = data.role;

  document.getElementById("authOverlay").style.display = "none";
  document.getElementById("siteContent").style.display = "block";

  if (currentRole === "admin") {
    createAdminPanel();
  }
};

// ===== ADMIN PANEL =====
function createAdminPanel() {
  const panel = document.createElement("div");
  panel.style.position = "fixed";
  panel.style.top = "10px";
  panel.style.right = "10px";
  panel.style.zIndex = "99999";
  panel.style.background = "#12001f";
  panel.style.border = "2px solid #9b59b6";
  panel.style.padding = "10px";
  panel.style.maxHeight = "80vh";
  panel.style.overflowY = "auto";

  panel.innerHTML = `
    <button id="loadUsers">Admin Panel</button>
    <div id="adminData"></div>
  `;

  document.body.appendChild(panel);

  document.getElementById("loadUsers").onclick = loadUsers;
}

async function loadUsers() {
  const res = await fetch("/api/admin/users");
  const users = await res.json();

  document.getElementById("adminData").innerHTML =
    users.map(u => `
      <div style="margin:6px 0;">
        <b>${u.username}</b>
        [${u.role}]
        ${u.banned ? "🚫" : "✅"}
        <button onclick="toggleBan('${u.username}', ${u.banned})">
          ${u.banned ? "Unban" : "Ban"}
        </button>
        <button onclick="toggleRole('${u.username}', '${u.role}')">
          ${u.role === "admin" ? "Demote" : "Make Admin"}
        </button>
      </div>
    `).join("");
}

async function toggleBan(username, banned) {
  await fetch("/api/admin/ban", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, banned: !banned })
  });
  loadUsers();
}

async function toggleRole(username, role) {
  await fetch("/api/admin/role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      role: role === "admin" ? "user" : "admin"
    })
  });
  loadUsers();
}
