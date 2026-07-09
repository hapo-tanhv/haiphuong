function runSystemTests() {
  console.log("%c--- RUNNING IN-BROWSER UNIT TESTS ---", "color: #00d2ff; font-weight: bold; font-size: 1.1rem;");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`%c[PASS] ${message}`, "color: #00e676; font-weight: 500;");
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Test 1: System State default parameters
  assert(typeof state === 'object', "state is defined as an object");
  assert(state.language === 'vi' || state.language === 'en', "state.language is valid");
  assert(state.systemName === 'Dây chuyền sản xuất HP-01', "state.systemName has correct default");
  assert(state.downtimeThresholdWarning === 15, "state.downtimeThresholdWarning has correct default");

  // Test 2: i18n Translations validation
  assert(typeof translations === 'object', "translations dictionary is defined");
  assert(typeof translations.vi === 'object', "translations.vi is defined");
  assert(typeof translations.en === 'object', "translations.en is defined");

  // Check keys compatibility
  const viKeys = Object.keys(translations.vi);
  const enKeys = Object.keys(translations.en);
  assert(viKeys.length === enKeys.length, `VI key count (${viKeys.length}) matches EN key count (${enKeys.length})`);
  
  let missingKeys = [];
  viKeys.forEach(k => {
    if (!translations.en[k]) {
      missingKeys.push(k);
    }
  });
  assert(missingKeys.length === 0, `All VI keys exist in EN translation dictionary (Missing: ${missingKeys.join(', ')})`);

  // Test 3: User profiles manipulation
  const initialUserCount = state.usersData.length;
  state.usersData.push({ name: 'Test User', role: 'Operator', initials: 'TU' });
  assert(state.usersData.length === initialUserCount + 1, "Appended a mock user profile successfully");
  state.usersData.pop();

  console.log(`%c--- TESTS COMPLETED: ${passed} Passed, ${failed} Failed ---`, 
    failed > 0 ? "color: #ff3d00; font-weight: bold;" : "color: #00e676; font-weight: bold;"
  );
  return { passed, failed };
}

function startRealTimeClock() {
  const timeEl = document.querySelector('.time-widget .time-value');
  const dateEl = document.querySelector('.time-widget .date-value');
  
  if (!timeEl || !dateEl) return;

  function updateClock() {
    const now = new Date();
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}:${seconds}`;

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    dateEl.textContent = `${day}/${month}/${year}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// 6. Khởi tạo ứng dụng khi trình duyệt tải xong DOM
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initMachineSelection();
  initSearchAndFilter();
  initHistoryControls();
  initReportControls();
  initAlarms();
  initAlarmControls();
  initSettingsControls();
  startRealTimeClock();
  
  // Thiết lập selectedMachineListId mặc định là '01'
  state.selectedMachineListId = '01';
  
  // Thiết lập selectedMachineListId mặc định cho lịch sử
  state.historyCurrentPage = 1;
  state.alarmCurrentPage = 1;
  
  // Tự động render lần đầu cho Máy dập mặc định (Máy số 03)
  updateActiveMachineDetails(state.selectedMachineId);
  if (window.location.search.includes('runTests=true')) {
    setTimeout(runSystemTests, 1000);
  }
  
  console.log('App initialized successfully, mbro!');
});
