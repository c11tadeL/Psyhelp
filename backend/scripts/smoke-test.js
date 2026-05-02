const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.error(`❌ ${name}${details ? ': ' + details : ''}`);
    failed++;
  }
}

async function req(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {}
  return { status: res.status, body: json };
}

async function main() {
  console.log(`\n🧪 Smoke test against ${BASE}\n`);

  // 1. Health
  const h = await req('GET', '/health');
  check('GET /health is 200', h.status === 200);
  check('Health DB ok', h.body?.db === true);

  // 2. Categories
  const cats = await req('GET', '/api/categories');
  check('GET /api/categories is 200', cats.status === 200);
  check('Categories returned 9', cats.body?.items?.length === 9);

  // 3. Register 
  const suffix = Date.now();
  const email = `smoke_${suffix}@test.local`;
  const reg = await req('POST', '/api/auth/register', {
    body: { email, password: 'SmokeTest123!', nickname: `smoke_${suffix}` },
  });
  check('Register is 201', reg.status === 201, `got ${reg.status}: ${JSON.stringify(reg.body)}`);
  check('Register returns no email/hash', !reg.body?.user?.email && !reg.body?.user?.password_hash);

  // 4. Login
  const login = await req('POST', '/api/auth/login', {
    body: { email, password: 'SmokeTest123!' },
  });
  check('Login is 200', login.status === 200);
  check('Login returns access_token', !!login.body?.access_token);
  check('Login returns refresh_token', !!login.body?.refresh_token);

  const token = login.body.access_token;

  // 5. /api/me
  const me = await req('GET', '/api/me', { token });
  check('GET /api/me is 200', me.status === 200);
  check('Me has correct nickname', me.body?.nickname === `smoke_${suffix}`);

  // 6. Create post
  const post = await req('POST', '/api/posts', {
    body: { category_id: 1, body: 'This is a smoke test post for diploma project' },
    token,
  });
  check('POST /api/posts is 201', post.status === 201);

  // 7. Diary (encrypted)
  const diary = await req('PUT', '/api/me/diary', {
    body: { mood: 7, note: 'Smoke test note in Ukrainian: тест' },
    token,
  });
  check('PUT /api/me/diary is 200', diary.status === 200);

  const diaryRead = await req('GET', '/api/me/diary', { token });
  check('GET /api/me/diary returns decrypted', diaryRead.body?.items?.[0]?.note?.includes('Smoke test'));

  // 8. Without token — 401
  const noAuth = await req('GET', '/api/me');
  check('GET /api/me without token is 401', noAuth.status === 401);

  // 9. Logout
  const logout = await req('POST', '/api/auth/logout', {
    body: { refresh_token: login.body.refresh_token },
  });
  check('POST /api/auth/logout is 204', logout.status === 204);

  console.log(`\n📊 Result: ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(2);
});
