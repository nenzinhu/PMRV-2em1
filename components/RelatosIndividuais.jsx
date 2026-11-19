'use client';

import { useEffect, useRef, useState } from 'react';
import { useOcorrencia } from './OcorrenciaProvider';
import { consultarPlaca, normalizarPlaca, placaConsultavel } from '@/lib/placa';
import { callGroq, cleanIAResponse, obterChaveIA, PMRV_AGENTE_PADRAO } from '@/lib/pmrv';
import { ACOES_RELATO, promptRevisaoRelato } from '@/lib/revisao-relato';
import { relatoFromEnvolvido, upsertRelatoNoResumo, removerRelatoDoEnvolvido } from '@/lib/resumo-relatos';
import { showToast } from './Toast';

const LIMITE = 10;

export default function RelatosIndividuais() {
  const { doc, pronto, atualizar } = useOcorrencia();
  const [ocupados, setOcupados] = useState({});
  const [erros, setErros] = useState({});
  const ciclo = useRef(0);
  useEffect(() => {
    ciclo.current += 1;
    setOcupados({});
    setErros({});
    return () => { ciclo.current += 1; };
  }, [doc?.id]);
  if (!pronto) return <p role="status" className="p-4">Carregando relatos…</p>;
  const envolvidos = doc.envolvidos;

  function alterar(id, patch) {
    atualizar(prev => ({ ...prev, envolvidos: prev.envolvidos.map(ev => ev.id === id ? { ...ev, ...patch } : ev) }));
  }
  function adicionar() {
    atualizar(prev => {
      if (prev.envolvidos.length >= LIMITE) return prev;
      const id = Math.max(0, ...prev.envolvidos.map(ev => Number(ev.id) || 0)) + 1;
      return { ...prev, envolvidos: [...prev.envolvidos, { id, nome: '', placa: '', modelo: '', cor: '', relato: '', fotos: [] }] };
    });
  }
  function remover(ev) {
    if (!window.confirm(`Remover ${ev.nome || 'este envolvido'} e seu relato?`)) return;
    atualizar(prev => ({
      ...prev,
      envolvidos: prev.envolvidos.filter(item => item.id !== ev.id),
      resumo: { ...prev.resumo, relatos: removerRelatoDoEnvolvido(prev.resumo.relatos, ev.id) },
    }));
  }
  async function executar(ev, acao) {
    const chave = `${ev.id}-${acao === 'placa' ? 'placa' : 'ia'}`;
    const origem = doc.id;
    const versao = ciclo.current;
    setOcupados(prev => ({ ...prev, [chave]: true }));
    setErros(prev => ({ ...prev, [ev.id]: '' }));
    try {
      if (acao === 'placa') {
        const dados = await consultarPlaca(ev.placa);
        if (ciclo.current !== versao) return;
        atualizar(prev => prev.id !== origem ? prev : ({
          ...prev,
          envolvidos: prev.envolvidos.map(item => {
            if (item.id !== ev.id || normalizarPlaca(item.placa) !== normalizarPlaca(ev.placa)) return item;
            // Preserva correções manuais feitas enquanto a consulta estava em andamento.
            return { ...item, modelo: item.modelo === ev.modelo && dados.modelo ? dados.modelo : item.modelo, cor: item.cor === ev.cor && dados.cor ? dados.cor : item.cor };
          }),
        }));
      } else {
        const resultado = await callGroq({
          apiKey: obterChaveIA(),
          prompt: promptRevisaoRelato(acao, ev.relato, doc.dinamica?.estilo),
          system: PMRV_AGENTE_PADRAO,
        });
        if (ciclo.current !== versao) return;
        if (resultado.error || !resultado.text?.trim()) throw new Error('Não foi possível revisar. Verifique a conexão e a configuração de IA.');
        atualizar(prev => prev.id !== origem ? prev : ({
          ...prev,
          envolvidos: prev.envolvidos.map(item => item.id === ev.id && item.relato === ev.relato
            ? { ...item, relato: cleanIAResponse(resultado.text) } : item),
        }));
      }
    } catch (erro) {
      if (ciclo.current === versao) setErros(prev => ({ ...prev, [ev.id]: erro.message }));
    } finally {
      if (ciclo.current === versao) setOcupados(prev => ({ ...prev, [chave]: false }));
    }
  }
  function salvar(ev) {
    const entrada = relatoFromEnvolvido(ev);
    if (!entrada) return;
    atualizar(prev => ({ ...prev, resumo: { ...prev.resumo, relatos: upsertRelatoNoResumo(prev.resumo.relatos, entrada) } }));
    showToast('Relato disponível na dinâmica e no resumo.', 'success');
  }
  async function copiar(ev) {
    try {
      const veiculo = [ev.placa, ev.modelo, ev.cor].filter(Boolean).join(' · ');
      await navigator.clipboard.writeText([ev.nome, veiculo, ev.relato].filter(Boolean).join('\n\n'));
      showToast('Relato individual copiado.', 'success');
    } catch {
      setErros(prev => ({ ...prev, [ev.id]: 'Não foi possível copiar. Selecione o texto do relato e copie manualmente.' }));
    }
  }
  return (
    <section className="max-w-xl mx-auto p-3 sm:p-4 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold text-pmrv">Relatos individuais</h2>
        <span className="text-sm font-mono" aria-live="polite">{envolvidos.length}/{LIMITE} envolvidos</span>
      </div>
      <p className="text-sm text-charcoal">Preencha o nome e o relato de cada pessoa. Busque o veículo pela placa ou digite modelo e cor manualmente. Os dados são compartilhados com o cadastro completo.</p>
      <button type="button" className="btn-ios disabled:opacity-50" onClick={adicionar} disabled={envolvidos.length >= LIMITE}>Adicionar envolvido</button>
      {envolvidos.length >= LIMITE && <p className="text-sm" role="status">Limite de 10 envolvidos atingido. Os cadastros existentes foram preservados.</p>}
      {!envolvidos.length && <p className="ds-card">Adicione a primeira pessoa para começar.</p>}
      {envolvidos.map((ev, index) => (
        <article className="ds-card space-y-3" key={ev.id} aria-label={`Relato de ${ev.nome || `envolvido ${index + 1}`}`}>
          <div className="flex justify-between items-center gap-3">
            <h3 className="font-semibold">{ev.nome || `Envolvido ${index + 1}`}</h3>
            <button type="button" className="btn-outline text-sm" onClick={() => remover(ev)}>Remover</button>
          </div>
          <label className="ds-label" htmlFor={`ri-nome-${ev.id}`}>Nome</label>
          <input id={`ri-nome-${ev.id}`} className="ds-input" value={ev.nome || ''} onChange={e => alterar(ev.id, { nome: e.target.value })} />
          <label className="ds-label" htmlFor={`ri-placa-${ev.id}`}>Placa</label>
          <div className="flex gap-2">
            <input id={`ri-placa-${ev.id}`} className="ds-input min-w-0" value={ev.placa || ''} onChange={e => alterar(ev.id, { placa: normalizarPlaca(e.target.value) })} />
            <button type="button" className="btn-outline shrink-0 disabled:opacity-50" onClick={() => executar(ev, 'placa')} disabled={!!ocupados[`${ev.id}-placa`] || !placaConsultavel(ev.placa)}>{ocupados[`${ev.id}-placa`] ? 'Buscando…' : 'Buscar placa'}</button>
          </div>
          <p className="text-xs">Sem consulta disponível? Preencha o veículo abaixo. Para pessoas sem veículo, deixe os campos em branco.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="ds-label">Modelo<input className="ds-input mt-1" value={ev.modelo || ''} onChange={e => alterar(ev.id, { modelo: e.target.value })} /></label>
            <label className="ds-label">Cor<input className="ds-input mt-1" value={ev.cor || ''} onChange={e => alterar(ev.id, { cor: e.target.value })} /></label>
          </div>
          {ev.presumido && <div className="p-3 border border-brick rounded-lg space-y-2">
            <p className="text-sm">Hipótese de registro antigo: este texto ainda não é uma declaração confirmada. Confira o que a pessoa efetivamente declarou antes de confirmar.</p>
            <button type="button" className="btn-outline text-sm" onClick={() => alterar(ev.id, { presumido: false })}>Confirmar declaração registrada</button>
          </div>}
          <label className="ds-label" htmlFor={`ri-relato-${ev.id}`}>Relato individual</label>
          <textarea id={`ri-relato-${ev.id}`} rows={5} className="ds-input leading-relaxed" value={ev.relato || ''} placeholder="Registre o que esta pessoa declarou…" onChange={e => alterar(ev.id, { relato: e.target.value })} />
          <p className="text-xs">A revisão utiliza apenas os fatos informados. Confira o texto antes de copiar.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACOES_RELATO).map(([acao]) => <button key={acao} type="button" className="btn-outline text-sm disabled:opacity-50" disabled={!ev.relato?.trim() || !!ocupados[`${ev.id}-ia`]} onClick={() => executar(ev, acao)}>{acao === 'ortografia' ? 'Corrigir ortografia' : 'Melhorar relato'}</button>)}
            <button type="button" className="btn-ios text-sm disabled:opacity-50" disabled={!ev.relato?.trim() || ev.presumido === true} onClick={() => salvar(ev)}>Salvar relato</button>
            <button type="button" className="btn-outline text-sm disabled:opacity-50" disabled={!ev.relato?.trim() || ev.presumido === true} onClick={() => copiar(ev)}>Copiar individual</button>
          </div>
          {ocupados[`${ev.id}-ia`] && <p role="status">Revisando relato…</p>}
          {erros[ev.id] && <p role="alert" className="text-sm text-brick">{erros[ev.id]}</p>}
        </article>
      ))}
    </section>
  );
}
