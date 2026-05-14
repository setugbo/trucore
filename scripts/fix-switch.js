const fs = require("fs");
let c = fs.readFileSync("src/app/dashboard/admin/page.tsx", "utf-8");
c = c.replace(/\s+size="sm"/g, "");
fs.writeFileSync("src/app/dashboard/admin/page.tsx", c);
console.log("Done");
