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
  if (!equipId) return;
  dbGetAll('equipment').then(function(list) {
    var rawIdStr = String(equipId).trim();
    var eq = list.find(function(x) {
      return sameId(x.id, rawIdStr) || sameId(x.uniqueId, rawIdStr);
    });
    
    if (!eq || !eq.uniqueId) { 
      alert(t('alertDeviceNotFound')); 
      return; 
    }

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
    html += '<div id="qr-print-target" style="display:flex; flex-direction:column; align-items:center; padding:2rem; background:white; border-radius:12px; box-shadow:inset 0 0 10px rgba(0,0,0,0.05); margin-bottom:1.5rem; min-height:150px;"></div>';
    
    html += '<div style="display:flex; gap:10px; justify-content:center;">';
    // Use a safer way to pass data
    window._currentPrintEq = { name: eq.name, id: eq.uniqueId };
    html += '<button class="btn btn-primary" style="flex:1" onclick="exportQRSticker()"><i class="fas fa-download"></i> ' + t('qrExport') + '</button>';
    html += '<button class="btn btn-outline" onclick="downloadQR(\'' + escapeHtml(eq.name).replace(/'/g, "\\'") + '\')"><i class="fas fa-image"></i></button>';
    html += '</div></div>';

    var modal = document.getElementById('qr-modal');
    var content = document.getElementById('qr-modal-content');
    if (modal && content) {
      content.innerHTML = html;
      modal.style.display = 'flex';
      
      setTimeout(function() {
        try {
          generateQRCode('qr-print-target', eq.uniqueId, 150);
          var target = document.getElementById('qr-print-target');
          if (target) {
            var label = document.createElement('div');
            label.style.cssText = 'text-align:center; margin-top:10px; color:#1e293b;';
            label.innerHTML = '<div style="font-weight:800; font-size:1.1rem;">' + t('qrStickerLabel') + escapeHtml(eq.uniqueId) + '</div><div style="font-size:0.8rem; opacity:0.7;">' + escapeHtml(eq.name) + '</div>';
            target.appendChild(label);
          }
        } catch(err) {
          console.error('QR generation error:', err);
          alert(currentLang === 'ar' ? 'خطأ في توليد الباركود' : 'Error generating QR code');
        }
      }, 200);
    }
  });
}

function togglePrintOptions() {
  var type = document.getElementById('print-type').value;
  document.getElementById('grid-options').style.display = (type === 'grid') ? 'block' : 'none';
}

function closeQRModal() { document.getElementById('qr-modal').style.display = 'none'; }

function exportQRSticker() {
  if (!window._currentPrintEq) {
    alert(t('alertDeviceNotFound'));
    return;
  }
  var eqName = window._currentPrintEq.name;
  var eqId   = window._currentPrintEq.id;

  var type = document.getElementById('print-type').value;

  var qrSrc = '';
  var targetDiv = document.getElementById('qr-print-target');
  if (!targetDiv) {
    alert(currentLang === 'ar' ? 'لم يتم العثور على عنصر الباركود' : 'QR element not found');
    return;
  }

  var canvasEl = targetDiv.querySelector('canvas');
  if (canvasEl && typeof canvasEl.toDataURL === 'function') {
    try { qrSrc = canvasEl.toDataURL('image/png'); } catch(e) { console.warn(e); }
  }
  if (!qrSrc) {
    var imgEl = targetDiv.querySelector('img');
    if (imgEl && imgEl.src) qrSrc = imgEl.src;
  }
  if (!qrSrc) {
    var svgEl = targetDiv.querySelector('svg');
    if (svgEl) {
      try { qrSrc = 'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(svgEl)); } catch(e) {}
    }
  }
  if (!qrSrc) {
    alert(currentLang === 'ar' ? 'جاري تجهيز الباركود، يرجى المحاولة بعد لحظة.' : 'QR code is being generated, please try again shortly.');
    return;
  }

  closeQRModal();

  var width, height, qrSize, padLeft, fontMain, fontSub;
  if (type === 'grid') {
    width = 800; height = 500; qrSize = 340; padLeft = 30; fontMain = 26; fontSub = 18;
  } else {
    width = 900; height = 600; qrSize = 400; padLeft = 40; fontMain = 34; fontSub = 22;
  }
  var labelX = padLeft + qrSize + padLeft;
  var labelW = width - labelX - padLeft;
  var centerX = labelX + labelW / 2;
  var qrY = (height - qrSize) / 2;

  var img = new Image();
  img.onload = function() {
    var c = document.createElement('canvas');
    c.width = width; c.height = height;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, padLeft, qrY, qrSize, qrSize);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + fontMain + 'px system-ui, sans-serif';
    ctx.fillText(t('qrStickerLabel') + eqId, centerX, height / 2 - fontMain * 0.3);
    ctx.fillStyle = '#333333';
    ctx.font = fontSub + 'px system-ui, sans-serif';
    ctx.fillText(eqName, centerX, height / 2 + fontSub * 0.7);

    var link = document.createElement('a');
    link.href = c.toDataURL('image/png');
    link.download = (eqName || 'sticker') + '_QR_' + new Date().getTime() + '.png';
    link.click();
  };
  img.onerror = function() {
    alert(currentLang === 'ar' ? 'فشل تصدير الباركود' : 'Failed to export QR code');
  };
  img.src = qrSrc;
  if (img.complete && img.naturalWidth > 0) img.onload();
}

function downloadQR(name) {
  var target = document.getElementById('qr-print-target');
  if (!target) {
    alert(currentLang === 'ar' ? 'لم يتم العثور على عنصر الباركود' : 'QR element not found');
    return;
  }

  // البحث عن canvas أولاً
  var canvas = target.querySelector('canvas');
  if (canvas && typeof canvas.toDataURL === 'function') {
    try {
      var link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = escapeHtml(name) + '_QR_' + new Date().getTime() + '.png';
      link.click();
      return;
    } catch(e) {
      console.warn('Canvas download failed:', e);
    }
  }

  // إذا لم ننجح مع canvas، نبحث عن img
  var img = target.querySelector('img');
  if (img && img.src) {
    try {
      var link = document.createElement('a');
      link.href = img.src;
      link.download = escapeHtml(name) + '_QR_' + new Date().getTime() + '.png';
      link.click();
      return;
    } catch(e) {
      console.warn('Image download failed:', e);
    }
  }

  // إذا فشل كل شيء، نحاول SVG
  var svg = target.querySelector('svg');
  if (svg) {
    try {
      var svgData = new XMLSerializer().serializeToString(svg);
      var blob = new Blob([svgData], { type: 'image/svg+xml' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = escapeHtml(name) + '_QR_' + new Date().getTime() + '.svg';
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    } catch(e) {
      console.warn('SVG download failed:', e);
    }
  }

  alert(currentLang === 'ar' ? 'فشل في تحميل الباركود. تأكد من توليد الباركود بشكل صحيح.' : 'Failed to download QR code. Please ensure QR code was generated correctly.');
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
