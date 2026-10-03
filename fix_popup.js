const fs = require('fs');
const path = 'src/app/(app)/settings/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `setProfileMsg({ type: 'success', text: 'Company profile and logo updated successfully!' });`,
  `setProfileMsg({ type: 'success', text: 'Company profile and logo updated successfully!' });\n        if (typeof window !== 'undefined' && (window as any).alert) {\n          (window as any).alert('Success: Company profile and settings updated successfully!');\n        }`
);

fs.writeFileSync(path, c);
console.log("Added popup");
