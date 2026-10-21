#!/usr/bin/env node
/* ============================================================
   ForenseIQ — Back-end de produção (zero dependências, Node 18+)
   ------------------------------------------------------------
   • Contas reais (scrypt + cookie de sessão HttpOnly)
   • Créditos pré-pagos autoritativos NO SERVIDOR
   • Proxy das APIs pagas — as chaves NUNCA vão ao navegador
     (resolve também o CORS de HIBP e ZeroBounce)
   • PIX real via Mercado Pago (se o token for configurado)
     ou checkout simulado (padrão)
   • Serve o front-end estático (mesma porta, mesma origem)
   ============================================================ */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = +(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');

/* ---------- persistência JSON ---------- */
function load(name, def) { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name + '.json'), 'utf8')); } catch { return def; } }
function save(name, obj) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(obj, null, 2)); }

let users = load('users', {});
let txs = load('tx', []);
let audits = load('audit', []);
let histories = load('history', {});
let dossiersDB = load('dossiers', {});
let pendings = load('pending', {});
let keys = load('keys', {});
const DEFAULT_COSTS = { cpf: 2, cnpj: 1, telefone: 2, email: 2, placa: 2, cep: 1, ip: 1, username: 1, vazamentos: 3, processos: 2, mandados: 1, bens: 1 };
let costs = Object.assign({}, DEFAULT_COSTS, load('costs', {}));

const PACKS = [
  { id: 'starter', nome: 'Starter', creditos: 50, preco: 49, feat: ['Todas as ferramentas', 'Suporte por e-mail', 'Créditos sem expiração'] },
  { id: 'profissional', nome: 'Profissional', creditos: 200, preco: 149, best: true, feat: ['Todas as ferramentas', 'Prioridade nas filas', 'Exportação PDF de dossiês', 'Créditos sem expiração'] },
  { id: 'enterprise', nome: 'Enterprise', creditos: 1000, preco: 499, feat: ['Tudo do Profissional', 'Melhor custo por crédito', 'Gerente de conta', 'Créditos sem expiração'] }
];
const PROVIDERS = ['cnpjws', 'numverify', 'zerobounce', 'hibp', 'ipinfo', 'mercadopago', 'datajud'];

