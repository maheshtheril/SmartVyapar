# ZionaPOS: Managing Multiple Companies & Branches

---

## 1. Creating Multiple Branches / Outlets (Same Legal Entity & GSTIN)
Use this when you operate multiple shops, counters, or godowns under the **same GST registration**.

### How to Create:
1. In the sidebar, go to **Inventory** → **Warehouses & Transfers** (`/inventory/transfers`).
2. Click the **Warehouses / Godowns** tab.
3. Click the **+ New Warehouse / Branch** button.
4. Enter:
   - **Name**: e.g., *"Downtown Branch"*, *"Central Godown"*, or *"Service Depot"*.
   - **Code**: e.g., `BR-01`, `BR-02`, `WH-MAIN`.
   - **Address & City**: Physical location.
   - **Default Outlet**: Check if this is the primary billing/dispatch location.
5. Click **Create Warehouse**.

### Features:
- **Independent Stock Tracking**: Stock levels are tracked per branch (`WarehouseStock`).
- **Inter-Branch Stock Transfers**: Transfer items between branches with driver and vehicle details.
- **GST Rule 55 Delivery Challans**: Print official delivery challans for goods in transit between branches.
- **GRN Inward**: Receive purchase bills directly into a specific branch.

---

## 2. Creating Multiple Companies (Separate Legal Entities & GSTINs)
Use this when you have **different companies, sister firms, or separate GSTINs** that require isolated books of account.

### How to Create:
1. Open `/register` (Self-service registration) or use the Superadmin Console (`/admin`).
2. Enter the new entity details:
   - **Business Name & Legal Name**
   - **GSTIN** (state code and tax regime are auto-configured)
   - **Business Type** (Retail, Automobile, Restaurant, FMCG Distribution, Services)
   - **UPI ID** for dynamic QR invoicing
3. *Note on Email*: Since user emails are unique per account, use an alias (e.g., `admin+company2@domain.com`) or a separate email.

### Features:
- **Statutory Isolation**: Independent Chart of Accounts, General Ledger, and Balance Sheets.
- **MCA Electronic Audit Trail**: Separate statutory audit logs per company.
- **Tax Compliance**: Independent GSTR-1, GSTR-3B, and GSTR-2B reconciliations.
- **Invoice Sequences**: Independent invoice numbering prefixes (e.g., `INV/26-27/...`).

---

## Summary Comparison

| Feature | Branch / Warehouse | Company (Tenant) |
| :--- | :--- | :--- |
| **GSTIN** | Shared same GSTIN | Different GSTIN / Entity |
| **Accounting / P&L** | Consolidated single book | Separate, isolated P&L & Balance Sheet |
| **Stock Management** | Inter-branch transfers (Rule 55 Challan) | Inter-company sales / purchase bills |
| **Where to Set Up** | `/inventory/transfers` | `/register` or `/admin` |
