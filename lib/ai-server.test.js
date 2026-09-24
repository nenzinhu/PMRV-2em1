import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PMRV_PROVEDORES_IA, nomesEnv } from './ai-models';
import { MAX_TENTATIVAS, montarTentativas, resolverProvedor } from './ai-server';
import { POST } from '../app/api/ai/route';

const TODAS = PMRV_PROVEDORES_IA.flatMap(nomesEnv).concat('CLOUDFLARE_ACCOUNT_ID');
let salvo;

beforeEach(() => {
  salvo = Object.fromEntries(TODAS.map((n) => [n, process.env[n]]));
  TODAS.forEach((n) => delete process.env[n]);
});
afterEach(() => {
  Object.entries(salvo).forEach(([n, v]) => (v === undefined ? delete process.env[n] : (process.env[n] = v)));
  vi.unstubAllGlobals();
});

describe('resolverProvedor', () => {
  it('aceita nomes alternativos de variável (ex.: GRoapi, MODEL_SCOPE_API)', () => {
    process.env.GRoapi = 'g';
    process.env.MODEL_SCOPE_API = 'm';
    expect(resolverProvedor('groq').chave).toBe('g');
    expect(resolverProvedor('modelscope').chave).toBe('m');
  });

  it('Cloudflare sem ACCOUNT_ID não tem URL de chat', () => {
    process.env.CLOUDFLARE_API_TOKEN = 't';
    expect(resolverProvedor('cloudflare').chatUrl).toBeNull();
  });
});

describe('montarTentativas', () => {
  it('escolhido → padrão do mesmo provedor → demais configurados, em ordem', () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.MISTRAL_API_KEY = 'm';
    process.env.AIHUBMIX_API_KEY = 'a';
    const t = montarTentativas({ provider: 'mistral', model: 'mistral-large-latest' });
    expect(t.map((x) => `${x.provedor.id}/${x.modelo}`)).toEqual([
      'mistral/mistral-large-latest',
      'mistral/mistral-small-latest',
      'groq/openai/gpt-oss-20b',
      'aihubmix/minimax-m3-free',
    ]);
  });

  it('pula provedores sem chave e respeita o limite', () => {
    PMRV_PROVEDORES_IA.forEach((p) => (process.env[nomesEnv(p)[0]] = 'k'));
    process.env.CLOUDFLARE_ACCOUNT_ID = 'acc';
    expect(montarTentativas({ provider: 'groq' })).toHaveLength(MAX_TENTATIVAS);
  });

  it('chave do cliente só vale para o provedor escolhido; fallback desligável', () => {
    process.env.OPENROUTER_API_KEY = 'o';
    const t = montarTentativas({ provider: 'groq', apiKeyCliente: 'cli', fallback: false });
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ apiKey: 'cli', modelo: 'openai/gpt-oss-20b' });
  });

  it('sem nenhuma chave → nenhuma tentativa', () => {
    expect(montarTentativas({ provider: 'groq' })).toEqual([]);
  });
});

describe('POST /api/ai com fallback', () => {
  const req = (body) => new Request('http://x/api/ai', { method: 'POST', body: JSON.stringify(body) });

  it('se o escolhido falha (429), responde com o próximo e sinaliza nos headers', async () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.MISTRAL_API_KEY = 'm';
    const urls = [];
    vi.stubGlobal('fetch', async (url) => {
      urls.push(url);
      return url.includes('groq')
        ? new Response('limite', { status: 429 })
        : new Response('data: [DONE]\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    });
    const res = await POST(req({ provider: 'groq', model: 'openai/gpt-oss-120b', prompt: 'oi' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-PMRV-Provider')).toBe('mistral');
    expect(res.headers.get('X-PMRV-Fallback')).toBe('1');
    expect(urls.filter((u) => u.includes('groq'))).toHaveLength(2); // modelo escolhido + padrão
  });

  it('todas falham → devolve o último status; sem chave → 500 nokey', async () => {
    process.env.GROQ_API_KEY = 'g';
    vi.stubGlobal('fetch', async () => new Response('x', { status: 401 }));
    expect((await POST(req({ provider: 'groq', prompt: 'oi' }))).status).toBe(401);
    delete process.env.GROQ_API_KEY;
    expect((await POST(req({ provider: 'groq', prompt: 'oi' }))).status).toBe(500);
  });

  it('erro de rede conta como falha e passa ao próximo', async () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.NOUS_API_KEY = 'n';
    vi.stubGlobal('fetch', async (url) => {
      if (url.includes('groq')) throw new Error('ECONNRESET');
      return new Response('data: [DONE]\n\n', { status: 200 });
    });
    const res = await POST(req({ provider: 'groq', prompt: 'oi' }));
    expect(res.headers.get('X-PMRV-Provider')).toBe('nous');
  });
});
