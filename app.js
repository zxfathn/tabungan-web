const SUPABASE_URL = "https://hcfoqyekemhwnbbwdvae.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZm9xeWVrZW1od25iYndkdmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzA4NjIsImV4cCI6MjA4MzI0Njg2Mn0.S_kSysDrO_TfwUa4uOk-lUrW_OBf4tV6QJPsCO0iS0Y";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

let rows = [];
let chart = null;

/* ===== MENU (AMAN DI HP & LAPTOP) ===== */
let menuOpen = false;
function bindMenu(){
  $("btnMenu").addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    menuOpen = !menuOpen;
    $("menuDrop").classList.toggle("show", menuOpen);
  });
  $("menuDrop").addEventListener("click", (e)=> e.stopPropagation());
  window.addEventListener("click", ()=>{
    menuOpen = false;
    $("menuDrop").classList.remove("show");
  });
}

/* ===== WARNA PILIHAN SERASI ===== */
function setJenisUI(){
  const s = $("jenis");
  s.classList.remove("jenis-in","jenis-out");
  if (s.value === "Uang Masuk") s.classList.add("jenis-in");
  else s.classList.add("jenis-out");
}

/* ===== AUTH ===== */
async function daftar(){
  $("msg").innerText = "Mendaftar...";
  const { error } = await sb.auth.signUp({
    email: $("email").value.trim(),
    password: $("password").value
  });
  $("msg").innerText = error ? ("Gagal daftar: " + error.message) : "Daftar berhasil. Silakan login.";
}

async function login(){
  $("msg").innerText = "Login...";
  const { error } = await sb.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });
  if (error){ $("msg").innerText = "Gagal login: " + error.message; return; }
  $("msg").innerText = "";
  start();
}

async function start(){
  $("loginBox").style.display = "none";
  $("app").style.display = "block";
  $("menuWrap").style.display = "block"; // MENU hanya setelah login

  const { data:{ user } } = await sb.auth.getUser();
  $("who").innerText = user?.email || "";

  // LOGOUT FIX
  $("btnLogout").onclick = async ()=>{
    if (!confirm("Yakin mau logout?")) return;
    await sb.auth.signOut();
    location.reload();
  };

  await loadProfile();   // avatar + nama
  await load();          // transaksi + saldo + grafik
  setJenisUI();
}

/* ===== PROFILE (AVATAR HEADER + MENU) ===== */
async function loadProfile(){
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return;

  $("profileEmail").innerText = user.email;
  $("profileName").innerText = user.email.split("@")[0];

  const imgUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}.jpg?${Date.now()}`;

  $("avatar").src = imgUrl;
  $("avatar").style.display = "block";

  $("avatarHeader").src = imgUrl;
  $("avatarHeader").style.display = "block";
}

async function uploadPhoto(file){
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return;

  const up = await sb.storage
    .from("avatars")
    .upload(`${user.id}.jpg`, file, { upsert:true, contentType:file.type });

  if (up.error){
    alert("Upload gagal: " + up.error.message);
    return;
  }
  loadProfile();
}

/* ===== DATA ===== */
async function load(){
  $("err").innerText = "";

  const { data:{ user } } = await sb.auth.getUser();
  if (!user) return;

  const r = await sb
    .from("transaksi")
    .select("*")
    .eq("user_id", user.id)
    .order("waktu", { ascending:true });

  if (r.error){
    $("err").innerText = r.error.message;
    return;
  }

  rows = r.data || [];

  let masuk = 0, keluar = 0;
  rows.forEach(x => (x.jenis === "Uang Masuk") ? (masuk += +x.jumlah) : (keluar += +x.jumlah));

  $("saldo").innerText = rp(masuk - keluar);
  $("masuk").innerText = rp(masuk);
  $("keluar").innerText = rp(keluar);

  $("list").innerHTML = rows.map(x=>{
    const t = x.waktu ? new Date(x.waktu).toLocaleString("id-ID") : "-";
    return `<tr><td>${t}</td><td>${x.jenis}</td><td>${rp(x.jumlah)}</td></tr>`;
  }).join("");

  drawLine();
}

async function simpan(){
  $("err").innerText = "";

  const j = Number($("jumlah").value || 0);
  if (!j || j <= 0){ $("err").innerText = "Jumlah harus > 0"; return; }

  const saldo = rows.reduce((s,r)=> s + (r.jenis==="Uang Masuk" ? +r.jumlah : -r.jumlah), 0);
  if ($("jenis").value === "Uang Keluar" && j > saldo){
    $("err").innerText = "Saldo kurang. Saldo sekarang: " + rp(saldo);
    return;
  }

  const { data:{ user } } = await sb.auth.getUser();
  const now = new Date().toISOString();

  const ins = await sb.from("transaksi").insert([{
    user_id: user.id,
    waktu: now,
    jenis: $("jenis").value,
    jumlah: j,
    catatan: $("catatan").value || ""
  }]);

  if (ins.error){
    $("err").innerText = ins.error.message;
    return;
  }

  $("jumlah").value = "";
  $("catatan").value = "";
  await load();
}

/* ===== GRAFIK SALDO (FIX MUNCUL) ===== */
function drawLine(){
  const canvas = $("chart");
  const old = Chart.getChart(canvas);
  if (old) old.destroy();
  if (chart) { chart.destroy(); chart = null; }

  if (!rows.length){
    $("hint").innerText = "Belum ada transaksi.";
    return;
  }

  let saldo = 0;
  const labels = [];
  const dataSaldo = [];

  rows.forEach(r=>{
    saldo += (r.jenis === "Uang Masuk") ? +r.jumlah : -r.jumlah;
    labels.push(r.waktu ? new Date(r.waktu).toLocaleTimeString("id-ID") : "-");
    dataSaldo.push(saldo);
  });

  $("hint").innerText = `Titik: ${labels.length}`;

  chart = new Chart(canvas.getContext("2d"),{
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Saldo",
        data: dataSaldo,
        borderWidth: 3,
        pointRadius: 2,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (v)=> rp(v) } },
        x: { ticks: { maxTicksLimit: 6 } }
      }
    }
  });
}

/* ===== EVENTS (FIX: tombol input berfungsi) ===== */
document.addEventListener("DOMContentLoaded", ()=>{
  bindMenu();

  $("btnDaftar").addEventListener("click", daftar);
  $("btnLogin").addEventListener("click", login);

  $("btnSimpan").addEventListener("click", simpan);

  $("btnMasuk").addEventListener("click", ()=>{
    $("jenis").value = "Uang Masuk";
    setJenisUI();
  });
  $("btnKeluar").addEventListener("click", ()=>{
    $("jenis").value = "Uang Keluar";
    setJenisUI();
  });
  $("jenis").addEventListener("change", setJenisUI);

  $("photo").addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if (f) uploadPhoto(f);
  });

  // auto-login kalau masih ada session
  sb.auth.getSession().then(r => { if (r.data.session) start(); });
});
