#!/usr/bin/env bash
set -e

echo "========================================================"
echo "🚀 Iniciando Deploy Automatizado do ForenseIQ (v5)"
echo "========================================================"

# 1. Instalar dependências se necessário
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# 2. Criar diretório de dados
mkdir -p data

# 3. Iniciar processo PM2
echo "🔄 Iniciando servidor com PM2..."
pm2 stop forenseiq 2>/dev/null || true
pm2 start server.js --name "forenseiq"
pm2 save

echo ""
echo "========================================================"
echo "✅ ForenseIQ está NO AR e ouvindo na porta 3000!"
echo "🌐 Acesse: http://localhost:3000 ou seu IP/Domínio"
echo "========================================================"
