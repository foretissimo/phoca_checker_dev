/**
 * Phoca Checker - Main Application Logic
 */
class PhocaCheckerApp {
  constructor() {
    this.categories = window.PRESET_CATEGORIES || [];
    this.templates = window.PRESET_TEMPLATES || [];
    
    this.currentView = 'home'; // 'home' | 'checker'
    this.currentCategory = this.categories[0] || null;
    this.currentTemplate = this.templates[0] || null;
    this.currentTemplateId = this.templates[0]?.id || 'fore1';
    
    // Checked cards set for active template
    this.checkedCards = new Set();
    
    // Display mode: 'hide-owned' | 'hide-unowned'
    this.displayMode = 'hide-owned';
    this.overlayOpacity = 0.68;
    
    // Drawer Filters
    this.drawerTagFilter = 'all';
    this.drawerSearchQuery = '';

    this.initElements();
    this.loadSavedState();
    this.bindEvents();
    
    // Initialize visual editor
    this.editor = new TemplateEditor(this);

    // Initial Route
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  initElements() {
    // Views
    this.homeView = document.getElementById('home-view');
    this.checkerView = document.getElementById('checker-view');
    this.categoriesGrid = document.getElementById('categories-grid');
    
    // Nav & Breadcrumbs
    this.btnNavHome = document.getElementById('btn-nav-home');
    this.navCategoryName = document.getElementById('nav-category-name');
    this.navTemplateName = document.getElementById('nav-template-name');
    this.btnExportAllMerged = document.getElementById('btn-export-all-merged');
    
    // Backup & Restore
    this.btnOpenBackup = document.getElementById('btn-open-backup');
    this.btnHomeOpenBackup = document.getElementById('btn-home-open-backup');
    this.backupModalBackdrop = document.getElementById('backup-modal-backdrop');
    this.btnCloseBackupModal = document.getElementById('close-backup-modal-btn');
    this.btnExportBackup = document.getElementById('btn-export-backup');
    this.backupFileInput = document.getElementById('backup-file-input');

    // Info & Notice Modal
    this.btnOpenInfo = document.getElementById('btn-open-info');
    this.btnNoticeTicker = document.getElementById('btn-notice-ticker');
    this.infoModalBackdrop = document.getElementById('info-modal-backdrop');
    this.btnCloseInfoModal = document.getElementById('close-info-modal-btn');

    // Share to X Button
    this.btnShareX = document.getElementById('btn-share-x');

    // Trigger button for Template Drawer
    this.templateSelectorBtn = document.getElementById('template-selector-btn');
    this.currentTemplateTitleEl = document.getElementById('current-template-title');
    this.currentTemplateTagEl = document.getElementById('current-template-tag');
    this.currentTemplateStatusEl = document.getElementById('current-template-status');

    // Drawer Elements
    this.drawerBackdrop = document.getElementById('drawer-backdrop');
    this.closeDrawerBtn = document.getElementById('close-drawer-btn');
    this.drawerSearchInput = document.getElementById('drawer-search-input');
    this.drawerTagsContainer = document.getElementById('drawer-tags-container');
    this.drawerListContainer = document.getElementById('drawer-list-container');
    this.btnDrawerExportMerged = document.getElementById('btn-drawer-export-merged');
    
    // Pager Prev / Next
    this.btnPrevTemplate = document.getElementById('btn-prev-template');
    this.btnNextTemplate = document.getElementById('btn-next-template');
    this.pagerInfo = document.getElementById('pager-info');
    
    // Main Viewport
    this.mainImage = document.getElementById('main-sheet-image');
    this.imageWrapper = document.getElementById('image-wrapper');
    this.cardOverlayContainer = document.getElementById('card-overlay-container');
    this.imageModeTag = document.getElementById('image-mode-tag');
    
    // Display Mode Toggles
    this.modeHideOwnedBtn = document.getElementById('mode-hide-owned');
    this.modeHideUnownedBtn = document.getElementById('mode-hide-unowned');
    
    // Bulk Actions
    this.btnSelectAll = document.getElementById('btn-select-all');
    this.btnDeselectAll = document.getElementById('btn-deselect-all');
    this.btnInvertSelection = document.getElementById('btn-invert-selection');
    
    // Export PNG
    this.btnExportPng = document.getElementById('btn-export-png');
    
    // Custom Image Upload
    this.customImageUpload = document.getElementById('custom-image-upload');
    
    // Stats
    this.statCount = document.getElementById('stat-count');
    this.statPercent = document.getElementById('stat-percent');
    this.progressBar = document.getElementById('progress-bar-fill');
    
    // Toast
    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Nav Home
    if (this.btnNavHome) {
      this.btnNavHome.addEventListener('click', () => {
        window.location.hash = '#/home';
      });
    }

    // Export All Merged
    if (this.btnExportAllMerged) {
      this.btnExportAllMerged.addEventListener('click', () => this.exportAllMergedImage());
    }
    if (this.btnDrawerExportMerged) {
      this.btnDrawerExportMerged.addEventListener('click', () => this.exportAllMergedImage());
    }

    // Backup & Restore
    if (this.btnOpenBackup) {
      this.btnOpenBackup.addEventListener('click', () => this.openBackupModal());
    }
    if (this.btnHomeOpenBackup) {
      this.btnHomeOpenBackup.addEventListener('click', () => this.openBackupModal());
    }
    if (this.btnCloseBackupModal) {
      this.btnCloseBackupModal.addEventListener('click', () => this.closeBackupModal());
    }
    if (this.backupModalBackdrop) {
      this.backupModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.backupModalBackdrop) this.closeBackupModal();
      });
    }
    if (this.btnExportBackup) {
      this.btnExportBackup.addEventListener('click', () => this.exportBackupData());
    }
    if (this.backupFileInput) {
      this.backupFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.importBackupData(file);
      });
    }

    // Info & Notice Modal
    if (this.btnOpenInfo) {
      this.btnOpenInfo.addEventListener('click', () => this.openInfoModal());
    }
    if (this.btnNoticeTicker) {
      this.btnNoticeTicker.addEventListener('click', () => this.openInfoModal());
    }
    if (this.btnCloseInfoModal) {
      this.btnCloseInfoModal.addEventListener('click', () => this.closeInfoModal());
    }
    if (this.infoModalBackdrop) {
      this.infoModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.infoModalBackdrop) this.closeInfoModal();
      });
    }

    // Share to X
    if (this.btnShareX) {
      this.btnShareX.addEventListener('click', () => this.shareToX());
    }

    // Open Template Drawer
    if (this.templateSelectorBtn) {
      this.templateSelectorBtn.addEventListener('click', () => this.openDrawer());
    }

    // Close Drawer
    if (this.closeDrawerBtn) {
      this.closeDrawerBtn.addEventListener('click', () => this.closeDrawer());
    }
    if (this.drawerBackdrop) {
      this.drawerBackdrop.addEventListener('click', (e) => {
        if (e.target === this.drawerBackdrop) this.closeDrawer();
      });
    }

    // Drawer Search & Filter
    if (this.drawerSearchInput) {
      this.drawerSearchInput.addEventListener('input', (e) => {
        this.drawerSearchQuery = e.target.value.toLowerCase().trim();
        this.renderDrawerList();
      });
    }

    // Pager Prev/Next
    if (this.btnPrevTemplate) {
      this.btnPrevTemplate.addEventListener('click', () => this.goToAdjacentTemplate(-1));
    }
    if (this.btnNextTemplate) {
      this.btnNextTemplate.addEventListener('click', () => this.goToAdjacentTemplate(1));
    }

    // Mode Toggles
    if (this.modeHideOwnedBtn) {
      this.modeHideOwnedBtn.addEventListener('click', () => this.setDisplayMode('hide-owned'));
    }
    if (this.modeHideUnownedBtn) {
      this.modeHideUnownedBtn.addEventListener('click', () => this.setDisplayMode('hide-unowned'));
    }

    // Bulk Actions
    if (this.btnSelectAll) {
      this.btnSelectAll.addEventListener('click', () => this.selectAllCards());
    }
    if (this.btnDeselectAll) {
      this.btnDeselectAll.addEventListener('click', () => this.deselectAllCards());
    }
    if (this.btnInvertSelection) {
      this.btnInvertSelection.addEventListener('click', () => this.invertSelection());
    }

    // Export PNG
    if (this.btnExportPng) {
      this.btnExportPng.addEventListener('click', () => this.exportImage());
    }

    // Custom Image Upload
    if (this.customImageUpload) {
      this.customImageUpload.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleCustomImageUpload(file);
      });
    }

    // Arrow Keys for Prev/Next
    window.addEventListener('keydown', (e) => {
      if (this.currentView === 'checker' && !this.isDrawerOpen() && !this.editor?.active) {
        if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
          this.goToAdjacentTemplate(-1);
        } else if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
          this.goToAdjacentTemplate(1);
        }
      }
    });
  }

  loadSavedState() {
    try {
      const savedMode = localStorage.getItem('phoca_display_mode');
      if (savedMode) this.displayMode = savedMode;
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
  }

  handleRoute() {
    const hash = window.location.hash || '#/home';
    const parts = hash.replace(/^#\//, '').split('/');
    const view = parts[0] || 'home';

    if (view === 'info' || view === 'about') {
      this.showHomeView();
      this.openInfoModal();
    } else if (view === 'checker' || view === 'fore') {
      const categoryId = 'fore';
      const templateId = parts[1] || 'fore1';
      this.showCheckerView(categoryId, templateId);
    } else {
      this.showHomeView();
    }
  }

  // --------------------------------------------------------------------------
  // Category Hub (Home View)
  // --------------------------------------------------------------------------
  showHomeView() {
    this.currentView = 'home';
    if (this.homeView) {
      this.homeView.style.display = 'block';
      this.homeView.classList.add('active');
    }
    if (this.checkerView) {
      this.checkerView.style.display = 'none';
      this.checkerView.classList.remove('active');
    }
    if (this.navCategoryName) this.navCategoryName.style.display = 'none';
    if (this.navTemplateName) this.navTemplateName.style.display = 'none';
    
    this.renderCategoryHub();
  }

  renderCategoryHub() {
    if (!this.categoriesGrid) return;
    this.categoriesGrid.innerHTML = '';

    this.categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card' + (cat.isAvailable ? '' : ' disabled');

      let totalCards = 0;
      let totalChecked = 0;
      if (cat.isAvailable) {
        const catTemplates = this.templates.filter(t => t.categoryId === cat.id);
        catTemplates.forEach(t => {
          totalCards += (t.cards?.length || 0);
          const checkedSet = this.getCheckedSetForTemplate(t.id);
          totalChecked += checkedSet.size;
        });
      }

      const percent = totalCards > 0 ? Math.round((totalChecked / totalCards) * 100) : 0;

      card.innerHTML = `
        <div>
          <div class="cat-top">
            <div class="cat-icon-badge" style="background: ${cat.color}; color: #fff;">
              ${cat.icon}
            </div>
            <span class="cat-badge">${cat.badge || (cat.itemCount + '종')}</span>
          </div>
          <h3 class="cat-title">${cat.name}</h3>
          <p class="cat-sub">${cat.subtitle}</p>
        </div>

        ${cat.isAvailable ? `
          <div class="cat-stats-row">
            <div class="cat-progress-meta">
              <span style="color: var(--text-secondary);">수집 진행률</span>
              <span style="font-weight: 700; color: #a5b4fc;">${totalChecked} / ${totalCards} 장 (${percent}%)</span>
            </div>
            <div class="progress-track" style="width: 100%; height: 8px;">
              <div class="progress-fill" style="width: ${percent}%;"></div>
            </div>
          </div>
        ` : `
          <div class="cat-stats-row">
            <span style="font-size: 0.8rem; color: var(--text-muted);">업데이트 준비 중입니다</span>
          </div>
        `}
      `;

      if (cat.isAvailable) {
        card.addEventListener('click', () => {
          window.location.hash = `#/checker/fore1`;
        });
      }

      this.categoriesGrid.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // Checker View & Template Loading
  // --------------------------------------------------------------------------
  showCheckerView(categoryId, templateId) {
    this.currentView = 'checker';
    if (this.homeView) {
      this.homeView.style.display = 'none';
      this.homeView.classList.remove('active');
    }
    if (this.checkerView) {
      this.checkerView.style.display = 'flex';
      this.checkerView.classList.add('active');
    }

    this.currentCategory = this.categories.find(c => c.id === categoryId) || this.categories[0];
    
    // Breadcrumbs
    if (this.navCategoryName) {
      this.navCategoryName.style.display = 'inline';
      this.navCategoryName.textContent = `> ${this.currentCategory.name}`;
    }

    this.loadTemplate(templateId || 'fore1');
    this.renderDrawerTags();
  }

  loadTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId) || this.templates[0];
    if (!template) return;

    this.currentTemplate = template;
    this.currentTemplateId = template.id;

    // Load checks from LocalStorage
    this.loadCheckedStateForCurrent();

    // Update Header Pill
    if (this.currentTemplateTitleEl) {
      this.currentTemplateTitleEl.textContent = template.title;
    }
    if (this.currentTemplateTagEl) {
      this.currentTemplateTagEl.textContent = `#${template.tag || '포토카드'}`;
    }
    if (this.navTemplateName) {
      this.navTemplateName.style.display = 'inline';
      this.navTemplateName.textContent = `> ${template.title}`;
    }

    // Set Image
    if (this.mainImage) {
      this.mainImage.src = template.image;
      this.mainImage.onload = () => {
        this.renderCards();
        this.updateStats();
        this.updateCurrentStatusBadge();
        this.updateImageModeBadge();
        if (this.editor && this.editor.active) {
          this.editor.setEditorActive(true);
        }
      };
      if (this.mainImage.complete) {
        this.renderCards();
        this.updateStats();
        this.updateCurrentStatusBadge();
        this.updateImageModeBadge();
      }
    }

    // Update Pager Info
    const currentIndex = this.templates.findIndex(t => t.id === template.id);
    if (this.pagerInfo) {
      this.pagerInfo.textContent = `${currentIndex + 1} / ${this.templates.length}`;
    }

    this.updateModeButtonsUI();
    this.updateImageModeBadge();
  }

  goToAdjacentTemplate(delta) {
    const currentIndex = this.templates.findIndex(t => t.id === this.currentTemplateId);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < this.templates.length) {
      const nextTemplate = this.templates[nextIndex];
      window.location.hash = `#/checker/${nextTemplate.id}`;
    } else {
      this.showToast(delta < 0 ? '첫 번째 포카판입니다.' : '마지막 포카판입니다.');
    }
  }

  // --------------------------------------------------------------------------
  // Check Status Helpers (LocalStorage)
  // --------------------------------------------------------------------------
  getCheckedSetForTemplate(templateId) {
    const set = new Set();
    const template = this.templates.find(t => t.id === templateId);
    const validCardIds = template ? new Set((template.cards || []).map(c => c.id)) : null;

    try {
      const key = `phoca_checks_${templateId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        JSON.parse(saved).forEach(id => {
          if (!validCardIds || validCardIds.has(id)) {
            set.add(id);
          }
        });
      }
    } catch (e) {}
    return set;
  }

  loadCheckedStateForCurrent() {
    this.checkedCards = this.getCheckedSetForTemplate(this.currentTemplateId);
    // Automatically save cleaned state in case obsolete IDs were pruned
    this.saveCheckedState();
  }

  saveCheckedState() {
    if (!this.currentTemplate) return;
    try {
      const key = `phoca_checks_${this.currentTemplate.id}`;
      localStorage.setItem(key, JSON.stringify(Array.from(this.checkedCards)));
      localStorage.setItem('phoca_display_mode', this.displayMode);
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // Backup / Restore Data (LocalStorage Export & Import)
  // --------------------------------------------------------------------------
  openInfoModal() {
    if (this.infoModalBackdrop) {
      this.infoModalBackdrop.classList.add('open');
    }
  }

  closeInfoModal() {
    if (this.infoModalBackdrop) {
      this.infoModalBackdrop.classList.remove('open');
    }
  }

  openBackupModal() {
    if (this.backupModalBackdrop) {
      this.backupModalBackdrop.classList.add('open');
    }
  }

  closeBackupModal() {
    if (this.backupModalBackdrop) {
      this.backupModalBackdrop.classList.remove('open');
    }
  }

  exportBackupData() {
    try {
      const backupData = {
        app: 'phoca_checker',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        displayMode: this.displayMode,
        checks: {}
      };

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('phoca_checks_')) {
          try {
            backupData.checks[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {}
        }
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `포카체커_체크리스트_백업_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      this.showToast('📁 체크리스트 백업 파일이 저장되었습니다!');
      this.closeBackupModal();
    } catch (e) {
      console.error('Backup export error:', e);
      alert('백업 파일 생성 중 오류가 발생했습니다.');
    }
  }

  importBackupData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || !data.checks || typeof data.checks !== 'object') {
          throw new Error('유효한 포카체커 백업 파일이 아닙니다.');
        }

        let restoredCount = 0;
        for (const [key, value] of Object.entries(data.checks)) {
          if (key.startsWith('phoca_checks_') && Array.isArray(value)) {
            localStorage.setItem(key, JSON.stringify(value));
            restoredCount++;
          }
        }

        if (data.displayMode) {
          this.displayMode = data.displayMode;
          localStorage.setItem('phoca_display_mode', data.displayMode);
        }

        this.loadCheckedStateForCurrent();
        this.updateModeButtonsUI();
        this.updateImageModeBadge();
        this.renderCards();
        this.updateStats();
        this.updateCurrentStatusBadge();
        this.renderCategoryHub();
        this.closeBackupModal();

        this.showToast(`🎉 백업 복원 완료! (총 ${restoredCount}개 포카판 복원됨)`);
      } catch (err) {
        console.error('Backup import error:', err);
        alert(`백업 파일 불러오기 실패: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  // --------------------------------------------------------------------------
  // Template Drawer
  // --------------------------------------------------------------------------
  openDrawer() {
    if (!this.drawerBackdrop) return;
    this.drawerBackdrop.classList.add('open');
    this.renderDrawerList();
  }

  closeDrawer() {
    if (!this.drawerBackdrop) return;
    this.drawerBackdrop.classList.remove('open');
  }

  isDrawerOpen() {
    return this.drawerBackdrop?.classList.contains('open');
  }

  renderDrawerTags() {
    if (!this.drawerTagsContainer) return;
    const tags = ['전체', '앨범', '시그', '키트', '콘서트/MD', '특전', '기타'];
    this.drawerTagsContainer.innerHTML = '';

    tags.forEach(tag => {
      const pill = document.createElement('button');
      const tagKey = tag === '전체' ? 'all' : tag;
      pill.className = 'pill-btn' + (this.drawerTagFilter === tagKey ? ' active' : '');
      pill.textContent = tag === '전체' ? '전체' : `#${tag}`;
      pill.addEventListener('click', () => {
        this.drawerTagFilter = tagKey;
        this.renderDrawerTags();
        this.renderDrawerList();
      });
      this.drawerTagsContainer.appendChild(pill);
    });
  }

  renderDrawerList() {
    if (!this.drawerListContainer) return;
    this.drawerListContainer.innerHTML = '';

    const filtered = this.templates.filter(t => {
      if (this.drawerTagFilter !== 'all' && t.tag !== this.drawerTagFilter) {
        return false;
      }
      if (this.drawerSearchQuery) {
        const q = this.drawerSearchQuery;
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchRaw = t.rawName?.toLowerCase().includes(q);
        const matchId = t.id.toLowerCase().includes(q);
        const matchTag = t.tag?.toLowerCase().includes(q);
        if (!matchTitle && !matchRaw && !matchId && !matchTag) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      this.drawerListContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          일치하는 포카판이 없습니다.
        </div>
      `;
      return;
    }

    filtered.forEach(t => {
      const card = document.createElement('div');
      const isCurrent = t.id === this.currentTemplateId;
      card.className = 'template-item-card' + (isCurrent ? ' current' : '');

      const checkedSet = this.getCheckedSetForTemplate(t.id);
      const total = t.cards?.length || 0;
      const checked = checkedSet.size;
      const isCompleted = total > 0 && checked === total;
      const isInProgress = checked > 0 && checked < total;
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

      let statusBadgeHtml = '';
      if (isCompleted) {
        statusBadgeHtml = `<span class="badge-status completed">완료 ${checked}/${total} ✓</span>`;
      } else if (isInProgress) {
        statusBadgeHtml = `<span class="badge-status in-progress">${checked}/${total} (${percent}%)</span>`;
      } else {
        statusBadgeHtml = `<span class="badge-status empty">${checked}/${total}</span>`;
      }

      card.innerHTML = `
        <div class="item-left">
          <span class="item-number">${t.id.toUpperCase()}</span>
          <div class="item-info">
            <span class="item-title">${t.rawName || t.title}</span>
            <div class="item-meta">
              <span>#${t.tag || '포토카드'}</span>
              <span>• ${total}장</span>
            </div>
          </div>
        </div>

        <div class="item-right">
          ${statusBadgeHtml}
          <div class="item-mini-progress">
            <div class="item-mini-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.closeDrawer();
        window.location.hash = `#/checker/${t.id}`;
      });

      this.drawerListContainer.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // Interactive Overlays & Display Mode
  // --------------------------------------------------------------------------
  setDisplayMode(mode) {
    this.displayMode = mode;
    this.updateModeButtonsUI();
    this.updateImageModeBadge();
    this.renderCards();
    this.saveCheckedState();
    
    const label = mode === 'hide-owned' ? '보유 포카 가리기 (미보유 위시리스트)' : '미보유 포카 가리기 (보유 컬렉션)';
    this.showToast(`표시 모드: ${label}`);
  }

  updateModeButtonsUI() {
    if (this.modeHideOwnedBtn && this.modeHideUnownedBtn) {
      if (this.displayMode === 'hide-owned') {
        this.modeHideOwnedBtn.classList.add('active');
        this.modeHideUnownedBtn.classList.remove('active');
      } else {
        this.modeHideOwnedBtn.classList.remove('active');
        this.modeHideUnownedBtn.classList.add('active');
      }
    }
  }

  updateImageModeBadge() {
    if (!this.imageModeTag) return;
    if (this.displayMode === 'hide-owned') {
      this.imageModeTag.textContent = '미보유';
      this.imageModeTag.className = 'image-mode-badge unowned';
      this.imageModeTag.title = '보유한 포토카드를 가려 미보유 위시리스트를 확인하는 모드입니다.';
    } else {
      this.imageModeTag.textContent = '보유';
      this.imageModeTag.className = 'image-mode-badge owned';
      this.imageModeTag.title = '미보유 포토카드를 가려 보유한 컬렉션을 확인하는 모드입니다.';
    }
  }

  toggleCard(cardId) {
    if (this.checkedCards.has(cardId)) {
      this.checkedCards.delete(cardId);
    } else {
      this.checkedCards.add(cardId);
    }
    this.saveCheckedState();
    this.renderCards();
    this.updateStats();
    this.updateCurrentStatusBadge();
  }

  selectAllCards() {
    if (!this.currentTemplate) return;
    this.checkedCards.clear();
    this.currentTemplate.cards.forEach(c => this.checkedCards.add(c.id));
    this.saveCheckedState();
    this.renderCards();
    this.updateStats();
    this.updateCurrentStatusBadge();
    this.showToast('모든 카드를 보유로 선택했습니다.');
  }

  deselectAllCards() {
    this.checkedCards.clear();
    this.saveCheckedState();
    this.renderCards();
    this.updateStats();
    this.updateCurrentStatusBadge();
    this.showToast('모든 선택을 해제했습니다.');
  }

  invertSelection() {
    if (!this.currentTemplate) return;
    const newChecked = new Set();
    this.currentTemplate.cards.forEach(c => {
      if (!this.checkedCards.has(c.id)) {
        newChecked.add(c.id);
      }
    });
    this.checkedCards = newChecked;
    this.saveCheckedState();
    this.renderCards();
    this.updateStats();
    this.updateCurrentStatusBadge();
    this.showToast('선택 상태를 반전했습니다.');
  }

  renderCards() {
    if (this.editor && this.editor.active) {
      this.editor.renderEditorOverlay();
      return;
    }

    if (!this.cardOverlayContainer || !this.currentTemplate) return;
    this.cardOverlayContainer.innerHTML = '';

    const cards = this.currentTemplate.cards || [];

    cards.forEach((card) => {
      const isChecked = this.checkedCards.has(card.id);
      const isMasked = this.displayMode === 'hide-owned' ? isChecked : !isChecked;

      const cardEl = document.createElement('div');
      cardEl.className = 'photocard-slot' + (isMasked ? ' masked' : '') + (isChecked ? ' checked' : '');
      cardEl.style.left = `${card.x}%`;
      cardEl.style.top = `${card.y}%`;
      cardEl.style.width = `${card.w}%`;
      cardEl.style.height = `${card.h}%`;
      cardEl.style.borderRadius = `${card.radius || 10}px`;
      cardEl.title = `${card.name || '포토카드'} (${isChecked ? '보유' : '미보유'}) - 클릭하여 변경`;

      cardEl.innerHTML = `
        <div class="card-mask" style="border-radius: inherit;">
          <div class="mask-indicator">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      `;

      cardEl.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleCard(card.id);
      });

      this.cardOverlayContainer.appendChild(cardEl);
    });
  }

  updateStats() {
    if (!this.currentTemplate) return;
    const total = this.currentTemplate.cards?.length || 0;
    const owned = this.checkedCards.size;
    const percent = total > 0 ? Math.round((owned / total) * 100) : 0;

    if (this.statCount) {
      this.statCount.textContent = `${owned} / ${total} 장`;
    }
    if (this.statPercent) {
      this.statPercent.textContent = `(${percent}%)`;
    }
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
  }

  updateCurrentStatusBadge() {
    if (!this.currentTemplateStatusEl || !this.currentTemplate) return;
    const total = this.currentTemplate.cards?.length || 0;
    const owned = this.checkedCards.size;
    const isCompleted = total > 0 && owned === total;
    const isInProgress = owned > 0 && owned < total;

    if (isCompleted) {
      this.currentTemplateStatusEl.className = 'template-status-pill badge-status completed';
      this.currentTemplateStatusEl.textContent = `완료 ${owned}/${total} ✓`;
    } else if (isInProgress) {
      this.currentTemplateStatusEl.className = 'template-status-pill badge-status in-progress';
      this.currentTemplateStatusEl.textContent = `${owned}/${total}장`;
    } else {
      this.currentTemplateStatusEl.className = 'template-status-pill badge-status empty';
      this.currentTemplateStatusEl.textContent = `0/${total}장`;
    }
  }

  // --------------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------------
  async exportImage() {
    if (!this.currentTemplate || !this.mainImage) return;

    try {
      if (this.btnExportPng) {
        this.btnExportPng.classList.add('loading');
        this.btnExportPng.innerHTML = `
          <svg class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="30" stroke-dashoffset="10"></circle>
          </svg> 생성 중...
        `;
      }

      const modeStr = this.displayMode === 'hide-owned' ? '미보유위시' : '보유완성';
      const filename = `포카체커_${this.currentTemplate.title.replace(/[\s.]+/g, '_')}_${modeStr}.png`;

      await CanvasExporter.exportToPng({
        imageElement: this.mainImage,
        templateTitle: this.currentTemplate.title,
        cards: this.currentTemplate.cards,
        checkedCardIds: this.checkedCards,
        displayMode: this.displayMode,
        overlayColor: `rgba(16, 17, 24, ${this.overlayOpacity})`,
        filename: filename,
        showCheckIcon: true
      });

      this.showToast('고해상도 체크리스트 이미지가 다운로드되었습니다! 🎉');
    } catch (err) {
      console.error('Export error:', err);
      this.showToast('이미지 내보내기 중 오류가 발생했습니다.');
    } finally {
      if (this.btnExportPng) {
        this.btnExportPng.classList.remove('loading');
        this.btnExportPng.innerHTML = `
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          다운로드
        `;
      }
    }
  }

  async exportAllMergedImage() {
    try {
      this.showToast('전체 39종 고화질 합본 이미지를 생성 중입니다. 잠시만 기다려 주세요...', 8000);
      
      const catTemplates = this.templates.filter(t => t.categoryId === (this.currentCategory?.id || 'fore'));

      await CanvasExporter.exportCategoryMergedPng({
        templates: catTemplates,
        getCheckedSetFn: (id) => this.getCheckedSetForTemplate(id),
        categoryName: this.currentCategory?.name || '포레스텔라',
        displayMode: this.displayMode,
        onProgress: (cur, total, msg) => {
          this.showToast(msg, 3000);
        }
      });

      this.showToast('🎉 전체 39종 합본 포스터 이미지가 다운로드되었습니다!');
    } catch (err) {
      console.error('Merged export error:', err);
      this.showToast('전체 이미지 생성 중 오류가 발생했습니다.');
    }
  }

  handleCustomImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const customId = 'custom_' + Date.now();
      const customTemplate = {
        id: customId,
        order: this.templates.length + 1,
        categoryId: 'fore',
        title: file.name.replace(/\.[^/.]+$/, "") || '내 포토카드 판',
        rawName: file.name.replace(/\.[^/.]+$/, ""),
        tag: '사용자 정의',
        image: dataUrl,
        cards: []
      };

      this.templates.push(customTemplate);
      window.location.hash = `#/checker/${customId}`;
      this.showToast('이미지가 업로드되었습니다. [영역 편집기]를 열어 카드 영역을 생성하세요!');
      
      setTimeout(() => {
        if (this.editor) this.editor.setEditorActive(true);
      }, 400);
    };
    reader.readAsDataURL(file);
  }

  shareToX() {
    let totalCards = 0;
    let totalChecked = 0;
    this.templates.forEach(t => {
      totalCards += (t.cards?.length || 0);
      const checkedSet = this.getCheckedSetForTemplate(t.id);
      totalChecked += checkedSet.size;
    });

    const overallPercent = totalCards > 0 ? Math.round((totalChecked / totalCards) * 100) : 0;

    let tweetText = '';
    if (this.currentView === 'checker' && this.currentTemplate) {
      const currentChecked = this.checkedCards.size;
      const currentTotal = this.currentTemplate.cards?.length || 0;
      const currentPercent = currentTotal > 0 ? Math.round((currentChecked / currentTotal) * 100) : 0;

      tweetText = `🌲 포레스텔라 포토카드를 ${overallPercent}% (${totalChecked}/${totalCards}장) 수집했어요!\n\n📋 [${this.currentTemplate.title}]: ${currentChecked}/${currentTotal}장 (${currentPercent}%)\n\n나만의 포카 체크리스트 & 위시리스트 만들기 👇`;
    } else {
      tweetText = `🌲 포레스텔라 포토카드를 ${overallPercent}% (${totalChecked}/${totalCards}장) 수집했어요!\n\n나만의 포카 체크리스트 & 위시리스트 만들기 👇`;
    }

    const shareUrl = 'https://foretissimo.github.io/phoca_checker/';
    const hashtags = '포레스텔라,Forestella,포카체커';
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;

    const width = 580;
    const height = 500;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);
    window.open(
      twitterIntentUrl,
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    this.showToast(`✨ 포카 수집 진행률(${overallPercent}%) 자랑하기 창이 열렸습니다!`);
  }

  showToast(message, duration = 2400) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new PhocaCheckerApp();
});
