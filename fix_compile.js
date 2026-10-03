const fs = require('fs');

const path = 'src/lib/ai-invoice-scanner.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /rawParsed\.items\.forEach\(\(item\) => \{/g,
  `rawParsed.items.forEach((item: any) => {`
);

fs.writeFileSync(path, c);
console.log("Fixed typescript typing for item.");
