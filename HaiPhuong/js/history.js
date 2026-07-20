let liveHistoryData = null;

function formatDateToYYYYMMDD(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateEndTime(timestampStr, runtimeStr, trialTimeStr) {
  try {
    const parts = timestampStr.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const second = parseInt(timeParts[2], 10);
    
    const startDate = new Date(year, month, day, hour, minute, second);
    
    const rt = runtimeStr.split(':');
    const rtSec = parseInt(rt[0], 10) * 3600 + parseInt(rt[1], 10) * 60 + parseInt(rt[2], 10);
    
    const tt = trialTimeStr.split(':');
    const ttSec = parseInt(tt[0], 10) * 3600 + parseInt(tt[1], 10) * 60 + parseInt(tt[2], 10);
    
    const endDate = new Date(startDate.getTime() + (rtSec + ttSec) * 1000);
    
    const d = String(endDate.getDate()).padStart(2, '0');
    const m = String(endDate.getMonth() + 1).padStart(2, '0');
    const y = endDate.getFullYear();
    const h = String(endDate.getHours()).padStart(2, '0');
    const min = String(endDate.getMinutes()).padStart(2, '0');
    const s = String(endDate.getSeconds()).padStart(2, '0');
    
    return `${d}/${m}/${y} ${h}:${min}:${s}`;
  } catch (err) {
    return timestampStr;
  }
}

async function fetchHistoryFromServer() {
  try {
    const startFormatted = formatDateToYYYYMMDD(state.historyStartDate);
    const endFormatted = formatDateToYYYYMMDD(state.historyEndDate);
    const res = await fetch(`${window.basePath || ''}Api/GetHistory?machineType=${state.historyTypeFilter || 'all'}&machineId=all&startDate=${startFormatted}&endDate=${endFormatted}`);
    const json = await res.json();
    if (json.success && json.data) {
      liveHistoryData = json.data.map(item => ({
        machineId: item.machineCode,
        machineName: item.machineName,
        type: item.deviceType,
        orderNo: item.orderNo,
        productCode: item.productCode,
        productName: item.productName,
        start: item.timestamp,
        end: calculateEndTime(item.timestamp, item.runtime, item.trialTime),
        strokes: item.strokes,
        runtime: item.runtime,
        trialTime: item.trialTime,
        status: item.status
      }));
    }
  } catch (err) {
    console.warn("Failed to fetch history from server, using local fallback.", err);
  }
}

async function renderHistoryTable() {
  const tableBody = document.getElementById('history-table-body');
  const tableInfo = document.getElementById('history-table-info');
  const pagination = document.getElementById('history-pagination');
  if (!tableBody || !tableInfo || !pagination) return;

  tableBody.innerHTML = '';
  
  await fetchHistoryFromServer();
  const activeHistorySource = liveHistoryData || historyData;

  const query = state.historySearchQuery.toLowerCase().trim();
  const filteredRecords = activeHistorySource.filter(r => {
    const typeVal = r.type || r.deviceType;
    let isStamping = false;
    let isHeading = false;
    let isThreading = false;

    if (typeVal) {
      const typeUpper = typeVal.toUpperCase();
      isStamping = typeUpper === 'MÁY DẬP' || typeUpper === 'STAMPING';
      isHeading = typeUpper === 'MÁY ĐẤM VÍT' || typeUpper === 'SCREW_HEADING' || typeUpper === 'HEADING';
      isThreading = typeUpper === 'MÁY REN VÍT' || typeUpper === 'SCREW_THREADING' || typeUpper === 'THREADING';
    } else {
      const machineIdNum = parseInt(r.machineId, 10) || 0;
      if (machineIdNum >= 1 && machineIdNum <= 10) {
        isStamping = true;
      } else if (machineIdNum >= 11 && machineIdNum <= 15) {
        isHeading = true;
      } else if (machineIdNum >= 16) {
        isThreading = true;
      } else if (r.machineId.startsWith('DV') || r.machineId.startsWith('DB') || r.machineId.startsWith('MV')) {
        isHeading = true;
      } else if (r.machineId.startsWith('RV')) {
        isThreading = true;
      } else {
        isStamping = true;
      }
    }

    const typeLabel = isStamping ? 'máy dập' : (isHeading ? 'máy đấm vít' : 'máy cán ren');
    const machineName = `Máy số ${r.machineId}`.toLowerCase();
    const machineIdStr = `${typeLabel} ${r.machineId}`.toLowerCase();
    const matchesSearch = r.machineId.toLowerCase().includes(query) || machineName.includes(query) || machineIdStr.includes(query) || typeLabel.includes(query);

    let matchesDate = true;
    if (state.historyStartDate && state.historyEndDate) {
      const parts = r.start.split(' ')[0].split('/');
      const recordDate = new Date(parts[2], parts[1] - 1, parts[0]);
      recordDate.setHours(0,0,0,0);
      
      const start = new Date(state.historyStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(state.historyEndDate);
      end.setHours(0,0,0,0);
      
      matchesDate = recordDate >= start && recordDate <= end;
    }

    const strokesVal = parseInt(r.strokes.replace(/[\.,]/g, ''), 10);
    const isCompleted = strokesVal >= 1500;
    const recordStatus = isCompleted ? 'running' : 'stopped';
    const matchesStatus = state.historyStatusFilter === 'all' || recordStatus === state.historyStatusFilter;

    let matchesQuality = true;
    const effPercent = Math.round((strokesVal / 1500) * 100);
    if (state.historyQualityFilter === 'high') {
      matchesQuality = effPercent >= 100;
    } else if (state.historyQualityFilter === 'low') {
      matchesQuality = effPercent < 100;
    }

    let matchesType = true;
    if (state.historyTypeFilter === 'stamping') {
      matchesType = isStamping;
    } else if (state.historyTypeFilter === 'heading') {
      matchesType = isHeading;
    } else if (state.historyTypeFilter === 'threading') {
      matchesType = isThreading;
    }

    return matchesSearch && matchesDate && matchesStatus && matchesQuality && matchesType;
  });

  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / state.historyRowsPerPage) || 1;

  if (state.historyCurrentPage > totalPages) {
    state.historyCurrentPage = totalPages;
  }
  if (state.historyCurrentPage < 1) {
    state.historyCurrentPage = 1;
  }

  const startIndex = (state.historyCurrentPage - 1) * state.historyRowsPerPage;
  const endIndex = Math.min(startIndex + state.historyRowsPerPage, totalRecords);
  const pageRecords = filteredRecords.slice(startIndex, endIndex);

  const lang = state.language || 'vi';
  if (totalRecords === 0) {
    tableInfo.textContent = lang === 'vi' ? 'Hiển thị 0 - 0 của 0 bản ghi' : 'Showing 0 - 0 of 0 records';
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          ${lang === 'vi' ? 'Không tìm thấy lịch sử dập máy nào phù hợp.' : 'No matching stamping history found.'}
        </td>
      </tr>
    `;
    pagination.innerHTML = '';
    return;
  }

  const showText = lang === 'vi' ? 'Hiển thị' : 'Showing';
  const ofText = lang === 'vi' ? 'của' : 'of';
  const recordsText = lang === 'vi' ? 'bản ghi' : 'records';
  tableInfo.textContent = `${showText} ${startIndex + 1} - ${endIndex} ${ofText} ${totalRecords} ${recordsText}`;

  pageRecords.forEach(r => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    const typeVal = r.type || r.deviceType;
    let pressText = "";
    if (typeVal) {
      if (lang === 'vi') {
        pressText = typeVal.toUpperCase();
      } else {
        const typeUpper = typeVal.toUpperCase();
        if (typeUpper === 'MÁY DẬP' || typeUpper === 'STAMPING') pressText = 'PRESS';
        else if (typeUpper === 'MÁY ĐẤM VÍT' || typeUpper === 'SCREW_HEADING') pressText = 'SCREW HEADING';
        else if (typeUpper === 'MÁY REN VÍT' || typeUpper === 'SCREW_THREADING') pressText = 'SCREW THREADING';
        else pressText = typeUpper;
      }
    } else {
      const machineIdNum = parseInt(r.machineId, 10) || 0;
      if (machineIdNum >= 1 && machineIdNum <= 10) {
        pressText = lang === 'vi' ? 'MÁY DẬP' : 'PRESS';
      } else if (machineIdNum >= 11 && machineIdNum <= 15) {
        pressText = lang === 'vi' ? 'MÁY ĐẤM VÍT' : 'SCREW HEADING';
      } else if (machineIdNum >= 16) {
        pressText = lang === 'vi' ? 'MÁY CÁN REN' : 'SCREW THREADING';
      } else if (r.machineId.startsWith('DV') || r.machineId.startsWith('DB') || r.machineId.startsWith('MV')) {
        pressText = lang === 'vi' ? 'MÁY ĐẤM VÍT' : 'SCREW HEADING';
      } else if (r.machineId.startsWith('RV')) {
        pressText = lang === 'vi' ? 'MÁY CÁN REN' : 'SCREW THREADING';
      } else {
        pressText = lang === 'vi' ? 'MÁY DẬP' : 'PRESS';
      }
    }
    tr.innerHTML = `
      <td>
        <span style="font-weight: 700;">${pressText} ${r.machineId}</span>
      </td>
      <td>${r.start}</td>
      <td>${r.end}</td>
      <td style="font-weight: 700; color: #fff; text-align: center;">${r.strokes}</td>
      <td style="text-align: center;">
        <button class="history-detail-btn" style="background: none; border: none; color: var(--accent-cyan); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px; background: rgba(0, 210, 255, 0.1); border: 1px solid rgba(0, 210, 255, 0.2);">
          <span>${lang === 'vi' ? 'Xem' : 'View'}</span>
          <svg class="chevron-icon" style="width: 14px; height: 14px; transition: transform 0.2s;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </td>
    `;

    const detailTr = document.createElement('tr');
    detailTr.className = 'history-detail-row hidden';
    detailTr.innerHTML = `
      <td colspan="5" style="padding: 0; background: transparent; border-top: none;">
        <div class="detail-expand-wrapper" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
          ${generateProcessTimeline(r, lang)}
        </div>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('td:last-child') || e.target.closest('.history-detail-btn')) {
        return;
      }
      state.selectedMachineId = r.machineId;
      const overviewCards = document.querySelectorAll('.machine-grid-card');
      overviewCards.forEach(c => {
        if (c.getAttribute('data-machine-id') === r.machineId) {
          c.classList.add('selected');
        } else {
          c.classList.remove('selected');
        }
      });
      const overviewNav = document.querySelector('.nav-item[data-tab="overview"]');
      if (overviewNav) {
        overviewNav.click();
      }
    });

    const detailBtn = tr.querySelector('.history-detail-btn');
    if (detailBtn) {
      detailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrapper = detailTr.querySelector('.detail-expand-wrapper');
        const chevron = detailBtn.querySelector('.chevron-icon');
        
        if (detailTr.classList.contains('hidden')) {
          detailTr.classList.remove('hidden');
          wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
          if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
          wrapper.style.maxHeight = '0';
          if (chevron) chevron.style.transform = 'rotate(0deg)';
          setTimeout(() => {
            detailTr.classList.add('hidden');
          }, 300);
        }
      });
    }

    tableBody.appendChild(tr);
    tableBody.appendChild(detailTr);
  });

  pagination.innerHTML = '';
  
  const prevBtn = document.createElement('button');
  prevBtn.className = `page-link ${state.historyCurrentPage === 1 ? 'disabled' : ''}`;
  prevBtn.innerHTML = `&lt;`;
  prevBtn.addEventListener('click', () => {
    if (state.historyCurrentPage > 1) {
      state.historyCurrentPage--;
      renderHistoryTable();
    }
  });
  pagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-link ${state.historyCurrentPage === i ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      state.historyCurrentPage = i;
      renderHistoryTable();
    });
    pagination.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = `page-link ${state.historyCurrentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.innerHTML = `&gt;`;
  nextBtn.addEventListener('click', () => {
    if (state.historyCurrentPage < totalPages) {
      state.historyCurrentPage++;
      renderHistoryTable();
    }
  });
  pagination.appendChild(nextBtn);

  // Tính toán các KPI
  await calculateHistoryKPIs();
}



function initHistoryControls() {
  const searchInput = document.getElementById('history-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.historySearchQuery = e.target.value;
      state.historyCurrentPage = 1;
      renderHistoryTable();
    });
  }

  const exportBtn = document.getElementById('history-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      let csvContent = "\uFEFF";
      csvContent += "MÃ MÁY,THỜI GIAN BẮT ĐẦU,THỜI GIAN KẾT THÚC,SẢN LƯỢNG THỰC TẾ,SẢN LƯỢNG TIÊU CHUẨN,HIỆU SUẤT,TRẠNG THÁI\r\n";
      
      historyData.forEach(r => {
        const strokesVal = parseInt(r.strokes.replace(/[\.,]/g, ''), 10);
        const isCompleted = strokesVal >= 1500;
        const statusStr = isCompleted ? "HOÀN THÀNH" : "CHƯA HOÀN THÀNH";
        const effPercent = Math.round((strokesVal / 1500) * 100);
        csvContent += `MÁY DẬP ${r.machineId},${r.start},${r.end},${r.strokes.replace(/[\.,]/g, '')},1500,${effPercent}%,${statusStr}\r\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bao_cao_lich_su_dap_may_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  const dateInput = document.getElementById('history-date-range');
  if (dateInput) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    flatpickr(dateInput, {
      mode: "range",
      dateFormat: "d/m/Y",
      defaultDate: [firstDayOfMonth, today],
      onReady: function(selectedDates) {
        if (selectedDates.length === 2) {
          state.historyStartDate = selectedDates[0];
          state.historyEndDate = selectedDates[1];
        }
      },
      onChange: function(selectedDates) {
        if (selectedDates.length === 2) {
          state.historyStartDate = selectedDates[0];
          state.historyEndDate = selectedDates[1];
        } else if (selectedDates.length === 0) {
          state.historyStartDate = null;
          state.historyEndDate = null;
        }
        state.historyCurrentPage = 1;
        renderHistoryTable();
      }
    });
  }

  const mainTypeFilter = document.getElementById('history-main-type-filter');
  if (mainTypeFilter) {
    mainTypeFilter.value = state.historyTypeFilter || 'stamping';
    mainTypeFilter.addEventListener('change', (e) => {
      state.historyTypeFilter = e.target.value;
      state.historyCurrentPage = 1;
      renderHistoryTable();
    });
  }

  const filterBtn = document.getElementById('history-filter-btn');
  const filterDropdown = document.getElementById('history-filter-dropdown');
  if (filterBtn && filterDropdown) {
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterDropdown.classList.toggle('hidden');
    });

    filterDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const applyBtn = document.getElementById('filter-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const statusRadio = document.querySelector('input[name="filter-status"]:checked');
        const qualityRadio = document.querySelector('input[name="filter-quality"]:checked');

        if (statusRadio) state.historyStatusFilter = statusRadio.value;
        if (qualityRadio) state.historyQualityFilter = qualityRadio.value;

        if (state.historyStatusFilter !== 'all' || state.historyQualityFilter !== 'all') {
          filterBtn.style.borderColor = 'var(--accent-blue)';
          filterBtn.style.color = 'var(--accent-blue)';
        } else {
          filterBtn.style.borderColor = '';
          filterBtn.style.color = '';
        }

        filterDropdown.classList.add('hidden');
        state.historyCurrentPage = 1;
        renderHistoryTable();
      });
    }

    const resetBtn = document.getElementById('filter-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaultStatus = document.querySelector('input[name="filter-status"][value="all"]');
        const defaultQuality = document.querySelector('input[name="filter-quality"][value="all"]');

        if (defaultStatus) defaultStatus.checked = true;
        if (defaultQuality) defaultQuality.checked = true;

        state.historyStatusFilter = 'all';
        state.historyQualityFilter = 'all';
        state.historyTypeFilter = 'stamping';
        if (mainTypeFilter) {
          mainTypeFilter.value = 'stamping';
        }

        filterBtn.style.borderColor = '';
        filterBtn.style.color = '';

        filterDropdown.classList.add('hidden');
        state.historyCurrentPage = 1;
        renderHistoryTable();
      });
    }
  }

  document.addEventListener('click', () => {
    if (filterDropdown) filterDropdown.classList.add('hidden');
  });
}

