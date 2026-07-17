const flagViSVG = `
  <svg viewBox="0 0 30 20" style="width: 20px; height: 14px; border-radius: 2px;">
    <rect width="30" height="20" fill="#da251d"/>
    <polygon points="15,4 16.35,8.15 20.7,8.15 17.2,10.7 18.5,14.85 15,12.3 11.5,14.85 12.8,10.7 9.3,8.15 13.65,8.15" fill="#ffff00"/>
  </svg>
`;

const flagEnSVG = `
  <svg viewBox="0 0 30 20" style="width: 20px; height: 14px; border-radius: 2px; border: 1px solid rgba(255, 255, 255, 0.1);">
    <rect width="30" height="20" fill="#fff"/>
    <rect width="30" height="1.54" y="0" fill="#b22234"/>
    <rect width="30" height="1.54" y="3.08" fill="#b22234"/>
    <rect width="30" height="1.54" y="6.15" fill="#b22234"/>
    <rect width="30" height="1.54" y="9.23" fill="#b22234"/>
    <rect width="30" height="1.54" y="12.31" fill="#b22234"/>
    <rect width="30" height="1.54" y="15.38" fill="#b22234"/>
    <rect width="30" height="1.54" y="18.46" fill="#b22234"/>
    <rect width="12" height="10.77" fill="#3c3b6e"/>
    <circle cx="3" cy="2.5" r="0.6" fill="#fff"/>
    <circle cx="6" cy="2.5" r="0.6" fill="#fff"/>
    <circle cx="9" cy="2.5" r="0.6" fill="#fff"/>
    <circle cx="4.5" cy="5" r="0.6" fill="#fff"/>
    <circle cx="7.5" cy="5" r="0.6" fill="#fff"/>
    <circle cx="3" cy="7.5" r="0.6" fill="#fff"/>
    <circle cx="6" cy="7.5" r="0.6" fill="#fff"/>
    <circle cx="9" cy="7.5" r="0.6" fill="#fff"/>
  </svg>
`;

