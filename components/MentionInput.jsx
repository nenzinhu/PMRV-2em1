'use client';

import { useEffect, useRef, useState } from 'react';

export default function MentionInput({ value, onChange, envolvidos, placeholder, rows = 4, className = '' }) {
  const textareaRef = useRef(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build list of mentionable items from envolvidos
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
    if (ev.placa && ev.placa.trim()) {
      const modelStr = ev.modelo && ev.modelo.trim() ? ` (${ev.modelo.trim()})` : '';
      items.push({
        type: 'veiculo',
        id: ev.id,
        label: ev.placa.trim().toUpperCase(),
        sublabel: `Veículo ${modelStr}`,
        insert: `${ev.placa.trim().toUpperCase()}`,
      });
    }
    return items;
  });

  const filteredItems = mentionableItems.filter((item) =>
    item.label.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionFilter]);

  function handleInput(e) {
    const newValue = e.target.value;
    onChange(newValue);

    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);

    // Find @ before cursor
    const textBeforeCursor = newValue.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after @ (which would mean the mention is complete)
      if (!textAfterAt.includes(' ')) {
        setMentionFilter(textAfterAt);
        setShowMentions(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowMentions(false);
  }

  function handleKeyDown(e) {
    if (!showMentions || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
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

    const newText = text.slice(0, lastAtIndex) + item.insert + ' ' + text.slice(cursor);
    onChange(newText);
    setShowMentions(false);

    // Move cursor after the inserted mention
    setTimeout(() => {
      const newCursorPos = lastAtIndex + item.insert.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }

  function handleMentionClick(item) {
    insertMention(item);
  }

  // Calculate dropdown position
  const [dropdownStyle, setDropdownStyle] = useState({});
  useEffect(() => {
    if (showMentions && textareaRef.current) {
      const textarea = textareaRef.current;
      const text = textarea.value;
      const cursor = textarea.selectionStart;
      const textBeforeCursor = text.slice(0, cursor);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      // Approximate cursor position for dropdown
      // This is a rough estimate; for precise positioning we'd need a library
      const lineHeight = 24; // approximate
      const linesBefore = textBeforeCursor.slice(lastAtIndex).split('\n').length - 1;
      const top = (linesBefore + 1) * lineHeight + 8;
      const left = Math.min((lastAtIndex % 50) * 8, textarea.offsetWidth - 200);

      setDropdownStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 50,
      });
    }
  }, [showMentions, mentionFilter, cursorPosition]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showMentions && filteredItems.length > 0 && (
        <div
          className="absolute bg-white border-2 border-charcoal shadow-[4px_4px_0_#2B2B2B] rounded-xl overflow-hidden max-h-48 overflow-y-auto"
          style={dropdownStyle}
        >
          {filteredItems.map((item, index) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => handleMentionClick(item)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                index === selectedIndex ? 'bg-bone' : 'hover:bg-bone'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-mono font-bold ${
                item.type === 'pessoa'
                  ? 'bg-pmrv/10 text-pmrv border border-pmrv/30'
                  : 'bg-gold/20 text-charcoal border border-gold/50'
              }`}>
                {item.type === 'pessoa' ? '👤' : '🚗'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">{item.label}</p>
                <p className="text-[10px] font-mono text-charcoal/60 uppercase tracking-wider">{item.sublabel}</p>
              </div>
              {index === selectedIndex && (
                <span className="text-[10px] font-mono text-gold">↵</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
