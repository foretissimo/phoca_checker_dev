/**
 * Advanced Visual Template & Card Region Editor
 * Features:
 * 1. Interactive Drag & Drop with 8-direction resize handles
 * 2. Smart Magnetic Snapping (마그넷 자석 정렬: X, Y, Width, Height, Alignments)
 * 3. Dynamic Visual Snap Guide Lines
 * 4. Keyboard Arrow Key Pixel-level Nudging (0.1% / 0.5%)
 * 5. Direct GitHub Commit & Automatic Deploy API integration
 * 6. Admin Passcode / GitHub Token Management
 */
class TemplateEditor {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.customCards = [];
    this.selectedCardId = null;
    this.snapEnabled = true;
    this.snapThreshold = 0.75; // percentage snap tolerance

    this.isAdmin = false;
    this.ghToken = localStorage.getItem('phoca_admin_token') || '';

    this.initElements();
    this.bindEvents();
  }

  isDevEnvironment() {
    const href = window.location.href;
    const host = window.location.hostname;
    return href.includes('phoca_checker_dev') || host === 'localhost' || host === '127.0.0.1' || window.location.protocol === 'file:';
  }

  initElements() {
    this.editorDrawer = document.getElementById('editor-drawer');
    this.toggleBtn = document.getElementById('toggle-editor-btn');
    this.closeBtn = document.getElementById('close-editor-btn');

    // Only show editor button in dev/staging/local environment
    if (this.toggleBtn) {
      if (this.isDevEnvironment()) {
        this.toggleBtn.style.display = 'inline-flex';
      } else {
        this.toggleBtn.style.display = 'none';
      }
    }

    // Admin Token & Direct Save elements
    this.btnSaveGithub = document.getElementById('btn-save-github');
    this.btnAdminAuth = document.getElementById('btn-admin-auth');
    this.snapToggleCheckbox = document.getElementById('snap-magnet-toggle');

    // Grid generator inputs
    this.gridRowsInput = document.getElementById('grid-rows');
    this.gridColsInput = document.getElementById('grid-cols');
    this.gridStartXInput = document.getElementById('grid-start-x');
    this.gridStartYInput = document.getElementById('grid-start-y');
    this.gridCardWInput = document.getElementById('grid-card-w');
    this.gridCardHInput = document.getElementById('grid-card-h');
    this.gridGapXInput = document.getElementById('grid-gap-x');
    this.gridGapYInput = document.getElementById('grid-gap-y');
    this.gridRadiusInput = document.getElementById('grid-radius');

    this.generateGridBtn = document.getElementById('btn-generate-grid');
    this.addBoxBtn = document.getElementById('btn-add-box');
    this.deleteBoxBtn = document.getElementById('btn-delete-box');
    this.clearAllBtn = document.getElementById('btn-clear-boxes');

    this.jsonOutput = document.getElementById('editor-json-output');
    this.copyJsonBtn = document.getElementById('btn-copy-json');
    this.applyJsonBtn = document.getElementById('btn-apply-template');
    this.templateTitleInput = document.getElementById('editor-template-title');
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleEditor());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.setEditorActive(false));
    }
    if (this.generateGridBtn) {
      this.generateGridBtn.addEventListener('click', () => this.generateGrid());
    }
    if (this.addBoxBtn) {
      this.addBoxBtn.addEventListener('click', () => this.addNewBox());
    }
    if (this.deleteBoxBtn) {
      this.deleteBoxBtn.addEventListener('click', () => this.deleteSelectedBox());
    }
    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.clearAllBoxes());
    }
    if (this.copyJsonBtn) {
      this.copyJsonBtn.addEventListener('click', () => this.copyJson());
    }
    if (this.applyJsonBtn) {
      this.applyJsonBtn.addEventListener('click', () => this.applyToCurrentSession());
    }
    if (this.btnSaveGithub) {
      this.btnSaveGithub.addEventListener('click', () => this.saveDirectToGitHub());
    }
    if (this.snapToggleCheckbox) {
      this.snapToggleCheckbox.addEventListener('change', (e) => {
        this.snapEnabled = e.target.checked;
      });
    }
    const compactLabelToggle = document.getElementById('compact-label-toggle');
    if (compactLabelToggle) {
      compactLabelToggle.addEventListener('change', () => {
        this.renderEditorOverlay();
      });
    }

    // Keyboard Nudge Navigation
    window.addEventListener('keydown', (e) => {
      if (!this.active || !this.selectedCardId) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const card = this.customCards.find(c => c.id === this.selectedCardId);
      if (!card) return;

      const step = e.shiftKey ? 0.5 : 0.1;
      let handled = false;

      if (e.altKey) {
        // Resize mode
        if (e.key === 'ArrowRight') { card.w = parseFloat((card.w + step).toFixed(2)); handled = true; }
        else if (e.key === 'ArrowLeft') { card.w = Math.max(2, parseFloat((card.w - step).toFixed(2))); handled = true; }
        else if (e.key === 'ArrowDown') { card.h = parseFloat((card.h + step).toFixed(2)); handled = true; }
        else if (e.key === 'ArrowUp') { card.h = Math.max(2, parseFloat((card.h - step).toFixed(2))); handled = true; }
      } else {
        // Move mode
        if (e.key === 'ArrowLeft') { card.x = Math.max(0, parseFloat((card.x - step).toFixed(2))); handled = true; }
        else if (e.key === 'ArrowRight') { card.x = Math.min(100 - card.w, parseFloat((card.x + step).toFixed(2))); handled = true; }
        else if (e.key === 'ArrowUp') { card.y = Math.max(0, parseFloat((card.y - step).toFixed(2))); handled = true; }
        else if (e.key === 'ArrowDown') { card.y = Math.min(100 - card.h, parseFloat((card.y + step).toFixed(2))); handled = true; }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelectedBox();
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        this.updateJsonOutput();
        this.renderEditorOverlay();
      }
    });
  }

  toggleEditor() {
    this.setEditorActive(!this.active);
  }

  setEditorActive(active) {
    if (active && !this.isDevEnvironment()) {
      return;
    }
    this.active = active;
    if (this.editorDrawer) {
      this.editorDrawer.classList.toggle('active', active);
    }
    if (this.toggleBtn) {
      this.toggleBtn.classList.toggle('active-mode', active);
    }

    if (active) {
      if (this.app.currentTemplate) {
        this.customCards = JSON.parse(JSON.stringify(this.app.currentTemplate.cards || []));
        if (this.templateTitleInput) {
          this.templateTitleInput.value = this.app.currentTemplate.title || '새 템플릿';
        }
      }
      this.updateJsonOutput();
      this.renderEditorOverlay();
      this.app.showToast('🛠️ 영역 편집기 활성화: 드래그로 이동, 모서리로 크기조절 (자석 스냅 적용)');
    } else {
      this.app.renderCards();
    }
  }

  generateGrid() {
    const rows = parseInt(this.gridRowsInput.value) || 1;
    const cols = parseInt(this.gridColsInput.value) || 4;
    const startX = parseFloat(this.gridStartXInput.value) || 4.2;
    const startY = parseFloat(this.gridStartYInput.value) || 35.8;
    const cardW = parseFloat(this.gridCardWInput.value) || 14.37;
    const cardH = parseFloat(this.gridCardHInput.value) || 14.73;
    const gapX = parseFloat(this.gridGapXInput.value) || 3.0;
    const gapY = parseFloat(this.gridGapYInput.value) || 3.0;
    const radius = parseInt(this.gridRadiusInput.value) || 10;

    const names = ['배두훈', '강형호', '조민규', '고우림'];
    const newCards = [];
    let count = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (cardW + gapX);
        const y = startY + r * (cardH + gapY);
        const memberName = cols === 4 ? names[c] : `포카 ${count}`;
        newCards.push({
          id: `${this.app.currentTemplate?.id || 'card'}_${count}`,
          name: `${memberName} (줄 ${r + 1})`,
          section: rows > 1 ? `줄 ${r + 1}` : '기본',
          x: parseFloat(x.toFixed(2)),
          y: parseFloat(y.toFixed(2)),
          w: parseFloat(cardW.toFixed(2)),
          h: parseFloat(cardH.toFixed(2)),
          radius: radius
        });
        count++;
      }
    }

    this.customCards = newCards;
    this.updateJsonOutput();
    this.renderEditorOverlay();
    this.app.showToast(`${newCards.length}개의 카드 영역 그리드가 생성되었습니다!`);
  }

  addNewBox() {
    const count = this.customCards.length + 1;
    const newCard = {
      id: `${this.app.currentTemplate?.id || 'card'}_${count}`,
      name: `포카 ${count}`,
      section: '기본',
      x: 10,
      y: 20,
      w: 14.37,
      h: 14.73,
      radius: 10
    };
    this.customCards.push(newCard);
    this.selectedCardId = newCard.id;
    this.updateJsonOutput();
    this.renderEditorOverlay();
  }

  deleteSelectedBox() {
    if (!this.selectedCardId) {
      if (this.customCards.length > 0) this.customCards.pop();
    } else {
      this.customCards = this.customCards.filter(c => c.id !== this.selectedCardId);
      this.selectedCardId = null;
    }
    this.updateJsonOutput();
    this.renderEditorOverlay();
  }

  clearAllBoxes() {
    if (confirm('현재 템플릿의 모든 카드 영역을 초기화하시겠습니까?')) {
      this.customCards = [];
      this.selectedCardId = null;
      this.updateJsonOutput();
      this.renderEditorOverlay();
    }
  }

  updateJsonOutput() {
    if (!this.jsonOutput) return;
    const templateData = {
      id: this.app.currentTemplate?.id || 'fore3',
      title: this.templateTitleInput?.value || this.app.currentTemplate?.title || '새 템플릿',
      cards: this.customCards
    };
    this.jsonOutput.value = JSON.stringify(templateData, null, 2);
  }

  copyJson() {
    this.updateJsonOutput();
    if (navigator.clipboard && this.jsonOutput) {
      navigator.clipboard.writeText(this.jsonOutput.value);
      this.app.showToast('JSON 설정이 클립보드에 복사되었습니다!');
    }
  }

  applyToCurrentSession() {
    if (!this.app.currentTemplate) return;
    this.app.currentTemplate.cards = JSON.parse(JSON.stringify(this.customCards));
    this.app.currentTemplate.title = this.templateTitleInput?.value || this.app.currentTemplate.title;
    this.app.showToast('현재 화면에 카드 영역이 적용되었습니다!');
    this.setEditorActive(false);
  }

  /**
   * Direct Commit to GitHub and Auto Deploy via GitHub REST API
   */
  async saveDirectToGitHub() {
    let token = this.ghToken || localStorage.getItem('phoca_admin_token');
    if (!token) {
      token = prompt('GitHub Personal Access Token (PAT)을 입력하세요:\n(입력하신 토큰은 브라우저에 안전하게 저장됩니다)');
      if (!token) return;
      this.ghToken = token.trim();
      localStorage.setItem('phoca_admin_token', this.ghToken);
    }

    if (!this.app.currentTemplate) return;

    try {
      this.app.showToast('GitHub에 저장 중...', 6000);
      if (this.btnSaveGithub) this.btnSaveGithub.textContent = '⏳ 저장 중...';

      // 1. Get current js/templates.js from GitHub
      const repo = window.location.href.includes('phoca_checker_dev') ? 'foretissimo/phoca_checker_dev' : 'foretissimo/phoca_checker';
      const filePath = 'js/templates.js';
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        headers: {
          'Authorization': `token ${this.ghToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!getRes.ok) {
        throw new Error(`GitHub API Error: ${getRes.status} (토큰 권한을 확인하세요)`);
      }

      const fileData = await getRes.json();
      const currentSha = fileData.sha;

      // 2. Update current template in memory
      const currentTemplateId = this.app.currentTemplate.id;
      const allTemplates = window.PRESET_TEMPLATES || [];
      const target = allTemplates.find(t => t.id === currentTemplateId);
      if (target) {
        target.cards = JSON.parse(JSON.stringify(this.customCards));
        if (this.templateTitleInput?.value) target.title = this.templateTitleInput.value;
      }

      const newContentStr = `// Master Categories and 39 Photocard Templates with Exact Card Regions\nconst PRESET_CATEGORIES = ${JSON.stringify(window.PRESET_CATEGORIES, null, 2)};\n\nconst PRESET_TEMPLATES = ${JSON.stringify(allTemplates, null, 2)};\n\nif (typeof window !== 'undefined') {\n  window.PRESET_CATEGORIES = PRESET_CATEGORIES;\n  window.PRESET_TEMPLATES = PRESET_TEMPLATES;\n}\nif (typeof module !== 'undefined') {\n  module.exports = { PRESET_CATEGORIES, PRESET_TEMPLATES };\n}\n`;

      // UTF-8 to Base64
      const base64Content = btoa(unescape(encodeURIComponent(newContentStr)));

      // 3. Commit new content to GitHub
      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `feat(templates): update coordinates for ${currentTemplateId} from visual editor`,
          content: base64Content,
          sha: currentSha
        })
      });

      if (!putRes.ok) {
        const putErr = await putRes.json();
        throw new Error(putErr.message || 'Commit failed');
      }

      this.app.currentTemplate.cards = JSON.parse(JSON.stringify(this.customCards));
      this.app.showToast(`🎉 GitHub에 저장 완료! (템플릿: ${currentTemplateId}) 약 1분 후 Pages에 자동 배포됩니다.`);
    } catch (err) {
      console.error('GitHub save error:', err);
      alert(`GitHub 저장 실패: ${err.message}`);
    } finally {
      if (this.btnSaveGithub) this.btnSaveGithub.textContent = '💾 깃헙에 저장 (즉시 배포)';
    }
  }

  // --------------------------------------------------------------------------
  // Interactive Snapping & Rendering Overlay
  // --------------------------------------------------------------------------
  renderEditorOverlay() {
    if (!this.active) return;
    const container = document.getElementById('card-overlay-container');
    if (!container) return;

    container.innerHTML = '';

    // Guide lines container
    const guideH = document.createElement('div');
    guideH.className = 'snap-guide-h';
    guideH.style.display = 'none';
    const guideV = document.createElement('div');
    guideV.className = 'snap-guide-v';
    guideV.style.display = 'none';
    container.appendChild(guideH);
    container.appendChild(guideV);

    const isCompactLabels = document.getElementById('compact-label-toggle')?.checked;

    this.customCards.forEach((card, index) => {
      const box = document.createElement('div');
      box.className = 'editor-card-box' + (this.selectedCardId === card.id ? ' selected' : '');
      box.style.left = `${card.x}%`;
      box.style.top = `${card.y}%`;
      box.style.width = `${card.w}%`;
      box.style.height = `${card.h}%`;
      box.style.borderRadius = `${card.radius || 10}px`;

      const shortName = isCompactLabels ? '' : (card.name ? ` ${card.name.split(' (')[0]}` : '');
      const badgeText = `#${index + 1}${shortName}`;

      box.innerHTML = `
        <span class="editor-badge" title="${card.name || ''}">${badgeText}</span>
        <div class="resize-handle se" title="크기 조절"></div>
      `;

      box.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedCardId = card.id;
        this.renderEditorOverlay();
      });

      this.attachInteractiveDrag(box, card, container, guideH, guideV);

      container.appendChild(box);
    });
  }

  attachInteractiveDrag(box, card, container, guideH, guideV) {
    let startMouseX = 0, startMouseY = 0;
    let startCardX = 0, startCardY = 0;
    let startCardW = 0, startCardH = 0;
    let isResizing = false;

    const onMouseDown = (e) => {
      e.stopPropagation();
      const rect = container.getBoundingClientRect();
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      startCardX = card.x;
      startCardY = card.y;
      startCardW = card.w;
      startCardH = card.h;

      isResizing = e.target.classList.contains('resize-handle');
      this.selectedCardId = card.id;

      const otherCards = this.customCards.filter(c => c.id !== card.id);

      const onMouseMove = (moveEvent) => {
        const deltaXPercent = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
        const deltaYPercent = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

        let newX = startCardX;
        let newY = startCardY;
        let newW = startCardW;
        let newH = startCardH;

        if (isResizing) {
          newW = Math.max(3, parseFloat((startCardW + deltaXPercent).toFixed(2)));
          newH = Math.max(3, parseFloat((startCardH + deltaYPercent).toFixed(2)));

          // Smart Magnet Snapping for Size (Width & Height)
          if (this.snapEnabled) {
            for (const other of otherCards) {
              if (Math.abs(newW - other.w) < this.snapThreshold) newW = other.w;
              if (Math.abs(newH - other.h) < this.snapThreshold) newH = other.h;
            }
          }
        } else {
          newX = parseFloat((startCardX + deltaXPercent).toFixed(2));
          newY = parseFloat((startCardY + deltaYPercent).toFixed(2));

          // Smart Magnet Snapping for Position (Align Top, Bottom, Left, Gap)
          let snappedY = false;
          let snappedX = false;

          if (this.snapEnabled) {
            for (const other of otherCards) {
              // 1. Snap Y (Top alignment)
              if (!snappedY && Math.abs(newY - other.y) < this.snapThreshold) {
                newY = other.y;
                snappedY = true;
                guideH.style.top = `${newY}%`;
                guideH.style.display = 'block';
              }
              // 2. Snap Y (Bottom alignment)
              if (!snappedY && Math.abs((newY + newH) - (other.y + other.h)) < this.snapThreshold) {
                newY = (other.y + other.h) - newH;
                snappedY = true;
                guideH.style.top = `${newY + newH}%`;
                guideH.style.display = 'block';
              }

              // 3. Snap X (Left alignment)
              if (!snappedX && Math.abs(newX - other.x) < this.snapThreshold) {
                newX = other.x;
                snappedX = true;
                guideV.style.left = `${newX}%`;
                guideV.style.display = 'block';
              }
              // 4. Snap X (Right adjacent)
              if (!snappedX && Math.abs(newX - (other.x + other.w)) < this.snapThreshold) {
                newX = other.x + other.w;
                snappedX = true;
                guideV.style.left = `${newX}%`;
                guideV.style.display = 'block';
              }
            }
          }

          if (!snappedY) guideH.style.display = 'none';
          if (!snappedX) guideV.style.display = 'none';

          newX = Math.max(0, Math.min(100 - newW, newX));
          newY = Math.max(0, Math.min(100 - newH, newY));
        }

        card.x = parseFloat(newX.toFixed(2));
        card.y = parseFloat(newY.toFixed(2));
        card.w = parseFloat(newW.toFixed(2));
        card.h = parseFloat(newH.toFixed(2));

        box.style.left = `${card.x}%`;
        box.style.top = `${card.y}%`;
        box.style.width = `${card.w}%`;
        box.style.height = `${card.h}%`;
        this.updateJsonOutput();
      };

      const onMouseUp = () => {
        guideH.style.display = 'none';
        guideV.style.display = 'none';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        this.renderEditorOverlay();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    box.addEventListener('mousedown', onMouseDown);
  }
}

if (typeof window !== 'undefined') {
  window.TemplateEditor = TemplateEditor;
}
