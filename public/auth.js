async function login() {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user.value,
      password: pass.value
    })
  });

  const data = await res.json();
  msg.textContent = data.message || "";

  if (data.success) {
    localStorage.setItem("role", data.role);
    window.location.href = "/success.html";
  }
}

async function signup() {
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: su_user.value,
      email: su_email.value,
      password: su_pass.value
    })
  });

  const data = await res.json();
  msg.textContent = data.message || "Account created";
}
