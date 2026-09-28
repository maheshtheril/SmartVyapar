const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\suppliers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

// Remove stateCode and pincode from destructuring
c = c.replace(/const \{ id, name, phone, gstin, stateCode, email, address, pincode \} = body;/, 
              "const { id, name, phone, gstin, email, address } = body;");

// Remove stateCode and pincode from data object
c = c.replace(/stateCode: stateCode \|\| "32",/, "");
c = c.replace(/pincode: pincode \|\| null,/, "");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed invalid fields in Suppliers API');
