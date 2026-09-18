import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limiter";
import { scanPurchaseInvoiceWithGemini } from "@/lib/ai-invoice-scanner";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);

    // 1. Rate Limiting: Max 5 AI scans per tenant per 60 seconds
    const rate = checkRateLimit(`ai-scan:${session.tenantId}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many AI scan requests",
          message: `Rate limit reached. Please wait ${rate.resetInSeconds} seconds before scanning another invoice.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.resetInSeconds),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Read multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. File Size Validation (Max 5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 5 MB` },
        { status: 413 }
      );
    }

    // 4. MIME Type Validation
    const mimeType = (file.type || "image/jpeg").toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file format: ${file.type}. Allowed: JPG, PNG, WebP, PDF` },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const extractedData = await scanPurchaseInvoiceWithGemini(base64Data, mimeType);

    return NextResponse.json(
      {
        success: true,
        data: extractedData,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      }
    );
  } catch (error: any) {
    console.error("Error in /api/scan-purchase:", error);
    return NextResponse.json(
      { error: error.message || "Failed to scan invoice" },
      { status: 500 }
    );
  }
}

