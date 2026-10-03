const fs = require('fs');

const path = 'src/app/api/purchase/[id]/route.ts';
let c = fs.readFileSync(path, 'utf8');

const regex = /\s*\/\/ Delete Stock Logs for this bill\s*await tx\.stockLog\.deleteMany\(\{\s*where: \{ tenantId, referenceId: bill\.billNumber, type: "PURCHASE_IN" \}\s*\}\);\s*\}/g;

const replacement = `
        }
        // Delete Stock Logs for this bill
        await tx.stockLog.deleteMany({
          where: { tenantId, referenceId: bill.billNumber, type: "PURCHASE_IN" }
        });`;

c = c.replace(regex, replacement);

fs.writeFileSync(path, c);
console.log("Fixed DELETE performance loop.");
