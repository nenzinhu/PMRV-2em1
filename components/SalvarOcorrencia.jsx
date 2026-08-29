'use client';

import { useCallback, useEffect, useState } from 'react';
import { WhatsAppIcon } from './icons';
import { generateReport } from '@/lib/pmrv';
import { RELATO_DRAFT_KEY, parseRelatoDraft } from '@/lib/relato-draft';
import { showToast } from '@/components/Toast';
import LimparDados from '@/components/LimparDados';

function relatorioDoRascunho() {
  if (typeof window === 'undefined') return '';
  const parsed = parseRelatoDraft(localStorage.getItem(RELATO_DRAFT_KEY));
  if (!parsed) return '';
  if (parsed.manualEdit) return parsed.manualText || '';
  return generateReport(parsed.form || {}, true);
}

export default function SalvarOcorrencia() {
  const [report, setReport] = useState('');

  const recarregar = useCallback(() => {
    setReport(relatorioDoRascunho());
  }, []);

  useEffect(() => {
    recarregar();
    window.addEventListener('pmrv-relato-dinamica', recarregar);
    window.addEventListener('storage', recarregar);
    return () => {
      window.removeEventListener('pmrv-relato-dinamica', recarregar);
      window.removeEventListener('storage', recarregar);
    };
  }, [recarregar]);

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
        () => showToast('Relatório copiado para a área de transferência', 'success', 2500),
        () => alert('Erro ao copiar. Por favor, selecione o texto e copie manualmente.')
      );
    } else {
      alert('Seu navegador não permite cópia automática. Selecione o texto e copie manualmente.');
    }
  }

  return (
    <div className="max-w-xl mx-auto p-3 sm:p-4">
      <h2 className="text-base sm:text-lg font-mono font-semibold uppercase tracking-tight text-pmrv mb-4">
        Salvar ocorrência
      </h2>
      <p className="estilo-glass text-xs text-charcoal/70 font-mono mb-4 p-3">
        O relatório usa só o que já está no Relato Policial. O resumo da dinâmica entra no campo Dinâmica ao salvar. Data e hora vazias aparecem como --- — não são inventadas.
      </p>

      {!report.trim() ? (
        <div className="bg-white border-2 border-dashed border-charcoal p-6 sm:p-8 text-center font-mono text-xs sm:text-sm text-charcoal/60">
          <div className="text-3xl mb-2" aria-hidden="true">💾</div>
          Ainda não há rascunho. Preencha o Relato e/ou salve o resumo da dinâmica.
        </div>
      ) : (
        <section className="ds-card">
          <div className="flex justify-between items-center mb-2">
            <label className="ds-label mb-0">Relatório completo</label>
            <span className="text-[10px] text-charcoal font-mono font-semibold uppercase tracking-wider bg-bone border border-charcoal px-2 py-1">
              Pronto para enviar
            </span>
          </div>
          <textarea
            readOnly
            rows={14}
            value={report}
            className="w-full bg-charcoal text-bone p-4 font-mono text-xs leading-relaxed outline-none border-2 border-charcoal"
            aria-label="Relatório completo da ocorrência"
          />
          <div className="space-y-3 mt-3">
            <button type="button" onClick={enviarWhatsApp} className="ds-btn-whatsapp w-full">
              <WhatsAppIcon />
              Enviar tudo no WhatsApp
            </button>
            <button type="button" onClick={copiarPMSC} className="ds-btn-gold w-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Copiar Relatório p/ Mobile (Limpo)
            </button>
          </div>
        </section>
      )}

      <section className="ds-card-danger mt-4">
        <h3 className="text-sm font-mono font-semibold uppercase tracking-tight text-brick">
          Limpar dados e cache
        </h3>
        <p className="text-xs text-charcoal/70 font-mono">
          Depois de enviar a ocorrência, limpe rascunhos, fotos e o cache do app para não acumular no aparelho. Tema, VTR e chaves de API são mantidos.
        </p>
        <LimparDados />
      </section>
    </div>
  );
}
