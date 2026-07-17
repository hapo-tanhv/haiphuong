// app.js

// 1. Quản lý trạng thái hệ thống (In-memory State)
// Load productionOrders from localStorage if exists, otherwise use defaults
const savedProductionOrders = localStorage.getItem('productionOrders');
const initialProductionOrders = savedProductionOrders ? JSON.parse(savedProductionOrders) : [
  { orderDate: '13/07/2026', orderNo: 'LSX-240520-01', productCode: 'SP-901-MTR', productName: 'Vỏ Motor Panasonic A', machineId: '01', stage: 'Dập thân vỏ', plannedQty: 5000, status: 'running' },
  { orderDate: '13/07/2026', orderNo: 'LSX-240520-02', productCode: 'SP-903-FAN', productName: 'Đế quạt Asia C', machineId: '04', stage: 'Dập đế', plannedQty: 3200, status: 'running' },
  { orderDate: '13/07/2026', orderNo: 'LSX-240520-03', productCode: 'SP-902-BOX', productName: 'Nắp hộp kỹ thuật B', machineId: '02', stage: 'Dập tạo hình', plannedQty: 4000, status: 'running' },
  { orderDate: '12/07/2026', orderNo: 'LSX-240520-11', productCode: 'SP-905-SCR', productName: 'Vít tự hãm HP-A', machineId: '11', stage: 'Xoắn tạo ren', plannedQty: 10000, status: 'running' },
  { orderDate: '12/07/2026', orderNo: 'LSX-240520-12', productCode: 'SP-906-NUT', productName: 'Đai ốc lục giác HP-B', machineId: '12', stage: 'Tiện lục giác', plannedQty: 8000, status: 'running' }
];

const getTodayFormattedStr = () => {
  const d = new Date();
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};
window.getTodayFormattedStr = getTodayFormattedStr;

if (!savedProductionOrders) {
  localStorage.setItem('productionOrders', JSON.stringify(initialProductionOrders));
}

const state = {
  currentTab: 'overview',
  overviewType: 'stamping', // 'stamping' hoặc 'screw'
  selectedMachineId: '03',
  selectedMachineListId: '01',
  historySearchQuery: '',
  historyCurrentPage: 1,
  historyRowsPerPage: 10,
  ordersCurrentPage: 1,
  ordersRowsPerPage: 10,
  historyStartDate: null,
  historyEndDate: null,
  historyStatusFilter: 'all',
  historyQualityFilter: 'all',
  historyTypeFilter: 'stamping',
  reportTimeRange: 'day',
  reportMachineId: 'all_stamping',
  reportSelectedDate: getTodayFormattedStr(),
  reportSelectedMonth: '07/2026',
  reportSelectedYear: '2026',
  reportCurrentPage: 1,
  reportRowsPerPage: 10,
  alarmSearchQuery: '',
  alarmSeverityFilter: 'all',
  alarmCurrentPage: 1,
  alarmRowsPerPage: 5,
  selectedAlarmId: null,
  systemName: 'Dây chuyền sản xuất HP-01',
  operatingArea: 'area2',
  language: 'vi',
  downtimeThresholdWarning: 15,
  downtimeThresholdEmergency: 30,
  efficiencyThresholdWarning: 85,
  efficiencyDelay: 60,
  downtimeAlarmEnabled: true,
  efficiencyAlarmEnabled: true,
  usersData: [
    { name: 'Lê Văn Nam', role: 'Quản lý kỹ thuật (Manager)', initials: 'LN' },
    { name: 'Nguyễn Thị Mai', role: 'Vận hành viên (Operator)', initials: 'NM' }
  ],
  settingsPageSize: 10,
  settingsCurrentPage: 1,
  settingsSearchQuery: '',
  accountsData: [
    { username: 'Admin', role: 'ADMIN' },
    { username: 'Operator', role: 'OPERATOR' }
  ],
  productionOrders: initialProductionOrders
};