function renderSettingsView() {
  const tableBody = document.getElementById('settings-accounts-body');
  if (!tableBody) return;

  const lang = state.language || 'vi';
  const query = state.settingsSearchQuery.toLowerCase();
  
  // Filter accounts
  const filtered = state.accountsData.filter(acc => {
    return acc.username.toLowerCase().includes(query) || acc.role.toLowerCase().includes(query);
  });

  const totalRecords = filtered.length;
  const pageSize = parseInt(state.settingsPageSize, 10);
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  if (state.settingsCurrentPage > totalPages) {
    state.settingsCurrentPage = totalPages;
  }

  const startIndex = (state.settingsCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pageRecords = filtered.slice(startIndex, endIndex);

  tableBody.innerHTML = '';

  if (pageRecords.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 24px; color: var(--text-secondary);">
          ${lang === 'vi' ? 'Không tìm thấy tài khoản nào' : 'No accounts found'}
        </td>
      </tr>
    `;
  } else {
    pageRecords.forEach((acc, idx) => {
      const globalIdx = startIndex + idx + 1;
      const tr = document.createElement('tr');
      
      const badgeClass = acc.role === 'ADMIN' ? 'badge-success' : 'badge-info';
      
      tr.innerHTML = `
        <td style="text-align: center; vertical-align: middle;">${globalIdx}</td>
        <td style="text-align: left; font-weight: 600; color: #fff; vertical-align: middle;">${acc.username}</td>
        <td style="text-align: center; vertical-align: middle;">
          <span class="badge ${badgeClass}" style="font-size: 0.7rem; padding: 4px 10px; border-radius: 12px; font-weight: 700;">${acc.role}</span>
        </td>
        <td style="text-align: center; vertical-align: middle;">
          <div style="display: inline-flex; align-items: center; gap: 12px; justify-content: center; width: 100%;">
            <select class="settings-role-select" data-username="${acc.username}">
              <option value="ADMIN" ${acc.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
              <option value="OPERATOR" ${acc.role === 'OPERATOR' ? 'selected' : ''}>Operator</option>
            </select>
            <button class="btn-change-pwd" data-username="${acc.username}">
              <span style="font-size: 0.9rem; line-height: 1;">🔑</span>
              <span data-i18n="settings_btn_change_pwd">${lang === 'vi' ? 'Đổi mật khẩu' : 'Change password'}</span>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Update pagination info
  const tableInfo = document.getElementById('settings-table-info');
  if (tableInfo) {
    if (lang === 'vi') {
      tableInfo.textContent = totalRecords > 0 
        ? `Hiển thị ${startIndex + 1} đến ${endIndex} trong ${totalRecords} tài khoản` 
        : `Hiển thị 0 đến 0 trong 0 tài khoản`;
    } else {
      tableInfo.textContent = totalRecords > 0 
        ? `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords} accounts` 
        : `Showing 0 to 0 of 0 accounts`;
    }
  }

  // Update pagination buttons
  const pagination = document.getElementById('settings-pagination');
  if (pagination) {
    pagination.innerHTML = '';
    
    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = `paginate-btn ${state.settingsCurrentPage === 1 ? 'disabled' : ''}`;
    prevBtn.style.cssText = `background: var(--bg-primary); border: 1px solid var(--border-color); color: ${state.settingsCurrentPage === 1 ? 'var(--text-secondary)' : '#fff'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;`;
    prevBtn.textContent = lang === 'vi' ? 'Trước' : 'Prev';
    if (state.settingsCurrentPage > 1) {
      prevBtn.addEventListener('click', () => {
        state.settingsCurrentPage--;
        renderSettingsView();
      });
    }
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      const isActive = i === state.settingsCurrentPage;
      pageBtn.className = `paginate-btn ${isActive ? 'active' : ''}`;
      pageBtn.style.cssText = `background: ${isActive ? 'var(--accent-blue)' : 'var(--bg-primary)'}; border: 1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-color)'}; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        state.settingsCurrentPage = i;
        renderSettingsView();
      });
      pagination.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = `paginate-btn ${state.settingsCurrentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.style.cssText = `background: var(--bg-primary); border: 1px solid var(--border-color); color: ${state.settingsCurrentPage === totalPages ? 'var(--text-secondary)' : '#fff'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;`;
    nextBtn.textContent = lang === 'vi' ? 'Sau' : 'Next';
    if (state.settingsCurrentPage < totalPages) {
      nextBtn.addEventListener('click', () => {
        state.settingsCurrentPage++;
        renderSettingsView();
      });
    }
    pagination.appendChild(nextBtn);
  }

  // Bind change role dropdown and change password buttons
  document.querySelectorAll('.settings-role-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const username = sel.getAttribute('data-username');
      const newRole = e.target.value;
      const account = state.accountsData.find(a => a.username === username);
      if (account) {
        account.role = newRole;
        renderSettingsView();
        const msg = lang === 'vi' 
          ? `Quyền hạn của tài khoản "${username}" đã được chuyển thành ${newRole}!` 
          : `Account "${username}" role updated to ${newRole}!`;
        showToast(msg, 'success');
      }
    });
  });

  document.querySelectorAll('.btn-change-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-username');
      const pwdModal = document.getElementById('settings-pwd-modal');
      const usernameInput = document.getElementById('settings-pwd-username');
      const pwdInput = document.getElementById('settings-pwd-newpwd');
      
      if (pwdModal && usernameInput && pwdInput) {
        usernameInput.value = username;
        pwdInput.value = '';
        pwdModal.classList.remove('hidden');
      }
    });
  });
}

