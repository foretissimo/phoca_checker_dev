# 📋 Phoca Checker - Change Log

All notable functional changes, architecture improvements, and bug fixes for the **포카 체커 (Phoca Checker)** project are documented in this file.

---

## [1.7.0] - 2026-08-21

### 📊 Analytics & Statistical Insights
- **Google Analytics 4 (GA4) Tag Added**:
  - Integrated official GA4 tracking (`G-EYJEM4QMZY`) in `<head>` for traffic, user flow, and feature engagement metrics.
  - Added custom GA4 event tracking for `export_master_poster`, `export_single_template`, and `share_to_x`.
- **Real-time Card Ownership Statistics (Google Sheets Integration)**:
  - Integrated background stats webhook triggered upon master poster generation to aggregate card-by-card ownership and popularity metrics in Google Spreadsheets in real time.

---

## [1.6.1] - 2026-08-21

### 𝕏 Social Sharing & Clipboard Image Copy
- **Hashtag Linebreak**: Added a newline before `#포레포카체커` in the Twitter composer text for cleaner formatting.
- **Auto Card Image Copy**: Generates a collection progress summary card image and automatically copies it to the system clipboard upon clicking `[자랑하기]`, allowing users to paste (Cmd+V / Ctrl+V) the image directly into Twitter.

---

## [1.6.0] - 2026-08-21

### 🎨 UI & UX Improvements
- **Category Official Logo Added**:
  - Replaced the default emoji icon in the Forestella category card with the official crest logo emblem.
  - Added specialized badge container styling (`.cat-icon-badge.has-logo`) for crisp and elegant rendering.

### 𝕏 Social Sharing
- **Simplified Sharing Text**:
  - Updated the `[자랑하기]` text to exclusively show overall collection progress (% and total cards) regardless of current template view, keeping tweets clean and concise.

---

## [1.5.1] - 2026-08-21

### 📖 Documentation & Help
- **Help Modal Updated**: Added Step 5 guide for the `[자랑하기]` feature in the help modal.

### ⚡ Optimization
- **Streamlined X Sharing**: Streamlined `자랑하기` to instantly launch the official 𝕏(Twitter) composer with progress percentage, card counts, and `#포레포카체커` hashtag.

---

## [1.5.0] - 2026-08-21

### 🎨 UI & UX Improvements
- **Focus on Forestella Category**:
  - Hid placeholder/preparatory categories (2~5) to exclusively showcase the active Forestella category card.
  - Centered category hub layout with optimal card dimensions.
- **Enhanced Social Sharing (X / Twitter)**:
  - Added auto-generation of high-resolution Collection Summary Card (1200x675) with clipboard copy & download.
  - Set official hashtag to `#포레포카체커`.

---

## [1.4.0] - 2026-08-21

### 🌟 Added
- **자랑하기 (Share to X / Twitter)**:
  - Added dedicated `자랑하기` button with Twitter/X icon in header actions.
  - Automatically calculates and populates overall collection percentage, collected/total card count, current template status, and hashtags (`#포레스텔라 #Forestella #포카체커`).

### 🎨 UI & UX Improvements
- **Simplified Mode Button Labels**:
  - `보유 포카 가리기 (위시리스트)` → `보유 포카 가리기`
  - `미보유 포카 가리기 (보유본)` → `미보유 포카 가리기`
- **Template Coordinate Updates**:
  - Synced visual editor coordinate adjustments for `fore10` and `fore18` (total 758 cards).

---

## [1.3.0] - 2026-08-21

### 🔒 Security & Environment Isolation
- **Visual Editor Restricted to Dev**:
  - The `영역 편집기` button and editor drawer are strictly restricted to `phoca_checker_dev`, `localhost`, and `127.0.0.1`.
  - Automatically hidden on production (`phoca_checker`) to prevent accidental unauthorized edits.

### 🎨 UI & UX Improvements
- **Credits Display Reordering**:
  - Reordered Section 3 (만드는 사람들) in modal:
    1. **오류 제보 및 피드백 문의** (스핀 / Spin)
    2. **포토카드 도안 제공** (@sy_fore & Notion)
    3. **기획 및 제작** (@live_in_fore)
- **Notice Bar & Footer Simplification**:
  - Removed extra subtext from the main home notice ticker bar for a cleaner banner.
  - Simplified footer credit text to `만드는 사람들`.

---

## [1.2.0] - 2026-08-21

### 🚀 Staging & Release Architecture
- **Dual-Environment Setup**:
  - `Production`: https://foretissimo.github.io/phoca_checker/
  - `Development / Staging`: https://foretissimo.github.io/phoca_checker_dev/
- **Deployment Scripts**:
  - `sync-dev.js`: Deploys local workspace to `phoca_checker_dev` for QA and mobile/desktop pre-verification.
  - `sync-prod.js`: Deploys verified production release to `phoca_checker`.

### 🌟 Added
- **Information & Notice Modal (`#info-modal-backdrop`)**:
  - Open announcements & guides with clean multi-tab card layout.
  - Links to creators (`@live_in_fore`, `@sy_fore`, Notion) and inquiry feedback channel (**스핀 / Spin**).
- **Interactive Notice Ticker Bar**: Single-line announcement bar on the home screen.
- **Route Support for Info Modal**: Direct navigation via `#/info` hash route.

### 🛠️ Fixed
- **Template Card Count Synchronization**:
  - Fixed count mismatch on `fore27` (4 cards), `fore35` (14 cards), `fore36` (14 cards).
  - Sanitized `getCheckedSetForTemplate` to automatically prune obsolete/deleted card IDs from client-side `localStorage`.
  - Fixed `selectAllCards` and `invertSelection` to operate strictly on currently active valid cards.

---

## [1.1.0] - 2026-08-20

### 🌟 Added
- **Smart Magnetic Snapping (`🧲`)**:
  - Visual editor automatically snaps dragged card boxes to the first card's width, height, and horizontal/vertical alignment.
- **Direct GitHub Save from Visual Editor**:
  - Coordinates edited in the browser can be committed directly to GitHub via REST API.
- **Client-side Checklist Backup & Restore**:
  - Export checklist state to `포카체커_체크리스트_백업_YYYY-MM-DD.json`.
  - Import JSON backup without server dependency.
- **Top-Left Mode Pill Badge**:
  - Renders translucent `미보유` / `보유` badge on both interactive canvas viewport and exported PNG files.
- **All-in-One Merged Poster Export**:
  - Generates high-resolution 4-column merged poster combining all 39 templates with custom title and metadata banner.

### ⚡ Improved
- **Visual Editor Usability**:
  - Added translucent glass styling to editor labels with text truncation (`...`), expanding on hover.
  - Added `[x] 번호만 표시` toggle to avoid obscuring card image details during manual alignment.
- **Clean UI / Removed Floating Duplicate Buttons**:
  - Removed duplicate floating download buttons in favor of top control bar.

---

## [1.0.0] - 2026-08-20

### 🎉 Initial Release
- **Full Forestella 39 Templates Support**:
  - Configured 39 photocard sheets covering albums, kits, season's greetings, and concert merchandise.
- **Dual Display Modes**:
  - `보유 포카 가리기`: Conceals owned cards with frosted overlay to highlight unowned wishlist cards.
  - `미보유 포카 가리기`: Highlights owned collection.
- **High-Resolution PNG Canvas Export**:
  - Pixel-perfect canvas rendering for individual sheets and full merged collections.
- **Client-Side Privacy**:
  - Decentralized local storage structure (`phoca_checks_{templateId}`).
