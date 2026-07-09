function updateActiveMachineDetails(machineId) {
  // Biểu đồ 'SẢN LƯỢNG THỰC TẾ THEO THỜI GIAN' luôn tính tổng số lần dập của cả 10 máy dập cộng lại
  renderTotalTrendChart();
}

function getTotalValueY(value) {
  const maxY = 20;
  const minY = 110;
  const maxValue = 11000;
  const safeVal = Math.min(Math.max(value, 0), maxValue);
  return minY - (safeVal / maxValue) * (minY - maxY);
}

function renderTotalTrendChart() {
  const fillPath = document.getElementById('chart-fill-path');
  const trendPath = document.getElementById('chart-trend-path');
  const dots = document.querySelectorAll('.trend-chart-svg circle');

  let totalTrend = [0, 0, 0, 0];
  Object.keys(machinesData).forEach(id => {
    const m = machinesData[id];
    if (m.trend && m.trend.length === 4) {
      totalTrend[0] += m.trend[0];
      totalTrend[1] += m.trend[1];
      totalTrend[2] += m.trend[2];
      totalTrend[3] += m.trend[3];
    }
  });

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
  }
}

// 5. Logic click chọn Máy dập trên Grid lưới
function renderOverviewGrid() {
  const container = document.getElementById('overview-machine-grid');
  if (!container) return;

  const lang = state.language || 'vi';
  container.innerHTML = '';

  Object.keys(machinesData).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).forEach(id => {
    const m = machinesData[id];
    const isSelected = '';
    const statusClass = m.status === 'running' ? 'running' : 'stopped';
    const textClass = m.status === 'running' ? 'text-running' : 'text-stopped';
    const statusText = m.status === 'running' 
      ? (lang === 'vi' ? 'ĐANG HOẠT ĐỘNG' : 'RUNNING') 
      : (lang === 'vi' ? 'MÁY DỪNG' : 'STOPPED');

    const card = document.createElement('div');
    card.className = `machine-grid-card ${isSelected}`;
    card.setAttribute('data-machine-id', id);

    // Calculate dynamic percentages
    const strokesNum = parseFloat(m.strokes.replace('.', ''));
    const totalOrderNum = parseFloat(m.totalOrder.replace('.', ''));
    
    const effPct = m.efficiency; // e.g. "75%"
    const orderPct = strokesNum > 0 ? ((strokesNum / totalOrderNum) * 100).toFixed(1) + '%' : '0%';

    // Helper to parse hh:mm:ss to seconds
    const timeToSeconds = (timeStr) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':');
      if (parts.length !== 3) return 0;
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    };

    const maxSec = timeToSeconds(m.runtimeMax) || 28800;
    const stopSec = timeToSeconds(m.stoptime) || 0;
    const stopPct = ((stopSec / maxSec) * 100).toFixed(1) + '%';

    card.innerHTML = `
      <div class="card-id-badge">${id}</div>
      <div class="machine-card-content">
        <div class="machine-card-header-row">
          <h4 class="machine-card-name">${lang === 'vi' ? `MÁY DẬP ${id}` : `PRESS #${id}`}</h4>
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
        
        <div class="machine-card-body-row">
          <div class="machine-card-metrics-list">
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-1">1</span> <span class="metric-val">${m.strokes}</span> / <span class="metric-val-base">${m.dailyTarget}</span></span>
                <span class="metric-pct">${effPct}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${effPct}"></div>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-2">2</span> <span class="metric-val">${m.strokes}</span> / <span class="metric-val-base">${m.totalOrder}</span></span>
                <span class="metric-pct">${orderPct}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${orderPct}"></div>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-3">3</span> <span class="metric-val">${effPct}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thực tế / Kế hoạch' : '= Act / Plan'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${effPct}"></div>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-4">4</span> <span class="metric-val">${m.timeEfficiency}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thời gian chạy / Thời gian ca' : '= Run / Shift'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${m.timeEfficiency}"></div>
              </div>
            </div>

            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-5">5</span> <span class="metric-val">${m.stoptime}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thời gian chạy thử máy' : '= Trial run time'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${stopPct}"></div>
              </div>
            </div>

            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-6">6</span> <span class="metric-val">${m.runtime}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thời gian chạy máy' : '= Production run time'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${m.timeEfficiency}"></div>
              </div>
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
}

// 5.1. Render danh sách máy dập và chức năng tìm kiếm lọc động (Task 5.6)