const fs = require('fs');

// 1. Refactor src/lib/ai-invoice-scanner.ts
const scannerPath = 'src/lib/ai-invoice-scanner.ts';
let scannerCode = fs.readFileSync(scannerPath, 'utf8');

scannerCode = scannerCode.replace(
  `export async function scanPurchaseInvoiceWithGemini(
  base64Data: string,
  mimeType: string,
  apiKey?: string
): Promise<ScannedInvoiceResult> {`,
  `export async function scanPurchaseInvoiceWithGemini(
  files: { base64Data: string; mimeType: string }[],
  apiKey?: string
): Promise<ScannedInvoiceResult> {`
);

scannerCode = scannerCode.replace(
  `            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } },
              ],
            },`,
  `            {
              role: "user",
              parts: [
                { text: prompt },
                ...files.map(f => ({ inlineData: { mimeType: f.mimeType || "image/jpeg", data: f.base64Data } })),
              ],
            },`
);

fs.writeFileSync(scannerPath, scannerCode);

// 2. Refactor src/app/api/scan-purchase/route.ts
const routePath = 'src/app/api/scan-purchase/route.ts';
let routeCode = fs.readFileSync(routePath, 'utf8');

routeCode = routeCode.replace(
  `    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 3. Size Validation (5 MB Max)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: \`File size (\${sizeMb} MB) exceeds maximum allowed limit of 5 MB\` },
        { status: 413 }
      );
    }

    // 4. MIME Type Validation
    const mimeType = (file.type || "image/jpeg").toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: \`Unsupported file format: \${file.type}. Allowed: JPG, PNG, WebP, PDF\` },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");`,
  `    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    
    // Max 10 files
    if (files.length > 10) {
      return NextResponse.json({ error: "Maximum 10 files allowed per scan" }, { status: 400 });
    }

    const processedFiles: { base64Data: string; mimeType: string }[] = [];

    for (const file of files) {
      // 3. Size Validation (5 MB Max per file)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: \`File size (\${sizeMb} MB) exceeds maximum allowed limit of 5 MB\` },
          { status: 413 }
        );
      }

      // 4. MIME Type Validation
      const mimeType = (file.type || "image/jpeg").toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: \`Unsupported file format: \${file.type}. Allowed: JPG, PNG, WebP, PDF\` },
          { status: 415 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Data = buffer.toString("base64");
      processedFiles.push({ base64Data, mimeType });
    }`
);

routeCode = routeCode.replace(
  `    const extractedData = await scanPurchaseInvoiceWithGemini(
      base64Data,
      mimeType,
      customApiKey || undefined
    );`,
  `    const extractedData = await scanPurchaseInvoiceWithGemini(
      processedFiles,
      customApiKey || undefined
    );`
);

fs.writeFileSync(routePath, routeCode);

// 3. Refactor src/app/(app)/inventory/purchase/page.tsx
const pagePath = 'src/app/(app)/inventory/purchase/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

pageCode = pageCode.replace(
  `  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selectedFile = e.target.files[0];

    setIsNewBillOpen(true);
    setIsScanningInvoice(true);
    setScanError(null);
    setScanSuccessInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);`,
  `  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
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

pageCode = pageCode.replace(
  `        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleScanInvoice}
          className="hidden"
        />`,
  `        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleScanInvoice}
          className="hidden"
        />`
);

fs.writeFileSync(pagePath, pageCode);

console.log("Updated AI Scanner for multiple files!");
