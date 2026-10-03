const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /if \(trimmed && trimmed\.startsWith\('AIzaSy'\)\) \{/g,
  `if (trimmed && (trimmed.startsWith('AIzaSy') || trimmed.startsWith('AQ.'))) {`
);

fs.writeFileSync(path, c);
console.log("Updated saveCustomApiKey validation");
