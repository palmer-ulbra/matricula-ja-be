import 'dotenv/config';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { ErroDaApi } from './erros.js';
import { rotas } from './rotas.js';
import './tipos.js';

export const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/v1', rotas);

app.use((_req, res) => res.status(404).json({ erro: { codigo: 'ROTA_INEXISTENTE', regra: null, mensagem: 'Rota não encontrada' } }));

const tratarErro: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErroDaApi) {
    res.status(err.status).json(err.corpo);
    return;
  }
  console.error(err);
  res.status(500).json({ erro: { codigo: 'ERRO_INTERNO', regra: null, mensagem: 'Erro interno' } });
};
app.use(tratarErro);
