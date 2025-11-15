-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "initialValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "borrowedAmount" DOUBLE PRECISION NOT NULL,
    "marginCallLevel" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shares" INTEGER NOT NULL,
    "avgPrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentThesis" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "risks" TEXT[],
    "indicators" TEXT[],
    "targetPrice" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "timeHorizon" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentThesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChecklist" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalTasks" INTEGER NOT NULL,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTask" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "condition" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Portfolio_type_idx" ON "Portfolio"("type");

-- CreateIndex
CREATE INDEX "Stock_portfolioId_idx" ON "Stock"("portfolioId");

-- CreateIndex
CREATE INDEX "Stock_symbol_idx" ON "Stock"("symbol");

-- CreateIndex
CREATE INDEX "InvestmentThesis_portfolioId_idx" ON "InvestmentThesis"("portfolioId");

-- CreateIndex
CREATE INDEX "InvestmentThesis_status_idx" ON "InvestmentThesis"("status");

-- CreateIndex
CREATE INDEX "DailyChecklist_portfolioId_idx" ON "DailyChecklist"("portfolioId");

-- CreateIndex
CREATE INDEX "DailyChecklist_date_idx" ON "DailyChecklist"("date");

-- CreateIndex
CREATE INDEX "ChecklistTask_checklistId_idx" ON "ChecklistTask"("checklistId");

-- CreateIndex
CREATE INDEX "ChecklistTask_portfolioId_idx" ON "ChecklistTask"("portfolioId");

-- CreateIndex
CREATE INDEX "ChecklistTask_category_idx" ON "ChecklistTask"("category");

-- CreateIndex
CREATE INDEX "ChecklistTask_completed_idx" ON "ChecklistTask"("completed");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentThesis" ADD CONSTRAINT "InvestmentThesis_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChecklist" ADD CONSTRAINT "DailyChecklist_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTask" ADD CONSTRAINT "ChecklistTask_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "DailyChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
