const fs = require('fs');

const path = 'src/components/ThermalReceiptModal.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('import A4InvoicePrint')) {
  c = c.replace(
    /import QrCodeCanvas from '\.\/QrCodeCanvas';/,
    `import QrCodeCanvas from './QrCodeCanvas';\nimport A4InvoicePrint from './A4InvoicePrint';`
  );
}

c = c.replace(
  /const \[paperWidth, setPaperWidth\] = useState<'80mm' \| '58mm'>\('80mm'\);/g,
  `const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'A4'>('80mm');`
);

c = c.replace(
  /onClick=\{\(\) => setPaperWidth\('58mm'\)\}\n\s*className=\{\`rounded-lg px-2\.5 py-1 transition \$\{\n\s*paperWidth === '58mm'\n\s*\? 'bg-white text-indigo-600 shadow-sm'\n\s*: 'text-slate-600 hover:text-slate-900'\n\s*\}\`\}\n\s*>\n\s*2-Inch \(58mm\)\n\s*<\/button>/g,
  `onClick={() => setPaperWidth('58mm')}\n                  className={\`rounded-lg px-2.5 py-1 transition \${\n                    paperWidth === '58mm'\n                      ? 'bg-white text-indigo-600 shadow-sm'\n                      : 'text-slate-600 hover:text-slate-900'\n                  }\`}\n                >\n                  2-Inch (58mm)\n                </button>\n                <button\n                  type="button"\n                  onClick={() => setPaperWidth('A4')}\n                  className={\`rounded-lg px-2.5 py-1 transition \${\n                    paperWidth === 'A4'\n                      ? 'bg-white text-indigo-600 shadow-sm'\n                      : 'text-slate-600 hover:text-slate-900'\n                  }\`}\n                >\n                  A4 (Full Size)\n                </button>`
);

c = c.replace(
  /<div id="print-receipt-content" className="receipt-container text-black bg-white p-2">/g,
  `{paperWidth === 'A4' ? (\n              <div id="print-receipt-content"><A4InvoicePrint data={data} business={business} /></div>\n            ) : (\n              <div id="print-receipt-content" className="receipt-container text-black bg-white p-2">`
);

c = c.replace(
  /<\/div>\n\s*<\/div>\n\s*\{!\(hwConfig\.type === 'none' \|\| !isHardwareSupported\) && \(/g,
  `</div>\n            )}\n            </div>\n\n            {!(hwConfig.type === 'none' || !isHardwareSupported) && paperWidth !== 'A4' && (`
);

c = c.replace(
  /const is58mm = paperWidth === '58mm';/g,
  `const is58mm = paperWidth === '58mm';\n  const isA4 = paperWidth === 'A4';`
);

c = c.replace(
  /width: \$\{paperWidth\};/g,
  `width: \${isA4 ? '210mm' : paperWidth};`
);

c = c.replace(
  /size: \$\{paperWidth\} auto;/g,
  `size: \${isA4 ? 'A4' : \`\${paperWidth} auto\`};`
);

fs.writeFileSync(path, c);
console.log("Updated ThermalReceiptModal");
