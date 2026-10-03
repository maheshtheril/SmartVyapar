const fs = require('fs');

const cbPath = 'src/components/ProductSearchCombobox.tsx';
let cb = fs.readFileSync(cbPath, 'utf8');

cb = cb.replace(
  /interface ProductSearchComboboxProps \{/g,
  `interface ProductSearchComboboxProps {\n  id?: string;`
);

cb = cb.replace(
  /openOnFocus = true,\n\}: ProductSearchComboboxProps/g,
  `openOnFocus = true,\n  id,\n}: ProductSearchComboboxProps`
);

cb = cb.replace(
  /<input\n\s*ref=\{inputRef\}\n\s*type="text"/g,
  `<input\n            id={id}\n            ref={inputRef}\n            type="text"`
);

fs.writeFileSync(cbPath, cb);

const pagePath = 'src/app/(app)/billing/new/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

page = page.replace(
  /<ProductSearchCombobox\n\s*products=\{isOnline \? undefined : catalog\}\n\s*selectedProductId=\{item\.productId\}\n\s*onSelect=\{\(prod\) => handleProductSelect\(idx, prod\)\}\n\s*\/>/g,
  `<ProductSearchCombobox\n                        id={\`combo-row-\${idx}\`}\n                        products={isOnline ? undefined : catalog}\n                        selectedProductId={item.productId}\n                        onSelect={(prod) => {\n                          handleProductSelect(idx, prod);\n                          setTimeout(() => {\n                            const qtyInput = document.getElementById(\`qty-row-\${idx}\`) as HTMLInputElement;\n                            if (qtyInput) {\n                              qtyInput.focus();\n                              qtyInput.select();\n                            }\n                          }, 50);\n                        }}\n                      />`
);

page = page.replace(
  /<input\n\s*type="number"\n\s*min="1"\n\s*value=\{item\.quantity\}\n\s*onChange=\{\(e\) => handleQuantityChange\(idx, Number\(e\.target\.value\)\)\}/g,
  `<input\n                        id={\`qty-row-\${idx}\`}\n                        type="number"\n                        min="1"\n                        value={item.quantity}\n                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}\n                        onFocus={(e) => e.target.select()}\n                        onKeyDown={(e) => {\n                          if (e.key === 'Enter') {\n                            e.preventDefault();\n                            const priceInput = document.getElementById(\`price-row-\${idx}\`) as HTMLInputElement;\n                            if (priceInput) {\n                              priceInput.focus();\n                              priceInput.select();\n                            }\n                          }\n                        }}`
);

page = page.replace(
  /<input\n\s*type="number"\n\s*min="0"\n\s*value=\{item\.price\}\n\s*onChange=\{\(e\) => handlePriceChange\(idx, Number\(e\.target\.value\)\)\}/g,
  `<input\n                        id={\`price-row-\${idx}\`}\n                        type="number"\n                        min="0"\n                        value={item.price}\n                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}\n                        onFocus={(e) => e.target.select()}\n                        onKeyDown={(e) => {\n                          if (e.key === 'Enter') {\n                            e.preventDefault();\n                            handleAddItem();\n                            setTimeout(() => {\n                              const nextCombo = document.getElementById(\`combo-row-\${billItems.length}\`) as HTMLInputElement;\n                              if (nextCombo) {\n                                nextCombo.focus();\n                              }\n                            }, 50);\n                          }\n                        }}`
);

fs.writeFileSync(pagePath, page);
console.log("Updated flow!");
