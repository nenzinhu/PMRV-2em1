'use client';

import { useEffect, useRef, useState } from 'react';
import { callGroq, capitalizarFrase, cleanIAResponse, obterChaveIA } from '@/lib/pmrv';
import { showToast } from '@/components/Toast';
import EstiloPicker from '@/components/EstiloPicker';
import AjusteFino from '@/components/AjusteFino';
import { aplicarAjusteFino, carregarAjusteFino } from '@/lib/ajuste-fino';
import {
  DINAMICA_PRESUMIDA_KEY,
  aplicarRespostaDinamica,
  buildDinamicaPrompt,
  envolvidosAtivos,
  estadoInicialDinamica,
  normalizarEstadoDinamica,
  novoEnvolvidoDinamica,
} from '@/lib/dinamica-presumida';

// Identificações sugeridas a partir da aba Envolvidos (nome · placa · modelo).
function sugestoesEnvolvidos() {
  try {
    const obj = JSON.parse(localStorage.getItem('PMRV_ENVOLVIDOS') || 'null');
    const lista = Array.isArray(obj?.lista) ? obj.lista : [];
    return lista
      .map((e) => [e.nome, e.placa, e.modelo].filter((x) => typeof x === 'string' && x.trim()).join(' · '))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default function DinamicaPresumida() {
  const [estado, setEstado] = useState(estadoInicialDinamica);
  const [gerando, setGerando] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const carregado = useRef(false);

  useEffect(() => {
    try {
      setEstado(normalizarEstadoDinamica(JSON.parse(localStorage.getItem(DINAMICA_PRESUMIDA_KEY) || 'null')));
    } catch {
      setEstado(estadoInicialDinamica());
    }
    setSugestoes(sugestoesEnvolvidos());
    carregado.current = true;
  }, []);

  useEffect(() => {
    if (!carregado.current) return;
    try {
      localStorage.setItem(DINAMICA_PRESUMIDA_KEY, JSON.stringify(estado));
    } catch {
      /* armazenamento indisponível */
    }
  }, [estado]);

  const alterar = (patch) => setEstado((s) => ({ ...s, ...patch }));

  function alterarEnvolvido(id, patch) {
    setEstado((s) => ({ ...s, envolvidos: s.envolvidos.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  function adicionarEnvolvido() {
    setEstado((s) => {
      const id = Math.max(0, ...s.envolvidos.map((e) => e.id)) + 1;
      return { ...s, envolvidos: [...s.envolvidos, novoEnvolvidoDinamica(id)] };
    });
  }

  function removerEnvolvido(id) {
    const env = estado.envolvidos.find((e) => e.id === id);
    if (env?.relato.trim() && !window.confirm('Remover este envolvido e o relato dele?')) return;
    setEstado((s) => ({ ...s, envolvidos: s.envolvidos.filter((e) => e.id !== id) }));
  }

  function alternarApenasUm(apenasUm) {
    setEstado((s) => {
      // Garante ao menos 2 envolvidos ao desmarcar "apenas 1".
      const envolvidos =
        !apenasUm && s.envolvidos.length < 2 ? [...s.envolvidos, novoEnvolvidoDinamica(Math.max(0, ...s.envolvidos.map((e) => e.id)) + 1)] : s.envolvidos;
      return { ...s, apenasUm, envolvidos };
    });
  }

  async function gerar() {
    if (!estado.envolvidos[0]?.relato.trim()) {
      alert('Digite o relato do envolvido 1 antes de gerar.');
      document.getElementById(`dp-relato-${estado.envolvidos[0]?.id}`)?.focus();
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('Sem conexão com a internet.\n\nA geração por IA precisa de internet.');
      return;
    }

    const ajuste = carregarAjusteFino();
    setGerando(true);
    try {
      const res = await callGroq({
        apiKey: obterChaveIA(),
        prompt: aplicarAjusteFino(buildDinamicaPrompt(estado), ajuste),
        temperature: ajuste.temperatura,
        maxTokens: 3000,
      });
      if (res.error === 'auth') {
        if (window.confirm('Chave da API inválida ou sem permissão.\n\nDeseja informar outra chave agora?')) obterChaveIA(true);
      } else if (res.error === 'quota') {
        alert('Cota da API excedida no momento.\n\nAguarde alguns minutos ou troque o modelo no botão 🤖.');
      } else if (res.error === 'nokey') {
        alert('Este provedor de IA não tem chave configurada.\n\nEscolha outro no botão 🤖 do topo.');
      } else if (res.text) {
        setEstado((s) => aplicarRespostaDinamica(s, cleanIAResponse(res.text)));
        showToast('Dinâmica gerada', 'success', 1800);
      }
    } catch (err) {
      console.error('Erro ao gerar dinâmica presumida:', err);
      alert('Não foi possível gerar a dinâmica.\n\nTente novamente ou troque o modelo no botão 🤖.');
    } finally {
      setGerando(false);
    }
  }

  function transferirParaRelato() {
    const texto = estado.dinamica.trim();
    if (!texto) return;
    window.dispatchEvent(new CustomEvent('set-dinamica', { detail: texto }));
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'relato' }));
    showToast('Dinâmica transferida para o Relato Policial', 'success', 2000);
  }

  function limpar() {
    if (!window.confirm('Limpar os relatos e a dinâmica desta aba?')) return;
    setEstado((s) => ({ ...estadoInicialDinamica(), estilo: s.estilo }));
  }

  const ativos = envolvidosAtivos(estado);

  return (
    <div className="max-w-xl mx-auto p-3 sm:p-4 space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h2 className="text-base sm:text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">Relato e Dinâmica</h2>
        <button type="button" onClick={limpar} className="btn-outline text-xs active:scale-95">
          🧹 Limpar
        </button>
      </div>

      <p className="estilo-glass text-[13px] leading-relaxed text-charcoal/80 font-mono p-3">
        Digite o relato do <b>envolvido 1</b>. A IA presume o relato dos demais (deixe em branco) e a
        <b> dinâmica do ocorrido</b>. Depois toque <b>Transferir para o Relato Policial</b>.
      </p>

      <div className="ds-card">
        <label className="flex items-center gap-2 font-mono text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={estado.apenasUm}
            onChange={(e) => alternarApenasUm(e.target.checked)}
            className="h-5 w-5 accent-pmrv"
          />
          Apenas 1 envolvido <span className="text-charcoal/60 text-xs">(saída de pista, capotamento…)</span>
        </label>
        <EstiloPicker value={estado.estilo} onChange={(estilo) => alterar({ estilo })} />
      </div>

      <datalist id="dp-sugestoes">
        {sugestoes.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {ativos.map((env, i) => (
        <section key={env.id} className="ds-card" aria-labelledby={`dp-titulo-${env.id}`}>
          <div className="flex justify-between items-center gap-2 border-b-2 border-charcoal pb-2">
            <h3 id={`dp-titulo-${env.id}`} className="font-mono font-semibold uppercase tracking-tight text-pmrv text-sm">
              Envolvido {i + 1}
              {env.presumido && (
                <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] text-charcoal normal-case">✨ presumido pela IA</span>
              )}
            </h3>
            {i >= 2 && (
              <button type="button" onClick={() => removerEnvolvido(env.id)} className="btn-outline text-[10px] active:scale-95">
                Remover
              </button>
            )}
          </div>
          <div>
            <label htmlFor={`dp-ident-${env.id}`} className="ds-label">Identificação (opcional)</label>
            <input
              id={`dp-ident-${env.id}`}
              list="dp-sugestoes"
              value={env.identificacao}
              onChange={(e) => alterarEnvolvido(env.id, { identificacao: e.target.value })}
              placeholder="Ex.: condutor do VW Gol, placa ABC1D23"
              className="ds-input text-sm"
            />
          </div>
          <div>
            <label htmlFor={`dp-relato-${env.id}`} className="ds-label">
              {i === 0 ? 'Relato do envolvido 1 *' : 'Relato (em branco = a IA presume)'}
            </label>
            <textarea
              id={`dp-relato-${env.id}`}
              rows={4}
              value={env.relato}
              onChange={(e) => alterarEnvolvido(env.id, { relato: capitalizarFrase(e.target.value), presumido: false })}
              placeholder={i === 0 ? 'Ex.: Relata que transitava sentido norte quando o veículo à frente freou bruscamente…' : 'Deixe em branco para a IA presumir a versão deste envolvido.'}
              className="ds-input text-sm leading-relaxed"
            />
          </div>
        </section>
      ))}

      {!estado.apenasUm && (
        <button type="button" onClick={adicionarEnvolvido} className="btn-outline w-full text-xs active:scale-95">
          + Adicionar envolvido
        </button>
      )}

      <button
        type="button"
        onClick={gerar}
        disabled={gerando}
        aria-busy={gerando}
        className={`btn-ios w-full text-sm active:scale-95 disabled:opacity-60 ${gerando ? 'is-loading' : ''}`}
      >
        {gerando ? (
          <>
            <span className="btn-spinner" aria-hidden="true" /> Gerando…
          </>
        ) : estado.apenasUm ? (
          '✨ Gerar dinâmica presumida'
        ) : (
          '✨ Presumir relatos e gerar dinâmica'
        )}
      </button>

      {estado.dinamica && (
        <section className="ds-card" aria-labelledby="dp-dinamica-titulo">
          <h3 id="dp-dinamica-titulo" className="font-mono font-semibold uppercase tracking-tight text-pmrv text-sm border-b-2 border-charcoal pb-2">
            Dinâmica presumida
          </h3>
          <label htmlFor="dp-dinamica" className="sr-only">Dinâmica presumida (editável)</label>
          <textarea
            id="dp-dinamica"
            rows={6}
            value={estado.dinamica}
            onChange={(e) => alterar({ dinamica: capitalizarFrase(e.target.value) })}
            className="ds-input text-sm leading-relaxed"
          />
          <button type="button" onClick={transferirParaRelato} className="btn-ios w-full text-sm active:scale-95">
            📤 Transferir para o Relato Policial
          </button>
        </section>
      )}

      <AjusteFino />
    </div>
  );
}
