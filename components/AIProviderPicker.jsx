'use client';

import { useEffect, useState } from 'react';
import {
  PMRV_AI_PROVIDERS,
  obterProvedorIA,
  definirProvedorIA,
  obterModeloIA,
  definirModeloIA,
} from '@/lib/pmrv';
import { PMRV_MODELOS_FALLBACK, PMRV_MODELO_PADRAO, PMRV_PROVEDOR_PADRAO } from '@/lib/ai-models';
import { showToast } from '@/components/Toast';

const SEP = '|';

// Chip de header "🤖 Provedor · Modelo". Um <select> nativo invisível cobre o
// chip: ao tocar, abre a lista de TODOS os modelos gratuitos agrupados por
// provedor (optgroup). Listas ao vivo via /api/ai/models, com fallback fixo.
// Provedor e modelo (por provedor) persistem em localStorage.
export default function AIProviderPicker() {
  const [provedor, setProvedor] = useState(PMRV_PROVEDOR_PADRAO);
  const [modelo, setModelo] = useState(PMRV_MODELO_PADRAO[PMRV_PROVEDOR_PADRAO]);
  const [listas, setListas] = useState(PMRV_MODELOS_FALLBACK);
  const [configurados, setConfigurados] = useState(null);

  useEffect(() => {
    const atual = obterProvedorIA();
    setProvedor(atual);
    setModelo(obterModeloIA(atual));

    const ctrl = new AbortController();
    const json = (url) =>
      fetch(url, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    json('/api/ai/models').then((d) => d?.providers && setConfigurados(d.providers));
    PMRV_AI_PROVIDERS.forEach(({ id }) => {
      json(`/api/ai/models?provider=${id}`).then((d) => {
        if (Array.isArray(d?.models) && d.models.length) setListas((l) => ({ ...l, [id]: d.models }));
      });
    });
    // Avisa quando o servidor precisou usar um provedor/modelo de reserva.
    function onFallback(e) {
      const p = PMRV_AI_PROVIDERS.find((x) => x.id === e.detail?.provider);
      showToast(`IA indisponível — respondeu ${p?.label || e.detail?.provider} · ${e.detail?.model}`, 'warning', 3500);
    }
    window.addEventListener('pmrv-ai-fallback', onFallback);
    return () => {
      ctrl.abort();
      window.removeEventListener('pmrv-ai-fallback', onFallback);
    };
  }, []);

  function onChange(e) {
    const [prov, ...resto] = e.target.value.split(SEP);
    const mod = resto.join(SEP);
    setProvedor(definirProvedorIA(prov));
    setModelo(mod);
    definirModeloIA(prov, mod);
  }

  // Garante que o modelo salvo apareça mesmo se saiu da lista atual.
  function modelosDe(id) {
    const lista = listas[id] || [];
    const salvo = id === provedor ? modelo : null;
    return salvo && !lista.some((m) => m.id === salvo) ? [{ id: salvo, label: salvo }, ...lista] : lista;
  }

  const provAtual = PMRV_AI_PROVIDERS.find((p) => p.id === provedor) || PMRV_AI_PROVIDERS[0];
  const modeloAtual = modelosDe(provedor).find((m) => m.id === modelo);
  const semChave = configurados && !configurados[provedor];

  return (
    <label
      className="header-chip relative max-w-[42vw] sm:max-w-[18rem] cursor-pointer focus-within:ring-2 focus-within:ring-white/80"
      title={`IA: ${provAtual.label} · ${modeloAtual?.label || modelo}${semChave ? ' (sem chave no servidor)' : ''}`}
    >
      <span aria-hidden="true">🤖</span>
      <span className="truncate" aria-hidden="true">
        <span className="hidden sm:inline">{provAtual.label} · </span>
        <span className="normal-case">{modeloAtual?.label || modelo}</span>
      </span>
      {semChave && (
        <span aria-hidden="true" title="Sem chave no servidor">
          ⚠️
        </span>
      )}
      <span aria-hidden="true">▾</span>
      <select
        value={`${provedor}${SEP}${modelo}`}
        onChange={onChange}
        aria-label="Provedor e modelo de IA gratuito"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {PMRV_AI_PROVIDERS.map((p) => (
          <optgroup
            key={p.id}
            label={`${p.label}${configurados && !configurados[p.id] ? ' — sem chave' : ''} · ${p.hint}`}
          >
            {modelosDe(p.id).map((m) => (
              <option key={m.id} value={`${p.id}${SEP}${m.id}`}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
