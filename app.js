const $ = (s) => document.querySelector(s);
const el = (id) => document.getElementById(id);
const val = (id) => (el(id) || {}).value || '';
const set = (id, h) => { const e = el(id); if (e) e.innerHTML = h; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = document.body.dataset.page;

/* ---------- Data (disimpan di localStorage browser) ---------- */
const db = {};
['genre', 'koleksi', 'teman', 'pinjam'].forEach((k) => (db[k] = JSON.parse(localStorage.getItem(k) || '[]')));
function persist(k) { localStorage.setItem(k, JSON.stringify(db[k])); }
if (localStorage.getItem('genre') === null) {
  db.genre = ['Shonen', 'Fantasi', 'Misteri'].map((nama) => ({ id: uid(), nama }));
  persist('genre');
}
const kol = (id) => db.koleksi.find((x) => x.id === id) || {};
const tem = (id) => db.teman.find((x) => x.id === id) || {};
const gen = (id) => (db.genre.find((x) => x.id === id) || {}).nama || '-';
const norm = (s) => (s === 'Dikembalikan' ? 'Tersedia' : s);
const badge = (s) => `<span class="badge text-bg-${norm(s) === 'Tersedia' ? 'success' : 'warning'}">${s}</span>`;
const row = (...c) => '<tr>' + c.map((x) => `<td>${x}</td>`).join('') + '</tr>';
const opts = (list, label, first) => `<option value="">${first || 'Pilih...'}</option>` +
  list.map((x) => `<option value="${x.id}">${esc(label(x))}</option>`).join('');
const act = (ent, id) => `<div class="text-end text-nowrap"><button class="btn btn-outline-secondary btn-sm" onclick="openForm('${ent}','${id}')">Ubah</button>
  <button class="btn btn-outline-danger btn-sm" onclick="del('${ent}','${id}')">Hapus</button></div>`;
const match = (q, ...f) => f.join(' ').toLowerCase().includes(q.toLowerCase());
const users = () => JSON.parse(localStorage.getItem('users') || '[]');

/* ---------- Halaman login & daftar ---------- */
function initAuth() {
  if (localStorage.getItem('session')) return location.replace('dashboard.html');
  if (page === 'login') {
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      if (!users().some((u) => u.email === d.email && u.password === d.password)) return alert('Email atau password salah');
      localStorage.setItem('session', d.email);
      location.href = 'dashboard.html';
    });
  } else {
    $('#registerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      if (d.password.length < 6) return alert('Password minimal 6 karakter');
      if (users().some((u) => u.email === d.email)) return alert('Email sudah terdaftar');
      localStorage.setItem('users', JSON.stringify([...users(), d]));
      alert('Pendaftaran berhasil. Silakan masuk.');
      location.href = 'login.html';
    });
  }
}

/* ---------- Form tambah / ubah ---------- */
function openForm(ent, id) {
  const f = el('f-' + ent);
  f.reset();
  f.elements._id.value = id || '';
  if (ent === 'koleksi') set('kGenre', opts(db.genre, (g) => g.nama));
  if (ent === 'pinjam') {
    set('pKoleksi', opts(db.koleksi.filter((k) => k.status === 'Tersedia'), (k) => k.judul + ' vol. ' + k.vol));
    set('pTeman', opts(db.teman, (t) => t.nama));
  }
  if (id) { const it = db[ent].find((x) => x.id === id); Object.keys(it).forEach((k) => { if (f.elements[k]) f.elements[k].value = it[k]; }); }
  bootstrap.Modal.getOrCreateInstance('#m-' + ent).show();
}
function bindForms() {
  document.querySelectorAll('form[data-ent]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const ent = f.dataset.ent, d = Object.fromEntries(new FormData(f)), id = d._id;
    delete d._id;
    if (id) Object.assign(db[ent].find((x) => x.id === id), d);
    else {
      d.id = uid();
      if (ent === 'koleksi') d.status = 'Tersedia';
      if (ent === 'pinjam') { d.kembali = ''; d.status = 'Dipinjam'; setStatus(d.koleksi, 'Dipinjam'); }
      db[ent].push(d);
    }
    persist(ent);
    bootstrap.Modal.getInstance('#m-' + ent).hide();
    render();
  }));
}
function setStatus(id, s) { const k = db.koleksi.find((x) => x.id === id); if (k) { k.status = s; persist('koleksi'); } }
function del(ent, id) {
  if (!confirm('Hapus data ini?')) return;
  if (ent === 'pinjam') { const p = db.pinjam.find((x) => x.id === id); if (p.status === 'Dipinjam') setStatus(p.koleksi, 'Tersedia'); }
  db[ent] = db[ent].filter((x) => x.id !== id);
  persist(ent);
  render();
}
function kembali(id) {
  const p = db.pinjam.find((x) => x.id === id);
  p.kembali = new Date().toISOString().slice(0, 10);
  p.status = 'Dikembalikan';
  setStatus(p.koleksi, 'Tersedia');
  persist('pinjam');
  render();
}

