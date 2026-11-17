'use client';
import { useEffect, useRef, useState } from 'react';
import { callGroq, cleanIAResponse, obterChaveIA } from '@/lib/pmrv';
import { useOcorrencia } from '@/components/OcorrenciaProvider';
import { showToast } from '@/components/Toast';
import EstiloPicker from '@/components/EstiloPicker';
import { fontesDosRelatos } from '@/lib/fontes-relatos';
import {
  buildResumoPrompt,
  normalizarResumoEstilos,
  relatosParaBase,
} from '@/lib/resumo-prompt';
import { aplicarAjusteFino, carregarAjusteFino } from '@/lib/ajuste-fino';

export default function ResumoDinamica() {
  const { doc, pronto, atualizar } = useOcorrencia();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [removida, setRemovida] = useState(null);
  const atual = useRef(null);
  const sequencia = useRef(0);
  const salvo = doc?.resumo || {};
  const { resumos, estiloResumo } = normalizarResumoEstilos(salvo);
  const relatos = fontesDosRelatos(doc?.envolvidos, salvo.relatos);
  const base = relatosParaBase(relatos);
  const texto = resumos[estiloResumo] || '';
  const fonte = salvo.fontes?.[estiloResumo];
  const desatualizado = !!texto && fonte != null && fonte !== base;
  useEffect(() => {
    atual.current = { id: doc?.id, base, estiloResumo };
  }, [doc?.id, base, estiloResumo]);
  useEffect(() => {
    sequencia.current += 1;
    setGerando(false);
    setErro('');
    setRemovida(null);
  }, [doc?.id]);
  useEffect(
    () => () => {
      sequencia.current += 1;
    },
    [],
  );

  function salvar(patch) {
    atualizar((prev) => ({ ...prev, resumo: { ...prev.resumo, ...patch } }));
  }
  function alterarNota(id, texto) {
    salvar({
      relatos: (salvo.relatos || []).map((r) =>
        r.id === id ? { ...r, texto } : r,
      ),
    });
  }
  async function gerar() {
    if (gerando || !base.trim()) return;
    if (!navigator.onLine) {
      setErro(
        'Conecte-se à internet para gerar o resumo. Seus relatos continuam salvos.',
      );
      return;
    }
    const numero = ++sequencia.current;
    const origem = { id: doc.id, base, estiloResumo };
    setGerando(true);
    setErro('');
    try {
      const ajuste = carregarAjusteFino();
      const res = await callGroq({
        apiKey: obterChaveIA(),
        prompt: aplicarAjusteFino(
          buildResumoPrompt(relatos, estiloResumo),
          ajuste,
        ),
        temperature: ajuste.temperatura,
      });
      if (numero !== sequencia.current) return;
      if (res.error || !res.text?.trim())
        throw new Error(
          'Não foi possível gerar. Verifique a conexão e o provedor de IA e tente novamente.',
        );
      if (JSON.stringify(origem) !== JSON.stringify(atual.current)) {
        setErro(
          'Os relatos mudaram durante a geração. Gere novamente para usar a versão atual.',
        );
        return;
      }
      const resultado = cleanIAResponse(res.text);
      atualizar((prev) =>
        prev.id !== origem.id
          ? prev
          : {
              ...prev,
              resumo: {
                ...prev.resumo,
                resumo: resultado,
                estiloResumo,
                resumos: { ...prev.resumo.resumos, [estiloResumo]: resultado },
                fontes: { ...prev.resumo.fontes, [estiloResumo]: base },
              },
            },
      );
      showToast('Resumo pronto para revisão.', 'success');
    } catch (e) {
      if (numero === sequencia.current) setErro(e.message);
    } finally {
      if (numero === sequencia.current) setGerando(false);
    }
  }
  function transferir() {
    if (!texto.trim() || desatualizado) return;
    atualizar((prev) => ({
      ...prev,
      relato: {
        ...prev.relato,
        form: { ...prev.relato.form, dinamica: texto },
      },
    }));
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'relato' }));
    showToast('Resumo transferido para o Relato Policial.', 'success');
  }
  if (!pronto)
    return (
      <p className="p-6" role="status">
        Carregando ocorrência…
      </p>
    );
  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-5 space-y-5">
      <header className="relatos-heading">
        <div>
          <p className="relatos-eyebrow">Síntese da ocorrência</p>
          <h2>Resumo dos relatos</h2>
          <p>
            Reúna declarações e notas em um texto curto. Para comparar versões e
            esclarecer lacunas, abra a análise.
          </p>
        </div>
        <button
          type="button"
          className="btn-outline text-xs"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('navigate-to', { detail: 'dinamica' }),
            )
          }
        >
          Analisar versões
        </button>
      </header>
      <section className="ds-card">
        <h3 className="font-semibold">Fontes do resumo</h3>
        <p className="text-sm">
          Os relatos são atualizados a partir do cadastro. Cada pessoa aparece
          uma única vez.
        </p>
        {!relatos.length && (
          <p>Nenhum relato informado. Comece pelo cadastro dos envolvidos.</p>
        )}
        {relatos.map((r, i) => (
          <details
            key={r.id}
            className="relato-contexto"
            open={r.envolvidoId == null}
          >
            <summary>{r.envolvidoNome || `Nota complementar ${i + 1}`}</summary>
            {r.envolvidoId != null ? (
              <>
                <p className="whitespace-pre-wrap">{r.texto}</p>
                <button
                  type="button"
                  className="btn-outline text-xs mt-2"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('navigate-to', { detail: 'envolvidos' }),
                    )
                  }
                >
                  Editar em envolvidos
                </button>
              </>
            ) : (
              <>
                <label htmlFor={`nota-${r.id}`} className="ds-label">
                  Informação complementar
                </label>
                <textarea
                  id={`nota-${r.id}`}
                  rows={4}
                  className="ds-input resize-none"
                  value={r.texto}
                  onChange={(e) => alterarNota(r.id, e.target.value)}
                />
                <button
                  type="button"
                  className="btn-outline text-xs mt-2"
                  onClick={() => {
                    setRemovida(r);
                    salvar({
                      relatos: (salvo.relatos || []).filter(
                        (n) => n.id !== r.id,
                      ),
                    });
                  }}
                >
                  Remover nota
                </button>
              </>
            )}
          </details>
        ))}
        <button
          type="button"
          className="btn-outline text-xs"
          onClick={() =>
            salvar({
              relatos: [
                ...(salvo.relatos || []),
                { id: `nota-${crypto.randomUUID()}`, texto: '' },
              ],
            })
          }
        >
          Adicionar nota
        </button>
        {removida && (
          <div role="status" className="text-sm">
            Nota removida.{' '}
            <button
              type="button"
              className="underline cursor-pointer"
              onClick={() => {
                salvar({ relatos: [...(salvo.relatos || []), removida] });
                setRemovida(null);
              }}
            >
              Desfazer
            </button>
          </div>
        )}
      </section>
      <section className="ds-card">
        <EstiloPicker
          value={estiloResumo}
          disabled={gerando}
          onChange={(estilo) =>
            salvar({ estiloResumo: estilo, resumo: resumos[estilo] || '' })
          }
        />
        <button
          type="button"
          className="btn-ios w-full disabled:opacity-50"
          disabled={gerando || !base.trim()}
          aria-busy={gerando}
          onClick={gerar}
        >
          {gerando ? 'Gerando resumo…' : 'Gerar resumo'}
        </button>
      </section>
      {erro && (
        <p role="alert" className="relato-alert">
          {erro}
        </p>
      )}
      {(texto || fonte != null) && (
        <section className="ds-card">
          <h3 className="font-semibold">Revise antes de transferir</h3>
          {desatualizado && (
            <p role="status" className="relato-alert">
              Os relatos mudaram. Gere novamente para atualizar o resumo.
            </p>
          )}
          <label htmlFor="resumo-revisao" className="ds-label">
            Resumo editável
          </label>
          <textarea
            id="resumo-revisao"
              disabled={gerando}
            rows={8}
            className="ds-input resize-none"
            value={texto}
            onChange={(e) =>
              salvar({
                resumo: e.target.value,
                resumos: { ...resumos, [estiloResumo]: e.target.value },
              })
            }
          />
          <button
            type="button"
            disabled={desatualizado || gerando || !texto.trim()}
            className="btn-ios w-full disabled:opacity-50"
            onClick={transferir}
          >
            Transferir para o Relato Policial
          </button>
        </section>
      )}
    </div>
  );
}
