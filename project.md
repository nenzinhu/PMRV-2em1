# Relato Policial — PMRV-SC

Sistema PWA de campo para a Polícia Militar Rodoviária de Santa Catarina (1º BPMRv / 1ª CIA / Posto 19). Gera relatórios de sinistro de trânsito no celular da guarnição: envolvidos, dinâmica, GPS da rodovia e envio por WhatsApp.

## Stack

- Next.js 15 (App Router) + React 19 + Tailwind CSS 3
- PWA: `manifest.json` + service worker em `public/sw.js`
- IA: Groq (`groq/compound-mini`) via proxy em `/api/groq`
- Consulta de placa: wdapi2 via `/api/placa`
- Malha viária: GeoJSON de rodovias de SC (`public/rodovias-sc.geojson`)
- Persistência: `localStorage` no dispositivo (sem backend de dados)
- Sem autenticação, banco, testes ou TypeScript

## Estrutura

```
app/
  layout.jsx          UI inteira (abas, header, PWA) — client component
  page.jsx            retorna null (não é a tela do app)
  api/groq/route.js   proxy streaming Groq
  api/placa/route.js  consulta de veículo
components/
  RelatoPolicial.jsx  wizard de 5 passos + relatório final
  Envolvidos.jsx      cadastro de pessoas/veículos/fotos
  ResumoDinamica.jsx  relatos individuais → resumo unificado (IA)
  MentionInput.jsx    @menções (nome, placa, GPS)
lib/
  pmrv.js             templates, formatadores, relatório, prompts IA
  gps.js              lat/lon → UTM 22S + match de rodovia/KM
  rodovias-list.js    lista oficial de rodovias
```

Comunicação entre abas: `localStorage` + eventos de janela (`gps-change`, `navigate-to`, `set-dinamica`). Não há Context/estado global React.

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
- Fotos (câmera ou galeria) em Data URL no `localStorage`
- @menções no relato (pessoa, veículo, GPS)
- Exportação WhatsApp do bloco de envolvidos

**Resumo da dinâmica**
- Importa relatos dos envolvidos
- Gera parágrafo unificado com IA
- Transfere o texto para o campo de dinâmica do Relato

**Campo / PWA**
- GPS: casa lat/lon com a malha e preenche rodovia + KM
- Instalar na tela inicial, fullscreen, tema customizável
- Swipe entre abas no celular
- Viatura lembrada no dispositivo

## Fluxo típico

1. Cadastrar envolvidos (placa + relato com @)
2. Abrir Resumo → importar relatos → gerar resumo IA
3. Relato Policial → GPS no local → importar resumo → gerar relatório
4. Revisar → WhatsApp ou copiar para o sistema PMSC

---

## Melhorias possíveis (código atual)

### Crítico

- **Token de placa hardcoded** em `app/api/placa/route.js` (e log da URL completa no servidor). Mover para variável de ambiente; nunca logar token.
- **`app/page.jsx` retorna `null`**. Toda a UI vive no `layout.jsx`, que é `'use client'`. Perde Metadata API, SSR e atalhos PWA (`/?aba=envolvidos` não muda de aba).
- **Fotos em `localStorage`**. Data URLs estouram cota (~5 MB) com poucas fotos. IndexedDB ou arquivos no dispositivo.
- **Formulário do Relato não persiste**. Só a VTR é salva. Recarregar a página no meio do atendimento perde SADE, local, dinâmica e vítimas.
- **Data do relatório = “agora”**. `generateReport` usa a data/hora do dispositivo na geração, não a do fato. Recriar o texto muda a data.

### Alto

- Estado espalhado em eventos + `localStorage` em vez de um store único (rascunho da ocorrência).
- Unidade fixa: “1º BPMRv / 1ª CIA / Posto 19”. Outros postos não conseguem usar sem editar código.
- GPS percorre o GeoJSON inteiro a cada ponto do `watchPosition` (pesado no celular).
- Groq com `web_search`, `code_interpreter` e `visit_website` ligados — desnecessários e arriscados para reescrita de relatório.
- ESLint desligado no build (`ignoreDuringBuilds: true`). Sem testes.
- `NEXT_PUBLIC_GROQ_API_KEY` ainda referenciado em componentes (chave não deve ir ao bundle).
- Atalhos do manifesto (`?aba=`) e deep link não são lidos.

### Médio

- Sem data/hora editável da ocorrência (só hora auto vs manual).
- `limpar()` do Relato não limpa envolvidos nem resumo — “nova ocorrência” fica pela metade.
- Validação só por `alert()`; campos obrigatórios da cidade/sentido/dinâmica frouxos.
- Reconhecimento de voz só Chrome/WebKit; sem feedback visual de gravação.
- Relatório WhatsApp não junta envolvidos + fotos + resumo num pacote único.
- Service worker não versiona o GeoJSON grande; match GPS offline falha se o arquivo não estiver em cache.
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

1. Rascunho automático da ocorrência
   Salvar Relato + Envolvidos + Resumo como um único dossiê (IndexedDB).
   Recuperar ao reabrir o app. “Nova ocorrência” arquiva o rascunho atual
   em vez de apagar. Evita perda de atendimento se o celular travar.

2. Histórico de ocorrências
   Lista local por data, SADE, rodovia/KM. Abrir, duplicar, exportar ou
   excluir. Busca por placa, nome ou protocolo.

3. Pacote único de envio
   Um botão “Enviar ocorrência”: relatório + envolvidos + resumo + fotos
   (texto limpo + imagens) via WhatsApp / compartilhar nativo / copiar.
   Hoje cada aba manda um pedaço separado.

4. Exportar PDF / DOCX
   Relatório ofício com brasão, campos em negrito e fotos dos veículos
   para protocolar ou anexar no SADE/PMSC sem depender de copiar texto.

5. Data, hora e unidade configuráveis
   Data/hora do fato (não do clique em “gerar”). Posto, CIA, BPMRv e
   prefixo da viatura no tema/config — o app deixa de ser só Posto 19.

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
  P0  Rascunho automático + pacote único de envio + data/unidade
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
OPENROUTER_API_KEY=
GEMINI_API_KEY=
PLACA_API_TOKEN=
```

Hoje o token de placa ainda está no código; a correção é o primeiro item de “Crítico”.
