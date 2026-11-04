'use client';

import { useCallback, useEffect, useState } from 'react';
import { CopyIcon, DownloadIcon, SaveIcon, WhatsAppIcon } from './icons';
import { generateReport, envolvidosText } from '@/lib/pmrv';
import { montarDossie, baixarJSON, hashJSON } from '@/lib/ocorrencia';
import { listarHistoricoIDB, excluirOcorrenciaHistoricoIDB } from '@/lib/idb';
import { useOcorrencia } from './OcorrenciaProvider';
import { showToast } from './Toast';
import LimparDados from './LimparDados';

/** Linha-resumo do card do histórico. */
function resumoHistorico(o) {
  const form = (o && o.relato && o.relato.form) || {};
  const sade = form.sade ? `SADE ${form.sade}` : 'SADE ---';
  const trecho = [form.rodovia, form.km ? `KM ${form.km}` : ''].filter(Boolean).join(' ');
  const n = Array.isArray(o.envolvidos) ? o.envolvidos.length : 0;
  return [sade, trecho || 'sem local', `${n} envolvido${n === 1 ? '' : 's'}`].join(' · ');
}

function rotuloData(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR');
}

export default function SalvarOcorrencia() {
  const { doc, pronto, restaurarOcorrencia } = useOcorrencia();
  const [report, setReport] = useState('');
  const [hash, setHash] = useState('');
  const [historico, setHistorico] = useState([]);

  const recarregar = useCallback(() => {
    if (!doc) {
      setReport('');
      return;
    }
    setReport(montarDossie({ generateReport, envolvidosText }, doc));
  }, [doc]);

  const carregarHistorico = useCallback(() => {
    const idb = typeof indexedDB !== 'undefined' ? indexedDB : null;
    listarHistoricoIDB(idb).then((lista) => {
      const ordenada = [...lista].sort((a, b) => String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')));
      setHistorico(ordenada);
    });
  }, []);

  useEffect(() => {
    recarregar();
    window.addEventListener('pmrv-ocorrencia-changed', recarregar);
    return () => window.removeEventListener('pmrv-ocorrencia-changed', recarregar);
  }, [recarregar]);

  useEffect(() => {
    if (pronto) carregarHistorico();
    window.addEventListener('pmrv-ocorrencia-changed', carregarHistorico);
    return () => window.removeEventListener('pmrv-ocorrencia-changed', carregarHistorico);
  }, [pronto, carregarHistorico]);

  // Hash de integridade do backup (SHA-256 do documento exatamente como exportado).
  useEffect(() => {
    let vivo = true;
    if (!doc) {
      setHash('');
      return;
    }
    hashJSON(doc).then((h) => {
      if (vivo) setHash(h || '');
    });
    return () => {
      vivo = false;
    };
  }, [doc]);

  function enviarWhatsApp() {
    if (!report.trim()) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(report), '_blank');
    showToast('Abrindo WhatsApp...', 'info', 1500);
  }

  function copiarPMSC() {
    if (!report.trim()) return;
    const cleanText = report.replace(/\*/g, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText).then(
        () => showToast('Dossiê copiado para a área de transferência', 'success', 2500),
        () => alert('Erro ao copiar. Por favor, selecione o texto e copie manualmente.')
      );
    } else {
      alert('Seu navegador não permite cópia automática. Selecione o texto e copie manualmente.');
    }
  }

  function exportarJSON() {
    if (!doc) return;
    baixarJSON(doc, `ocorrencia-${doc.id}.json`);
    showToast('Backup JSON exportado', 'success', 2000);
  }

  function restaurar(item) {
    if (!item) return;
    if (
      window.confirm(
        `Restaurar a ocorrência arquivada (${resumoHistorico(item)})?\n\nA ocorrência atual será arquivada no histórico antes da troca.`
      )
    ) {
      restaurarOcorrencia(item);
      showToast('Ocorrência restaurada do histórico', 'success', 2500);
    }
  }

  async function excluir(item) {
    if (!item) return;
    if (window.confirm(`Excluir do histórico a ocorrência ${resumoHistorico(item)}? Esta ação não pode ser desfeita.`)) {
      const idb = typeof indexedDB !== 'undefined' ? indexedDB : null;
      await excluirOcorrenciaHistoricoIDB(idb, item.id);
      carregarHistorico();
      showToast('Ocorrência excluída do histórico', 'info', 2000);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-3 sm:p-4">
      <h2 className="text-base sm:text-lg font-mono font-semibold uppercase tracking-tight text-pmrv mb-4">
        Salvar ocorrência
      </h2>
      <p className="estilo-glass text-[13px] leading-relaxed text-charcoal/80 font-mono mb-4 p-3">
        O dossiê junta num texto só: relatório + envolvidos + resumo da dinâmica + danos. Data e hora vazias aparecem como --- — não são inventadas.
      </p>

      {!pronto ? (
        <div className="bg-surface border-2 border-dashed border-charcoal p-6 text-center font-mono text-xs text-charcoal">
          Carregando ocorrência…
        </div>
      ) : !report.trim() ? (
        <div className="bg-surface border-2 border-dashed border-charcoal p-6 sm:p-8 text-center font-mono text-xs sm:text-sm text-charcoal">
          <SaveIcon className="w-8 h-8 text-pmrv mx-auto mb-2" />
          Ainda não há conteúdo. Preencha o Relato, os Envolvidos ou o Resumo.
        </div>
      ) : (
        <section className="ds-card">
          <div className="flex justify-between items-center mb-2">
            <label className="ds-label mb-0">Dossiê completo</label>
            <span className="text-xs text-charcoal font-mono font-semibold uppercase tracking-wider bg-bone border border-charcoal px-2 py-1">
              Pronto para enviar
            </span>
          </div>
          <textarea
            readOnly
            rows={14}
            value={report}
            className="w-full bg-charcoal text-bone p-4 font-mono text-xs leading-relaxed outline-none border-2 border-charcoal"
            aria-label="Dossiê completo da ocorrência"
          />
          {hash && (
            <p className="text-xs font-mono text-charcoal mt-1 break-all" title="SHA-256 do documento exportado em JSON">
              SHA-256 do backup: {hash}
            </p>
          )}
          <div className="space-y-3 mt-3">
            <button type="button" onClick={enviarWhatsApp} className="ds-btn-whatsapp w-full">
              <WhatsAppIcon />
              Enviar tudo no WhatsApp
            </button>
            <button type="button" onClick={copiarPMSC} className="ds-btn-gold w-full">
              <CopyIcon />
              Copiar Dossiê p/ Mobile (Limpo)
            </button>
            <button type="button" onClick={exportarJSON} className="btn-outline w-full text-xs py-3 active:scale-95">
              <span className="inline-flex items-center gap-1.5"><DownloadIcon className="w-4 h-4" /> Exportar backup (.json)</span>
            </button>
          </div>
        </section>
      )}

      {pronto && historico.length > 0 && (
        <section className="ds-card mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="ds-label mb-0">Histórico ({historico.length})</label>
            <span className="text-xs text-charcoal font-mono uppercase tracking-wider bg-bone border border-charcoal px-2 py-1">
              arquivadas pelo botão Nova
            </span>
          </div>
          <ul className="space-y-2">
            {historico.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 border border-charcoal/20 bg-surface p-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-charcoal truncate">{resumoHistorico(o)}</p>
                  <p className="text-xs font-mono text-charcoal">{rotuloData(o.atualizadoEm)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => restaurar(o)}
                    className="btn-outline text-xs py-1 px-2"
                    aria-label={`Restaurar ocorrência ${resumoHistorico(o)}`}
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => excluir(o)}
                    className="btn-outline text-xs py-1 px-2 border-brick text-brick"
                    aria-label={`Excluir do histórico a ocorrência ${resumoHistorico(o)}`}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ds-card-danger mt-4">
        <h3 className="text-sm font-mono font-semibold uppercase tracking-tight text-brick">
          Limpar dados e cache
        </h3>
        <p className="text-xs text-charcoal font-mono">
          Depois de enviar a ocorrência, limpe rascunhos, fotos e o cache do app para não acumular no aparelho. Tema, unidade, VTR e chaves de API são mantidos.
        </p>
        <LimparDados />
      </section>
    </div>
  );
}