/* ---------- senhas / sessões ---------- */
const hashPass = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
function verifyPass(pw, salt, hash) {
  const a = Buffer.from(hashPass(pw, salt), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sessions = new Map(); // token -> username (em memória; reinício desloga)

/* seed da conta admin */
if (!users.admin) {
  const salt = crypto.randomBytes(16).toString('hex');
  users.admin = { salt, hash: hashPass('admin', salt), credits: 100, role: 'admin', created: new Date().toISOString() };
  save('users', users);
  console.log('→ Conta administradora criada: admin / admin (troque a senha em produção)');
}

/* ---------- helpers ---------- */
function json(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(b);
}
function audit(usuario, acao, alvo) {
  audits.unshift({ ts: new Date().toISOString(), usuario, acao, alvo: alvo || '—', base: 'Art. 7º, LGPD — legítimo interesse / cumprimento de obrigação' });
  audits = audits.slice(0, 2000); save('audit', audits);
}
function tx(user, delta, desc) {
  txs.unshift({ ts: new Date().toISOString(), user, delta, saldo: users[user].credits, desc });
  txs = txs.slice(0, 2000); save('tx', txs);
}
function hist(user, tipo, query, resumo) {
  const arr = histories[user] || (histories[user] = []);
  arr.unshift({ ts: new Date().toISOString(), tipo, query, resumo: resumo || '—' });
  histories[user] = arr.slice(0, 500); save('history', histories);
}
function charge(user, module, query) {
  const cost = costs[module] != null ? costs[module] : 1;
  if ((users[user].credits || 0) < cost) return { ok: false, cost, balance: users[user].credits || 0 };
  users[user].credits -= cost;
  save('users', users);
  tx(user, -cost, 'Consulta — ' + module.toUpperCase());
  audit(user, 'CONSULTA ' + module.toUpperCase(), query || '—');
  return { ok: true, cost, balance: users[user].credits };
}
function readBody(req, limit = 300000) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('Corpo da requisição muito grande.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { resolve({}); } });
    req.on('error', reject);
  });
}
function getCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
function auth(req) {
  const t = getCookie(req, 'fiq_session');
  const u = t && sessions.get(t);
  return (u && users[u]) ? { name: u, ...users[u] } : null;
}
function setSession(res, username, remember) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, username);
  res.setHeader('Set-Cookie', 'fiq_session=' + token + '; HttpOnly; Path=/; SameSite=Lax' + (remember ? '; Max-Age=2592000' : ''));
}
function clearSession(req, res) {
  const t = getCookie(req, 'fiq_session');
  if (t) sessions.delete(t);
  res.setHeader('Set-Cookie', 'fiq_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}
const rl = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (rl.get(ip) || []).filter(t => now - t < 60000);
  if (arr.length >= 15) { rl.set(ip, arr); return true; }
  arr.push(now); rl.set(ip, arr); return false;
}

/* ---------- validadores ---------- */
function validaCNPJ(c) {
  if (!/^\d{14}$/.test(c)) return false;
  if (/^(\d)\1+$/.test(c)) return false;
  const calc = (n) => {
    let soma = 0, peso = n === 12 ? 5 : 6;
    for (let i = 0; i < n; i++) { soma += +c[i] * peso--; if (peso < 2) peso = 9; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +c[12] && calc(13) === +c[13];
}
const fmtCNPJ = c => c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

/* ---------- fetch com timeout ---------- */
async function jfetch(url, opts = {}, ms = 9000) {
  const headers = Object.assign({ 'User-Agent': 'ForenseIQ/1.0' }, opts.headers || {});
  const r = await fetch(url, Object.assign({}, opts, { headers, signal: AbortSignal.timeout(ms) }));
  let data = null;
  try { data = await r.json(); } catch { }
  return { status: r.status, ok: r.ok, data };
}

/* ---------- provedores (chamadas SEMPRE do servidor) ---------- */
async function lookupCNPJ(cnpj) {
  if (keys.cnpjws) {
    try {
      const r = await jfetch('https://api.cnpj.ws/cnpj/' + cnpj, { headers: { x_api_key: keys.cnpjws } });
      if (r.ok && r.data) {
        const d = r.data, est = d.estabelecimento || {};
        return {
          fonte: 'CNPJ.ws · plano pago (chave do servidor)',
          data: {
            cnpj: fmtCNPJ(cnpj),
            razao: d.razao_social || '—',
            fantasia: est.nome_fantasia || '—',
            abertura: (est.data_inicio_atividade || '').split('-').reverse().join('/') || '—',
            situacao: est.situacao_cadastral || '—',
            natureza: (d.natureza_juridica || {}).descricao || '—',
            cnae: ((est.atividade_principal || {}).subclasse || '') + ' — ' + ((est.atividade_principal || {}).descricao || ''),
            capital: 'R$ ' + (+d.capital_social || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            porte: (d.porte || {}).descricao || '—',
            endereco: [est.tipo_logradouro, est.logradouro, est.numero].filter(Boolean).join(' '),
            cidade: (est.cidade || {}).nome || '—',
            uf: (est.estado || {}).sigla || '—',
            telefone: est.ddd1 ? ('(' + est.ddd1 + ') ' + (est.telefone1 || '')).trim() : (est.telefone1 || '—'),
            email: est.email || '—',
            socios: (d.socios || []).map(s => ({ nome: s.nome, qual: (s.qualificacao_socio || {}).descricao || 'Sócio' }))
          }
        };
      }
    } catch { }
  }
  const r = await jfetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpj);
  if (r.ok && r.data) {
    const d = r.data;
    return {
      fonte: 'BrasilAPI · dados públicos reais',
      data: {
        cnpj: fmtCNPJ(cnpj),
        razao: d.razao_social || '—',
        fantasia: d.nome_fantasia || '—',
        abertura: (d.data_inicio_atividade || '').split('-').reverse().join('/') || '—',
        situacao: d.descricao_situacao_cadastral || '—',
        natureza: d.natureza_juridica || '—',
        cnae: (d.cnae_fiscal || '') + ' — ' + (d.cnae_fiscal_descricao || ''),
        capital: 'R$ ' + (+d.capital_social || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        porte: d.porte || '—',
        endereco: [d.descricao_tipo_de_logradouro, d.logradouro, d.numero].filter(Boolean).join(' '),
        cidade: d.municipio || '—',
        uf: d.uf || '—',
        telefone: d.ddd_telefone_1 || '—',
        email: d.email || '—',
        socios: (d.qsa || []).map(s => ({ nome: s.nome_socio, qual: s.qualificacao_socio }))
      }
    };
  }
  throw new Error('CNPJ não encontrado nas bases disponíveis.');
}

async function lookupCEP(cep) {
  const r = await jfetch('https://brasilapi.com.br/api/cep/v2/' + cep);
  if (r.ok && r.data) {
    const d = r.data, co = (d.location || {}).coordinates || {};
    return { fonte: 'BrasilAPI · dados públicos reais', data: { street: d.street || '—', neighborhood: d.neighborhood || '—', city: d.city, state: d.state, lat: co.latitude || null, lon: co.longitude || null } };
  }
  throw new Error('CEP não encontrado.');
}

async function lookupIP(ip) {
  if (keys.ipinfo) {
    try {
      const r = await jfetch('https://ipinfo.io/' + encodeURIComponent(ip) + '?token=' + encodeURIComponent(keys.ipinfo));
      if (r.ok && r.data && !r.data.error) {
        const j = r.data;
        const [asn, ...rest] = (j.org || 'AS— —').split(' ');
        const [lat, lon] = (j.loc || ',').split(',');
        return {
          fonte: 'ipinfo.io · plano pago (chave do servidor)',
          data: { ip: j.ip, type: 'IPv4', country: j.country, region: j.region, city: j.city, postal: j.postal, latitude: lat, longitude: lon, timezone: j.timezone, hostname: j.hostname || '', isp: rest.join(' ') || j.org, org: j.org, asn: (asn || '—').replace(/^AS/, ''), domain: '' }
        };
      }
    } catch { }
  }
  const r = await jfetch('https://ipwho.is/' + encodeURIComponent(ip));
  if (r.ok && r.data && r.data.success !== false) {
    const d = r.data;
    return {
      fonte: 'ipwho.is · gratuito (dados reais)',
      data: { ip: d.ip, type: d.type || 'IPv4', country: d.country, region: d.region, city: d.city, postal: d.postal, latitude: d.latitude, longitude: d.longitude, timezone: (d.timezone || {}).id || d.timezone || '', hostname: '', isp: (d.connection || {}).isp || '—', org: (d.connection || {}).org || '—', asn: (d.connection || {}).asn || '—', domain: (d.connection || {}).domain || '—' }
    };
  }
  throw new Error('Não foi possível rastrear o IP.');
}

async function lookupTelefone(num) {
  if (keys.numverify) {
    try {
      const r = await jfetch('https://apilayer.net/api/validate?access_key=' + encodeURIComponent(keys.numverify) + '&number=55' + num);
      if (r.data && r.data.valid) {
        const tipos = { mobile: 'Móvel', landline: 'Fixo', voip: 'VoIP', toll_free: 'Gratuito (0800)', premium_rate: 'Tarifa premium' };
        return { fonte: 'NumVerify · API paga (chave do servidor) — operadora e tipo reais', data: { operadora: r.data.carrier || null, tipo: tipos[r.data.line_type] || null } };
      }
      if (r.data && r.data.error) return { fonte: 'NumVerify recusou a chave — demonstração (UF do DDD real)', data: { operadora: null, tipo: null } };
    } catch { }
  }
  return { fonte: 'Demonstração · dados fictícios (UF do DDD real)', data: { operadora: null, tipo: null } };
}

async function lookupEmail(email) {
  const out = { fonte: [], valid: null, descartavel: null, mx: null, tipoDominio: null, breaches: null };
  if (keys.zerobounce) {
    try {
      const r = await jfetch('https://api.zerobounce.net/v2/validate?api_key=' + encodeURIComponent(keys.zerobounce) + '&email=' + encodeURIComponent(email));
      if (r.data && !r.data.error) {
        out.valid = r.data.status === 'valid';
        out.descartavel = r.data.status === 'disposable' || r.data.status === 'do_not_mail';
        out.mx = String(r.data.mx_found).toLowerCase() === 'true';
        if (typeof r.data.free_email === 'boolean') out.tipoDominio = r.data.free_email ? 'Provedor gratuito (webmail)' : 'Domínio corporativo/próprio';
        out.fonte.push('ZeroBounce (validação real)');
      } else if (r.data && r.data.error) out.fonte.push('ZeroBounce recusou a chave');
    } catch { out.fonte.push('ZeroBounce inacessível'); }
  }
  if (keys.hibp) {
    try {
      const r = await jfetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(email) + '?truncateResponse=false', { headers: { 'hibp-api-key': keys.hibp } });
      if (r.status === 404) out.breaches = [];
      else if (r.ok && Array.isArray(r.data)) {
        out.breaches = r.data.map(b => ({ name: b.Name, date: b.BreachDate || '', size: (b.PwnCount || 0).toLocaleString('pt-BR') + ' contas', data: (b.DataClasses || []).slice(0, 6) }));
        out.fonte.push('HIBP (vazamentos reais)');
      }
    } catch { }
  }
  return { fonte: out.fonte.length ? out.fonte.join(' + ') : 'Demonstração · dados fictícios', data: out };
}

async function lookupVazamentos(q) {
  if (q.includes('@') && keys.hibp) {
    try {
      const r = await jfetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(q) + '?truncateResponse=false', { headers: { 'hibp-api-key': keys.hibp } });
      if (r.status === 404) return { fonte: 'HIBP · dados reais — nenhuma exposição registrada', data: { breaches: [] } };
      if (r.ok && Array.isArray(r.data)) {
        return { fonte: 'HIBP · dados reais (chave do servidor)', data: { breaches: r.data.map(b => ({ name: b.Name, date: b.BreachDate || '', size: (b.PwnCount || 0).toLocaleString('pt-BR') + ' contas', data: (b.DataClasses || []).slice(0, 6) })) } };
      }
      if (r.status === 401 || r.status === 403) return { fonte: 'HIBP recusou a chave — demonstração', data: { breaches: null } };
      if (r.status === 429) return { fonte: 'HIBP: limite de requisições — demonstração', data: { breaches: null } };
    } catch { return { fonte: 'HIBP inacessível — demonstração', data: { breaches: null } }; }
  }
  return { fonte: q.includes('@') ? 'Demonstração · configure a chave HIBP (Integrações) para verificação real' : 'Demonstração · a HIBP cobre apenas e-mails', data: { breaches: null } };
}

/* ---------- DataJud — processos judiciais (API pública do CNJ) ---------- */
const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br/';
const DATAJUD_KEY_PUBLICA = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='; // chave pública divulgada na documentação oficial do CNJ
const TJ_UF = { '01': 'ac', '02': 'al', '03': 'ap', '04': 'am', '05': 'ba', '06': 'ce', '07': 'df', '08': 'es', '09': 'go', '10': 'ma', '11': 'mt', '12': 'ms', '13': 'mg', '14': 'pa', '15': 'pb', '16': 'pr', '17': 'pe', '18': 'pi', '19': 'rj', '20': 'rn', '21': 'rs', '22': 'ro', '23': 'rr', '24': 'sc', '25': 'se', '26': 'sp', '27': 'to' };
function tribunalFromCNJ(num) {
  const j = num.slice(13, 14), tr = num.slice(14, 16);
  if (j === '1') return 'stf';
  if (j === '3') return 'stj';
  if (j === '4') return 'trf' + (+tr);
  if (j === '5') return 'trt' + (+tr);
  if (j === '7') return 'stm';
  if (j === '8') return tr === '07' ? 'tjdft' : 'tj' + (TJ_UF[tr] || tr);
  return null;
}
const fmtDT = (v) => { if (!v) return null; const n = +v; const d = new Date(n > 1e12 ? n : v); return isNaN(d.getTime()) ? null : d.toLocaleString('pt-BR'); };
async function lookupProcesso(numero) {
  const idx = tribunalFromCNJ(numero);
  if (!idx) throw new Error('Segmento/tribunal não coberto pela API pública do DataJud — consulte o portal do tribunal.');
  const key = keys.datajud || DATAJUD_KEY_PUBLICA;
  const r = await jfetch(DATAJUD_BASE + 'api_publica_' + idx + '/_search', {
    method: 'POST',
    headers: { Authorization: 'ApiKey ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 })
  }, 20000);
  if (r.status === 401) throw new Error('Chave DataJud recusada (401) — cadastre sua chave em Integrações.');
  if (r.status === 429) throw new Error('Cota da chave pública DataJud esgotada (429) — cadastre chave própria gratuita em datajud-wiki.cnj.jus.br.');
  if (!r.ok || !r.data) throw new Error('DataJud indisponível (HTTP ' + r.status + ').');
  const hits = (r.data.hits && r.data.hits.hits) || [];
  if (!hits.length) throw new Error('Processo não encontrado na base pública — pode ser sigiloso (art. 189, CPC) ou ainda não sincronizado.');
  const hit = hits[0] || {};
  const src = hit._source || {};
  const isCriminal = typeof src.criminal === 'boolean' ? src.criminal : (
    ((src.classe || {}).nome || '').toLowerCase().includes('penal') ||
    ((src.classe || {}).nome || '').toLowerCase().includes('inquérito') ||
    ((src.classe || {}).nome || '').toLowerCase().includes('criminal') ||
    (src.assuntos || []).some(a => ((a.nome || a.descricao || '')).toLowerCase().includes('crime') || ((a.nome || a.descricao || '')).toLowerCase().includes('penal'))
  );
  const sigiloNivel = src.sigilo !== undefined ? Number(src.sigilo) : (src.nivelSigilo !== undefined ? Number(src.nivelSigilo) : 0);
  const nomeSigilo = src.nome_sigilo || (sigiloNivel >= 1 ? 'Segredo de Justiça (art. 189 CPC)' : 'Público');

  return {
    fonte: 'DataJud/CNJ · API pública — ' + (src.tribunal || idx.toUpperCase()),
    data: {
      numeroProcesso: src.numeroProcesso || numero,
      tribunal: src.tribunal || idx.toUpperCase(),
      classe: (src.classe || {}).nome || '—',
      assuntos: (src.assuntos || []).map(a => a.nome || a.descricao).filter(Boolean),
      orgaoJulgador: (src.orgaoJulgador || {}).nome || '—',
      grau: src.grau || '—',
      sistema: (src.sistema || {}).nome || '—',
      formato: (src.formato || {}).nome || '—',
      criminal: isCriminal,
      sigilo: sigiloNivel,
      nomeSigilo: nomeSigilo,
      situacaoAtual: src.situacao_atual || (src.situacao || {}).nome || 'Em Tramitação',
      faseAtual: src.fase_atual || (src.fase || {}).nome || '—',
      dataCasoNovo: fmtDT(src.data_cn || src.dataAjuizamento) ? fmtDT(src.data_cn || src.dataAjuizamento).split(' ')[0] : '—',
      dataAjuizamento: fmtDT(src.dataAjuizamento) ? fmtDT(src.dataAjuizamento).split(' ')[0] : '—',
      dataBaixa: fmtDT(src.data_baixa) ? fmtDT(src.data_baixa).split(' ')[0] : null,
      idElastic: src.id_elastic || hit._id || null,
      indice: src.indice || hit._index || ('processos-' + idx),
      atualizadoEm: fmtDT(src.updated_at || src.dataHoraUltimaAtualizacao),
      movimentos: (src.movimentos || []).slice(-12).reverse().map(m => ({ nome: m.nome || m.descricao || 'Movimento processual', data: fmtDT(m.dataHora) }))
    }
  };
}

/* ---------- Varredura de username estilo Sherlock (perfis públicos) ----------
   Sites validados empiricamente: 200 = perfil existe, 404/302 = não existe.
   Manifesto-fonte: sherlock-project/sherlock (GitHub) — 482 sites, filtramos os 18
   que respondem de forma confiável a consultas de status por HTTP. */
const USERNAME_SITES = [
  { n: 'GitHub', u: 'https://github.com/{}' },
  { n: 'GitLab', u: 'https://gitlab.com/{}' },
  { n: 'DEV Community', u: 'https://dev.to/{}' },
  { n: 'Chess.com', u: 'https://www.chess.com/member/{}' },
  { n: 'SoundCloud', u: 'https://soundcloud.com/{}' },
  { n: 'Behance', u: 'https://www.behance.net/{}' },
  { n: 'Vimeo', u: 'https://vimeo.com/{}' },
  { n: 'Substack', u: 'https://{}.substack.com/' },
  { n: 'MyAnimeList', u: 'https://myanimelist.net/profile/{}' },
  { n: 'osu!', u: 'https://osu.ppy.sh/users/{}' },
  { n: 'Codewars', u: 'https://www.codewars.com/users/{}' },
  { n: 'Replit', u: 'https://replit.com/@{}' },
  { n: 'Roblox', u: 'https://www.roblox.com/user.aspx?username={}' },
  { n: 'Itch.io', u: 'https://{}.itch.io/' },
  { n: 'Instructables', u: 'https://www.instructables.com/member/{}' },
  { n: 'GoodReads', u: 'https://www.goodreads.com/{}' },
  { n: 'About.me', u: 'https://about.me/{}' },
  { n: '9GAG', u: 'https://www.9gag.com/u/{}' }
];
async function lookupUsername(nome) {
  const checks = USERNAME_SITES.map(async site => {
    const url = site.u.replace('{}', encodeURIComponent(nome));
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ForenseIQ/1.0)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
      return { site: site.n, url, found: r.status === 200 };
    } catch { return { site: site.n, url, found: false, erro: true }; }
  });
  const results = await Promise.all(checks);
  const encontrados = results.filter(r => r.found).length;
  const verificados = results.filter(r => !r.erro).length;
  return {
    fonte: 'Varredura pública em tempo real (estilo Sherlock) — ' + USERNAME_SITES.length + ' plataformas verificadas por HTTP',
    data: { results, encontrados, verificados }
  };
}

/* ---------- Mercado Pago (PIX real, se configurado) ---------- */
async function createPixMP(username, pack) {
  const r = await jfetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + keys.mercadopago, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      transaction_amount: pack.preco,
      description: 'ForenseIQ — pacote ' + pack.nome + ' (' + pack.creditos + ' créditos)',
      payment_method_id: 'pix',
      payer: { email: username + '@forenseiq.local' }
    })
  });
  if (!r.ok || !r.data || !r.data.id) throw new Error((r.data && r.data.message) || 'Mercado Pago recusou a requisição');
  const qr = (r.data.point_of_interaction || {}).transaction_data || {};
  return { id: r.data.id, qr: qr.qr_code || '', qr_img: qr.qr_code_base64 ? 'data:image/png;base64,' + qr.qr_code_base64 : '' };
}
async function checkPixMP(paymentId) {
  const r = await jfetch('https://api.mercadopago.com/v1/payments/' + paymentId, { headers: { Authorization: 'Bearer ' + keys.mercadopago } });
  if (!r.ok || !r.data) return 'pending';
  return r.data.status || 'pending';
}

