'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Stepper from './Stepper';
import { ArrowRightIcon, ArrowLeftIcon, WhatsAppIcon, CopyIcon } from './icons';
import {
  PMRV_DINAMICAS,
  PMRV_SUBTIPOS,
  PMRV_HOSPITAIS,
  RODOVIAS,
  FLORIPA_RODOVIAS,
  rodoviaLabel,
  rodoviasDoSeletor,
  formatKM,
  formatSade,
  formatVtr,
  capitalizarFrase,
  generateReport,
  dataFatoFieldValue,
  maskDataFatoBr,
  parseDataFatoBr,
  nowFato,
  subtipoLabel,
  buildIAPrompt,
  reviewReportPrompt,
  callGroq,
  obterChaveIA,
  cleanIAResponse,
  extractJSON,
  PMRV_AGENTE_PADRAO,
} from '@/lib/pmrv';
import {
  RELATO_DRAFT_KEY,
  parseRelatoDraft,
  serializeRelatoDraft,
  mergeRelatoDraft,
} from '@/lib/relato-draft';
import { mapsUrl } from '@/lib/gps-label';
import { useSwipe } from '@/hooks/useSwipe';
import { showToast } from '@/components/Toast';

const DANOS = 'Sinistro de trânsito com danos materiais';
const VITIMA = 'Sinistro de trânsito com vítima(s)';

const CIDADES_407 = ['Biguaçu/SC', 'Antônio Carlos/SC'];
const CIDADES_281 = ['São José/SC', 'São Pedro de Alcântara/SC'];

const INITIAL = {
  sade: '',
  vtr: '',
  conhecimento: 'pela Central',
  cidade: '',
  rodovia: 'SC-401',
  km: '',
  sentido: 'Crescente',
  sentidoManual: '',
  horaTipo: 'auto',
  horaManual: '',
  dataFato: '',
  horaFato: '',
  ocorrencia: DANOS,
  subtipo: '2.1',
  objeto: '',
  outros: '',
  dinamica: PMRV_DINAMICAS['2.1'],
  qtdLeve: 0,
  qtdGrave: 0,
  qtdGravissima: 0,
  pontoReferencia: '',
  ilesos: '',
  veiculosEnvolvidos: '',
  irregularidade: 'nenhuma',
  atendimentoViatura: '',
  atendimentoNumero: '',
  atendimentoOutrosDescricao: '',
  lesaoNaoEspecificada: true,
  lesaoDescricao: '',
  destinoVitima: '',
  hospitalDestino: '',
  vitimaEnvolvido: '',
};

const ENVOLVIDOS_STORAGE_KEY = 'PMRV_ENVOLVIDOS';

function lerEnvolvidosSalvos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ENVOLVIDOS_STORAGE_KEY) || 'null');
    const lista = Array.isArray(raw?.lista) ? raw.lista : [];
    return lista.filter((e) => e && e.nome && e.nome.trim());
  } catch {
    return [];
  }
}

function startRecognition(onResult) {
  if (typeof window === 'undefined') return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Seu navegador não suporta comando de voz.');
    return;
  }
  const recognition = new SR();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    onResult(event.results[0][0].transcript);
  };
  try {
    recognition.start();
  } catch (e) {
    /* já ativo */
  }
}

function addMinutosHora(hora, minutos) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora || '');
  if (!m) return '';
  const total = (parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + minutos + 1440) % 1440;
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const mi = String(total % 60).padStart(2, '0');
  return `${h}:${mi}`;
}

function templateFor(form) {
  let texto = PMRV_DINAMICAS[form.subtipo] || '';
  if (form.subtipo === '4.9') texto = texto.replace('[OBJETO]', form.objeto || '[OBJETO]');
  if (form.subtipo === '8.1') texto = texto.replace('[OUTROS]', form.outros || '[OUTROS]');
  return texto;
}

