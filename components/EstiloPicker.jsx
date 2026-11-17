'use client';
import { useId } from 'react';
import { ESTILOS_RELATO, estiloRelatoValido } from '@/lib/estilos-relato';

export default function EstiloPicker({
  value,
  onChange,
  legenda = 'Como você quer o texto?',
  disabled = false,
}) {
  const nome = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="ds-label mb-2">{legenda}</legend>
      <div className="estilos-grid">
        {ESTILOS_RELATO.map((e) => (
          <label
            key={e.id}
            className={`estilo-option ${estiloRelatoValido(value) === e.id ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name={nome}
              value={e.id}
              checked={estiloRelatoValido(value) === e.id}
              onChange={() => onChange(e.id)}
            />
            <span>
              <strong>{e.label}</strong>
              <small>{e.descricao}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