/* ---------- teste de chaves (server-side, sem CORS) ---------- */
async function testProviderKey(id) {
  const k = keys[id];
  if (!k) throw new Error('Chave não configurada.');
  if (id === 'cnpjws') {
    const r = await jfetch('https://api.cnpj.ws/cnpj/00000000000191', { headers: { x_api_key: k } });
    if (r.status === 401 || r.status === 403) throw new Error('Token recusado (' + r.status + ').');
    if (!r.ok) throw new Error('HTTP ' + r.status + '.');
    return 'Token válido — a API respondeu normalmente.';
  }
  if (id === 'numverify') {
    const r = await jfetch('https://apilayer.net/api/validate?access_key=' + encodeURIComponent(k) + '&number=5511987654321');
    if (r.data && r.data.error) throw new Error(r.data.error.info || 'Erro ' + r.data.error.code + '.');
    if (!r.data || r.data.valid === undefined) throw new Error('Resposta inesperada da API.');
    return 'Chave válida — teste retornou operadora "' + (r.data.carrier || '—') + '".';
  }
  if (id === 'zerobounce') {
    const r = await jfetch('https://api.zerobounce.net/v2/validate?api_key=' + encodeURIComponent(k) + '&email=alex@gmail.com');
    if (r.data && r.data.error) throw new Error(r.data.error);
    if (!r.data || !r.data.status) throw new Error('Resposta inesperada da API.');
    return 'Chave válida — status de teste: "' + r.data.status + '".';
  }
  if (id === 'hibp') {
    const r = await jfetch('https://haveibeenpwned.com/api/v3/breachedaccount/test@example.com', { headers: { 'hibp-api-key': k } });
    if (r.status === 401) throw new Error('Chave inválida (401).');
    if (r.status === 429) throw new Error('Limite de requisições excedido (429).');
    if (r.status === 404) return 'Chave válida — conta de teste sem violações (404 esperado).';
    if (!r.ok) throw new Error('HTTP ' + r.status + '.');
    return 'Chave válida — conta de teste exposta em ' + (Array.isArray(r.data) ? r.data.length : 0) + ' violação(ões).';
  }
  if (id === 'ipinfo') {
    const r = await jfetch('https://ipinfo.io/8.8.8.8?token=' + encodeURIComponent(k));
    if (r.data && r.data.error) throw new Error(r.data.error.title || 'Token recusado.');
    return 'Token válido — org: ' + (r.data.org || '—') + '.';
  }
  if (id === 'mercadopago') {
    const r = await jfetch('https://api.mercadopago.com/users/me', { headers: { Authorization: 'Bearer ' + k } });
    if (!r.ok) throw new Error('Token recusado (' + r.status + ').');
    return 'Token válido — conta: ' + ((r.data && (r.data.nickname || r.data.email)) || 'OK') + '.';
  }
  if (id === 'datajud') {
    const r = await jfetch(DATAJUD_BASE + 'api_publica_trf1/_search', {
      method: 'POST',
      headers: { Authorization: 'ApiKey ' + k, 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: 0 })
    }, 15000);
    if (r.status === 401) throw new Error('Chave inválida (401).');
    if (r.status === 429) throw new Error('Cota esgotada (429) — cadastre chave própria.');
    if (!r.ok) throw new Error('HTTP ' + r.status + '.');
    return 'Chave válida — DataJud respondeu normalmente.';
  }
  throw new Error('Provedor desconhecido.');
}

