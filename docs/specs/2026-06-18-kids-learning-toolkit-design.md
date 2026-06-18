# Kids Interactive Learning Toolkit - Design Spec

## Overview
Bo cong cu hoc tap tuong tac cho tre em 3-8 tuoi, su dung camera webcam nhan dien vat the mau sac de tao tuong nay/vat the ao tren man chieu.

## Target
- Lua tuoi: 3-8 (mam non + tieu hoc dau)
- Moi truong: Lop hoc, projector chieu len tuong
- Giao vien dieu khien qua laptop
- Ngon ngu: Tieng Viet

## Architecture: Shared Engine + Module Loader
- ES Modules, 1 index.html launcher
- engine/ folder: camera, physics, renderer, audio, core
- games/ folder: moi tro choi la 1 JS module
- Game module interface: { meta, levels, setup(), update(), draw(), cleanup() }

## 4 Core Games
1. Dan Bong Vao Ro (Bounce Ball) - Van dong & Vat ly
2. Phan Loai Trai Cay (Fruit Sorter) - Toan & Logic  
3. Bat Chu Cai (Letter Catcher) - Ngon ngu
4. Xay Cau Qua Song (Path Builder) - Sang tao & Giai do

## Interaction Mechanism
- Camera nhan dien vat the mau (giay mau, the mau, lego)
- Tao "tuong nay" ao tren man chieu
- Tre dat/di chuyen vat that de tuong tac voi tro choi
- Color presets: vang, hong, xanh la, xanh duong

## Engine Modules
- camera.js: Camera detection, color filtering, connected components
- physics.js: Gravity, collision, bounce
- renderer.js: Canvas rendering, effects, particles
- audio.js: Web Audio synthesizer
- core.js: Game loop, state management, module loading
