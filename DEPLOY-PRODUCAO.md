# 🚀 Guia Oficial de Deploy em Produção — ForenseIQ (v5)

Este manual contém o passo a passo completo para colocar o **ForenseIQ** em produção no seu próprio servidor/VPS, configurar domínio próprio, SSL (HTTPS), ativar processos contínuos (PM2) e conectar as chaves de dados reais.

---

## 📋 Checklist de Deploy em Produção

### Fase 1: Infraestrutura & Servidor
- [ ] Contratar VPS (Ubuntu 22.04 ou 24.04 LTS — ex.: DigitalOcean, Hetzner, AWS, Linode, Contabo)
- [ ] Configurar apontamento DNS do seu domínio (`A` record apontando para o IP do VPS)
- [ ] Configurar Firewall (UFW) liberando portas 22 (SSH), 80 (HTTP) e 443 (HTTPS)

### Fase 2: Instalação no Servidor
- [ ] Instalar **Node.js 20 LTS** e **Nginx**
- [ ] Instalar o **PM2** (gerenciador de processos contínuo 24/7)
- [ ] Fazer o upload do pacote `forenseiq-v5-final.zip` para `/var/www/forenseiq`
- [ ] Descompactar os arquivos

### Fase 3: Segurança & SSL
- [ ] Configurar o Nginx como Proxy Reverso para `http://127.0.0.1:3000`
- [ ] Gerar certificado SSL gratuito com **Certbot (Let's Encrypt)**
- [ ] Iniciar a aplicação com `pm2 start server.js --name forenseiq` e `pm2 startup`

### Fase 4: Chaves de APIs Reais & Pagamentos
- [ ] Fazer login com `admin` / `admin` e **trocar imediatamente a senha do administrador**
- [ ] No painel **Integrações de API**, cadastrar:
  - **DataJud:** Chave própria gratuita (datajud-wiki.cnj.jus.br) para consultas processuais oficiais sem limite
  - **Mercado Pago:** Access Token de produção para emissão de PIX real automático
  - **NumVerify:** Chave (gratuita 100/mês ou plano pago) para operadora e tipo de linha real
  - **ZeroBounce:** Chave para validação real de caixas de entrada de e-mail
  - **HIBP (Have I Been Pwned):** Chave para detecção de vazamentos reais por e-mail
  - **CNPJ.ws:** Chave opcional para consultas de CNPJ de alta volumetria

---

## 🛠️ Passo a Passo Detalhado de Instalação (Ubuntu / Debian)

### 1. Atualizar o sistema e instalar Node.js 20 LTS
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip nginx ufw

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### 2. Configurar o Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 3. Extrair os arquivos da aplicação
```bash
sudo mkdir -p /var/www/forenseiq
sudo chown -R $USER:$USER /var/www/forenseiq

# Enviar o arquivo forenseiq-v5-final.zip para a pasta e extrair:
cd /var/www/forenseiq
unzip /caminho/do/forenseiq-v5-final.zip
```

### 4. Iniciar com PM2 (Execução Contínua)
```bash
cd /var/www/forenseiq
pm2 start server.js --name "forenseiq"
pm2 save
pm2 startup
```

### 5. Configurar o Nginx (Proxy Reverso)
Crie o arquivo de configuração `/etc/nginx/sites-available/forenseiq`:
```bash
sudo nano /etc/nginx/sites-available/forenseiq
```

Cole a configuração abaixo (substituindo `seudominio.com.br` pelo seu domínio real):
```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e teste o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/forenseiq /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Instalar Certificado SSL Gratuito (HTTPS)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

---

## 📡 Como Funcionam as Fontes de Dados Reais

### 🟢 Módulos que já operam com DADOS REAIS sem nenhum custo:
1. **CNPJ:** Consulta direta via **BrasilAPI / Receita Federal** com situação cadastral, quadro societário (QSA), capital social, endereço e CNAE.
2. **CEP:** Consulta direta via **BrasilAPI / ViaCEP** oficial dos Correios.
3. **IP & Geolocalização:** Consulta direta via **ipwho.is** com provedor, ASN, latitude/longitude e cidade real.
4. **Varredura de Username (Sherlock):** Varredura ativa em 18+ redes sociais e plataformas em tempo real (HTTP 200).
5. **Processos Judiciais (DataJud):** Consulta direta na base pública oficial do CNJ.
6. **Mandados de Prisão & Certidões:** Portais oficiais do **BNMP 3.0**, **PGFN (Dívida Aberta)**, **TST (CNDT)** e **Central de Protestos (Cenprot)**.
7. **Patrimônio Societário:** Fontes abertas oficiais da RFB (**ConsultaSocio**, **Casa dos Dados**, **cnpj.biz**).
8. **Aeronaves & Embarcações:** Consulta oficial no **RAB / ANAC** e **FlightRadar24 / MarineTraffic**.
9. **Criptoativos:** Exploradores públicos da blockchain (**Blockchain.com**, **Mempool**, **Etherscan**, **Tronscan**, **Solscan**).
10. **Google Dorking & Hub OSINT:** Execução real nos motores de busca e diretório de 150+ fontes governamentais.

### 🔑 Módulos com Ativação de Chaves Oficiais (Painel Admin):
* **Telefone & Operadora:** Adicione sua chave do **NumVerify** (gratuito 100/mês ou plano comercial) em *Integrações*.
* **E-mail Real:** Adicione sua chave do **ZeroBounce** para validação de entrega de e-mail.
* **Vazamentos de E-mail:** Adicione a chave do **Have I Been Pwned** para checagem real de breaches.
* **Venda de Créditos via PIX Real:** Adicione o **Access Token de Produção do Mercado Pago** em *Integrações*.

---

## 🔒 Conformidade Jurídica & LGPD
O ForenseIQ é estruturado para atuar estritamente dentro da legalidade (Art. 7º, VI e IX da Lei 13.709/2018 - LGPD, Art. 369/411 do CPC e Provimento 188/2018 da OAB).
* **Todas as consultas geram log de auditoria** com usuário, timestamp e base legal.
* **Não são comercializados dados roubados/vazados de terceiros** (prática ilícita de painéis clandestinos como *Wolf Buscas*, que violam o Art. 154-A do Código Penal e geram nulidade probatória em juízo).
