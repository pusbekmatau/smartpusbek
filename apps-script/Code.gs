/**
 * SMART PUSBEKMATAU — backend (Google Apps Script Web App)
 *
 * Situs di GitHub Pages hanya statis. Semua yang butuh "server" dikerjakan di sini:
 *   - login + sesi bertanda tangan (HMAC), peran ADMIN / OPERATOR / VIEWER
 *   - baca / tambah / ubah / hapus baris pada 17 modul data (spreadsheet Google)
 *   - manajemen pengguna dan log audit (disimpan di spreadsheet DB yang dibuat otomatis)
 *
 * Cara pasang: lihat apps-script/README.md. Ringkas:
 *   1. Buat proyek di script.google.com, tempel file ini, lalu jalankan fungsi setup() satu kali.
 *   2. Deploy > Aplikasi web > Jalankan sebagai: Saya, Akses: Siapa saja.
 *   3. Salin URL /exec ke variabel GitHub "APPS_SCRIPT_URL".
 *
 * Akun yang menjalankan script HARUS punya hak edit di semua spreadsheet sumber.
 * File .xlsx yang belum dikonversi harus dibuka lalu "Simpan sebagai Google Spreadsheet".
 */

// ---------------------------------------------------------------------------
// Konfigurasi
// ---------------------------------------------------------------------------

/** slug -> { id: ID spreadsheet, tab: gid tab, title } — sama dengan katalog modul di situs. */
var DATA_SOURCES = {
  'monitoring-2025': { id: '1KtuqQzsME8pzQZtMwb09c5FXsRrvmmfHYRrnFNSjcdw', tab: 1023878405, title: 'Monitoring 2025' },
  'monitoring-2026': { id: '17hhs_95St19RgG4mqXxIwi6fDdFTf98B', tab: 1217200417, title: 'Monitoring 2026' },
  'master-dalang': { id: '1uS69sn_7zFOBMp64jMD3gVVmtTCRmGZVn0FQmf13XYU', tab: 0, title: 'Master Dalang' },
  'master-ip-penerimaan': { id: '1asYL_offGbW4Pb6h6byLA4omK2D18sOqhz12Is9t1TQ', tab: 1979618444, title: 'Master IP Penerimaan' },
  'rekapan-mitra': { id: '1x2yp7HccYocWhfu5eU7kte_BIBYfoj5kMYASjb93qaQ', tab: 1222716579, title: 'Rekapan Mitra 2024–2026' },
  'master-bspm': { id: '1PSWtsmdsXL0tn07PBtQRh-FHVUsxsFnBGHc0qSR_bl4', tab: 79411227, title: 'Master BSPM Setpusbekmatau' },
  'data-warranty': { id: '12fcQ8xRy1V21o0LyvsSHK2HvfUAMDhez', tab: 302098301, title: 'Data Warranty' },
  'data-fms': { id: '1c91_DiGkMgaAXY0JnK8fAGE7aVHQmIVn', tab: 558017458, title: 'Data FMS' },
  'data-sub-transit': { id: '1nkH307o3RVJnHoOZb44dM4MAKpT1cQ_wL-DcdqNVdkc', tab: 0, title: 'Data Sub Transit' },
  'simmat-2021': { id: '1gk7JnJZd-k93YNYNfuOh-lu4ziLhIs8j', tab: 1034752783, title: 'SIMMAT 2021' },
  'simmat-2022': { id: '1X0uHiCHK1UZzhvyxuiXaXJZObmlVJGvd', tab: 1950703423, title: 'SIMMAT 2022' },
  'simmat-2023': { id: '1DUIKofLsxzpP7XqkpgOgiVhuqtxJVZra', tab: 2139274514, title: 'SIMMAT 2023' },
  'simmat-2024': { id: '1c3LJb9YGTUbwCgLArLdu7chIJyPJQAL8', tab: 2139274514, title: 'SIMMAT 2024' },
  'simmat-2025': { id: '19SbYSUOTOnVWUROjY6RaW-C5tLZ5fyKh', tab: 2139274514, title: 'SIMMAT 2025' },
  'simmat-2026': { id: '1twf6c7uhliO1D2gHDPzNOHTIZiCe5Eo4', tab: 2139274514, title: 'SIMMAT 2026' },
  'data-setriksa': { id: '1EyhPolS3uT11v_UhZg9_A9snSq4WEmMhgmizbqddL-U', tab: 1033088967, title: 'Data Setriksa' },
  'ip-bspm-setlurmat': { id: '1LdOGYm6nNvZ_M31HFhlvc86n0trMDE6K-BUDXXw-M-g', tab: 898512136, title: 'IP & BSPM Maju Setlurmat' }
};

var SESSION_TTL_SECONDS = 60 * 60 * 8; // satu shift jaga
var DATA_CACHE_SECONDS = 300;
var PASSWORD_ITERATIONS = 600;
var MAX_LOGIN_FAILURES = 5;
var LOGIN_WINDOW_SECONDS = 600;
var MAX_AUDIT_ROWS_READ = 5000;

var ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];
var PERMISSIONS = {
  ADMIN: ['data:read', 'data:create', 'data:update', 'data:delete', 'data:export', 'data:force-sync', 'users:manage', 'audit:read'],
  OPERATOR: ['data:read', 'data:create', 'data:update', 'data:export'],
  VIEWER: ['data:read', 'data:export']
};
var ROLE_LABEL = { ADMIN: 'Administrator', OPERATOR: 'Operator', VIEWER: 'Viewer' };

var USER_HEADERS = ['id', 'username', 'name', 'role', 'active', 'createdAt', 'updatedAt', 'lastLoginAt', 'salt', 'hash'];
var AUDIT_HEADERS = ['id', 'at', 'actorId', 'actorUsername', 'actorRole', 'action', 'module', 'summary', 'changes'];

// ---------------------------------------------------------------------------
// Pemasangan (jalankan sekali dari editor)
// ---------------------------------------------------------------------------

/**
 * Membuat secret sesi, spreadsheet DB (USERS + AUDIT) dan tiga akun awal.
 * Kata sandi awal dibuat acak dan HANYA ditampilkan di log eksekusi — segera ganti
 * lewat menu Manajemen Pengguna setelah masuk pertama kali.
 */
function setup() {
  var p = props_();
  if (!p.getProperty('AUTH_SECRET')) p.setProperty('AUTH_SECRET', randomString_(48));

  var db;
  var initial = null;
  var dbId = p.getProperty('DB_ID');
  if (dbId) {
    db = SpreadsheetApp.openById(dbId);
  } else {
    db = SpreadsheetApp.create('SMART PUSBEKMATAU - DB (jangan dihapus / dibagikan)');
    p.setProperty('DB_ID', db.getId());
    initial = db.getSheets()[0]; // lembar bawaan, dibuang setelah USERS & AUDIT dibuat
  }
  var users = ensureSheet_(db, 'USERS', USER_HEADERS);
  ensureSheet_(db, 'AUDIT', AUDIT_HEADERS);
  if (initial) db.deleteSheet(initial);

  if (users.getLastRow() < 2) {
    var seeds = [
      { username: 'admin', name: 'Administrator Sistem', role: 'ADMIN' },
      { username: 'operator', name: 'Operator Data', role: 'OPERATOR' },
      { username: 'viewer', name: 'Pengamat Eksekutif', role: 'VIEWER' }
    ];
    var lines = [];
    seeds.forEach(function (s) {
      var password = randomPassword_();
      createUserRow_({ username: s.username, name: s.name, role: s.role, password: password });
      lines.push(s.username + '  /  ' + password + '  (' + s.role + ')');
    });
    Logger.log('AKUN AWAL (catat sekarang, tidak akan ditampilkan lagi):\n' + lines.join('\n'));
  } else {
    Logger.log('Akun sudah ada, tidak ada yang diubah.');
  }
  Logger.log('Spreadsheet DB: ' + db.getUrl());
  Logger.log('Selesai. Lanjut: Deploy > Aplikasi web.');
}

/** Opsional: cek apakah akun script bisa membuka semua spreadsheet sumber. */
function checkSources() {
  Object.keys(DATA_SOURCES).forEach(function (slug) {
    try {
      var rt = readTable_(slug);
      Logger.log('OK    ' + slug + ' — ' + rt.table.rows.length + ' baris, ' + rt.table.columns.length + ' kolom');
    } catch (err) {
      Logger.log('GAGAL ' + slug + ' — ' + (err && err.message ? err.message : err));
    }
  });
}

// ---------------------------------------------------------------------------
// Titik masuk Web App
// ---------------------------------------------------------------------------

function doGet() {
  return json_({ ok: true, data: { name: 'SMART PUSBEKMATAU API', time: new Date().toISOString() } });
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = { ok: true, data: route_(req) };
  } catch (err) {
    if (err instanceof ApiErr) {
      out = { ok: false, error: { status: err.status, code: err.code, message: err.message } };
    } else {
      console.error(err && err.stack ? err.stack : String(err));
      out = {
        ok: false,
        error: { status: 500, code: 'INTERNAL_ERROR', message: 'Terjadi gangguan pada server. Silakan coba kembali.' }
      };
    }
  }
  return json_(out);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ApiErr(status, code, message) {
  this.status = status;
  this.code = code;
  this.message = message;
}
ApiErr.prototype = Object.create(Error.prototype);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function route_(req) {
  var method = String(req.method || 'GET').toUpperCase();
  var path = String(req.path || '');
  var query = req.query || {};
  var body = req.body;

  if (method === 'POST' && path === '/api/auth/login') return login_(body);

  var user = authenticate_(req.token);

  if (method === 'POST' && path === '/api/auth/logout') {
    audit_(user, 'LOGOUT', null, 'Keluar dari Command Center');
    return { ok: true };
  }
  if (method === 'GET' && path === '/api/auth/me') return { user: user };

  if (method === 'GET' && path === '/api/system/status') {
    requirePermission_(user, 'data:read');
    return { mode: 'live', serverTime: new Date().toISOString(), cacheTtlSeconds: DATA_CACHE_SECONDS };
  }
  if (method === 'POST' && path === '/api/system/sync') {
    requirePermission_(user, 'data:force-sync');
    audit_(user, 'FORCE_SYNC', null, 'Sinkronisasi paksa seluruh modul data');
    return { ok: true };
  }

  var m = /^\/api\/database\/([^\/]+)$/.exec(path);
  if (m) return databaseRoute_(user, method, decodeURIComponent(m[1]), query, body);

  if (path === '/api/users') return usersRoute_(user, method, query, body);
  if (method === 'GET' && path === '/api/audit-logs') return auditRoute_(user, query);

  throw new ApiErr(404, 'NOT_FOUND', 'Rute tidak ditemukan.');
}

