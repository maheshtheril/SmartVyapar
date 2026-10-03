const fs = require('fs');

const path = 'src/app/api/purchase/[id]/route.ts';
let c = fs.readFileSync(path, 'utf8');

// Move deleteMany outside the loop
const badLoopEnd = `        // Delete Stock Logs for this bill
        await tx.stockLog.deleteMany({
          where: { tenantId, referenceId: bill.billNumber, type: "PURCHASE_IN" }
        });
      }

      // Reverse Accounts`;

const goodLoopEnd = `      }

      // Delete Stock Logs for this bill (moved outside loop to prevent 33x redundant DB queries)
      await tx.stockLog.deleteMany({
        where: { tenantId, referenceId: bill.billNumber, type: "PURCHASE_IN" }
      });

      // Reverse Accounts`;

c = c.replace(badLoopEnd, goodLoopEnd);

// Increase transaction timeouts for huge AI bills
c = c.replace(/maxWait: 10000, timeout: 30000/g, "maxWait: 20000, timeout: 80000");

fs.writeFileSync(path, c);
console.log("Fixed DELETE performance bug and timeout.");
