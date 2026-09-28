const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api\\\\customers\\\\route.ts';
let c = fs.readFileSync(p, 'utf8');

const newLogic = `      if (existing) {
        return NextResponse.json({ error: "A customer with this phone number already exists. Please use the Edit button to update their balance or details." }, { status: 400 });
      } else {`;

c = c.replace(/if \(existing\) \{[\s\S]*?\} else \{/, newLogic);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed duplicate logic');
