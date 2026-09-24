// Consulta de placa (via /api/placa) → { modelo, cor }. Usada nas abas
// Envolvidos e Dinâmica. O token opcional fica em localStorage (PMRV_PLACA_TOKEN).

export const PLACA_TOKEN_KEY = 'PMRV_PLACA_TOKEN';

export function normalizarPlaca(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export function placaConsultavel(placa) {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(placa));
}

export async function consultarPlaca(placa) {
  const p = normalizarPlaca(placa);
  if (!placaConsultavel(p)) throw new Error('Placa inválida. Use o formato AAA0A00 ou AAA0000.');

  const params = new URLSearchParams({ placa: p });
  try {
    const token = localStorage.getItem(PLACA_TOKEN_KEY);
    if (token) params.set('token', token);
  } catch {
    /* sem token salvo */
  }

  const resp = await fetch(`/api/placa?${params}`);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Erro ao consultar placa');

  const modelo = [data.MARCA, data.MODELO].filter(Boolean).join(' ') || data.modelo || '';
  const cor = typeof data.cor === 'string' ? data.cor.trim() : '';
  if (!modelo && !cor) throw new Error('Placa sem dados de veículo.');
  return { modelo, cor };
}
