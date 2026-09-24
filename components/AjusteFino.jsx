'use client';

import { useEffect, useState } from 'react';
import { AJUSTE_FINO_PADRAO, TAMANHOS, carregarAjusteFino, salvarAjusteFino } from '@/lib/ajuste-fino';

// Painel recolhível de "ajuste fino" da geração de relatos. As preferências
// valem para todas as gerações por IA (Dinâmica, Resumo e Relato Policial).
export default function AjusteFino() {
  const [ajuste, setAjuste] = useState(AJUSTE_FINO_PADRAO);

  useEffect(() => {
    setAjuste(carregarAjusteFino());
  }, []);

  function alterar(patch) {
    setAjuste(salvarAjusteFino({ ...ajuste, ...patch }));
  }

  const personalizado =
    ajuste.instrucoes.trim() || ajuste.exemplo.trim() || ajuste.tamanho !== AJUSTE_FINO_PADRAO.tamanho ||
    ajuste.temperatura !== AJUSTE_FINO_PADRAO.temperatura;

  return (
    <details className="ds-card group">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono font-semibold uppercase tracking-tight text-pmrv text-sm">
        <span>⚙️ Ajuste fino da IA {personalizado && <span className="ml-1 text-[10px] text-gold">• personalizado</span>}</span>
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
      </summary>

      <p className="text-[12px] leading-relaxed text-charcoal/75 font-mono">
        Ensina a IA a escrever como você. Vale para todas as gerações de relato. Os planos gratuitos não permitem
        treinar o modelo, então o ajuste é feito por instruções e por um relato-modelo seu.
      </p>

      <div>
        <label htmlFor="af-temp" className="ds-label">
          Criatividade: {ajuste.temperatura.toFixed(1)}{' '}
          <span className="normal-case font-normal text-charcoal/60">
            ({ajuste.temperatura <= 0.3 ? 'fiel aos fatos' : ajuste.temperatura <= 0.6 ? 'equilibrado' : 'mais livre'})
          </span>
        </label>
        <input
          id="af-temp"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={ajuste.temperatura}
          onChange={(e) => alterar({ temperatura: Number(e.target.value) })}
          className="w-full accent-pmrv"
        />
      </div>

      <fieldset>
        <legend className="ds-label">Tamanho</legend>
        <div className="flex gap-2">
          {TAMANHOS.map((t) => (
            <label
              key={t.id}
              className={`flex-1 cursor-pointer text-center rounded-xl border-2 py-2 text-xs font-mono font-semibold uppercase focus-within:ring-2 focus-within:ring-gold ${
                ajuste.tamanho === t.id ? 'bg-pmrv text-white border-pmrv' : 'border-charcoal/40'
              }`}
            >
              <input
                type="radio"
                name="af-tamanho"
                value={t.id}
                checked={ajuste.tamanho === t.id}
                onChange={() => alterar({ tamanho: t.id })}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="af-instrucoes" className="ds-label">Instruções fixas</label>
        <textarea
          id="af-instrucoes"
          rows={3}
          value={ajuste.instrucoes}
          onChange={(e) => alterar({ instrucoes: e.target.value })}
          placeholder='Ex.: Chame os veículos de "V1" e "V2". Use "condutor" e nunca "motorista".'
          className="ds-input text-sm"
        />
      </div>

      <div>
        <label htmlFor="af-exemplo" className="ds-label">Relato-modelo (a IA imita o estilo)</label>
        <textarea
          id="af-exemplo"
          rows={4}
          value={ajuste.exemplo}
          onChange={(e) => alterar({ exemplo: e.target.value })}
          placeholder="Cole aqui um relato bem escrito por você. A IA copia o jeito de escrever, não os fatos."
          className="ds-input text-sm"
        />
      </div>

      {personalizado && (
        <button type="button" onClick={() => setAjuste(salvarAjusteFino(AJUSTE_FINO_PADRAO))} className="btn-outline text-xs w-full">
          Restaurar padrão
        </button>
      )}
    </details>
  );
}
