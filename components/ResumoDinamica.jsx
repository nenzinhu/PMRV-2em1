'use client';

import { useEffect, useRef, useState } from 'react';
import {
  capitalizarFrase,
  callGroq,
  cleanIAResponse,
  PMRV_AGENTE_PADRAO,
} from '@/lib/pmrv';
import { showToast } from '@/components/Toast';
import { loadResumoState, persistResumoState } from '@/lib/resumo-relatos';
import { buildResumoPrompt, estiloResumoValido, relatosParaBase } from '@/lib/resumo-prompt';

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';

const ESTILO_BOTOES = [
  { id: 'tecnico', label: 'Técnico' },
  { id: 'policial', label: 'Policial' },
  { id: 'leigo', label: 'Leigo' },
];

const ESTILO_TITULO = {
  tecnico: 'Técnico (perícia / judicial)',
  policial: 'Policial (neutro + CTB)',
  leigo: 'Leigo',
};

export default function ResumoDinamica() {
  const [relatos, setRelatos] = useState([]);
  const [resumo, setResumo] = useState('');
  const [resumos, setResumos] = useState({ tecnico: '', policial: '', leigo: '' });
  const [estiloResumo, setEstiloResumo] = useState('policial');
  const [loadingIA, setLoadingIA] = useState(null);
  const [statusIA, setStatusIA] = useState('');
  const init = useRef(false);
  const [transferindoId, setTransferindoId] = useState(null);

  useEffect(() => {
    function reload() {
      const s = loadResumoState();
      setRelatos(s.relatos);
      setResumo(s.resumo);
      setResumos(s.resumos || { tecnico: '', policial: '', leigo: '' });
      setEstiloResumo(estiloResumoValido(s.estiloResumo));
    }
    reload();
    init.current = true;
    window.addEventListener('pmrv-resumo-changed', reload);
    return () => window.removeEventListener('pmrv-resumo-changed', reload);
  }, []);

  function transferirParaRelatoPolicial(id) {
    const relato = relatos.find((r) => r.id === id);
    if (!relato) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'relato' }));
      window.dispatchEvent(new CustomEvent('set-dinamica', { detail: relato.texto }));
    }
    setTransferindoId(id);
    setTimeout(() => setTransferindoId(null), 2000);
  }

  function save(patch) {
    const state = {
      relatos: patch.relatos != null ? patch.relatos : relatos,
      resumo: patch.resumo != null ? patch.resumo : resumo,
      resumos: patch.resumos != null ? patch.resumos : resumos,
      estiloResumo: patch.estiloResumo != null ? patch.estiloResumo : estiloResumo,
    };
    setRelatos(state.relatos);
    setResumo(state.resumo);
    setResumos(state.resumos);
    setEstiloResumo(state.estiloResumo);
    if (init.current) persistResumoState(state);
  }

  function adicionarRelato() {
    const novo = { id: Date.now(), texto: '' };
    save({ relatos: [...relatos, novo] });
  }

  function atualizarRelato(id, texto) {
    const lista = relatos.map((r) => (r.id === id ? { ...r, texto: capitalizarFrase(texto || '') } : r));
    save({ relatos: lista });
  }

  function removerRelato(id) {
    if (!window.confirm('Remover este relato individual?')) return;
    save({ relatos: relatos.filter((r) => r.id !== id) });
  }

  function mostrarEstilo(estilo) {
    const modo = estiloResumoValido(estilo);
    const texto = resumos[modo] || '';
    save({ estiloResumo: modo, resumo: texto });
  }

  async function gerarResumo(estilo) {
    const modo = estiloResumoValido(estilo);
    const base = relatosParaBase(relatos);

    if (!base.trim()) {
      alert('Adicione pelo menos um relato individual.');
      return;
    }

    setLoadingIA(modo);
    setStatusIA(`Gerando resumo ${ESTILO_BOTOES.find((e) => e.id === modo)?.label || ''}...`);

    try {
      const prompt = buildResumoPrompt(relatos, modo);
      const res = await callGroq({ apiKey: GROQ_API_KEY, prompt, system: PMRV_AGENTE_PADRAO });

      if (res.error === 'auth') {
        alert('Chave da API inválida ou sem permissão.\n\nVerifique a configuração do sistema.');
        setStatusIA('');
      } else if (res.error === 'quota') {
        alert('Cota da API excedida no momento.\n\nAguarde alguns minutos e tente novamente.');
        setStatusIA('');
      } else if (res.text) {
        const texto = cleanIAResponse(res.text);
        const nextResumos = { ...resumos, [modo]: texto };
        save({
          resumo: texto,
          resumos: nextResumos,
          estiloResumo: modo,
        });
        setStatusIA('Resumo gerado com sucesso.');
        showToast(`Resumo ${ESTILO_BOTOES.find((e) => e.id === modo)?.label} gerado`, 'success', 2000);
      }
    } catch (err) {
      console.error('Erro ao gerar resumo:', err);
      alert('Não foi possível gerar o resumo.\n\nVerifique sua conexão e tente novamente.');
      setStatusIA('');
    } finally {
      setLoadingIA(null);
    }
  }

  async function melhorarResumo() {
    if (!resumo.trim()) {
      alert('Não há resumo para melhorar.');
      return;
    }

    const modo = estiloResumoValido(estiloResumo);
    setLoadingIA('melhorar');
    setStatusIA('Melhorando resumo com IA...');

    try {
      const prompt =
        'Melhore o resumo abaixo de um sinistro de trânsito: corrija ortografia, acentuação, concordância e pontuação, mantenha os fatos e a norma culta do português do Brasil. Não invente fatos. Responda APENAS com o texto corrigido, sem comentários.\n\n' +
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
        save({
          resumo: texto,
          resumos: { ...resumos, [modo]: texto },
        });
        setStatusIA('Resumo melhorado com sucesso.');
        showToast('Resumo melhorado com sucesso', 'success', 2000);
      }
    } catch (err) {
      console.error('Erro ao melhorar resumo:', err);
      alert('Não foi possível melhorar o resumo.\n\nVerifique sua conexão e tente novamente.');
      setStatusIA('');
    } finally {
      setLoadingIA(null);
    }
  }

  function limparTudo() {
    if (!window.confirm('Limpar todos os relatos e o resumo?')) return;
    save({
      relatos: [],
      resumo: '',
      resumos: { tecnico: '', policial: '', leigo: '' },
      estiloResumo: 'policial',
    });
    setStatusIA('');
    showToast('Tudo limpo', 'warning', 1500);
  }

  return (
    <div className="max-w-xl mx-auto p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-base sm:text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">Resumo da Dinâmica</h2>
        <div className="flex gap-2">
          <button type="button" onClick={limparTudo} className="btn-outline text-xs active:scale-95">
            🧹 Limpar
          </button>
          <button type="button" onClick={adicionarRelato} className="btn-ios text-xs active:scale-95">
            + Adicionar Relato
          </button>
        </div>
      </div>

      <p className="estilo-glass text-xs text-charcoal/70 font-mono mb-4 p-3">
        Os relatos individuais entram aqui ao tocar <b>Salvar relato</b> na aba Envolvidos. Depois escolha o tipo: <b>Técnico</b> (peritos e casos judiciais), <b>Policial</b> (neutro, normas e CTB) ou <b>Leigo</b> (linguagem simples).
      </p>

      <div className="space-y-4">
        {relatos.map((r, idx) => (
          <div key={r.id} className="ds-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-charcoal pb-2 gap-2">
              <h3 className="font-mono font-semibold uppercase tracking-tight text-pmrv text-sm sm:text-base">
                Relato #{idx + 1} {r.envolvidoNome ? `— ${r.envolvidoNome}` : ''}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => transferirParaRelatoPolicial(r.id)}
                  className="btn-outline text-xs active:scale-95"
                >
                  {transferindoId === r.id ? 'Transferido!' : '📤 Transferir p/ Relato Policial'}
                </button>
                <button type="button" onClick={() => removerRelato(r.id)} className="btn-ios text-xs bg-brick !border-brick active:scale-95">
                  Remover
                </button>
              </div>
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
        <div className="bg-white border-2 border-dashed border-charcoal p-6 sm:p-8 text-center font-mono text-xs sm:text-sm text-charcoal/60">
          <div className="text-3xl mb-2" aria-hidden="true">📋</div>
          Nenhum relato ainda. Salve o relato individual na aba Envolvidos.
        </div>
      )}

      <p className="mt-4 mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gold">
        Gerar resumo
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {ESTILO_BOTOES.map((estilo) => (
          <button
            key={estilo.id}
            type="button"
            onClick={() => gerarResumo(estilo.id)}
            disabled={loadingIA != null || relatos.length === 0}
            className={`btn-outline flex-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
              estiloResumo === estilo.id && resumo ? 'bg-pmrv/10 !border-pmrv text-pmrv' : ''
            }`}
          >
            {loadingIA === estilo.id ? 'Gerando…' : estilo.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={melhorarResumo}
        disabled={loadingIA != null || !resumo.trim()}
        className="btn-outline w-full mt-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        {loadingIA === 'melhorar' ? 'Melhorando...' : '✨ Melhorar Resumo'}
      </button>

      {statusIA && !loadingIA && (
        <p className="mt-2 text-[10px] font-mono text-pmrv text-center">{statusIA}</p>
      )}

      {(resumo || ESTILO_BOTOES.some((e) => resumos[e.id])) && (
        <div className="mt-6 ds-card">
          <div className="border-b-2 border-charcoal pb-2 mb-3 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="font-mono font-semibold uppercase tracking-tight text-pmrv text-sm sm:text-base">
                Resumo Gerado — {ESTILO_TITULO[estiloResumo] || 'Policial'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('PMRV_RESUMO_CLIPBOARD', resumo);
                    alert('Resumo copiado para a área de transferência do app.');
                  }
                }}
                disabled={!resumo.trim()}
                className="btn-outline text-[10px] active:scale-95 disabled:opacity-50"
              >
                📋 Usar no Relato Policial
              </button>
            </div>
            <div className="flex gap-1">
              {ESTILO_BOTOES.map((estilo) => (
                <button
                  key={`ver-${estilo.id}`}
                  type="button"
                  onClick={() => mostrarEstilo(estilo.id)}
                  disabled={!resumos[estilo.id]}
                  className={`flex-1 text-[10px] font-mono font-semibold uppercase tracking-wider py-1 rounded border ${
                    estiloResumo === estilo.id
                      ? 'bg-pmrv text-white border-pmrv'
                      : 'border-charcoal/30 text-charcoal/70 disabled:opacity-40'
                  }`}
                >
                  {estilo.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {resumo || 'Gere este tipo de resumo para visualizar o texto.'}
          </p>
        </div>
      )}
    </div>
  );
}
