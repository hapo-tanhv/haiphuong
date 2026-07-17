// 1. Quản lý danh sách và thiết lập lệnh sản xuất (Production Orders Management)
let productionOrdersList = [];
let currentParentOrderId = null;
let productionOrdersCurrentPage = 1;
const productionOrdersRowsPerPage = 8;

async function renderProductionOrdersView() {
  const tableBody = document.getElementById('production-orders-table-body');
  if (!tableBody) return;

  // Khởi tạo date picker nếu chưa có
  if (!window.orderDatePickerInitialized) {
    flatpickr("#order-input-date", {
      dateFormat: "d/m/Y",
      defaultDate: new Date(),
      minDate: "today"
    });
    window.orderDatePickerInitialized = true;
    
    // Khởi tạo máy chỉ định và gán sự kiện thay đổi công đoạn
    initOrderMachineSelect();
    
    // Gán sự kiện lắng nghe mã lệnh kế thừa
    initOrderNoChangeListener();
    
    // Gán sự kiện lưu lệnh
    initOrderSaveAndExport();
    
    // Gán sự kiện tìm kiếm & lọc
    initOrderFilters();
  }

  // Tải danh sách từ máy chủ
  await fetchProductionOrders();
  displayProductionOrdersTable();
}

function initOrderMachineSelect() {
  const machineInput = document.getElementById('order-input-machine');
  const suggestions = document.getElementById('machine-suggestions');
  const stageInput = document.getElementById('order-input-stage');
  if (!machineInput || !suggestions) return;

  const lang = state.language || 'vi';
  suggestions.innerHTML = '';

  Object.keys(machinesData).sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).forEach(id => {
    const m = machinesData[id];
    const typeLabel = m.machineTypeId === 1 ? (lang === 'vi' ? 'Máy Dập' : 'Stamping Press') :
                      m.machineTypeId === 2 ? (lang === 'vi' ? 'Máy Đấm Đầu' : 'Heading Machine') :
                      (lang === 'vi' ? 'Máy Cán Ren' : 'Threading Machine');
    const statusLabel = m.status === 'running' ? (lang === 'vi' ? 'Đang hoạt động' : 'Running') :
                        m.status === 'stopped' ? (lang === 'vi' ? 'Tạm dừng' : 'Stopped') :
                        (lang === 'vi' ? 'Mất kết nối' : 'Offline');
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${typeLabel} #${id} (${m.name}) [${statusLabel}]`;
    suggestions.appendChild(opt);
  });

  const updateStage = () => {
    const selectedId = machineInput.value.trim();
    const m = machinesData[selectedId];
    if (m && stageInput) {
      if (m.machineTypeId === 1) {
        stageInput.value = lang === 'vi' ? 'Dập định hình' : 'Stamping';
      } else if (m.machineTypeId === 2) {
        stageInput.value = lang === 'vi' ? 'Đấm đầu vít' : 'Screw Heading';
      } else {
        stageInput.value = lang === 'vi' ? 'Cán ren vít' : 'Screw Threading';
      }
    }
  };

  machineInput.oninput = updateStage;
  machineInput.onchange = updateStage;
}

function populateOrderNoSuggestions() {
  const suggestions = document.getElementById('order-no-suggestions');
  if (!suggestions) return;
  suggestions.innerHTML = '';

  const uniqueNos = [...new Set(productionOrdersList.map(o => o.orderNo))];
  uniqueNos.sort().forEach(no => {
    const opt = document.createElement('option');
    opt.value = no;
    suggestions.appendChild(opt);
  });
}

