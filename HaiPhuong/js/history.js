function renderHistoryTable() {
  const tableBody = document.getElementById('history-table-body');
  const tableInfo = document.getElementById('history-table-info');
  const pagination = document.getElementById('history-pagination');
  if (!tableBody || !tableInfo || !pagination) return;

  tableBody.innerHTML = '';
  
  const query = state.historySearchQuery.toLowerCase().trim();
  const filteredRecords = historyData.filter(r => {
    const machineName = `Máy số ${r.machineId}`.toLowerCase();
    const machineIdStr = `máy dập ${r.machineId}`.toLowerCase();
    const matchesSearch = r.machineId.includes(query) || machineName.includes(query) || machineIdStr.includes(query);

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

    const strokesVal = parseInt(r.strokes.replace('.', ''), 10);
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

    return matchesSearch && matchesDate && matchesStatus && matchesQuality;
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
        <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-secondary);">
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
    const strokesVal = parseInt(r.strokes.replace('.', ''), 10);
    const isCompleted = strokesVal >= 1500;
    const statusText = isCompleted 
      ? (translations[lang].status_completed || 'HOÀN THÀNH') 
      : (translations[lang].status_incomplete || 'CHƯA HOÀN THÀNH');
    const badgeClass = isCompleted ? 'badge-success' : 'badge-danger';
    
    const effPercent = Math.round((strokesVal / 1500) * 100);
    const progressWidth = Math.min(100, effPercent);
    const progressColorClass = effPercent >= 90 ? 'green' : 'orange';

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    const pressText = lang === 'vi' ? 'MÁY DẬP' : 'PRESS';
    tr.innerHTML = `
      <td>
        <span style="font-weight: 700;">${pressText} ${r.machineId}</span>
      </td>
      <td>${r.start}</td>
      <td>${r.end}</td>
      <td style="font-weight: 700; color: #fff; text-align: center;">${r.strokes}</td>
      <td style="font-weight: 700; color: #fff; text-align: center;">1.500</td>
      <td>
        <div class="td-progress-bg">
          <div class="td-progress-fill ${progressColorClass}" style="width: ${progressWidth}%"></div>
        </div>
        <span class="td-progress-text">${effPercent}%</span>
      </td>
      <td style="text-align: center;">
        <span class="${badgeClass}">${statusText}</span>
      </td>
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
      <td colspan="8" style="padding: 0; background: transparent; border-top: none;">
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
        const strokesVal = parseInt(r.strokes.replace('.', ''), 10);
        const isCompleted = strokesVal >= 1500;
        const statusStr = isCompleted ? "HOÀN THÀNH" : "CHƯA HOÀN THÀNH";
        const effPercent = Math.round((strokesVal / 1500) * 100);
        csvContent += `MÁY DẬP ${r.machineId},${r.start},${r.end},${r.strokes.replace('.', '')},1500,${effPercent}%,${statusStr}\r\n`;
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
    flatpickr(dateInput, {
      mode: "range",
      dateFormat: "d/m/Y",
      defaultDate: ["25/06/2026", "09/07/2026"],
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
  const totalStrokes = parseInt(r.strokes.replace('.', ''), 10);
  const totalEff = Math.round((totalStrokes / 1500) * 100);
  const isRunning = r.status === 'running';

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
    // 3 steps: Run -> Tool change / Material shortage -> Run
    const run1Mins = Math.floor(totalMins * 0.45);
    const stopMins = 30; // 30 mins stop
    const run2Mins = totalMins - run1Mins - stopMins;

    const t1_start = startMins;
    const t1_end = t1_start + run1Mins;
    const t2_start = t1_end;
    const t2_end = t2_start + stopMins;
    const t3_start = t2_end;
    const t3_end = endMins;

    const strokes1 = Math.floor(totalStrokes * 0.5);
    const strokes2 = 0;
    const strokes3 = totalStrokes - strokes1;

    const eff1 = Math.floor(totalEff * 0.5);
    const eff2 = 0;
    const eff3 = totalEff - eff1;

    steps = [
      {
        time: `${formatMinsToTime(t1_start)} - ${formatMinsToTime(t1_end)} (${formatDuration(run1Mins)})`,
        status: lang === 'vi' ? 'HOÀN THÀNH (ĐANG CHẠY)' : 'COMPLETED (RUNNING)',
        statusClass: 'text-running',
        dotColor: '#00ff00',
        desc: lang === 'vi' ? `Nhịp dập ổn định ca sáng. Sản lượng: ${strokes1.toLocaleString('vi-VN')} lần. Hiệu suất: ${eff1}%.` : `Morning run. Yield: ${strokes1.toLocaleString('en-US')}. Efficiency: ${eff1}%.`
      },
      {
        time: `${formatMinsToTime(t2_start)} - ${formatMinsToTime(t2_end)} (${formatDuration(stopMins)})`,
        status: lang === 'vi' ? 'CHƯA HOÀN THÀNH (DỪNG MÁY)' : 'INCOMPLETE (STOPPED)',
        statusClass: 'text-stopped',
        dotColor: '#ff9800',
        desc: lang === 'vi' ? `Tạm dừng cấp phôi nguyên liệu cuộn. Sản lượng: ${strokes2} lần. Hiệu suất: ${eff2}%.` : `Material replacement downtime. Yield: ${strokes2}. Efficiency: ${eff2}%.`
      },
      {
        time: `${formatMinsToTime(t3_start)} - ${formatMinsToTime(t3_end)} (${formatDuration(run2Mins)})`,
        status: lang === 'vi' ? 'HOÀN THÀNH (ĐANG CHẠY)' : 'COMPLETED (RUNNING)',
        statusClass: 'text-running',
        dotColor: '#00ff00',
        desc: lang === 'vi' ? `Nhịp dập tăng tốc hoàn thành ca. Sản lượng: ${strokes3.toLocaleString('vi-VN')} lần. Hiệu suất: ${eff3}%.` : `Afternoon run. Yield: ${strokes3.toLocaleString('en-US')}. Efficiency: ${eff3}%.`
      }
    ];
  } else {
    // 3 steps: Run -> Sudden power outage stop -> Run
    const run1Mins = Math.floor(totalMins * 0.4);
    const stopMins = 120; // 2 hours outage
    const run2Mins = totalMins - run1Mins - stopMins;

    const t1_start = startMins;
    const t1_end = t1_start + run1Mins;
    const t2_start = t1_end;
    const t2_end = t2_start + stopMins;
    const t3_start = t2_end;
    const t3_end = endMins;

    const strokes1 = Math.floor(totalStrokes * 0.6);
    const strokes2 = 0;
    const strokes3 = totalStrokes - strokes1;

    const eff1 = Math.floor(totalEff * 0.6);
    const eff2 = 0;
    const eff3 = totalEff - eff1;

    steps = [
      {
        time: `${formatMinsToTime(t1_start)} - ${formatMinsToTime(t1_end)} (${formatDuration(run1Mins)})`,
        status: lang === 'vi' ? 'HOÀN THÀNH (ĐANG CHẠY)' : 'COMPLETED (RUNNING)',
        statusClass: 'text-running',
        dotColor: '#00ff00',
        desc: lang === 'vi' ? `Nhịp dập ổn định ban đầu. Sản lượng: ${strokes1.toLocaleString('vi-VN')} lần. Hiệu suất: ${eff1}%.` : `Initial stamping run. Yield: ${strokes1.toLocaleString('en-US')}. Efficiency: ${eff1}%.`
      },
      {
        time: `${formatMinsToTime(t2_start)} - ${formatMinsToTime(t2_end)} (${formatDuration(stopMins)})`,
        status: lang === 'vi' ? 'CHƯA HOÀN THÀNH (DỪNG MÁY)' : 'INCOMPLETE (STOPPED)',
        statusClass: 'text-stopped',
        dotColor: '#ef4444',
        desc: lang === 'vi' ? `Tạm dừng vận hành thiết bị. Sản lượng: ${strokes2} lần. Hiệu suất: ${eff2}%.` : `Machine operation stopped. Yield: ${strokes2}. Efficiency: ${eff2}%.`
      },
      {
        time: `${formatMinsToTime(t3_start)} - ${formatMinsToTime(t3_end)} (${formatDuration(run2Mins)})`,
        status: lang === 'vi' ? 'HOÀN THÀNH (ĐANG CHẠY)' : 'COMPLETED (RUNNING)',
        statusClass: 'text-running',
        dotColor: '#00ff00',
        desc: lang === 'vi' ? `Vận hành trở lại sau thời gian dừng máy. Sản lượng: ${strokes3.toLocaleString('vi-VN')} lần. Hiệu suất: ${eff3}%.` : `Resumed run post-stop. Yield: ${strokes3.toLocaleString('en-US')}. Efficiency: ${eff3}%.`
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
