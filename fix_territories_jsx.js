const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\territories\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/className=\{\\\`flex-1 py-3 text-\[10px\] font-bold text-center transition \\\$\{activeTab === tab \? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'\}\\\`\}/, "className={`flex-1 py-3 text-[10px] font-bold text-center transition ${activeTab === tab ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}");

c = c.replace(/placeholder=\{\\\`e\.g\. \\\$\{activeTab === 'REGION' \? 'South India' : 'Ernakulam'\}\\\`\}/, "placeholder={`e.g. ${activeTab === 'REGION' ? 'South India' : 'Ernakulam'}`}");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed escaped backticks in JSX');
