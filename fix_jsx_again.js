const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<div className="grid grid-cols-1 gap-4 mt-4">/, '</div>\n              </div>\n              <div className="grid grid-cols-1 gap-4 mt-4">');

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed JSX syntax error AGAIN');
