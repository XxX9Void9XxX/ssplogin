let currentUser=null;
let socket=null;
let onlineList=[];
let coinInterval=null;
let collection = {}; // saved cards

/* ====================== SIGNUP ====================== */
function signup(){
  fetch("/signup",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username:username.value,password:password.value})
  }).then(r=>r.json()).then(d=>alert(d.success?"Created":"Error"));
}

/* ====================== LOGIN ====================== */
function login(){
  fetch("/login",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username:username.value,password:password.value})
  }).then(r=>r.json()).then(d=>{
    if(!d.success) return d.banned ? alert("You have been banned") : alert("Login failed");

    currentUser=d;
    authBox.style.display="none";
    mainFrame.style.display="block";
    chatBox.style.display="block";
    coinBox.style.display="block";
    storeBtn.style.display="block";

    const isAdmin = d.role && d.role.toLowerCase()==="admin";
    if(isAdmin) addCoinsBtn.style.display="block";

    startCoins();
    connectSocket();
    loadStoreCollection();
  });
}

/* ====================== COINS ====================== */
function startCoins(){
  const key="coins_"+currentUser.username;
  let coins=parseInt(localStorage.getItem(key))||0;

  function update(){
    coinCount.innerText=coins;
    localStorage.setItem(key,coins);
  }
  update();

  coinInterval=setInterval(()=>{
    coins+=25;
    update();
  },60000);

  addCoinsBtn.onclick=()=>{
    coins+=100;
    update();
  };

  // Store pack opener cost
  openPackBtn.onclick=()=>{
    if(coins<100) return alert("Not enough coins!");
    coins-=100;
    update();
    openPack();
  };
}

/* ====================== SOCKET / CHAT ====================== */
function connectSocket(){
  const protocol = location.protocol==="https:"?"wss:":"ws:";
  socket=new WebSocket(`${protocol}//${location.host}`);

  socket.onopen=()=>socket.send(JSON.stringify({type:"join",username:currentUser.username}));
  socket.onmessage=e=>{
    const data=JSON.parse(e.data);
    if(data.type==="chatHistory"){
      chatMessages.innerHTML="";
      data.history.forEach(msg=>addMessage(msg.username,msg.message));
    }
    if(data.type==="chat") addMessage(data.username,data.message);
    if(data.type==="onlineUpdate"){onlineList=data.online;updateOnlineUI();}
    if(data.type==="banned"){alert("You were banned");location.reload();}
    if(data.type==="chatError") alert(data.message);
  };

  chatInput.addEventListener("keypress",e=>{
    if(e.key==="Enter" && chatInput.value.trim()!==""){
      socket.send(JSON.stringify({type:"chat",username:currentUser.username,role:currentUser.role,message:chatInput.value}));
      chatInput.value="";
    }
  });
}

/* ====================== CHAT/UI ====================== */
function addMessage(user,msg){
  chatMessages.innerHTML+=`<div>&lt;${user}&gt; ${msg}</div>`;
  chatMessages.scrollTop=chatMessages.scrollHeight;
}
function updateOnlineUI(){
  onlineCount.innerText="Online: "+onlineList.length;
  loadUsers();
}
function loadUsers(){
  fetch("/users").then(r=>r.json()).then(d=>{
    usersList.innerHTML="";
    d.users.forEach(u=>{
      const div=document.createElement("div");
      div.innerHTML=`${onlineList.includes(u.username)?"🟢":"⚫"} ${u.username} (${u.role})`;

      if(currentUser.role==="admin" && u.username!=="script.add.user"){
        const btn=document.createElement("button");
        btn.innerText=u.banned?"Unban":"Ban";
        btn.onclick=()=>{
          fetch("/"+(u.banned?"unban":"ban"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u.username})})
            .then(()=>loadUsers());
        };
        div.appendChild(btn);
      }

      usersList.appendChild(div);
    });
  });
}

/* ====================== STORE COLLECTION ====================== */
function loadStoreCollection(){
  collection = JSON.parse(localStorage.getItem("collection_"+currentUser.username)||"{}");
  renderCollection();
}
function renderCollection(){
  storeCollection.innerHTML="";
  for(let card in collection){
    storeCollection.innerHTML+=`<div>${card}: ${collection[card]}</div>`;
  }
}

/* ====================== PACK OPENING ====================== */
function openPack(){
  const cards = [
    "https://sspv2play.neocities.org/mtg/vma-4-black-lotus.jpg",
    "https://sspv2play.neocities.org/mtg/fdn-1-sire-of-seven-deaths.jpg",
    "https://sspv2play.neocities.org/mtg/cn2-214-platinum-angel.jpg",
    "https://sspv2play.neocities.org/mtg/ltr-246-the-one-ring.jpg",
    "https://sspv2play.neocities.org/mtg/som-176-mindslaver.jpg",
    "https://sspv2play.neocities.org/mtg/baby-doddin-the-consuming-monstrosity.jpg",
    "https://sspv2play.neocities.org/mtg/orange-master-of-the-elements.jpg",
    "https://sspv2play.neocities.org/mtg/vma-2-time-walk.jpg",
    "https://sspv2play.neocities.org/mtg/c19-51-volrath-the-shapestealer.jpg"
  ];
  const pull = cards[Math.floor(Math.random()*cards.length)];
  collection[pull] = (collection[pull]||0)+1;
  localStorage.setItem("collection_"+currentUser.username,JSON.stringify(collection));
  renderCollection();
  alert("You pulled a card!");
}
