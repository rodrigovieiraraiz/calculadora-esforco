-- CreateTable
CREATE TABLE "hourly_rate_config" (
    "id" TEXT NOT NULL,
    "valorHora" DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hourly_rate_config_pkey" PRIMARY KEY ("id")
);

-- Seed default value
INSERT INTO "hourly_rate_config" ("id", "valorHora", "createdAt", "updatedAt")
VALUES ('default', 150.0, NOW(), NOW());
