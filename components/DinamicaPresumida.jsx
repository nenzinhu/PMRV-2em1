'use client';

import { useEffect, useRef, useState } from 'react';
import { callGroq, cleanIAResponse, obterChaveIA } from '@/lib/pmrv';
import { showToast } from '@/components/Toast';
import { useOcorrencia } from '@/components/OcorrenciaProvider';
import MentionInput from '@/components/MentionInput';
import EstiloPicker from '@/components/EstiloPicker';
import AjusteFino from '@/components/AjusteFino';
import { aplicarAjusteFino, carregarAjusteFino } from '@/lib/ajuste-fino';
import { SparkIcon, UploadIcon } from '@/components/icons';
import {
  DINAMICA_PRESUMIDA_KEY,
  aplicarRespostaDinamica,
  buildDinamicaPrompt,
  fonteDinamica,
  normalizarAnalise,
} from '@/lib/dinamica-presumida';
import { estiloRelatoValido } from '@/lib/estilos-relato';

const abrirEnvolvidos = () =>
  window.dispatchEvent(
    new CustomEvent('navigate-to', { detail: 'envolvidos' }),
  );

export default function DinamicaPresumida({ gpsInfo = null }) {
  const { doc, pronto, atualizar } = useOcorrencia();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [legado, setLegado] = useState(null);
  const atual = useRef(null);
  const requisicao = useRef(0);
  const envolvidos = doc?.envolvidos || [];
  const salvo = doc?.dinamica || {};
  const estado = {
    envolvidos,
    estilo: estiloRelatoValido(salvo.estilo),
    apenasUm: false,
    dinamica: salvo.dinamica || '',
  };
  const form = doc?.relato?.form || {};
  const local =
    gpsInfo?.rodovia && !gpsInfo.foraDaRodovia && gpsInfo.km != null
      ? { rodovia: gpsInfo.rodovia, km: String(gpsInfo.km) }
      : form.rodovia && String(form.km || '').trim()
        ? { rodovia: form.rodovia, km: String(form.km) }
        : null;
  const fonte = fonteDinamica(estado, local);
  const declarados = envolvidos.filter(
    (e) => e.relato?.trim() && !e.presumido,
  ).length;
  const desatualizado = !!salvo.dinamica && salvo.fonte !== fonte;
  const analise = normalizarAnalise(salvo.analise, envolvidos.length);

  useEffect(() => {
    atual.current = { id: doc?.id, fonte };
  }, [doc?.id, fonte]);
  useEffect(
    () => () => {
      requisicao.current += 1;
    },
    [],
  );
  useEffect(() => {
    requisicao.current += 1;
    setGerando(false);
    setErro('');
    try {
      const antigo = JSON.parse(
        localStorage.getItem(DINAMICA_PRESUMIDA_KEY) || 'null',
      );
      if (
        antigo &&
        (antigo.dinamica || antigo.envolvidos?.some((e) => e.relato))
      )
        setLegado(antigo);
    } catch {
      /* Rascunho inválido não impede abrir a ocorrência. */
    }
  }, [doc?.id]);

  function alterar(patch) {
    atualizar((prev) => ({
      ...prev,
      dinamica: { ...prev.dinamica, ...patch },
    }));
  }

  async function gerar() {
    if (gerando || !pronto || !declarados) return;
    if (!navigator.onLine) {
      setErro(
        'Sem conexão. Os relatos continuam salvos; conecte-se para gerar a análise.',
      );
      return;
    }
    const numero = ++requisicao.current;
    const origem = { id: doc.id, fonte };
    setGerando(true);
    setErro('');
    try {
      const ajuste = carregarAjusteFino();
      const res = await callGroq({
        apiKey: obterChaveIA(),
        prompt: aplicarAjusteFino(buildDinamicaPrompt(estado, local), ajuste),
        temperature: ajuste.temperatura,
        maxTokens: 4000,
      });
      if (numero !== requisicao.current) return;
      if (res.error)
        throw new Error(
          {
            auth: 'Verifique a chave do provedor de IA.',
            quota: 'Cota da IA excedida. Aguarde ou escolha outro modelo.',
            nokey: 'Escolha um provedor configurado no seletor de IA.',
          }[res.error] || 'A IA não respondeu. Tente novamente.',
        );
      if (
        atual.current?.id !== origem.id ||
        atual.current?.fonte !== origem.fonte
      ) {
        setErro(
          'Os relatos ou o estilo mudaram durante a geração. Gere novamente para analisar a versão atual.',
        );
        return;
      }
      const resultado = aplicarRespostaDinamica(
        estado,
        cleanIAResponse(res.text || ''),
      );
      atualizar((prev) =>
        prev.id !== origem.id
          ? prev
          : {
              ...prev,
              dinamica: {
                ...prev.dinamica,
                estilo: estado.estilo,
                dinamica: resultado.dinamica,
                analise: resultado.analise,
                fonte: origem.fonte,
              },
            },
      );
      showToast('Dinâmica e análise prontas para revisão.', 'success');
    } catch (e) {
      if (numero === requisicao.current)
        setErro(e.message || 'Não foi possível gerar. Tente novamente.');
    } finally {
      if (numero === requisicao.current) setGerando(false);
    }
  }

  function transferir() {
    if (!salvo.dinamica?.trim() || desatualizado) return;
    atualizar((prev) => ({
      ...prev,
      relato: {
        ...prev.relato,
        form: { ...prev.relato.form, dinamica: salvo.dinamica },
      },
    }));
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'relato' }));
    showToast('Dinâmica transferida para o Relato Policial.', 'success');
  }

  if (!pronto)
    return (
      <p className="p-6" role="status">
        Carregando ocorrência…
      </p>
    );

  return (
    <div className="relatos-workspace max-w-3xl mx-auto p-3 sm:p-5 space-y-5">
      <header className="relatos-heading">
        <div>
          <p className="relatos-eyebrow">Ocorrência · análise das versões</p>
          <h2>Relatos e dinâmica</h2>
          <p>
            Parta do primeiro relato, ouça os demais e compare as versões antes
            de finalizar.
          </p>
        </div>
        <button
          type="button"
          className="btn-outline text-xs"
          onClick={abrirEnvolvidos}
        >
          Gerenciar envolvidos
        </button>
      </header>
      <ol className="relatos-progress" aria-label="Etapas da dinâmica">
        <li>
          <b>1</b>
          <span>
            Registrar relatos
            <small>
              {declarados} de {envolvidos.length} informados
            </small>
          </span>
        </li>
        <li>
          <b>2</b>
          <span>
            Comparar versões<small>Concordâncias e divergências</small>
          </span>
        </li>
        <li>
          <b>3</b>
          <span>
            Revisar dinâmica<small>Transferir após conferir</small>
          </span>
        </li>
      </ol>
      <section className="ds-card">
        <EstiloPicker
          value={estado.estilo}
          onChange={(estilo) => alterar({ estilo })}
          disabled={gerando}
        />
      </section>
      {!envolvidos.length && (
        <div className="ds-card text-center">
          <h3 className="font-semibold">Comece pelos envolvidos</h3>
          <p>
            Cadastre as pessoas e seus relatos uma única vez. Eles aparecerão
            aqui automaticamente.
          </p>
          <button type="button" className="btn-ios" onClick={abrirEnvolvidos}>
            Cadastrar envolvidos
          </button>
        </div>
      )}
      {envolvidos.map((env, i) => (
        <section
          key={env.id}
          className="ds-card relato-person"
          aria-labelledby={`dp-titulo-${env.id}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="relatos-eyebrow">
                Envolvido {i + 1}
                {i === 0 ? ' · contexto inicial' : ''}
              </p>
              <h3 id={`dp-titulo-${env.id}`} className="text-lg font-semibold">
                {env.nome || 'Nome não informado'}
              </h3>
              <p className="text-sm">
                {[env.placa, env.modelo, env.cor].filter(Boolean).join(' · ') ||
                  'Dados do veículo não informados'}
              </p>
            </div>
            <span className="relato-status">
              {env.presumido
                ? 'Hipótese antiga · conferir'
                : env.relato?.trim()
                  ? 'Relato informado'
                  : 'Aguardando relato'}
            </span>
          </div>
          {i > 0 && envolvidos[0]?.relato?.trim() && (
            <details className="relato-contexto">
              <summary>Consultar o primeiro relato</summary>
              <p className="whitespace-pre-wrap">{envolvidos[0].relato}</p>
              <p className="text-xs mt-2">
                Contexto para esclarecer os fatos. Registre a versão desta
                pessoa com suas próprias informações.
              </p>
            </details>
          )}
          <label className="ds-label" htmlFor={`dp-relato-${env.id}`}>
            O que esta pessoa relatou?
          </label>
          <MentionInput
            id={`dp-relato-${env.id}`}
            rows={5}
            value={env.relato || ''}
            envolvidos={envolvidos}
            gpsLocation={gpsInfo}
            onChange={(relato) =>
              atualizar((prev) => ({
                ...prev,
                envolvidos: prev.envolvidos.map((e) =>
                  e.id === env.id ? { ...e, relato } : e,
                ),
              }))
            }
            placeholder="Registre a versão da pessoa: onde estava, o que percebeu e o que aconteceu. Use @ para mencionar dados."
            className="ds-input text-sm leading-relaxed resize-none"
          />
          {env.presumido && (
            <p className="text-sm">
              Este texto foi criado como hipótese na versão anterior. Substitua
              pelo depoimento efetivamente colhido na aba Envolvidos antes de
              usá-lo na análise.
            </p>
          )}
          {!env.relato?.trim() && (
            <p className="text-sm">
              Sem relato: a análise apontará essa lacuna e sugerirá perguntas,
              sem criar uma declaração.
            </p>
          )}
        </section>
      ))}
      {erro && (
        <p className="relato-alert" role="alert">
          {erro}
        </p>
      )}
      <button
        type="button"
        onClick={gerar}
        disabled={gerando || !declarados}
        aria-busy={gerando}
        className="btn-ios w-full min-h-12 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SparkIcon className="inline w-4 h-4 mr-2" />
        {gerando ? 'Analisando relatos…' : 'Analisar relatos e gerar dinâmica'}
      </button>
      {!declarados && envolvidos.length > 0 && (
        <p className="text-sm">
          Informe ao menos um relato para começar a análise.
        </p>
      )}
      {(salvo.dinamica || salvo.fonte) && (
        <>
          {desatualizado && (
            <p className="relato-alert" role="status">
              Os dados ou o estilo mudaram. Gere novamente antes de transferir;
              a análise abaixo corresponde à versão anterior.
            </p>
          )}
          <section className="ds-card" aria-labelledby="analise-titulo">
            <div>
              <p className="relatos-eyebrow">Conferência das fontes</p>
              <h3 id="analise-titulo" className="text-lg font-semibold">
                O que os relatos permitem concluir
              </h3>
              <p className="text-sm mt-1">
                Análise sugerida pela IA. Confira cada ponto nas declarações.
              </p>
            </div>
            <div className="analise-grid">
              {[
                ['concordancias', 'Pontos em comum'],
                ['divergencias', 'Versões diferentes'],
                ['lacunas', 'Falta esclarecer'],
              ].map(([key, titulo]) => (
                <div key={key} className="analise-bloco">
                  <h4>{titulo}</h4>
                  {analise[key].length ? (
                    <ul>
                      {analise[key].map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Nenhum ponto informado pela análise.</p>
                  )}
                </div>
              ))}
            </div>
            {analise.perguntas.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">
                  Perguntas para continuar a coleta
                </h4>
                {analise.perguntas.map((p, i) => (
                  <details key={i} className="relato-contexto" open>
                    <summary>
                      {envolvidos[p.envolvido - 1]?.nome ||
                        `Envolvido ${p.envolvido}`}
                    </summary>
                    <ul className="list-disc pl-5 space-y-2">
                      {p.perguntas.map((t, k) => (
                        <li key={k}>{t}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </section>
          <section className="ds-card" aria-labelledby="dp-dinamica-titulo">
            <div>
              <p className="relatos-eyebrow">Texto para revisão</p>
              <h3 id="dp-dinamica-titulo" className="text-lg font-semibold">
                Dinâmica consolidada
              </h3>
            </div>
            <label htmlFor="dp-dinamica" className="ds-label">
              Revise o texto antes de transferir
            </label>
            <textarea
              id="dp-dinamica"
              disabled={gerando}
              rows={9}
              value={salvo.dinamica}
              onChange={(e) => alterar({ dinamica: e.target.value })}
              className="ds-input text-sm leading-relaxed resize-none"
            />
            <button
              type="button"
              onClick={transferir}
              disabled={desatualizado || gerando || !salvo.dinamica.trim()}
              className="btn-ios w-full disabled:opacity-50"
            >
              <UploadIcon className="inline w-4 h-4 mr-2" />
              Transferir para o Relato Policial
            </button>
          </section>
        </>
      )}
      {legado && (
        <details className="ds-card">
          <summary className="cursor-pointer font-semibold">
            Consultar rascunho da versão anterior
          </summary>
          <p className="text-sm">
            Preservado para consulta. Pode pertencer a outra ocorrência; confira
            antes de copiar informações.
          </p>
          {(Array.isArray(legado.envolvidos) ? legado.envolvidos : []).map(
            (e, i) => (
              <div key={i}>
                <h4 className="font-semibold">
                  {e.nome || `Envolvido ${i + 1}`}{' '}
                  {e.presumido ? '· hipótese da IA' : ''}
                </h4>
                <p className="whitespace-pre-wrap">
                  {typeof e.relato === 'string' ? e.relato : ''}
                </p>
              </div>
            ),
          )}
          <p className="whitespace-pre-wrap">
            {typeof legado.dinamica === 'string' ? legado.dinamica : ''}
          </p>
        </details>
      )}
      <AjusteFino />
    </div>
  );
}
