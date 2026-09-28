const fs = require('fs');
const p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/regions\.map\(r =>/g, 'regions.map((r: any) =>');
c = c.replace(/regions\.find\(r =>/g, 'regions.find((r: any) =>');
c = c.replace(/\?\.zones\?\.map\(z =>/g, '?.zones?.map((z: any) =>');
c = c.replace(/\?\.zones\?\.find\(z =>/g, '?.zones?.find((z: any) =>');
c = c.replace(/\?\.territories\?\.map\(t =>/g, '?.territories?.map((t: any) =>');
c = c.replace(/\?\.territories\?\.find\(t =>/g, '?.territories?.find((t: any) =>');
c = c.replace(/\?\.beats\?\.map\(b =>/g, '?.beats?.map((b: any) =>');

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed implicit any type errors');
