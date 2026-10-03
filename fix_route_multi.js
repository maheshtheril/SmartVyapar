const fs = require('fs');

const path = 'src/app/api/scan-purchase/route.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /\/\/ 2\. Read multipart form data[\s\S]*?undefined;/m,
  `// 2. Read multipart form data
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    // Max 10 files
    if (files.length > 10) {
      return NextResponse.json({ error: "Maximum 10 files allowed per scan" }, { status: 400 });
    }

    const processedFiles: { base64Data: string; mimeType: string }[] = [];

    for (const file of files) {
      // 3. File Size Validation (Max 5 MB)
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
    }

    // Optional merchant-provided Gemini API key (via header or form-data)
    const customApiKey =
      req.headers.get("x-gemini-api-key") ||
      (formData.get("apiKey") as string | null) ||
      undefined;`
);

fs.writeFileSync(path, c);
console.log("Updated API route properly");
