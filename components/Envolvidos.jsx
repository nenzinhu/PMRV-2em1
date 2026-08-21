'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PMRV_UFS,
  PMRV_FOTO_SLOTS,
  PMRV_ANGULOS,
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

const EMPTY_ENV = () => ({
  id: 0,
  nome: '',
  cpf: '',
  uf: '',
  cidade: '',
  endereco: '',
  telefone: '',
  placa: '',
  placa_tipo: 'br',
  modelo: '',
  relato: '',
  fotos: {},
  fotoAngulos: {},
});

const STORAGE_KEY = 'PMRV_ENVOLVIDOS';

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

export default function Envolvidos() {
  const [envolvidos, setEnvolvidos] = useState([]);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    const { lista, seq: s } = loadEnvolvidos();
    setEnvolvidos(lista);
    setSeq(s);
  }, []);

  function persist(lista, s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lista, seq: s }));
  }

  function salvar(lista) {
    persist(lista, seq);
  }

  function adicionar() {
    const nextSeq = seq + 1;
    const ev = novoEnvolvido(nextSeq);
    const lista = [...envolvidos, ev];
    setEnvolvidos(lista);
    setSeq(nextSeq);
    persist(lista, nextSeq);
  }

  function remover(id) {
    if (!window.confirm('Remover este envolvido?')) return;
    const lista = envolvidos.filter((e) => e.id !== id);
    setEnvolvidos(lista);
    salvar(lista);
  }

  function update(id, patch) {
    // Aplica máscaras conhecidas antes de gravar.
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

  function updatePlaca(id, tipo, raw) {
    const placa = formatPlacaValue(tipo, raw);
    update(id, { placa_tipo: tipo, placa });
  }

  function anexarFoto(id, slot, file, angulo) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lista = envolvidos.map((e) => {
        if (e.id !== id) return e;
        const fotos = { ...e.fotos, [slot]: reader.result };
        const fotoAngulos = angulo ? { ...e.fotoAngulos, [slot]: angulo } : e.fotoAngulos;
        return { ...e, fotos, fotoAngulos };
      });
      setEnvolvidos(lista);
      salvar(lista);
    };
    reader.readAsDataURL(file);
  }

  function setAngulo(id, slot, angulo) {
    const lista = envolvidos.map((e) =>
      e.id === id ? { ...e, fotoAngulos: { ...e.fotoAngulos, [slot]: angulo } } : e
    );
    setEnvolvidos(lista);
    salvar(lista);
  }

  function removerFoto(id, slot) {
    const lista = envolvidos.map((e) => {
      if (e.id !== id) return e;
      const fotos = { ...e.fotos };
      delete fotos[slot];
      const fotoAngulos = { ...e.fotoAngulos };
      delete fotoAngulos[slot];
      return { ...e, fotos, fotoAngulos };
    });
    setEnvolvidos(lista);
    salvar(lista);
  }

  // Lightbox de pré-visualização (clicar na foto abre ampliada).
  const [preview, setPreview] = useState(null); // { src, label }

  // Captura sequencial das 4 fotos do veículo (guiada por ângulo).
  // Usa refs de input (câmera) para forçar o disparo do seletor a cada passo.
  const cameraRefs = useRef({});

  function dispararCamera(id, slot) {
    return new Promise((resolve) => {
      const input = cameraRefs.current[`${id}_${slot}`];
      if (!input) {
        resolve(false);
        return;
      }
      let done = false;
      const handler = (e) => {
        if (done) return;
        done = true;
        const file = e.target.files && e.target.files[0];
        if (file) anexarFoto(id, slot, file);
        input.value = '';
        resolve(true);
      };
      input.addEventListener('change', handler, { once: true });
      input.click();
      // Timeout de segurança caso o usuário cancele a câmera.
      setTimeout(() => {
        if (!done) {
          done = true;
          resolve(false);
        }
      }, 60000);
    });
  }

  async function tirarQuatroFotos(id) {
    const veicSlots = PMRV_FOTO_SLOTS.filter((s) => s.veiculo);
    for (const s of veicSlots) {
      const ok = await dispararCamera(id, s.key);
      if (!ok) break; // cancelou/erro — interrompe a sequência
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
    // A chave padrão fica no servidor; obterChaveIA() retorna apenas um override
    // opcional informado pelo usuário (botão 🔑). Pode ser '' (usa a do servidor).
    const apiKey = obterChaveIA();

    const btn = document.getElementById(`env_ia_${id}`);
    const rotulo = btn ? btn.textContent : '✨ Corrigir com IA';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Corrigindo…';
    }

    const prompt =
      'Melhore o relato abaixo de um envolvido em um sinistro de trânsito: corrija ortografia, acentuação, concordância e pontuação, mantenha os fatos e a norma culta do português do Brasil. Responda APENAS com o texto corrigido, sem comentários.\n\n' +
      ev.relato;

    try {
      const res = await callGroq({ apiKey, prompt, system: PMRV_AGENTE_PADRAO });
      if (res.error === 'auth') {
        if (window.confirm('Chave da API inválida ou sem permissão.\n\nDeseja informar outra chave agora?'))
          obterChaveIA(true);
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
    <div className="max-w-xl mx-auto p-4 relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">Envolvidos</h2>
        <button onClick={adicionar} className="ds-btn bg-pmrv text-white text-xs py-2 px-3 shadow-[3px_3px_0_#1e4e8c]">
          + Adicionar
        </button>
      </div>

      <p className="text-xs text-charcoal/70 font-mono mb-4">
        Cada envolvido tem dados, relato individual (com correção por IA) e fotos (4 ângulos do veículo +
        2 do local), com opção de tirar foto na câmera ou escolher da galeria. Tudo é salvo automaticamente
        neste navegador.
      </p>

      <div className="space-y-6">
        {envolvidos.map((ev) => (
          <div key={ev.id} className="ds-card">
            <div className="flex justify-between items-center border-b-2 border-charcoal pb-2">
              <h3 className="font-mono font-semibold uppercase tracking-tight text-pmrv">Envolvido #{ev.id}</h3>
              <button
                onClick={() => remover(ev.id)}
                className="text-brick text-xs font-mono font-semibold uppercase border-2 border-brick px-2 py-1 hover:bg-[#fde8e8] transition"
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
                <select
                  value={ev.placa_tipo}
                  onChange={(e) => updatePlaca(ev.id, e.target.value, ev.placa)}
                  className="ds-input text-xs mb-1"
                >
                  <option value="br">Brasil (ABC1234)</option>
                  <option value="mercosul">Mercosul (ABC1D23)</option>
                  <option value="estrangeira">Estrangeira (livre)</option>
                </select>
                <input
                  value={ev.placa}
                  placeholder="ABC1234"
                  onChange={(e) => updatePlaca(ev.id, ev.placa_tipo, e.target.value)}
                  className="ds-input text-sm uppercase"
                />
              </div>
            </div>

            <div>
              <label className="ds-label">Modelo do Veículo</label>
              <input
                value={ev.modelo}
                onChange={(e) => update(ev.id, { modelo: e.target.value })}
                className="ds-input text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="ds-label mb-0">Relato Individual</label>
                <button
                  id={`env_ia_${ev.id}`}
                  onClick={() => corrigirRelato(ev.id)}
                  className="text-[10px] font-mono font-semibold uppercase border-2 border-charcoal px-2 py-1 hover:bg-bone transition"
                >
                  ✨ Corrigir com IA
                </button>
              </div>
              <textarea
                rows={4}
                value={ev.relato}
                onChange={(e) => update(ev.id, { relato: e.target.value })}
                className="w-full p-2 bg-bone border-2 border-charcoal focus:ring-2 focus:ring-gold outline-none text-sm leading-relaxed"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="ds-label mb-0">Fotos do Veículo (4 ângulos)</label>
                <button
                  onClick={() => tirarQuatroFotos(ev.id)}
                  className="ds-btn bg-pmrv text-white text-[10px] font-mono font-semibold uppercase py-1 px-2 shadow-[2px_2px_0_#1e4e8c]"
                  title="Abre a câmera 4x em sequência: Frontal, Traseira, Vista Esquerda, Vista Direita"
                >
                  📷 Tirar 4 fotos
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PMRV_FOTO_SLOTS.filter((s) => s.veiculo).map((s) => {
                  const src = ev.fotos[s.key];
                  const anguloAtual = (ev.fotoAngulos && ev.fotoAngulos[s.key]) || s.angulo;
                  return (
                    <div key={s.key} className="border-2 border-charcoal p-2 bg-bone">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-charcoal">
                          {s.label}
                        </span>
                        <div className="flex gap-1">
                          <label className="sr-only" htmlFor={`cam_${ev.id}_${s.key}`}>Câmera</label>
                          <input
                            id={`cam_${ev.id}_${s.key}`}
                            ref={(el) => (cameraRefs.current[`${ev.id}_${s.key}`] = el)}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => anexarFoto(ev.id, s.key, e.target.files && e.target.files[0], anguloAtual)}
                          />
                          <label className="sr-only" htmlFor={`gal_${ev.id}_${s.key}`}>Galeria</label>
                          <input
                            id={`gal_${ev.id}_${s.key}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => anexarFoto(ev.id, s.key, e.target.files && e.target.files[0], anguloAtual)}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`cam_${ev.id}_${s.key}`).click()}
                            className="text-[10px] font-mono font-semibold uppercase border-2 border-charcoal px-2 py-1 bg-white hover:bg-bone transition"
                            title="Tirar foto (câmera)"
                          >
                            Câmera
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById(`gal_${ev.id}_${s.key}`).click()}
                            className="text-[10px] font-mono font-semibold uppercase border-2 border-charcoal px-2 py-1 bg-white hover:bg-bone transition"
                            title="Escolher da galeria"
                          >
                            Galeria
                          </button>
                          {src && (
                            <button
                              type="button"
                              onClick={() => removerFoto(ev.id, s.key)}
                              className="text-[10px] font-mono font-semibold uppercase border-2 border-brick text-brick px-2 py-1 bg-white hover:bg-[#fde8e8] transition"
                              title="Remover esta foto"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={s.label}
                          onClick={() => setPreview({ src, label: s.label })}
                          className="w-full h-28 object-cover border-2 border-charcoal cursor-pointer hover:opacity-90 transition"
                        />
                      ) : (
                        <div className="w-full h-28 border-2 border-dashed border-charcoal flex items-center justify-center text-[10px] font-mono text-charcoal/50 text-center">
                          {s.label}
                        </div>
                      )}
                      <select
                        value={anguloAtual}
                        onChange={(e) => setAngulo(ev.id, s.key, e.target.value)}
                        className="ds-input text-xs mt-2 py-1"
                      >
                        {PMRV_ANGULOS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="ds-label">Fotos do Local</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PMRV_FOTO_SLOTS.filter((s) => !s.veiculo).map((s) => {
                  const src = ev.fotos[s.key];
                  return (
                    <div key={s.key} className="border-2 border-charcoal p-2 bg-bone">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-charcoal">
                          {s.label}
                        </span>
                        <div className="flex gap-1">
                          <input
                            id={`camL_${ev.id}_${s.key}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => anexarFoto(ev.id, s.key, e.target.files && e.target.files[0])}
                          />
                          <input
                            id={`galL_${ev.id}_${s.key}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => anexarFoto(ev.id, s.key, e.target.files && e.target.files[0])}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`camL_${ev.id}_${s.key}`).click()}
                            className="text-[10px] font-mono font-semibold uppercase border-2 border-charcoal px-2 py-1 bg-white hover:bg-bone transition"
                            title="Tirar foto (câmera)"
                          >
                            Câmera
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById(`galL_${ev.id}_${s.key}`).click()}
                            className="text-[10px] font-mono font-semibold uppercase border-2 border-charcoal px-2 py-1 bg-white hover:bg-bone transition"
                            title="Escolher da galeria"
                          >
                            Galeria
                          </button>
                          {src && (
                            <button
                              type="button"
                              onClick={() => removerFoto(ev.id, s.key)}
                              className="text-[10px] font-mono font-semibold uppercase border-2 border-brick text-brick px-2 py-1 bg-white hover:bg-[#fde8e8] transition"
                              title="Remover esta foto"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={s.label}
                          onClick={() => setPreview({ src, label: s.label })}
                          className="w-full h-28 object-cover border-2 border-charcoal cursor-pointer hover:opacity-90 transition"
                        />
                      ) : (
                        <div className="w-full h-28 border-2 border-dashed border-charcoal flex items-center justify-center text-[10px] font-mono text-charcoal/50 text-center">
                          {s.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {envolvidos.length === 0 && (
        <div className="bg-white border-2 border-dashed border-charcoal p-8 text-center font-mono text-sm text-charcoal/60">
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
            className="ds-btn bg-white text-pmrv text-xs py-2 px-4 border-2 border-pmrv mt-4"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
