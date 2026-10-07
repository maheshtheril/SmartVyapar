
const fs = require("fs");
const file = "src/components/A4InvoicePrint.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace(`className="max-w-[140px] max-h-[110px] object-contain print:brightness-0 print:contrast-200" style={{ filter: "sepia(1) hue-rotate(180deg) saturate(3) brightness(0.6) contrast(1.2)" }}`, `className="max-w-[160px] max-h-[120px] object-contain"`);

// change text-blue-800 to a custom color
content = content.replace(`<h1 className="text-2xl font-black uppercase tracking-[0.05em] text-blue-800 mb-1.5 leading-tight">{business.name}</h1>`, `<h1 className="text-2xl font-black uppercase tracking-[0.05em] mb-1.5 leading-tight" style={{ color: "#1e3a8a" }}>{business.name}</h1>`);

fs.writeFileSync(file, content, "utf8");

