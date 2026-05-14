const fs = require("fs");
let c = fs.readFileSync("prisma/schema.prisma", "utf-8");

const newModels = `
model Module {
  id        String   @id @default(cuid())
  type      String   @unique
  name      String
  description String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  permissions UserModulePermission[]
}

model UserModulePermission {
  id             String  @id @default(cuid())
  userId         String
  organizationId String
  moduleId       String
  canView        Boolean @default(false)
  canCreate      Boolean @default(false)
  canEdit        Boolean @default(false)
  canDelete      Boolean @default(false)
  createdAt      DateTime @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  module       Module       @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId, moduleId])
  @@index([userId])
  @@index([organizationId])
}
`;

// Add UserModulePermission relation to User model
c = c.replace(
  "notifications Notification[]",
  "notifications Notification[]\n  modulePermissions UserModulePermission[]"
);

// Insert models before the closing of last model (before model GeneralSurvey)
const insertPos = c.lastIndexOf("model GeneralSurvey");
c = c.slice(0, insertPos) + newModels + "\n" + c.slice(insertPos);

fs.writeFileSync("prisma/schema.prisma", c);
console.log("Done");
