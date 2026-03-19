# Calculadora Inteligente de Esforço e Priorização de Backlog

Ferramenta web para calcular esforço de demandas de desenvolvimento usando IA e parametrização, com priorização automática de backlog baseada na relação ganho/esforço.

## Visão Geral

O sistema permite que times:
1. **Parametrizem** critérios de complexidade por área de atuação
2. **Estimem** esforço automaticamente usando IA que analisa solicitações em linguagem natural
3. **Ajustem** manualmente as sugestões da IA antes de aprovar
4. **Priorizem** o backlog com ranking automático baseado em ganho esperado vs esforço

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Backend | Next.js API Routes |
| Banco de dados | SQLite (dev) via Prisma ORM |
| Estilização | Tailwind CSS v4 |
| IA | Camada desacoplada (Mock / OpenAI / Anthropic) |
| Testes | Jest + ts-jest |
| Validação | Zod |

**Por que esta stack?**
- Next.js unifica frontend e backend em um único projeto
- Prisma permite trocar SQLite por PostgreSQL sem alterar código
- Camada de IA desacoplada permite trocar provider sem impacto
- Funções puras para cálculos garantem testabilidade

## Estrutura de Pastas

```
src/
├── app/                          # Pages e API routes (App Router)
│   ├── api/
│   │   ├── areas/                # CRUD áreas
│   │   ├── criterios/            # CRUD critérios
│   │   ├── complexidades/        # CRUD complexidades
│   │   ├── esforcos/             # CRUD esforços
│   │   ├── solicitacoes/         # Solicitações + IA + critérios + aprovação
│   │   │   └── [id]/
│   │   │       ├── analisar/     # POST - análise IA
│   │   │       ├── criterios/    # POST/DELETE - ajuste manual
│   │   │       ├── recalcular/   # POST - recálculo
│   │   │       └── aprovar/      # POST - aprovação
│   │   ├── backlog/              # Backlog priorizado
│   │   └── audit-logs/           # Logs de auditoria
│   ├── areas/                    # Página gestão de áreas
│   ├── criterios/                # Página gestão de critérios
│   ├── complexidades/            # Página gestão de complexidades
│   ├── esforcos/                 # Página gestão de esforços
│   ├── solicitacoes/nova/        # Página calculadora inteligente
│   ├── backlog/                  # Página backlog + detalhe
│   └── page.tsx                  # Dashboard
├── components/
│   ├── Sidebar.tsx               # Navegação lateral
│   └── ui/                       # Componentes reutilizáveis
│       ├── StatusBadge.tsx
│       ├── SourceBadge.tsx       # IA vs Manual
│       ├── ConfidenceBadge.tsx
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       ├── ConfirmDialog.tsx
│       └── PageHeader.tsx
├── lib/
│   ├── ai/                       # Camada de IA
│   │   ├── types.ts              # Interfaces (IAProvider, etc)
│   │   ├── mock-provider.ts      # Provider mock (sem API key)
│   │   ├── openai-provider.ts    # Provider OpenAI
│   │   ├── anthropic-provider.ts # Provider Anthropic
│   │   ├── prompt-builder.ts     # Construção de prompts
│   │   ├── response-validator.ts # Validação de respostas
│   │   └── index.ts              # Factory
│   ├── config/
│   │   ├── gain-weights.ts       # Pesos de normalização
│   │   └── status.ts             # Status das entidades
│   ├── services/
│   │   ├── effort-calculator.ts  # Cálculo de esforço (puro)
│   │   ├── prioritization.ts     # Priorização/ranking (puro)
│   │   └── audit.ts              # Auditoria
│   ├── validators/
│   │   └── schemas.ts            # Schemas Zod
│   └── prisma.ts                 # Singleton Prisma
├── __tests__/
│   ├── effort-calculator.test.ts
│   ├── prioritization.test.ts
│   └── response-validator.test.ts
└── generated/prisma/             # Prisma Client gerado
prisma/
├── schema.prisma                 # Modelo de dados
├── migrations/                   # Migrations
└── seed.ts                       # Dados de exemplo
```

## Modelo de Dados

```
Area 1──N Criterio 1──N Complexidade
                   │
                   └──N Esforco (UNIQUE: criterio+complexidade)

Solicitacao N──M Criterio (via SolicitacaoCriterio)
           │
           └──1 BacklogItem (após aprovação + ganho)

GainWeightConfig  (pesos de normalização por tipo de ganho)
AuditLog          (histórico de alterações)
```

**Entidades principais:**
- **Area**: área de atuação (BI, Engenharia de Dados, etc)
- **Criterio**: fator de complexidade vinculado a uma área
- **Complexidade**: nível (Baixa, Média, Alta, Muito Alta) por critério
- **Esforco**: valor parametrizado para cada combinação critério+complexidade
- **Solicitacao**: demanda de desenvolvimento
- **SolicitacaoCriterio**: critérios associados com fonte (IA/Manual)
- **BacklogItem**: demanda aprovada com ganho e score

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz (já existe após setup):

```env
DATABASE_URL="file:./dev.db"

# Provider de IA: "mock" (padrão), "openai" ou "anthropic"
AI_PROVIDER="mock"

# Se usar OpenAI
OPENAI_API_KEY="sk-..."

# Se usar Anthropic
ANTHROPIC_API_KEY="sk-ant-..."
```

## Setup Local

