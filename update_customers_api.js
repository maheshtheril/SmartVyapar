const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const replaceLogic = `
      customer = await prisma.$transaction(async (tx) => {
        const arAccount = await tx.account.create({
          data: {
            tenantId,
            code: \`AR-\${Date.now().toString().slice(-6)}\`,
            name: \`Customer: \${name}\`,
            classification: 'ASSET',
            balance: 0,
          }
        });
        return await tx.customer.create({
          data: { 
            tenantId, 
            name, 
            phone, 
            gstin: gstin || null, 
            stateCode: stateCode || "32",
            accountId: arAccount.id
          },
        });
      });
`;

c = c.replace(/customer = await prisma\.customer\.create\(\{\n\s*data: \{ tenantId, name, phone, gstin: gstin \|\| null, stateCode: stateCode \|\| "32" \},\n\s*\}\);/, replaceLogic);

fs.writeFileSync(p, c, 'utf8');
console.log('Updated customer API');
