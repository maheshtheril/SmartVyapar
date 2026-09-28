const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const newPut = `export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    const tenantId = session.tenantId;
    const body = await req.json();
    const { id, name, phone, gstin, stateCode, email, address, pincode, regionId, zoneId, territoryId, beatId, isActive, outstandingBalance } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
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
          ...(outstandingBalance !== undefined && { outstandingBalance: parseFloat(outstandingBalance) || 0 })
        },
      });

      if (outstandingBalance !== undefined && customer.accountId) {
        await tx.account.update({
          where: { id: customer.accountId },
          data: { balance: parseFloat(outstandingBalance) || 0 }
        });
      }
      return customer;
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

c = c.replace(/export async function PUT[\s\S]*?return NextResponse\.json\(\{ error: error\.message \}, \{ status: 500 \}\);\n  \}\n\}/, newPut);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed PUT API to handle outstandingBalance');
