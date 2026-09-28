const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const \[addOpeningBalanceDate, setAddOpeningBalanceDate\] = useState\(''\);/, "const [addOpeningBalanceDate, setAddOpeningBalanceDate] = useState(() => new Date().toISOString().split('T')[0]);");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed default opening balance date');