// Chi tiết lịch sử lệnh sản xuất để phục vụ lọc động tại màn chi tiết
const orderMockStats = {
  // Lịch sử máy dập 03
  'LSX-240520-01': { strokes: '1.256', efficiency: '83.7%', timeEfficiency: '64.6%', runtime: '05:10:23', stoptime: '00:15:30', trialTime: '00:15:30', trend: [500, 800, 1256, 1000] },
  'LSX-240510-01': { strokes: '4.800', efficiency: '96.0%', timeEfficiency: '90.0%', runtime: '07:12:00', stoptime: '00:48:00', trialTime: '00:05:00', trend: [1200, 2400, 3600, 4800] },
  'LSX-240505-01': { strokes: '5.200', efficiency: '104.0%', timeEfficiency: '95.0%', runtime: '07:36:00', stoptime: '00:24:00', trialTime: '00:00:00', trend: [1300, 2600, 3900, 5200] },
  // Lịch sử máy vít 11
  'LSX-240520-11': { strokes: '2.500', efficiency: '75.0%', timeEfficiency: '56.7%', runtime: '04:32:15', stoptime: '00:15:30', trialTime: '00:05:00', trend: [800, 1500, 2500, 1800] },
  'LSX-240510-11': { strokes: '9.500', efficiency: '95.0%', timeEfficiency: '85.0%', runtime: '06:48:00', stoptime: '01:12:00', trialTime: '00:10:00', trend: [2000, 4500, 7500, 9500] }
};

