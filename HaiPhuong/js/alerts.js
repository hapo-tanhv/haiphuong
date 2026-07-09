function initAlarms() {
  Object.keys(machinesData).forEach(id => {
    const m = machinesData[id];
    if (m.status === 'stopped') {
      const alarmId = `stopped_${id}`;
      if (!alarmsData.some(a => a.id === alarmId)) {
        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        const dateStr = new Date().toLocaleDateString('vi-VN');
        alarmsData.unshift({
          id: alarmId,
          time: timeStr,
          date: dateStr,
          severity: 'critical',
          severityText: 'Nghiêm trọng',
          code: 'MACHINE-STOPPED-ALERT',
          machine: `MÁY DẬP #${id}`,
          desc: `Thiết bị đang dừng hoạt động bất thường (Trạng thái stopped). Yêu cầu kiểm tra kết nối điện.`,
          status: 'emergency',
          statusText: 'Khẩn cấp'
        });
      }
    }
  });
}

function renderAlarmsView() {
  const tableBody = document.getElementById('alarm-table-body');
  const tableInfo = document.getElementById('alarm-table-info');
  const pagination = document.getElementById('alarm-pagination');
  if (!tableBody || !tableInfo || !pagination) return;

  const lang = state.language || 'vi';
  let criticalCount = 0;
  let warningCount = 0;
  alarmsData.forEach(a => {
    if (a.status !== 'resolved') {
      if (a.severity === 'critical') criticalCount++;
      if (a.severity === 'warning') warningCount++;
    }
  });

  document.getElementById('alarm-kpi-critical').textContent = String(criticalCount).padStart(2, '0');
  document.getElementById('alarm-kpi-warning').textContent = String(warningCount).padStart(2, '0');
  
  const downtimeVal = document.getElementById('alarm-kpi-downtime');
  if (downtimeVal) {
    downtimeVal.innerHTML = lang === 'vi' 
      ? `22 <span class="unit" data-i18n="alarm_unit_minute">Phút</span>` 
      : `22 <span class="unit" data-i18n="alarm_unit_minute">mins</span>`;
  }
  const strokesVal = document.getElementById('alarm-kpi-strokes');
  if (strokesVal) {
    strokesVal.textContent = lang === 'vi' ? '124.502' : '124,502';
  }
  
  const query = state.alarmSearchQuery.toLowerCase().trim();
  const filtered = alarmsData.filter(a => {
    const matchesSearch = a.code.toLowerCase().includes(query) || 
                          a.machine.toLowerCase().includes(query) || 
                          a.desc.toLowerCase().includes(query);
    const matchesSeverity = state.alarmSeverityFilter === 'all' || a.severity === state.alarmSeverityFilter;
    return matchesSearch && matchesSeverity;
  });

  document.getElementById('alarm-count-all').textContent = alarmsData.length;

  const total = filtered.length;
  const totalPages = Math.ceil(total / state.alarmRowsPerPage) || 1;
  if (state.alarmCurrentPage > totalPages) state.alarmCurrentPage = totalPages;
  if (state.alarmCurrentPage < 1) state.alarmCurrentPage = 1;

  const startIdx = (state.alarmCurrentPage - 1) * state.alarmRowsPerPage;
  const endIdx = Math.min(startIdx + state.alarmRowsPerPage, total);
  
  tableInfo.textContent = total > 0 
    ? (lang === 'vi' 
        ? `Hiển thị ${startIdx + 1} - ${endIdx} trên tổng số ${total} cảnh báo`
        : `Showing ${startIdx + 1} - ${endIdx} of ${total} alarms`)
    : (lang === 'vi' ? "Không tìm thấy cảnh báo nào" : "No alarms found");

  tableBody.innerHTML = '';
  const paginated = filtered.slice(startIdx, endIdx);
  
  const alarmDescMap = {
    'MACHINE-STOPPED-ALERT': {
      vi: 'Thiết bị đang dừng hoạt động bất thường (Trạng thái stopped). Yêu cầu kiểm tra kết nối điện.',
      en: 'Equipment stopped abnormally (Stopped status). Check electrical connections.'
    }
  };

  paginated.forEach(a => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', a.id);
    
    let badgeClass = 'badge-info-alarm';
    if (a.severity === 'critical') badgeClass = 'badge-critical';
    if (a.severity === 'warning') badgeClass = 'badge-warning';

    const severityKeys = {
      critical: 'status_critical',
      warning: 'status_warning',
      info: 'status_info'
    };
    const severityLabel = translations[lang][severityKeys[a.severity]] || a.severityText;

    const statusKeys = {
      emergency: 'status_emergency',
      processing: 'status_ack',
      scheduled: 'status_scheduled',
      resolved: 'status_resolved'
    };
    const statusLabel = translations[lang][statusKeys[a.status]] || a.status;

    let statusMarkup = '';
    if (a.status === 'emergency') {
      statusMarkup = `
        <span class="status-alert-pending">
          <svg class="alarm-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>${statusLabel}</span>
        </span>
      `;
    } else if (a.status === 'processing') {
      statusMarkup = `
        <span class="status-alert-progress">
          <svg class="alarm-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          <span>${statusLabel}</span>
        </span>
      `;
    } else if (a.status === 'scheduled') {
      statusMarkup = `
        <span class="status-alert-scheduled">
          <svg class="alarm-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>${statusLabel}</span>
        </span>
      `;
    } else {
      statusMarkup = `
        <span class="status-alert-resolved">
          <svg class="alarm-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${statusLabel}</span>
        </span>
      `;
    }

    const alarmDesc = alarmDescMap[a.code] ? alarmDescMap[a.code][lang] : a.desc;
    let alarmMachine = a.machine;
    if (lang === 'en') {
      alarmMachine = alarmMachine
        .replace('MÁY DẬP', 'PRESS')
        .replace('MÁY ÉP', 'PRESS')
        .replace('MÁY CẮT', 'CUTTER')
        .replace('TOÀN HỆ THỐNG', 'SYSTEM-WIDE')
        .replace('CẢM BIẾN NHIỆT', 'TEMP SENSOR');
    }

    tr.innerHTML = `
      <td>
        <div class="alarm-time-cell">
          <span class="time">${a.time}</span>
          <span class="date">${a.date}</span>
        </div>
      </td>
      <td>
        <span class="alarm-level-badge ${badgeClass}">${severityLabel}</span>
      </td>
      <td>
        <div class="alarm-code-cell">
          <span class="code font-bold">${a.code}</span>
          <span class="machine">${alarmMachine}</span>
        </div>
      </td>
      <td>${alarmDesc}</td>
      <td>${statusMarkup}</td>
    `;
    
    tr.addEventListener('click', () => {
      openAlarmModal(a);
    });

    tableBody.appendChild(tr);
  });

  pagination.innerHTML = '';
  
  const prevBtn = document.createElement('button');
  prevBtn.className = `page-link ${state.alarmCurrentPage === 1 ? 'disabled' : ''}`;
  prevBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;
  if (state.alarmCurrentPage > 1) {
    prevBtn.addEventListener('click', () => {
      state.alarmCurrentPage--;
      renderAlarmsView();
    });
  }
  pagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-link ${i === state.alarmCurrentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      state.alarmCurrentPage = i;
      renderAlarmsView();
    });
    pagination.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = `page-link ${state.alarmCurrentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  if (state.alarmCurrentPage < totalPages) {
    nextBtn.addEventListener('click', () => {
      state.alarmCurrentPage++;
      renderAlarmsView();
    });
  }
  pagination.appendChild(nextBtn);
}

function openAlarmModal(alarm) {
  const lang = state.language || 'vi';
  state.selectedAlarmId = alarm.id;
  
  const alarmDescMap = {
    'MACHINE-STOPPED-ALERT': {
      vi: 'Thiết bị đang dừng hoạt động bất thường (Trạng thái stopped). Yêu cầu kiểm tra kết nối điện.',
      en: 'Equipment stopped abnormally (Stopped status). Check electrical connections.'
    }
  };

  const severityKeys = {
    critical: 'status_critical',
    warning: 'status_warning',
    info: 'status_info'
  };
  const severityLabel = translations[lang][severityKeys[alarm.severity]] || alarm.severityText;

  const statusKeys = {
    emergency: 'status_emergency',
    processing: 'status_ack',
    scheduled: 'status_scheduled',
    resolved: 'status_resolved'
  };
  const statusLabel = translations[lang][statusKeys[alarm.status]] || alarm.status;

  const alarmDesc = alarmDescMap[alarm.code] ? alarmDescMap[alarm.code][lang] : alarm.desc;
  let alarmMachine = alarm.machine;
  if (lang === 'en') {
    alarmMachine = alarmMachine
      .replace('MÁY DẬP', 'PRESS')
      .replace('MÁY ÉP', 'PRESS')
      .replace('MÁY CẮT', 'CUTTER')
      .replace('TOÀN HỆ THỐNG', 'SYSTEM-WIDE')
      .replace('CẢM BIẾN NHIỆT', 'TEMP SENSOR');
  }

  document.getElementById('modal-detail-time').textContent = `${alarm.time} ${alarm.date}`;
  document.getElementById('modal-detail-severity').textContent = severityLabel;
  document.getElementById('modal-detail-code').textContent = `${alarm.code} (${alarmMachine})`;
  document.getElementById('modal-detail-desc').textContent = alarmDesc;
  document.getElementById('modal-detail-status').textContent = statusLabel;

  const ackBtn = document.getElementById('alarm-btn-ack');
  const resolveBtn = document.getElementById('alarm-btn-resolve');
  
  if (alarm.status === 'resolved') {
    ackBtn.style.display = 'none';
    resolveBtn.style.display = 'none';
  } else if (alarm.status === 'processing') {
    ackBtn.style.display = 'none';
    resolveBtn.style.display = 'block';
  } else {
    ackBtn.style.display = 'block';
    resolveBtn.style.display = 'block';
  }

  const modal = document.getElementById('alarm-action-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAlarmModal() {
  const modal = document.getElementById('alarm-action-modal');
  if (modal) modal.classList.add('hidden');
  state.selectedAlarmId = null;
}

function initAlarmControls() {
  const closeBtn = document.getElementById('alarm-modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeAlarmModal);

  const modalOverlay = document.getElementById('alarm-action-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeAlarmModal();
    });
  }

  const ackBtn = document.getElementById('alarm-btn-ack');
  if (ackBtn) {
    ackBtn.addEventListener('click', () => {
      if (state.selectedAlarmId) {
        const alarm = alarmsData.find(a => a.id === state.selectedAlarmId);
        if (alarm) {
          alarm.status = 'processing';
          alarm.statusText = 'Đang xử lý';
          closeAlarmModal();
          renderAlarmsView();
        }
      }
    });
  }

  const resolveBtn = document.getElementById('alarm-btn-resolve');
  if (resolveBtn) {
    resolveBtn.addEventListener('click', () => {
      if (state.selectedAlarmId) {
        const alarm = alarmsData.find(a => a.id === state.selectedAlarmId);
        if (alarm) {
          alarm.status = 'resolved';
          alarm.statusText = 'Hoàn tất';
          closeAlarmModal();
          renderAlarmsView();
        }
      }
    });
  }

  const severityTabBtns = document.querySelectorAll('#alarm-severity-tabs .alarm-tab-btn');
  severityTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      severityTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.alarmSeverityFilter = btn.getAttribute('data-severity');
      state.alarmCurrentPage = 1;
      renderAlarmsView();
    });
  });

  const searchInput = document.getElementById('alarm-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.alarmSearchQuery = e.target.value;
      state.alarmCurrentPage = 1;
      renderAlarmsView();
    });
  }
}
