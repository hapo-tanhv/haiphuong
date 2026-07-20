function updateActiveMachineDetails(machineId) {
  // Biểu đồ 'SẢN LƯỢNG THỰC TẾ THEO THỜI GIAN' luôn tính tổng số lần dập của cả 10 máy cộng lại
  renderTotalTrendChart();
  updateOverviewKPIs();
}

function getTotalValueY(value) {
  const maxY = 20;
  const minY = 90;
  const maxValue = 100; // 100% efficiency
  const safeVal = Math.max(value, 0); // Allow values to go slightly over 100%
  return minY - (safeVal / maxValue) * (minY - maxY);
}

function renderTotalTrendChart() {
  const fillPath = document.getElementById('chart-fill-path');
  const trendPath = document.getElementById('chart-trend-path');
  const dots = document.querySelectorAll('.trend-chart-svg circle');

  const lang = state.language || 'vi';
  const overviewType = state.overviewType || 'stamping';
  const activeMachines = Object.values(machinesData).filter(m => m.type === overviewType);
  let totalTrend = [0, 0, 0, 0];

  if (activeMachines.length > 0) {
    const profile = [0.75, 0.9, 1.05, 0.98];
    for (let i = 0; i < 4; i++) {
      let sumEff = 0;
      activeMachines.forEach(m => {
        const individualTimeEff = parseFloat(m.timeEfficiency) || 64.6;
        sumEff += individualTimeEff * profile[i];
      });
      totalTrend[i] = Math.min(100, Math.max(0, sumEff / activeMachines.length));
    }
  }

  const y0 = getTotalValueY(totalTrend[0]);
  const y1 = getTotalValueY(totalTrend[1]);
  const y2 = getTotalValueY(totalTrend[2]);
  const y3 = getTotalValueY(totalTrend[3]);

  const pathD = `M 40,${y0} C 75,${y0} 75,${y1} 110,${y1} C 145,${y1} 145,${y2} 180,${y2} C 215,${y2} 215,${y3} 250,${y3}`;
  const fillD = `${pathD} L 250,90 L 40,90 Z`;

  if (trendPath) trendPath.setAttribute('d', pathD);
  if (fillPath) fillPath.setAttribute('d', fillD);

  if (dots.length === 4) {
    dots[0].setAttribute('cy', y0.toString());
    dots[1].setAttribute('cy', y1.toString());
    dots[2].setAttribute('cy', y2.toString());
    dots[3].setAttribute('cy', y3.toString());

    // Update native svg title tooltips
    const t0 = document.getElementById('chart-dot-0-title');
    const t1 = document.getElementById('chart-dot-1-title');
    const t2 = document.getElementById('chart-dot-2-title');
    const t3 = document.getElementById('chart-dot-3-title');

    const label = lang === 'vi' ? 'Hiệu suất thời gian' : 'Time Efficiency';
    if (t0) t0.textContent = `${label} 07:00: ${totalTrend[0].toFixed(1)}%`;
    if (t1) t1.textContent = `${label} 10:00: ${totalTrend[1].toFixed(1)}%`;
    if (t2) t2.textContent = `${label} 13:00: ${totalTrend[2].toFixed(1)}%`;
    if (t3) t3.textContent = `${label} 16:00: ${totalTrend[3].toFixed(1)}%`;
  }
}

