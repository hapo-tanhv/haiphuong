let weeklyChart = null;
let achievementDonutChart = null;

function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
}

function secondsToTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getReportData(range, machineId) {
  const lang = state.language || 'vi';
  let factor = 1.0;
  if (machineId !== 'all') {
    factor = 0.1;
    const num = parseInt(machineId, 10);
    factor = factor * (0.8 + (num % 5) * 0.1);
  }

  let normalizedRange = range;
  if (range === '24h') normalizedRange = 'day';
  if (range === '7d') normalizedRange = 'week';

  let selectedDateStr = "";
  if (normalizedRange === 'day') {
    selectedDateStr = state.reportSelectedDate || (window.getTodayFormattedStr ? window.getTodayFormattedStr() : '09/07/2026');
  } else if (normalizedRange === 'week') {
    selectedDateStr = state.reportSelectedWeek || 'Tuần 29 (13/07/2026 - 19/07/2026)';
  } else if (normalizedRange === 'month') {
    selectedDateStr = state.reportSelectedMonth || '07/2026';
  } else if (normalizedRange === 'year') {
    selectedDateStr = state.reportSelectedYear || '2026';
  }

  const getHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  let dateFactor = 1.0;
  if (selectedDateStr) {
    const seed = getHash(selectedDateStr);
    dateFactor = 0.88 + (seed % 25) * 0.01;
  }
  
  const daysCount = (normalizedRange === 'day' ? 1 : (normalizedRange === 'week' ? 7 : (normalizedRange === 'month' ? 30 : 365)));
  const machinesCount = (machineId === 'all' ? 10 : 1);

  const formatHoursStr = (mins) => {
    const h = (mins / 60).toFixed(1);
    return `${h}h`;
  };

  // Table shift rows & dynamic strokes accumulation
  const tableRows = [];
  const isScrewMode = (parseInt(machineId, 10) >= 11 && parseInt(machineId, 10) <= 20) || (machineId === 'all' && state.overviewType === 'screw');
  const machinesList = machineId === 'all'
    ? (isScrewMode
        ? ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']
        : ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'])
    : [machineId];
  
  let totalStrokes = 0;
  let totalTarget = 0;

  machinesList.forEach(mId => {
    const mFactor = (0.90 + (parseInt(mId, 10) % 5) * 0.04) * dateFactor;
    
    // Ca Sáng
    const strokesMorning = Math.round(760 * mFactor * daysCount);
    const targetMorning = 750 * daysCount;
    const morningOee = Math.round((strokesMorning / targetMorning) * 100);
    const isMorningOk = morningOee >= 95;
    const morningStatus = isMorningOk 
      ? (lang === 'vi' ? 'Hoàn thành' : 'Completed') 
      : (lang === 'vi' ? 'Chưa hoàn thành' : 'Incomplete');
    const morningClass = isMorningOk ? 'badge-success' : 'badge-danger';
    
    // Ca Chiều
    const strokesAfternoon = Math.round(710 * mFactor * daysCount);
    const targetAfternoon = 750 * daysCount;
    const afternoonOee = Math.round((strokesAfternoon / targetAfternoon) * 100);
    const isAfternoonOk = afternoonOee >= 95;
    const afternoonStatus = isAfternoonOk 
      ? (lang === 'vi' ? 'Hoàn thành' : 'Completed') 
      : (lang === 'vi' ? 'Chưa hoàn thành' : 'Incomplete');
    const afternoonClass = isAfternoonOk ? 'badge-success' : 'badge-danger';

    totalStrokes += (strokesMorning + strokesAfternoon);
    totalTarget += (targetMorning + targetAfternoon);

    const isScrew = (parseInt(mId, 10) >= 11 && parseInt(mId, 10) <= 20);
    const machineNameLabel = lang === 'vi' 
      ? (isScrew ? 'Máy vít' : 'Máy dập') 
      : (isScrew ? 'Screw' : 'Press');

    tableRows.push({
      shift: lang === 'vi' ? 'Ca Sáng (08:00 - 12:00)' : 'Morning Shift (08:00 - 12:00)',
      machine: `${machineNameLabel} ${mId}`,
      strokes: strokesMorning,
      uptime: formatHoursStr(240 * daysCount),
      downtime: `${Math.round(10 * daysCount)}m`,
      oee: `${morningOee}%`,
      status: morningStatus,
      statusClass: morningClass
    });

    tableRows.push({
      shift: lang === 'vi' ? 'Ca Chiều (14:00 - 18:00)' : 'Afternoon Shift (14:00 - 18:00)',
      machine: `${machineNameLabel} ${mId}`,
      strokes: strokesAfternoon,
      uptime: formatHoursStr(210 * daysCount),
      downtime: `${Math.round(30 * daysCount)}m`,
      oee: `${afternoonOee}%`,
      status: afternoonStatus,
      statusClass: afternoonClass
    });
  });

  // KPI card values synced with table accumulators
  const actualStrokes = totalStrokes;
  const targetStrokes = totalTarget;
  const actualStrokesStr = actualStrokes.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  const targetStrokesStr = targetStrokes.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  const actualPct = Math.round((actualStrokes / targetStrokes) * 100);

  // Target and progress orders
  const targetOrder = 5000 * daysCount * machinesCount;
  const progressOrder = Math.round(actualStrokes * 3.3);
  const targetOrderStr = targetOrder.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  const progressOrderStr = progressOrder.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  const progressPct = Math.min(100, Math.round((progressOrder / targetOrder) * 100));

  // OEE & Time efficiency
  const oee = Math.round((actualStrokes / targetStrokes) * 100);
  const timeEff = machineId === 'all' ? 93 : 90 + (parseInt(machineId, 10) * 2) % 7;

  // Trial / Run / Stop durations (minutes)
  const trialMins = 30 * daysCount * machinesCount;
  const runningMins = Math.round(410 * daysCount * machinesCount * (machineId === 'all' ? 1.0 : (0.9 + (parseInt(machineId, 10) % 3) * 0.05)));
  const stoppedMins = Math.max(10 * daysCount * machinesCount, 480 * daysCount * machinesCount - trialMins - runningMins);

  const formatDurationMins = (totalMins) => {
    const h = Math.floor(totalMins / 60);
    const m = Math.floor(totalMins % 60);
    const s = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const trialTimeStr = formatDurationMins(trialMins);
  const runTimeStr = formatDurationMins(runningMins);

  // Chart data generation matching requested points:
  // - day => 24 points (hours)
  // - week => 7 points (days of week)
  // - month => 30 points (days of month)
  // - year => 12 points (months of year)
  let labels = [];
  let trialData = [];
  let runningData = [];
  let stoppedData = [];
  let actualYieldData = [];
  let targetYieldData = [];

  if (normalizedRange === 'day') {
    // 24 points hourly
    for (let h = 0; h < 24; h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      labels.push(hourStr);
      
      // Active shift hours (8-12 and 14-18)
      if ((h >= 8 && h < 12) || (h >= 14 && h < 18)) {
        trialData.push(h === 8 || h === 14 ? 0.15 : 0.0);
        runningData.push(h === 8 || h === 14 ? 0.75 : 0.85);
        stoppedData.push(h === 8 || h === 14 ? 0.1 : 0.15);

        const targetVal = 190 * machinesCount;
        const actualVal = Math.round(targetVal * (0.95 + (h % 3) * 0.05) * factor * dateFactor);
        actualYieldData.push(actualVal);
        targetYieldData.push(targetVal);
      } else {
        trialData.push(0.0);
        runningData.push(0.0);
        stoppedData.push(0.0);

        actualYieldData.push(0);
        targetYieldData.push(0);
      }
    }
  } else if (normalizedRange === 'week') {
    // 7 points by day of week
    labels = lang === 'vi' 
      ? ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    trialData = [0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.0];
    runningData = [6.8, 6.9, 6.7, 7.1, 6.9, 5.2, 0.0];
    stoppedData = [0.7, 0.6, 0.8, 0.4, 0.6, 1.5, 0.0];

    const baseTargetWeek = [1500, 1500, 1500, 1500, 1500, 750, 0];
    const baseActualWeek = [1520, 1490, 1510, 1530, 1480, 760, 0];
    targetYieldData = baseTargetWeek.map(v => v * machinesCount);
    actualYieldData = baseActualWeek.map((v, i) => Math.round(v * machinesCount * (0.98 + (i % 3) * 0.02) * factor * dateFactor));
  } else if (normalizedRange === 'month') {
    // 30 points by day of month
    for (let d = 1; d <= 30; d++) {
      labels.push(lang === 'vi' ? `Ngày ${d}` : `Day ${d}`);
      const isWeekend = (d % 7 === 6 || d % 7 === 0);
      const isSaturday = (d % 7 === 6);
      if (isWeekend) {
        trialData.push(d % 7 === 6 ? 0.2 : 0.0);
        runningData.push(d % 7 === 6 ? 4.0 : 0.0);
        stoppedData.push(d % 7 === 6 ? 0.8 : 0.0);

        const targetVal = (isSaturday ? 750 : 0) * machinesCount;
        const actualVal = Math.round((isSaturday ? 760 : 0) * machinesCount * (0.95 + (d % 4) * 0.03) * factor * dateFactor);
        targetYieldData.push(targetVal);
        actualYieldData.push(actualVal);
      } else {
        trialData.push(0.3);
        runningData.push(parseFloat((7.0 + (d % 3) * 0.1).toFixed(1)));
        stoppedData.push(parseFloat((0.7 - (d % 3) * 0.1).toFixed(1)));

        const targetVal = 1500 * machinesCount;
        const actualVal = Math.round(1520 * machinesCount * (0.96 + (d % 5) * 0.02) * factor * dateFactor);
        targetYieldData.push(targetVal);
        actualYieldData.push(actualVal);
      }
    }
  } else {
    // 12 points by month
    const monthNamesVi = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 0; m < 12; m++) {
      labels.push(lang === 'vi' ? monthNamesVi[m] : monthNamesEn[m]);
      trialData.push(parseFloat((7.5 + (m % 3) * 0.5).toFixed(1)));
      runningData.push(parseFloat((170.0 + (m % 5) * 4.0).toFixed(1)));
      stoppedData.push(parseFloat((18.0 - (m % 4) * 2.0).toFixed(1)));

      const targetVal = 40000 * machinesCount;
      const actualVal = Math.round(41200 * machinesCount * (0.97 + (m % 3) * 0.02) * factor * dateFactor);
      targetYieldData.push(targetVal);
      actualYieldData.push(actualVal);
    }
  }

  // Scale chart stats by machinesCount
  trialData = trialData.map(v => parseFloat((v * machinesCount).toFixed(1)));
  runningData = runningData.map(v => parseFloat((v * machinesCount).toFixed(1)));
  stoppedData = stoppedData.map(v => parseFloat((v * machinesCount).toFixed(1)));

  return {
    actualStrokes,
    targetStrokes,
    actualStrokesStr,
    targetStrokesStr,
    actualPct,
    targetOrder,
    progressOrder,
    targetOrderStr,
    progressOrderStr,
    progressPct,
    oee,
    timeEff,
    trialTimeStr,
    runTimeStr,
    labels,
    trialData,
    runningData,
    stoppedData,
    actualYieldData,
    targetYieldData,
    tableRows
  };
}

let operatingChartInstance = null;
let yieldChartInstance = null;

async function fetchReportData(range, machineId) {
  let selectedDateStr = "";
  let normalizedRange = range === '24h' ? 'day' : (range === '7d' ? 'week' : range);
  if (normalizedRange === 'day') {
    selectedDateStr = state.reportSelectedDate || (window.getTodayFormattedStr ? window.getTodayFormattedStr() : '09/07/2026');
  } else if (normalizedRange === 'week') {
    selectedDateStr = state.reportSelectedWeek || 'Tuần 29';
  } else if (normalizedRange === 'month') {
    selectedDateStr = state.reportSelectedMonth || '07/2026';
  } else if (normalizedRange === 'year') {
    selectedDateStr = state.reportSelectedYear || '2026';
  }

  try {
    const res = await fetch(`${window.basePath || ''}Api/GetReportData?range=${range}&machineId=${machineId}&selectedDate=${encodeURIComponent(selectedDateStr)}`);
    const json = await res.json();
    if (json.success) {
      return json;
    }
  } catch (err) {
    console.warn("Failed to fetch report from server, using local fallback.", err);
  }
  return getReportData(range, machineId);
}

async function renderReportView() {
  const lang = state.language || 'vi';
  
  // Điều khiển ẩn hiện và cập nhật giá trị các trường lịch
  const range = state.reportTimeRange;
  const dateGroup = document.getElementById('report-date-filter-group');
  const datePicker = document.getElementById('report-date-picker');
  const monthPicker = document.getElementById('report-month-picker');
  const yearPickerWrapper = document.getElementById('report-year-picker-wrapper');
  const dateTitleEl = document.getElementById('report-date-filter-title');

  if (dateGroup && datePicker && monthPicker && yearPickerWrapper) {
    const weekPicker = document.getElementById('report-week-picker');
    if (range === 'day') {
      dateGroup.classList.remove('hidden');
      datePicker.classList.remove('hidden');
      if (weekPicker) weekPicker.classList.add('hidden');
      monthPicker.classList.add('hidden');
      yearPickerWrapper.classList.add('hidden');
      if (dateTitleEl) dateTitleEl.textContent = lang === 'vi' ? 'Chọn Ngày' : 'Select Day';
      datePicker.value = state.reportSelectedDate;
    } else if (range === 'week') {
      dateGroup.classList.remove('hidden');
      datePicker.classList.add('hidden');
      if (weekPicker) weekPicker.classList.remove('hidden');
      monthPicker.classList.add('hidden');
      yearPickerWrapper.classList.add('hidden');
      if (dateTitleEl) dateTitleEl.textContent = lang === 'vi' ? 'Chọn Tuần' : 'Select Week';
      if (weekPicker) weekPicker.value = state.reportSelectedWeek || 'Tuần 29 (13/07/2026 - 19/07/2026)';
    } else if (range === 'month') {
      dateGroup.classList.remove('hidden');
      datePicker.classList.add('hidden');
      if (weekPicker) weekPicker.classList.add('hidden');
      monthPicker.classList.remove('hidden');
      yearPickerWrapper.classList.add('hidden');
      if (dateTitleEl) dateTitleEl.textContent = lang === 'vi' ? 'Chọn Tháng' : 'Select Month';
      monthPicker.value = state.reportSelectedMonth;
    } else if (range === 'year') {
      dateGroup.classList.remove('hidden');
      datePicker.classList.add('hidden');
      if (weekPicker) weekPicker.classList.add('hidden');
      monthPicker.classList.add('hidden');
      yearPickerWrapper.classList.remove('hidden');
      if (dateTitleEl) dateTitleEl.textContent = lang === 'vi' ? 'Chọn Năm' : 'Select Year';
      
      const yearSelect = document.getElementById('report-year-picker');
      if (yearSelect) yearSelect.value = state.reportSelectedYear;
    } else {
      dateGroup.classList.add('hidden');
    }
  }

  const data = await fetchReportData(state.reportTimeRange, state.reportMachineId);
  
  // 1. Daily Strokes Card (Sản lượng ngày)
  const kpiStrokesTarget = document.getElementById('r-kpi-strokes-target');
  if (kpiStrokesTarget) {
    kpiStrokesTarget.innerHTML = `<span style="color: #00d2ff;">${data.actualStrokesStr}</span>`;
  }

  // 2. Order Progress Card (Tiến độ đơn hàng)
  const kpiOrderProgress = document.getElementById('r-kpi-order-progress');
  if (kpiOrderProgress) {
    kpiOrderProgress.innerHTML = `<span style="color: #00d2ff;">${data.progressOrderStr}</span> / <span style="color: #ffffff;">${data.targetOrderStr}</span>`;
  }
  const kpiOrderProgressPct = document.getElementById('r-kpi-order-progress-pct');
  if (kpiOrderProgressPct) {
    kpiOrderProgressPct.textContent = `${data.progressPct}%`;
  }
  const kpiOrderProgressSub = document.getElementById('r-kpi-order-progress-subtext');
  if (kpiOrderProgressSub) {
    kpiOrderProgressSub.textContent = '= Sản lượng thực tế / Tổng lệnh sản xuất';
  }

  // 3. Time Efficiency Card (Hiệu suất thời gian)
  const kpiTimeEff = document.getElementById('r-kpi-time-eff');
  if (kpiTimeEff) {
    kpiTimeEff.textContent = `${data.timeEff}%`;
  }

  // 4. Trial Time Card (Thời gian chạy thử máy)
  const kpiTrialTime = document.getElementById('r-kpi-trial-time');
  if (kpiTrialTime) {
    kpiTrialTime.textContent = data.trialTimeStr;
  }

  // 5. Running Time Card (Thời gian máy chạy)
  const kpiRunTime = document.getElementById('r-kpi-run-time');
  if (kpiRunTime) {
    kpiRunTime.textContent = data.runTimeStr;
  }

  // 6. Total Production Time Card (Thời gian sản xuất)
  const kpiTotalRuntime = document.getElementById('r-kpi-total-runtime');
  if (kpiTotalRuntime) {
    const runSec = timeToSeconds(data.runTimeStr);
    const trialSec = timeToSeconds(data.trialTimeStr);
    kpiTotalRuntime.textContent = secondsToTime(Math.max(0, runSec - trialSec));
  }

  // Bar chart rendering
  const barCtx = document.getElementById('operating-performance-chart');
  if (barCtx) {
    if (operatingChartInstance) {
      operatingChartInstance.destroy();
    }
    operatingChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: lang === 'vi' ? 'Chạy thử' : 'Trial Run',
            data: data.trialData,
            backgroundColor: '#ffd600',
            borderRadius: 4,
            borderSkipped: false
          },
          {
            label: lang === 'vi' ? 'Máy chạy' : 'Running',
            data: data.runningData,
            backgroundColor: '#00e676',
            borderRadius: 4,
            borderSkipped: false
          },
          {
            label: lang === 'vi' ? 'Thời gian dừng' : 'Stopped',
            data: data.stoppedData,
            backgroundColor: '#ef4444',
            borderRadius: 4,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false
            },
            ticks: {
              color: '#8f9cae',
              font: {
                family: 'inherit',
                size: 10
              }
            }
          },
          y: {
            stacked: true,
            grid: {
              color: '#16223f'
            },
            ticks: {
              color: '#8f9cae',
              font: {
                family: 'inherit',
                size: 10
              }
            }
          }
        }
      }
    });
  }

  // Donut chart rendering
  const pieCtx = document.getElementById('yield-efficiency-chart');
  if (pieCtx) {
    if (yieldChartInstance) {
      yieldChartInstance.destroy();
    }

    const actualStrokesNum = data.actualStrokes !== undefined ? data.actualStrokes : parseFloat((data.actualStrokesStr || '0').replace(/[\.,]/g, ''));
    const targetStrokesNum = data.targetStrokes !== undefined ? data.targetStrokes : parseFloat((data.targetStrokesStr || '0').replace(/[\.,]/g, ''));
    const remainingVal = Math.max(0, targetStrokesNum - actualStrokesNum);
    const isEmpty = targetStrokesNum === 0;

    document.getElementById('r-yield-efficiency-pct').textContent = `${data.actualPct}%`;
    document.getElementById('r-yield-legend-actual').textContent = data.actualStrokesStr;
    document.getElementById('r-yield-legend-remaining').textContent = remainingVal.toLocaleString('en-US');

    yieldChartInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: lang === 'vi' ? ['Thực tế', 'Còn lại'] : ['Actual', 'Remaining'],
        datasets: [{
          data: isEmpty ? [0, 1] : [actualStrokesNum, remainingVal],
          backgroundColor: isEmpty ? ['#16223f'] : ['#00d2ff', '#16223f'],
          borderColor: isEmpty ? ['#16223f'] : ['#00d2ff', '#4e5b6e'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  const tableBody = document.getElementById('report-table-body');
  const tableInfo = document.getElementById('report-table-info');
  const pagination = document.getElementById('report-pagination');

  if (tableBody && tableInfo && pagination) {
    tableBody.innerHTML = '';
    const totalRecords = data.tableRows.length;
    const totalPages = Math.ceil(totalRecords / state.reportRowsPerPage) || 1;

    if (state.reportCurrentPage > totalPages) {
      state.reportCurrentPage = totalPages;
    }
    if (state.reportCurrentPage < 1) {
      state.reportCurrentPage = 1;
    }

    const startIndex = (state.reportCurrentPage - 1) * state.reportRowsPerPage;
    const endIndex = Math.min(startIndex + state.reportRowsPerPage, totalRecords);
    const paginatedRows = data.tableRows.slice(startIndex, endIndex);

    const showText = lang === 'vi' ? 'Hiển thị' : 'Showing';
    const ofText = lang === 'vi' ? 'của' : 'of';
    const recordsText = lang === 'vi' ? 'bản ghi' : 'records';

    if (totalRecords === 0) {
      tableInfo.textContent = lang === 'vi' ? 'Hiển thị 0 - 0 của 0 bản ghi' : 'Showing 0 - 0 of 0 records';
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-secondary);">
            ${lang === 'vi' ? 'Không có dữ liệu vận hành nào.' : 'No operation data found.'}
          </td>
        </tr>
      `;
      pagination.innerHTML = '';
    } else {
      tableInfo.textContent = `${showText} ${startIndex + 1} - ${endIndex} ${ofText} ${totalRecords} ${recordsText}`;

      paginatedRows.forEach(row => {
        const tr = document.createElement('tr');
        const isOk = parseFloat(row.oee) >= 95;
        tr.innerHTML = `
          <td>${row.shift}</td>
          <td>${row.machine}</td>
          <td style="text-align: center;">${row.strokes.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}</td>
          <td style="text-align: center;">${row.uptime}</td>
          <td style="text-align: center; color: ${row.downtime !== '0m' && row.downtime !== '10m' ? '#ef4444' : 'var(--text-primary)'}">${row.downtime}</td>
          <td style="text-align: center; color: ${isOk ? '#00e676' : 'var(--text-primary)'}; font-weight: 700;">${row.oee}</td>
          <td style="text-align: center;"><span class="badge ${row.statusClass}">${row.status}</span></td>
        `;
        tableBody.appendChild(tr);
      });

      pagination.innerHTML = '';

      const prevBtn = document.createElement('button');
      prevBtn.className = `page-link ${state.reportCurrentPage === 1 ? 'disabled' : ''}`;
      prevBtn.innerHTML = `&lt;`;
      prevBtn.addEventListener('click', () => {
        if (state.reportCurrentPage > 1) {
          state.reportCurrentPage--;
          renderReportView();
        }
      });
      pagination.appendChild(prevBtn);

      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-link ${state.reportCurrentPage === i ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
          state.reportCurrentPage = i;
          renderReportView();
        });
        pagination.appendChild(pageBtn);
      }

      const nextBtn = document.createElement('button');
      nextBtn.className = `page-link ${state.reportCurrentPage === totalPages ? 'disabled' : ''}`;
      nextBtn.innerHTML = `&gt;`;
      nextBtn.addEventListener('click', () => {
        if (state.reportCurrentPage < totalPages) {
          state.reportCurrentPage++;
          renderReportView();
        }
      });
      pagination.appendChild(nextBtn);
    }
  }

  // Khởi chạy biểu đồ tuần và biểu đồ đạt mục tiêu sản lượng
  initWeeklyPerformanceChart(data);
  updateAchievementDonutChart(data.tableRows);
}

function initWeeklyPerformanceChart(reportData) {
  const canvas = document.getElementById('weekly-performance-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (weeklyChart) {
    weeklyChart.destroy();
  }

  const lang = state.language || 'vi';
  
  const actualData = reportData.actualYieldData;
  const targetData = reportData.targetYieldData;
  const labels = reportData.labels;

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: translations[lang].history_legend_actual || 'Thực tế',
          data: actualData,
          backgroundColor: '#00d2ff',
          borderColor: '#00d2ff',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.5
        },
        {
          label: translations[lang].history_legend_target || 'Mục tiêu',
          data: targetData,
          backgroundColor: '#00ff00',
          borderColor: '#00ff00',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0c1527',
          titleColor: '#ffffff',
          bodyColor: '#7f91a8',
          borderColor: '#16223f',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          font: {
            family: "'Outfit', sans-serif"
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#7f91a8',
            font: {
              family: "'Outfit', sans-serif",
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: '#16223f'
          },
          ticks: {
            color: '#7f91a8',
            font: {
              family: "'Outfit', sans-serif",
              size: 11
            },
            callback: function(value) {
              return value >= 1000 ? (value/1000) + 'k' : value;
            }
          }
        }
      }
    }
  });
}

function updateAchievementDonutChart(tableRows) {
  let standardCount = 0; // OEE >= 100%
  let lowCount = 0;      // OEE < 100%

  tableRows.forEach(row => {
    const oeeVal = parseInt(row.oee, 10);
    if (oeeVal >= 100) {
      standardCount++;
    } else {
      lowCount++;
    }
  });

  const total = tableRows.length;
  let standardPct = 0;
  let lowPct = 0;

  if (total > 0) {
    standardPct = Math.round((standardCount / total) * 100);
    lowPct = 100 - standardPct;
  }

  const standardEl = document.getElementById('achievement-count-standard');
  const lowEl = document.getElementById('achievement-count-low');
  if (standardEl) standardEl.textContent = standardCount;
  if (lowEl) lowEl.textContent = lowCount;

  const canvas = document.getElementById('history-achievement-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (achievementDonutChart) {
    achievementDonutChart.destroy();
  }

  const lang = state.language || 'vi';
  const labels = lang === 'vi' 
    ? ['Đạt chuẩn (100%)', 'Không đạt (< 100%)']
    : ['Standard Met (100%)', 'Not Met (< 100%)'];

  const isEmpty = total === 0;

  achievementDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: isEmpty ? [0, 1] : [standardPct, lowPct],
        backgroundColor: isEmpty ? ['#16223f'] : ['#00ff00', '#ef4444'],
        borderColor: isEmpty ? ['#16223f'] : ['#00ff00', '#ef4444'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: !isEmpty,
          backgroundColor: '#0c1527',
          titleColor: '#ffffff',
          bodyColor: '#7f91a8',
          borderColor: '#16223f',
          borderWidth: 1,
          callbacks: {
            title: function() {
              return '';
            },
            label: function(context) {
              const value = context.parsed || 0;
              return ` ${value}%`;
            }
          }
        }
      }
    }
  });
}

async function populateReportMachineSelect() {
  const machineSelect = document.getElementById('report-machine-select');
  if (!machineSelect) return;

  const lang = state.language || 'vi';

  try {
    const res = await fetch(`${window.basePath || ''}Api/GetMachines`);
    const json = await res.json();
    if (json.success && json.data) {
      machineSelect.innerHTML = '';

      const allStampingOption = document.createElement('option');
      allStampingOption.value = 'all_stamping';
      allStampingOption.textContent = lang === 'vi' ? 'Tất cả máy dập' : 'All Stamping Machines';
      machineSelect.appendChild(allStampingOption);

      const allScrewOption = document.createElement('option');
      allScrewOption.value = 'all_screw';
      allScrewOption.textContent = lang === 'vi' ? 'Tất cả máy vít' : 'All Screw Machines';
      machineSelect.appendChild(allScrewOption);

      const stampingGroup = document.createElement('optgroup');
      stampingGroup.label = lang === 'vi' ? 'Máy dập' : 'Stamping Machines';
      stampingGroup.style.background = 'var(--bg-secondary)';
      stampingGroup.style.color = 'var(--text-primary)';

      const headingGroup = document.createElement('optgroup');
      headingGroup.label = lang === 'vi' ? 'Máy đấm đầu vít' : 'Screw Heading Machines';
      headingGroup.style.background = 'var(--bg-secondary)';
      headingGroup.style.color = 'var(--text-primary)';

      const threadingGroup = document.createElement('optgroup');
      threadingGroup.label = lang === 'vi' ? 'Máy cán ren vít' : 'Screw Threading Machines';
      threadingGroup.style.background = 'var(--bg-secondary)';
      threadingGroup.style.color = 'var(--text-primary)';

      json.data.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name;

        if (m.machineTypeId === 1) {
          stampingGroup.appendChild(option);
        } else if (m.machineTypeId === 2) {
          headingGroup.appendChild(option);
        } else if (m.machineTypeId === 3) {
          threadingGroup.appendChild(option);
        }
      });

      if (stampingGroup.children.length > 0) machineSelect.appendChild(stampingGroup);
      if (headingGroup.children.length > 0) machineSelect.appendChild(headingGroup);
      if (threadingGroup.children.length > 0) machineSelect.appendChild(threadingGroup);

      machineSelect.value = state.reportMachineId || 'all_stamping';
    }
  } catch (err) {
    console.warn("Failed to populate report machine filter from API:", err);
  }
}
window.populateReportMachineSelect = populateReportMachineSelect;

function initReportControls() {
  populateReportMachineSelect();
  const timeSegmentContainer = document.getElementById('report-time-segments');
  if (timeSegmentContainer) {
    const btns = timeSegmentContainer.querySelectorAll('.segment-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.reportTimeRange = btn.getAttribute('data-range');
        state.reportCurrentPage = 1;
        renderReportView();
      });
    });
  }

  const machineSelect = document.getElementById('report-machine-select');
  if (machineSelect) {
    machineSelect.addEventListener('change', (e) => {
      state.reportMachineId = e.target.value;
      state.reportCurrentPage = 1;
      renderReportView();
    });
  }

  const datePicker = document.getElementById('report-date-picker');
  if (datePicker) {
    flatpickr(datePicker, {
      dateFormat: "d/m/Y",
      defaultDate: state.reportSelectedDate,
      onChange: function(selectedDates, dateStr) {
        state.reportSelectedDate = dateStr;
        state.reportCurrentPage = 1;
        renderReportView();
      }
    });
  }

  const weekPicker = document.getElementById('report-week-picker');
  if (weekPicker) {
    function getWeekRangeString(date) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const getISOWeekNum = (dateVal) => {
        const temp = new Date(Date.UTC(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate()));
        temp.setUTCDate(temp.getUTCDate() + 4 - (temp.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
        return Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
      };

      const pad = (num) => String(num).padStart(2, '0');
      const monStr = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}/${monday.getFullYear()}`;
      const sunStr = `${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${sunday.getFullYear()}`;
      const weekNum = getISOWeekNum(monday);

      return `Tuần ${weekNum} (${monStr} - ${sunStr})`;
    }

    if (!state.reportSelectedWeek) {
      state.reportSelectedWeek = getWeekRangeString(new Date('2026-07-13'));
    }
    
    flatpickr(weekPicker, {
      defaultDate: new Date('2026-07-13'),
      onChange: function(selectedDates) {
        if (selectedDates[0]) {
          const weekStr = getWeekRangeString(selectedDates[0]);
          state.reportSelectedWeek = weekStr;
          setTimeout(() => {
            weekPicker.value = weekStr;
          }, 0);
          state.reportCurrentPage = 1;
          renderReportView();
        }
      }
    });
    weekPicker.value = state.reportSelectedWeek;
  }

  const monthPicker = document.getElementById('report-month-picker');
  if (monthPicker) {
    flatpickr(monthPicker, {
      plugins: [
        new monthSelectPlugin({
          shorthand: true,
          dateFormat: "m/Y",
          altFormat: "m/Y"
        })
      ],
      defaultDate: state.reportSelectedMonth,
      onChange: function(selectedDates, dateStr) {
        state.reportSelectedMonth = dateStr;
        state.reportCurrentPage = 1;
        renderReportView();
      }
    });
  }

  const yearSelect = document.getElementById('report-year-picker');
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      state.reportSelectedYear = e.target.value;
      state.reportCurrentPage = 1;
      renderReportView();
    });
  }

  const exportBtn = document.getElementById('report-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = getReportData(state.reportTimeRange, state.reportMachineId);
      
      let csvContent = "\uFEFF";
      csvContent += "CA LÀM VIỆC,MÁY DẬP,STROKE COUNT,UPTIME,DOWNTIME,HIỆU SUẤT OEE,TRẠNG THÁI\r\n";
      
      data.tableRows.forEach(row => {
        csvContent += `"${row.shift}","${row.machine}","${row.strokes}","${row.uptime}","${row.downtime}","${row.oee}","${row.status}"\r\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bao_cao_hieu_suat_ca_${state.reportTimeRange}_${state.reportMachineId}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  const historyLink = document.getElementById('report-view-history-link');
  if (historyLink) {
    historyLink.addEventListener('click', (e) => {
      e.preventDefault();
      const historyTab = document.querySelector('[data-tab="history"]');
      if (historyTab) {
        historyTab.click();
      }
    });
  }
}
