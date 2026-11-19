# Relatos individuais Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation.

**Goal:** Entregar registro rápido individual e corrigir perda de dados antes do push autorizado à main.
**Architecture:** Componente direto no OcorrenciaProvider; serviços existentes para placa e IA. Navegação em Pessoas com cadastro completo e relatos individuais.
**Tech Stack:** Next.js, React, Vitest.
**Spec:** docs/superpowers/specs/2026-11-18-relatos-individuais.md

## Global Constraints
Até 10 novos envolvidos; preservar dados antigos. Não inventar fatos. Placa e IA dependem de serviços configurados. Push normal, sem force.

## Review Focus
- Consulta tardia não altera outra placa ou ocorrência.
- Resposta de IA não apaga edição recente.
- Alternar abas preserva relato e dados completos.
- Importar fotos preserva edições durante a gravação.
- Falha de arquivo mantém ocorrência atual.

### Task 1: Aba e integração
- [x] Criar testes de limite, cadastro manual, persistência no documento e consultas tardias em components/RelatosIndividuais.test.jsx; executar e observar falha.
- [x] Criar components/RelatosIndividuais.jsx consumindo useOcorrencia; integrar lib/aba.js, MobileNav e AppShell e PageStage.
- [x] Executar testes direcionados.

### Task 2: Persistência
- [x] Testar importação concorrente em Envolvidos e falhas de arquivo no Provider.
- [x] Corrigir atualizadores de fotos; arquivar antes de trocar documento, retornar sucesso booleano e avisar erro.
- [x] Atualizar chamadores Nova e Restaurar para aguardar resultado.

### Task 3: Verificação e entrega
- [x] Conferir falhas legadas contra comportamento atual; ajustar testes desatualizados preservando requisitos.
- [x] Executar testes completos, lint e build.
- [x] Revisão independente, corrigir problemas importantes, commit e push HEAD:main; verificar hash remoto.

## Ledger
- Base e19bbc5 incorporada por fast-forward. Usuário autorizou execução e push à main; execução local na branch work.

- Verificação final: 230 testes em 36 arquivos; lint e build de produção aprovados.
- Navegador Chromium: cadastro manual, navegação, reload, limite dez e viewport 390px sem overflow ou erro JS.
- Revisão independente: corrigidas hipóteses legadas (confirmação explícita), resposta parcial de placa, fotos durante troca de abas, limite também no cadastro completo e cópia local independente de IDB. Documento atual atualizado sincronicamente para proteger a troca após arquivo.
- Testes legados ajustados ao comportamento atual: dossiê inclui envolvidos, acessibilidade anuncia o nome da etapa e abertura do relatório usa dois parágrafos.
- Integrações externas de placa e IA verificadas com respostas simuladas; não foram feitas consultas reais com credenciais.