```bash
# 1. Instalar dependências
npm install

# 2. Aplicar migrations (cria o banco SQLite)
npx prisma migrate dev

# 3. Popular com dados de exemplo
npx prisma db seed

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**

## Como Rodar Testes

```bash
npm test
```

Testa: cálculo de esforço, priorização/ranking, normalização de ganho, validação de respostas da IA.

## Fórmulas de Cálculo

### Esforço Total
```
esforco_total = Σ(esforco_por_criterio)
```
Cada esforço vem da parametrização: `Critério + Complexidade → valor_esforco`

### Score de Priorização
```
ganho_normalizado = valor_ganho × peso_tipo_ganho
score = ganho_normalizado / esforco_total
```

### Pesos de Normalização (configuráveis)
| Tipo de Ganho | Peso | Unidade |
|---------------|------|---------|
| Redução de Custo | 1.0 | R$ |
| Aumento de Receita | 1.2 | R$ |
| Redução de Horas | 0.8 | horas/mês |

## Fluxos Funcionais

### Fluxo A: Parametrização
1. Cadastrar **Área** → 2. Cadastrar **Critérios** da área → 3. Cadastrar **Complexidades** por critério → 4. Cadastrar **Esforço** por combinação critério+complexidade

### Fluxo B: Estimativa Automática
1. Criar solicitação (título, descrição, área) → 2. IA analisa e sugere critérios/complexidades → 3. Sistema calcula esforço parcial e total → 4. Exibe memória de cálculo

### Fluxo C: Ajuste Manual
1. Operador adiciona/remove critérios → 2. Altera complexidades → 3. Clica **"Recalcular"** → 4. Aprova esforço final

### Fluxo D: Priorização
1. Após aprovação, informa ganho esperado (tipo + valor) → 2. Sistema normaliza e calcula score → 3. Demanda entra no backlog ranqueado automaticamente

### Fluxo E: Gestão do Backlog
Visualizar ranking → Filtrar por área/status/tipo de ganho → Acompanhar posição e score → Atualizar status

## API Endpoints

### Parametrização
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/areas` | Listar/criar áreas |
| GET/PUT/DELETE | `/api/areas/[id]` | Área por ID |
| GET/POST | `/api/criterios` | Listar/criar critérios (?areaId) |
| GET/PUT | `/api/criterios/[id]` | Critério por ID |
| GET/POST | `/api/complexidades` | Listar/criar complexidades (?criterioId) |
| GET/PUT | `/api/complexidades/[id]` | Complexidade por ID |
| GET/POST | `/api/esforcos` | Listar/criar esforços (?criterioId) |
| GET/PUT | `/api/esforcos/[id]` | Esforço por ID |

### Solicitações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/solicitacoes` | Listar/criar solicitações |
| GET/PUT | `/api/solicitacoes/[id]` | Solicitação por ID |
| POST | `/api/solicitacoes/[id]/analisar` | Análise IA |
| POST/DELETE | `/api/solicitacoes/[id]/criterios` | Ajuste manual de critérios |
| POST | `/api/solicitacoes/[id]/recalcular` | Recalcular esforço |
| POST | `/api/solicitacoes/[id]/aprovar` | Aprovar esforço |

### Backlog
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/backlog` | Listar ranking / criar item |
| GET/PUT | `/api/backlog/[id]` | Detalhe / atualizar status |
| GET | `/api/audit-logs` | Logs de auditoria |

## Regras de UX

A interface diferencia claramente:
- **Sugestões da IA**: borda azul à esquerda, badge "IA" azul
- **Alterações manuais**: borda verde, badge "Manual" verde
- **Modificações pendentes**: fundo amarelo (até recalcular)
- **Score e ranking**: exibidos de forma proeminente no backlog

## Dados Seed

O seed cria dados realistas para demonstração:
- **5 áreas**: BI, Engenharia de Dados, Dev Backend, Dev Frontend, Analytics
- **25+ critérios** distribuídos por área
- **100+ combinações** complexidade/esforço parametrizadas
- **3 solicitações** já aprovadas e ranqueadas no backlog
- **Pesos de ganho** configurados

## Premissas e Decisões

1. **SQLite para dev**: simplicidade, sem necessidade de servidor. Trocar para PostgreSQL alterando apenas `DATABASE_URL`.
2. **Mock provider como padrão**: permite demonstração sem API key de IA.
3. **Recálculo explícito**: operador controla quando recalcular, evitando surpresas.
4. **Pesos globais de ganho**: aplicados a todos os itens igualmente. Extensível para pesos por área.
5. **Sem autenticação na v1**: campo `usuario` preparado na auditoria para integração futura.
6. **Nomenclatura mista**: código em inglês, UI e dados em português.

## Limitações Atuais

- Mock provider usa word matching simples (sem LLM real)
- SQLite não é ideal para produção multi-usuário
- Sem autenticação/autorização
- Sem paginação nas listagens (adequado para volumes moderados)
- Pesos de normalização são globais

## Próximos Passos Recomendados

1. Integrar provider de IA real (OpenAI/Anthropic)
2. Adicionar autenticação (NextAuth.js)
3. Migrar para PostgreSQL em produção
4. Dashboard com gráficos (Chart.js/Recharts)
5. Exportação de dados (CSV, PDF)
6. Notificações de mudança de status
7. Pesos de normalização configuráveis por área
8. Paginação e busca avançada
9. Docker Compose para deploy