function initOrderNoChangeListener() {
  const orderNoInput = document.getElementById('order-input-no');
  const qtyInput = document.getElementById('order-input-qty');
  const prodCodeInput = document.getElementById('order-input-prodcode');
  const prodNameInput = document.getElementById('order-input-prodname');
  const stageInput = document.getElementById('order-input-stage');
  const hintEl = document.getElementById('inherited-order-hint');

  if (!orderNoInput || !qtyInput) return;

  let debounceTimeout = null;
  const handleOrderNoChange = async () => {
    const val = orderNoInput.value.trim();
    if (!val) {
      currentParentOrderId = null;
      if (hintEl) hintEl.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`${window.basePath || ''}Api/GetInheritedOrderInfo?orderNo=${encodeURIComponent(val)}`);
      const json = await res.json();
      if (json.success && json.data && json.data.found) {
        currentParentOrderId = json.data.parentOrderId;
        
        // Tự động điền dữ liệu
        qtyInput.value = json.data.remainingQty;
        if (prodCodeInput) prodCodeInput.value = json.data.productCode;
        if (prodNameInput) prodNameInput.value = json.data.productName;
        if (stageInput) stageInput.value = json.data.stage;

        // Hiển thị hộp gợi ý kế thừa
        if (hintEl) {
          const lang = state.language || 'vi';
          hintEl.textContent = lang === 'vi' 
            ? `💡 Kế thừa lệnh cũ: Điền tự động ${json.data.remainingQty.toLocaleString('vi-VN')} SP còn lại.` 
            : `💡 Inherited order: Auto-filled ${json.data.remainingQty.toLocaleString('en-US')} remaining units.`;
          hintEl.style.display = 'block';
        }
      } else {
        currentParentOrderId = null;
        if (hintEl) hintEl.style.display = 'none';
      }
    } catch (err) {
      console.warn("Failed to get inherited order info", err);
      currentParentOrderId = null;
      if (hintEl) hintEl.style.display = 'none';
    }
  };

  orderNoInput.addEventListener('change', handleOrderNoChange);
  orderNoInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(handleOrderNoChange, 300);
  });
}

async function fetchProductionOrders() {
  try {
    const res = await fetch(`${window.basePath || ''}Api/GetProductionOrders`);
    const json = await res.json();
    if (json.success && json.data) {
      productionOrdersList = json.data;
      populateOrderNoSuggestions();
    }
  } catch (err) {
    console.error("Failed to fetch production orders", err);
  }
}