// Dữ liệu mô phỏng tĩnh của 10 máy dập (01-10) và 10 máy vít (11-20)
const initialMachinesData = {
  // --- MÁY DẬP (01 - 10) ---
  '01': { 
    id: '01', name: 'Máy dập 01', type: 'stamping', sp: 'Vỏ motor A', order: 'LSX-240520-01', strokes: '1.125', dailyTarget: '1.500', totalOrder: '5.000', efficiency: '75%', timeEfficiency: '56.7%', runtime: '04:32:15', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 75, trend: [600, 850, 1125, 950], trialTime: '00:05:00', productCode: 'SP-901-MTR', productName: 'Vỏ Motor Panasonic A', batch: 'LOT-20260709-01', plannedQty: '5.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-01', ordersHistory: ['LSX-240520-01', 'LSX-240510-01'],
    attributes: { code: 'MD-01', name: 'YADON 110T', brand: 'YADON', model: 'YAD-110', force: '110 Tấn', type: 'C-Frame', stroke: '150 mm', dieHeight: '380 mm', speed: '55 SPM', slideAdj: '80 mm', slideSize: '600x450 mm', bolsterSize: '1000x680 mm', bolsterThickness: '120 mm', throatDepth: '280 mm' }
  },
  '02': { 
    id: '02', name: 'Máy dập 02', type: 'stamping', sp: 'Nắp hộp B', order: 'LSX-240520-03', strokes: '980', dailyTarget: '1.200', totalOrder: '4.000', efficiency: '82%', timeEfficiency: '62%', runtime: '03:58:40', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 82, trend: [400, 650, 980, 800], trialTime: '00:08:00', productCode: 'SP-902-BOX', productName: 'Nắp hộp kỹ thuật B', batch: 'LOT-20260709-02', plannedQty: '4.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-03', ordersHistory: ['LSX-240520-03'],
    attributes: { code: 'MD-02', name: 'YADON 160T', brand: 'YADON', model: 'YAD-160', force: '160 Tấn', type: 'C-Frame', stroke: '160 mm', dieHeight: '400 mm', speed: '50 SPM', slideAdj: '90 mm', slideSize: '700x520 mm', bolsterSize: '1150x760 mm', bolsterThickness: '130 mm', throatDepth: '320 mm' }
  },
  '03': { 
    id: '03', name: 'Máy dập 03', type: 'stamping', sp: 'Vỏ motor A', order: 'LSX-240520-01', strokes: '1.256', dailyTarget: '1.500', totalOrder: '5.000', efficiency: '83.7%', timeEfficiency: '64.6%', runtime: '05:10:23', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 83.7, trend: [500, 800, 1256, 1000], trialTime: '00:15:30', productCode: 'SP-901-MTR', productName: 'Vỏ Motor Panasonic A', batch: 'LOT-20260709-01', plannedQty: '5.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-01', ordersHistory: ['LSX-240520-01', 'LSX-240510-01', 'LSX-240505-01'],
    attributes: { code: 'MD-03', name: 'YADON 200T', brand: 'YADON', model: 'YAD-200', force: '200 Tấn', type: 'H-Frame', stroke: '180 mm', dieHeight: '450 mm', speed: '45 SPM', slideAdj: '100 mm', slideSize: '800x600 mm', bolsterSize: '1200x800 mm', bolsterThickness: '150 mm', throatDepth: '350 mm' }
  },
  '04': { 
    id: '04', name: 'Máy dập 04', type: 'stamping', sp: 'Đế quạt C', order: 'LSX-240520-02', strokes: '870', dailyTarget: '1.100', totalOrder: '3.200', efficiency: '79%', timeEfficiency: '60%', runtime: '03:20:11', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 79, trend: [300, 500, 870, 700], trialTime: '00:10:00', productCode: 'SP-903-FAN', productName: 'Đế quạt Asia C', batch: 'LOT-20260709-03', plannedQty: '3.200',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-02', ordersHistory: ['LSX-240520-02'],
    attributes: { code: 'MD-04', name: 'AIDA 110T', brand: 'AIDA', model: 'NC1-110', force: '110 Tấn', type: 'C-Frame', stroke: '150 mm', dieHeight: '380 mm', speed: '60 SPM', slideAdj: '80 mm', slideSize: '600x480 mm', bolsterSize: '1040x680 mm', bolsterThickness: '120 mm', throatDepth: '290 mm' }
  },
  '05': { 
    id: '05', name: 'Máy dập 05', type: 'stamping', sp: 'Vỏ motor A', order: 'LSX-240520-01', strokes: '1.030', dailyTarget: '1.200', totalOrder: '4.000', efficiency: '85.8%', timeEfficiency: '66.5%', runtime: '04:15:42', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 85.8, trend: [550, 750, 1030, 900], trialTime: '00:12:00', productCode: 'SP-901-MTR', productName: 'Vỏ Motor Panasonic A', batch: 'LOT-20260709-01', plannedQty: '4.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-01', ordersHistory: ['LSX-240520-01'],
    attributes: { code: 'MD-05', name: 'AIDA 150T', brand: 'AIDA', model: 'NC1-150', force: '150 Tấn', type: 'C-Frame', stroke: '160 mm', dieHeight: '410 mm', speed: '55 SPM', slideAdj: '90 mm', slideSize: '700x550 mm', bolsterSize: '1170x760 mm', bolsterThickness: '130 mm', throatDepth: '330 mm' }
  },
  '06': { 
    id: '06', name: 'Máy dập 06', type: 'stamping', sp: 'Đế quạt C', order: 'LSX-240520-04', strokes: '560', dailyTarget: '1.000', totalOrder: '3.000', efficiency: '56%', timeEfficiency: '40%', runtime: '02:10:05', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'stopped', load: 56, trend: [560, 560, 560, 560], trialTime: '00:00:00', productCode: 'SP-903-FAN', productName: 'Đế quạt Asia C', batch: 'LOT-20260709-04', plannedQty: '3.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-04', ordersHistory: ['LSX-240520-04'],
    attributes: { code: 'MD-06', name: 'AIDA 200T', brand: 'AIDA', model: 'NC1-200', force: '200 Tấn', type: 'H-Frame', stroke: '180 mm', dieHeight: '450 mm', speed: '45 SPM', slideAdj: '100 mm', slideSize: '820x620 mm', bolsterSize: '1240x840 mm', bolsterThickness: '155 mm', throatDepth: '360 mm' }
  },
  '07': { 
    id: '07', name: 'Máy dập 07', type: 'stamping', sp: 'Nắp hộp B', order: 'LSX-240520-05', strokes: '0', dailyTarget: '1.000', totalOrder: '2.500', efficiency: '0%', timeEfficiency: '0%', runtime: '00:00:00', stoptime: '00:00:00', runtimeMax: '08:00:00', status: 'stopped', load: 0, trend: [0, 0, 0, 0], trialTime: '00:00:00', productCode: 'SP-902-BOX', productName: 'Nắp hộp kỹ thuật B', batch: 'LOT-20260709-05', plannedQty: '2.500',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-05', ordersHistory: ['LSX-240520-05'],
    attributes: { code: 'MD-07', name: 'KOMATSU 110T', brand: 'KOMATSU', model: 'OBS-110', force: '110 Tấn', type: 'C-Frame', stroke: '150 mm', dieHeight: '380 mm', speed: '60 SPM', slideAdj: '80 mm', slideSize: '600x480 mm', bolsterSize: '1040x680 mm', bolsterThickness: '120 mm', throatDepth: '290 mm' }
  },
  '08': { 
    id: '08', name: 'Máy dập 08', type: 'stamping', sp: 'Vỏ motor A', order: 'LSX-240520-02', strokes: '760', dailyTarget: '1.000', totalOrder: '3.500', efficiency: '76%', timeEfficiency: '57.0%', runtime: '03:45:18', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 76, trend: [400, 550, 760, 600], trialTime: '00:05:00', productCode: 'SP-901-MTR', productName: 'Vỏ Motor Panasonic A', batch: 'LOT-20260709-02', plannedQty: '3.500',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-02', ordersHistory: ['LSX-240520-02'],
    attributes: { code: 'MD-08', name: 'KOMATSU 150T', brand: 'KOMATSU', model: 'OBS-150', force: '150 Tấn', type: 'C-Frame', stroke: '160 mm', dieHeight: '410 mm', speed: '55 SPM', slideAdj: '90 mm', slideSize: '700x550 mm', bolsterSize: '1170x760 mm', bolsterThickness: '130 mm', throatDepth: '330 mm' }
  },
  '09': { 
    id: '09', name: 'Máy dập 09', type: 'stamping', sp: 'Nắp hộp B', order: 'LSX-240520-03', strokes: '1.100', dailyTarget: '1.300', totalOrder: '4.500', efficiency: '84.6%', timeEfficiency: '66.8%', runtime: '04:28:33', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 84.6, trend: [500, 750, 1100, 950], trialTime: '00:11:00', productCode: 'SP-902-BOX', productName: 'Nắp hộp kỹ thuật B', batch: 'LOT-20260709-03', plannedQty: '4.500',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-03', ordersHistory: ['LSX-240520-03'],
    attributes: { code: 'MD-09', name: 'KOMATSU 200T', brand: 'KOMATSU', model: 'OBS-200', force: '200 Tấn', type: 'H-Frame', stroke: '180 mm', dieHeight: '450 mm', speed: '45 SPM', slideAdj: '100 mm', slideSize: '820x620 mm', bolsterSize: '1240x840 mm', bolsterThickness: '155 mm', throatDepth: '360 mm' }
  },
  '10': { 
    id: '10', name: 'Máy dập 10', type: 'stamping', sp: 'Đế quạt C', order: 'LSX-240520-04', strokes: '320', dailyTarget: '800', totalOrder: '2.800', efficiency: '40%', timeEfficiency: '32.0%', runtime: '01:35:47', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'stopped', load: 40, trend: [320, 320, 320, 320], trialTime: '00:00:00', productCode: 'SP-903-FAN', productName: 'Đế quạt Asia C', batch: 'LOT-20260709-04', plannedQty: '2.800',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-04', ordersHistory: ['LSX-240520-04'],
    attributes: { code: 'MD-10', name: 'YADON 80T', brand: 'YADON', model: 'YAD-80', force: '80 Tấn', type: 'C-Frame', stroke: '120 mm', dieHeight: '340 mm', speed: '65 SPM', slideAdj: '70 mm', slideSize: '500x380 mm', bolsterSize: '900x580 mm', bolsterThickness: '110 mm', throatDepth: '240 mm' }
  },

  // --- MÁY VÍT (11 - 20) ---
  '11': { 
    id: '11', name: 'Máy vít 11', type: 'screw', sp: 'Vít tự hãm HP-A', order: 'LSX-240520-11', strokes: '2.500', dailyTarget: '3.000', totalOrder: '10.000', efficiency: '83.3%', timeEfficiency: '56.7%', runtime: '04:32:15', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 83.3, trend: [800, 1500, 2500, 1800], trialTime: '00:05:00', productCode: 'SP-905-SCR', productName: 'Vít tự hãm HP-A', batch: 'LOT-20260709-11', plannedQty: '10.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-11', ordersHistory: ['LSX-240520-11', 'LSX-240510-11'],
    attributes: { code: 'MV-11', name: 'SACMA 50T', brand: 'SACMA', model: 'SP-11', force: '50 Tấn', type: 'Vít tự động', stroke: '120 mm', dieHeight: '300 mm', speed: '60 SPM', slideAdj: '80 mm', slideSize: '500x400 mm', bolsterSize: '800x600 mm', bolsterThickness: '120 mm', throatDepth: '250 mm' }
  },
  '12': { 
    id: '12', name: 'Máy vít 12', type: 'screw', sp: 'Đai ốc lục giác HP-B', order: 'LSX-240520-12', strokes: '1.800', dailyTarget: '2.500', totalOrder: '8.000', efficiency: '72%', timeEfficiency: '62%', runtime: '03:58:40', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 72, trend: [500, 1100, 1800, 1400], trialTime: '00:08:00', productCode: 'SP-906-NUT', productName: 'Đai ốc lục giác HP-B', batch: 'LOT-20260709-12', plannedQty: '8.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-12', ordersHistory: ['LSX-240520-12'],
    attributes: { code: 'MV-12', name: 'SACMA 60T', brand: 'SACMA', model: 'SP-12', force: '60 Tấn', type: 'Vít tự động', stroke: '130 mm', dieHeight: '310 mm', speed: '55 SPM', slideAdj: '80 mm', slideSize: '520x420 mm', bolsterSize: '850x620 mm', bolsterThickness: '125 mm', throatDepth: '260 mm' }
  },
  '13': { 
    id: '13', name: 'Máy vít 13', type: 'screw', sp: 'Vít bắn tôn HP-C', order: 'LSX-240520-13', strokes: '3.100', dailyTarget: '4.000', totalOrder: '15.000', efficiency: '77.5%', timeEfficiency: '64.6%', runtime: '05:10:23', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 77.5, trend: [1000, 2000, 3100, 2500], trialTime: '00:15:30', productCode: 'SP-907-ROO', productName: 'Vít bắn tôn HP-C', batch: 'LOT-20260709-13', plannedQty: '15.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-13', ordersHistory: ['LSX-240520-13'],
    attributes: { code: 'MV-13', name: 'SACMA 80T', brand: 'SACMA', model: 'SP-13', force: '80 Tấn', type: 'Vít tự động', stroke: '140 mm', dieHeight: '320 mm', speed: '50 SPM', slideAdj: '90 mm', slideSize: '550x450 mm', bolsterSize: '900x680 mm', bolsterThickness: '130 mm', throatDepth: '270 mm' }
  },
  '14': { 
    id: '14', name: 'Máy vít 14', type: 'screw', sp: 'Vít lục giác HP-D', order: 'LSX-240520-14', strokes: '2.100', dailyTarget: '3.000', totalOrder: '12.000', efficiency: '70%', timeEfficiency: '60%', runtime: '03:20:11', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 70, trend: [700, 1400, 2100, 1800], trialTime: '00:10:00', productCode: 'SP-908-HEX', productName: 'Vít lục giác HP-D', batch: 'LOT-20260709-14', plannedQty: '12.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-14', ordersHistory: ['LSX-240520-14'],
    attributes: { code: 'MV-14', name: 'CARLO SALVI 50T', brand: 'CARLO SALVI', model: 'CS-50', force: '50 Tấn', type: 'Vít tự động', stroke: '120 mm', dieHeight: '300 mm', speed: '65 SPM', slideAdj: '80 mm', slideSize: '500x400 mm', bolsterSize: '800x600 mm', bolsterThickness: '120 mm', throatDepth: '250 mm' }
  },
  '15': { 
    id: '15', name: 'Máy vít 15', type: 'screw', sp: 'Vít tự hãm HP-A', order: 'LSX-240520-11', strokes: '2.200', dailyTarget: '3.000', totalOrder: '10.000', efficiency: '73.3%', timeEfficiency: '66.5%', runtime: '04:15:42', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 73.3, trend: [800, 1400, 2200, 1900], trialTime: '00:12:00', productCode: 'SP-905-SCR', productName: 'Vít tự hãm HP-A', batch: 'LOT-20260709-11', plannedQty: '10.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-11', ordersHistory: ['LSX-240520-11'],
    attributes: { code: 'MV-15', name: 'CARLO SALVI 60T', brand: 'CARLO SALVI', model: 'CS-60', force: '60 Tấn', type: 'Vít tự động', stroke: '130 mm', dieHeight: '310 mm', speed: '60 SPM', slideAdj: '85 mm', slideSize: '520x420 mm', bolsterSize: '850x620 mm', bolsterThickness: '125 mm', throatDepth: '260 mm' }
  },
  '16': { 
    id: '16', name: 'Máy vít 16', type: 'screw', sp: 'Đai ốc lục giác HP-B', order: 'LSX-240520-12', strokes: '980', dailyTarget: '2.500', totalOrder: '8.000', efficiency: '39.2%', timeEfficiency: '40%', runtime: '02:10:05', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'stopped', load: 39.2, trend: [980, 980, 980, 980], trialTime: '00:00:00', productCode: 'SP-906-NUT', productName: 'Đai ốc lục giác HP-B', batch: 'LOT-20260709-12', plannedQty: '8.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-12', ordersHistory: ['LSX-240520-12'],
    attributes: { code: 'MV-16', name: 'CARLO SALVI 80T', brand: 'CARLO SALVI', model: 'CS-80', force: '80 Tấn', type: 'Vít tự động', stroke: '140 mm', dieHeight: '320 mm', speed: '50 SPM', slideAdj: '90 mm', slideSize: '550x450 mm', bolsterSize: '900x680 mm', bolsterThickness: '130 mm', throatDepth: '270 mm' }
  },
  '17': { 
    id: '17', name: 'Máy vít 17', type: 'screw', sp: 'Vít bắn tôn HP-C', order: 'LSX-240520-13', strokes: '0', dailyTarget: '4.000', totalOrder: '15.000', efficiency: '0%', timeEfficiency: '0%', runtime: '00:00:00', stoptime: '00:00:00', runtimeMax: '08:00:00', status: 'stopped', load: 0, trend: [0, 0, 0, 0], trialTime: '00:00:00', productCode: 'SP-907-ROO', productName: 'Vít bắn tôn HP-C', batch: 'LOT-20260709-13', plannedQty: '15.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-13', ordersHistory: ['LSX-240520-13'],
    attributes: { code: 'MV-17', name: 'JERN YAO 50T', brand: 'JERN YAO', model: 'JY-50', force: '50 Tấn', type: 'Vít tự động', stroke: '120 mm', dieHeight: '300 mm', speed: '65 SPM', slideAdj: '80 mm', slideSize: '500x400 mm', bolsterSize: '800x600 mm', bolsterThickness: '120 mm', throatDepth: '250 mm' }
  },
  '18': { 
    id: '18', name: 'Máy vít 18', type: 'screw', sp: 'Vít lục giác HP-D', order: 'LSX-240520-14', strokes: '1.200', dailyTarget: '3.000', totalOrder: '12.000', efficiency: '40%', timeEfficiency: '57.0%', runtime: '03:45:18', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 40, trend: [500, 900, 1200, 1000], trialTime: '00:05:00', productCode: 'SP-908-HEX', productName: 'Vít lục giác HP-D', batch: 'LOT-20260709-14', plannedQty: '12.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-14', ordersHistory: ['LSX-240520-14'],
    attributes: { code: 'MV-18', name: 'JERN YAO 60T', brand: 'JERN YAO', model: 'JY-60', force: '60 Tấn', type: 'Vít tự động', stroke: '130 mm', dieHeight: '310 mm', speed: '60 SPM', slideAdj: '85 mm', slideSize: '520x420 mm', bolsterSize: '850x620 mm', bolsterThickness: '125 mm', throatDepth: '260 mm' }
  },
  '19': { 
    id: '19', name: 'Máy vít 19', type: 'screw', sp: 'Vít tự hãm HP-A', order: 'LSX-240520-11', strokes: '2.300', dailyTarget: '3.000', totalOrder: '10.000', efficiency: '76.7%', timeEfficiency: '66.8%', runtime: '04:28:33', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 76.7, trend: [900, 1600, 2300, 2000], trialTime: '00:11:00', productCode: 'SP-905-SCR', productName: 'Vít tự hãm HP-A', batch: 'LOT-20260709-11', plannedQty: '10.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-11', ordersHistory: ['LSX-240520-11'],
    attributes: { code: 'MV-19', name: 'JERN YAO 80T', brand: 'JERN YAO', model: 'JY-80', force: '80 Tấn', type: 'Vít tự động', stroke: '140 mm', dieHeight: '320 mm', speed: '50 SPM', slideAdj: '90 mm', slideSize: '550x450 mm', bolsterSize: '900x680 mm', bolsterThickness: '130 mm', throatDepth: '270 mm' }
  },
  '20': { 
    id: '20', name: 'Máy vít 20', type: 'screw', sp: 'Đai ốc lục giác HP-B', order: 'LSX-240520-12', strokes: '500', dailyTarget: '2.500', totalOrder: '8.000', efficiency: '20%', timeEfficiency: '32.0%', runtime: '01:35:47', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'stopped', load: 20, trend: [500, 500, 500, 500], trialTime: '00:00:00', productCode: 'SP-906-NUT', productName: 'Đai ốc lục giác HP-B', batch: 'LOT-20260709-12', plannedQty: '8.000',
    shiftHours: 8, overtimeRegistered: false, activeOrderId: 'LSX-240520-12', ordersHistory: ['LSX-240520-12'],
    attributes: { code: 'MV-20', name: 'JERN YAO 100T', brand: 'JERN YAO', model: 'JY-100', force: '100 Tấn', type: 'Vít tự động', stroke: '150 mm', dieHeight: '330 mm', speed: '45 SPM', slideAdj: '95 mm', slideSize: '580x480 mm', bolsterSize: '950x720 mm', bolsterThickness: '135 mm', throatDepth: '280 mm' }
  }
};

