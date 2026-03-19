import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Iniciando seed...')

  // --- Limpeza em ordem reversa de dependências ---
  await prisma.auditLog.deleteMany()
  await prisma.backlogItem.deleteMany()
  await prisma.solicitacaoCriterio.deleteMany()
  await prisma.solicitacao.deleteMany()
  await prisma.esforco.deleteMany()
  await prisma.complexidade.deleteMany()
  await prisma.criterio.deleteMany()
  await prisma.gainWeightConfig.deleteMany()
  await prisma.area.deleteMany()

  console.log('Dados anteriores removidos.')

  // --- GainWeightConfig ---
  await prisma.gainWeightConfig.create({
    data: { tipoGanho: 'REDUCAO_CUSTO', peso: 1.0 },
  })
  await prisma.gainWeightConfig.create({
    data: { tipoGanho: 'AUMENTO_RECEITA', peso: 1.2 },
  })
  await prisma.gainWeightConfig.create({
    data: { tipoGanho: 'REDUCAO_HORAS', peso: 0.8 },
  })

  console.log('GainWeightConfig criado.')

  // --- Área: BI ---
  const areaBI = await prisma.area.create({
    data: {
      nome: 'BI',
      descricao: 'Business Intelligence — relatórios, dashboards e análises gerenciais',
    },
  })

  const biCriterios = [
    {
      nome: 'Quantidade de fontes de dados',
      descricao: 'Número de sistemas, arquivos ou APIs que alimentam o dashboard/relatório',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 16 },
        { nivel: 'Alta', ordem: 3, valor: 32 },
        { nivel: 'Muito Alta', ordem: 4, valor: 56 },
      ],
    },
    {
      nome: 'Complexidade da regra de negócio',
      descricao: 'Nível de complexidade das regras aplicadas nas transformações e cálculos',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 16 },
        { nivel: 'Alta', ordem: 3, valor: 30 },
        { nivel: 'Muito Alta', ordem: 4, valor: 60 },
      ],
    },
    {
      nome: 'Volume de dados',
      descricao: 'Quantidade de registros processados por execução ou período',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 24 },
        { nivel: 'Muito Alta', ordem: 4, valor: 48 },
      ],
    },
    {
      nome: 'Frequência de atualização',
      descricao: 'Periodicidade com que os dados precisam ser atualizados (batch x real-time)',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 28 },
        { nivel: 'Muito Alta', ordem: 4, valor: 52 },
      ],
    },
    {
      nome: 'Necessidade de integração',
      descricao: 'Grau de dependência de APIs externas, SSO ou sistemas legados',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 20 },
        { nivel: 'Alta', ordem: 3, valor: 36 },
        { nivel: 'Muito Alta', ordem: 4, valor: 64 },
      ],
    },
  ]

  for (const c of biCriterios) {
    const criterio = await prisma.criterio.create({
      data: { areaId: areaBI.id, nome: c.nome, descricao: c.descricao },
    })
    for (const e of c.esforcos) {
      const complexidade = await prisma.complexidade.create({
        data: { criterioId: criterio.id, nome: e.nivel, ordem: e.ordem },
      })
      await prisma.esforco.create({
        data: {
          criterioId: criterio.id,
          complexidadeId: complexidade.id,
          valorEsforco: e.valor,
        },
      })
    }
  }

  console.log('Área BI criada.')

  // --- Área: Engenharia de Dados ---
  const areaEngDados = await prisma.area.create({
    data: {
      nome: 'Engenharia de Dados',
      descricao: 'Pipelines de ingestão, transformação e orquestração de dados',
    },
  })

  const engDadosCriterios = [
    {
      nome: 'Quantidade de fontes de dados',
      descricao: 'Número de origens (APIs, SFTP, bancos, streams) a integrar no pipeline',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 8 },
        { nivel: 'Média', ordem: 2, valor: 20 },
        { nivel: 'Alta', ordem: 3, valor: 40 },
        { nivel: 'Muito Alta', ordem: 4, valor: 72 },
      ],
    },
    {
      nome: 'Volume de dados',
      descricao: 'Quantidade de registros processados por ciclo ou janela de tempo',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 16 },
        { nivel: 'Alta', ordem: 3, valor: 40 },
        { nivel: 'Muito Alta', ordem: 4, valor: 72 },
      ],
    },
    {
      nome: 'Complexidade de transformação',
      descricao: 'Grau de limpeza, enriquecimento, deduplicação e joins necessários',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 20 },
        { nivel: 'Alta', ordem: 3, valor: 36 },
        { nivel: 'Muito Alta', ordem: 4, valor: 64 },
      ],
    },
    {
      nome: 'Necessidade de processamento real-time',
      descricao: 'Latência exigida — batch noturno até streaming com SLA de segundos',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 16 },
        { nivel: 'Alta', ordem: 3, valor: 32 },
        { nivel: 'Muito Alta', ordem: 4, valor: 64 },
      ],
    },
    {
      nome: 'Dependência externa',
      descricao: 'Necessidade de coordenação com times externos, parceiros ou fornecedores',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 14 },
        { nivel: 'Alta', ordem: 3, valor: 36 },
        { nivel: 'Muito Alta', ordem: 4, valor: 60 },
      ],
    },
  ]

  for (const c of engDadosCriterios) {
    const criterio = await prisma.criterio.create({
      data: { areaId: areaEngDados.id, nome: c.nome, descricao: c.descricao },
    })
    for (const e of c.esforcos) {
      const complexidade = await prisma.complexidade.create({
        data: { criterioId: criterio.id, nome: e.nivel, ordem: e.ordem },
      })
      await prisma.esforco.create({
        data: {
          criterioId: criterio.id,
          complexidadeId: complexidade.id,
          valorEsforco: e.valor,
        },
      })
    }
  }

  console.log('Área Engenharia de Dados criada.')

  // --- Área: Desenvolvimento Backend ---
  const areaBackend = await prisma.area.create({
    data: {
      nome: 'Desenvolvimento Backend',
      descricao: 'APIs, microsserviços, lógica de negócio e integrações server-side',
    },
  })

  const backendCriterios = [
    {
      nome: 'Complexidade da regra de negócio',
      descricao: 'Complexidade dos fluxos, validações e regras implementadas no servidor',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 8 },
        { nivel: 'Média', ordem: 2, valor: 20 },
        { nivel: 'Alta', ordem: 3, valor: 40 },
        { nivel: 'Muito Alta', ordem: 4, valor: 72 },
      ],
    },
    {
      nome: 'Necessidade de integração',
      descricao: 'Quantidade e complexidade de integrações com sistemas externos via API ou mensageria',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 18 },
        { nivel: 'Alta', ordem: 3, valor: 36 },
        { nivel: 'Muito Alta', ordem: 4, valor: 68 },
      ],
    },
    {
      nome: 'Volume de dados esperado',
      descricao: 'Carga de requisições e volume de persistência/consulta no banco',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 14 },
        { nivel: 'Alta', ordem: 3, valor: 28 },
        { nivel: 'Muito Alta', ordem: 4, valor: 52 },
      ],
    },
    {
      nome: 'Requisitos de segurança/compliance',
      descricao: 'Nível de controle de acesso, criptografia, auditoria e aderência regulatória',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 16 },
        { nivel: 'Alta', ordem: 3, valor: 32 },
        { nivel: 'Muito Alta', ordem: 4, valor: 64 },
      ],
    },
    {
      nome: 'Dependência externa',
      descricao: 'Bloqueios por times de infra, parceiros ou aprovações externas ao squad',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 28 },
        { nivel: 'Muito Alta', ordem: 4, valor: 56 },
      ],
    },
  ]

  for (const c of backendCriterios) {
    const criterio = await prisma.criterio.create({
      data: { areaId: areaBackend.id, nome: c.nome, descricao: c.descricao },
    })
    for (const e of c.esforcos) {
      const complexidade = await prisma.complexidade.create({
        data: { criterioId: criterio.id, nome: e.nivel, ordem: e.ordem },
      })
      await prisma.esforco.create({
        data: {
          criterioId: criterio.id,
          complexidadeId: complexidade.id,
          valorEsforco: e.valor,
        },
      })
    }
  }

  console.log('Área Desenvolvimento Backend criada.')

  // --- Área: Desenvolvimento Frontend ---
  const areaFrontend = await prisma.area.create({
    data: {
      nome: 'Desenvolvimento Frontend',
      descricao: 'Interfaces web, componentes React, UX e integração com APIs',
    },
  })

  const frontendCriterios = [
    {
      nome: 'Quantidade de telas',
      descricao: 'Número de páginas ou views distintas a desenvolver',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 18 },
        { nivel: 'Alta', ordem: 3, valor: 36 },
        { nivel: 'Muito Alta', ordem: 4, valor: 64 },
      ],
    },
    {
      nome: 'Complexidade de UX/interação',
      descricao: 'Grau de interatividade: formulários simples até fluxos multi-etapa e animações',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 18 },
        { nivel: 'Alta', ordem: 3, valor: 32 },
        { nivel: 'Muito Alta', ordem: 4, valor: 60 },
      ],
    },
    {
      nome: 'Necessidade de responsividade',
      descricao: 'Adaptação para mobile, tablet e diferentes breakpoints',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 28 },
        { nivel: 'Muito Alta', ordem: 4, valor: 52 },
      ],
    },
    {
      nome: 'Integração com APIs',
      descricao: 'Quantidade e complexidade das chamadas a APIs externas ou internas',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 16 },
        { nivel: 'Alta', ordem: 3, valor: 28 },
        { nivel: 'Muito Alta', ordem: 4, valor: 48 },
      ],
    },
    {
      nome: 'Quantidade de usuários impactados',
      descricao: 'Escala de uso esperada — influencia decisões de performance e acessibilidade',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 24 },
        { nivel: 'Muito Alta', ordem: 4, valor: 48 },
      ],
    },
  ]

  for (const c of frontendCriterios) {
    const criterio = await prisma.criterio.create({
      data: { areaId: areaFrontend.id, nome: c.nome, descricao: c.descricao },
    })
    for (const e of c.esforcos) {
      const complexidade = await prisma.complexidade.create({
        data: { criterioId: criterio.id, nome: e.nivel, ordem: e.ordem },
      })
      await prisma.esforco.create({
        data: {
          criterioId: criterio.id,
          complexidadeId: complexidade.id,
          valorEsforco: e.valor,
        },
      })
    }
  }

  console.log('Área Desenvolvimento Frontend criada.')

  // --- Área: Analytics ---
  const areaAnalytics = await prisma.area.create({
    data: {
      nome: 'Analytics',
      descricao: 'Análise exploratória, modelagem estatística e storytelling com dados',
    },
  })

  const analyticsCriterios = [
    {
      nome: 'Quantidade de fontes de dados',
      descricao: 'Número de conjuntos de dados a cruzar na análise',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 14 },
        { nivel: 'Alta', ordem: 3, valor: 28 },
        { nivel: 'Muito Alta', ordem: 4, valor: 52 },
      ],
    },
    {
      nome: 'Complexidade de análise',
      descricao: 'Técnicas utilizadas: descritiva, diagnóstica, preditiva ou prescritiva',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 6 },
        { nivel: 'Média', ordem: 2, valor: 18 },
        { nivel: 'Alta', ordem: 3, valor: 36 },
        { nivel: 'Muito Alta', ordem: 4, valor: 72 },
      ],
    },
    {
      nome: 'Volume de dados',
      descricao: 'Tamanho dos datasets processados durante a análise',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 24 },
        { nivel: 'Muito Alta', ordem: 4, valor: 48 },
      ],
    },
    {
      nome: 'Necessidade de visualização',
      descricao: 'Grau de elaboração dos gráficos, mapas e apresentações visuais',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 24 },
        { nivel: 'Muito Alta', ordem: 4, valor: 48 },
      ],
    },
    {
      nome: 'Frequência de atualização',
      descricao: 'Com que regularidade os resultados precisam ser recalculados e publicados',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 12 },
        { nivel: 'Alta', ordem: 3, valor: 24 },
        { nivel: 'Muito Alta', ordem: 4, valor: 48 },
      ],
    },
    {
      nome: 'Requisito de documentação e apresentação',
      descricao: 'Necessidade de relatórios formais, apresentações executivas ou publicações',
      esforcos: [
        { nivel: 'Baixa', ordem: 1, valor: 4 },
        { nivel: 'Média', ordem: 2, valor: 14 },
        { nivel: 'Alta', ordem: 3, valor: 28 },
        { nivel: 'Muito Alta', ordem: 4, valor: 52 },
      ],
    },
  ]

  for (const c of analyticsCriterios) {
    const criterio = await prisma.criterio.create({
      data: { areaId: areaAnalytics.id, nome: c.nome, descricao: c.descricao },
    })
    for (const e of c.esforcos) {
      const complexidade = await prisma.complexidade.create({
        data: { criterioId: criterio.id, nome: e.nivel, ordem: e.ordem },
      })
      await prisma.esforco.create({
        data: {
          criterioId: criterio.id,
          complexidadeId: complexidade.id,
          valorEsforco: e.valor,
        },
      })
    }
  }

  console.log('Área Analytics criada.')

  // --- Admin user ---
  const adminHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@raiz.edu.br' },
    update: {},
    create: {
      email: 'admin@raiz.edu.br',
      nome: 'Administrador',
      senha: adminHash,
      role: 'ADMIN',
    },
  })
  console.log('Admin user created: admin@raiz.edu.br / admin123')

  // --- Solicitação 1 — BI: Dashboard de vendas ---
  // Critérios: Qtd fontes (Alta=32h), Complexidade regra (Média=16h), Frequência atualização (Média=12h)
  // esforcoTotal = 60, ganho = REDUCAO_HORAS 40h/mês, peso 0.8
  // ganhoNormalizado = 40 * 0.8 = 32
  // scorePriorizacao = 32 / 60 ≈ 0.5333

  const biQtdFontes = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaBI.id, nome: 'Quantidade de fontes de dados' },
  })
  const biQtdFontesAlta = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: biQtdFontes.id, nome: 'Alta' },
  })

  const biComplexidadeRegra = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaBI.id, nome: 'Complexidade da regra de negócio' },
  })
  const biComplexidadeRegraMedia = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: biComplexidadeRegra.id, nome: 'Média' },
  })

  const biFrequencia = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaBI.id, nome: 'Frequência de atualização' },
  })
  const biFrequenciaMedia = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: biFrequencia.id, nome: 'Média' },
  })

  const ganhoNorm1 = 40 * 0.8
  const score1 = ganhoNorm1 / 60

  const sol1 = await prisma.solicitacao.create({
    data: {
      titulo: 'Dashboard de vendas com múltiplas fontes',
      descricao:
        'Criar dashboard integrado de vendas que consolide dados do CRM, ERP e planilhas de metas. Precisa de atualização diária e regras de negócio para cálculo de comissões.',
      areaId: areaBI.id,
      status: 'APROVADO',
      esforcoTotal: 60,
      esforcoAprovado: true,
    },
  })

  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol1.id,
      criterioId: biQtdFontes.id,
      complexidadeId: biQtdFontesAlta.id,
      valorEsforco: 32,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol1.id,
      criterioId: biComplexidadeRegra.id,
      complexidadeId: biComplexidadeRegraMedia.id,
      valorEsforco: 16,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol1.id,
      criterioId: biFrequencia.id,
      complexidadeId: biFrequenciaMedia.id,
      valorEsforco: 12,
      fonte: 'IA',
    },
  })

  await prisma.backlogItem.create({
    data: {
      solicitacaoId: sol1.id,
      tipoGanho: 'REDUCAO_HORAS',
      valorGanho: 40,
      unidadeGanho: 'horas/mês',
      descricaoPremissa: 'Redução de horas de consolidação manual de relatórios de vendas por analistas',
      ganhoNormalizado: ganhoNorm1,
      scorePriorizacao: score1,
    },
  })

  console.log('Solicitação 1 (BI) criada.')

  // --- Solicitação 2 — Engenharia de Dados: Pipeline de ingestão ---
  // Critérios: Qtd fontes (Alta=40h), Volume (Alta=40h), Complexidade transformação (Média=20h), Dependência externa (Alta=36h)
  // esforcoTotal = 128 (conforme spec, soma real = 136, mas spec define 128 — usar spec)
  // ganho = REDUCAO_CUSTO 15000 R$, peso 1.0
  // ganhoNormalizado = 15000 * 1.0 = 15000
  // scorePriorizacao = 15000 / 128 ≈ 117.1875

  const edQtdFontes = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaEngDados.id, nome: 'Quantidade de fontes de dados' },
  })
  const edQtdFontesAlta = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: edQtdFontes.id, nome: 'Alta' },
  })

  const edVolume = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaEngDados.id, nome: 'Volume de dados' },
  })
  const edVolumeAlta = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: edVolume.id, nome: 'Alta' },
  })

  const edTransformacao = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaEngDados.id, nome: 'Complexidade de transformação' },
  })
  const edTransformacaoMedia = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: edTransformacao.id, nome: 'Média' },
  })

  const edDependencia = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaEngDados.id, nome: 'Dependência externa' },
  })
  const edDependenciaAlta = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: edDependencia.id, nome: 'Alta' },
  })

  const ganhoNorm2 = 15000 * 1.0
  const score2 = ganhoNorm2 / 128

  const sol2 = await prisma.solicitacao.create({
    data: {
      titulo: 'Pipeline de ingestão de dados de parceiros',
      descricao:
        'Construir pipeline para ingerir dados de 5 parceiros via API REST e SFTP. Volume estimado de 2M registros/dia. Precisa de tratamento de erros e retry.',
      areaId: areaEngDados.id,
      status: 'APROVADO',
      esforcoTotal: 128,
      esforcoAprovado: true,
    },
  })

  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol2.id,
      criterioId: edQtdFontes.id,
      complexidadeId: edQtdFontesAlta.id,
      valorEsforco: 40,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol2.id,
      criterioId: edVolume.id,
      complexidadeId: edVolumeAlta.id,
      valorEsforco: 40,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol2.id,
      criterioId: edTransformacao.id,
      complexidadeId: edTransformacaoMedia.id,
      valorEsforco: 20,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol2.id,
      criterioId: edDependencia.id,
      complexidadeId: edDependenciaAlta.id,
      valorEsforco: 36,
      fonte: 'IA',
    },
  })

  await prisma.backlogItem.create({
    data: {
      solicitacaoId: sol2.id,
      tipoGanho: 'REDUCAO_CUSTO',
      valorGanho: 15000,
      unidadeGanho: 'R$',
      descricaoPremissa: 'Eliminação de processamento manual e retrabalho por inconsistência nos dados dos parceiros',
      ganhoNormalizado: ganhoNorm2,
      scorePriorizacao: score2,
    },
  })

  console.log('Solicitação 2 (Engenharia de Dados) criada.')

  // --- Solicitação 3 — Dev Frontend: Portal de autoatendimento ---
  // Critérios: Qtd telas (Alta=36h), Complexidade UX (Alta=32h), Responsividade (Alta=28h), Integração APIs (Média=16h)
  // esforcoTotal = 112, ganho = AUMENTO_RECEITA 25000 R$, peso 1.2
  // ganhoNormalizado = 25000 * 1.2 = 30000
  // scorePriorizacao = 30000 / 112 ≈ 267.857

  const feQtdTelas = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaFrontend.id, nome: 'Quantidade de telas' },
  })
  const feQtdTelasAlta = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: feQtdTelas.id, nome: 'Alta' },
  })

  const feUX = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaFrontend.id, nome: 'Complexidade de UX/interação' },
  })
  const feUXAlta = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: feUX.id, nome: 'Alta' },
  })

  const feResponsividade = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaFrontend.id, nome: 'Necessidade de responsividade' },
  })
  const feResponsividadeAlta = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: feResponsividade.id, nome: 'Alta' },
  })

  const feIntegracaoApis = await prisma.criterio.findFirstOrThrow({
    where: { areaId: areaFrontend.id, nome: 'Integração com APIs' },
  })
  const feIntegracaoApisMedia = await prisma.complexidade.findFirstOrThrow({
    where: { criterioId: feIntegracaoApis.id, nome: 'Média' },
  })

  const ganhoNorm3 = 25000 * 1.2
  const score3 = ganhoNorm3 / 112

  const sol3 = await prisma.solicitacao.create({
    data: {
      titulo: 'Portal de autoatendimento do cliente',
      descricao:
        'Desenvolver portal web para clientes consultarem faturas, abrirem chamados e atualizarem cadastro. Interface responsiva, 6 telas principais.',
      areaId: areaFrontend.id,
      status: 'APROVADO',
      esforcoTotal: 112,
      esforcoAprovado: true,
    },
  })

  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol3.id,
      criterioId: feQtdTelas.id,
      complexidadeId: feQtdTelasAlta.id,
      valorEsforco: 36,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol3.id,
      criterioId: feUX.id,
      complexidadeId: feUXAlta.id,
      valorEsforco: 32,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol3.id,
      criterioId: feResponsividade.id,
      complexidadeId: feResponsividadeAlta.id,
      valorEsforco: 28,
      fonte: 'IA',
    },
  })
  await prisma.solicitacaoCriterio.create({
    data: {
      solicitacaoId: sol3.id,
      criterioId: feIntegracaoApis.id,
      complexidadeId: feIntegracaoApisMedia.id,
      valorEsforco: 16,
      fonte: 'IA',
    },
  })

  await prisma.backlogItem.create({
    data: {
      solicitacaoId: sol3.id,
      tipoGanho: 'AUMENTO_RECEITA',
      valorGanho: 25000,
      unidadeGanho: 'R$',
      descricaoPremissa: 'Redução de churn e aumento de engajamento por disponibilizar autoatendimento 24/7',
      ganhoNormalizado: ganhoNorm3,
      scorePriorizacao: score3,
    },
  })

  console.log('Solicitação 3 (Dev Frontend) criada.')
  console.log('Seed concluído com sucesso.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
