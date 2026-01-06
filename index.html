<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tabungan Online</title>

  <!-- SUPABASE -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <style>
    body{margin:0;font-family:Arial;background:#f5f6fa}
    header{background:#111;color:#fff;padding:14px}
    .wrap{max-width:900px;margin:auto;padding:16px}
    .card{background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 5px 15px rgba(0,0,0,.08)}
    .big{font-size:24px;font-weight:bold}
    .muted{color:#666;font-size:12px}
    input,select,button{width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #ddd}
    button{cursor:pointer;font-weight:bold}
    .btn-in{background:#16a34a;color:#fff;border:none}
    .btn-out{background:#dc2626;color:#fff;border:none}
    .btn{background:#e5e7eb;border:none}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #eee;padding:8px;font-size:14px}
    @media(max-width:600px){.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>

<header>
  <div class="wrap">
    <b>💰 Aplikasi Tabungan Online</b>
    <div class="muted">Gratis • Multi User • Supabase</div>
  </div>
</header>

<div class="wrap">

  <!-- LOGIN -->
  <div id="login" class="card">
    <h3>Login / Daftar</h3>
    <input id="email" placeholder="email">
    <input id="password" type="password" placeholder="password">
    <div class="grid">
      <button class="btn" onclick="register()">Daftar</button>
      <button class="btn" onclick="loginUser()">Login</button>
    </div>
    <div id="msg" class="muted"></div>
  </div>

  <!-- APP -->
  <div id="app" style="display:none">

    <div class="grid">
      <div class="card">
        <div class="muted">Saldo</div>
        <div id="saldo" class="big">Rp 0</div>
      </div>
      <div class="card">
        <div class="muted">Total Masuk</div>
        <div id="masuk" class="big">Rp 0</div>
      </div>
      <div class="card">
        <div class="muted">Total Keluar</div>
        <div id="keluar" class="big">Rp 0</div>
      </div>
    </div>

    <div class="card">
      <h3>Tambah Transaksi</h3>
      <select id="jenis">
        <option>Uang Masuk</option>
        <option>Uang Keluar</option>
      </select>
      <input id="jumlah" type="number" placeholder="contoh: 1000000">
      <input id="catatan" placeholder="catatan">
      <button class="btn" onclick="add()">Simpan</button>
    </div>

    <div class="card">
      <h3>Riwayat</h3>
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Jenis</th><th>Jumlah</th></tr>
        </thead>
        <tbody id="list"></tbody>
      </table>
    </div>

    <button class="btn" onclick="logout()">Logout</button>
  </div>
</div>

<script>
/* ================= SUPABASE CONFIG ================= */
const SUPABASE_URL = "https://hcfoqyekemhwnbbwdvae.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZm9xeWVrZW1od25iYndkdmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzA4NjIsImV4cCI6MjA4MzI0Njg2Mn0.S_kSysDrO_TfwUa4uOk-lUrW_OBf4tV6QJPsCO0iS0Y";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ================= AUTH ================= */
async function register(){
  const email = email.value;
  const password = password.value;
  const { error } = await sb.auth.signUp({ email, password });
  msg.innerText = error ? error.message : "Daftar berhasil, silakan login";
}

async function loginUser(){
  const { error } = await sb.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if(error) msg.innerText = error.message;
  else start();
}

async function logout(){
  await sb.auth.signOut();
  location.reload();
}

/* ================= APP ================= */
async function start(){
  login.style.display="none";
  app.style.display="block";
  loadData();
}

async function loadData(){
  const { data } = await sb.from("transaksi").select("*").order("tanggal",{ascending:false});
  let masuk=0, keluar=0;
  list.innerHTML="";
  data.forEach(d=>{
    if(d.jenis==="Uang Masuk") masuk+=d.jumlah;
    else keluar+=d.jumlah;
    list.innerHTML+=`<tr>
      <td>${d.tanggal}</td>
      <td>${d.jenis}</td>
      <td>Rp ${d.jumlah.toLocaleString()}</td>
    </tr>`;
  });
  saldo.innerText="Rp "+(masuk-keluar).toLocaleString();
  masukEl.innerText="Rp "+masuk.toLocaleString();
  keluarEl.innerText="Rp "+keluar.toLocaleString();
}

/* ================= ADD ================= */
async function add(){
  const { data:{user} } = await sb.auth.getUser();
  const jumlah = Number(jumlahEl.value);
  await sb.from("transaksi").insert([{
    user_id:user.id,
    tanggal:new Date().toISOString().slice(0,10),
    jenis:jenis.value,
    jumlah,
    catatan:catatan.value
  }]);
  loadData();
}

/* ================= AUTO LOGIN ================= */
sb.auth.getSession().then(r=>{
  if(r.data.session) start();
});
</script>

</body>
</html>
