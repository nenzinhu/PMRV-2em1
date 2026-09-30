# Relato Policial — PMRV-SC

Sistema PWA de campo para a Polícia Militar Rodoviária de Santa Catarina (1º BPMRv / 1ª CIA / Posto 19). Gera relatórios de sinistro de trânsito no celular da guarnição: envolvidos, dinâmica, GPS da rodovia e envio por WhatsApp.

## Stack

- Next.js 15 (App Router) + React 19 + Tailwind CSS 3
- PWA: `manifest.json` + service worker em `public/sw.js`
- IA: provedores gratuitos compatíveis com OpenAI (Groq, OpenRouter, Mistral…) via proxy em `/api/ai` — ver `lib/ai-models.js` e `.env.example`
- Consulta de placa: wdapi2 via `/api/placa`
- Malha viária: GeoJSON de rodovias de SC (`public/rodovias-sc.geojson`)
- Persistência: IndexedDB + `localStorage` no dispositivo (sem backend de dados)
- Qualidade: ESLint no build + Vitest (139 testes: libs em `lib/*.test.js` + componentes em `components/*.test.jsx`, jsdom); sem TypeScript

## Estrutura

```
app/
  layout.jsx                metadata + PWA (server component)
  page.jsx                  rotas ?aba= para AppShell
  api/ai/route.js           proxy streaming multi-provedor (fallback)
  api/ai/models/route.js    modelos gratuitos consultados ao vivo
  api/placa/route.js        consulta de veículo (token em PLACA_API_TOKEN)
  api/geocode/*             Nominatim (reverse + search)
components/
  OcorrenciaProvider.jsx    DOCUMENTO ÚNICO: Context + IndexedDB + autosave
  AppShell.jsx              header, abas, botão "Nova" ocorrência
  RelatoPolicial.jsx        wizard de 5 passos + relatório final
  Envolvidos.jsx            cadastro de pessoas/veículos/fotos
  ResumoDinamica.jsx        relatos individuais → resumo unificado (IA)
  SalvarOcorrencia.jsx      DOSSIÊ (relatório+envolvidos+resumo+danos) + backup JSON
  MentionInput.jsx          @menções (nome, placa, GPS)
lib/
  ocorrencia.js             modelo do documento único + migração + dossiê + hash
  idb.js                    IndexedDB do documento ("atual") + histórico
  unidade.js                perfil BPMRv/CIA/Posto configurável (não código)
  versao.js                 versão do app + rodapé do dossiê
  municipios.js             SC síncrono + UFs sob demanda (cache)
  municipios-sc.js          gerado (scripts/gen-municipios.mjs — API IBGE)
  gps.js                    UTM 22S + match de rodovia com ÍNDICE ESPACIAL
  foto-store.js             fotos em IndexedDB (blob), referências no documento
  pmrv.js                   templates, formatadores, relatório, prompts IA
  rodovias-list.js          lista oficial de rodovias
```

**Ocorrência como documento único**: relato, envolvidos, danos, resumo e
referências de fotos vivem em UM registro (`PMRV_OCORRENCIA` no localStorage,
fonte da verdade em IndexedDB `pmrv-ocorrencias`). "Nova ocorrência" troca o
documento inteiro; `LimparDados` apaga os dois bancos. Rascunhos legados
(`PMRV_RELATO_RASCUNHO`, `PMRV_ENVOLVIDOS`, `PMRV_DANOS`,
`PMRV_RESUMO_DINAMICA`) são migrados automaticamente no primeiro boot.

## O que já funciona

**Relato Policial (wizard)**
1. Identificação — SADE, viatura, forma de conhecimento (voz no passo 1)
2. Local — rodovia, KM, cidade, sentido, GPS automático
3. Natureza e dinâmica — classificação, subtipo (1.1–7.1), templates, IA (jurídica / leiga / técnica)
4. Vítimas — leves / graves / óbitos (só se houver vítima)
5. Revisão — texto editável, revisão ortográfica com IA, WhatsApp, copiar limpo

**Envolvidos**
- Nome, CPF, UF, cidade, endereço, telefone, placa (BR / Mercosul / estrangeira), modelo, cor, relato
- Consulta automática de placa → marca/modelo/cor
- Fotos (câmera ou galeria) em IndexedDB (blob), referência no documento
- @menções no relato (pessoa, veículo, GPS)
- Exportação WhatsApp do bloco de envolvidos

**Resumo da dinâmica**
- Importa relatos dos envolvidos
- Gera parágrafo unificado com IA
- Transfere o texto para o campo de dinâmica do Relato

