const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");
const authBox = document.getElementById("authBox");
const app = document.getElementById("app");
const msg = document.getElementById("msg");
const msg2 = document.getElementById("msg2");

function showSignup(){ loginPanel.style.display="none"; signupPanel.style.display="block"; }
function showLogin(){ signupPanel.style.display="none"; loginPanel.style.display="block"; }
function enterApp(){ authBox.style.display="none"; app.style.display="block"; }

/* ---------- CHECK SESSION ---------- */
let currentUser={};
async function checkSession(){
  const res = await fetch("/api/me");
  const data = await res.json();
  if(data.loggedIn){
    currentUser = data;
    enterApp();
    if(currentUser.role==="admin") initAdminOverlay();
  }
}
checkSession();

/* ---------- LOGIN ---------- */
async function login(){
  const res = await fetch("/api/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username:loginUser.value,password:loginPass.value})
  });
  const data = await res.json();
  msg.textContent = data.message||"";
  if(data.success){
    currentUser = data;
    enterApp();
    if(currentUser.role==="admin") initAdminOverlay();
  }
}

/* ---------- SIGNUP ---------- */
async function signup(){
  const res = await fetch("/api/signup",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username:suUser.value,email:suEmail.value,password:suPass.value})
  });
  const data = await res.json();
  msg2.textContent = data.message||"Account created!";
  if(data.role==="admin") initAdminOverlay();
}

/* ---------- ADMIN OVERLAY ---------- */
function initAdminOverlay(){
  const btn = document.createElement("button");
  btn.textContent = "Admin";
  btn.style.position="fixed";
  btn.style.bottom="10px";
  btn.style.left="10px";
  btn.style.zIndex="9999";
  btn.style.padding="6px 10px";
  btn.style.background="#8e44ad";
  btn.style.color="#fff";
  btn.style.borderRadius="4px";
  btn.style.cursor="pointer";
  document.body.appendChild(btn);

  const panel = document.createElement("div");
  panel.style.position="fixed";
  panel.style.bottom="50px";
  panel.style.left="10px";
  panel.style.width="320px";
  panel.style.maxHeight="400px";
  panel.style.background="rgba(0,0,0,0.95)";
  panel.style.color="#fff";
  panel.style.overflowY="auto";
  panel.style.padding="10px";
  panel.style.border="2px solid #9b59b6";
  panel.style.borderRadius="10px";
  panel.style.display="none";
  panel.style.zIndex="9999";
  document.body.appendChild(panel);

  btn.onclick = async ()=>{
    panel.style.display = panel.style.display==="none"?"block":"none";
    if(panel.style.display==="block"){
      const res = await fetch("/api/admin/users");
      const users = await res.json();
      panel.innerHTML = "<h3>Users</h3>";
      users.forEach(u=>{
        const last = u.last_login ? new Date(u.last_login).toLocaleString() : "Never";
        const line = document.createElement("div");
        line.style.display="flex";
        line.style.justifyContent="space-between";
        line.style.alignItems="center";
        line.style.marginBottom="4px";
        line.innerHTML = `<span>${u.username} (${u.role}) - Last: ${last}</span>`;
        if(u.role!=="admin"){
          const banBtn = document.createElement("button");
          banBtn.textContent = u.banned?"Unban":"Ban";
          banBtn.style.marginLeft="5px";
          banBtn.onclick = async ()=>{
            await fetch("/api/admin/ban",{
              method:"POST",
              headers:{"Content-Type":"application/json"},
              body:JSON.stringify({userId:u.id,banned:!u.banned})
            });
            u.banned = !u.banned;
            banBtn.textContent = u.banned?"Unban":"Ban";
          };
          line.appendChild(banBtn);
        }
        panel.appendChild(line);
      });
    }
  };
}
