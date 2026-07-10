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
        ? `Đang xem ${startIndex + 1} đến ${endIndex} trong ${totalRecords} tài khoản` 
        : `Đang xem 0 đến 0 trong 0 tài khoản`;
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
}
