'use client';

import { useEffect, useRef, useState } from 'react';
import { callGroq, capitalizarFrase, cleanIAResponse, obterChaveIA } from '@/lib/pmrv';
import { showToast } from '@/components/Toast';
import MentionInput from '@/components/MentionInput';
import { consultarPlaca, normalizarPlaca, placaConsultavel } from '@/lib/placa';
import { RELATO_DRAFT_KEY, parseRelatoDraft } from '@/lib/relato-draft';
import { rodoviaLabel } from '@/lib/rodovias-list';
import EstiloPicker from '@/components/EstiloPicker';
import AjusteFino from '@/components/AjusteFino';
import { aplicarAjusteFino, carregarAjusteFino } from '@/lib/ajuste-fino';
import {
  DINAMICA_PRESUMIDA_KEY,
  apresentacaoEnvolvido,
  aplicarRespostaDinamica,
  buildDinamicaPrompt,
  envolvidosAtivos,
  estadoInicialDinamica,
  normalizarEstadoDinamica,
  novoEnvolvidoDinamica,
} from '@/lib/dinamica-presumida';

// Envolvidos já cadastrados na aba Envolvidos (para importar nome/placa/veículo).
function envolvidosCadastrados() {
  try {
    const obj = JSON.parse(localStorage.getItem('PMRV_ENVOLVIDOS') || 'null');
    const lista = Array.isArray(obj?.lista) ? obj.lista : [];
    const txt = (v) => (typeof v === 'string' ? v : '');
    return lista
      .map((e) => ({ nome: txt(e.nome), placa: txt(e.placa), modelo: txt(e.modelo), cor: txt(e.cor) }))
      .filter((e) => e.nome.trim() || e.placa.trim());
  } catch {
    return [];
  }
}

// Local da ocorrência: GPS (se ligado e na rodovia) ou o preenchido no Relato Policial.
function localOcorrencia(gpsInfo) {
  if (gpsInfo?.rodovia && !gpsInfo.foraDaRodovia && gpsInfo.km != null) {
    return {
      rodovia: rodoviaLabel(gpsInfo.rodovia) || gpsInfo.rodovia,
      km: String(Math.round(gpsInfo.km * 1000) / 1000).replace('.', ','),
    };
  }
  try {
    const form = parseRelatoDraft(localStorage.getItem(RELATO_DRAFT_KEY))?.form;
    // Rodovia do rascunho só conta com km preenchido (a rodovia tem valor padrão).
    if (form?.rodovia && typeof form.km === 'string' && form.km.trim()) {
      return { rodovia: rodoviaLabel(form.rodovia) || form.rodovia, km: form.km.trim() };
    }
  } catch {
    /* rascunho inválido */
  }
  return null;
}

function itensLocal(local) {
  if (!local) return [];
  const itens = [{ type: 'gps', id: 'rodovia', label: local.rodovia, sublabel: 'Rodovia', insert: local.rodovia }];
  if (local.km) {
    itens.push(
      { type: 'gps', id: 'km', label: `km ${local.km}`, sublabel: 'Quilômetro', insert: `km ${local.km}` },
      { type: 'gps', id: 'rodovia-km', label: `${local.rodovia}, km ${local.km}`, sublabel: 'Rodovia e km', insert: `${local.rodovia}, km ${local.km}` }
    );
  }
  return itens;
}

