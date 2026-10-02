const { scanPurchaseInvoiceWithGemini } = require('./src/lib/ai-invoice-scanner');
const fs = require('fs');
require('dotenv').config();

async function test() {
    try {
        // Just send a dummy base64 blank image
        const b64 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64').toString('base64');
        console.log("Scanning...");
        const result = await scanPurchaseInvoiceWithGemini(b64, 'image/png');
        console.log(result);
    } catch (e) {
        console.error("AI FAILED:", e.message);
        console.error(e);
    }
}
test();
