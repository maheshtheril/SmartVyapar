const fs = require('fs');
const path = 'src/app/(app)/inventory/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `{/* Batch Tracking Checkbox */}\n                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">`,
  `{/* Batch Tracking Checkbox */}\n                    {tenant?.businessType !== 'AUTOMOBILE' && (<div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">`
);

c = c.replace(
  `entering Batch Number, Mfd Date, and Exp Date during GRN purchase inward.\n                          </p>\n                        </label>\n                      </div>\n                    </div>\n                  </div>\n                )}`,
  `entering Batch Number, Mfd Date, and Exp Date during GRN purchase inward.\n                          </p>\n                        </label>\n                      </div>\n                    </div>\n                  )}\n                  </div>\n                )}`
);

fs.writeFileSync(path, c);
console.log("Updated F&B block");