const savedMachinesData = localStorage.getItem('machinesData');
const machinesData = savedMachinesData ? JSON.parse(savedMachinesData) : initialMachinesData;

// Loại bỏ các khóa thiết bị cũ dạng số (01 -> 20) để tránh trùng lặp
for (let i = 1; i <= 20; i++) {
  const legacyKey = i.toString().padStart(2, '0');
  if (machinesData[legacyKey]) {
    delete machinesData[legacyKey];
  }
}

if (!savedMachinesData) {
  localStorage.setItem('machinesData', JSON.stringify(machinesData));
}

// Base alarms dataset (initial static mock alarms matching the image)
let alarmsData = [];

async function reloadMachinesFromServer() {
  try {
    const res = await fetch(`${window.basePath || ''}Api/GetMachines`);
    const json = await res.json();
    if (json.success && json.data) {
      // Xóa sạch dữ liệu tĩnh cũ để tránh bị trộn lẫn
      for (const key in machinesData) {
        if (machinesData.hasOwnProperty(key)) {
          delete machinesData[key];
        }
      }
      json.data.forEach(item => {
        machinesData[item.id] = item;
      });
      localStorage.setItem('machinesData', JSON.stringify(machinesData));
    }
  } catch (err) {
    console.warn("Failed to load live machines data from DB. Falling back to local storage.", err);
  }
}

