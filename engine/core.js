import { CameraDetector, COLOR_PRESETS } from './camera.js';
import { Renderer } from './renderer.js';
import { AudioSynthesizer } from './audio.js';
import * as Physics from './physics.js';

export { Physics, COLOR_PRESETS };

export class GameEngine {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.camera = new CameraDetector();
    this.audio = new AudioSynthesizer();
    this.Physics = Physics;

    this.currentGame = null;
    this.state = {
      score: 0,
      level: 0,
      running: false,
      startTime: 0,
      duration: 60,
      target: 5,
      ended: false,
    };

    this.particles = [];
    this.floatingTexts = [];
    this.projectionMode = false;

    this._lastPhysicsTime = 0;
    this._physicsAccum = 0;
    this._lastDetectTime = 0;
    this._rafId = null;
  }

  get W() { return this.renderer.W; }
  get H() { return this.renderer.H; }

  async loadGame(gameModule) {
    if (this.currentGame && this.currentGame.cleanup) this.currentGame.cleanup(this);
    this.currentGame = gameModule;
    this.state.score = 0;
    this.state.level = 0;
    this.state.running = false;
    this.state.ended = false;
    this.particles = [];
    this.floatingTexts = [];
    if (gameModule.setup) gameModule.setup(this);
  }

  startLevel() {
    this.state.score = 0;
    this.state.running = true;
    this.state.startTime = performance.now();
    this.state.ended = false;
    this.particles = [];
    this.floatingTexts = [];
    if (this.currentGame && this.currentGame.onStartLevel) {
      this.currentGame.onStartLevel(this);
    }
    this.audio.init();
  }

  nextLevel() {
    if (!this.currentGame) return;
    const maxLevel = (this.currentGame.levels || []).length - 1;
    this.state.level = Math.min(this.state.level + 1, maxLevel);
    this.startLevel();
    if (this.currentGame.onLevelChanged) this.currentGame.onLevelChanged(this);
  }

  setLevel(idx) {
    if (!this.currentGame) return;
    this.state.level = Math.max(0, Math.min(idx, (this.currentGame.levels || []).length - 1));
    this.state.running = false;
    this.state.ended = false;
    this.state.score = 0;
    this.particles = [];
    this.floatingTexts = [];
    if (this.currentGame.onLevelChanged) this.currentGame.onLevelChanged(this);
  }

  resetGame() {
    this.setLevel(this.state.level);
    if (this.currentGame && this.currentGame.onStartLevel) this.currentGame.onStartLevel(this);
  }

  getLevel() {
    if (!this.currentGame || !this.currentGame.levels) return {};
    return this.currentGame.levels[this.state.level] || {};
  }

  getElapsed() {
    if (!this.state.running) return 0;
    return (performance.now() - this.state.startTime) / 1000;
  }

  getRemaining() {
    return Math.max(0, Math.ceil(this.state.duration - this.getElapsed()));
  }

  addScore(amount = 1) {
    this.state.score += amount;
  }

  addParticles(x, y, color, amount = 12) {
    for (let i = 0; i < amount; i++) {
      this.particles.push({
        x, y,
        vx: -5 + Math.random() * 10,
        vy: -7 + Math.random() * 7,
        life: 28, maxLife: 28,
        color, size: 4 + Math.random() * 3,
      });
    }
  }

  addFloatingText(x, y, text, color = '#10b981', life = 54) {
    this.floatingTexts.push({ x, y, text, color, life, maxLife: life });
  }

  showCenterMessage(html, duration = 900) {
    const el = document.getElementById('centerMessage');
    if (!el) return;
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(this._centerMsgTimer);
    this._centerMsgTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  checkWinLose() {
    if (!this.state.running || this.state.ended) return;
    const level = this.getLevel();
    if (this.state.score >= (level.target || this.state.target)) {
      this.state.running = false;
      this.state.ended = true;
      this.audio.playWin();
      this.showCenterMessage('QUA MAN!', 1800);
      if (this.currentGame.onWin) this.currentGame.onWin(this);
    } else if (this.getElapsed() >= (level.duration || this.state.duration)) {
      this.state.running = false;
      this.state.ended = true;
      this.audio.playLose();
      this.showCenterMessage('HET GIO!', 1500);
      if (this.currentGame.onLose) this.currentGame.onLose(this);
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  updateFloatingTexts() {
    for (const f of this.floatingTexts) {
      f.y -= 1.2;
      f.life--;
    }
    this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);
  }

  start() {
    this._lastPhysicsTime = 0;
    this._physicsAccum = 0;
    const loop = (ts) => {
      this._rafId = requestAnimationFrame(loop);

      // Camera detection at 30fps
      if (ts - this._lastDetectTime >= 33.3) {
        this.camera.detect(this.W, this.H);
        this._lastDetectTime = ts;
      }

      // Fixed-step physics at 60fps
      if (this._lastPhysicsTime === 0) { this._lastPhysicsTime = ts; return; }
      let dt = ts - this._lastPhysicsTime;
      if (dt > 100) dt = 100;
      this._lastPhysicsTime = ts;
      this._physicsAccum += dt;
      while (this._physicsAccum >= 16.666) {
        if (this.currentGame && this.currentGame.update) this.currentGame.update(this);
        this.updateParticles();
        this.updateFloatingTexts();
        this.checkWinLose();
        this._physicsAccum -= 16.666;
      }

      // Render
      if (this.currentGame && this.currentGame.draw) this.currentGame.draw(this);
      this.renderer.drawParticles(this.particles);
      this.renderer.drawFloatingTexts(this.floatingTexts);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  toggleProjection() {
    this.projectionMode = !this.projectionMode;
    document.body.classList.toggle('projection', this.projectionMode);
  }
}
