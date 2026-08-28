ALTER TABLE "JuryRecusal"
  ADD CONSTRAINT "JuryRecusal_juryUserId_fkey"
  FOREIGN KEY ("juryUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JuryRecusal"
  ADD CONSTRAINT "JuryRecusal_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_applicationId_fkey";
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_applicationId_fkey";
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_juryUserId_fkey";
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_juryUserId_fkey"
  FOREIGN KEY ("juryUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JuryAssignment" DROP CONSTRAINT "JuryAssignment_juryUserId_fkey";
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_juryUserId_fkey"
  FOREIGN KEY ("juryUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JuryAssignment" DROP CONSTRAINT "JuryAssignment_nominationId_fkey";
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_nominationId_fkey"
  FOREIGN KEY ("nominationId") REFERENCES "Nomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