// Hàm cập nhật động các chỉ số KPIs trên màn hình tổng quan theo loại máy dập/vít
function updateOverviewKPIs() {
  const lang = state.language || 'vi';
  const overviewType = state.overviewType || 'stamping';
  const activeMachines = Object.values(machinesData).filter(m => m.type === overviewType);
  if (activeMachines.length === 0) return;

  const totalStrokes = activeMachines.reduce((sum, m) => sum + parseFloat((m.strokes || '0').replace(/[\.,]/g, '')), 0);
  const totalOrder = activeMachines.reduce((sum, m) => sum + parseFloat((m.totalOrder || '0').replace(/[\.,]/g, '')), 0);

  const totalRunSec = activeMachines.reduce((sum, m) => sum + timeToSeconds(m.runtime), 0);
  const totalTrialSec = activeMachines.reduce((sum, m) => sum + timeToSeconds(m.trialTime), 0);

  let totalEstMinutes = 0;
  activeMachines.forEach(m => {
    const speedAttr = overviewType === 'screw' 
      ? (m.attributes && m.attributes.toc_do_may) 
      : (m.attributes && m.attributes.toc_do_dap);
    const speedMatch = (speedAttr || '').match(/\d+/);
    const speed = speedMatch ? parseInt(speedMatch[0], 10) : (overviewType === 'screw' ? 180 : 55);
    
    const targetVal = parseFloat((m.totalOrder || '0').replace(/\./g, '').replace(/,/g, '')) || 0;
    if (speed > 0) {
      totalEstMinutes += targetVal / speed;
    }
  });

  const totalRuntimeStr = secondsToTime(totalRunSec);
  const totalTrialtimeStr = secondsToTime(totalTrialSec);
  const totalEstTimeStr = secondsToTime(Math.round(totalEstMinutes * 60));

  const runningCount = activeMachines.filter(m => m.status === 'running').length;
  const stoppedCount = activeMachines.filter(m => m.status === 'stopped').length;

  const avgPlanEff = (activeMachines.reduce((sum, m) => sum + parseFloat(m.efficiency), 0) / activeMachines.length).toFixed(1);
  const avgTimeEff = (activeMachines.reduce((sum, m) => sum + parseFloat(m.timeEfficiency), 0) / activeMachines.length).toFixed(1);

  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const activeTitle = document.querySelector('.kpi-panel-left .panel-title-custom');
  if (activeTitle) {
    activeTitle.textContent = 
      overviewType === 'stamping' ? (lang === 'vi' ? 'MÁY DẬP ĐANG CHỌN' : 'SELECTED STAMPING MACHINE') :
      overviewType === 'heading' ? (lang === 'vi' ? 'MÁY ĐẤM VÍT ĐANG CHỌN' : 'SELECTED HEADING MACHINE') :
      overviewType === 'threading' ? (lang === 'vi' ? 'MÁY REN VÍT ĐANG CHỌN' : 'SELECTED THREADING MACHINE') :
      (lang === 'vi' ? 'MÁY VÍT ĐANG CHỌN' : 'SELECTED SCREW MACHINE');
  }

  const gaugeVal = document.querySelector('.gauge-value-custom');
  if (gaugeVal) {
    gaugeVal.innerHTML = `${avgPlanEff}<span class="percent-sign">%</span>`;
  }
  
  const gaugeFill = document.querySelector('.gauge-fill-custom');
  if (gaugeFill) {
    const maxDash = 220;
    const offset = maxDash - (avgPlanEff / 100) * maxDash;
    gaugeFill.setAttribute('stroke-dashoffset', offset.toString());
  }

  const dailyStrokesEl = document.getElementById('system-daily-strokes');
  if (dailyStrokesEl) {
    const isScrewUnit = overviewType !== 'stamping';
    const unit = lang === 'vi' ? (isScrewUnit ? ' vòng' : ' lần') : (isScrewUnit ? ' rot' : ' str');
    dailyStrokesEl.innerHTML = `${formatNumber(totalStrokes)} <span class="sub-stat-unit">${unit}</span>`;
  }

  const actualStrokesEl = document.getElementById('system-actual-strokes');
  if (actualStrokesEl) {
    const isScrewUnit = overviewType !== 'stamping';
    const unit = lang === 'vi' ? (isScrewUnit ? ' vòng' : ' lần') : (isScrewUnit ? ' rot' : ' str');
    actualStrokesEl.innerHTML = `${formatNumber(totalStrokes)} <span class="sub-stat-unit">${unit}</span>`;
  }

  const totalOrderEl = document.getElementById('system-total-order');
  if (totalOrderEl) {
    const isScrewUnit = overviewType !== 'stamping';
    const unit = lang === 'vi' ? (isScrewUnit ? ' vòng' : ' lần') : (isScrewUnit ? ' rot' : ' str');
    totalOrderEl.innerHTML = `${formatNumber(totalOrder)} <span class="sub-stat-unit">${unit}</span>`;
  }

  const avgTrialSec = activeMachines.length > 0 ? Math.round(totalTrialSec / activeMachines.length) : 0;
  const avgRunSec = activeMachines.length > 0 ? Math.round(totalRunSec / activeMachines.length) : 0;
  const avgProdSec = Math.max(0, avgRunSec - avgTrialSec);

  const trialTimeEl = document.getElementById('system-trial-time');
  if (trialTimeEl) {
    trialTimeEl.textContent = secondsToTime(avgTrialSec);
  }

  const productionTimeEl = document.getElementById('system-production-time');
  if (productionTimeEl) {
    productionTimeEl.textContent = secondsToTime(avgProdSec);
  }

  const runningTimeEl = document.getElementById('system-running-time');
  if (runningTimeEl) {
    runningTimeEl.textContent = secondsToTime(avgRunSec);
  }

  const runningBox = document.querySelector('.status-box.box-running .status-box-val');
  if (runningBox) {
    const unit = lang === 'vi' ? 'máy' : 'pcs';
    runningBox.innerHTML = `<span style="color: #00d2ff;">${runningCount}</span> / ${activeMachines.length} <span class="unit">${unit}</span>`;
  }

  const stoppedBox = document.querySelector('.status-box.box-stopped .status-box-val');
  if (stoppedBox) {
    const unit = lang === 'vi' ? 'máy' : 'pcs';
    stoppedBox.innerHTML = `<span style="color: #00d2ff;">${stoppedCount}</span> / ${activeMachines.length} <span class="unit">${unit}</span>`;
  }

  const planEffAvgEl = document.getElementById('overview-plan-efficiency-avg');
  if (planEffAvgEl) {
    planEffAvgEl.textContent = `${avgPlanEff}%`;
  }

  const timeEffAvgEl = document.getElementById('overview-time-efficiency-avg');
  if (timeEffAvgEl) {
    timeEffAvgEl.textContent = `${avgTimeEff}%`;
  }

  const chartTitle = document.querySelector('.chart-title-custom');
  if (chartTitle) {
    chartTitle.textContent = lang === 'vi' ? 'HIỆU SUẤT THỜI GIAN' : 'TIME EFFICIENCY';
  }
}

