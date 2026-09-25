'use client';

import { useEffect, useRef, useState } from 'react';
import { callGroq } from '@/lib/pmrv';
import { showToast } from '@/components/Toast';
import { apagarFoto, lerFotoBlob, novoFotoId, salvarFotoBlob } from '@/lib/foto-store';
import {
  DANOS_MAX_FOTOS,
  DANOS_STORAGE_KEY,
  DANOS_SYSTEM,
  buildDanosPrompt,
  mensagemFalhaIA,
  comprimirParaIA,
  descreverVeiculo,
  parseDanos,
  respostaSemImagem,
  serializeDanos,
} from '@/lib/danos';
import { salvarDanosNoResumo } from '@/lib/resumo-relatos';
import ModeloFotoPicker from '@/components/ModeloFotoPicker';

const ERROS_IA = {
  nokey: 'Nenhuma chave de IA configurada no servidor.',
  auth: 'Chave da API inválida ou sem permissão.',
  quota: 'Cota da API excedida no momento. Aguarde alguns minutos e tente novamente.',
  novisao:
    'Nenhum provedor configurado lê imagens. Configure a chave do Mistral (MISTRAL_API_KEY) ou escolha um modelo com visão.',
  invalid: 'Fotos inválidas ou grandes demais. Remova alguma e tente de novo.',
};

function carregarEnvolvidos() {
  try {
    const obj = JSON.parse(localStorage.getItem('PMRV_ENVOLVIDOS') || '{}');
    return (Array.isArray(obj.lista) ? obj.lista : []).filter((ev) => descreverVeiculo(ev));
  } catch {
    return [];
  }
}

function soltarUrl(src) {
  if (typeof src === 'string' && src.startsWith('blob:')) URL.revokeObjectURL(src);
}

