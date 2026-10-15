import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PMRV_PROVEDORES_IA, nomesEnv } from './ai-models';
import { MAX_IMAGENS, MAX_TENTATIVAS, conteudoUsuario, montarTentativas, resolverProvedor, validarImagens } from './ai-server';
import { POST } from '../app/api/ai/route';

const TODAS = PMRV_PROVEDORES_IA.flatMap(nomesEnv);
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
  it('resolve as variáveis dos quatro provedores permitidos', () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.OPENROUTER_API_KEY = 'o';
    process.env.CEREBRAS_API_KEY = 'c';
    process.env.COHERE_API_KEY = 'h';
    expect(PMRV_PROVEDORES_IA.map((p) => resolverProvedor(p.id).chave)).toEqual(['g', 'o', 'c', 'h']);
  });
});

describe('montarTentativas', () => {
  it('escolhido → padrão do mesmo provedor → demais configurados, em ordem', () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.OPENROUTER_API_KEY = 'o';
    process.env.CEREBRAS_API_KEY = 'c';
    const t = montarTentativas({ provider: 'cerebras', model: 'command-a-plus-05-2026' });
    expect(t.map((x) => `${x.provedor.id}/${x.modelo}`)).toEqual([
      'cerebras/command-a-plus-05-2026',
      'cerebras/command-a-03-2025',
      'groq/qwen/qwen3.8-27b',
      'openrouter/poolside/laguna-s-2.1:free',
    ]);
  });

  it('pula provedores sem chave e usa somente os quatro permitidos', () => {
    PMRV_PROVEDORES_IA.forEach((p) => (process.env[nomesEnv(p)[0]] = 'k'));
    expect(montarTentativas({ provider: 'groq' })).toHaveLength(4);
    expect(MAX_TENTATIVAS).toBeGreaterThanOrEqual(4);
  });

  it('chave do cliente só vale para o provedor escolhido; fallback desligável', () => {
    process.env.OPENROUTER_API_KEY = 'o';
    const t = montarTentativas({ provider: 'groq', apiKeyCliente: 'cli', fallback: false });
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ apiKey: 'cli', modelo: 'qwen/qwen3.8-27b' });
  });

  it('troca modelo não permitido pelo padrão do provedor', () => {
    process.env.GROQ_API_KEY = 'g';
    const t = montarTentativas({ provider: 'groq', model: 'modelo/antigo', fallback: false });
    expect(t.map((x) => x.modelo)).toEqual(['qwen/qwen3.8-27b']);
  });

  it('com imagens: troca modelo só-texto pelo de visão e pula provedores sem visão', () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.OPENROUTER_API_KEY = 'o';
    process.env.CEREBRAS_API_KEY = 'c';
    process.env.COHERE_API_KEY = 'h';
    const t = montarTentativas({ provider: 'groq', model: 'openai/gpt-oss-120b', visao: true });
    expect(t.map((x) => `${x.provedor.id}/${x.modelo}`)).toEqual([
      'groq/qwen/qwen3.8-27b',
      'openrouter/nvidia/nemotron-3-nano-30b-a3b:free',
      'cohere/c4ai-aya-vision-32b',
    ]);
    // 4 fotos: o Qwen do Groq (máx. 3) fica de fora; os demais continuam.
    const muitas = montarTentativas({ provider: 'groq', visao: true, qtdImagens: 4 });
    expect(muitas.map((x) => x.modelo)).toEqual([
      'nvidia/nemotron-3-nano-30b-a3b:free',
      'c4ai-aya-vision-32b',
    ]);

    const cerebras = montarTentativas({
      provider: 'cerebras',
      model: 'qwen/qwen3.8-27b',
      visao: true,
      fallback: false,
    });
    expect(cerebras).toEqual([]);
  });

  it('sem nenhuma chave → nenhuma tentativa', () => {
    expect(montarTentativas({ provider: 'groq' })).toEqual([]);
  });
});

describe('POST /api/ai com fallback', () => {
  const req = (body) => new Request('http://x/api/ai', { method: 'POST', body: JSON.stringify(body) });

  it('se o escolhido falha (429), responde com o próximo e sinaliza nos headers', async () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.OPENROUTER_API_KEY = 'o';
    const urls = [];
    vi.stubGlobal('fetch', async (url) => {
      urls.push(url);
      return url.includes('groq')
        ? new Response('limite', { status: 429 })
        : new Response('data: [DONE]\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    });
    const res = await POST(req({ provider: 'groq', model: 'openai/gpt-oss-120b', prompt: 'oi' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-PMRV-Provider')).toBe('openrouter');
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

  it('com imagens: envia image_url; sem modelo de visão → 422; imagem inválida → 400', async () => {
    process.env.COHERE_API_KEY = 'h';
    let corpo;
    vi.stubGlobal('fetch', async (_url, init) => {
      corpo = JSON.parse(init.body);
      return new Response('data: [DONE]\n\n', { status: 200 });
    });
    const img = 'data:image/jpeg;base64,AAAA';
    const res = await POST(req({ provider: 'cohere', prompt: 'danos', images: [img] }));
    expect(res.status).toBe(200);
    expect(corpo.messages.at(-1).content).toEqual([
      { type: 'text', text: 'danos' },
      { type: 'image_url', image_url: { url: img } },
    ]);
    delete process.env.COHERE_API_KEY;
    process.env.CEREBRAS_API_KEY = 'c';
    expect((await POST(req({ provider: 'cerebras', prompt: 'danos', images: [img] }))).status).toBe(422);
    expect((await POST(req({ provider: 'cerebras', prompt: 'danos', images: ['http://x/a.jpg'] }))).status).toBe(400);
  });

  it('erro de rede conta como falha e passa ao próximo', async () => {
    process.env.GROQ_API_KEY = 'g';
    process.env.CEREBRAS_API_KEY = 'c';
    vi.stubGlobal('fetch', async (url) => {
      if (url.includes('groq')) throw new Error('ECONNRESET');
      return new Response('data: [DONE]\n\n', { status: 200 });
    });
    const res = await POST(req({ provider: 'groq', prompt: 'oi' }));
    expect(res.headers.get('X-PMRV-Provider')).toBe('cerebras');
  });
});

describe('validarImagens / conteudoUsuario', () => {
  it('aceita só data URLs de imagem, dentro do limite', () => {
    const ok = 'data:image/png;base64,iVBOR=';
    expect(validarImagens(undefined)).toBeNull();
    expect(validarImagens([ok])).toEqual([ok]);
    expect(validarImagens([])).toBe(false);
    expect(validarImagens(['data:text/html;base64,AAAA'])).toBe(false);
    expect(validarImagens(Array(MAX_IMAGENS + 1).fill(ok))).toBe(false);
  });

  it('texto puro sem imagens', () => {
    expect(conteudoUsuario('oi', null)).toBe('oi');
  });
});

describe('POST /api/ai devolve o motivo das falhas', () => {
  const req = (body) => new Request('http://x/api/ai', { method: 'POST', body: JSON.stringify(body) });
  it('inclui provedor, modelo, status e a mensagem do provedor', async () => {
    process.env.GROQ_API_KEY = 'g';
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify({ error: { message: 'The model `x` does not exist' } }), { status: 404 })
    );
    const res = await POST(req({ provider: 'groq', prompt: 'danos', images: ['data:image/jpeg;base64,AAAA'] }));
    expect(res.status).toBe(404);
    const corpo = await res.json();
    expect(corpo.falhas[0]).toMatchObject({ provedor: 'Groq', status: 404, motivo: 'The model `x` does not exist' });
  });
});