function requirePermission_(user, permission) {
  if (PERMISSIONS[user.role].indexOf(permission) === -1) {
    throw new ApiErr(403, 'FORBIDDEN', 'Peran Anda tidak memiliki wewenang untuk tindakan ini.');
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function login_(body) {
  var identifier = body && typeof body.identifier === 'string' ? body.identifier.trim() : '';
  var password = body && typeof body.password === 'string' ? body.password : '';
  if (!identifier || !password || identifier.length > 120 || password.length > 200) {
    throw new ApiErr(400, 'INVALID_INPUT', 'Nama pengguna dan kata sandi wajib diisi.');
  }

  var cache = CacheService.getScriptCache();
  var key = 'fail:' + Utilities.base64EncodeWebSafe(identifier.toLowerCase()).slice(0, 80);
  var failures = Number(cache.get(key) || 0);
  if (failures >= MAX_LOGIN_FAILURES) {
    throw new ApiErr(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan. Coba kembali dalam beberapa menit.');
  }

  var rows = loadUsers_();
  var needle = identifier.toLowerCase();
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].username.toLowerCase() === needle) { found = rows[i]; break; }
  }
  // Selalu hitung hash agar waktu respons tidak membocorkan nama pengguna yang valid.
  var computed = hashPassword_(password, found ? found.salt : 'timing-equaliser');
  var ok = found && safeEqual_(computed, found.hash) && found.active;

  if (!ok) {
    cache.put(key, String(failures + 1), LOGIN_WINDOW_SECONDS);
    audit_({ id: null, username: identifier.slice(0, 60), role: null }, 'LOGIN_FAILED', null, 'Percobaan masuk gagal');
    throw new ApiErr(401, 'INVALID_CREDENTIALS', 'Kredensial tidak valid atau akun dinonaktifkan.');
  }

  cache.remove(key);
  try {
    withLock_(function () {
      var sheet = usersSheet_();
      var r = findUserRow_(sheet, found.id);
      if (r > 0) sheet.getRange(r, USER_HEADERS.indexOf('lastLoginAt') + 1).setValue(new Date().toISOString());
      cache.remove('users');
    });
  } catch (err) {
    /* waktu masuk terakhir bersifat informatif; jangan gagalkan login */
  }

  var session = toSession_(found);
  audit_(session, 'LOGIN', null, 'Masuk ke Command Center');
  var exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return { user: session, token: signToken_(session.id, exp), expiresAt: exp };
}

function authenticate_(token) {
  var fail = function () {
    throw new ApiErr(401, 'UNAUTHENTICATED', 'Sesi Anda telah berakhir. Silakan masuk kembali.');
  };
  if (typeof token !== 'string' || token.indexOf('.') === -1) fail();
  var parts = token.split('.');
  if (parts.length !== 2) fail();
  var expected = hmac_(parts[0]);
  if (!safeEqual_(expected, parts[1])) fail();
  var payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(padB64_(parts[0]))).getDataAsString());
  } catch (err) {
    fail();
  }
  if (!payload || typeof payload.sub !== 'string' || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) fail();
  var rows = loadUsers_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === payload.sub) {
      if (!rows[i].active) fail();
      return toSession_(rows[i]);
    }
  }
  return fail();
}

function signToken_(userId, exp) {
  var body = stripPad_(Utilities.base64EncodeWebSafe(JSON.stringify({ sub: userId, exp: exp })));
  return body + '.' + hmac_(body);
}

function hmac_(value) {
  var secret = props_().getProperty('AUTH_SECRET');
  if (!secret) throw new Error('AUTH_SECRET belum dibuat. Jalankan setup().');
  return stripPad_(Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(value, secret)));
}

function hashPassword_(password, salt) {
  var pw = Utilities.newBlob(password).getBytes();
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.newBlob(salt + ':' + password).getBytes());
  for (var i = 0; i < PASSWORD_ITERATIONS; i++) {
    d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d.concat(pw));
  }
  return d
    .map(function (b) { return ((b & 0xff) + 0x100).toString(16).slice(1); })
    .join('');
}