/* ============================================================
   API
   ============================================================ */
async function api(req, res, url) {
  const seg = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const p = seg.slice(1);
  const method = req.method;
  const ip = req.socket.remoteAddress || '?';
  const body = (method === 'POST' || method === 'PUT' || method === 'DELETE') ? await readBody(req) : {};
  const me = auth(req);

  /* ---- health / meta ---- */
  if (p[0] === 'health' && method === 'GET') {
    return json(res, 200, { ok: true, mode: 'server', gateway: keys.mercadopago ? 'mercadopago' : 'simulado' });
  }

  /* ---- autenticação ---- */
  if (p[0] === 'auth') {
    if (rateLimited(ip)) return json(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' });
    if (p[1] === 'register' && method === 'POST') {
      const u = String(body.username || '').trim();
      const pw = String(body.password || '');
      if (!/^[A-Za-z0-9_.-]{3,24}$/.test(u)) return json(res, 400, { error: 'Usuário inválido (3–24 caracteres: letras, números, . _ -).' });
      if (pw.length < 4) return json(res, 400, { error: 'Senha muito curta (mínimo 4 caracteres).' });
      if (users[u]) return json(res, 409, { error: 'Este usuário já existe.' });
      const salt = crypto.randomBytes(16).toString('hex');
      users[u] = { salt, hash: hashPass(pw, salt), credits: 25, role: 'user', created: new Date().toISOString() };
      save('users', users);
      setSession(res, u, !!body.remember);
      audit(u, 'CRIAÇÃO DE CONTA', u);
      tx(u, 25, 'Créditos de boas-vindas');
      return json(res, 200, { username: u, role: 'user', credits: 25, bonus: 25 });
    }
    if (p[1] === 'login' && method === 'POST') {
      const u = String(body.username || '').trim();
      const pw = String(body.password || '');
      const acc = users[u];
      if (!acc || !verifyPass(pw, acc.salt, acc.hash)) return json(res, 401, { error: 'Usuário ou senha incorretos.' });
      setSession(res, u, !!body.remember);
      audit(u, 'LOGIN', u);
      return json(res, 200, { username: u, role: acc.role, credits: acc.credits || 0 });
    }
    if (p[1] === 'logout' && method === 'POST') {
      if (me) audit(me.name, 'LOGOUT', me.name);
      clearSession(req, res);
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'Rota não encontrada.' });
  }

  /* ---- a partir daqui: exige sessão ---- */
  if (!me) return json(res, 401, { error: 'Não autenticado.' });

  if (p[0] === 'me' && method === 'GET') return json(res, 200, { username: me.name, role: me.role, credits: me.credits || 0 });
  if (p[0] === 'costs' && method === 'GET') return json(res, 200, { costs, packs: PACKS });

  if (p[0] === 'summary' && method === 'GET') {
    const h = (histories[me.name] || []).slice(0, 30);
    const ds = dossiersDB[me.name] || [];
    const myAudit = me.role === 'admin' ? audits : audits.filter(a => a.usuario === me.name);
    return json(res, 200, { credits: me.credits || 0, history: h, dossiers: ds, auditLength: myAudit.length });
  }

  /* ---- transações (alias curto usado pelo front) ---- */
  if (p[0] === 'tx' && method === 'GET') {
    const list = (me.role === 'admin' ? txs : txs.filter(t => t.user === me.name)).slice(0, 100);
    return json(res, 200, { tx: list });
  }

  /* ---- créditos ---- */
  if (p[0] === 'credits') {
    if (p[1] === 'charge' && method === 'POST') {
      const mod = String(body.module || '');
      if (!(mod in costs)) return json(res, 400, { error: 'Módulo desconhecido.' });
      const c = charge(me.name, mod, body.query);
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      hist(me.name, mod.charAt(0).toUpperCase() + mod.slice(1), body.query || '—', body.resumo || '—');
      return json(res, 200, { ok: true, balance: c.balance });
    }
    if (p[1] === 'purchase' && !p[2] && method === 'POST') {
      const pack = PACKS.find(x => x.id === body.pack);
      if (!pack) return json(res, 400, { error: 'Pacote inexistente.' });
      if (keys.mercadopago) {
        try {
          const pay = await createPixMP(me.name, pack);
          pendings[pay.id] = { user: me.name, pack: pack.id, creditos: pack.creditos, preco: pack.preco, credited: false, created: new Date().toISOString() };
          save('pending', pendings);
          audit(me.name, 'PEDIDO DE CRÉDITOS (PIX)', pack.nome + ' — R$ ' + pack.preco + ',00 (pagamento ' + pay.id + ')');
          return json(res, 200, { mode: 'mercadopago', payment_id: pay.id, qr: pay.qr, qr_img: pay.qr_img, pack: pack.nome, creditos: pack.creditos, preco: pack.preco });
        } catch (e) {
          return json(res, 502, { error: 'Falha no Mercado Pago: ' + e.message + ' Verifique o token em Integrações.' });
        }
      }
      return json(res, 200, { mode: 'simulado', pack: pack.nome, creditos: pack.creditos, preco: pack.preco });
    }
    if (p[1] === 'purchase' && p[2] === 'confirm' && method === 'POST') {
      const pack = PACKS.find(x => x.id === body.pack);
      if (!pack) return json(res, 400, { error: 'Pacote inexistente.' });
      if (body.payment_id) {
        const pend = pendings[body.payment_id];
        if (!pend || pend.user !== me.name) return json(res, 404, { error: 'Pagamento não encontrado.' });
        if (pend.credited) return json(res, 200, { status: 'approved', balance: users[me.name].credits });
        const st = await checkPixMP(body.payment_id);
        if (st === 'approved') {
          users[me.name].credits = (users[me.name].credits || 0) + pend.creditos;
          save('users', users);
          pend.credited = true; save('pending', pendings);
          tx(me.name, pend.creditos, 'Compra PIX — pacote ' + pack.nome + ' (R$ ' + pend.preco + ',00)');
          audit(me.name, 'COMPRA DE CRÉDITOS (PIX)', pend.creditos + ' créditos — pagamento ' + body.payment_id);
          return json(res, 200, { status: 'approved', balance: users[me.name].credits });
        }
        return json(res, 200, { status: st, balance: users[me.name].credits });
      }
      /* simulado */
      users[me.name].credits = (users[me.name].credits || 0) + pack.creditos;
      save('users', users);
      tx(me.name, pack.creditos, 'Compra (simulada) — pacote ' + pack.nome + ' (R$ ' + pack.preco + ',00)');
      audit(me.name, 'COMPRA DE CRÉDITOS (SIMULADA)', pack.creditos + ' créditos — R$ ' + pack.preco + ',00');
      return json(res, 200, { status: 'approved', simulated: true, balance: users[me.name].credits });
    }
    if (p[1] === 'tx' && method === 'GET') {
      const list = (me.role === 'admin' ? txs : txs.filter(t => t.user === me.name)).slice(0, 100);
      return json(res, 200, { tx: list });
    }
  }

  /* ---- histórico / auditoria ---- */
  if (p[0] === 'history' && method === 'GET') return json(res, 200, { history: (histories[me.name] || []).slice(0, 200) });
  if (p[0] === 'history' && p[1] === 'clear' && method === 'POST') {
    histories[me.name] = [];
    save('history', histories);
    audit(me.name, 'LIMPEZA DE HISTÓRICO', '—');
    return json(res, 200, { ok: true });
  }
  if (p[0] === 'audit' && method === 'GET') {
    const list = me.role === 'admin' ? audits : audits.filter(a => a.usuario === me.name);
    return json(res, 200, { audit: list.slice(0, 300) });
  }

  /* ---- dossiês ---- */
  if (p[0] === 'dossiers') {
    const mine = () => dossiersDB[me.name] || (dossiersDB[me.name] = []);
    if (!p[1] && method === 'GET') return json(res, 200, { dossiers: mine() });
    if (!p[1] && method === 'POST') {
      const titulo = String(body.titulo || '').trim(), caso = String(body.caso || '').trim();
      if (!titulo || !caso) return json(res, 400, { error: 'Título e número do caso são obrigatórios.' });
      const d = { id: crypto.randomUUID(), titulo, caso, criado: new Date().toISOString(), itens: [] };
      mine().unshift(d);
      save('dossiers', dossiersDB);
      audit(me.name, 'CRIAÇÃO DE DOSSIÊ', titulo + ' (' + caso + ')');
      return json(res, 200, { ok: true, dossier: d });
    }
    const idx = mine().findIndex(d => d.id === p[1]);
    if (idx < 0) return json(res, 404, { error: 'Dossiê não encontrado.' });
    if (method === 'GET') return json(res, 200, { dossier: mine()[idx] });
    if (method === 'DELETE') {
      audit(me.name, 'EXCLUSÃO DE DOSSIÊ', mine()[idx].titulo);
      mine().splice(idx, 1);
      save('dossiers', dossiersDB);
      return json(res, 200, { ok: true });
    }
    if (method === 'POST' && p[2] === 'items') {
      if (!body.tipo || !body.html) return json(res, 400, { error: 'Item inválido.' });
      mine()[idx].itens.push({ ts: new Date().toISOString(), tipo: String(body.tipo), query: String(body.query || '—'), html: String(body.html).slice(0, 60000) });
      save('dossiers', dossiersDB);
      audit(me.name, 'ANEXO AO DOSSIÊ', body.query || '—');
      return json(res, 200, { ok: true });
    }
  }

  /* ---- lookups (cobrança server-side + proxy das chaves) ---- */
  if (p[0] === 'lookup') {
    if (p[1] === 'cnpj' && method === 'GET') {
      const cnpj = String(p[2] || '').replace(/\D/g, '');
      if (!validaCNPJ(cnpj)) return json(res, 400, { error: 'CNPJ inválido.' });
      const c = charge(me.name, 'cnpj', fmtCNPJ(cnpj));
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      try {
        const r = await lookupCNPJ(cnpj);
        hist(me.name, 'CNPJ', fmtCNPJ(cnpj), r.data.razao);
        return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
      } catch (e) { return json(res, 502, { error: e.message }); }
    }
    if (p[1] === 'cep' && method === 'GET') {
      const cep = String(p[2] || '').replace(/\D/g, '');
      if (cep.length !== 8) return json(res, 400, { error: 'CEP inválido.' });
      const c = charge(me.name, 'cep', cep.slice(0, 5) + '-' + cep.slice(5));
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      try {
        const r = await lookupCEP(cep);
        hist(me.name, 'CEP', cep.slice(0, 5) + '-' + cep.slice(5), r.data.city + '/' + r.data.state);
        return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
      } catch (e) { return json(res, 502, { error: e.message }); }
    }
    if (p[1] === 'ip' && method === 'GET') {
      const ipq = decodeURIComponent(p[2] || '').trim();
      if (ipq && !/^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/.test(ipq)) return json(res, 400, { error: 'IP inválido.' });
      const c = charge(me.name, 'ip', ipq || '(próprio)');
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      try {
        const r = await lookupIP(ipq);
        hist(me.name, 'IP', r.data.ip, (r.data.city || '—') + ', ' + (r.data.country || '—'));
        return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
      } catch (e) { return json(res, 502, { error: e.message }); }
    }
    if (p[1] === 'telefone' && method === 'GET') {
      const raw = String(p[2] || '').replace(/\D/g, '');
      const num = ((raw.length === 12 || raw.length === 13) && raw.startsWith('55')) ? raw.slice(2) : raw;
      if (num.length < 10 || num.length > 11) return json(res, 400, { error: 'Número inválido.' });
      const c = charge(me.name, 'telefone', num);
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      const r = await lookupTelefone(num);
      hist(me.name, 'Telefone', num, r.data.operadora ? 'operadora ' + r.data.operadora : '—');
      return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
    }
    if (p[1] === 'email' && method === 'GET') {
      const email = decodeURIComponent(p[2] || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'E-mail inválido.' });
      const c = charge(me.name, 'email', email);
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      const r = await lookupEmail(email);
      hist(me.name, 'E-mail', email, (r.data.breaches ? r.data.breaches.length : 0) + ' vazamento(s)');
      return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
    }
    if (p[1] === 'vazamentos' && method === 'GET') {
      const q = decodeURIComponent(p.slice(2).join('/') || '').trim();
      if (q.length < 5) return json(res, 400, { error: 'Termo muito curto.' });
      const c = charge(me.name, 'vazamentos', q);
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      const r = await lookupVazamentos(q);
      hist(me.name, 'Vazamentos', q, (r.data.breaches ? r.data.breaches.length : 0) + ' ocorrência(s)');
      return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
    }
    if (p[1] === 'processo' && method === 'GET') {
      const numero = String(p[2] || '').replace(/\D/g, '');
      if (numero.length !== 20) return json(res, 400, { error: 'Número inválido — use os 20 dígitos do padrão CNJ (ex.: 0000832-35.2018.4.01.3202).' });
      const c = charge(me.name, 'processos', numero);
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      try {
        const r = await lookupProcesso(numero);
        hist(me.name, 'Processos', numero, r.data.classe + ' — ' + r.data.tribunal);
        return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
      } catch (e) { return json(res, 502, { error: e.message }); }
    }
    if (p[1] === 'username' && method === 'GET') {
      const nome = decodeURIComponent(String(p[2] || '')).trim().replace(/^@/, '');
      if (!/^[A-Za-z0-9._-]{2,32}$/.test(nome)) return json(res, 400, { error: 'Username inválido (2–32 caracteres: letras, números, ponto, hífen ou underscore).' });
      const c = charge(me.name, 'username', '@' + nome);
      if (!c.ok) return json(res, 402, { error: 'Créditos insuficientes.', cost: c.cost, balance: c.balance });
      const r = await lookupUsername(nome);
      hist(me.name, 'Username', '@' + nome, r.data.encontrados + ' perfil(is) público(s)');
      return json(res, 200, { fonte: r.fonte, data: r.data, balance: c.balance });
    }
  }

  /* ---- admin ---- */
  if (p[0] === 'admin') {
    if (me.role !== 'admin') return json(res, 403, { error: 'Apenas administradores.' });
    if (p[1] === 'keys' && method === 'GET') {
      const masked = {};
      for (const id of PROVIDERS) masked[id] = keys[id] ? (keys[id].length > 8 ? keys[id].slice(0, 4) + '…' + keys[id].slice(-4) : '••••') : null;
      return json(res, 200, { keys: masked, gateway: keys.mercadopago ? 'mercadopago' : 'simulado' });
    }
    if (p[1] === 'keys' && !p[2] && method === 'POST') {
      const id = String(body.id || '');
      if (!PROVIDERS.includes(id)) return json(res, 400, { error: 'Provedor desconhecido.' });
      const v = String(body.key || '').trim();
      if (v) keys[id] = v; else delete keys[id];
      save('keys', keys);
      audit(me.name, v ? 'CONFIGURAÇÃO DE INTEGRAÇÃO' : 'REMOÇÃO DE INTEGRAÇÃO', id);
      return json(res, 200, { ok: true });
    }
    if (p[1] === 'keys' && p[2] === 'test' && method === 'POST') {
      const id = String(body.id || '');
      if (!PROVIDERS.includes(id)) return json(res, 400, { error: 'Provedor desconhecido.' });
      try { return json(res, 200, { ok: true, msg: await testProviderKey(id) }); }
      catch (e) { return json(res, 200, { ok: false, msg: String(e.message || e) }); }
    }
    if (p[1] === 'grant' && method === 'POST') {
      const u = String(body.username || '').trim();
      const qtd = Math.max(1, +body.amount || 0);
      if (!users[u]) return json(res, 404, { error: 'Usuário não encontrado.' });
      users[u].credits = (users[u].credits || 0) + qtd;
      save('users', users);
      tx(u, qtd, 'Lançamento administrativo — ' + me.name);
      audit(me.name, 'LANÇAMENTO DE CRÉDITOS (ADMIN)', qtd + ' créditos → ' + u);
      return json(res, 200, { ok: true, msg: qtd + ' créditos lançados para "' + u + '".', balance: users[u].credits });
    }
    if (p[1] === 'costs' && method === 'POST') {
      const c = {};
      for (const [k, v] of Object.entries(body.costs || {})) if (k in costs) c[k] = Math.max(0, +v || 0);
      Object.assign(costs, c);
      save('costs', costs);
      audit(me.name, 'ALTERAÇÃO DE PREÇOS', 'custos atualizados');
      return json(res, 200, { ok: true, costs });
    }
    if (p[1] === 'users' && method === 'GET') {
      const list = Object.entries(users).map(([u, a]) => ({ username: u, credits: a.credits || 0, role: a.role, created: a.created }));
      return json(res, 200, { users: list });
    }
  }

  return json(res, 404, { error: 'Rota não encontrada.' });
}

/* ============================================================
   Estáticos + SPA
   ============================================================ */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.map': 'application/json'
};
function serveStatic(req, res, url) {
  let fp = decodeURIComponent(url.pathname);
  if (fp === '/') fp = '/index.html';
  const full = path.normalize(path.join(ROOT, fp));
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end('403'); }
  fs.readFile(full, (err, buf) => {
    if (err) {
      return fs.readFile(path.join(ROOT, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(idx);
      });
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    api(req, res, url).catch(e => {
      console.error('✗', req.method, url.pathname, e.message);
      try { json(res, 500, { error: 'Erro interno: ' + e.message }); } catch { }
    });
  } else {
    serveStatic(req, res, url);
  }
});

server.listen(PORT, HOST, () => {
  console.log('√ ForenseIQ back-end ouvindo em http://localhost:' + PORT);
  console.log('  • Contas e créditos: servidor · Chaves das APIs: data/keys.json (nunca no navegador)');
  console.log('  • Gateway de pagamento: ' + (keys.mercadopago ? 'Mercado Pago (PIX real)' : 'simulado (configure o token em Integrações)'));
});
process.on('unhandledRejection', e => console.error('unhandledRejection:', e));
