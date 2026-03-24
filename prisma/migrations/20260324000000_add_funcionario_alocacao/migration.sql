-- CreateTable
CREATE TABLE "funcionarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alocacoes" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "backlogItemId" TEXT,
    "titulo" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "areaSolicitante" TEXT,
    "cor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alocacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_backlogItemId_fkey" FOREIGN KEY ("backlogItemId") REFERENCES "backlog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