**Campo / PWA**
- GPS: casa lat/lon com a malha via índice espacial (rápido na CPU do celular) e preenche rodovia + KM
- GeoJSON da malha pré-cacheado no service worker — match de rodovia funciona OFFLINE
- Instalar na tela inicial, fullscreen, tema customizável
- Swipe entre abas no celular; Viatura lembrada no dispositivo
- "Nova ocorrência" arquiva no HISTÓRICO (aba Salvar): restaurar/excluir — nada se perde
- Dossiê em um só texto (relatório + envolvidos + resumo + danos) + backup JSON
- Unidade (BPMRv/CIA/Posto) configurável no aparelho — qualquer posto usa o app
- Backup com hash SHA-256 exibido + rodapé de versão do app/modelo no dossiê

## Fluxo típico

1. Cadastrar envolvidos (placa + relato com @)
2. Abrir Resumo → importar relatos → gerar resumo IA
3. Relato Policial → GPS no local → importar resumo → gerar relatório
4. Revisar → WhatsApp ou copiar para o sistema PMSC

---

## Melhorias possíveis (código atual)

### Crítico

- ✅ **RESOLVIDO** — Token de placa via `PLACA_API_TOKEN` (`process.env`) em `app/api/placa/route.js`; sem logs de URL/body. `?token=` aceito como override manual.
- **`app/page.jsx` retorna `null`**. Toda a UI vive no `layout.jsx`, que é `'use client'`. Perde Metadata API, SSR e atalhos PWA (`/?aba=envolvidos` não muda de aba).
- ✅ **RESOLVIDO** — Fotos em IndexedDB (`pmrv-fotos`, blobs); o documento guarda só referências.
- ✅ **RESOLVIDO** — Ocorrência como documento único (Context + IndexedDB `pmrv-ocorrencias` + `PMRV_OCORRENCIA`) com autosave; recarregar restaura tudo.
- ✅ **RESOLVIDO (em grande parte)** — Data/hora do fato (`dataFato`/`horaFato`) persistidas no documento e usadas pelo relatório; rascunho não inventa data.

### Alto

- Estado espalhado em eventos + `localStorage` em vez de um store único (rascunho da ocorrência).
- Unidade fixa: “1º BPMRv / 1ª CIA / Posto 19”. Outros postos não conseguem usar sem editar código.
- ✅ **RESOLVIDO** — Índice espacial (grade UTM) montado uma vez no boot; busca só nas células vizinhas. GeoJSON pré-cacheado no service worker (v6) — match offline.
- Groq com `web_search`, `code_interpreter` e `visit_website` ligados — desnecessários e arriscados para reescrita de relatório.
- ✅ **RESOLVIDO** — ESLint roda no build (`eslint.config.mjs` flat + `next.config.mjs` sem `ignoreDuringBuilds`) e Vitest cobre `lib` (129 testes).
- ✅ **RESOLVIDO** — Chave pública removida dos componentes; IA só pelo proxy `/api/ai`.
- Atalhos do manifesto (`?aba=`) e deep link não são lidos.

### Médio

- Sem data/hora editável da ocorrência (só hora auto vs manual).
- ✅ **RESOLVIDO** — "Nova ocorrência" troca o documento inteiro (relato, envolvidos, resumo, danos) de uma vez.
- Validação só por `alert()`; campos obrigatórios da cidade/sentido/dinâmica frouxos.
- Reconhecimento de voz só Chrome/WebKit; sem feedback visual de gravação.
- ✅ **RESOLVIDO (texto)** — Dossiê na aba Salvar junta relatório + envolvidos + resumo + danos + backup JSON; fotos anexas ficam para o item 3 (pacote único de envio).
- ✅ **RESOLVIDO** — `/rodovias-sc.geojson` no cache v6 do service worker.
- Header GPS duplicado no mobile (chip + ícone).

### Baixo

- Sem TypeScript.
- `page.jsx` importa componentes que não usa.
- Posto, modelo Groq e listas de cidade hardcoded em vários arquivos.
- Sem README / `.env.example` (este `project.md` passa a ser o mapa do repositório).

---

## NEW FEATURES

