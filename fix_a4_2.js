const fs = require('fs');

const path = 'src/components/ThermalReceiptModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /<div id="thermal-receipt-preview" className="receipt-container text-black bg-white p-2">/g,
  `{paperWidth === 'A4' ? (\n              <div id="thermal-receipt-preview"><A4InvoicePrint data={data} business={business} /></div>\n            ) : (\n              <div id="thermal-receipt-preview" className="receipt-container text-black bg-white p-2">`
);

c = c.replace(
  /<\/div>\n\s*<\/div>\n\s*\{!\(hwConfig\.type === 'none' \|\| !isHardwareSupported\) && paperWidth !== 'A4' && \(/g,
  `</div>\n            )}\n            </div>\n\n            {!(hwConfig.type === 'none' || !isHardwareSupported) && paperWidth !== 'A4' && (`
);

c = c.replace(
  /<\/div>\n\s*<\/div>\n\s*\{!\(hwConfig\.type === 'none' \|\| !isHardwareSupported\) && \(/g,
  `</div>\n            )}\n            </div>\n\n            {!(hwConfig.type === 'none' || !isHardwareSupported) && paperWidth !== 'A4' && (`
);

fs.writeFileSync(path, c);
console.log("Updated ThermalReceiptModal correctly");
