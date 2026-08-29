'use client';

import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import LimparDados from '@/components/LimparDados';

const STORAGE_KEY = 'PMRV_THEME_CONFIG';

const DEFAULT_THEME = {
  primary: '#008448', // verde PMSC
  accent: '#C8933F', // dourado
  background: '#eaf2fb',
  surface: '#FFFFFF',
  text: '#1e293b',
  mode: 'light', // 'light' | 'dark'
};

const PRESETS = [
  { name: 'PMSC Oficial', primary: '#008448', accent: '#C8933F', background: '#eaf2fb', text: '#1e293b' },
  { name: 'Noturno', primary: '#1a1a2e', accent: '#e94560', background: '#0f0f1a', text: '#eaeaea' },
  { name: 'Azul Policial', primary: '#1e3a8a', accent: '#fbbf24', background: '#eff6ff', text: '#0f172a' },
  { name: 'Alto Contraste', primary: '#000000', accent: '#ff0000', background: '#ffffff', text: '#000000' },
];

function hexToRgba(hex, alpha = 1) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loadTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return DEFAULT_THEME;
}

export default function ThemeConfig({ onClose }) {
  const [theme, setTheme] = useState(loadTheme);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    applyTheme(theme);
  }, []);

  function applyTheme(t) {
    const root = document.documentElement;
    root.style.setProperty('--ds-primary', t.primary);
    root.style.setProperty('--ds-accent', t.accent);
    root.style.setProperty('--ds-bg', t.background);
    root.style.setProperty('--ds-surface', t.surface);
    root.style.setProperty('--ds-text', t.text);

    if (t.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  function update(patch) {
    const next = { ...theme, ...patch };
    setTheme(next);
    applyTheme(next);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportTheme() {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pmrv-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importTheme(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const next = { ...DEFAULT_THEME, ...parsed };
        setTheme(next);
        applyTheme(next);
      } catch (err) {
        alert('Arquivo de tema inválido.');
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  }

  function reset() {
    const next = DEFAULT_THEME;
    setTheme(next);
    applyTheme(next);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="w-full">
      <div className="border-b-2 border-charcoal p-4 flex justify-between items-center">
        <h2 className="text-lg font-mono font-semibold uppercase tracking-tight text-pmrv">Personalizar Tema</h2>
        <button onClick={onClose} className="btn-outline text-xs py-1 px-3" aria-label="Fechar personalização de tema">Fechar</button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="ds-label">Modo</label>
          <div className="flex gap-3" role="radiogroup" aria-label="Modo de cor">
            {['light', 'dark'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => update({ mode })}
                className={`flex-1 py-3 border-2 font-mono text-xs uppercase tracking-wider ${
                  theme.mode === mode ? 'bg-pmrv text-white border-pmrv' : 'bg-white text-charcoal border-charcoal hover:bg-bone'
                }`}
                role="radio"
                aria-checked={theme.mode === mode}
              >
                {mode === 'light' ? 'Claro' : 'Escuro'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="ds-label">Presets</label>
          <div className="grid grid-cols-2 gap-2" role="list" aria-label="Temas predefinidos">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => update(preset)}
                className="flex items-center gap-2 border-2 border-charcoal p-2 hover:bg-bone transition"
                aria-label={`Tema ${preset.name}`}
              >
                <span className="w-5 h-5 rounded-full border-2 border-charcoal" style={{ backgroundColor: preset.primary }} aria-hidden="true" />
                <span className="text-xs font-mono uppercase">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="ds-label">Cor Principal</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={theme.primary}
                onChange={(e) => update({ primary: e.target.value })}
                className="h-10 w-14 border-2 border-charcoal bg-white"
                aria-label="Seletor de cor principal"
              />
              <input
                value={theme.primary}
                onChange={(e) => update({ primary: e.target.value })}
                className="ds-input text-sm flex-1"
                aria-label="Cor principal em hexadecimal"
              />
            </div>
          </div>
          <div>
            <label className="ds-label">Cor de Destaque</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={theme.accent}
                onChange={(e) => update({ accent: e.target.value })}
                className="h-10 w-14 border-2 border-charcoal bg-white"
                aria-label="Seletor de cor de destaque"
              />
              <input
                value={theme.accent}
                onChange={(e) => update({ accent: e.target.value })}
                className="ds-input text-sm flex-1"
                aria-label="Cor de destaque em hexadecimal"
              />
            </div>
          </div>
          <div>
            <label className="ds-label">Fundo</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={theme.background}
                onChange={(e) => update({ background: e.target.value })}
                className="h-10 w-14 border-2 border-charcoal bg-white"
                aria-label="Seletor de cor de fundo"
              />
              <input
                value={theme.background}
                onChange={(e) => update({ background: e.target.value })}
                className="ds-input text-sm flex-1"
                aria-label="Cor de fundo em hexadecimal"
              />
            </div>
          </div>
          <div>
            <label className="ds-label">Texto</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={theme.text}
                onChange={(e) => update({ text: e.target.value })}
                className="h-10 w-14 border-2 border-charcoal bg-white"
                aria-label="Seletor de cor de texto"
              />
              <input
                value={theme.text}
                onChange={(e) => update({ text: e.target.value })}
                className="ds-input text-sm flex-1"
                aria-label="Cor de texto em hexadecimal"
              />
            </div>
          </div>
        </div>

        <div className="border-2 border-charcoal p-3 bg-bone">
          <p className="text-xs font-mono uppercase tracking-wider text-charcoal mb-2">Pré-visualização</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 border-2 border-charcoal text-xs font-mono" style={{ backgroundColor: theme.primary, color: '#fff' }}>Principal</span>
            <span className="px-2 py-1 border-2 border-charcoal text-xs font-mono" style={{ backgroundColor: theme.accent, color: '#000' }}>Destaque</span>
            <span className="px-2 py-1 border-2 border-charcoal text-xs font-mono" style={{ backgroundColor: theme.background, color: theme.text }}>Fundo</span>
            <span className="px-2 py-1 border-2 border-charcoal text-xs font-mono" style={{ backgroundColor: theme.surface, color: theme.text }}>Superfície</span>
          </div>
        </div>

        <div className="border-2 border-brick p-3 bg-[#F9ECE9]">
          <p className="text-xs font-mono uppercase tracking-wider text-brick mb-1">Dados e cache</p>
          <p className="text-[11px] font-mono text-charcoal/70 mb-3">
            Remove rascunhos, fotos dos envolvidos, resumos e o cache do aplicativo para não acumular no aparelho. Tema, VTR e chaves ficam salvos.
          </p>
          <LimparDados />
        </div>
      </div>

      <div className="border-t-2 border-charcoal p-4 flex flex-col sm:flex-row gap-2">
        <button onClick={save} className="btn-ios flex-1 text-xs">
          {saved ? 'Salvo!' : 'Salvar Tema'}
        </button>
        <button onClick={exportTheme} className="btn-outline flex-1 text-xs">Exportar JSON</button>
        <label className="btn-outline flex-1 text-xs text-center cursor-pointer">
          Importar JSON
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importTheme} />
        </label>
        <button onClick={reset} className="btn-outline flex-1 text-xs border-brick text-brick">Resetar</button>
      </div>
    </div>
  );
}