function displayProductionOrdersTable() {
  const tableBody = document.getElementById('production-orders-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  const searchQuery = document.getElementById('order-search-input').value.toLowerCase().trim();
  const statusFilter = document.getElementById('order-status-filter').value;
  const lang = state.language || 'vi';

  const filtered = productionOrdersList.filter(o => {
    // Lọc theo từ khóa
    if (searchQuery !== '') {
      const matchNo = o.orderNo.toLowerCase().includes(searchQuery);
      const matchProd = o.productName.toLowerCase().includes(searchQuery) || o.productCode.toLowerCase().includes(searchQuery);
      const matchMachine = o.machineId.toLowerCase().includes(searchQuery);
      if (!matchNo && !matchProd && !matchMachine) return false;
    }
    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      if (o.status !== statusFilter) return false;
    }
    return true;
  });

  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / productionOrdersRowsPerPage) || 1;
  if (productionOrdersCurrentPage > totalPages) productionOrdersCurrentPage = totalPages;
  if (productionOrdersCurrentPage < 1) productionOrdersCurrentPage = 1;

  const startIndex = (productionOrdersCurrentPage - 1) * productionOrdersRowsPerPage;
  const endIndex = Math.min(startIndex + productionOrdersRowsPerPage, totalRecords);
  const pageRecords = filtered.slice(startIndex, endIndex);

  if (totalRecords === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 30px;">
          ${lang === 'vi' ? 'Không tìm thấy lệnh sản xuất nào.' : 'No production orders found.'}
        </td>
      </tr>
    `;
    // Cập nhật text pageInfo rỗng
    const pageInfo = document.getElementById('production-orders-page-info');
    if (pageInfo) pageInfo.textContent = lang === 'vi' ? 'Hiển thị 0 - 0 trong 0 lệnh' : 'Showing 0 - 0 of 0 orders';
    const pagination = document.getElementById('production-orders-pagination');
    if (pagination) pagination.innerHTML = '';
    return;
  }

  pageRecords.forEach(o => {
    const plan = o.plannedQty || 0;
    const act = o.actualQty || 0;
    const pct = plan > 0 ? ((act / plan) * 100).toFixed(1) : '0.0';
    
    let statusClass = 'status-pending';
    let statusText = lang === 'vi' ? 'Chờ chạy' : 'Pending';
    if (o.status === 'running') {
      statusClass = 'status-running';
      statusText = lang === 'vi' ? 'Đang thực thi' : 'Running';
    } else if (o.status === 'completed') {
      statusClass = 'status-completed';
      statusText = lang === 'vi' ? 'Hoàn thành' : 'Completed';
    } else if (o.status === 'stopped' || o.status === 'paused') {
      statusClass = 'status-stopped';
      statusText = lang === 'vi' ? 'Tạm dừng' : 'Stopped';
    } else if (o.status === 'cancelled') {
      statusClass = 'status-cancelled';
      statusText = lang === 'vi' ? 'Đã hủy' : 'Cancelled';
    }

    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom: 1px solid rgba(255,255,255,0.03);';
    tr.innerHTML = `
      <td style="padding: 12px 8px; font-weight: 700; color: #fff;">${o.orderNo}</td>
      <td style="padding: 12px 8px; font-size: 0.85rem; color: #eee;">
        <div>${o.productName}</div>
        <div style="font-size: 0.72rem; color: var(--text-secondary);">${o.productCode}</div>
      </td>
      <td style="padding: 12px 8px; font-size: 0.85rem; color: #ccc;">${o.stage}</td>
      <td style="padding: 12px 8px; font-weight: bold; color: var(--accent-blue);">${o.machineId}</td>
      <td style="padding: 12px 8px; text-align: right; color: #fff; font-weight: 600;">${plan.toLocaleString('en-US')}</td>
      <td style="padding: 12px 8px; text-align: right; color: #00d2ff; font-weight: 600;">${act.toLocaleString('en-US')}</td>
      <td style="padding: 12px 8px;">
        <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
          <span style="font-size: 0.75rem; font-weight: 700; color: #00e676;">${pct}%</span>
          <div style="width: 100px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div style="width: ${Math.min(100, parseFloat(pct))}%; height: 100%; background: #00e676;"></div>
          </div>
        </div>
      </td>
      <td style="padding: 12px 8px; text-align: center;">
        <span class="status-badge-custom ${statusClass}">${statusText}</span>
      </td>
      <td style="padding: 12px 8px; text-align: center;">
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button class="orders-action-btn" onclick="exportOrderPDF('${o.orderNo}', '${o.productCode}', '${o.productName}', '${o.machineId}', '${o.stage}', ${plan})" style="background: rgba(0, 210, 255, 0.1); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3); padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: all 0.2s;">PDF</button>
          <button class="orders-action-btn" onclick="viewOrderDetails('${o.orderNo}')" style="background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.1); padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: all 0.2s;">Chi tiết</button>
          ${(o.status === 'pending') ? `
            <button class="orders-action-btn btn-start-order" data-order-id="${o.id}" style="background: rgba(0, 230, 118, 0.1); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.3); padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: all 0.2s;">Chạy</button>
          ` : ''}
          ${(o.status === 'running' || o.status === 'pending') ? `
            <button class="orders-action-btn btn-cancel-order" data-order-id="${o.id}" style="background: rgba(255, 23, 68, 0.1); color: #ff1744; border: 1px solid rgba(255, 23, 68, 0.3); padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: all 0.2s;">Hủy</button>
          ` : ''}
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Bind cancel button events
  const cancelBtns = tableBody.querySelectorAll('.btn-cancel-order');
  cancelBtns.forEach(btn => {
    btn.onclick = async (e) => {
      const orderId = btn.getAttribute('data-order-id');
      const lang = state.language || 'vi';
      const confirmMsg = lang === 'vi' 
        ? 'Bạn có chắc chắn muốn hủy lệnh sản xuất này? Sau khi hủy, sản lượng thực tế sẽ được chốt và không thể cập nhật tiếp.' 
        : 'Are you sure you want to cancel this production order? Once cancelled, the actual quantity will be locked.';
      
      if (confirm(confirmMsg)) {
        try {
          const res = await fetch(`${window.basePath || ''}Api/CancelProductionOrder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(orderId, 10) })
          });
          const json = await res.json();
          if (json.success) {
            showToast(lang === 'vi' ? 'Đã hủy lệnh sản xuất thành công!' : 'Production order cancelled successfully!', 'success');
            
            // Reload data
            if (typeof reloadMachinesFromServer === 'function') {
              await reloadMachinesFromServer();
            }
            await fetchProductionOrders();
            displayProductionOrdersTable();
          } else {
            showToast(json.message || 'Lỗi khi hủy lệnh', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ!' : 'Server connection error!', 'error');
        }
      }
    };
  });

  // Bind start button events
  const startBtns = tableBody.querySelectorAll('.btn-start-order');
  startBtns.forEach(btn => {
    btn.onclick = async (e) => {
      const orderId = btn.getAttribute('data-order-id');
      const lang = state.language || 'vi';
      const confirmMsg = lang === 'vi' 
        ? 'Bạn có chắc chắn muốn kích hoạt lệnh sản xuất này? Lệnh đang chạy hiện tại của máy sẽ được chuyển sang trạng thái tạm dừng.' 
        : 'Are you sure you want to activate this production order? The currently running order on this machine will be paused.';
      
      if (confirm(confirmMsg)) {
        try {
          const res = await fetch(`${window.basePath || ''}Api/StartProductionOrder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(orderId, 10) })
          });
          const json = await res.json();
          if (json.success) {
            showToast(lang === 'vi' ? 'Kích hoạt lệnh sản xuất thành công!' : 'Activated production order successfully!', 'success');
            
            // Reload data
            if (typeof reloadMachinesFromServer === 'function') {
              await reloadMachinesFromServer();
            }
            await fetchProductionOrders();
            displayProductionOrdersTable();
          } else {
            showToast(json.message || 'Lỗi khi kích hoạt lệnh', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ!' : 'Server connection error!', 'error');
        }
      }
    };
  });

  // Cập nhật thông tin trang và các nút điều hướng phân trang
  const pageInfo = document.getElementById('production-orders-page-info');
  if (pageInfo) {
    const startDisplay = totalRecords === 0 ? 0 : startIndex + 1;
    pageInfo.textContent = lang === 'vi' 
      ? `Hiển thị ${startDisplay} - ${endIndex} trong ${totalRecords} lệnh` 
      : `Showing ${startDisplay} - ${endIndex} of ${totalRecords} orders`;
  }

  const pagination = document.getElementById('production-orders-pagination');
  if (pagination) {
    pagination.innerHTML = '';

    // Nút trước (Prev)
    const prevBtn = document.createElement('button');
    prevBtn.className = `page-link ${productionOrdersCurrentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    `;
    prevBtn.disabled = productionOrdersCurrentPage === 1;
    if (productionOrdersCurrentPage > 1) {
      prevBtn.onclick = () => {
        productionOrdersCurrentPage--;
        displayProductionOrdersTable();
      };
    }
    pagination.appendChild(prevBtn);

    // Các nút số trang
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-link ${i === productionOrdersCurrentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        productionOrdersCurrentPage = i;
        displayProductionOrdersTable();
      };
      pagination.appendChild(pageBtn);
    }

    // Nút sau (Next)
    const nextBtn = document.createElement('button');
    nextBtn.className = `page-link ${productionOrdersCurrentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
    nextBtn.disabled = productionOrdersCurrentPage === totalPages;
    if (productionOrdersCurrentPage < totalPages) {
      nextBtn.onclick = () => {
        productionOrdersCurrentPage++;
        displayProductionOrdersTable();
      };
    }
    pagination.appendChild(nextBtn);
  }
}

function initOrderFilters() {
  const searchInput = document.getElementById('order-search-input');
  const statusFilter = document.getElementById('order-status-filter');

  if (searchInput) {
    searchInput.oninput = () => {
      productionOrdersCurrentPage = 1;
      displayProductionOrdersTable();
    };
  }
  if (statusFilter) {
    statusFilter.onchange = () => {
      productionOrdersCurrentPage = 1;
      displayProductionOrdersTable();
    };
  }
}

function initOrderSaveAndExport() {
  const saveBtn = document.getElementById('btn-save-production-order');
  const exportPdfBtn = document.getElementById('btn-export-pdf-ticket');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const orderDate = document.getElementById('order-input-date').value.trim();
    const orderNo = document.getElementById('order-input-no').value.trim();
    const productCode = document.getElementById('order-input-prodcode').value.trim();
    const productName = document.getElementById('order-input-prodname').value.trim();
    const machineId = document.getElementById('order-input-machine').value.trim();
    const stage = document.getElementById('order-input-stage').value.trim();
    const qtyVal = document.getElementById('order-input-qty').value.trim();
    const lang = state.language || 'vi';

    if (!orderNo || !productCode || !productName || !qtyVal || !machineId) {
      showToast(lang === 'vi' ? 'Vui lòng điền đầy đủ các thông tin bắt buộc!' : 'Please fill all required fields!', 'error');
      return;
    }

    const plannedQty = parseInt(qtyVal, 10) || 0;
    const assignments = [{ machineCode: machineId, targetQuantity: plannedQty }];

    try {
      const res = await fetch(`${window.basePath || ''}Api/CreateProductionOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNo: orderNo,
          productCode: productCode,
          productName: productName,
          totalQuantity: plannedQty,
          unit: 'PCS',
          assignmentsJson: JSON.stringify(assignments),
          parentOrderId: currentParentOrderId,
          stage: stage,
          orderDate: orderDate
        })
      });
      const json = await res.json();
      if (json.success) {
        // Reset state kế thừa
        currentParentOrderId = null;
        const hintEl = document.getElementById('inherited-order-hint');
        if (hintEl) hintEl.style.display = 'none';

        // Cập nhật local state dự phòng
        const m = machinesData[machineId];
        if (m) {
          if (!m.ordersHistory.includes(orderNo)) {
            m.ordersHistory.push(orderNo);
          }
          m.activeOrderId = orderNo;
          m.productCode = productCode;
          m.productName = productName;
          m.order = orderNo;
          m.plannedQty = plannedQty.toLocaleString('vi-VN');
          m.totalOrder = plannedQty.toLocaleString('vi-VN');
          m.orderActual = "0";
          
          m.strokes = "0";
          m.efficiency = "0.0%";
          m.timeEfficiency = "0.0%";
          m.runtime = "00:00:00";
          m.stoptime = "00:00:00";
          m.trialTime = "00:00:00";
          m.trend = [0, 0, 0, 0];
        }

        // Lưu local storage
        localStorage.setItem('machinesData', JSON.stringify(machinesData));

        // Reload data
        if (typeof reloadMachinesFromServer === 'function') {
          await reloadMachinesFromServer();
        }
        
        await fetchProductionOrders();
        displayProductionOrdersTable();

        if (exportPdfBtn) {
          exportPdfBtn.removeAttribute('disabled');
          exportPdfBtn.style.cursor = 'pointer';
          exportPdfBtn.style.background = '#00e676';
          exportPdfBtn.style.color = '#fff';
        }

        showToast(lang === 'vi' ? 'Đã tạo và gán lệnh sản xuất thành công!' : 'Created and assigned production order successfully!', 'success');
      } else {
        showToast(json.message || (lang === 'vi' ? 'Lỗi tạo lệnh sản xuất' : 'Error creating order'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ!' : 'Server connection error!', 'error');
    }
  });

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      const orderNo = document.getElementById('order-input-no').value.trim();
      const productCode = document.getElementById('order-input-prodcode').value.trim();
      const productName = document.getElementById('order-input-prodname').value.trim();
      const machineId = document.getElementById('order-input-machine').value;
      const stage = document.getElementById('order-input-stage').value.trim();
      const qtyVal = document.getElementById('order-input-qty').value.trim();
      const plannedQty = parseInt(qtyVal, 10) || 0;

      exportOrderPDF(orderNo, productCode, productName, machineId, stage, plannedQty);
    });
  }
}

