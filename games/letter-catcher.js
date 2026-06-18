const WORD_BANKS = [
  ['ME', 'BA', 'CA', 'GA', 'BO', 'CO'],
  ['MEO', 'CHO', 'GAU', 'CUA', 'TOM', 'ONG'],
  ['BUOM', 'CHIM', 'RANG', 'XANH', 'HONG', 'TRANG'],
];

const DISTRACTOR_POOL = 'ABCDEFGHIKLMNOPQRSTUVXY';

function pickWord(levelIdx) {
  const bank = WORD_BANKS[levelIdx] || WORD_BANKS[0];
  return bank[Math.floor(Math.random() * bank.length)];
}

function pickDistractors(word, count) {
  const letters = new Set(word.split(''));
  const pool = DISTRACTOR_POOL.split('').filter(c => !letters.has(c));
  const result = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

export default {
  meta: {
    name: 'BAT CHU CAI',
    icon: '🔤',
    description: 'Dan chu cai dung vao o ghep tu. Hoc nhan dien chu va chinh ta.',
    tip: `<b>Cach choi:</b> Mot tu se hien thi tren man hinh. Cac chu cai roi xuong — dat tuong nay de dan chu <b>dung</b> vao o ghep tu, de chu <b>sai</b> roi xuong.<br/>
          Phim tat: <b>P</b> trinh chieu, <b>F</b> khoa tuong, <b>Space</b> bat dau, <b>N</b> man tiep.`,
  },

  levels: [
    { title: 'Man 1 - Chu don gian', target: 3, duration: 90, gravity: 0.18, letterRadius: 32, maxLetters: 10, spawnInterval: 70, distractors: 2, bg: '#0a0716', gridAlpha: 0.06 },
    { title: 'Man 2 - Tu 3 chu', target: 5, duration: 90, gravity: 0.22, letterRadius: 28, maxLetters: 14, spawnInterval: 55, distractors: 4, bg: '#0b0718', gridAlpha: 0.07 },
    { title: 'Man 3 - Tu dai', target: 7, duration: 120, gravity: 0.26, letterRadius: 26, maxLetters: 18, spawnInterval: 42, distractors: 5, bg: '#0d0614', gridAlpha: 0.08 },
  ],

  _letters: [],
  _currentWord: '',
  _filledSlots: [],
  _wordsCompleted: 0,
  _spawnTimer: 0,
  _slotPositions: [],

  setup(engine) {
    this._letters = [];
    this._wordsCompleted = 0;
    this._spawnTimer = 0;
    this._pickNewWord(engine);
  },

  onStartLevel(engine) {
    this._letters = [];
    this._wordsCompleted = 0;
    this._spawnTimer = 0;
    engine.state.score = 0;
    this._pickNewWord(engine);
    engine.showCenterMessage('BAT CHU CAI!', 800);
  },

  onLevelChanged(engine) {
    this.onStartLevel(engine);
  },

  _pickNewWord(engine) {
    this._currentWord = pickWord(engine.state.level);
    this._filledSlots = new Array(this._currentWord.length).fill(false);
    this._computeSlotPositions(engine);
  },

  _computeSlotPositions(engine) {
    const word = this._currentWord;
    const slotSize = 64;
    const gap = 12;
    const totalW = word.length * slotSize + (word.length - 1) * gap;
    const startX = (engine.W - totalW) / 2 + slotSize / 2;
    const y = engine.H * 0.85;
    this._slotPositions = [];
    for (let i = 0; i < word.length; i++) {
      this._slotPositions.push({ x: startX + i * (slotSize + gap), y, size: slotSize, letter: word[i] });
    }
  },

  _spawnLetter(engine) {
    const level = engine.getLevel();
    const word = this._currentWord;
    const neededLetters = word.split('').filter((c, i) => !this._filledSlots[i]);
    const distractors = pickDistractors(word, level.distractors || 3);

    const isCorrect = neededLetters.length > 0 && Math.random() < 0.55;
    let letter;
    if (isCorrect && neededLetters.length > 0) {
      letter = neededLetters[Math.floor(Math.random() * neededLetters.length)];
    } else if (distractors.length > 0) {
      letter = distractors[Math.floor(Math.random() * distractors.length)];
    } else {
      letter = DISTRACTOR_POOL[Math.floor(Math.random() * DISTRACTOR_POOL.length)];
    }

    const r = level.letterRadius || 28;
    const x = r + Math.random() * (engine.W - r * 2);
    const isActuallyCorrect = word.includes(letter) && word.split('').some((c, i) => c === letter && !this._filledSlots[i]);

    this._letters.push({
      x, y: -r * 2,
      px: x, py: -r * 2,
      vx: -1.5 + Math.random() * 3,
      vy: 0.5 + Math.random() * 1,
      r,
      letter,
      isCorrect: isActuallyCorrect,
      hitCooldown: 0,
      scored: false,
      trail: [],
      color: isActuallyCorrect ? 'hsl(160,90%,55%)' : 'hsl(260,30%,45%)',
    });
  },

  update(engine) {
    if (!engine.state.running) return;
    const level = engine.getLevel();
    const objects = engine.camera.getObjects();

    // Auto-spawn
    this._spawnTimer++;
    const interval = (engine._spawnSpeedSlider ? Number(engine._spawnSpeedSlider.value) : level.spawnInterval) || level.spawnInterval;
    if (this._spawnTimer >= interval && this._letters.length < (level.maxLetters || 14)) {
      this._spawnLetter(engine);
      this._spawnTimer = 0;
    }

    // Update letters
    for (const lt of this._letters) {
      lt.px = lt.x;
      lt.py = lt.y;
      engine.Physics.applyGravity(lt, level.gravity || 0.2);
      lt.hitCooldown = Math.max(0, lt.hitCooldown - 1);

      lt.trail.push({ x: lt.x, y: lt.y });
      if (lt.trail.length > 6) lt.trail.shift();

      // Bounce off walls
      if (lt.hitCooldown === 0 && !lt.scored) {
        for (const obj of objects) {
          if (engine.Physics.hitTestRect(lt, obj)) {
            engine.Physics.bounceFromRect(lt, obj, 0.75);
            lt.hitCooldown = 12;
            engine.audio.playBounce(0.4 + Math.random() * 0.2, 0.9 + Math.random() * 0.3);
            engine.addParticles(lt.x, lt.y, lt.color, 5);
            break;
          }
        }
      }

      // Check slot collision
      if (!lt.scored) {
        for (let i = 0; i < this._slotPositions.length; i++) {
          if (this._filledSlots[i]) continue;
          const slot = this._slotPositions[i];
          const dx = lt.x - slot.x, dy = lt.y - slot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < slot.size * 0.6) {
            lt.scored = true;
            if (lt.letter === slot.letter) {
              this._filledSlots[i] = true;
              engine.audio.playCorrect();
              engine.addFloatingText(lt.x, lt.y - 30, 'DUNG!', '#10b981', 40);
              engine.addParticles(lt.x, lt.y, '#10b981', 15);
              this._checkWordComplete(engine);
            } else {
              engine.audio.playWrong();
              engine.addFloatingText(lt.x, lt.y - 30, 'SAI!', '#f43f5e', 35);
              engine.addParticles(lt.x, lt.y, '#f43f5e', 8);
            }
            break;
          }
        }
      }
    }

    // Remove out-of-bounds or scored letters
    this._letters = this._letters.filter(lt =>
      !lt.scored && !engine.Physics.isOutOfBounds(lt, engine.W, engine.H)
    );

    // Recompute slot positions if window resized
    if (this._slotPositions.length > 0 && Math.abs(this._slotPositions[0].y - engine.H * 0.85) > 20) {
      this._computeSlotPositions(engine);
    }
  },

  _checkWordComplete(engine) {
    if (this._filledSlots.every(f => f)) {
      this._wordsCompleted++;
      engine.addScore(1);
      engine.audio.playScore();
      engine.addFloatingText(engine.W / 2, engine.H / 2, `"${this._currentWord}" HOAN THANH!`, '#fbbf24', 60);
      engine.showCenterMessage(this._currentWord + '!', 800);

      setTimeout(() => {
        if (engine.state.running) {
          this._pickNewWord(engine);
          this._letters = [];
        }
      }, 900);
    }
  },

  draw(engine) {
    const level = engine.getLevel();
    engine.renderer.clear(level.bg || '#0a0716');
    engine.renderer.drawGrid(level.gridAlpha || 0.06, 56);

    const ctx = engine.renderer.ctx;
    const objects = engine.camera.getObjects();

    // Draw colliders
    objects.forEach((obj, i) => engine.renderer.drawCollider(obj, i, engine.camera.settings.color, engine.camera.frozen));

    // Draw target word display at top
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = "bold 18px 'Orbitron',sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('GHEP TU:', engine.W / 2, 60);

    ctx.font = "bold 48px 'Orbitron',sans-serif";
    const word = this._currentWord;
    const charSpacing = 60;
    const startX = engine.W / 2 - (word.length - 1) * charSpacing / 2;
    for (let i = 0; i < word.length; i++) {
      const x = startX + i * charSpacing;
      if (this._filledSlots[i]) {
        ctx.fillStyle = '#10b981';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#10b981';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.shadowBlur = 0;
      }
      ctx.fillText(word[i], x, 110);
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw progress
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = "bold 14px 'Plus Jakarta Sans',sans-serif";
    ctx.fillStyle = '#818cf8';
    ctx.fillText(`Tu ${this._wordsCompleted + 1} / ${level.target || 5}`, engine.W / 2, 140);
    ctx.restore();

    // Draw letter slots at bottom
    for (let i = 0; i < this._slotPositions.length; i++) {
      const slot = this._slotPositions[i];
      engine.renderer.drawLetterSlot(slot.x, slot.y, slot.size, slot.letter, this._filledSlots[i]);
    }

    // Draw spawn zone indicator
    ctx.save();
    ctx.strokeStyle = 'rgba(129,140,248,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(engine.W, 40);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = "bold 11px 'Orbitron',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('CHU CAI ROI XUONG TU DAY', engine.W / 2, 32);
    ctx.restore();

    // Draw falling letters
    for (const lt of this._letters) {
      // Trail
      if (lt.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(lt.trail[0].x, lt.trail[0].y);
        for (let i = 1; i < lt.trail.length; i++) ctx.lineTo(lt.trail[i].x, lt.trail[i].y);
        ctx.strokeStyle = lt.color.replace('hsl', 'hsla').replace(')', ',0.2)');
        ctx.lineWidth = lt.r * 0.8;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Circle background
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = lt.color;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.r, 0, Math.PI * 2);
      ctx.fillStyle = lt.isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(100,80,160,0.2)';
      ctx.fill();
      ctx.strokeStyle = lt.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Letter text
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${lt.r * 1.1}px 'Orbitron',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lt.letter, lt.x, lt.y);
      ctx.restore();
    }
  },

  onWin(engine) {
    engine.showCenterMessage('GIOI QUA!', 1800);
  },

  onLose(engine) {
    engine.showCenterMessage('HET GIO!', 1500);
  },

  cleanup() {
    this._letters = [];
    this._filledSlots = [];
    this._slotPositions = [];
  },
};
