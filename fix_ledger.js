const fs = require('fs');

const path = 'src/app/api/purchase/[id]/route.ts';
let c = fs.readFileSync(path, 'utf8');

// Fix the PUT reversal block
c = c.replace(
  /\/\/ Debit side: undo inventory & ITC\s+if \(inventoryAcc\) \{\s+await tx\.account\.update\(\{\s+where: \{ id: inventoryAcc\.id \},\s+data: \{ balance: \{ decrement: oldTaxable \} \},\s+\}\);\s+\}\s+if \(cgstAcc && oldCgst > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: cgstAcc\.id \},\s*data: \{ balance: \{ decrement: oldCgst \} \}\s*\}\);\s+\}\s+if \(sgstAcc && oldSgst > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: sgstAcc\.id \},\s*data: \{ balance: \{ decrement: oldSgst \} \}\s*\}\);\s+\}\s+if \(igstAcc && oldIgst > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: igstAcc\.id \},\s*data: \{ balance: \{ decrement: oldIgst \} \}\s*\}\);\s+\}/g,
  `const tenantMeta = await tx.tenant.findUnique({ where: { id: tenantId } });
        const isComp = tenantMeta?.isComposition === true;
        
        // Debit side: undo inventory & ITC
        if (inventoryAcc) {
          const oldInventoryDebit = isComp ? oldTotal : oldTaxable;
          await tx.account.update({
            where: { id: inventoryAcc.id },
            data: { balance: { decrement: oldInventoryDebit } },
          });
        }
        if (!isComp) {
          if (cgstAcc && oldCgst > 0) {
            await tx.account.update({ where: { id: cgstAcc.id }, data: { balance: { decrement: oldCgst } } });
          }
          if (sgstAcc && oldSgst > 0) {
            await tx.account.update({ where: { id: sgstAcc.id }, data: { balance: { decrement: oldSgst } } });
          }
          if (igstAcc && oldIgst > 0) {
            await tx.account.update({ where: { id: igstAcc.id }, data: { balance: { decrement: oldIgst } } });
          }
        }`
);

// Fix the PUT post new ledger block
c = c.replace(
  /if \(inventoryAcc\) \{\s+await tx\.account\.update\(\{\s+where: \{ id: inventoryAcc\.id \},\s+data: \{ balance: \{ increment: totalTaxable \} \},\s+\}\);\s+\}\s+if \(cgstAcc && cgstAmount > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: cgstAcc\.id \},\s*data: \{ balance: \{ increment: cgstAmount \} \}\s*\}\);\s+\}\s+if \(sgstAcc && sgstAmount > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: sgstAcc\.id \},\s*data: \{ balance: \{ increment: sgstAmount \} \}\s*\}\);\s+\}\s+if \(igstAcc && igstAmount > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: igstAcc\.id \},\s*data: \{ balance: \{ increment: igstAmount \} \}\s*\}\);\s+\}/g,
  `if (inventoryAcc) {
          const inventoryDebit = isComp ? totalAmount : totalTaxable;
          await tx.account.update({
            where: { id: inventoryAcc.id },
            data: { balance: { increment: inventoryDebit } },
          });
        }
        if (!isComp) {
          if (cgstAcc && cgstAmount > 0) {
            await tx.account.update({ where: { id: cgstAcc.id }, data: { balance: { increment: cgstAmount } } });
          }
          if (sgstAcc && sgstAmount > 0) {
            await tx.account.update({ where: { id: sgstAcc.id }, data: { balance: { increment: sgstAmount } } });
          }
          if (igstAcc && igstAmount > 0) {
            await tx.account.update({ where: { id: igstAcc.id }, data: { balance: { increment: igstAmount } } });
          }
        }`
);

// Fix the DELETE block
c = c.replace(
  /if \(accountMap\.get\("1300"\)\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: accountMap\.get\("1300"\)!\.id \},\s*data: \{ balance: \{ decrement: bill\.totalTaxable \} \}\s*\}\);\s+\}\s+if \(accountMap\.get\("1410"\) && Number\(bill\.cgstAmount\) > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: accountMap\.get\("1410"\)!\.id \},\s*data: \{ balance: \{ decrement: bill\.cgstAmount \} \}\s*\}\);\s+\}\s+if \(accountMap\.get\("1420"\) && Number\(bill\.sgstAmount\) > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: accountMap\.get\("1420"\)!\.id \},\s*data: \{ balance: \{ decrement: bill\.sgstAmount \} \}\s*\}\);\s+\}\s+if \(accountMap\.get\("1430"\) && Number\(bill\.igstAmount\) > 0\) \{\s+await tx\.account\.update\(\{\s*where: \{ id: accountMap\.get\("1430"\)!\.id \},\s*data: \{ balance: \{ decrement: bill\.igstAmount \} \}\s*\}\);\s+\}/g,
  `const tenantMetaDel = await tx.tenant.findUnique({ where: { id: tenantId } });
        const isCompDel = tenantMetaDel?.isComposition === true;
        
        if (accountMap.get("1300")) {
          const invDec = isCompDel ? Number(bill.totalAmount) : Number(bill.totalTaxable);
          await tx.account.update({ where: { id: accountMap.get("1300")!.id }, data: { balance: { decrement: invDec } } });
        }
        if (!isCompDel) {
          if (accountMap.get("1410") && Number(bill.cgstAmount) > 0) {
            await tx.account.update({ where: { id: accountMap.get("1410")!.id }, data: { balance: { decrement: bill.cgstAmount } } });
          }
          if (accountMap.get("1420") && Number(bill.sgstAmount) > 0) {
            await tx.account.update({ where: { id: accountMap.get("1420")!.id }, data: { balance: { decrement: bill.sgstAmount } } });
          }
          if (accountMap.get("1430") && Number(bill.igstAmount) > 0) {
            await tx.account.update({ where: { id: accountMap.get("1430")!.id }, data: { balance: { decrement: bill.igstAmount } } });
          }
        }`
);

fs.writeFileSync(path, c);
console.log("Fixed composition ledger bug for PUT and DELETE.");
