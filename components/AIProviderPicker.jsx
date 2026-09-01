'use client';

import { useEffect, useState } from 'react';
import { PMRV_AI_PROVIDERS, obterProvedorIA, definirProvedorIA } from '@/lib/pmrv';

// Select compacto de provedor de IA (Groq | OpenRouter) estilizado como chip de
// header. O usuário vê o provedor atual e toca para trocar (picker nativo no
// mobile). A escolha persiste em localStorage (PMRV_AI_PROVIDER).
export default function AIProviderPicker({ compact = false }) {
  const [provedor, setProvedor] = useState('groq');

  useEffect(() => {
    setProvedor(obterProvedorIA());
  }, []);

  const atual = PMRV_AI_PROVIDERS.find((p) => p.id === provedor) || PMRV_AI_PROVIDERS[0];

  function onChange(e) {
    const valor = e.target.value;
    setProvedor(valor);
    definirProvedorIA(valor);
  }

  return (
    <label
      className={`inline-flex items-center gap-1 ${compact ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'}`}
      title="Provedor do modelo de IA"
    >
      <span className="sr-only">Provedor do modelo de IA</span>
      <span aria-hidden="true">🤖</span>
      <select
        value={provedor}
        onChange={onChange}
        aria-label="Provedor do modelo de IA"
        className="cursor-pointer appearance-none bg-transparent font-mono font-semibold uppercase tracking-wide focus:outline-none [&>option]:text-charcoal"
      >
        {PMRV_AI_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true">▾</span>
    </label>
  );
}
