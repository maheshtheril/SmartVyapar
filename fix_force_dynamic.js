const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('route.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const routes = walk('C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\api');
let count = 0;
for (const route of routes) {
  let content = fs.readFileSync(route, 'utf8');
  if (content.includes('export async function GET') && !content.includes('export const dynamic')) {
    content = "export const dynamic = 'force-dynamic';\n" + content;
    fs.writeFileSync(route, content, 'utf8');
    count++;
  }
}
console.log('Fixed ' + count + ' API routes missing force-dynamic');
