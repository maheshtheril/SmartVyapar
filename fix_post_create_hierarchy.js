const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const correctCreate = `          return await tx.customer.create({
            data: { 
              tenantId, 
              name, 
              phone, 
              email: email || null,
              address: address || null,
              pincode: pincode || null,
              gstin: gstin || null, 
              stateCode: stateCode || "32",
              accountId: arAccount.id,
              outstandingBalance: parseFloat(openingBalance) || 0,
              regionId: regionId || null,
              zoneId: zoneId || null,
              territoryId: territoryId || null,
              beatId: beatId || null
            },
          });`;

c = c.replace(/return await tx\.customer\.create\(\{\s*data: \{\s*tenantId,\s*name,\s*phone,\s*email: email \|\| null,\s*address: address \|\| null,\s*pincode: pincode \|\| null,\s*gstin: gstin \|\| null,\s*stateCode: stateCode \|\| "32",\s*accountId: arAccount\.id,\s*outstandingBalance: parseFloat\(openingBalance\) \|\| 0\s*\},?\s*\}\);/m, correctCreate);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed hierarchy missing in customer.create POST');
