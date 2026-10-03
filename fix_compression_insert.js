const fs = require('fs');
const pagePath = 'src/app/(app)/inventory/purchase/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

const compressLogic = `
const compressImage = async (file: File): Promise<File> => {
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
};
`;

// Find the last import statement to insert after it
const lines = pageCode.split('\n');
let lastImportIdx = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('import ')) {
    lastImportIdx = i;
  }
}

lines.splice(lastImportIdx + 1, 0, compressLogic);
pageCode = lines.join('\n');

fs.writeFileSync(pagePath, pageCode);
console.log("Added compressImage function properly.");