function safeEqual_(a, b) {
  a = String(a);
  b = String(b);
  var diff = a.length ^ b.length;
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function padB64_(s) {
  while (s.length % 4 !== 0) s += '=';
  return s;
}

function stripPad_(s) {
  return s.replace(/=+$/, '');
}

function randomString_(n) {
  var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var out = '';
  while (out.length < n) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function randomPassword_() {
  // Dijamin memuat huruf dan angka (memenuhi aturan kata sandi).
  return randomString_(10) + 'a1' + randomString_(2);
}

function toSession_(u) {
  return { id: u.id, username: u.username, name: u.name, role: u.role };
}

// ---------------------------------------------------------------------------
// Penyimpanan DB (USERS, AUDIT)
// ---------------------------------------------------------------------------

function props_() {
  return PropertiesService.getScriptProperties();
}

function db_() {
  var id = props_().getProperty('DB_ID');
  if (!id) throw new Error('DB belum dibuat. Jalankan setup().');
  return SpreadsheetApp.openById(id);
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  // Format teks agar ISO-date, hash heksadesimal, dan TRUE/FALSE tidak diubah oleh Sheets.
  sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).setNumberFormat('@');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

/** Menambah satu baris di bawah data terakhir; memperluas lembar bila sudah penuh. */
function appendRow_(sheet, values) {
  var row = sheet.getLastRow() + 1;
  if (row > sheet.getMaxRows()) {
    var add = 1000;
    sheet.insertRowsAfter(sheet.getMaxRows(), add);
    sheet.getRange(row, 1, add, values.length).setNumberFormat('@');
  }
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
}

function usersSheet_() {
  return db_().getSheetByName('USERS');
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function loadUsers_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('users');
  if (hit) return JSON.parse(hit);
  var sheet = usersSheet_();
  var last = sheet.getLastRow();
  var rows = [];
  if (last >= 2) {
    var values = sheet.getRange(2, 1, last - 1, USER_HEADERS.length).getValues();
    values.forEach(function (v) {
      if (!v[0]) return;
      var u = {};
      USER_HEADERS.forEach(function (h, i) { u[h] = String(v[i] == null ? '' : v[i]); });
      u.active = u.active.toUpperCase() === 'TRUE';
      u.lastLoginAt = u.lastLoginAt || null;
      rows.push(u);
    });
  }
  try { cache.put('users', JSON.stringify(rows), 120); } catch (err) { /* abaikan */ }
  return rows;
}

function findUserRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function publicUser_(u) {
  return {
    id: u.id, username: u.username, name: u.name, role: u.role, active: u.active,
    createdAt: u.createdAt, updatedAt: u.updatedAt, lastLoginAt: u.lastLoginAt || null
  };
}

function userToRow_(u) {
  return USER_HEADERS.map(function (h) {
    if (h === 'active') return u.active ? 'TRUE' : 'FALSE';
    return u[h] == null ? '' : u[h];
  });
}

function createUserRow_(input) {
  var salt = randomString_(16);
  var now = new Date().toISOString();
  var user = {
    id: Utilities.getUuid(),
    username: input.username.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    active: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    salt: salt,
    hash: hashPassword_(input.password, salt)
  };
  appendRow_(usersSheet_(), userToRow_(user));
  CacheService.getScriptCache().remove('users');
  return user;
}

function audit_(actor, action, module, summary, changes) {
  try {
    var sheet = db_().getSheetByName('AUDIT');
    var changesText = changes && Object.keys(changes).length ? JSON.stringify(changes) : '';
    if (changesText.length > 40000) changesText = changesText.slice(0, 40000);
    var row = [
      Utilities.getUuid(), new Date().toISOString(), actor.id || '', actor.username || '', actor.role || '',
      action, module || '', String(summary || '').slice(0, 1000), changesText
    ];
    appendRow_(sheet, row);
  } catch (err) {
    // Audit tidak boleh menggagalkan operasi utama.
    console.error('[audit] ' + (err && err.message ? err.message : err));
  }
}

function auditRoute_(user, query) {
  requirePermission_(user, 'audit:read');
  var limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
  var offset = Math.max(0, Number(query.offset) || 0);
  var sheet = db_().getSheetByName('AUDIT');
  var last = sheet.getLastRow();
  var entries = [];
  if (last >= 2) {
    var first = Math.max(2, last - MAX_AUDIT_ROWS_READ + 1);
    var values = sheet.getRange(first, 1, last - first + 1, AUDIT_HEADERS.length).getValues();
    for (var i = values.length - 1; i >= 0; i--) { // terbaru lebih dulu
      var v = values[i];
      var entry = {
        id: String(v[0]),
        at: String(v[1]),
        actor: { id: v[2] ? String(v[2]) : null, username: String(v[3]), role: v[4] ? String(v[4]) : null },
        action: String(v[5]),
        module: v[6] ? String(v[6]) : null,
        summary: String(v[7])
      };
      if (v[8]) {
        try { entry.changes = JSON.parse(String(v[8])); } catch (err) { /* abaikan */ }
      }
      entries.push(entry);
    }
  }
  var q = String(query.q || '').trim().toLowerCase();
  var filtered = entries.filter(function (e) {
    return (!query.action || e.action === query.action) &&
      (!query.module || e.module === query.module) &&
      (!q || e.summary.toLowerCase().indexOf(q) !== -1 || e.actor.username.toLowerCase().indexOf(q) !== -1);
  });
  return { total: filtered.length, entries: filtered.slice(offset, offset + limit) };
}

// ---------------------------------------------------------------------------
// Manajemen pengguna
// ---------------------------------------------------------------------------

function validatePassword_(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw new ApiErr(400, 'INVALID_INPUT', 'Kata sandi minimal 10 karakter.');
  if (pw.length > 200) throw new ApiErr(400, 'INVALID_INPUT', 'Kata sandi terlalu panjang.');
  if (!/[A-Za-z]/.test(pw)) throw new ApiErr(400, 'INVALID_INPUT', 'Kata sandi harus memuat huruf.');
  if (!/\d/.test(pw)) throw new ApiErr(400, 'INVALID_INPUT', 'Kata sandi harus memuat angka.');
}

function validateName_(name) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    throw new ApiErr(400, 'INVALID_INPUT', 'Nama minimal 2 dan maksimal 80 karakter.');
  }
}

