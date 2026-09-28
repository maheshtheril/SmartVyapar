const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const newPutDelete = `
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { id, name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId, isActive } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id, tenantId },
      data: {
        name,
        phone: phone || null,
        gstin: gstin || null,
        stateCode: stateCode || "32",
        email: email || null,
        address: address || null,
        pincode: pincode || null,
        regionId: regionId || null,
        zoneId: zoneId || null,
        territoryId: territoryId || null,
        beatId: beatId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id, tenantId },
      include: { invoices: true }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (customer.invoices.length > 0 || Number(customer.outstandingBalance) !== 0) {
      return NextResponse.json({ 
        error: "Cannot delete customer because they have existing invoices or an outstanding balance. Please edit them and mark as 'Inactive' instead." 
      }, { status: 400 });
    }

    await prisma.customer.delete({
      where: { id, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

c = c.replace(/export async function PUT[\s\S]*?export async function DELETE[\s\S]*?\}\s*\}\s*$/m, newPutDelete.trim() + '\n');
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed DELETE constraint and added isActive to Customer API');
