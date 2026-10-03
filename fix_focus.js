const fs = require('fs');

const path = 'src/components/ProductSearchCombobox.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /autoClearOnSelect\?: boolean;/g,
  `autoClearOnSelect?: boolean;\n  openOnFocus?: boolean;`
);

c = c.replace(
  /autoClearOnSelect = false,/g,
  `autoClearOnSelect = false,\n  openOnFocus = true,`
);

c = c.replace(
  /onFocus=\{\(\) => \{\n\s*setIsOpen\(true\);\n\s*setQuery\(""\);\n\s*\}\}/g,
  `onFocus={() => {\n              if (openOnFocus) setIsOpen(true);\n              setQuery("");\n            }}`
);

// We should also open it if they click the chevron or something? There is no chevron, just the input.

fs.writeFileSync(path, c);

const pagePath = 'src/app/(app)/billing/new/page.tsx';
let pageC = fs.readFileSync(pagePath, 'utf8');
pageC = pageC.replace(
  /autoClearOnSelect=\{true\}\n\s*placeholder="Scan barcode gun or search product name \/ SKU \(F1\)\.\.\."/g,
  `autoClearOnSelect={true}\n                openOnFocus={false}\n                placeholder="Scan barcode gun or search product name / SKU (F1)..."`
);
fs.writeFileSync(pagePath, pageC);
console.log("Updated openOnFocus prop");
