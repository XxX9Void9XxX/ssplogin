let currentUser = null;
let socket = null;
let onlineList = [];
let coinInterval = null;
let lastMessageTime = 0;
let lastMessageContent = "";

// ====================== SIGNUP ======================
function signup() {
  fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value,
      email: "x"
    })
  })
    .then(r => r.json())
    .then(d => alert(d.success ? "Created" : "Error"));
}

// ====================== LOGIN ======================
function login() {
  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username.value, password: password.value })
  })
    .then(r => r.json())
    .then(d => {
      if (!d.success) {
        if (d.banned) {
          banMsg.textContent = "You have been banned";
        } else alert("Login failed");
        return;
      }

      currentUser = d;
      authBox.style.display = "none";
      mainFrame.style.display = "block";
      chatBox.style.display = "block";
      coinBox.style.display = "block";

      // Admin detection
      const isAdmin = currentUser.username === "script.add.user" && currentUser.role === "admin";
      if (isAdmin) {
        adminBtn.style.display = "block";
        addCoinsBtn.style.display = "block";
      }

      startCoins();
      connectSocket();
    });
}

// ====================== COINS ======================
function startCoins() {
  const coinKey = "coins_" + currentUser.username;
  let coins = parseInt(localStorage.getItem(coinKey)) || 0;

  function update() {
    coinCount.innerText = coins;
    localStorage.setItem(coinKey, coins);
  }

  update();

  // +25 coins per minute
  coinInterval = setInterval(() => {
    coins += 25;
    update();
  }, 60000);

  // Admin +100 button
  addCoinsBtn.onclick = () => {
    coins += 100;
    update();
  };
}

// ====================== SHOP ======================
let inventory = {};
function updateInventory() {
  const invDiv = document.getElementById("inventory");
  invDiv.innerHTML = "<b>Your Cards:</b><br>";
  for (let card in inventory) {
    invDiv.innerHTML += `${card} x${inventory[card]}<br>`;
  }
}

function buyPack() {
  const coinKey = "coins_" + currentUser.username;
  let coins = parseInt(localStorage.getItem(coinKey)) || 0;
  if (coins < 100) return alert("Not enough coins");
  coins -= 100;
  localStorage.setItem(coinKey, coins);
  coinCount.innerText = coins;

  // Random card
  const cards = ["Black Lotus", "Sire of Seven Deaths", "Platinum Angel", "The One Ring", "Mindslaver"];
  const card = cards[Math.floor(Math.random() * cards.length)];
  if (!inventory[card]) inventory[card] = 0;
  inventory[card]++;
  updateInventory();
}

// Shop toggle
shopBtn.onclick = () => {
  shopPanel.style.display = shopPanel.style.display === "none" ? "block" : "none";
};

// ====================== CHAT ======================
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
      if (now - lastMessageTime < 15000) return alert("Wait 15 seconds between messages");
      if (chatInput.value === lastMessageContent && now - lastMessageTime < 30000)
        return alert("Wait 30 seconds before sending the same message");

      socket.send(
        JSON.stringify({
          type: "chat",
          username: currentUser.username,
          role: currentUser.role,
          message: chatInput.value
        })
      );
      lastMessageTime = now;
      lastMessageContent = chatInput.value;
      chatInput.value = "";
    }
  });
}

// ====================== CHAT HELPERS ======================
function addMessage(user, msg) {
  chatMessages.innerHTML += `<div>&lt;${user}&gt; ${msg}</div>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ====================== ADMIN PANEL ======================
function toggleAdmin() {
  adminPanel.style.display = adminPanel.style.display === "none" ? "block" : "none";
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

        const isAdmin = currentUser.username === "script.add.user" && currentUser.role === "admin";
        if (isAdmin && u.username !== "script.add.user") {
          const btn = document.createElement("button");
          btn.innerText = u.banned ? "Unban" : "Ban";
          btn.onclick = () => {
            fetch("/" + (u.banned ? "unban" : "ban"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: u.username })
            }).then(() => setTimeout(loadUsers, 100));
          };
          div.appendChild(btn);
        }

        usersList.appendChild(div);
      });
    });
}
