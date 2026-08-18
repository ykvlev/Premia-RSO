-- Права жюри (score, comment, changeStatus, viewContacts) в JSON.
ALTER TABLE "User" ADD COLUMN "permissions" JSONB;
