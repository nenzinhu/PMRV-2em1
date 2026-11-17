// Uma fonte por envolvido: mudanças na ficha substituem cópias antigas no resumo.
// Notas manuais e danos continuam independentes.
export function fontesDosRelatos(envolvidos, anteriores = []) {
  const lista = Array.isArray(envolvidos) ? envolvidos : [];
  const ids = new Set(lista.map((e) => String(e.id)));
  const extras = (Array.isArray(anteriores) ? anteriores : [])
    .filter(
      (r) => r && (r.envolvidoId == null || !ids.has(String(r.envolvidoId))),
    )
    .map((r) =>
      r.envolvidoId == null
        ? r
        : {
            ...r,
            envolvidoId: undefined,
            envolvidoNome: `${r.envolvidoNome || 'Relato'} (registro anterior)`,
          },
    );
  return [
    ...lista
      .filter((e) => e.relato?.trim() && !e.presumido)
      .map((e) => ({
        id: `envolvido-${e.id}`,
        envolvidoId: e.id,
        envolvidoNome: e.nome || `Envolvido #${e.id}`,
        texto: e.relato.trim(),
      })),
    ...extras,
  ];
}
