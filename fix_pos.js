const fs = require('fs');
const path = 'src/app/(app)/billing/new/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/upiId: string;\s*}>\(\{/, 'upiId: string;\n    isComposition?: boolean;\n  }>({');
c = c.replace(/upiId: data\.tenant\.upiId \|\| "",\s*};\s*setBusiness\(biz\);/, 'upiId: data.tenant.upiId || "",\n              isComposition: data.tenant.isComposition || false,\n            };\n            setBusiness(biz);');

fs.writeFileSync(path, c);
console.log("Replaced");
