import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import generatorRoutes from './routes/generator.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do front-end (HTML, CSS, JS)
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Rotas da API
app.use('/api', generatorRoutes);

// Fallback para servir index.html em rotas não-API
app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Inicialização do servidor (apenas fora do ambiente Serverless da Vercel)
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(`🚀 Servidor Gerador MikroTik rodando!`);
    console.log(`📍 URL: http://localhost:${config.port}`);
    console.log(`📁 Front-end servido a partir de: /public`);
    console.log(`🔌 API disponível em: http://localhost:${config.port}/api`);
    console.log(`===============================================`);
  });
}

export default app;