function initSettingsControls() {
  const createBtn = document.getElementById('btn-create-account');
  const createModal = document.getElementById('settings-create-modal');
  const createClose = document.getElementById('settings-create-close');
  const createCancel = document.getElementById('settings-create-cancel');
  const createSubmit = document.getElementById('settings-create-submit');

  const closeCreateModal = () => {
    if (createModal) createModal.classList.add('hidden');
  };

  if (createBtn && createModal) {
    createBtn.addEventListener('click', () => {
      document.getElementById('settings-create-username').value = '';
      document.getElementById('settings-create-password').value = '';
      document.getElementById('settings-create-role').value = 'OPERATOR';
      createModal.classList.remove('hidden');
    });
  }

  if (createClose) createClose.addEventListener('click', closeCreateModal);
  if (createCancel) createCancel.addEventListener('click', closeCreateModal);

  if (createSubmit) {
    createSubmit.addEventListener('click', () => {
      const username = document.getElementById('settings-create-username').value.trim();
      const role = document.getElementById('settings-create-role').value;
      const password = document.getElementById('settings-create-password').value;
      const lang = state.language || 'vi';

      if (!username || !password) {
        const errorMsg = lang === 'vi' ? 'Vui lòng điền đầy đủ thông tin!' : 'Please fill in all fields!';
        showToast(errorMsg, 'error');
        return;
      }

      if (state.accountsData.some(a => a.username.toLowerCase() === username.toLowerCase())) {
        const errorMsg = lang === 'vi' ? 'Tên đăng nhập đã tồn tại!' : 'Username already exists!';
        showToast(errorMsg, 'error');
        return;
      }

      state.accountsData.push({ username, role });
      closeCreateModal();
      renderSettingsView();

      const successMsg = lang === 'vi' ? `Đã tạo tài khoản "${username}" thành công!` : `Account "${username}" created successfully!`;
      showToast(successMsg, 'success');
    });
  }

  // Password Modal Controls
  const pwdModal = document.getElementById('settings-pwd-modal');
  const pwdClose = document.getElementById('settings-pwd-close');
  const pwdCancel = document.getElementById('settings-pwd-cancel');
  const pwdSubmit = document.getElementById('settings-pwd-submit');

  const closePwdModal = () => {
    if (pwdModal) pwdModal.classList.add('hidden');
  };

  if (pwdClose) pwdClose.addEventListener('click', closePwdModal);
  if (pwdCancel) pwdCancel.addEventListener('click', closePwdModal);

  if (pwdSubmit) {
    pwdSubmit.addEventListener('click', () => {
      const username = document.getElementById('settings-pwd-username').value;
      const newPwd = document.getElementById('settings-pwd-newpwd').value;
      const lang = state.language || 'vi';

      if (!newPwd) {
        const errorMsg = lang === 'vi' ? 'Vui lòng nhập mật khẩu mới!' : 'Please enter a new password!';
        showToast(errorMsg, 'error');
        return;
      }

      closePwdModal();
      const successMsg = lang === 'vi' 
        ? `Mật khẩu của tài khoản "${username}" đã được cập nhật thành công!` 
        : `Password for "${username}" updated successfully!`;
      showToast(successMsg, 'success');
    });
  }

  // Table controls (page size and search)
  const pageSizeSelect = document.getElementById('settings-page-size');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      state.settingsPageSize = e.target.value;
      state.settingsCurrentPage = 1;
      renderSettingsView();
    });
  }

  const searchInput = document.getElementById('settings-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.settingsSearchQuery = e.target.value;
      state.settingsCurrentPage = 1;
      renderSettingsView();
    });
  }

  // Header Language Switcher
  const headerLangBtn = document.getElementById('header-lang-btn');
  const headerLangDropdown = document.getElementById('header-lang-dropdown');
  const headerLangFlag = document.getElementById('header-lang-flag');

  if (headerLangBtn && headerLangDropdown) {
    headerLangBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      headerLangDropdown.classList.toggle('hidden');
    });

    document.querySelectorAll('#header-lang-dropdown .lang-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const lang = item.getAttribute('data-lang');
        state.language = lang;
        if (headerLangFlag) {
          headerLangFlag.innerHTML = lang === 'vi' ? flagViSVG : flagEnSVG;
        }
        
        translateUI(lang);
        renderSettingsView();
        
        const langMsg = lang === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English';
        showToast(langMsg, 'success');
        headerLangDropdown.classList.add('hidden');
      });
    });

    document.addEventListener('click', () => {
      headerLangDropdown.classList.add('hidden');
    });
  }

  // Khởi tạo các cấu hình ca, tăng ca, thông số kỹ thuật và thẻ lệnh sản xuất in PDF
  initMachineSettingsConfig();
}

