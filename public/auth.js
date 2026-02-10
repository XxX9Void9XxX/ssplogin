function showSignup() {
  loginPanel.style.display = "none";
  signupPanel.style.display = "block";
}

function showLogin() {
  signupPanel.style.display = "none";
  loginPanel.style.display = "block";
}

function enterApp(role) {
  localStorage.setItem("role", role);

  authBox.style.display = "none";
  app.style.display = "block";
}

/* LOGIN */
async function login() {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: loginUser.value,
      password: loginPass.value
    })
  });

  const data = await res.json();
  msg.textContent = data.message || "";

  if (data.success) {
    enterApp(data.role);
  }
}

/* SIGNUP */
async function signup() {
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: suUser.value,
      email: suEmail.value,
      password: suPass.value
    })
  });

  const data = await res.json();
  msg2.textContent = data.message || "Account created!";
}

/* AUTO-LOGIN (optional) */
if (localStorage.getItem("role")) {
  enterApp(localStorage.getItem("role"));
}
