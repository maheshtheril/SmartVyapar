const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\suppliers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/import \{ requireRole \} from '@\/lib\/auth';/, "import { requireRole, requireSession } from '@/lib/auth';");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed missing requireSession import in suppliers API');
