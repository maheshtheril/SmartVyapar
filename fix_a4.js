
const fs = require("fs");
const file = "src/components/A4InvoicePrint.tsx";
let content = fs.readFileSync(file, "utf8");

// Fix wrapper classes
const wrapperTarget = `    <div className="bg-white w-full max-w-[210mm] mx-auto text-black font-sans min-h-[297mm] flex flex-col border-2 border-slate-300 p-1 text-[13px] leading-tight print:border-none print:p-0 print:h-[250mm] print:min-h-[250mm] overflow-hidden print:page-break-after-avoid print:page-break-inside-avoid print:break-inside-avoid">
      <div className="border border-black flex flex-col flex-1 m-2 print:m-0 print:h-[250mm]">`;

const wrapperReplacement = `    <div className="bg-white w-[210mm] mx-auto text-black font-sans min-h-[297mm] flex flex-col border border-slate-300 text-[13px] leading-tight print:w-full print:h-[100vh] print:max-w-none print:min-h-0 print:border-none print:p-0 print:m-0 overflow-hidden print:page-break-after-avoid print:page-break-inside-avoid print:break-inside-avoid box-border">
      <div className="border border-black flex flex-col flex-1 m-4 print:m-0 print:h-full box-border">`;

content = content.replace(wrapperTarget, wrapperReplacement);
content = content.replace(wrapperTarget.replace(/\n/g, "\r\n"), wrapperReplacement.replace(/\n/g, "\r\n"));

// Fix logo block
const logoTarget = `          {/* Left: Logo */}
          <div className="w-1/4 flex items-center justify-start">
            {business.logoUrl ? (
              <div className="w-24 h-24 bg-white border border-slate-200 rounded-sm shadow-sm flex items-center justify-center p-1">
                <img src={business.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : null}
          </div>`;

const logoReplacement = `          {/* Left: Logo */}
          <div className="w-1/4 flex items-center justify-start pl-4">
            {business.logoUrl ? (
              <div className="w-40 h-32 flex items-center justify-start">
                <img src={business.logoUrl} alt="Logo" className="max-w-[140px] max-h-[110px] object-contain print:brightness-0 print:contrast-200" style={{ filter: "sepia(1) hue-rotate(180deg) saturate(3) brightness(0.6) contrast(1.2)" }} />
              </div>
            ) : null}
          </div>`;

content = content.replace(logoTarget, logoReplacement);
content = content.replace(logoTarget.replace(/\n/g, "\r\n"), logoReplacement.replace(/\n/g, "\r\n"));


fs.writeFileSync(file, content, "utf8");

