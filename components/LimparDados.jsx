'use client';

import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { limparTodosOsDados } from '@/lib/limpar-dados';

export default function LimparDados({ className = '' }) {
  const [busy, setBusy] = useState(false);

  async function onClear() {
    if (
      !window.confirm(
        'Limpar rascunhos, fotos, resumos e o cache do app?\n\nTema, VTR e chaves de API são mantidos.\nO aplicativo será recarregado.'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await limparTodosOsDados();
      showToast('Dados e cache limpos', 'warning', 1200);
      window.setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível limpar tudo. Tente de novo.', 'error', 2500);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClear}
      disabled={busy}
      aria-busy={busy}
      className={`ds-btn-danger w-full text-xs py-3 active:scale-95 disabled:opacity-60 ${busy ? 'is-loading' : ''} ${className}`}
      aria-label="Limpar todos os dados e o cache do aplicativo"
    >
      {busy ? (
        <>
          <span className="btn-spinner" aria-hidden="true" /> Limpando…
        </>
      ) : (
        '🧹 Limpar dados e cache'
      )}
    </button>
  );
}
