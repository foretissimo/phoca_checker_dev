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
   * Export Merged Poster composed of ONLY favorite photocards (up to 10 cards)
   */
  static async exportFavoriteMergedPoster({
    favoriteCards = [],
    nickname = '',
    categoryName = '포레스텔라',
    onProgress = () => {}
  }) {
    if (!favoriteCards || favoriteCards.length === 0) return false;

    // Limit to max 10 cards
    const cardsToExport = favoriteCards.slice(0, 10);
    const count = cardsToExport.length;

    // Preload all template images
    const imgCache = new Map();
    for (let i = 0; i < cardsToExport.length; i++) {
      const fav = cardsToExport[i];
      if (onProgress) {
        onProgress(i + 1, cardsToExport.length, `최애 포카 이미지 불러오는 중 (${i + 1}/${cardsToExport.length})...`);
      }
      if (!imgCache.has(fav.imageSrc)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = fav.imageSrc;
        });
        imgCache.set(fav.imageSrc, img);
      }
    }

    if (onProgress) {
      onProgress(count, count, '고화질 최애포카 합본 포스터 합성 중...');
    }

    // Grid configuration:
    // 1~5 cards: 1 row with 'count' columns
    // 6 cards: 3 columns x 2 rows
    // 7~8 cards: 4 columns x 2 rows
    // 9~10 cards: 5 columns x 2 rows
    let cols = 5;
    let rows = 1;
    if (count <= 5) {
      cols = count;
      rows = 1;
    } else if (count === 6) {
      cols = 3;
      rows = 2;
    } else if (count <= 8) {
      cols = 4;
      rows = 2;
    } else {
      cols = 5;
      rows = 2;
    }

    const cardW = 240;
    const cardH = 356;
    const cardRadius = 14;
    const labelH = 54;
    const cellW = cardW;
    const cellH = cardH + labelH;

    const gapX = 30;
    const gapY = 36;
    const padX = 54;
    const headerH = 170;
    const footerH = 80;

    const posterWidth = Math.max(900, padX * 2 + cols * cellW + (cols - 1) * gapX);
    const contentH = rows * cellH + (rows - 1) * gapY;
    const posterHeight = headerH + contentH + footerH;

    const canvas = document.createElement('canvas');
    canvas.width = posterWidth;
    canvas.height = posterHeight;
    const ctx = canvas.getContext('2d');

    // 1. Background (Dark elegant gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, posterHeight);
    bgGrad.addColorStop(0, '#090b14');
    bgGrad.addColorStop(0.5, '#101424');
    bgGrad.addColorStop(1, '#090a12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, posterWidth, posterHeight);

    // Ambient radial glow from top-center
    const radialGlow = ctx.createRadialGradient(posterWidth / 2, headerH / 2, 10, posterWidth / 2, headerH / 2, posterWidth * 0.6);
    radialGlow.addColorStop(0, 'rgba(239, 68, 68, 0.16)');
    radialGlow.addColorStop(0.4, 'rgba(99, 102, 241, 0.12)');
    radialGlow.addColorStop(1, 'rgba(9, 11, 20, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, posterWidth, posterHeight);

    // Decorative outer card border
    ctx.save();
    ctx.beginPath();
    const outerMargin = 16;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(outerMargin, outerMargin, posterWidth - outerMargin * 2, posterHeight - outerMargin * 2, 20);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, outerMargin, outerMargin, posterWidth - outerMargin * 2, posterHeight - outerMargin * 2, 20);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 2. Header
    ctx.save();
    ctx.textAlign = 'center';

    // Pill Badge
    const badgeW = 240;
    const badgeH = 26;
    const badgeX = (posterWidth - badgeW) / 2;
    const badgeY = 38;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 13);
    }
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#fda4af';
    ctx.fillText(`💖 MY FAVORITE PHOTOCARDS • TOP ${count}`, posterWidth / 2, badgeY + 17);

    // Title
    ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#ffffff';
    const titleText = nickname && nickname.trim()
      ? `${nickname.trim()}님의 ${categoryName} 최애 포토카드`
      : `${categoryName} 최애 포토카드 컬렉션`;
    ctx.fillText(titleText, posterWidth / 2, 102);

    // Subtitle
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Phoca Checker • 총 ${count}장 수록 (최대 10선) • ${categoryName}`, posterWidth / 2, 130);
    ctx.restore();

    // 3. Grid of Favorite Photocards (Centered per row)
    const rowCards = [];
    if (rows === 1) {
      rowCards.push(cardsToExport);
    } else {
      const topCount = Math.ceil(count / 2);
      rowCards.push(cardsToExport.slice(0, topCount));
      rowCards.push(cardsToExport.slice(topCount));
    }

    let globalCardIndex = 0;
    for (let r = 0; r < rowCards.length; r++) {
      const cardsInThisRow = rowCards[r];
      const rowWidth = cardsInThisRow.length * cellW + (cardsInThisRow.length - 1) * gapX;
      const startX = (posterWidth - rowWidth) / 2;
      const startY = headerH + r * (cellH + gapY);

      for (let c = 0; c < cardsInThisRow.length; c++) {
        const fav = cardsInThisRow[c];
        const cardX = startX + c * (cellW + gapX);
        const cardY = startY;

        const img = imgCache.get(fav.imageSrc);
        if (img) {
          const imgW = img.naturalWidth || img.width;
          const imgH = img.naturalHeight || img.height;
          const sx = (fav.x / 100) * imgW;
          const sy = (fav.y / 100) * imgH;
          const sw = Math.max(1, (fav.w / 100) * imgW);
          const sh = Math.max(1, (fav.h / 100) * imgH);
          const cardRatio = sw / sh;
          const cellRatio = cellW / cellH;

          // Adaptively fit photocard without stretching (horizontal or vertical)
          let drawW, drawH;
          if (cardRatio > cellRatio) {
            // Horizontal (wider than cell)
            drawW = cellW;
            drawH = Math.round(cellW / cardRatio);
          } else {
            // Vertical (taller than cell)
            drawH = cellH;
            drawW = Math.round(cellH * cardRatio);
          }

          const drawX = Math.round(cardX + (cellW - drawW) / 2);
          const drawY = Math.round(cardY + (cellH - drawH) / 2);
          const dynamicRadius = Math.min(14, Math.round(drawH * 0.08));

          // Shadow under card
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 8;
          ctx.fillStyle = '#171926';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(drawX, drawY, drawW, drawH, dynamicRadius);
          } else {
            CanvasExporter.drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, dynamicRadius);
          }
          ctx.fill();
          ctx.restore();

          // Card image
          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(drawX, drawY, drawW, drawH, dynamicRadius);
          } else {
            CanvasExporter.drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, dynamicRadius);
          }
          ctx.clip();
          ctx.drawImage(img, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
          ctx.restore();

          // Card border
          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(drawX, drawY, drawW, drawH, dynamicRadius);
          } else {
            CanvasExporter.drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, dynamicRadius);
          }
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#ef4444';
          ctx.stroke();

          // Red Heart Badge (Top-Right)
          const heartBadgeR = 12;
          const bX = drawX + drawW - 14;
          const bY = drawY + 14;
          ctx.beginPath();
          ctx.arc(bX, bY, heartBadgeR, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`♥${globalCardIndex + 1}`, bX, bY + 1);
          ctx.restore();

          // Card Labels
          ctx.save();
          ctx.textAlign = 'center';
          ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
          ctx.fillStyle = '#f1f5f9';
          let nameTxt = fav.name || '최애 포카';
          if (nameTxt.length > 15) nameTxt = nameTxt.substring(0, 14) + '…';
          ctx.fillText(nameTxt, cardX + cardW / 2, cardY + cardH + 18);

          ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
          ctx.fillStyle = '#64748b';
          let sheetTxt = (fav.templateTitle || '').replace(/^fore\d+\.\s*/, '');
          if (sheetTxt.length > 16) sheetTxt = sheetTxt.substring(0, 15) + '…';
          ctx.fillText(sheetTxt, cardX + cardW / 2, cardY + cardH + 34);
          ctx.restore();
        }

        globalCardIndex++;
      }
    }

    // 4. Poster Footer
    const footY = posterHeight - footerH / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(outerMargin, posterHeight - footerH, posterWidth - outerMargin * 2, footerH - outerMargin);

    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ 포카 체커 • 도안: @sy_fore • 제작: @live_in_fore • foretissimo.github.io', padX, footY);

    ctx.textAlign = 'right';
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#818cf8';
    ctx.fillText('#포레스텔라 #포레포카체커 #최애포카', posterWidth - padX, footY);
    ctx.restore();

    // 5. Download Master Poster
    const nickPart = nickname && nickname.trim() ? `_${nickname.trim()}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `포카체커_최애포카_합본포스터${nickPart}_${dateStr}.png`;
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

  static async renderSummaryCardCanvas(options) {
    return this.generateCollectionSummaryCard(options);
  }

  static async generateCollectionSummaryCard({
    categoryName = '포레스텔라',
    subtitle = 'Forestella Photocard Collection',
    badge = '44종',
    totalCards = 770,
    totalChecked = 0,
    percent = 0,
    logoSrc = 'images/fore/forestella_logo.jpg',
    nickname = '',
    featuredFavorite = null, // Single selected favorite photocard: { name, templateTitle, imageSrc, x, y, w, h }
    favoriteCards = []
  }) {
    // Requirement 1: Compact size under 400 (380x230)
    const width = 380;
    const height = 230;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Preload featured favorite photocard image (or fallback logo)
    let featuredImg = null;
    let favToDraw = featuredFavorite || (favoriteCards && favoriteCards.length > 0 ? favoriteCards[0] : null);

    if (favToDraw && favToDraw.imageSrc) {
      featuredImg = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = favToDraw.imageSrc;
      });
    }

    let fallbackLogoImg = null;
    if (!featuredImg && logoSrc) {
      fallbackLogoImg = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = logoSrc;
      });
    }

    // 1. Background (Forest Green & Dark Navy subtle gradient - 대비가 적고 차분한 그라데이션)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a1a15'); // 짙은 숲 그린
    bgGrad.addColorStop(0.5, '#09141e'); // 중간 블렌드
    bgGrad.addColorStop(1, '#091024'); // 짙은 남색
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ambient radial glow (약한 그린 & 남색 앰비언트 글로우)
    const greenGlow = ctx.createRadialGradient(80, 80, 10, 80, 80, 200);
    greenGlow.addColorStop(0, 'rgba(16, 185, 129, 0.10)'); // soft emerald/forest green
    greenGlow.addColorStop(1, 'rgba(10, 26, 21, 0)');
    ctx.fillStyle = greenGlow;
    ctx.fillRect(0, 0, width, height);

    const navyGlow = ctx.createRadialGradient(width - 60, height - 60, 10, width - 60, height - 60, 220);
    navyGlow.addColorStop(0, 'rgba(59, 130, 246, 0.08)'); // soft navy
    navyGlow.addColorStop(1, 'rgba(9, 16, 36, 0)');
    ctx.fillStyle = navyGlow;
    ctx.fillRect(0, 0, width, height);

    // 2. Card Container (그린 & 짙은남색 은은한 저대비 그라데이션)
    const cardX = 12;
    const cardY = 12;
    const cardW = width - 24; // 356
    const cardH = height - 24; // 206
    const cardRadius = 16;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, cardRadius);
    }
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cardGrad.addColorStop(0, '#0d221b'); // 은은한 짙은 그린
    cardGrad.addColorStop(0.5, '#0e1a24'); // 차분한 중간 톤
    cardGrad.addColorStop(1, '#0c162a'); // 은은한 짙은 남색
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.stroke();

    // 3. Featured Favorite Photocard (로고 대신 최애포카 1장이 들어감)
    // 세로(Portrait) 또는 가로(Landscape) 포카 모두 자연스럽게 어울리도록 반응형 비율 배치
    const colCenterX = 70; // Left showcase column center
    const maxPhotoW = 96;
    const maxPhotoH = 122;

    if (featuredImg && favToDraw) {
      // Crop photocard from template
      const imgW = featuredImg.naturalWidth || featuredImg.width;
      const imgH = featuredImg.naturalHeight || featuredImg.height;
      const sx = (favToDraw.x / 100) * imgW;
      const sy = (favToDraw.y / 100) * imgH;
      const sw = Math.max(1, (favToDraw.w / 100) * imgW);
      const sh = Math.max(1, (favToDraw.h / 100) * imgH);
      const cardAspect = sw / sh;

      // Fit maintaining exact aspect ratio (세로/가로 왜곡 없음)
      const boxRatio = maxPhotoW / maxPhotoH; // ~0.787
      let drawW, drawH;
      if (cardAspect > boxRatio) {
        // Horizontal (Landscape) or square
        drawW = maxPhotoW;
        drawH = Math.round(maxPhotoW / cardAspect);
      } else {
        // Vertical (Portrait)
        drawH = maxPhotoH;
        drawW = Math.round(maxPhotoH * cardAspect);
      }

      // Center the photocard + labels group vertically in the left showcase area [24px ~ 184px]
      const leftColCenterY = 104;
      const labelGap = 10;
      const labelTotalH = 26; // 2 lines of labels
      const totalGroupH = drawH + labelGap + labelTotalH;

      const drawX = Math.round(colCenterX - drawW / 2);
      const drawY = Math.round(leftColCenterY - totalGroupH / 2);
      const photoRadius = Math.min(10, Math.round(drawH * 0.09));

      // Realistic Card Drop Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#0f1715';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(drawX, drawY, drawW, drawH, photoRadius);
      } else {
        CanvasExporter.drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, photoRadius);
      }
      ctx.fill();
      ctx.restore();

      // Photocard image (clipped)
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(drawX, drawY, drawW, drawH, photoRadius);
      } else {
        CanvasExporter.drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, photoRadius);
      }
      ctx.clip();
      ctx.drawImage(featuredImg, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Delicate subtle border (빨간 테두리 제거 -> 은은한 반투명 라인)
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(drawX, drawY, drawW, drawH, photoRadius);
      } else {
        CanvasExporter.drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, photoRadius);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.stroke();
      ctx.restore();

      // Photocard Name under the card
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
      ctx.fillStyle = '#f1f5f9';
      let cardLabel = favToDraw.name || '최애 포카';
      if (cardLabel.length > 10) cardLabel = cardLabel.substring(0, 9) + '…';
      ctx.fillText(cardLabel, colCenterX, drawY + drawH + 13);

      ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
      ctx.fillStyle = '#64748b';
      let sheetLabel = (favToDraw.templateTitle || '').replace(/^fore\d+\.\s*/, '');
      if (sheetLabel.length > 11) sheetLabel = sheetLabel.substring(0, 10) + '…';
      ctx.fillText(sheetLabel, colCenterX, drawY + drawH + 25);
      ctx.restore();
    } else {
      // Fallback placeholder / Logo
      const logoW = 80;
      const logoH = 80;
      const logoX = Math.round(colCenterX - logoW / 2);
      const logoY = 46;
      const logoRadius = 10;

      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(logoX, logoY, logoW, logoH, logoRadius);
      } else {
        CanvasExporter.drawRoundRectPath(ctx, logoX, logoY, logoW, logoH, logoRadius);
      }
      ctx.fillStyle = '#171b2b';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();
      ctx.setLineDash([]);

      if (fallbackLogoImg) {
        ctx.clip();
        ctx.drawImage(fallbackLogoImg, logoX, logoY, logoW, logoH);
      } else {
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💖', colCenterX, logoY + logoH / 2 - 10);
        ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('최애포카', colCenterX, logoY + logoH / 2 + 14);
      }
      ctx.restore();
    }

    // 4. Right Area: Title & Nickname & Progress
    const rightX = 132;
    const rightW = cardX + cardW - 14 - rightX; // 222px

    // Top Brand Line: '포레스텔라' 문구 유지
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText('포레스텔라', rightX, 44);

    // Main Title Line: 닉네임 입력 시 '닉네임님의 포토카드 컬렉션', 미입력 시 '포토카드 컬렉션'
    if (nickname && nickname.trim()) {
      const nick = nickname.trim();
      const titleText = `${nick}님의 포토카드 컬렉션`;
      let fontSize = 15;
      ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
      while (fontSize > 10.5 && ctx.measureText(titleText).width > rightW) {
        fontSize -= 0.5;
        ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(titleText, rightX, 64);
    } else {
      ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('포토카드 컬렉션', rightX, 64);
    }

    // Subtitle (포카 체커 문구 제거)
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('44종 도안 수록', rightX, 82);

    // Progress Information
    const progY = 114;
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('수집 현황', rightX, progY);

    ctx.textAlign = 'right';
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`${totalChecked} / ${totalCards} 장 (${percent}%)`, rightX + rightW, progY);

    // Progress Bar Track
    const barX = rightX;
    const barY = 122;
    const barW = rightW;
    const barH = 7;
    const barRadius = 3.5;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(barX, barY, barW, barH, barRadius);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, barX, barY, barW, barH, barRadius);
    }
    ctx.fillStyle = '#060a12';
    ctx.fill();

    // Progress Bar Fill (Green & Sky/Navy gradient)
    if (percent > 0) {
      const fillW = Math.max(barRadius * 2, Math.round((barW * percent) / 100));
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(barX, barY, fillW, barH, barRadius);
      } else {
        CanvasExporter.drawRoundRectPath(ctx, barX, barY, fillW, barH, barRadius);
      }
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
      fillGrad.addColorStop(0, '#10b981');
      fillGrad.addColorStop(0.6, '#06b6d4');
      fillGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = fillGrad;
      ctx.fill();
    }

    // Collector Badge Pill
    const badgeY = 142;
    const badgeH = 22;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(rightX, badgeY, rightW, badgeH, 6);
    } else {
      CanvasExporter.drawRoundRectPath(ctx, rightX, badgeY, rightW, badgeH, 6);
    }
    ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.22)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#a7f3d0';
    const tier = CanvasExporter.getCollectorTier(percent);
    ctx.fillText(tier.badge, rightX + rightW / 2, badgeY + 14);
    ctx.restore();

    // 5. Card Footer URL & Hashtag (하단 '포카 체커' 문구 제거)
    const footY = 196;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('foretissimo.github.io', 26, footY);

    ctx.textAlign = 'right';
    ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
    ctx.fillStyle = '#818cf8';
    ctx.fillText('#포레포카체커', cardX + cardW - 14, footY);
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

  /**
   * 포카 수집률(%)에 따른 수집가 칭호 뱃지 및 재치있는 𝕏(트위터) 공유 문구 반환 (현실 덕질 공감형)
   * @param {number} percent - 수집 진행률 (0 ~ 100)
   * @returns {{ badge: string, tweetPhrase: string }}
   */
  static getCollectorTier(percent) {
    const p = Math.max(0, Math.min(100, Math.round(percent || 0)));

    if (p >= 100) {
      return {
        badge: '🏆 전설의 올클리어! 숲의 신 강림',
        tweetPhrase: '전설의 100% 올클리어! 바인더 최종 봉인, 포카의 신 강림 👑✨'
      };
    }
    if (p >= 90) {
      return {
        badge: '🎯 드볼 1보 직전! 갈망포카 수배 중',
        tweetPhrase: '드볼까지 단 한 발자국… 마지막 갈망포카 양도해주실 천사 숲별 구함 👼'
      };
    }
    if (p >= 80) {
      return {
        badge: '👑 포카 도사! 없는 게 뭐죠?',
        tweetPhrase: '포카 테두리 1초만 봐도 무슨 앨범 몇 번째 버전인지 맞힘 🔮'
      };
    }
    if (p >= 70) {
      return {
        badge: '📮 준등기 VIP & 교환의 달인',
        tweetPhrase: '우체국 기사님이랑 절친 될 기세… 갈망포카 다 데려올 때까지 달린다 💨'
      };
    }
    if (p >= 60) {
      return {
        badge: '📸 어디서든 예절샷 준비완료',
        tweetPhrase: '밥 먹을 때, 카페 갈 때 포카 안 꺼내면 손 떨리는 지경에 도달 ☕️📸'
      };
    }
    if (p >= 50) {
      return {
        badge: '🔥 하프 마스터! 반환점 돌파',
        tweetPhrase: '벌써 50% 반환점 돌파! 돌이킬 수 없는 강을 건넜다, 후진은 없다 🚀'
      };
    }
    if (p >= 40) {
      return {
        badge: '💸 내 통장은 숲으로 가는 중',
        tweetPhrase: '절반이 눈앞인데 통장은 왜 얇아질까요? (그래도 행복하면 OK) 💸'
      };
    }
    if (p >= 30) {
      return {
        badge: '🎲 앨범깡 손맛에 눈뜬 자',
        tweetPhrase: '앨범 뜯는 손맛을 알아버렸습니다. 중복 나와도 일단 사랑해…🥺'
      };
    }
    if (p >= 20) {
      return {
        badge: '📖 바인더 첫 장 채운 숲별',
        tweetPhrase: '바인더 첫 페이지 완공! 매일 밤 꺼내보며 흐뭇해하는 중 🌙'
      };
    }
    if (p > 0) { // 1% ~ 19%
      return {
        badge: '🐣 딱 최애 1장만 모으려 했는데...',
        tweetPhrase: '‘딱 최애 한 장만…’으로 시작했다가 입덕 완료. 멈추기엔 늦었다 🏃'
      };
    }
    // 0%
    return {
      badge: '🌱 텅장 방어 성공? (0%)',
      tweetPhrase: '바인더는 준비 완료! 0%에서 시작하는 드볼 대서사시 🌱'
    };
  }
}

if (typeof window !== 'undefined') {
  window.CanvasExporter = CanvasExporter;
}
