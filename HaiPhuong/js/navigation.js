function updateHeaderTitle(tabId) {
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  if (pageTitle && pageSubtitle) {
    const lang = state.language || 'vi';
    const header = pageHeaders[lang][tabId];
    if (header) {
      pageTitle.textContent = header.title;
      pageSubtitle.textContent = header.subtitle;
    }
  }
}

// 2. Logic điều phối định tuyến tab (Navigation Routing)
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const tabId = item.getAttribute('data-tab');
      if (!tabId) return;
      if (tabId === state.currentTab) {
        if (tabId === 'machine') {
          const detailSection = document.getElementById('view-machine-detail');
          const listSection = document.getElementById('view-machine');
          if (detailSection && listSection && !detailSection.classList.contains('hidden')) {
            detailSection.classList.add('hidden');
            listSection.classList.remove('hidden');
            updateHeaderTitle('machine');
          }
        }
        return;
      }

      // Cập nhật State hiện tại
      state.currentTab = tabId;

      // Cập nhật class 'active' trên menu Sidebar
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Chuyển đổi ẩn/hiện các phân vùng Content View
      viewSections.forEach(section => {
        if (section.id === `view-${tabId}`) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });

      // Cập nhật Tiêu đề & Phụ đề trên Header động
      updateHeaderTitle(tabId);

      // Nếu chuyển sang tab máy dập, thực hiện render danh sách máy dập
      if (tabId === 'machine') {
        renderMachineList();
      }

      // Nếu chuyển sang tab lịch sử, thực hiện render bảng lịch sử và biểu đồ
      if (tabId === 'history') {
        renderHistoryTable();
      }

      // Nếu chuyển sang tab báo cáo, thực hiện render báo cáo và biểu đồ
      if (tabId === 'report') {
        setTimeout(renderReportView, 50);
      }

      // Nếu chuyển sang tab cảnh báo, thực hiện render cảnh báo
      if (tabId === 'alert') {
        renderAlarmsView();
      }

      // Nếu chuyển sang tab cài đặt, thực hiện render cài đặt
      if (tabId === 'settings') {
        renderSettingsView();
      }
    });
  });

  // Gắn sự kiện click chuông thông báo ở header dẫn đến tab cảnh báo
  const notifyWidget = document.querySelector('.notify-widget');
  if (notifyWidget) {
    notifyWidget.addEventListener('click', () => {
      const alertTab = document.querySelector('.nav-item[data-tab="alert"]');
      if (alertTab) {
        alertTab.click();
      }
    });
  }
}