function validateRole_(role) {
  if (ROLES.indexOf(role) === -1) throw new ApiErr(400, 'INVALID_INPUT', 'Peran tidak valid.');
}

function activeAdmins_(users) {
  return users.filter(function (u) { return u.role === 'ADMIN' && u.active; }).length;
}

function usersRoute_(user, method, query, body) {
  requirePermission_(user, 'users:manage');
  body = body || {};

  if (method === 'GET') return { users: loadUsers_().map(publicUser_) };

  if (method === 'POST') {
    var username = typeof body.username === 'string' ? body.username.trim() : '';
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
      throw new ApiErr(400, 'INVALID_INPUT', 'Nama pengguna 3–40 karakter: huruf, angka, titik, garis bawah, atau strip.');
    }
    validateName_(body.name);
    validateRole_(body.role);
    validatePassword_(body.password);
    return withLock_(function () {
      var users = loadUsers_();
      if (users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) {
        throw new ApiErr(409, 'DUPLICATE', 'Nama pengguna telah terdaftar.');
      }
      var created = createUserRow_({ username: username, name: body.name, role: body.role, password: body.password });
      audit_(user, 'USER_CREATE', null, 'Membuat akun ' + created.username + ' (' + ROLE_LABEL[created.role] + ')');
      return { user: publicUser_(created) };
    });
  }

  if (method === 'PATCH') {
    var id = typeof body.id === 'string' ? body.id : '';
    if (!id) throw new ApiErr(400, 'INVALID_INPUT', 'ID akun tidak valid.');
    if (body.name !== undefined) validateName_(body.name);
    if (body.role !== undefined) validateRole_(body.role);
    if (body.active !== undefined && typeof body.active !== 'boolean') throw new ApiErr(400, 'INVALID_INPUT', 'Status akun tidak valid.');
    if (body.password !== undefined) validatePassword_(body.password);

    return withLock_(function () {
      var sheet = usersSheet_();
      CacheService.getScriptCache().remove('users');
      var users = loadUsers_();
      var target = users.filter(function (u) { return u.id === id; })[0];
      if (!target) throw new ApiErr(404, 'NOT_FOUND', 'Akun tidak ditemukan.');
      var before = publicUser_(target);
      var demotes = (body.role !== undefined && body.role !== 'ADMIN') || body.active === false;
      if (target.role === 'ADMIN' && target.active && demotes && activeAdmins_(users) <= 1) {
        throw new ApiErr(409, 'LAST_ADMIN', 'Minimal harus tersisa satu Administrator aktif.');
      }
      if (id === user.id && body.active === false) {
        throw new ApiErr(409, 'SELF_ACTION', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
      }
      if (body.name !== undefined) target.name = body.name.trim();
      if (body.role !== undefined) target.role = body.role;
      if (body.active !== undefined) target.active = body.active;
      if (body.password !== undefined) {
        target.salt = randomString_(16);
        target.hash = hashPassword_(body.password, target.salt);
      }
      target.updatedAt = new Date().toISOString();
      var row = findUserRow_(sheet, id);
      sheet.getRange(row, 1, 1, USER_HEADERS.length).setValues([userToRow_(target)]);
      CacheService.getScriptCache().remove('users');

      var after = publicUser_(target);
      var notes = [];
      if (body.role !== undefined && before.role !== after.role) notes.push('peran ' + ROLE_LABEL[before.role] + ' → ' + ROLE_LABEL[after.role]);
      if (body.active !== undefined && before.active !== after.active) notes.push(after.active ? 'diaktifkan' : 'dinonaktifkan');
      if (body.password !== undefined) notes.push('kata sandi diatur ulang');
      if (body.name !== undefined && before.name !== after.name) notes.push('nama diperbarui');
      audit_(user, 'USER_UPDATE', null, 'Akun ' + after.username + ': ' + (notes.join(', ') || 'tanpa perubahan'));
      return { user: after };
    });
  }

  if (method === 'DELETE') {
    var delId = String(query.id || '');
    if (!delId) throw new ApiErr(400, 'INVALID_INPUT', 'ID akun tidak valid.');
    return withLock_(function () {
      var sheet = usersSheet_();
      CacheService.getScriptCache().remove('users');
      var users = loadUsers_();
      var target = users.filter(function (u) { return u.id === delId; })[0];
      if (!target) throw new ApiErr(404, 'NOT_FOUND', 'Akun tidak ditemukan.');
      if (delId === user.id) throw new ApiErr(409, 'SELF_ACTION', 'Anda tidak dapat menghapus akun Anda sendiri.');
      var remaining = users.filter(function (u) { return u.id !== delId; });
      if (target.role === 'ADMIN' && target.active && activeAdmins_(remaining) < 1) {
        throw new ApiErr(409, 'LAST_ADMIN', 'Minimal harus tersisa satu Administrator aktif.');
      }
      sheet.deleteRow(findUserRow_(sheet, delId));
      CacheService.getScriptCache().remove('users');
      audit_(user, 'USER_DELETE', null, 'Menghapus akun ' + target.username);
      return { ok: true };
    });
  }

  throw new ApiErr(405, 'METHOD_NOT_ALLOWED', 'Metode tidak didukung.');
}

