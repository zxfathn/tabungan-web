const sb = supabase.createClient(
  "https://hcfoqyekemhwnbbwdvae.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZm9xeWVrZW1od25iYndkdmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzA4NjIsImV4cCI6MjA4MzI0Njg2Mn0.S_kSysDrO_TfwUa4uOk-lUrW_OBf4tV6QJPsCO0iS0Y"
);

const $ = id => document.getElementById(id);
const rp = n => "Rp " + Number(n||0).toLocaleString("id-ID");

let rows = [];
let chart;

async function daftar(){
  const { error } = await sb.auth.signUp({
    email: $("email").value,
    password: $("password").value
  });
  $("msg").innerText = error ? error.message : "Daftar berhasil";
}

async function login(){
  const { error } = await sb.auth.signInWithPassword({
    email: $("email").value,
    password: $("password").value
  });
  if(error){ $("msg").innerText = error.message; return; }
  start();
}

async function start(){
  $("loginBox").style.display="none";
  $("app").style.display="block";
  $("btnLogout").style.display="block";

  $("btnLogout").onclick = async ()=>{
    await sb.auth.signOut();
    location.reload();
  };

  load();
}

async function load(){
  const { data:{user} } = await sb.auth.getUser();
  const r = await sb
    .from("transaksi")
    .select("*")
    .eq("user_id", user.id)
    .order("waktu");

  rows = r.data || [];

  let masuk=0, keluar=0;
  rows.forEach(x=>{
    x.jenis==="Uang Masuk" ? masuk+=+x.jumlah : keluar+=+x.jumlah;
  });

  $("saldo").innerText = rp(masuk-keluar);
  $("masuk").innerText = rp(masuk);
  $("keluar").innerText = rp(keluar);

  drawChart();
}

async function simpan(){
  const j = Number($("jumlah").value);
  if(!j) return;

  const { data:{user} } = await sb.auth.getUser();
  await sb.from("transaksi").insert([{
    user_id:user.id,
    jenis:$("jenis").value,
    jumlah:j,
    waktu:new Date().toISOString()
  }]);

  $("jumlah").value="";
  load();
}

function drawChart(){
  const labels=[];
  const data=[];
  let saldo=0;

  rows.forEach(r=>{
    saldo += r.jenis==="Uang Masuk"? +r.jumlah : -r.jumlah;
    labels.push(r.waktu);
    data.push(saldo);
  });

  if(chart) chart.destroy();

  chart = new Chart($("chart"),{
    type:"line",
    data:{
      labels,
      datasets:[{
        data,
        borderColor:"#22c55e",
        borderWidth:3,
        pointRadius:2
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}}
    }
  });

  $("hint").innerText = "Titik: "+labels.length;
}

$("btnDaftar").onclick = daftar;
$("btnLogin").onclick = login;
$("btnSimpan").onclick = simpan;
$("btnMasuk").onclick = ()=>$("jenis").value="Uang Masuk";
$("btnKeluar").onclick = ()=>$("jenis").value="Uang Keluar";

sb.auth.getSession().then(r=>{
  if(r.data.session) start();
});
