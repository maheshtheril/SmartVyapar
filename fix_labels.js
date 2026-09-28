const fs = require('fs');

const path = 'C:\\2035-HMS\\ZionaPOS\\src\\app\\(app)\\accounting\\vouchers\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the template literals by adding $ before the {} brackets so JS evaluates them properly
content = content.replace(/label: `\[\{a\.code\}\] \{a\.name\} \(\{a\.classification\} • Bal: ₹\{Number\(a\.balance\)\.toFixed\(2\)\}\)`/g, 
  "label: `[${a.code}] ${a.name} (${a.classification} • Bal: ₹${Number(a.balance).toFixed(2)})`"
);

content = content.replace(/label: `\[\{a\.code\}\] \{a\.name\} \(\{a\.classification\}\)`/g, 
  "label: `[${a.code}] ${a.name} (${a.classification})`"
);

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed label formatting.");
