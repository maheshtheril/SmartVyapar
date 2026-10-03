const fs = require('fs');
const pagePath = 'src/app/(app)/inventory/purchase/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

const compressLogic = `const compressImage = async (file: File): Promise<File> => {
  if (file.type === 'application/pdf') return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1400;
        const MAX_HEIGHT = 1800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name.replace(/\\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
          else resolve(file);
        }, 'image/jpeg', 0.7);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};`;

// Insert the helper function right before `export default function PurchasePage()`
pageCode = pageCode.replace(
  /export default function PurchasePage\(\) \{/m,
  compressLogic + '\n\nexport default function PurchasePage() {'
);

// Update handleScanInvoice to use it
pageCode = pageCode.replace(
  /const formData = new FormData\(\);\s*for \(let i = 0; i < e\.target\.files\.length; i\+\+\) \{\s*formData\.append\('file', e\.target\.files\[i\]\);\s*\}/m,
  `const formData = new FormData();
        for (let i = 0; i < e.target.files.length; i++) {
          const originalFile = e.target.files[i];
          const compressed = await compressImage(originalFile);
          formData.append('file', compressed);
        }`
);

// Fix the misleading timeout message
pageCode = pageCode.replace(
  /AI scan timed out after 10 seconds\. Please try a smaller file or a clearer image\./g,
  "AI scan timed out. Multiple massive images take too long to upload/process. We have applied auto-compression, but if this still happens, try 1-2 pages at a time."
);

fs.writeFileSync(pagePath, pageCode);
console.log("Added image compression to frontend");
