# Gerador de Scripts MikroTik — Perfill

Aplicação web completa para geração de scripts de provisionamento de roteadores MikroTik seguindo o padrão Perfill Tecnologia (túneis IPsec FortiGate, configurações de WAN DHCP/PPPoE, SNMP e segurança).

---

## 🏗 Arquitetura

O projeto foi desacoplado em arquitetura profissional:
- **`public/` (Front-end)**: Interface moderna desacoplada (`index.html`, `css/style.css`, `js/app.js`).
- **`src/` (Back-end API)**: Servidor Express modular (`server.js`, rotas e gerador de templates).
- **`vercel.json`**: Configuração Serverless pronta para deploy imediato na Vercel.

---

## 🚀 Como Executar Localmente

1. Instalar as dependências:
   ```bash
   npm install
   ```

2. Executar em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abrir no navegador:
   ```
   http://localhost:3000
   ```

---

## 🌐 Publicação na Web

### Opção 1: Render (Recomendado)
1. Conecte o repositório GitHub no [Render](https://render.com).
2. Selecione **New Web Service**.
3. Defina:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Deploy automático e HTTPS incluso.

### Opção 2: Vercel
1. Importe o repositório no [Vercel](https://vercel.com).
2. O arquivo `vercel.json` já está configurado. O Vercel detecta e publica automaticamente.

---

## 🔒 Variáveis de Ambiente (.env)

Copie o `.env.example` para `.env` caso queira customizar:
- `PORT`: Porta do servidor (padrão: `3000`).
- `IPSEC_PEER_IP`: IP público de terminação do túnel IPsec FortiGate.
- `IPSEC_SECRET`: Chave pré-compartilhada (PSK).
- `SNMP_COMMUNITY`: Comunidade SNMP.
