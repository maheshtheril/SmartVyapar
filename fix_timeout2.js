const fs = require('fs');

const path = 'src/app/(app)/inventory/purchase/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// Find the start and end of the block
const startText = 'const formData = new FormData();';
const endText = 'const data = json.data;';

const startIdx = c.indexOf(startText);
const endIdx = c.indexOf(endText, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `const customApiKey = typeof window !== 'undefined' ? localStorage.getItem('smartvyapar_gemini_api_key') : null;
        const headers: Record<string, string> = {};
        if (customApiKey && (customApiKey.startsWith('AIzaSy') || customApiKey.startsWith('AQ.'))) {
          headers['x-gemini-api-key'] = customApiKey;
        }
  
        let mergedData: any = {
          supplierName: '', supplierGstin: '', billNumber: '', billDate: '', totalAmount: 0, confidenceScore: 1, items: []
        };
        let isProGate = false;

        // Process images sequentially to completely avoid Vercel 10s Serverless Timeout limits
        for (let i = 0; i < e.target.files.length; i++) {
          const originalFile = e.target.files[i];
          const compressed = await compressImage(originalFile);
          
          const formData = new FormData();
          formData.append('file', compressed);

          const res = await fetch('/api/scan-purchase', { method: 'POST', headers, body: formData });
          let json;
          try {
            json = await res.json();
          } catch (err) {
            throw new Error("AI scan timed out. Try 1 page at a time.");
          }
          if (res.status === 403 && json.error === 'PRO_FEATURE') {
            isProGate = true; break;
          }
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'AI invoice scan failed on page ' + (i+1));
          }
          const data = json.data;
          if (!mergedData.supplierName && data.supplierName && data.supplierName !== 'Unknown Vendor') mergedData.supplierName = data.supplierName;
          if (!mergedData.supplierGstin && data.supplierGstin) mergedData.supplierGstin = data.supplierGstin;
          if (!mergedData.billNumber && data.billNumber && data.billNumber !== 'BILL-001') mergedData.billNumber = data.billNumber;
          if (!mergedData.billDate && data.billDate) mergedData.billDate = data.billDate;
          if (data.totalAmount > mergedData.totalAmount) mergedData.totalAmount = data.totalAmount;
          mergedData.confidenceScore = Math.min(mergedData.confidenceScore, data.confidenceScore || 0.9);
          if (data.items) mergedData.items.push(...data.items);
        }

        if (isProGate) {
          setIsScanningInvoice(false); setIsNewBillOpen(false); setScanError('__UPGRADE__'); return;
        }

        const data = mergedData;`;

  c = c.substring(0, startIdx) + replacement + c.substring(endIdx + endText.length);
  fs.writeFileSync(path, c);
  console.log("Successfully replaced block!");
} else {
  console.log("Could not find block boundaries!");
}