function exportOrderPDF(orderNo, productCode, productName, machineId, stage, plannedQty) {
  const lang = state.language || 'vi';
  const logoUrl = `${window.location.origin}${window.basePath || '/'}Image/logo.png`;
  const orderDate = new Date().toLocaleDateString('vi-VN');

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `
    <div style="font-family: 'Inter', sans-serif; color: #000; background-color: #fff; padding: 20px; border: 2.5px solid #000; max-width: 720px; margin: 0 auto; box-sizing: border-box;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
        .pdf-order-card * {
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif !important;
        }
      </style>
      <div class="pdf-order-card">
        <!-- Header -->
        <div style="display: flex; align-items: center; border-bottom: 2.5px solid #000; padding-bottom: 12px; margin-bottom: 0px; gap: 20px;">
          <div style="flex: 0 0 100px; display: flex; justify-content: center; align-items: center;">
            <img src="${logoUrl}" alt="Logo" style="max-width: 90px; height: auto;">
          </div>
          <div style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; padding-right: 40px;">
            <div style="font-size: 1.25rem; font-weight: bold; text-transform: uppercase; margin: 0; padding-bottom: 4px; letter-spacing: 0.5px;">CÔNG TY TNHH HẢI PHƯƠNG</div>
            <div style="font-size: 2.3rem; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 1px;">THẺ LỆNH SẢN XUẤT</div>
          </div>
        </div>
        
        <!-- Table Body -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 0px;">
          <tbody>
            <!-- 1. Ngày tạo lệnh -->
            <tr style="border-bottom: 1px solid #000;">
              <td style="border-right: 1px solid #000; padding: 12px 15px; width: 38%; font-weight: bold; font-size: 0.95rem; text-transform: uppercase;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" style="flex-shrink: 0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>NGÀY TẠO LỆNH:</span>
              </div>
            </td>
            <td style="padding: 12px 15px; font-size: 1.15rem; font-weight: bold; font-family: 'Arial', sans-serif; letter-spacing: 0.5px;">
              ${orderDate}
            </td>
          </tr>

          <!-- 2. Lệnh sản xuất số -->
          <tr style="border-bottom: 1px solid #000;">
            <td style="border-right: 1px solid #000; padding: 12px 15px; font-weight: bold; font-size: 0.95rem; text-transform: uppercase; font-family: 'Arial', sans-serif;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" style="flex-shrink: 0;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                <span>LỆNH SẢN XUẤT SỐ:</span>
              </div>
            </td>
            <td style="padding: 12px 15px; font-size: 1.15rem; font-weight: bold; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
              ${orderNo}
            </td>
          </tr>

          <!-- 3. Mã sản phẩm -->
          <tr style="border-bottom: 1px solid #000;">
            <td style="border-right: 1px solid #000; padding: 12px 15px; font-weight: bold; font-size: 0.95rem; text-transform: uppercase; font-family: 'Arial', sans-serif;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" style="flex-shrink: 0;"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <span>MÃ SẢN PHẨM:</span>
              </div>
            </td>
            <td style="padding: 12px 15px; font-size: 1.15rem; font-weight: bold; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
              ${productCode}
            </td>
          </tr>

          <!-- 4. Tên sản phẩm -->
          <tr style="border-bottom: 1px solid #000;">
            <td style="border-right: 1px solid #000; padding: 12px 15px; font-weight: bold; font-size: 0.95rem; text-transform: uppercase; font-family: 'Arial', sans-serif;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" style="flex-shrink: 0;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                <span>TÊN SẢN PHẨM:</span>
              </div>
            </td>
            <td style="padding: 12px 15px; font-size: 1.15rem; font-weight: bold; font-family: 'Arial', sans-serif;">
              ${productName}
            </td>
          </tr>

          <!-- 5. Mã máy -->
          <tr style="border-bottom: 1px solid #000;">
            <td style="border-right: 1px solid #000; padding: 12px 15px; font-weight: bold; font-size: 0.95rem; text-transform: uppercase; font-family: 'Arial', sans-serif;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" style="flex-shrink: 0;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                <span>MÃ MÁY:</span>
              </div>
            </td>
            <td style="padding: 12px 15px; font-size: 1.15rem; font-weight: bold; font-family: 'Arial', sans-serif; text-transform: uppercase;">
              ${machineId}
            </td>
          </tr>

          <!-- 6. Công đoạn -->
          <tr style="border-bottom: 1px solid #000;">
            <td style="border-right: 1px solid #000; padding: 12px 15px; font-weight: bold; font-size: 0.95rem; text-transform: uppercase; font-family: 'Arial', sans-serif;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" style="flex-shrink: 0;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span>CÔNG ĐOẠN:</span>
              </div>
            </td>
            <td style="padding: 12px 15px; font-size: 1.15rem; font-weight: bold; font-family: 'Arial', sans-serif;">
              ${stage}
            </td>
          </tr>

          <!-- 7. Số lượng (PCS) -->
          <tr>
            <td style="border-right: 1px solid #000; padding: 12px 15px; font-weight: bold; font-size: 0.95rem; text-transform: uppercase; font-family: 'Arial', sans-serif;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" style="flex-shrink: 0;"><polyline points="4 17 12 21 20 17"></polyline><polyline points="4 12 12 16 20 12"></polyline><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon></svg>
                <span>SỐ LƯỢNG (PCS):</span>
              </div>
            </td>
            <td style="padding: 12px 15px; font-size: 1.3rem; font-weight: bold; font-family: 'Arial', sans-serif;">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>${plannedQty.toLocaleString('en-US')}</span>
                <span>PCS</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  `;

  const opt = {
    margin:       10,
    filename:     `LENH-SX-${orderNo}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(tempDiv.firstElementChild).save().then(() => {
    showToast(lang === 'vi' ? 'Đã xuất file PDF thành công!' : 'Exported PDF successfully!', 'success');
  });
}

function viewOrderDetails(orderNo) {
  const order = productionOrdersList.find(o => o.orderNo === orderNo);
  if (!order) return;

  const lang = state.language || 'vi';
  
  // Tạo modal hiển thị chi tiết
  const modal = document.createElement('div');
  modal.className = 'alarm-modal-overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div class="alarm-modal-card" style="max-width: 500px; width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.15rem; color: var(--accent-blue); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
        CHI TIẾT LỆNH SẢN XUẤT
      </h3>
      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem; color: #fff;">
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">Mã Lệnh:</span><strong>${order.orderNo}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">Ngày tạo:</span><span>${order.createdDate}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">Mã sản phẩm:</span><span>${order.productCode}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">Tên sản phẩm:</span><span style="max-width: 60%; text-align: right;">${order.productName}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">Công đoạn:</span><span>${order.stage}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">Máy chạy:</span><strong style="color: var(--accent-blue);">${order.machineId}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">SL Kế hoạch:</span><strong>${order.plannedQty.toLocaleString('en-US')} PCS</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">SL Thực tế:</span><strong style="color: #00d2ff;">${order.actualQty.toLocaleString('en-US')} PCS</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-secondary);">Trạng thái:</span><span class="status-badge-custom status-${order.status}">${order.status.toUpperCase()}</span></div>
      </div>
      <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
        <button class="alarm-modal-btn btn-close" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Đóng</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.btn-close').onclick = () => {
    modal.remove();
  };
}

window.exportOrderPDF = exportOrderPDF;
window.viewOrderDetails = viewOrderDetails;
