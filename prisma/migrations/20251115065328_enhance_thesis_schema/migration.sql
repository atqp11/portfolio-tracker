/*
  Warnings:

  - You are about to drop the column `confidence` on the `InvestmentThesis` table. All the data in the column will be lost.
  - You are about to drop the column `indicators` on the `InvestmentThesis` table. All the data in the column will be lost.
  - You are about to drop the column `stopLoss` on the `InvestmentThesis` table. All the data in the column will be lost.
  - You are about to drop the column `targetPrice` on the `InvestmentThesis` table. All the data in the column will be lost.
  - You are about to drop the column `timeHorizon` on the `InvestmentThesis` table. All the data in the column will be lost.
  - Added the required column `exitCriteria` to the `InvestmentThesis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `keyMetrics` to the `InvestmentThesis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stopLossRules` to the `InvestmentThesis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thesisHealthScore` to the `InvestmentThesis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticker` to the `InvestmentThesis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urgency` to the `InvestmentThesis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InvestmentThesis" DROP COLUMN "confidence",
DROP COLUMN "indicators",
DROP COLUMN "stopLoss",
DROP COLUMN "targetPrice",
DROP COLUMN "timeHorizon",
ADD COLUMN     "bearCase" TEXT,
ADD COLUMN     "exitCriteria" JSONB NOT NULL,
ADD COLUMN     "keyMetrics" JSONB NOT NULL,
ADD COLUMN     "lastValidated" TIMESTAMP(3),
ADD COLUMN     "stopLossRules" JSONB NOT NULL,
ADD COLUMN     "thesisHealthScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "ticker" TEXT NOT NULL,
ADD COLUMN     "urgency" TEXT NOT NULL,
ADD COLUMN     "validationHistory" JSONB;

-- CreateIndex
CREATE INDEX "InvestmentThesis_urgency_idx" ON "InvestmentThesis"("urgency");
