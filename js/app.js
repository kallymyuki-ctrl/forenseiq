/* ============================================================
   ForenseIQ — Aplicação (SPA, dual-mode)
   • Modo SERVIDOR: quando servido pelo back-end (server.js) —
     contas reais, créditos no servidor, chaves no servidor.
   • Modo LOCAL: quando aberto como site estático — tudo em
     localStorage (demonstração).
   ============================================================ */
const App = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const content = () => $('#content');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---------- Estado / armazenamento (modo local) ----------
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('fiq:' + k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem('fiq:' + k, JSON.stringify(v)); }
  };
  let user = store.get('user', null);

  // ---------- Camada de API (modo servidor) ----------
  let SERVER = null;        // null = modo local
  let serverCosts = null;   // custos vindos do servidor
  let registerMode = false;

  const Srv = {
    async call(method, p, body) {
      const r = await fetch(p, {
        method,
        credentials: 'same-origin',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      let d = null;
      try { d = await r.json(); } catch { }
      if (!r.ok) {
        const e = new Error((d && d.error) || ('HTTP ' + r.status));
        e.status = r.status; e.data = d || {};
        throw e;
      }
      return d;
    },
    get: p => Srv.call('GET', p),
    post: (p, b) => Srv.call('POST', p, b || {}),
    del: p => Srv.call('DELETE', p)
  };
  async function detectServer() {
    try {
      const r = await fetch('/api/health', { signal: AbortSignal.timeout(2500) });
      if (r.ok) { const d = await r.json(); if (d && d.ok) SERVER = d; }
    } catch { }
  }
  async function loadServerMeta() {
    if (!SERVER) return;
    try {
      const d = await Srv.get('/api/costs');
      serverCosts = d.costs;
      if (Array.isArray(d.packs) && d.packs.length) { PACKS.length = 0; d.packs.forEach(p => PACKS.push(p)); }
    } catch { }
  }

  // ---------- Créditos (modelo pré-pago) ----------
  const DEFAULT_COST = { cpf: 2, cnpj: 1, telefone: 2, email: 2, placa: 2, cep: 1, ip: 1, username: 1, vazamentos: 3, processos: 2, mandados: 1, bens: 1 };
  const PACKS = [
    { id: 'starter', nome: 'Starter', creditos: 50, preco: 49, feat: ['Todas as ferramentas', 'Suporte por e-mail', 'Créditos sem expiração'] },
    { id: 'profissional', nome: 'Profissional', creditos: 200, preco: 149, best: true, feat: ['Todas as ferramentas', 'Prioridade nas filas', 'Exportação PDF de dossiês', 'Créditos sem expiração'] },
    { id: 'enterprise', nome: 'Enterprise', creditos: 1000, preco: 499, feat: ['Tudo do Profissional', 'Melhor custo por crédito', 'Gerente de conta', 'Créditos sem expiração'] }
  ];
  const costOf = id => (SERVER && serverCosts && serverCosts[id] != null) ? serverCosts[id] : (store.get('costs', {})[id] ?? DEFAULT_COST[id] ?? 1);
  const creditsKey = () => 'credits:' + (user ? user.name : '?');
  const balance = () => SERVER ? (user ? (user.credits || 0) : 0) : store.get(creditsKey(), 0);
  function setBalance(b) { if (SERVER && user && typeof b === 'number') { user.credits = b; updateChip(); } }
  function updateChip() { const el = $('#credits-val'); if (el) el.textContent = balance(); }
  function ensureWelcome(name) {
    if (SERVER) return false;
    const k = 'credits:' + name;
    if (store.get(k, null) === null) { store.set(k, 25); return true; }
    return false;
  }
  function tx(delta, desc) {
    if (SERVER) return;
    const t = store.get('tx', []);
    t.unshift({ ts: new Date().toISOString(), user: user ? user.name : '?', delta, saldo: balance(), desc });
    store.set('tx', t.slice(0, 300));
  }
  function addCredits(n, desc) {
    if (SERVER) return;
    store.set(creditsKey(), balance() + n);
    tx(n, desc); updateChip();
  }
  function insufficient(cost) {
    toast('Créditos insuficientes para esta consulta.', 'warn');
    modal('⚡ Créditos insuficientes', `
      <p style="margin:0 0 10px">Esta consulta consome <strong>${cost} crédito(s)</strong>, mas seu saldo é <strong>${balance()}</strong>.</p>
      <p style="color:var(--txt-3);font-size:13px;margin:0 0 16px">Recarregue sua conta para continuar as investigações.</p>
      <button class="btn btn-primary btn-block" onclick="App.closeModal();App.go('creditos')">Ver pacotes de créditos</button>`);
  }
  async function charge(id, query, resumo) {
    const cost = costOf(id);
    if (SERVER) {
      try {
        const d = await Srv.post('/api/credits/charge', { module: id, query: query || '—', resumo: resumo || '' });
        setBalance(d.balance);
        return true;
      } catch (e) {
        if (e.status === 402) { setBalance((e.data && e.data.balance) || 0); insufficient(e.data && e.data.cost || cost); }
        else toast('Falha ao debitar créditos: ' + e.message, 'error');
        return false;
      }
    }
    if (balance() < cost) { insufficient(cost); return false; }
    store.set(creditsKey(), balance() - cost);
    tx(-cost, 'Consulta — ' + id.toUpperCase());
    updateChip();
    return true;
  }

  // ---------- Logs (somente modo local; no servidor, o back-end registra) ----------
  function logAudit(acao, alvo, finalidade) {
    if (SERVER) return;
    const log = store.get('audit', []);
    log.unshift({
      ts: new Date().toISOString(),
      usuario: user?.name || 'desconhecido',
      acao, alvo, finalidade: finalidade || 'Investigação autorizada',
      base: 'Art. 7º, LGPD — legítimo interesse / cumprimento de obrigação'
    });
    store.set('audit', log.slice(0, 400));
  }
  function logHistory(tipo, query, resumo) {
    if (SERVER) return;
    const h = store.get('history', []);
    h.unshift({ ts: new Date().toISOString(), tipo, query, resumo });
    store.set('history', h.slice(0, 200));
    logAudit('CONSULTA ' + tipo.toUpperCase(), query);
  }

  // ---------- Toast ----------
  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast ' + (type === 'success' ? 'ok' : type === 'error' ? 'err' : type === 'warn' ? 'warn' : '');
    const ico = { success: '✅', error: '⛔', warn: '⚠️', info: 'ℹ️' }[type] || 'ℹ️';
    el.innerHTML = `<span>${ico}</span><span>${esc(msg)}</span>`;
    $('#toast-wrap').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 3600);
  }

  // ---------- Modal ----------
  function modal(title, bodyHTML) {
    $('#modal-root').innerHTML = `
      <div class="modal-bg" onclick="if(event.target===this)App.closeModal()">
        <div class="modal">
          <div class="modal-head"><h3>${title}</h3><button class="modal-x" onclick="App.closeModal()">×</button></div>
          <div class="modal-body">${bodyHTML}</div>
        </div>
      </div>`;
  }
  const closeModal = () => $('#modal-root').innerHTML = '';

  // ---------- Helpers de UI ----------
  const kv = (label, value, mono) => `<div class="kv"><b>${label}</b><div class="${mono ? 'mono' : ''}">${value}</div></div>`;
  const loading = (msg) => `<div class="result-card"><div class="loading-box"><div class="spinner lg"></div><p>${msg}</p></div></div>`;
  const demoNotice = `<div class="notice notice-info">🧪 <div><strong>Modo demonstração.</strong> Os dados pessoais exibidos neste módulo são <u>fictícios</u>, gerados deterministicamente para fins de demonstração da interface — em conformidade com a LGPD.</div></div>`;

  function resultActions(extra = '') {
    return `<div class="result-actions no-print">
      ${extra}
      <button class="btn btn-ghost btn-sm" onclick="App.addToDossier()">📁 Adicionar ao dossiê</button>
      <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ Exportar PDF</button>
    </div>`;
  }

  let lastResult = null; // {tipo, query, html}

  async function addToDossier() {
    if (!lastResult) return toast('Nenhum resultado para adicionar.', 'warn');
    let dossies;
    if (SERVER) {
      try { dossies = (await Srv.get('/api/dossiers')).dossiers; }
      catch (e) { return toast(e.message, 'error'); }
    } else dossies = store.get('dossies', []);
    if (!dossies.length) {
      toast('Crie um dossiê primeiro.', 'warn');
      return go('dossies');
    }
    const opts = dossies.map(d => `<option value="${SERVER ? d.id : dossies.indexOf(d)}">${esc(d.titulo)} (${esc(d.caso)})</option>`).join('');
    modal('Adicionar ao dossiê', `
      <label class="field"><span>Selecione o dossiê</span><select id="dossie-pick">${opts}</select></label>
      <button class="btn btn-primary btn-block" onclick="App.confirmAddToDossier()">Adicionar</button>`);
  }
  async function confirmAddToDossier() {
    const val = $('#dossie-pick').value;
    if (SERVER) {
      try {
        await Srv.post('/api/dossiers/' + val + '/items', { tipo: lastResult.tipo, query: lastResult.query, html: lastResult.html });
        closeModal();
        toast('Resultado anexado ao dossiê.', 'success');
      } catch (e) { toast(e.message, 'error'); }
      return;
    }
    const i = +val;
    const dossies = store.get('dossies', []);
    dossies[i].itens.push({ ts: new Date().toISOString(), tipo: lastResult.tipo, query: lastResult.query, html: lastResult.html });
    store.set('dossies', dossies);
    closeModal();
    toast('Resultado anexado ao dossiê "' + dossies[i].titulo + '".', 'success');
    logAudit('ANEXO AO DOSSIÊ', lastResult.query);
  }

  // ============================================================
  // VIEWS
  // ============================================================
  const views = {};

  // ---------- Dashboard ----------
  views.dashboard = async () => {
    let h, doss, auditLen;
    if (SERVER) {
      try {
        const s = await Srv.get('/api/summary');
        h = s.history; doss = s.dossiers; auditLen = s.auditLength; setBalance(s.credits);
      } catch { h = []; doss = []; auditLen = 0; }
    } else {
      h = store.get('history', []);
      doss = store.get('dossies', []);
      auditLen = store.get('audit', []).length;
    }
    const hoje = h.filter(x => x.ts.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
    const dias = [...Array(7)].map((_, i) => {
      const dt = new Date(Date.now() - (6 - i) * 864e5);
      const key = dt.toISOString().slice(0, 10);
      return { lab: dt.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3), n: h.filter(x => x.ts.slice(0, 10) === key).length };
    });
    const max = Math.max(1, ...dias.map(x => x.n));

    const tools = [
      ['cpf', '🪪', 'Consulta CPF', 'Dados cadastrais, endereço, vínculos'],
      ['cnpj', '🏢', 'Consulta CNPJ', 'Situação cadastral, sócios, CNAE'],
      ['telefone', '📞', 'Telefone', 'Operadora, tipo, titular provável'],
      ['email', '✉️', 'E-mail', 'Validação, reputação, vazamentos'],
      ['placa', '🚗', 'Placa Veicular', 'Veículo, restrições, débitos'],
      ['ip', '🌐', 'IP / Geo', 'Localização, ASN, provedor'],
      ['username', '👤', 'Busca de Usuário', 'Presença em 18+ redes sociais'],
      ['vazamentos', '🚨', 'Vazamentos', 'Exposição em data breaches'],
      ['osintbrasil', '🇧🇷', 'Hub OSINT Brasil', '150+ fontes e ferramentas oficiais'],
      ['dorks', '⚡', 'Google Dorks', 'Gerador de dorks táticos avançados'],
      ['recon', '📡', 'Recon Infra & Domínios', 'Shodan, IntelX, Wayback, DNS'],
      ['cripto', '🪙', 'Cripto & Blockchain', 'Rastreamento BTC, ETH, USDT e golpes'],
      ['aeronaves', '✈️', 'Aeronaves & Embarcações', 'RAB/ANAC, FlightRadar, Marinha'],
      ['forense', '🔬', 'Forense & Hashes', 'Cálculo SHA-256 de custódia e EXIF'],
      ['framework', '🧭', 'Metodologia & Framework', 'Taxonomia OSINT e boas práticas'],
      ['processos', '⚖️', 'Processos Jurídicos', 'DataJud/CNJ — consulta oficial'],
      ['mandados', '🧾', 'Mandados & Certidões', 'BNMP, PGFN, TST e protestos'],
      ['bens', '💼', 'Patrimônio', 'Participações e execuções']
    ];

    content().innerHTML = `
      <div class="view-head">
        <h1>▦ Dashboard</h1>
        <p>Bem-vindo(a), <strong>${esc(user.name)}</strong> · Saldo: <strong style="color:var(--accent)">⚡ ${balance()} créditos</strong> · Visão geral das suas atividades investigativas.</p>
      </div>

      <div class="grid-4">
        <div class="stat-card"><div class="s-ico">🔍</div><div class="s-val">${h.length}</div><div class="s-lab">Consultas realizadas</div><span class="s-delta up">total</span></div>
        <div class="stat-card"><div class="s-ico">⚡</div><div class="s-val">${hoje}</div><div class="s-lab">Consultas hoje</div><span class="s-delta up">24h</span></div>
        <div class="stat-card"><div class="s-ico">📁</div><div class="s-val">${doss.length}</div><div class="s-lab">Dossiês ativos</div><span class="s-delta up">casos</span></div>
        <div class="stat-card"><div class="s-ico">🧾</div><div class="s-val">${auditLen}</div><div class="s-lab">Eventos de auditoria</div><span class="s-delta up">LGPD</span></div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="card bars-wrap">
          <h3>📊 Consultas — últimos 7 dias</h3>
          <div class="bars">${dias.map(x => `<div class="bar" style="height:${(x.n / max) * 100}%" title="${x.n} consulta(s)"><small>${x.lab}</small></div>`).join('')}</div>
        </div>
        <div class="card">
          <h3>🕑 Atividade recente</h3>
          ${h.length ? `<ul class="timeline">${h.slice(0, 5).map(x => `
            <li><time>${new Date(x.ts).toLocaleString('pt-BR')}</time><p><span class="tag tag-info">${esc(x.tipo)}</span> &nbsp;<span class="mono">${esc(x.query)}</span></p></li>`).join('')}</ul>`
          : `<div class="empty"><div class="e-ico">🗂️</div>Nenhuma consulta ainda.<br>Use o menu lateral ou a busca inteligente.</div>`}
        </div>
      </div>

      <h3 style="margin:26px 0 14px;font-size:15px">🧰 Acesso rápido às ferramentas</h3>
      <div class="grid-4">
        ${tools.map(t => `<div class="tool-card" onclick="App.go('${t[0]}')"><div class="t-ico">${t[1]}</div><div><strong>${t[2]}</strong><span>${t[3]}</span></div></div>`).join('')}
      </div>`;
  };

  // ---------- Busca genérica (painel) ----------
  function searchPanel(id, placeholder, btnLabel, hint, extra = '') {
    const cost = costOf(id);
    return `
      <div class="search-panel">
        <form class="search-form" onsubmit="event.preventDefault();App.run('${id}')">
          ${extra}
          <input type="text" id="q-${id}" placeholder="${placeholder}" autocomplete="off" />
          <button type="submit" class="btn btn-primary" id="btn-${id}">🔍 ${btnLabel}</button>
        </form>
        <div class="search-hint">${hint} <span class="tag tag-cost">⚡ ${cost} crédito${cost > 1 ? 's' : ''} por consulta</span></div>
      </div>
      <div id="res-${id}"></div>`;
  }

  // ---------- CPF ----------
  views.cpf = () => {
    content().innerHTML = `
      <div class="view-head"><h1>🪪 Consulta CPF</h1><p>Dados cadastrais completos, endereço, contatos, score e vínculos familiares a partir do CPF.</p></div>
      ${demoNotice}
      ${searchPanel('cpf', 'Digite o CPF — ex.: 529.982.247-25', 'Consultar', 'Aceita CPF com ou sem pontuação. O dígito verificador é validado de verdade; os dados retornados são fictícios.')}`;
  };

  async function runCPF(q) {
    const clean = q.replace(/\D/g, '');
    if (!Mock.validaCPF(clean)) {
      $('#res-cpf').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>CPF inválido.</strong> O número informado não passa na validação do dígito verificador. Exemplo válido para teste: <code>011.964.550-58</code> ou <code>529.982.247-25</code></div></div>`;
      return;
    }
    const p = Mock.pessoa(clean);
    if (!(await charge('cpf', p.cpf, p.nome))) return;
    logHistory('CPF', p.cpf, p.nome);

    const kpis = p.contadores || {
      enderecos: (p.enderecos || []).length,
      telefones: (p.telefones || []).length,
      emails: (p.emails || []).length,
      parentes: (p.parentes || []).length,
      empresas: (p.empresas || []).length,
      veiculos: (p.veiculos || []).length,
      imoveis: 0,
      empregos: 1,
      beneficios: (p.beneficios || []).length,
      vacinas: (p.vacinas || []).length
    };

    const html = `
      <div class="result-card" id="cpf-dossier-card">
        <!-- Cabeçalho do Dossiê -->
        <div class="result-head" style="align-items:flex-start">
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div class="avatar lg" style="font-size:26px;width:56px;height:56px;border-radius:14px;background:var(--accent-grad);color:#04141a;font-weight:900;display:grid;place-items:center">
              ${esc(p.nome[0])}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <h2 style="font-size:20px;font-weight:800;letter-spacing:-.02em;margin:0">${esc(p.nome)}</h2>
                ${p.indicativoCriminal ? '<span class="badge-criminal">🚨 INDICATIVO CRIMINAL</span>' : '<span class="badge-clean">🛡️ CADASTRO REGULAR</span>'}
                <span class="tag ${p.situacao === 'REGULAR' ? 'tag-ok' : 'tag-warn'}">${esc(p.situacao)}</span>
              </div>
              <div style="color:var(--txt-2);font-size:13.5px;margin-top:4px">
                CPF: <strong class="mono" style="color:var(--accent)">${esc(p.cpf)}</strong> · Nascimento: <strong>${esc(p.nascimento)}</strong> (${esc(p.idade)} anos · ${esc(p.signo || '—')})
              </div>
            </div>
          </div>
          ${resultActions()}
        </div>

        <div class="result-body" style="padding:22px">
          <!-- KPI Summary Cards (Contadores) -->
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-val">${kpis.enderecos}</div><div class="kpi-label">Endereços</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.telefones}</div><div class="kpi-label">Telefones</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.emails}</div><div class="kpi-label">E-mails</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.parentes}</div><div class="kpi-label">Parentes</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.empresas}</div><div class="kpi-label">Empresas</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.veiculos}</div><div class="kpi-label">Veículos</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.imoveis}</div><div class="kpi-label">Imóveis</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.empregos}</div><div class="kpi-label">Empregos</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.beneficios}</div><div class="kpi-label">Benefícios</div></div>
            <div class="kpi-card"><div class="kpi-val">${kpis.vacinas}</div><div class="kpi-label">Vacinas</div></div>
          </div>

          <!-- 1. Dados Cadastrais & Documentos -->
          <h3 style="margin:24px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">🪪 Dados Pessoais & Documentos de Identificação</h3>
          <div class="kv-grid">
            ${kv('Nome Completo', esc(p.nome))}
            ${kv('CPF', p.cpf, 1)}
            ${kv('Nome da Mãe', esc(p.nomeMae || '—'))}
            ${kv('Nome do Pai', esc(p.nomePai || '—'))}
            ${kv('Data de Nascimento', p.nascimento + ' (' + p.idade + ' anos)')}
            ${kv('Signo', esc(p.signo || '—'))}
            ${kv('Sexo / Gênero', esc(p.sexo))}
            ${kv('Naturalidade', esc(p.naturalidade || (p.cidade + '/' + p.uf)))}
            ${kv('Nacionalidade', esc(p.nacionalidade || 'Brasileiro'))}
            ${kv('RG (Identidade)', esc(p.rg || '—') + (p.rgData ? ' · Emissão: ' + p.rgData : ''), 1)}
            ${kv('CNS (Cartão SUS)', esc(p.cns || '—'), 1)}
            ${kv('Título de Eleitor', esc(p.tituloEleitor || '—'), 1)}
            ${kv('CNH (Habilitação)', esc(p.cnh || '—') + (p.cnhPrimeiraHab ? ' · 1ª Hab: ' + p.cnhPrimeiraHab : ''), 1)}
            ${kv('Escolaridade', Array.isArray(p.escolaridade) ? p.escolaridade.join(' · ') : esc(p.escolaridade || 'SUPERIOR COMPLETO'))}
            ${kv('Renda Estimada', esc(p.rendaEstimada))}
            ${kv('Classe Social', (p.classeSocial || 'B') + (p.subclasseSocial ? ' (Subclasse ' + p.subclasseSocial + ')' : ''))}
          </div>

          <!-- 2. Histórico Criminal & Mandados (BNMP/CNJ) -->
          <h3 style="margin:28px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">
            🚨 Histórico Criminal & Peças Judiciais (${(p.historicoCriminal || []).length})
          </h3>
          ${(p.historicoCriminal && p.historicoCriminal.length) ? `
            <div class="notice notice-warn" style="margin-bottom:14px">
              ⚖️ <div><strong>Aviso legal:</strong> Estes registros têm caráter histórico e finalidade meramente informativa conforme dados do BNMP e Diários Oficiais.</div>
            </div>
            ${p.historicoCriminal.map(h => `
              <div class="piece-card">
                <div class="piece-head">
                  <div style="display:flex;gap:12px;align-items:center">
                    <div class="piece-num ${h.tipo.includes('Soltura') || h.tipo.includes('Cumprimento') ? 'ok' : ''}">${h.num}</div>
                    <div>
                      <strong style="font-size:14px;color:var(--txt)">${esc(h.tipo)}</strong>
                      <div style="font-size:12px;color:var(--txt-2);margin-top:2px">${esc(h.especie || h.motivo || 'Medida Processual')} · <span class="tag tag-mut">${esc(h.tribunal)}</span></div>
                    </div>
                  </div>
                  <span class="badge-tag free">${esc(h.expedicao)}</span>
                </div>
                <div class="piece-meta">
                  <div><b>Processo:</b> <span class="mono">${esc(h.processo)}</span></div>
                  <div><b>Peça:</b> <span class="mono">${esc(h.peca)}</span></div>
                  <div><b>Comarca:</b> ${esc(h.comarca || '—')}</div>
                  <div><b>Órgão Expedidor:</b> ${esc(h.orgao)}</div>
                </div>
              </div>`).join('')}`
            : '<div class="notice notice-info">🛡️ <div>Nenhum mandado de prisão ou medida cautelar restritiva registrado nas bases públicas consultadas.</div></div>'}

          <!-- 3. Endereços Históricos -->
          <h3 style="margin:28px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">
            📍 Endereços Históricos (${(p.enderecos || [p.endereco]).length})
          </h3>
          <div style="display:grid;gap:8px">
            ${(p.enderecos || [p.endereco]).map((end, idx) => `
              <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px">
                <div style="width:28px;height:28px;border-radius:6px;background:rgba(34,211,238,.1);color:var(--accent);display:grid;place-items:center;font-size:11px;font-weight:800;flex-shrink:0">${idx+1}</div>
                <div style="font-size:13px;line-height:1.4">${esc(end)}</div>
              </div>`).join('')}
          </div>

          <!-- 4. Telefones Vinculados & Ratings -->
          <h3 style="margin:28px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">
            📞 Telefones Vinculados (${(p.telefones || [p.telefone]).length})
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
            ${(p.telefones || [{ num: p.telefone, score: 'A' }]).map(t => {
              const num = typeof t === 'object' ? t.num : t;
              const sc = (typeof t === 'object' ? t.score : 'B').toLowerCase();
              const cleanTel = num.replace(/\D/g, '');
              return `
                <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px">
                  <div>
                    <span class="mono" style="font-weight:700;font-size:13px">${esc(num)}</span>
                    <div style="font-size:11px;color:var(--txt-3);margin-top:2px">Score de Assertividade</div>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center">
                    <span class="rating-badge ${sc}">${sc.toUpperCase()}</span>
                    <a href="https://wa.me/55${cleanTel}" target="_blank" rel="noopener noreferrer" style="font-size:14px" title="Abrir no WhatsApp">💬</a>
                  </div>
                </div>`;
            }).join('')}
          </div>

          <!-- 5. E-mails & Credenciais Vazadas -->
          <h3 style="margin:28px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">
            ✉️ E-mails & Credenciais Expostas (${(p.emails || [p.email]).length})
          </h3>
          <div style="display:grid;gap:10px">
            ${(p.emails || [{ mail: p.email, senhaVazada: '******', score: 'OTIMO' }]).map(em => {
              const mail = typeof em === 'object' ? em.mail : em;
              const pwd = typeof em === 'object' ? em.senhaVazada : null;
              const sc = (typeof em === 'object' ? em.score : 'BOM').toLowerCase();
              return `
                <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
                  <div>
                    <strong class="mono" style="font-size:13.5px;color:var(--accent)">${esc(mail)}</strong>
                    ${pwd ? `<div style="font-size:12px;color:var(--txt-2);margin-top:3px">🔑 Senha exposta em vazamento histórico: <code style="color:var(--warn);background:rgba(251,191,36,.1)">${esc(pwd)}</code></div>` : ''}
                  </div>
                  <span class="score-text-badge ${sc}">${sc.toUpperCase()}</span>
                </div>`;
            }).join('')}
          </div>

          <!-- 6. Pessoas Próximas & Parentesco -->
          <h3 style="margin:28px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">
            👨‍👩‍👧‍👦 Pessoas Próximas & Vínculos Familiares (${(p.parentes || []).length})
          </h3>
          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Grau de Parentesco</th>
                  <th>CPF</th>
                  <th>Nascimento / Idade</th>
                  <th>Renda Estimada</th>
                  <th>Profissão</th>
                  <th>Localidade</th>
                </tr>
              </thead>
              <tbody>
                ${(p.parentes || []).map(par => `
                  <tr>
                    <td><strong>${esc(par.nome)}</strong></td>
                    <td><span class="tag tag-mut">${esc(par.vinculo)}</span></td>
                    <td class="mono">${esc(par.cpf || '—')}</td>
                    <td>${esc(par.nasc || '—')}</td>
                    <td>${esc(par.renda || '—')}</td>
                    <td>${esc(par.prof || '—')}</td>
                    <td>${esc(par.local || '—')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>

          <!-- 7. Veículos & Empresas -->
          <div class="grid-2" style="margin-top:20px">
            <div>
              <h3 style="margin-bottom:12px;font-size:14.5px">🚗 Veículos Registrados (${(p.veiculos || []).length})</h3>
              ${(p.veiculos && p.veiculos.length) ? p.veiculos.map(v => `
                <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <strong style="color:var(--accent)">${esc(v.placa)}</strong>
                    <span class="tag tag-info">${esc(v.ano)} · ${esc(v.cor)}</span>
                  </div>
                  <div style="font-size:13px;font-weight:600">${esc(v.modelo)}</div>
                  <div style="font-size:11.5px;color:var(--txt-3);margin-top:4px">Renavam: <span class="mono">${esc(v.renavam)}</span> · Chassi: <span class="mono">${esc(v.chassi)}</span></div>
                </div>`).join('') : '<div class="notice notice-info">Nenhum veículo ativo localizado.</div>'}
            </div>

            <div>
              <h3 style="margin-bottom:12px;font-size:14.5px">🏢 Empresas & MEI (${(p.empresas || []).length})</h3>
              ${(p.empresas && p.empresas.length) ? p.empresas.map(emp => `
                <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <strong class="mono" style="color:var(--accent)">${esc(emp.cnpj)}</strong>
                    <span class="tag tag-ok">${esc(emp.tipo || 'MEI')}</span>
                  </div>
                  <div style="font-size:13px;font-weight:600">${esc(emp.razao)}</div>
                </div>`).join('') : '<div class="notice notice-info">Nenhuma participação societária ativa.</div>'}
            </div>
          </div>

          <!-- 8. Benefícios & Vacinas -->
          <div class="grid-2" style="margin-top:16px">
            <div>
              <h3 style="margin-bottom:12px;font-size:14.5px">🏛️ Benefícios Sociais / Governamentais</h3>
              ${(p.beneficios && p.beneficios.length) ? p.beneficios.map(b => `
                <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:13px">${esc(b.tipo)}</strong>
                    <span class="tag tag-ok">${esc(b.valor)}</span>
                  </div>
                  <div style="font-size:12px;color:var(--txt-2);margin-top:4px">Município: ${esc(b.municipio)}/${esc(b.uf)} · NIS: ${esc(b.nis)}</div>
                </div>`).join('') : '<div class="notice notice-info">Sem registros de benefícios.</div>'}
            </div>

            <div>
              <h3 style="margin-bottom:12px;font-size:14.5px">💉 Histórico de Imunização (SUS / Datasus)</h3>
              ${(p.vacinas && p.vacinas.length) ? p.vacinas.map(vac => `
                <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:12.5px">${esc(vac.vacina)}</strong>
                    <span class="badge-tag free">${esc(vac.dose)}</span>
                  </div>
                  <div style="font-size:11.5px;color:var(--txt-2);margin-top:3px">Lote: <span class="mono">${esc(vac.lote)}</span> · Data: ${esc(vac.data)}</div>
                  <div style="font-size:11px;color:var(--txt-3);margin-top:2px">${esc(vac.local)}</div>
                </div>`).join('') : '<div class="notice notice-info">Sem registros de vacinas.</div>'}
            </div>
          </div>

          <!-- 9. Atividade Online & Avaliações -->
          ${(p.atividadeOnline && p.atividadeOnline.avaliacoes) ? `
            <h3 style="margin:28px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">
              🌐 Atividade Online & Avaliações Públicas (${p.atividadeOnline.avaliacoes.length})
            </h3>
            <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>Perfil Local Guides: ${esc(p.atividadeOnline.perfil)}</strong>
                <span class="tag tag-info">${esc(p.atividadeOnline.nivel)}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
              ${p.atividadeOnline.avaliacoes.map(av => `
                <div style="background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:13px">${esc(av.local)}</strong>
                    <span class="tag tag-warn">⭐ ${esc(av.nota)}</span>
                  </div>
                  <small style="color:var(--txt-3);font-size:11.5px">${esc(av.endereco)}</small>
                  ${av.resposta ? `<div style="background:var(--panel);border-left:3px solid var(--accent);padding:6px 8px;border-radius:4px;font-size:11.5px;color:var(--txt-2);margin-top:4px"><em>${esc(av.resposta)}</em></div>` : ''}
                </div>`).join('')}
            </div>` : ''}

          <!-- 10. Propensões & Hábitos de Consumo -->
          <h3 style="margin:28px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">
            🛍️ Propensões de Consumo & Perfil Comportamental
          </h3>
          <div class="propensoes-wrap">
            ${(p.propensoes || []).map(pr => `<span class="propensao-pill">${esc(pr)}</span>`).join('')}
          </div>

          <!-- 11. Linha do Tempo da Vida (Life Timeline) -->
          <h3 style="margin:32px 0 14px;font-size:16px;display:flex;align-items:center;gap:8px">
            ⏳ Linha do Tempo Cronológica Completa (${(p.timeline || []).length} Marcos)
          </h3>
          <div style="display:grid;gap:8px">
            ${(p.timeline || []).map(ev => {
              const catClass = (ev.cat || 'pessoal').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
              return `
                <div class="timeline-event">
                  <div class="timeline-event-head">
                    <span class="timeline-year">${esc(ev.ano)}</span>
                    <span class="badge-tag free">${esc(ev.data)}</span>
                    <span class="timeline-cat-tag ${catClass}">${esc(ev.cat)}</span>
                  </div>
                  <strong style="font-size:13.5px;color:var(--txt);display:block">${esc(ev.tit)}</strong>
                  <div style="font-size:12px;color:var(--txt-2);margin-top:3px">${esc(ev.desc)}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    $('#res-cpf').innerHTML = html;
    lastResult = { tipo: 'CPF', query: p.cpf, html };
  }

  // ---------- CNPJ ----------
  views.cnpj = () => {
    content().innerHTML = `
      <div class="view-head"><h1>🏢 Consulta CNPJ</h1><p>Situação cadastral na Receita, quadro societário, CNAE, capital social e contatos. ${SERVER ? 'A consulta é feita pelo servidor (suas chaves ficam lá).' : 'Com chave CNPJ.ws ativa, usa seu plano pago; senão, dados públicos via BrasilAPI.'}</p></div>
      ${searchPanel('cnpj', 'Digite o CNPJ — ex.: 00.000.000/0001-91', 'Consultar', 'Dados públicos reais quando disponíveis. Exemplo real: <code>00.000.000/0001-91</code> (Banco do Brasil).')}`;
  };

  async function runCNPJ(q) {
    const clean = q.replace(/\D/g, '');
    if (!Mock.validaCNPJ(clean)) {
      $('#res-cnpj').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>CNPJ inválido.</strong> Dígito verificador incorreto. Exemplo válido: <code>00.000.000/0001-91</code></div></div>`;
      return;
    }
    $('#res-cnpj').innerHTML = loading('Consultando bases da Receita Federal…');
    let e = null, fonte = '';
    if (SERVER) {
      try {
        const d = await Srv.get('/api/lookup/cnpj/' + clean);
        setBalance(d.balance);
        e = d.data; fonte = d.fonte;
      } catch (err) {
        $('#res-cnpj').innerHTML = '';
        if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
        if (err.status === 400) {
          $('#res-cnpj').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>CNPJ inválido.</strong></div></div>`;
          return;
        }
        e = Mock.empresa(clean); fonte = 'Servidor/APIs indisponíveis — demonstração';
      }
    } else {
      if (!(await charge('cnpj', Mock.fmtCNPJ(clean)))) return;
      const keys = store.get('keys', {});
      const viaCnpjWS = async () => {
        const r = await fetch('https://api.cnpj.ws/cnpj/' + clean, { headers: { x_api_key: keys.cnpjws }, signal: AbortSignal.timeout(9000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        const est = d.estabelecimento || {};
        return {
          cnpj: Mock.fmtCNPJ(clean),
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
        };
      };
      const viaBrasilAPI = async () => {
        const resp = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + clean, { signal: AbortSignal.timeout(9000) });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const d = await resp.json();
        return {
          cnpj: Mock.fmtCNPJ(clean),
          razao: d.razao_social, fantasia: d.nome_fantasia || '—',
          abertura: d.data_inicio_atividade?.split('-').reverse().join('/') || '—',
          situacao: d.descricao_situacao_cadastral || '—',
          natureza: d.natureza_juridica || '—',
          cnae: (d.cnae_fiscal || '') + ' — ' + (d.cnae_fiscal_descricao || ''),
          capital: 'R$ ' + (+d.capital_social || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          porte: d.porte || '—',
          endereco: [d.descricao_tipo_de_logradouro, d.logradouro, d.numero].filter(Boolean).join(' '),
          cidade: d.municipio, uf: d.uf,
          telefone: d.ddd_telefone_1 || '—', email: d.email || '—',
          socios: (d.qsa || []).map(s => ({ nome: s.nome_socio, qual: s.qualificacao_socio }))
        };
      };
      if (keys.cnpjws) { try { e = await viaCnpjWS(); fonte = 'CNPJ.ws · plano pago (sua chave)'; } catch { } }
      if (!e) { try { e = await viaBrasilAPI(); fonte = 'BrasilAPI · dados públicos reais'; } catch { } }
      if (!e) { e = Mock.empresa(clean); fonte = 'Fallback demonstração · dados fictícios'; }
      logHistory('CNPJ', Mock.fmtCNPJ(clean), e.razao);
    }
    const ativa = /ativa/i.test(e.situacao);
    const html = `
      <div class="result-card">
        <div class="result-head">
          <h3>🏢 ${esc(e.razao)} <span class="tag ${ativa ? 'tag-ok' : 'tag-bad'}">${esc(e.situacao)}</span></h3>
          ${resultActions()}
        </div>
        <div class="result-body">
          <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>${fonte}</strong></div></div>
          <div class="kv-grid">
            ${kv('CNPJ', e.cnpj, 1)}
            ${kv('Nome fantasia', esc(e.fantasia))}
            ${kv('Abertura', e.abertura)}
            ${kv('Natureza jurídica', esc(e.natureza))}
            ${kv('CNAE principal', esc(e.cnae))}
            ${kv('Capital social', e.capital)}
            ${kv('Porte', e.porte)}
            ${kv('Endereço', esc(e.endereco))}
            ${kv('Cidade/UF', esc(e.cidade) + ' / ' + esc(e.uf))}
            ${kv('Telefone', esc(e.telefone), 1)}
            ${kv('E-mail', esc(e.email), 1)}
          </div>
          <h3 style="margin:22px 0 10px">👥 Quadro societário</h3>
          ${e.socios.length ? `<table><thead><tr><th>Nome</th><th>Qualificação</th></tr></thead>
          <tbody>${e.socios.map(s => `<tr><td>${esc(s.nome)}</td><td><span class="tag tag-mut">${esc(s.qual)}</span></td></tr>`).join('')}</tbody></table>` : '<p style="color:var(--txt-3)">Sem sócios informados.</p>'}
        </div>
      </div>`;
    $('#res-cnpj').innerHTML = html;
    lastResult = { tipo: 'CNPJ', query: e.cnpj, html };
  }

  // ---------- Telefone ----------
  views.telefone = () => {
    content().innerHTML = `
      <div class="view-head"><h1>📞 Consulta de Telefone</h1><p>Identificação de operadora, tipo de linha, UF do DDD, portabilidade e titular provável.</p></div>
      ${demoNotice}
      ${searchPanel('telefone', 'Digite o telefone — ex.: (11) 98765-4321', 'Consultar', 'Aceita fixo ou móvel, com ou sem formatação. A UF do DDD é real; com chave NumVerify ativa, operadora e tipo de linha são reais.')}`;
  };

  async function runTelefone(q) {
    const raw = q.replace(/\D/g, '');
    const clean = ((raw.length === 12 || raw.length === 13) && raw.startsWith('55')) ? raw.slice(2) : raw;
    if (clean.length < 10 || clean.length > 11) {
      $('#res-telefone').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Número inválido.</strong> Informe DDD + número (10 ou 11 dígitos).</div></div>`;
      return;
    }
    const t = Mock.telefone(clean);
    let fonte = 'Demonstração · dados fictícios (UF do DDD real)';
    if (SERVER) {
      try {
        const d = await Srv.get('/api/lookup/telefone/' + clean);
        setBalance(d.balance);
        if (d.data.operadora) t.operadora = d.data.operadora;
        if (d.data.tipo) t.tipo = d.data.tipo;
        fonte = d.fonte;
      } catch (err) {
        if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
        if (err.status === 400) { $('#res-telefone').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Número inválido.</strong></div></div>`; return; }
        fonte = 'Servidor indisponível — demonstração';
      }
    } else {
      if (!(await charge('telefone', t.numero, t.titularProvavel))) return;
      const keys = store.get('keys', {});
      if (keys.numverify) {
        try {
          const r = await fetch('https://apilayer.net/api/validate?access_key=' + encodeURIComponent(keys.numverify) + '&number=55' + clean, { signal: AbortSignal.timeout(9000) });
          const d = await r.json();
          if (d && d.valid) {
            t.operadora = d.carrier || t.operadora;
            t.tipo = ({ mobile: 'Móvel', landline: 'Fixo', voip: 'VoIP', toll_free: 'Gratuito (0800)', premium_rate: 'Tarifa premium' })[d.line_type] || t.tipo;
            fonte = 'NumVerify · API paga (sua chave) — operadora e tipo de linha reais';
          } else if (d && d.error) fonte = 'NumVerify recusou a chave — exibindo dados de demonstração';
        } catch { fonte = 'NumVerify inacessível (rede/CORS) — exibindo dados de demonstração'; }
      }
      logHistory('Telefone', t.numero, t.titularProvavel);
    }
    const html = `
      <div class="result-card">
        <div class="result-head">
          <h3>📞 ${t.numero} <span class="tag ${t.ativo ? 'tag-ok' : 'tag-bad'}">${t.ativo ? 'LINHA ATIVA' : 'LINHA INATIVA'}</span></h3>
          ${resultActions()}
        </div>
        <div class="result-body">
          <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>${fonte}</strong></div></div>
          <div class="kv-grid">
            ${kv('Tipo de linha', t.tipo)}
            ${kv('Operadora atual', t.operadora)}
            ${kv('Portabilidade', t.portado ? 'Sim — número portado' : 'Não')}
            ${kv('UF do DDD', t.uf)}
            ${kv('WhatsApp', t.whatsapp ? '✅ Conta detectada' : '— Não detectado')}
            ${kv('Titular provável', esc(t.titularProvavel))}
            ${kv('Documento (mascarado)', t.titularDoc, 1)}
          </div>
          <div class="src-grid" style="margin-top:16px">
            <a class="src-item" href="https://wa.me/55${clean}" target="_blank" rel="noopener">
              <div class="src-ico">💬</div>
              <div style="flex:1"><strong>Testar no WhatsApp (real)</strong><small>Abre o chat se a linha tiver conta — verificação gratuita e oficial do próprio WhatsApp.</small></div>
              <span class="src-go">abrir ↗</span>
            </a>
            <a class="src-item" href="https://agitel.com.br/consulta-operadora" target="_blank" rel="noopener">
              <div class="src-ico">📶</div>
              <div style="flex:1"><strong>Consultar operadora real (grátis)</strong><small>Portabilidade numérica em tempo real — ferramenta gratuita, sem cadastro (Agitel Telecom).</small></div>
              <span class="src-go">abrir ↗</span>
            </a>
          </div>
          <div class="notice notice-warn" style="margin-top:14px">⚖️ <div><strong>Titular da linha</strong> (nome/CPF) é dado restrito — só o titular, a operadora mediante autorização, ordem judicial ou investigação policial. Nenhum serviço legítimo fornece isso.</div></div>
        </div>
      </div>`;
    $('#res-telefone').innerHTML = html;
    lastResult = { tipo: 'Telefone', query: t.numero, html };
  }

  // ---------- E-mail ----------
  views.email = () => {
    content().innerHTML = `
      <div class="view-head"><h1>✉️ Análise de E-mail</h1><p>Validação sintática e de domínio, reputação, redes sociais vinculadas e exposição em vazamentos.</p></div>
      ${demoNotice}
      ${searchPanel('email', 'Digite o e-mail — ex.: alvo@exemplo.com', 'Analisar', 'Com chaves ZeroBounce/HIBP ativas, validação e vazamentos são reais; sem chaves, tudo em demonstração.')}`;
  };

  async function runEmail(q) {
    const e = Mock.email(q);
    if (!e.valido) {
      $('#res-email').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>E-mail inválido.</strong> Verifique a sintaxe (ex.: nome@dominio.com).</div></div>`;
      return;
    }
    let fonte = 'Demonstração · dados fictícios';
    if (SERVER) {
      try {
        const d = await Srv.get('/api/lookup/email/' + encodeURIComponent(q.trim()));
        setBalance(d.balance);
        const x = d.data || {};
        if (x.valid !== null && x.valid !== undefined) e.valido = x.valid;
        if (x.descartavel !== null && x.descartavel !== undefined) e.descartavel = x.descartavel;
        if (x.mx !== null && x.mx !== undefined) e.mx = x.mx;
        if (x.tipoDominio) e.tipoDominio = x.tipoDominio;
        if (Array.isArray(x.breaches)) e.vazamentos = x.breaches;
        fonte = d.fonte;
      } catch (err) {
        if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
        if (err.status === 400) { $('#res-email').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>E-mail inválido.</strong></div></div>`; return; }
        fonte = 'Servidor indisponível — demonstração';
      }
    } else {
      if (!(await charge('email', e.email, e.vazamentos.length + ' vazamento(s)'))) return;
      const keys = store.get('keys', {});
      if (keys.zerobounce) {
        try {
          const r = await fetch('https://api.zerobounce.net/v2/validate?api_key=' + encodeURIComponent(keys.zerobounce) + '&email=' + encodeURIComponent(q.trim()), { signal: AbortSignal.timeout(9000) });
          const d = await r.json();
          if (d && !d.error) {
            e.valido = d.status === 'valid';
            e.descartavel = d.status === 'disposable' || d.status === 'do_not_mail';
            e.mx = String(d.mx_found).toLowerCase() === 'true';
            if (typeof d.free_email === 'boolean') e.tipoDominio = d.free_email ? 'Provedor gratuito (webmail)' : 'Domínio corporativo/próprio';
            fonte = 'ZeroBounce · API paga (sua chave) — validação real';
          } else if (d && d.error) fonte = 'ZeroBounce recusou a chave — validação em demonstração';
        } catch { fonte = 'ZeroBounce inacessível (CORS — requer proxy em produção) — demonstração'; }
      }
      if (keys.hibp) {
        try {
          const r = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(q.trim()) + '?truncateResponse=false', { headers: { 'hibp-api-key': keys.hibp }, signal: AbortSignal.timeout(9000) });
          if (r.ok) {
            const arr = await r.json();
            e.vazamentos = arr.map(b => ({ name: b.Name, date: b.BreachDate || '', size: (b.PwnCount || 0).toLocaleString('pt-BR') + ' contas', data: (b.DataClasses || []).slice(0, 6) }));
            fonte += ' · Vazamentos reais via HIBP';
          } else if (r.status === 404) { e.vazamentos = []; fonte += ' · HIBP: sem exposição registrada'; }
        } catch { fonte += ' · HIBP inacessível (CORS — requer proxy em produção)'; }
      }
      logHistory('E-mail', e.email, e.vazamentos.length + ' vazamento(s)');
    }
    const html = `
      <div class="result-card">
        <div class="result-head">
          <h3>✉️ ${esc(e.email)} <span class="tag ${e.valido ? (e.descartavel ? 'tag-bad' : 'tag-ok') : 'tag-warn'}">${e.descartavel ? 'DESCARTÁVEL' : e.valido ? 'VÁLIDO' : 'SUSPEITO'}</span></h3>
          ${resultActions()}
        </div>
        <div class="result-body">
          <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>${fonte}</strong></div></div>
          <div class="kv-grid">
            ${kv('Domínio', e.dominio, 1)}
            ${kv('Tipo de domínio', e.tipoDominio)}
            ${kv('Registros MX', e.mx ? '✅ Encontrados — recebe e-mails' : '⛔ Ausentes')}
            ${kv('Criação estimada da conta', '~' + e.criadoEstimado)}
            ${kv('Redes vinculadas', e.redesVinculadas.length ? e.redesVinculadas.join(', ') : 'Nenhuma detectada')}
          </div>
          <h3 style="margin:22px 0 10px">🛡️ Reputação</h3>
          <div class="score-wrap">
            <div class="score-bar"><div class="score-fill" style="width:${e.reputacao}%"></div></div>
            <span class="score-val">${e.reputacao}/100</span>
          </div>
          <h3 style="margin:22px 0 10px">🚨 Exposição em vazamentos (${e.vazamentos.length})</h3>
          ${e.vazamentos.length ? `<table><thead><tr><th>Vazamento</th><th>Data</th><th>Volume</th><th>Dados expostos</th></tr></thead>
          <tbody>${e.vazamentos.map(v => `<tr><td><strong>${esc(v.name)}</strong></td><td class="mono">${v.date ? v.date.split('-').reverse().join('/') : '—'}</td><td>${esc(v.size)}</td><td>${v.data.map(d => `<span class="tag tag-warn" style="margin:1px">${esc(d)}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table>`
          : '<p style="color:var(--ok)">✅ Nenhuma exposição encontrada nas bases monitoradas.</p>'}
        </div>
      </div>`;
    $('#res-email').innerHTML = html;
    lastResult = { tipo: 'E-mail', query: e.email, html };
  }

  // ---------- Placa ----------
  views.placa = () => {
    content().innerHTML = `
      <div class="view-head"><h1>🚗 Consulta de Placa Veicular</h1><p>Dados do veículo, chassi, RENAVAM, restrições, débitos e proprietário (mascarado).</p></div>
      ${demoNotice}
      ${searchPanel('placa', 'Digite a placa — ex.: ABC-1234 ou BRA2E19', 'Consultar', 'Aceita padrão antigo (ABC-1234) e Mercosul (BRA2E19). Dados do veículo são fictícios.')}`;
  };

  async function runPlaca(q) {
    const clean = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(clean)) {
      $('#res-placa').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Placa inválida.</strong> Use o padrão antigo (ABC1234) ou Mercosul (BRA2E19).</div></div>`;
      return;
    }
    const v = Mock.veiculo(clean);
    if (!(await charge('placa', v.placa, v.marca + ' ' + v.modelo))) return;
    logHistory('Placa', v.placa, v.marca + ' ' + v.modelo);
    const html = `
      <div class="result-card">
        <div class="result-head">
          <h3>🚗 ${v.marca} ${v.modelo} ${v.anoFab}/${v.anoMod}
            ${v.roubo ? '<span class="tag tag-bad">⚠️ QUEIXA DE ROUBO/FURTO</span>' : `<span class="tag ${v.situacao === 'SEM RESTRIÇÃO' ? 'tag-ok' : 'tag-warn'}">${v.situacao}</span>`}
          </h3>
          ${resultActions()}
        </div>
        <div class="result-body">
          <div class="kv-grid">
            ${kv('Placa', v.placa, 1)}
            ${kv('Marca/Modelo', v.marca + ' ' + v.modelo)}
            ${kv('Ano fab./modelo', v.anoFab + '/' + v.anoMod)}
            ${kv('Cor', v.cor)}
            ${kv('Combustível', v.combustivel)}
            ${kv('Chassi', v.chassi, 1)}
            ${kv('RENAVAM', v.renavam, 1)}
            ${kv('Município de registro', v.municipio)}
            ${kv('IPVA', v.ipva)}
            ${kv('Licenciamento', v.licenciamento)}
            ${kv('Multas ativas', v.multas + ' registro(s)')}
            ${kv('Proprietário', esc(v.proprietario))}
            ${kv('Documento (mascarado)', v.proprietarioDoc, 1)}
          </div>
        </div>
      </div>`;
    $('#res-placa').innerHTML = html;
    lastResult = { tipo: 'Placa', query: v.placa, html };
  }

  // ---------- CEP ----------
  views.cep = () => {
    content().innerHTML = `
      <div class="view-head"><h1>📍 Consulta CEP / Endereço</h1><p>Resolução de CEP em endereço completo via base pública dos Correios (BrasilAPI).</p></div>
      ${searchPanel('cep', 'Digite o CEP — ex.: 01310-100', 'Consultar', 'Consulta pública real. Exemplo: <code>01310-100</code> (Av. Paulista, São Paulo).')}`;
  };

  async function runCEP(q) {
    const clean = q.replace(/\D/g, '');
    if (clean.length !== 8) {
      $('#res-cep').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>CEP inválido.</strong> Informe 8 dígitos.</div></div>`;
      return;
    }
    $('#res-cep').innerHTML = loading('Consultando base dos Correios…');
    let d = null;
    if (SERVER) {
      try {
        const r = await Srv.get('/api/lookup/cep/' + clean);
        setBalance(r.balance);
        d = r.data;
      } catch (err) {
        $('#res-cep').innerHTML = '';
        if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
        return $('#res-cep').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>${esc(err.message || 'CEP não encontrado.')}</strong></div></div>`;
      }
    } else {
      if (!(await charge('cep', clean.slice(0, 5) + '-' + clean.slice(5)))) return;
      try {
        const resp = await fetch('https://brasilapi.com.br/api/cep/v2/' + clean, { signal: AbortSignal.timeout(9000) });
        if (!resp.ok) throw new Error('CEP não encontrado');
        const j = await resp.json();
        d = { street: j.street, neighborhood: j.neighborhood, city: j.city, state: j.state, lat: j.location?.coordinates?.latitude || null, lon: j.location?.coordinates?.longitude || null };
        logHistory('CEP', clean.slice(0, 5) + '-' + clean.slice(5), d.city + '/' + d.state);
      } catch {
        return $('#res-cep').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>CEP não encontrado</strong> ou serviço indisponível no momento.</div></div>`;
      }
    }
    const maps = d.lat ? `https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lon}#map=16/${d.lat}/${d.lon}` : null;
    const html = `
      <div class="result-card">
        <div class="result-head"><h3>📍 ${clean.slice(0, 5)}-${clean.slice(5)} <span class="tag tag-ok">ENCONTRADO</span></h3>${resultActions(maps ? `<a class="btn btn-ghost btn-sm" href="${maps}" target="_blank">🗺️ Ver no mapa</a>` : '')}</div>
        <div class="result-body">
          <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>BrasilAPI · dados públicos reais</strong></div></div>
          <div class="kv-grid">
            ${kv('Logradouro', esc(d.street || '—'))}
            ${kv('Bairro', esc(d.neighborhood || '—'))}
            ${kv('Cidade', esc(d.city))}
            ${kv('Estado', esc(d.state))}
            ${d.lat ? kv('Coordenadas', d.lat + ', ' + d.lon, 1) : ''}
          </div>
        </div>
      </div>`;
    $('#res-cep').innerHTML = html;
    lastResult = { tipo: 'CEP', query: clean, html };
  }

  // ---------- IP ----------
  views.ip = () => {
    content().innerHTML = `
      <div class="view-head"><h1>🌐 IP / Geolocalização</h1><p>Localização aproximada, provedor (ASN), tipo de conexão e indicadores de anonimização.</p></div>
      ${searchPanel('ip', 'Digite o IP — ex.: 8.8.8.8 (vazio = seu próprio IP)', 'Rastrear', 'Com token ipinfo.io ativo, usa seu plano pago; senão, ipwho.is gratuito. Deixe em branco para analisar seu próprio IP.')}`;
  };

  async function runIP(q) {
    const ip = q.trim();
    if (ip && !/^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/.test(ip)) {
      $('#res-ip').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>IP inválido.</strong> Informe um IPv4 (ex.: 8.8.8.8) ou IPv6.</div></div>`;
      return;
    }
    $('#res-ip').innerHTML = loading('Rastreando endereço IP…');
    let d = null, fonte = '';
    if (SERVER) {
      try {
        const r = await Srv.get('/api/lookup/ip/' + encodeURIComponent(ip));
        setBalance(r.balance);
        d = r.data; fonte = r.fonte;
      } catch (err) {
        $('#res-ip').innerHTML = '';
        if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
        if (err.status === 400) return $('#res-ip').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>IP inválido.</strong></div></div>`;
        return $('#res-ip').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>${esc(err.message || 'Não foi possível rastrear.')}</strong></div></div>`;
      }
    } else {
      if (!(await charge('ip', ip || '(próprio)'))) return;
      const keys = store.get('keys', {});
      if (keys.ipinfo) {
        try {
          const r = await fetch('https://ipinfo.io/' + encodeURIComponent(ip) + '?token=' + encodeURIComponent(keys.ipinfo), { signal: AbortSignal.timeout(9000) });
          const j = await r.json();
          if (j && j.error) throw 0;
          const [asn, ...rest] = (j.org || 'AS— —').split(' ');
          const [lat, lon] = (j.loc || ',').split(',');
          d = { ip: j.ip, type: 'IPv4', country: j.country, region: j.region, city: j.city, postal: j.postal, latitude: lat, longitude: lon, timezone: j.timezone, hostname: j.hostname, isp: rest.join(' ') || j.org, org: j.org, asn: (asn || '—').replace(/^AS/, ''), domain: '' };
          fonte = 'ipinfo.io · plano pago (sua chave)';
        } catch { }
      }
      if (!d) {
        try {
          const resp = await fetch('https://ipwho.is/' + encodeURIComponent(ip), { signal: AbortSignal.timeout(9000) });
          const j = await resp.json();
          if (j.success === false) throw new Error(j.message);
          d = { ip: j.ip, type: j.type, country: j.country, region: j.region, city: j.city, postal: j.postal, latitude: j.latitude, longitude: j.longitude, timezone: (j.timezone || {}).id || '', hostname: '', isp: (j.connection || {}).isp, org: (j.connection || {}).org, asn: (j.connection || {}).asn, domain: (j.connection || {}).domain };
          fonte = 'ipwho.is · gratuito (dados reais)';
        } catch {
          return $('#res-ip').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Não foi possível rastrear.</strong> Serviço de geolocalização indisponível ou IP reservado/privado.</div></div>`;
        }
      }
      logHistory('IP', d.ip, (d.city || '—') + ', ' + (d.country || '—'));
    }
    const flag = (d.country && /^[A-Z]{2}$/.test(d.country)) ? String.fromCodePoint(...[...d.country].map(c => 127397 + c.charCodeAt())) + ' ' : '';
    const maps = `https://www.openstreetmap.org/?mlat=${d.latitude}&mlon=${d.longitude}#map=11/${d.latitude}/${d.longitude}`;
    const html = `
      <div class="result-card">
        <div class="result-head"><h3>🌐 ${d.ip} <span class="tag tag-info">${d.type || 'IPv4'}</span></h3>${resultActions(`<a class="btn btn-ghost btn-sm" href="${maps}" target="_blank">🗺️ Ver no mapa</a>`)}</div>
        <div class="result-body">
          <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>${fonte}</strong></div></div>
          <div class="kv-grid">
            ${kv('País', flag + esc(d.country || '—'))}
            ${kv('Região', esc(d.region || '—'))}
            ${kv('Cidade', esc(d.city || '—'))}
            ${kv('CEP/Postal', esc(d.postal || '—'), 1)}
            ${kv('Coordenadas', (d.latitude ?? '—') + ', ' + (d.longitude ?? '—'), 1)}
            ${kv('Fuso horário', esc(d.timezone || '—'))}
            ${d.hostname ? kv('Hostname', esc(d.hostname), 1) : ''}
            ${kv('Provedor (ISP)', esc(d.isp || '—'))}
            ${kv('Organização', esc(d.org || '—'))}
            ${kv('ASN', 'AS' + (d.asn || '—'), 1)}
            ${d.domain ? kv('Domínio do provedor', esc(d.domain), 1) : ''}
          </div>
        </div>
      </div>`;
    $('#res-ip').innerHTML = html;
    lastResult = { tipo: 'IP', query: d.ip, html };
  }

  // ---------- Username ----------
  views.username = () => {
    content().innerHTML = `
      <div class="view-head"><h1>👤 Busca de Usuário (Username OSINT)</h1><p>Varredura de presença do username em <strong>18 plataformas verificadas em tempo real</strong> (método Sherlock) + atalhos para as redes que bloqueiam robôs.</p></div>
      ${SERVER ? '' : demoNotice}
      ${SERVER
        ? searchPanel('username', 'Digite o username — ex.: joao.silva', 'Varrer redes', 'Verificação <strong>real</strong> por HTTP em 18 plataformas públicas (GitHub, GitLab, SoundCloud, Behance, Vimeo…) — perfis públicos apenas. ⚡ 1 crédito')
        : searchPanel('username', 'Digite o username — ex.: joao.silva', 'Varrer redes', 'Os links levam aos perfis reais nas plataformas; o status “encontrado/não encontrado” é simulado (no modo servidor a varredura é real).')}`;
  };

  const U_ICONS = { 'GitHub': '🐙', 'GitLab': '🦊', 'DEV Community': '👩\u200d💻', 'Chess.com': '♟️', 'SoundCloud': '🎧', 'Behance': '🎨', 'Vimeo': '🎬', 'Substack': '📰', 'MyAnimeList': '🌸', 'osu!': '🥁', 'Codewars': '🥋', 'Replit': '💾', 'Roblox': '🧱', 'Itch.io': '🎮', 'Instructables': '🔧', 'GoodReads': '📚', 'About.me': '🙋', '9GAG': '😂' };

  async function runUsername(q) {
    const u = q.trim().replace(/^@/, '');
    if (!u || /\s/.test(u)) {
      $('#res-username').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Username inválido.</strong> Não use espaços.</div></div>`;
      return;
    }
    const box = $('#res-username');
    if (SERVER) {
      box.innerHTML = loading('Varredura REAL em 18 plataformas públicas (estilo Sherlock)…');
      let data = null, fonte = '';
      try {
        const d = await Srv.get('/api/lookup/username/' + encodeURIComponent(u));
        setBalance(d.balance);
        data = d.data; fonte = d.fonte;
      } catch (err) {
        box.innerHTML = '';
        if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
        if (err.status === 400) return box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>${esc(err.message)}</strong></div></div>`;
        return box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>${esc(err.message || 'Varredura indisponível no momento.')}</strong></div></div>`;
      }
      const found = data.results.filter(x => x.found);
      const livres = data.results.filter(x => !x.found);
      logHistory('Username', '@' + u, found.length + ' perfil(is) público(s) em ' + data.verificados + ' plataformas');
      const html = `
        <div class="result-card">
          <div class="result-head"><h3>👤 @${esc(u)} <span class="tag ${found.length ? 'tag-ok' : 'tag-info'}">${found.length}/${data.verificados} PLATAFORMAS</span></h3>${resultActions()}</div>
          <div class="result-body">
            <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>${esc(fonte)}</strong> — verificação HTTP em tempo real; apenas perfis públicos.</div></div>
            ${found.length ? `<h3 style="margin:0 0 10px">✅ Perfis encontrados (${found.length})</h3>
            <div class="social-grid">
              ${found.map(x => `
                <a class="social-item" href="${x.url}" target="_blank" rel="noopener">
                  <div class="s-logo">${U_ICONS[x.site] || '🌐'}</div>
                  <div><strong>${esc(x.site)}</strong><small>${esc(x.url.replace(/^https?:\/\/(www\.)?/, ''))}</small></div>
                  <span class="s-st" style="color:var(--ok)">● ENCONTRADO</span>
                </a>`).join('')}
            </div>` : `<div class="notice notice-warn" style="margin-bottom:16px">🕵️ <div><strong>Nenhum perfil público encontrado</strong> com esse username nas ${data.verificados} plataformas verificadas.</div></div>`}
            ${livres.length ? `<h3 style="margin:22px 0 10px">○ Sem perfil (${livres.length})</h3>
            <div class="social-grid">
              ${livres.map(x => `
                <a class="social-item" href="${x.url}" target="_blank" rel="noopener" style="opacity:.55">
                  <div class="s-logo">${U_ICONS[x.site] || '🌐'}</div>
                  <div><strong>${esc(x.site)}</strong><small>/${esc(u)}</small></div>
                  <span class="s-st" style="color:var(--txt-3)">○ livre</span>
                </a>`).join('')}
            </div>` : ''}
            <div class="notice notice-warn" style="margin-top:16px">🔒 <div><strong>Não verificáveis por consulta automática</strong> (bloqueiam robôs): X/Twitter, Instagram, Facebook, TikTok, LinkedIn e Reddit. Abra manualmente:
              <a href="https://x.com/${encodeURIComponent(u)}" target="_blank" rel="noopener" style="color:var(--accent)">X</a> ·
              <a href="https://instagram.com/${encodeURIComponent(u)}" target="_blank" rel="noopener" style="color:var(--accent)">Instagram</a> ·
              <a href="https://www.facebook.com/${encodeURIComponent(u)}" target="_blank" rel="noopener" style="color:var(--accent)">Facebook</a> ·
              <a href="https://www.tiktok.com/@${encodeURIComponent(u)}" target="_blank" rel="noopener" style="color:var(--accent)">TikTok</a> ·
              <a href="https://www.reddit.com/user/${encodeURIComponent(u)}" target="_blank" rel="noopener" style="color:var(--accent)">Reddit</a></div></div>
          </div>
        </div>`;
      box.innerHTML = html;
      lastResult = { tipo: 'Username', query: '@' + u, html };
      return;
    }
    box.innerHTML = loading('Varrendo ' + Mock.SOCIAL.length + ' plataformas (demonstração)…');
    if (!(await charge('username', '@' + u, 'busca de presença digital'))) { box.innerHTML = ''; return; }
    const r = Mock.rng('user:' + u.toLowerCase());
    const results = Mock.SOCIAL.map(s => ({ ...s, found: r() > 0.45 }));
    setTimeout(() => {
      const found = results.filter(x => x.found).length;
      logHistory('Username', '@' + u, found + ' perfis encontrados');
      const html = `
        <div class="result-card">
          <div class="result-head"><h3>👤 @${esc(u)} <span class="tag tag-info">${found}/${results.length} PLATAFORMAS</span></h3>${resultActions()}</div>
          <div class="result-body">
            <div class="social-grid">
              ${results.map(s => `
                <a class="social-item" href="${s.url(encodeURIComponent(u))}" target="_blank" rel="noopener">
                  <div class="s-logo">${s.icon}</div>
                  <div><strong>${s.name}</strong><small>/${esc(u)}</small></div>
                  <span class="s-st" style="color:${s.found ? 'var(--ok)' : 'var(--txt-3)'}">${s.found ? '● ENCONTRADO' : '○ livre'}</span>
                </a>`).join('')}
            </div>
          </div>
        </div>`;
      box.innerHTML = html;
      lastResult = { tipo: 'Username', query: '@' + u, html };
    }, 900);
  }

  // ---------- Vazamentos ----------
  views.vazamentos = () => {
    content().innerHTML = `
      <div class="view-head"><h1>🚨 Monitor de Vazamentos</h1><p>Verifique a exposição de um e-mail, CPF ou telefone em vazamentos de dados conhecidos (data breaches).</p></div>
      ${demoNotice}
      ${searchPanel('vazamentos', 'E-mail, CPF ou telefone…', 'Verificar exposição', 'Com chave HIBP ativa, e-mails são verificados em bases reais; CPF/telefone seguem em demonstração (a HIBP cobre apenas e-mails).')}`;
  };

  async function runVazamentos(q) {
    const v = q.trim();
    if (v.length < 5) {
      $('#res-vazamentos').innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Termo muito curto.</strong> Informe um e-mail, CPF ou telefone completo.</div></div>`;
      return;
    }
    const box = $('#res-vazamentos');
    box.innerHTML = loading('Verificando bases de vazamentos…');
    let leaks = null, fonte = 'Demonstração · base simulada';
    if (SERVER) {
      try {
        const d = await Srv.get('/api/lookup/vazamentos/' + encodeURIComponent(v));
        setBalance(d.balance);
        fonte = d.fonte;
        if (Array.isArray(d.data.breaches)) leaks = d.data.breaches;
      } catch (err) {
        box.innerHTML = '';
        if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
        if (err.status === 400) return box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Termo muito curto.</strong></div></div>`;
        fonte = 'Servidor indisponível — demonstração';
      }
    } else {
      if (!(await charge('vazamentos', v))) return;
      const keys = store.get('keys', {});
      const isEmail = v.includes('@');
      if (isEmail && keys.hibp) {
        try {
          const r = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/' + encodeURIComponent(v) + '?truncateResponse=false', { headers: { 'hibp-api-key': keys.hibp }, signal: AbortSignal.timeout(9000) });
          if (r.status === 404) { leaks = []; fonte = 'HIBP · dados reais — nenhuma exposição registrada'; }
          else if (r.ok) {
            const arr = await r.json();
            leaks = arr.map(b => ({ name: b.Name, date: b.BreachDate || '', size: (b.PwnCount || 0).toLocaleString('pt-BR') + ' contas', data: (b.DataClasses || []).slice(0, 6) }));
            fonte = 'HIBP · dados reais (sua chave)';
          } else if (r.status === 401 || r.status === 403) fonte = 'HIBP recusou a chave — usando base de demonstração';
          else if (r.status === 429) fonte = 'HIBP: limite de requisições atingido — usando demonstração';
        } catch { fonte = 'HIBP inacessível no navegador (CORS — requer proxy em produção) — usando demonstração'; }
      } else if (isEmail) {
        fonte = 'Demonstração · configure a chave HIBP em Integrações para verificação real de e-mails';
      }
    }
    const render = (leaks, fonte) => {
      logHistory('Vazamentos', v, leaks.length + ' ocorrência(s)');
      const html = `
        <div class="result-card">
          <div class="result-head">
            <h3>🚨 ${esc(v)} ${leaks.length ? `<span class="tag tag-bad">${leaks.length} EXPOSIÇÃO(ÕES)</span>` : '<span class="tag tag-ok">SEM EXPOSIÇÃO</span>'}</h3>
            ${resultActions()}
          </div>
          <div class="result-body">
            <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>${fonte}</strong></div></div>
            ${leaks.length ? `
              <ul class="timeline">
                ${leaks.map(l => `<li><time>${l.date ? l.date.split('-').reverse().join('/') : '—'}</time>
                  <p><strong>${esc(l.name)}</strong> — ${esc(l.size)}<br>
                  ${l.data.map(d => `<span class="tag tag-warn" style="margin:2px 2px 0 0">${esc(d)}</span>`).join(' ')}</p></li>`).join('')}
              </ul>
              <div class="notice notice-warn" style="margin-top:14px">💡 <div><strong>Recomendações:</strong> trocar senhas reutilizadas, habilitar 2FA e monitorar movimentações em nome do titular.</div></div>`
            : '<div class="empty"><div class="e-ico">🛡️</div>Nenhuma exposição encontrada nas bases monitoradas.</div>'}
          </div>
        </div>`;
      box.innerHTML = html;
      lastResult = { tipo: 'Vazamentos', query: v, html };
    };
    if (leaks) render(leaks, fonte);
    else setTimeout(() => render(Mock.vazamentos(v), fonte), 800);
  }

  // ---------- Hub OSINT Brasil (Brazuca & Diretório de Fontes) ----------
  let currentOsintCat = 'todas';
  let currentOsintTerm = '';
  views.osintbrasil = () => {
    currentOsintCat = 'todas';
    currentOsintTerm = '';
    content().innerHTML = `
      <div class="view-head">
        <h1>🇧🇷 Hub OSINT Brasil & Brazuca</h1>
        <p>Catálogo centralizado de fontes abertas, bases governamentais e ferramentas de investigação forense para o Brasil — inspirado no <strong>osint-brazuca</strong> e <strong>OSINT Brasil Directory</strong> (1.300+ fontes organizadas).</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:260px;position:relative">
            <input type="text" id="osint-dir-search" placeholder="🔍 Filtrar fontes por nome, órgão, palavra-chave ou finalidade..." oninput="App.searchOsint(this.value)" />
          </div>
          <button class="btn btn-ghost btn-sm" onclick="App.searchOsint('')">Limpar filtro</button>
        </div>
      </div>

      <div class="filter-pills" id="osint-pills">
        <button class="filter-pill active" onclick="App.filterOsint('todas', this)">🌐 Todas as fontes (${Mock.OSINT_BRASIL_DIRECTORY.length})</button>
        <button class="filter-pill" onclick="App.filterOsint('pessoas', this)">🪪 Pessoas & Registros Civis</button>
        <button class="filter-pill" onclick="App.filterOsint('empresas', this)">🏢 Empresas & Vínculos Societários</button>
        <button class="filter-pill" onclick="App.filterOsint('justica', this)">⚖️ Justiça & Diários Oficiais</button>
        <button class="filter-pill" onclick="App.filterOsint('veiculos', this)">🚗 Veículos & Trânsito</button>
        <button class="filter-pill" onclick="App.filterOsint('infra', this)">🌐 Domínios, DNS & Infraestrutura</button>
        <button class="filter-pill" onclick="App.filterOsint('arquivos', this)">🗄️ Arquivos & Vazamentos</button>
        <button class="filter-pill" onclick="App.filterOsint('geo', this)">🗺️ Geolocalização & Imagens</button>
        <button class="filter-pill" onclick="App.filterOsint('social', this)">📱 Mídias Sociais & Redes</button>
      </div>

      <div id="osint-dir-grid" class="src-grid"></div>`;
    renderOsintDirectory();
  };

  function renderOsintDirectory() {
    const grid = $('#osint-dir-grid');
    if (!grid) return;
    const list = Mock.OSINT_BRASIL_DIRECTORY.filter(item => {
      const matchCat = (currentOsintCat === 'todas' || item.cat === currentOsintCat);
      const term = currentOsintTerm.toLowerCase().trim();
      const matchTerm = !term || item.nome.toLowerCase().includes(term) || item.desc.toLowerCase().includes(term) || (item.tags || []).some(t => t.toLowerCase().includes(term));
      return matchCat && matchTerm;
    });

    if (!list.length) {
      grid.innerHTML = `<div style="grid-column:1/-1" class="notice notice-warn">⚠️ Nenhuma fonte encontrada com o termo "<strong>${esc(currentOsintTerm)}</strong>". Tente outra palavra-chave ou selecione "Todas as fontes".</div>`;
      return;
    }

    grid.innerHTML = list.map(item => `
      <div class="src-item">
        <div class="src-ico">${item.ico}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            <strong>${esc(item.nome)}</strong>
            ${(item.tags || []).map(t => `<span class="badge-tag ${t === 'Oficial' ? 'official' : t === 'OSINT' || t === 'Open Source' ? 'osint' : 'free'}">${esc(t)}</span>`).join('')}
          </div>
          <small>${esc(item.desc)}</small>
          <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
            <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="padding:5px 12px;font-size:12px">Acessar fonte ↗</a>
            <button class="btn btn-ghost btn-sm" style="padding:5px 10px;font-size:12px" onclick="App.copyText('${esc(item.url)}')">📋 Copiar link</button>
          </div>
        </div>
      </div>`).join('');
  }

  function filterOsint(cat, btn) {
    currentOsintCat = cat;
    $$('#osint-pills .filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderOsintDirectory();
  }
  function searchOsint(term) {
    currentOsintTerm = term;
    const inp = $('#osint-dir-search');
    if (inp && inp.value !== term) inp.value = term;
    renderOsintDirectory();
  }

  // ---------- Gerador de Google Dorks Investigativo ----------
  let currentDorkTarget = '';
  views.dorks = () => {
    content().innerHTML = `
      <div class="view-head">
        <h1>⚡ Gerador de Google Dorks Investigativo</h1>
        <p>Gere consultas táticas avançadas (Google Hacking / Dorking) prontas para execução imediata em investigações de pessoas, empresas, documentos expostos, diários oficiais e diretórios vulneráveis.</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h3>🎯 Definir alvo da investigação</h3>
        <p style="color:var(--txt-2);font-size:13px;margin:4px 0 14px">Digite o nome completo, CPF, CNPJ, razão social, domínio ou e-mail a ser pesquisado:</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <input type="text" id="dork-target-input" placeholder="Ex.: Maria Souza, 00000000000191, empresa.com.br, user@domain.com" style="flex:1;min-width:260px" onkeydown="if(event.key==='Enter'){event.preventDefault();App.generateDorks();}" />
          <button class="btn btn-primary" onclick="App.generateDorks()">⚡ Gerar Dorks</button>
        </div>
      </div>

      <div id="dorks-results-area" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
          <h3 style="font-size:16px">📋 Consultas geradas para: <span id="dork-target-label" style="color:var(--accent)"></span></h3>
          <span class="badge-tag osint">10 Presets Táticos</span>
        </div>
        <div class="grid-2" id="dorks-grid"></div>
      </div>

      <div class="card" style="margin-top:22px">
        <h3>💡 Dicas operacionais de Google Dorking para peritos</h3>
        <ul style="color:var(--txt-2);font-size:13px;line-height:1.7;margin-top:10px;padding-left:20px">
          <li><code>filetype:pdf</code> ou <code>ext:pdf</code> localiza relatórios, atas, contratos, editais e processos digitalizados.</li>
          <li><code>site:gov.br</code> ou <code>site:jus.br</code> restringe a busca estritamente a domínios do governo brasileiro e do judiciário.</li>
          <li><code>intitle:"index of"</code> revela servidores web com listagem de diretórios habilitada, expondo arquivos de backup e logs.</li>
          <li><code>"termo exato"</code> (entre aspas duplas) força o motor a buscar a correspondência literal, indispensável para nomes de pessoas e números de documentos.</li>
          <li><code>-www.dominio.com</code> exclui o portal principal para evidenciar subdomínios internos, portais de desenvolvimento e sistemas de homologação.</li>
        </ul>
      </div>`;
    if (currentDorkTarget) {
      const inp = $('#dork-target-input');
      if (inp) { inp.value = currentDorkTarget; generateDorks(); }
    }
  };

  function generateDorks() {
    const inp = $('#dork-target-input');
    const val = (inp ? inp.value : '').trim();
    if (!val) { toast('Digite o alvo da busca.', 'warn'); return; }
    currentDorkTarget = val;
    const area = $('#dorks-results-area');
    const label = $('#dork-target-label');
    const grid = $('#dorks-grid');
    if (!area || !grid) return;
    area.style.display = 'block';
    label.textContent = val;

    grid.innerHTML = Mock.DORKS_TEMPLATES.map(tpl => {
      const query = tpl.build(val);
      const googleUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      return `
        <div class="dork-card">
          <div class="dork-head">
            <div>
              <span class="badge-tag free">${esc(tpl.cat)}</span>
              <div class="dork-title" style="margin-top:4px">${esc(tpl.titulo)}</div>
            </div>
          </div>
          <div class="dork-desc">${esc(tpl.desc)}</div>
          <div class="dork-code-box">${esc(query)}</div>
          <div class="dork-actions">
            <a href="${esc(googleUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">🚀 Abrir no Google ↗</a>
            <button class="btn btn-ghost btn-sm" onclick="App.copyText('${esc(query).replace(/'/g, "\\'")}')">📋 Copiar Dork</button>
          </div>
        </div>`;
    }).join('');
    toast('10 Google Dorks táticos gerados com sucesso!', 'success');
  }

  // ---------- Recon de Infraestrutura & Domínios ----------
  let currentReconTarget = '';
  views.recon = () => {
    content().innerHTML = `
      <div class="view-head">
        <h1>📡 Recon de Domínios & Infraestrutura</h1>
        <p>Integração e roteamento tático de inteligência de rede baseado em <strong>Shodan</strong>, <strong>theHarvester</strong>, <strong>IntelX</strong>, <strong>Wayback Machine</strong>, <strong>SecurityTrails</strong> e <strong>Registro.br</strong>.</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h3>🔍 Investigar Domínio, Host ou Endereço IP</h3>
        <p style="color:var(--txt-2);font-size:13px;margin:4px 0 14px">Informe um domínio (ex.: <code>empresa.com.br</code>) ou endereço IPv4 (ex.: <code>8.8.8.8</code>):</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <input type="text" id="recon-target-input" placeholder="Ex.: globo.com, unb.br, 1.1.1.1" style="flex:1;min-width:260px" onkeydown="if(event.key==='Enter'){event.preventDefault();App.runRecon();}" />
          <button class="btn btn-primary" onclick="App.runRecon()">📡 Executar Recon</button>
        </div>
      </div>

      <div id="recon-results-area" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <h3 style="font-size:16px">🎯 Painel de Reconhecimento: <span id="recon-target-label" style="color:var(--accent)"></span></h3>
          <span class="badge-tag osint">6 Motores de Inteligência</span>
        </div>

        <div class="recon-grid" id="recon-cards-grid"></div>

        <div class="card" style="margin-top:20px">
          <h3>⚡ Dorks Rápidos de Subdomínios & E-mails para o Alvo</h3>
          <div id="recon-dorks-box" style="margin-top:12px;display:grid;gap:10px"></div>
        </div>
      </div>`;
    if (currentReconTarget) {
      const inp = $('#recon-target-input');
      if (inp) { inp.value = currentReconTarget; runRecon(); }
    }
  };

  function runRecon() {
    const inp = $('#recon-target-input');
    const val = (inp ? inp.value : '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!val) { toast('Informe um domínio ou IP.', 'warn'); return; }
    currentReconTarget = val;
    const area = $('#recon-results-area');
    const label = $('#recon-target-label');
    const grid = $('#recon-cards-grid');
    const dorksBox = $('#recon-dorks-box');
    if (!area || !grid) return;
    area.style.display = 'block';
    label.textContent = val;

    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(val);
    const isBr = val.endsWith('.br');

    const engines = [
      {
        nome: 'Shodan Recon',
        ico: '📡',
        tag: 'Infra & Portas',
        desc: 'Portas abertas, banners de serviço, certificados SSL e histórico de vulnerabilidades.',
        url: isIp ? `https://www.shodan.io/host/${val}` : `https://www.shodan.io/search?query=hostname%3A${encodeURIComponent(val)}`
      },
      {
        nome: 'Wayback Machine',
        ico: '🕰️',
        tag: 'Histórico Web',
        desc: 'Snapshots históricos do site arquivados ao longo do tempo desde a criação do domínio.',
        url: `https://web.archive.org/web/*/${encodeURIComponent(val)}`
      },
      {
        nome: 'Intelligence X (IntelX)',
        ico: '🗄️',
        tag: 'Dumps & Pastes',
        desc: 'Varredura profunda por documentos vazados, código fonte exposto e menções ao domínio.',
        url: `https://intelx.io/?s=${encodeURIComponent(val)}`
      },
      {
        nome: 'SecurityTrails',
        ico: '🛡️',
        tag: 'DNS Passivo & Subdomínios',
        desc: 'Histórico completo de registros DNS (A, MX, NS, TXT) e descoberta de subdomínios.',
        url: `https://securitytrails.com/domain/${encodeURIComponent(val)}/dns`
      },
      {
        nome: 'VirusTotal',
        ico: '🦠',
        tag: 'Reputação & Ameaças',
        desc: 'Análise de reputação por 70+ motores antivírus, detecção de phishing e malware.',
        url: isIp ? `https://www.virustotal.com/gui/ip-address/${val}` : `https://www.virustotal.com/gui/domain/${encodeURIComponent(val)}`
      },
      {
        nome: isBr ? 'Registro.br WHOIS' : 'ICANN WHOIS',
        ico: isBr ? '🇧🇷' : '🌐',
        tag: 'Titularidade Oficial',
        desc: isBr ? 'Consulta oficial de CNPJ do titular, contatos administrativos e servidores DNS no Brasil.' : 'Registro oficial de titularidade e registrar internacional.',
        url: isBr ? `https://registro.br/tecnologia/ferramentas/whois/?search=${encodeURIComponent(val)}` : `https://lookup.icann.org/en/lookup?q=${encodeURIComponent(val)}`
      }
    ];

    grid.innerHTML = engines.map(eng => `
      <div class="recon-card">
        <div class="recon-header">
          <div class="recon-ico">${eng.ico}</div>
          <div class="recon-meta">
            <strong>${esc(eng.nome)}</strong>
            <span class="badge-tag free">${esc(eng.tag)}</span>
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--txt-2);line-height:1.45">${esc(eng.desc)}</p>
        <a href="${esc(eng.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="margin-top:auto">Abrir no ${esc(eng.nome.split(' ')[0])} ↗</a>
      </div>`).join('');

    const subDork = `site:*.${val} -www.${val} -site:${val}`;
    const mailDork = `"${val}" (intext:"@${val}" OR intext:"email") (filetype:pdf OR filetype:xlsx OR filetype:docx)`;

    dorksBox.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <strong style="font-size:13px;display:block">🌐 Descoberta de Subdomínios (Google)</strong>
          <code style="font-size:12px">${esc(subDork)}</code>
        </div>
        <div style="display:flex;gap:6px">
          <a href="https://www.google.com/search?q=${encodeURIComponent(subDork)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Abrir ↗</a>
          <button class="btn btn-ghost btn-sm" onclick="App.copyText('${esc(subDork)}')">Copiar</button>
        </div>
      </div>
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <strong style="font-size:13px;display:block">✉️ E-mails Corporativos em Documentos Públicos (theHarvester style)</strong>
          <code style="font-size:12px">${esc(mailDork)}</code>
        </div>
        <div style="display:flex;gap:6px">
          <a href="https://www.google.com/search?q=${encodeURIComponent(mailDork)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Abrir ↗</a>
          <button class="btn btn-ghost btn-sm" onclick="App.copyText('${esc(mailDork)}')">Copiar</button>
        </div>
      </div>`;
    toast('Reconhecimento de infraestrutura estruturado!', 'success');
  }

  // ---------- Metodologia & Framework OSINT ----------
  views.framework = () => {
    content().innerHTML = `
      <div class="view-head">
        <h1>🧭 Metodologia, Taxonomia & Ferramental OSINT</h1>
        <p>Diretrizes metodológicas, taxonomia oficial do <strong>OSINT Framework</strong>, modelagem relacional com <strong>Maltego</strong> e automação de recon com <strong>SpiderFoot OSS</strong> e <strong>recon-ng</strong>.</p>
      </div>

      <div class="framework-grid">
        <div class="framework-card">
          <div class="framework-step"><div class="framework-step-num">1</div><span>Coleta & Enumeração</span></div>
          <h3>🔍 Enumeração de Identidades & Superfície</h3>
          <p style="color:var(--txt-2);font-size:13px;line-height:1.6">
            Inicia-se a investigação com dados-semente (seed data): Nome, CPF, CNPJ, e-mail, telefone ou username.
            Utiliza-se ferramentas como <strong>Sherlock</strong> e <strong>WhatsMyName</strong> para mapear a presença digital em redes abertas, sem alertar o alvo.
          </p>
        </div>

        <div class="framework-card">
          <div class="framework-step"><div class="framework-step-num">2</div><span>Fontes Oficiais & Bases Abertas</span></div>
          <h3>🏛️ Validação em Registros Governamentais</h3>
          <p style="color:var(--txt-2);font-size:13px;line-height:1.6">
            Cruzamento com o <strong>Hub OSINT Brasil</strong>: Diários Oficiais (DOU/DOEs), Receita Federal (QSA/Redesim), DataJud/CNJ, BNMP, Tribunal Superior Eleitoral e Portal da Transparência.
            Gera dados com fé pública e validade probatória em juízo.
          </p>
        </div>

        <div class="framework-card">
          <div class="framework-step"><div class="framework-step-num">3</div><span>Reconhecimento Técnico & Infra</span></div>
          <h3>📡 Mapeamento de Infraestrutura & Dumps</h3>
          <p style="color:var(--txt-2);font-size:13px;line-height:1.6">
            Para domínios e empresas: varredura de subdomínios via <strong>theHarvester</strong> e Google Dorks, análise de portas e certificados com <strong>Shodan</strong>, e busca de histórico com <strong>Wayback Machine</strong> e <strong>IntelX</strong>.
          </p>
        </div>

        <div class="framework-card">
          <div class="framework-step"><div class="framework-step-num">4</div><span>Correlação & Dossiê</span></div>
          <h3>📁 Modelagem de Grafos & Cadeia de Custódia</h3>
          <p style="color:var(--txt-2);font-size:13px;line-height:1.6">
            Estruturação dos relacionamentos entre pessoas, empresas e bens (estilo <strong>Maltego</strong>).
            Organização no módulo de <strong>Dossiês do ForenseIQ</strong> com registro de data/hora, hashes e exportação de relatório para perícia técnica.
          </p>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <h3 style="margin-bottom:12px">⚖️ Conformidade Legal & Cadeia de Custódia Forense (Brasil)</h3>
        <div class="grid-3">
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px">
            <strong style="font-size:13.5px;color:var(--accent);display:block;margin-bottom:6px">🛡️ LGPD (Lei 13.709/2018)</strong>
            <p style="font-size:12.5px;color:var(--txt-2);line-height:1.5">Art. 7º, VI e IX — Tratamento legítimo para exercício regular de direitos em processos judiciais, legítimo interesse e proteção do crédito.</p>
          </div>
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px">
            <strong style="font-size:13.5px;color:var(--ok);display:block;margin-bottom:6px">📜 Validade da Prova Digital</strong>
            <p style="font-size:12.5px;color:var(--txt-2);line-height:1.5">Art. 369 e 411 do CPC — Admissibilidade de documentos e relatórios técnicos. Recomendado uso de ata notarial ou preservação com hash SHA-256.</p>
          </div>
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px">
            <strong style="font-size:13.5px;color:var(--warn);display:block;margin-bottom:6px">⚖️ Provimento 188/2018 OAB</strong>
            <p style="font-size:12.5px;color:var(--txt-2);line-height:1.5">Regulamenta a Investigação Defensiva preliminar pelo advogado, legitimando a colheita de dados públicos para instrução processual.</p>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <h3 style="font-size:15px">🌐 Explorar a Árvore do OSINT Framework</h3>
            <p style="font-size:13px;color:var(--txt-2);margin-top:2px">Acesse a taxonomia interativa visual mundial categorizada em osintframework.com.</p>
          </div>
          <a href="https://osintframework.com" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Abrir OSINT Framework ↗</a>
        </div>
      </div>`;
  };

  // ---------- Rastreamento Cripto & Blockchain Explorer ----------
  let currentCryptoTarget = '';
  views.cripto = () => {
    content().innerHTML = `
      <div class="view-head">
        <h1>🪙 Rastreamento Cripto & Blockchain Intelligence</h1>
        <p>Investigação on-chain de carteiras de criptomoedas (Bitcoin, Ethereum, USDT TRC20/ERC20, Solana), detecção de golpes, ransomware e fluxo de transações.</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h3>🔍 Investigar Endereço de Carteira / TX Hash</h3>
        <p style="color:var(--txt-2);font-size:13px;margin:4px 0 14px">Cole o endereço da carteira pública ou o hash da transação:</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <input type="text" id="crypto-target-input" placeholder="Ex.: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa, 0x71C...8976F, TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" style="flex:1;min-width:280px" onkeydown="if(event.key==='Enter'){event.preventDefault();App.runCryptoAnalysis();}" />
          <button class="btn btn-primary" onclick="App.runCryptoAnalysis()">🪙 Rastrear On-chain</button>
        </div>
      </div>

      <div id="crypto-results-area" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <h3 style="font-size:16px">🎯 Análise da Carteira: <span id="crypto-target-label" style="color:var(--accent);word-break:break-all"></span></h3>
          <span class="badge-tag osint" id="crypto-network-badge">Rede Detectada</span>
        </div>

        <div class="recon-grid" id="crypto-cards-grid"></div>

        <div class="card" style="margin-top:20px">
          <h3>⚖️ Orientações Periciais para Bloqueio de Criptoativos (Brasil)</h3>
          <div class="grid-2" style="margin-top:12px;gap:14px">
            <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px">
              <strong style="color:var(--accent);font-size:13.5px;display:block;margin-bottom:6px">🏛️ Ofício Judicial para Exchanges Nacionais</strong>
              <p style="font-size:12.5px;color:var(--txt-2);line-height:1.5">No Brasil, exchanges como Mercado Bitcoin, Foxbit, Binance Brasil e Bitso respondem a ordens judiciais de quebra de sigilo e bloqueio via SISBAJUD / Ofício Direto do juízo cível ou criminal.</p>
            </div>
            <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px">
              <strong style="color:var(--ok);font-size:13.5px;display:block;margin-bottom:6px">🛡️ Notificação às Emissoras de Stablecoin (Tether / Circle)</strong>
              <p style="font-size:12.5px;color:var(--txt-2);line-height:1.5">Para transferências em USDT (Tether) ou USDC (Circle), as emissoras possuem função de contrato inteligente para congelamento de carteiras mediante reporte de autoridades policiais.</p>
            </div>
          </div>
        </div>
      </div>`;
    if (currentCryptoTarget) {
      const inp = $('#crypto-target-input');
      if (inp) { inp.value = currentCryptoTarget; runCryptoAnalysis(); }
    }
  };

  function runCryptoAnalysis() {
    const inp = $('#crypto-target-input');
    const val = (inp ? inp.value : '').trim();
    if (!val) { toast('Cole um endereço ou hash cripto.', 'warn'); return; }
    currentCryptoTarget = val;
    const area = $('#crypto-results-area');
    const label = $('#crypto-target-label');
    const badge = $('#crypto-network-badge');
    const grid = $('#crypto-cards-grid');
    if (!area || !grid) return;
    area.style.display = 'block';
    label.textContent = val;

    let net = 'Multi-Rede / Hash';
    if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(val)) net = 'Bitcoin (BTC)';
    else if (/^0x[a-fA-F0-9]{40}$/.test(val)) net = 'Ethereum (ETH / ERC-20 / EVM)';
    else if (/^T[a-zA-HJ-NP-Z0-9]{33}$/.test(val)) net = 'TRON (TRX / USDT TRC-20)';
    else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val)) net = 'Solana (SOL)';
    badge.textContent = net;

    const links = [
      { nome: 'Blockchain.com Explorer', ico: '🪙', tag: 'Bitcoin BTC', desc: 'Consulta saldo consolidado, histórico de entradas/saídas e blocos.', url: `https://www.blockchain.com/explorer/addresses/btc/${val}` },
      { nome: 'Mempool.space', ico: '⛏️', tag: 'On-chain BTC', desc: 'Visualização gráfica de transações, taxas de mineração e histórico UTXO.', url: `https://mempool.space/address/${val}` },
      { nome: 'Etherscan', ico: '💎', tag: 'Ethereum / ERC20', desc: 'Transferências de tokens USDT/USDC, chamadas de contratos e saldo em ETH.', url: `https://etherscan.io/address/${val}` },
      { nome: 'Tronscan', ico: '🔴', tag: 'TRON / USDT TRC20', desc: 'Rastreamento da rede mais utilizada para transferências de dólar digital (USDT).', url: `https://tronscan.org/#/address/${val}` },
      { nome: 'Solscan', ico: '🟣', tag: 'Solana SPL', desc: 'Transações e saldos de carteiras na rede Solana.', url: `https://solscan.io/account/${val}` },
      { nome: 'Chainabuse (Denúncias)', ico: '🚨', tag: 'Base de Fraudes', desc: 'Verifica se a carteira já foi denunciada em golpes, extorsão ou ransomware.', url: `https://www.chainabuse.com/address/${val}` },
      { nome: 'Arkham Intelligence', ico: '🕸️', tag: 'De-anonimização', desc: 'Identificação de exchanges proprietárias da carteira e fluxo de capital.', url: `https://platform.arkhamintelligence.com/explorer/address/${val}` },
      { nome: 'BitcoinAbuse', ico: '🛡️', tag: 'Crimes Cibernéticos', desc: 'Relatórios de extorsão por e-mail e carteiras de chantagem.', url: `https://www.bitcoinabuse.com/reports/${val}` }
    ];

    grid.innerHTML = links.map(l => `
      <div class="recon-card">
        <div class="recon-header">
          <div class="recon-ico">${l.ico}</div>
          <div class="recon-meta">
            <strong>${esc(l.nome)}</strong>
            <span class="badge-tag free">${esc(l.tag)}</span>
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--txt-2);line-height:1.45">${esc(l.desc)}</p>
        <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="margin-top:auto">Consultar no ${esc(l.nome.split(' ')[0])} ↗</a>
      </div>`).join('');
    toast('Rastreamento de carteira estruturado!', 'success');
  }

  // ---------- Aeronaves & Embarcações ----------
  let currentAircraftTarget = '';
  views.aeronaves = () => {
    content().innerHTML = `
      <div class="view-head">
        <h1>✈️ Aeronaves & Embarcações</h1>
        <p>Identificação de proprietários, operadores e rotas no <strong>Registro Aeronáutico Brasileiro (RAB / ANAC)</strong>, <strong>FlightRadar24</strong> e embarcações na <strong>Marinha do Brasil (SISGEMB)</strong>.</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h3>🛫 Consultar Matrícula / Prefixo da Aeronave</h3>
        <p style="color:var(--txt-2);font-size:13px;margin:4px 0 14px">Informe a matrícula da aeronave no padrão brasileiro (ex.: <code>PP-ABC</code>, <code>PR-XYZ</code>, <code>PT-DEF</code>, <code>PS-GHI</code>, <code>PU-JKL</code>):</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <input type="text" id="aircraft-target-input" placeholder="Ex.: PR-GUO, PP-XYZ, PS-ABC" style="flex:1;min-width:240px;text-transform:uppercase" onkeydown="if(event.key==='Enter'){event.preventDefault();App.runAircraftSearch();}" />
          <button class="btn btn-primary" onclick="App.runAircraftSearch()">✈️ Consultar Aeronave</button>
        </div>
      </div>

      <div id="aircraft-results-area" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <h3 style="font-size:16px">🎯 Prefixo: <span id="aircraft-target-label" style="color:var(--accent)"></span></h3>
          <span class="badge-tag official">RAB Oficial / ANAC</span>
        </div>

        <div class="recon-grid" id="aircraft-cards-grid"></div>
      </div>

      <div class="card" style="margin-top:22px">
        <h3>🚢 Rastreamento de Embarcações & Iates (Marinha do Brasil & AIS)</h3>
        <p style="color:var(--txt-2);font-size:13px;margin:6px 0 14px">Pesquise embarcações marítimas particulares e comerciais:</p>
        <div class="grid-2">
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;gap:12px;align-items:flex-start">
            <div style="font-size:28px">🚢</div>
            <div>
              <strong>MarineTraffic — Radar AIS de Embarcações</strong>
              <p style="font-size:12.5px;color:var(--txt-2);margin:4px 0 10px">Localização em tempo real de iates, navios e lanchas via sinal de transponder marítimo.</p>
              <a href="https://www.marinetraffic.com/" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Abrir MarineTraffic ↗</a>
            </div>
          </div>
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;gap:12px;align-items:flex-start">
            <div style="font-size:28px">⚓</div>
            <div>
              <strong>VesselFinder — Monitoramento Marítimo</strong>
              <p style="font-size:12.5px;color:var(--txt-2);margin:4px 0 10px">Histórico de escalas nos portos, rotas navegadas e proprietário declarado.</p>
              <a href="https://www.vesselfinder.com/" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Abrir VesselFinder ↗</a>
            </div>
          </div>
        </div>
      </div>`;
    if (currentAircraftTarget) {
      const inp = $('#aircraft-target-input');
      if (inp) { inp.value = currentAircraftTarget; runAircraftSearch(); }
    }
  };

  function runAircraftSearch() {
    const inp = $('#aircraft-target-input');
    const val = (inp ? inp.value : '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!val) { toast('Digite o prefixo da aeronave.', 'warn'); return; }
    currentAircraftTarget = val;
    const clean = val.replace('-', '');
    const area = $('#aircraft-results-area');
    const label = $('#aircraft-target-label');
    const grid = $('#aircraft-cards-grid');
    if (!area || !grid) return;
    area.style.display = 'block';
    label.textContent = val;

    const portals = [
      { nome: 'ANAC — Consulta RAB Oficial', ico: '🇧🇷', tag: 'Proprietário & Operador', desc: 'Ficha completa do Registro Aeronáutico Brasileiro com CNPJ/CPF do proprietário, operador e aeronavegabilidade.', url: `https://sistemas.anac.gov.br/aeronaves/cons_rab_resposta.asp?rab_matricula=${clean}` },
      { nome: 'FlightRadar24', ico: '🛫', tag: 'Radar ao Vivo', desc: 'Rastreamento de voo em tempo real, altitude, velocidade e aeroportos de origem/destino.', url: `https://www.flightradar24.com/data/aircraft/${val.toLowerCase()}` },
      { nome: 'RadarBox', ico: '📡', tag: 'Histórico de Voos', desc: 'Rotas recentes, histórico de decolagens e tempos de voo.', url: `https://www.radarbox.com/data/registration/${val}` },
      { nome: 'FlightAware', ico: '🗺️', tag: 'Telemetria', desc: 'Planos de voo IFR e histórico completo de movimentações.', url: `https://pt.flightaware.com/live/flight/${val}` },
      { nome: 'ADSBExchange', ico: '🔓', tag: 'Sem Censura', desc: 'Rastreador sem filtros para aeronaves executivas e militares.', url: `https://globe.adsbexchange.com/?icao=${clean}` }
    ];

    grid.innerHTML = portals.map(p => `
      <div class="recon-card">
        <div class="recon-header">
          <div class="recon-ico">${p.ico}</div>
          <div class="recon-meta">
            <strong>${esc(p.nome)}</strong>
            <span class="badge-tag free">${esc(p.tag)}</span>
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--txt-2);line-height:1.45">${esc(p.desc)}</p>
        <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="margin-top:auto">Acessar no ${esc(p.nome.split(' ')[0])} ↗</a>
      </div>`).join('');
    toast('Consulta aeronáutica estruturada!', 'success');
  }

  // ---------- Analisador Forense, EXIF & Hashes de Custódia ----------
  views.forense = () => {
    content().innerHTML = `
      <div class="view-head">
        <h1>🔬 Analisador Forense, EXIF & Cadeia de Custódia</h1>
        <p>Cálculo de hashes criptográficos para integridade de provas digitais (Art. 369/411 CPC) e ferramentas de análise de metadados.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>🔒 Gerador de Hashes Criptográficos (Cadeia de Custódia)</h3>
          <p style="color:var(--txt-2);font-size:13px;margin:4px 0 12px">Calcule o hash de um texto ou evidência textual diretamente no navegador:</p>
          <textarea id="hash-input-text" rows="4" placeholder="Cole aqui o texto, extrato, conversa ou transcrição da evidência..." style="width:100%;margin-bottom:12px"></textarea>
          <button class="btn btn-primary btn-block" onclick="App.runHashCalc()">⚡ Calcular Hashes Criptográficos</button>

          <div id="hash-results-box" style="margin-top:16px;display:none;flex-direction:column;gap:10px"></div>
        </div>

        <div class="card">
          <h3>📁 Calcular Hash de Arquivo Real (PDF, Imagem, Vídeo)</h3>
          <p style="color:var(--txt-2);font-size:13px;margin:4px 0 14px">Selecione qualquer arquivo para calcular seu hash SHA-256 localmente (o arquivo NÃO é enviado para nenhum servidor):</p>
          <input type="file" id="hash-file-input" onchange="App.runFileHashCalc(this)" style="background:var(--panel-2);padding:14px;border:1px dashed var(--line-2);border-radius:12px;width:100%;cursor:pointer" />
          <div id="file-hash-results-box" style="margin-top:16px;display:none"></div>
        </div>
      </div>

      <div class="card" style="margin-top:22px">
        <h3>🛠️ Ferramentas Forenses Especializadas Recomendadas</h3>
        <div class="grid-3" style="margin-top:14px">
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px">
            <div style="font-size:28px">👨‍🍳</div>
            <strong style="display:block;margin:6px 0 4px">CyberChef (GCHQ)</strong>
            <p style="font-size:12.5px;color:var(--txt-2);margin-bottom:10px">Canivete suíço de decodificação Base64, Hex, URL decode, parsing de timestamps e descompressão.</p>
            <a href="https://gchq.github.io/CyberChef/" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Abrir CyberChef ↗</a>
          </div>
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px">
            <div style="font-size:28px">🔬</div>
            <strong style="display:block;margin:6px 0 4px">FotoForensics (ELA)</strong>
            <p style="font-size:12.5px;color:var(--txt-2);margin-bottom:10px">Análise de nível de erro (Error Level Analysis) para identificar se uma imagem sofreu edição no Photoshop.</p>
            <a href="https://fotoforensics.com/" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Abrir FotoForensics ↗</a>
          </div>
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px">
            <div style="font-size:28px">📷</div>
            <strong style="display:block;margin:6px 0 4px">Jeffrey's Image Metadata</strong>
            <p style="font-size:12.5px;color:var(--txt-2);margin-bottom:10px">Extrator completo de metadados EXIF, modelo de câmera, número de série e coordenadas GPS em fotos.</p>
            <a href="http://exif.regex.info/exif.cgi" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Abrir Exif Viewer ↗</a>
          </div>
        </div>
      </div>`;
  };

  async function sha256Hex(buf) {
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function sha1Hex(buf) {
    const hashBuf = await crypto.subtle.digest('SHA-1', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function runHashCalc() {
    const text = ($('#hash-input-text').value || '').trim();
    if (!text) { toast('Digite ou cole um texto.', 'warn'); return; }
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const sha256 = await sha256Hex(data);
    const sha1 = await sha1Hex(data);
    const box = $('#hash-results-box');
    box.style.display = 'flex';
    box.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="font-size:12px;color:var(--ok)">SHA-256 (Padrão Probatório)</strong>
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px" onclick="App.copyText('${sha256}')">Copiar</button>
        </div>
        <code style="word-break:break-all;font-size:12px">${sha256}</code>
      </div>
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="font-size:12px;color:var(--accent)">SHA-1</strong>
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px" onclick="App.copyText('${sha1}')">Copiar</button>
        </div>
        <code style="word-break:break-all;font-size:12px">${sha1}</code>
      </div>`;
    toast('Hashes calculados com sucesso!', 'success');
  }

  async function runFileHashCalc(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const box = $('#file-hash-results-box');
    box.style.display = 'block';
    box.innerHTML = `<div class="notice notice-info">⏳ Calculando hash de integridade do arquivo "${esc(file.name)}"...</div>`;
    try {
      const arrayBuf = await file.arrayBuffer();
      const sha256 = await sha256Hex(arrayBuf);
      const sha1 = await sha1Hex(arrayBuf);
      box.innerHTML = `
        <div class="result-card" style="margin-top:10px">
          <div style="padding:16px">
            <strong style="font-size:14px;display:block">📄 ${esc(file.name)} (${(file.size / 1024).toFixed(1)} KB)</strong>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
              <div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:11.5px;color:var(--ok);font-weight:700">SHA-256 (Cadeia de Custódia)</span>
                  <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px" onclick="App.copyText('${sha256}')">Copiar</button>
                </div>
                <code style="font-size:11.5px;word-break:break-all;display:block;margin-top:4px">${sha256}</code>
              </div>
              <div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:11.5px;color:var(--accent);font-weight:700">SHA-1</span>
                  <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px" onclick="App.copyText('${sha1}')">Copiar</button>
                </div>
                <code style="font-size:11.5px;word-break:break-all;display:block;margin-top:4px">${sha1}</code>
              </div>
            </div>
          </div>
        </div>`;
      toast('Hash SHA-256 do arquivo gerado!', 'success');
    } catch (e) {
      box.innerHTML = `<div class="notice notice-warn">❌ Erro ao ler arquivo: ${esc(e.message)}</div>`;
    }
  }

  // ---------- Processos Jurídicos (DataJud/CNJ — dados públicos oficiais) ----------
  views.processos = () => {
    content().innerHTML = `
      <div class="view-head"><h1>⚖️ Processos Jurídicos</h1><p>Consulta processual via <strong>DataJud</strong>, a base nacional oficial do CNJ (capa processual e movimentações — processos públicos). Para busca por nome, geramos atalhos para os portais oficiais.</p></div>
      ${searchPanel('processos', 'Nº do processo (20 dígitos) ou NOME da parte', 'Consultar', 'Com o número completo (padrão CNJ, ex.: 0000832-35.2018.4.01.3202) a consulta é <strong>real e oficial</strong>. Com um nome, geramos os atalhos públicos.')}`;
  };

  const srcGrid = items => `<div class="src-grid">${items.map(x => `
    <a class="src-item" href="${x.url}" target="_blank" rel="noopener">
      <div class="src-ico">${x.ico}</div>
      <div style="flex:1"><strong>${x.nome}</strong><small>${x.desc}</small></div>
      <span class="src-go">abrir ↗</span>
    </a>`).join('')}</div>`;

  const fmtDT = v => { if (!v) return null; const n = +v; const d = new Date(n > 1e12 ? n : v); return isNaN(d.getTime()) ? null : d.toLocaleString('pt-BR'); };
  const mapProcesso = (src, numero, hitId, hitIndex) => {
    const sigiloNivel = src.sigilo !== undefined ? Number(src.sigilo) : (src.nivelSigilo !== undefined ? Number(src.nivelSigilo) : 0);
    const nomeSigilo = src.nome_sigilo || (sigiloNivel >= 1 ? 'Segredo de Justiça (art. 189 CPC)' : 'Público');
    const isCriminal = typeof src.criminal === 'boolean' ? src.criminal : (
      ((src.classe || {}).nome || '').toLowerCase().includes('penal') ||
      ((src.classe || {}).nome || '').toLowerCase().includes('inquérito') ||
      ((src.classe || {}).nome || '').toLowerCase().includes('criminal') ||
      (src.assuntos || []).some(a => ((a.nome || a.descricao || '')).toLowerCase().includes('crime') || ((a.nome || a.descricao || '')).toLowerCase().includes('penal'))
    );
    return {
      numeroProcesso: src.numeroProcesso || numero,
      tribunal: src.tribunal || '—',
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
      dataCasoNovo: (fmtDT(src.data_cn || src.dataAjuizamento) || '—').split(' ')[0],
      dataAjuizamento: (fmtDT(src.dataAjuizamento) || '—').split(' ')[0],
      dataBaixa: fmtDT(src.data_baixa) ? fmtDT(src.data_baixa).split(' ')[0] : null,
      idElastic: src.id_elastic || hitId || null,
      indice: src.indice || hitIndex || null,
      atualizadoEm: fmtDT(src.updated_at || src.dataHoraUltimaAtualizacao),
      movimentos: (src.movimentos || []).slice(-12).reverse().map(m => ({ nome: m.nome || m.descricao || 'Movimento processual', data: fmtDT(m.dataHora) }))
    };
  };

  function portalsKit(nome) {
    return srcGrid([
      { ico: '🏛️', nome: 'CNJ — Consultas processuais', desc: 'Diretório oficial do Conselho Nacional de Justiça com os portais de consulta de todos os tribunais.', url: 'https://www.cnj.jus.br/consultas/' },
      { ico: '📄', nome: 'JusBrasil — processos por nome/nº', desc: 'Maior buscador de processos públicos do Brasil (cíveis, criminais, trabalhistas e federais).', url: 'https://www.jusbrasil.com.br/consulta-processos?q=' + encodeURIComponent(nome) },
      { ico: '🔍', nome: 'Escavador — busca por nome', desc: 'Processos, diários oficiais e menções à pessoa em documentos públicos.', url: 'https://www.escavador.com/busca?qo=t&q=' + encodeURIComponent(nome) },
      { ico: '🏢', nome: 'ConsultaSocio — empresas da pessoa', desc: 'Participações societárias nos dados abertos da Receita Federal.', url: 'https://www.consultasocio.com/socios/' + encodeURIComponent(nome.trim().toUpperCase()).replace(/%20/g, '-') }
    ]);
  }

  async function runProcessos(q) {
    const digits = q.replace(/\D/g, '');
    const box = $('#res-processos');
    if (digits.length === 20) {
      box.innerHTML = loading('Consultando a base nacional do CNJ (DataJud)…');
      let pr = null, fonte = '';
      if (SERVER) {
        try {
          const d = await Srv.get('/api/lookup/processo/' + digits);
          setBalance(d.balance);
          pr = d.data; fonte = d.fonte;
        } catch (err) {
          box.innerHTML = '';
          if (err.status === 402) { setBalance((err.data && err.data.balance) || 0); return insufficient(err.data && err.data.cost); }
          if (err.status === 400) return box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>${esc(err.message)}</strong></div></div>`;
          return box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>${esc(err.message || 'DataJud indisponível no momento.')}</strong><br><span style="color:var(--txt-3);font-size:12.5px">A chave pública do CNJ tem cota compartilhada — em <a href="#integracoes" onclick="App.go('integracoes');return false" style="color:var(--accent)">Integrações</a> você cadastra sua própria chave (gratuita em datajud-wiki.cnj.jus.br).</span></div></div>`;
        }
      } else {
        const idx = Mock.tribunalFromCNJ(digits);
        try {
          if (!idx) throw new Error('Segmento/tribunal não disponível na API pública do DataJud.');
          const r = await fetch('https://api-publica.datajud.cnj.jus.br/api_publica_' + idx + '/_search', {
            method: 'POST',
            headers: { 'Authorization': 'ApiKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==', 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: { match: { numeroProcesso: digits } }, size: 1 }),
            signal: AbortSignal.timeout(12000)
          });
          if (!r.ok) throw new Error('DataJud respondeu HTTP ' + r.status + '.');
          const d = await r.json();
          const hits = (d.hits && d.hits.hits) || [];
          if (!hits.length) throw new Error('Processo não encontrado na base pública — pode ser sigiloso ou ainda não sincronizado.');
          if (!(await charge('processos', digits, ((hits[0]._source || {}).tribunal || '') + ' · ' + (((hits[0]._source || {}).classe || {}).nome || '')))) { box.innerHTML = ''; return; }
          pr = mapProcesso(hits[0]._source || {}, digits, hits[0]._id, hits[0]._index);
          fonte = 'DataJud/CNJ · API pública (chamada direta do navegador)';
        } catch (err) {
          box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>${esc(err.message || 'Não foi possível consultar o DataJud diretamente do navegador.')}</strong><br><span style="color:var(--txt-3);font-size:12.5px">No modo servidor (node server.js) a consulta é feita via proxy do back-end, sem bloqueio de CORS.</span></div></div>`;
          return box.insertAdjacentHTML('beforeend', portalsKit(q));
        }
      }
      logHistory('Processos', pr.numeroProcesso, pr.classe + ' — ' + pr.tribunal);
      const isCrimBadge = pr.criminal ? '<span style="background:rgba(220,38,38,.18);color:#fca5a5;border:1px solid rgba(220,38,38,.35);padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:700">🚨 NATUREZA CRIMINAL</span>' : '<span style="background:rgba(59,130,246,.15);color:#93c5fd;border:1px solid rgba(59,130,246,.3);padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:600">⚖️ CÍVEL / ADMINISTRATIVO</span>';
      const sigiloBadge = (pr.sigilo && pr.sigilo >= 1) ? '<span style="background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3);padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:700">🔒 ' + esc(pr.nomeSigilo || 'Segredo de Justiça') + '</span>' : '<span style="background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.3);padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:600">🛡️ ' + esc(pr.nomeSigilo || 'Público') + '</span>';
      const html = `
        <div class="result-card">
          <div class="result-head">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h3 style="margin:0">⚖️ ${pr.numeroProcesso} <span class="tag tag-info">${esc(pr.tribunal)}</span></h3>
              ${isCrimBadge}
              ${sigiloBadge}
            </div>
            ${resultActions(`<a class="btn btn-ghost btn-sm" href="https://www.jusbrasil.com.br/consulta-processos?q=${encodeURIComponent(pr.numeroProcesso)}" target="_blank">🔎 Partes e íntegra</a>`)}
          </div>
          <div class="result-body">
            <div class="notice notice-info" style="margin-bottom:16px">📡 <div>Fonte: <strong>${esc(fonte)}</strong> — dados processuais oficiais do CNJ / DataJud (metadados Datamart sincronizados).</div></div>
            <div class="kv-grid">
              ${kv('Classe processual', esc(pr.classe))}
              ${kv('Órgão julgador', esc(pr.orgaoJulgador))}
              ${kv('Grau de jurisdição', esc(pr.grau))}
              ${kv('Situação processual', esc(pr.situacaoAtual) + (pr.faseAtual && pr.faseAtual !== '—' ? ' (' + esc(pr.faseAtual) + ')' : ''))}
              ${kv('Assuntos', pr.assuntos && pr.assuntos.length ? esc(pr.assuntos.join(' · ')) : '—')}
              ${kv('Data de ajuizamento / Caso Novo', pr.dataAjuizamento || pr.dataCasoNovo || '—')}
              ${pr.dataBaixa ? kv('Data da baixa definitiva', pr.dataBaixa) : ''}
              ${kv('Sistema / formato', esc(pr.sistema) + ' · ' + esc(pr.formato))}
              ${pr.idElastic ? kv('Índice / Correlação Elastic', esc(pr.indice || 'processos') + ' · ID: ' + esc(pr.idElastic)) : ''}
              ${pr.atualizadoEm ? kv('Última atualização na base', pr.atualizadoEm) : ''}
            </div>
            ${pr.movimentos && pr.movimentos.length ? `<h3 style="margin:22px 0 10px">📜 Últimas movimentações (${pr.movimentos.length})</h3>
            <ul class="timeline">${pr.movimentos.map(m => `<li><time>${m.data || '—'}</time><p>${esc(m.nome)}</p></li>`).join('')}</ul>` : ''}
          </div>
        </div>`;
      box.innerHTML = html;
      lastResult = { tipo: 'Processos', query: pr.numeroProcesso, html };
      return;
    }
    const v = q.trim();
    if (v.length < 3) { box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Termo muito curto.</strong></div></div>`; return; }
    logHistory('Processos', v, 'kit de portais (busca nominal)');
    box.innerHTML = `
      <div class="result-card">
        <div class="result-head"><h3>🔎 Busca nominal — “${esc(v)}”</h3>${resultActions()}</div>
        <div class="result-body">
          <div class="notice notice-info">🏛️ <div>A API pública do DataJud consulta por <strong>número do processo</strong>. Para busca por nome, use os portais públicos abaixo — eles indexam os processos públicos de todos os tribunais.</div></div>
          ${portalsKit(v)}
        </div>
      </div>`;
    lastResult = { tipo: 'Processos', query: v, html: box.innerHTML };
  }

  // ---------- Mandados & Certidões (fontes oficiais públicas) ----------
  views.mandados = () => {
    content().innerHTML = `
      <div class="view-head"><h1>🧾 Mandados & Certidões</h1><p>Kit de consulta em fontes <strong>oficiais e gratuitas</strong>: mandados de prisão (CNJ), dívida ativa da União (PGFN), débitos trabalhistas (TST) e protestos em cartório.</p></div>
      ${searchPanel('mandados', 'Nome completo e/ou CPF/CNPJ da pessoa', 'Montar kit de consulta', 'Geramos atalhos diretos e o passo a passo de cada portal oficial. Consultas públicas — sem intermediários.')}`;
  };

  async function runMandados(q) {
    const v = q.trim();
    const box = $('#res-mandados');
    if (v.length < 3) { box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Informe um nome ou documento.</strong></div></div>`; return; }
    if (!(await charge('mandados', v, 'kit de certidões'))) return;
    logHistory('Mandados', v, 'kit de fontes oficiais');
    const digits = v.replace(/\D/g, '');
    const doc = (digits.length === 11 || digits.length === 14) ? digits : '';
    const html = `
      <div class="result-card">
        <div class="result-head"><h3>🧾 Kit de consulta oficial — ${esc(v)}</h3>${resultActions()}</div>
        <div class="result-body">
          <div class="notice notice-info">🏛️ <div>Todos os portais abaixo são <strong>oficiais, públicos e gratuitos</strong>.${doc ? ' Use o documento <span class="mono">' + doc + '</span> nas consultas por CPF/CNPJ.' : ' Para consultas por CPF/CNPJ, informe o número diretamente no portal.'}</div></div>
          ${srcGrid([
            { ico: '🚔', nome: 'Mandados de prisão — BNMP/CNJ', desc: 'Portal oficial do Banco Nacional de Mandados de Prisão. Abra “Consulta Pública” e informe nome completo ou CPF (mandados sigilosos não aparecem).', url: 'https://portalbnmp.cnj.jus.br/' },
            { ico: '🏛️', nome: 'Dívida ativa da União — PGFN', desc: '“Dívida Aberta”: contribuintes inscritos em dívida ativa da União e FGTS, devedores principais e corresponsáveis. Pesquise por nome ou CPF/CNPJ — sem login.', url: 'https://www.dividaaberta.pgfn.gov.br/' },
            { ico: '⚖️', nome: 'Dívidas trabalhistas — CNDT/TST', desc: 'Certidão Negativa de Débitos Trabalhistas: informe CPF ou CNPJ e emita a certidão na hora (grátis, sem cadastro).', url: 'https://cndt-certidao.tst.jus.br/' },
            { ico: '📜', nome: 'Protestos — Pesquisa Protesto', desc: 'Consulta nacional de protestos em cartório por CPF/CNPJ (serviço gratuito dos tabelionatos de protesto — CENPROT).', url: 'https://www.pesquisaprotesto.com.br/' },
            { ico: '📄', nome: 'Processos — JusBrasil', desc: 'Busca nominal em processos públicos de todos os tribunais do país.', url: 'https://www.jusbrasil.com.br/consulta-processos?q=' + encodeURIComponent(v) }
          ])}
          <div class="notice notice-warn" style="margin-top:16px">🔒 <div><strong>O que não é público:</strong> restrições comerciais (Serasa/SPC/Boa Vista), score e histórico de crédito de terceiros são exclusivos dos bureaus credenciados e do próprio titular. Advogados podem obter certidões específicas com procuração.</div></div>
        </div>
      </div>`;
    box.innerHTML = html;
    lastResult = { tipo: 'Mandados', query: v, html };
  }

  // ---------- Patrimônio & Participações ----------
  views.bens = () => {
    content().innerHTML = `
      <div class="view-head"><h1>💼 Patrimônio & Participações</h1><p>Levantamento patrimonial por fontes públicas: participações societárias (dados abertos da Receita Federal), execuções e penhoras — mais o caminho legal para imóveis e veículos.</p></div>
      ${searchPanel('bens', 'Nome completo da pessoa (ou CNPJ da empresa)', 'Levantar', 'Participações em empresas são públicas. Imóveis e veículos de terceiros dependem de procuração/ordem judicial — mostramos o caminho correto.')}`;
  };

  async function runBens(q) {
    const v = q.trim();
    const box = $('#res-bens');
    if (v.length < 3) { box.innerHTML = `<div class="notice notice-warn">⚠️ <div><strong>Informe um nome ou CNPJ.</strong></div></div>`; return; }
    if (!(await charge('bens', v, 'levantamento patrimonial'))) return;
    logHistory('Bens', v, 'levantamento patrimonial');
    const digits = v.replace(/\D/g, '');
    const dashed = encodeURIComponent(v.toUpperCase()).replace(/%20/g, '-');
    const cnpjOk = digits.length === 14 && Mock.validaCNPJ(digits);
    const html = `
      <div class="result-card">
        <div class="result-head"><h3>💼 Levantamento patrimonial — ${esc(v)}</h3>${resultActions()}</div>
        <div class="result-body">
          ${cnpjOk ? `<div class="notice notice-info" style="margin-bottom:16px">🏢 <div>CNPJ detectado — abra também a <a href="#cnpj" onclick="App.go('cnpj','${digits}');return false" style="color:var(--accent)">Consulta CNPJ</a> para a ficha completa da empresa (sócios, capital, situação).</div></div>` : ''}
          <h3 style="margin:0 0 12px">🏢 Participações societárias (público — dados abertos RFB)</h3>
          ${srcGrid([
            { ico: '🏢', nome: 'ConsultaSocio', desc: 'Todas as empresas em que o nome aparece como sócio ou administrador, com participação e data de entrada.', url: 'https://www.consultasocio.com/socios/' + dashed },
            { ico: '📊', nome: 'Casa dos Dados', desc: 'Pesquisa avançada por sócio, CNAE e cidade sobre a base aberta completa da Receita Federal.', url: 'https://www.casadosdados.com.br/solucao/cnpj/pesquisa-avancada' },
            { ico: '🗂️', nome: 'cnpj.biz', desc: 'Consulta de empresas por razão social, fantasia e CNPJ, com quadro societário.', url: 'https://cnpj.biz/empresas' },
            { ico: '📄', nome: 'Execuções e penhoras — JusBrasil', desc: 'Processos de execução em nome da pessoa (penhora de bens, bloqueio de valores).', url: 'https://www.jusbrasil.com.br/consulta-processos?q=' + encodeURIComponent(v) },
            { ico: '🔍', nome: 'Escavador', desc: 'Perfil da pessoa: processos, empresas, diários oficiais e bens penhorados quando públicos.', url: 'https://www.escavador.com/busca?qo=t&q=' + encodeURIComponent(v) }
          ])}
          <h3 style="margin:22px 0 12px">🏠 Imóveis e 🚗 veículos (restritos — caminho legal)</h3>
          <div class="notice notice-warn">⚖️ <div>
            <strong>Imóveis:</strong> não existe consulta pública nacional por nome. Certidões de propriedade são emitidas pelo cartório de registro de imóveis ao titular, a procurador com procuração, ou mediante requisição judicial.<br><br>
            <strong>Veículos:</strong> a base do Senatran/Detran só é acessada por órgãos oficiais, por ordem judicial ou por credenciados (seguradoras). Para investigação formal, requisite via juízo.
          </div></div>
        </div>
      </div>`;
    box.innerHTML = html;
    lastResult = { tipo: 'Bens', query: v, html };
  }

  // ---------- Dossiês ----------
  views.dossies = async () => {
    let d;
    if (SERVER) {
      try { d = (await Srv.get('/api/dossiers')).dossiers; } catch { d = []; }
    } else d = store.get('dossies', []);
    content().innerHTML = `
      <div class="view-head"><h1>📁 Dossiês de Investigação</h1><p>Organize resultados de consultas em dossiês por caso e exporte relatórios completos.</p></div>
      <div class="card no-print">
        <h3>➕ Novo dossiê</h3>
        <form class="search-form" onsubmit="event.preventDefault();App.createDossier()">
          <input type="text" id="dossie-titulo" placeholder="Título — ex.: Investigação patrimonial J. Silva" required />
          <input type="text" id="dossie-caso" placeholder="Nº do caso — ex.: 2026-0142" required style="max-width:220px" />
          <button class="btn btn-primary" type="submit">Criar</button>
        </form>
      </div>
      <div style="margin-top:18px" id="dossie-list">
        ${d.length ? d.map((x, i) => `
          <div class="card" style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <div>
                <strong style="font-size:15px">📁 ${esc(x.titulo)}</strong>
                <div style="font-size:12.5px;color:var(--txt-3);margin-top:3px">Caso <span class="mono">${esc(x.caso)}</span> · criado em ${new Date(x.criado).toLocaleDateString('pt-BR')} · <span class="tag tag-info">${x.itens.length} item(ns)</span></div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-ghost btn-sm" onclick="App.openDossier('${SERVER ? x.id : i}')">👁 Abrir</button>
                <button class="btn btn-danger btn-sm" onclick="App.delDossier('${SERVER ? x.id : i}')">🗑</button>
              </div>
            </div>
          </div>`).join('')
        : '<div class="card"><div class="empty"><div class="e-ico">📂</div>Nenhum dossiê criado ainda.</div></div>'}
      </div>`;
  };

  async function createDossier() {
    const titulo = $('#dossie-titulo').value.trim();
    const caso = $('#dossie-caso').value.trim();
    if (!titulo || !caso) return;
    if (SERVER) {
      try { await Srv.post('/api/dossiers', { titulo, caso }); toast('Dossiê criado.', 'success'); }
      catch (e) { return toast(e.message, 'error'); }
      return views.dossies();
    }
    const d = store.get('dossies', []);
    d.unshift({ titulo, caso, criado: new Date().toISOString(), itens: [] });
    store.set('dossies', d);
    logAudit('CRIAÇÃO DE DOSSIÊ', titulo + ' (' + caso + ')');
    toast('Dossiê criado.', 'success');
    views.dossies();
  }
  async function delDossier(v) {
    if (SERVER) {
      if (!confirm('Excluir este dossiê?')) return;
      try { await Srv.del('/api/dossiers/' + v); toast('Dossiê excluído.', 'info'); }
      catch (e) { return toast(e.message, 'error'); }
      return views.dossies();
    }
    const i = +v;
    const d = store.get('dossies', []);
    if (!confirm('Excluir o dossiê "' + d[i].titulo + '"?')) return;
    logAudit('EXCLUSÃO DE DOSSIÊ', d[i].titulo);
    d.splice(i, 1);
    store.set('dossies', d);
    views.dossies();
    toast('Dossiê excluído.', 'info');
  }
  async function openDossier(v) {
    let d;
    if (SERVER) {
      try { d = (await Srv.get('/api/dossiers/' + v)).dossier; }
      catch (e) { toast(e.message, 'error'); return; }
    } else d = store.get('dossies', [])[+v];
    content().innerHTML = `
      <div class="view-head no-print">
        <button class="btn btn-ghost btn-sm" onclick="App.go('dossies')" style="margin-bottom:14px">← Voltar</button>
        <h1>📁 ${esc(d.titulo)}</h1>
        <p>Caso <span class="mono">${esc(d.caso)}</span> · ${d.itens.length} item(ns) · criado em ${new Date(d.criado).toLocaleString('pt-BR')}</p>
        <div style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="window.print()">🖨️ Exportar relatório (PDF)</button></div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3>Relatório de Investigação — ${esc(d.titulo)}</h3>
        <p style="font-size:13px;color:var(--txt-2)">Caso ${esc(d.caso)} · Gerado em ${new Date().toLocaleString('pt-BR')} por ${esc(user.name)} · ForenseIQ${SERVER ? '' : ' (demonstração)'}</p>
      </div>
      ${d.itens.length ? d.itens.map(it => `
        <div style="margin-bottom:16px">
          <div style="font-size:12px;color:var(--txt-3);margin-bottom:6px">Anexado em ${new Date(it.ts).toLocaleString('pt-BR')} · ${esc(it.tipo)} · <span class="mono">${esc(it.query)}</span></div>
          ${it.html}
        </div>`).join('')
      : '<div class="card"><div class="empty"><div class="e-ico">🗒️</div>Dossiê vazio. Faça consultas e use “Adicionar ao dossiê”.</div></div>'}`;
  }

  // ---------- Histórico ----------
  views.historico = async () => {
    let h;
    if (SERVER) { try { h = (await Srv.get('/api/history')).history; } catch { h = []; } }
    else h = store.get('history', []);
    content().innerHTML = `
      <div class="view-head"><h1>🕑 Histórico de Consultas</h1><p>Todas as consultas realizadas${SERVER ? ' na sua conta' : ' nesta estação (armazenadas localmente)'}.</p></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px" class="no-print">
          <h3 style="margin:0">Registros (${h.length})</h3>
          ${h.length ? '<button class="btn btn-danger btn-sm" onclick="App.clearHistory()">🗑 Limpar histórico</button>' : ''}
        </div>
        ${h.length ? `<table><thead><tr><th>Data/Hora</th><th>Tipo</th><th>Consulta</th><th>Resumo</th></tr></thead>
        <tbody>${h.map(x => `<tr>
          <td class="mono" style="white-space:nowrap">${new Date(x.ts).toLocaleString('pt-BR')}</td>
          <td><span class="tag tag-info">${esc(x.tipo)}</span></td>
          <td class="mono">${esc(x.query)}</td>
          <td style="color:var(--txt-2)">${esc(x.resumo || '—')}</td></tr>`).join('')}</tbody></table>`
        : '<div class="empty"><div class="e-ico">🕑</div>Nenhuma consulta registrada.</div>'}
      </div>`;
  };
  async function clearHistory() {
    if (!confirm('Limpar todo o histórico de consultas?')) return;
    if (SERVER) {
      try { await Srv.post('/api/history/clear'); toast('Histórico limpo.', 'info'); } catch (e) { toast(e.message, 'error'); }
      return views.historico();
    }
    store.set('history', []);
    logAudit('LIMPEZA DE HISTÓRICO', '—');
    views.historico();
    toast('Histórico limpo.', 'info');
  }

  // ---------- Auditoria ----------
  views.auditoria = async () => {
    let a;
    if (SERVER) { try { a = (await Srv.get('/api/audit')).audit; } catch { a = []; } }
    else a = store.get('audit', []);
    content().innerHTML = `
      <div class="view-head"><h1>🧾 Trilha de Auditoria — LGPD</h1><p>Registro de todas as operações de tratamento de dados, conforme Art. 37 da Lei nº 13.709/2018.${SERVER && user.role === 'admin' ? ' Você vê os eventos de todas as contas.' : ''}</p></div>
      <div class="notice notice-info">⚖️ <div>Cada consulta registra <strong>quem</strong> acessou, <strong>o quê</strong>, <strong>quando</strong> e sob <strong>qual base legal</strong>. Em produção, esta trilha é assinada e retida por 5 anos.</div></div>
      <div class="card">
        ${a.length ? `<table><thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Alvo</th><th>Base legal</th></tr></thead>
        <tbody>${a.map(x => `<tr>
          <td class="mono" style="white-space:nowrap">${new Date(x.ts).toLocaleString('pt-BR')}</td>
          <td>${esc(x.usuario)}</td>
          <td><span class="tag tag-mut">${esc(x.acao)}</span></td>
          <td class="mono">${esc(x.alvo)}</td>
          <td style="font-size:12px;color:var(--txt-3)">${esc(x.base)}</td></tr>`).join('')}</tbody></table>`
        : '<div class="empty"><div class="e-ico">🧾</div>Nenhum evento registrado.</div>'}
      </div>`;
  };

  // ---------- Créditos & Planos ----------
  views.creditos = async () => {
    let txs = [];
    const isAdmin = SERVER ? (user && user.role === 'admin') : user.name === 'admin';
    if (SERVER) { try { txs = (await Srv.get('/api/tx')).tx; } catch { } }
    else txs = store.get('tx', []);
    const bal = balance();
    content().innerHTML = `
      <div class="view-head"><h1>💳 Créditos & Planos</h1><p>Modelo pré-pago: cada consulta consome créditos da sua conta. Recarregue quando quiser — sem mensalidade.</p></div>

      <div class="balance-hero">
        <div>
          <span>Saldo atual — ${esc(user.name)}</span>
          <div class="balance-num">⚡ <b>${bal}</b> <small>créditos</small></div>
        </div>
        <div class="balance-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.go('historico')">Ver uso detalhado</button>
          <button class="btn btn-ghost btn-sm" onclick="App.go('integracoes')">🔌 Integrações</button>
        </div>
      </div>

      <h3 style="margin:26px 0 14px;font-size:15px">💰 Pacotes de créditos</h3>
      <div class="packs">
        ${PACKS.map(p => `
          <div class="pack ${p.best ? 'best' : ''}">
            ${p.best ? '<span class="pack-badge">MAIS VENDIDO</span>' : ''}
            <h4>${p.nome}</h4>
            <div class="pack-credits">⚡ ${p.creditos}</div>
            <div class="pack-price">R$ ${p.preco},00</div>
            <div class="pack-unit">≈ R$ ${(p.preco / p.creditos).toFixed(3).replace('.', ',')} por crédito</div>
            <ul>${(p.feat || []).map(f => `<li>✓ ${f}</li>`).join('')}</ul>
            <button class="btn ${p.best ? 'btn-primary' : 'btn-ghost'} btn-block" onclick="App.startPurchase('${p.id}')">Comprar</button>
          </div>`).join('')}
      </div>

      ${isAdmin ? `
      <div class="grid-2" style="margin-top:28px">
        <div class="card">
          <h3>🛠️ Lançar créditos (admin)</h3>
          <p style="font-size:13px;color:var(--txt-3);margin:4px 0 12px">Credita valores manualmente para qualquer conta — usado em cobrança por boleto/nota de serviço.</p>
          <form class="search-form" onsubmit="event.preventDefault();App.adminGrant()">
            <input type="text" id="grant-user" placeholder="Usuário (ex.: joao.silva)" required />
            <input type="number" id="grant-qtd" placeholder="Qtd" min="1" required style="max-width:110px" />
            <button class="btn btn-primary" type="submit">Lançar</button>
          </form>
        </div>
        <div class="card">
          <h3>🏷️ Preço por consulta (admin)</h3>
          <p style="font-size:13px;color:var(--txt-3);margin:4px 0 12px">Ajuste o custo em créditos de cada módulo.</p>
          <div class="cost-grid">
            ${Object.keys(DEFAULT_COST).map(id => `
              <label><span class="tag tag-info">${id.toUpperCase()}</span>
              <input type="number" min="0" id="cost-${id}" value="${costOf(id)}" /></label>`).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="App.saveCosts()">💾 Salvar preços</button>
        </div>
      </div>` : ''}

      <div class="card" style="margin-top:26px">
        <h3>🧾 Transações recentes</h3>
        ${txs.length ? `<table><thead><tr><th>Data/Hora</th><th>Conta</th><th>Descrição</th><th>Valor</th><th>Saldo</th></tr></thead>
        <tbody>${txs.slice(0, 15).map(t => `<tr>
          <td class="mono" style="white-space:nowrap">${new Date(t.ts).toLocaleString('pt-BR')}</td>
          <td>${esc(t.user)}</td>
          <td>${esc(t.desc)}</td>
          <td class="mono" style="color:${t.delta > 0 ? 'var(--ok)' : 'var(--bad)'}">${t.delta > 0 ? '+' : ''}${t.delta}</td>
          <td class="mono">${t.saldo}</td></tr>`).join('')}</tbody></table>`
        : '<div class="empty"><div class="e-ico">🧾</div>Nenhuma transação ainda.</div>'}
      </div>`;
  };

  function fakeQR(seedStr) {
    const r = Mock.rng('qr:' + seedStr);
    const n = 21, size = 132, c = size / n;
    let cells = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      if (!finder && r() > .5) cells += `<rect x="${(x * c).toFixed(1)}" y="${(y * c).toFixed(1)}" width="${c.toFixed(1)}" height="${c.toFixed(1)}"/>`;
    }
    const f = (fx, fy) => `<rect x="${fx * c}" y="${fy * c}" width="${7 * c}" height="${7 * c}"/><rect x="${(fx + 1) * c}" y="${(fy + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#fff"/><rect x="${(fx + 2) * c}" y="${(fy + 2) * c}" width="${3 * c}" height="${3 * c}"/>`;
    return `<svg class="qr" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="#0b1120">${cells}${f(0, 0)}${f(n - 7, 0)}${f(0, n - 7)}</svg>`;
  }

  function startPurchase(packId) {
    const p = PACKS.find(x => x.id === packId) || PACKS[0];
    if (SERVER) {
      Srv.post('/api/credits/purchase', { pack: packId })
        .then(d => {
          if (d.mode === 'mercadopago') mpCheckout(d, packId);
          else simCheckout(p);
        })
        .catch(e => toast(e.message, 'error'));
      return;
    }
    simCheckout(p);
  }
  function simCheckout(p) {
    modal('Finalizar compra — ' + p.nome, `
      <div class="checkout">
        <div class="qr-box">${fakeQR(p.nome + p.creditos)}</div>
        <div style="flex:1;min-width:220px">
          <div class="kv"><b>Pacote</b><div>${p.nome} — ${p.creditos} créditos</div></div>
          <div class="kv"><b>Valor</b><div>R$ ${p.preco},00</div></div>
          <div class="kv"><b>Validade</b><div>Créditos não expiram</div></div>
          <div class="notice notice-warn" style="margin-top:12px">🧪 <div>Pagamento <strong>simulado</strong> (demonstração). ${SERVER ? 'Configure o token do Mercado Pago em Integrações para PIX real.' : 'Em produção, integre Pix/checkout — Mercado Pago, Pagar.me, Stripe.'}</div></div>
          <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="App.confirmSim('${p.id}')">✅ Já paguei — ativar créditos</button>
        </div>
      </div>`);
  }
  function mpCheckout(d, packId) {
    modal('Pagamento PIX — ' + d.pack, `
      <div class="checkout">
        <div class="qr-box">${d.qr_img ? `<img src="${d.qr_img}" width="150" height="150" alt="QR Pix"/>` : fakeQR('mp' + d.payment_id)}</div>
        <div style="flex:1;min-width:220px">
          <div class="kv"><b>Pacote</b><div>${d.pack} — ${d.creditos} créditos</div></div>
          <div class="kv"><b>Valor</b><div>R$ ${d.preco},00</div></div>
          <div class="kv"><b>Pix copia-e-cola</b><div class="mono" style="font-size:10.5px;word-break:break-all;user-select:all">${esc(d.qr || '—')}</div></div>
          <div class="notice notice-info" style="margin-top:12px">📡 <div>Pagamento <strong>real</strong> via Mercado Pago. Os créditos entram automaticamente após a confirmação do PIX.</div></div>
          <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="App.confirmMP('${packId}','${d.payment_id}')">✅ Já paguei — verificar</button>
        </div>
      </div>`);
  }
  async function confirmSim(packId) {
    const p = PACKS.find(x => x.id === packId) || PACKS[0];
    if (SERVER) {
      try {
        const d = await Srv.post('/api/credits/purchase/confirm', { pack: packId });
        setBalance(d.balance);
        closeModal();
        toast(p.creditos + ' créditos adicionados! Bom trabalho. 🕵️', 'success');
        views.creditos();
      } catch (e) { toast(e.message, 'error'); }
      return;
    }
    addCredits(p.creditos, 'Compra — pacote ' + p.nome + ' (R$ ' + p.preco + ',00)');
    logAudit('COMPRA DE CRÉDITOS', p.creditos + ' créditos — R$ ' + p.preco + ',00');
    closeModal();
    toast(p.creditos + ' créditos adicionados! Bom trabalho. 🕵️', 'success');
    views.creditos();
  }
  async function confirmMP(packId, paymentId) {
    try {
      const d = await Srv.post('/api/credits/purchase/confirm', { pack: packId, payment_id: paymentId });
      if (d.status === 'approved') {
        setBalance(d.balance);
        closeModal();
        toast('Pagamento confirmado — créditos ativados! 🕵️', 'success');
        views.creditos();
      } else {
        toast('Pagamento ainda não confirmado (' + d.status + '). Tente novamente em alguns segundos.', 'warn');
      }
    } catch (e) { toast(e.message, 'error'); }
  }
  async function adminGrant() {
    const u = $('#grant-user').value.trim();
    const qtd = Math.max(1, +$('#grant-qtd').value || 0);
    if (!u) return;
    if (SERVER) {
      try { const d = await Srv.post('/api/admin/grant', { username: u, amount: qtd }); toast(d.msg, 'success'); }
      catch (e) { return toast(e.message, 'error'); }
      return views.creditos();
    }
    store.set('credits:' + u, store.get('credits:' + u, 0) + qtd);
    logAudit('LANÇAMENTO DE CRÉDITOS (ADMIN)', qtd + ' créditos → ' + u);
    if (user && u === user.name) updateChip();
    toast(qtd + ' créditos lançados para "' + u + '".', 'success');
    views.creditos();
  }
  async function saveCosts() {
    const costs = {};
    Object.keys(DEFAULT_COST).forEach(id => { const el = $('#cost-' + id); if (el) costs[id] = Math.max(0, +el.value || 0); });
    if (SERVER) {
      try { const d = await Srv.post('/api/admin/costs', { costs }); serverCosts = d.costs; toast('Preços por consulta atualizados.', 'success'); }
      catch (e) { return toast(e.message, 'error'); }
      return;
    }
    store.set('costs', costs);
    logAudit('ALTERAÇÃO DE PREÇOS', 'custos atualizados');
    toast('Preços por consulta atualizados.', 'success');
  }

  // ---------- Integrações de API ----------
  const INTEGRATIONS = [
    { id: 'cnpjws', ico: '🏢', name: 'CNPJ.ws', cat: 'Empresas / CNPJ', field: 'Token da API', url: 'https://cnpj.ws', browser: true, used: 'Consulta CNPJ (sócios, histórico, filiais)' },
    { id: 'numverify', ico: '📞', name: 'NumVerify', cat: 'Telefone', field: 'Access Key', url: 'https://numverify.com', browser: true, used: 'Telefone (operadora e tipo de linha reais)' },
    { id: 'zerobounce', ico: '✉️', name: 'ZeroBounce', cat: 'E-mail', field: 'API Key', url: 'https://zerobounce.net/br/', browser: false, used: 'E-mail (validação real de entregabilidade)' },
    { id: 'hibp', ico: '🚨', name: 'Have I Been Pwned', cat: 'Vazamentos', field: 'API Key (hibp-api-key)', url: 'https://haveibeenpwned.com/API/Key', browser: false, used: 'Vazamentos (violações reais por e-mail)' },
    { id: 'ipinfo', ico: '🌐', name: 'ipinfo.io', cat: 'IP / Geolocalização', field: 'Token', url: 'https://ipinfo.io', browser: true, used: 'IP (geolocalização e ASN precisos)' },
    { id: 'mercadopago', ico: '💳', name: 'Mercado Pago', cat: 'Pagamentos (PIX)', field: 'Access Token (APP_USR…)', url: 'https://www.mercadopago.com.br/developers/panel', browser: false, used: 'Checkout real de créditos (PIX)' },
    { id: 'datajud', ico: '⚖️', name: 'DataJud (CNJ)', cat: 'Processos judiciais', field: 'API Key (opcional — já usa a chave pública do CNJ)', url: 'https://datajud-wiki.cnj.jus.br/api-publica/', browser: false, used: 'Módulo Processos Jurídicos (capa e movimentações oficiais)' }
  ];

  views.integracoes = async () => {
    if (SERVER) return renderServerIntegrations();
    return renderLocalIntegrations();
  };

  async function renderServerIntegrations() {
    if (!user || user.role !== 'admin') {
      content().innerHTML = `
        <div class="view-head"><h1>🔌 Integrações de API</h1></div>
        <div class="notice notice-warn">🔒 <div>A configuração das chaves é restrita a <strong>administradores</strong>. As chaves ficam armazenadas apenas no servidor (<code>data/keys.json</code>) e nunca são enviadas ao navegador.</div></div>`;
      return;
    }
    let d;
    try { d = await Srv.get('/api/admin/keys'); } catch (e) { return toast(e.message, 'error'); }
    const kk = d.keys || {};
    content().innerHTML = `
      <div class="view-head"><h1>🔌 Integrações de API (servidor)</h1><p>As chaves são guardadas <strong>no back-end</strong> (data/keys.json) e usadas nas consultas via proxy — nunca expostas ao navegador. Isso também libera provedores que bloqueiam chamadas de navegador (HIBP, ZeroBounce).</p></div>
      <div class="notice notice-info">💳 <div>Gateway de pagamento atual: <strong>${d.gateway === 'mercadopago' ? 'Mercado Pago (PIX real)' : 'simulado'}</strong>. Configure o token do Mercado Pago abaixo para ativar cobrança real.</div></div>
      ${INTEGRATIONS.map(it => `
        <div class="card integration">
          <div class="int-head">
            <div class="int-ico">${it.ico}</div>
            <div style="flex:1;min-width:200px">
              <strong>${it.name}</strong> <span class="tag ${kk[it.id] ? 'tag-ok' : 'tag-mut'}">${kk[it.id] ? 'ATIVA · ' + kk[it.id] : 'NÃO CONFIGURADA'}</span>
              <div style="font-size:12.5px;color:var(--txt-3);margin-top:2px">${it.cat} · usada em: ${it.used}</div>
            </div>
            <a class="btn btn-ghost btn-sm" href="${it.url}" target="_blank" rel="noopener">Contratar ↗</a>
          </div>
          <div class="int-row">
            <input type="password" id="key-${it.id}" placeholder="${it.field}" autocomplete="off" />
            <button class="btn btn-primary btn-sm" onclick="App.saveKey('${it.id}')">💾 Salvar</button>
            <button class="btn btn-ghost btn-sm" onclick="App.testKey('${it.id}')">🧪 Testar</button>
            ${kk[it.id] ? `<button class="btn btn-danger btn-sm" onclick="App.clearKey('${it.id}')" title="Remover chave">🗑</button>` : ''}
          </div>
          <div class="int-status" id="st-${it.id}"></div>
        </div>`).join('')}
      <div class="card" style="margin-top:20px">
        <h3>ℹ️ Encadeamento das consultas</h3>
        <ul style="color:var(--txt-2);font-size:13.5px;line-height:1.9;padding-left:18px;margin:8px 0 0">
          <li><strong>CNPJ:</strong> CNPJ.ws (chave do servidor) → BrasilAPI (público) → erro.</li>
          <li><strong>IP:</strong> ipinfo.io (chave do servidor) → ipwho.is (gratuito).</li>
          <li><strong>Telefone:</strong> NumVerify (chave do servidor) → demonstração.</li>
          <li><strong>E-mail:</strong> ZeroBounce + HIBP (chaves do servidor) → demonstração.</li>
          <li><strong>Vazamentos:</strong> HIBP real para e-mails; CPF/telefone em demonstração.</li>
          <li><strong>Processos:</strong> DataJud (chave pública do CNJ ou a sua própria, cadastrada acima).</li>
        </ul>
      </div>`;
  }

  function renderLocalIntegrations() {
    const keys = store.get('keys', {});
    const list = INTEGRATIONS.filter(i => i.id !== 'mercadopago');
    content().innerHTML = `
      <div class="view-head"><h1>🔌 Integrações de API</h1><p>Cadastre as chaves das APIs contratadas <strong>na sua própria conta</strong>. Com chave ativa, a consulta usa a API real; sem chave, o módulo opera em modo demonstração.</p></div>
      <div class="notice notice-warn">🔑 <div><strong>Modo local:</strong> as chaves ficam neste navegador (localStorage). <u>Quando a plataforma roda com o back-end (server.js), as chaves ficam no servidor</u> — mais seguro e sem bloqueios de CORS.</div></div>
      ${list.map(it => `
        <div class="card integration">
          <div class="int-head">
            <div class="int-ico">${it.ico}</div>
            <div style="flex:1;min-width:200px">
              <strong>${it.name}</strong> <span class="tag ${keys[it.id] ? 'tag-ok' : 'tag-mut'}">${keys[it.id] ? 'ATIVA' : 'NÃO CONFIGURADA'}</span>
              <div style="font-size:12.5px;color:var(--txt-3);margin-top:2px">${it.cat} · usada em: ${it.used} · ${it.browser ? '✅ funciona direto do navegador' : '⚠️ requer proxy no servidor (CORS)'}</div>
            </div>
            <a class="btn btn-ghost btn-sm" href="${it.url}" target="_blank" rel="noopener">Contratar ↗</a>
          </div>
          <div class="int-row">
            <input type="password" id="key-${it.id}" placeholder="${it.field}" value="${keys[it.id] ? esc(keys[it.id]) : ''}" autocomplete="off" />
            <button class="btn btn-primary btn-sm" onclick="App.saveKey('${it.id}')">💾 Salvar</button>
            <button class="btn btn-ghost btn-sm" onclick="App.testKey('${it.id}')">🧪 Testar</button>
            ${keys[it.id] ? `<button class="btn btn-danger btn-sm" onclick="App.clearKey('${it.id}')" title="Remover chave">🗑</button>` : ''}
          </div>
          <div class="int-status" id="st-${it.id}"></div>
        </div>`).join('')}
      <div class="card" style="margin-top:20px">
        <h3>ℹ️ Encadeamento (modo local)</h3>
        <ul style="color:var(--txt-2);font-size:13.5px;line-height:1.9;padding-left:18px;margin:8px 0 0">
          <li><strong>CNPJ:</strong> CNPJ.ws (sua chave) → BrasilAPI (público) → demonstração.</li>
          <li><strong>IP:</strong> ipinfo.io (sua chave) → ipwho.is (gratuito) → erro.</li>
          <li><strong>Telefone:</strong> NumVerify (sua chave) → demonstração (UF do DDD sempre real).</li>
          <li><strong>E-mail:</strong> ZeroBounce (validação) + HIBP (vazamentos) → demonstração.</li>
          <li><strong>Vazamentos:</strong> verificação real por e-mail via HIBP; CPF/telefone seguem em demonstração.</li>
          <li><strong>CEP:</strong> sempre BrasilAPI (público) — não precisa de chave.</li>
          <li><strong>Processos:</strong> DataJud/CNJ — no navegador a chamada direta pode ser bloqueada (CORS); no modo servidor vai via proxy.</li>
        </ul>
      </div>`;
  }

  const KEY_TESTS = {
    async cnpjws(k) {
      const r = await fetch('https://api.cnpj.ws/cnpj/00000000000191', { headers: { x_api_key: k }, signal: AbortSignal.timeout(9000) });
      if (r.status === 401 || r.status === 403) throw new Error('Token recusado (' + r.status + ').');
      if (!r.ok) throw new Error('A API respondeu HTTP ' + r.status + '.');
      return 'Token válido — a API respondeu normalmente.';
    },
    async numverify(k) {
      const r = await fetch('https://apilayer.net/api/validate?access_key=' + encodeURIComponent(k) + '&number=5511987654321', { signal: AbortSignal.timeout(9000) });
      const d = await r.json();
      if (d && d.error) throw new Error('Erro da API: ' + (d.error.info || d.error.code));
      if (!d || d.valid === undefined) throw new Error('Resposta inesperada da API.');
      return 'Chave válida — teste retornou operadora "' + (d.carrier || '—') + '".';
    },
    async zerobounce(k) {
      const r = await fetch('https://api.zerobounce.net/v2/validate?api_key=' + encodeURIComponent(k) + '&email=alex@gmail.com', { signal: AbortSignal.timeout(9000) });
      const d = await r.json();
      if (d && d.error) throw new Error(d.error);
      if (!d || !d.status) throw new Error('Resposta inesperada da API.');
      return 'Chave válida — status de teste: "' + d.status + '".';
    },
    async hibp(k) {
      const r = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/test@example.com', { headers: { 'hibp-api-key': k }, signal: AbortSignal.timeout(9000) });
      if (r.status === 401) throw new Error('Chave inválida (401).');
      if (r.status === 429) throw new Error('Limite de requisições excedido (429).');
      if (r.status === 404) return 'Chave válida — conta de teste sem violações (404 esperado).';
      if (!r.ok) throw new Error('HTTP ' + r.status + '.');
      const d = await r.json();
      return 'Chave válida — conta de teste exposta em ' + d.length + ' violação(ões).';
    },
    async ipinfo(k) {
      const r = await fetch('https://ipinfo.io/8.8.8.8?token=' + encodeURIComponent(k), { signal: AbortSignal.timeout(9000) });
      const d = await r.json();
      if (d && d.error) throw new Error(d.error.title || 'Token recusado.');
      return 'Token válido — org: ' + (d.org || '—') + '.';
    },
    async datajud(k) {
      const r = await fetch('https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search', { method: 'POST', headers: { Authorization: 'ApiKey ' + k, 'Content-Type': 'application/json' }, body: JSON.stringify({ size: 0 }), signal: AbortSignal.timeout(9000) });
      if (r.status === 401) throw new Error('Chave inválida (401).');
      if (r.status === 429) throw new Error('Cota esgotada (429) — cadastre chave própria.');
      if (!r.ok) throw new Error('HTTP ' + r.status + '.');
      return 'Chave válida — DataJud respondeu normalmente.';
    }
  };

  async function saveKey(id) {
    const v = $('#key-' + id).value.trim();
    if (SERVER) {
      try { await Srv.post('/api/admin/keys', { id, key: v || null }); toast(v ? 'Chave salva no servidor.' : 'Chave removida do servidor.', 'success'); }
      catch (e) { return toast(e.message, 'error'); }
      return views.integracoes();
    }
    const keys = store.get('keys', {});
    if (v) keys[id] = v; else delete keys[id];
    store.set('keys', keys);
    logAudit(v ? 'CONFIGURAÇÃO DE INTEGRAÇÃO' : 'REMOÇÃO DE INTEGRAÇÃO', INTEGRATIONS.find(i => i.id === id).name);
    toast(v ? 'Chave salva para ' + id + '.' : 'Chave removida.', 'success');
    views.integracoes();
  }
  async function testKey(id) {
    const st = $('#st-' + id);
    if (SERVER) {
      st.className = 'int-status';
      st.textContent = '⏳ Testando conexão (via servidor)…';
      try {
        const d = await Srv.post('/api/admin/keys/test', { id });
        st.className = 'int-status ' + (d.ok ? 'ok' : 'err');
        st.textContent = (d.ok ? '✅ ' : '⛔ ') + d.msg;
      } catch (e) {
        st.className = 'int-status err';
        st.textContent = '⛔ ' + e.message;
      }
      return;
    }
    const k = (($('#key-' + id).value.trim()) || (store.get('keys', {})[id] || '')).trim();
    st.className = 'int-status';
    st.textContent = '⏳ Testando conexão…';
    try {
      if (!k) throw new Error('Informe (e salve) a chave primeiro.');
      const msg = await KEY_TESTS[id](k);
      st.className = 'int-status ok';
      st.textContent = '✅ ' + msg;
    } catch (e) {
      const m = String(e && e.message || e);
      st.className = 'int-status err';
      st.textContent = '⛔ ' + (/fetch|network|load/i.test(m) ? 'Não foi possível conectar (rede ou bloqueio de CORS do navegador — em produção, use o back-end como proxy).' : m);
    }
  }
  async function clearKey(id) {
    if (SERVER) {
      try { await Srv.post('/api/admin/keys', { id, key: null }); toast('Chave removida do servidor.', 'info'); }
      catch (e) { return toast(e.message, 'error'); }
      return views.integracoes();
    }
    const keys = store.get('keys', {});
    delete keys[id];
    store.set('keys', keys);
    logAudit('REMOÇÃO DE INTEGRAÇÃO', INTEGRATIONS.find(i => i.id === id).name);
    toast('Chave removida.', 'info');
    views.integracoes();
  }

  // ============================================================
  // Dispatcher
  // ============================================================
  const runners = { cpf: runCPF, cnpj: runCNPJ, telefone: runTelefone, email: runEmail, placa: runPlaca, cep: runCEP, ip: runIP, username: runUsername, vazamentos: runVazamentos, processos: runProcessos, mandados: runMandados, bens: runBens };

  async function run(id) {
    const input = $('#q-' + id);
    const q = input.value;
    if (id !== 'ip' && !q.trim()) return input.focus();
    const btn = $('#btn-' + id);
    if (btn) btn.disabled = true;
    try { await runners[id](q); } finally { if (btn) btn.disabled = false; }
  }

  function go(view, query) {
    if (!views[view]) view = 'dashboard';
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    location.hash = view;
    views[view]();
    $('#sidebar').classList.remove('open');
    window.scrollTo({ top: 0 });
    if (query) {
      const inp = $('#q-' + view);
      if (inp) { inp.value = query; run(view); }
    }
  }

  // ---------- Busca inteligente ----------
  function smartSearch(q) {
    q = q.trim();
    if (!q) return;
    const d0 = q.replace(/\D/g, '');
    const digits = ((d0.length === 12 || d0.length === 13) && d0.startsWith('55')) ? d0.slice(2) : d0;
    let view;
    if (q.includes('@') && q.includes('.')) view = 'email';
    else if (q.startsWith('@')) view = 'username';
    else if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(q) || /^0x[a-fA-F0-9]{40}$/.test(q) || /^T[a-zA-HJ-NP-Z0-9]{33}$/.test(q)) view = 'cripto';
    else if (/^(PP|PT|PR|PS|PU)-?[A-Z0-9]{3}$/i.test(q)) view = 'aeronaves';
    else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(q) || /^[0-9a-f:]+::/i.test(q)) view = 'ip';
    else if (digits.length === 11 && Mock.validaCPF(digits)) view = 'cpf';
    else if (digits.length === 14) view = 'cnpj';
    else if (digits.length === 20) view = 'processos';
    else if (digits.length === 8 && !/[a-z]/i.test(q)) view = 'cep';
    else if ((digits.length === 10 || digits.length === 11)) view = 'telefone';
    else if (/^[A-Za-z]{3}-?\d[A-Za-z0-9]\d{2}$/.test(q)) view = 'placa';
    else view = 'username';
    toast('Busca direcionada para: ' + view.toUpperCase(), 'info');
    go(view, q);
  }

  // ============================================================
  // Autenticação / inicialização
  // ============================================================
  function applyModeChrome() {
    const rt = $('#reg-toggle'), lt = $('#login-title'), ls = $('#login-sub'), lh = $('#login-hint'), lb = $('#login-mode-badge'), mb = $('#mode-badge'), fl = $('#forgot-link');
    if (SERVER) {
      if (rt) rt.style.display = '';
      if (fl) fl.style.display = registerMode ? 'none' : '';
      if (lt) lt.textContent = registerMode ? 'Criar conta' : 'Entrar';
      if (ls) ls.textContent = registerMode ? 'Nova conta ganha 25 créditos de boas-vindas' : 'Acesse sua conta para continuar';
      if (lh) lh.innerHTML = 'Contas e créditos gerenciados pelo back-end. Admin demo: <code>admin</code> / <code>admin</code> — ou crie a sua conta.';
      if (lb) lb.textContent = 'BACK-END ATIVO';
      if (mb) mb.textContent = 'LIVE';
    } else {
      if (rt) rt.style.display = 'none';
      if (fl) fl.style.display = '';
      if (lt) lt.textContent = 'Entrar';
      if (ls) ls.textContent = 'Acesse sua conta para continuar';
      if (lh) lh.innerHTML = 'Use <code>admin</code> / <code>admin</code> ou qualquer usuário e senha.';
      if (lb) lb.textContent = 'AMBIENTE DE DEMONSTRAÇÃO';
      if (mb) mb.textContent = 'DEMO';
    }
  }
  function toggleRegister() {
    registerMode = !registerMode;
    applyModeChrome();
    const btn = $('#login-btn');
    if (btn && btn.firstElementChild) btn.firstElementChild.textContent = registerMode ? 'Criar conta' : 'Entrar';
  }

  function enterApp() {
    $('#login-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#side-username').textContent = user.name;
    $('#side-avatar').textContent = user.name[0].toUpperCase();
    const isAdmin = SERVER ? user.role === 'admin' : user.name === 'admin';
    $('#side-role').textContent = isAdmin ? 'Administrador' : 'Investigador Sênior';
    if (!SERVER) ensureWelcome(user.name);
    updateChip();
    const v = location.hash.replace('#', '');
    go(views[v] ? v : 'dashboard');
  }

  async function init() {
    await detectServer();
    applyModeChrome();

    // sessão
    if (SERVER) {
      user = null;
      try { const me = await Srv.get('/api/me'); user = { name: me.username, role: me.role, credits: me.credits }; } catch { }
      if (user) { await loadServerMeta(); enterApp(); }
    } else if (user) {
      enterApp();
    }

    // login / cadastro
    $('#login-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#login-user').value.trim();
      const pass = $('#login-pass').value;
      const btn = $('#login-btn');
      const label = btn.firstElementChild;

      if (SERVER) {
        btn.disabled = true;
        label.textContent = registerMode ? 'Criando conta…' : 'Autenticando…';
        Srv.post(registerMode ? '/api/auth/register' : '/api/auth/login', { username: name, password: pass, remember: $('#remember').checked })
          .then(async d => {
            user = { name: d.username, role: d.role, credits: d.credits };
            await loadServerMeta();
            toast(registerMode ? 'Conta criada! ⚡ 25 créditos de boas-vindas.' : 'Bem-vindo(a), ' + d.username + '!', 'success');
            registerMode = false;
            applyModeChrome();
            label.textContent = 'Entrar';
            enterApp();
          })
          .catch(err => toast(err.message || 'Falha na autenticação.', 'error'))
          .finally(() => { btn.disabled = false; });
        return;
      }

      btn.disabled = true;
      label.textContent = 'Autenticando…';
      setTimeout(() => {
        user = { name, since: new Date().toISOString() };
        if ($('#remember').checked) store.set('user', user);
        const novo = ensureWelcome(name);
        logAudit('LOGIN', name);
        toast('Bem-vindo(a), ' + name + '!' + (novo ? ' ⚡ +25 créditos de boas-vindas.' : ''), 'success');
        enterApp();
        btn.disabled = false;
        label.textContent = 'Entrar';
      }, 700);
    });
    $('#toggle-pass').addEventListener('click', () => {
      const p = $('#login-pass');
      p.type = p.type === 'password' ? 'text' : 'password';
    });

    // app chrome
    $('#logout-btn').addEventListener('click', async () => {
      if (SERVER) {
        try { await Srv.post('/api/auth/logout'); } catch { }
      } else {
        logAudit('LOGOUT', user?.name || '');
        store.set('user', null);
      }
      user = null;
      $('#app').classList.add('hidden');
      $('#login-screen').classList.remove('hidden');
      toast('Sessão encerrada.', 'info');
    });
    $('#hamb').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $$('.nav-item').forEach(n => n.addEventListener('click', e => { e.preventDefault(); go(n.dataset.view); }));
    $('#global-search').addEventListener('keydown', e => {
      if (e.key === 'Enter') { smartSearch(e.target.value); e.target.value = ''; }
    });
    window.addEventListener('hashchange', () => {
      const v = location.hash.replace('#', '');
      if (user && views[v]) go(v);
    });
  }

  function copyText(str) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(() => toast('Copiado para a área de transferência!', 'success')).catch(() => fallbackCopy(str));
    } else fallbackCopy(str);
  }
  function fallbackCopy(str) {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); toast('Copiado para a área de transferência!', 'success'); } catch { }
    document.body.removeChild(el);
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    go, run, toast, closeModal,
    addToDossier, confirmAddToDossier,
    createDossier, delDossier, openDossier,
    clearHistory,
    startPurchase, confirmSim, confirmMP,
    adminGrant, saveCosts,
    saveKey, testKey, clearKey,
    toggleRegister,
    filterOsint, searchOsint,
    generateDorks, runRecon, copyText,
    runCryptoAnalysis, runAircraftSearch,
    runHashCalc, runFileHashCalc
  };
})();
