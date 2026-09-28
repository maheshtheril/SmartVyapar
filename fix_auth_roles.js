const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\lib\\\\auth.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/if \(\!allowedRoles\.includes\(session\.role\)\) \{/, 
`if (session.role !== 'OWNER' && !allowedRoles.includes(session.role)) {`);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed requireRole to always allow OWNER');
