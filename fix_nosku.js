const fs = require('fs');

const path = 'src/components/ProductSearchCombobox.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /value=\{isOpen \? query : \(selectedProduct \? \`\[\$\{selectedProduct\.sku \|\| 'No SKU'\}\] \$\{selectedProduct\.name\}\s*\(Qty: \$\{selectedProduct\.currentStock\}\)\` : ""\)\}/g,
  `value={isOpen ? query : (selectedProduct ? (selectedProduct.sku ? \`[\${selectedProduct.sku}] \` : "") + \`\${selectedProduct.name} (Qty: \${selectedProduct.currentStock})\` : "")}`
);

c = c.replace(
  /placeholder=\{selectedProduct \? \`\[\$\{selectedProduct\.sku\}\] \$\{selectedProduct\.name\}\` : placeholder\}/g,
  `placeholder={selectedProduct ? (selectedProduct.sku ? \`[\${selectedProduct.sku}] \` : "") + selectedProduct.name : placeholder}`
);

fs.writeFileSync(path, c);
console.log("Removed [No SKU]");
