const fs = require('fs');
const part1 = fs.readFileSync('_part1.ts', 'utf8');
const part2 = fs.readFileSync('_part2.ts', 'utf8');
const full = part1 + part2;
fs.writeFileSync('src/services/ContentService.ts', full);
console.log('Written ContentService.ts:', full.length, 'bytes');
