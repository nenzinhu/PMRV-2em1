'use client';

import { useCallback, useState } from 'react';
import { UsersIcon, ClipboardListIcon, FileReportIcon, SaveIcon } from '@/components/icons';
import { abaInicialDaArea, areaFromAba } from '@/lib/aba';

const AREAS = [
  { key: 'pessoas', label: 'Pessoas', Icon: UsersIcon },
  { key: 'ocorrencia', label: 'Ocorrência', Icon: ClipboardListIcon },
  { key: 'relato', label: 'Relato', Icon: FileReportIcon },
  { key: 'finalizar', label: 'Finalizar', Icon: SaveIcon },
];

const ETAPAS_OCORRENCIA = [
  { key: 'danos', label: 'Danos' },
  { key: 'dinamica', label: 'Dinâmica' },
  { key: 'resumo', label: 'Resumo' },
];

export default function MobileNav({ active, onChange }) {
  const [pressing, setPressing] = useState(null);
  const activeArea = areaFromAba(active);

  const changeArea = useCallback((area) => onChange(abaInicialDaArea(area)), [onChange]);

  const onAreaKeyDown = useCallback(
    (event) => {
      const index = AREAS.findIndex((area) => area.key === activeArea);
      let next = null;
      if (event.key === 'ArrowRight') next = AREAS[(index + 1) % AREAS.length];
      else if (event.key === 'ArrowLeft') next = AREAS[(index - 1 + AREAS.length) % AREAS.length];
      else if (event.key === 'Home') next = AREAS[0];
      else if (event.key === 'End') next = AREAS[AREAS.length - 1];
      if (!next) return;
      event.preventDefault();
      changeArea(next.key);
      event.currentTarget.querySelector(`[data-area="${next.key}"]`)?.focus();
    },
    [activeArea, changeArea]
  );

  const onEtapaKeyDown = useCallback(
    (event) => {
      const index = ETAPAS_OCORRENCIA.findIndex((etapa) => etapa.key === active);
      let next = null;
      if (event.key === 'ArrowRight') next = ETAPAS_OCORRENCIA[(index + 1) % ETAPAS_OCORRENCIA.length];
      else if (event.key === 'ArrowLeft') {
        next = ETAPAS_OCORRENCIA[(index - 1 + ETAPAS_OCORRENCIA.length) % ETAPAS_OCORRENCIA.length];
      } else if (event.key === 'Home') next = ETAPAS_OCORRENCIA[0];
      else if (event.key === 'End') next = ETAPAS_OCORRENCIA[ETAPAS_OCORRENCIA.length - 1];
      if (!next) return;
      event.preventDefault();
      onChange(next.key);
      event.currentTarget.querySelector(`[data-etapa="${next.key}"]`)?.focus();
    },
    [active, onChange]
  );

  const areaProps = (area, mobile) => ({
    role: 'tab',
    id: `pmrv-area-${mobile ? 'mobile' : 'desktop'}-${area.key}`,
    'aria-label': `Aba ${area.label}`,
    'aria-selected': activeArea === area.key,
    'aria-controls': 'pmrv-tabpanel',
    tabIndex: activeArea === area.key ? 0 : -1,
    'data-area': area.key,
  });

  const renderArea = (area, mobile = false) => {
    const selected = activeArea === area.key;
    return (
      <button
        key={area.key}
        type="button"
        {...areaProps(area, mobile)}
        onClick={() => changeArea(area.key)}
        onTouchStart={() => setPressing(area.key)}
        onTouchEnd={() => setPressing(null)}
        onMouseDown={() => setPressing(area.key)}
        onMouseUp={() => setPressing(null)}
        onMouseLeave={() => setPressing(null)}
        className={`${mobile ? 'primary-tab-mobile' : 'primary-tab-desktop'} ${
          selected ? 'primary-tab-active' : ''
        } ${pressing === area.key ? 'tab-press' : ''}`}
      >
        <span className="tab-icon" aria-hidden="true">
          <area.Icon className={mobile ? 'w-5 h-5' : 'w-4 h-4'} />
        </span>
        <span>{area.label}</span>
      </button>
    );
  };

  return (
    <div id="pmrv-tabs">
      <nav
        className="hidden md:block border-t border-white/10"
        aria-label="Navegação principal"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onAreaKeyDown}
      >
        <div className="mx-auto max-w-5xl px-4 flex items-center gap-1">
          {AREAS.map((area) => renderArea(area))}
        </div>
      </nav>

      {activeArea === 'ocorrencia' && (
        <nav
          className="workflow-subnav"
          aria-label="Etapas da ocorrência"
          role="tablist"
          onKeyDown={onEtapaKeyDown}
        >
          <div className="mx-auto max-w-xl grid grid-cols-3 gap-1 p-1">
            {ETAPAS_OCORRENCIA.map((etapa) => (
              <button
                key={etapa.key}
                type="button"
                role="tab"
                id={`pmrv-etapa-${etapa.key}`}
                data-etapa={etapa.key}
                aria-selected={active === etapa.key}
                aria-controls="pmrv-tabpanel"
                tabIndex={active === etapa.key ? 0 : -1}
                onClick={() => onChange(etapa.key)}
                className={`workflow-subtab ${active === etapa.key ? 'workflow-subtab-active' : ''}`}
              >
                {etapa.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 nav-dock"
        aria-label="Navegação no celular"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onAreaKeyDown}
      >
        <div className="mx-auto max-w-md grid grid-cols-4 px-2 pb-2 pt-1">
          {AREAS.map((area) => renderArea(area, true))}
        </div>
      </nav>
    </div>
  );
}