async function reloadAlarmsFromServer() {
  try {
    const res = await fetch(`${window.basePath || ''}Api/GetAlarms?severity=all&status=all`);
    const json = await res.json();
    if (json.success && json.data) {
      alarmsData.length = 0;
      json.data.forEach(item => {
        alarmsData.push({
          id: item.id.toString(),
          machineId: item.machineCode,
          machineName: item.machineName,
          type: item.deviceType,
          code: item.code,
          severity: item.severity,
          desc: item.description,
          time: item.timestamp,
          status: item.status,
          resolvedAt: item.resolvedAt
        });
      });
      window.updateNotificationBadge();
    }
  } catch (err) {
    console.warn("Failed to fetch alarms from server, using local fallback.", err);
  }
}

window.updateNotificationBadge = function() {
  const activeCount = alarmsData.filter(a => a.status !== 'resolved').length;

  const notifyBadge = document.querySelector('.notify-badge');
  if (notifyBadge) {
    notifyBadge.textContent = activeCount;
  }

  const navBadge = document.querySelector('.nav-badge');
  if (navBadge) {
    navBadge.textContent = activeCount;
  }
};

// Bản đồ tiêu đề trang để hỗ trợ cập nhật tiêu đề động đa ngôn ngữ
const pageHeaders = {
  vi: {
    overview: { title: 'TỔNG QUAN MÁY DẬP', subtitle: 'Giám sát trạng thái máy dập' },
    'overview-screw': { title: 'TỔNG QUAN MÁY VÍT', subtitle: 'Giám sát trạng thái máy vít' },
    'overview-heading': { title: 'TỔNG QUAN MÁY ĐẤM VÍT', subtitle: 'Giám sát trạng thái máy đấm đầu mũ vít' },
    'overview-threading': { title: 'TỔNG QUAN MÁY CÁN REN VÍT', subtitle: 'Giám sát trạng thái máy cán ren thân vít' },
    machine: { title: 'DANH SÁCH THIẾT BỊ', subtitle: 'Danh sách và thông số chi tiết từng máy' },
    'machine-detail': { title: 'CHI TIẾT THIẾT BỊ', subtitle: 'Thông số kỹ thuật và hiệu suất hoạt động chi tiết' },
    'production-orders': { title: 'QUẢN LÝ LỆNH SẢN XUẤT', subtitle: 'Danh sách và thiết lập lệnh sản xuất' },
    history: { title: 'LỊCH SỬ HOẠT ĐỘNG', subtitle: 'Nhật ký vận hành và các sự kiện' },
    report: { title: 'BÁO CÁO HIỆU SUẤT HỆ THỐNG', subtitle: 'Phân tích dữ liệu & Hiệu suất' },
    alert: { title: 'CẢNH BÁO & THÔNG BÁO', subtitle: '' },
    settings: { title: 'CÀI ĐẶT HỆ THỐNG', subtitle: 'Quản lý tài khoản' },
    guide: { title: 'HƯỚNG DẪN SỬ DỤNG', subtitle: 'Tổng quan  /  Hướng dẫn sử dụng' }
  },
  en: {
    overview: { title: 'STAMPING OVERVIEW', subtitle: 'Monitoring status of 10 stamping machines' },
    'overview-screw': { title: 'SCREW OVERVIEW', subtitle: 'Monitoring status of 10 screw machines' },
    'overview-heading': { title: 'HEADING MACHINE OVERVIEW', subtitle: 'Monitoring status of heading machines' },
    'overview-threading': { title: 'THREADING MACHINE OVERVIEW', subtitle: 'Monitoring status of threading machines' },
    machine: { title: 'MACHINE LIST', subtitle: 'Detailed list and specifications of each machine' },
    'machine-detail': { title: 'MACHINE DETAILS', subtitle: 'Detailed specifications and performance charts of the machine' },
    'production-orders': { title: 'PRODUCTION ORDER MANAGEMENT', subtitle: 'List and setup of production orders' },
    history: { title: 'OPERATIONAL HISTORY', subtitle: 'Operation log and system events' },
    report: { title: 'SYSTEM PERFORMANCE REPORT', subtitle: 'Data analysis & performance' },
    alert: { title: 'ALARMS & NOTIFICATIONS', subtitle: 'STATION: HANOI #04 • ONLINE' },
    settings: { title: 'SYSTEM SETTINGS', subtitle: 'Manage performance, runtime, and alarm thresholds for production line HP-01' },
    guide: { title: 'USER MANUAL / GUIDE', subtitle: 'Overview  /  User Manual' }
  }
};