export default function RelatoPolicial({ gpsOn = false, gpsInfo = null }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);
  const [manualEdit, setManualEdit] = useState(false);
  const [manualText, setManualText] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autoKmGps, setAutoKmGps] = useState(true);
  const [envolvidosSalvos, setEnvolvidosSalvos] = useState([]);

  // Recarrega os envolvidos salvos sempre que o Passo 4 (Vítimas) é aberto,
  // para permitir escolher a vítima entre quem já foi cadastrado.
  useEffect(() => {
    if (step === 4) setEnvolvidosSalvos(lerEnvolvidosSalvos());
  }, [step]);

  useSwipe({
    threshold: 70,
    onSwipeLeft: () => nextStep(),
    onSwipeRight: () => prevStep(),
  });

  const ehVitima = form.ocorrencia === VITIMA;

  const finalReport = useMemo(() => {
    if (manualEdit) return manualText;
    return generateReport(form, true);
  }, [form, manualEdit, manualText]);

  // Rascunho do relato: restaura fatos gravados. Sem rascunho, congela data/hora atuais uma vez (não no gerar).
  useEffect(() => {
    const parsed = parseRelatoDraft(localStorage.getItem(RELATO_DRAFT_KEY));
    if (parsed) {
      const merged = mergeRelatoDraft(parsed, INITIAL);
      if (merged.form.rodovia) {
        merged.form.rodovia = rodoviaLabel(merged.form.rodovia) || merged.form.rodovia;
      }
      setForm(merged.form);
      setStep(merged.step);
      setManualEdit(merged.manualEdit);
      setManualText(merged.manualText);
    } else {
      const savedVtr = localStorage.getItem('PMRV_VTR') || '';
      const stamp = nowFato();
      setForm((f) => ({ ...f, vtr: savedVtr || f.vtr, ...stamp }));
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    localStorage.setItem(
      RELATO_DRAFT_KEY,
      serializeRelatoDraft({ form, step, manualEdit, manualText })
    );
    if (form.vtr) localStorage.setItem('PMRV_VTR', form.vtr);
  }, [draftReady, form, step, manualEdit, manualText]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!autoKmGps) return;
    if (gpsInfo?.rodovia && !gpsInfo.foraDaRodovia && typeof gpsInfo.km === 'number') {
      // Mesmo valor exibido no chip "KM:" do GPS (Passo 1) — só troca o ponto
      // decimal por vírgula, sem a máscara de dígitos (que corrompia o valor).
      setForm((f) => ({
        ...f,
        rodovia: gpsInfo.rodovia,
        km: String(Math.round(gpsInfo.km * 1000) / 1000).replace('.', ','),
      }));
    }
  }, [gpsInfo?.rodovia, gpsInfo?.km, gpsInfo?.foraDaRodovia, autoKmGps]);

  // Recebe localização externa para o campo de dinâmica
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onSetDinamica(e) {
      const texto = e.detail;
      if (typeof texto === 'string') {
        setForm((f) => ({ ...f, dinamica: texto }));
      }
    }
    window.addEventListener('set-dinamica', onSetDinamica);
    return () => window.removeEventListener('set-dinamica', onSetDinamica);
  }, []);

  function setTemplate() {
    setForm((f) => ({ ...f, dinamica: templateFor(f) }));
  }

  // --- Rodovia / Cidade derivados ---
  const cidadeLocked = FLORIPA_RODOVIAS.includes(form.rodovia);
  const showCidade407 = form.rodovia === 'SC-407';
  const showCidade281 = form.rodovia === 'SC-281';

  // Preenche o Município automaticamente com a cidade do GPS (Nominatim),
  // sem sobrescrever se o usuário já digitou/selecionou outra cidade.
  const lastAutoCidadeRef = useRef('');
  useEffect(() => {
    if (!autoKmGps || cidadeLocked || !gpsInfo?.cidade) return;
    const valor = gpsInfo.uf ? `${gpsInfo.cidade}/${gpsInfo.uf}` : gpsInfo.cidade;
    setForm((f) => {
      if (f.cidade && f.cidade !== lastAutoCidadeRef.current) return f;
      if (f.cidade === valor) return f;
      lastAutoCidadeRef.current = valor;
      return { ...f, cidade: valor };
    });
  }, [gpsInfo?.cidade, gpsInfo?.uf, autoKmGps, cidadeLocked]);

  function onRodoviaChange(value) {
    let cidade = form.cidade;
    if (FLORIPA_RODOVIAS.includes(value)) cidade = 'Florianópolis/SC';
    else if (value === 'SC-407') cidade = CIDADES_407[0];
    else if (value === 'SC-281') cidade = CIDADES_281[0];
    else if (['Florianópolis/SC', 'Biguaçu/SC', 'São José/SC'].includes(cidade)) cidade = '';
    set({ rodovia: value, cidade });
  }

  function onCidadeSelect(value) {
    set({ cidade: value });
  }

  // --- Classificação / Subtipo acoplados ---
  // Atropelamentos (pedestre/ciclista 1.1 e animal 1.2) só fazem sentido com vítima(s).
  function subtipoDisponivel(cod) {
    if ((cod === '1.1' || cod === '1.2') && form.ocorrencia === DANOS) return false;
    return true;
  }

  const grupoSubtipos = useMemo(() => {
    const grupos = {};
    PMRV_SUBTIPOS.filter((s) => subtipoDisponivel(s.code)).forEach((s) => {
      if (!grupos[s.group]) grupos[s.group] = [];
      grupos[s.group].push(s);
    });
    return grupos;
  }, [form.ocorrencia]);

  function onOcorrenciaChange(value) {
    let subtipo = form.subtipo;
    if (value === DANOS && (subtipo === '1.1' || subtipo === '1.2')) subtipo = '2.1';
    setForm((f) => ({ ...f, ocorrencia: value, subtipo, dinamica: templateFor({ ...f, ocorrencia: value, subtipo }) }));
  }

  function onSubtipoChange(value) {
    if (value === '1.1' || value === '1.2') {
      setForm((f) => ({ ...f, subtipo: value, ocorrencia: VITIMA, dinamica: templateFor({ ...f, subtipo: value, ocorrencia: VITIMA }) }));
    } else {
      setForm((f) => ({ ...f, subtipo: value, dinamica: templateFor({ ...f, subtipo: value }) }));
    }
  }

  function onObjetoChange(value) {
    const v = capitalizarFrase(value);
    setForm((f) => ({ ...f, objeto: v, dinamica: templateFor({ ...f, objeto: v }) }));
  }

  function onOutrosChange(value) {
    const v = capitalizarFrase(value);
    setForm((f) => ({ ...f, outros: v, dinamica: templateFor({ ...f, outros: v }) }));
  }

  function onSentidoChange(value) {
    set({ sentido: value });
  }

  // --- Validação e navegação ---
  function validateStep(s) {
    if (s === 1) {
      if (!form.sade.trim()) {
        alert('Por favor, preencha o Protocolo SADE.');
        return false;
      }
      if (form.vtr.trim().length < 4) {
        alert('Por favor, preencha a Viatura (4 dígitos).');
        return false;
      }
    }
    if (s === 2) {
      if (!form.km.trim()) {
        alert('Por favor, preencha o KM.');
        return false;
      }
    }
    if (s === 4) {
      const total =
        (parseInt(form.qtdLeve) || 0) + (parseInt(form.qtdGrave) || 0) + (parseInt(form.qtdGravissima) || 0);
      if (total === 0) {
        alert('Ocorrência com vítima(s): informe a quantidade de vítimas (leve, grave ou óbito).');
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    if (step === 3 && !ehVitima) setStep(5);
    else if (step < 5) setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevStep() {
    if (step === 5 && !ehVitima) setStep(3);
    else if (step > 1) setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Voz passo 1 ---
  function onVoiceStep1(transcript) {
    const t = transcript.toLowerCase();
    const protocoloMatch = t.match(/protocolo\s*(\d+)/);
    if (protocoloMatch) set({ sade: protocoloMatch[1].substring(0, 9) });
    const viaturaMatch = t.match(/viatura\s*(\d+)/);
    if (viaturaMatch) set({ vtr: viaturaMatch[1].substring(0, 4) });
    if (t.includes('central')) set({ conhecimento: 'pela Central' });
    else if (t.includes('populares')) set({ conhecimento: 'por populares' });
    else if (t.includes('guarnição') || t.includes('guarnicao') || t.includes('deparou'))
      set({ conhecimento: 'pela guarnição' });
  }

  // --- Voz passo 2 ---
  function onVoiceStep2(transcript) {
    const t = transcript.toLowerCase();
    const rodoviaMatch = t.match(/rodovia\s*(\d+)/);
    if (rodoviaMatch) {
      const candidate = `SC-${rodoviaMatch[1]}`;
      if (RODOVIAS.includes(candidate)) onRodoviaChange(candidate);
    }
    const kmMatch = t.match(/(?:quilômetro|km)\s*(\d+)/);
    if (kmMatch) {
      let num = kmMatch[1];
      if (num.length === 2) num = num + '000';
      let value = num.substring(0, 5);
      if (value.length > 2) value = value.substring(0, 2) + ',' + value.substring(2);
      set({ km: value });
    }
    if (t.includes('crescente')) set({ sentido: 'Crescente' });
    else if (t.includes('decrescente') || t.includes('descrencente')) set({ sentido: 'Decrescente' });
    else if (t.includes('bairro')) set({ sentido: 'Centro–Bairro' });
    else if (t.includes('centro')) set({ sentido: 'Bairro–Centro' });
    else if (t.includes('norte')) set({ sentido: 'Norte–Sul' });
    else if (t.includes('sul')) set({ sentido: 'Sul–Norte' });
  }

  // --- Voz genérica (anexa ao textarea alvo) ---
  function onVoiceAppend(id) {
    return (transcript) => {
      const el = document.getElementById(id);
      if (el) {
        const novo = (el.value ? el.value + ' ' : '') + transcript;
        el.value = novo;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
  }

  // --- IA ---
  const [iaLoading, setIaLoading] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  async function gerarDescricaoIA(estilo) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('Sem conexão com a internet.\n\nA Descrição IA precisa de internet. O texto padrão (offline) continua disponível normalmente.');
      return;
    }
    // Chave padrão no servidor; obterChaveIA() retorna override opcional (🔑).
    const apiKey = obterChaveIA();
    setIaLoading(estilo);
    try {
      const res = await callGroq({ apiKey, prompt: buildIAPrompt(form, estilo), system: PMRV_AGENTE_PADRAO });
      if (res.error === 'auth') {
        if (window.confirm('Chave da API inválida ou sem permissão.\n\nDeseja informar outra chave agora?')) obterChaveIA(true);
      } else if (res.error === 'quota') {
        alert('Cota da API excedida no momento.\n\nAguarde alguns minutos e tente novamente.');
      } else if (res.text) {
        set({ dinamica: cleanIAResponse(res.text) });
      }
    } catch (err) {
      console.error('Erro na Descrição IA:', err);
      alert('Não foi possível gerar a descrição com IA.\n\nVerifique sua conexão e tente novamente.');
    } finally {
      setIaLoading(null);
    }
  }

  async function revisarOrtografia() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('Sem conexão com a internet.\n\nA revisão ortográfica com IA precisa de internet.');
      return;
    }
    const ta = document.getElementById('pmrv_relatorio_edit');
    if (!ta || !ta.value.trim()) {
      alert('O relatório está vazio.');
      return;
    }
    // Chave padrão no servidor; obterChaveIA() retorna override opcional (🔑).
    const apiKey = obterChaveIA();
    setReviewLoading(true);
    try {
      const res = await callGroq({ apiKey, prompt: reviewReportPrompt(ta.value), temperature: 0 });
      if (res.error === 'auth') {
        if (window.confirm('Chave da API inválida ou sem permissão.\n\nDeseja informar outra chave agora?')) obterChaveIA(true);
      } else if (res.error === 'quota') {
        alert('Cota da API excedida no momento.\n\nAguarde alguns minutos e tente novamente.');
      } else if (res.text) {
        const resultado = extractJSON(res.text);
        const correcoes = Array.isArray(resultado.correcoes) ? resultado.correcoes : [];
        if (correcoes.length === 0 || !resultado.texto_corrigido) {
          alert('✓ Revisão concluída: nenhum erro encontrado.');
          return;
        }
        const lista = correcoes.map((c) => '• ' + c).join('\n');
        if (window.confirm(`A IA encontrou ${correcoes.length} correção(ões):\n\n${lista}\n\nAplicar as correções ao relatório?`)) {
          setManualEdit(true);
          setManualText(resultado.texto_corrigido);
        }
      }
    } catch (err) {
      console.error('Erro na revisão ortográfica IA:', err);
      alert('Não foi possível concluir a revisão com IA.\n\nVerifique sua conexão e tente novamente.');
    } finally {
      setReviewLoading(false);
    }
  }

  function onRelatorioEdit(e) {
    setManualEdit(true);
    setManualText(e.target.value);
  }

  function enviarWhatsApp() {
    window.open('https://wa.me/?text=' + encodeURIComponent(finalReport), '_blank');
    showToast('Abrindo WhatsApp...', 'info', 1500);
  }

  function copiarPMSC() {
    const cleanText = finalReport.replace(/\*/g, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText).then(
        () => showToast('Relatório copiado para a área de transferência', 'success', 2500),
        () => alert('Erro ao copiar. Por favor, selecione o texto e copie manualmente.')
      );
    } else {
      alert('Seu navegador não permite cópia automática. Selecione o texto e copie manualmente.');
    }
  }

  function previewText() {
    const dataFato = dataFatoFieldValue(form.dataFato);
    const horaComunicacao = addMinutosHora(form.horaFato, 15);
    const horaAtendimento = addMinutosHora(form.horaFato, 30);
    return [
      'PRÉVIA DO ACIDENTE',
      '',
      `Protocolo Ocorrência: ${form.sade || '---'}`,
      '',
      'Dados Básicos',
      `Rodovia: ${form.rodovia || '---'}`,
      `Km: ${form.km || '---'}`,
      `Ponto de referência: ${form.pontoReferencia || '---'}`,
      `Município: ${form.cidade || '---'}`,
      '',
      'Data e Horário da Ocorrência',
      `Fato: ${dataFato} ${form.horaFato || '---'}`,
      `Comunicação: ${dataFato} ${horaComunicacao || '---'}`,
      `Atendimento: ${dataFato} ${horaAtendimento || '---'}`,
      '',
      'Números',
      `Mortos: ${form.qtdGravissima || 0}`,
      `Feridos graves: ${form.qtdGrave || 0}`,
      `Feridos leves: ${form.qtdLeve || 0}`,
      `Ilesos: ${form.ilesos || 0}`,
      `Veículos envolvidos: ${form.veiculosEnvolvidos || 0}`,
      '',
      'Natureza e Dinâmica',
      `Natureza: ${form.ocorrencia || '---'}`,
      `Dinâmica do Sinistro: ${subtipoLabel(form)}`,
    ].join('\n');
  }

  function copiarPreview() {
    const texto = previewText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        () => showToast('Prévia copiada para a área de transferência', 'success', 2500),
        () => alert('Erro ao copiar. Por favor, selecione o texto e copie manualmente.')
      );
    } else {
      alert('Seu navegador não permite cópia automática. Selecione o texto e copie manualmente.');
    }
  }

  function copiarEEnviarPreviewWhatsApp() {
    const texto = previewText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).catch(() => {});
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
    showToast('Prévia copiada. Abrindo WhatsApp...', 'info', 2000);
  }

  function limpar() {
    if (window.confirm('Deseja iniciar uma nova ocorrência? Todos os dados serão perdidos.')) {
      const savedVtr = localStorage.getItem('PMRV_VTR') || form.vtr || '';
      const stamp = nowFato();
      setForm({ ...INITIAL, vtr: savedVtr, ...stamp });
      setManualEdit(false);
      setManualText('');
      setStep(1);
      showToast('Nova ocorrência iniciada', 'warning', 1500);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 relative overflow-hidden">
      <Stepper currentStep={step} ehVitima={ehVitima} />

      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className="btn-outline w-full mb-4 flex items-center justify-center gap-2"
      >
        📋 Prévia do Acidente
      </button>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="ds-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ds-section-title">
              <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">
                Prévia do Acidente
              </h2>
              <button type="button" onClick={() => setShowPreview(false)} className="ds-icon-btn" title="Fechar" aria-label="Fechar prévia">
                ✕
              </button>
            </div>

            <div>
              <label className="ds-label">Protocolo Ocorrência</label>
              <input value={form.sade} onChange={(e) => set({ sade: formatSade(e.target.value) })} className="ds-input" />
            </div>

            <h3 className="font-mono font-semibold text-sm uppercase tracking-tight text-pmrv mt-4 mb-2 border-b border-charcoal/30 pb-1">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ds-label">Rodovia</label>
                <input value={form.rodovia} onChange={(e) => set({ rodovia: e.target.value })} className="ds-input" />
              </div>
              <div>
                <label className="ds-label">Km</label>
                <input value={form.km} onChange={(e) => set({ km: formatKM(e.target.value) })} className="ds-input" />
              </div>
              <div className="col-span-2">
                <label className="ds-label">Ponto de referência</label>
                <input value={form.pontoReferencia} onChange={(e) => set({ pontoReferencia: e.target.value })} className="ds-input" />
              </div>
              <div className="col-span-2">
                <label className="ds-label">Município</label>
                <input value={form.cidade} onChange={(e) => set({ cidade: e.target.value })} className="ds-input" />
              </div>
            </div>

            <h3 className="font-mono font-semibold text-sm uppercase tracking-tight text-pmrv mt-4 mb-2 border-b border-charcoal/30 pb-1">Data e Horário da Ocorrência</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center font-mono text-[10px] uppercase text-gold">Fato</div>
              <div className="text-center font-mono text-[10px] uppercase text-gold">Comunicação</div>
              <div className="text-center font-mono text-[10px] uppercase text-gold">Atendimento</div>
              <input value={dataFatoFieldValue(form.dataFato)} readOnly disabled placeholder="dd/mm/aaaa" className="ds-input text-center bg-bone/60" />
              <input value={dataFatoFieldValue(form.dataFato)} readOnly disabled placeholder="dd/mm/aaaa" className="ds-input text-center bg-bone/60" />
              <input value={dataFatoFieldValue(form.dataFato)} readOnly disabled placeholder="dd/mm/aaaa" className="ds-input text-center bg-bone/60" />
              <input value={form.horaFato} readOnly disabled placeholder="hh:mm" className="ds-input text-center bg-bone/60" />
              <input value={addMinutosHora(form.horaFato, 15)} readOnly disabled placeholder="hh:mm" className="ds-input text-center bg-bone/60" />
              <input value={addMinutosHora(form.horaFato, 30)} readOnly disabled placeholder="hh:mm" className="ds-input text-center bg-bone/60" />
            </div>

            <h3 className="font-mono font-semibold text-sm uppercase tracking-tight text-pmrv mt-4 mb-2 border-b border-charcoal/30 pb-1">Números</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ds-label">Mortos</label>
                <input type="number" min={0} value={form.qtdGravissima} onChange={(e) => set({ qtdGravissima: e.target.value })} className="ds-input text-center" />
              </div>
              <div>
                <label className="ds-label">Feridos graves</label>
                <input type="number" min={0} value={form.qtdGrave} onChange={(e) => set({ qtdGrave: e.target.value })} className="ds-input text-center" />
              </div>
              <div>
                <label className="ds-label">Feridos leves</label>
                <input type="number" min={0} value={form.qtdLeve} onChange={(e) => set({ qtdLeve: e.target.value })} className="ds-input text-center" />
              </div>
              <div>
                <label className="ds-label">Ilesos</label>
                <input type="number" min={0} value={form.ilesos} onChange={(e) => set({ ilesos: e.target.value })} className="ds-input text-center" />
              </div>
              <div className="col-span-2">
                <label className="ds-label">Veículos envolvidos</label>
                <input type="number" min={0} value={form.veiculosEnvolvidos} onChange={(e) => set({ veiculosEnvolvidos: e.target.value })} className="ds-input text-center" />
              </div>
            </div>

            <h3 className="font-mono font-semibold text-sm uppercase tracking-tight text-pmrv mt-4 mb-2 border-b border-charcoal/30 pb-1">Natureza e Dinâmica</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="ds-label">Natureza</label>
                <input value={form.ocorrencia} readOnly disabled className="ds-input bg-bone/60" />
              </div>
              <div>
                <label className="ds-label">Dinâmica do Sinistro</label>
                <input value={subtipoLabel(form)} readOnly disabled className="ds-input bg-bone/60" />
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <button onClick={copiarPreview} className="btn-outline w-full flex items-center justify-center gap-2">
                <CopyIcon />
                Copiar
              </button>
              <button onClick={copiarEEnviarPreviewWhatsApp} className="ds-btn-whatsapp w-full flex items-center justify-center gap-2">
                <WhatsAppIcon />
                Copiar e Enviar pelo WhatsApp
              </button>
              <button onClick={() => setShowPreview(false)} className="btn-ios w-full">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* PASSO 1 — IDENTIFICAÇÃO */}
      {step === 1 && (
        <section className="ds-card">
          <div className="ds-section-title">
            <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">
              <span className="text-gold">1.</span> Identificação
            </h2>
            <button type="button" onClick={() => startRecognition(onVoiceStep1)} className="ds-icon-btn" title="Preencher por voz (Diga: Protocolo..., Viatura..., Conhecimento...)">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
            </button>
          </div>

          <div>
            <label className="ds-label">Protocolo SADE</label>
            <input
              value={form.sade}
              placeholder="Ex: 1234567"
              inputMode="numeric"
              maxLength={9}
              onChange={(e) => set({ sade: formatSade(e.target.value) })}
              className="ds-input"
            />
          </div>
          <div>
            <label className="ds-label">Viatura (PM-XXXX)</label>
            <input
              value={form.vtr}
              placeholder="Ex: 1234"
              onChange={(e) => set({ vtr: formatVtr(e.target.value) })}
              className="ds-input text-lg font-mono font-semibold tracking-widest uppercase"
            />
          </div>
          <div>
            <label className="ds-label">Data do Sinistro</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="dd/mm/aaaa"
              maxLength={10}
              value={dataFatoFieldValue(form.dataFato)}
              onChange={(e) => {
                const masked = maskDataFatoBr(e.target.value);
                set({ dataFato: parseDataFatoBr(masked) || masked });
              }}
              className="ds-input font-mono"
              aria-label="Data do sinistro no formato dia, mês e ano"
            />
          </div>
          <div>
            <label className="ds-label">Hora do Sinistro</label>
            <div className="flex gap-4 p-3 bg-bone border-2 border-charcoal">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pmrv_hora_tipo"
                  checked={form.horaTipo === 'auto'}
                  onChange={() => {
                    const n = nowFato();
                    set({
                      horaTipo: 'auto',
                      horaFato: n.horaFato,
                      dataFato: form.dataFato || n.dataFato,
                    });
                  }}
                  className="w-4 h-4 text-pmrv focus:ring-gold"
                />
                <span className="text-sm">Capturada</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pmrv_hora_tipo"
                  checked={form.horaTipo === 'manual'}
                  onChange={() => set({ horaTipo: 'manual' })}
                  className="w-4 h-4 text-pmrv focus:ring-gold"
                />
                <span className="text-sm">Manual</span>
              </label>
            </div>
            {form.horaTipo === 'auto' && (
              <p className="mt-2 text-[11px] font-mono text-charcoal/70">
                Hora no relatório: {form.horaFato || '---'} (não muda ao gerar)
              </p>
            )}
            {form.horaTipo === 'manual' && (
              <input
                type="time"
                value={form.horaManual}
                onChange={(e) => set({ horaManual: e.target.value })}
                className="ds-input mt-2"
              />
            )}
          </div>
          <div>
            <label className="ds-label">Conhecimento da Ocorrência</label>
            <select value={form.conhecimento} onChange={(e) => set({ conhecimento: e.target.value })} className="ds-input">
              <option value="pela Central">Pela Central</option>
              <option value="por populares">Por Populares</option>
              <option value="pela guarnição">Pela Guarnição</option>
            </select>
          </div>

          {/* GPS: rodovia+KM na malha oficial; endereço via mapa fora dela */}
          <div className="estilo-glass p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono font-semibold uppercase text-sm text-pmrv">Localização por GPS</p>
                <p className="text-[11px] text-charcoal/70">
                  Na rodovia: SC e KM. Fora dela: endereço do mapa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('gps-toggle'))}
                className={`btn-ios text-xs ${gpsOn ? 'bg-gold !border-gold !text-pmrv' : ''}`}
              >
                {gpsOn ? 'GPS Ligado' : 'Ativar GPS'}
              </button>
            </div>

            {gpsInfo?.erro && (
              <p className="mt-2 text-xs font-mono text-brick">{gpsInfo.erro}</p>
            )}
            {gpsOn && !gpsInfo?.erro && gpsInfo?.foraDaRodovia && (
              <div className="mt-2 text-xs font-mono">
                {gpsInfo.endereco ? (
                  <span className="bg-pmrv/10 text-pmrv border border-pmrv/40 px-2 py-1 rounded inline-block">
                    {gpsInfo.endereco}
                  </span>
                ) : (
                  <p className="text-charcoal/70">Fora da rodovia. Buscando endereço no mapa…</p>
                )}
              </div>
            )}
            {gpsInfo && !gpsInfo.foraDaRodovia && gpsInfo.rodovia && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-pmrv/10 text-pmrv border border-pmrv/40 px-2 py-1 rounded">
                  Rodovia: <b>{rodoviaLabel(gpsInfo.rodovia) || gpsInfo.rodovia}</b>
                </span>
                <span className="bg-gold/15 text-charcoal border border-gold/50 px-2 py-1 rounded">
                  KM: <b>{Math.round(gpsInfo.km * 1000) / 1000}</b>
                </span>
                <span className="bg-gray-100 text-charcoal/70 px-2 py-1 rounded">
                  ±{Math.round(gpsInfo.dist)} m
                </span>
              </div>
            )}
            {gpsOn && (
              <label className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-charcoal/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoKmGps}
                  onChange={(e) => setAutoKmGps(e.target.checked)}
                  className="cursor-pointer"
                />
                Preencher Rodovia/KM/Cidade automaticamente com a leitura do GPS
              </label>
            )}
            {gpsInfo && gpsInfo.lat != null && (
              <p className="mt-2 text-[10px] font-mono text-charcoal/60">
                Lat {gpsInfo.lat.toFixed(5)} · Lon {gpsInfo.lon.toFixed(5)}
                {mapsUrl(gpsInfo.lat, gpsInfo.lon) ? (
                  <>
                    {' · '}
                    <a
                      href={mapsUrl(gpsInfo.lat, gpsInfo.lon)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-pmrv"
                    >
                      Ver no mapa
                    </a>
                  </>
                ) : null}
              </p>
            )}
          </div>

          <button onClick={nextStep} className="btn-ios w-full text-sm">
            Próximo
            <ArrowRightIcon />
          </button>
        </section>
      )}

      {/* PASSO 2 — LOCALIZAÇÃO */}
      {step === 2 && (
        <section className="ds-card">
          <div className="ds-section-title">
            <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">
              <span className="text-gold">2.</span> Localização
            </h2>
            <button type="button" onClick={() => startRecognition(onVoiceStep2)} className="ds-icon-btn" title="Preencher por voz (Diga: Rodovia..., KM...)" aria-label="Preencher localização por voz">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">Rodovia</label>
              <select value={form.rodovia} onChange={(e) => onRodoviaChange(e.target.value)} className="ds-input font-mono font-semibold text-sm sm:text-base">
                {rodoviasDoSeletor(form.rodovia).map((grupo) => (
                  <optgroup key={grupo.grupo} label={grupo.grupo}>
                    {grupo.itens.map((r) => (
                      <option key={r} value={r}>{rodoviaLabel(r)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="ds-label">KM</label>
              <input
                value={form.km}
                placeholder="Informe o KM"
                onChange={(e) => set({ km: e.target.value })}
                className="ds-input text-center font-mono font-semibold text-sm sm:text-base"
              />
            </div>
          </div>
          <div>
            <label className="ds-label">Cidade</label>
            {cidadeLocked ? (
              <input value={form.cidade} readOnly className="ds-input bg-gray-50 text-gray-500" />
            ) : (
              <input value={form.cidade} onChange={(e) => set({ cidade: capitalizarFrase(e.target.value) })} className="ds-input bg-gray-50" />
            )}
            {showCidade407 && (
              <select value={form.cidade} onChange={(e) => onCidadeSelect(e.target.value)} className="ds-input mt-2 bg-bone border-gold">
                {CIDADES_407.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {showCidade281 && (
              <select value={form.cidade} onChange={(e) => onCidadeSelect(e.target.value)} className="ds-input mt-2 bg-bone border-gold">
                {CIDADES_281.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="ds-label">Sentido da Via</label>
            <select value={form.sentido} onChange={(e) => onSentidoChange(e.target.value)} className="ds-input">
              <option value="Crescente">Crescente</option>
              <option value="Decrescente">Decrescente</option>
              <option value="Centro–Bairro">Centro–Bairro</option>
              <option value="Bairro–Centro">Bairro–Centro</option>
              <option value="Norte–Sul">Norte–Sul</option>
              <option value="Sul–Norte">Sul–Norte</option>
              <option value="MANUAL">Outro (Digitar manualmente)</option>
            </select>
            {form.sentido === 'MANUAL' && (
              <input
                value={form.sentidoManual}
                placeholder="Ex: Sentido Palhoça"
                onChange={(e) => set({ sentidoManual: capitalizarFrase(e.target.value) })}
                className="ds-input mt-2"
              />
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={prevStep} className="btn-outline flex-1">Voltar</button>
            <button onClick={nextStep} className="btn-ios flex-[2]">Próximo</button>
          </div>
        </section>
      )}

      {/* PASSO 3 — NATUREZA E DINÂMICA */}
      {step === 3 && (
        <section className="ds-card">
          <div className="ds-section-title">
            <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">
              <span className="text-gold">3.</span> Natureza e Dinâmica
            </h2>
            <button type="button" onClick={() => startRecognition(onVoiceAppend('pmrv_dinamica_texto'))} className="ds-icon-btn" title="Gravar por voz" aria-label="Gravar dinâmica por voz">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
            </button>
          </div>

          <div>
            <label className="ds-label">Classificação</label>
            <select
              value={form.ocorrencia}
              onChange={(e) => onOcorrenciaChange(e.target.value)}
              className="ds-input bg-bone border-pmrv text-pmrv font-mono font-semibold"
            >
              <option value={DANOS}>APENAS DANOS MATERIAIS</option>
              <option value={VITIMA}>COM VÍTIMA(S)</option>
            </select>
          </div>

          <div>
            <label className="ds-label">Dinâmica do Sinistro</label>
            <select value={form.subtipo} onChange={(e) => onSubtipoChange(e.target.value)} className="ds-input">
              {Object.entries(grupoSubtipos).map(([grupo, opts]) => (
                <optgroup key={grupo} label={grupo}>
                  {opts.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {form.subtipo === '4.9' && (
            <div>
              <label className="ds-label">Qual objeto?</label>
              <input value={form.objeto} placeholder="Ex: árvore, poste..." onChange={(e) => onObjetoChange(e.target.value)} className="ds-input bg-bone border-gold" />
            </div>
          )}
          {form.subtipo === '8.1' && (
            <div>
              <label className="ds-label">Especifique</label>
              <input value={form.outros} placeholder="Natureza da ocorrência..." onChange={(e) => onOutrosChange(e.target.value)} className="ds-input bg-bone border-gold" />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="ds-label mb-0">Descrição da Dinâmica (Editável)</label>
              <button
                type="button"
                onClick={() => {
                  try {
                    const raw = localStorage.getItem('PMRV_RESUMO_DINAMICA');
                    const data = raw ? JSON.parse(raw) : null;
                    const texto = (data && typeof data.resumo === 'string' ? data.resumo : '').trim();
                    if (!texto) {
                      alert('Nenhum resumo da dinâmica disponível.');
                      return;
                    }
                    if (typeof window !== 'undefined' && window.confirm('Deseja substituir a dinâmica atual pelo resumo salvo?')) {
                      set({ dinamica: texto });
                      showToast('Resumo importado', 'success', 1500);
                    }
                  } catch (e) {
                    alert('Não foi possível carregar o resumo da dinâmica.');
                  }
                }}
                className="btn-outline p-1 text-xs leading-none"
                title="Importar resumo salvo na aba Resumo da Dinâmica"
              >
                📥 Importar Resumo
              </button>
            </div>
            <div className="mb-2">
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-gold mb-1">Descrição IA</span>
              <div className="flex gap-2">
                {[
                  { id: 'juridica', label: 'Jurídica' },
                  { id: 'leiga', label: 'Leiga' },
                  { id: 'tecnica', label: 'Técnica' },
                ].map((estilo) => (
                  <button
                    key={estilo.id}
                    disabled={iaLoading !== null}
                    onClick={() => gerarDescricaoIA(estilo.id)}
                    className="btn-outline flex-1 text-xs disabled:opacity-50"
                  >
                    {iaLoading === estilo.id ? 'Gerando…' : estilo.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="pmrv_dinamica_texto"
              rows={4}
              value={form.dinamica}
              onChange={(e) => set({ dinamica: capitalizarFrase(e.target.value) })}
              className="w-full p-3 bg-white border-2 border-charcoal focus:ring-2 focus:ring-gold outline-none transition leading-relaxed"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={prevStep} className="btn-outline flex-1">Voltar</button>
            <button onClick={nextStep} className="btn-ios flex-[2]">Próximo</button>
          </div>
        </section>
      )}

      {/* PASSO 4 — VÍTIMAS */}
      {step === 4 && (
        <section className="ds-card-danger">
          <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-brick mb-4 border-b-2 border-brick pb-3">
            <span className="text-pmrv">4.</span> Vítimas
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="ds-label text-center">Leves</label>
              <input type="number" min={0} value={form.qtdLeve} onChange={(e) => set({ qtdLeve: e.target.value })} className="ds-input text-center font-mono font-semibold text-lg" />
            </div>
            <div>
              <label className="ds-label text-gold text-center">Graves</label>
              <input type="number" min={0} value={form.qtdGrave} onChange={(e) => set({ qtdGrave: e.target.value })} className="ds-input bg-bone border-gold text-center font-mono font-semibold text-lg text-charcoal" />
            </div>
            <div>
              <label className="ds-label text-brick text-center">Óbitos</label>
              <input type="number" min={0} value={form.qtdGravissima} onChange={(e) => set({ qtdGravissima: e.target.value })} className="ds-input bg-[#fde8e8] border-brick text-center font-mono font-semibold text-lg text-brick" />
            </div>
          </div>

          <h3 className="font-mono font-semibold text-sm uppercase tracking-tight text-brick mt-5 mb-2 border-b border-brick/30 pb-1">
            Atendimento Pré-Hospitalar
          </h3>
          <div className="space-y-3">
            <div>
              <label className="ds-label">Vítima</label>
              {envolvidosSalvos.length > 0 ? (
                <select
                  value={form.vitimaEnvolvido}
                  onChange={(e) => set({ vitimaEnvolvido: e.target.value })}
                  className="ds-input"
                >
                  <option value="">Não especificar</option>
                  {envolvidosSalvos.map((ev) => (
                    <option key={ev.id} value={ev.nome}>
                      {ev.nome}{ev.placa ? ` — ${ev.placa}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-charcoal/50 font-mono">
                  Nenhum envolvido cadastrado ainda na aba Envolvidos.
                </p>
              )}
            </div>
            <div>
              <label className="ds-label">Viatura de atendimento</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'ASU', label: 'ASU (Bombeiro)' },
                  { value: 'BRAVO', label: 'Bravo (SAMU)' },
                  { value: 'OUTROS', label: 'Outros' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded border cursor-pointer ${
                      form.atendimentoViatura === opt.value
                        ? 'border-pmrv bg-pmrv/10 text-pmrv font-semibold'
                        : 'border-charcoal/20 text-charcoal/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="atendimentoViatura"
                      value={opt.value}
                      checked={form.atendimentoViatura === opt.value}
                      onChange={() => set({ atendimentoViatura: opt.value })}
                      className="cursor-pointer"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {(form.atendimentoViatura === 'ASU' || form.atendimentoViatura === 'BRAVO') && (
              <div>
                <label className="ds-label">
                  Número da viatura ({form.atendimentoViatura === 'ASU' ? 'ASU-Número' : 'Bravo-Número'})
                </label>
                <input
                  value={form.atendimentoNumero}
                  onChange={(e) => set({ atendimentoNumero: e.target.value.replace(/\D/g, '') })}
                  placeholder="Ex: 12"
                  inputMode="numeric"
                  className="ds-input"
                />
              </div>
            )}

            {form.atendimentoViatura === 'OUTROS' && (
              <div>
                <label className="ds-label">Descreva a viatura/serviço de atendimento</label>
                <input
                  value={form.atendimentoOutrosDescricao}
                  onChange={(e) => set({ atendimentoOutrosDescricao: capitalizarFrase(e.target.value) })}
                  placeholder="Ex: Viatura particular, Corpo de Bombeiros Voluntários..."
                  className="ds-input"
                />
              </div>
            )}

            <div>
              <label className="ds-label">Tipo de lesão</label>
              <label className="flex items-center gap-2 text-xs font-mono mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.lesaoNaoEspecificada}
                  onChange={(e) => set({ lesaoNaoEspecificada: e.target.checked })}
                  className="cursor-pointer"
                />
                Não especificado
              </label>
              {!form.lesaoNaoEspecificada && (
                <input
                  value={form.lesaoDescricao}
                  onChange={(e) => set({ lesaoDescricao: capitalizarFrase(e.target.value) })}
                  placeholder="Descreva o tipo de lesão"
                  className="ds-input"
                />
              )}
            </div>

            <div>
              <label className="ds-label">Destino da vítima</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { value: 'local', label: 'Liberado no local' },
                  { value: 'hospital', label: 'Encaminhado ao hospital' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded border cursor-pointer ${
                      form.destinoVitima === opt.value
                        ? 'border-pmrv bg-pmrv/10 text-pmrv font-semibold'
                        : 'border-charcoal/20 text-charcoal/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="destinoVitima"
                      value={opt.value}
                      checked={form.destinoVitima === opt.value}
                      onChange={() => set({ destinoVitima: opt.value })}
                      className="cursor-pointer"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {form.destinoVitima === 'hospital' && (
              <div>
                <label className="ds-label">Hospital</label>
                <select
                  value={form.hospitalDestino}
                  onChange={(e) => set({ hospitalDestino: e.target.value })}
                  className="ds-input"
                >
                  <option value="">Selecione…</option>
                  {PMRV_HOSPITAIS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={prevStep} className="btn-outline flex-1">Voltar</button>
            <button onClick={nextStep} className="btn-ios flex-[2]">Próximo</button>
          </div>
        </section>
      )}

      {/* PASSO 5 — REVISÃO FINAL */}
      {step === 5 && (
        <section className="ds-card">
          <div className="ds-section-title">
            <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">
              <span className="text-gold">✓</span> Revisão e Edição Final
            </h2>
            <button type="button" onClick={() => startRecognition(onVoiceAppend('pmrv_relatorio_edit'))} className="ds-icon-btn" title="Adicionar por voz" aria-label="Adicionar ao relatório por voz">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
            </button>
          </div>
          <div className="mb-4">
            <label className="ds-label">Irregularidade na documentação</label>
            <div className="grid grid-cols-1 gap-2 mb-4">
              {[
                { value: 'nenhuma', label: 'Sem irregularidade (padrão)' },
                { value: 'sanada', label: 'Irregularidade SANADA no local' },
                { value: 'nao_sanada', label: 'Irregularidade NÃO SANADA (com remoção)' },
                { value: 'ocultar', label: 'Ocultar este trecho do relatório' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded border cursor-pointer ${
                    form.irregularidade === opt.value
                      ? 'border-pmrv bg-pmrv/10 text-pmrv font-semibold'
                      : 'border-charcoal/20 text-charcoal/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="irregularidade"
                    value={opt.value}
                    checked={form.irregularidade === opt.value}
                    onChange={() => set({ irregularidade: opt.value })}
                    className="cursor-pointer"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="ds-label mb-0">Relatório Completo (Editável)</label>
              <span className="text-[10px] text-charcoal font-mono font-semibold uppercase tracking-wider bg-bone border border-charcoal px-2 py-1">
                Revisão Geral
              </span>
            </div>
            <textarea
              id="pmrv_relatorio_edit"
              rows={14}
              value={finalReport}
              onChange={onRelatorioEdit}
              spellCheck
              className="w-full bg-charcoal text-bone p-4 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-gold transition-all border-2 border-charcoal"
            />
            <button
              id="btn-revisar-ia"
              onClick={revisarOrtografia}
              disabled={reviewLoading}
              aria-busy={reviewLoading}
              className={`btn-ios w-full mt-2 text-xs disabled:opacity-50 ${reviewLoading ? 'is-loading' : ''}`}
            >
              {reviewLoading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" /> Revisando…
                </>
              ) : (
                <>🔍 Revisar Ortografia com IA (Norma Culta)</>
              )}
            </button>
          </div>
          <div className="space-y-3">
            <button onClick={enviarWhatsApp} className="ds-btn-whatsapp w-full">
              <WhatsAppIcon />
              Enviar tudo no WhatsApp
            </button>
            <button onClick={copiarPMSC} className="ds-btn-gold w-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Copiar Relatório p/ Mobile (Limpo)
            </button>
            <div className="flex gap-2 text-sm">
              <button onClick={prevStep} className="btn-outline flex-1">Voltar</button>
              <button onClick={limpar} className="btn-ios flex-1 bg-brick !border-brick">Nova Ocorrência</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
