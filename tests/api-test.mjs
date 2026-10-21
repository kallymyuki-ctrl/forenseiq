/* ForenseIQ — teste de ponta a ponta da API (rode com o server.js ativo) */
const BASE = 'http://localhost:3000';
let cookie = '';
async function req(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  let d = null; try { d = await r.json(); } catch { }
  return { status: r.status, d };
}
const ok = (name, cond, extra = '') => { console.log((cond ? '✅' : '⛔') + ' ' + name + (extra ? ' — ' + extra : '')); if (!cond) process.exitCode = 1; };

/* health + estáticos */
let r = await req('GET', '/api/health');
ok('GET /api/health', r.status === 200 && r.d.ok, 'gateway=' + r.d.gateway);
r = await fetch(BASE + '/');
ok('Front-end servido', r.status === 200 && (await r.text()).includes('ForenseIQ'));
r = await fetch(BASE + '/js/app.js');
ok('app.js servido', r.status === 200);

/* cadastro + login */
const testUser = 'detetive_' + Date.now();
r = await req('POST', '/api/auth/register', { username: testUser, password: 'senha123' });
ok('POST register (25 créditos)', r.status === 200 && r.d.credits === 25, 'user=' + (r.d && r.d.username));
const userCookie = cookie;
r = await req('POST', '/api/auth/login', { username: testUser, password: 'errada' });
ok('login com senha errada → 401', r.status === 401);

/* cobrança de módulo demo */
r = await req('POST', '/api/credits/charge', { module: 'cpf', query: '529.982.247-25', resumo: 'Teste' });
ok('charge cpf (2 créditos)', r.status === 200 && r.d.balance === 23);

/* lookups reais (BrasilAPI/ipwho a partir do servidor) */
r = await req('GET', '/api/lookup/cnpj/00000000000191');
ok('lookup CNPJ real', r.status === 200 && /BANCO/i.test(r.d.data.razao || ''), 'fonte=' + r.d.fonte + ' · saldo=' + r.d.balance);
r = await req('GET', '/api/lookup/cep/01310100');
ok('lookup CEP real', r.status === 200 && /Paulista/i.test(r.d.data.street || ''), r.d.data.street);
r = await req('GET', '/api/lookup/ip/8.8.8.8');
ok('lookup IP real', r.status === 200 && /google/i.test((r.d.data.org || '') + (r.d.data.isp || '')), 'fonte=' + r.d.fonte);
r = await req('GET', '/api/lookup/telefone/11987654321');
ok('lookup telefone (sem chave → demo)', r.status === 200 && /Demonstra/i.test(r.d.fonte));
r = await req('GET', '/api/lookup/email/teste@example.com');
ok('lookup e-mail', r.status === 200);
r = await req('GET', '/api/lookup/vazamentos/52998224725');
ok('lookup vazamentos (CPF → demo)', r.status === 200 && r.d.data.breaches === null);
r = await req('GET', '/api/lookup/cnpj/123');
ok('CNPJ inválido → 400 sem cobrar', r.status === 400);

/* compra simulada: 25 − 2−1−1−1−2−2−3 = 13 → +50 = 63 */
r = await req('POST', '/api/credits/purchase', { pack: 'starter' });
ok('purchase (simulado)', r.status === 200 && r.d.mode === 'simulado', r.d.pack);
r = await req('POST', '/api/credits/purchase/confirm', { pack: 'starter' });
ok('confirm compra +50', r.status === 200 && r.d.status === 'approved' && r.d.balance === 63, 'saldo=' + r.d.balance);

/* ===== v4: Fontes Oficiais ===== */
r = await req('GET', '/api/lookup/processo/00008323520184013202');
if (r.status === 200) {
  ok('processo real via DataJud (TRF1)', r.d.data.numeroProcesso === '00008323520184013202' && r.d.balance === 61, r.d.fonte + ' · classe=' + r.d.data.classe);
} else {
  ok('processo: DataJud inacessível deste IP — 502 tratado sem crash', r.status === 502 && !!r.d.error, String(r.d.error).slice(0, 80));
}
r = await req('GET', '/api/lookup/processo/123');
ok('processo nº inválido → 400', r.status === 400);
r = await req('POST', '/api/credits/charge', { module: 'mandados', query: 'kit' });
ok('charge mandados (1 crédito)', r.status === 200 && r.d.balance === 60, 'saldo=' + r.d.balance);
r = await req('POST', '/api/credits/charge', { module: 'bens', query: 'kit' });
ok('charge bens (1 crédito)', r.status === 200 && r.d.balance === 59, 'saldo=' + r.d.balance);
r = await req('GET', '/api/lookup/username/torvalds');
ok('username scan real estilo Sherlock', r.status === 200 && r.d.data.results.length >= 18 && r.d.data.verificados >= 15 && r.d.data.encontrados >= 1 && r.d.balance === 58, r.d.data.encontrados + ' perfis · GitHub=' + (r.d.data.results.find(x => x.site === 'GitHub') || {}).found + ' · saldo=' + r.d.balance);

