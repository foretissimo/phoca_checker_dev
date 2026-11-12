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
    stampStyle = 'stamp',
    customStampSrc = null,
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

    // Preload complete marker (stamp / custom image) only in hide-owned mode
    const marker = displayMode === 'hide-owned'
      ? await CanvasExporter.loadCompleteMarker(stampStyle, customStampSrc)
      : null;

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

        // Draw stamp / custom image / check icon on masked cards
        if (showCheckIcon) {
          if (marker) {
            CanvasExporter.drawCompleteMarker(ctx, marker, x, y, w, h);
          } else {
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
        }

        ctx.restore();
      }
    });

    // 2.5 Draw Top-Left Mode Pill Badge ('미보유' / '보유' / '완성')
    ctx.save();
    const modeTag = CanvasExporter.getModeTag(displayMode, cards, checkedCardIds);
    const modeTagText = modeTag.text;
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
    ctx.strokeStyle = modeTag.color;
    ctx.stroke();

    ctx.fillStyle = modeTag.color;
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

    // Right: Attribution Credits (matched with merged poster footer)
    const creditText = naturalWidth >= 1000
      ? '도안 출처: @sy_fore (x.com/sy_fore) • 제작: @live_in_fore (x.com/live_in_fore)'
      : '도안: @sy_fore • 제작: @live_in_fore';
    const textWidth = ctx.measureText(creditText).width;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(creditText, naturalWidth * 0.975 - textWidth, bannerY + bannerHeight * 0.60);

    ctx.restore();

    // 4. Download file
    return CanvasExporter.downloadCanvas(canvas, filename);
  }

  /**
   * Export templates in category merged into a multi-column master poster
   * Supports 'all', 'owned' (completed only), 'unowned' (with missing cards)
   */
  static async exportCategoryMergedPng({
    templates,
    allCategoryTemplates = [],
    getCheckedSetFn,
    categoryName = '포레스텔라',
    displayMode = 'hide-owned',
    filterType = 'all', // 'all' | 'owned' | 'unowned'
    stampStyle = 'stamp', // 'check' | 'stamp' | 'custom'
    customStampSrc = null,
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

    onProgress(templates.length, templates.length, '고화질 합본 포스터 합성 중...');

    // Preload complete marker (stamp / custom image) only in hide-owned mode
    const marker = displayMode === 'hide-owned'
      ? await CanvasExporter.loadCompleteMarker(stampStyle, customStampSrc)
      : null;

    // Layout configuration: dynamic columns (1 to 4 depending on count)
    const cols = Math.min(4, Math.max(1, loadedItems.length));
    const rows = Math.ceil(loadedItems.length / cols);
    const cellWidth = 900;
    
    // Adaptive spacing & header dimensions based on column count
    let cardSpacing = 40;
    let headerHeight = 220;
    let footerHeight = 120;
    let cellHeaderHeight = 50;

    if (cols === 1) {
      cardSpacing = 28;
      headerHeight = 150;
      footerHeight = 85;
      cellHeaderHeight = 44;
    } else if (cols === 2) {
      cardSpacing = 32;
      headerHeight = 180;
      footerHeight = 95;
      cellHeaderHeight = 46;
    } else if (cols === 3) {
      cardSpacing = 36;
      headerHeight = 200;
      footerHeight = 110;
      cellHeaderHeight = 48;
    }

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

    // Calculate total collection stats (always across all templates in category)
    const statSourceTemplates = (allCategoryTemplates && allCategoryTemplates.length > 0) ? allCategoryTemplates : loadedItems.map(item => item.template);
    let totalCardsAll = 0;
    let totalOwnedAll = 0;
    statSourceTemplates.forEach(t => {
      totalCardsAll += (t.cards?.length || 0);
      const checkedSet = getCheckedSetFn(t.id);
      totalOwnedAll += checkedSet.size;
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
    ctx.fillRect(0, 0, posterWidth, Math.max(5, Math.round(headerHeight * 0.035)));

    // Filter-specific title (compact & clean)
    let headerTitle = `✨ ${categoryName} 포토카드 전체 합본 (${loadedItems.length}종)`;
    let filterFilenameLabel = `전체${loadedItems.length}종`;
    if (filterType === 'owned') {
      headerTitle = `✨ ${categoryName} 포토카드 올클리어 합본 (${loadedItems.length}종)`;
      filterFilenameLabel = `전체보유${loadedItems.length}종`;
    } else if (filterType === 'unowned') {
      headerTitle = `✨ ${categoryName} 포토카드 미보유 위시 합본 (${loadedItems.length}종)`;
      filterFilenameLabel = `미보유${loadedItems.length}종`;
    }

    // Adaptive font sizes & badge sizing
    const modeTagText = displayMode === 'hide-owned' ? '미보유' : '보유';
    const headerTagFontSize = cols === 1 ? 17 : (cols === 2 ? 21 : 25);
    ctx.font = `bold ${headerTagFontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
    
    const headerTagPaddingX = cols === 1 ? 14 : 18;
    const headerTagPaddingY = cols === 1 ? 6 : 8;
    const headerTagMetrics = ctx.measureText(modeTagText);
    const headerTagWidth = headerTagMetrics.width + headerTagPaddingX * 2;
    const headerTagHeight = headerTagFontSize + headerTagPaddingY * 2;
    const headerTagX = cardSpacing * 1.25;
    const headerTagY = cols === 1 ? 34 : (cols === 2 ? 42 : 50);
    const headerTagRadius = Math.round(headerTagHeight / 2);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(headerTagX, headerTagY, headerTagWidth, headerTagHeight, headerTagRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, headerTagX, headerTagY, headerTagWidth, headerTagHeight, headerTagRadius);
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = displayMode === 'hide-owned' ? '#38bdf8' : '#34d399';
    ctx.stroke();

    ctx.fillStyle = displayMode === 'hide-owned' ? '#38bdf8' : '#34d399';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeTagText, headerTagX + headerTagWidth / 2, headerTagY + headerTagHeight / 2 + 1);

    // Title text vertically centered with mode badge
    const badgeCenterY = headerTagY + headerTagHeight / 2;
    const titleStartX = headerTagX + headerTagWidth + (cols === 1 ? 14 : 20);

    // Dynamic title font size calculation to guarantee NO CLIPPING
    let titleFontSize = cols === 1 ? 24 : (cols === 2 ? 32 : 40);
    let maxTitleWidth = posterWidth - titleStartX - cardSpacing * 1.25;
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
    
    while (ctx.measureText(headerTitle).width > maxTitleWidth && titleFontSize > 15) {
      titleFontSize -= 1;
      ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(headerTitle, titleStartX, badgeCenterY);

    // Subtitle statistics
    const subFontSize = cols === 1 ? 14 : (cols === 2 ? 18 : 22);
    ctx.font = `500 ${subFontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.textBaseline = 'middle';
    const subY = headerTagY + headerTagHeight + (cols === 1 ? 24 : 32);
    const modeDesc = displayMode === 'hide-owned' ? '보유 가림 (미보유 위시 강조)' : '미보유 가림 (보유 컬렉션 강조)';
    ctx.fillText(`수집 현황: ${totalOwnedAll} / ${totalCardsAll} 장 (${totalPercent}%)  •  선택된 도안: ${loadedItems.length}종  •  ${modeDesc}`, headerTagX, subY);

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
          ctx.roundRect(cellX, cellY, cellWidth, cellHeaderHeight, [10, 10, 0, 0]);
        } else {
          ctx.rect(cellX, cellY, cellWidth, cellHeaderHeight);
        }
        ctx.fill();

        const tOwned = checkedSet.size;
        const tTotal = t.cards?.length || 0;
        const isDone = tTotal > 0 && tOwned === tTotal;

        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`${t.title}`, cellX + 18, cellY + 32);

        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillStyle = isDone ? '#34d399' : (tOwned > 0 ? '#a5b4fc' : '#64748b');
        const badgeTxt = isDone ? `완료 ${tOwned}/${tTotal} ✓` : `${tOwned}/${tTotal}장`;
        const badgeW = ctx.measureText(badgeTxt).width;
        ctx.fillText(badgeTxt, cellX + cellWidth - 18 - badgeW, cellY + 32);
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

              // Draw stamp / custom image / check icon inside masked card
              if (marker) {
                CanvasExporter.drawCompleteMarker(ctx, marker, cx, cy, cw, ch);
              } else {
                const iconSize = Math.min(cw * 0.28, ch * 0.28, 38);
                const iconX = cx + (cw - iconSize) / 2;
                const iconY = cy + (ch - iconSize) / 2;

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
        }
      }

      currentY += cellHeaderHeight + rowHeight + cardSpacing;
    }

    // 3. Draw Poster Footer
    ctx.save();
    ctx.fillStyle = '#141724';
    ctx.fillRect(0, totalHeight - footerHeight, posterWidth, footerHeight);

    let footerFontSize = cols === 1 ? 13 : (cols === 2 ? 16 : 20);
    ctx.font = `500 ${footerFontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.textBaseline = 'middle';

    const footerTxt = cols === 1
      ? `포카 체커 • 도안: @sy_fore • 제작: @live_in_fore • ${new Date().toLocaleDateString('ko-KR')}`
      : `포카 체커 (Phoca Checker) • 도안 출처: @sy_fore (x.com/sy_fore) • 제작: @live_in_fore (x.com/live_in_fore) • 생성일시: ${new Date().toLocaleDateString('ko-KR')}`;
    
    while (ctx.measureText(footerTxt).width > (posterWidth - cardSpacing * 2.5) && footerFontSize > 10) {
      footerFontSize -= 1;
      ctx.font = `500 ${footerFontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
    }

    ctx.fillText(footerTxt, cardSpacing * 1.25, totalHeight - footerHeight / 2);
    ctx.restore();

    // 4. Trigger Master Poster Download
    const filename = `포카체커_${categoryName}_${filterFilenameLabel}_합본_${displayMode === 'hide-owned' ? '위시리스트' : '보유본'}.png`;
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
    const modeTag = CanvasExporter.getModeTag(displayMode, cards, checkedCardIds);
    const modeTagText = modeTag.text;

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
    ctx.strokeStyle = modeTag.color;
    ctx.stroke();
    ctx.fillStyle = modeTag.color;
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

    const creditText = naturalWidth >= 1000
      ? '도안 출처: @sy_fore (x.com/sy_fore) • 제작: @live_in_fore (x.com/live_in_fore)'
      : '도안: @sy_fore • 제작: @live_in_fore';
    const textWidth = ctx.measureText(creditText).width;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(creditText, naturalWidth * 0.975 - textWidth, bannerY + bannerHeight * 0.60);
    ctx.restore();

    return canvas;
  }

  /**
   * Render stylish collection summary card canvas for Twitter / Social sharing (900x560)
   * Displays Nickname, Overall Progress, and Favorite Photocard Thumbnails
   */
  static async renderSummaryCardCanvas({
    categoryName = '포레스텔라',
    subtitle = 'Forestella Photocard Collection',
    badge = '39종',
    totalCards = 758,
    totalChecked = 0,
    percent = 0,
    logoSrc = 'images/fore/forestella_logo.jpg',
    nickname = '',
    favoriteCards = [] // [{ name, templateTitle, imageSrc, x, y, w, h, radius }]
  }) {
    const width = 900;
    const height = 560;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Preload logo image
    let logoImg = null;
    if (logoSrc) {
      logoImg = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = logoSrc;
      });
    }

    // Preload template images for favorite cards in parallel
    const favoriteThumbs = [];
    const maxFavs = Math.min(favoriteCards.length, 6); // Up to 6 favorite cards
    for (let i = 0; i < maxFavs; i++) {
      const fav = favoriteCards[i];
      if (!fav.imageSrc) continue;
      const tImg = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = fav.imageSrc;
      });
      if (tImg) {
        favoriteThumbs.push({ fav, img: tImg });
      }
    }

    // 1. Outer Background (Deep space dark)
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(0, 0, width, height);

    // Subtle ambient glow (Purple/Blue & Rose gradient)
    const glow1 = ctx.createRadialGradient(180, 160, 20, 180, 160, 360);
    glow1.addColorStop(0, 'rgba(99, 102, 241, 0.16)');
    glow1.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width - 180, height - 160, 20, width - 180, height - 160, 360);
    glow2.addColorStop(0, 'rgba(244, 63, 94, 0.12)');
    glow2.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // 2. Main Card Container
    const cardX = 36;
    const cardY = 28;
    const cardW = width - 72; // 828
    const cardH = height - 56; // 504
    const cardRadius = 22;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, cardRadius);
    }
    ctx.fillStyle = '#141724';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // 3. Top Header: Logo + Title + Nickname
    const padX = cardX + 32;
    const padY = cardY + 28;

    // Logo (56x56)
    const logoSize = 56;
    const logoRadius = 14;
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(padX, padY, logoSize, logoSize, logoRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, padX, padY, logoSize, logoSize, logoRadius);
    }
    ctx.fillStyle = '#f7eee4';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();
    ctx.clip();

    if (logoImg) {
      ctx.drawImage(logoImg, padX, padY, logoSize, logoSize);
    } else {
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨', padX + logoSize / 2, padY + logoSize / 2);
    }
    ctx.restore();

    // Title / Nickname on the right of Logo
    const headerTextX = padX + logoSize + 16;
    const userTitle = nickname && nickname.trim()
      ? `${nickname.trim()}님의 포토카드 컬렉션`
      : `${categoryName} 포토카드 컬렉션`;

    ctx.textAlign = 'left';
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(userTitle, headerTextX, padY + 24);

    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`포카체커 • ${subtitle} (${badge})`, headerTextX, padY + 48);

    // Top-Right Badge: Percent
    const percentBadgeText = `${percent}% 수집`;
    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    const pBadgeW = ctx.measureText(percentBadgeText).width + 22;
    const pBadgeH = 30;
    const pBadgeX = cardX + cardW - 32 - pBadgeW;
    const pBadgeY = padY + 13;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pBadgeX, pBadgeY, pBadgeW, pBadgeH, 15);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, pBadgeX, pBadgeY, pBadgeW, pBadgeH, 15);
    }
    ctx.fillStyle = 'rgba(99, 102, 241, 0.18)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.4)';
    ctx.stroke();
    ctx.fillStyle = '#a5b4fc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(percentBadgeText, pBadgeX + pBadgeW / 2, pBadgeY + pBadgeH / 2);
    ctx.restore();

    // 4. Progress Bar Section
    const progY = padY + logoSize + 22;
    ctx.textAlign = 'left';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('수집 현황', padX, progY);

    ctx.textAlign = 'right';
    ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${totalChecked} / ${totalCards} 장 (${percent}%)`, cardX + cardW - 32, progY);

    // Track
    const barX = padX;
    const barY = progY + 10;
    const barW = cardW - 64;
    const barH = 10;
    const barRadius = 5;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(barX, barY, barW, barH, barRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, barX, barY, barW, barH, barRadius);
    }
    ctx.fillStyle = '#0a0d16';
    ctx.fill();

    // Fill
    if (percent > 0) {
      const fillW = Math.max(barRadius * 2, Math.round((barW * percent) / 100));
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(barX, barY, fillW, barH, barRadius);
      } else {
        CanvasExporter.drawRoundRectPath(ctx, barX, barY, fillW, barH, barRadius);
      }
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
      fillGrad.addColorStop(0, '#38bdf8');
      fillGrad.addColorStop(0.5, '#6366f1');
      fillGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = fillGrad;
      ctx.fill();
    }

    // 5. Favorite Photocards Section
    const favSectionY = barY + barH + 24;
    ctx.textAlign = 'left';
    ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`♥ 내가 좋아하는 최애 포카 (${favoriteCards.length}장)`, padX, favSectionY);

    // Favorite Thumbnails Grid Area
    const gridY = favSectionY + 12;
    const gridH = 220;
    const gridW = cardW - 64;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(padX, gridY, gridW, gridH, 14);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, padX, gridY, gridW, gridH, 14);
    }
    ctx.fillStyle = 'rgba(10, 13, 22, 0.7)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.stroke();

    if (favoriteThumbs.length === 0) {
      // Empty state
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '28px sans-serif';
      ctx.fillText('💖', padX + gridW / 2, gridY + gridH / 2 - 18);
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('체크리스트에서 마음에 드는 포카의 하트(♥)를 눌러 최애 포카로 등록해보세요!', padX + gridW / 2, gridY + gridH / 2 + 18);
    } else {
      // Draw 1 to 6 cards in a neat row
      const count = favoriteThumbs.length;
      const thumbGap = 16;
      // Fixed aspect ratio ~ 1:1.55 (standard photocard)
      const maxThumbH = 160;
      const targetThumbW = 104;
      const totalThumbsW = count * targetThumbW + (count - 1) * thumbGap;
      let startThumbX = padX + Math.max(16, (gridW - totalThumbsW) / 2);
      const thumbY = gridY + 18;

      favoriteThumbs.forEach(({ fav, img }) => {
        // Source crop coordinates from template image
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const sx = (fav.x / 100) * imgW;
        const sy = (fav.y / 100) * imgH;
        const sw = (fav.w / 100) * imgW;
        const sh = (fav.h / 100) * imgH;

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(startThumbX, thumbY, targetThumbW, maxThumbH, 10);
        } else {
          CanvasExporter.drawRoundRectPath(ctx, startThumbX, thumbY, targetThumbW, maxThumbH, 10);
        }
        ctx.clip();

        // Draw cropped photocard image
        ctx.drawImage(img, sx, sy, sw, sh, startThumbX, thumbY, targetThumbW, maxThumbH);

        // Photocard border outline & shadow
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(startThumbX, thumbY, targetThumbW, maxThumbH, 10);
        } else {
          CanvasExporter.drawRoundRectPath(ctx, startThumbX, thumbY, targetThumbW, maxThumbH, 10);
        }
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
        ctx.stroke();

        // Heart badge on top right of thumbnail
        ctx.beginPath();
        ctx.arc(startThumbX + targetThumbW - 12, thumbY + 12, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.95)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♥', startThumbX + targetThumbW - 12, thumbY + 13);
        ctx.restore();

        // Card Label below thumbnail
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillStyle = '#f1f5f9';
        const cardTitle = fav.name || '포토카드';
        ctx.fillText(cardTitle.length > 8 ? cardTitle.substring(0, 7) + '…' : cardTitle, startThumbX + targetThumbW / 2, thumbY + maxThumbH + 16);

        ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillStyle = '#64748b';
        const boardTitle = (fav.templateTitle || '').replace(/^fore\d+\.\s*/, '');
        ctx.fillText(boardTitle.length > 8 ? boardTitle.substring(0, 7) + '…' : boardTitle, startThumbX + targetThumbW / 2, thumbY + maxThumbH + 29);
        ctx.restore();

        startThumbX += targetThumbW + thumbGap;
      });
    }
    ctx.restore();

    // 6. Card Footer URL & Hashtag
    const footY = cardY + cardH - 18;
    ctx.textAlign = 'left';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('✨ 포카 체커 • https://foretissimo.github.io/phoca_checker/', padX, footY);

    ctx.textAlign = 'right';
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.fillText('#포레포카체커', cardX + cardW - 32, footY);

    ctx.restore();
    return canvas;
  }

  static async copyCanvasToClipboard(canvas) {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } catch (err) {
          console.warn('Clipboard write failed:', err);
          resolve(false);
        }
      }, 'image/png');
    });
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

  /**
   * Top-left mode label. In hide-owned (미보유) mode, a fully-owned board shows '완성'.
   */
  static getModeTag(displayMode, cards = [], checkedSet = new Set()) {
    const isComplete = displayMode === 'hide-owned'
      && cards.length > 0
      && cards.every(c => checkedSet.has(c.id));
    if (isComplete) return { text: '완성', color: '#fbbf24' };
    return displayMode === 'hide-owned'
      ? { text: '미보유', color: '#38bdf8' }
      : { text: '보유', color: '#34d399' };
  }

  /**
   * Load completion marker image. Returns null for 'check' style (fallback to check icon).
   */
  static async loadCompleteMarker(stampStyle = 'stamp', customStampSrc = null) {
    let src = null;
    let type = null;
    if (stampStyle === 'custom' && customStampSrc) {
      src = customStampSrc;
      type = 'custom';
    } else if (stampStyle === 'stamp') {
      src = 'images/stamp_complete.png';
      type = 'stamp';
    }
    if (!src) return null;

    const img = new Image();
    const ok = await new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
    return (ok && img.naturalWidth > 0) ? { type, img } : null;
  }

  /**
   * Draw completion marker centered in card rect (stamp or circular custom image)
   */
  static drawCompleteMarker(ctx, marker, x, y, w, h) {
    const img = marker.img;
    if (marker.type === 'custom') {
      const size = Math.min(w, h) * 0.64;
      const r = size / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;

      // Soft shadow base
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.max(4, size * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      // Circular cover-fit image
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const s = Math.min(iw, ih);
      ctx.drawImage(img, (iw - s) / 2, (ih - s) / 2, s, s, cx - r, cy - r, size, size);
      ctx.restore();

      // White ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, size * 0.045);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.stroke();
      ctx.restore();
    } else {
      const stampSize = Math.min(w * 0.72, h * 0.72);
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-3 * Math.PI / 180);
      ctx.drawImage(img, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
      ctx.restore();
    }
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
