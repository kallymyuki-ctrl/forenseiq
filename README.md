# 🕵️ ForenseIQ — Plataforma de Inteligência de Dados Públicos & OSINT (v5)

Plataforma profissional de investigação defensiva e OSINT com **design dark moderno**, back-end próprio de produção, sistema de créditos pré-pagos autoritativo no servidor e **consultas reais em fontes 100% legais** (dados públicos, abertos e oficiais).

## 🚀 Como rodar

```bash
node server.js
```

Abra `http://localhost:3000` — pronto. Requisito: **Node.js 18+** (sem dependências externas, sem `npm install`).

- **Login inicial:** `admin` / `admin` (100 créditos) — **troque a senha em produção**
- Novas contas ganham 25 créditos de boas-vindas
- Os dados ficam persistidos em `data/*.json` (criado automaticamente; apague a pasta para resetar)

## 🧰 Módulos & Ferramentas Integradas

| Módulo | Tipo | Descrição & Fonte |
|---|---|---|
| 🇧🇷 **Hub OSINT Brasil** | Diretório | 80+ fontes governamentais e ferramentas abertas categorizadas (*osint-brazuca* & *OSINT Brasil Directory*) com busca instantânea e filtros |
| ⚡ **Gerador Google Dorks** | Ferramenta | 10 presets táticos (Documentos expostos, Diários Oficiais, Pastas abertas `index of`, `.env`/chaves, Lattes, Licitações, Redes Sociais) com execução one-click no Google |
| 📡 **Recon Infra & Domínios** | Inteligência | Mapeamento tático integrado: Shodan, theHarvester, IntelX, Wayback Machine, SecurityTrails, VirusTotal e Registro.br WHOIS |
| 🧭 **Metodologia & Framework** | Guia Tático | Taxonomia OSINT Framework, modelagem de grafos (Maltego), automação (SpiderFoot OSS/recon-ng) e conformidade probatória (Art. 7º LGPD, CPC, Provimento 188/2018 OAB) |
| 👤 **Username (Sherlock)** | Real | Varredura de perfis públicos em 18 plataformas (GitHub, GitLab, Dev.to, Chess.com, Substack, etc.) com checagem HTTP em tempo real |
| 🏢 **CNPJ** | Real | BrasilAPI (Receita Federal / QSA, dados públicos abertos) |
| 📮 **CEP** | Real | BrasilAPI (Correios / ViaCEP) |
| 🌐 **IP / Geo** | Real | ipwho.is (ASN, provedor, coordenadas geográficas) |
| ⚖️ **Processos (DataJud)** | Real | DataJud/CNJ — API pública oficial por número CNJ |
| 🧾 **Mandados & Certidões** | Fontes Oficiais | Kit de portais oficiais: BNMP 3.0, PGFN Dívida Aberta, CNDT/TST e Central de Protestos |
| 💼 **Patrimônio & Bens** | Fontes Oficiais | Participações societárias (dados abertos RFB): ConsultaSocio, Casa dos Dados, cnpj.biz |
| 📞 **Telefone** | Análise & Links | Estrutura de numeração, UF por DDD, WhatsApp direto (wa.me) e consulta de operadora (Agitel) |
| 📁 **Dossiês & Auditoria** | Gestão | Agrupamento de provas por caso investigativo, trilha de auditoria LGPD e exportação para relatório pericial |

## 🔑 APIs opcionais (painel admin → Integrações)

Todas as chaves ficam **só no servidor** (`data/keys.json`), nunca expostas ao navegador:

- **NumVerify** (100/mês grátis) → operadora e tipo de linha reais
- **ZeroBounce** → validação de e-mail real
- **HIBP** → vazamentos reais por e-mail
- **CNPJ.ws** → CNPJ premium
- **ipinfo** → IP premium
- **Mercado Pago** → Access Token para **PIX real** de venda de créditos (sem token = checkout simulado)
- **DataJud** → chave própria gratuita em datajud-wiki.cnj.jus.br

## 🧪 Testes de Qualidade & Conformidade

```bash
node tests/audit.js       # auditoria cruzada: views, runners, rotas e CSS
node tests/api-test.mjs   # 42 verificações de integração de ponta a ponta
```

## ⚖️ Conformidade legal (LGPD & Legislação Brasileira)

- **Apenas dados públicos e fontes abertas (OSINT)** — em estrito alinhamento com a Lei nº 13.709/2018 (Art. 7º, VI e IX), Marco Civil da Internet (Lei 12.965/2014) e Provimento 188/2018 do Conselho Federal da OAB (Investigação Defensiva).
- Painéis clandestinos e "puxadas" ilegais (tipo Wolf Buscas) utilizam dados vazados e cometem crimes (Art. 154-A do Código Penal) — suas provas são **juridicamente nulas** (Art. 5º, LVI da CF/88). O ForenseIQ atua exclusivamente dentro da legalidade probatória com cadeia de custódia auditável.

## 📁 Estrutura do Projeto

```
detetiveforense/
├── index.html          # SPA (dual-mode: servidor ou estático)
├── css/style.css       # design system dark com suporte a dorks, recon e diretórios
├── js/data.js          # gerador determinístico + bases OSINT Brasil & Google Dorks
├── js/app.js           # aplicação SPA completa (15 módulos OSINT + gestão)
├── server.js           # back-end: contas scrypt, créditos, proxy de APIs, PIX
├── tests/              # api-test.mjs (42 E2E) + audit.js
└── data/               # store persistente em JSON (criado em runtime)
```
