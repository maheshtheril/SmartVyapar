const fs = require('fs');
const path = 'src/app/(app)/inventory/page.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('const [tenant, setTenant] = useState<any>(null);')) {
  c = c.replace(
    `const [products, setProducts] = useState<any[]>([]);`,
    `const [products, setProducts] = useState<any[]>([]);\n  const [tenant, setTenant] = useState<any>(null);`
  );

  c = c.replace(
    `const res = await fetch("/api/products");`,
    `const [res, tenantRes] = await Promise.all([fetch("/api/products"), fetch("/api/tenant")]);\n      const tenantData = await tenantRes.json();\n      if (tenantData.success) setTenant(tenantData.tenant);`
  );

  // Hide Automobile fields
  c = c.replace(
    `<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">`,
    `{tenant?.businessType === 'AUTOMOBILE' && (<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">`
  );
  c = c.replace(
    `placeholder="Models (e.g. Swift, i20)"\n                            />\n                          </div>\n                        </div>\n                      </div>`,
    `placeholder="Models (e.g. Swift, i20)"\n                            />\n                          </div>\n                        </div>\n                      </div>\n                      )}`
  );

  fs.writeFileSync(path, c);
  console.log("Updated Product Master UI");
} else {
  console.log("Already updated");
}