/* dossiês */
/* dossiês/history/tx não cobram */
r = await req('POST', '/api/dossiers', { titulo: 'Caso Teste', caso: '2026-0001' });
ok('criar dossiê', r.status === 200);
r = await req('GET', '/api/dossiers');
const dId = r.d.dossiers[0].id;
ok('listar dossiês', r.status === 200 && r.d.dossiers.length === 1);
r = await req('POST', `/api/dossiers/${dId}/items`, { tipo: 'CPF', query: '529.982.247-25', html: '<div>x</div>' });
ok('anexar item ao dossiê', r.status === 200);

/* histórico / transações / resumo */
r = await req('GET', '/api/history');
ok('histórico', r.status === 200 && r.d.history.length >= 6, r.d.history.length + ' registros');
r = await req('GET', '/api/tx');
ok('transações', r.status === 200 && r.d.tx.length >= 4, r.d.tx.length + ' transações');
r = await req('GET', '/api/summary');
ok('summary', r.status === 200 && r.d.dossiers.length === 1 && r.d.auditLength >= 6);

/* admin */
cookie = '';
r = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin' });
ok('login admin', r.status === 200 && r.d.role === 'admin');
r = await req('GET', '/api/admin/keys');
ok('admin keys (vazias)', r.status === 200 && r.d.keys.cnpjws === null);
r = await req('POST', '/api/admin/keys', { id: 'ipinfo', key: 'TESTE123TOKEN' });
ok('salvar chave no servidor', r.status === 200);
r = await req('GET', '/api/admin/keys');
ok('chave mascarada na leitura', r.status === 200 && String(r.d.keys.ipinfo).includes('…'));
r = await req('POST', '/api/admin/keys/test', { id: 'ipinfo' });
ok('teste de chave (token falso recusado)', r.status === 200 && r.d.ok === false, r.d.msg);
r = await req('POST', '/api/admin/keys', { id: 'ipinfo', key: null });
ok('remover chave', r.status === 200);
r = await req('POST', '/api/admin/grant', { username: testUser, amount: 10 });
ok('lançar créditos', r.status === 200);
r = await req('GET', '/api/admin/users');
ok('listar usuários', r.status === 200 && r.d.users.some(u => u.username === testUser));
r = await req('POST', '/api/admin/costs', { costs: { cpf: 3 } });
ok('alterar preço (cpf→3)', r.status === 200 && r.d.costs.cpf === 3);
r = await req('POST', '/api/admin/costs', { costs: { cpf: 2 } });

/* não-admin bloqueado */
cookie = userCookie;
r = await req('GET', '/api/admin/keys');
ok('não-admin em rota admin → 403', r.status === 403);

/* créditos insuficientes */
cookie = '';
const semGranaUser = 'semgrana_' + Date.now();
r = await req('POST', '/api/auth/register', { username: semGranaUser, password: 'senha123' });
let last;
for (let i = 0; i < 8; i++) last = await req('POST', '/api/credits/charge', { module: 'vazamentos', query: '52998224725' });
ok('8× vazamentos (24 créditos)', last.status === 200 && last.d.balance === 1);
r = await req('POST', '/api/credits/charge', { module: 'vazamentos', query: '52998224725' });
ok('sem saldo → 402', r.status === 402 && r.d.cost === 3, 'saldo=' + (r.d && r.d.balance));

/* logout */
r = await req('POST', '/api/auth/logout');
ok('logout', r.status === 200);
r = await req('GET', '/api/me');
ok('pós-logout → 401', r.status === 401);

console.log('\nConcluído.');
