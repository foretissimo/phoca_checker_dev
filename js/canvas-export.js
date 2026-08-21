/**
 * Canvas Export Utility for High-Resolution Photocard Checklist
 * Supports single template export and full category multi-card merged collage export
 */
class CanvasExporter {
  /**
   * Render single template high-resolution composite canvas and download as PNG
   */
  static async exportToPng({
    imageElement,
    templateTitle = '포토카드',
    cards,
    checkedCardIds,
    displayMode = 'hide-owned',
    overlayColor = 'rgba(25, 25, 28, 0.68)',
    filename = 'photocard_checklist.png',
    showCheckIcon = true,
  }) {
    if (!imageElement || !imageElement.complete) {
      throw new Error('Image is not ready for export');
    }

    const naturalWidth = imageElement.naturalWidth || imageElement.width;
    const naturalHeight = imageElement.naturalHeight || imageElement.height;

    // We add a stylish bottom information banner for watermark, legend & credits
    const bannerHeight = Math.max(70, Math.round(naturalWidth * 0.055));
    const canvas = document.createElement('canvas');
    canvas.width = naturalWidth;
    canvas.height = naturalHeight + bannerHeight;
    const ctx = canvas.getContext('2d');

    // Background fill
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Draw base original image at native resolution
    ctx.drawImage(imageElement, 0, 0, naturalWidth, naturalHeight);

    // 2. Draw card overlays
    const totalCards = cards.length;
    const ownedCount = checkedCardIds.size;
    const percent = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0;

    cards.forEach((card) => {
      const isChecked = checkedCardIds.has(card.id);
      
      let shouldMask = false;
      if (displayMode === 'hide-owned') {
        shouldMask = isChecked; // Mask owned -> highlight wishlist
      } else {
        shouldMask = !isChecked; // Mask unowned -> highlight collection
      }

      if (shouldMask) {
        const x = (card.x / 100) * naturalWidth;
        const y = (card.y / 100) * naturalHeight;
        const w = (card.w / 100) * naturalWidth;
        const h = (card.h / 100) * naturalHeight;

        const baseWidthRef = 1200;
        const radius = Math.max(4, Math.round(((card.radius || 10) * naturalWidth) / baseWidthRef));

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, radius);
        } else {
          CanvasExporter.drawRoundRectPath(ctx, x, y, w, h, radius);
        }
        ctx.closePath();
        ctx.fillStyle = overlayColor;
        ctx.fill();

        // Border outline
        ctx.lineWidth = Math.max(1.5, Math.round(naturalWidth / 600));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.stroke();

        // Optional check icon on masked cards
        if (showCheckIcon) {
          const iconSize = Math.min(w * 0.28, h * 0.28, 44);
          const iconX = x + (w - iconSize) / 2;
          const iconY = y + (h - iconSize) / 2;
          
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fill();

          ctx.beginPath();
          ctx.lineWidth = Math.max(2, iconSize * 0.12);
          ctx.strokeStyle = '#ffffff';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.moveTo(iconX + iconSize * 0.28, iconY + iconSize * 0.52);
          ctx.lineTo(iconX + iconSize * 0.44, iconY + iconSize * 0.70);
          ctx.lineTo(iconX + iconSize * 0.75, iconY + iconSize * 0.32);
          ctx.stroke();
        }

        ctx.restore();
      }
    });

    // 2.5 Draw Top-Left Mode Pill Badge ('미보유' or '보유')
    ctx.save();
    const modeTagText = displayMode === 'hide-owned' ? '미보유' : '보유';
    const tagFontSize = Math.max(16, Math.round(naturalWidth * 0.022));
    ctx.font = `bold ${tagFontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", sans-serif`;

    const tagPaddingX = Math.round(tagFontSize * 0.7);
    const tagPaddingY = Math.round(tagFontSize * 0.35);
    const tagTextMetrics = ctx.measureText(modeTagText);
    const tagWidth = tagTextMetrics.width + tagPaddingX * 2;
    const tagHeight = tagFontSize + tagPaddingY * 2;

    const tagX = Math.round(naturalWidth * 0.025);
    const tagY = Math.round(naturalWidth * 0.025);
    const tagRadius = Math.round(tagHeight / 2);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(tagX, tagY, tagWidth, tagHeight, tagRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, tagX, tagY, tagWidth, tagHeight, tagRadius);
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fill();

    ctx.lineWidth = Math.max(1.5, Math.round(naturalWidth / 800));
    ctx.strokeStyle = displayMode === 'hide-owned' ? '#38bdf8' : '#34d399';
    ctx.stroke();

    ctx.fillStyle = displayMode === 'hide-owned' ? '#38bdf8' : '#34d399';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeTagText, tagX + tagWidth / 2, tagY + tagHeight / 2 + 1);
    ctx.restore();

    // 3. Draw Bottom Info & Credit Banner
    ctx.save();
    const bannerY = naturalHeight;
    ctx.fillStyle = '#141722';
    ctx.fillRect(0, bannerY, naturalWidth, bannerHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, bannerY);
    ctx.lineTo(naturalWidth, bannerY);
    ctx.stroke();

    const fontSize = Math.max(14, Math.round(bannerHeight * 0.28));
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", sans-serif`;
    
    // Left: Collection status & mode
    const modeLabel = displayMode === 'hide-owned' ? '보유 포카 가림 (미보유 위시리스트)' : '미보유 포카 가림 (보유 컬렉션)';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`✨ ${templateTitle} [수집: ${ownedCount}/${totalCards}장 (${percent}%)]`, naturalWidth * 0.025, bannerY + bannerHeight * 0.42);

    ctx.font = `500 ${Math.max(12, Math.round(fontSize * 0.85))}px -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`모드: ${modeLabel}`, naturalWidth * 0.025, bannerY + bannerHeight * 0.78);

    // Right: Attribution Credits
    const creditText = '출처: @sy_fore (x.com/sy_fore) | Notion (t.co/fEts76yenI)';
    const textWidth = ctx.measureText(creditText).width;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(creditText, naturalWidth * 0.975 - textWidth, bannerY + bannerHeight * 0.60);

    ctx.restore();

    // 4. Download file
    return CanvasExporter.downloadCanvas(canvas, filename);
  }

  /**
   * Export all templates in category merged into a single multi-column master poster
   */
  static async exportCategoryMergedPng({
    templates,
    getCheckedSetFn,
    categoryName = '포레스텔라',
    displayMode = 'hide-owned',
    onProgress = () => {}
  }) {
    if (!templates || templates.length === 0) return false;

    // Load all images in parallel
    const loadedItems = [];
    let loadedCount = 0;

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      onProgress(i + 1, templates.length, `이미지 불러오는 중 (${i + 1}/${templates.length})...`);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = t.image;
      });

      const checkedSet = getCheckedSetFn(t.id);
      loadedItems.push({
        template: t,
        img: img,
        checkedSet: checkedSet
      });
      loadedCount++;
    }

    onProgress(templates.length, templates.length, '고화질 전체 포스터 합성 중...');

    // Layout configuration: 4 columns poster
    const cols = 4;
    const rows = Math.ceil(loadedItems.length / cols);
    const cellWidth = 900;
    const cardSpacing = 40;
    const headerHeight = 220;
    const footerHeight = 120;
    const cellHeaderHeight = 50;

    // Calculate maximum aspect ratio for row heights
    const posterWidth = cellWidth * cols + cardSpacing * (cols + 1);
    
    // Compute cell heights per row
    const rowHeights = [];
    for (let r = 0; r < rows; r++) {
      let maxH = 1200;
      for (let c = 0; c < cols; c++) {
        const item = loadedItems[r * cols + c];
        if (item && item.img && item.img.width > 0) {
          const scaledH = (cellWidth / item.img.width) * item.img.height;
          if (scaledH > maxH) maxH = scaledH;
        }
      }
      rowHeights.push(Math.round(maxH));
    }

    const totalHeight = headerHeight + footerHeight + rowHeights.reduce((a, b) => a + b + cellHeaderHeight + cardSpacing, 0);

    const canvas = document.createElement('canvas');
    canvas.width = posterWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    // Background fill
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(0, 0, posterWidth, totalHeight);

    // Calculate total collection stats
    let totalCardsAll = 0;
    let totalOwnedAll = 0;
    loadedItems.forEach(item => {
      totalCardsAll += (item.template.cards?.length || 0);
      totalOwnedAll += item.checkedSet.size;
    });
    const totalPercent = totalCardsAll > 0 ? Math.round((totalOwnedAll / totalCardsAll) * 100) : 0;

    // 1. Draw Poster Header
    ctx.save();
    ctx.fillStyle = '#141724';
    ctx.fillRect(0, 0, posterWidth, headerHeight);

    // Gradient accent top bar
    const grad = ctx.createLinearGradient(0, 0, posterWidth, 0);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#10b981');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, posterWidth, 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillText(`✨ ${categoryName} 포토카드 전체 컬렉션 현황`, cardSpacing * 1.5, 90);

    ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#94a3b8';
    const modeDesc = displayMode === 'hide-owned' ? '보유 포토카드 가림 (미보유 위시리스트 강조)' : '미보유 포토카드 가림 (보유 컬렉션 강조)';
    ctx.fillText(`수집 현황: ${totalOwnedAll} / ${totalCardsAll} 장 (${totalPercent}%)  •  총 ${loadedItems.length}종 템플릿  •  ${modeDesc}`, cardSpacing * 1.5, 145);

    // Credit in header
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const headerCredit = '도안 출처: @sy_fore (x.com/sy_fore) | Notion (t.co/fEts76yenI)';
    const creditW = ctx.measureText(headerCredit).width;
    ctx.fillText(headerCredit, posterWidth - cardSpacing * 1.5 - creditW, 115);

    ctx.restore();

    // 2. Render each template cell
    let currentY = headerHeight + cardSpacing;

    for (let r = 0; r < rows; r++) {
      const rowHeight = rowHeights[r];

      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        if (index >= loadedItems.length) break;

        const item = loadedItems[index];
        const t = item.template;
        const img = item.img;
        const checkedSet = item.checkedSet;

        const cellX = cardSpacing + c * (cellWidth + cardSpacing);
        const cellY = currentY;

        // Draw Cell Header Bar (Title & Progress)
        ctx.save();
        ctx.fillStyle = '#1c2132';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(cellX, cellY, cellWidth, cellHeaderHeight, [8, 8, 0, 0]);
        } else {
          ctx.rect(cellX, cellY, cellWidth, cellHeaderHeight);
        }
        ctx.fill();

        const tOwned = checkedSet.size;
        const tTotal = t.cards?.length || 0;
        const isDone = tTotal > 0 && tOwned === tTotal;

        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`${t.title}`, cellX + 16, cellY + 32);

        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillStyle = isDone ? '#34d399' : (tOwned > 0 ? '#a5b4fc' : '#64748b');
        const badgeTxt = isDone ? `완료 ${tOwned}/${tTotal} ✓` : `${tOwned}/${tTotal}장`;
        const badgeW = ctx.measureText(badgeTxt).width;
        ctx.fillText(badgeTxt, cellX + cellWidth - 16 - badgeW, cellY + 32);
        ctx.restore();

        // Draw Template Image & Overlays
        const imgY = cellY + cellHeaderHeight;
        if (img && img.width > 0) {
          const imgH = Math.round((cellWidth / img.width) * img.height);
          ctx.drawImage(img, cellX, imgY, cellWidth, imgH);

          // Render card overlays
          (t.cards || []).forEach(card => {
            const isChecked = checkedSet.has(card.id);
            let shouldMask = displayMode === 'hide-owned' ? isChecked : !isChecked;

            if (shouldMask) {
              const cx = cellX + (card.x / 100) * cellWidth;
              const cy = imgY + (card.y / 100) * imgH;
              const cw = (card.w / 100) * cellWidth;
              const ch = (card.h / 100) * imgH;
              const radius = Math.max(3, Math.round(((card.radius || 10) * cellWidth) / 1200));

              ctx.save();
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(cx, cy, cw, ch, radius);
              } else {
                CanvasExporter.drawRoundRectPath(ctx, cx, cy, cw, ch, radius);
              }
              ctx.closePath();
              ctx.fillStyle = 'rgba(16, 17, 24, 0.70)';
              ctx.fill();

              ctx.lineWidth = 1;
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.stroke();
              ctx.restore();
            }
          });
        }
      }

      currentY += cellHeaderHeight + rowHeight + cardSpacing;
    }

    // 3. Draw Poster Footer
    ctx.save();
    ctx.fillStyle = '#141724';
    ctx.fillRect(0, totalHeight - footerHeight, posterWidth, footerHeight);

    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#94a3b8';
    const footerTxt = `포카 체커 (Phoca Checker) • 포토카드 출처: @sy_fore (x.com/sy_fore) | Notion (t.co/fEts76yenI) • 생성일시: ${new Date().toLocaleDateString('ko-KR')}`;
    ctx.fillText(footerTxt, cardSpacing * 1.5, totalHeight - footerHeight / 2 + 8);
    ctx.restore();

    // 4. Trigger Master Poster Download
    const filename = `포카체커_${categoryName}_전체39종_컬렉션_${displayMode === 'hide-owned' ? '위시리스트' : '보유본'}.png`;
    return CanvasExporter.downloadCanvas(canvas, filename);
  }

  /**
   * Return high-resolution single template canvas object (without automatic download)
   */
  static getSingleTemplateCanvas({
    imageElement,
    templateTitle = '포토카드',
    cards,
    checkedCardIds,
    displayMode = 'hide-owned',
    overlayColor = 'rgba(25, 25, 28, 0.68)',
    showCheckIcon = true
  }) {
    if (!imageElement || !imageElement.complete) {
      throw new Error('Image is not ready for export');
    }

    const naturalWidth = imageElement.naturalWidth || imageElement.width;
    const naturalHeight = imageElement.naturalHeight || imageElement.height;
    const bannerHeight = Math.max(70, Math.round(naturalWidth * 0.055));
    const canvas = document.createElement('canvas');
    canvas.width = naturalWidth;
    canvas.height = naturalHeight + bannerHeight;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageElement, 0, 0, naturalWidth, naturalHeight);

    const totalCards = cards.length;
    const ownedCount = checkedCardIds.size;
    const percent = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0;

    cards.forEach((card) => {
      const isChecked = checkedCardIds.has(card.id);
      let shouldMask = (displayMode === 'hide-owned') ? isChecked : !isChecked;

      if (shouldMask) {
        const x = (card.x / 100) * naturalWidth;
        const y = (card.y / 100) * naturalHeight;
        const w = (card.w / 100) * naturalWidth;
        const h = (card.h / 100) * naturalHeight;
        const baseWidthRef = 1200;
        const radius = Math.max(4, Math.round(((card.radius || 10) * naturalWidth) / baseWidthRef));

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, radius);
        } else {
          CanvasExporter.drawRoundRectPath(ctx, x, y, w, h, radius);
        }
        ctx.closePath();
        ctx.fillStyle = overlayColor;
        ctx.fill();

        ctx.lineWidth = Math.max(1.5, Math.round(naturalWidth / 600));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.stroke();

        if (showCheckIcon) {
          const iconSize = Math.min(w * 0.28, h * 0.28, 44);
          const iconX = x + (w - iconSize) / 2;
          const iconY = y + (h - iconSize) / 2;
          
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fill();

          ctx.beginPath();
          ctx.lineWidth = Math.max(2, iconSize * 0.12);
          ctx.strokeStyle = '#ffffff';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(iconX + iconSize * 0.28, iconY + iconSize * 0.52);
          ctx.lineTo(iconX + iconSize * 0.44, iconY + iconSize * 0.70);
          ctx.lineTo(iconX + iconSize * 0.75, iconY + iconSize * 0.32);
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    // Top Mode Tag
    ctx.save();
    const tagHeight = Math.max(28, Math.round(naturalWidth * 0.024));
    const tagWidth = Math.max(90, Math.round(naturalWidth * 0.08));
    const tagX = naturalWidth * 0.02;
    const tagY = naturalHeight * 0.015;
    const tagRadius = Math.round(tagHeight * 0.25);
    const modeTagText = displayMode === 'hide-owned' ? '미보유' : '보유';

    ctx.font = `bold ${Math.max(13, Math.round(tagHeight * 0.55))}px -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", sans-serif`;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(tagX, tagY, tagWidth, tagHeight, tagRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, tagX, tagY, tagWidth, tagHeight, tagRadius);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, Math.round(naturalWidth / 800));
    ctx.strokeStyle = displayMode === 'hide-owned' ? '#38bdf8' : '#34d399';
    ctx.stroke();
    ctx.fillStyle = displayMode === 'hide-owned' ? '#38bdf8' : '#34d399';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeTagText, tagX + tagWidth / 2, tagY + tagHeight / 2 + 1);
    ctx.restore();

    // Bottom Info Banner
    ctx.save();
    const bannerY = naturalHeight;
    ctx.fillStyle = '#141722';
    ctx.fillRect(0, bannerY, naturalWidth, bannerHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, bannerY);
    ctx.lineTo(naturalWidth, bannerY);
    ctx.stroke();

    const fontSize = Math.max(14, Math.round(bannerHeight * 0.28));
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", sans-serif`;
    const modeLabel = displayMode === 'hide-owned' ? '보유 포카 가림' : '미보유 포카 가림';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`✨ ${templateTitle} [수집: ${ownedCount}/${totalCards}장 (${percent}%)]`, naturalWidth * 0.025, bannerY + bannerHeight * 0.42);

    ctx.font = `500 ${Math.max(12, Math.round(fontSize * 0.85))}px -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`모드: ${modeLabel} • #포레포카체커`, naturalWidth * 0.025, bannerY + bannerHeight * 0.78);

    const creditText = '🔗 https://foretissimo.github.io/phoca_checker/';
    const textWidth = ctx.measureText(creditText).width;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(creditText, naturalWidth * 0.975 - textWidth, bannerY + bannerHeight * 0.60);
    ctx.restore();

    return canvas;
  }

  /**
   * Render stylish collection summary card canvas for Twitter / Social sharing (1200x675)
   */
  static renderSummaryCardCanvas({ categoryName = '포레스텔라', totalCards = 758, totalChecked = 0, percent = 0 }) {
    const width = 1200;
    const height = 675;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Ambient Glows
    ctx.save();
    const glow1 = ctx.createRadialGradient(250, 150, 10, 250, 150, 400);
    glow1.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    glow1.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(950, 500, 10, 950, 500, 450);
    glow2.addColorStop(0, 'rgba(236, 72, 153, 0.2)');
    glow2.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Main Card Body
    const cardX = 70;
    const cardY = 50;
    const cardW = width - 140;
    const cardH = height - 100;
    const cardRadius = 24;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, cardRadius);
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.stroke();

    // 3. App Badge
    const badgeX = cardX + 50;
    const badgeY = cardY + 45;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, 240, 40, 20);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, badgeX, badgeY, 240, 40, 20);
    }
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ 포카 체커 (Phoca Checker)', badgeX + 120, badgeY + 20);

    // Title
    ctx.textAlign = 'left';
    ctx.font = '800 42px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🌲 ${categoryName} 포토카드 컬렉션`, badgeX, badgeY + 95);

    ctx.font = '500 21px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('공식 앨범 • 시그 • 키트 • 콘서트/MD • 특전 (39종 수록)', badgeX, badgeY + 135);

    // 4. Progress Stats
    const statsY = badgeY + 220;
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('수집 진행률', badgeX, statsY);

    ctx.textAlign = 'right';
    ctx.font = '800 52px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    const numGrad = ctx.createLinearGradient(cardX + cardW - 450, statsY, cardX + cardW - 50, statsY);
    numGrad.addColorStop(0, '#38bdf8');
    numGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = numGrad;
    ctx.fillText(`${totalChecked} / ${totalCards} 장 (${percent}%)`, cardX + cardW - 50, statsY);

    // 5. Glowing Progress Bar
    const barX = badgeX;
    const barY = statsY + 32;
    const barW = cardW - 100;
    const barH = 28;
    const barRadius = 14;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(barX, barY, barW, barH, barRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, barX, barY, barW, barH, barRadius);
    }
    ctx.fillStyle = '#0b0f19';
    ctx.fill();

    if (percent > 0) {
      const fillW = Math.max(barRadius * 2, Math.round((barW * percent) / 100));
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(barX, barY, fillW, barH, barRadius);
      } else {
        CanvasExporter.drawRoundRectPath(ctx, barX, barY, fillW, barH, barRadius);
      }
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
      fillGrad.addColorStop(0, '#06b6d4');
      fillGrad.addColorStop(0.5, '#6366f1');
      fillGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = fillGrad;
      ctx.fill();
    }

    // 6. Footer inside card
    const footY = cardY + cardH - 45;
    ctx.textAlign = 'left';
    ctx.font = '600 19px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('🔗 https://foretissimo.github.io/phoca_checker/', badgeX, footY);

    ctx.textAlign = 'right';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.fillText('#포레포카체커', cardX + cardW - 50, footY);

    ctx.restore();
    return canvas;
  }

  static downloadCanvas(canvas, filename) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2500);
        resolve(true);
      }, 'image/png');
    });
  }

  static drawRoundRectPath(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}

if (typeof window !== 'undefined') {
  window.CanvasExporter = CanvasExporter;
}
