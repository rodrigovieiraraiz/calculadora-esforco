import type { AIAnalysisRequest } from "./types"

export function buildAnalysisPrompt(request: AIAnalysisRequest): string {
  const criteriosJson = JSON.stringify(request.criterios, null, 2)

  const demandaSection = [
    `Título: ${request.titulo}`,
    `Área: ${request.areaNome}`,
    `Descrição: ${request.descricao}`,
    request.contexto ? `Contexto adicional: ${request.contexto}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const componentesSection =
    request.componentes && request.componentes.length > 0
      ? `\n## COMPONENTES DISPONÍVEIS\n\nEsta área possui os seguintes componentes. Ao sugerir critérios, indique qual componente cada critério se aplica, se for possível determinar com base na descrição da demanda.\n\n\`\`\`json\n${JSON.stringify(request.componentes, null, 2)}\n\`\`\`\n`
      : ""

  const componenteInstructions =
    request.componentes && request.componentes.length > 0
      ? `9. Se componentes estiverem disponíveis (seção COMPONENTES DISPONÍVEIS), sugira qual componente cada critério se aplica, usando o "componenteId" e "componenteNome" exatos da lista de componentes. Se um critério não se aplica a nenhum componente específico, omita esses campos.`
      : ""

  const componenteJsonFields =
    request.componentes && request.componentes.length > 0
      ? `\n      "componenteId": "<id do componente, se aplicável>",\n      "componenteNome": "<nome do componente, se aplicável>",`
      : ""

  return `Você é um especialista em estimativa de esforço de software. Sua tarefa é analisar uma demanda e sugerir, para cada critério de avaliação disponível, qual nível de complexidade melhor se aplica.

## DEMANDA A ANALISAR

${demandaSection}

## CRITÉRIOS DISPONÍVEIS (ÁREA: ${request.areaNome})

A seguir estão TODOS os critérios disponíveis para a área técnica "${request.areaNome}" com seus respectivos níveis de complexidade. Você DEVE usar exclusivamente os IDs presentes nesta lista — nunca invente critérios ou complexidades que não estejam aqui. Estes critérios são específicos desta área técnica e já foram filtrados previamente.

\`\`\`json
${criteriosJson}
\`\`\`
${componentesSection}
## ATIVIDADES OBRIGATÓRIAS DE PROJETO

Todo projeto de software possui atividades inerentes que SEMPRE devem ser consideradas na estimativa, independentemente do tipo de demanda. Se existirem critérios na lista acima relacionados às atividades abaixo, você DEVE incluí-los na análise — mesmo que a descrição da demanda não os mencione explicitamente:

- **Documentação**: Elaboração e atualização de documentação técnica, manuais, especificações, diagramas, ADRs, etc.
- **Levantamento de informações / Requisitos**: Análise de requisitos, entendimento do problema, reuniões com stakeholders, refinamento de histórias, etc.
- **Testes**: Testes unitários, integração, regressão, homologação, validação de cenários, etc.
- **Integração**: Integração com outros sistemas, APIs, serviços, bancos de dados, ambientes, deploy, etc.

Para estas atividades obrigatórias, use seu julgamento para definir a complexidade com base no escopo descrito na demanda. Se a demanda for simples, a complexidade dessas atividades tende a ser baixa; se a demanda envolver muitos componentes ou regras complexas, a complexidade dessas atividades tende a ser maior proporcionalmente.

## INSTRUÇÕES

1. Analise TODOS os critérios da lista acima. Para cada critério que se aplicar à demanda, sugira o nível de complexidade mais adequado.
2. Sempre inclua critérios relacionados a atividades obrigatórias de projeto (documentação, levantamento, testes, integração) quando existirem na lista de critérios disponíveis.
3. Use SOMENTE criterioId e complexidadeId que existam na lista acima.
4. Se nenhum critério se aplicar, retorne um array vazio em "criteriosSugeridos".
5. Atribua um valor de confiança entre 0 e 1 para cada sugestão:
   - 0.9 a 1.0: você tem certeza da escolha com base em evidências claras na demanda
   - 0.7 a 0.8: há indícios razoáveis mas alguma ambiguidade
   - 0.5 a 0.6: fraca evidência, apenas inferência
   - Abaixo de 0.5: muita incerteza — prefira omitir a sugestão em vez de forçar uma escolha
6. Em "observacoes", descreva brevemente seu raciocínio geral e aponte qualquer incerteza relevante. Mencione quais atividades obrigatórias foram incluídas e por quê.
7. Em "confiancaGeral", informe a média ponderada das confiancas das sugestões (0 a 1).
8. Para critérios que NÃO sejam atividades obrigatórias, quando não houver informação suficiente para avaliar, NÃO inclua — é melhor omitir do que errar.
${componenteInstructions ? componenteInstructions + "\n" : ""}
## FORMATO DE RESPOSTA

Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto antes ou depois, seguindo exatamente esta estrutura:

{
  "criteriosSugeridos": [
    {
      "criterioId": "<id do critério>",
      "criterioNome": "<nome do critério>",
      "complexidadeId": "<id da complexidade>",
      "complexidadeNome": "<nome da complexidade>",${componenteJsonFields}
      "justificativa": "<explicação objetiva de por que esta complexidade foi escolhida>",
      "confianca": <número entre 0 e 1>
    }
  ],
  "observacoes": "<observações gerais sobre a análise, incertezas ou informações que faltaram>",
  "confiancaGeral": <número entre 0 e 1>
}`
}
