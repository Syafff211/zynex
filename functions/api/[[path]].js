// ============================================================
// Cloudflare Pages Functions
// Binding KV: variable name = "ZYNEX_KV"
// Pages > Settings > Functions > KV namespace bindings
// ============================================================

// Helper: hash password dengan SHA-256 (sederhana, untuk produksi gunakan bcrypt di Wasm)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_zynex_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: generate token session acak
function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: parse data user dari KV value
function parseUserData(raw) {
  const lines = raw.split('\n');
  const data = {};
  lines.forEach(line => {
    const match = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (match) data[match[1]] = match[2].trim();
  });
  return data;
}

// Helper: response JSON
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

// Helper: verifikasi token dari request
async function verifyToken(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const sessionData = await env.ZYNEX_KV.get(`session:${token}`);
  if (!sessionData) return null;
  try { return JSON.parse(sessionData); } catch { return null; }
}


// ============================================================
// OPTIONS — untuk CORS preflight
// ============================================================
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}


// ============================================================
// GET requests
// ============================================================
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // ---- Cek Ketersediaan Username ----
  if (path === '/check-username') {
    const username = url.searchParams.get('u');
    if (!username || username.length < 3) {
      return json({ available: false, message: 'Username terlalu pendek' });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return json({ available: false, message: 'Format username tidak valid' });
    }
    const existing = await context.env.ZYNEX_KV.get(`user:${username}`);
    return json({ available: !existing, message: existing ? 'Username sudah digunakan' : 'Username tersedia' });
  }

  // ---- Download file .txt user ----
  if (path.startsWith('/user/')) {
    const username = path.split('/user/')[1];
    if (!username) return json({ error: 'Username diperlukan' }, 400);
    const data = await context.env.ZYNEX_KV.get(`user:${username}`);
    if (!data) return json({ error: 'User tidak ditemukan' }, 404);
    return new Response(data, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${username}.txt"`
      }
    });
  }

  // ---- Ambil data user yang sedang login ----
  if (path === '/me') {
    const session = await verifyToken(context.request, context.env);
    if (!session) return json({ success: false, message: 'Sesi tidak valid' }, 401);

    const rawData = await context.env.ZYNEX_KV.get(`user:${session.username}`);
    if (!rawData) return json({ success: false, message: 'User tidak ditemukan' }, 404);

    const userData = parseUserData(rawData);
    return json({
      success: true,
      data: {
        nama: userData.Nama || '-',
        username: userData.Username || session.username,
        whatsapp: userData.Whatsapp || '-',
        email: userData.Email || '-',
        paket: userData.Paket === 'Pro (20K)' ? 'pro' : 'starter',
        waktu: userData.Waktu || '-'
      }
    });
  }

  return json({ error: 'Endpoint tidak ditemukan' }, 404);
}


// ============================================================
// POST requests
// ============================================================
export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // ---- REGISTRASI ----
  if (path === '/register') {
    try {
      const body = await context.request.json();
      const { nama, username, whatsapp, email, password, paket, waktu } = body;

      // Validasi kelengkapan
      if (!nama || !username || !whatsapp || !email || !password || !paket) {
        return json({ success: false, message: 'Semua field wajib diisi' }, 400);
      }

      // Validasi nama
      if (nama.trim().length < 2) {
        return json({ success: false, message: 'Nama terlalu pendek', field: 'nama' }, 400);
      }

      // Validasi username
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        return json({ success: false, message: 'Username hanya huruf kecil, angka, underscore. Min 3 karakter.', field: 'username' }, 400);
      }

      // Validasi WhatsApp
      if (!/^0[0-9]{8,13}$/.test(whatsapp)) {
        return json({ success: false, message: 'Format WhatsApp tidak valid', field: 'whatsapp' }, 400);
      }

      // Validasi Gmail — TOLAK selain @gmail.com
      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
        return json({ success: false, message: 'Hanya menerima email @gmail.com', field: 'email' }, 400);
      }

      // Validasi password
      if (password.length < 6) {
        return json({ success: false, message: 'Password minimal 6 karakter', field: 'password' }, 400);
      }

      // Validasi paket
      if (!['starter', 'pro'].includes(paket)) {
        return json({ success: false, message: 'Paket tidak valid', field: 'paket' }, 400);
      }

      // Cek duplikat username
      const existing = await context.env.ZYNEX_KV.get(`user:${username}`);
      if (existing) {
        return json({ success: false, message: 'Username sudah digunakan, pilih username lain', field: 'username' }, 409);
      }

      // Hash password
      const hashedPw = await hashPassword(password);

      // Susun isi file .txt (password TIDAK ditulis ke file txt untuk keamanan)
      const timestamp = waktu || new Date().toISOString();
      const paketLabel = paket === 'pro' ? 'Pro (20K)' : 'Starter (15K)';
      const content = [
        '========================================',
        '  ZYNEX STUDIO - DATA PENDAFTARAN',
        '========================================',
        '',
        `Nama       : ${nama.trim()}`,
        `Username   : ${username}`,
        `WhatsApp   : ${whatsapp}`,
        `Email      : ${email}`,
        `Paket      : ${paketLabel}`,
        `Waktu      : ${timestamp}`,
        '',
        '========================================',
      ].join('\n');

      // Simpan data user ke KV
      await context.env.ZYNEX_KV.put(`user:${username}`, content);

      // Simpan password hash terpisah (tidak di file txt)
      await context.env.ZYNEX_KV.put(`pw:${username}`, hashedPw);

      // Tambahkan ke userlist
      const listKey = 'userlist';
      const existingList = await context.env.ZYNEX_KV.get(listKey) || '';
      await context.env.ZYNEX_KV.put(listKey, existingList + `${username}|${paket}|${timestamp}\n`);

      return json({ success: true, message: 'Pendaftaran berhasil' });

    } catch (err) {
      return json({ success: false, message: 'Terjadi kesalahan server' }, 500);
    }
  }

  // ---- LOGIN ----
  if (path === '/login') {
    try {
      const body = await context.request.json();
      const { username, password } = body;

      if (!username || !password) {
        return json({ success: false, message: 'Username dan password wajib diisi' }, 400);
      }

      // Cek user ada atau tidak
      const userData = await context.env.ZYNEX_KV.get(`user:${username}`);
      if (!userData) {
        return json({ success: false, message: 'Username tidak ditemukan', field: 'username' }, 404);
      }

      // Verifikasi password
      const storedHash = await context.env.ZYNEX_KV.get(`pw:${username}`);
      const inputHash = await hashPassword(password);

      if (storedHash !== inputHash) {
        return json({ success: false, message: 'Password salah', field: 'password' }, 401);
      }

      // Buat session token
      const token = generateToken();
      const parsed = parseUserData(userData);

      const sessionData = JSON.stringify({
        username: username,
        nama: parsed.Nama || '',
        paket: parsed.Paket === 'Pro (20K)' ? 'pro' : 'starter',
        created: new Date().toISOString()
      });

      // Simpan session ke KV (expire 24 jam = 86400 detik)
      await context.env.ZYNEX_KV.put(`session:${token}`, sessionData, { expirationTtl: 86400 });

      return json({
        success: true,
        token: token,
        username: username,
        nama: parsed.Nama || username,
        paket: parsed.Paket === 'Pro (20K)' ? 'pro' : 'starter'
      });

    } catch (err) {
      return json({ success: false, message: 'Terjadi kesalahan server' }, 500);
    }
  }

  return json({ error: 'Endpoint tidak ditemukan' }, 404);
}