// ---------------------------------------------------------------------------
// Data: pembacaan tabel spreadsheet
// ---------------------------------------------------------------------------

var RESTRICTED_MESSAGE =
  'Koneksi ke modul basis data ini sedang dibatasi oleh server. Silakan lakukan sinkronisasi ulang atau hubungi Administrator.';

function source_(slug) {
  var src = DATA_SOURCES[slug];
  if (!src) throw new ApiErr(404, 'MODULE_NOT_FOUND', 'Modul data tidak ditemukan.');
  return src;
}

function columnLetter_(index) {
  var n = index + 1;
  var out = '';
  while (n > 0) {
    var rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function isBlankRow_(row) {
  return row.every(function (c) { return !c || !String(c).trim(); });
}

/** Memilih baris judul: baris pertama (dari 15 teratas) yang banyak terisi dan bukan angka. */
function detectHeaderRow_(grid) {
  var width = 0;
  grid.slice(0, 50).forEach(function (r) {
    var filled = r.filter(function (c) { return String(c).trim(); }).length;
    if (filled > width) width = filled;
  });
  var best = 0;
  var bestScore = -1;
  for (var i = 0; i < Math.min(grid.length, 15); i++) {
    var cells = grid[i].map(function (c) { return String(c).trim(); }).filter(Boolean);
    if (cells.length < Math.max(2, Math.ceil(width * 0.5))) continue;
    var textual = cells.filter(function (c) { return !/^[\d.,\s%-]+$/.test(c); }).length;
    var score = cells.length + textual * 2;
    if (score > bestScore) { best = i; bestScore = score; }
    if (cells.length >= width * 0.8 && textual >= cells.length * 0.7) return i;
  }
  return best;
}

function normaliseGrid_(grid) {
  var clean = grid.map(function (r) { return r.map(function (c) { return String(c == null ? '' : c).replace(/\r/g, ''); }); });
  if (clean.length === 0) return { columns: [], columnIndex: [], headerRow: 1, rows: [] };

  var headerIdx = detectHeaderRow_(clean);
  var header = clean[headerIdx] || [];
  var body = clean.slice(headerIdx + 1);
  var width = header.length;
  body.forEach(function (r) { if (r.length > width) width = r.length; });

  var used = {};
  var columns = [];
  var columnIndex = [];
  for (var c = 0; c < width; c++) {
    var label = String(header[c] == null ? '' : header[c]).replace(/\s+/g, ' ').trim();
    var hasData = body.some(function (r) { return String(r[c] == null ? '' : r[c]).trim(); });
    if (!label && !hasData) continue;
    var name = label || 'Kolom ' + columnLetter_(c);
    var lower = name.toLowerCase();
    var seen = used[lower] || 0;
    used[lower] = seen + 1;
    if (seen > 0) name = name + ' (' + (seen + 1) + ')';
    columns.push(name);
    columnIndex.push(c);
  }

  var rows = [];
  body.forEach(function (raw, i) {
    if (isBlankRow_(raw)) return;
    var values = {};
    columns.forEach(function (name, k) {
      values[name] = String(raw[columnIndex[k]] == null ? '' : raw[columnIndex[k]]).trim();
    });
    rows.push({ id: 'r' + (headerIdx + 2 + i), values: values });
  });
  return { columns: columns, columnIndex: columnIndex, headerRow: headerIdx + 1, rows: rows };
}

function openSheet_(slug) {
  var src = source_(slug);
  try {
    var ss = SpreadsheetApp.openById(src.id);
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) if (sheets[i].getSheetId() === src.tab) return sheets[i];
    return sheets[0];
  } catch (err) {
    console.error('[data] gagal membuka ' + slug + ': ' + (err && err.message ? err.message : err));
    throw new ApiErr(502, 'SOURCE_RESTRICTED', RESTRICTED_MESSAGE);
  }
}

/** Baca langsung dari spreadsheet (tanpa cache) — dipakai untuk semua operasi tulis. */
function readTable_(slug) {
  var sheet = openSheet_(slug);
  var grid;
  try {
    var range = sheet.getDataRange();
    grid = range.getNumRows() > 0 && range.getNumColumns() > 0 ? range.getDisplayValues() : [];
  } catch (err) {
    console.error('[data] gagal membaca ' + slug + ': ' + (err && err.message ? err.message : err));
    throw new ApiErr(502, 'SOURCE_RESTRICTED', RESTRICTED_MESSAGE);
  }
  return { sheet: sheet, table: normaliseGrid_(grid) };
}

// Cache terkompresi (gzip + base64) dalam potongan <= 90 KB per kunci.
function cachePut_(key, obj, ttl) {
  try {
    var gz = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(obj), 'application/octet-stream')).getBytes());
    var size = 90000;
    var n = Math.ceil(gz.length / size);
    if (n > 15) return; // terlalu besar untuk cache; baca langsung saja
    var entries = {};
    entries[key + ':n'] = String(n);
    for (var i = 0; i < n; i++) entries[key + ':' + i] = gz.substr(i * size, size);
    CacheService.getScriptCache().putAll(entries, ttl);
  } catch (err) {
    /* cache bersifat opsional */
  }
}

