const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/import \{ Plus, X, Search, MapPin, Phone, Mail \} from 'lucide-react';/, "import { Plus, X, Search, MapPin, Phone, Mail, Edit2, Trash2 } from 'lucide-react';");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed lucide-react imports');
