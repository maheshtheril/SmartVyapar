const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\territories\\\\manage\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const updateDeleteLogic = `
    const { action, name, regionId, zoneId, territoryId, beatId, id } = body;

    // --- UPDATE ACTIONS ---
    if (action === "UPDATE_REGION") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const region = await prisma.region.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, region });
    }
    if (action === "UPDATE_ZONE") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const zone = await prisma.zone.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, zone });
    }
    if (action === "UPDATE_TERRITORY") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const territory = await prisma.territory.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, territory });
    }
    if (action === "UPDATE_BEAT") {
      if (!id || !name) return NextResponse.json({ error: "ID and Name required" }, { status: 400 });
      const beat = await prisma.beat.update({ where: { id, tenantId }, data: { name } });
      return NextResponse.json({ success: true, beat });
    }

    // --- DELETE ACTIONS ---
    if (action === "DELETE_REGION") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.region.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }
    if (action === "DELETE_ZONE") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.zone.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }
    if (action === "DELETE_TERRITORY") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.territory.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }
    if (action === "DELETE_BEAT") {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      await prisma.beat.delete({ where: { id, tenantId } });
      return NextResponse.json({ success: true });
    }
`;

c = c.replace(/const \{ action, name, regionId, zoneId, territoryId \} = body;/, updateDeleteLogic);

fs.writeFileSync(p, c, 'utf8');
console.log('API updated with edit and delete actions');
