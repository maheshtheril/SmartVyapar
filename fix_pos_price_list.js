const fs = require('fs');
const path = 'src/app/(app)/billing/new/page.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('const [activePriceList, setActivePriceList] = useState<any>(null);')) {
  c = c.replace(
    'const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState<number>(0);',
    'const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState<number>(0);\n  const [activePriceList, setActivePriceList] = useState<any>(null);'
  );

  // Re-calculate prices function
  c = c.replace(
    'const handleSelectCustomer = (customer: CustomerOption | null) => {',
    `const fetchPriceList = async (id: string) => {
    try {
      const res = await fetch('/api/price-lists/' + id);
      const data = await res.json();
      if (data.success) {
        setActivePriceList(data.priceList);
        // Recalculate existing cart
        setBillItems(prev => prev.map(item => {
          let newPrice = Number(item.product.sellingPrice);
          const override = data.priceList.items?.find((i: any) => i.productId === item.id);
          if (override) {
            if (override.type === 'FIXED_PRICE') newPrice = override.value;
            else if (override.type === 'PERCENTAGE_DISCOUNT') newPrice = newPrice - (newPrice * (override.value / 100));
          } else {
            if (data.priceList.type === 'PERCENTAGE_DISCOUNT') newPrice = newPrice - (newPrice * (data.priceList.value / 100));
            else if (data.priceList.type === 'MARKUP_ON_COST') newPrice = Number(item.product.purchasePrice) + (Number(item.product.purchasePrice) * (data.priceList.value / 100));
          }
          return { ...item, price: newPrice };
        }));
      }
    } catch (err) {}
  };

  const handleSelectCustomer = (customer: CustomerOption | null) => {`
  );

  // Update handleSelectCustomer to fetch
  c = c.replace(
    'setCustomerLoyaltyPoints(customer.loyaltyPoints || 0);\n  };',
    `setCustomerLoyaltyPoints(customer.loyaltyPoints || 0);
    if (customer.priceListId) {
      fetchPriceList(customer.priceListId);
    } else {
      setActivePriceList(null);
      // Revert cart to retail
      setBillItems(prev => prev.map(item => ({ ...item, price: Number(item.product.sellingPrice) })));
    }
  };`
  );

  // Update add to cart logic (handleProductSelect)
  c = c.replace(
    'const newPrice = Number(product.sellingPrice);',
    `let newPrice = Number(product.sellingPrice);
    if (activePriceList) {
      const override = activePriceList.items?.find((i: any) => i.productId === product.id);
      if (override) {
        if (override.type === 'FIXED_PRICE') newPrice = override.value;
        else if (override.type === 'PERCENTAGE_DISCOUNT') newPrice = newPrice - (newPrice * (override.value / 100));
      } else {
        if (activePriceList.type === 'PERCENTAGE_DISCOUNT') newPrice = newPrice - (newPrice * (activePriceList.value / 100));
        else if (activePriceList.type === 'MARKUP_ON_COST') newPrice = Number(product.purchasePrice) + (Number(product.purchasePrice) * (activePriceList.value / 100));
      }
    }`
  );

  // Display active price list badge in UI
  c = c.replace(
    '<CustomerSearch',
    `{activePriceList && (
      <div className="mb-2 inline-flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-bold">
        <Tag className="w-3 h-3" />
        <span>Price List Applied: {activePriceList.name}</span>
      </div>
    )}\n    <CustomerSearch`
  );

  fs.writeFileSync(path, c);
  console.log("Updated POS");
} else {
  console.log("Already updated");
}
