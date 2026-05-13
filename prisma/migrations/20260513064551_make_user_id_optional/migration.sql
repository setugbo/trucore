-- DropForeignKey
ALTER TABLE "GeneralSurveyResponse" DROP CONSTRAINT "GeneralSurveyResponse_userId_fkey";

-- AlterTable
ALTER TABLE "GeneralSurveyResponse" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GeneralSurveyResponse" ADD CONSTRAINT "GeneralSurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