function generateProcessTimeline(r, lang) {
  const isRunning = (r.status === 'running' || r.status === 'completed' || r.status === 'active');

  // Parse start and end times
  const startParts = r.start.split(' ');
  const dateStr = startParts[0];
  const startTimeStr = startParts[1];
  const endTimeStr = r.end.split(' ')[1];

  const sh = parseInt(startTimeStr.split(':')[0], 10);
  const sm = parseInt(startTimeStr.split(':')[1], 10);
  const eh = parseInt(endTimeStr.split(':')[0], 10);
  const em = parseInt(endTimeStr.split(':')[1], 10);

  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const totalMins = endMins - startMins;

  const formatMinsToTime = (m) => {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    return `${h}:${min}`;
  };

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  let steps = [];

  if (isRunning) {
    steps = [
      {
        time: `${formatMinsToTime(startMins)} - ${formatMinsToTime(endMins)} (${formatDuration(totalMins)})`,
        status: lang === 'vi' ? 'HOÀN THÀNH (ĐANG CHẠY)' : 'COMPLETED (RUNNING)',
        statusClass: 'text-running',
        dotColor: '#00ff00',
        desc: lang === 'vi' ? 'Máy hoạt động' : 'Machine active'
      }
    ];
  } else {
    // 3 steps: Run -> Stopped -> Run
    const run1Mins = Math.floor(totalMins * 0.45);
    const stopMins = 30; // 30 mins stop
    const run2Mins = totalMins - run1Mins - stopMins;

    const t1_start = startMins;
    const t1_end = t1_start + run1Mins;
    const t2_start = t1_end;
    const t2_end = t2_start + stopMins;
    const t3_start = t2_end;
    const t3_end = endMins;

    steps = [
      {
        time: `${formatMinsToTime(t1_start)} - ${formatMinsToTime(t1_end)} (${formatDuration(run1Mins)})`,
        status: lang === 'vi' ? 'HOÀN THÀNH (ĐANG CHẠY)' : 'COMPLETED (RUNNING)',
        statusClass: 'text-running',
        dotColor: '#00ff00',
        desc: lang === 'vi' ? 'Máy hoạt động' : 'Machine active'
      },
      {
        time: `${formatMinsToTime(t2_start)} - ${formatMinsToTime(t2_end)} (${formatDuration(stopMins)})`,
        status: lang === 'vi' ? 'CHƯA HOÀN THÀNH (DỪNG MÁY)' : 'INCOMPLETE (STOPPED)',
        statusClass: 'text-stopped',
        dotColor: '#ff9800',
        desc: lang === 'vi' ? 'Máy dừng' : 'Machine stopped'
      },
      {
        time: `${formatMinsToTime(t3_start)} - ${formatMinsToTime(t3_end)} (${formatDuration(run2Mins)})`,
        status: lang === 'vi' ? 'HOÀN THÀNH (ĐANG CHẠY)' : 'COMPLETED (RUNNING)',
        statusClass: 'text-running',
        dotColor: '#00ff00',
        desc: lang === 'vi' ? 'Máy hoạt động' : 'Machine active'
      }
    ];
  }

  let html = `
    <div class="process-timeline-container" style="padding: 16px 24px; background: rgba(10, 18, 35, 0.95); border-radius: 12px; border: 1px solid var(--border-color); margin: 8px 12px;">
      <h4 style="margin: 0 0 16px 0; font-size: 0.85rem; color: var(--accent-cyan); letter-spacing: 0.5px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${lang === 'vi' ? 'CHUỖI QUÁ TRÌNH VẬN HÀNH CHI TIẾT (TÍNH TỔNG)' : 'DETAILED OPERATIONAL SEQUENCE (AGGREGATED)'}
      </h4>
      <div style="display: flex; flex-direction: column; gap: 16px; position: relative; padding-left: 20px; border-left: 2px dashed rgba(255, 255, 255, 0.15); margin-left: 8px;">
  `;

  steps.forEach(s => {
    html += `
      <div class="timeline-step-item" style="position: relative; padding-bottom: 4px;">
        <span class="timeline-dot" style="position: absolute; left: -26px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background-color: ${s.dotColor}; box-shadow: 0 0 8px ${s.dotColor};"></span>
        <div style="font-size: 0.82rem; color: #fff; font-weight: 600; margin-bottom: 2px;">
          <span>${s.time}</span>
        </div>
        <p style="margin: 0; font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4;">${s.desc}</p>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

async function calculateHistoryKPIs() {
  let lang = 'vi';
  try {
    lang = (typeof state !== 'undefined' && state.language) ? state.language : 'vi';
  } catch (e) {}
  
  // Safe dynamic machinesCount calculation from state
  let machinesCount = 11;
  let activeType = 'stamping';
  try {
    activeType = (typeof state !== 'undefined' && state.historyTypeFilter) ? state.historyTypeFilter : 'stamping';
    const machinesList = (typeof machinesData !== 'undefined' && machinesData) ? Object.values(machinesData) : [];
    if (machinesList.length > 0) {
      const filtered = machinesList.filter(m => {
        const isMonitored = m.isMonitored === true || m.isMonitored === 1 || m.IsMonitored === true || m.IsMonitored === 1;
        if (!isMonitored) return false;
        const typeStr = (m.deviceType || m.type || "").toUpperCase();
        if (activeType === 'heading') {
          return typeStr === 'MÁY ĐẤM VÍT' || typeStr === 'SCREW_HEADING' || typeStr === 'HEADING';
        } else if (activeType === 'threading') {
          return typeStr === 'MÁY REN VÍT' || typeStr === 'SCREW_THREADING' || typeStr === 'THREADING';
        } else {
          return typeStr === 'MÁY DẬP' || typeStr === 'STAMPING';
        }
      });
      if (filtered.length > 0) {
        machinesCount = filtered.length;
      } else {
        machinesCount = activeType === 'heading' ? 15 : (activeType === 'threading' ? 2 : 11);
      }
    } else {
      machinesCount = activeType === 'heading' ? 15 : (activeType === 'threading' ? 2 : 11);
    }
  } catch (e) {
    machinesCount = activeType === 'heading' ? 15 : (activeType === 'threading' ? 2 : 11);
  }

  // Helpers to format and divide time/strokes by machines count
  function divideTimeStr(timeStr, divisor) {
    if (!timeStr) return "00:00:00";
    const parts = timeStr.split(':');
    if (parts.length < 3) return "00:00:00";
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    const totalSeconds = h * 3600 + m * 60 + s;
    const avgSeconds = Math.round(totalSeconds / divisor);
    const avgH = Math.floor(avgSeconds / 3600);
    const avgM = Math.floor((avgSeconds % 3600) / 60);
    const avgS = avgSeconds % 60;
    return `${avgH.toString().padStart(2, '0')}:${avgM.toString().padStart(2, '0')}:${avgS.toString().padStart(2, '0')}`;
  }

  function divideStrokesStr(strokesStr, divisor, locale) {
    if (!strokesStr) return "0";
    const val = parseInt(strokesStr.replace(/[\.,]/g, ''), 10) || 0;
    const avg = Math.round(val / divisor);
    if (locale === 'vi') {
      return avg.toLocaleString('vi-VN');
    } else {
      return avg.toLocaleString('en-US');
    }
  }

  let dayRatio = divideTimeStr("51:41:00", machinesCount);
  let weekRatio = divideTimeStr("32:05:00", machinesCount);
  let monthRatio = divideTimeStr("140:50:00", machinesCount);

  let dayYield = divideStrokesStr("18.705", machinesCount, lang);
  let weekYield = divideStrokesStr("13.410", machinesCount, lang);
  let monthYield = divideStrokesStr("51.010", machinesCount, lang);

  let dayOeeTrendStr = "+2.1%";
  let dayOeeTrendUp = true;
  let dayYieldTrendStr = "+1.8%";
  let dayYieldTrendUp = true;

  let weekOeeTrendStr = "+1.5%";
  let weekOeeTrendUp = true;
  let weekYieldTrendStr = "+2.3%";
  let weekYieldTrendUp = true;

  let monthOeeTrendStr = "+0.8%";
  let monthOeeTrendUp = true;
  let monthYieldTrendStr = "+1.2%";
  let monthYieldTrendUp = true;

  try {
    let machineFilterParam = 'all_stamping';
    if (activeType === 'heading') {
      machineFilterParam = 'all_heading';
    } else if (activeType === 'threading') {
      machineFilterParam = 'all_threading';
    }
    const dayRes = await fetch(`${window.basePath || ''}Api/GetReportData?range=day&machineId=${machineFilterParam}`);
    const dayJson = await dayRes.json();
    if (dayJson.success) {
      dayRatio = divideTimeStr(dayJson.runTimeStr, machinesCount) || divideTimeStr("51:41:00", machinesCount);
      dayYield = divideStrokesStr(dayJson.actualStrokesStr, machinesCount, lang);
      dayOeeTrendStr = dayJson.oeeChangeStr || "+2.1%";
      dayOeeTrendUp = dayJson.oeeTrendUp !== false;
      dayYieldTrendStr = dayJson.yieldChangeStr || "+1.8%";
      dayYieldTrendUp = dayJson.yieldTrendUp !== false;
    }
    
    const weekRes = await fetch(`${window.basePath || ''}Api/GetReportData?range=week&machineId=${machineFilterParam}`);
    const weekJson = await weekRes.json();
    if (weekJson.success) {
      weekRatio = divideTimeStr(weekJson.runTimeStr, machinesCount) || divideTimeStr("32:05:00", machinesCount);
      weekYield = divideStrokesStr(weekJson.actualStrokesStr, machinesCount, lang);
      weekOeeTrendStr = weekJson.oeeChangeStr || "+1.5%";
      weekOeeTrendUp = weekJson.oeeTrendUp !== false;
      weekYieldTrendStr = weekJson.yieldChangeStr || "+2.3%";
      weekYieldTrendUp = weekJson.yieldTrendUp !== false;
    }

    const monthRes = await fetch(`${window.basePath || ''}Api/GetReportData?range=month&machineId=${machineFilterParam}`);
    const monthJson = await monthRes.json();
    if (monthJson.success) {
      monthRatio = divideTimeStr(monthJson.runTimeStr, machinesCount) || divideTimeStr("140:50:00", machinesCount);
      monthYield = divideStrokesStr(monthJson.actualStrokesStr, machinesCount, lang);
      monthOeeTrendStr = monthJson.oeeChangeStr || "+0.8%";
      monthOeeTrendUp = monthJson.oeeTrendUp !== false;
      monthYieldTrendStr = monthJson.yieldChangeStr || "+1.2%";
      monthYieldTrendUp = monthJson.yieldTrendUp !== false;
    }
  } catch (err) {
    console.warn("Failed to fetch history KPIs from database, using fallback", err);
  }

  const dayValEl = document.getElementById('history-kpi-day-val');
  const weekValEl = document.getElementById('history-kpi-week-val');
  const monthValEl = document.getElementById('history-kpi-month-val');

  const dayYieldEl = document.getElementById('history-kpi-day-yield');
  const weekYieldEl = document.getElementById('history-kpi-week-yield');
  const monthYieldEl = document.getElementById('history-kpi-month-yield');

  if (dayValEl) dayValEl.textContent = dayRatio;
  if (weekValEl) weekValEl.textContent = weekRatio;
  if (monthValEl) monthValEl.textContent = monthRatio;

  if (dayYieldEl) dayYieldEl.textContent = dayYield;
  if (weekYieldEl) weekYieldEl.textContent = weekYield;
  if (monthYieldEl) monthYieldEl.textContent = monthYield;

  // Cập nhật trend cards
  const isVi = lang === 'vi';
  const subDay = isVi ? 'so với hôm qua' : 'vs yesterday';
  const subWeek = isVi ? 'so với tuần trước' : 'vs last week';
  const subMonth = isVi ? 'so với tháng trước' : 'vs last month';

  function updateTrendElement(elementId, trendStr, isUp, subText) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `h-kpi-trend ${isUp ? 'trend-up' : 'trend-down'}`;
    const arrowSvg = isUp 
      ? `<svg class="trend-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`
      : `<svg class="trend-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="7" x2="7" y2="17"></line><polyline points="17 17 7 17 7 7"></polyline></svg>`;
    el.innerHTML = `${arrowSvg}<span>${trendStr} <span>${subText}</span></span>`;
  }

  updateTrendElement('history-kpi-day-trend', dayOeeTrendStr, dayOeeTrendUp, subDay);
  updateTrendElement('history-kpi-week-trend', weekOeeTrendStr, weekOeeTrendUp, subWeek);
  updateTrendElement('history-kpi-month-trend', monthOeeTrendStr, monthOeeTrendUp, subMonth);

  updateTrendElement('history-kpi-day-yield-trend', dayYieldTrendStr, dayYieldTrendUp, subDay);
  updateTrendElement('history-kpi-week-yield-trend', weekYieldTrendStr, weekYieldTrendUp, subWeek);
  updateTrendElement('history-kpi-month-yield-trend', monthYieldTrendStr, monthYieldTrendUp, subMonth);
}


