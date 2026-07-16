const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  const rootDir = path.join(__dirname, '..');
  const filePath = path.join(rootDir, 'index.html');

  try {
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    res.end(html);
  } catch (error) {
    res.statusCode = 404;
    res.end('Not found');
  }
};
