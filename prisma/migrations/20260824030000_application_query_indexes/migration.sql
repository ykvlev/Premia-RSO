CREATE INDEX "Application_userId_idx" ON "Application" ("userId");
CREATE INDEX "Application_email_idx" ON "Application" ("email");
CREATE INDEX "Application_nominationId_status_idx" ON "Application" ("nominationId", "status");
CREATE INDEX "Application_region_idx" ON "Application" ("region");
CREATE INDEX "Evaluation_juryUserId_idx" ON "Evaluation" ("juryUserId");
CREATE INDEX "JuryAssignment_juryUserId_idx" ON "JuryAssignment" ("juryUserId");
CREATE INDEX "JuryAssignment_nominationId_idx" ON "JuryAssignment" ("nominationId");
