# SmartVyapar 🚀
### Modern Multi-Tenant Business Invoicing, Inventory & GST SaaS ERP

Built for Indian SMBs, retail shops, wholesale distributors, and service providers.

---

## 🌟 Version 0.1 Features
- **Multi-Tenant Architecture:** Every shop/company has its own isolated `tenant_id`.
- **Automated Indian GST Engine:**
  - Intra-state (CGST + SGST) vs Inter-state (IGST).
  - Composition / Non-GST "Bill of Supply" toggle.
  - CA-ready GSTR-3B Net Tax calculation (`Output Tax - Input Tax Credit`).
- **Dynamic NPCI UPI QR Generator:**
  - Auto-embeds scannable GPay / PhonePe / Paytm QR codes directly onto invoices.
- **Real-Time Stock & Low-Stock Alerts:**
  - Stock auto-deduction on invoice generation.
  - Reorder warnings when inventory drops below threshold.
- **Bill History & Khata:**
  - Search by customer name, phone, or bill number.
  - Tracks paid, partial, and unpaid (Udhar) customer dues.
  - 1-click WhatsApp payment reminders with dynamic UPI links.
- **Gemini Flash AI Purchase Scanner:**
  - Ported from `zionahms.com`.
  - Snap a photo of a distributor's bill or upload a PDF to automatically extract items, HSN, rates, and stock-in!

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons.
- **Database:** PostgreSQL (Neon serverless) with Prisma ORM.
- **AI Vision:** Google Generative AI (`gemini-1.5-flash`).
- **QR Codes:** Standard NPCI UPI URI Specification + `qrcode` library.

---

## 🚀 Quick Start

### 1. Database Setup
Create a new free database on [neon.tech](https://neon.tech), then create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Update `DATABASE_URL` with your Neon connection string.

### 2. Push Prisma Schema
```bash
npm run prisma:generate
npm run prisma:push
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3005](http://localhost:3005) in your browser.