function initMachineSettingsConfig() {
  const machineSelect = document.getElementById('config-machine-select');
  if (!machineSelect) return;

  const categorySelect = document.getElementById('config-machine-category-select');
  const searchInput = document.getElementById('config-machine-search');
  const lang = state.language || 'vi';

  // Load machine configuration
  const loadMachineConfig = async (id) => {
    const m = machinesData[id];
    if (!m) return;

    // Shift selection
    const shiftSelect = document.getElementById('config-shift-select');
    if (shiftSelect) {
      shiftSelect.value = m.shiftHours || "8";
    }

    // Overtime checkbox
    const otCheckbox = document.getElementById('config-overtime-checkbox');
    if (otCheckbox) {
      otCheckbox.checked = !!m.overtimeRegistered;
    }

    // Tải động danh mục thuộc tính theo loại máy từ database
    const attrsContainer = document.getElementById('technical-attrs-inputs');
    if (attrsContainer) {
      attrsContainer.innerHTML = '';
      const attrs = m.attributes || {};
      
      try {
        const typeId = m.machineTypeId || (m.type === 'screw' ? 2 : 1);
        const res = await fetch(`${window.basePath || ''}Api/GetMachineTypeAttributes?typeId=${typeId}`);
        const json = await res.json();
        
        if (json.success && json.data) {
          json.data.forEach(attr => {
            const key = attr.key;
            const label = lang === 'vi' ? attr.displayName : attr.key;
            const unitSuffix = attr.unit ? ` (${attr.unit})` : '';
            const val = attrs[key] || '';
            
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
            item.innerHTML = `
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${label}${unitSuffix}:</span>
              <input type="text" class="tech-attr-input" data-key="${key}" value="${val}" style="padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: #fff; outline: none; font-size: 0.85rem; transition: all 0.2s; width: 100%;">
            `;
            attrsContainer.appendChild(item);
          });
        }
      } catch (err) {
        console.error("Failed to load dynamic attributes from server", err);
      }
    }
  };

  const populateSelect = () => {
    const selectedCategory = categorySelect ? categorySelect.value : 'all';
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    // Lưu lại máy đang được chọn trước đó
    const prevSelected = machineSelect.value;
    
    machineSelect.innerHTML = '';
    let firstId = null;
    let foundPrev = false;

    Object.keys(machinesData).sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).forEach(id => {
      const m = machinesData[id];
      
      // Lọc theo Category
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'stamping' && m.machineTypeId !== 1) return;
        if (selectedCategory === 'heading' && m.machineTypeId !== 2) return;
        if (selectedCategory === 'threading' && m.machineTypeId !== 3) return;
      }

      // Lọc theo từ khóa tìm kiếm (mã máy, tên máy)
      if (searchQuery !== '') {
        const matchMachine = id.toLowerCase().includes(searchQuery) || m.name.toLowerCase().includes(searchQuery);
        if (!matchMachine) return;
      }

      const typeLabel = m.machineTypeId === 1 ? (lang === 'vi' ? 'Máy Dập' : 'Stamping Press') :
                        m.machineTypeId === 2 ? (lang === 'vi' ? 'Máy Đấm Đầu' : 'Heading Machine') :
                        (lang === 'vi' ? 'Máy Cán Ren' : 'Threading Machine');
      
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${typeLabel} #${id} (${m.name})`;
      machineSelect.appendChild(opt);

      if (!firstId) firstId = id;
      if (id === prevSelected) foundPrev = true;
    });

    if (foundPrev) {
      machineSelect.value = prevSelected;
    } else if (firstId) {
      machineSelect.value = firstId;
      loadMachineConfig(firstId);
    } else {
      const attrsContainer = document.getElementById('technical-attrs-inputs');
      if (attrsContainer) attrsContainer.innerHTML = '';
    }
  };

  if (categorySelect) {
    categorySelect.onchange = populateSelect;
  }
  if (searchInput) {
    searchInput.oninput = populateSelect;
  }

  // Populate first time
  populateSelect();

  // Change machine dropdown listener
  machineSelect.addEventListener('change', (e) => {
    loadMachineConfig(e.target.value);
  });

  // 3. Save Machine Configuration
  const saveOnlyBtn = document.getElementById('btn-save-only-machine-config');
  if (saveOnlyBtn) {
    saveOnlyBtn.addEventListener('click', async () => {
      const activeId = machineSelect.value;
      const m = machinesData[activeId];
      if (!m) return;

      const shiftSelect = document.getElementById('config-shift-select');
      const otCheckbox = document.getElementById('config-overtime-checkbox');

      // Thu thập thông số kỹ thuật động
      const attributes = {};
      const techInputs = document.querySelectorAll('.tech-attr-input');
      techInputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        attributes[key] = inp.value;
      });

      // 1. Lưu cấu hình thuộc tính máy xuống DB
      try {
        await fetch(`${window.basePath || ''}Api/SaveMachineConfig`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: activeId,
            attributesJson: JSON.stringify(attributes),
            ipAddress: '',
            port: null,
            isMonitored: m.isMonitored !== false
          })
        });
      } catch (err) {
        console.error("Failed to save machine config to DB", err);
      }

      // 2. Lưu cấu hình ca làm việc xuống DB
      if (shiftSelect) {
        const hours = parseInt(shiftSelect.value, 10) || 8;
        let startTime = "07:30:00";
        let endTime = hours === 12 ? "19:30:00" : "15:30:00";
        
        try {
          await fetch(`${window.basePath || ''}Api/SaveShiftConfig`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: activeId,
              shiftType: hours === 12 ? "Ca 12h" : "Ca 8h",
              startTime: startTime,
              endTime: endTime
            })
          });
        } catch (err) {
          console.error("Failed to save shift config to DB", err);
        }
      }

      // Cập nhật State cục bộ
      if (shiftSelect) {
        m.shiftHours = parseInt(shiftSelect.value, 10);
        m.runtimeMax = `${m.shiftHours.toString().padStart(2, '0')}:00:00`;
      }
      if (otCheckbox) {
        m.overtimeRegistered = otCheckbox.checked;
      }
      techInputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        if (m.attributes) {
          m.attributes[key] = inp.value;
        }
      });

      // Lưu đệm local
      localStorage.setItem('machinesData', JSON.stringify(machinesData));

      // Reload dữ liệu từ máy chủ sau khi lưu
      if (typeof reloadMachinesFromServer === 'function') {
        await reloadMachinesFromServer();
      }

      if (typeof renderOverviewGrid === 'function') renderOverviewGrid();
      if (typeof renderHistoryTable === 'function') renderHistoryTable();

      const successMsg = lang === 'vi' 
        ? `Lưu cấu hình thiết bị #${activeId} thành công!`
        : `Saved configuration for Machine #${activeId} successfully!`;
      showToast(successMsg, 'success');
    });
  }

  // Khởi tạo tính năng thêm thiết bị mới
  initAddMachineModal();
}

