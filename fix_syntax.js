const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/<\/label><\/label>/g, '</label>');
c = c.replace(/<input type="email"[\s\S]*?\/>\s*\/>/g, (match) => match.replace(/\s*\/>$/, ''));

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed extra tags');
