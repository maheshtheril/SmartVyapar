const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /GST Input Credit \(\{isInterState \? 'IGST' : 'CGST\+SGST'\}\)/g,
  `{tenant?.isComposition ? \`GST Paid (\${isInterState ? 'IGST' : 'CGST+SGST'} Sunk Cost)\` : \`GST Input Credit (\${isInterState ? 'IGST' : 'CGST+SGST'})\`}`
);

fs.writeFileSync(path, c);
console.log("Updated UI GST label for Composition");
