import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../app/api/placa/route';

let tokenAnterior;

beforeEach(() => {
  tokenAnterior = process.env.PLACA_API_TOKEN;
  delete process.env.PLACA_API_TOKEN;
});

afterEach(() => {
  if (tokenAnterior === undefined) delete process.env.PLACA_API_TOKEN;
  else process.env.PLACA_API_TOKEN = tokenAnterior;
  vi.unstubAllGlobals();
});

describe('GET /api/placa', () => {
  it('usa o token somente no servidor e devolve apenas modelo e cor', async () => {
    process.env.PLACA_API_TOKEN = 'segredo-do-servidor';
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          MARCA: 'VW',
          MODELO: 'CROSSFOX',
          cor: ' Prata ',
          extra: { chassi: 'não deve chegar ao navegador' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const resposta = await GET(new Request('http://local/api/placa?placa=int-8c36&token=token-do-cliente'));

    expect(resposta.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://wdapi2.com.br/consulta/INT8C36/segredo-do-servidor',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
        signal: expect.anything(),
      })
    );
    await expect(resposta.json()).resolves.toEqual({ modelo: 'VW CROSSFOX', cor: 'Prata' });
  });

  it('não aceita token enviado pelo navegador', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resposta = await GET(new Request('http://local/api/placa?placa=INT8C36&token=token-do-cliente'));

    expect(resposta.status).toBe(500);
    await expect(resposta.json()).resolves.toEqual({
      error: 'Consulta de placa não configurada no servidor.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('transforma erro funcional HTTP 200 em resposta segura de erro', async () => {
    process.env.PLACA_API_TOKEN = 'segredo-do-servidor';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ message: 'diagnóstico interno do fornecedor' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const resposta = await GET(new Request('http://local/api/placa?placa=INT8C36'));

    expect(resposta.status).toBe(422);
    await expect(resposta.json()).resolves.toEqual({ error: 'A consulta de placa não foi concluída.' });
  });

  it('não registra nem devolve detalhes de uma falha que possam conter o token', async () => {
    process.env.PLACA_API_TOKEN = 'segredo-do-servidor';
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('falha em https://wdapi2.com.br/consulta/INT8C36/segredo-do-servidor');
      })
    );

    const resposta = await GET(new Request('http://local/api/placa?placa=INT8C36'));
    const logs = consoleErro.mock.calls.flat().map(String).join(' ');

    expect(resposta.status).toBe(502);
    await expect(resposta.json()).resolves.toEqual({ error: 'Serviço de consulta de placa indisponível.' });
    expect(logs).not.toContain('segredo-do-servidor');
  });

  it('usa marca, modelo e cor de extra quando os campos principais não existem', async () => {
    process.env.PLACA_API_TOKEN = 'segredo-do-servidor';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ extra: { marca: 'FIAT', modelo: 'ARGO', cor: 'Branco' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const resposta = await GET(new Request('http://local/api/placa?placa=ABC1D23'));

    expect(resposta.status).toBe(200);
    await expect(resposta.json()).resolves.toEqual({ modelo: 'FIAT ARGO', cor: 'Branco' });
  });

  it('não confunde uma marca que seja apenas prefixo do modelo', async () => {
    process.env.PLACA_API_TOKEN = 'segredo-do-servidor';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ MARCA: 'GM', MODELO: 'GMC 3500', cor: 'Preta' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const resposta = await GET(new Request('http://local/api/placa?placa=ABC1D23'));

    await expect(resposta.json()).resolves.toEqual({ modelo: 'GM GMC 3500', cor: 'Preta' });
  });

  it('remove a repetição do nome completo devolvido pelo serviço de placa', async () => {
    process.env.PLACA_API_TOKEN = 'segredo-do-servidor';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ MARCA: 'VW', MODELO: 'VW CROSSFOX VW CROSSFOX', cor: 'Prata' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const resposta = await GET(new Request('http://local/api/placa?placa=ABC1D23'));

    await expect(resposta.json()).resolves.toEqual({ modelo: 'VW CROSSFOX', cor: 'Prata' });
  });

  it('rejeita placa fora dos formatos brasileiro antigo e Mercosul', async () => {
    process.env.PLACA_API_TOKEN = 'segredo-do-servidor';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resposta = await GET(new Request('http://local/api/placa?placa=ABC123'));

    expect(resposta.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
