const SUPABASE_URL = "https://hcfoqyekemhwnbbwdvae.supabase.co";
const SUPABASE_ANON_KEY = "ISI_ANON_KEY_KAMU";
const sb = supabase.createClient("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZm9xeWVrZW1od25iYndkdmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzA4NjIsImV4cCI6MjA4MzI0Njg2Mn0.S_kSysDrO_TfwUa4uOk-lUrW_OBf4tV6QJPsCO0iS0Y");

const $ = id => document.getElementById(id);
const rp = n => "Rp "+Number(n||0).toLocaleString("id-ID");

let rows=[], chart=null;

/* MENU */
$("btnMenu").onclick = ()=> $("menuDrop").classList.toggle("show");
document.addEventListener("click", e=>{
  if(!e.target.closest(".menuWrap")) $("menuDrop").classList.remove("show");
});

/* AUTH */
async function daftar(){
  const {error}=await sb.auth.signUp({email:$("email").value,password:$("password").value});
  $("msg").innerText=error?error.message:"Daftar berhasil";
}
async function login(){
  const {error}=await sb.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  if(error){$("msg").innerText=error.message;return;}
  start();
}

async function start(){
  $("loginBox").style.display="none";
  $("app").style.display="block";

  const {data:{user}}=await sb.auth.getUser();
  $("who").innerText="User: "+user.email;
  $("profileEmail").innerText=user.email;

  $("btnLogout").onclick=async()=>{
    if(!confirm("Yakin logout?"))return;
    await sb.auth.signOut();
    location.reload();
  };

  await loadProfile();
  load();
}

/* DATA */
async function load(){
  const {data:{user}}=await sb.auth.getUser();
  const r=await sb.from("transaksi").select("*").eq("user_id",user.id).order("waktu");
  rows=r.data||[];

  let m=0,k=0;
  rows.forEach(x=>x.jenis==="Uang Masuk"?m+=+x.jumlah:k+=+x.jumlah);
  $("saldo").innerText=rp(m-k);
  $("masuk").innerText=rp(m);
  $("keluar").innerText=rp(k);

  $("list").innerHTML=rows.map(x=>`
    <tr><td>${x.waktu}</td><td>${x.jenis}</td><td>${rp(x.jumlah)}</td></tr>
  `).join("");

  drawLine();
}

async function simpan(){
  const j=Number($("jumlah").value);
  if(!j)return;
  const saldo=rows.reduce((s,r)=>s+(r.jenis==="Uang Masuk"?+r.jumlah:-r.jumlah),0);
  if($("jenis").value==="Uang Keluar"&&j>saldo)return alert("Saldo kurang");
  const {data:{user}}=await sb.auth.getUser();
  await sb.from("transaksi").insert([{user_id:user.id,jenis:$("jenis").value,jumlah:j,waktu:new Date().toISOString(),catatan:$("catatan").value||""}]);
  $("jumlah").value="";$("catatan").value="";load();
}

function drawLine(){
  if(chart)chart.destroy();
  let saldo=0,labels=[],data=[];
  rows.forEach(r=>{saldo+=r.jenis==="Uang Masuk"?+r.jumlah:-r.jumlah;labels.push(r.waktu);data.push(saldo)});
  chart=new Chart($("chart"),{type:"line",
    data:{labels,datasets:[{data,borderWidth:3,pointRadius:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
  });
}

/* PROFILE (AVATAR + NAMA) */
async function loadProfile(){
  const {data:{user}}=await sb.auth.getUser();

  let {data:prof}=await sb.from("profiles").select("name").eq("id",user.id).single();
  if(!prof){
    await sb.from("profiles").insert([{id:user.id,name:user.email.split("@")[0]}]);
    $("profileName").innerText=user.email.split("@")[0];
  }else{
    $("profileName").innerText=prof.name;
  }

  const img=$("avatar");
  img.src=`${SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}.jpg?${Date.now()}`;
  img.style.display="block";
}

async function uploadPhoto(file){
  const {data:{user}}=await sb.auth.getUser();
  await sb.storage.from("avatars").upload(`${user.id}.jpg`,file,{upsert:true,contentType:file.type});
  loadProfile();
}

$("btnDaftar").onclick=daftar;
$("btnLogin").onclick=login;
$("btnSimpan").onclick=simpan;
$("photo").addEventListener("change",e=>e.target.files[0]&&uploadPhoto(e.target.files[0]));
sb.auth.getSession().then(r=>r.data.session&&start());
