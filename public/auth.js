const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");
const authBox = document.getElementById("authBox");
const app = document.getElementById("app");
const msg = document.getElementById("msg");
const msg2 = document.getElementById("msg2");
const contentFrame = document.getElementById("contentFrame");

let currentUser = {};

/* ---------- SWITCH PANELS ---------- */
function showSignup(){ loginPanel.style.display="none"; signupPanel.style.display="block"; }
function showLogin(){ signupPanel.style.display="none"; loginPanel.style.display="block"; }
function enterApp(){ authBox.style.display="none"; app.style.display="block"; loadIframe(); }

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
  msg2.textContent = data.message||"";
}

/* ---------- IFRAME ---------- */
function loadIframe(){
  contentFrame.style.display="block";
  contentFrame.src = "https://sspv2play.neocities.org/home";

  contentFrame.onload = ()=>{
    if(currentUser.role==="admin") initAdminOverlay();
    initChat();
  };
}

/* ---------- ADMIN PANEL ---------- */
function initAdminOverlay(){
  if(document.getElementById("adminBtn")) return;

  const btn = document.createElement("button");
  btn.id = "adminBtn";
  btn.textContent = "A";
  btn.style.position = "fixed";
  btn.style.bottom = "10px";
  btn.style.left = "10px";
  btn.style.width = "40px";
  btn.style.height = "40px";
  btn.style.fontSize = "16px";
  btn.style.background = "#8e44ad";
  btn.style.color = "#fff";
  btn.style.border = "1px solid #fff";
  btn.style.borderRadius = "5px";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "9999";
  document.body.appendChild(btn);

  const panel = document.createElement("div");
  panel.id = "adminPanel";
  panel.style.position = "fixed";
  panel.style.bottom = "60px";
  panel.style.left = "10px";
  panel.style.width = "320px";
  panel.style.maxHeight = "400px";
  panel.style.background = "rgba(0,0,0,0.95)";
  panel.style.color = "#fff";
  panel.style.overflowY = "auto";
  panel.style.padding = "10px";
  panel.style.border = "2px solid #9b59b6";
  panel.style.borderRadius = "10px";
  panel.style.display = "none";
  panel.style.zIndex = "9999";
  document.body.appendChild(panel);

  async function updatePanel(){
    const res = await fetch("/api/admin/users");
    const users = await res.json();
    panel.innerHTML="<h3>Users</h3>";
    const onlineCount = users.filter(u=>u.online).length;
    const countDiv = document.createElement("div");
    countDiv.textContent=`Currently online: ${onlineCount}`;
    countDiv.style.marginBottom="6px";
    panel.appendChild(countDiv);

    users.forEach(u=>{
      const last = u.last_login ? new Date(u.last_login).toLocaleString() : "Never";
      const line = document.createElement("div");
      line.style.display="flex";
      line.style.justifyContent="space-between";
      line.style.alignItems="center";
      line.style.marginBottom="4px";
      line.innerHTML = `<span>${u.username} (${u.role}) - Last: ${last}</span>`;

      if(u.role!=="admin"){
        const banBtn=document.createElement("button");
        banBtn.textContent=u.banned?"Unban":"Ban";
        banBtn.style.marginLeft="5px";
        banBtn.onclick=async ()=>{
          await fetch("/api/admin/ban",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:u.id,banned:!u.banned})});
          u.banned=!u.banned;
          banBtn.textContent=u.banned?"Unban":"Ban";
          if(u.username===currentUser.username && u.banned) window.location.reload();
        };
        line.appendChild(banBtn);
      }
      panel.appendChild(line);
    });
  }

  btn.onclick=()=>{ panel.style.display=panel.style.display==="none"?"block":"none"; if(panel.style.display==="block") updatePanel(); }
  setInterval(()=>{ if(panel.style.display==="block") updatePanel(); },5000);
}

/* ---------- CHAT BOX ---------- */
function initChat(){
  if(document.getElementById("chatBox")) return;

  const chatBox = document.createElement("div");
  chatBox.id="chatBox";
  chatBox.style.position="fixed";
  chatBox.style.bottom="10px";
  chatBox.style.right="10px";
  chatBox.style.width="250px";
  chatBox.style.height="300px";
  chatBox.style.background="rgba(0,0,0,0.9)";
  chatBox.style.color="#fff";
  chatBox.style.border="2px solid #9b59b6";
  chatBox.style.borderRadius="10px";
  chatBox.style.display="flex";
  chatBox.style.flexDirection="column";
  chatBox.style.zIndex="9999";
  document.body.appendChild(chatBox);

  const messagesDiv=document.createElement("div");
  messagesDiv.style.flex="1";
  messagesDiv.style.overflowY="auto";
  messagesDiv.style.padding="5px";
  chatBox.appendChild(messagesDiv);

  const inputDiv=document.createElement("div");
  inputDiv.style.display="flex";
  inputDiv.style.marginTop="5px";
  chatBox.appendChild(inputDiv);

  const input=document.createElement("input");
  input.type="text";
  input.placeholder="Type a message...";
  input.style.flex="1";
  input.style.padding="5px";
  input.style.borderRadius="5px";
  input.style.border="1px solid #fff";
  input.style.background="#222";
  input.style.color="#fff";
  inputDiv.appendChild(input);

  const sendBtn=document.createElement("button");
  sendBtn.textContent="Send";
  sendBtn.style.marginLeft="5px";
  sendBtn.style.borderRadius="5px";
  sendBtn.style.border="none";
  sendBtn.style.background="#8e44ad";
  sendBtn.style.color="#fff";
  sendBtn.style.cursor="pointer";
  inputDiv.appendChild(sendBtn);

  function fetchMessages(){
    fetch("/api/chat")
      .then(res=>res.json())
      .then(data=>{
        messagesDiv.innerHTML="";
        data.forEach(m=>{ const p=document.createElement("div"); p.textContent=m; messagesDiv.appendChild(p); });
        messagesDiv.scrollTop=messagesDiv.scrollHeight;
      });
  }

  sendBtn.onclick = () => {
    if(input.value.trim()!==""){
      fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:currentUser.username,message:input.value})})
      .then(()=>fetchMessages());
      input.value="";
    }
  };

  input.addEventListener("keypress", e => { if(e.key==="Enter") sendBtn.click(); });

  setInterval(fetchMessages,2000);
}
