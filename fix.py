import re

with open('src/components/ThermalReceiptModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add createPortal import
if 'createPortal' not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { createPortal } from 'react-dom';")

# 2. Change eturn ( to const modalContent = (
content = re.sub(r'  return \(\n    <div className="fixed inset-0', '  const modalContent = (\n    <div id="thermal-receipt-modal-root" className="fixed inset-0', content)

# 3. Replace the CSS block
css_old = r'''        @media print {
          html, body {
            height: 265mm !important;
            max-height: 265mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body \* {
            visibility: hidden;
          }'''
css_new = r'''        @media print {
          body > *:not(#thermal-receipt-modal-root) {
            display: none !important;
          }
          html, body {
            height: 100% !important;
            width: 100% !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #thermal-receipt-modal-root * {
            visibility: hidden;
          }'''
# Wait, I need to match whatever is currently there.
# Let's just use a simpler regex for CSS.
content = re.sub(r'        @media print \{.*?\$\{isA4', css_new + '\n           with the portal return
end_old = r'    </div>\n  );\n}'
end_new = r'''    </div>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return modalContent;
  return createPortal(modalContent, document.body);
}'''
content = re.sub(end_old, end_new, content)

with open('src/components/ThermalReceiptModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
