// ---------- Direct QR Export (تصدير مباشر بضغطة واحدة) ----------
function directExportQR(equipId) {
  if (!equipId) return;
  dbGetAll('equipment').then(function(list) {
    var rawIdStr = String(equipId).trim();
    var eq = list.find(function(x) {
      return sameId(x.id, rawIdStr) || sameId(x.uniqueId, rawIdStr);
    });
    if (!eq || !eq.uniqueId) {
      alert(currentLang === 'ar' ? 'الجهاز غير موجود' : 'Device not found');
      return;
    }

    // توليد QR مؤقت
    var tmp = document.createElement('div');
    tmp.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.body.appendChild(tmp);
    try {
      new QRCode(tmp, { text: eq.uniqueId, width: 300, height: 300, colorDark: '#0f766e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    } catch(e) {
      document.body.removeChild(tmp);
      alert(currentLang === 'ar' ? 'خطأ في توليد الباركود' : 'QR generation error');
      return;
    }

    // انتظار توليد الصورة ثم تصديرها
    setTimeout(function() {
      var qrSrc = '';
      var canvas = tmp.querySelector('canvas');
      if (canvas) {
        try { qrSrc = canvas.toDataURL('image/png'); } catch(e) { console.error('Canvas toDataURL failed:', e); }
      }
      if (!qrSrc) {
        var img = tmp.querySelector('img');
        if (img && img.src && img.src.indexOf('data:image') === 0) {
          qrSrc = img.src;
        }
      }
      document.body.removeChild(tmp);

      if (!qrSrc) {
        alert(currentLang === 'ar' ? 'فشل في توليد الباركود' : 'QR generation failed');
        return;
      }

      // رسم ستيكر بدقة 300 DPI
      var qrImg = new Image();
      qrImg.onload = function() {
        var DPI = 300;
        var MM = DPI / 25.4;
        // ستيكر 60mm × 40mm
        var sw = Math.round(60 * MM);
        var sh = Math.round(40 * MM);
        var pad = Math.round(3 * MM);

        var c = document.createElement('canvas');
        c.width = sw;
        c.height = sh;
        var ctx = c.getContext('2d');

        // خلفية بيضاء + إطار
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sw, sh);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 3;
        ctx.strokeRect(1, 1, sw - 2, sh - 2);

        // رسم الباركود
        var qrSize = sh - pad * 2;
        ctx.drawImage(qrImg, pad, pad, qrSize, qrSize);

        // النص
        var labelX = pad + qrSize + pad;
        var labelW = sw - qrSize - pad * 3;
        var cx = labelX + labelW / 2;

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.round(12 * MM / 3) + 'px system-ui, Arial, sans-serif';
        _wrapText(ctx, eq.uniqueId, cx, sh * 0.35, labelW, Math.round(4 * MM));

        ctx.fillStyle = '#333333';
        ctx.font = Math.round(10 * MM / 3) + 'px system-ui, Arial, sans-serif';
        _wrapText(ctx, eq.name, cx, sh * 0.7, labelW, Math.round(3.5 * MM));

        // تحميل
        var link = document.createElement('a');
        link.href = c.toDataURL('image/png');
        link.download = (eq.name || 'QR') + '_barcode.png';
        link.click();

        alert(currentLang === 'ar'
          ? '✅ تم تصدير الباركود!\nافتح الصورة واطبعها بالحجم الفعلي (100%)'
          : '✅ QR exported!\nOpen the image and print at actual size (100%)');
      };
      qrImg.src = qrSrc;
      if (qrImg.complete && qrImg.naturalWidth > 0) qrImg.onload();
    }, 500);
  });
}

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
    
    html += '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">';
    window._currentPrintEq = { name: eq.name, id: eq.uniqueId };
    html += '<button class="btn btn-primary" style="flex:1;min-width:120px;" onclick="printQR()"><i class="fas fa-file-image"></i> ' + (currentLang === 'ar' ? 'تصدير صورة للطباعة' : 'Export Print Image') + '</button>';
    html += '<button class="btn btn-outline" style="flex:1;min-width:120px;" onclick="exportQRSticker()"><i class="fas fa-download"></i> ' + t('qrExport') + '</button>';
    html += '<button class="btn btn-outline" style="min-width:100px;" onclick="downloadQR(\'' + escapeHtml(eq.name).replace(/'/g, "\\'") + '\')"><i class="fas fa-image"></i> ' + t('qrDownload') + '</button>';
    html += '<br><button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="printDeviceCard()"><i class="fas fa-id-card"></i> ' + (currentLang === 'ar' ? 'بطاقة الجهاز' : 'Device Card') + '</button>';
    html += '</div>';

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
  var count = (type === 'grid') ? parseInt(document.getElementById('sticker-count').value) || 1 : 1;

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
    alert(currentLang === 'ar' ? 'جاري تجهيز الباركود' : 'Preparing QR code');
    return;
  }

  closeQRModal();

  var img = new Image();
  img.onload = function() {
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';

    if (type === 'grid') {
      var cols = 4;
      var rows = Math.ceil(count / cols);
      var sw = 280, sh = 175, gap = 12, pad = 24;
      c.width = pad * 2 + cols * sw + (cols - 1) * gap;
      c.height = pad * 2 + rows * sh + (rows - 1) * gap;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 0.5;

      for (var i = 0; i < count; i++) {
        var col = i % cols;
        var row = Math.floor(i / cols);
        var x = pad + col * (sw + gap);
        var y = pad + row * (sh + gap);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, sw, sh);
        ctx.strokeRect(x, y, sw, sh);

        var qrSize = sh - 16;
        var qrX = x + 8;
        var qrY = y + 8;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var labelX = x + qrSize + 12;
        var labelW = sw - qrSize - 20;
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(t('qrStickerLabel') + eqId, labelX + labelW / 2, y + sh * 0.35);
        ctx.fillStyle = '#333333';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(eqName, labelX + labelW / 2, y + sh * 0.65);
      }
    } else {
      c.width = 900; c.height = 600;
      ctx.fillRect(0, 0, c.width, c.height);
      var padL = 40, qrSize = 380;
      ctx.drawImage(img, padL, (c.height - qrSize) / 2, qrSize, qrSize);
      var lx = padL + qrSize + padL, lw = c.width - lx - padL, cx = lx + lw / 2;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillText(t('qrStickerLabel') + eqId, cx, c.height / 2 - 20);
      ctx.fillStyle = '#333333';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText(eqName, cx, c.height / 2 + 30);
    }

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

function printQR() {
  if (!window._currentPrintEq) {
    alert(t('alertDeviceNotFound'));
    return;
  }

  var eqName = window._currentPrintEq.name;
  var eqId = window._currentPrintEq.id;
  var type = document.getElementById('print-type').value;
  var count = (type === 'grid') ? parseInt(document.getElementById('sticker-count').value) || 1 : 1;

  var targetDiv = document.getElementById('qr-print-target');
  if (!targetDiv) {
    alert(currentLang === 'ar' ? 'لم يتم العثور على عنصر الباركود' : 'QR element not found');
    return;
  }

  var qrSrc = '';
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
    alert(currentLang === 'ar' ? 'جاري تجهيز الباركود' : 'Preparing QR code');
    return;
  }

  // === تصدير صورة بقياسات الطباعة الدقيقة (300 DPI) ===
  // 300 DPI: 1mm = 11.811 pixels
  var DPI = 300;
  var MM_TO_PX = DPI / 25.4;

  var img = new Image();
  img.onload = function() {
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');

    if (type === 'grid') {
      // صفحة A4: 210mm × 297mm
      var pageW = Math.round(210 * MM_TO_PX);
      var pageH = Math.round(297 * MM_TO_PX);
      var pad = Math.round(8 * MM_TO_PX);
      var gap = Math.round(4 * MM_TO_PX);
      var sw = Math.round(40 * MM_TO_PX);   // عرض الستيكر 40mm
      var sh = Math.round(25 * MM_TO_PX);   // ارتفاع الستيكر 25mm
      var cols = Math.floor((pageW - pad * 2 + gap) / (sw + gap));
      var rows = Math.ceil(count / cols);
      var totalH = pad * 2 + rows * sh + (rows - 1) * gap;

      c.width = pageW;
      c.height = Math.max(totalH, pageH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);

      for (var i = 0; i < count; i++) {
        var col = i % cols;
        var row = Math.floor(i / cols);
        var x = pad + col * (sw + gap);
        var y = pad + row * (sh + gap);

        // إطار الستيكر
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, sw, sh);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, sw, sh);

        // رسم الباركود
        var qrPad = Math.round(2 * MM_TO_PX);
        var qrSize = sh - qrPad * 2;
        ctx.drawImage(img, x + qrPad, y + qrPad, qrSize, qrSize);

        // النص
        var labelX = x + qrPad + qrSize + qrPad;
        var labelW = sw - qrSize - qrPad * 3;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.round(8 * MM_TO_PX / 3) + 'px system-ui, Arial, sans-serif';
        _wrapText(ctx, t('qrStickerLabel') + eqId, labelX + labelW / 2, y + sh * 0.35, labelW, Math.round(3 * MM_TO_PX));
        ctx.fillStyle = '#333333';
        ctx.font = Math.round(5 * MM_TO_PX / 3) + 'px system-ui, Arial, sans-serif';
        _wrapText(ctx, eqName, labelX + labelW / 2, y + sh * 0.7, labelW, Math.round(2.5 * MM_TO_PX));
      }
    } else {
      // ستيكر مفرد: 60mm × 40mm
      var sw = Math.round(60 * MM_TO_PX);
      var sh = Math.round(40 * MM_TO_PX);
      var pad = Math.round(3 * MM_TO_PX);

      c.width = sw;
      c.height = sh;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sw, sh);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, sw - 2, sh - 2);

      // رسم الباركود
      var qrSize = sh - pad * 2;
      ctx.drawImage(img, pad, pad, qrSize, qrSize);

      // النص
      var labelX = pad + qrSize + pad;
      var labelW = sw - qrSize - pad * 3;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(12 * MM_TO_PX / 3) + 'px system-ui, Arial, sans-serif';
      _wrapText(ctx, t('qrStickerLabel') + eqId, labelX + labelW / 2, sh * 0.35, labelW, Math.round(4 * MM_TO_PX));
      ctx.fillStyle = '#333333';
      ctx.font = Math.round(8 * MM_TO_PX / 3) + 'px system-ui, Arial, sans-serif';
      _wrapText(ctx, eqName, labelX + labelW / 2, sh * 0.7, labelW, Math.round(3 * MM_TO_PX));
    }

    // تحميل الصورة
    var link = document.createElement('a');
    link.href = c.toDataURL('image/png');
    var suffix = type === 'grid' ? '_grid_' + count : '_sticker';
    link.download = (eqName || 'QR') + suffix + '_print.png';
    link.click();

    // رسالة نجاح
    var msg = currentLang === 'ar'
      ? '✅ تم تصدير صورة جاهزة للطباعة!\nافتح الصورة واطبعها بالحجم الفعلي (100%)'
      : '✅ Print-ready image exported!\nOpen the image and print at actual size (100%)';
    alert(msg);
  };

  img.onerror = function() {
    alert(currentLang === 'ar' ? 'فشل في تجهيز صورة الطباعة' : 'Failed to prepare print image');
  };
  img.src = qrSrc;
  if (img.complete && img.naturalWidth > 0) img.onload();
}

