const fs = require('fs');
const path = require('path');

function getRepoDataFilePath() {
  return path.join(process.cwd(), 'data', 'vehicles.json');
}

function getRuntimeDataFilePath() {
  return process.env.VEHICLES_DATA_PATH || path.join('/tmp', 'vehicles.json');
}

function ensureDataFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
}

function readVehicles() {
  const runtimePath = getRuntimeDataFilePath();
  const repoPath = getRepoDataFilePath();

  if (fs.existsSync(runtimePath)) {
    return JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
  }

  if (fs.existsSync(repoPath)) {
    return JSON.parse(fs.readFileSync(repoPath, 'utf8'));
  }

  ensureDataFile(runtimePath);
  return [];
}

function writeVehicles(vehicles) {
  const runtimePath = getRuntimeDataFilePath();
  ensureDataFile(runtimePath);
  fs.writeFileSync(runtimePath, JSON.stringify(vehicles, null, 2), 'utf8');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const bodyFromRequest = req.body;
    const rawBodyFromRequest = req.rawBody;
    const bodyCandidates = [bodyFromRequest, rawBodyFromRequest];

    for (const candidate of bodyCandidates) {
      if (candidate === undefined || candidate === null) {
        continue;
      }

      try {
        if (typeof candidate === 'string') {
          resolve(candidate ? JSON.parse(candidate) : {});
          return;
        }

        if (Buffer.isBuffer(candidate)) {
          const text = candidate.toString('utf8');
          resolve(text ? JSON.parse(text) : {});
          return;
        }

        if (typeof candidate === 'object') {
          resolve(candidate);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
    }

    if (typeof req.on !== 'function') {
      resolve({});
      return;
    }

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

function ensureVehicleShape(payload) {
  return {
    id: payload.id || `veh-${Date.now()}`,
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
    imageData: payload.imageData || '',
    imageName: payload.imageName || '',
    scannedAt: payload.scannedAt || new Date().toISOString()
  };
}

module.exports = {
  readVehicles,
  writeVehicles,
  parseBody,
  ensureVehicleShape
};
