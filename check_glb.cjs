const fs = require('fs');
const path = require('path');

const stats = fs.statSync(path.join(__dirname, 'public', 'faro.glb'));
console.log('File size:', stats.size);

const buffer = Buffer.alloc(4);
const fd = fs.openSync(path.join(__dirname, 'public', 'faro.glb'), 'r');
fs.readSync(fd, buffer, 0, 4, 0);
fs.closeSync(fd);

console.log('Magic bytes:', buffer.toString('utf8'));
