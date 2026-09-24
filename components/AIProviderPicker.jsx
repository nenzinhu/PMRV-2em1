'use client';

import { useEffect, useState } from 'react';
import {
  PMRV_AI_PROVIDERS,
  obterProvedorIA,
  definirProvedorIA,
  obterModeloIA,
  definirModeloIA,
} from '@/lib/pmrv';
import { PMRV_MODELOS_FALLBACK, PMRV_MODELO_PADRAO } from '@/lib/ai-models';

// Chip de header com dois selects: provedor de IA (todos com plano gratuito) e modelo
// gratuito daquele provedor. A lista de modelos vem de /api/ai/models (ao vivo,
// com fallback fixo). As escolhas persistem em localStorage.
export default function AIProviderPicker({ compact = false }) {
  const [provedor, setProvedor] = useState('groq');
  const [modelo, setModelo] = useState(PMRV_MODELO_PADRAO.groq);
  const [modelos, setModelos] = useState(PMRV_MODELOS_FALLBACK.groq);
  const [configurados, setConfigurados] = useState(null);

  useEffect(() => {
    setProvedor(obterProvedorIA());
    // Descobre quais provedores têm chave no servidor, para sinalizar os demais.
    fetch('/api/ai/models')
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => dados?.providers && setConfigurados(dados.providers))
      .catch(() => {
        /* sem sinalização */
      });
  }, []);

  useEffect(() => {
    const salvo = obterModeloIA(provedor);
    setModelo(salvo);
    setModelos(PMRV_MODELOS_FALLBACK[provedor]);

    const ctrl = new AbortController();
    fetch(`/api/ai/models?provider=${provedor}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => {
        if (Array.isArray(dados?.models) && dados.models.length) setModelos(dados.models);
      })
      .catch(() => {
        /* mantém o fallback */
      });
    return () => ctrl.abort();
  }, [provedor]);

  function onProvedor(e) {
    setProvedor(definirProvedorIA(e.target.value));
  }

  function onModelo(e) {
    setModelo(e.target.value);
    definirModeloIA(provedor, e.target.value);
  }

  // Garante que o modelo salvo apareça mesmo se saiu da lista atual.
  const opcoes = modelos.some((m) => m.id === modelo) ? modelos : [{ id: modelo, label: modelo }, ...modelos];
  const selectCls =
    'cursor-pointer appearance-none bg-transparent font-mono font-semibold tracking-wide focus:outline-none [&>option]:text-charcoal';

  return (
    <div
      className={`inline-flex items-center gap-1 ${compact ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'}`}
      title="Provedor e modelo de IA"
    >
      <span aria-hidden="true">🤖</span>
      <select value={provedor} onChange={onProvedor} aria-label="Provedor do modelo de IA" className={`${selectCls} uppercase`}>
        {PMRV_AI_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id} title={p.hint}>
            {configurados && !configurados[p.id] ? `${p.label} (sem chave)` : p.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true">/</span>
      <select
        value={modelo}
        onChange={onModelo}
        aria-label="Modelo de IA gratuito"
        className={`${selectCls} max-w-[22vw] sm:max-w-[12rem] truncate`}
      >
        {opcoes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true">▾</span>
    </div>
  );
}
