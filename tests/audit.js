// Auditoria cruzada ForenseIQ — checa consistência views/runners/rotas/CSS
const fs = require('fs');
const app = fs.readFileSync('js/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const data = fs.readFileSync('js/data.js', 'utf8');
const server = fs.readFileSync('server.js', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

const problems = [];

// 1) views definidas vs nav
const viewsDef = new Set([...app.matchAll(/views\.(\w+)\s*=/g)].map(m => m[1]));
const navViews = [...html.matchAll(/data-view="(\w+)"/g)].map(m => m[1]);
navViews.forEach(v => { if (!viewsDef.has(v)) problems.push('NAV usa view inexistente: ' + v); });

// 2) TOOLS array vs views
const toolsIds = [...app.matchAll(/\['(\w+)',\s*['"]/g)].map(m => m[1]);
toolsIds.forEach(t => { if (!viewsDef.has(t)) problems.push('TOOLS usa view inexistente: ' + t); });

// 3) runners vs views + painel + resultado
const runnersBlock = app.match(/const runners = \{[^}]+\}/)[0];
const runnerKeys = [...runnersBlock.matchAll(/(\w+):\s*run\w+/g)].map(m => m[1]);
runnerKeys.forEach(k => {
  if (!viewsDef.has(k)) problems.push('runner sem view: ' + k);
  if (!new RegExp("searchPanel\\('" + k + "'").test(app)) problems.push('runner sem searchPanel: ' + k);
  if (!app.includes("'#res-" + k + "'")) problems.push('runner sem #res-…: ' + k);
});

// 4) go('x')
[...app.matchAll(/go\('(\w+)'/g)].map(m => m[1]).forEach(v => {
  if (!viewsDef.has(v)) problems.push('go() para view inexistente: ' + v);
});

// 5) Mock.X usados vs exportados
const mockUsed = new Set([...app.matchAll(/Mock\.(\w+)/g)].map(m => m[1]));
const retBlock = data.match(/return \{([^}]+)\}/g).pop();
const mockExported = new Set([...retBlock.matchAll(/([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
mockUsed.forEach(m => { if (!mockExported.has(m)) problems.push('Mock.' + m + ' usado mas NÃO exportado em data.js'); });

// 6) endpoints do front: cada segmento estático deve aparecer citado no server
//    (o server roteia por segmentos: p[0]==='api', p[1]==='credits', p[2]==='charge'…)
const srvCalls = new Set([...app.matchAll(/Srv\.(?:get|post|del)\('([^']+)'/g)].map(m => m[1]));
srvCalls.forEach(ep => {
  const segs = ep.split('/')
    .filter(s => s && s !== 'api')
    .filter(s => !/\$\{|\+/.test(s)) // remove segmentos dinâmicos
    .filter((s, i, a) => a.indexOf(s) === i);
  segs.forEach(seg => {
    if (!new RegExp("p\\[\\d+\\] === '" + seg + "'").test(server) && !server.includes("'" + seg + "'")) {
      problems.push('endpoint do front não achado no server: ' + ep + ' (segmento ' + seg + ')');
    }
  });
});

// 7) classes CSS essenciais
['src-grid', 'src-item', 'social-grid', 'social-item', 'kv-grid', 'timeline', 'notice-info', 'notice-warn', 'result-card', 's-logo'].forEach(c => {
  if (!css.includes('.' + c)) problems.push('classe CSS ausente: .' + c);
});

// 8) assets referenciados
['js/data.js', 'js/app.js', 'css/style.css'].forEach(f => { if (!html.includes(f)) problems.push('index.html não referencia: ' + f); });

console.log('views:', viewsDef.size, '· runners:', runnerKeys.length, '· Mock usados:', mockUsed.size, '· endpoints front:', srvCalls.size);
console.log(problems.length ? '\n❌ PROBLEMAS (' + problems.length + '):\n' + problems.join('\n') : '\n✅ AUDITORIA CRUZADA: nenhum problema encontrado');
