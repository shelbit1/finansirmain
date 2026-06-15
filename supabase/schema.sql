-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NEW', 'FORM_SHOWED', 'AUTHORIZED', 'CONFIRMED', 'REJECTED', 'REFUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'DEBT_TAKE', 'DEBT_RETURN', 'DEBT_GIVE', 'DEBT_RECEIVE', 'ASSET_BUY');

-- CreateEnum
CREATE TYPE "DebtDirection" AS ENUM ('I_OWE', 'OWED_TO_ME');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'PARTIALLY_PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('PLAN_INCOME', 'PLAN_EXPENSE');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('REAL_ESTATE', 'VEHICLE', 'STOCKS', 'CRYPTO', 'DEPOSIT', 'BUSINESS', 'PRECIOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "RentierPropertyType" AS ENUM ('FREE_PURPOSE', 'STREET_RETAIL', 'SHOPPING_CENTER', 'LAND', 'PARKING', 'WAREHOUSE', 'STORAGE');

-- CreateEnum
CREATE TYPE "RentierPropertyStatus" AS ENUM ('WATCHING', 'NEGOTIATING', 'OWNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RentierEntrance" AS ENUM ('STREET', 'YARD', 'SHARED');

-- CreateEnum
CREATE TYPE "RentierCondition" AS ENUM ('SHELL', 'COSMETIC', 'GOOD', 'EXCELLENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "consentAcceptedAt" TIMESTAMP(3),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "PaymentStatus" NOT NULL DEFAULT 'NEW',
    "description" TEXT,
    "periodMonths" INTEGER NOT NULL DEFAULT 1,
    "tbankPaymentId" TEXT,
    "tbankStatus" TEXT,
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "incomeCategoryId" TEXT,
    "toAccountId" TEXT,
    "expenseCategoryId" TEXT,
    "fromAccountId" TEXT,
    "parentId" TEXT,
    "debtId" TEXT,
    "debtPaymentId" TEXT,
    "assetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "DebtDirection" NOT NULL,
    "personName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "dueDate" TIMESTAMP(3),
    "description" TEXT,
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "currentValue" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "purchaseDate" TIMESTAMP(3),
    "quantity" DECIMAL(18,4) DEFAULT 1,
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetValueHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetValueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentierProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RentierPropertyType" NOT NULL,
    "status" "RentierPropertyStatus" NOT NULL DEFAULT 'WATCHING',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "metro" TEXT,
    "metroWalk" INTEGER,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "yearBuilt" INTEGER,
    "area" DECIMAL(18,2),
    "ceilingH" DECIMAL(8,2),
    "entrance" "RentierEntrance",
    "condition" "RentierCondition",
    "askPrice" DECIMAL(18,2),
    "ownPrice" DECIMAL(18,2),
    "pricePerSqm" DECIMAL(18,2),
    "rentMonth" DECIMAL(18,2),
    "rentPerSqm" DECIMAL(18,2),
    "rentIndexPct" DECIMAL(6,2),
    "communal" DECIMAL(18,2),
    "communalPaidBy" TEXT,
    "tax" DECIMAL(18,2),
    "management" DECIMAL(18,2),
    "otherCosts" DECIMAL(18,2),
    "grossYield" DECIMAL(6,2),
    "netYield" DECIMAL(6,2),
    "paybackYears" DECIMAL(6,1),
    "hasTenants" BOOLEAN NOT NULL DEFAULT false,
    "tenantPlan" TEXT,
    "vacancyMonths" INTEGER,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentierProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentierTenant" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "area" DECIMAL(18,2),
    "rentMonth" DECIMAL(18,2),
    "leaseStart" TIMESTAMP(3),
    "leaseEnd" TIMESTAMP(3),
    "deposit" DECIMAL(18,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentierTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentierImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentierImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentierAIAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-opus-4-8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentierAIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tbankPaymentId_key" ON "Payment"("tbankPaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "IncomeCategory_userId_idx" ON "IncomeCategory"("userId");

-- CreateIndex
CREATE INDEX "IncomeCategory_parentId_idx" ON "IncomeCategory"("parentId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_userId_idx" ON "ExpenseCategory"("userId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_parentId_idx" ON "ExpenseCategory"("parentId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_parentId_idx" ON "Transaction"("parentId");

-- CreateIndex
CREATE INDEX "Transaction_debtId_idx" ON "Transaction"("debtId");

-- CreateIndex
CREATE INDEX "Transaction_assetId_idx" ON "Transaction"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckIn_userId_date_key" ON "DailyCheckIn"("userId", "date");

-- CreateIndex
CREATE INDEX "Debt_userId_status_idx" ON "Debt"("userId", "status");

-- CreateIndex
CREATE INDEX "DebtPayment_debtId_date_idx" ON "DebtPayment"("debtId", "date");

-- CreateIndex
CREATE INDEX "Plan_userId_completed_idx" ON "Plan"("userId", "completed");

-- CreateIndex
CREATE INDEX "Plan_userId_type_idx" ON "Plan"("userId", "type");

-- CreateIndex
CREATE INDEX "Asset_userId_type_idx" ON "Asset"("userId", "type");

-- CreateIndex
CREATE INDEX "AssetValueHistory_assetId_date_idx" ON "AssetValueHistory"("assetId", "date");

-- CreateIndex
CREATE INDEX "RentierProperty_userId_idx" ON "RentierProperty"("userId");

-- CreateIndex
CREATE INDEX "RentierProperty_userId_status_idx" ON "RentierProperty"("userId", "status");

-- CreateIndex
CREATE INDEX "RentierTenant_propertyId_idx" ON "RentierTenant"("propertyId");

-- CreateIndex
CREATE INDEX "RentierImage_propertyId_idx" ON "RentierImage"("propertyId");

-- CreateIndex
CREATE INDEX "RentierAIAnalysis_userId_createdAt_idx" ON "RentierAIAnalysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RentierAIAnalysis_propertyId_createdAt_idx" ON "RentierAIAnalysis"("propertyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeCategory" ADD CONSTRAINT "IncomeCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeCategory" ADD CONSTRAINT "IncomeCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IncomeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_incomeCategoryId_fkey" FOREIGN KEY ("incomeCategoryId") REFERENCES "IncomeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtPaymentId_fkey" FOREIGN KEY ("debtPaymentId") REFERENCES "DebtPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValueHistory" ADD CONSTRAINT "AssetValueHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValueHistory" ADD CONSTRAINT "AssetValueHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentierProperty" ADD CONSTRAINT "RentierProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentierTenant" ADD CONSTRAINT "RentierTenant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentierProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentierImage" ADD CONSTRAINT "RentierImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentierProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentierAIAnalysis" ADD CONSTRAINT "RentierAIAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentierAIAnalysis" ADD CONSTRAINT "RentierAIAnalysis_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentierProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

