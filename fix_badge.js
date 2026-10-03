const fs = require('fs');
const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/NEW AI ALIAS/g, "NEW ALIAS");

fs.writeFileSync(path, c);
console.log("Replaced AI ALIAS text");