// Helper to parse hh:mm:ss to seconds
function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
}

// Helper to format seconds to hh:mm:ss
function secondsToTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 5. Logic render danh sách Máy dập / Máy vít trên Grid lưới
function renderOverviewGrid() {
  const container = document.getElementById('overview-machine-grid');
  if (!container) return;

  const lang = state.language || 'vi';
  const overviewType = state.overviewType || 'stamping';
  const query = (state.overviewSearchQuery || '').toLowerCase().trim();
  container.innerHTML = '';

  Object.keys(machinesData).sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).forEach(id => {
    const m = machinesData[id];
    
    // Chỉ render các máy thuộc loại đang hiển thị
    if (m.type !== overviewType) return;

    // Tìm kiếm theo máy, theo sản phẩm, hoặc theo lệnh sản xuất
    if (query !== '') {
      const matchMachine = id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query);
      const matchProduct = (m.productName || '').toLowerCase().includes(query) || (m.productCode || '').toLowerCase().includes(query) || (m.sp || '').toLowerCase().includes(query);
      const matchOrder = (m.order || '').toLowerCase().includes(query);
      if (!matchMachine && !matchProduct && !matchOrder) return;
    }

    const isSelected = (state.selectedMachineId === id) ? 'selected' : '';
    const statusClass = m.status === 'running' ? 'running' : 'stopped';
    const textClass = m.status === 'running' ? 'text-running' : 'text-stopped';
    const statusText = m.status === 'running' 
      ? (lang === 'vi' ? 'ĐANG HOẠT ĐỘNG' : 'RUNNING') 
      : (lang === 'vi' ? 'MÁY DỪNG' : 'STOPPED');

    // Parse counts
    const strokesNum = parseFloat(m.strokes.replace(/[\.,]/g, ''));
    const totalOrderNum = parseFloat(m.totalOrder.replace(/[\.,]/g, ''));
    const orderActualNum = parseFloat((m.orderActual || '0').replace(/[\.,]/g, ''));
    
    const effPct = m.efficiency;
    const orderPct = totalOrderNum > 0 ? ((orderActualNum / totalOrderNum) * 100).toFixed(1) + '%' : '0%';

    // Cấu hình ca và kiểm tra cảnh báo chạy ngoài giờ
    const runSec = timeToSeconds(m.runtime);
    const shiftSec = (m.shiftHours || 8) * 3600;
    const isOvertimeWarning = m.status === 'running' && runSec > shiftSec && !m.overtimeRegistered;

    // Kiểm tra cảnh báo đạt kế hoạch: chỉ khi có kế hoạch và sản lượng đã đạt/vượt kế hoạch
    const isCompletedWarning = totalOrderNum > 0 && orderActualNum >= totalOrderNum;

    // Trigger cảnh báo ngoài giờ và lưu vào Alert Data
    if (isOvertimeWarning) {
      const alarmExists = alarmsData.some(a => a.id === `ot-${id}`);
      if (!alarmExists) {
        alarmsData.push({
          id: `ot-${id}`,
          machineId: id,
          machineName: m.name,
          time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
          message: lang === 'vi' 
            ? `${m.name} chạy ngoài giờ không có đăng ký tăng ca!` 
            : `${m.name} running overtime without registration!`,
          severity: 'critical',
          status: 'unresolved'
        });
      }
    }

    const card = document.createElement('div');
    card.className = `machine-grid-card ${isSelected} ${isCompletedWarning ? 'completed-warning' : ''} ${isOvertimeWarning ? 'overtime-warning' : ''}`;
    card.setAttribute('data-machine-id', id);

    // Tính tỷ lệ chạy thử / thời gian sản xuất
    const trialSec = timeToSeconds(m.trialTime);
    const trialRatio = runSec > 0 ? ((trialSec / runSec) * 100).toFixed(1) : '0.0';
    const prodSec = Math.max(0, runSec - trialSec);
    const prodRatio = runSec > 0 ? ((prodSec / runSec) * 100).toFixed(1) : '0.0';

    // Tính Thời gian còn lại ước tính hoàn thành (Chỉ số 7)
    let estTimeStr = lang === 'vi' ? 'Không xác định' : 'N/A';
    if (m.status === 'running') {
      const speedAttr = overviewType === 'screw' 
        ? (m.attributes && m.attributes.toc_do_may) 
        : (m.attributes && m.attributes.toc_do_dap);
      const speedMatch = (speedAttr || '').match(/\d+/);
      const speed = speedMatch ? parseInt(speedMatch[0], 10) : (overviewType === 'screw' ? 180 : 55);
      
      const targetVal = parseFloat((m.dailyTarget || '0').replace(/\./g, '').replace(/,/g, '')) || 0;
      const strokesVal = parseFloat((m.strokes || '0').replace(/\./g, '').replace(/,/g, '')) || 0;
      const remaining = Math.max(0, targetVal - strokesVal);
      
      if (speed > 0) {
        const remainingSeconds = Math.round((remaining / speed) * 60);
        estTimeStr = secondsToTime(remainingSeconds);
      }
    }

    card.innerHTML = `
      <div class="card-id-badge">${id}</div>
      <div class="machine-card-content">
        <div class="machine-card-header-row">
          <h4 class="machine-card-name">${
            lang === 'vi' 
              ? (overviewType === 'stamping' ? `MÁY DẬP ${id}` : overviewType === 'heading' ? `MÁY ĐẤM VÍT ${id}` : `MÁY REN VÍT ${id}`) 
              : (overviewType === 'stamping' ? `PRESS #${id}` : overviewType === 'heading' ? `HEADING #${id}` : `THREADING #${id}`)
          }</h4>
          <div class="machine-card-status">
            <span class="status-indicator-dot ${statusClass}"></span>
            <span class="status-text ${textClass}">${statusText}</span>
          </div>
        </div>
        
        <div class="machine-card-subtitle">
          <span class="subtitle-sp">SP: ${m.sp}</span>
          <span class="subtitle-divider">|</span>
          <span class="subtitle-order">${lang === 'vi' ? 'Lệnh' : 'Order'}: ${m.order}</span>
        </div>

        ${isOvertimeWarning ? `<div class="overtime-badge-flash">🚨 CHẠY NGOÀI GIỜ CHƯA ĐĂNG KÝ</div>` : ''}
        ${isCompletedWarning ? `<div class="completed-badge-flash">✅ ĐẠT KẾ HOẠCH - DỪNG SX</div>` : ''}
        
        <div class="machine-card-body-row">
          <div class="machine-card-metrics-list">
            <!-- Chỉ số 1 -->
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-1">1</span> <span class="metric-val">${m.strokes}</span></span>
              </div>
              <div class="metric-desc" style="display: block; margin-top: 2px; font-size: 0.75rem; color: var(--text-secondary);">${lang === 'vi' ? 'Sản lượng ngày' : 'Daily Yield'}</div>
            </div>
            
            <!-- Chỉ số 2 -->
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-2">2</span> <span class="metric-val">${m.orderActual || '0'}</span> / <span class="metric-val-base">${m.totalOrder}</span></span>
                <span class="metric-pct">${orderPct}</span>
              </div>
              <div class="metric-desc" style="display: block; margin-top: 2px; font-size: 0.75rem; color: var(--text-secondary);">${lang === 'vi' ? 'Sản lượng thực tế / Lệnh sản xuất' : 'Actual Yield / Production Order'}</div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${orderPct}"></div>
              </div>
            </div>
            
            <!-- Chỉ số 4 -->
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-4">4</span> <span class="metric-val">${m.runtime}</span> / <span class="metric-val-base">${m.runtimeMax}</span></span>
                <span class="metric-pct">${m.timeEfficiency}</span>
              </div>
              <div class="metric-desc" style="display: block; margin-top: 2px; font-size: 0.75rem; color: var(--text-secondary);">${lang === 'vi' ? 'Thời gian máy chạy / Thời gian ca' : 'Runtime / Shift Time'}</div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${m.timeEfficiency}"></div>
              </div>
            </div>

            <!-- Chỉ số 5 -->
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-5">5</span> <span class="metric-val">${m.trialTime}</span> / <span class="metric-val-base">${m.runtime}</span></span>
                <span class="metric-pct">${trialRatio}%</span>
              </div>
              <div class="metric-desc" style="display: block; margin-top: 2px; font-size: 0.75rem; color: var(--text-secondary);">${lang === 'vi' ? 'Thời gian chạy thử / Thời gian máy chạy' : 'Trial Run / Production Time'}</div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${runSec > 0 ? Math.min(100, (trialSec / runSec) * 100).toFixed(1) + '%' : '0%'}"></div>
              </div>
            </div>

            <!-- Chỉ số 6 -->
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-6">6</span> <span class="metric-val">${secondsToTime(Math.max(0, runSec - trialSec))}</span> / <span class="metric-val-base">${m.runtime}</span></span>
                <span class="metric-pct">${prodRatio}%</span>
              </div>
              <div class="metric-desc" style="display: block; margin-top: 2px; font-size: 0.75rem; color: var(--text-secondary);">${lang === 'vi' ? 'Thời gian sản xuất / Thời gian máy chạy' : 'Production Time / Machine Runtime'}</div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${prodRatio}%"></div>
              </div>
            </div>

            <!-- Chỉ số 7 -->
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-7">7</span> <span class="metric-val">${estTimeStr}</span></span>
              </div>
              <div class="metric-desc" style="display: block; margin-top: 2px; font-size: 0.75rem; color: var(--text-secondary);">${lang === 'vi' ? 'Thời gian còn lại ước tính' : 'Estimated Completion'}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      if (typeof showMachineDetail === 'function') {
        showMachineDetail(id);
      }
    });

    container.appendChild(card);
  });
}

function initMachineSelection() {
  renderOverviewGrid();

  const searchInput = document.getElementById('overview-search-input');
  if (searchInput) {
    searchInput.value = state.overviewSearchQuery || '';
    searchInput.oninput = (e) => {
      state.overviewSearchQuery = e.target.value;
      renderOverviewGrid();
    };
  }
}

// 5.1. Render danh sách máy dập và chức năng tìm kiếm lọc động (Task 5.6)