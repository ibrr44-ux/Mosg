// ---------- QR Code Generation ----------
function generateQRCode(containerId, text, size) {
  size = size || 120;
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  try {
    new QRCode(container, { text: text, width: size, height: size, colorDark: '#0f766e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  } catch(e) {
    container.innerHTML = '<div style="width:'+size+'px;height:'+size+'px;background:var(--glass-bg);display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:0.7rem;color:var(--text-muted);">' + escapeHtml(text) + '</div>';
  }
}

function openQRPrint(equipId) {
  dbGetAll('equipment').then(function(list) {
    var rawId = equipId;
    var rawIdStr = String(rawId).trim();
    var eq = list.find(function(x) {
      return sameId(x.id, rawIdStr) || sameId(x.uniqueId, rawIdStr);
    });
    if (!eq || !eq.uniqueId) { alert(t('alertDeviceNotFound')); return; }

    var html = '<div class="flex-between"><h3><i class="fas fa-qrcode"></i> ' + t('qrBarcode') + '</h3><button onclick="closeQRModal()" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button></div>';
    html += '<div id="qr-print-area" style="margin-top:1rem;">';
    
    // Print Options
    html += '<div class="card-modern" style="margin-bottom:1.5rem; background:rgba(0,0,0,0.03); border:1px dashed var(--border);">';
    html += '<label style="font-size:0.8rem; font-weight:700; margin-bottom:0.5rem; display:block;">' + t('qrPrintType') + '</label>';
    html += '<select id="print-type" onchange="togglePrintOptions()" style="margin-bottom:1rem;">';
    html += '<option value="single">' + t('qrSingleSticker') + '</option>';
    html += '<option value="grid" selected>' + t('qrGridSticker') + '</option>';
    html += '</select>';
    
    html += '<div id="grid-options">';
    html += '<label style="font-size:0.8rem; font-weight:700; margin-bottom:0.5rem; display:block;">' + t('qrStickerCount') + '</label>';
    html += '<input type="number" id="sticker-count" value="40" min="1" max="100" style="margin-bottom:1rem;">';
    html += '</div>';
    html += '</div>';

    // Preview
    html += '<div id="qr-print-target" style="display:flex; flex-direction:column; align-items:center; padding:2rem; background:white; border-radius:12px; box-shadow:inset 0 0 10px rgba(0,0,0,0.05); margin-bottom:1.5rem;"></div>';
    
    html += '<div style="display:flex; gap:10px; justify-content:center;">';
    html += '<button class="btn btn-primary" style="flex:1" onclick="printQR(\'' + escapeHtml(eq.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(eq.uniqueId).replace(/'/g, "\\'") + '\')"><i class="fas fa-print"></i> ' + t('qrPrint') + '</button>';
    html += '<button class="btn btn-outline" onclick="downloadQR(\'' + escapeHtml(eq.name).replace(/'/g, "\\'") + '\')"><i class="fas fa-download"></i></button>';
    html += '</div></div>';

    document.getElementById('qr-modal-content').innerHTML = html;
    document.getElementById('qr-modal').style.display = 'flex';
    
    setTimeout(function() {
      generateQRCode('qr-print-target', eq.uniqueId, 150);
      var label = document.createElement('div');
      label.style.cssText = 'text-align:center; margin-top:10px; color:#1e293b;';
      label.innerHTML = '<div style="font-weight:800; font-size:1.1rem;">' + t('qrStickerLabel') + escapeHtml(eq.uniqueId) + '</div><div style="font-size:0.8rem; opacity:0.7;">' + escapeHtml(eq.name) + '</div>';
      document.getElementById('qr-print-target').appendChild(label);
    }, 100);
  });
}

function togglePrintOptions() {
  var type = document.getElementById('print-type').value;
  document.getElementById('grid-options').style.display = (type === 'grid') ? 'block' : 'none';
}

function closeQRModal() { document.getElementById('qr-modal').style.display = 'none'; }

function printQR(eqName, eqId) {
  var type = document.getElementById('print-type').value;
  var count = (type === 'grid') ? parseInt(document.getElementById('sticker-count').value) || 1 : 1;
  
  var win = window.open('', '_blank');
  var printDir = currentLang === 'ar' ? 'rtl' : 'ltr';
  
  win.document.write('<!DOCTYPE html><html dir="' + printDir + '"><head><title>' + eqName + '</title>');
  win.document.write('<style>');
  win.document.write('body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: white; }');
  
  // Philosophy: mm units, fixed sizes
  if (type === 'grid') {
    win.document.write('.page-container { display: flex; flex-wrap: wrap; padding: 10mm; gap: 5mm; justify-content: flex-start; align-content: flex-start; }');
    win.document.write('.sticker { width: 40mm; height: 25mm; border: 1px solid #eee; display: flex; flex-direction: row; align-items: center; justify-content: space-around; padding: 2mm; box-sizing: border-box; page-break-inside: avoid; border-radius: 2mm; }');
    win.document.write('.qr-box { width: 18mm; height: 18mm; }');
    win.document.write('.label-box { display: flex; flex-direction: column; justify-content: center; width: 18mm; overflow: hidden; }');
    win.document.write('.label-main { font-weight: 800; font-size: 8pt; color: #000; margin-bottom: 1mm; white-space: nowrap; }');
    win.document.write('.label-sub { font-size: 6pt; color: #666; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }');
  } else {
    // Thermal Sticker (e.g. 50mm x 30mm)
    win.document.write('.page-container { display: flex; justify-content: center; align-items: center; height: 100vh; }');
    win.document.write('.sticker { width: 50mm; height: 30mm; display: flex; flex-direction: row; align-items: center; justify-content: space-around; padding: 2mm; box-sizing: border-box; }');
    win.document.write('.qr-box { width: 22mm; height: 22mm; }');
    win.document.write('.label-box { display: flex; flex-direction: column; justify-content: center; width: 22mm; }');
    win.document.write('.label-main { font-weight: 800; font-size: 10pt; color: #000; margin-bottom: 2mm; }');
    win.document.write('.label-sub { font-size: 7pt; color: #444; }');
  }
  
  win.document.write('@media print { .sticker { border: none !important; } .no-print { display: none !important; } }');
  win.document.write('</style></head><body>');
  
  win.document.write('<div class="page-container">');
  
  // We need the QR image source. We can get it from the canvas/img in the current modal.
  var sourceEl = document.querySelector('#qr-print-target canvas') || document.querySelector('#qr-print-target img');
  var qrSrc = sourceEl ? (sourceEl.toDataURL ? sourceEl.toDataURL() : sourceEl.src) : '';
  
  var stickerHtml = '<div class="sticker">' +
                    '<div class="qr-box"><img src="' + qrSrc + '" style="width:100%; height:100%; object-fit:contain;"></div>' +
                    '<div class="label-box">' +
                    '<div class="label-main">' + t('qrStickerLabel') + eqId + '</div>' +
                    '<div class="label-sub">' + eqName + '</div>' +
                    '</div>' +
                    '</div>';
                    
  for (var i = 0; i < count; i++) {
    win.document.write(stickerHtml);
  }
  
  win.document.write('</div>');
  win.document.write('<script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 500); };</script>');
  win.document.write('</body></html>');
  win.document.close();
}

function downloadQR(name) {
  var canvas = document.querySelector('#qr-print-target canvas');
  if (canvas) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = name + '_QR.png';
    a.click();
  } else {
    var img = document.querySelector('#qr-print-target img');
    if (img && img.src) {
      var a = document.createElement('a');
      a.href = img.src;
      a.download = name + '_QR.png';
      a.click();
    }
  }
}

// ---------- Scanner ----------
function onScanSuccess(decodedText, decodedResult) {
  stopCameraScanner();
  showEquipmentDetailById(decodedText);
}

function onScanFailure(error) {
  // console.warn('QR error:', error);
}

function startCameraScanner() {
  var statusEl = document.getElementById('scanner-status');
  var optionsEl = document.getElementById('scanner-options');
  var cameraContainer = document.getElementById('camera-container');
  var readerEl = document.getElementById('qr-reader');

  if (!html5QrCode) {
    try {
      html5QrCode = new Html5Qrcode('qr-reader');
    } catch (err) {
      console.error('Failed to initialize Html5Qrcode:', err);
      statusEl.innerHTML = '<span style="color:var(--danger)"><i class="fas fa-exclamation-circle"></i> ' + t('cameraInitFail') + '</span>';
      return;
    }
  }

  if (optionsEl) optionsEl.style.display = 'none';
  if (cameraContainer) cameraContainer.style.display = 'block';
  if (readerEl) readerEl.innerHTML = '';

  statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('cameraStarting');

  html5QrCode.start(
    { facingMode: 'environment' },
    {
      fps: 10,
      aspectRatio: 1.3333333,
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        var size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
        return { width: size, height: size };
      }
    },
    onScanSuccess,
    onScanFailure
  )
    .then(function() {
      statusEl.innerHTML = '<span style="color:var(--success)"><i class="fas fa-camera"></i> ' + t('cameraOn') + '</span>';
    })
    .catch(function(err) {
      console.error('Failed to start camera scanner:', err);
      statusEl.innerHTML = '<span style="color:var(--danger)"><i class="fas fa-exclamation-circle"></i> ' + t('cameraFail') + ': ' + err + '</span>';
      if (optionsEl) optionsEl.style.display = 'flex';
      if (cameraContainer) cameraContainer.style.display = 'none';
    });
}

function stopCameraScanner() {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(function() {
      document.getElementById('scanner-options').style.display = 'flex';
      document.getElementById('camera-container').style.display = 'none';
      document.getElementById('scanner-status').innerHTML = '';
      html5QrCode.clear();
    }).catch(function(err) { console.error('Failed to stop scanner', err); });
  }
}

function scanImageFile(e) {
  var input = e && e.target ? e.target : e;
  if (!input || !input.files || input.files.length === 0) { return; }
  var file = input.files[0];
  var statusEl = document.getElementById('scanner-status');
  statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('scanImage');
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qr-reader');
  }
  html5QrCode.scanFile(file, true)
    .then(function(decodedText) {
      statusEl.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> ' + t('scanSuccess') + '</span>';
      showEquipmentDetailById(decodedText);
    })
    .catch(function(err) {
      statusEl.innerHTML = '<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> ' + t('scanNoBarcode') + '</span>';
      console.error('File scan error:', err);
    });
  input.value = '';
}
