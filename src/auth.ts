import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { semPermissao, semToken } from './erros.js';
import type { Perfil, Usuario } from './tipos.js';

const segredo = process.env.JWT_SECRET;
if (!segredo) throw new Error('JWT_SECRET não configurado — copie .env.example para .env');

export const assinarToken = (u: Usuario) =>
  jwt.sign({ sub: String(u.id), perfil: u.perfil, curso: u.curso }, segredo, { expiresIn: '8h' });

/** Exige token válido. Sem ele, 401 (RN-6). */
export const exigeAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(semToken());

  try {
    const payload = jwt.verify(token, segredo) as jwt.JwtPayload;
    req.usuario = { id: Number(payload.sub), perfil: payload.perfil, curso: payload.curso };
    next();
  } catch {
    next(semToken());
  }
};

/** Exige que o perfil do usuário esteja na lista. Fora dela, 403 (RN-6). */
export const exigePerfil =
  (...perfis: Perfil[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(semToken());
    if (!perfis.includes(req.usuario.perfil)) return next(semPermissao());
    next();
  };

/** O usuário logado, garantido por `exigeAuth` ter rodado antes. */
export function usuarioDe(req: Request): Usuario {
  if (!req.usuario) throw semToken();
  return req.usuario;
}

export const ehCoordenacao = (u: Usuario) => u.perfil === 'COORDENADOR' || u.perfil === 'ADMINISTRADOR';
