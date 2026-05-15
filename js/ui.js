// ---------- Search & Equipment Detail ----------
function searchEquipment() {
  var term = document.getElementById('search-eq').value.toLowerCase();
  dbGetAll('equipment').then(function(list) {
    var filtered = list.filter(function(e) {
      return (e.name && e.name.toLowerCase().includes(term)) || (e.uniqueId && e.uniqueId.toLowerCase().includes(term)) || (e.location && e.location.toLowerCase().includes(term));
    });
    var html = '';
    filtered.forEach(function(e) {
      html += '<div class="list-item-glass" onclick="showEquipmentDetailById(' + JSON.stringify(String(e.id)) + ')" style="cursor:pointer;">';
      html += '<div><strong>' + escapeHtml(e.name) + '</strong> <span style="color:var(--text-muted);font-size:0.8rem">(' + escapeHtml(e.uniqueId || '') + ')</span><br><span style="font-size:0.8rem">' + escapeHtml(e.location) + '</span></div>';
      html += '</div>';
    });
    document.getElementById('equipment-list').innerHTML = html;
  });
}

function showEquipmentDetail(eq) {
  var history = eq.maintenanceHistory || [];
  var totalCost = history.reduce(function(sum, r) { return sum + (parseFloat(r.cost) || 0); }, 0);
  var estValue = parseFloat(eq.estimatedValue) || 0;
  var ratio = estValue > 0 ? (totalCost / estValue) * 100 : 0;
  var effClass = 'efficiency-good', effText = t('effExcellent'), effIcon = 'fa-check-circle';
  if (ratio > 80) { effClass = 'efficiency-bad'; effText = t('effBad'); effIcon = 'fa-times-circle'; }
  else if (ratio > 50) { effClass = 'efficiency-warn'; effText = t('effWarn'); effIcon = 'fa-exclamation-triangle'; }
  else if (estValue === 0) { effClass = ''; effText = t('notSetValue'); effIcon = 'fa-info-circle'; }

  var isArchived = eq.status === 'archived';

  var html = '<div class="flex-between"><h3><i class="fas fa-microchip"></i> ' + t('equipData') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button></div>';

  html += '<div class="detail-header">';
  html += '<div id="eq-detail-qr" class="qr-small"></div>';
  html += '<div><h2 style="font-size:1.3rem;margin-bottom:4px;">' + escapeHtml(eq.name) + (isArchived ? ' <span class="badge-modern" style="background:var(--warning);color:white">مؤرشف</span>' : '') + '</h2><div style="font-family:monospace;background:var(--primary-glow);padding:4px 8px;border-radius:4px;display:inline-block;color:var(--primary);font-weight:bold;letter-spacing:1px;">' + escapeHtml(eq.uniqueId) + '</div></div>';
  html += '<div style="margin-left:auto;text-align:center;"><button onclick=\'directExportQR(' + JSON.stringify(String(eq.id)) + ')\' class="btn btn-primary" style="gap:6px;"><i class="fas fa-file-image"></i> ' + (currentLang === 'ar' ? 'تصدير باركود' : 'Export QR') + '</button></div>';
  html += '</div>';

  html += '<div class="detail-info-grid">';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-map-marker-alt"></i> ' + t('location') + '</span><span class="value">' + escapeHtml(eq.location) + '</span></div>';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-money-bill-wave"></i> ' + t('estimatedValue') + '</span><span class="value">' + formatCurrency(estValue) + '</span></div>';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-wrench"></i> ' + t('totalMaintenance') + '</span><span class="value">' + history.length + ' ' + t('operations') + '</span></div>';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-calendar-alt"></i> ' + t('nextMaintenance') + '</span><span class="value">' + (eq.next ? formatDate(eq.next) : t('notSet')) + '</span></div>';
  // Purchase date & age
  if (eq.purchaseDate) {
    var purchD = new Date(eq.purchaseDate);
    var now = new Date();
    var diffMs = now - purchD;
    var diffDays = Math.floor(diffMs / 86400000);
    var ageYears = Math.floor(diffDays / 365);
    var ageMonths = Math.floor((diffDays % 365) / 30);
    var ageStr = '';
    if (ageYears > 0) ageStr += ageYears + ' سنة ';
    if (ageMonths > 0) ageStr += ageMonths + ' شهر';
    if (!ageStr) ageStr = diffDays + ' يوم';
    html += '<div class="detail-info-item"><span class="label"><i class="fas fa-shopping-cart"></i> تاريخ الشراء</span><span class="value">' + formatDate(eq.purchaseDate) + '</span></div>';
    html += '<div class="detail-info-item"><span class="label"><i class="fas fa-hourglass-half"></i> العمر الافتراضي</span><span class="value" style="color:var(--primary);font-weight:700">' + ageStr + '</span></div>';
  }
  html += '<div class="detail-info-item" style="grid-column: span 2"><span class="label"><i class="fas fa-wallet"></i> ' + t('totalCost') + ' / ' + t('maintRatio') + '</span><span class="value" style="color:var(--danger)">' + formatCurrency(totalCost) + ' (' + ratio.toFixed(1) + '%)</span></div>';
  if (eq.notes) {
    html += '<div class="detail-info-item" style="grid-column: span 2"><span class="label"><i class="fas fa-sticky-note"></i> ' + t('equipNotes') + '</span><span class="value">' + escapeHtml(eq.notes) + '</span></div>';
  }
  html += '</div>';

  html += '<div class="efficiency-meter ' + effClass + '"><i class="fas ' + effIcon + ' fa-2x" style="opacity:0.8"></i><div><strong style="display:block;font-size:0.85rem">' + t('maintRatio') + '</strong><span style="font-size:0.75rem">' + effText + '</span></div></div>';

  html += '<div class="flex-between" style="margin-top:1.5rem;margin-bottom:1rem"><h4><i class="fas fa-history"></i> ' + t('maintHistory') + '</h4>';
  if (!isArchived) html += '<button class="btn btn-outline" onclick="addMaintenanceRecord(' + JSON.stringify(String(eq.id)) + ')"><i class="fas fa-plus"></i> ' + t('addMaintRecord') + '</button>';
  html += '</div>';

  if (history.length === 0) {
    html += '<div class="empty-state" style="padding:1rem"><i class="fas fa-clipboard" style="font-size:2rem"></i><p>' + t('noMaintHistory') + '</p></div>';
  } else {
    html += '<div class="timeline">';
    history.sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).forEach(function(r) {
      var legacyId = 'legacy|' + (r.date || '') + '|' + encodeURIComponent(r.description || '');
      var recordIdParam = r.id ? JSON.stringify(r.id) : JSON.stringify(legacyId);
      html += '<div class="timeline-item" onclick="editMaintenanceRecord(' + JSON.stringify(String(eq.id)) + ', ' + recordIdParam + ')" style="cursor:pointer">';
      html += '<span class="date">' + formatDate(r.date) + (r.technician ? ' • <i class="fas fa-user-tools"></i> ' + escapeHtml(r.technician) : '') + ' • <i class="fas fa-info-circle"></i> ' + t(r.status === 'open' ? 'statusOpen' : r.status === 'in-progress' ? 'statusInProgress' : 'statusResolved') + '</span>';
      html += '<div class="flex-between"><span class="desc">' + escapeHtml(r.description) + '</span>';
      if (r.cost > 0) html += '<span class="cost">' + formatCurrency(r.cost) + '</span>';
      html += '</div></div>';
    });
    html += '</div>';
  }

  var modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = html;
  document.getElementById('universal-modal').style.display = 'flex';

  setTimeout(function() {
    new QRCode(document.getElementById('eq-detail-qr'), {
      text: eq.uniqueId,
      width: 72,
      height: 72,
      colorDark : '#0f766e',
      colorLight : '#ffffff',
      correctLevel : QRCode.CorrectLevel.L
    });
  }, 10);
}