export default function DinamicaPresumida({ gpsInfo = null }) {
  const [estado, setEstado] = useState(estadoInicialDinamica);
  const [gerando, setGerando] = useState(false);
  const [cadastrados, setCadastrados] = useState([]);
  const [local, setLocal] = useState(null);
  const [placaStatus, setPlacaStatus] = useState({});
  const carregado = useRef(false);

  useEffect(() => {
    try {
      setEstado(normalizarEstadoDinamica(JSON.parse(localStorage.getItem(DINAMICA_PRESUMIDA_KEY) || 'null')));
    } catch {
      setEstado(estadoInicialDinamica());
    }
    setCadastrados(envolvidosCadastrados());
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

  useEffect(() => {
    setLocal(localOcorrencia(gpsInfo));
  }, [gpsInfo]);

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

  function importarCadastrado(id, indice) {
    const c = cadastrados[Number(indice)];
    if (c) alterarEnvolvido(id, { nome: c.nome, placa: normalizarPlaca(c.placa), modelo: c.modelo, cor: c.cor });
  }

  async function buscarPlaca(env) {
    setPlacaStatus((st) => ({ ...st, [env.id]: { carregando: true } }));
    try {
      const { modelo, cor } = await consultarPlaca(env.placa);
      alterarEnvolvido(env.id, { ...(modelo && { modelo }), ...(cor && { cor }) });
      setPlacaStatus((st) => ({ ...st, [env.id]: {} }));
    } catch (err) {
      setPlacaStatus((st) => ({ ...st, [env.id]: { erro: err.message } }));
    }
  }

  // Coloca a frase "O condutor ... deslocava com seu veículo ..." no início do relato.
  function inserirApresentacao(env) {
    const frase = apresentacaoEnvolvido(env, local);
    if (!frase) return;
    const resto = env.relato.trim();
    alterarEnvolvido(env.id, {
      relato: capitalizarFrase(`${frase}${resto ? `, ${resto.charAt(0).toLowerCase()}${resto.slice(1)}` : ', '}`),
      presumido: false,
    });
    document.getElementById(`dp-relato-${env.id}`)?.focus();
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
        prompt: aplicarAjusteFino(buildDinamicaPrompt(estado, local), ajuste),
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
        Preencha o condutor e a placa (🔍 busca modelo e cor) e digite o relato do <b>envolvido 1</b> — use
        <b> @</b> para inserir nome, veículo, rodovia e km. A IA presume o relato dos demais (deixe em branco) e a
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
          {cadastrados.length > 0 && (
            <div>
              <label htmlFor={`dp-import-${env.id}`} className="ds-label">Importar da aba Envolvidos</label>
              <select
                id={`dp-import-${env.id}`}
                value=""
                onChange={(e) => importarCadastrado(env.id, e.target.value)}
                className="ds-input text-sm"
              >
                <option value="">Escolher envolvido cadastrado…</option>
                {cadastrados.map((c, k) => (
                  <option key={k} value={k}>
                    {[c.nome, c.placa.toUpperCase(), c.modelo].filter((x) => x.trim()).join(' · ')}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor={`dp-nome-${env.id}`} className="ds-label">Nome do condutor</label>
              <input
                id={`dp-nome-${env.id}`}
                value={env.nome}
                onChange={(e) => alterarEnvolvido(env.id, { nome: e.target.value })}
                placeholder="Ex.: João da Silva"
                autoComplete="off"
                className="ds-input text-sm"
              />
            </div>
            <div>
              <label htmlFor={`dp-placa-${env.id}`} className="ds-label">Placa</label>
              <div className="flex gap-2">
                <input
                  id={`dp-placa-${env.id}`}
                  value={env.placa}
                  onChange={(e) => alterarEnvolvido(env.id, { placa: normalizarPlaca(e.target.value) })}
                  onKeyDown={(e) => e.key === 'Enter' && placaConsultavel(env.placa) && buscarPlaca(env)}
                  placeholder="ABC1D23"
                  autoComplete="off"
                  className="ds-input text-sm uppercase flex-1 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => buscarPlaca(env)}
                  disabled={!placaConsultavel(env.placa) || placaStatus[env.id]?.carregando}
                  aria-busy={!!placaStatus[env.id]?.carregando}
                  className="btn-outline text-xs px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar modelo e cor pela placa"
                  aria-label="Buscar modelo e cor pela placa"
                >
                  {placaStatus[env.id]?.carregando ? <span className="btn-spinner" aria-hidden="true" /> : '🔍'}
                </button>
              </div>
              {placaStatus[env.id]?.erro && (
                <p role="alert" className="text-[11px] font-mono text-brick mt-1">{placaStatus[env.id].erro}</p>
              )}
            </div>
            <div>
              <label htmlFor={`dp-cor-${env.id}`} className="ds-label">Cor</label>
              <input
                id={`dp-cor-${env.id}`}
                value={env.cor}
                onChange={(e) => alterarEnvolvido(env.id, { cor: e.target.value })}
                placeholder="Ex.: prata"
                autoComplete="off"
                className="ds-input text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`dp-modelo-${env.id}`} className="ds-label">Marca / modelo</label>
              <input
                id={`dp-modelo-${env.id}`}
                value={env.modelo}
                onChange={(e) => alterarEnvolvido(env.id, { modelo: e.target.value })}
                placeholder={placaStatus[env.id]?.carregando ? 'Buscando…' : 'Ex.: VW Gol'}
                autoComplete="off"
                className="ds-input text-sm"
              />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
              <label htmlFor={`dp-relato-${env.id}`} className="ds-label mb-0">
                {i === 0 ? 'Relato do envolvido 1 *' : 'Relato (em branco = a IA presume)'}
              </label>
              {apresentacaoEnvolvido(env) && (
                <button type="button" onClick={() => inserirApresentacao(env)} className="btn-outline text-[10px] active:scale-95">
                  📝 Inserir dados no relato
                </button>
              )}
            </div>
            <MentionInput
              id={`dp-relato-${env.id}`}
              rows={4}
              value={env.relato}
              onChange={(texto) => alterarEnvolvido(env.id, { relato: capitalizarFrase(texto), presumido: false })}
              envolvidos={estado.envolvidos}
              extras={itensLocal(local)}
              placeholder={
                i === 0
                  ? 'Ex.: O condutor @João deslocava com seu veículo… (use @ para nome, veículo, rodovia e km)'
                  : 'Deixe em branco para a IA presumir. Use @ para nome, veículo, rodovia e km.'
              }
              className="ds-input text-sm leading-relaxed"
            />
            {local && (
              <p className="mt-1 text-[11px] font-mono text-charcoal/60">
                📍 Local: {local.rodovia}{local.km ? `, km ${local.km}` : ''} — disponível no @
              </p>
            )}
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
