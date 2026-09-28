const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/<div className="mt-4">\s*\{addError && \(/, '{addError && (');

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed JSX syntax error');
