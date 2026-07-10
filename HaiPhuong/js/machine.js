function renderMachineList(filterQuery = '') {
  const container = document.getElementById('machine-list-container');
  if (!container) return;

  const lang = state.language || 'vi';

  container.innerHTML = '';

  const filteredIds = Object.keys(machinesData).filter(id => {
    const m = machinesData[id];
    const query = filterQuery.toLowerCase().trim();
    return m.name.toLowerCase().includes(query) || id.includes(query);
  });

  if (filteredIds.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <p>Không tìm thấy máy dập nào phù hợp.</p>
      </div>
    `;
    return;
  }

  filteredIds.forEach(id => {
    const m = machinesData[id];
    const isRunning = m.status === 'running';
    const statusText = isRunning ? 'ĐANG HOẠT ĐỘNG' : 'MÁY DỪNG';
    const statusClass = isRunning ? 'running' : 'stopped';
    const textClass = isRunning ? 'text-running' : 'text-stopped';
    const isSelected = state.selectedMachineListId === id ? 'selected' : '';

    const card = document.createElement('div');
    card.className = `machine-list-card ${isSelected}`;
    card.setAttribute('data-machine-id', id);

    card.innerHTML = `
      <div class="ml-card-header">
        <div class="ml-card-thumb-wrapper">
          <img src="${window.basePath || ''}Image/maydap.jpeg" alt="${m.name}" class="ml-card-thumb">
        </div>
        <div class="ml-card-title-block">
          <div class="ml-card-title-row">
            <h3 class="ml-card-name">${m.name.toUpperCase()}</h3>
            <svg class="ml-card-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </div>
          <div class="ml-card-status">
            <span class="status-indicator-dot ${statusClass}"></span>
            <span class="status-text ${textClass}">${statusText}</span>
          </div>
        </div>
      </div>
      
      <div class="ml-card-body">
        <div class="ml-body-row">
          <div class="ml-body-col">
            <span class="ml-col-label">SỐ LẦN DẬP</span>
            <span class="ml-col-value value-highlight">${m.strokes} <span class="unit">lần</span></span>
          </div>
          <div class="ml-body-col">
            <span class="ml-col-label">THỜI GIAN CHẠY</span>
            <span class="ml-col-value">${m.runtime}</span>
          </div>
        </div>
        <div class="ml-body-row" style="margin-top: 15px;">
          <div class="ml-body-col">
            <span class="ml-col-label">THỜI GIAN DỪNG</span>
            <span class="ml-col-value">${m.stoptime}</span>
          </div>
        </div>
      </div>

      <div class="ml-card-footer">
        <div class="ml-load-row">
          <span class="ml-load-label">${translations[lang].machine_list_load.toUpperCase()}</span>
          <span class="ml-load-value">${m.load}%</span>
        </div>
        <div class="ml-load-bar-bg">
          <div class="ml-load-bar-fill" style="width: ${m.load}%"></div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.machine-list-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedMachineListId = id;
      showMachineDetail(id);
    });

    container.appendChild(card);
  });
}

let machineDetailChartInstance = null;
let singleDateFlatpickrInstance = null;
let dateRangeFlatpickrInstance = null;
let monthStartFlatpickrInstance = null;
let monthEndFlatpickrInstance = null;

const getMonthRangeDates = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const formatYMD = d => d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
  return [formatYMD(firstDayOfMonth), formatYMD(today)];
};

function getSeedFromDate(dateStr) {
  if (!dateStr) return 0;
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed += dateStr.charCodeAt(i);
  }
  return seed;
}

