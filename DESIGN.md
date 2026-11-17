# PMRV — interface de registro em campo

## Overview
Ferramenta de trabalho em português brasileiro para registrar sinistros no celular. Prioridade: autoria das declarações, leitura e continuidade da ocorrência. A assinatura visual do fluxo de relatos é a ficha com margem verde e a sequência registrar → comparar → revisar. Sem imagens decorativas ou animação de dados.

## Colors
A fonte canônica é `app/globals.css` (`--ds-*`), adaptada por `tailwind.config.js`: verde institucional `--ds-primary`, superfície `--ds-surface`, texto `--ds-text`, foco `--ds-focus`. Temas claro, escuro e personalizado usam os mesmos papéis. Não duplicar tokens no componente.

## Typography
IBM Plex Sans para leitura e títulos; IBM Plex Mono em metadados curtos. Relatos longos usam caixa normal, altura de linha confortável e campos com tamanho mínimo de 16 px no celular.

## Layout
Uma coluna de leitura até 48rem, com três opções de estilo e três grupos de análise no desktop. Abaixo de 600px, opções e análise ocupam uma coluna. Cadastro detalhado em Envolvidos; dinâmica reutiliza esses dados sem recadastro. Detalhes nativos recolhem contexto e ajustes avançados.

## Elevation & Depth
Reutilizar `ds-card`. Feedback e análise ficam próximos da ação correspondente, sem sobreposições sobre o texto.

## Shapes
Cartões existentes de 16px; opções de estilo de 12px. A margem verde identifica cada fonte; rótulos textuais indicam presença ou ausência do relato.

## Components
`EstiloPicker` é o seletor canônico dos três estilos. `MentionInput` mantém menções. `OcorrenciaProvider` guarda o documento e `Toast` confirma ações; erros persistem na tela. Controles de seleção são rádios nativos. Campos e navegação seguem as classes compartilhadas existentes.

## Do's and Don'ts
Preservar divergências e atribuição; nunca gerar declarações de pessoas não ouvidas. Não transferir texto automaticamente após gerar. Descartar respostas de IA se a fonte mudar durante a espera. Não usar uma cópia de localStorage como estado editável paralelo ao documento da ocorrência.
