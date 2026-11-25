'use client';

import MentionInput from './MentionInput';
import { rodoviaLabel } from '@/lib/rodovias-list';

function texto(valor) {
  return valor == null ? '' : String(valor).trim();
}

export default function EditorRelatoIndividual({ envolvido, envolvidos, form, gpsInfo, ...props }) {
  const gpsValido = gpsInfo?.rodovia && !gpsInfo.foraDaRodovia;
  const via = rodoviaLabel(texto(form?.rodovia || (gpsValido && gpsInfo.rodovia) || ''));
  const km = texto(form?.km) || (gpsValido && rodoviaLabel(gpsInfo.rodovia) === via ? texto(gpsInfo.km) : '');
  const ponte = /^(?:P\.\s*|Ponte\s+)/i.test(via);
  const nome = texto(envolvido.nome);
  const modelo = texto(envolvido.modelo);
  const cor = texto(envolvido.cor);
  const placa = texto(envolvido.placa).toUpperCase();
  const condutor = nome ? `O condutor ${nome}` : 'O condutor';
  const veiculo = modelo || cor || placa
    ? ` com o veículo${modelo ? ` ${modelo}` : ''}${cor ? ` de cor ${cor}` : ''}${placa ? `, placa ${placa}` : ''}`
    : '';

  const atalhos = [
    { id: 'rodovia', local: !ponte && via ? `pela rodovia ${via}` : 'pela rodovia SC-[número]' },
    { id: 'ponte', local: ponte ? `pela ${via.replace(/^P\.\s*/i, 'Ponte ')}` : 'pela Ponte [nome]' },
  ].map(({ id, local }) => ({
    type: 'frase',
    id,
    label: `Frase de ${id}`,
    sublabel: 'Modelo editável',
    insert: `${condutor} declarou que se deslocava ${local}, próximo ao km ${via && ponte === (id === 'ponte') && km ? km : '[km]'}${veiculo}.`,
  }));
  const dados = [
    ['rodovia', ponte ? 'Ponte' : 'Rodovia', via.replace(/^P\.\s*/i, 'Ponte ')],
    ['km', 'Quilômetro (km)', km && `km ${km}`],
    ['modelo', 'Modelo do veículo', modelo],
    ['cor', 'Cor do veículo', cor],
    ['placa', 'Placa do veículo', placa],
  ].filter(([, , valor]) => valor).map(([id, label, insert]) => ({
    type: 'dado', id, label, insert, sublabel: insert,
  }));

  return (
    <MentionInput
      {...props}
      envolvidos={[envolvido, ...envolvidos.filter(item => item.id !== envolvido.id)]}
      gpsLocation={gpsInfo}
      atalhos={atalhos}
      extras={[...atalhos, ...dados]}
      placeholder="Descreva o que aconteceu. Digite @ para inserir nomes, veículos, local ou frases prontas."
    />
  );
}
