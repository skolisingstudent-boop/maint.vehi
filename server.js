const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = process.env.PORT || 3000;
const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data', 'vehicles.json');

function getLocalBaseUrl() {
  const nets = os.networkInterfaces();
  const addresses = [];

  Object.values(nets).forEach(items => {
    items.forEach(item => {
      if (item.family === 'IPv4' && !item.internal) {
        addresses.push(item.address);
      }
    });
  });

  const host = addresses[0] || '127.0.0.1';
  return `http://${host}:${port}`;
}

const localBaseUrl = getLocalBaseUrl();

function ensureDataFile() {
  if (!fs.existsSync(dataFile)) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
}

function readVehicles() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeVehicles(vehicles) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(vehicles, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getRequestedRole(req, url) {
  const headerValue = req.headers['x-user-role'];
  const roleHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (roleHeader === 'viewer' || roleHeader === 'admin') {
    return roleHeader;
  }

  const roleParam = url.searchParams.get('role');
  return roleParam === 'viewer' ? 'viewer' : 'admin';
}

function isAdminRole(role) {
  return role === 'admin';
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function serveStatic(res, requestPath) {
  const safePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filePath = path.resolve(rootDir, safePath);
  if (!filePath.startsWith(rootDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = getRequestedRole(req, url);

  if (url.pathname === '/api/qr-url' && req.method === 'GET') {
    sendJson(res, 200, { url: `${localBaseUrl}/manager.html` });
    return;
  }

  if (url.pathname === '/api/vehicles' && req.method === 'GET') {
    sendJson(res, 200, readVehicles());
    return;
  }

  if (url.pathname === '/api/vehicles' && req.method === 'POST') {
    if (!isAdminRole(role)) {
      sendJson(res, 403, { error: 'Viewer accounts can only view records.' });
      return;
    }

    try {
      const payload = await parseBody(req);
      const vehicles = readVehicles();
      const newVehicle = {
        id: `veh-${Date.now()}`,
        plateNumber: payload.plateNumber || '',
        make: payload.make || '',
        model: payload.model || '',
        year: payload.year || '',
        color: payload.color || '',
        ownerName: payload.ownerName || '',
        driver: payload.driver || '',
        contactNo: payload.contactNo || '',
        nextLtoRegistration: payload.nextLtoRegistration || '',
        nextGsisInsurance: payload.nextGsisInsurance || '',
        operationalStatus: payload.operationalStatus || '',
        physicalCondition: payload.physicalCondition || '',
        pmCompliance: payload.pmCompliance || '',
        pmType: payload.pmType || '',
        nextPmSchedule: payload.nextPmSchedule || '',
        vin: payload.vin || '',
        notes: payload.notes || '',
        scannedAt: payload.scannedAt || new Date().toISOString()
      };
      vehicles.push(newVehicle);
      writeVehicles(vehicles);
      sendJson(res, 201, newVehicle);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid payload' });
    }
    return;
  }

  if (url.pathname.startsWith('/api/vehicles/') && req.method === 'PUT') {
    if (!isAdminRole(role)) {
      sendJson(res, 403, { error: 'Viewer accounts can only view records.' });
      return;
    }

    try {
      const id = url.pathname.split('/').pop();
      const payload = await parseBody(req);
      const vehicles = readVehicles();
      const index = vehicles.findIndex(vehicle => vehicle.id === id);
      if (index === -1) {
        sendJson(res, 404, { error: 'Vehicle not found' });
        return;
      }

      vehicles[index] = {
        ...vehicles[index],
        ...payload,
        id: vehicles[index].id
      };
      writeVehicles(vehicles);
      sendJson(res, 200, vehicles[index]);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid payload' });
    }
    return;
  }

  if (url.pathname.startsWith('/api/vehicles/') && req.method === 'DELETE') {
    if (!isAdminRole(role)) {
      sendJson(res, 403, { error: 'Viewer accounts can only view records.' });
      return;
    }

    const id = url.pathname.split('/').pop();
    const vehicles = readVehicles();
    const filtered = vehicles.filter(vehicle => vehicle.id !== id);
    if (filtered.length === vehicles.length) {
      sendJson(res, 404, { error: 'Vehicle not found' });
      return;
    }
    writeVehicles(filtered);
    sendJson(res, 200, { success: true });
    return;
  }

  serveStatic(res, url.pathname);
});

server.listen(port, () => {
  console.log(`Vehicle Vault is running at ${localBaseUrl}`);
});
