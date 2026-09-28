const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\} from 'lucide-react';/, "  Edit2,\n  Trash2,\n} from 'lucide-react';");

fs.writeFileSync(p, c, 'utf8');
console.log('Added Edit2 and Trash2 to lucide-react imports');
