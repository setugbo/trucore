-- AlterTable: Add publicReportSlug to Organization
ALTER TABLE "Organization" ADD COLUMN "publicReportSlug" TEXT;
CREATE UNIQUE INDEX "Organization_publicReportSlug_key" ON "Organization"("publicReportSlug");