function initAddMachineModal() {
  const addBtn = document.getElementById('btn-add-machine');
  const modal = document.getElementById('settings-add-machine-modal');
  const closeBtn = document.getElementById('add-machine-close');
  const cancelBtn = document.getElementById('add-machine-cancel');
  const submitBtn = document.getElementById('add-machine-submit');
  const typeSelect = document.getElementById('add-machine-type');
  const attrsContainer = document.getElementById('add-machine-dynamic-attributes');

  if (!modal) return;

  const showModal = async () => {
    // Reset form fields
    document.getElementById('add-machine-code').value = '';
    document.getElementById('add-machine-name').value = '';
    document.getElementById('add-machine-monitored').checked = true;
    attrsContainer.innerHTML = '';

    // Load machine types from API
    try {
      const res = await fetch(`${window.basePath || ''}Api/GetMachineTypes`);
      const json = await res.json();
      if (json.success && json.data) {
        typeSelect.innerHTML = '';
        json.data.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.name;
          typeSelect.appendChild(opt);
        });

        // Trigger change to load attributes for first type
        if (json.data.length > 0) {
          typeSelect.value = json.data[0].id;
          loadDynamicAttributes(json.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load machine types", err);
    }

    modal.classList.remove('hidden');
  };

  const hideModal = () => {
    modal.classList.add('hidden');
  };

  const loadDynamicAttributes = async (typeId) => {
    attrsContainer.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Đang tải thuộc tính...</span>';
    try {
      const res = await fetch(`${window.basePath || ''}Api/GetMachineTypeAttributes?typeId=${typeId}`);
      const json = await res.json();
      if (json.success && json.data) {
        attrsContainer.innerHTML = '';
        json.data.forEach(attr => {
          const div = document.createElement('div');
          div.style.cssText = 'display: flex; flex-direction: column; gap: 6px; text-align: left; align-items: stretch;';
          
          const labelText = attr.displayName + (attr.unit ? ` (${attr.unit})` : '');
          div.innerHTML = `
            <span style="color: #a0aec0; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${labelText}</span>
            <input type="text" class="add-machine-attr-input" data-key="${attr.key}" placeholder="Nhập ${attr.displayName.toLowerCase()}..." style="width: 100%; padding: 10px 12px; background: #0b1426; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: white; outline: none;">
          `;
          attrsContainer.appendChild(div);
        });
      } else {
        attrsContainer.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Không có thông số đặc thù.</span>';
      }
    } catch (err) {
      console.error("Failed to load attributes", err);
      attrsContainer.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Lỗi tải thuộc tính.</span>';
    }
  };

  if (addBtn) addBtn.addEventListener('click', showModal);
  if (closeBtn) closeBtn.addEventListener('click', hideModal);
  if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      loadDynamicAttributes(e.target.value);
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const code = document.getElementById('add-machine-code').value.trim();
      const name = document.getElementById('add-machine-name').value.trim();
      const typeId = typeSelect.value;
      const isMonitored = document.getElementById('add-machine-monitored').checked;
      const lang = state.language || 'vi';

      if (!code || !name) {
        showToast(lang === 'vi' ? 'Vui lòng điền đầy đủ Mã máy và Tên máy!' : 'Please fill in Machine Code and Name!', 'error');
        return;
      }

      // Collect attributes
      const attributes = {};
      const inputs = document.querySelectorAll('.add-machine-attr-input');
      inputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        attributes[key] = inp.value.trim();
      });

      // Submit to backend
      try {
        const res = await fetch(`${window.basePath || ''}Api/AddMachine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: code,
            name: name,
            typeId: typeId,
            isMonitored: isMonitored,
            attributes: attributes
          })
        });
        const json = await res.json();
        if (json.success) {
          showToast(json.message || (lang === 'vi' ? 'Thêm mới thiết bị thành công!' : 'Machine added successfully!'), 'success');
          
          // Reload machines in state
          if (typeof reloadMachinesFromServer === 'function') {
            await reloadMachinesFromServer();
          }

          // Refresh selector on settings page
          if (typeof initMachineSettingsConfig === 'function') {
            initMachineSettingsConfig();
          }

          // Redraw grids on Overview
          if (typeof renderOverviewGrid === 'function') {
            renderOverviewGrid();
          }

          hideModal();
        } else {
          showToast(json.message || 'Lỗi thêm mới thiết bị.', 'error');
        }
      } catch (err) {
        console.error("Failed to add machine", err);
        showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ.' : 'Connection error.', 'error');
      }
    });
  }
}
