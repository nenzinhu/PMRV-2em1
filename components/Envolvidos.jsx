'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PMRV_UFS,
  formatCPF,
  formatTelefone,
  formatNome,
  formatPlacaValue,
  capitalizarFrase,
  envolvidosText,
  callGroq,
  obterChaveIA,
  cleanIAResponse,
  PMRV_AGENTE_PADRAO,
} from '@/lib/pmrv';
import { WhatsAppIcon } from './icons';
import MentionInput from './MentionInput';
import Skeleton from './Skeleton';
import { showToast } from '@/components/Toast';
import {
  envolvidosParaStorage,
  precisaMigrarFotos,
  novoFotoId,
  salvarFotoBlob,
  apagarFoto,
  migrarFotosLegadas,
  hidratarFotos,
} from '@/lib/foto-store';
import { salvarRelatoNoResumo, retirarRelatoDoResumo } from '@/lib/resumo-relatos';

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';

const EMPTY_ENV = () => ({
  id: 0,
  nome: '',
  cpf: '',
  uf: '',
  cidade: '',
  endereco: '',
  telefone: '',
  placa: '',
  placa_estrangeira: false,
  modelo: '',
  cor: '',
  relato: '',
  fotos: [],
});

const STORAGE_KEY = 'PMRV_ENVOLVIDOS';
const PLACA_TOKEN_KEY = 'PMRV_PLACA_TOKEN';

function loadEnvolvidos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return { lista: Array.isArray(obj.lista) ? obj.lista : [], seq: obj.seq || 0 };
    }
  } catch (e) {
    /* ignore */
  }
  return { lista: [], seq: 0 };
}

function novoEnvolvido(seq) {
  return { ...EMPTY_ENV(), id: seq };
}