function getValueY(value) {
  const maxY = 20;
  const minY = 110;
  const maxValue = 1500;
  
  // Tránh giá trị vượt ngưỡng
  const safeVal = Math.min(Math.max(value, 0), maxValue);
  return minY - (safeVal / maxValue) * (minY - maxY);
}

// 4. Cập nhật thông tin chi tiết Máy dập và biểu đồ xu hướng dập tương ứng
const translations = {
  vi: window.translationsVi,
  en: window.translationsEn
};

function translateUI(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      if (el.tagName === 'INPUT' && el.type === 'text') {
        el.placeholder = translations[lang][key];
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });

  const sidebarItems = document.querySelectorAll('.sidebar-nav .nav-item');
  if (sidebarItems.length >= 6) {
    const keys = ['nav_overview', 'nav_history', 'nav_report', 'nav_alert', 'nav_guide', 'nav_settings'];
    sidebarItems.forEach((item, idx) => {
      const span = item.querySelector('span:not(.nav-badge)');
      if (span && keys[idx]) {
        span.textContent = translations[lang][keys[idx]];
      }
    });
  }

  const sidebarStatusLabel = document.querySelector('.status-card-label');
  const sidebarStatusVal = document.querySelector('.status-card-value');
  const sidebarStatusSub = document.querySelector('.status-card-subtext');
  if (sidebarStatusLabel) sidebarStatusLabel.textContent = translations[lang].sys_card_lbl;
  if (sidebarStatusVal) sidebarStatusVal.textContent = translations[lang].sys_card_val;
  if (sidebarStatusSub) sidebarStatusSub.textContent = translations[lang].sys_card_sub;

  const copyrightText = document.querySelector('.sidebar-footer span:first-child');
  if (copyrightText) {
    copyrightText.textContent = `© ${translations[lang].copyright} 2024`;
  }

  // Translate machine grid cards
  renderOverviewGrid();

  // Also update active machine details to refresh name translations
  updateActiveMachineDetails(state.selectedMachineId);

  if (window.populateReportMachineSelect) {
    window.populateReportMachineSelect();
  }

  const alarmTabs = document.querySelectorAll('#alarm-severity-tabs .alarm-tab-btn');
  if (alarmTabs.length >= 4) {
    const allBadge = document.getElementById('alarm-count-all');
    const countText = allBadge ? allBadge.outerHTML : '';
    alarmTabs[0].innerHTML = `${translations[lang].alarm_filter_severity_all} ${countText}`;
    alarmTabs[1].textContent = translations[lang].alarm_filter_severity_critical;
    alarmTabs[2].textContent = translations[lang].alarm_filter_severity_warning;
    alarmTabs[3].textContent = translations[lang].alarm_filter_severity_info;
  }

  const activeTab = document.querySelector('.nav-item.active');
  if (activeTab) {
    const tabId = activeTab.getAttribute('data-tab');
    updateHeaderTitle(tabId);
    if (tabId === 'machine') {
      const searchInput = document.getElementById('machine-search-input');
      const query = searchInput ? searchInput.value : '';
      renderMachineList(query);
    } else if (tabId === 'history') {
      renderHistoryTable();
    } else if (tabId === 'report') {
      renderReportView();
    } else if (tabId === 'alert') {
      renderAlarmsView();
    } else if (tabId === 'settings') {
      renderSettingsView();
    }
  }
}
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-alert';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
