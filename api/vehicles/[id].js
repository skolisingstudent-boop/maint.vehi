const { readVehicles, writeVehicles, parseBody, ensureVehicleShape } = require('../_lib/vehicles-store');

function sendJson(res, statusCode, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'https://vehicle-vault.example');
  const id = url.pathname.split('/').filter(Boolean).pop();

  if (req.method === 'PUT') {
    const roleHeader = req.headers['x-user-role'];
    const role = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;
    if (role !== 'admin') {
      sendJson(res, 403, { error: 'Viewer accounts can only view records.' });
      return;
    }

    try {
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

  if (req.method === 'DELETE') {
    const roleHeader = req.headers['x-user-role'];
    const role = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;
    if (role !== 'admin') {
      sendJson(res, 403, { error: 'Viewer accounts can only view records.' });
      return;
    }

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

  res.statusCode = 405;
  res.end('Method not allowed');
};
