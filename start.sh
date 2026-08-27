#!/bin/bash

# ==============================================================================
# ✨ 포카 체커 (Phoca Checker) 로컬 개발 서버 실행 스크립트
# ==============================================================================

PORT=8000
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$DIR" || exit 1

# 포트 사용 여부 확인 및 사용 중일 시 다음 포트 자동 할당
while lsof -i :$PORT >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT"

echo ""
echo "============================================================"
echo "✨ 포카 체커 (Phoca Checker) 로컬 서버가 시작되었습니다!"
echo "🌐 접속 주소: $URL"
echo "🛑 서버를 종료하려면: 터미널에서 [Ctrl + C] 를 누르세요."
echo "============================================================"
echo ""

# macOS 기본 브라우저 자동 열기 (백그라운드 0.6초 후 실행)
if command -v open >/dev/null 2>&1; then
  (sleep 0.6 && open "$URL") &
fi

# Python 3 내장 HTTP 서버 구동
python3 -m http.server "$PORT"
