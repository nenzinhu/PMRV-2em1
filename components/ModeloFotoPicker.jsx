'use client';

import { useEffect, useState } from 'react';
import { PMRV_MODELOS_VISAO } from '@/lib/ai-models';

// Seletor da aba Danos: só modelos GRATUITOS que leem fotos. Fixos do registro
// (Groq, Mistral, Z.ai) + gratuitos com visão do OpenRouter, consultados ao vivo.
// Escolha persiste em localStorage; "Automático" = Mistral Small com reserva.

const MODELO_KEY = 'PMRV_DANOS_MODELO';
const SEP = '|';
const valorDe = (m) => `${m.provedor}${SEP}${m.id}`;
const AUTOMATICO = {
  ...(PMRV_MODELOS_VISAO.find((m) => m.id === 'mistral-small-latest') || PMRV_MODELOS_VISAO[0]),
  label: 'Automático',
  descricao:
    'Começa pelo Mistral Small 4 e, se ele estiver sem chave, sem cota ou falhar, passa sozinho para o próximo modelo gratuito que lê fotos.',
  automatico: true,
};
const PROVEDORES_AO_VIVO = ['openrouter'];

export default function ModeloFotoPicker({ onChange }) {
  const [valor, setValor] = useState('');
  const [aoVivo, setAoVivo] = useState([]);
  const [configurados, setConfigurados] = useState(null);

  const modelos = [...PMRV_MODELOS_VISAO, ...aoVivo];
  // Modelo salvo que (ainda) não está na lista ao vivo continua valendo e visível.
  const [provSalvo, ...idSalvo] = valor.split(SEP);
  const salvoForaDaLista =
    valor && PROVEDORES_AO_VIVO.includes(provSalvo) && !modelos.some((m) => valorDe(m) === valor)
      ? {
          provedor: provSalvo,
          id: idSalvo.join(SEP),
          label: idSalvo.join(SEP),
          provedorLabel: 'OpenRouter',
          gratis: 'Modelos :free',
          descricao: 'Modelo escolhido antes; a lista ao vivo ainda não o confirmou.',
        }
      : null;
  if (salvoForaDaLista) modelos.push(salvoForaDaLista);
  const escolhido = modelos.find((m) => valorDe(m) === valor) || AUTOMATICO;
  const semChave = (provedor) => configurados && !configurados[provedor];

  useEffect(() => {
    let salvo = '';
    try {
      salvo = localStorage.getItem(MODELO_KEY) || '';
    } catch {
      /* armazenamento indisponível */
    }
    setValor(salvo);

    const ctrl = new AbortController();
    const json = (url) =>
      fetch(url, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    json('/api/ai/models').then((d) => d?.providers && setConfigurados(d.providers));
    PROVEDORES_AO_VIVO.forEach((id) =>
      json(`/api/ai/models?provider=${id}&visao=1`).then((d) => {
        if (Array.isArray(d?.models) && d.models.length) setAoVivo((l) => [...l, ...d.models]);
      })
    );
    return () => ctrl.abort();
  }, []);

  // O pai sempre recebe o modelo efetivo (inclusive o salvo, ao carregar a lista ao vivo).
  useEffect(() => {
    onChange(escolhido);
  }, [escolhido.provedor, escolhido.id, escolhido.automatico]); // eslint-disable-line react-hooks/exhaustive-deps

  function escolher(novo) {
    setValor(novo);
    try {
      if (novo) localStorage.setItem(MODELO_KEY, novo);
      else localStorage.removeItem(MODELO_KEY);
    } catch {
      /* vale só nesta sessão */
    }
  }

  const grupos = [...new Set(modelos.map((m) => m.provedor))].map((provedor) =>
    modelos.filter((m) => m.provedor === provedor)
  );

  return (
    <section className="ds-card mb-4" aria-labelledby="danos-modelo-label">
      <label id="danos-modelo-label" htmlFor="danos-modelo" className="ds-label">
        Modelo de IA para ler as fotos <span className="font-normal text-pmrv">· só gratuitos</span>
      </label>
      <select id="danos-modelo" value={valor} onChange={(e) => escolher(e.target.value)} className="ds-input w-full">
        <option value="">Automático (recomendado)</option>
        {grupos.map((lista) => (
          <optgroup
            key={lista[0].provedor}
            label={`${lista[0].provedorLabel} — ${lista[0].gratis}${semChave(lista[0].provedor) ? ' (sem chave)' : ''}`}
          >
            {lista.map((m) => (
              <option key={valorDe(m)} value={valorDe(m)}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <p className="mt-2 text-[12px] leading-relaxed text-charcoal/80 font-mono" aria-live="polite">
        {!escolhido.automatico && (
          <b className="block text-pmrv">
            {escolhido.provedorLabel} · {escolhido.gratis}
          </b>
        )}
        {escolhido.descricao}
        {!escolhido.automatico && semChave(escolhido.provedor) && (
          <span className="block mt-1 text-brick">
            ⚠️ {escolhido.provedorLabel} sem chave no servidor: será usado outro modelo gratuito com visão.
          </span>
        )}
      </p>

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] font-mono font-semibold uppercase tracking-wider text-pmrv">
          Comparar os {modelos.length} modelos gratuitos
        </summary>
        <dl className="mt-2 space-y-2">
          {modelos.map((m) => (
            <div key={valorDe(m)}>
              <dt className="text-[12px] font-mono font-semibold">
                {m.label}{' '}
                <span className="font-normal text-charcoal/60">
                  · {m.provedorLabel}
                  {semChave(m.provedor) ? ' (sem chave)' : ''}
                </span>
              </dt>
              <dd className="text-[12px] leading-relaxed text-charcoal/80">{m.descricao}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
