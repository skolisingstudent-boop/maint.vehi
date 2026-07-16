const vehicleForm = document.getElementById('vehicleForm');
const vehicleList = document.getElementById('vehicleList');
const countBadge = document.getElementById('countBadge');
const formMessage = document.getElementById('formMessage');
const formTitle = document.getElementById('formTitle');
const vehicleIdInput = document.getElementById('vehicleId');
const clearFormBtn = document.getElementById('clearFormBtn');
const searchInput = document.getElementById('vehicleSearch');
const accessStatus = document.getElementById('accessStatus');
const quickAccessLink = document.getElementById('quickAccessLink');
const loginOverlay = document.getElementById('loginOverlay');
const loginPassword = document.getElementById('loginPassword');
const loginMessage = document.getElementById('loginMessage');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginCancelBtn = document.getElementById('loginCancelBtn');
const loginToggleBtn = document.getElementById('loginToggleBtn');
const homeLink = document.getElementById('homeLink');
const attachImageGlobalBtn = document.getElementById('attachImageGlobalBtn');

const ADMIN_PASSWORD = 'Admin123!';

let allVehicles = [];
let activeSearchQuery = '';
let currentRole = getStoredRole() || 'viewer';
let pendingImageVehicleId = null;
let pendingImageUpload = null;
let selectedVehicleId = null;

const imageUploadInput = document.createElement('input');
imageUploadInput.type = 'file';
imageUploadInput.accept = 'image/*';
imageUploadInput.hidden = true;
document.body.appendChild(imageUploadInput);

const imagePreviewModal = document.createElement('div');
imagePreviewModal.className = 'image-preview-modal hidden';
document.body.appendChild(imagePreviewModal);

const imagePreviewContent = document.createElement('div');
imagePreviewContent.className = 'image-preview-content';
imagePreviewModal.appendChild(imagePreviewContent);

const imagePreviewImage = document.createElement('img');
imagePreviewImage.alt = 'Vehicle preview';
imagePreviewImage.className = 'image-preview-image';
imagePreviewContent.appendChild(imagePreviewImage);

const imagePreviewClose = document.createElement('button');
imagePreviewClose.type = 'button';
imagePreviewClose.className = 'image-preview-close';
imagePreviewClose.textContent = 'Close';
imagePreviewContent.appendChild(imagePreviewClose);

function openImagePreview(imageData, imageName) {
  if (!imageData) {
    return;
  }
  imagePreviewImage.src = imageData;
  imagePreviewImage.alt = imageName || 'Vehicle preview';
  imagePreviewModal.classList.remove('hidden');
}

function closeImagePreview() {
  imagePreviewModal.classList.add('hidden');
  imagePreviewImage.removeAttribute('src');
}

imagePreviewModal.addEventListener('click', event => {
  if (event.target === imagePreviewModal) {
    closeImagePreview();
  }
});

imagePreviewClose.addEventListener('click', closeImagePreview);

function getStoredRole() {
  const viewQuery = new URLSearchParams(window.location.search).get('view');
  if (viewQuery === 'viewer') {
    return 'viewer';
  }

  const storedRole = sessionStorage.getItem('vehicleVaultRole') || localStorage.getItem('vehicleVaultRole');
  if (storedRole === 'admin') {
    return 'admin';
  }

  return null;
}

function initializeAccess() {
  const viewQuery = new URLSearchParams(window.location.search).get('view');
  const storedRole = sessionStorage.getItem('vehicleVaultRole') || localStorage.getItem('vehicleVaultRole');

  if (storedRole === 'admin') {
    setRole('admin');
    hideLoginOverlay();
    return;
  }

  if (viewQuery === 'viewer') {
    setRole('viewer', false);
    hideLoginOverlay();
    return;
  }

  setRole('viewer', false);
  showLoginOverlay();
}

function isAdminMode() {
  return currentRole === 'admin';
}

function setMessage(text, type = 'info') {
  if (!formMessage) {
    return;
  }

  formMessage.textContent = text;
  formMessage.style.color = type === 'error' ? '#ff8a80' : '#8ce99a';
}

