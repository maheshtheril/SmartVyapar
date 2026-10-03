const fs = require('fs');

// Patch ThermalReceiptModal
const trmPath = 'src/components/ThermalReceiptModal.tsx';
let trm = fs.readFileSync(trmPath, 'utf8');

trm = trm.replace(
  /interface BusinessProfile/g,
  `export interface BusinessProfile`
);

trm = trm.replace(
  /paperWidth,\n\s*includeBarcode:/g,
  `paperWidth: paperWidth === 'A4' ? '80mm' : paperWidth,\n          includeBarcode:`
);

fs.writeFileSync(trmPath, trm);

// Patch A4InvoicePrint
const a4Path = 'src/components/A4InvoicePrint.tsx';
let a4 = fs.readFileSync(a4Path, 'utf8');

a4 = a4.replace(
  /import \{ BusinessProfile \} from '@\/types';/g,
  `import { BusinessProfile } from './ThermalReceiptModal';`
);

a4 = a4.replace(
  /data\.cgstAmount > 0/g,
  `(data.cgstAmount || 0) > 0`
);
a4 = a4.replace(
  /data\.sgstAmount > 0/g,
  `(data.sgstAmount || 0) > 0`
);
a4 = a4.replace(
  /data\.igstAmount > 0/g,
  `(data.igstAmount || 0) > 0`
);
a4 = a4.replace(
  /₹\{data\.cgstAmount\.toFixed\(2\)\}/g,
  `₹{(data.cgstAmount || 0).toFixed(2)}`
);
a4 = a4.replace(
  /₹\{data\.sgstAmount\.toFixed\(2\)\}/g,
  `₹{(data.sgstAmount || 0).toFixed(2)}`
);
a4 = a4.replace(
  /₹\{data\.igstAmount\.toFixed\(2\)\}/g,
  `₹{(data.igstAmount || 0).toFixed(2)}`
);

// Fix numberToWords type errors
a4 = a4.replace(
  /if \(\(num = num\.toString\(\)\)\.length > 9\)/g,
  `let numStr = num.toString();\n  if (numStr.length > 9)`
);

a4 = a4.replace(
  /let n = \('000000000' \+ num\)\.substr\(-9\)\.match/g,
  `let n = ('000000000' + numStr).substr(-9).match`
);

a4 = a4.replace(
  /\(n\[1\] != 0\)/g,
  `(n[1] !== '00')`
);
a4 = a4.replace(
  /\(n\[2\] != 0\)/g,
  `(n[2] !== '00')`
);
a4 = a4.replace(
  /\(n\[3\] != 0\)/g,
  `(n[3] !== '00')`
);
a4 = a4.replace(
  /\(n\[4\] != 0\)/g,
  `(n[4] !== '0')`
);
a4 = a4.replace(
  /\(n\[5\] != 0\)/g,
  `(n[5] !== '00')`
);

// Number() casting for index access
a4 = a4.replace(
  /b\[n\[1\]\[0\]\] \+ ' ' \+ a\[n\[1\]\[1\]\]/g,
  `b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]`
);
a4 = a4.replace(
  /b\[n\[2\]\[0\]\] \+ ' ' \+ a\[n\[2\]\[1\]\]/g,
  `b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]`
);
a4 = a4.replace(
  /b\[n\[3\]\[0\]\] \+ ' ' \+ a\[n\[3\]\[1\]\]/g,
  `b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]`
);
a4 = a4.replace(
  /b\[n\[4\]\[0\]\] \+ ' ' \+ a\[n\[4\]\[1\]\]/g,
  `b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]`
);
a4 = a4.replace(
  /b\[n\[5\]\[0\]\] \+ ' ' \+ a\[n\[5\]\[1\]\]/g,
  `b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]`
);

fs.writeFileSync(a4Path, a4);
console.log("Fixed TS errors");
