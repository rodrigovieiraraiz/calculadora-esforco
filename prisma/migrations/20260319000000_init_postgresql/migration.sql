-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "componentes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "areaId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "componentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterios" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "criterios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complexidades" (
    "id" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complexidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esforcos" (
    "id" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,
    "complexidadeId" TEXT NOT NULL,
    "componenteId" TEXT,
    "valorEsforco" DOUBLE PRECISION NOT NULL,
    "unidadeEsforco" TEXT NOT NULL DEFAULT 'horas',
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esforcos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "contexto" TEXT,
    "urgencia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "esforcoTotal" DOUBLE PRECISION,
    "esforcoAprovado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "areaSolicitante" TEXT,
    "solicitante" TEXT,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacao_criterios" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,
    "complexidadeId" TEXT NOT NULL,
    "componenteId" TEXT,
    "valorEsforco" DOUBLE PRECISION NOT NULL,
    "fonte" TEXT NOT NULL DEFAULT 'IA',
    "justificativa" TEXT,
    "confianca" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacao_criterios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlog_items" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "tipoGanho" TEXT NOT NULL,
    "valorGanho" DOUBLE PRECISION NOT NULL,
    "unidadeGanho" TEXT NOT NULL,
    "descricaoPremissa" TEXT,
    "ganhoNormalizado" DOUBLE PRECISION NOT NULL,
    "scorePriorizacao" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NAO_INICIADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "previsaoConclusao" TIMESTAMP(3),

    CONSTRAINT "backlog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gain_weight_config" (
    "id" TEXT NOT NULL,
    "tipoGanho" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gain_weight_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT,
    "googleId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "dadosAnteriores" TEXT,
    "dadosNovos" TEXT,
    "usuario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_nome_key" ON "areas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "componentes_areaId_nome_key" ON "componentes"("areaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "criterios_areaId_nome_key" ON "criterios"("areaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "complexidades_criterioId_nome_key" ON "complexidades"("criterioId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "esforcos_criterioId_complexidadeId_componenteId_key" ON "esforcos"("criterioId", "complexidadeId", "componenteId");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacao_criterios_solicitacaoId_criterioId_componenteId_key" ON "solicitacao_criterios"("solicitacaoId", "criterioId", "componenteId");

-- CreateIndex
CREATE UNIQUE INDEX "backlog_items_solicitacaoId_key" ON "backlog_items"("solicitacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "gain_weight_config_tipoGanho_key" ON "gain_weight_config"("tipoGanho");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterios" ADD CONSTRAINT "criterios_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complexidades" ADD CONSTRAINT "complexidades_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "criterios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esforcos" ADD CONSTRAINT "esforcos_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "criterios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esforcos" ADD CONSTRAINT "esforcos_complexidadeId_fkey" FOREIGN KEY ("complexidadeId") REFERENCES "complexidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esforcos" ADD CONSTRAINT "esforcos_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "componentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_criterios" ADD CONSTRAINT "solicitacao_criterios_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_criterios" ADD CONSTRAINT "solicitacao_criterios_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "criterios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_criterios" ADD CONSTRAINT "solicitacao_criterios_complexidadeId_fkey" FOREIGN KEY ("complexidadeId") REFERENCES "complexidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_criterios" ADD CONSTRAINT "solicitacao_criterios_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "componentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_items" ADD CONSTRAINT "backlog_items_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