function resetForm() {
  if (!vehicleForm) {
    return;
  }

  vehicleForm.reset();
  vehicleIdInput.value = '';
  pendingImageVehicleId = null;
  pendingImageUpload = null;
  selectedVehicleId = null;
  formTitle.textContent = 'Add Vehicle';
  setMessage('');
}

function updateAttachImageVisibility() {
  if (attachImageGlobalBtn) {
    attachImageGlobalBtn.style.display = isAdminMode() ? 'inline-flex' : 'none';
  }
}

function setRole(role, persist = true) {
  currentRole = role === 'viewer' ? 'viewer' : 'admin';
  if (persist) {
    sessionStorage.setItem('vehicleVaultRole', currentRole);
    localStorage.setItem('vehicleVaultRole', currentRole);
  }

  if (accessStatus) {
    accessStatus.textContent = currentRole === 'viewer' ? 'Locked' : 'Editing enabled';
  }

  if (quickAccessLink) {
    quickAccessLink.style.display = currentRole === 'admin' ? 'none' : 'inline-flex';
  }

  if (loginToggleBtn) {
    loginToggleBtn.textContent = currentRole === 'admin' ? 'Logged in' : 'Login';
  }

  if (clearFormBtn) {
    clearFormBtn.disabled = !isAdminMode();
  }

  if (vehicleForm) {
    vehicleForm.querySelectorAll('input, textarea').forEach(control => {
      if (control.id !== 'vehicleId') {
        control.disabled = !isAdminMode();
      }
    });
    const submitButton = vehicleForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = !isAdminMode();
    }
  }

  if (!isAdminMode()) {
    setMessage('Log in to unlock editing and adding.', 'info');
  } else {
    setMessage('');
  }

  updateAttachImageVisibility();

  const filteredVehicles = getFilteredVehicles(allVehicles, activeSearchQuery);
  renderVehicles(filteredVehicles);
  updateVehicleCount(filteredVehicles, allVehicles.length);
}

function showLoginOverlay() {
  if (loginOverlay) {
    loginOverlay.classList.remove('hidden');
  }
  if (loginPassword) {
    loginPassword.value = '';
    loginPassword.focus();
  }
  if (loginMessage) {
    loginMessage.textContent = '';
    loginMessage.style.color = '#78bdf9';
  }
}

function hideLoginOverlay() {
  if (loginOverlay) {
    loginOverlay.classList.add('hidden');
  }
}

function handleLogin() {
  const password = loginPassword?.value || '';

  if (password === ADMIN_PASSWORD) {
    setRole('admin');
    hideLoginOverlay();
    if (loginToggleBtn) {
      loginToggleBtn.textContent = 'Logged in';
    }
    if (loginMessage) {
      loginMessage.textContent = 'Access granted. You can now edit and add vehicles.';
      loginMessage.style.color = '#8ce99a';
    }
    return;
  }

  if (loginMessage) {
    loginMessage.textContent = 'Incorrect password. Try again.';
    loginMessage.style.color = '#ff8a80';
  }
}

function getFilteredVehicles(vehicles, query = '') {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return vehicles;
  }

  return vehicles.filter(vehicle => {
    const searchableValues = [
      vehicle.plateNumber,
      vehicle.vin,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.color,
      vehicle.ownerName,
      vehicle.driver,
      vehicle.contactNo,
      vehicle.notes,
      vehicle.operationalStatus,
      vehicle.physicalCondition,
      vehicle.pmCompliance,
      vehicle.nextLtoRegistration,
      vehicle.nextGsisInsurance
    ];

    return searchableValues.some(value =>
      String(value || '').toLowerCase().includes(normalizedQuery)
    );
  });
}

function updateVehicleCount(filteredVehicles, totalCount) {
  if (!countBadge) {
    return;
  }

  if (!activeSearchQuery) {
    countBadge.textContent = `${totalCount} vehicle${totalCount === 1 ? '' : 's'}`;
    return;
  }

  const suffix = filteredVehicles.length === 1 ? 'vehicle' : 'vehicles';
  countBadge.textContent = `${filteredVehicles.length} of ${totalCount} ${suffix} shown`;
}