// ---------- App Render ----------
var App = {
  refresh: function() {
    if (!currentMosque && mosqueConfig.mosques.length === 0) {
      return Promise.resolve();
    }
    return Promise.all([
      dbGetAll('tasks'), dbGetAll('issues'), dbGetAll('finances'), dbGetAll('equipment')
    ]).then(function(results) {
      App.renderTasks(results[0]);
      App.renderIssues(results[1]);
      App.renderFinances(results[2]);
      App.renderEquipment(results[3]);
      App.renderDashboard(results[0], results[1], results[2], results[3]);
      App.renderReports(results[1], results[2], results[3]);
    });
  },
  renderTasks: function(tasks) {
    var today = new Date().toISOString().slice(0, 10);
    var filtered = tasks.filter(function(taskItem) { return taskItem.date === today; });
    var html = '';
    if (filtered.length === 0) {
      html = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>' + t('emptyTasks') + '</p></div>';
    } else {
      filtered.forEach(function(taskItem) {
        var priorityColor = taskItem.priority === 'high' ? 'var(--danger)' : taskItem.priority === 'low' ? 'var(--info)' : 'var(--warning)';
        html += '<div class="list-item-glass" style="border-right-color: ' + priorityColor + '">';
        html += '<div style="display:flex;align-items:center;gap:12px;">';
        html += '<input type="checkbox" ' + (taskItem.completed ? 'checked' : '') + ' onchange="toggleTaskComplete(\'' + taskItem.id + '\', this.checked)" style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer;margin:0">';
        html += '<div style="' + (taskItem.completed ? 'text-decoration:line-through;opacity:0.6' : '') + '"><strong>' + escapeHtml(taskItem.title) + '</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">' + (taskItem.period === 'morning' ? t('taskMorning') : taskItem.period === 'afternoon' ? t('taskAfternoon') : t('taskEvening')) + '</span></div>';
        html += '</div>';
        html += '<div><button onclick="openModal(\'task\', \'' + taskItem.id + '\')" class="btn btn-outline"><i class="fas fa-edit"></i></button> ';
        html += '<button onclick="deleteItem(\'tasks\', \'' + taskItem.id + '\')" class="btn btn-danger"><i class="fas fa-trash"></i></button></div>';
        html += '</div>';
      });
    }
    document.getElementById('task-list').innerHTML = html;
  },
  renderIssues: function(issues) {
    var html = '';
    // Filter bar
    var currentFilter = window._issueFilter || 'open';
    html += '<div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap;">';
    html += '<button onclick="setIssueFilter(\'open\')" class="btn ' + (currentFilter === 'open' ? 'btn-danger' : 'btn-outline') + '" style="font-size:0.8rem;padding:6px 12px"><i class="fas fa-exclamation-circle"></i> ' + t('issuePending') + ' (' + issues.filter(function(i){return i.status !== 'resolved' && !i.archived;}).length + ')</button>';
    html += '<button onclick="setIssueFilter(\'resolved\')" class="btn ' + (currentFilter === 'resolved' ? 'btn-success' : 'btn-outline') + '" style="font-size:0.8rem;padding:6px 12px"><i class="fas fa-check-circle"></i> ' + t('statusResolved') + ' (' + issues.filter(function(i){return i.status === 'resolved' && !i.archived;}).length + ')</button>';
    html += '<button onclick="setIssueFilter(\'archived\')" class="btn ' + (currentFilter === 'archived' ? '' : 'btn-outline') + '" style="font-size:0.8rem;padding:6px 12px;' + (currentFilter === 'archived' ? 'background:var(--text-muted);color:white;' : '') + '"><i class="fas fa-archive"></i> ' + t('archivedEq') + ' (' + issues.filter(function(i){return i.archived;}).length + ')</button>';
    html += '</div>';

    var filtered = issues.filter(function(i) {
      if (currentFilter === 'open') return i.status !== 'resolved' && !i.archived;
      if (currentFilter === 'resolved') return i.status === 'resolved' && !i.archived;
      if (currentFilter === 'archived') return !!i.archived;
      return true;
    });

    if (filtered.length === 0) {
      html += '<div class="empty-state"><i class="fas fa-tools"></i><p>' + t('emptyIssues') + '</p></div>';
    } else {
      filtered.forEach(function(i) {
        var isResolved = i.status === 'resolved';
        var borderColor = i.archived ? 'var(--text-muted)' : (isResolved ? 'var(--success)' : 'var(--danger)');
        html += '<div class="list-item-glass" style="border-right-color: ' + borderColor + '">';
        html += '<div>';
        if (i.archived) {
          html += '<span class="badge-modern" style="background:#f1f5f9;color:var(--text-muted);margin-bottom:8px;"><i class="fas fa-archive"></i> ' + t('archivedEq') + '</span>';
        } else if (isResolved) {
          html += '<span class="badge-modern" style="background:#f0fdf4;color:var(--success);margin-bottom:8px;"><i class="fas fa-check-circle"></i> ' + t('statusResolved') + '</span>';
          if (i.resolvedAt) html += '<span style="font-size:0.75rem;color:var(--text-muted);margin-right:8px;">' + formatDate(i.resolvedAt) + '</span>';
        } else {
          html += '<span class="badge-modern" style="background:#fef2f2;color:var(--danger);margin-bottom:8px;">' + t('issuePending') + '</span>';
        }
        html += '<strong>' + escapeHtml(i.location) + (i.equipment ? ' - ' + escapeHtml(i.equipment) : '') + '</strong><br><span style="font-size:0.85rem">' + escapeHtml(i.desc) + '</span>';
        if (i.technician) {
          html += '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;"><i class="fas fa-user-cog"></i> ' + escapeHtml(i.technician) + (i.techPhone ? ' (' + escapeHtml(i.techPhone) + ')' : '') + (i.cost > 0 ? ' • <i class="fas fa-coins"></i> ' + formatCurrency(i.cost) : '') + '</div>';
        }
        html += '</div>';
        html += '<div style="display:flex;gap:8px;flex-direction:column;align-items:flex-end;">';
        if (!isResolved && !i.archived) {
          html += '<button onclick="promptResolveIssue(\'' + i.id + '\')" class="btn btn-success" style="font-size:0.8rem;padding:6px 10px"><i class="fas fa-check"></i> ' + t('issueResolved') + '</button>';
          html += '<button onclick="openModal(\'issue\', \'' + i.id + '\')" class="btn btn-outline" style="font-size:0.8rem;padding:6px 10px"><i class="fas fa-edit"></i></button>';
        }
        if (isResolved && !i.archived) {
          html += '<button onclick="archiveIssue(\'' + i.id + '\')" class="btn btn-outline" style="font-size:0.8rem;padding:6px 10px;color:var(--text-muted)"><i class="fas fa-archive"></i></button>';
        }
        html += '</div></div>';
      });
    }
    document.getElementById('issue-list').innerHTML = html;
  },
  renderFinances: function(finances) {
    var sorted = finances.sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 50);
    var html = '';
    if (sorted.length === 0) {
      html = '<div class="empty-state"><i class="fas fa-wallet"></i><p>' + t('emptyTransactions') + '</p></div>';
    } else {
      sorted.forEach(function(f) {
        var isInc = f.type === 'donation';
        html += '<div class="list-item-glass" style="border-right-color: ' + (isInc ? 'var(--success)' : 'var(--danger)') + '">';
        html += '<div><strong>' + escapeHtml(f.desc || f.name) + '</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">' + formatDate(f.date) + (f.category ? ' - ' + escapeHtml(f.category) : '') + (f.autoGenerated ? ' <i class="fas fa-robot" title="Auto Generated"></i>' : '') + '</span></div>';
        html += '<div style="display:flex;align-items:center;gap:12px;"><span style="font-weight:700;color:' + (isInc ? 'var(--success)' : 'var(--danger)') + '">' + (isInc ? '+' : '-') + formatCurrency(f.amount) + '</span>';
        html += '<button onclick="deleteItem(\'finances\', \'' + f.id + '\')" class="btn btn-danger" style="padding:6px 10px"><i class="fas fa-trash"></i></button></div>';
        html += '</div>';
      });
    }
    document.getElementById('finance-list').innerHTML = html;
  },
  renderEquipment: function(equipment) {
    equipmentOptions = equipment.filter(function(e) { return e.status !== 'archived'; });
    var term = document.getElementById('search-eq').value.toLowerCase();
    var filtered = equipmentOptions.filter(function(e) {
      return (e.name && e.name.toLowerCase().includes(term)) || (e.uniqueId && e.uniqueId.toLowerCase().includes(term)) || (e.location && e.location.toLowerCase().includes(term));
    });
    var archived = equipment.filter(function(e) { return e.status === 'archived'; });
    var html = '';
    if (filtered.length === 0) {
      html = '<div class="empty-state"><i class="fas fa-server"></i><p>' + (equipmentOptions.length === 0 ? t('emptyDevices') : t('deviceNotFound')) + '</p></div>';
    } else {
      filtered.forEach(function(e) {
        var est = parseFloat(e.estimatedValue) || 0;
        html += '<div class="list-item-glass" onclick="showEquipmentDetailById(\'' + e.id + '\')" style="cursor:pointer;border-right-color:var(--primary-light)">';
        html += '<div><strong>' + escapeHtml(e.name) + '</strong> <span style="font-family:monospace;font-size:0.75rem;color:var(--primary);background:var(--primary-glow);padding:2px 6px;border-radius:4px;">' + escapeHtml(e.uniqueId || '') + '</span><br>';
        html += '<span style="font-size:0.8rem;color:var(--text-muted)"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(e.location) + ' | <i class="fas fa-wallet"></i> ' + formatCurrency(est) + '</span></div>';
        html += '<div><button onclick="event.stopPropagation(); openModal(\'equipment\', \'' + e.id + '\')" class="btn btn-outline" style="padding:6px 10px;margin-left:4px"><i class="fas fa-edit"></i></button>';
        html += '<button onclick="event.stopPropagation(); deleteItem(\'equipment\', \'' + e.id + '\')" class="btn btn-danger" style="padding:6px 10px"><i class="fas fa-archive"></i></button></div>';
        html += '</div>';
      });
    }
    document.getElementById('equipment-list').innerHTML = html;

    var archHtml = '';
    if (archived.length > 0) {
      archived.forEach(function(e) {
        archHtml += '<div class="list-item-glass" style="border-right-color:var(--text-muted); opacity:0.7">';
        archHtml += '<div><strong>' + escapeHtml(e.name) + '</strong> <span style="font-family:monospace;font-size:0.75rem;">' + escapeHtml(e.uniqueId || '') + '</span><br>';
        archHtml += '<span style="font-size:0.8rem;"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(e.location) + '</span></div>';
        archHtml += '<div><button onclick="deleteItem(\'equipment\', ' + JSON.stringify(String(e.id)) + ')" class="btn btn-outline" style="padding:6px 10px"><i class="fas fa-undo"></i> ' + t('reactivate') + '</button></div>';
        archHtml += '</div>';
      });
      document.getElementById('archived-equipment-list').innerHTML = archHtml;
      document.getElementById('archived-section').style.display = 'block';
    } else {
      document.getElementById('archived-section').style.display = 'none';
    }
  },
  renderDashboard: function(tasks, issues, finances, equipment) {
    var todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    var todayStr = todayDate.toISOString().slice(0, 10);

    var dashTasks = tasks.filter(function(t) { return t.date === todayStr && !t.completed; }).length;
    var dashIssues = issues.filter(function(i) { return i.status !== 'resolved'; }).length;
    
    document.getElementById('dash-tasks').textContent = dashTasks;
    document.getElementById('dash-issues').textContent = dashIssues;

    // Make dashboard cards clickable
    var taskCard = document.getElementById('dash-tasks').parentElement;
    var issueCard = document.getElementById('dash-issues').parentElement;
    var incomeCard = document.getElementById('dash-income').parentElement;
    var balanceCard = document.getElementById('dash-balance').parentElement;

    if (taskCard) taskCard.onclick = function() { switchTab('tasks'); };
    if (issueCard) issueCard.onclick = function() { switchTab('issues'); };
    if (incomeCard) incomeCard.onclick = function() { switchTab('finances'); };
    if (balanceCard) balanceCard.onclick = function() { switchTab('finances'); };

    var inc = 0, exp = 0;
    finances.forEach(function(f) {
      if (f.type === 'donation') inc += parseFloat(f.amount);
      else exp += parseFloat(f.amount);
    });
    document.getElementById('dash-income').textContent = formatCurrency(inc);
    document.getElementById('dash-balance').textContent = formatCurrency(inc - exp);
    var balEl = document.getElementById('dash-balance');
    balEl.style.color = (inc - exp) < 0 ? 'var(--danger)' : 'var(--text)';

    var actHtml = '';
    var recent = finances.slice(-3).reverse();
    if (recent.length === 0) actHtml = '<p style="color:var(--text-muted);text-align:center;font-size:0.85rem">' + t('noActivity') + '</p>';
    recent.forEach(function(f) {
      actHtml += '<div onclick="switchTab(\'finances\')" style="font-size:0.85rem;padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;cursor:pointer;transition:opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">';
      actHtml += '<span>' + escapeHtml(f.desc || f.name) + '</span>';
      actHtml += '<span style="color:' + (f.type === 'donation' ? 'var(--success)' : 'var(--danger)') + ';">' + (f.type === 'donation' ? '+' : '-') + formatCurrency(f.amount) + '</span></div>';
    });
    document.getElementById('dash-activity').innerHTML = actHtml;

    var upcHtml = '';
    var next7 = new Date(); next7.setDate(next7.getDate() + 7);
    var upcoming = equipment.filter(function(e) { return e.next && new Date(e.next) <= next7 && e.status !== 'archived'; });
    if (upcoming.length === 0) upcHtml = '<p style="color:var(--text-muted);text-align:center;font-size:0.85rem">' + t('noMaint') + '</p>';
    upcoming.sort(function(a, b) { return new Date(a.next) - new Date(b.next); }).forEach(function(e) {
      var mDate = new Date(e.next);
      mDate.setHours(0,0,0,0);
      var isOverdue = mDate < todayDate;
      var colorClass = isOverdue ? 'text-danger' : 'text-warning';
      var icon = isOverdue ? '<i class="fas fa-exclamation-circle"></i> ' : '';
      
      upcHtml += '<div onclick="switchTab(\'inventory\'); showEquipmentDetailById(\'' + e.id + '\')" style="font-size:0.85rem;padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;cursor:pointer;transition:opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">';
      upcHtml += '<span>' + icon + escapeHtml(e.name) + '</span>';
      upcHtml += '<span class="' + colorClass + '" style="font-weight:700">' + (isOverdue ? t('late') : formatDate(e.next)) + '</span></div>';
    });
    document.getElementById('dash-upcoming').innerHTML = upcHtml;

    // ---- Smart Stats ----
    var statsEl = document.getElementById('dash-smart-stats');
    if (statsEl) {
      var openIssues = issues.filter(function(i) { return i.status !== 'resolved' && !i.archived; });
      var overdueCount = upcoming.filter(function(e) { var d = new Date(e.next); d.setHours(0,0,0,0); return d < todayDate; }).length;

      // Most faulty device
      var deviceFaultMap = {};
      issues.forEach(function(i) {
        if (i.equipment) deviceFaultMap[i.equipment] = (deviceFaultMap[i.equipment] || 0) + 1;
      });
      var topDevice = Object.keys(deviceFaultMap).sort(function(a,b){return deviceFaultMap[b]-deviceFaultMap[a];})[0];

      // Most used technician
      var techMap = {};
      issues.forEach(function(i) {
        if (i.technician) techMap[i.technician] = (techMap[i.technician] || 0) + 1;
      });
      var topTech = Object.keys(techMap).sort(function(a,b){return techMap[b]-techMap[a];})[0];

      var sHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
      sHtml += '<div style="background:var(--glass-bg);border-radius:10px;padding:10px;border:1px solid var(--border);"><div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px;"><i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i> ' + t('dashIssues') + '</div><div style="font-size:1.4rem;font-weight:800;color:var(--danger)">' + openIssues.length + '</div></div>';
      sHtml += '<div style="background:var(--glass-bg);border-radius:10px;padding:10px;border:1px solid var(--border);"><div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px;"><i class="fas fa-clock" style="color:var(--warning)"></i> صيانة متأخرة</div><div style="font-size:1.4rem;font-weight:800;color:var(--warning)">' + overdueCount + '</div></div>';
      sHtml += '<div style="background:var(--glass-bg);border-radius:10px;padding:10px;border:1px solid var(--border);grid-column:span 2;"><div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px;"><i class="fas fa-microchip" style="color:var(--primary)"></i> أكثر جهاز عطلاً</div><div style="font-size:0.95rem;font-weight:700;color:var(--text)">' + (topDevice ? escapeHtml(topDevice) + ' <span style="font-size:0.75rem;color:var(--text-muted)">(' + deviceFaultMap[topDevice] + ' مرة)</span>' : '<span style="color:var(--text-muted);font-size:0.85rem">لا يوجد بيانات</span>') + '</div></div>';
      sHtml += '<div style="background:var(--glass-bg);border-radius:10px;padding:10px;border:1px solid var(--border);grid-column:span 2;"><div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px;"><i class="fas fa-user-cog" style="color:var(--success)"></i> أكثر فني استخداماً</div><div style="font-size:0.95rem;font-weight:700;color:var(--text)">' + (topTech ? escapeHtml(topTech) + ' <span style="font-size:0.75rem;color:var(--text-muted)">(' + techMap[topTech] + ' مرة)</span>' : '<span style="color:var(--text-muted);font-size:0.85rem">لا يوجد بيانات</span>') + '</div></div>';
      sHtml += '</div>';
      statsEl.innerHTML = sHtml;
    }
  },
  renderReports: function(issues, finances, equipment) {
    var inc = 0, exp = 0;
    finances.forEach(function(f) {
      if (f.type === 'donation') inc += parseFloat(f.amount);
      else exp += parseFloat(f.amount);
    });

    var ctx = document.getElementById('financeChart');
    if (ctx) {
      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: [t('incomeLabel'), t('expenseLabel')],
          datasets: [{ data: [inc, exp], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0, hoverOffset: 10 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text)' } } }, cutout: '75%' }
      });
    }

    var catExp = {};
    finances.forEach(function(f) {
      if (f.type === 'expense') {
        var cat = f.category || t('other');
        catExp[cat] = (catExp[cat] || 0) + parseFloat(f.amount);
      }
    });

    var cCtx = document.getElementById('categoryChart');
    if (cCtx) {
      if (categoryChartInstance) categoryChartInstance.destroy();
      categoryChartInstance = new Chart(cCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(catExp).map(function(k) { return t(k); }),
          datasets: [{ label: t('expenseLabel'), data: Object.values(catExp), backgroundColor: '#3b82f6', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
      });
    }

    var catHtml = '';
    if (exp > 0) {
      Object.keys(catExp).forEach(function(k) {
        var p = ((catExp[k] / exp) * 100).toFixed(1);
        catHtml += '<tr><td>' + t(k) + '</td><td>' + formatCurrency(catExp[k]) + '</td><td><span class="badge-modern" style="background:var(--primary-glow);color:var(--primary)">' + p + '%</span></td></tr>';
      });
    } else {
      catHtml = '<tr><td colspan="3" class="text-center" style="color:var(--text-muted)">' + t('emptyExpenses') + '</td></tr>';
    }
    document.getElementById('cat-table').innerHTML = catHtml;

    var eqHtml = '';
    var hasHighCost = false;
    equipment.forEach(function(e) {
      var history = e.maintenanceHistory || [];
      var totalCost = history.reduce(function(sum, r) { return sum + (parseFloat(r.cost) || 0); }, 0);
      var est = parseFloat(e.estimatedValue) || 0;
      if (est > 0 && (totalCost / est) > 0.5) {
        hasHighCost = true;
        var r = (totalCost / est) * 100;
        var alertClass = r > 80 ? 'alert-red' : 'alert-orange';
        var rec = r > 80 ? t('replaceUrgent') : t('replaceSoon');
        eqHtml += '<tr class="' + alertClass + '"><td>' + escapeHtml(e.name) + '</td><td>' + formatCurrency(est) + '</td><td>' + formatCurrency(totalCost) + '</td><td><strong>' + r.toFixed(1) + '%</strong></td><td>' + rec + '</td></tr>';
      }
    });
    if (!hasHighCost) eqHtml = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">' + t('emptyHighCost') + '</td></tr>';
    document.getElementById('eq-report-table').innerHTML = eqHtml;

    var techMap = {};
    equipment.forEach(function(e) {
      (e.maintenanceHistory || []).forEach(function(r) {
        if (r.technician && r.technician.trim() !== '') {
          var tName = r.technician.trim();
          if (!techMap[tName]) techMap[tName] = { count: 0, cost: 0, devices: new Set() };
          techMap[tName].count++;
          techMap[tName].cost += (parseFloat(r.cost) || 0);
          techMap[tName].devices.add(e.id);
        }
      });
    });
    var techHtml = '';
    var techKeys = Object.keys(techMap);
    if (techKeys.length > 0) {
      techKeys.sort(function(a, b) { return techMap[b].count - techMap[a].count; }).forEach(function(tName) {
        var d = techMap[tName];
        techHtml += '<tr><td>' + escapeHtml(tName) + '</td><td>' + d.count + '</td><td>' + d.devices.size + '</td><td>' + formatCurrency(d.cost) + '</td><td>' + (d.count / d.devices.size).toFixed(1) + '</td></tr>';
      });
    } else {
      techHtml = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">' + t('emptyTechData') + '</td></tr>';
    }
    document.getElementById('tech-table').innerHTML = techHtml;

    var monthData = Array(12).fill(0);
    issues.forEach(function(i) {
      var d = new Date(i.date || i.resolvedAt || Date.now());
      monthData[d.getMonth()]++;
    });

    var tCtx = document.getElementById('trendChart');
    if (tCtx) {
      if (trendChartInstance) trendChartInstance.destroy();
      trendChartInstance = new Chart(tCtx, {
        type: 'line',
        data: {
          labels: t('months'),
          datasets: [{ label: t('tabIssues'), data: monthData, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }

    document.getElementById('print-gen-date').textContent = formatDate(new Date());
    document.getElementById('print-issues-total').textContent = issues.length;
    document.getElementById('print-issues-resolved').textContent = issues.filter(function(i) { return i.status === 'resolved'; }).length;
    document.getElementById('print-equipment-count').textContent = equipment.length;
    document.getElementById('print-maint-cost').textContent = formatCurrency(exp);
  }
};

// ---------- Modal Forms ----------
function openModal(type, id) {
  var modal = document.getElementById('universal-modal');
  var content = document.getElementById('modal-content');
  var html = '';
  currentEdit = { type: type, id: id };
  var isEdit = !!id;
  var title = isEdit ? t('edit') : t('add');

  if (type === 'task') {
    html = '<div class="flex-between"><h3><i class="fas fa-tasks"></i> ' + title + ' ' + t('task') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="task-title" placeholder="' + t('taskTitlePlaceholder') + '" required>';
    html += '<select id="task-priority"><option value="normal">' + t('priorityNormal') + '</option><option value="high">' + t('priorityHigh') + '</option><option value="low">' + t('priorityLow') + '</option></select>';
    html += '<select id="task-period"><option value="morning">' + t('taskMorning') + '</option><option value="afternoon">' + t('taskAfternoon') + '</option><option value="evening">' + t('taskEvening') + '</option></select>';
    html += '<textarea id="task-notes" placeholder="' + t('taskNotes') + '"></textarea>';
    html += '<button onclick="saveModal()" class="btn btn-primary btn-full">' + t('save') + '</button>';
  } else if (type === 'issue') {
    html = '<div class="flex-between"><h3><i class="fas fa-exclamation-triangle"></i> ' + title + ' ' + t('fault') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="issue-loc" placeholder="' + t('issueLocation') + ' (مثال: ' + t('mainPrayerHall') + ')" required>';
    html += '<select id="issue-eq"><option value="">' + t('selectEquip') + '</option>';
    equipmentOptions.forEach(function(e) { html += '<option value="' + e.id + '">' + escapeHtml(e.name) + ' - ' + escapeHtml(e.location) + '</option>'; });
    html += '</select>';
    html += '<textarea id="issue-desc" placeholder="' + t('issueDesc') + '" required></textarea>';
    html += '<div class="card-modern" style="background:rgba(0,0,0,0.03); padding:1rem; margin-bottom:1rem; border:1px dashed var(--border);">';
    html += '<label style="font-size:0.8rem; font-weight:700; margin-bottom:0.5rem; display:block;">' + t('techHistory') + '</label>';
    html += '<input id="issue-tech" placeholder="' + t('techName') + '" style="margin-bottom:8px;">';
    html += '<input id="issue-tech-phone" placeholder="' + t('techPhone') + '">';
    html += '</div>';
    html += '<button onclick="saveModal()" class="btn btn-primary btn-full">' + t('save') + '</button>';
  } else if (type === 'donation') {
    html = '<div class="flex-between"><h3><i class="fas fa-hand-holding-usd"></i> ' + title + ' ' + t('donation') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="donor-name" placeholder="' + t('donorName') + '">';
    html += '<input type="number" id="amount" placeholder="' + t('amount') + '" required min="1">';
    html += '<select id="purpose"><option value="general">' + t('general') + '</option><option value="maintenance">' + t('maintenance') + '</option></select>';
    html += '<button onclick="saveModal()" class="btn btn-success btn-full">' + t('save') + '</button>';
  } else if (type === 'expense') {
    html = '<div class="flex-between"><h3><i class="fas fa-file-invoice-dollar"></i> ' + title + ' ' + t('expense') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="expense-desc" placeholder="' + t('expenseDesc') + '" required>';
    html += '<input type="number" id="expense-amount" placeholder="' + t('amount') + '" required min="1">';
    html += '<select id="expense-cat"><option value="maintenance">' + t('maintenance') + '</option><option value="invoice">' + t('invoice') + '</option><option value="general">' + t('general') + '</option></select>';
    html += '<button onclick="saveModal()" class="btn btn-danger btn-full">' + t('save') + '</button>';
  } else if (type === 'equipment') {
    html = '<div class="flex-between"><h3><i class="fas fa-server"></i> ' + title + ' ' + t('device') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="equip-name" placeholder="' + t('equipName') + '" required>';
    html += '<input id="equip-location" placeholder="' + t('equipLocation') + ' (' + t('prayerHall') + '...)" required>';
    html += '<input type="number" id="equip-value" placeholder="' + t('equipValue') + '" min="0" step="0.01">';
    html += '<label style="display:block;margin-bottom:4px;font-size:0.8rem;color:var(--text-muted)"><i class="fas fa-shopping-cart"></i> تاريخ الشراء / الإضافة (اختياري)</label>';
    html += '<input type="date" id="equip-purchase">';
    html += '<label style="display:block;margin-bottom:4px;font-size:0.8rem;color:var(--text-muted)">' + t('equipNext') + '</label>';
    html += '<input type="date" id="equip-next">';
    html += '<textarea id="equip-notes" placeholder="' + t('equipNotes') + '"></textarea>';
    html += '<div id="equip-archived-msg" style="display:none;background:var(--warning);color:white;padding:8px;border-radius:4px;margin-bottom:12px;font-size:0.85rem;"><i class="fas fa-info-circle"></i> ' + t('equipArchivedNote') + '</div>';
    html += '<button id="equip-save-btn" onclick="saveModal()" class="btn btn-primary btn-full">' + t('save') + '</button>';
  }
  content.innerHTML = html;
  modal.style.display = 'flex';

  if (isEdit) {
    var store = type === 'task' ? 'tasks' : type === 'issue' ? 'issues' : type === 'equipment' ? 'equipment' : 'finances';
    dbGetAll(store).then(function(items) {
      var item = items.find(function(i) { return sameId(i.id, id); });
      if (!item) return;
      if (type === 'task') {
        document.getElementById('task-title').value = item.title;
        document.getElementById('task-priority').value = item.priority;
        document.getElementById('task-period').value = item.period;
        document.getElementById('task-notes').value = item.notes || '';
      } else if (type === 'issue') {
        document.getElementById('issue-loc').value = item.location;
        document.getElementById('issue-eq').value = item.equipmentId || '';
        document.getElementById('issue-desc').value = item.desc;
        document.getElementById('issue-tech').value = item.technician || '';
        document.getElementById('issue-tech-phone').value = item.techPhone || '';
      } else if (type === 'donation') {
        document.getElementById('donor-name').value = item.name || '';
        document.getElementById('amount').value = item.amount;
        document.getElementById('purpose').value = item.purpose;
      } else if (type === 'expense') {
        document.getElementById('expense-desc').value = item.desc;
        document.getElementById('expense-amount').value = item.amount;
        document.getElementById('expense-cat').value = item.category || 'maintenance';
      } else if (type === 'equipment') {
        document.getElementById('equip-name').value = item.name;
        document.getElementById('equip-location').value = item.location;
        document.getElementById('equip-value').value = item.estimatedValue || 0;
        document.getElementById('equip-purchase').value = item.purchaseDate || '';
        document.getElementById('equip-next').value = item.next || '';
        document.getElementById('equip-notes').value = item.notes || '';
        if (item.status === 'archived') {
          document.getElementById('equip-archived-msg').style.display = 'block';
          document.getElementById('equip-save-btn').innerHTML = '<i class="fas fa-undo"></i> ' + t('reactivateSave');
        }
      }
    });
  }
}

function closeModal() {
  document.getElementById('universal-modal').style.display = 'none';
  currentEdit = { type: null, id: null };
}

function saveModal() {
  var type = currentEdit.type;

  // Validation
  if (type === 'task') {
    if (!document.getElementById('task-title').value.trim()) { alert(t('errorEmptyFields')); return; }
  } else if (type === 'issue') {
    if (!document.getElementById('issue-loc').value.trim() || !document.getElementById('issue-desc').value.trim()) { alert(t('errorEmptyFields')); return; }
  } else if (type === 'donation' || type === 'expense') {
    var amt = parseFloat(document.getElementById(type === 'donation' ? 'amount' : 'expense-amount').value);
    if (isNaN(amt) || amt <= 0) { alert(t('errorInvalidAmount')); return; }
  } else if (type === 'equipment') {
    if (!document.getElementById('equip-name').value.trim()) { alert(t('errorEmptyName')); return; }
  }

  var data = {};
  var promise;

  if (type === 'task') {
    data = { title: document.getElementById('task-title').value, priority: document.getElementById('task-priority').value, period: document.getElementById('task-period').value, notes: document.getElementById('task-notes').value, date: new Date().toISOString().slice(0, 10), completed: false };
    if (currentEdit.id) {
      promise = dbGetAll('tasks').then(function(tasks) {
        var old = tasks.find(function(t) { return sameId(t.id, currentEdit.id); });
        if (old) { data = Object.assign({}, old, data); }
        return dbUpdate('tasks', data);
      });
    } else {
      promise = dbAdd('tasks', data);
    }
  } else if (type === 'issue') {
    var eqSelect = document.getElementById('issue-eq');
    data = { 
      location: document.getElementById('issue-loc').value, 
      equipmentId: eqSelect.value ? parseInt(eqSelect.value) : null, 
      equipment: eqSelect.options[eqSelect.selectedIndex].text.replace('-- اختر الجهاز --', '').replace('-- Select Equipment --', ''), 
      desc: document.getElementById('issue-desc').value, 
      technician: document.getElementById('issue-tech').value,
      techPhone: document.getElementById('issue-tech-phone').value,
      date: new Date().toISOString(), 
      status: 'open' 
    };
    if (currentEdit.id) {
      promise = dbGetAll('issues').then(function(issues) {
        var old = issues.find(function(i) { return sameId(i.id, currentEdit.id); });
        if (old) { 
          // Merge while keeping old ID and original date
          var updatedData = Object.assign({}, old, data);
          updatedData.date = old.date; // Keep original date
          updatedData.id = old.id;
          return dbUpdate('issues', updatedData);
        } else {
          // Fallback: Ensure ID is preserved even if 'old' lookup is tricky
          data.id = isNaN(parseInt(currentEdit.id)) ? currentEdit.id : parseInt(currentEdit.id);
          return dbUpdate('issues', data);
        }
      });
    } else {
      promise = dbAdd('issues', data);
    }
  } else if (type === 'donation') {
    data = { type: 'donation', name: document.getElementById('donor-name').value, amount: parseFloat(document.getElementById('amount').value), purpose: document.getElementById('purpose').value, date: new Date().toISOString() };
    if (currentEdit.id) {
      promise = dbGetAll('finances').then(function(fins) {
        var old = fins.find(function(f) { return sameId(f.id, currentEdit.id); });
        if (old) { data = Object.assign({}, old, data); }
        return dbUpdate('finances', data);
      });
    } else {
      promise = dbAdd('finances', data);
    }
  } else if (type === 'expense') {
    data = { type: 'expense', desc: document.getElementById('expense-desc').value, amount: parseFloat(document.getElementById('expense-amount').value), category: document.getElementById('expense-cat').value, date: new Date().toISOString() };
    if (currentEdit.id) {
      promise = dbGetAll('finances').then(function(fins) {
        var old = fins.find(function(f) { return sameId(f.id, currentEdit.id); });
        if (old) { data = Object.assign({}, old, data); }
        return dbUpdate('finances', data);
      });
    } else {
      promise = dbAdd('finances', data);
    }
  } else if (type === 'equipment') {
    var nameVal = document.getElementById('equip-name').value;
    var purchaseVal = document.getElementById('equip-purchase').value;
    data = { name: nameVal, location: document.getElementById('equip-location').value, estimatedValue: parseFloat(document.getElementById('equip-value').value) || 0, purchaseDate: purchaseVal || null, next: document.getElementById('equip-next').value, notes: document.getElementById('equip-notes').value, maintenanceHistory: [] };
    if (currentEdit.id) {
      promise = dbGetAll('equipment').then(function(eqs) {
        var old = eqs.find(function(e) { return sameId(e.id, currentEdit.id); });
        if (old) { data = Object.assign({}, old, data); }
        if (!data.maintenanceHistory) data.maintenanceHistory = [];
        delete data.status;
        return dbUpdate('equipment', data);
      });
    } else {
      promise = generateNextId(nameVal).then(function(uid) {
        data.uniqueId = uid;
        return dbAdd('equipment', data);
      });
    }
  }

  closeModal();
  if (promise) {
    promise.then(function() { App.refresh(); }).catch(function(err) { console.error('Save error:', err); });
  }
}

function promptResolveIssue(id) {
  dbGetAll('issues').then(function(issues) {
    var issue = issues.find(function(i) { return sameId(i.id, id); });
    if (!issue) return;
    
    var modal = document.getElementById('universal-modal');
    var content = document.getElementById('modal-content');
    
    var html = '<div class="flex-between"><h3><i class="fas fa-check-circle"></i> ' + t('issueResolved') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<p style="font-size:0.9rem; margin-bottom:1rem; color:var(--text-muted)">' + escapeHtml(issue.location) + ' - ' + escapeHtml(issue.desc) + '</p>';
    html += '<label style="display:block; margin-bottom:4px; font-size:0.8rem; font-weight:700;">' + t('maintCost') + '</label>';
    html += '<input type="number" id="resolve-cost" value="0" min="0" step="0.01" style="margin-bottom:1rem;">';
    html += '<label style="display:block; margin-bottom:4px; font-size:0.8rem; font-weight:700;">' + t('techName') + '</label>';
    html += '<input id="resolve-tech" value="' + escapeHtml(issue.technician || '') + '" style="margin-bottom:1rem;">';
    html += '<label style="display:block; margin-bottom:4px; font-size:0.8rem; font-weight:700;">' + t('techPhone') + '</label>';
    html += '<input id="resolve-phone" value="' + escapeHtml(issue.techPhone || '') + '" style="margin-bottom:1rem;">';
    html += '<button id="confirm-resolve-btn" class="btn btn-success btn-full">' + t('issueResolved') + '</button>';
    
    content.innerHTML = html;
    modal.style.display = 'flex';
    
    document.getElementById('confirm-resolve-btn').onclick = function() {
      var cost = parseFloat(document.getElementById('resolve-cost').value) || 0;
      var tech = document.getElementById('resolve-tech').value;
      var phone = document.getElementById('resolve-phone').value;
      
      issue.cost = cost;
      issue.technician = tech;
      issue.techPhone = phone;
      issue.status = 'resolved';
      issue.resolvedAt = new Date().toISOString();
      
      dbUpdate('issues', issue).then(function() {
        // Now trigger the same logic as resolveIssue but with data pre-filled
        if (issue.equipmentId) {
          return dbGetAll('equipment').then(function(list) {
            var eq = list.find(function(e) { return sameId(e.id, issue.equipmentId); });
            if (eq) {
              eq.maintenanceHistory = eq.maintenanceHistory || [];
              eq.maintenanceHistory.push({
                id: 'maint_res_' + Date.now(),
                date: issue.resolvedAt.slice(0, 10),
                description: '[' + t('statusResolved') + '] ' + (issue.desc || ''),
                cost: cost,
                technician: tech,
                status: 'resolved',
                issueId: id
              });
              return dbUpdate('equipment', eq).then(function() {
                if (cost > 0) {
                  return handleFinanceForMaintenance(eq.name, issue.desc, cost, issue.resolvedAt.slice(0,10), 'issue_' + id, 0, eq.id);
                }
              });
            }
          });
        }
      }).then(function() {
        closeModal();
        App.refresh();
      });
    };
  });
}

// ---------- Issue Filter ----------
function setIssueFilter(filter) {
  window._issueFilter = filter;
  App.refresh();
}

// ---------- Archive Issue ----------
function archiveIssue(id) {
  dbGetAll('issues').then(function(issues) {
    var issue = issues.find(function(i) { return sameId(i.id, id); });
    if (!issue) return;
    if (!confirm(currentLang === 'ar' ? 'هل تريد أرشفة هذا العطل؟ لن يظهر في القائمة الرئيسية.' : 'Archive this issue? It will be hidden from the main list.')) return;
    issue.archived = true;
    dbUpdate('issues', issue).then(function() { App.refresh(); });
  });
}

// ---------- Startup Alert Banner ----------
function showStartupAlerts() {
  dbGetAll('issues').then(function(issues) {
    var open = issues.filter(function(i) { return i.status !== 'resolved' && !i.archived; });
    if (open.length === 0) return;
    var bar = document.getElementById('startup-alert-bar');
    var txt = document.getElementById('startup-alert-text');
    if (!bar || !txt) return;
    txt.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + t('startupAlert').replace('{count}', open.length);
    bar.style.display = 'block';
    // Auto-hide after 8 seconds
    setTimeout(function() {
      if (bar) bar.style.display = 'none';
    }, 8000);
  });
}

// ---------- Export PDF Report ----------
function exportPDFReport() {
  Promise.all([dbGetAll('issues'), dbGetAll('finances'), dbGetAll('equipment')]).then(function(results) {
    var issues = results[0], finances = results[1], equipment = results[2];
    var inc = 0, exp = 0;
    finances.forEach(function(f) {
      if (f.type === 'donation') inc += parseFloat(f.amount || 0);
      else exp += parseFloat(f.amount || 0);
    });
    var resolved = issues.filter(function(i) { return i.status === 'resolved'; }).length;
    var open = issues.filter(function(i) { return i.status !== 'resolved' && !i.archived; }).length;
    var totalMaintCost = issues.reduce(function(s, i) { return s + (parseFloat(i.cost) || 0); }, 0);

    // Most faulty device
    var deviceMap = {};
    issues.forEach(function(i) { if (i.equipment) deviceMap[i.equipment] = (deviceMap[i.equipment] || 0) + 1; });
    var topDevice = Object.keys(deviceMap).sort(function(a,b){return deviceMap[b]-deviceMap[a];})[0];

    var dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    var date = new Date().toLocaleDateString('ar-SA');

    var win = window.open('', '_blank');
    if (!win) { alert(t('alertPopupBlocked')); return; }

    var html = '<!DOCTYPE html><html dir="' + dir + '"><head><meta charset="UTF-8"><title>' + t('reportMainTitle') + '</title><style>';
    html += 'body{font-family:system-ui,sans-serif;margin:0;padding:20px;background:#f8fafc;color:#1e293b;direction:' + dir + '}';
    html += '.header{background:linear-gradient(135deg,#0f766e,#0d9488);color:white;padding:24px;border-radius:16px;margin-bottom:20px;text-align:center;}';
    html += '.header h1{margin:0;font-size:1.6rem} .header p{margin:4px 0 0;opacity:0.8;font-size:0.9rem}';
    html += '.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px;}';
    html += '.card{background:white;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border-right:4px solid #0f766e;}';
    html += '.card .num{font-size:2rem;font-weight:800;margin:4px 0} .card .label{font-size:0.8rem;color:#64748b}';
    html += '.card.red{border-right-color:#ef4444} .card.green{border-right-color:#10b981} .card.yellow{border-right-color:#f59e0b}';
    html += 'table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:20px;}';
    html += 'th{background:#0f766e;color:white;padding:10px;font-size:0.85rem;text-align:right} td{padding:9px 10px;font-size:0.82rem;border-bottom:1px solid #f1f5f9}';
    html += 'tr:last-child td{border:none} tr:hover td{background:#f8fafc}';
    html += '.section-title{font-size:1rem;font-weight:700;margin:16px 0 8px;color:#0f766e;border-bottom:2px solid #e2e8f0;padding-bottom:6px;}';
    html += '.footer{text-align:center;color:#94a3b8;font-size:0.75rem;margin-top:30px;}';
    html += '@media print{body{padding:10px} .no-print{display:none}}';
    html += '</style></head><body>';

    html += '<div class="header">';
    html += '<h1>📊 ' + t('reportMainTitle') + '</h1>';
    var mosqueName = (currentMosque && typeof currentMosque === 'object' && currentMosque.name) ? currentMosque.name : (typeof currentMosque === 'string' ? currentMosque : '');
    html += '<p>' + t('reportIssuedAt') + ': ' + date + (mosqueName ? ' • ' + escapeHtml(mosqueName) : '') + '</p>';
    html += '</div>';

    html += '<div class="grid">';
    html += '<div class="card green"><div class="label">' + t('reportTotalIncome') + '</div><div class="num">' + formatCurrency(inc) + '</div></div>';
    html += '<div class="card red"><div class="label">' + t('reportTotalExpense') + '</div><div class="num">' + formatCurrency(exp) + '</div></div>';
    html += '<div class="card"><div class="label">' + t('reportNetBalance') + '</div><div class="num" style="color:' + (inc-exp>=0?'#10b981':'#ef4444') + '">' + formatCurrency(inc - exp) + '</div></div>';
    html += '<div class="card yellow"><div class="label">' + t('printTotalCost') + '</div><div class="num">' + formatCurrency(totalMaintCost) + '</div></div>';
    html += '<div class="card red"><div class="label">' + t('printPending') + '</div><div class="num">' + open + '</div></div>';
    html += '<div class="card green"><div class="label">' + t('printFixed') + '</div><div class="num">' + resolved + '</div></div>';
    html += '</div>';

    if (topDevice) {
      html += '<div style="background:white;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:20px;">';
      html += '<div style="font-size:0.8rem;color:#64748b;">' + t('reportMostFaulty') + '</div>';
      html += '<div style="font-size:1.1rem;font-weight:700;color:#ef4444;margin-top:4px;">⚠️ ' + escapeHtml(topDevice) + ' <span style="font-size:0.8rem;color:#64748b;">(' + deviceMap[topDevice] + ' ' + t('reportTimes') + ')</span></div>';
      html += '</div>';
    }

    // Open issues table
    var openIssues = issues.filter(function(i) { return i.status !== 'resolved' && !i.archived; });
    if (openIssues.length > 0) {
      html += '<div class="section-title">🔴 ' + t('issuePending') + ' (' + openIssues.length + ')</div>';
      html += '<table><thead><tr><th>' + t('issueLocation') + ' / ' + t('issueEquip') + '</th><th>' + t('issueDesc') + '</th><th>' + t('techName') + '</th><th>' + t('taskDue') + '</th></tr></thead><tbody>';
      openIssues.forEach(function(i) {
        html += '<tr><td><strong>' + escapeHtml(i.location) + '</strong>' + (i.equipment ? '<br><small>' + escapeHtml(i.equipment) + '</small>' : '') + '</td>';
        html += '<td>' + escapeHtml(i.desc) + '</td>';
        html += '<td>' + (i.technician ? escapeHtml(i.technician) : '-') + '</td>';
        html += '<td>' + formatDate(i.date) + '</td></tr>';
      });
      html += '</tbody></table>';
    }

    // Equipment summary
    var activeEq = equipment.filter(function(e) { return e.status !== 'archived'; });
    if (activeEq.length > 0) {
      html += '<div class="section-title">🔧 ' + t('tabInventory') + ' (' + activeEq.length + ')</div>';
      html += '<table><thead><tr><th>' + t('equipName') + '</th><th>' + t('location') + '</th><th>' + t('estimatedValue') + '</th><th>' + t('nextMaintenance') + '</th></tr></thead><tbody>';
      activeEq.forEach(function(e) {
        var isOverdue = e.next && new Date(e.next) < new Date();
        html += '<tr><td><strong>' + escapeHtml(e.name) + '</strong></td>';
        html += '<td>' + escapeHtml(e.location || '-') + '</td>';
        html += '<td>' + formatCurrency(parseFloat(e.estimatedValue) || 0) + '</td>';
        html += '<td style="color:' + (isOverdue ? '#ef4444' : '#0f766e') + '">' + (e.next ? (isOverdue ? '⚠️ ' + t('late') + ' ' : '') + formatDate(e.next) : '-') + '</td></tr>';
      });
      html += '</tbody></table>';
    }

    html += '<div class="footer">' + t('reportFooterText') + ' • ' + new Date().toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US') + '</div>';
    html += '<br><div style="text-align:center;"><button onclick="window.print()" style="background:#0f766e;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:1rem;cursor:pointer;margin-left:10px;">🖨️ ' + t('qrPrint') + '</button><button onclick="window.close()" style="background:#64748b;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:1rem;cursor:pointer;">' + t('close') + '</button></div>';
    html += '</body></html>';

    win.document.write(html);
    win.document.close();
  });
}

function showOnboardingGuide() {
  var modal = document.getElementById('universal-modal');
  var content = document.getElementById('modal-content');
  if (!modal || !content) return;

  var html = '<div class="onboarding-container">';
  html += '<div class="onboarding-logo"><i class="fas fa-mosque"></i></div>';
  html += '<h2 style="font-size:1.8rem; font-weight:800; margin-bottom:0.5rem; color:var(--primary);">' + t('welcomeTitle') + '</h2>';
  html += '<p style="color:var(--text-muted); font-size:1rem; margin-bottom:2rem;">' + t('welcomeSubtitle') + '</p>';
  
  html += '<div class="onboarding-steps">';
  
  // Step 1
  html += '<div class="onboarding-step">';
  html += '<div class="onboarding-icon-wrap"><i class="fas fa-plus-circle"></i></div>';
  html += '<div class="onboarding-step-content">';
  html += '<h4>' + t('onboardingStep1Title') + '</h4>';
  html += '<p>' + t('onboardingStep1Desc') + '</p>';
  html += '</div></div>';
  
  // Step 2
  html += '<div class="onboarding-step">';
  html += '<div class="onboarding-icon-wrap"><i class="fas fa-qrcode"></i></div>';
  html += '<div class="onboarding-step-content">';
  html += '<h4>' + t('onboardingStep2Title') + '</h4>';
  html += '<p>' + t('onboardingStep2Desc') + '</p>';
  html += '</div></div>';
  
  // Step 3
  html += '<div class="onboarding-step">';
  html += '<div class="onboarding-icon-wrap"><i class="fas fa-chart-line"></i></div>';
  html += '<div class="onboarding-step-content">';
  html += '<h4>' + t('onboardingStep3Title') + '</h4>';
  html += '<p>' + t('onboardingStep3Desc') + '</p>';
  html += '</div></div>';
  
  html += '</div>'; // end steps

  html += '<div class="onboarding-actions">';
  html += '<button onclick="openMosqueModal(); closeModal();" class="btn btn-primary btn-full" style="padding:1.2rem; font-size:1.1rem;"><i class="fas fa-arrow-left"></i> ' + t('getStartedBtn') + '</button>';
  html += '<button onclick="switchTab(\'settings\'); closeModal();" class="btn btn-outline btn-full"><i class="fas fa-upload"></i> ' + t('restoreDataBtn') + '</button>';
  html += '</div>';

  html += '</div>';

  content.innerHTML = html;
  modal.style.display = 'flex';
}

