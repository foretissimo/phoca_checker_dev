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
    this.lastTemplateId = null;
    
    // Checked cards set for active template
    this.checkedCards = new Set();

    // Duplicate card counts map for active template (cardId -> count >= 2)
    this.cardCounts = new Map();

    // Favorite cards set for active template (최애 포카 ♥)
    this.favoriteCards = new Set();

    // Wish cards set for active template (위시 포카 ⭐)
    this.wishCards = new Set();

    // User Nickname for collection card
    this.nickname = '';
    
    // Display mode: 'hide-owned' | 'hide-unowned'
    this.displayMode = 'hide-owned';
    this.overlayOpacity = 0.68;

    // Complete marker style for owned cards in hide-owned mode: 'check' | 'stamp' | 'custom'
    this.stampStyle = 'stamp';
    this.customStampSrc = null; // user-uploaded circular image (data URL)
    
    // Drawer Filters
    this.drawerTagFilter = 'all';
    this.drawerSearchQuery = '';

    // Export Exclusion Sets (preserves actual owned/wish status; only excludes from trade/wish poster)
    this.excludedDupCardKeys = new Set();
    this.excludedWishCardKeys = new Set();

    // Crop Poster Editor & Live Preview Modal State
    this.cropPosterState = {
      mode: 'duplicate', // 'duplicate' | 'wish'
      scope: 'all',      // 'all' | 'current'
      templateFilter: 'all',
      searchQuery: '',
      renderSeq: 0,
      hitBoxes: []
    };
    this.activeCropPosterCanvas = null;
    this.activeCropPosterFilename = '';
    this.cropThumbObserver = null;

    this.initElements();
    this.loadSavedState();
    this.bindEvents();
    
    // Listen for PWA install prompt (Android Chrome / Edge)
    this.deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.shortcutNativeInstallArea) {
        this.shortcutNativeInstallArea.style.display = 'block';
      }
    });

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
    this.favoritesView = document.getElementById('favorites-view');
    this.categoriesGrid = document.getElementById('categories-grid');

    // Top App Shortcut Banner & Modal Elements
    this.shortcutTopBanner = document.getElementById('app-shortcut-top-banner');
    this.btnBannerAddShortcut = document.getElementById('btn-banner-add-shortcut');
    this.btnCloseShortcutBanner = document.getElementById('btn-close-shortcut-banner');
    this.btnOpenShortcutGuide = document.getElementById('btn-open-shortcut-guide');
    this.shortcutModalBackdrop = document.getElementById('shortcut-modal-backdrop');
    this.btnCloseShortcutModal = document.getElementById('close-shortcut-modal-btn');
    this.btnShortcutModalDone = document.getElementById('btn-shortcut-modal-done');
    this.tabShortcutIos = document.getElementById('tab-shortcut-ios');
    this.tabShortcutAndroid = document.getElementById('tab-shortcut-android');
    this.guideShortcutIos = document.getElementById('shortcut-guide-ios');
    this.guideShortcutAndroid = document.getElementById('shortcut-guide-android');
    this.shortcutInappNotice = document.getElementById('shortcut-inapp-notice');
    this.shortcutNativeInstallArea = document.getElementById('shortcut-native-install-area');
    this.btnDoNativeInstall = document.getElementById('btn-do-native-install');
    this.btnCopySiteUrl = document.getElementById('btn-copy-site-url');
    
    // Favorites Page Elements & Nav
    this.btnGoFavoritesPage = document.getElementById('btn-go-favorites-page');
    this.favNavBadge = document.getElementById('fav-nav-badge');
    this.favPageCountPill = document.getElementById('fav-page-count-pill');
    this.btnFavBackToChecker = document.getElementById('btn-fav-back-to-checker');
    this.btnFavPageShareCard = document.getElementById('btn-fav-page-share-card');
    this.btnFavPageExportMerged = document.getElementById('btn-fav-page-export-merged');
    this.favCardsGridContainer = document.getElementById('fav-cards-grid-container');
    this.linkMergedGoFavPage = document.getElementById('link-merged-go-fav-page');
    
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

    // Merged Export Modal
    this.mergedExportModalBackdrop = document.getElementById('merged-export-modal-backdrop');
    this.btnCloseMergedModal = document.getElementById('close-merged-modal-btn');
    this.mergedFavCount = document.getElementById('merged-fav-count');
    this.btnDoExportFavMerged = document.getElementById('btn-do-export-fav-merged');
    this.mergedCountAll = document.getElementById('merged-count-all');
    this.mergedCountOwned = document.getElementById('merged-count-owned');
    this.mergedCountUnowned = document.getElementById('merged-count-unowned');
    this.btnExportMergedAllUnowned = document.getElementById('btn-export-merged-all-unowned');
    this.btnExportMergedAllOwned = document.getElementById('btn-export-merged-all-owned');
    this.btnDoExportMergedOwned = document.getElementById('btn-do-export-merged-owned');
    this.btnDoExportMergedUnowned = document.getElementById('btn-do-export-merged-unowned');
    this.mergedDupCardsBadge = document.getElementById('merged-dup-cards-badge');
    this.btnDoExportDupCurrent = document.getElementById('btn-do-export-dup-current');
    this.btnDoExportDupAll = document.getElementById('btn-do-export-dup-all');
    this.mergedWishCardsBadge = document.getElementById('merged-wish-cards-badge');
    this.btnDoExportWishCurrent = document.getElementById('btn-do-export-wish-current');
    this.btnDoExportWishAll = document.getElementById('btn-do-export-wish-all');
    this.mergedUnownedCardsBadge = document.getElementById('merged-unowned-cards-badge');
    this.btnDoExportUnownedCurrent = document.getElementById('btn-do-export-unowned-current');
    this.btnDoExportUnownedAll = document.getElementById('btn-do-export-unowned-all');

    // Crop Poster Editor & Live Preview Modal (중복 / 위시 포카 편집·미리보기 창)
    this.cropPosterModalBackdrop = document.getElementById('crop-poster-modal-backdrop');
    this.cropPosterModalTitle = document.getElementById('crop-poster-modal-title');
    this.btnCloseCropPosterModal = document.getElementById('close-crop-poster-modal-btn');
    this.btnFooterCloseCropPoster = document.getElementById('btn-footer-close-crop-poster');
    this.cropPosterPreviewSummary = document.getElementById('crop-poster-preview-summary');
    this.cropPosterPreviewCanvas = document.getElementById('crop-poster-preview-canvas');
    this.cropPosterLoadingOverlay = document.getElementById('crop-poster-loading-overlay');
    this.btnCropScopeAll = document.getElementById('btn-crop-scope-all');
    this.btnCropScopeCurrent = document.getElementById('btn-crop-scope-current');
    this.cropPosterNicknameInput = document.getElementById('crop-poster-nickname-input');
    this.cropPosterTemplateFilter = document.getElementById('crop-poster-template-filter');
    this.cropPosterSearchInput = document.getElementById('crop-poster-search-input');
    this.cropPosterExcludeStats = document.getElementById('crop-poster-exclude-stats');
    this.btnCropExcludeFiltered = document.getElementById('btn-crop-exclude-filtered');
    this.btnCropIncludeFiltered = document.getElementById('btn-crop-include-filtered');
    this.btnCropRestoreAll = document.getElementById('btn-crop-restore-all');
    this.cropPosterCardsGrid = document.getElementById('crop-poster-cards-grid');
    this.btnCopyCropPoster = document.getElementById('btn-copy-crop-poster');
    this.btnDownloadCropPoster = document.getElementById('btn-download-crop-poster');

    // Share to X Button
    this.btnShareX = document.getElementById('btn-share-x');

    // Favorite & Progress Summary Card Modal
    this.summaryCardModalBackdrop = document.getElementById('summary-card-modal-backdrop');
    this.btnCloseSummaryCardModal = document.getElementById('close-summary-card-modal-btn');
    this.summaryNicknameInput = document.getElementById('summary-nickname-input');
    this.summaryFavCountEl = document.getElementById('summary-fav-count');
    this.summaryCardCanvas = document.getElementById('summary-card-canvas');
    this.featuredCardsStrip = document.getElementById('featured-cards-strip');
    this.featuredCardNameHint = document.getElementById('featured-card-name-hint');
    this.btnCopySummaryCard = document.getElementById('btn-copy-summary-card');
    this.btnDownloadSummaryCard = document.getElementById('btn-download-summary-card');
    this.btnShareSummaryX = document.getElementById('btn-share-summary-x');

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

    // Complete Marker Style (check / stamp / custom image)
    this.stampStyleGroup = document.getElementById('stamp-style-group');
    this.stampBtnCheck = document.getElementById('stamp-style-check');
    this.stampBtnStamp = document.getElementById('stamp-style-stamp');
    this.stampBtnCustom = document.getElementById('stamp-style-custom');
    this.stampImageInput = document.getElementById('stamp-image-input');
    
    // Bulk Actions
    this.btnSelectAll = document.getElementById('btn-select-all');
    this.btnDeselectAll = document.getElementById('btn-deselect-all');
    this.btnInvertSelection = document.getElementById('btn-invert-selection');
    
    // Export PNG & Quick Cropped Sheet Exports
    this.btnExportPng = document.getElementById('btn-export-png');
    this.btnQuickDupPoster = document.getElementById('btn-quick-dup-poster');
    this.quickDupCountBadge = document.getElementById('quick-dup-count-badge');
    this.btnQuickWishPoster = document.getElementById('btn-quick-wish-poster');
    this.quickWishCountBadge = document.getElementById('quick-wish-count-badge');
    this.btnQuickUnownedPoster = document.getElementById('btn-quick-unowned-poster');
    this.quickUnownedCountBadge = document.getElementById('quick-unowned-count-badge');

    // Custom Image Upload
    this.customImageUpload = document.getElementById('custom-image-upload');
    
    // Stats
    this.statCount = document.getElementById('stat-count');
    this.statPercent = document.getElementById('stat-percent');
    this.statDupInfo = document.getElementById('stat-dup-info');
    this.progressBar = document.getElementById('progress-bar-fill');
    
    // Toast
    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Top Shortcut Banner & Modal Events
    if (this.btnBannerAddShortcut) {
      this.btnBannerAddShortcut.addEventListener('click', () => this.openShortcutModal());
    }
    if (this.btnCloseShortcutBanner) {
      this.btnCloseShortcutBanner.addEventListener('click', () => this.dismissShortcutBanner());
    }
    if (this.btnOpenShortcutGuide) {
      this.btnOpenShortcutGuide.addEventListener('click', () => this.openShortcutModal());
    }
    if (this.btnCloseShortcutModal) {
      this.btnCloseShortcutModal.addEventListener('click', () => this.closeShortcutModal());
    }
    if (this.btnShortcutModalDone) {
      this.btnShortcutModalDone.addEventListener('click', () => this.closeShortcutModal());
    }
    if (this.shortcutModalBackdrop) {
      this.shortcutModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.shortcutModalBackdrop) this.closeShortcutModal();
      });
    }
    if (this.tabShortcutIos) {
      this.tabShortcutIos.addEventListener('click', () => this.switchShortcutTab('ios'));
    }
    if (this.tabShortcutAndroid) {
      this.tabShortcutAndroid.addEventListener('click', () => this.switchShortcutTab('android'));
    }
    if (this.btnDoNativeInstall) {
      this.btnDoNativeInstall.addEventListener('click', () => this.triggerNativeInstall());
    }
    if (this.btnCopySiteUrl) {
      this.btnCopySiteUrl.addEventListener('click', () => this.copySiteUrl());
    }

    // Nav Home
    if (this.btnNavHome) {
      this.btnNavHome.addEventListener('click', () => {
        if (window.location.hash === '#/home' || window.location.hash === '' || window.location.hash === '#') {
          this.showHomeView();
        } else {
          window.location.hash = '#/home';
        }
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

    // Merged Export Modal Events
    if (this.btnCloseMergedModal) {
      this.btnCloseMergedModal.addEventListener('click', () => this.closeMergedExportModal());
    }
    if (this.mergedExportModalBackdrop) {
      this.mergedExportModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.mergedExportModalBackdrop) this.closeMergedExportModal();
      });
    }
    if (this.btnDoExportFavMerged) {
      this.btnDoExportFavMerged.addEventListener('click', () => this.exportFavoriteMergedPosterAction());
    }
    if (this.linkMergedGoFavPage) {
      this.linkMergedGoFavPage.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeMergedExportModal();
        window.location.hash = '#/favorites';
      });
    }
    if (this.btnExportMergedAllUnowned) {
      this.btnExportMergedAllUnowned.addEventListener('click', () => this.exportFilteredMergedImage('all', 'hide-owned'));
    }
    if (this.btnExportMergedAllOwned) {
      this.btnExportMergedAllOwned.addEventListener('click', () => this.exportFilteredMergedImage('all', 'hide-unowned'));
    }
    if (this.btnDoExportMergedOwned) {
      this.btnDoExportMergedOwned.addEventListener('click', () => this.exportFilteredMergedImage('owned', 'hide-unowned'));
    }
    if (this.btnDoExportMergedUnowned) {
      this.btnDoExportMergedUnowned.addEventListener('click', () => this.exportFilteredMergedImage('unowned', 'hide-owned'));
    }
    if (this.btnDoExportDupCurrent) {
      this.btnDoExportDupCurrent.addEventListener('click', () => this.openCropPosterModal('duplicate', 'current'));
    }
    if (this.btnDoExportDupAll) {
      this.btnDoExportDupAll.addEventListener('click', () => this.openCropPosterModal('duplicate', 'all'));
    }
    if (this.btnDoExportWishCurrent) {
      this.btnDoExportWishCurrent.addEventListener('click', () => this.openCropPosterModal('wish', 'current'));
    }
    if (this.btnDoExportWishAll) {
      this.btnDoExportWishAll.addEventListener('click', () => this.openCropPosterModal('wish', 'all'));
    }
    if (this.btnDoExportUnownedCurrent) {
      this.btnDoExportUnownedCurrent.addEventListener('click', () => this.exportUnownedCardsPosterDirect('current'));
    }
    if (this.btnDoExportUnownedAll) {
      this.btnDoExportUnownedAll.addEventListener('click', () => this.exportUnownedCardsPosterDirect('all'));
    }
    if (this.btnQuickDupPoster) {
      this.btnQuickDupPoster.addEventListener('click', () => this.openCropPosterModal('duplicate', 'all'));
    }
    if (this.btnQuickWishPoster) {
      this.btnQuickWishPoster.addEventListener('click', () => this.openCropPosterModal('wish', 'all'));
    }
    if (this.btnQuickUnownedPoster) {
      this.btnQuickUnownedPoster.addEventListener('click', () => this.exportUnownedCardsPosterDirect('all'));
    }

    // Crop Poster Editor & Live Preview Modal Events
    if (this.btnCloseCropPosterModal) {
      this.btnCloseCropPosterModal.addEventListener('click', () => this.closeCropPosterModal());
    }
    if (this.btnFooterCloseCropPoster) {
      this.btnFooterCloseCropPoster.addEventListener('click', () => this.closeCropPosterModal());
    }
    if (this.cropPosterModalBackdrop) {
      this.cropPosterModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.cropPosterModalBackdrop) this.closeCropPosterModal();
      });
    }
    if (this.btnCropScopeAll) {
      this.btnCropScopeAll.addEventListener('click', () => this.switchCropPosterScope('all'));
    }
    if (this.btnCropScopeCurrent) {
      this.btnCropScopeCurrent.addEventListener('click', () => this.switchCropPosterScope('current'));
    }
    if (this.cropPosterNicknameInput) {
      let nickTimer = null;
      this.cropPosterNicknameInput.addEventListener('input', (e) => {
        this.nickname = e.target.value.trim();
        try {
          localStorage.setItem('phoca_user_nickname', this.nickname);
        } catch (err) {}
        if (this.summaryNicknameInput && this.summaryNicknameInput !== e.target) {
          this.summaryNicknameInput.value = this.nickname;
        }
        clearTimeout(nickTimer);
        nickTimer = setTimeout(() => this.renderLiveCropPoster(), 140);
      });
    }
    if (this.cropPosterTemplateFilter) {
      this.cropPosterTemplateFilter.addEventListener('change', (e) => {
        this.cropPosterState.templateFilter = e.target.value || 'all';
        this.renderCropPosterPickerGrid();
      });
    }
    if (this.cropPosterSearchInput) {
      this.cropPosterSearchInput.addEventListener('input', (e) => {
        this.cropPosterState.searchQuery = e.target.value.toLowerCase().trim();
        this.renderCropPosterPickerGrid();
      });
    }
    if (this.btnCropExcludeFiltered) {
      this.btnCropExcludeFiltered.addEventListener('click', () => this.setVisibleCropCardsExcluded(true));
    }
    if (this.btnCropIncludeFiltered) {
      this.btnCropIncludeFiltered.addEventListener('click', () => this.setVisibleCropCardsExcluded(false));
    }
    if (this.btnCropRestoreAll) {
      this.btnCropRestoreAll.addEventListener('click', () => this.restoreAllCropExcludedCards());
    }
    if (this.btnCopyCropPoster) {
      this.btnCopyCropPoster.addEventListener('click', () => this.copyActiveCropPoster());
    }
    if (this.btnDownloadCropPoster) {
      this.btnDownloadCropPoster.addEventListener('click', () => this.downloadActiveCropPoster());
    }
    if (this.cropPosterPreviewCanvas) {
      let downPos = null;
      this.cropPosterPreviewCanvas.addEventListener('pointerdown', (e) => {
        downPos = { x: e.clientX, y: e.clientY };
      });
      this.cropPosterPreviewCanvas.addEventListener('mousemove', (e) => {
        const hit = this.findPreviewHitCard(e);
        if (hit) {
          this.cropPosterPreviewCanvas.style.cursor = 'pointer';
          this.cropPosterPreviewCanvas.title = `클릭하여 '${hit.name}' 포카를 이미지에서 빼기`;
        } else {
          this.cropPosterPreviewCanvas.style.cursor = 'default';
          this.cropPosterPreviewCanvas.title = '';
        }
      });
      this.cropPosterPreviewCanvas.addEventListener('click', (e) => {
        if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 7) {
          return;
        }
        const hit = this.findPreviewHitCard(e);
        if (hit && hit.key) {
          this.toggleCropPosterCardExclude(hit.key, { fromPreview: true, cardName: hit.name });
        }
      });
    }

    // Favorites Page Navigation & Actions
    if (this.btnGoFavoritesPage) {
      this.btnGoFavoritesPage.addEventListener('click', () => {
        window.location.hash = '#/favorites';
      });
    }
    if (this.btnFavBackToChecker) {
      this.btnFavBackToChecker.addEventListener('click', () => {
        window.location.hash = `#/checker/${this.currentTemplateId || 'fore1'}`;
      });
    }
    if (this.btnFavPageShareCard) {
      this.btnFavPageShareCard.addEventListener('click', () => this.openSummaryCardModal());
    }
    if (this.btnFavPageExportMerged) {
      this.btnFavPageExportMerged.addEventListener('click', () => this.exportFavoriteMergedPosterAction());
    }

    // Share to X
    if (this.btnShareX) {
      this.btnShareX.addEventListener('click', () => this.openSummaryCardModal());
    }

    // Summary Card Modal Events
    if (this.btnCloseSummaryCardModal) {
      this.btnCloseSummaryCardModal.addEventListener('click', () => this.closeSummaryCardModal());
    }
    if (this.summaryCardModalBackdrop) {
      this.summaryCardModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.summaryCardModalBackdrop) this.closeSummaryCardModal();
      });
    }
    if (this.summaryNicknameInput) {
      this.summaryNicknameInput.addEventListener('input', (e) => {
        this.nickname = e.target.value.trim();
        try {
          localStorage.setItem('phoca_user_nickname', this.nickname);
        } catch (err) {}
        this.renderLiveSummaryCard();
      });
    }
    if (this.btnCopySummaryCard) {
      this.btnCopySummaryCard.addEventListener('click', () => this.copySummaryCardImage());
    }
    if (this.btnDownloadSummaryCard) {
      this.btnDownloadSummaryCard.addEventListener('click', () => this.downloadSummaryCardImage());
    }
    if (this.btnShareSummaryX) {
      this.btnShareSummaryX.addEventListener('click', () => this.shareSummaryCardToX());
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

    // Complete Marker Style
    if (this.stampBtnCheck) {
      this.stampBtnCheck.addEventListener('click', () => this.setStampStyle('check'));
    }
    if (this.stampBtnStamp) {
      this.stampBtnStamp.addEventListener('click', () => this.setStampStyle('stamp'));
    }
    if (this.stampBtnCustom) {
      this.stampBtnCustom.addEventListener('click', () => this.onCustomStampButtonClick());
    }
    if (this.stampImageInput) {
      this.stampImageInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleStampImageUpload(file);
        e.target.value = '';
      });
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

      const savedStampStyle = localStorage.getItem('phoca_stamp_style');
      if (['check', 'stamp', 'custom'].includes(savedStampStyle)) this.stampStyle = savedStampStyle;
      this.customStampSrc = localStorage.getItem('phoca_custom_stamp') || null;
      if (this.stampStyle === 'custom' && !this.customStampSrc) this.stampStyle = 'stamp';

      this.nickname = localStorage.getItem('phoca_user_nickname') || '';
      this.featuredFavoriteId = localStorage.getItem('phoca_featured_favorite_id') || null;
      this.lastTemplateId = localStorage.getItem('phoca_last_template_id') || null;

      try {
        const savedExDup = JSON.parse(localStorage.getItem('phoca_excluded_dup_cards') || '[]');
        if (Array.isArray(savedExDup)) this.excludedDupCardKeys = new Set(savedExDup);
      } catch (err) {}

      try {
        const savedExWish = JSON.parse(localStorage.getItem('phoca_excluded_wish_cards') || '[]');
        if (Array.isArray(savedExWish)) this.excludedWishCardKeys = new Set(savedExWish);
      } catch (err) {}

      this.updateFavCardBadgeCount();

      if (localStorage.getItem('phoca_shortcut_banner_dismissed') === 'true') {
        if (this.shortcutTopBanner) this.shortcutTopBanner.style.display = 'none';
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
  }

  handleRoute() {
    const hash = window.location.hash || '#/home';
    const parts = hash.replace(/^#\/?/, '').split('/');
    const view = parts[0] || 'home';

    if (view === 'favorites' || view === 'favs' || view === 'fav') {
      this.showFavoritesView();
    } else if (view === 'info' || view === 'about') {
      this.showHomeView();
      this.openInfoModal();
    } else if (view === 'checker' || view === 'fore') {
      const categoryId = 'fore';
      let templateId = parts[1];
      if (!templateId) {
        templateId = (this.lastTemplateId && this.templates.some(t => t.id === this.lastTemplateId))
          ? this.lastTemplateId
          : (this.templates[0]?.id || 'fore1');
      } else if (!this.templates.some(t => t.id === templateId)) {
        // 지정된 페이지가 없을 경우 첫 번째 페이지로 안전하게 폴백
        templateId = this.templates[0]?.id || 'fore1';
      }
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
    if (this.favoritesView) {
      this.favoritesView.style.display = 'none';
      this.favoritesView.classList.remove('active');
    }
    if (this.navCategoryName) this.navCategoryName.style.display = 'none';
    if (this.navTemplateName) this.navTemplateName.style.display = 'none';
    
    this.renderCategoryHub();
    this.updateFavCardBadgeCount();
  }

  renderCategoryHub() {
    if (!this.categoriesGrid) return;
    this.categoriesGrid.innerHTML = '';

    const availableCategories = this.categories.filter(cat => cat.isAvailable !== false);

    availableCategories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';

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

      const iconBadgeHtml = cat.logoImage
        ? `<div class="cat-icon-badge has-logo"><img src="${cat.logoImage}" alt="${cat.name} 로고" class="cat-logo-img"></div>`
        : `<div class="cat-icon-badge" style="background: ${cat.color}; color: #fff;">${cat.icon}</div>`;

      card.innerHTML = `
        <div>
          <div class="cat-top">
            ${iconBadgeHtml}
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
          // 마지막으로 눌렀던 페이지가 있으면 그 페이지로 이동, 없거나 삭제되었으면 첫 페이지로 이동
          let targetTemplate = null;
          if (this.lastTemplateId) {
            targetTemplate = this.templates.find(t => t.id === this.lastTemplateId && t.categoryId === cat.id);
          }
          if (!targetTemplate) {
            targetTemplate = this.templates.find(t => t.categoryId === cat.id) || this.templates[0];
          }
          const targetId = targetTemplate ? targetTemplate.id : (this.templates[0]?.id || 'fore1');
          const targetHash = `#/checker/${targetId}`;

          if (window.location.hash === targetHash) {
            this.handleRoute();
          } else {
            window.location.hash = targetHash;
          }
        });
      }

      this.categoriesGrid.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // Favorites View (최애포카 모아보기 페이지)
  // --------------------------------------------------------------------------
  showFavoritesView() {
    this.currentView = 'favorites';
    if (this.homeView) {
      this.homeView.style.display = 'none';
      this.homeView.classList.remove('active');
    }
    if (this.checkerView) {
      this.checkerView.style.display = 'none';
      this.checkerView.classList.remove('active');
    }
    if (this.favoritesView) {
      this.favoritesView.style.display = 'block';
      this.favoritesView.classList.add('active');
    }

    if (this.navCategoryName) {
      this.navCategoryName.style.display = 'inline';
      this.navCategoryName.textContent = '> 최애포카 모아보기';
    }
    if (this.navTemplateName) {
      this.navTemplateName.style.display = 'none';
    }

    this.renderFavoritesPage();
    this.updateFavCardBadgeCount();
  }

  renderFavoritesPage() {
    if (!this.favCardsGridContainer) return;
    this.favCardsGridContainer.innerHTML = '';

    const favs = this.getAllFavoriteCards();
    if (favs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'fav-empty-state';
      empty.innerHTML = `
        <div class="fav-empty-icon">🤍</div>
        <h3 class="fav-empty-title">찜한 최애 포카가 없습니다</h3>
        <p class="fav-empty-desc">
          체커에서 포토카드 우측 상단의 <strong>하트(♥)</strong>를 클릭해 최대 10장까지 최애 포카로 등록해보세요!<br>
          등록된 포카는 이곳에서 모아보거나, 합본 포스터 및 자랑하기 카드로 만들 수 있습니다.
        </p>
        <button id="btn-empty-go-checker" class="btn btn-primary" style="margin-top: 0.5rem;">
          포카 체커에서 최애 고르러 가기
        </button>
      `;
      this.favCardsGridContainer.appendChild(empty);
      const btnEmpty = empty.querySelector('#btn-empty-go-checker');
      if (btnEmpty) {
        btnEmpty.addEventListener('click', () => {
          window.location.hash = `#/checker/${this.currentTemplateId || 'fore1'}`;
        });
      }
      return;
    }

    favs.forEach((fav, index) => {
      const isOwned = this.getCheckedSetForTemplate(fav.templateId).has(fav.id);
      const cardEl = document.createElement('div');
      cardEl.className = `fav-grid-card ${isOwned ? 'is-owned' : 'is-unowned'}`;
      cardEl.setAttribute('data-card-id', fav.id);

      // Rank badge
      const rankBadge = document.createElement('div');
      rankBadge.className = 'fav-card-rank-badge';
      rankBadge.innerHTML = `<span style="color:#f43f5e;">♥</span> ${index + 1}`;
      cardEl.appendChild(rankBadge);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'fav-card-remove-btn';
      removeBtn.title = '최애 목록에서 제거';
      removeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFavorite(fav.templateId, fav.id);
      });
      cardEl.appendChild(removeBtn);

      // Thumb wrap
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'fav-card-thumb-wrap';

      const canvas = document.createElement('canvas');
      canvas.className = 'fav-card-canvas';
      canvas.width = 165;
      canvas.height = 255;
      thumbWrap.appendChild(canvas);
      cardEl.appendChild(thumbWrap);

      // Card Body
      const bodyEl = document.createElement('div');
      bodyEl.className = 'fav-card-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'fav-card-name';
      nameEl.textContent = fav.name || '포토카드';
      nameEl.title = fav.name || '포토카드';
      bodyEl.appendChild(nameEl);

      const templateEl = document.createElement('div');
      templateEl.className = 'fav-card-template-title';
      templateEl.textContent = fav.templateTitle || '';
      templateEl.title = fav.templateTitle || '';
      bodyEl.appendChild(templateEl);

      // Actions
      const actionsEl = document.createElement('div');
      actionsEl.className = 'fav-card-actions';

      // Owned Toggle Button
      const countsMap = this.getCountsMapForTemplate(fav.templateId, isOwned ? new Set([fav.id]) : new Set());
      const ownedQty = isOwned ? (countsMap.get(fav.id) || 1) : 0;
      const toggleOwnedBtn = document.createElement('button');
      toggleOwnedBtn.className = `btn-fav-toggle-owned ${isOwned ? 'owned' : 'unowned'}`;
      toggleOwnedBtn.innerHTML = isOwned
        ? `<span>✓ 보유중${ownedQty >= 2 ? ` (×${ownedQty})` : ''}</span>`
        : '<span>미보유</span>';
      toggleOwnedBtn.title = isOwned ? '클릭 시 미보유로 전환' : '클릭 시 보유중으로 전환';
      toggleOwnedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavoriteCardOwned(fav.templateId, fav.id);
      });
      actionsEl.appendChild(toggleOwnedBtn);

      // Jump to template
      const jumpBtn = document.createElement('button');
      jumpBtn.className = 'btn-fav-jump-template';
      jumpBtn.title = '해당 포카판으로 이동';
      jumpBtn.innerHTML = `<span>판 이동 ↗</span>`;
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.hash = `#/checker/${fav.templateId}`;
      });
      actionsEl.appendChild(jumpBtn);

      bodyEl.appendChild(actionsEl);
      cardEl.appendChild(bodyEl);

      this.favCardsGridContainer.appendChild(cardEl);

      // Draw canvas thumbnail
      this.drawThumbCanvas(canvas, fav);
    });
  }

  removeFavorite(templateId, cardId) {
    const favSet = this.getFavoriteSetForTemplate(templateId);
    if (favSet.has(cardId)) {
      favSet.delete(cardId);
      try {
        localStorage.setItem(`phoca_favorites_${templateId}`, JSON.stringify(Array.from(favSet)));
      } catch (e) {}

      if (this.currentTemplateId === templateId) {
        this.favoriteCards.delete(cardId);
        this.renderCards();
      }

      if (this.featuredFavoriteId === cardId) {
        const remaining = this.getAllFavoriteCards();
        this.featuredFavoriteId = remaining.length > 0 ? remaining[0].id : null;
        if (this.featuredFavoriteId) {
          localStorage.setItem('phoca_featured_favorite_id', this.featuredFavoriteId);
        } else {
          localStorage.removeItem('phoca_featured_favorite_id');
        }
      }

      this.showToast('최애 포카 지정을 해제했습니다.');
      this.updateFavCardBadgeCount();
      this.renderFavoritesPage();
    }
  }

  toggleFavoriteCardOwned(templateId, cardId) {
    const checkedSet = this.getCheckedSetForTemplate(templateId);
    const countsMap = this.getCountsMapForTemplate(templateId, checkedSet);
    let isNowOwned = false;
    if (checkedSet.has(cardId)) {
      checkedSet.delete(cardId);
      countsMap.delete(cardId);
      isNowOwned = false;
    } else {
      checkedSet.add(cardId);
      countsMap.delete(cardId);
      isNowOwned = true;
    }
    try {
      localStorage.setItem(`phoca_checks_${templateId}`, JSON.stringify(Array.from(checkedSet)));
      this.saveCountsStateForTemplate(templateId, countsMap);
    } catch (e) {}

    if (this.currentTemplateId === templateId) {
      this.checkedCards = checkedSet;
      this.cardCounts = countsMap;
      this.updateStats();
      this.renderCards();
    } else {
      this.updateQuickPosterBadges();
    }

    this.renderFavoritesPage();
    this.showToast(isNowOwned ? '보유 포카로 표시되었습니다.' : '미보유 상태로 변경되었습니다.');
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
    if (this.favoritesView) {
      this.favoritesView.style.display = 'none';
      this.favoritesView.classList.remove('active');
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
    this.lastTemplateId = template.id;
    try {
      localStorage.setItem('phoca_last_template_id', template.id);
    } catch (e) {}

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
    this.updateFavCardBadgeCount();
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

  getCountsMapForTemplate(templateId, checkedSetOpt = null) {
    const map = new Map();
    const template = this.templates.find(t => t.id === templateId);
    const validCardIds = template ? new Set((template.cards || []).map(c => c.id)) : null;
    const checkedSet = checkedSetOpt || this.getCheckedSetForTemplate(templateId);

    try {
      const key = `phoca_counts_${templateId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.entries(parsed).forEach(([cardId, rawQty]) => {
            const qty = Math.min(99, Math.floor(Number(rawQty) || 0));
            if (qty >= 2 && checkedSet.has(cardId) && (!validCardIds || validCardIds.has(cardId))) {
              map.set(cardId, qty);
            }
          });
        }
      }
    } catch (e) {}
    return map;
  }

  saveCountsStateForTemplate(templateId, countsMap) {
    if (!templateId) return;
    try {
      const key = `phoca_counts_${templateId}`;
      const obj = {};
      let hasDuplicates = false;
      if (countsMap && countsMap.size > 0) {
        countsMap.forEach((qty, cardId) => {
          const cleanQty = Math.min(99, Math.floor(Number(qty) || 0));
          if (cleanQty >= 2) {
            obj[cardId] = cleanQty;
            hasDuplicates = true;
          }
        });
      }
      if (hasDuplicates) {
        localStorage.setItem(key, JSON.stringify(obj));
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {}
  }

  getCardCount(cardId) {
    if (!this.checkedCards.has(cardId)) return 0;
    return this.cardCounts.get(cardId) || 1;
  }

  loadCheckedStateForCurrent() {
    this.checkedCards = this.getCheckedSetForTemplate(this.currentTemplateId);
    this.cardCounts = this.getCountsMapForTemplate(this.currentTemplateId, this.checkedCards);
    this.favoriteCards = this.getFavoriteSetForTemplate(this.currentTemplateId);
    this.wishCards = this.getWishSetForTemplate(this.currentTemplateId);
    // Automatically save cleaned state in case obsolete IDs were pruned
    this.saveCheckedState();
    this.saveFavoriteState();
    this.saveWishState();
  }

  saveCheckedState() {
    if (!this.currentTemplate) return;
    try {
      const key = `phoca_checks_${this.currentTemplate.id}`;
      localStorage.setItem(key, JSON.stringify(Array.from(this.checkedCards)));
      this.saveCountsStateForTemplate(this.currentTemplate.id, this.cardCounts);
      localStorage.setItem('phoca_display_mode', this.displayMode);
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // Wish Cards Helpers (LocalStorage: phoca_wishes_{templateId})
  // --------------------------------------------------------------------------
  getWishSetForTemplate(templateId) {
    const set = new Set();
    const template = this.templates.find(t => t.id === templateId);
    const validCardIds = template ? new Set((template.cards || []).map(c => c.id)) : null;

    try {
      const key = `phoca_wishes_${templateId}`;
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

  saveWishState() {
    if (!this.currentTemplate) return;
    try {
      const key = `phoca_wishes_${this.currentTemplate.id}`;
      if (this.wishCards && this.wishCards.size > 0) {
        localStorage.setItem(key, JSON.stringify(Array.from(this.wishCards)));
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {}
  }

  toggleWishCard(cardId) {
    if (this.wishCards.has(cardId)) {
      this.wishCards.delete(cardId);
      this.showToast('위시 포카 지정을 해제했습니다.');
    } else {
      this.wishCards.add(cardId);
      // Ensure newly wished card is not in excludedWishCardKeys
      if (this.currentTemplate) {
        this.excludedWishCardKeys.delete(this.getCardUniqueKey(this.currentTemplate.id, cardId));
        this.saveExcludedState('wish');
      }
      this.showToast('⭐ 위시 포카에 추가되었습니다!');
    }
    this.saveWishState();
    this.renderCards();
    this.updateStats();
  }

  // --------------------------------------------------------------------------
  // Favorite Cards Helpers (LocalStorage: phoca_favorites_{templateId})
  // --------------------------------------------------------------------------
  getFavoriteSetForTemplate(templateId) {
    const set = new Set();
    const template = this.templates.find(t => t.id === templateId);
    const validCardIds = template ? new Set((template.cards || []).map(c => c.id)) : null;

    try {
      const key = `phoca_favorites_${templateId}`;
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

  saveFavoriteState() {
    if (!this.currentTemplate) return;
    try {
      const key = `phoca_favorites_${this.currentTemplate.id}`;
      localStorage.setItem(key, JSON.stringify(Array.from(this.favoriteCards)));
    } catch (e) {}
  }

  toggleFavorite(cardId) {
    if (this.favoriteCards.has(cardId)) {
      this.favoriteCards.delete(cardId);
      if (this.featuredFavoriteId === cardId) {
        const remaining = this.getAllFavoriteCards();
        this.featuredFavoriteId = remaining.length > 0 ? remaining[0].id : null;
        if (this.featuredFavoriteId) {
          localStorage.setItem('phoca_featured_favorite_id', this.featuredFavoriteId);
        } else {
          localStorage.removeItem('phoca_featured_favorite_id');
        }
      }
      this.showToast('최애 포카 지정을 해제했습니다.');
    } else {
      const allFavs = this.getAllFavoriteCards();
      if (allFavs.length >= 10) {
        this.showToast('⚠️ 최애 포카는 최대 10개까지만 선택할 수 있습니다.');
        return;
      }
      this.favoriteCards.add(cardId);
      if (!this.featuredFavoriteId) {
        this.featuredFavoriteId = cardId;
        localStorage.setItem('phoca_featured_favorite_id', this.featuredFavoriteId);
      }
      this.showToast(`💖 최애 포카로 등록되었습니다! (${allFavs.length + 1}/10)`);
    }
    this.saveFavoriteState();
    this.renderCards();
    this.updateFavCardBadgeCount();
    if (this.mergedExportModalBackdrop && this.mergedExportModalBackdrop.classList.contains('open')) {
      this.updateMergedExportModalCounts();
    }
  }

  updateFavCardBadgeCount() {
    const count = this.getAllFavoriteCards().length;
    if (this.favNavBadge) {
      this.favNavBadge.textContent = count;
    }
    if (this.favPageCountPill) {
      this.favPageCountPill.textContent = `${count} / 10장`;
    }
    if (this.mergedFavCount) {
      this.mergedFavCount.textContent = count;
    }
    if (this.mergedExportModalBackdrop && this.mergedExportModalBackdrop.classList.contains('open')) {
      this.updateMergedExportModalCounts();
    }
  }

  updateFavBadgeCount() {
    this.updateFavCardBadgeCount();
  }

  getAllFavoriteCards() {
    const list = [];
    this.templates.forEach(t => {
      const favSet = this.getFavoriteSetForTemplate(t.id);
      if (favSet.size > 0 && t.cards) {
        t.cards.forEach(card => {
          if (favSet.has(card.id)) {
            list.push({
              id: card.id,
              name: card.name || '포토카드',
              templateId: t.id,
              templateTitle: t.title,
              imageSrc: t.image,
              x: card.x,
              y: card.y,
              w: card.w,
              h: card.h,
              radius: card.radius || 10
            });
          }
        });
      }
    });
    return list;
  }

  // --------------------------------------------------------------------------
  // Mobile Shortcut Banner & Guide Modal
  // --------------------------------------------------------------------------
  openShortcutModal() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isInApp = /KAKAOTALK|Instagram|Twitter|FB_IAB|FBAN|FBAV|Line|Snapchat/i.test(navigator.userAgent);

    if (this.shortcutInappNotice) {
      this.shortcutInappNotice.style.display = isInApp ? 'flex' : 'none';
    }

    if (this.deferredPrompt && this.shortcutNativeInstallArea) {
      this.shortcutNativeInstallArea.style.display = 'block';
    }

    // Default to detected OS tab
    this.switchShortcutTab(isIOS ? 'ios' : 'android');

    if (this.shortcutModalBackdrop) {
      this.shortcutModalBackdrop.classList.add('open');
    }
  }

  closeShortcutModal() {
    if (this.shortcutModalBackdrop) {
      this.shortcutModalBackdrop.classList.remove('open');
    }
  }

  dismissShortcutBanner() {
    if (this.shortcutTopBanner) {
      this.shortcutTopBanner.style.display = 'none';
    }
    try {
      localStorage.setItem('phoca_shortcut_banner_dismissed', 'true');
    } catch (e) {}
  }

  switchShortcutTab(target) {
    if (this.tabShortcutIos) {
      this.tabShortcutIos.classList.toggle('active', target === 'ios');
    }
    if (this.tabShortcutAndroid) {
      this.tabShortcutAndroid.classList.toggle('active', target === 'android');
    }
    if (this.guideShortcutIos) {
      this.guideShortcutIos.style.display = target === 'ios' ? 'flex' : 'none';
    }
    if (this.guideShortcutAndroid) {
      this.guideShortcutAndroid.style.display = target === 'android' ? 'flex' : 'none';
    }
  }

  async triggerNativeInstall() {
    if (!this.deferredPrompt) {
      this.showToast('ℹ️ 브라우저 메뉴 [⋮] 에서 [홈 화면에 추가]를 눌러주세요.');
      return;
    }
    try {
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        this.showToast('🎉 홈 화면에 바로가기가 설치되었습니다!');
        this.closeShortcutModal();
      }
      this.deferredPrompt = null;
      if (this.shortcutNativeInstallArea) {
        this.shortcutNativeInstallArea.style.display = 'none';
      }
    } catch (err) {
      console.warn('PWA install error:', err);
    }
  }

  async copySiteUrl() {
    const url = window.location.href.split('#')[0] || 'https://foretissimo.github.io/phoca_checker/';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      this.showToast('📋 바로가기 링크 주소가 복사되었습니다!');
    } catch (e) {
      this.showToast('링크 복사에 실패했습니다.');
    }
  }

  // --------------------------------------------------------------------------
  // Info & Backup Modal Handlers
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
        version: '1.3',
        exportedAt: new Date().toISOString(),
        nickname: this.nickname || '',
        featuredFavoriteId: this.featuredFavoriteId || null,
        displayMode: this.displayMode,
        checks: {},
        counts: {},
        favorites: {},
        wishes: {}
      };

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('phoca_checks_')) {
          try {
            backupData.checks[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {}
        } else if (key && key.startsWith('phoca_counts_')) {
          try {
            backupData.counts[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {}
        } else if (key && key.startsWith('phoca_favorites_')) {
          try {
            backupData.favorites[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {}
        } else if (key && key.startsWith('phoca_wishes_')) {
          try {
            backupData.wishes[key] = JSON.parse(localStorage.getItem(key));
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

      this.showToast('📁 체크리스트 백업 파일이 저장되었습니다! (중복 수량 & 최애 포카 포함)');
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

        // Clear existing duplicate counts first so restored backup reflects exact counts
        const countKeysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('phoca_counts_')) countKeysToRemove.push(k);
        }
        countKeysToRemove.forEach(k => localStorage.removeItem(k));

        if (data.counts && typeof data.counts === 'object') {
          for (const [key, value] of Object.entries(data.counts)) {
            if (key.startsWith('phoca_counts_') && value && typeof value === 'object' && !Array.isArray(value)) {
              localStorage.setItem(key, JSON.stringify(value));
            }
          }
        }

        let favRestoredCount = 0;
        if (data.favorites && typeof data.favorites === 'object') {
          for (const [key, value] of Object.entries(data.favorites)) {
            if (key.startsWith('phoca_favorites_') && Array.isArray(value)) {
              localStorage.setItem(key, JSON.stringify(value));
              favRestoredCount++;
            }
          }
        }

        if (data.wishes && typeof data.wishes === 'object') {
          const wishKeysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('phoca_wishes_')) wishKeysToRemove.push(k);
          }
          wishKeysToRemove.forEach(k => localStorage.removeItem(k));

          for (const [key, value] of Object.entries(data.wishes)) {
            if (key.startsWith('phoca_wishes_') && Array.isArray(value)) {
              localStorage.setItem(key, JSON.stringify(value));
            }
          }
        }

        if (data.nickname) {
          this.nickname = data.nickname;
          localStorage.setItem('phoca_user_nickname', data.nickname);
          if (this.summaryNicknameInput) {
            this.summaryNicknameInput.value = data.nickname;
          }
        }

        if (data.featuredFavoriteId) {
          this.featuredFavoriteId = data.featuredFavoriteId;
          localStorage.setItem('phoca_featured_favorite_id', data.featuredFavoriteId);
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
        this.updateFavCardBadgeCount();
        this.renderCategoryHub();
        this.closeBackupModal();

        this.showToast(`🎉 백업 복원 완료! (포카판 ${restoredCount}개, 최애 포카 동기화됨)`);
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
    this.updateStampStyleUI();
  }

  // --------------------------------------------------------------------------
  // Complete Marker Style (보유 포카 가리기 전용: 체크 / 도장 / 내 이미지)
  // --------------------------------------------------------------------------
  setStampStyle(style, { silent = false } = {}) {
    if (style === 'custom' && !this.customStampSrc) {
      this.stampImageInput?.click();
      return;
    }
    this.stampStyle = style;
    try {
      localStorage.setItem('phoca_stamp_style', style);
    } catch (e) {}
    this.updateStampStyleUI();
    this.renderCards();

    if (!silent) {
      const labels = { check: '체크 표시', stamp: 'COMPLETE 도장', custom: '내 이미지' };
      this.showToast(`완료 표시: ${labels[style]}`);
    }
  }

  onCustomStampButtonClick() {
    // 이미 '내 이미지'가 선택된 상태에서 다시 누르면 이미지 변경
    if (this.stampStyle === 'custom' || !this.customStampSrc) {
      this.stampImageInput?.click();
    } else {
      this.setStampStyle('custom');
    }
  }

  handleStampImageUpload(file) {
    if (!file.type || !file.type.startsWith('image/')) {
      this.showToast('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 정사각형 중앙 크롭 + 256px 리사이즈 (localStorage 용량 절약)
        const SIZE = 256;
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, SIZE, SIZE);
        const dataUrl = canvas.toDataURL('image/png');

        this.customStampSrc = dataUrl;
        let saved = true;
        try {
          localStorage.setItem('phoca_custom_stamp', dataUrl);
        } catch (err) {
          saved = false;
        }
        this.setStampStyle('custom', { silent: true });
        this.showToast(saved
          ? '내 이미지가 완료 표시로 적용되었습니다! 🎉'
          : '이미지가 적용되었지만 저장 공간이 부족해 새로고침 시 사라질 수 있어요.', 3500);
      };
      img.onerror = () => this.showToast('이미지를 불러오지 못했습니다.');
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateStampStyleUI() {
    if (this.stampStyleGroup) {
      // 완료 표시는 '보유 포카 가리기' 모드에서만 의미가 있으므로 그때만 노출
      this.stampStyleGroup.style.display = this.displayMode === 'hide-owned' ? '' : 'none';
    }
    const map = { check: this.stampBtnCheck, stamp: this.stampBtnStamp, custom: this.stampBtnCustom };
    Object.entries(map).forEach(([key, btn]) => {
      if (btn) btn.classList.toggle('active', this.stampStyle === key);
    });
    if (this.stampBtnCustom) {
      const thumb = this.stampBtnCustom.querySelector('.stamp-custom-thumb');
      const icon = this.stampBtnCustom.querySelector('.stamp-custom-icon');
      if (thumb && icon) {
        if (this.customStampSrc) {
          thumb.src = this.customStampSrc;
          thumb.style.display = '';
          icon.style.display = 'none';
        } else {
          thumb.removeAttribute('src');
          thumb.style.display = 'none';
          icon.style.display = '';
        }
      }
      this.stampBtnCustom.title = this.customStampSrc
        ? (this.stampStyle === 'custom' ? '다시 눌러 이미지 변경' : '내 이미지로 완료 표시')
        : '내 이미지를 업로드해 완료 표시로 사용';
    }
  }

  isCurrentTemplateComplete() {
    const cards = this.currentTemplate?.cards || [];
    return cards.length > 0 && cards.every(c => this.checkedCards.has(c.id));
  }

  updateImageModeBadge() {
    if (!this.imageModeTag) return;
    if (this.displayMode === 'hide-owned') {
      if (this.isCurrentTemplateComplete()) {
        this.imageModeTag.textContent = '완성';
        this.imageModeTag.className = 'image-mode-badge complete';
        this.imageModeTag.title = '이 판의 포토카드를 모두 모았습니다!';
      } else {
        this.imageModeTag.textContent = '미보유';
        this.imageModeTag.className = 'image-mode-badge unowned';
        this.imageModeTag.title = '보유한 포토카드를 가려 미보유 위시리스트를 확인하는 모드입니다.';
      }
    } else {
      this.imageModeTag.textContent = '보유';
      this.imageModeTag.className = 'image-mode-badge owned';
      this.imageModeTag.title = '미보유 포토카드를 가려 보유한 컬렉션을 확인하는 모드입니다.';
    }
  }

  toggleCard(cardId) {
    if (this.checkedCards.has(cardId)) {
      this.checkedCards.delete(cardId);
      this.cardCounts.delete(cardId);
    } else {
      this.checkedCards.add(cardId);
      this.cardCounts.delete(cardId);
    }
    this.saveCheckedState();
    this.renderCards();
    this.updateStats();
    this.updateCurrentStatusBadge();
  }

  changeCardCount(cardId, delta) {
    const prev = this.getCardCount(cardId);
    const next = Math.max(0, Math.min(99, prev + delta));
    if (next === prev) return;

    if (next === 0) {
      this.checkedCards.delete(cardId);
      this.cardCounts.delete(cardId);
    } else if (next === 1) {
      this.checkedCards.add(cardId);
      this.cardCounts.delete(cardId);
    } else {
      this.checkedCards.add(cardId);
      this.cardCounts.set(cardId, next);
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
    this.cardCounts.clear();
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
      } else {
        this.cardCounts.delete(c.id);
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
      const count = isChecked ? (this.cardCounts.get(card.id) || 1) : 0;
      const hasDup = count >= 2;
      const isFavorite = this.favoriteCards.has(card.id);
      const isWish = !isChecked && this.wishCards.has(card.id);
      const isMasked = this.displayMode === 'hide-owned' ? isChecked : !isChecked;

      const cardEl = document.createElement('div');
      cardEl.className = 'photocard-slot'
        + (isMasked ? ' masked' : '')
        + (isChecked ? ' checked' : '')
        + (hasDup ? ' has-duplicate' : '')
        + (isWish ? ' is-wish' : '')
        + (isFavorite ? ' is-favorite' : '');
      cardEl.style.left = `${card.x}%`;
      cardEl.style.top = `${card.y}%`;
      cardEl.style.width = `${card.w}%`;
      cardEl.style.height = `${card.h}%`;
      cardEl.style.borderRadius = `${card.radius || 10}px`;
      cardEl.title = `${card.name || '포토카드'} (${isChecked ? `보유${hasDup ? ` ×${count}장` : ''}` : `미보유${isWish ? ' • 위시 ⭐' : ''}`}${isFavorite ? ' • 최애 포카 ♥' : ''}) - 클릭하여 체크`;

      // Complete Marker: 보유 포카 가리기 모드(hide-owned)에서 마스킹된 카드(=보유한 카드)에만 적용
      // 미보유 포카 가리기 모드(hide-unowned)에서는 기존 체크 동그라미 유지
      const useMarker = (this.displayMode === 'hide-owned' && isMasked);
      const checkHtml = `<div class="mask-indicator">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>`;

      let indicatorHtml = checkHtml;
      if (useMarker && this.stampStyle === 'stamp') {
        indicatorHtml = `<div class="mask-indicator is-stamp">
            <img src="images/stamp_complete.png" alt="COMPLETE" class="stamp-img">
          </div>`;
      } else if (useMarker && this.stampStyle === 'custom' && this.customStampSrc) {
        indicatorHtml = `<div class="mask-indicator is-custom">
            <img src="${this.customStampSrc}" alt="완료" class="custom-stamp-img">
          </div>`;
      }

      // Duplicate Quantity Badge (Top-Left, ONLY when count >= 2)
      const dupBadgeHtml = hasDup
        ? `<span class="card-dup-badge" aria-label="보유 수량 ${count}장">×${count}</span>`
        : '';

      // Favorite Heart Button (Top-Right)
      const favBtnHtml = `
        <button type="button" class="card-favorite-btn ${isFavorite ? 'is-favorite' : ''}" title="${isFavorite ? '최애 포카 지정 해제' : '내가 좋아하는 최애 포카로 등록 ♥'}">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="${isFavorite ? '#ef4444' : 'rgba(0, 0, 0, 0.35)'}" stroke="${isFavorite ? '#ef4444' : '#ffffff'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      `;

      // Bottom Control: Quantity Stepper when Owned (count >= 1), Wish Button when Unowned (!isChecked)
      const bottomControlHtml = isChecked
        ? `
        <div class="card-qty-stepper ${hasDup ? 'is-dup' : ''}" role="group" aria-label="보유 수량 조절">
          <button type="button" class="qty-step-btn qty-minus" data-qty-delta="-1" title="${count === 1 ? '미보유로 해제' : '수량 감소 (-1)'}">−</button>
          <span class="qty-step-val">${count}</span>
          <button type="button" class="qty-step-btn qty-plus" data-qty-delta="1" title="중복 수량 추가 (+1)">+</button>
        </div>
        `
        : `
        <button type="button" class="card-wish-btn ${isWish ? 'is-wish' : ''}" title="${isWish ? '위시 포카 해제' : '위시 포카로 담기 ⭐'}">
          <span class="wish-star-icon">${isWish ? '★' : '☆'}</span><span class="wish-btn-label">위시</span>
        </button>
        `;

      cardEl.innerHTML = `
        <div class="card-mask" style="border-radius: inherit;">
          ${indicatorHtml}
        </div>
        ${dupBadgeHtml}
        ${favBtnHtml}
        ${bottomControlHtml}
      `;

      // Handle card check toggle, favorite toggle, wish toggle, or quantity stepper
      cardEl.addEventListener('click', (e) => {
        const qtyBtn = e.target.closest('.qty-step-btn');
        if (qtyBtn) {
          e.stopPropagation();
          e.preventDefault();
          const delta = Number(qtyBtn.getAttribute('data-qty-delta') || 0);
          if (delta !== 0) this.changeCardCount(card.id, delta);
          return;
        }
        if (e.target.closest('.card-qty-stepper')) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        if (e.target.closest('.card-wish-btn')) {
          e.stopPropagation();
          e.preventDefault();
          this.toggleWishCard(card.id);
          return;
        }
        if (e.target.closest('.card-favorite-btn')) {
          e.stopPropagation();
          e.preventDefault();
          this.toggleFavorite(card.id);
          return;
        }
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
    if (this.statDupInfo) {
      let dupTypes = 0;
      let extraCopies = 0;
      this.cardCounts.forEach((qty, cardId) => {
        if (this.checkedCards.has(cardId) && qty >= 2) {
          dupTypes++;
          extraCopies += (qty - 1);
        }
      });
      if (dupTypes > 0) {
        this.statDupInfo.style.display = 'inline-flex';
        this.statDupInfo.textContent = `중복 ${dupTypes}종 (+${extraCopies}장)`;
      } else {
        this.statDupInfo.style.display = 'none';
      }
    }
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
    this.updateImageModeBadge();
    this.updateQuickPosterBadges();
  }

  updateQuickPosterBadges() {
    const dupAll = this.getDuplicateCards({ scope: 'all' });
    const wishAll = this.getWishCards({ scope: 'all' });
    const unownedAll = this.getUnownedCards({ scope: 'all' });

    if (this.quickDupCountBadge) {
      this.quickDupCountBadge.textContent = dupAll.length;
    }
    if (this.quickWishCountBadge) {
      this.quickWishCountBadge.textContent = wishAll.length;
    }
    if (this.quickUnownedCountBadge) {
      this.quickUnownedCountBadge.textContent = unownedAll.length;
    }
    if (this.mergedExportModalBackdrop && this.mergedExportModalBackdrop.classList.contains('open')) {
      this.updateMergedExportModalCounts();
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
        showCheckIcon: true,
        stampStyle: this.stampStyle,
        customStampSrc: this.customStampSrc
      });

      this.showToast('고해상도 체크리스트 이미지가 다운로드되었습니다! 🎉');

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'export_single_template', {
          template_id: this.currentTemplate.id,
          template_title: this.currentTemplate.title,
          checked_count: this.checkedCards.size,
          total_count: this.currentTemplate.cards?.length || 0,
          display_mode: this.displayMode
        });
      }
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
          다운로드 (1장)
        `;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Merged Poster Exports & Filter Modal
  // --------------------------------------------------------------------------
  openMergedExportModal() {
    if (!this.mergedExportModalBackdrop) return;
    this.updateMergedExportModalCounts();
    this.updateModeButtonsUI();
    this.mergedExportModalBackdrop.classList.add('open');
  }

  closeMergedExportModal() {
    if (!this.mergedExportModalBackdrop) return;
    this.mergedExportModalBackdrop.classList.remove('open');
  }

  updateMergedExportModalCounts() {
    const catTemplates = this.templates.filter(t => t.categoryId === (this.currentCategory?.id || 'fore'));
    const totalBoards = catTemplates.length;

    let ownedBoards = 0;
    let unownedBoards = 0;

    catTemplates.forEach(t => {
      const total = t.cards?.length || 0;
      const checkedSet = this.getCheckedSetForTemplate(t.id);
      const owned = checkedSet.size;

      if (total > 0 && owned === total) {
        ownedBoards++;
      } else if (total > 0 && owned < total) {
        unownedBoards++;
      }
    });

    if (this.mergedCountAll) {
      this.mergedCountAll.textContent = `${totalBoards}개 판`;
    }
    if (this.mergedCountOwned) {
      this.mergedCountOwned.textContent = `${ownedBoards}개 판`;
      this.mergedCountOwned.className = `badge-count ${ownedBoards > 0 ? 'success' : 'empty'}`;
    }
    if (this.mergedCountUnowned) {
      this.mergedCountUnowned.textContent = `${unownedBoards}개 판`;
      this.mergedCountUnowned.className = `badge-count ${unownedBoards > 0 ? 'warning' : 'empty'}`;
    }

    const favoriteList = this.getAllFavoriteCards();
    const count = favoriteList.length;

    if (this.mergedFavCount) {
      this.mergedFavCount.textContent = count;
    }

    const mergedFavCountBadge = document.getElementById('merged-fav-count-badge');
    if (mergedFavCountBadge) {
      mergedFavCountBadge.style.opacity = count > 0 ? '1' : '0.6';
    }

    if (this.btnDoExportFavMerged) {
      if (count === 0) {
        this.btnDoExportFavMerged.disabled = true;
        this.btnDoExportFavMerged.style.opacity = '0.5';
        this.btnDoExportFavMerged.style.cursor = 'not-allowed';
      } else {
        this.btnDoExportFavMerged.disabled = false;
        this.btnDoExportFavMerged.style.opacity = '1';
        this.btnDoExportFavMerged.style.cursor = 'pointer';
      }
    }

    // Duplicate Cards Counts (Current vs All)
    const dupAll = this.getDuplicateCards({ scope: 'all' });
    const dupCur = this.getDuplicateCards({ scope: 'current' });
    const dupExtraAll = dupAll.reduce((acc, c) => acc + Math.max(1, (c.count || 2) - 1), 0);

    if (this.mergedDupCardsBadge) {
      this.mergedDupCardsBadge.textContent = dupAll.length > 0
        ? `${dupAll.length}종 (+${dupExtraAll}장)`
        : '0종';
      this.mergedDupCardsBadge.style.opacity = dupAll.length > 0 ? '1' : '0.6';
    }
    if (this.btnDoExportDupCurrent) {
      this.btnDoExportDupCurrent.textContent = `현재 판 중복 (${dupCur.length}종)`;
      const hasCur = dupCur.length > 0 && this.currentView === 'checker';
      this.btnDoExportDupCurrent.disabled = !hasCur;
      this.btnDoExportDupCurrent.style.opacity = hasCur ? '1' : '0.45';
      this.btnDoExportDupCurrent.style.cursor = hasCur ? 'pointer' : 'not-allowed';
    }
    if (this.btnDoExportDupAll) {
      this.btnDoExportDupAll.textContent = `전체 중복 모음 (${dupAll.length}종)`;
      const hasAll = dupAll.length > 0;
      this.btnDoExportDupAll.disabled = !hasAll;
      this.btnDoExportDupAll.style.opacity = hasAll ? '1' : '0.45';
      this.btnDoExportDupAll.style.cursor = hasAll ? 'pointer' : 'not-allowed';
    }

    // Wish Cards Counts (Current vs All)
    const wishAll = this.getWishCards({ scope: 'all' });
    const wishCur = this.getWishCards({ scope: 'current' });

    if (this.mergedWishCardsBadge) {
      this.mergedWishCardsBadge.textContent = `${wishAll.length}장`;
      this.mergedWishCardsBadge.style.opacity = wishAll.length > 0 ? '1' : '0.6';
    }
    if (this.btnDoExportWishCurrent) {
      this.btnDoExportWishCurrent.textContent = `현재 판 위시 (${wishCur.length}장)`;
      const hasCurWish = wishCur.length > 0 && this.currentView === 'checker';
      this.btnDoExportWishCurrent.disabled = !hasCurWish;
      this.btnDoExportWishCurrent.style.opacity = hasCurWish ? '1' : '0.45';
      this.btnDoExportWishCurrent.style.cursor = hasCurWish ? 'pointer' : 'not-allowed';
    }
    if (this.btnDoExportWishAll) {
      this.btnDoExportWishAll.textContent = `전체 위시 편집·다운 (${wishAll.length}장)`;
      const hasAllWish = wishAll.length > 0;
      this.btnDoExportWishAll.disabled = !hasAllWish;
      this.btnDoExportWishAll.style.opacity = hasAllWish ? '1' : '0.45';
      this.btnDoExportWishAll.style.cursor = hasAllWish ? 'pointer' : 'not-allowed';
    }

    // Unowned Cards Counts (Current vs All - Direct Download, Full Count)
    const unownedAll = this.getUnownedCards({ scope: 'all' });
    const unownedCur = this.getUnownedCards({ scope: 'current' });

    if (this.mergedUnownedCardsBadge) {
      this.mergedUnownedCardsBadge.textContent = `${unownedAll.length}장`;
      this.mergedUnownedCardsBadge.style.opacity = unownedAll.length > 0 ? '1' : '0.6';
    }
    if (this.btnDoExportUnownedCurrent) {
      this.btnDoExportUnownedCurrent.textContent = `현재 판 미보유 다운 (${unownedCur.length}장)`;
      const hasCurUnowned = unownedCur.length > 0 && this.currentView === 'checker';
      this.btnDoExportUnownedCurrent.disabled = !hasCurUnowned;
      this.btnDoExportUnownedCurrent.style.opacity = hasCurUnowned ? '1' : '0.45';
      this.btnDoExportUnownedCurrent.style.cursor = hasCurUnowned ? 'pointer' : 'not-allowed';
    }
    if (this.btnDoExportUnownedAll) {
      this.btnDoExportUnownedAll.textContent = `전체 미보유 다운 (${unownedAll.length}장)`;
      const hasAllUnowned = unownedAll.length > 0;
      this.btnDoExportUnownedAll.disabled = !hasAllUnowned;
      this.btnDoExportUnownedAll.style.opacity = hasAllUnowned ? '1' : '0.45';
      this.btnDoExportUnownedAll.style.cursor = hasAllUnowned ? 'pointer' : 'not-allowed';
    }
  }

  getCardUniqueKey(templateId, cardId) {
    return `${templateId}::${cardId}`;
  }

  getExcludedSetForMode(mode) {
    return mode === 'duplicate' ? this.excludedDupCardKeys : this.excludedWishCardKeys;
  }

  saveExcludedState(mode) {
    try {
      if (mode === 'duplicate') {
        localStorage.setItem('phoca_excluded_dup_cards', JSON.stringify(Array.from(this.excludedDupCardKeys)));
      } else if (mode === 'wish') {
        localStorage.setItem('phoca_excluded_wish_cards', JSON.stringify(Array.from(this.excludedWishCardKeys)));
      }
    } catch (e) {}
  }

  getDuplicateCards({ scope = 'all' } = {}) {
    const targetTemplates = scope === 'current'
      ? (this.currentTemplate ? [this.currentTemplate] : [])
      : this.templates.filter(t => t.categoryId === (this.currentCategory?.id || 'fore'));

    const list = [];
    targetTemplates.forEach(t => {
      const checkedSet = (this.currentTemplateId === t.id && this.checkedCards)
        ? this.checkedCards
        : this.getCheckedSetForTemplate(t.id);
      if (checkedSet.size === 0 || !t.cards) return;

      const countsMap = (this.currentTemplateId === t.id && this.cardCounts)
        ? this.cardCounts
        : this.getCountsMapForTemplate(t.id, checkedSet);
      if (countsMap.size === 0) return;

      t.cards.forEach(card => {
        const qty = checkedSet.has(card.id) ? (countsMap.get(card.id) || 1) : 0;
        if (qty >= 2) {
          list.push({
            key: this.getCardUniqueKey(t.id, card.id),
            id: card.id,
            name: card.name || '포토카드',
            count: qty,
            extraCount: qty - 1,
            templateId: t.id,
            templateTitle: t.title,
            imageSrc: t.image,
            x: card.x,
            y: card.y,
            w: card.w,
            h: card.h,
            radius: card.radius || 10
          });
        }
      });
    });
    return list;
  }

  getWishCards({ scope = 'all' } = {}) {
    const targetTemplates = scope === 'current'
      ? (this.currentTemplate ? [this.currentTemplate] : [])
      : this.templates.filter(t => t.categoryId === (this.currentCategory?.id || 'fore'));

    const list = [];
    targetTemplates.forEach(t => {
      if (!t.cards || t.cards.length === 0) return;
      const checkedSet = (this.currentTemplateId === t.id && this.checkedCards)
        ? this.checkedCards
        : this.getCheckedSetForTemplate(t.id);
      const wishSet = (this.currentTemplateId === t.id && this.wishCards)
        ? this.wishCards
        : this.getWishSetForTemplate(t.id);
      if (wishSet.size === 0) return;

      t.cards.forEach(card => {
        if (!checkedSet.has(card.id) && wishSet.has(card.id)) {
          list.push({
            key: this.getCardUniqueKey(t.id, card.id),
            id: card.id,
            name: card.name || '포토카드',
            count: 0,
            templateId: t.id,
            templateTitle: t.title,
            imageSrc: t.image,
            x: card.x,
            y: card.y,
            w: card.w,
            h: card.h,
            radius: card.radius || 10
          });
        }
      });
    });
    return list;
  }

  getUnownedCards({ scope = 'all' } = {}) {
    const targetTemplates = scope === 'current'
      ? (this.currentTemplate ? [this.currentTemplate] : [])
      : this.templates.filter(t => t.categoryId === (this.currentCategory?.id || 'fore'));

    const list = [];
    targetTemplates.forEach(t => {
      if (!t.cards || t.cards.length === 0) return;
      const checkedSet = (this.currentTemplateId === t.id && this.checkedCards)
        ? this.checkedCards
        : this.getCheckedSetForTemplate(t.id);

      t.cards.forEach(card => {
        if (!checkedSet.has(card.id)) {
          list.push({
            key: this.getCardUniqueKey(t.id, card.id),
            id: card.id,
            name: card.name || '포토카드',
            count: 0,
            templateId: t.id,
            templateTitle: t.title,
            imageSrc: t.image,
            x: card.x,
            y: card.y,
            w: card.w,
            h: card.h,
            radius: card.radius || 10
          });
        }
      });
    });
    return list;
  }

  async exportUnownedCardsPosterDirect(scope = 'all') {
    const list = this.getUnownedCards({ scope });
    if (list.length === 0) {
      const msg = scope === 'current'
        ? '🎉 현재 판의 포토카드를 모두 수집 완료하셨습니다!'
        : '🎉 미보유 포카가 없습니다! 전체 포토카드를 모두 수집 완료하셨습니다!';
      this.showToast(msg, 3800);
      return;
    }

    try {
      this.closeMergedExportModal();
      const cat = this.categories.find(c => c.id === (this.currentCategory?.id || 'fore')) || this.categories[0] || {};
      const scopeLabel = scope === 'current' && this.currentTemplate
        ? this.currentTemplate.title
        : '전체 도안 통합';
      const scopeFileSuffix = scope === 'current' && this.currentTemplate
        ? this.currentTemplate.id
        : '전체';

      this.showToast(`🧩 미보유 포카 ${list.length}장 한 판 포스터를 생성 중입니다...`, 6000);

      await CanvasExporter.exportUnownedMergedPoster({
        unownedCards: list,
        nickname: this.nickname,
        categoryName: cat.name || '포레스텔라',
        scopeLabel,
        scopeFileSuffix,
        onProgress: (cur, total, msg) => {
          this.showToast(msg, 2200);
        }
      });

      this.showToast(`🎉 미보유 포카 ${list.length}장 한 판 이미지가 다운로드되었습니다!`);
    } catch (err) {
      console.error('Unowned poster export error:', err);
      this.showToast('미보유 포카 모음 생성 중 오류가 발생했습니다.');
    }
  }

  getCropPosterCandidates(mode = this.cropPosterState.mode, scope = this.cropPosterState.scope) {
    return mode === 'duplicate'
      ? this.getDuplicateCards({ scope })
      : this.getWishCards({ scope });
  }

  openCropPosterModal(mode = 'duplicate', scope = 'all') {
    const isDup = mode === 'duplicate';
    let effectiveScope = scope;
    if (effectiveScope === 'current' && this.currentView !== 'checker') {
      effectiveScope = 'all';
    }

    let candidates = this.getCropPosterCandidates(mode, effectiveScope);
    if (candidates.length === 0 && effectiveScope === 'current') {
      const allCandidates = this.getCropPosterCandidates(mode, 'all');
      if (allCandidates.length > 0) {
        effectiveScope = 'all';
        candidates = allCandidates;
        this.showToast(`현재 판에는 해당 포카가 없어 전체 도안 모음으로 열었습니다.`, 2800);
      }
    }

    if (candidates.length === 0) {
      const msg = isDup
        ? '⚠️ 2장 이상 중복 보유한 포카가 없습니다. 보유 포카 하단의 [+] 버튼으로 수량을 2 이상으로 설정해보세요!'
        : '⚠️ 등록된 위시 포카가 없습니다. 미보유 포카 하단의 [☆ 위시] 버튼을 눌러 위시 포카를 담아보세요!';
      this.showToast(msg, 3800);
      return;
    }

    this.closeMergedExportModal();

    this.cropPosterState.mode = mode;
    this.cropPosterState.scope = effectiveScope;
    this.cropPosterState.templateFilter = 'all';
    this.cropPosterState.searchQuery = '';
    this.cropPosterState.hitBoxes = [];

    if (this.cropPosterModalTitle) {
      this.cropPosterModalTitle.textContent = isDup
        ? '🔁 중복 포카 모음 편집 & 미리보기'
        : '⭐ 위시 포카 모음 편집 & 미리보기';
    }
    if (this.cropPosterNicknameInput) {
      this.cropPosterNicknameInput.value = this.nickname || '';
    }
    if (this.cropPosterSearchInput) {
      this.cropPosterSearchInput.value = '';
    }

    this.updateCropScopeButtonsUI();
    this.renderCropPosterTemplateFilterOptions(candidates);
    this.renderCropPosterPickerGrid();
    this.updateCropPosterCountersUI();

    if (this.cropPosterModalBackdrop) {
      this.cropPosterModalBackdrop.classList.add('open');
    }

    this.renderLiveCropPoster();
  }

  closeCropPosterModal() {
    if (this.cropPosterModalBackdrop) {
      this.cropPosterModalBackdrop.classList.remove('open');
    }
    if (this.cropThumbObserver) {
      this.cropThumbObserver.disconnect();
      this.cropThumbObserver = null;
    }
  }

  switchCropPosterScope(newScope) {
    if (newScope === 'current' && this.currentView !== 'checker') {
      this.showToast('체커 화면에서 도안판을 선택한 상태에서만 현재 판 보기가 가능합니다.');
      return;
    }
    const candidates = this.getCropPosterCandidates(this.cropPosterState.mode, newScope);
    if (candidates.length === 0) {
      const msg = this.cropPosterState.mode === 'duplicate'
        ? '현재 보고 있는 판에는 2장 이상 중복 보유한 포카가 없습니다.'
        : '현재 보고 있는 판에는 등록된 위시 포카가 없습니다.';
      this.showToast(msg, 2800);
      return;
    }

    this.cropPosterState.scope = newScope;
    this.cropPosterState.templateFilter = 'all';
    this.updateCropScopeButtonsUI();
    this.renderCropPosterTemplateFilterOptions(candidates);
    this.renderCropPosterPickerGrid();
    this.updateCropPosterCountersUI();
    this.renderLiveCropPoster();
  }

  updateCropScopeButtonsUI() {
    const scope = this.cropPosterState.scope;
    if (this.btnCropScopeAll) {
      this.btnCropScopeAll.classList.toggle('active', scope === 'all');
    }
    if (this.btnCropScopeCurrent) {
      this.btnCropScopeCurrent.classList.toggle('active', scope === 'current');
      const curTitle = this.currentTemplate?.title
        ? `현재 판 (${this.currentTemplate.id})`
        : '현재 판만';
      this.btnCropScopeCurrent.textContent = curTitle;
      this.btnCropScopeCurrent.disabled = this.currentView !== 'checker';
    }
  }

  renderCropPosterTemplateFilterOptions(candidatesOpt = null) {
    if (!this.cropPosterTemplateFilter) return;
    const candidates = candidatesOpt || this.getCropPosterCandidates();
    this.cropPosterTemplateFilter.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = `전체 도안 보기 (${candidates.length}장)`;
    this.cropPosterTemplateFilter.appendChild(allOpt);

    const byTemplate = new Map();
    candidates.forEach(c => {
      if (!byTemplate.has(c.templateId)) {
        byTemplate.set(c.templateId, { title: c.templateTitle, count: 0 });
      }
      byTemplate.get(c.templateId).count++;
    });

    byTemplate.forEach((info, tId) => {
      const opt = document.createElement('option');
      opt.value = tId;
      opt.textContent = `${info.title} (${info.count}장)`;
      this.cropPosterTemplateFilter.appendChild(opt);
    });

    this.cropPosterTemplateFilter.value = this.cropPosterState.templateFilter || 'all';
    this.cropPosterTemplateFilter.style.display = this.cropPosterState.scope === 'current' ? 'none' : '';
  }

  getFilteredCropCandidates() {
    const candidates = this.getCropPosterCandidates();
    const { templateFilter, searchQuery } = this.cropPosterState;
    return candidates.filter(c => {
      if (templateFilter && templateFilter !== 'all' && c.templateId !== templateFilter) {
        return false;
      }
      if (searchQuery) {
        const hay = `${c.name || ''} ${c.templateTitle || ''} ${c.templateId || ''}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  removeWishCardFromEditor(card) {
    const wishSet = this.getWishSetForTemplate(card.templateId);
    if (!wishSet.has(card.id)) return;
    wishSet.delete(card.id);

    try {
      const key = `phoca_wishes_${card.templateId}`;
      if (wishSet.size > 0) {
        localStorage.setItem(key, JSON.stringify(Array.from(wishSet)));
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {}

    this.excludedWishCardKeys.delete(card.key);
    this.saveExcludedState('wish');

    if (this.currentTemplateId === card.templateId) {
      this.wishCards = wishSet;
      this.renderCards();
    }
    this.updateQuickPosterBadges();

    const remaining = this.getCropPosterCandidates();
    if (remaining.length === 0 && this.cropPosterState.scope === 'current') {
      const allRemaining = this.getCropPosterCandidates('wish', 'all');
      if (allRemaining.length > 0) {
        this.cropPosterState.scope = 'all';
        this.cropPosterState.templateFilter = 'all';
        this.updateCropScopeButtonsUI();
      }
    }

    const updatedCandidates = this.getCropPosterCandidates();
    this.renderCropPosterTemplateFilterOptions(updatedCandidates);
    this.renderCropPosterPickerGrid();
    this.updateCropPosterCountersUI();
    this.renderLiveCropPoster();
    this.showToast(`'${card.name || '포토카드'}' 위시 지정을 완전히 해제했습니다.`, 2200);
  }

  renderCropPosterPickerGrid() {
    if (!this.cropPosterCardsGrid) return;
    if (this.cropThumbObserver) {
      this.cropThumbObserver.disconnect();
      this.cropThumbObserver = null;
    }
    this.cropPosterCardsGrid.innerHTML = '';

    const mode = this.cropPosterState.mode;
    const isDup = mode === 'duplicate';
    const isWish = mode === 'wish';
    const excludedSet = this.getExcludedSetForMode(mode);
    const filtered = this.getFilteredCropCandidates();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'crop-picker-empty';
      empty.textContent = isWish && this.getCropPosterCandidates().length === 0
        ? '등록된 위시 포토카드가 없습니다.'
        : '검색 조건과 일치하는 포토카드가 없습니다.';
      this.cropPosterCardsGrid.appendChild(empty);
      return;
    }

    const cardMapByKey = new Map();
    if ('IntersectionObserver' in window) {
      this.cropThumbObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const canvas = entry.target;
            const key = canvas.getAttribute('data-card-key');
            const item = cardMapByKey.get(key);
            if (item && !canvas.dataset.drawn) {
              canvas.dataset.drawn = '1';
              this.drawThumbCanvas(canvas, item);
            }
            this.cropThumbObserver?.unobserve(canvas);
          }
        });
      }, { root: this.cropPosterCardsGrid, rootMargin: '140px' });
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(card => {
      cardMapByKey.set(card.key, card);
      const isExcluded = excludedSet.has(card.key);

      const chip = document.createElement('div');
      chip.className = `crop-card-chip ${isExcluded ? 'is-excluded' : 'is-included'}`;
      chip.setAttribute('data-card-key', card.key);
      chip.title = isExcluded
        ? `${card.name} (제외됨 - 클릭하여 다시 포함)`
        : `${card.name} (포함됨 - 클릭하여 이미지에서 빼기)`;

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'crop-chip-thumb-wrap';

      const canvas = document.createElement('canvas');
      canvas.className = 'crop-chip-canvas';
      canvas.width = 96;
      canvas.height = 140;
      canvas.setAttribute('data-card-key', card.key);
      thumbWrap.appendChild(canvas);

      if (isDup && card.count >= 2) {
        const dupBadge = document.createElement('span');
        dupBadge.className = 'crop-chip-dup-badge';
        dupBadge.textContent = `×${card.count}`;
        thumbWrap.appendChild(dupBadge);
      } else if (isWish) {
        const unwishBtn = document.createElement('button');
        unwishBtn.type = 'button';
        unwishBtn.className = 'crop-chip-unwish-btn';
        unwishBtn.textContent = '★ 해제';
        unwishBtn.title = '위시 목록에서 완전히 삭제';
        unwishBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.removeWishCardFromEditor(card);
        });
        thumbWrap.appendChild(unwishBtn);
      }

      const statePill = document.createElement('span');
      statePill.className = 'crop-chip-action-pill';
      statePill.textContent = isExcluded ? '+ 포함' : '✕ 빼기';
      thumbWrap.appendChild(statePill);

      const excludedOverlay = document.createElement('div');
      excludedOverlay.className = 'crop-chip-excluded-mask';
      excludedOverlay.innerHTML = '<span>제외됨<br><small>클릭 시 복구</small></span>';
      thumbWrap.appendChild(excludedOverlay);

      const metaEl = document.createElement('div');
      metaEl.className = 'crop-chip-meta';

      const nameEl = document.createElement('div');
      nameEl.className = 'crop-chip-name';
      nameEl.textContent = card.name || '포토카드';
      metaEl.appendChild(nameEl);

      const sheetEl = document.createElement('div');
      sheetEl.className = 'crop-chip-sheet';
      sheetEl.textContent = (card.templateTitle || '').replace(/^fore\d+\.\s*/, '');
      metaEl.appendChild(sheetEl);

      chip.appendChild(thumbWrap);
      chip.appendChild(metaEl);

      chip.addEventListener('click', () => {
        this.toggleCropPosterCardExclude(card.key);
      });

      frag.appendChild(chip);

      if (this.cropThumbObserver) {
        this.cropThumbObserver.observe(canvas);
      } else {
        this.drawThumbCanvas(canvas, card);
      }
    });

    this.cropPosterCardsGrid.appendChild(frag);
  }

  syncSingleCropChipDOM(cardKey, isExcluded) {
    if (!this.cropPosterCardsGrid) return;
    const chip = Array.from(this.cropPosterCardsGrid.querySelectorAll('.crop-card-chip'))
      .find(el => el.getAttribute('data-card-key') === cardKey);
    if (!chip) return;
    chip.classList.toggle('is-excluded', isExcluded);
    chip.classList.toggle('is-included', !isExcluded);
    const pill = chip.querySelector('.crop-chip-action-pill');
    if (pill) pill.textContent = isExcluded ? '+ 포함' : '✕ 빼기';
  }

  toggleCropPosterCardExclude(cardKey, { fromPreview = false, cardName = '' } = {}) {
    const mode = this.cropPosterState.mode;
    const excludedSet = this.getExcludedSetForMode(mode);
    let nowExcluded = false;

    if (excludedSet.has(cardKey)) {
      excludedSet.delete(cardKey);
      nowExcluded = false;
    } else {
      excludedSet.add(cardKey);
      nowExcluded = true;
    }

    this.saveExcludedState(mode);
    this.syncSingleCropChipDOM(cardKey, nowExcluded);
    this.updateCropPosterCountersUI();
    this.updateQuickPosterBadges();
    this.renderLiveCropPoster();

    if (fromPreview && nowExcluded) {
      this.showToast(`'${cardName || '포토카드'}'을(를) 이미지에서 뺐습니다. (목록에서 다시 포함 가능)`, 2200);
    }
  }

  setVisibleCropCardsExcluded(shouldExclude) {
    const mode = this.cropPosterState.mode;
    const excludedSet = this.getExcludedSetForMode(mode);
    const filtered = this.getFilteredCropCandidates();
    if (filtered.length === 0) return;

    let changed = 0;
    filtered.forEach(c => {
      if (shouldExclude && !excludedSet.has(c.key)) {
        excludedSet.add(c.key);
        this.syncSingleCropChipDOM(c.key, true);
        changed++;
      } else if (!shouldExclude && excludedSet.has(c.key)) {
        excludedSet.delete(c.key);
        this.syncSingleCropChipDOM(c.key, false);
        changed++;
      }
    });

    if (changed === 0) return;
    this.saveExcludedState(mode);
    this.updateCropPosterCountersUI();
    this.updateQuickPosterBadges();
    this.renderLiveCropPoster();
    this.showToast(
      shouldExclude
        ? `현재 목록의 포카 ${changed}장을 이미지에서 뺐습니다.`
        : `현재 목록의 포카 ${changed}장을 다시 포함했습니다.`,
      2200
    );
  }

  restoreAllCropExcludedCards() {
    const mode = this.cropPosterState.mode;
    const excludedSet = this.getExcludedSetForMode(mode);
    const candidates = this.getCropPosterCandidates();
    let restored = 0;

    candidates.forEach(c => {
      if (excludedSet.has(c.key)) {
        excludedSet.delete(c.key);
        this.syncSingleCropChipDOM(c.key, false);
        restored++;
      }
    });

    if (restored === 0) return;
    this.saveExcludedState(mode);
    this.updateCropPosterCountersUI();
    this.updateQuickPosterBadges();
    this.renderLiveCropPoster();
    this.showToast(`↺ 제외했던 포카 ${restored}장을 모두 다시 포함했습니다.`, 2300);
  }

  updateCropPosterCountersUI() {
    const mode = this.cropPosterState.mode;
    const excludedSet = this.getExcludedSetForMode(mode);
    const candidates = this.getCropPosterCandidates();
    const total = candidates.length;
    const excludedCount = candidates.reduce((acc, c) => acc + (excludedSet.has(c.key) ? 1 : 0), 0);
    const includedCount = total - excludedCount;

    if (this.cropPosterExcludeStats) {
      this.cropPosterExcludeStats.innerHTML = excludedCount > 0
        ? `포함 <strong>${includedCount}</strong>장 / 전체 ${total}장 <span style="color:#fda4af;">(제외 ${excludedCount}장)</span>`
        : `포함 <strong>${includedCount}</strong>장 / 전체 ${total}장`;
    }

    if (this.btnCropRestoreAll) {
      this.btnCropRestoreAll.textContent = `↺ 전체 복구 (${excludedCount})`;
      this.btnCropRestoreAll.disabled = excludedCount === 0;
      this.btnCropRestoreAll.style.opacity = excludedCount > 0 ? '1' : '0.45';
    }

    if (this.cropPosterPreviewSummary) {
      this.cropPosterPreviewSummary.textContent = `현재 화면 이미지 (포함 ${includedCount}장)`;
    }

    if (this.btnDownloadCropPoster) {
      this.btnDownloadCropPoster.textContent = `현재 화면 이미지 다운로드 (${includedCount}장)`;
      this.btnDownloadCropPoster.disabled = includedCount === 0;
      this.btnDownloadCropPoster.style.opacity = includedCount > 0 ? '1' : '0.45';
    }

    if (this.btnCopyCropPoster) {
      this.btnCopyCropPoster.disabled = includedCount === 0;
      this.btnCopyCropPoster.style.opacity = includedCount > 0 ? '1' : '0.45';
    }
  }

  findPreviewHitCard(e) {
    if (!this.cropPosterPreviewCanvas || !this.cropPosterState.hitBoxes?.length) return null;
    const rect = this.cropPosterPreviewCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    return this.cropPosterState.hitBoxes.find(box =>
      nx >= box.nx && nx <= box.nx + box.nw && ny >= box.ny && ny <= box.ny + box.nh
    ) || null;
  }

  async renderLiveCropPoster() {
    if (!this.cropPosterPreviewCanvas) return;
    const seq = ++this.cropPosterState.renderSeq;
    const { mode, scope } = this.cropPosterState;
    const excludedSet = this.getExcludedSetForMode(mode);
    const candidates = this.getCropPosterCandidates(mode, scope);
    const includedCards = candidates.filter(c => !excludedSet.has(c.key));

    this.updateCropPosterCountersUI();

    if (includedCards.length === 0) {
      this.activeCropPosterCanvas = null;
      this.activeCropPosterFilename = '';
      this.cropPosterState.hitBoxes = [];
      if (this.cropPosterLoadingOverlay) this.cropPosterLoadingOverlay.style.display = 'none';

      const cW = 680;
      const cH = 340;
      this.cropPosterPreviewCanvas.width = cW;
      this.cropPosterPreviewCanvas.height = cH;
      const ctx = this.cropPosterPreviewCanvas.getContext('2d');
      ctx.fillStyle = '#0b0e18';
      ctx.fillRect(0, 0, cW, cH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 14, cW - 28, cH - 28);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
      ctx.fillText('포함된 포토카드가 없습니다 (전부 제외됨)', cW / 2, cH / 2 - 14);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
      ctx.fillText('우측/하단 카드 목록을 클릭하거나 [↺ 전체 복구] 버튼을 눌러 포카를 추가해주세요.', cW / 2, cH / 2 + 20);
      return;
    }

    if (this.cropPosterLoadingOverlay) {
      this.cropPosterLoadingOverlay.style.display = 'flex';
    }

    try {
      const cat = this.categories.find(c => c.id === (this.currentCategory?.id || 'fore')) || this.categories[0] || {};
      const scopeLabel = scope === 'current' && this.currentTemplate
        ? this.currentTemplate.title
        : '전체 도안 통합';
      const scopeFileSuffix = scope === 'current' && this.currentTemplate
        ? this.currentTemplate.id
        : '전체';

      const result = await CanvasExporter.renderCustomCardGridCanvas({
        mode,
        cards: includedCards,
        nickname: this.nickname,
        categoryName: cat.name || '포레스텔라',
        scopeLabel,
        scopeFileSuffix
      });

      if (seq !== this.cropPosterState.renderSeq || !result || !result.canvas) return;

      this.activeCropPosterCanvas = result.canvas;
      this.activeCropPosterFilename = result.filename;
      this.cropPosterState.hitBoxes = result.cardHitBoxes || [];

      this.cropPosterPreviewCanvas.width = result.canvas.width;
      this.cropPosterPreviewCanvas.height = result.canvas.height;
      const ctx = this.cropPosterPreviewCanvas.getContext('2d');
      ctx.drawImage(result.canvas, 0, 0);
    } catch (err) {
      console.error('Live crop poster render error:', err);
    } finally {
      if (seq === this.cropPosterState.renderSeq && this.cropPosterLoadingOverlay) {
        this.cropPosterLoadingOverlay.style.display = 'none';
      }
    }
  }

  downloadActiveCropPoster() {
    if (!this.activeCropPosterCanvas) {
      this.showToast('⚠️ 현재 이미지에 포함된 포카가 없습니다. 포카를 1장 이상 포함해주세요!');
      return;
    }
    const isDup = this.cropPosterState.mode === 'duplicate';
    const fallbackName = `포카체커_${isDup ? '중복포카모음' : '위시포카모음'}_${new Date().toISOString().split('T')[0]}.png`;
    CanvasExporter.downloadCanvas(this.activeCropPosterCanvas, this.activeCropPosterFilename || fallbackName);
    this.showToast('💾 현재 화면에 보이는 포스터 이미지가 그대로 다운로드되었습니다! 🎉');
  }

  async copyActiveCropPoster() {
    if (!this.activeCropPosterCanvas) {
      this.showToast('⚠️ 현재 이미지에 포함된 포카가 없습니다.');
      return;
    }
    try {
      const copied = await CanvasExporter.copyCanvasToClipboard(this.activeCropPosterCanvas);
      if (copied) {
        this.showToast('📋 현재 화면의 포스터 이미지가 클립보드에 복사되었습니다! (트위터·카톡 붙여넣기 가능) ✨');
      } else {
        this.showToast('⚠️ 클립보드 복사를 지원하지 않는 브라우저입니다. 다운로드 버튼을 이용해주세요.');
      }
    } catch (err) {
      this.showToast('이미지 복사 중 오류가 발생했습니다.');
    }
  }

  async exportFavoriteMergedPosterAction() {
    const favoriteList = this.getAllFavoriteCards();
    if (favoriteList.length === 0) {
      this.showToast('⚠️ 최애 포카가 선택되지 않았습니다. 하트(♥)를 먼저 눌러주세요!');
      return;
    }

    try {
      const count = Math.min(favoriteList.length, 10);
      this.showToast(`💖 최애 포카 ${count}장 고화질 합본 포스터를 생성 중입니다. 잠시만 기다려 주세요...`, 6000);
      const cat = this.categories.find(c => c.id === 'fore') || this.categories[0] || {};

      await CanvasExporter.exportFavoriteMergedPoster({
        favoriteCards: favoriteList,
        nickname: this.nickname,
        categoryName: cat.name || '포레스텔라',
        onProgress: (cur, total, msg) => {
          this.showToast(msg, 2500);
        }
      });

      this.showToast('🎉 최애포카 합본 포스터 이미지가 다운로드되었습니다!');
      this.closeMergedExportModal();
    } catch (err) {
      console.error('Favorite merged export error:', err);
      this.showToast('합본 포스터 생성 중 오류가 발생했습니다.');
    }
  }

  async exportFilteredMergedImage(filterType = 'all', overrideMode = null) {
    try {
      const catTemplates = this.templates.filter(t => t.categoryId === (this.currentCategory?.id || 'fore'));
      
      let targetTemplates = catTemplates;
      let filterName = '전체 39종';

      // Determine effective display mode based on filter type or explicit override
      let effectiveMode = overrideMode;
      if (!effectiveMode) {
        if (filterType === 'owned') effectiveMode = 'hide-unowned'; // Always show owned cards
        else if (filterType === 'unowned') effectiveMode = 'hide-owned'; // Always hide owned cards (show wishlist)
        else effectiveMode = this.displayMode;
      }

      const modeLabelStr = effectiveMode === 'hide-owned' ? '미보유 위시' : '보유 컬렉션';

      if (filterType === 'owned') {
        targetTemplates = catTemplates.filter(t => {
          const total = t.cards?.length || 0;
          const checkedSet = this.getCheckedSetForTemplate(t.id);
          return total > 0 && checkedSet.size === total;
        });
        filterName = `올클리어(전체 보유) ${targetTemplates.length}종`;
      } else if (filterType === 'unowned') {
        targetTemplates = catTemplates.filter(t => {
          const total = t.cards?.length || 0;
          const checkedSet = this.getCheckedSetForTemplate(t.id);
          return total > 0 && checkedSet.size < total;
        });
        filterName = `미보유 위시 ${targetTemplates.length}종`;
      } else {
        filterName = `전체 ${targetTemplates.length}종 (${modeLabelStr})`;
      }

      if (targetTemplates.length === 0) {
        const msg = filterType === 'owned' 
          ? '아직 전체 수집 완료(올클리어)된 이미지판이 없습니다. 포카를 먼저 체크해주세요!' 
          : '미보유 포카가 있는 이미지판이 없습니다. 모든 판을 완료하셨습니다! 🎉';
        this.showToast(msg, 4000);
        return;
      }

      this.closeMergedExportModal();
      this.showToast(`${filterName} 고화질 합본 이미지를 생성 중입니다. 잠시만 기다려 주세요...`, 8000);

      await CanvasExporter.exportCategoryMergedPng({
        templates: targetTemplates,
        allCategoryTemplates: catTemplates,
        getCheckedSetFn: (id) => this.getCheckedSetForTemplate(id),
        categoryName: this.currentCategory?.name || '포레스텔라',
        displayMode: effectiveMode,
        filterType: filterType,
        stampStyle: this.stampStyle,
        customStampSrc: this.customStampSrc,
        onProgress: (cur, total, msg) => {
          this.showToast(msg, 3000);
        }
      });

      this.showToast(`🎉 ${filterName} 합본 포스터 이미지가 다운로드되었습니다!`);

      // Send stats to Google Sheets Webhook and GA4 in background
      this.sendMasterExportStats(targetTemplates);
    } catch (err) {
      console.error('Merged export error:', err);
      this.showToast('합본 이미지 생성 중 오류가 발생했습니다.');
    }
  }

  async exportAllMergedImage() {
    this.openMergedExportModal();
  }

  sendMasterExportStats(catTemplates) {
    try {
      let totalCards = 0;
      let totalChecked = 0;
      const checkedCardIds = [];

      catTemplates.forEach(t => {
        totalCards += (t.cards?.length || 0);
        const checkedSet = this.getCheckedSetForTemplate(t.id);
        totalChecked += checkedSet.size;
        t.cards?.forEach(c => {
          if (checkedSet.has(c.id)) {
            checkedCardIds.push(c.id);
          }
        });
      });

      const overallPercent = totalCards > 0 ? Math.round((totalChecked / totalCards) * 100) : 0;

      // 1. GA4 Event Tracking
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'export_master_poster', {
          total_cards: totalCards,
          total_checked: totalChecked,
          percent: overallPercent,
          display_mode: this.displayMode
        });
      }

      // 2. Google Sheets Webhook Sync (if URL configured)
      const statsUrl = window.GOOGLE_SHEETS_STATS_URL || 'https://script.google.com/macros/s/AKfycby4j6_Sxyp6xpJjFRotN2xGXskf5Z7VOPQxdsQFERCVDNExMderOAUvhRmNbVxc2E__/exec';
      if (statsUrl) {
        const payload = {
          action: 'submit_stats',
          timestamp: new Date().toISOString(),
          category: this.currentCategory?.id || 'fore',
          totalCards: totalCards,
          totalChecked: totalChecked,
          percent: overallPercent,
          displayMode: this.displayMode,
          checkedCardIds: checkedCardIds
        };

        fetch(statsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Stats sync notice:', e);
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

  // --------------------------------------------------------------------------
  // Summary Card Modal (Nickname & Favorite Photocards)
  // --------------------------------------------------------------------------
  openSummaryCardModal() {
    if (!this.summaryCardModalBackdrop) return;
    this.summaryCardModalBackdrop.classList.add('open');
    if (this.summaryNicknameInput) {
      this.summaryNicknameInput.value = this.nickname || '';
    }
    this.renderFeaturedCardsStrip();
    this.renderLiveSummaryCard();
  }

  closeSummaryCardModal() {
    if (this.summaryCardModalBackdrop) {
      this.summaryCardModalBackdrop.classList.remove('open');
    }
  }

  renderFeaturedCardsStrip() {
    if (!this.featuredCardsStrip) return;
    this.featuredCardsStrip.innerHTML = '';

    const favoriteList = this.getAllFavoriteCards();

    if (favoriteList.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'padding: 0.65rem; font-size: 0.78rem; color: #94a3b8; text-align: center; width: 100%;';
      emptyMsg.innerHTML = '등록된 최애 포카가 없습니다.<br>포토카드 위의 <span style="color:#ef4444;font-weight:700;">하트(♥)</span>를 누르면 이곳에서 대표 카드로 선택할 수 있습니다!';
      this.featuredCardsStrip.appendChild(emptyMsg);
      if (this.featuredCardNameHint) {
        this.featuredCardNameHint.textContent = '최애포카 없음 (기본 로고 표시)';
      }
      return;
    }

    if (!this.featuredFavoriteId || !favoriteList.some(f => f.id === this.featuredFavoriteId)) {
      this.featuredFavoriteId = favoriteList[0].id;
    }

    favoriteList.forEach(fav => {
      const isSelected = fav.id === this.featuredFavoriteId;
      const chip = document.createElement('div');
      chip.className = `featured-card-chip ${isSelected ? 'is-selected' : ''}`;
      chip.setAttribute('data-fav-id', fav.id);

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'chip-thumb-wrap';

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'chip-thumb-canvas';
      thumbCanvas.width = 60;
      thumbCanvas.height = 72;
      thumbWrap.appendChild(thumbCanvas);

      const checkBadge = document.createElement('div');
      checkBadge.className = 'chip-selected-badge';
      checkBadge.textContent = '✓';
      thumbWrap.appendChild(checkBadge);

      const nameEl = document.createElement('div');
      nameEl.className = 'chip-name';
      nameEl.title = fav.name || '최애 포카';
      nameEl.textContent = fav.name || '최애';

      chip.appendChild(thumbWrap);
      chip.appendChild(nameEl);

      chip.addEventListener('click', () => {
        if (this.featuredFavoriteId === fav.id) return;
        this.featuredFavoriteId = fav.id;
        localStorage.setItem('phoca_featured_favorite_id', fav.id);
        this.renderFeaturedCardsStrip();
        this.renderLiveSummaryCard();
      });

      this.featuredCardsStrip.appendChild(chip);

      // Async draw thumbnail on canvas
      this.drawThumbCanvas(thumbCanvas, fav);
    });
  }

  drawThumbCanvas(canvas, fav) {
    if (!canvas || !fav || !fav.imageSrc) return;
    this.templateImgCache = this.templateImgCache || new Map();
    const ctx = canvas.getContext('2d');

    const render = (img) => {
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      const sx = (fav.x / 100) * imgW;
      const sy = (fav.y / 100) * imgH;
      const sw = Math.max(1, (fav.w / 100) * imgW);
      const sh = Math.max(1, (fav.h / 100) * imgH);

      const cW = canvas.width;
      const cH = canvas.height;
      const cardRatio = sw / sh;
      const canvasRatio = cW / cH;

      let dW, dH;
      if (cardRatio > canvasRatio) {
        dW = cW;
        dH = Math.round(cW / cardRatio);
      } else {
        dH = cH;
        dW = Math.round(cH * cardRatio);
      }
      const dX = Math.round((cW - dW) / 2);
      const dY = Math.round((cH - dH) / 2);

      ctx.fillStyle = '#0f121d';
      ctx.fillRect(0, 0, cW, cH);
      ctx.drawImage(img, sx, sy, sw, sh, dX, dY, dW, dH);
    };

    if (this.templateImgCache.has(fav.imageSrc)) {
      render(this.templateImgCache.get(fav.imageSrc));
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.templateImgCache.set(fav.imageSrc, img);
        render(img);
      };
      img.src = fav.imageSrc;
    }
  }

  async renderLiveSummaryCard() {
    if (!this.summaryCardCanvas) return;

    let totalCards = 0;
    let totalChecked = 0;
    this.templates.forEach(t => {
      totalCards += (t.cards?.length || 0);
      const checkedSet = this.getCheckedSetForTemplate(t.id);
      totalChecked += checkedSet.size;
    });

    const overallPercent = totalCards > 0 ? Math.round((totalChecked / totalCards) * 100) : 0;
    const favoriteList = this.getAllFavoriteCards();

    if (this.summaryFavCountEl) {
      this.summaryFavCountEl.textContent = favoriteList.length;
    }

    // Determine featured favorite card (1장 대표 최애포카)
    let featuredFavorite = null;
    if (favoriteList.length > 0) {
      if (this.featuredFavoriteId) {
        featuredFavorite = favoriteList.find(f => f.id === this.featuredFavoriteId) || favoriteList[0];
      } else {
        featuredFavorite = favoriteList[0];
      }
      this.featuredFavoriteId = featuredFavorite.id;
    } else {
      this.featuredFavoriteId = null;
    }

    if (this.featuredCardNameHint) {
      if (featuredFavorite) {
        const sheetName = (featuredFavorite.templateTitle || '').replace(/^fore\d+\.\s*/, '');
        this.featuredCardNameHint.textContent = `${featuredFavorite.name} (${sheetName})`;
      } else {
        this.featuredCardNameHint.textContent = '선택된 포카 없음 (기본 로고)';
      }
    }

    const cat = this.categories.find(c => c.id === 'fore') || this.categories[0] || {};

    try {
      const generatedCanvas = await CanvasExporter.renderSummaryCardCanvas({
        categoryName: cat.name || '포레스텔라',
        subtitle: cat.subtitle || 'Forestella Photocard Collection',
        badge: cat.badge || (cat.itemCount + '종'),
        totalCards: totalCards,
        totalChecked: totalChecked,
        percent: overallPercent,
        logoSrc: cat.logoImage || 'images/fore/forestella_logo.jpg',
        nickname: this.nickname,
        featuredFavorite: featuredFavorite,
        favoriteCards: favoriteList
      });

      this.summaryCardCanvas.width = generatedCanvas.width;
      this.summaryCardCanvas.height = generatedCanvas.height;
      const ctx = this.summaryCardCanvas.getContext('2d');
      ctx.drawImage(generatedCanvas, 0, 0);
      this.activeSummaryCanvas = generatedCanvas;
    } catch (err) {
      console.warn('Summary card render error:', err);
    }
  }

  async copySummaryCardImage() {
    const canvas = this.activeSummaryCanvas || this.summaryCardCanvas;
    if (!canvas) return;

    try {
      const copied = await CanvasExporter.copyCanvasToClipboard(canvas);
      if (copied) {
        this.showToast('📋 수집 카드 이미지가 클립보드에 복사되었습니다! (붙여넣기 가능) ✨');
      } else {
        this.showToast('⚠️ 클립보드 복사를 지원하지 않는 브라우저입니다. 다운로드 버튼을 이용해주세요.');
      }
    } catch (err) {
      console.warn('Copy summary card error:', err);
      this.showToast('이미지 복사 중 오류가 발생했습니다.');
    }
  }

  async downloadSummaryCardImage() {
    const canvas = this.activeSummaryCanvas || this.summaryCardCanvas;
    if (!canvas) return;

    const nickStr = this.nickname ? `_${this.nickname}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `포카체커_수집카드${nickStr}_${dateStr}.png`;
    CanvasExporter.downloadCanvas(canvas, filename);
    this.showToast('💾 수집 카드 이미지가 다운로드되었습니다!');
  }

  async shareSummaryCardToX() {
    let totalCards = 0;
    let totalChecked = 0;
    this.templates.forEach(t => {
      totalCards += (t.cards?.length || 0);
      const checkedSet = this.getCheckedSetForTemplate(t.id);
      totalChecked += checkedSet.size;
    });

    const overallPercent = totalCards > 0 ? Math.round((totalChecked / totalCards) * 100) : 0;
    const favoriteList = this.getAllFavoriteCards();
    const favCount = favoriteList.length;
    const featuredFav = favoriteList.find(f => f.id === this.featuredFavoriteId);
    const featuredPart = featuredFav ? ` (대표 최애: ${featuredFav.name})` : (favCount > 0 ? ` (최애 포카 ${favCount}장 지정 ♥)` : '');
    const nickPart = this.nickname ? `${this.nickname}님의 ` : '';
    const tier = CanvasExporter.getCollectorTier(overallPercent);
    const tweetText = `🌲 ${nickPart}포레스텔라 포토카드를 ${overallPercent}% (${totalChecked}/${totalCards}장) 수집했어요! ✨${featuredPart}\n💬 "${tier.tweetPhrase}"\n\n나만의 포카 체크리스트 & 위시리스트 만들기 👇\n\n#포레포카체커`;
    const shareUrl = 'https://foretissimo.github.io/phoca_checker/';
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

    const width = 580;
    const height = 520;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);
    window.open(
      twitterIntentUrl,
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'share_to_x', {
        total_checked: totalChecked,
        total_cards: totalCards,
        percent: overallPercent,
        fav_count: favCount
      });
    }

    // Try auto-copying image to clipboard for easy pasting into tweet
    this.copySummaryCardImage();
  }

  async shareToX() {
    this.openSummaryCardModal();
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
