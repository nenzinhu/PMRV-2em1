'use client';

import { useId } from 'react';
import { ESTILOS_RELATO } from '@/lib/estilos-relato';

// Grupo de rádios (chips) para escolher o estilo de redação da IA.
export default function EstiloPicker({ value, onChange, legenda = 'Estilo do texto', disabled = false }) {
  const nome = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-gold mb-1">{legenda}</legend>
      <div className="flex flex-wrap gap-1.5">
        {ESTILOS_RELATO.map((e) => {
          const ativo = value === e.id;
          return (
            <label
              key={e.id}
              className={`cursor-pointer select-none rounded-full border-2 px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors focus-within:ring-2 focus-within:ring-gold ${
                ativo ? 'bg-pmrv text-white border-pmrv' : 'border-charcoal/40 text-charcoal/80 hover:border-pmrv'
              }`}
            >
              <input
                type="radio"
                name={nome}
                value={e.id}
                checked={ativo}
                onChange={() => onChange(e.id)}
                className="sr-only"
              />
              {e.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
