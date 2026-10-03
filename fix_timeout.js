const fs = require('fs');
const path = 'src/app/api/purchase/[id]/route.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/await prisma\.\$transaction\(async \(tx\) => \{/g, `await prisma.$transaction(async (tx) => {`,);
// Actually it's easier to just replace it properly.
// The syntax is await prisma.$transaction(async (tx) => { ... }, { maxWait: 5000, timeout: 30000 })
// This is hard to do with regex if the block is huge.

// Let's replace `await prisma.$transaction(async (tx) => {`
// with `await prisma.$transaction(async (tx) => {` (no change, wait, how to append the options at the end?)

// The transaction ends with `});` at the end of the block.
// I will just use regex to replace `await prisma.$transaction(async (tx) => {` 
// Actually, it's safer to just change `await prisma.$transaction(async (tx) => {` to `await prisma.$transaction(async (tx) => {`
// Wait. To add options, I have to find the matching closing bracket.
