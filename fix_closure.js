const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

const searchTarget = `        if (Array.isArray(data.items) && data.items.length > 0) {
          const mappedRows: PurchaseItemRow[] = data.items.map((it: any) => {
            // Attempt catalog match by name or SKU
            const match = products.find((p) => (p.partNumber && it.partNumber && p.partNumber.trim().toLowerCase() === it.partNumber.trim().toLowerCase()) || (it.suggestedDisplayName && p.displayName && p.displayName.trim().toLowerCase() === it.suggestedDisplayName.trim().toLowerCase()) || p.name.toLowerCase().includes(it.productName.toLowerCase()) || it.productName.toLowerCase().includes(p.name.toLowerCase()) || (p.sku && it.productName.toLowerCase().includes(p.sku.toLowerCase())));`;

const replacement = `        if (Array.isArray(data.items) && data.items.length > 0) {
          // Fetch latest state to prevent stale closures from long AI waits
          let currentProducts = products;
          let currentTenant = tenant;
          try {
            const [pRes, tRes] = await Promise.all([
              fetch('/api/products').then(r => r.json()),
              fetch('/api/tenant').then(r => r.json())
            ]);
            if (pRes.success && pRes.products) currentProducts = pRes.products;
            if (tRes.success && tRes.tenant) currentTenant = tRes.tenant;
          } catch (e) {}

          const mappedRows: PurchaseItemRow[] = data.items.map((it: any) => {
            // Attempt catalog match by name or SKU
            const match = currentProducts.find((p) => (p.partNumber && it.partNumber && p.partNumber.trim().toLowerCase() === it.partNumber.trim().toLowerCase()) || (it.suggestedDisplayName && p.displayName && p.displayName.trim().toLowerCase() === it.suggestedDisplayName.trim().toLowerCase()) || p.name.toLowerCase().includes(it.productName.toLowerCase()) || it.productName.toLowerCase().includes(p.name.toLowerCase()) || (p.sku && it.productName.toLowerCase().includes(p.sku.toLowerCase())));`;

c = c.replace(searchTarget, replacement);

c = c.replace(
  /const landedCost = tenant\?\.isComposition \? cost \* \(1 \+ gstRate \/ 100\) : cost;/g,
  `const landedCost = currentTenant?.isComposition ? cost * (1 + gstRate / 100) : cost;`
);

fs.writeFileSync(path, c);
console.log("Fixed stale closure!");
