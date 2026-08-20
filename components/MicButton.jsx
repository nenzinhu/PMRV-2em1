'use client';

import { useState } from 'react';
import { MicIcon } from './icons';

export default function MicButton({ onResult, title, className = '' }) {
  const [recording, setRecording] = useState(false);

  function start() {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Seu navegador não suporta comando de voz.');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onstart = () => setRecording(true);
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    try {
      recognition.start();
    } catch (e) {
      setRecording(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      title={title}
      aria-label={title || 'Comando de voz'}
      className={`ds-icon-btn ${recording ? 'recording-active' : ''} ${className}`}
    >
      <MicIcon />
    </button>
  );
}
