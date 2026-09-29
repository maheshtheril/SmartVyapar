import { NextRequest, NextResponse } from "next/server";

// Temporary debug endpoint - shows which env vars are SET (not their values)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID
      ? `SET (${process.env.RAZORPAY_KEY_ID.substring(0, 12)}...)`
      : "NOT SET",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET
      ? `SET (length: ${process.env.RAZORPAY_KEY_SECRET.length})`
      : "NOT SET",
    RESEND_API_KEY: process.env.RESEND_API_KEY ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}