function cacheGet_(key) {
  try {
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get(key + ':n') || 0);
    if (!n) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(key + ':' + i);
    var got = cache.getAll(keys);
    var gz = '';
    for (var j = 0; j < n; j++) {
      if (!got[keys[j]]) return null;
      gz += got[keys[j]];
    }
    var blob = Utilities.newBlob(Utilities.base64Decode(gz), 'application/x-gzip');
    return JSON.parse(Utilities.ungzip(blob).getDataAsString());
  } catch (err) {
    return null;
  }
}

function cacheDrop_(key) {
  CacheService.getScriptCache().remove(key + ':n');
}

function loadDataset_(slug, force) {
  var key = 'ds:' + slug;
  if (!force) {
    var hit = cacheGet_(key);
    if (hit) return { columns: hit.columns, rows: hit.rows, syncedAt: hit.syncedAt, cached: true };
  }
  var rt = readTable_(slug);
  var entry = { columns: rt.table.columns, rows: rt.table.rows, syncedAt: new Date().toISOString() };
  cachePut_(key, entry, DATA_CACHE_SECONDS);
  return { columns: entry.columns, rows: entry.rows, syncedAt: entry.syncedAt, cached: false };
}

// ---------------------------------------------------------------------------
// Data: rute /api/database/:slug
// ---------------------------------------------------------------------------

function sanitiseValues_(columns, values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new ApiErr(400, 'INVALID_INPUT', 'Struktur data entri tidak valid.');
  }
  var out = {};
  Object.keys(values).forEach(function (key) {
    var v = values[key];
    if (key.length > 200 || !(v === null || typeof v === 'string' || typeof v === 'number')) {
      throw new ApiErr(400, 'INVALID_INPUT', 'Struktur data entri tidak valid.');
    }
    if (columns.indexOf(key) === -1) {
      throw new ApiErr(400, 'INVALID_COLUMN', 'Kolom "' + key + '" tidak dikenal pada modul ini.');
    }
    out[key] = v === null ? '' : String(v).slice(0, 5000);
  });
  return out;
}

/** Menetralkan injeksi rumus: teks yang diawali = + - @ ditulis sebagai teks biasa. */
function cellValue_(value) {
  var s = String(value);
  if (/^[=+\-@]/.test(s) && !/^-\d+([.,]\d+)?$/.test(s)) return "'" + s;
  if (/^0\d/.test(s)) return "'" + s; // pertahankan nol di depan (mis. nomor telepon / kode)
  return s;
}

function rowNumberOf_(rowId) {
  var m = /^r(\d+)$/.exec(String(rowId));
  return m ? Number(m[1]) : null;
}

