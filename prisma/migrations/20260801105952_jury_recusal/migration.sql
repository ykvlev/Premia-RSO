-- Самоотвод жюри (конфликт интересов).
CREATE TABLE "JuryRecusal" (
    "id" TEXT NOT NULL,
    "juryUserId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JuryRecusal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JuryRecusal_juryUserId_applicationId_key" ON "JuryRecusal"("juryUserId", "applicationId");
CREATE INDEX "JuryRecusal_applicationId_idx" ON "JuryRecusal"("applicationId");
