const fs = require('fs');
const path = 'src/app/api/purchase/[id]/route.ts';
let code = fs.readFileSync(path, 'utf8');

// The block we want to change is:
/*
            // Sync product cost / selling price
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  purchasePrice: item.baseCostPrice,
*/

const search = `            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  purchasePrice: item.baseCostPrice,`;
const replace = `            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  name: item.productName || undefined,
                  displayName: item.suggestedDisplayName || undefined,
                  partNumber: item.partNumber || undefined,
                  purchasePrice: item.baseCostPrice,`;

code = code.replace(search, replace);

// Also need to update PurchaseBillItem to save productName
const searchItem = `await tx.purchaseBillItem.update({
              where: { id: item.id },
              data: {`;
const replaceItem = `await tx.purchaseBillItem.update({
              where: { id: item.id },
              data: {
                productName:    item.productName || undefined,`;

code = code.replace(searchItem, replaceItem);

fs.writeFileSync(path, code);
console.log("Updated PUT api");
