'use client';

import { useEffect, useRef, useState } from 'react';
import {
  capitalizarFrase,
  callGroq,
  obterChaveIA,
  cleanIAResponse,
  PMRV_AGENTE_PADRAO,
} from '@/lib/pmrv';

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';

const STORAGE_KEY = 'PMRV_RESUMO_DINAMICA';
const ENVOLVIDOS_KEY = 'PMRV_ENVOLVIDOS';

function loadResumo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return {
        relatos: Array.isArray(obj.relatos) ? obj.relatos : [],
        resumo: obj.resumo || '',
      };
    }
  } catch (e) {
    /* ignore */
  }
  return { relatos: [], resumo: '' };
}

function persistResumo(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadEnvolvidos() {
  try {
    const raw = localStorage.getItem(ENVOLVIDOS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return Array.isArray(obj.lista) ? obj.lista : [];
    }
  } catch (e) {
    /* ignore */
  }
  return [];
}

export default function ResumoDinamica() {
  const [relatos, setRelatos] = useState([]);
  const [resumo, setResumo] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);
  const [statusIA, setStatusIA] = useState('');
  const init = useRef(false);
  const [hasImported, setHasImported] = useState(false);

  useEffect(() => {
    const s = loadResumo();
    setRelatos(s.relatos);
    setResumo(s.resumo);
    init.current = true;
  }, []);

  function save(nextRelatos, nextResumo) {
    const state = {
      relatos: Array.isArray(nextRelatos) ? nextRelatos : relatos,
      resumo: typeof nextResumo === 'string' ? nextResumo : resumo,
    };
    setRelatos(state.relatos);
    setResumo(state.resumo);
    if (init.current) persistResumo(state);
  }

  function adicionarRelato() {
    const novo = { id: Date.now(), texto: '' };
    save([...relatos, novo]);
  }

  function atualizarRelato(id, texto) {
    const lista = relatos.map((r) => (r.id === id ? { ...r, texto: capitalizarFrase(texto || '') } : r));
    save(lista);
  }

  function removerRelato(id) {
    if (!window.confirm('Remover este relato individual?')) return;
    save(relatos.filter((r) => r.id !== id));
  }

  function importarRelatosEnvolvidos() {
    const envolvidos = loadEnvolvidos();
    const individuais = envolvidos
      .filter((ev) => ev.relato && ev.relato.trim())
      .map((ev) => ({
        id: Date.now() + Math.random(),
        texto: ev.relato.trim(),
        envolvidoId: ev.id,
        envolvidoNome: ev.nome && ev.nome.trim() ? ev.nome.trim() : `Envolvido #${ev.id}`,
      }));

    if (individuais.length === 0) {
      alert('Nenhum relato individual encontrado nos envolvidos.');
      return;
    }

    const merged = [...relatos];
    individuais.forEach((novo) => {
      const exists = merged.some((r) => r.envolvidoId === novo.envolvidoId);
      if (!exists) merged.push(novo);
    });

    save(merged, resumo);
    setHasImported(true);
    setTimeout(() => setHasImported(false), 3000);
  }

  async function gerarResumo() {
    const base = relatos
      .map((r, idx) => {
        const cabecalho = r.envolvidoNome ? `${r.envolvidoNome}: ` : '';
        return `${cabecalho}${r.texto}`;
      })
      .join('\n\n');

    if (!base.trim()) {
      alert('Adicione pelo menos um relato individual.');
      return;
    }

    setLoadingIA(true);
    setStatusIA('Gerando resumo com IA...');

    try {
      const prompt =
        'Você é um redator de relatórios da Polícia Militar Rodoviária de Santa Catarina.\n\n' +
        'Abaixo há relatos individuais de um sinistro de trânsito. Monte um resumo unificado da dinâmica do ocorrido.\n\n' +
        'Regras:\n' +
        '- Responda APENAS com o texto do resumo.\n' +
        '- Um único parágrafo, em português do Brasil.\n' +
        '- Mantenha tom presuntivo ("presume-se").\n' +
        '- Não invente fatos além dos relatos fornecidos.\n' +
        '- Preserve detalhes importantes de posicionamento, trajetória, veículos e pontos de impacto.\n\n' +
        base;

      const res = await callGroq({ apiKey: GROQ_API_KEY, prompt, system: PMRV_AGENTE_PADRAO });

      if (res.error === 'auth') {
        alert('Chave da API inválida ou sem permissão.\n\nVerifique a configuração do sistema.');
        setStatusIA('');
      } else if (res.error === 'quota') {
        alert('Cota da API excedida no momento.\n\nAguarde alguns minutos e tente novamente.');
        setStatusIA('');
      } else if (res.text) {
        const texto = cleanIAResponse(res.text);
        save(relatos, texto);
        setStatusIA('Resumo gerado com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao gerar resumo:', err);
      alert('Não foi possível gerar o resumo.\n\nVerifique sua conexão e tente novamente.');
      setStatusIA('');
    } finally {
      setLoadingIA(false);
    }
  }

  async function melhorarResumo() {
    if (!resumo.trim()) {
      alert('Não há resumo para melhorar.');
      return;
    }

    setLoadingIA(true);
    setStatusIA('Melhorando resumo com IA...');

    try {
      const prompt =
        'Melhore o resumo abaixo de um sinistro de trânsito: corrija ortografia, acentuação, concordância e pontuação, mantenha os fatos e a norma culta do português do Brasil. Responda APENAS com o texto corrigido, sem comentários.\n\n' +
        resumo;

      const res = await callGroq({ apiKey: GROQ_API_KEY, prompt, system: PMRV_AGENTE_PADRAO });

      if (res.error === 'auth') {
        alert('Chave da API inválida ou sem permissão.\n\nVerifique a configuração do sistema.');
        setStatusIA('');
      } else if (res.error === 'quota') {
        alert('Cota da API excedida no momento.\n\nAguarde alguns minutos e tente novamente.');
        setStatusIA('');
      } else if (res.text) {
        const texto = cleanIAResponse(res.text);
        save(relatos, texto);
        setStatusIA('Resumo melhorado com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao melhorar resumo:', err);
      alert('Não foi possível melhorar o resumo.\n\nVerifique sua conexão e tente novamente.');
      setStatusIA('');
    } finally {
      setLoadingIA(false);
    }
  }

  function limparTudo() {
    if (!window.confirm('Limpar todos os relatos e o resumo?')) return;
    save([], '');
    setStatusIA('');
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">Resumo da Dinâmica</h2>
        <div className="flex gap-2">
          <button type="button" onClick={limparTudo} className="btn-outline text-xs">
            🧹 Limpar
          </button>
          <button type="button" onClick={adicionarRelato} className="btn-ios text-xs">
            + Adicionar Relato
          </button>
        </div>
      </div>

      <p className="estilo-glass text-xs text-charcoal/70 font-mono mb-4 p-3">
        Adicione relatos individuais e gere automaticamente um resumo unificado da dinâmica do ocorrido.
      </p>

      <div className="mb-3">
        <button
          type="button"
          onClick={importarRelatosEnvolvidos}
          className="btn-outline text-xs w-full"
        >
          📥 Importar relatos individuais dos envolvidos
        </button>
        {hasImported && (
          <p className="text-[10px] font-mono text-pmrv mt-1">Relatos importados com sucesso.</p>
        )}
      </div>

      <div className="space-y-4">
        {relatos.map((r, idx) => (
          <div key={r.id} className="ds-card">
            <div className="flex justify-between items-center border-b-2 border-charcoal pb-2">
              <h3 className="font-mono font-semibold uppercase tracking-tight text-pmrv">
                Relato #{idx + 1} {r.envolvidoNome ? `— ${r.envolvidoNome}` : ''}
              </h3>
              <button type="button" onClick={() => removerRelato(r.id)} className="btn-ios text-xs bg-brick !border-brick">
                Remover
              </button>
            </div>
            <textarea
              rows={4}
              value={r.texto}
              onChange={(e) => atualizarRelato(r.id, e.target.value)}
              className="w-full p-2 bg-bone border-2 border-charcoal focus:ring-2 focus:ring-gold outline-none text-sm leading-relaxed"
              placeholder="Descreva o que você viu ou aconteceu..."
            />
          </div>
        ))}
      </div>

      {relatos.length === 0 && (
        <div className="bg-white border-2 border-dashed border-charcoal p-8 text-center font-mono text-sm text-charcoal/60">
          Nenhum relato adicionado ainda.
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={gerarResumo}
          disabled={loadingIA || relatos.length === 0}
          className="btn-ios flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingIA && statusIA === 'Gerando resumo com IA...' ? 'Gerando...' : '🤖 Gerar Resumo'}
        </button>
        <button
          type="button"
          onClick={melhorarResumo}
          disabled={loadingIA || !resumo.trim()}
          className="btn-outline flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingIA && statusIA === 'Melhorando resumo com IA...' ? 'Melhorando...' : '✨ Melhorar Resumo'}
        </button>
      </div>

      {statusIA && !loadingIA && (
        <p className="mt-2 text-[10px] font-mono text-pmrv text-center">{statusIA}</p>
      )}

      {resumo && (
        <div className="mt-6 ds-card">
          <div className="border-b-2 border-charcoal pb-2 mb-3 flex justify-between items-center">
            <h3 className="font-mono font-semibold uppercase tracking-tight text-pmrv">Resumo Gerado</h3>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('PMRV_RESUMO_CLIPBOARD', resumo);
                  alert('Resumo copiado para a área de transferência do app.');
                }
              }}
              className="btn-outline text-[10px]"
            >
              📋 Usar no Relato Policial
            </button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{resumo}</p>
        </div>
      )}
    </div>
  );
}
