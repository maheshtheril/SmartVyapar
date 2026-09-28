const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/focus:outline-none" \/>\s*\/>/g, 'focus:outline-none" />');

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed stray /> tag');
