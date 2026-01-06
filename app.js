const SUPABASE_URL = "https://hcfoqyekemhwnbbwdvae.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZm9xeWVrZW1od25iYndkdmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzA4NjIsImV4cCI6MjA4MzI0Njg2Mn0.S_kSysDrO_TfwUa4uOk-lUrW_OBf4tV6QJPsCO0iS0Y";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
const rp = n => "Rp "+Number(n||0).toLocaleString("id-ID");

let rows=[], chart=null;

/* MENU */
let menuOpen=false;
$("btnMenu").addEventListener("click",e=>{
  e.stopPropagation();menuOpen=!menuOpen;
  $("menuDrop").classList.toggle("show",menuOpen);
});
window.addEventListener("click",()=>{$("menuDrop").classList.remove("show");menuOpen=false});

/* AUTH */
async function login(){
  const {error}=await sb.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  if(error){$("msg").innerText=error.message;return;}
  start();
}
async function daftar(){
  await sb.auth.signUp({email:$("email").value,password:$("password").value});
  $("msg").innerText="Daftar berhasil";
}

async function start(){
  $("loginBox").style.display="none";
  $("app").style.display="block";
  $("menuWrap").style.display="block";

  const {data:{user}}=await sb.auth.getUser();
  $("who").innerText=user.email;

  await loadProfile();
  setJenisUI();
}

/* WARNA */
function setJenisUI(){
  const s=$("jenis");
  s.classList.remove("jenis-in","jenis-out");
  s.value==="Uang Masuk"?s.classList.add("jenis-in"):s.classList.add("jenis-out");
}
$("jenis").addEventListener("change",setJenisUI);

/* PROFILE */
async function loadProfile(){
  const {data:{user}}=await sb.auth.getUser();
  const imgUrl=`${SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}.jpg?${Date.now()}`;

  $("avatar").src=imgUrl;
  $("avatar").style.display="block";
  $("avatarHeader").src=imgUrl;
  $("avatarHeader").style.display="block";

  $("profileEmail").innerText=user.email;
  $("profileName").innerText=user.email.split("@")[0];
}

$("photo").addEventListener("change",e=>{
  if(e.target.files[0]) uploadPhoto(e.target.files[0]);
});
async function uploadPhoto(file){
  const {data:{user}}=await sb.auth.getUser();
  await sb.storage.from("avatars").upload(`${user.id}.jpg`,file,{upsert:true});
  loadProfile();
}

/* EVENTS */
$("btnLogin").onclick=login;
$("btnDaftar").onclick=daftar;
sb.auth.getSession().then(r=>r.data.session&&start());
