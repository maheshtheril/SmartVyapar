const fs = require('fs');

const path = 'src/components/ProductSearchCombobox.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1\.5 shadow-xl"/g,
  `className="absolute left-0 top-full z-50 mt-1 max-h-[350px] w-full min-w-full sm:min-w-[450px] lg:min-w-[550px] max-w-[90vw] overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-indigo-900/10"`
);

fs.writeFileSync(path, c);
console.log("Updated ProductSearchCombobox dropdown size");
