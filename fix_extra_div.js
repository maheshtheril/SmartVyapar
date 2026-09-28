const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/focus:outline-none"\n\s*\/>\n\s*<\/div>\n\s*<\/div>\n\s*<div className="grid grid-cols-2 gap-4 mt-4">/, `focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">`);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed extra closing div');