function updateDailyStats(id, dateStr) {
  const m = machinesData[id];
  if (!m) return;
  
  const seed = getSeedFromDate(dateStr);
  const strokesNum = parseInt(m.strokes.replace('.', ''), 10);
  
  // Pseudo-random deterministic variations based on date selected
  const multiplier = 0.85 + (seed % 31) / 200; // 0.85 to 1.0
  const dynamicStrokes = Math.floor(strokesNum * multiplier);
  
  const dailyTargetNum = parseInt(m.dailyTarget.replace('.', ''), 10);
  const totalOrderNum = parseInt(m.totalOrder.replace('.', ''), 10);
  
  const effPct = ((dynamicStrokes / dailyTargetNum) * 100).toFixed(1) + '%';
  const orderPct = ((dynamicStrokes / totalOrderNum) * 100).toFixed(1) + '%';
  
  const baseTimeEff = parseFloat(m.timeEfficiency) || 60;
  const timeEffPct = Math.min(100, (baseTimeEff * multiplier)).toFixed(1) + '%';
  
  const isRunning = m.status === 'running';
  let runtimeSecs = isRunning ? (14000 + (seed % 14000)) : 0;
  let trialSecs = isRunning ? (300 + (seed % 600)) : 0;

  const formatSecs = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const min = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${h}:${min}:${s}`;
  };

  // 1. Sản lượng / Kế hoạch ngày
  const strokesTargetValEl = document.getElementById('machine-detail-strokes-target-val');
  const strokesTargetPctEl = document.getElementById('machine-detail-strokes-target-pct');
  if (strokesTargetValEl) {
    strokesTargetValEl.innerHTML = `${dynamicStrokes.toLocaleString('vi-VN')} <span class="val-white">/ ${m.dailyTarget}</span>`;
  }
  if (strokesTargetPctEl) {
    strokesTargetPctEl.textContent = effPct;
  }
  
  // 2. Tiến độ đơn hàng
  const strokesOrderValEl = document.getElementById('machine-detail-strokes-order-val');
  const strokesOrderPctEl = document.getElementById('machine-detail-strokes-order-pct');
  if (strokesOrderValEl) {
    strokesOrderValEl.innerHTML = `${dynamicStrokes.toLocaleString('vi-VN')} <span class="val-white">/ ${m.totalOrder}</span>`;
  }
  if (strokesOrderPctEl) {
    strokesOrderPctEl.textContent = orderPct;
  }
  
  // 3. Hiệu suất sản lượng (OEE)
  const oeeValEl = document.getElementById('machine-detail-oee-val');
  if (oeeValEl) {
    oeeValEl.textContent = effPct;
  }
  
  // 4. Hiệu suất thời gian
  const timeEffValEl = document.getElementById('machine-detail-time-eff-val');
  if (timeEffValEl) {
    timeEffValEl.textContent = timeEffPct;
  }
  
  // 5. Thời gian chạy thử máy
  const trialValEl = document.getElementById('machine-detail-trial-val');
  if (trialValEl) {
    trialValEl.textContent = m.status === 'running' ? formatSecs(trialSecs) : '00:00:00';
  }

  // 6. Thời gian chạy máy
  const runValEl = document.getElementById('machine-detail-run-val');
  if (runValEl) {
    runValEl.textContent = m.status === 'running' ? formatSecs(runtimeSecs) : '00:00:00';
  }
}

function updateTrendAndAlarms(id) {
  const m = machinesData[id];
  if (!m) return;

  const lang = state.language || 'vi';
  
  // 1. Get current toggle mode
  const activeBtn = document.querySelector('.toggle-mode-btn-custom.active');
  const mode = activeBtn ? activeBtn.getAttribute('data-mode') : 'day';

  // 2. Generate chart data based on mode & range
  let labels = [];
  let data = [];
  
  if (mode === 'day') {
    const [defStart, defEnd] = getMonthRangeDates();
    let startDateVal = defStart;
    let endDateVal = defEnd;
    
    if (dateRangeFlatpickrInstance && dateRangeFlatpickrInstance.selectedDates.length === 2) {
      const d1 = dateRangeFlatpickrInstance.selectedDates[0];
      const d2 = dateRangeFlatpickrInstance.selectedDates[1];
      const formatYMD = d => d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
      startDateVal = formatYMD(d1);
      endDateVal = formatYMD(d2);
    }
    
    // Default labels
    labels = lang === 'vi' 
      ? ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    if (startDateVal && endDateVal) {
      const startD = new Date(startDateVal);
      const endD = new Date(endDateVal);
      labels = [];
      const tempDate = new Date(startD);
      let count = 0;
      while (tempDate <= endD && count < 10) {
        const dayStr = tempDate.getDate().toString().padStart(2, '0');
        const monthStr = (tempDate.getMonth() + 1).toString().padStart(2, '0');
        labels.push(`${dayStr}/${monthStr}`);
        tempDate.setDate(tempDate.getDate() + 1);
        count++;
      }
    }
    
    const seed = getSeedFromDate(startDateVal + endDateVal);
    data = labels.map((l, idx) => {
      const baseStrokes = parseInt(m.strokes.replace('.', ''), 10);
      return Math.floor(baseStrokes * (0.8 + ((seed + idx) % 30) / 100));
    });
  } else {
    // Month mode
    const startMonthVal = document.getElementById('part2-month-start').value;
    const endMonthVal = document.getElementById('part2-month-end').value;
    
    labels = lang === 'vi'
      ? ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
      
    if (startMonthVal && endMonthVal) {
      const startParts = startMonthVal.split('-');
      const endParts = endMonthVal.split('-');
      let startYear = parseInt(startParts[0], 10);
      let startMonth = parseInt(startParts[1], 10);
      const endYear = parseInt(endParts[0], 10);
      const endMonth = parseInt(endParts[1], 10);
      
      labels = [];
      let count = 0;
      while ((startYear < endYear || (startYear === endYear && startMonth <= endMonth)) && count < 12) {
        labels.push(lang === 'vi' ? `T${startMonth}/${startYear.toString().substring(2)}` : `M${startMonth}/${startYear.toString().substring(2)}`);
        startMonth++;
        if (startMonth > 12) {
          startMonth = 1;
          startYear++;
        }
        count++;
      }
    }
    
    const seed = getSeedFromDate(startMonthVal + endMonthVal);
    data = labels.map((l, idx) => {
      const baseStrokes = parseInt(m.strokes.replace('.', ''), 10);
      return Math.floor(baseStrokes * 22 + ((seed + idx) % 50) * 1000);
    });
  }

  // Draw Line Chart
  const canvas = document.getElementById('machine-detail-chart');
  if (canvas) {
    if (machineDetailChartInstance) {
      machineDetailChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    const isRunning = m.status === 'running';
    const chartColor = isRunning ? '#00d2ff' : '#ff3d00';
    const chartBgColor = isRunning ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 61, 0, 0.08)';

    machineDetailChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: lang === 'vi' ? 'Sản lượng dập (lần)' : 'Strokes',
          data: data,
          borderColor: chartColor,
          backgroundColor: chartBgColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: chartColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#8f9cae' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#8f9cae' }
          }
        }
      }
    });
  }

  // 3. Render filtered alarms list
  renderMachineAlarmsFiltered(id, mode);
}

function parseAlarmDate(dStr) {
  const parts = dStr.split('/');
  if (parts.length !== 3) return new Date();
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

function renderMachineAlarmsFiltered(machineId, mode) {
  const container = document.getElementById('machine-detail-alarms-list');
  if (!container) return;

  const lang = state.language || 'vi';
  container.innerHTML = '';

  const startDInput = document.getElementById('part2-date-start');
  const endDInput = document.getElementById('part2-date-end');
  const startMInput = document.getElementById('part2-month-start');
  const endMInput = document.getElementById('part2-month-end');

  // Filter alarms matching this machine ID
  const relatedAlarms = alarmsData.filter(a => {
    const machineField = a.machine.toUpperCase();
    const idNum = parseInt(machineId, 10);
    const machineMatches = machineField.includes(machineId) || 
                           machineField.includes(`#${machineId}`) || 
                           machineField.includes(`#0${idNum}`) || 
                           machineField.includes(`#${idNum}`);
    if (!machineMatches) return false;

    // Filter by dates
    const alarmDateObj = parseAlarmDate(a.date);
    alarmDateObj.setHours(0,0,0,0);

    if (mode === 'day') {
      if (dateRangeFlatpickrInstance && dateRangeFlatpickrInstance.selectedDates.length === 2) {
        const startD = new Date(dateRangeFlatpickrInstance.selectedDates[0]);
        const endD = new Date(dateRangeFlatpickrInstance.selectedDates[1]);
        startD.setHours(0,0,0,0);
        endD.setHours(0,0,0,0);
        return alarmDateObj >= startD && alarmDateObj <= endD;
      }
    } else {
      if (startMInput && startMInput.value && endMInput && endMInput.value) {
        const startM = new Date(startMInput.value + '-01');
        const endM = new Date(endMInput.value + '-01');
        startM.setHours(0,0,0,0);
        endM.setHours(0,0,0,0);
        
        const alarmMonthObj = new Date(alarmDateObj.getFullYear(), alarmDateObj.getMonth(), 1);
        return alarmMonthObj >= startM && alarmMonthObj <= endM;
      }
    }
    return true; // default no range select
  });

  if (relatedAlarms.length === 0) {
    container.innerHTML = `
      <div class="no-alarms-custom">
        <p>${lang === 'vi' ? 'Không có cảnh báo hoạt động nào cho máy dập này trong khoảng thời gian được lọc.' : 'No active alarms for this machine in the filtered range.'}</p>
      </div>
    `;
    return;
  }

  relatedAlarms.forEach(a => {
    const item = document.createElement('div');
    item.className = `mini-alarm-row-custom ${a.severity}`;
    
    // Icon based on severity
    let iconSvg = '';
    if (a.severity === 'critical') {
      iconSvg = `<svg class="mini-alarm-icon" viewBox="0 0 24 24" fill="none" stroke="#ff3d00" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (a.severity === 'warning') {
      iconSvg = `<svg class="mini-alarm-icon" viewBox="0 0 24 24" fill="none" stroke="#ff9100" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      iconSvg = `<svg class="mini-alarm-icon" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    const severityText = lang === 'vi' ? a.severityText : a.severity.toUpperCase();
    const statusText = lang === 'vi' ? a.statusText : a.status.toUpperCase();

    item.innerHTML = `
      <div class="mini-alarm-meta">
        ${iconSvg}
        <span class="mini-alarm-code">${a.code}</span>
        <span class="mini-alarm-severity badge-${a.severity}">${severityText}</span>
        <span class="mini-alarm-time">${a.time} - ${a.date}</span>
      </div>
      <div class="mini-alarm-desc">${a.desc}</div>
      <div class="mini-alarm-status-row">
        <span class="mini-alarm-status status-${a.status}">${statusText}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleExcelExport(id) {
  const m = machinesData[id];
  if (!m) return;
  
  const modeBtn = document.querySelector('.toggle-mode-btn-custom.active');
  const mode = modeBtn ? modeBtn.getAttribute('data-mode') : 'day';
  let start = '';
  let end = '';
  if (mode === 'day') {
    if (dateRangeFlatpickrInstance && dateRangeFlatpickrInstance.selectedDates.length === 2) {
      const formatYMD = d => d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
      start = formatYMD(dateRangeFlatpickrInstance.selectedDates[0]);
      end = formatYMD(dateRangeFlatpickrInstance.selectedDates[1]);
    } else {
      const [defStart, defEnd] = getMonthRangeDates();
      start = defStart;
      end = defEnd;
    }
  } else {
    start = document.getElementById('part2-month-start') ? document.getElementById('part2-month-start').value : '';
    end = document.getElementById('part2-month-end') ? document.getElementById('part2-month-end').value : '';
  }
  
  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += `BAO CAO SAN LUONG VA SU CO - MAY DAP SO #${id}\n`;
  csvContent += `Thoi gian loc: ${start} den ${end} (Che do: ${mode === 'day' ? 'Theo ngay' : 'Theo thang'})\n\n`;
  csvContent += `Thong tin san pham:\n`;
  csvContent += `Ma san pham: ${m.productCode}\n`;
  csvContent += `Ten san pham: ${m.productName}\n`;
  csvContent += `Lo san xuat: ${m.batch}\n`;
  csvContent += `San luong du kien: ${m.plannedQty}\n\n`;
  
  csvContent += `Du lieu san luong:\n`;
  if (mode === 'day') {
    csvContent += `Ngay,San luong (lan)\n`;
    csvContent += `15/05,1000\n`;
    csvContent += `16/05,1200\n`;
    csvContent += `17/05,950\n`;
    csvContent += `18/05,1100\n`;
    csvContent += `19/05,1256\n`;
    csvContent += `20/05,1300\n`;
    csvContent += `21/05,1150\n`;
    csvContent += `22/05,1200\n`;
  } else {
    csvContent += `Thang,San luong (lan)\n`;
    csvContent += `Thang 1,28000\n`;
    csvContent += `Thang 2,31000\n`;
    csvContent += `Thang 3,27500\n`;
    csvContent += `Thang 4,32000\n`;
    csvContent += `Thang 5,34000\n`;
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bao_cao_may_dap_${id}_${mode}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showMachineDetail(id) {
  const m = machinesData[id];
  if (!m) return;

  const lang = state.language || 'vi';

  // 1. Hide list view & overview view, show detail view
  const listSection = document.getElementById('view-machine');
  const overviewSection = document.getElementById('view-overview');
  const detailSection = document.getElementById('view-machine-detail');
  if (listSection) listSection.classList.add('hidden');
  if (overviewSection) overviewSection.classList.add('hidden');
  if (detailSection) detailSection.classList.remove('hidden');

  // 2. Update Header Title to Machine Detail
  updateHeaderTitle('machine-detail');

  // 3. Populate machine specs details
  const titleEl = document.getElementById('machine-detail-title');
  if (titleEl) {
    titleEl.textContent = lang === 'vi' ? `MÁY DẬP SỐ #${id}` : `STAMPING PRESS #${id}`;
  }

  const dotEl = document.getElementById('machine-detail-status-dot');
  const textEl = document.getElementById('machine-detail-status-text');
  const isRunning = m.status === 'running';
  if (dotEl && textEl) {
    dotEl.className = 'status-indicator-dot';
    dotEl.classList.add(isRunning ? 'running' : 'stopped');
    textEl.className = 'status-text';
    textEl.classList.add(isRunning ? 'text-running' : 'text-stopped');
    textEl.textContent = lang === 'vi' 
      ? (isRunning ? 'ĐANG HOẠT ĐỘNG' : 'MÁY DỪNG') 
      : (isRunning ? 'RUNNING' : 'STOPPED');
  }

  // Stamp card animation
  const stampCard = document.getElementById('machine-stamp-card');
  if (stampCard) {
    if (isRunning) {
      stampCard.classList.add('running-animation');
    } else {
      stampCard.classList.remove('running-animation');
    }
  }


  // 4. Populate Product Info
  const prodCode = document.getElementById('product-detail-code');
  const prodName = document.getElementById('product-detail-name');
  const prodBatch = document.getElementById('product-detail-batch');
  const prodPlan = document.getElementById('product-detail-plan');
  if (prodCode) prodCode.textContent = m.productCode || '-';
  if (prodName) prodName.textContent = m.productName || '-';
  if (prodBatch) prodBatch.textContent = m.batch || '-';
  if (prodPlan) prodPlan.innerHTML = `${m.plannedQty} <span class="unit">${lang === 'vi' ? 'lần' : 'times'}</span>`;

  // 5. Destroy old Flatpickr instances if they exist to prevent memory leaks
  if (singleDateFlatpickrInstance) { singleDateFlatpickrInstance.destroy(); }
  if (dateRangeFlatpickrInstance) { dateRangeFlatpickrInstance.destroy(); }
  if (monthStartFlatpickrInstance) { monthStartFlatpickrInstance.destroy(); }
  if (monthEndFlatpickrInstance) { monthEndFlatpickrInstance.destroy(); }

  // 6. Initialize Single Date Picker (Part 1)
  const singleDateInput = document.getElementById('detail-single-date');
  if (singleDateInput) {
    singleDateFlatpickrInstance = flatpickr(singleDateInput, {
      dateFormat: "Y-m-d",
      defaultDate: "2026-07-09",
      altInput: true,
      altFormat: "d/m/Y",
      onChange: function(selectedDates, dateStr) {
        updateDailyStats(id, dateStr);
      }
    });
    updateDailyStats(id, "2026-07-09");
  }

  // 7. Initialize Toggle Buttons
  const modeButtons = document.querySelectorAll('.toggle-mode-btn-custom');
  modeButtons.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-mode-btn-custom').forEach(b => b.classList.remove('active'));
      newBtn.classList.add('active');
      const mode = newBtn.getAttribute('data-mode');
      
      const dayRange = document.getElementById('part2-range-day');
      const monthRange = document.getElementById('part2-range-month');
      
      if (mode === 'day') {
        if (dayRange) dayRange.classList.remove('hidden');
        if (monthRange) monthRange.classList.add('hidden');
      } else {
        if (dayRange) dayRange.classList.add('hidden');
        if (monthRange) monthRange.classList.remove('hidden');
      }
      updateTrendAndAlarms(id);
    });
  });

  // 8. Initialize Part 2 Range Pickers (Day Range - single range picker input)
  const dateRangeInput = document.getElementById('part2-date-range');
  if (dateRangeInput) {
    dateRangeFlatpickrInstance = flatpickr(dateRangeInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      defaultDate: getMonthRangeDates(),
      altInput: true,
      altFormat: "d/m/Y",
      onChange: function(selectedDates) {
        if (selectedDates.length === 2) {
          updateTrendAndAlarms(id);
        }
      }
    });
  }

  // 9. Initialize Part 2 Range Pickers (Month Range - using Flatpickr monthSelectPlugin)
  const monthStart = document.getElementById('part2-month-start');
  const monthEnd = document.getElementById('part2-month-end');
  if (monthStart && monthEnd) {
    monthStartFlatpickrInstance = flatpickr(monthStart, {
      plugins: [
        new monthSelectPlugin({
          shorthand: true,
          dateFormat: "Y-m",
          altFormat: "m/Y"
        })
      ],
      defaultDate: "2026-06",
      onChange: function(selectedDates, dateStr) {
        if (monthEndFlatpickrInstance) {
          monthEndFlatpickrInstance.set('minDate', dateStr);
        }
        updateTrendAndAlarms(id);
      }
    });

    monthEndFlatpickrInstance = flatpickr(monthEnd, {
      plugins: [
        new monthSelectPlugin({
          shorthand: true,
          dateFormat: "Y-m",
          altFormat: "m/Y"
        })
      ],
      defaultDate: "2026-07",
      onChange: function(selectedDates, dateStr) {
        if (monthStartFlatpickrInstance) {
          monthStartFlatpickrInstance.set('maxDate', dateStr);
        }
        updateTrendAndAlarms(id);
      }
    });
  }

  // Bind Export Excel Button
  const exportExcelBtn = document.getElementById('btn-export-excel');
  if (exportExcelBtn) {
    const newBtn = exportExcelBtn.cloneNode(true);
    exportExcelBtn.parentNode.replaceChild(newBtn, exportExcelBtn);
    newBtn.addEventListener('click', () => {
      handleExcelExport(id);
    });
  }

  // 7. Initial render of Trend and Alarms
  updateTrendAndAlarms(id);
}

