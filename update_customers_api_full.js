const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/select: \{\s*id: true,\s*name: true,\s*phone: true,\s*gstin: true,\s*stateCode: true,\s*outstandingBalance: true,\s*loyaltyPoints: true,\s*createdAt: true,\s*_count: \{ select: \{ invoices: true \} \},\s*\}/, 
`select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        pincode: true,
        gstin: true,
        stateCode: true,
        outstandingBalance: true,
        loyaltyPoints: true,
        createdAt: true,
        _count: { select: { invoices: true } },
      }`);

c = c.replace(/const \{ name, phone, gstin, stateCode \} = body;/, 'const { name, phone, gstin, stateCode, email, address, pincode } = body;');

c = c.replace(/data: \{ name, gstin: gstin \|\| null, stateCode: stateCode \|\| "32" \},/, 
`data: { 
          name, 
          gstin: gstin || null, 
          stateCode: stateCode || "32",
          email: email || null,
          address: address || null,
          pincode: pincode || null
        },`);

c = c.replace(/data: \{ \n\s*tenantId, \n\s*name, \n\s*phone, \n\s*gstin: gstin \|\| null, \n\s*stateCode: stateCode \|\| "32",\n\s*accountId: arAccount\.id\n\s*\}/, 
`data: { 
            tenantId, 
            name, 
            phone, 
            email: email || null,
            address: address || null,
            pincode: pincode || null,
            gstin: gstin || null, 
            stateCode: stateCode || "32",
            accountId: arAccount.id
          }`);

fs.writeFileSync(p, c, 'utf8');
console.log('Customers API updated for full fields');
