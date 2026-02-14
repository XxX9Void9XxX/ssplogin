let currentUser = null;
let socket = null;
let onlineList = [];
let coinInterval = null;

/* ======================
   SIGNUP
====================== */
function signup() {
  fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: loginUser.value,
      password: loginPass.value,
      email: "x"
    })
  })
    .then(r => r.json())
    .then(d => alert(d.success ? "Created" : "Error"));
}

/* ======================
   LOGIN
====================== */
function login() {
  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: loginUser.value,
      password: loginPass.value
    })
  })
    .then(r => r.json())
    .then(d => {
      if (!d.success) {
        if (d.banned) alert("You have been banned");
        else alert("Login failed");
        return;
      }

      currentUser = d;

      // Hide auth box, show main iframe + chat + coins
      authBox.style.display = "none";
      mainFrame.style.display = "block";
      chatBox.style.display = "block";
      coinBox.style.display = "block";

      // Admin detection
      const isAdmin =
        (d.role && d.role.toLowerCase() === "admin") ||
        d.username === "script.add.user";

      if (isAdmin) {
        adminBtn.style.display = "block";
        adminCoinsBtn.style.display = "inline-block";
      }

      // Load iframe with fullscreen capability
      loadIframe();

      // Start coins
      startCoins();

      // Connect chat
      connectSocket();
    });
}

/* ======================
   IFRAME FULLSCREEN HOME
====================== */
function loadIframe() {
  const iframe = document.getElementById("mainFrame");
  iframe.src = "https://sspv2play.neocities.org/home";
}

/* ======================
   COIN SYSTEM
====================== */
function startCoins() {
  const coinKey = "coins_" + currentUser.username;
  let coins = parseInt(localStorage.getItem(coinKey)) || 0;

  function update() {
    coinCount.innerText = coins;
    localStorage.setItem(coinKey, coins);
  }
  update();

  coinInterval = setInterval(() => {
    coins += 25;
    update();
  }, 60000);

  // Admin +100 coins
  adminCoinsBtn.onclick = () => {
    coins += 100;
    update();
  };
}

/* ======================
   CHAT
====================== */
let lastMessage = "";
let lastSent = 0;
function connectSocket() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "join", username: currentUser.username }));
  };

  socket.onmessage = e => {
    const data = JSON.parse(e.data);

    if (data.type === "chatHistory") {
      chatMessages.innerHTML = "";
      data.history.forEach(msg => addMessage(msg.username, msg.message));
    }

    if (data.type === "chat") addMessage(data.username, data.message);
    if (data.type === "onlineUpdate") {
      onlineList = data.online;
      updateOnlineUI();
    }
    if (data.type === "banned") {
      alert("You were banned");
      location.reload();
    }
  };

  chatInput.addEventListener("keypress", e => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
      const now = Date.now();
      if (now - lastSent < 15000) {
        alert("Wait 15 seconds before sending another message");
        return;
      }
      if (chatInput.value === lastMessage && now - lastSent < 30000) {
        alert("Wait 30 seconds before sending the same message");
        return;
      }

      socket.send(JSON.stringify({
        type: "chat",
        username: currentUser.username,
        role: currentUser.role,
        message: chatInput.value
      }));

      lastMessage = chatInput.value;
      lastSent = now;
      chatInput.value = "";
    }
  });
}

function addMessage(user, msg) {
  chatMessages.innerHTML += `<div>&lt;${user}&gt; ${msg}</div>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ======================
   ADMIN PANEL
====================== */
function toggleAdmin() {
  adminPanel.style.display =
    adminPanel.style.display === "none" ? "block" : "none";
  loadUsers();
}

function updateOnlineUI() {
  onlineCount.innerText = "Online: " + onlineList.length;
  loadUsers();
}

function loadUsers() {
  fetch("/users")
    .then(r => r.json())
    .then(d => {
      usersList.innerHTML = "";

      d.users.forEach(u => {
        const div = document.createElement("div");
        const onlineMark = onlineList.includes(u.username) ? "🟢" : "⚫";
        div.innerHTML = `${onlineMark} ${u.username} (${u.role})`;

        const isAdmin =
          (currentUser.role && currentUser.role.toLowerCase() === "admin") ||
          currentUser.username === "script.add.user";

        if (isAdmin && u.username !== "script.add.user") {
          const btn = document.createElement("button");
          btn.innerText = u.banned ? "Unban" : "Ban";
          btn.onclick = () => {
            fetch("/" + (u.banned ? "unban" : "ban"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: u.username })
            }).then(() => loadUsers());
          };
          div.appendChild(btn);
        }

        usersList.appendChild(div);
      });
    });
}