function initBackButton() {
  const backBtn = document.getElementById('machine-detail-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const listSection = document.getElementById('view-machine');
      const detailSection = document.getElementById('view-machine-detail');
      const overviewSection = document.getElementById('view-overview');
      
      if (listSection) listSection.classList.add('hidden');
      if (detailSection) detailSection.classList.add('hidden');
      if (overviewSection) overviewSection.classList.remove('hidden');
      
      // Cập nhật lại trạng thái active trên Sidebar sang Tổng quan
      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach(nav => nav.classList.remove('active'));
      const overviewTab = document.querySelector('.nav-item[data-tab="overview"]');
      if (overviewTab) {
        overviewTab.classList.add('active');
      }

      state.currentTab = 'overview';
      updateHeaderTitle('overview');
    });
  }
}

// Gọi khởi tạo nút quay lại lập tức
initBackButton();

function initSearchAndFilter() {
  const searchInput = document.getElementById('machine-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderMachineList(e.target.value);
    });
  }
}

// 5.2. Khởi tạo bộ dữ liệu lịch sử và các hàm hiển thị điều khiển (Task 5.7)
const historyData = [
  { machineId: '01', start: '09/07/2026 07:30', end: '09/07/2026 16:45', strokes: '1.500', quality: 98, status: 'running' },
  { machineId: '03', start: '09/07/2026 08:15', end: '09/07/2026 17:00', strokes: '1.500', quality: 99, status: 'running' },
  { machineId: '06', start: '09/07/2026 07:00', end: '09/07/2026 11:30', strokes: '560',  quality: 75, status: 'stopped' },
  { machineId: '09', start: '09/07/2026 07:45', end: '09/07/2026 16:00', strokes: '1.450', quality: 95, status: 'running' },
  { machineId: '02', start: '09/07/2026 08:30', end: '09/07/2026 17:30', strokes: '1.380', quality: 97, status: 'running' },
  
  { machineId: '04', start: '08/07/2026 08:00', end: '08/07/2026 17:00', strokes: '870',  quality: 96, status: 'running' },
  { machineId: '05', start: '08/07/2026 08:15', end: '08/07/2026 17:30', strokes: '1.030', quality: 97, status: 'running' },
  { machineId: '08', start: '08/07/2026 08:30', end: '08/07/2026 16:45', strokes: '1.420', quality: 94, status: 'running' },
  { machineId: '10', start: '08/07/2026 09:00', end: '08/07/2026 13:00', strokes: '320',  quality: 80, status: 'stopped' },
  { machineId: '01', start: '08/07/2026 07:30', end: '08/07/2026 16:45', strokes: '1.500', quality: 98, status: 'running' },
  
  { machineId: '03', start: '07/07/2026 08:15', end: '07/07/2026 17:00', strokes: '1.500', quality: 99, status: 'running' },
  { machineId: '02', start: '07/07/2026 08:30', end: '07/07/2026 17:30', strokes: '990',  quality: 98, status: 'running' },
  { machineId: '06', start: '07/07/2026 07:00', end: '07/07/2026 11:30', strokes: '550',  quality: 76, status: 'stopped' },
  { machineId: '09', start: '07/07/2026 07:45', end: '07/07/2026 16:00', strokes: '1.450', quality: 95, status: 'running' },
  { machineId: '04', start: '07/07/2026 08:00', end: '07/07/2026 17:00', strokes: '860',  quality: 96, status: 'running' },
  
  { machineId: '05', start: '30/06/2026 08:15', end: '30/06/2026 17:30', strokes: '1.490', quality: 97, status: 'running' },
  { machineId: '08', start: '30/06/2026 08:30', end: '30/06/2026 16:45', strokes: '750',  quality: 95, status: 'running' },
  { machineId: '10', start: '30/06/2026 09:00', end: '30/06/2026 13:00', strokes: '310',  quality: 82, status: 'stopped' },
  { machineId: '01', start: '30/06/2026 07:30', end: '30/06/2026 16:45', strokes: '1.500', quality: 98, status: 'running' },
  { machineId: '03', start: '30/06/2026 08:15', end: '30/06/2026 17:00', strokes: '1.500', quality: 99, status: 'running' },
  
  { machineId: '02', start: '29/06/2026 08:30', end: '29/06/2026 17:30', strokes: '985',  quality: 97, status: 'running' },
  { machineId: '06', start: '29/06/2026 07:00', end: '29/06/2026 11:30', strokes: '570',  quality: 74, status: 'stopped' },
  { machineId: '09', start: '29/06/2026 07:45', end: '29/06/2026 16:00', strokes: '1.390', quality: 96, status: 'running' },
  { machineId: '04', start: '29/06/2026 08:00', end: '29/06/2026 17:00', strokes: '880',  quality: 95, status: 'running' }
];
