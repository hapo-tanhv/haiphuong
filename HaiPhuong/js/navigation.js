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

  // Xử lý sự kiện click cho các mục nav-item chính
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const tabId = item.getAttribute('data-tab');
      if (!tabId) {
        if (item.classList.contains('nav-dropdown-toggle')) {
          const parent = item.closest('.nav-item-parent');
          if (parent) {
            parent.classList.toggle('expanded');
          }
        }
        return;
      }

      // Cập nhật State hiện tại
      state.currentTab = tabId;
      if (tabId === 'overview-screw') {
        state.overviewType = 'screw';
      } else if (tabId === 'overview-heading') {
        state.overviewType = 'heading';
      } else if (tabId === 'overview-threading') {
        state.overviewType = 'threading';
      } else if (tabId === 'overview') {
        state.overviewType = 'stamping';
      }

      // Cập nhật class 'active' trên menu Sidebar
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Chuyển đổi ẩn/hiện các phân vùng Content View
      viewSections.forEach(section => {
        if (section.id === `view-${tabId}` || 
            ((tabId === 'overview' || tabId === 'overview-screw' || tabId === 'overview-heading' || tabId === 'overview-threading') && section.id === 'view-overview')) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });

      // Cập nhật Tiêu đề & Phụ đề trên Header động
      updateHeaderTitle(tabId);

      // Nếu là trang dập/vít, vẽ lại grid và cập nhật chi tiết máy mặc định
      if (tabId === 'overview' || tabId === 'overview-screw' || tabId === 'overview-heading' || tabId === 'overview-threading') {
        renderOverviewGrid();
        let defaultMachineId = '03';
        if (state.overviewType === 'screw' || state.overviewType === 'heading') {
          defaultMachineId = '11';
        } else if (state.overviewType === 'threading') {
          defaultMachineId = '16';
        }
        updateActiveMachineDetails(defaultMachineId);
      }

      // Nếu chuyển sang tab lịch sử, thực hiện render bảng lịch sử và biểu đồ
      if (tabId === 'history') {
        renderHistoryTable();
      }

      // Nếu chuyển sang tab quản lý lệnh sản xuất, thực hiện render quản lý lệnh sản xuất
      if (tabId === 'production-orders') {
        if (typeof renderProductionOrdersView === 'function') {
          renderProductionOrdersView();
        }
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

  // Tự động mở rộng dropdown nếu tab hiện tại là máy đấm hoặc máy ren
  const activeTabId = state.currentTab;
  if (activeTabId === 'overview-heading' || activeTabId === 'overview-threading') {
    const tabEl = document.querySelector(`.nav-item[data-tab="${activeTabId}"]`);
    const parent = tabEl ? tabEl.closest('.nav-item-parent') : null;
    if (parent) parent.classList.add('expanded');
  }
}
