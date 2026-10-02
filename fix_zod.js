const fs = require('fs');
const path = 'src/lib/schemas/product.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('partNumber: z.string().trim().optional().nullable(),')) {
    code = code.replace(
        'category: z.string().trim().optional().nullable(),',
        'category: z.string().trim().optional().nullable(),\n    partNumber: z.string().trim().optional().nullable(),\n    oemNumber: z.string().trim().optional().nullable(),\n    compatibleMakes: z.string().trim().optional().nullable(),\n    compatibleModels: z.string().trim().optional().nullable(),'
    );
    fs.writeFileSync(path, code);
}
console.log("Fixed Zod");
