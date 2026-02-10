let signup = false;

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authBtn = document.getElementById("authBtn");
const switchMode = document.getElementById("switchMode");
const authTitle = document.getElementById("authTitle");
const authError = document.getElementById("authError");

switchMode.onclick = () => {
  signup = !signup;
  authTitle.textContent = signup ? "Sign Up" : "Login";
  authBtn.textContent = signup ? "Create Account" : "Login";
  emailInput.style.display = signup ? "block" : "none";
  switchMode.textContent = signup ? "Already have an account?" : "Create an account";
  authError.textContent = "";
};

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
  } else {
    document.getElementById("authOverlay").style.display = "none";
    document.getElementById("siteContent").style.display = "block";
  }
};
