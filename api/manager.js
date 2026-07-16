const fs = require('fs');
const path = require('path');

function resolveEntryFile(rootDir, fileName) {
  const candidates = [
    path.join(rootDir, fileName),
    path.join(rootDir, 'public', fileName),
    path.join(rootDir, '..', fileName),
    path.join(rootDir, '..', 'public', fileName)
  ];

  return candidates.find(candidate => fs.existsSync(candidate));
}

module.exports = async function handler(req, res) {
  const rootDir = path.join(__dirname, '..');
  const filePath = resolveEntryFile(rootDir, 'manager.html');

  if (!filePath) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

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