/* ---------- Tampilan tabel (hanya mengisi elemen yang ada di halaman ini) ---------- */
function render() {
  const dipinjam = db.pinjam.filter((p) => p.status === 'Dipinjam');
  set('stTotal', db.koleksi.length);
  set('stSedia', db.koleksi.filter((k) => k.status === 'Tersedia').length);
  set('stPinjam', dipinjam.length);
  set('stTeman', db.teman.length);
  set('tDash', dipinjam.map((p) => row(esc(kol(p.koleksi).judul), esc(tem(p.teman).nama), p.pinjam)).join(''));

  set('tGenre', db.genre.filter((g) => match(val('qGenre'), g.nama)).map((g) => row(esc(g.nama), act('genre', g.id))).join(''));

  set('tKoleksi', db.koleksi
    .filter((k) => match(val('qKoleksi'), k.judul, k.penulis) && (!val('sKoleksi') || k.status === val('sKoleksi')))
    .map((k) => row(esc(k.judul), esc(k.penulis), esc(gen(k.genre)), k.vol, k.tahun, k.kondisi, badge(k.status), act('koleksi', k.id))).join(''));

  set('tTeman', db.teman.filter((t) => match(val('qTeman'), t.nama, t.hp))
    .map((t) => row(esc(t.nama), esc(t.hp), act('teman', t.id))).join(''));

  set('tPinjam', db.pinjam
    .filter((p) => match(val('qPinjam'), kol(p.koleksi).judul, tem(p.teman).nama) && (!val('sPinjam') || p.status === val('sPinjam')))
    .map((p) => row(esc(kol(p.koleksi).judul), esc(tem(p.teman).nama), p.pinjam, p.kembali || '-', badge(p.status),
      `<div class="text-end text-nowrap">${p.status === 'Dipinjam' ? `<button class="btn btn-outline-success btn-sm" onclick="kembali('${p.id}')">Kembalikan</button> ` : ''}
      <button class="btn btn-outline-danger btn-sm" onclick="del('pinjam','${p.id}')">Hapus</button></div>`)).join(''));

  if (el('rRekap')) renderLaporan();
}

/* ---------- Laporan ---------- */
function renderLaporan() {
  const g = val('rGenre'), s = val('rStatus'), t = val('rTeman'), d1 = val('rDari'), d2 = val('rSampai');
  const pj = db.pinjam.filter((p) => (!g || kol(p.koleksi).genre === g) && (!t || p.teman === t) && (!s || norm(p.status) === s)
    && (!d1 || p.pinjam >= d1) && (!d2 || p.pinjam <= d2));
  const info = (p) => { const k = kol(p.koleksi); return [esc(k.judul), esc(k.penulis), k.vol, k.tahun, esc(gen(k.genre))]; };
  set('rRekap', db.koleksi.filter((k) => (!g || k.genre === g) && (!s || k.status === s))
    .map((k) => row(esc(k.judul), esc(gen(k.genre)), badge(k.status))).join(''));
  set('rBuku', pj.filter((p) => p.status === 'Dipinjam').map((p) => row(...info(p), badge(p.status))).join(''));
  set('rRiwayat', pj.map((p) => row(...info(p), p.pinjam, p.kembali || '-', badge(p.status))).join(''));
}

/* ---------- Mulai ---------- */
function init() {
  el('logout').addEventListener('click', () => localStorage.removeItem('session'));
  bindForms();
  ['qGenre', 'qKoleksi', 'sKoleksi', 'qTeman', 'qPinjam', 'sPinjam'].forEach((id) => el(id) && el(id).addEventListener('input', render));
  if (page === 'laporan') {
    set('rGenre', opts(db.genre, (g) => g.nama, 'Semua genre'));
    set('rTeman', opts(db.teman, (t) => t.nama, 'Semua teman'));
    el('btnLap').addEventListener('click', renderLaporan);
  }
  render();
}
if (page === 'login' || page === 'daftar') initAuth();
else if (!localStorage.getItem('session')) location.replace('login.html');
else init();