async function loadVehicles() {
  try {
    const response = await fetch('/api/vehicles', {
      headers: { 'x-user-role': currentRole }
    });
    const vehicles = await response.json();
    allVehicles = vehicles;
    const filteredVehicles = getFilteredVehicles(vehicles, activeSearchQuery);
    renderVehicles(filteredVehicles);
    updateVehicleCount(filteredVehicles, vehicles.length);
  } catch (error) {
    console.error(error);
    vehicleList.innerHTML = '<p class="status-text">Unable to load vehicles right now.</p>';
  }
}

async function deleteVehicle(id) {
  if (!id || !isAdminMode()) {
    setMessage('Log in to unlock editing and adding.', 'info');
    return;
  }

  const vehicle = allVehicles.find(item => item.id === id);
  const label = vehicle?.plateNumber || 'this vehicle';

  if (!window.confirm(`Delete ${label}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Delete failed');
    }

    setMessage(`Vehicle ${label} deleted.`);
    resetForm();
    await loadVehicles();
  } catch (error) {
    console.error(error);
    setMessage('Could not delete the vehicle.', 'error');
  }
}

async function attachImageToVehicle(vehicleId) {
  if (!isAdminMode()) {
    setMessage('Log in to unlock editing and adding.', 'info');
    return;
  }

  pendingImageVehicleId = vehicleId || null;
  imageUploadInput.click();
}

function triggerAttachImageForSelectedVehicle() {
  const selectedVehicleId = vehicleIdInput.value;
  if (selectedVehicleId) {
    attachImageToVehicle(selectedVehicleId);
    return;
  }

  attachImageToVehicle(null);
  setMessage('Choose an image. It will be attached when you save the vehicle.', 'info');
}

async function removeImageFromVehicle(vehicleId) {
  if (!isAdminMode()) {
    setMessage('Log in to unlock editing and adding.', 'info');
    return;
  }

  const vehicle = allVehicles.find(item => item.id === vehicleId);
  if (!vehicle || !window.confirm(`Remove the image for ${vehicle.plateNumber || 'this vehicle'}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/vehicles/${vehicleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': currentRole
      },
      body: JSON.stringify({ imageData: '', imageName: '' })
    });

    if (!response.ok) {
      throw new Error('Remove image failed');
    }

    setMessage('Image removed.');
    await loadVehicles();
  } catch (error) {
    console.error(error);
    setMessage('Could not remove the image.', 'error');
  }
}

