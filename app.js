/* ====== SUPABASE ====== */
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
  return null; // all
}

/* ====== REGISTER CHART + FINANCIAL (INI FIX ERROR "candlestick not registered") ====== */
(function registerAll(){
  if (Chart?.registerables) Chart.register(...Chart.registerables);
  if (window.ChartZoom) Chart.register(window.ChartZoom);

  // chartjs-chart-financial UMD bisa muncul dengan nama berbeda, jadi kita cari yang ada
  const fin =
    window.ChartFinancial ||
    window["chartjs-chart-financial"] ||
    window.chartjsChartFinancial ||
    window.Financial;

  const regs = [];
  const pick = (obj, key) => (obj && obj[key]) ? obj[key] : null;

  const CandlestickController = pick(fin,"CandlestickController") || window.CandlestickController;
  const CandlestickElement    = pick(fin,"CandlestickElement")    || window.CandlestickElement;
  const OhlcController        = pick(fin,"OhlcController")        || window.OhlcController;
  const OhlcElement           = pick(fin,"OhlcElement")           || window.OhlcElement;
  const FinancialScale        = pick(fin,"FinancialScale")        || window.FinancialScale;

  [CandlestickController, CandlestickElement, OhlcController, OhlcElement, FinancialScale]
    .forEach(x => { if (x) regs.push(x); });

  if (regs.length) {
    Chart.register(...regs);
  } else {
    console.error("Plugin financial tidak ter-register. Pastikan urutan script di index.html benar.");
  }
})();

/* ====== AUTH ====== */
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

/* ====== DATA ====== */
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

  draw();
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
    waktu: nowIso,
    tanggal: nowIso, // fallback
    jenis: $("jenis").value,
    jumlah: j,
    catatan: $("catatan").value || ""
  }]);

  if (ins.error){ showErr(ins.error.message); return; }

  $("jumlah").value = "";
  $("catatan").value = "";
  await load();
}

/* ====== CANDLE: 1 TRANSAKSI = 1 CANDLE ====== */
function buildCandlesPerTx(){
  const mode = $("mode").value;
  const rg = $("range").value;
  const rm = rangeMs(rg);
  const now = Date.now();

  let saldo = 0;
  const out = [];

  const asc = [...rows].slice().sort((a,b)=> (parseTs(a) ?? 0) - (parseTs(b) ?? 0));

  for (const r of asc){
    const t = parseTs(r);
    const o = saldo;

    const j = Number(r.jumlah || 0);
    saldo += (r.jenis === "Uang Masuk") ? j : -j;
    const c = saldo;

    const okMode =
      mode === "all" ||
      (mode === "masuk" && r.jenis === "Uang Masuk") ||
      (mode === "keluar" && r.jenis === "Uang Keluar");

    const okRange = !rm || (t !== null && t >= (now - rm));

    if (okMode && okRange){
      out.push({
        x: r.waktu || r.tanggal || "-",
        o,
        h: Math.max(o,c),
        l: Math.min(o,c),
        c
      });
    }
  }

  return out.slice(-250);
}

function draw(){
  const d = buildCandlesPerTx();
  $("hint").innerText = d.length ? `Candle: ${d.length}` : "Tidak ada transaksi di range ini.";

  const canvas = $("chart");

  // ✅ FIX "Canvas already in use"
  const old = Chart.getChart(canvas);
  if (old) old.destroy();
  if (chart) { chart.destroy(); chart = null; }

  if (!d.length) return;

  const ctx = canvas.getContext("2d");
  chart = new Chart(ctx, {
    type: "candlestick",
    data: {
      datasets: [{
        data: d,

        // ✅ WARNA HIJAU / MERAH BIAR KELIHATAN
        color: { up:"#22c55e", down:"#ef4444", unchanged:"#9ca3af" },
        borderColor: { up:"#22c55e", down:"#ef4444", unchanged:"#9ca3af" },
        wickColor: { up:"#22c55e", down:"#ef4444", unchanged:"#9ca3af" },
        backgroundColor: {
          up:"rgba(34,197,94,0.9)",
          down:"rgba(239,68,68,0.9)",
          unchanged:"rgba(156,163,175,0.9)"
        },
        borderWidth: 2,
        barThickness: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display:false },
        zoom: {
          pan: { enabled:true, mode:"x" },
          zoom: { wheel:{enabled:true}, pinch:{enabled:true}, mode:"x" }
        }
      },
      scales: {
        x: { type:"category", ticks:{ maxTicksLimit:6, color:"#b7bcc6" }, grid:{ color:"rgba(255,255,255,.08)" } },
        y: { ticks:{ color:"#b7bcc6", callback:(v)=>rp(v) }, grid:{ color:"rgba(255,255,255,.08)" } }
      }
    }
  });
}

/* ====== CEK DATA WAKTU ====== */
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
    `Ada waktu (kolom waktu terisi): ${punyaWaktu}\n` +
    `Masuk range (${rg}): ${masukRange}\n\n` +
    `Contoh waktu:\n${contoh}`
  );
}

/* ====== EVENTS ====== */
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

  $("mode").addEventListener("change", draw);
  $("range").addEventListener("change", draw);
});

sb.auth.getSession().then(r => { if (r.data.session) start(); });
