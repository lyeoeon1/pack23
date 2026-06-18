#!/bin/bash
# KidZone - Khoi chay bo cong cu hoc tap tuong tac
# Chi can chay file nay de bat dau!

PORT=8080
echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║     🎮 KIDZONE - HOC TAP TUONG TAC    ║"
echo "  ║     Bo cong cu cho tre em 3-8 tuoi     ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""
echo "  Dang khoi chay tai: http://localhost:$PORT"
echo "  Nhan Ctrl+C de dung."
echo ""

cd "$(dirname "$0")"

# Try python3 first, then python
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m http.server $PORT
else
    echo "  Loi: Khong tim thay Python."
    echo "  Vui long cai dat Python hoac mo file index.html bang Live Server."
    exit 1
fi
