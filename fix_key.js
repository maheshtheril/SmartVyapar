const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /if \(customApiKey && customApiKey\.startsWith\('AIzaSy'\)\) \{/g,
  `if (customApiKey && (customApiKey.startsWith('AIzaSy') || customApiKey.startsWith('AQ.'))) {`
);

fs.writeFileSync(path, c);
console.log("Updated API key validation");
