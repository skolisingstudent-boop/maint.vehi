// Generate QR code for accessing the vehicle manager
async function generateQRCode() {
  const container = document.getElementById('qrCodeContainer');
  if (!container) {
    return;
  }

  let managerUrl = `${window.location.origin}/manager.html`;

  try {
    const response = await fetch('/api/qr-url');
    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        managerUrl = data.url;
      }
    }
  } catch (error) {
    console.warn('Could not fetch QR URL from server:', error);
  }

  // Clear any existing QR code
  container.innerHTML = '';

  // Create title
  const title = document.createElement('h2');
  title.textContent = 'Vehicle Manager';
  title.style.marginTop = '0';
  container.appendChild(title);

  // Create label
  const label = document.createElement('p');
  label.className = 'qr-label';
  label.textContent = 'Scan with your device';
  label.style.marginBottom = '20px';
  container.appendChild(label);

  // Generate QR code
  if (window.QRCode) {
    const qrWrapper = document.createElement('div');
    qrWrapper.style.display = 'flex';
    qrWrapper.style.justifyContent = 'center';
    qrWrapper.style.marginBottom = '20px';
    qrWrapper.id = 'qrCodeImage';
    container.appendChild(qrWrapper);

    new QRCode(qrWrapper, {
      text: managerUrl,
      width: 240,
      height: 240,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

}

// Download QR code as image
function downloadQRCode() {
  const qrImage = document.querySelector('#qrCodeImage canvas');
  
  if (!qrImage) {
    alert('QR code not found. Please refresh the page.');
    return;
  }
  
  // Create a link element and trigger download
  const link = document.createElement('a');
  link.href = qrImage.toDataURL('image/png');
  link.download = 'vehicle-manager-qr-code.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate QR code when page loads
window.addEventListener('load', generateQRCode);

// Add download button event listener
const downloadBtn = document.getElementById('downloadQrBtn');
if (downloadBtn) {
  downloadBtn.addEventListener('click', downloadQRCode);
}

