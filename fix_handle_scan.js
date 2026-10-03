const fs = require('fs');
const pagePath = 'src/app/(app)/inventory/purchase/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

pageCode = pageCode.replace(
  /if \(!e\.target\.files \|\| !e\.target\.files\[0\]\) return;[\s\S]*?const formData = new FormData\(\);[\s\S]*?formData\.append\('file', selectedFile\);/m,
  `if (!e.target.files || e.target.files.length === 0) return;
    
    setIsNewBillOpen(true);
    setIsScanningInvoice(true);
    setScanError(null);
    setScanSuccessInfo(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < e.target.files.length; i++) {
        formData.append('file', e.target.files[i]);
      }`
);

fs.writeFileSync(pagePath, pageCode);
console.log("Updated handleScanInvoice");