function databaseRoute_(user, method, slug, query, body) {
  var src = source_(slug);
  var title = src.title;
  body = body || {};

  if (method === 'GET') {
    requirePermission_(user, 'data:read');
    var force = query.refresh === '1' && PERMISSIONS[user.role].indexOf('data:force-sync') !== -1;
    var ds = loadDataset_(slug, force);
    if (force && query.quiet !== '1') audit_(user, 'FORCE_SYNC', slug, 'Sinkronisasi paksa modul ' + title);
    return {
      slug: slug, title: title, columns: ds.columns, rows: ds.rows,
      meta: { mode: 'live', syncedAt: ds.syncedAt, cached: ds.cached, rowCount: ds.rows.length }
    };
  }

  if (method === 'POST') {
    requirePermission_(user, 'data:create');
    return withLock_(function () {
      var rt = readTable_(slug);
      var values = sanitiseValues_(rt.table.columns, body.values);
      var full = {};
      rt.table.columns.forEach(function (c) { full[c] = values[c] !== undefined ? values[c] : ''; });

      var width = Math.max.apply(null, rt.table.columnIndex.concat([0])) + 1;
      var line = [];
      for (var i = 0; i < width; i++) line.push('');
      rt.table.columns.forEach(function (c, k) { line[rt.table.columnIndex[k]] = full[c] === '' ? '' : cellValue_(full[c]); });

      var sheet = rt.sheet;
      var rowNumber = Math.max(sheet.getLastRow(), rt.table.headerRow) + 1;
      if (rowNumber > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rowNumber - sheet.getMaxRows());
      sheet.getRange(rowNumber, 1, 1, width).setValues([line]);
      SpreadsheetApp.flush();
      cacheDrop_('ds:' + slug);

      var row = { id: 'r' + rowNumber, values: full };
      var changes = {};
      Object.keys(row.values).forEach(function (k) { if (row.values[k]) changes[k] = { before: null, after: row.values[k] }; });
      audit_(user, 'RECORD_CREATE', slug, 'Menambahkan entri baru pada ' + title, changes);
      return { row: row, syncedAt: new Date().toISOString() };
    });
  }

  if (method === 'PATCH') {
    requirePermission_(user, 'data:update');
    var rowId = typeof body.rowId === 'string' ? body.rowId : '';
    if (!rowId || !body.values || Object.keys(body.values).length === 0) {
      throw new ApiErr(400, 'INVALID_INPUT', 'Permintaan pembaruan tidak valid.');
    }
    return withLock_(function () {
      var rt = readTable_(slug);
      var rowNumber = rowNumberOf_(rowId);
      var before = rt.table.rows.filter(function (r) { return r.id === rowId; })[0];
      if (!rowNumber || !before) {
        throw new ApiErr(404, 'ROW_NOT_FOUND', 'Baris data tidak ditemukan atau telah berubah. Lakukan sinkronisasi ulang.');
      }
      var patch = sanitiseValues_(rt.table.columns, body.values);
      Object.keys(patch).forEach(function (col) {
        var colIdx = rt.table.columnIndex[rt.table.columns.indexOf(col)];
        rt.sheet.getRange(rowNumber, colIdx + 1).setValue(patch[col] === '' ? '' : cellValue_(patch[col]));
      });
      SpreadsheetApp.flush();
      cacheDrop_('ds:' + slug);

      var afterValues = {};
      Object.keys(before.values).forEach(function (k) { afterValues[k] = before.values[k]; });
      Object.keys(patch).forEach(function (k) { afterValues[k] = patch[k]; });
      var after = { id: rowId, values: afterValues };
      var changes = {};
      Object.keys(patch).forEach(function (k) {
        if (before.values[k] !== after.values[k]) changes[k] = { before: before.values[k] === undefined ? null : before.values[k], after: after.values[k] };
      });
      audit_(user, 'RECORD_UPDATE', slug,
        'Memperbarui ' + Object.keys(changes).length + ' sel pada ' + title + ' (baris ' + rowId + ')', changes);
      return { row: after, syncedAt: new Date().toISOString() };
    });
  }

  if (method === 'DELETE') {
    requirePermission_(user, 'data:delete');
    var delId = typeof body.rowId === 'string' ? body.rowId : '';
    if (!delId) throw new ApiErr(400, 'INVALID_INPUT', 'Permintaan penghapusan tidak valid.');
    return withLock_(function () {
      var rt = readTable_(slug);
      var rowNumber = rowNumberOf_(delId);
      var target = rt.table.rows.filter(function (r) { return r.id === delId; })[0];
      if (!rowNumber || !target) {
        throw new ApiErr(404, 'ROW_NOT_FOUND', 'Baris data tidak ditemukan atau telah dihapus.');
      }
      rt.sheet.deleteRow(rowNumber);
      SpreadsheetApp.flush();
      cacheDrop_('ds:' + slug);
      var changes = {};
      Object.keys(target.values).forEach(function (k) { if (target.values[k]) changes[k] = { before: target.values[k], after: null }; });
      audit_(user, 'RECORD_DELETE', slug, 'Menghapus baris ' + delId + ' dari ' + title, changes);
      return { ok: true, rowId: delId };
    });
  }

  throw new ApiErr(405, 'METHOD_NOT_ALLOWED', 'Metode tidak didukung.');
}
