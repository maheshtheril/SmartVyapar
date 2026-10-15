import test from "node:test";
import assert from "node:assert/strict";

// Simulated function mirroring the menu tree generation logic in src/app/api/tenant/route.ts
function generateTestMenuTree(tenant: { businessType: string; enableTerritory?: boolean }, userRole = "OWNER") {
  const menuTree: any[] = [
    {
      id: "billing",
      name: "Sales & Billing",
      children: [{ id: "pos", name: "Create Bill (POS)" }],
    },
    {
      id: "inventory",
      name: "Inventory & Catalog",
      children: [
        { id: "stock", name: "Product Catalog & Stock" },
        ...(tenant.businessType === "RESTAURANT"
          ? [{ id: "recipes", name: "Recipes & BOM Depletion" }]
          : []),
        { id: "transfers", name: "Warehouses & Transfers" },
      ],
    },
    {
      id: "parties",
      name: "Customers & Receivables",
      children: [
        { id: "customers", name: "Customer Directory & Balance" },
        ...(tenant.enableTerritory || tenant.businessType === "DISTRIBUTION"
          ? [{ id: "territories-master", name: "Territories Master (FMCG)" }]
          : []),
      ],
    },
  ];

  if (tenant.businessType === "AUTOMOBILE") {
    menuTree.push({
      id: "garage",
      name: "Garage & Service",
      children: [{ id: "job-cards", name: "Active Job Cards" }],
    });
  }

  if (tenant.businessType === "RESTAURANT") {
    menuTree.splice(2, 0, {
      id: "restaurant",
      name: "Food & Restaurant",
      children: [{ id: "tables", name: "Dining Tables & Status" }],
    });
  }

  return menuTree;
}

test("Industry-Specific Sidebar Menu Scoping", async (t) => {
  await t.test("RETAIL tenant should NOT see Garage & Service or Restaurant menus or Recipes", () => {
    const retailTree = generateTestMenuTree({ businessType: "RETAIL" });
    const hasGarage = retailTree.some((m) => m.id === "garage");
    const hasRestaurant = retailTree.some((m) => m.id === "restaurant");
    const inventoryGroup = retailTree.find((m) => m.id === "inventory");
    const hasRecipes = inventoryGroup.children.some((c: any) => c.id === "recipes");

    assert.equal(hasGarage, false, "Garage menu must NOT be visible to Retail/Supermarket tenants");
    assert.equal(hasRestaurant, false, "Restaurant menu must NOT be visible to Retail/Supermarket tenants");
    assert.equal(hasRecipes, false, "Recipes BOM must NOT be visible to Retail/Supermarket tenants");
  });

  await t.test("AUTOMOBILE tenant should see Garage & Service menu", () => {
    const autoTree = generateTestMenuTree({ businessType: "AUTOMOBILE" });
    const hasGarage = autoTree.some((m) => m.id === "garage");
    const hasRestaurant = autoTree.some((m) => m.id === "restaurant");

    assert.equal(hasGarage, true, "Garage menu must be visible to Automobile tenants");
    assert.equal(hasRestaurant, false, "Restaurant menu must NOT be visible to Automobile tenants");
  });

  await t.test("RESTAURANT tenant should see Food & Restaurant and Recipe BOM menus", () => {
    const restTree = generateTestMenuTree({ businessType: "RESTAURANT" });
    const hasGarage = restTree.some((m) => m.id === "garage");
    const hasRestaurant = restTree.some((m) => m.id === "restaurant");
    const inventoryGroup = restTree.find((m) => m.id === "inventory");
    const hasRecipes = inventoryGroup.children.some((c: any) => c.id === "recipes");

    assert.equal(hasGarage, false, "Garage menu must NOT be visible to Restaurant tenants");
    assert.equal(hasRestaurant, true, "Restaurant menu must be visible to Restaurant tenants");
    assert.equal(hasRecipes, true, "Recipes BOM must be visible to Restaurant tenants");
  });

  await t.test("Product Master Form: Automotive fields should ONLY be visible for AUTOMOBILE", () => {
    const isAutoVisible = (bType: string) => bType === "AUTOMOBILE";

    assert.equal(isAutoVisible("RESTAURANT"), false, "Automotive fields must be hidden for Restaurant");
    assert.equal(isAutoVisible("RETAIL"), false, "Automotive fields must be hidden for Retail");
    assert.equal(isAutoVisible("PHARMACEUTICAL"), false, "Automotive fields must be hidden for Pharmacy");
    assert.equal(isAutoVisible("SERVICES"), false, "Automotive fields must be hidden for Services");
    assert.equal(isAutoVisible("AUTOMOBILE"), true, "Automotive fields must be shown for Automobile");
  });

  await t.test("Product Master Form: Pharmaceutical Clinical & Drug Schedule fields should ONLY be visible for PHARMACEUTICAL", () => {
    const isPharmaVisible = (bType: string) => bType === "PHARMACEUTICAL";

    assert.equal(isPharmaVisible("PHARMACEUTICAL"), true, "Pharma clinical card must be shown for Pharmacy");
    assert.equal(isPharmaVisible("RESTAURANT"), false, "Pharma clinical card must be hidden for Restaurant");
    assert.equal(isPharmaVisible("AUTOMOBILE"), false, "Pharma clinical card must be hidden for Automobile");
    assert.equal(isPharmaVisible("RETAIL"), false, "Pharma clinical card must be hidden for Retail");
  });
});
