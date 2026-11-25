'use client';

import { useEffect, useRef, useState } from 'react';
import { rodoviaLabel } from '@/lib/rodovias-list';
import { apresentacaoEnvolvido } from '@/lib/dinamica-presumida';
import { CarIcon, FileTextIcon, MapPinIcon, UserIcon } from '@/components/icons';

function MentionTypeIcon({ type }) {
  const Icon = type === 'pessoa' ? UserIcon : type === 'veiculo' ? CarIcon : ['apresentacao', 'frase'].includes(type) ? FileTextIcon : MapPinIcon;
  return <Icon className="w-4 h-4" />;
}

// `extras`: itens adicionais [{ type, id, label, sublabel, insert }] (ex.: rodovia e km).
export default function MentionInput({ id, value, onChange, envolvidos, placeholder, rows = 4, className = '', gpsLocation = null, extras = [], atalhos = [] }) {
  const textareaRef = useRef(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build list of mentionable items from envolvidos + optional GPS
  const mentionableItems = (envolvidos || []).flatMap((ev) => {
    const items = [];
    if (ev.nome && ev.nome.trim()) {
      items.push({
        type: 'pessoa',
        id: ev.id,
        label: ev.nome.trim(),
        sublabel: `Envolvido #${ev.id}`,
        insert: `${ev.nome.trim()}`,
      });
    }
    if (ev.modelo?.trim() || ev.cor?.trim() || ev.placa?.trim()) {
      const marca = ev.modelo && ev.modelo.trim() ? ev.modelo.trim() : '';
      const cor = ev.cor && ev.cor.trim() ? ev.cor.trim() : '';
      const placa = ev.placa?.trim().toUpperCase();
      const insert = [
        [marca, cor && `de cor ${cor}`].filter(Boolean).join(' '),
        placa && `placa ${placa}`,
      ].filter(Boolean).join(', ');
      items.push({
        type: 'veiculo',
        id: ev.id,
        label: placa || marca || cor,
        sublabel: ['Veículo', marca, cor, ev.nome].filter(Boolean).join(' · '),
        insert,
      });
    }
    const apresentacao = apresentacaoEnvolvido(ev);
    if (apresentacao && ev.nome && ev.nome.trim() && (ev.modelo?.trim() || ev.placa?.trim())) {
      items.push({
        type: 'apresentacao',
        id: ev.id,
        label: `${ev.nome.trim()} + veículo`,
        sublabel: 'Frase completa do condutor',
        insert: apresentacao,
      });
    }
    return items;
  });
  mentionableItems.push(...extras);

  if (gpsLocation && gpsLocation.rodovia && !gpsLocation.foraDaRodovia) {
    const via = rodoviaLabel(gpsLocation.rodovia) || gpsLocation.rodovia;
    const gpsInsert = `${via} KM ${gpsLocation.km}`;
    mentionableItems.push({
      type: 'gps',
      id: 'gps',
      label: gpsInsert,
      sublabel: 'Localização GPS',
      insert: gpsInsert,
    });
  } else if (gpsLocation && gpsLocation.endereco) {
    mentionableItems.push({
      type: 'gps',
      id: 'gps',
      label: gpsLocation.endereco,
      sublabel: 'Localização GPS',
      insert: gpsLocation.endereco,
    });
  }

  const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const filteredItems = mentionableItems.filter((item) =>
    normalizar([item.label, item.sublabel, item.insert].join(' ')).includes(normalizar(mentionFilter))
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionFilter]);

  function atualizarMencao(textarea) {
    const trecho = textarea.value.slice(0, textarea.selectionStart);
    const match = trecho.match(/(?:^|[\s(])@([^\s@]*)$/);
    setShowMentions(!!match && textarea.selectionStart === textarea.selectionEnd);
    if (match) setMentionFilter(match[1]);
  }

  function handleInput(e) {
    onChange(e.target.value);
    atualizarMencao(e.target);
  }

  function handleKeyDown(e) {
    if (!showMentions) return;
    if (e.key === 'Escape') {
      setShowMentions(false);
      return;
    }
    if (!filteredItems.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredItems[selectedIndex] || filteredItems[0]);
    }
  }

  function insertMention(item) {
    if (!item || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const text = textarea.value;
    const cursor = textarea.selectionStart;

    // Find the @ position
    const textBeforeCursor = text.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) return;

    inserirTexto(item.insert, lastAtIndex, cursor);
  }

  function inserirTexto(insert, inicio, fim) {
    const textarea = textareaRef.current;
    const antes = textarea.value.slice(0, inicio);
    const depois = textarea.value.slice(fim);
    const separador = antes && !/\s$/.test(antes) && inicio === fim ? ' ' : '';
    const sufixo = /^[\s.,;:!?)]/.test(depois) ? '' : ' ';
    onChange(antes + separador + insert + sufixo + depois);
    setShowMentions(false);

    setTimeout(() => {
      const cursor = inicio + separador.length + insert.length + sufixo.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  }

  return (
    <div className="relative">
      {atalhos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {atalhos.map(item => (
            <button key={item.id} type="button" className="btn-outline text-xs"
              onMouseDown={e => e.preventDefault()}
              onClick={() => inserirTexto(item.insert, textareaRef.current.selectionStart, textareaRef.current.selectionEnd)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        id={id}
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onSelect={e => { if (showMentions) atualizarMencao(e.currentTarget); }}
        onBlur={e => {
          if (!e.currentTarget.parentElement.contains(e.relatedTarget)) setShowMentions(false);
        }}
        placeholder={placeholder}
        className={className}
      />
      {showMentions && filteredItems.length > 0 && (
        <div
          className={`${atalhos.length ? 'mt-1' : 'absolute top-full inset-x-0 z-50'} bg-surface border-2 border-charcoal shadow-[4px_4px_0_#2B2B2B] rounded-xl max-h-48 overflow-y-auto`}
        >
          {filteredItems.map((item, index) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertMention(item)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                index === selectedIndex ? 'bg-bone' : 'hover:bg-bone'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-mono font-bold ${
                item.type === 'pessoa'
                  ? 'bg-pmrv/10 text-pmrv border border-pmrv/30'
                  : item.type === 'veiculo'
                    ? 'bg-gold/20 text-charcoal border border-gold/50'
                    : 'bg-surface text-charcoal border border-charcoal/40'
              }`}>
                <MentionTypeIcon type={item.type} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">{item.label}</p>
                <p className="text-xs font-mono text-charcoal uppercase tracking-wider">{item.sublabel}</p>
              </div>
              {index === selectedIndex && (
                <span className="text-xs font-mono text-gold-ink">↵</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
