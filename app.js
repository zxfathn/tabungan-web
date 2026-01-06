const SUPABASE_URL = "https://hcfoqyekemhwnbbwdvae.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZm9xeWVrZW1od25iYndkdmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzA4NjIsImV4cCI6MjA4MzI0Njg2Mn0.S_kSysDrO_TfwUa4uOk-lUrW_OBf4tV6QJPsCO0iS0Y";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id)=>document.getElementById(id);
const rp = (n)=>"Rp "+Number(n||0).toLocaleString("id-ID");

let rows = [];
let chart = null;

function showMsg(t){ $("msg").innerText = t || ""; }
function showErr(t){ $("err").innerText = t || ""; }

function parseTs(row){
  const s = String((row?.waktu || row?.tanggal || "")).trim();
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  const t2 = Date.parse(s + "T00:00:00Z");
  return Number.isNaN(t2) ? null : t2;
}
function rangeMs(r){
  if (r === "30s") return 30_000;
  if (r === "15m") return 15 * 60_000;
  if (r === "1d")  return 24 * 60 * 60_000;
  return null;
}

/* AUTH */
async function daftar(){
  showMsg("Mendaftar...");
  const { error } = await sb.auth.signUp({
    email: $("email").value.trim(),
    password: $("password").value
  });
  showMsg(error ? ("Gagal daftar: " + error.message) : "Daftar berhasil. Silakan login.");
}

async function login(){
  showMsg("Login...");
  const { error } = await sb.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });
  if (error){ showMsg("Gagal login: " + error.message); return; }
  showMsg("");
  start();
}

async function start(){
  $("loginBox").style.display = "none";
  $("app").style.display = "block";
  $("btnLogout").style.display = "block";

  $("btnLogout").onclick = async ()=>{
    await sb.auth.signOut();
    location.reload();
  };

  const { data:{user} } = await sb.auth.getUser();
  $("who").innerText = user?.email ? ("Login: " + user.email) : "";
  await load();
}

/* DATA */
async function load(){
  showErr("");
  const { data:{user} } = await sb.auth.getUser();
  if (!user) return;

  const r = await sb
    .from("transaksi")
    .select("*")
    .eq("user_id", user.id)
    .order("waktu", { ascending:true });

  if (r.error){ showErr(r.error.message); return; }
  rows = r.data || [];

  let m=0, k=0;
  rows.forEach(x => x.jenis === "Uang Masuk" ? (m += +x.jumlah) : (k += +x.jumlah));

  $("saldo").innerText = rp(m-k);
  $("masuk").innerText = rp(m);
  $("keluar").innerText = rp(k);

  $("list").innerHTML = rows.map(x=>{
    const t = x.waktu || x.tanggal || "-";
    return `<tr><td>${t}</td><td>${x.jenis}</td><td>${rp(x.jumlah)}</td></tr>`;
  }).join("");

  drawLine();
}

async function simpan(){
  showErr("");
  const j = Number($("jumlah").value || 0);
  if (!j || j <= 0){ showErr("Jumlah harus > 0"); return; }

  const saldo = rows.reduce((s,r)=> s + (r.jenis==="Uang Masuk" ? +r.jumlah : -r.jumlah), 0);
  if ($("jenis").value === "Uang Keluar" && j > saldo){
    showErr("Saldo kurang. Saldo sekarang: " + rp(saldo));
    return;
  }

  const { data:{user} } = await sb.auth.getUser();
  const nowIso = new Date().toISOString();

  const ins = await sb.from("transaksi").insert([{
    user_id: user.id,
    waktu: nowIso,      // kalau belum ada kolom waktu, bikin di supabase
    tanggal: nowIso,
    jenis: $("jenis").value,
    jumlah: j,
    catatan: $("catatan").value || ""
  }]);

  if (ins.error){ showErr(ins.error.message); return; }

  $("jumlah").value = "";
  $("catatan").value = "";
  await load();
}

/* GRAFIK GARIS SALDO */
function buildSaldoSeries(){
  const rg = $("range").value;
  const rm = rangeMs(rg);
  const now = Date.now();

  let saldo = 0;
  const labels = [];
  const dataSaldo = [];

  const asc = [...rows].slice().sort((a,b)=> (parseTs(a) ?? 0) - (parseTs(b) ?? 0));

  for (const r of asc){
    const t = parseTs(r);
    const j = Number(r.jumlah || 0);
    saldo += (r.jenis === "Uang Masuk") ? j : -j;

    const okRange = !rm || (t !== null && t >= (now - rm));
    if (okRange){
      labels.push(r.waktu || r.tanggal || "-");
      dataSaldo.push(saldo);
    }
  }

  // biar ringan di HP
  if (labels.length > 250){
    const cut = labels.length - 250;
    return { labels: labels.slice(cut), dataSaldo: dataSaldo.slice(cut) };
  }
  return { labels, dataSaldo };
}

function drawLine(){
  const { labels, dataSaldo } = buildSaldoSeries();
  $("hint").innerText = labels.length ? `Titik: ${labels.length}` : "Tidak ada data di range ini.";

  const canvas = $("chart");
  const old = Chart.getChart(canvas);
  if (old) old.destroy();
  if (chart) { chart.destroy(); chart = null; }
  if (!labels.length) return;

  chart = new Chart(canvas.getContext("2d"),{
    type:"line",
    data:{
      labels,
      datasets:[{
        label:"Saldo",
        data:dataSaldo,
        borderWidth:3,
        pointRadius:2,
        tension:0.2
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{ maxTicksLimit:6 } },
        y:{ ticks:{ callback:(v)=>rp(v) } }
      }
    }
  });
}

/* CEK */
function cek(){
  const rg = $("range").value;
  const rm = rangeMs(rg);
  const now = Date.now();

  let total = rows.length;
  let punyaWaktu = 0;
  let masukRange = 0;
  let contoh = null;

  for (const r of rows){
    if (r.waktu) punyaWaktu++;
    const t = parseTs(r);
    if (!contoh) contoh = (r.waktu || r.tanggal || "-");
    if (!rm || (t !== null && t >= (now - rm))) masukRange++;
  }

  alert(
    `Total transaksi: ${total}\n` +
    `Ada waktu: ${punyaWaktu}\n` +
    `Masuk range (${rg}): ${masukRange}\n\n` +
    `Contoh waktu:\n${contoh}`
  );
}

/* EVENTS */
function bindTap(id, fn){
  const el = $(id);
  if (!el) return;
  el.addEventListener("click", (e)=>{ e.preventDefault(); fn(); }, { passive:false });
  el.addEventListener("touchend", (e)=>{ e.preventDefault(); fn(); }, { passive:false });
}

document.addEventListener("DOMContentLoaded", ()=>{
  bindTap("btnDaftar", daftar);
  bindTap("btnLogin", login);
  bindTap("btnSimpan", simpan);
  bindTap("btnCek", cek);

  bindTap("btnMasuk", ()=>{ $("jenis").value = "Uang Masuk"; });
  bindTap("btnKeluar", ()=>{ $("jenis").value = "Uang Keluar"; });

  $("range").addEventListener("change", drawLine);
});

sb.auth.getSession().then(r => { if (r.data.session) start(); });
