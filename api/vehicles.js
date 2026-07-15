const { readVehicles, writeVehicles, parseBody, ensureVehicleShape } = require('./_lib/vehicles-store');

function sendJson(res, statusCode, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'https://vehicle-vault.example');

  if (req.method === 'GET') {
    sendJson(res, 200, readVehicles());
    return;
  }

  if (req.method === 'POST') {
    const roleHeader = req.headers['x-user-role'];
    const role = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;
    if (role !== 'admin') {
      sendJson(res, 403, { error: 'Viewer accounts can only view records.' });
      return;
    }

    try {
      const payload = await parseBody(req);
      const vehicles = readVehicles();
      const newVehicle = ensureVehicleShape(payload);
      vehicles.push(newVehicle);
      writeVehicles(vehicles);
      sendJson(res, 201, newVehicle);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid payload' });
    }
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
};