export default function Envolvidos({ gpsInfo = null }) {
  const [envolvidos, setEnvolvidos] = useState([]);
  const [seq, setSeq] = useState(0);
  const [loadingPlaca, setLoadingPlaca] = useState({});
  const [placaError, setPlacaError] = useState({});
  const [placaToken, setPlacaToken] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const { lista, seq: s } = loadEnvolvidos();
      const migrada = (lista || []).map((ev) => ({
        ...ev,
        placa_estrangeira: ev.placa_estrangeira === true,
        placa_tipo: ev.placa_tipo || 'br',
      }));
      let next = migrada;
      try {
        if (precisaMigrarFotos(next)) {
          next = await migrarFotosLegadas(next);
        }
        next = await hidratarFotos(next);
        persist(next, s);
      } catch (e) {
        console.error('Falha ao hidratar fotos:', e);
      }
      if (cancelled) return;
      setEnvolvidos(next);
      setSeq(s);
      setPlacaToken(localStorage.getItem(PLACA_TOKEN_KEY) || '');
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  function persist(lista, s) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lista: envolvidosParaStorage(lista), seq: s })
    );
  }

  function salvar(lista) {
    persist(lista, seq);
  }

  function adicionar() {
    setEnvolvidos((prev) => {
      const maxId = prev.reduce((m, e) => Math.max(m, Number(e.id) || 0), seq);
      const nextSeq = maxId + 1;
      const lista = [...prev, novoEnvolvido(nextSeq)];
      setSeq(nextSeq);
      persist(lista, nextSeq);
      return lista;
    });
  }

  function remover(id) {
    if (!window.confirm('Remover este envolvido?')) return;
    const alvo = envolvidos.find((e) => e.id === id);
    (alvo?.fotos || []).forEach((f) => {
      if (f && f.id) apagarFoto(f.id).catch(() => {});
    });
    retirarRelatoDoResumo(id);
    const lista = envolvidos.filter((e) => e.id !== id);
    setEnvolvidos(lista);
    salvar(lista);
  }

  function update(id, patch) {
    if (patch.cpf !== undefined) patch.cpf = formatCPF(patch.cpf);
    if (patch.telefone !== undefined) patch.telefone = formatTelefone(patch.telefone);
    if (patch.nome !== undefined) patch.nome = formatNome(patch.nome);
    if (patch.cidade !== undefined) patch.cidade = capitalizarFrase(patch.cidade);
    if (patch.endereco !== undefined) patch.endereco = capitalizarFrase(patch.endereco);
    if (patch.relato !== undefined) patch.relato = capitalizarFrase(patch.relato);
    const lista = envolvidos.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setEnvolvidos(lista);
    salvar(lista);
  }

  function updatePlaca(id, raw, estrangeira) {
    const placa = (raw || '').toUpperCase().replace(/\s/g, '');
    update(id, { placa, placa_estrangeira: !!estrangeira });
  }

  async function consultarPlaca(id, placa, estrangeira) {
    if (!placa || placa.length < 7) {
      alert('Informe uma placa válida (mínimo 7 caracteres) para consultar.');
      return;
    }

    setLoadingPlaca((prev) => ({ ...prev, [id]: true }));
    setPlacaError((prev) => ({ ...prev, [id]: null }));

    try {
      const params = new URLSearchParams();
      params.set('placa', placa.toUpperCase());
      if (placaToken) params.set('token', placaToken);

      const resp = await fetch(`/api/placa?${params.toString()}`);
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Erro ao consultar placa');
      }

      const marca = [data.MARCA, data.MODELO].filter(Boolean).join(' ');
      const cor = data.cor && data.cor.trim() ? data.cor.trim() : '';
      if (marca) {
        update(id, { modelo: marca, cor });
      } else if (cor) {
        update(id, { cor });
      }
    } catch (err) {
      setPlacaError((prev) => ({ ...prev, [id]: err.message }));
    } finally {
      setLoadingPlaca((prev) => ({ ...prev, [id]: false }));
    }
  }

  function salvarToken() {
    const novo = window.prompt('Token da Placa:', placaToken || '');
    if (novo !== null) {
      const token = novo.trim();
      setPlacaToken(token);
      localStorage.setItem(PLACA_TOKEN_KEY, token);
    }
  }

  async function anexarFoto(id, file) {
    if (!file) return;
    const fotoId = novoFotoId();
    try {
      await salvarFotoBlob(fotoId, file);
    } catch (err) {
      console.error('Erro ao gravar foto:', err);
      alert('Não foi possível salvar a foto neste dispositivo.');
      return;
    }
    const src = URL.createObjectURL(file);
    setEnvolvidos((prev) => {
      const lista = prev.map((e) => {
        if (e.id !== id) return e;
        return { ...e, fotos: [...(e.fotos || []), { id: fotoId, src }] };
      });
      persist(lista, seq);
      return lista;
    });
  }

  function removerFoto(id, index) {
    const alvo = envolvidos.find((e) => e.id === id);
    const foto = alvo && (alvo.fotos || [])[index];
    if (foto && foto.id) apagarFoto(foto.id).catch(() => {});
    if (foto && foto.src && String(foto.src).startsWith('blob:')) {
      URL.revokeObjectURL(foto.src);
    }
    const lista = envolvidos.map((e) => {
      if (e.id !== id) return e;
      const fotos = (e.fotos || []).filter((_, i) => i !== index);
      return { ...e, fotos };
    });
    setEnvolvidos(lista);
    salvar(lista);
    showToast('Foto removida', 'info', 1500);
  }

  function adicionarDaGaleria(id, fileList) {
    const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith('image/'));
    if (!files.length) return;
    Promise.all(
      files.map(async (file) => {
        const fotoId = novoFotoId();
        await salvarFotoBlob(fotoId, file);
        return { id: fotoId, src: URL.createObjectURL(file) };
      })
    )
      .then((novas) => {
        const lista = envolvidos.map((e) => {
          if (e.id !== id) return e;
          return { ...e, fotos: [...(e.fotos || []), ...novas] };
        });
        setEnvolvidos(lista);
        salvar(lista);
      })
      .catch((err) => {
        console.error('Erro ao gravar fotos da galeria:', err);
        alert('Não foi possível salvar as fotos neste dispositivo.');
      });
  }

  const [preview, setPreview] = useState(null);
  const cameraRefs = useRef({});

  function dispararCamera(id) {
    return new Promise((resolve) => {
      const input = cameraRefs.current[`${id}_cam`];
      if (!input) {
        resolve(false);
        return;
      }
      let done = false;
      const handler = (e) => {
        if (done) return;
        done = true;
        const file = e.target.files && e.target.files[0];
        if (file) anexarFoto(id, file);
        input.value = '';
        resolve(true);
      };
      input.addEventListener('change', handler, { once: true });
      input.click();
      setTimeout(() => {
        if (!done) {
          done = true;
          resolve(false);
        }
      }, 60000);
    });
  }

  async function tirarFotos(id) {
    while (true) {
      const ok = await Promise.race([
        dispararCamera(id),
        new Promise((r) => setTimeout(() => r(false), 60000)),
      ]);
      if (!ok) break;
    }
  }

  async function corrigirRelato(id) {
    const ev = envolvidos.find((e) => e.id === id);
    if (!ev || !ev.relato.trim()) {
      alert('Escreva o relato antes de corrigir com IA.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('Sem conexão com a internet.\n\nA correção com IA precisa de internet.');
      return;
    }

    const btn = document.getElementById(`env_ia_${ev.id}`);
    const rotulo = btn ? btn.textContent : '✨ Corrigir com IA';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Corrigindo…';
    }

    const prompt =
      'Melhore o relato abaixo de um envolvido em um sinistro de trânsito: corrija ortografia, acentuação, concordância e pontuação, mantenha os fatos e a norma culta do português do Brasil. Responda APENAS com o texto corrigido, sem comentários.\n\n' +
      ev.relato;

    try {
      const res = await callGroq({ apiKey: GROQ_API_KEY, prompt, system: PMRV_AGENTE_PADRAO });
      if (res.error === 'auth') {
        alert('Chave da API inválida ou sem permissão.\n\nVerifique a configuração do sistema.');
      } else if (res.error === 'quota') {
        alert('Cota da API excedida no momento.\n\nAguarde alguns minutos e tente novamente.');
      } else if (res.text) {
        const texto = cleanIAResponse(res.text);
        update(id, { relato: texto });
      }
    } catch (err) {
      console.error('Erro ao corrigir relato:', err);
      alert('Não foi possível corrigir com IA.\n\nVerifique sua conexão e tente novamente.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = rotulo;
      }
    }
  }

  function salvarRelatoIndividual(id) {
    const ev = envolvidos.find((e) => e.id === id);
    if (!ev) return;
    const result = salvarRelatoNoResumo(ev);
    if (!result.ok) {
      alert('Escreva o relato individual antes de salvar.');
      return;
    }
    showToast(`Relato do Envolvido #${result.envolvidoId} no resumo (${result.total})`, 'success', 2000);
  }

  function exportarWhatsApp() {
    const txt = envolvidosText(envolvidos);
    if (!txt) {
      alert('Nenhum envolvido para enviar.');
      return;
    }
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(txt), '_blank');
  }

  const ufOpts = PMRV_UFS.map((u) => ({ v: u, label: u }));

  return (
    <div className="max-w-xl mx-auto p-3 sm:p-4 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-base sm:text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">Envolvidos</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={salvarToken}
            className="btn-outline text-xs active:scale-95"
            title="Configurar token da API de placa"
          >
            🔧 Placa
          </button>
          <button onClick={adicionar} className="btn-ios text-xs active:scale-95">
            + Adicionar
          </button>
        </div>
      </div>

      <p className="estilo-glass text-xs text-charcoal/70 font-mono mb-4 p-3">
        Cada envolvido tem dados, relato individual (com correção por IA) e fotos. <b>Salvar relato</b> envia o texto para o Resumo da Dinâmica. Use <b>📷 Tirar fotos</b> ou <b>🖼️ Galeria</b>.
      </p>

      <div className="space-y-6">
        {envolvidos.map((ev) => (
          <article key={ev.id} className="ds-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-charcoal pb-2 gap-2">
              <h3 className="font-mono font-semibold uppercase tracking-tight text-pmrv text-sm sm:text-base">Envolvido #{ev.id}</h3>
              <button
                onClick={() => { remover(ev.id); showToast('Envolvido removido', 'warning', 1500); }}
                className="btn-ios text-xs bg-brick !border-brick active:scale-95"
                aria-label={`Remover envolvido ${ev.id}`}
              >
                Remover
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ds-label">Nome Completo</label>
                <input
                  value={ev.nome}
                  onChange={(e) => update(ev.id, { nome: e.target.value })}
                  className="ds-input text-sm"
                />
              </div>
              <div>
                <label className="ds-label">CPF</label>
                <input
                  value={ev.cpf}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  onChange={(e) => update(ev.id, { cpf: e.target.value })}
                  className="ds-input text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ds-label">Estado (UF)</label>
                <select
                  value={ev.uf}
                  onChange={(e) => update(ev.id, { uf: e.target.value })}
                  className="ds-input text-sm"
                >
                  <option value="">—</option>
                  {ufOpts.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ds-label">Cidade</label>
                <input
                  value={ev.cidade}
                  onChange={(e) => update(ev.id, { cidade: e.target.value })}
                  className="ds-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="ds-label">Endereço</label>
              <input
                value={ev.endereco}
                onChange={(e) => update(ev.id, { endereco: e.target.value })}
                className="ds-input text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ds-label">Telefone</label>
                <input
                  value={ev.telefone}
                  placeholder="(00)000000000"
                  inputMode="numeric"
                  onChange={(e) => update(ev.id, { telefone: e.target.value })}
                  className="ds-input text-sm"
                />
              </div>
              <div>
                <label className="ds-label">Placa do Veículo</label>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    id={`placa_ext_${ev.id}`}
                    type="checkbox"
                    checked={ev.placa_estrangeira}
                    onChange={(e) => update(ev.id, { placa_estrangeira: e.target.checked, placa: '' })}
                    className="h-4 w-4 border-2 border-charcoal rounded-none accent-pmrv"
                  />
                  <label htmlFor={`placa_ext_${ev.id}`} className="text-xs font-mono text-charcoal cursor-pointer select-none">
                    Estrangeiro
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    value={ev.placa}
                    placeholder="Digite a placa"
                    onChange={(e) => updatePlaca(ev.id, e.target.value, ev.placa_estrangeira)}
                    className="ds-input text-sm uppercase flex-1"
                    title={ev.placa_estrangeira ? 'Placa estrangeira: digitação livre' : 'Placa: formato AAA0X00 ou AAA9999'}
                  />
                  {!ev.placa_estrangeira && (
                    <button
                      type="button"
                      onClick={() => consultarPlaca(ev.id, ev.placa, ev.placa_estrangeira)}
                      disabled={loadingPlaca[ev.id] || !ev.placa || ev.placa.length < 7}
                      className="btn-outline text-xs px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Consultar placa e preencher modelo automaticamente"
                    >
                      {loadingPlaca[ev.id] ? '...' : '🔍'}
                    </button>
                  )}
                </div>
                {placaError[ev.id] && (
                  <p className="text-[10px] font-mono text-brick mt-1">{placaError[ev.id]}</p>
                )}
              </div>
            </div>

            <div>
              <label className="ds-label">Modelo do Veículo</label>
              <input
                value={ev.modelo}
                onChange={(e) => update(ev.id, { modelo: e.target.value })}
                className="ds-input text-sm"
                placeholder={loadingPlaca[ev.id] ? 'Buscando...' : 'Ex: VW CROSSFOX'}
              />
            </div>

            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-2">
                <label className="ds-label mb-0">Relato Individual</label>
                <div className="flex gap-2">
                  <button
                    id={`env_ia_${ev.id}`}
                    onClick={() => corrigirRelato(ev.id)}
                    className="btn-outline text-[10px]"
                  >
                    ✨ Corrigir com IA
                  </button>
                  <button
                    type="button"
                    onClick={() => salvarRelatoIndividual(ev.id)}
                    className="btn-ios text-[10px]"
                  >
                    Salvar relato
                  </button>
                </div>
              </div>
              <MentionInput
                value={ev.relato}
                onChange={(value) => update(ev.id, { relato: value })}
                envolvidos={envolvidos}
                rows={4}
                placeholder="Descreva o que aconteceu... Use @ para mencionar pessoas, veículos ou localização GPS"
                className="w-full p-2 bg-bone border-2 border-charcoal focus:ring-2 focus:ring-gold outline-none text-sm leading-relaxed"
                gpsLocation={gpsInfo}
              />
            </div>

            <div>
              <div className="layout-header-glass rounded-t-xl px-3 py-2 mb-3 flex flex-wrap justify-between items-center gap-2">
                <label className="ds-label mb-0">Fotos</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => tirarFotos(ev.id)}
                    className="btn-ios text-[10px]"
                    title="Abre a câmera: tire quantas fotos quiser (cancele para parar)"
                  >
                    📷 Tirar fotos
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`gal_${ev.id}`).click()}
                    className="btn-outline text-[10px]"
                    title="Adicionar fotos da galeria (quantas quiser)"
                  >
                    🖼️ Galeria
                  </button>
                </div>
              </div>
              <input
                id={`gal_${ev.id}`}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { adicionarDaGaleria(ev.id, e.target.files); e.target.value = ''; }}
              />
              <input
                id={`cam_${ev.id}`}
                ref={(el) => (cameraRefs.current[`${ev.id}_cam`] = el)}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) anexarFoto(ev.id, file);
                  e.target.value = '';
                }}
              />
              {(ev.fotos || []).length === 0 ? (
                <div className="w-full h-32 border-2 border-dashed border-charcoal flex items-center justify-center text-[10px] font-mono text-charcoal/50 text-center">
                  Nenhuma foto ainda — use Tirar fotos ou Galeria
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(ev.fotos || []).map((f, idx) => (
                    <div key={f.id || idx} className="relative border-2 border-charcoal p-1 bg-bone">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.src}
                        alt={`Foto ${idx + 1}`}
                        onClick={() => setPreview({ src: f.src, label: `Foto ${idx + 1}` })}
                        className="w-full h-28 object-cover border-2 border-charcoal cursor-pointer hover:opacity-90 transition"
                      />
                      <button
                        type="button"
                        onClick={() => removerFoto(ev.id, idx)}
                        className="absolute top-1 right-1 bg-brick text-white text-[10px] font-mono font-semibold px-2 py-1 border-2 border-brick"
                        title="Remover esta foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {envolvidos.length === 0 && (
        <div className="bg-white border-2 border-dashed border-charcoal p-6 sm:p-8 text-center font-mono text-xs sm:text-sm text-charcoal/60">
          <div className="text-3xl mb-2" aria-hidden="true">👮‍♂️</div>
          Nenhum envolvido adicionado ainda.
        </div>
      )}

      <button onClick={exportarWhatsApp} className="ds-btn-whatsapp w-full mt-6">
        <WhatsAppIcon />
        Enviar Envolvidos no WhatsApp
      </button>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[100] bg-pmrv/90 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          role="dialog"
          aria-label="Pré-visualização da foto"
        >
          <span className="text-bone font-mono text-xs uppercase tracking-wider mb-3">{preview.label}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.src}
            alt={preview.label}
            className="max-w-full max-h-[75vh] object-contain border-2 border-gold"
          />
          <button
            onClick={() => setPreview(null)}
            className="btn-ios text-xs mt-4"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
