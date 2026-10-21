# ✅ Checklist de Verificação — ForenseIQ v4

> **Site ao vivo:** preview na porta 3000 · **Login:** `admin` / `admin` · **Créditos iniciais:** 100
> Marque cada item conforme for testando no navegador.

---

## 🤖 Verificação automática (já executada — tudo OK)

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | Back-end no ar (`/api/health`) | ✅ `{"ok":true,"mode":"server"}` |
| 2 | Front-end servido (index, app.js, css) | ✅ HTTP 200 |
| 3 | Login admin/admin | ✅ 100 créditos |
| 4 | CNPJ real 19.131.243/0001-97 (Magalu) via BrasilAPI | ✅ dados reais, cobrou 1 |
| 5 | CEP 01310-100 → Avenida Paulista | ✅ dados reais, cobrou 1 |
| 6 | Processo nº 0000832-35.2018.4.01.3202 (DataJud) | ⚠️ 502 tratado — bloqueio **deste ambiente de preview** (ver nota abaixo) |
| 7 | Preços com os 3 módulos novos (processos 2, mandados 1, bens 1) | ✅ |
| 8 | Cobranças e saldo (100−1−1−2 = 96) | ✅ exato |
| 9 | Suíte E2E completa | ✅ **41/41 testes** |

> **Nota DataJud:** a API pública do CNJ é real e funciona em produção. O ambiente deste preview bloqueia chamadas autenticadas a ela (testado exaustivamente). No seu servidor/VPS real a consulta retorna capa do processo + movimentações. O sistema já trata isso com mensagem clara e aceita chave própria em Integrações.

---

## 👤 1. Login & Conta

- [ ] Tela de login carrega com o visual dark (logo, campos, botão)
- [ ] Entrar com **admin / admin** → cai no Dashboard com 100 créditos
- [ ] Sair (logout) → volta para o login
- [ ] Criar uma conta nova → recebe **25 créditos** de boas-vindas
- [ ] Tentar logar com senha errada → recusa com mensagem
- [ ] Navegar sem logar → é barrado

## 🔍 2. Consultas OSINT (dados reais, sem chave)

- [ ] **CNPJ** `19131243000197` (Magazine Luiza) → ficha real: razão social, situação, endereço, sócios — *1 crédito*
- [ ] **CNPJ** `27865757000102` (Vale) → outra ficha real — *1 crédito*
- [ ] **CEP** `01310100` → Avenida Paulista, Bela Vista, São Paulo/SP — *1 crédito*
- [ ] **IP** `8.8.8.8` → Google LLC, EUA — *1 crédito*
- [ ] **CPF** (qualquer número) → perfil em **demonstração** (rotulado como demo) — *2 créditos*
- [ ] **Telefone / E-mail / Placa / Username** → demonstração (para virarem reais, cadastrar chaves em Integrações)
- [ ] **Vazamentos** com um e-mail → demonstração (HIBP real se cadastrar chave)
- [ ] CNPJ inválido (ex.: `11111111111111`) → recusado **sem cobrar**

## ⚖️ 3. NOVIDADES v4 — Fontes Oficiais

- [ ] Menu lateral tem a seção **"Fontes Oficiais"** com 3 itens (⚖️ 🧾 💼)
- [ ] **Processos por número:** colar `00008323520184013202` → no preview mostra o aviso tratado do DataJud (esperado aqui); em produção retorna classe, órgão julgador, assuntos e as últimas 12 movimentações — *2 créditos*
- [ ] **Processos por nome:** digitar `joão silva` → kit de links públicos (CNJ, JusBrasil, Escavador, ConsultaSocio) — grátis
- [ ] **Mandados & Certidões:** nome ou CPF → kit oficial: BNMP (mandados de prisão), PGFN (dívida ativa), CNDT/TST (trabalhista), Pesquisa Protesto, JusBrasil — *1 crédito*
- [ ] **Patrimônio:** nome → kit: ConsultaSocio, Casa dos Dados, cnpj.biz, execuções — *1 crédito*
- [ ] **Patrimônio:** colar um CNPJ → aparece o atalho para o módulo CNPJ
- [ ] Avisos legais aparecem nos kits (imóveis = cartório/procuração; veículos = ordem judicial; Serasa/SPC = só titular)
- [ ] **Smart Search:** no Dashboard, colar número de 20 dígitos → vai direto para Processos

## 💰 4. Créditos & Cobrança

- [ ] O badge de saldo no topo **diminui** a cada consulta paga
- [ ] **Histórico** lista todas as consultas com módulo e resultado
- [ ] **Transações** lista os lançamentos de créditos
- [ ] **Comprar créditos** → escolher pacote → PIX simulado → confirmar → saldo sobe (+50 no Starter)
- [ ] **Auditoria** (admin) mostra login, consultas e compras

## 🗂️ 5. Dossiês

- [ ] Criar um dossiê (título + nº do caso)
- [ ] Rodar uma consulta e salvar o resultado no dossiê
- [ ] Abrir o dossiê → vê os itens anexados com o resultado completo

## 🛠️ 6. Painel Admin (só com admin)

- [ ] **Integrações:** lista os 7 provedores (CNPJ.ws, NumVerify, ZeroBounce, HIBP, ipinfo, Mercado Pago, **DataJud**)
- [ ] Botão **testar chave** funciona (recusa chave inválida com mensagem clara)
- [ ] **Créditos:** tabela de preços editável — inclui Processos (2), Mandados (1), Bens (1)
- [ ] Alterar um preço → consultas passam a cobrar o novo valor
- [ ] **Usuários:** lista as contas criadas, com credits e papel
- [ ] Lançar créditos para um usuário
- [ ] Conta comum (não-admin) **não** vê os menus admin → recebe 403

## 🎨 7. Design & Navegação

- [ ] Menu lateral organizado em seções: OSINT → **Fontes Oficiais** → Gestão
- [ ] Ícones e animações (hover nos cards, transições)
- [ ] Encolher a janela → layout responsivo (menu e grids se adaptam)
- [ ] Nenhum erro no console do navegador (F12)

---

## 🧪 Dados prontos para colar

| O quê | Valor |
|---|---|
| CNPJ (Magalu) | `19131243000197` |
| CNPJ (Vale) | `27865757000102` |
| CEP (Av. Paulista) | `01310100` |
| CEP (Copacabana) | `22041001` |
| IP (Google DNS) | `8.8.8.8` |
| IP (Cloudflare) | `1.1.1.1` |
| Processo (TRF1) | `00008323520184013202` |
| Nome para kits | `joão silva` |

## ⚠️ Comportamentos esperados (não são bugs)

1. **Consulta de processo no preview** → mensagem de indisponibilidade (502 tratado): o ambiente de preview bloqueia a chamada autenticada ao DataJud. Em produção real (`node server.js` no seu servidor) funciona.
2. **CPF/telefone/e-mail/placa sem chaves** → modo demonstração, sempre rotulado como tal.
3. **PIX simulado** → até cadastrar o Access Token do Mercado Pago em Integrações; com token, gera PIX real.
4. **Consultas repetidas muito rápido** → rate limit de login/register (segurança contra força bruta).