imageUploadInput.addEventListener('change', async () => {
  const file = imageUploadInput.files?.[0];
  if (!file) {
    return;
  }

  try {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (pendingImageVehicleId) {
          const response = await fetch(`/api/vehicles/${pendingImageVehicleId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': currentRole
            },
            body: JSON.stringify({
              imageData: reader.result,
              imageName: file.name
            })
          });

          if (!response.ok) {
            throw new Error('Image upload failed');
          }

          setMessage(`Image attached for ${file.name}.`);
          pendingImageVehicleId = null;
          pendingImageUpload = null;
          imageUploadInput.value = '';
          await loadVehicles();
          return;
        }

        pendingImageUpload = {
          imageData: reader.result,
          imageName: file.name
        };
        setMessage(`Image ready for ${file.name}. Save the vehicle to attach it to the inventory item.`, 'info');
        imageUploadInput.value = '';
      } catch (error) {
        console.error(error);
        setMessage('Could not attach the image.', 'error');
        pendingImageUpload = null;
        imageUploadInput.value = '';
      }
    };

    reader.onerror = () => {
      setMessage('Could not read the selected image.', 'error');
      pendingImageVehicleId = null;
      pendingImageUpload = null;
      imageUploadInput.value = '';
    };

    reader.readAsDataURL(file);
  } catch (error) {
    console.error(error);
    setMessage('Could not attach the image.', 'error');
    pendingImageUpload = null;
    imageUploadInput.value = '';
  }
});

function renderVehicles(vehicles) {
  if (!allVehicles.length) {
    vehicleList.innerHTML = '<div class="vehicle-card">No vehicles added yet.</div>';
    return;
  }

  if (!vehicles.length) {
    vehicleList.innerHTML = '<div class="vehicle-card">No vehicles match your search.</div>';
    return;
  }

  vehicleList.innerHTML = vehicles
    .map(vehicle => {
      const actionButtons = isAdminMode()
        ? `
          <div class="action-buttons">
            <button class="attach-image-btn secondary" type="button" data-id="${vehicle.id}">Attach Image</button>
            <button class="edit-btn" type="button" data-id="${vehicle.id}">Edit</button>
            <button class="delete-btn" type="button" data-id="${vehicle.id}">Delete</button>
          </div>
        `
        : '<span class="read-only-pill">View only</span>';

      const photoPreview = vehicle.imageData
        ? `<button class="vehicle-photo" type="button" data-image="${vehicle.imageData}" data-name="${vehicle.imageName || 'Vehicle image'}"><img src="${vehicle.imageData}" alt="${vehicle.imageName || 'Vehicle image'}" /></button>`
        : '';

      const imageLabel = vehicle.imageName ? `<div class="meta">Photo: ${vehicle.imageName}</div>` : '';
      const removeImageButton = vehicle.imageData && isAdminMode()
        ? `<button class="remove-image-btn secondary" type="button" data-id="${vehicle.id}">Remove image</button>`
        : '';

      return `
        <article class="vehicle-card">
          <header>
            <strong>${vehicle.plateNumber || 'Unknown'}</strong>
            <span class="pill">${vehicle.make || 'Unknown'}</span>
          </header>
          <div class="meta">${vehicle.model || 'Model not set'} • ${vehicle.year || 'Year unknown'}</div>
          <div class="meta">Owner: ${vehicle.ownerName || 'Unassigned'}</div>
          <div class="meta">VIN: ${vehicle.vin || 'Not provided'}</div>
          ${photoPreview}
          ${imageLabel}
          <div class="actions-row">
            <span>${vehicle.notes || 'No notes'}</span>
            ${actionButtons}
          </div>
          ${removeImageButton}
        </article>
      `;
    })
    .join('');

  if (!isAdminMode()) {
    return;
  }

  vehicleList.querySelectorAll('.attach-image-btn').forEach(button => {
    button.addEventListener('click', () => {
      attachImageToVehicle(button.dataset.id);
    });
  });

  vehicleList.querySelectorAll('.remove-image-btn').forEach(button => {
    button.addEventListener('click', async () => {
      await removeImageFromVehicle(button.dataset.id);
    });
  });

  vehicleList.querySelectorAll('.vehicle-photo').forEach(button => {
    button.addEventListener('click', () => {
      openImagePreview(button.dataset.image, button.dataset.name);
    });
  });

  vehicleList.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', () => {
      const vehicle = allVehicles.find(item => item.id === button.dataset.id);
      selectedVehicleId = vehicle?.id || null;
      populateForm(vehicle);
    });
  });

  vehicleList.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', async () => {
      await deleteVehicle(button.dataset.id);
    });
  });
}

function populateForm(vehicle) {
  if (!isAdminMode()) {
    setMessage('Log in to unlock editing and adding.', 'info');
    return;
  }

  if (!vehicle) {
    resetForm();
    return;
  }

  selectedVehicleId = vehicle?.id || null;
  vehicleIdInput.value = vehicle.id || '';
  document.getElementById('plateNumber').value = vehicle.plateNumber || '';
  document.getElementById('vin').value = vehicle.vin || '';
  document.getElementById('make').value = vehicle.make || '';
  document.getElementById('model').value = vehicle.model || '';
  document.getElementById('year').value = vehicle.year || '';
  document.getElementById('color').value = vehicle.color || '';
  document.getElementById('ownerName').value = vehicle.ownerName || '';
  document.getElementById('driver').value = vehicle.driver || '';
  document.getElementById('contactNo').value = vehicle.contactNo || '';
  document.getElementById('nextLtoRegistration').value = vehicle.nextLtoRegistration || '';
  document.getElementById('nextGsisInsurance').value = vehicle.nextGsisInsurance || '';
  document.getElementById('operationalStatus').value = vehicle.operationalStatus || '';
  document.getElementById('physicalCondition').value = vehicle.physicalCondition || '';
  document.getElementById('pmCompliance').value = vehicle.pmCompliance || '';
  document.getElementById('pmType').value = vehicle.pmType || '';
  document.getElementById('nextPmSchedule').value = vehicle.nextPmSchedule || '';
  document.getElementById('notes').value = vehicle.notes || '';
  formTitle.textContent = 'Edit Vehicle';
  setMessage('Vehicle loaded for editing.');
}

vehicleForm.addEventListener('submit', async event => {
  event.preventDefault();

  if (!isAdminMode()) {
    setMessage('Log in to unlock editing and adding.', 'info');
    return;
  }

  const payload = {
    plateNumber: document.getElementById('plateNumber').value.trim(),
    vin: document.getElementById('vin').value.trim(),
    make: document.getElementById('make').value.trim(),
    model: document.getElementById('model').value.trim(),
    year: document.getElementById('year').value.trim(),
    color: document.getElementById('color').value.trim(),
    ownerName: document.getElementById('ownerName').value.trim(),
    driver: document.getElementById('driver').value.trim(),
    contactNo: document.getElementById('contactNo').value.trim(),
    nextLtoRegistration: document.getElementById('nextLtoRegistration').value.trim(),
    nextGsisInsurance: document.getElementById('nextGsisInsurance').value.trim(),
    operationalStatus: document.getElementById('operationalStatus').value.trim(),
    physicalCondition: document.getElementById('physicalCondition').value.trim(),
    pmCompliance: document.getElementById('pmCompliance').value.trim(),
    pmType: document.getElementById('pmType').value.trim(),
    nextPmSchedule: document.getElementById('nextPmSchedule').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };

  if (pendingImageUpload) {
    payload.imageData = pendingImageUpload.imageData;
    payload.imageName = pendingImageUpload.imageName;
  }

  if (!payload.plateNumber) {
    setMessage('A plate number is required.', 'error');
    return;
  }

  try {
    const id = vehicleIdInput.value || selectedVehicleId;
    const response = await fetch(id ? `/api/vehicles/${id}` : '/api/vehicles', {
      method: id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': currentRole
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    pendingImageVehicleId = null;
    pendingImageUpload = null;
    selectedVehicleId = null;
    setMessage(id ? 'Vehicle updated.' : 'Vehicle saved.');
    resetForm();
    await loadVehicles();
  } catch (error) {
    console.error(error);
    setMessage('Could not save the vehicle.', 'error');
  }
});

clearFormBtn.addEventListener('click', resetForm);

if (attachImageGlobalBtn) {
  attachImageGlobalBtn.addEventListener('click', triggerAttachImageForSelectedVehicle);
}

if (loginToggleBtn) {
  loginToggleBtn.addEventListener('click', () => {
    if (isAdminMode()) {
      hideLoginOverlay();
      setMessage('You already have access to editing and adding.', 'info');
    } else {
      showLoginOverlay();
    }
  });
}

if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener('click', handleLogin);
}

if (homeLink) {
  homeLink.addEventListener('click', () => {
    sessionStorage.removeItem('vehicleVaultRole');
    localStorage.removeItem('vehicleVaultRole');
    setRole('viewer', false);
    hideLoginOverlay();
  });
}

if (loginCancelBtn) {
  loginCancelBtn.addEventListener('click', () => {
    sessionStorage.removeItem('vehicleVaultRole');
    localStorage.removeItem('vehicleVaultRole');
    setRole('viewer', false);
    hideLoginOverlay();
  });
}

if (loginPassword) {
  loginPassword.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLogin();
    }
  });
}

if (searchInput) {
  searchInput.addEventListener('input', event => {
    activeSearchQuery = event.target.value;
    const filteredVehicles = getFilteredVehicles(allVehicles, activeSearchQuery);
    renderVehicles(filteredVehicles);
    updateVehicleCount(filteredVehicles, allVehicles.length);
  });
}

initializeAccess();
loadVehicles();
