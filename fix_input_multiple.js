const fs = require('fs');
const pagePath = 'src/app/(app)/inventory/purchase/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

pageCode = pageCode.replace(
  /type="file"\s*accept="image\/\*,application\/pdf"\s*onChange=\{handleScanInvoice\}/m,
  `type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleScanInvoice}`
);

fs.writeFileSync(pagePath, pageCode);
console.log("Updated input field to multiple.");
