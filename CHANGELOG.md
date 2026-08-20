# 📋 Phoca Checker - Change Log

All notable functional changes, architecture improvements, and bug fixes for the **포카 체커 (Phoca Checker)** project are documented in this file.

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
