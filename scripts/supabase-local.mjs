// Supabase local de teste: aplica as migrações em um Postgres embutido (PGlite) e responde às chamadas
// /rest/v1/rpc/<função> como o Supabase, sem conta nem internet. Uso:
//   node scripts/supabase-local.mjs            -> http://127.0.0.1:54321, chave secreta "local-secret"
// Depois rode o site com SUPABASE_URL=http://127.0.0.1:54321 e SUPABASE_SECRET_KEY=local-secret.
// Os dados ficam só na memória; reiniciar o script apaga tudo.
import { readdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SUPABASE_ROLES = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;`;

/** Banco em memória com os papéis padrão do Supabase e todas as migrações aplicadas. */
export async function createLocalSupabase(secret = 'local-secret') {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(SUPABASE_ROLES);
  const folder = join(root, 'supabase', 'migrations');
  for (const file of (await readdir(folder)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(join(folder, file), 'utf8'));
  /** Mesmo contrato do PostgREST para RPC: argumentos nomeados no corpo, erro com { code, message }. */
  const call = async (name, args, role = 'service_role') => {
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) return { status: 404, body: { code: 'PGRST202', message: 'Função não encontrada.' } };
    const keys = Object.keys(args || {}).filter(key => /^[a-z_][a-z0-9_]*$/.test(key));
    try {
      return await db.transaction(async tx => {
        await tx.exec(`set local role ${role}`);
        const result = await tx.query(`select public.${name}(${keys.map((key, i) => `${key} => $${i + 1}`).join(', ')}) as result`, keys.map(key => args[key]));
        return { status: 200, body: result.rows[0]?.result ?? null };
      });
    } catch (error) {
      return { status: error.code === '42501' ? 401 : 400, body: { code: error.code || 'P0001', message: error.message } };
    }
  };
  // Armazenamento mínimo em memória, no formato de caminhos do Supabase Storage.
  const files = new Map();
  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input)), method = (init.method || 'GET').toUpperCase(), headers = new Headers(init.headers);
    const publicFile = url.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
    if (publicFile && method === 'GET') { const file = files.get(decodeURIComponent(publicFile[1])); return file ? new Response(file.bytes, { headers: { 'Content-Type': file.type } }) : Response.json({ message: 'Arquivo não encontrado.' }, { status: 404 }); }
    if (headers.get('apikey') !== secret) return Response.json({ message: 'Chave inválida.' }, { status: 401 });
    const upload = url.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (upload && (method === 'POST' || method === 'PUT')) {
      const key = `${upload[1]}/${decodeURIComponent(upload[2])}`;
      if (files.has(key) && method === 'POST' && headers.get('x-upsert') !== 'true') return Response.json({ statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }, { status: 400 });
      files.set(key, { type: headers.get('content-type') || 'application/octet-stream', bytes: new Uint8Array(await new Response(init.body).arrayBuffer()) });
      return Response.json({ Key: key, Id: key });
    }
    const bucket = url.pathname.match(/^\/storage\/v1\/object\/([^/]+)$/);
    if (bucket && method === 'DELETE') { const { prefixes = [] } = JSON.parse(String(init.body || '{}')); for (const name of prefixes) files.delete(`${bucket[1]}/${name}`); return Response.json(prefixes.map(name => ({ name }))); }
    const match = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/i);
    if (!match || method !== 'POST') return Response.json({ message: 'Rota não suportada no Supabase local.' }, { status: 404 });
    const { status, body } = await call(match[1], init.body ? JSON.parse(String(init.body)) : {});
    return Response.json(body, { status });
  };
  return { db, call, fetcher, files, close: () => db.close() };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = Number(process.env.PORT || 54321), secret = process.env.SUPABASE_SECRET_KEY || 'local-secret', local = await createLocalSupabase(secret);
  createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value ?? '']));
    const result = await local.fetcher(`http://127.0.0.1:${port}${request.url}`, { method: request.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
    response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') || 'application/json', 'Access-Control-Allow-Origin': '*' }); response.end(Buffer.from(await result.arrayBuffer()));
  }).listen(port, '127.0.0.1', () => console.log(`Supabase local de teste em http://127.0.0.1:${port} (chave secreta: ${secret === 'local-secret' ? 'local-secret' : 'definida por SUPABASE_SECRET_KEY'})`));
}