// دالة مساعدة لتقسيم النص الطويل على أسطر
function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  var words = text.split('');
  var line = '';
  var lines = [];
  for (var i = 0; i < words.length; i++) {
    var testLine = line + words[i];
    if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = words[i];
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  var startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (var j = 0; j < lines.length; j++) {
    ctx.fillText(lines[j], x, startY + j * lineHeight);
  }
}

function printDeviceCard() {
  if (!window._currentPrintEq) {
    alert(t('alertDeviceNotFound'));
    return;
  }
  var eqName = window._currentPrintEq.name;
  var eqId = window._currentPrintEq.id;

  // Fetch full equipment data
  dbGetAll('equipment').then(function(list) {
    var eq = list.find(function(x) { return sameId(x.uniqueId, eqId) || sameId(x.id, eqId); });
    if (!eq) { alert(t('alertDeviceNotFound')); return; }

    var qrSrc = '';
    var targetDiv = document.getElementById('qr-print-target');
    if (targetDiv) {
      var c = targetDiv.querySelector('canvas');
      if (c) try { qrSrc = c.toDataURL('image/png'); } catch(e) {}
      if (!qrSrc) { var im = targetDiv.querySelector('img'); if (im && im.src) qrSrc = im.src; }
    }
    if (!qrSrc) {
      // Generate QR on the fly
      var tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;left:-9999px;top:0';
      document.body.appendChild(tmp);
      try {
        new QRCode(tmp, { text: eq.uniqueId, width: 200, height: 200 });
        var qc = tmp.querySelector('canvas');
        if (qc) qrSrc = qc.toDataURL('image/png');
      } catch(e) {}
      document.body.removeChild(tmp);
    }

    var dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    var estVal = eq.estimatedValue ? formatCurrency(eq.estimatedValue) : '-';
    var purchaseDate = eq.purchaseDate ? new Date(eq.purchaseDate).toLocaleDateString('ar-SA') : '-';
    var ageStr = '-';
    if (eq.purchaseDate) {
      var diff = Date.now() - new Date(eq.purchaseDate).getTime();
      var days = Math.floor(diff / 86400000);
      var y = Math.floor(days / 365);
      var m = Math.floor((days % 365) / 30);
      ageStr = (y > 0 ? y + ' سنة ' : '') + (m > 0 ? m + ' شهر' : '') + (y === 0 && m === 0 ? days + ' يوم' : '');
    }
    var maintCount = eq.maintenanceHistory ? eq.maintenanceHistory.length : 0;
    var notes = eq.notes || '-';

    var html = '<!doctype html><html dir="' + dir + '"><head><meta charset="utf-8"><title>' + escapeHtml(eqName) + '</title><style>' +
      'body{font-family:system-ui,sans-serif;margin:0;padding:20px;color:#1e293b;direction:' + dir + '}' +
      '.header{background:linear-gradient(135deg,#0f766e,#0d9488);color:white;padding:24px;border-radius:16px;text-align:center;margin-bottom:20px}' +
      '.header h1{margin:0;font-size:1.6rem}.header p{margin:4px 0 0;opacity:0.8;font-size:0.9rem}' +
      '.card{background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e2e8f0}' +
      '.card h3{color:#0f766e;margin:0 0 12px;font-size:1rem}' +
      '.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:0.85rem}' +
      '.row:last-child{border:none}.label{color:#64748b}.value{font-weight:600}' +
      '.qr-section{text-align:center;background:white;padding:20px;border-radius:12px;border:2px dashed #e2e8f0;margin-bottom:16px}' +
      '.qr-section img{width:180px;height:180px}' +
      'table{width:100%;border-collapse:collapse;font-size:0.82rem}' +
      'th{background:#0f766e;color:white;padding:8px;text-align:' + (dir === 'rtl' ? 'right' : 'left') + '}' +
      'td{padding:8px;border-bottom:1px solid #f1f5f9}' +
      '@media print{body{padding:10px} .no-print{display:none}}' +
      '</style></head><body>' +
      '<div class="header"><h1>' + escapeHtml(eqName) + '</h1><p>' + t('qrBarcode') + ': ' + escapeHtml(eq.uniqueId || eq.id) + '</p></div>' +
      '<div class="qr-section">' + (qrSrc ? '<img src="' + qrSrc + '" alt="QR">' : '<p style="color:#94a3b8">QR code</p>') + '<p style="font-weight:700;font-size:1.1rem;margin:8px 0 0">' + escapeHtml(eq.uniqueId) + '</p></div>' +
      '<div class="card"><h3><i class="fas fa-info-circle"></i> ' + t('equipData') + '</h3>' +
      '<div class="row"><span class="label">' + t('location') + '</span><span class="value">' + escapeHtml(eq.location) + '</span></div>' +
      '<div class="row"><span class="label">' + t('estimatedValue') + '</span><span class="value">' + estVal + '</span></div>' +
      '<div class="row"><span class="label">' + t('purchaseDate') + '</span><span class="value">' + purchaseDate + '</span></div>' +
      '<div class="row"><span class="label">' + t('equipAge') + '</span><span class="value">' + ageStr + '</span></div>' +
      '<div class="row"><span class="label">' + t('totalMaintenance') + '</span><span class="value">' + maintCount + '</span></div>' +
      '<div class="row"><span class="label">' + t('equipNotes') + '</span><span class="value">' + escapeHtml(notes) + '</span></div></div>';

    if (eq.maintenanceHistory && eq.maintenanceHistory.length > 0) {
      html += '<div class="card"><h3><i class="fas fa-wrench"></i> ' + t('maintHistory') + '</h3><table><tr><th>#</th><th>' + t('maintDate') + '</th><th>' + t('maintDesc') + '</th><th>' + t('techName') + '</th></tr>';
      for (var i = 0; i < eq.maintenanceHistory.length; i++) {
        var m = eq.maintenanceHistory[i];
        html += '<tr><td>' + (i + 1) + '</td><td>' + (m.date ? new Date(m.date).toLocaleDateString('ar-SA') : '-') + '</td><td>' + escapeHtml(m.desc || '-') + '</td><td>' + escapeHtml(m.technician || '-') + '</td></tr>';
      }
      html += '</table></div>';
    }

    html += '<div style="text-align:center;margin-top:12px"><button class="no-print" onclick="window.print()" style="padding:10px 24px;background:#0f766e;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer"><i class="fas fa-print"></i> ' + t('qrPrint') + '</button></div>';
    html += '</body></html>';

    var win = window.open('', '_blank');
    if (!win) { alert(currentLang === 'ar' ? 'الرجاء السماح للنوافذ المنبثقة' : 'Please allow popups'); return; }
    win.document.write(html);
    win.document.close();
  });
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

// دالة مساعدة لتقسيم النص الطويل على أسطر
function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  var words = String(text).split('');
  var line = '';
  var lines = [];
  for (var i = 0; i < words.length; i++) {
    var testLine = line + words[i];
    if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = words[i];
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  var startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (var j = 0; j < lines.length; j++) {
    ctx.fillText(lines[j], x, startY + j * lineHeight);
  }
}
