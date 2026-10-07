const fs = require('fs');

let content = fs.readFileSync('src/components/ThermalReceiptModal.tsx', 'utf-8');

// 1. Add createPortal import
if (!content.includes('createPortal')) {
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { createPortal } from 'react-dom';");
}

// 2. Change return to modalContent
content = content.replace('  return (\r\n    <div className="fixed inset-0', '  const modalContent = (\r\n    <div id="thermal-receipt-modal-root" className="fixed inset-0');
content = content.replace('  return (\n    <div className="fixed inset-0', '  const modalContent = (\n    <div id="thermal-receipt-modal-root" className="fixed inset-0');

// 3. Replace the CSS block
content = content.replace(/@media print \{[\s\S]*?\$\{isA4/m, 
@media print {
          body > *:not(#thermal-receipt-modal-root) {
            display: none !important;
          }
          html, body {
            height: 100% !important;
            width: 100% !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          #thermal-receipt-modal-root * {
            visibility: hidden;
          }
          \';
const endOldLF = '    </div>\n  );\n}';
const endNew =     </div>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return modalContent;
  return createPortal(modalContent, document.body);
};

if (content.includes(endOld)) {
    content = content.replace(endOld, endNew);
} else if (content.includes(endOldLF)) {
    content = content.replace(endOldLF, endNew);
}

fs.writeFileSync('src/components/ThermalReceiptModal.tsx', content, 'utf-8');
console.log("Done");
