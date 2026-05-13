const fs = require("fs");
const files = [
  "src/app/api/general-surveys/[id]/route.ts",
  "src/app/api/general-surveys/[surveyId]/responses/route.ts",
  "src/app/api/anonymous-surveys/[id]/route.ts",
  "src/app/api/anonymous-surveys/[surveyId]/responses/route.ts",
  "src/app/api/cases/[id]/route.ts",
  "src/app/api/cases/[caseId]/messages/route.ts",
  "src/app/api/organizations/[id]/route.ts",
];
for (const f of files) {
  try {
    let content = fs.readFileSync(f, "utf-8");
    if (!content.includes("export const dynamic")) {
      content = content.replace(
        /(import .+;)\s*\n/,
        '$1\n\nexport const dynamic = "force-dynamic";\n'
      );
      fs.writeFileSync(f, content);
      console.log("UPDATED:", f);
    } else {
      console.log("SKIPPED:", f);
    }
  } catch (e) {
    console.log("ERROR:", f, e.message);
  }
}
