import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não configurada — copie .env.example para .env');

const local = url.includes('localhost') || url.includes('127.0.0.1');

export const db = new pg.Pool({
  connectionString: url,
  // Supabase exige TLS e usa certificado próprio; local não usa TLS.
  ssl: local ? undefined : { rejectUnauthorized: false },
  // Função serverless: uma conexão por instância, o pooler do Supabase cuida do resto.
  max: local ? 10 : 1,
});

/** Roda `fn` dentro de uma transação; devolve o resultado ou faz ROLLBACK e repropaga. */
export async function emTransacao<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
