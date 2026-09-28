const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\suppliers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const newPutDelete = `
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { id, name, phone, gstin, email, address, isActive } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
    }

    const updated = await prisma.supplier.update({
      where: { id, tenantId },
      data: {
        name,
        phone: phone || null,
        gstin: gstin || null,
        email: email || null,
        address: address || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ success: true, supplier: updated });
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

    // Check if supplier has linked purchase bills
    const supplier = await prisma.supplier.findUnique({
      where: { id, tenantId },
      include: { purchaseBills: true }
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (supplier.purchaseBills.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete supplier because they have existing purchase bills. Please edit the supplier and mark them as 'Inactive' instead." 
      }, { status: 400 });
    }

    await prisma.supplier.delete({
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
console.log('Fixed DELETE constraint and added isActive to API');