export default function DanosFotos() {
  const [fotos, setFotos] = useState([]);
  const [envolvidos, setEnvolvidos] = useState([]);
  const [envolvidoId, setEnvolvidoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [analisando, setAnalisando] = useState(false);
  const [status, setStatus] = useState('');
  const [pronto, setPronto] = useState(false);
  const [modeloFoto, setModeloFoto] = useState(null);
  const galeriaRef = useRef(null);
  const cameraRef = useRef(null);
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;

  useEffect(() => {
    let cancelado = false;
    const salvo = parseDanos(localStorage.getItem(DANOS_STORAGE_KEY));
    setEnvolvidos(carregarEnvolvidos());
    setEnvolvidoId(salvo.envolvidoId);
    setObservacao(salvo.observacao);
    setDescricao(salvo.descricao);
    Promise.all(
      salvo.fotos.map(async (f) => {
        const blob = await lerFotoBlob(f.id).catch(() => null);
        return blob ? { id: f.id, src: URL.createObjectURL(blob) } : null;
      })
    ).then((lista) => {
      const validas = lista.filter(Boolean);
      if (cancelado) {
        validas.forEach((f) => soltarUrl(f.src));
        return;
      }
      setFotos(validas);
      setPronto(true);
    });
    return () => {
      cancelado = true;
      fotosRef.current.forEach((f) => soltarUrl(f.src));
    };
  }, []);

  useEffect(() => {
    if (!pronto) return;
    localStorage.setItem(DANOS_STORAGE_KEY, serializeDanos({ fotos, envolvidoId, observacao, descricao }));
  }, [pronto, fotos, envolvidoId, observacao, descricao]);

  const envolvido = envolvidos.find((ev) => String(ev.id) === envolvidoId) || null;
  const veiculo = descreverVeiculo(envolvido);
  const vagas = DANOS_MAX_FOTOS - fotos.length;
  const fotosDoEnvolvido = (envolvido?.fotos || []).filter((f) => f?.id);

  async function guardar(blobs) {
    const aceitos = blobs.filter((b) => b?.type?.startsWith('image/')).slice(0, vagas);
    if (blobs.length > aceitos.length) {
      showToast(`Máximo de ${DANOS_MAX_FOTOS} fotos por análise`, 'warning', 2500);
    }
    if (!aceitos.length) return;
    try {
      const novas = await Promise.all(
        aceitos.map(async (blob) => {
          const id = novoFotoId();
          await salvarFotoBlob(id, blob);
          return { id, src: URL.createObjectURL(blob) };
        })
      );
      setFotos((prev) => [...prev, ...novas]);
    } catch (err) {
      console.error('Erro ao gravar fotos de danos:', err);
      alert('Não foi possível salvar as fotos neste dispositivo.');
    }
  }

  // Copia os arquivos: apagar aqui não pode apagar a foto do envolvido.
  async function importarDoEnvolvido() {
    const blobs = await Promise.all(fotosDoEnvolvido.map((f) => lerFotoBlob(f.id).catch(() => null)));
    const validos = blobs.filter(Boolean);
    if (!validos.length) {
      showToast('As fotos deste envolvido não estão neste aparelho', 'warning', 2500);
      return;
    }
    await guardar(validos);
  }

  function remover(id) {
    const foto = fotos.find((f) => f.id === id);
    soltarUrl(foto?.src);
    apagarFoto(id).catch(() => {});
    setFotos((prev) => prev.filter((f) => f.id !== id));
  }

  async function descrever() {
    if (!fotos.length || analisando) return;
    setAnalisando(true);
    setStatus('Preparando fotos…');
    setDescricao('');
    try {
      const images = await Promise.all(
        fotos.map(async (f, i) => {
          const blob = await lerFotoBlob(f.id).catch(() => null);
          if (!blob) throw new Error(`a foto ${i + 1} não está mais neste aparelho; remova e anexe de novo`);
          try {
            return await comprimirParaIA(blob);
          } catch {
            throw new Error(`a foto ${i + 1} não abriu (formato não suportado, ex.: HEIC); tire de novo pela Câmera`);
          }
        })
      );
      setStatus('A IA está analisando as fotos…');
      const res = await callGroq({
        prompt: buildDanosPrompt({ quantidade: images.length, veiculo, observacao }),
        system: DANOS_SYSTEM,
        temperature: 0.3,
        maxTokens: 1024,
        images,
        ...(modeloFoto ? { provider: modeloFoto.provedor, model: modeloFoto.id } : {}),
        onToken: (_, total) => setDescricao(total),
      });
      if (res.error) {
        setDescricao('');
        setStatus(res.falhas?.length ? mensagemFalhaIA(res) : ERROS_IA[res.error] || mensagemFalhaIA(res));
        return;
      }
      if (respostaSemImagem(res.text)) {
        setDescricao('');
        setStatus('O modelo escolhido não leu as imagens. Escolha um modelo com visão (ex.: Mistral Small).');
        return;
      }
      setDescricao(res.text);
      setStatus(`Descrição gerada por ${res.provider} · ${res.model}. Revise antes de usar.`);
    } catch (err) {
      console.error('Erro ao descrever danos:', err);
      setDescricao('');
      setStatus(mensagemFalhaIA(err));
    } finally {
      setAnalisando(false);
    }
  }

  function enviarParaResumo() {
    const r = salvarDanosNoResumo({ texto: descricao, rotulo: veiculo, chave: envolvidoId || 'geral' });
    if (!r.ok) return;
    showToast('Danos adicionados ao Resumo da Dinâmica', 'success', 2000);
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'resumo' }));
  }

  function copiar() {
    navigator.clipboard?.writeText(descricao).then(
      () => showToast('Descrição copiada', 'success', 1500),
      () => showToast('Não foi possível copiar', 'warning', 1500)
    );
  }

  function limpar() {
    if (!window.confirm('Remover as fotos e a descrição desta aba? As fotos dos envolvidos não são afetadas.')) return;
    fotos.forEach((f) => {
      soltarUrl(f.src);
      apagarFoto(f.id).catch(() => {});
    });
    setFotos([]);
    setObservacao('');
    setDescricao('');
    setStatus('');
  }

  return (
    <div className="max-w-xl mx-auto p-3 sm:p-4">
      <div className="flex justify-between items-center mb-4 gap-3">
        <h2 className="text-base sm:text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">Danos por foto</h2>
        <button type="button" onClick={limpar} disabled={!fotos.length && !descricao} className="btn-outline text-xs active:scale-95 disabled:opacity-50">
          🧹 Limpar
        </button>
      </div>

      <p className="estilo-glass text-[13px] leading-relaxed text-charcoal/80 font-mono mb-4 p-3">
        Anexe até {DANOS_MAX_FOTOS} fotos do veículo e toque em <b>Descrever danos</b>. A IA descreve só o que aparece nas fotos; revise o texto e envie para o <b>Resumo da Dinâmica</b>.
      </p>

      <ModeloFotoPicker onChange={setModeloFoto} />

      <section className="ds-card" aria-labelledby="danos-fotos-titulo">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h3 id="danos-fotos-titulo" className="ds-label mb-0">
            Fotos <span className="font-normal text-charcoal/60">({fotos.length}/{DANOS_MAX_FOTOS})</span>
          </h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={vagas <= 0} className="btn-ios text-[10px] disabled:opacity-50">
              📷 Câmera
            </button>
            <button type="button" onClick={() => galeriaRef.current?.click()} disabled={vagas <= 0} className="btn-outline text-[10px] disabled:opacity-50">
              🖼️ Galeria
            </button>
          </div>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            guardar(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
        <input
          ref={galeriaRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            guardar(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />

        {modeloFoto?.maxImagens < fotos.length && !modeloFoto.automatico && (
          <p className="mb-2 text-[11px] font-mono text-brick" role="note">
            ⚠️ {modeloFoto.label} lê no máximo {modeloFoto.maxImagens} fotos. Com {fotos.length}, será usado outro modelo gratuito.
          </p>
        )}
        {fotos.length === 0 ? (
          <div className="w-full h-32 border-2 border-dashed border-charcoal flex items-center justify-center text-[10px] font-mono text-charcoal/50 text-center px-4">
            Nenhuma foto ainda — use Câmera ou Galeria
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fotos.map((f, idx) => (
              <li key={f.id} className="relative border-2 border-charcoal p-1 bg-bone">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt={`Foto de dano ${idx + 1}`} className="w-full h-28 object-cover border-2 border-charcoal" />
                <button
                  type="button"
                  onClick={() => remover(f.id)}
                  className="absolute top-1 right-1 bg-brick text-white text-[10px] font-mono font-semibold px-2 py-1 border-2 border-brick"
                  aria-label={`Remover foto ${idx + 1}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ds-card mt-4 space-y-3" aria-label="Contexto para a IA">
        <div>
          <label htmlFor="danos-veiculo" className="ds-label">Veículo (opcional)</label>
          <select id="danos-veiculo" value={envolvidoId} onChange={(e) => setEnvolvidoId(e.target.value)} className="ds-input w-full">
            <option value="">Não vincular a um envolvido</option>
            {envolvidos.map((ev) => (
              <option key={ev.id} value={String(ev.id)}>
                {descreverVeiculo(ev)}
              </option>
            ))}
          </select>
          {fotosDoEnvolvido.length > 0 && (
            <button type="button" onClick={importarDoEnvolvido} disabled={vagas <= 0} className="btn-outline text-[10px] mt-2 disabled:opacity-50">
              ⬇️ Usar as {fotosDoEnvolvido.length} foto(s) deste envolvido
            </button>
          )}
        </div>
        <div>
          <label htmlFor="danos-obs" className="ds-label">Observação (opcional)</label>
          <textarea
            id="danos-obs"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="ds-input w-full text-sm"
            placeholder="Ex.: impacto na dianteira; foto 3 é o lado do passageiro"
          />
        </div>
      </section>


      <button
        type="button"
        onClick={descrever}
        disabled={!fotos.length || analisando}
        aria-busy={analisando}
        className={`btn-ios w-full mt-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${analisando ? 'is-loading' : ''}`}
      >
        {analisando ? (
          <>
            <span className="btn-spinner" aria-hidden="true" /> Analisando…
          </>
        ) : (
          '🔍 Descrever danos com IA'
        )}
      </button>
      <p className={`mt-2 min-h-[1rem] text-[11px] leading-relaxed font-mono whitespace-pre-line ${status.includes('\n') ? 'text-left text-brick' : 'text-center text-pmrv'}`} role="status" aria-live="polite">
        {status}
      </p>

      {(descricao || analisando) && (
        <section className="ds-card mt-2" aria-labelledby="danos-desc-titulo">
          <label id="danos-desc-titulo" htmlFor="danos-desc" className="ds-label">
            Descrição dos danos{veiculo ? ` — ${veiculo}` : ''}
          </label>
          <textarea
            id="danos-desc"
            rows={7}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            readOnly={analisando}
            className="w-full p-2 bg-bone border-2 border-charcoal focus:ring-2 focus:ring-gold outline-none text-sm leading-relaxed"
          />
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button type="button" onClick={enviarParaResumo} disabled={analisando || !descricao.trim()} className="btn-ios flex-1 text-xs disabled:opacity-50">
              📤 Adicionar ao Resumo
            </button>
            <button type="button" onClick={copiar} disabled={analisando || !descricao.trim()} className="btn-outline flex-1 text-xs disabled:opacity-50">
              📋 Copiar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
