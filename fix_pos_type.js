const fs = require('fs');
const path = 'src/app/(app)/billing/new/page.tsx';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('isComposition?: boolean;')) {
    console.log("Already fixed");
} else {
    c = c.replace(/upiId\?:\s*string;/, 'upiId?: string;\n    isComposition?: boolean;');
    fs.writeFileSync(path, c);
    console.log("Fixed");
}