```
BLOCO — NOVAS FEATURES (backlog de produto)

1. ✅ IMPLEMENTADO — Rascunho automático da ocorrência
   Relato + Envolvidos + Resumo + Danos vivem em um documento único
   (IndexedDB + Context) com autosave; migra rascunhos legados; dossiê e
   backup JSON na aba Salvar; "Nova" troca o documento inteiro.
   (Arquivar histórico de rascunhos antigos segue no item 2.)

2. ✅ PARCIAL — Histórico de ocorrências
   Arquivamento automático no "Nova" + lista (restaurar/excluir) na aba
   Salvar. Falta busca por placa/nome, duplicar e exportar direto do histórico.

3. Pacote único de envio
   Um botão “Enviar ocorrência”: relatório + envolvidos + resumo + fotos
   (texto limpo + imagens) via WhatsApp / compartilhar nativo / copiar.
   Hoje cada aba manda um pedaço separado.

4. Exportar PDF / DOCX
   Relatório ofício com brasão, campos em negrito e fotos dos veículos
   para protocolar ou anexar no SADE/PMSC sem depender de copiar texto.

5. ✅ IMPLEMENTADO — Data, hora e unidade configuráveis
   Data/hora do fato persistidas no documento; BPMRv/CIA/Posto editáveis no
   aparelho (PMRV_UNIDADE), com default do Posto 19.

6. Mapa no local
   Mostrar posição no trecho da rodovia, KM interpolado, precisão do GPS
   e botão “usar este ponto”. Confiança visual em vez de só o chip no header.

7. Croqui rápido do sinistro
   Canvas simples: pista, sentidos, blocos de veículo, ponto de impacto.
   Exportar PNG junto do relatório.

8. Checklist de atendimento
   Isolamento, sinalização, SAMU/CBM, reboque, CNH, CRLV, teste de
   alcoolemia, testemunhas. Marca o que foi feito; entra no relatório
   como “providências adotadas”.

9. Dados da via e condições
   Pista seca/molhada, dia/noite, iluminada, obras, animais, neblina,
   velocidade regulamentada. Alimenta a dinâmica IA com fatos objetivos.

10. Condutor vs passageiro vs pedestre
    Papel do envolvido, CNH (categoria/validade), uso de cinto/capacete,
    posição no veículo. Templates de dinâmica preenchem @@ com o papel
    certo, não só nome/placa.

11. Consulta CPF / CNH (quando houver convênio)
    Espelhar o fluxo da placa: preencher nome e dados cadastrais com
    confirmação do policial antes de gravar.

12. Depoimento por áudio
    Gravar o relato do envolvido, transcrever (on-device ou Groq) e
    revisar no MentionInput. Hoje a voz só dita no campo ativo.

13. Assinatura na tela
    Envolvido assina o próprio relato no celular da guarnição.
    PNG da rubrica fica no dossiê.

14. QR do envolvido
    QR abre um formulário curto (nome, telefone, relato) no celular da
    pessoa, sem Wi-Fi da viatura se for P2P/local. Reduz digitação na
    pista.

15. Modo posto / várias viaturas
    Perfil da guarnição: efetivo, rádio, VTR padrão. Troca rápida de
    viatura no plantão sem perder o histórico do policial.

16. Fila offline da IA
    Se não houver rede no trecho, enfileirar “gerar jurídica / resumo /
    revisar”. Ao voltar o sinal, processa e notifica. Relatório padrão
    (template) continua 100% offline.

17. Relatório unificado com menções resolvidas
    Substituir @@ pelos envolvidos na ordem do sinistro (A atropelou B).
    Preview antes de gerar. Hoje o policial preenche @@ na mão.

18. Validação de consistência
    Placa consultada ≠ modelo digitado; vítima sem envolvido; atropelamento
    1.1 sem pedestre; KM fora do intervalo da rodovia no GeoJSON.
    Avisos no passo 5, não bloqueio cego.

19. Backup / restore
    Exportar JSON criptografado (PIN) e restaurar em outro aparelho da
    mesma guarnição. Sem nuvem obrigatória — o dado permanece na PM.

20. Painel mínimo do posto (opcional, depois)
    Agregar ocorrências do dia (quantidade, tipo, trecho) se um dia
    houver sync. Fora do escopo do PWA atual; não bloquear o app de campo.

PRIORIDADE SUGERIDA
  P0  ✅ rascunho automático feito; falta pacote único de envio c/ fotos + data/unidade configuráveis
  P1  Histórico + PDF + mapa GPS + checklist
  P2  Croqui, papéis do envolvido, áudio, assinatura
  P3  QR, consulta CPF, painel do posto
```

---

## Como rodar

```bat
iniciar-servidor.bat
```

Ou:

```bash
npm install
npx next dev -p 3000
```

Abrir http://localhost:3000

Variáveis esperadas (criar `.env.local`, não commitar):

```
GROQ_API_KEY=
PLACA_API_TOKEN=
```

O token de placa vem de `PLACA_API_TOKEN` (ver `.env.example`); crie `.env.local` antes de usar `/api/placa`.
