// ============================================================
//  PHAN LOAI TRAI CAY  —  Fruit Sorter game for KidZone
// ============================================================

/* ---------- fruit / category data per level ---------- */

const LEVEL_DATA = [
  // Level 1 — Sort by COLOR (age 3-5)
  {
    title: 'Man 1 — Mau sac (3-5 tuoi)',
    description: 'Phan loai trai cay theo mau DO va VANG',
    target: 8,
    duration: 60,
    gravity: 0.18,
    spawnInterval: 90,   // frames between spawns
    bounceFactor: 0.75,
    bins: [
      { label: 'DO',   color: 'rgb(239,68,68)'  },
      { label: 'VANG', color: 'rgb(234,179,8)'   },
    ],
    fruits: [
      { emoji: '🍎', category: 'DO'   },
      { emoji: '🍒', category: 'DO'   },
      { emoji: '🍓', category: 'DO'   },
      { emoji: '🍌', category: 'VANG' },
      { emoji: '🍋', category: 'VANG' },
      { emoji: '🥭', category: 'VANG' },
    ],
    fruitRadius: 28,
    binW: 160,
    binH: 80,
  },

  // Level 2 — Sort by SIZE concept (age 5-7)
  {
    title: 'Man 2 — Kich thuoc (5-7 tuoi)',
    description: 'Phan loai trai cay NHO va TO',
    target: 12,
    duration: 75,
    gravity: 0.22,
    spawnInterval: 72,
    bounceFactor: 0.78,
    bins: [
      { label: 'NHO', color: 'rgb(99,102,241)'  },
      { label: 'TO',  color: 'rgb(249,115,22)'   },
    ],
    fruits: [
      { emoji: '🍒', category: 'NHO' },
      { emoji: '🍓', category: 'NHO' },
      { emoji: '🫐', category: 'NHO' },
      { emoji: '🍉', category: 'TO'  },
      { emoji: '🍎', category: 'TO'  },
      { emoji: '🥭', category: 'TO'  },
    ],
    fruitRadius: 24,
    binW: 150,
    binH: 75,
  },

  // Level 3 — Sort into 3 categories (age 6-8)
  {
    title: 'Man 3 — 3 nhom (6-8 tuoi)',
    description: 'Phan loai: Trai cay, Rau cu, Banh keo',
    target: 15,
    duration: 90,
    gravity: 0.25,
    spawnInterval: 60,
    bounceFactor: 0.8,
    bins: [
      { label: 'TRAI CAY',  color: 'rgb(16,185,129)' },
      { label: 'RAU CU',    color: 'rgb(234,179,8)'   },
      { label: 'BANH KEO',  color: 'rgb(236,72,153)'  },
    ],
    fruits: [
      { emoji: '🍎', category: 'TRAI CAY'  },
      { emoji: '🍌', category: 'TRAI CAY'  },
      { emoji: '🍓', category: 'TRAI CAY'  },
      { emoji: '🥕', category: 'RAU CU'    },
      { emoji: '🥦', category: 'RAU CU'    },
      { emoji: '🌽', category: 'RAU CU'    },
      { emoji: '🍰', category: 'BANH KEO'  },
      { emoji: '🍩', category: 'BANH KEO'  },
      { emoji: '🍭', category: 'BANH KEO'  },
    ],
    fruitRadius: 22,
    binW: 130,
    binH: 70,
  },
];

/* ---------- local state ---------- */

let fruits    = [];   // active falling fruit entities
let bins      = [];   // computed bin rects for current level
let spawnTimer = 0;
let levelData  = null;

/* ---------- helpers ---------- */

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function spawnFruit(engine) {
  const lv = levelData;
  if (!lv) return;

  const template = pickRandom(lv.fruits);
  const margin = 80;
  const x = margin + Math.random() * (engine.W - margin * 2);

  fruits.push({
    x,
    y: -40,
    px: x,
    py: -40,
    vx: (Math.random() - 0.5) * 2.4,
    vy: 0.5 + Math.random() * 0.8,
    r: lv.fruitRadius,
    emoji: template.emoji,
    category: template.category,
    hitCooldown: 0,
    scored: false,
    trail: [],
  });
}

function getSpawnInterval(engine) {
  // Use the spawn-speed slider if available; slider value is in "frames" units
  if (engine._spawnSpeedSlider) {
    return Number(engine._spawnSpeedSlider.value) || levelData.spawnInterval;
  }
  return levelData.spawnInterval;
}

function computeBins(engine) {
  const lv = levelData;
  if (!lv) return;

  const count = lv.bins.length;
  const totalW = engine.W;
  const gap = totalW / (count + 1);
  const binY = engine.H - lv.binH / 2 - 20;

  bins = lv.bins.map((b, i) => ({
    x: gap * (i + 1),
    y: binY,
    w: lv.binW,
    h: lv.binH,
    label: b.label,
    color: b.color,
  }));
}

/* ---------- export the game object ---------- */

export default {

  /* ---- meta ---- */
  meta: {
    name: 'PHAN LOAI TRAI CAY',
    icon: '🍎',
    description: 'Phan luong trai cay vao dung ro. Hoc phan loai va logic.',
    tip: '<b>Cach choi:</b> Dung giay mau dat truoc camera de tao <b>tuong</b>. '
       + 'Tuong se lam nay trai cay di huong khac. '
       + 'Dan trai cay vao <b>dung ro</b> de ghi diem! '
       + 'Nhan <b>Space</b> de bat dau, <b>N</b> de chuyen man.',
  },

  /* ---- levels ---- */
  levels: LEVEL_DATA,

  /* ---- lifecycle ---- */

  setup(engine) {
    fruits = [];
    bins = [];
    spawnTimer = 0;
    levelData = LEVEL_DATA[0];
    computeBins(engine);
  },

  onStartLevel(engine) {
    levelData = LEVEL_DATA[engine.state.level] || LEVEL_DATA[0];
    engine.state.duration = levelData.duration;
    engine.state.target = levelData.target;
    fruits = [];
    bins = [];
    spawnTimer = 0;
    computeBins(engine);
  },

  onLevelChanged(engine) {
    levelData = LEVEL_DATA[engine.state.level] || LEVEL_DATA[0];
    engine.state.duration = levelData.duration;
    engine.state.target = levelData.target;
    fruits = [];
    bins = [];
    spawnTimer = 0;
    computeBins(engine);
  },

  /* ---- physics tick (called at 60 fps) ---- */
  update(engine) {
    if (!engine.state.running || engine.state.ended) return;
    if (!levelData) return;

    const Physics = engine.Physics;
    const objects = engine.camera.getObjects();   // player-placed walls
    const W = engine.W;
    const H = engine.H;

    // --- spawn ---
    spawnTimer++;
    if (spawnTimer >= getSpawnInterval(engine)) {
      spawnTimer = 0;
      spawnFruit(engine);
    }

    // --- update each fruit ---
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];

      // trail (for visual effect)
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 8) f.trail.shift();

      // gravity
      Physics.applyGravity(f, levelData.gravity);

      // cooldown
      f.hitCooldown = Math.max(0, f.hitCooldown - 1);

      // bounce off camera-detected walls
      if (f.hitCooldown === 0) {
        for (const obj of objects) {
          if (Physics.hitTestRect(f, obj)) {
            Physics.bounceFromRect(f, obj, levelData.bounceFactor);
            f.hitCooldown = 10;
            engine.audio.playBounce(0.4, 1.0 + Math.random() * 0.3);
            break;
          }
        }
      }

      // keep inside horizontal bounds (soft bounce off left/right edges)
      if (f.x - f.r < 0) {
        f.x = f.r;
        f.vx = Math.abs(f.vx) * 0.6;
      } else if (f.x + f.r > W) {
        f.x = W - f.r;
        f.vx = -Math.abs(f.vx) * 0.6;
      }

      // --- bin detection ---
      if (!f.scored) {
        for (const bin of bins) {
          if (Physics.hitTestRect(f, bin)) {
            f.scored = true;

            if (f.category === bin.label) {
              // Correct bin
              engine.addScore(1);
              engine.audio.playCorrect();
              engine.addParticles(f.x, f.y, '#10b981', 14);
              engine.addFloatingText(f.x, f.y - 30, 'DUNG! +1', '#10b981', 48);
            } else {
              // Wrong bin
              engine.audio.playWrong();
              engine.addParticles(f.x, f.y, '#ef4444', 10);
              engine.addFloatingText(f.x, f.y - 30, 'SAI!', '#ef4444', 48);
            }

            // Mark for removal after a brief flash
            f._removeTimer = 8;
            break;
          }
        }
      }

      // decrement remove timer and remove
      if (f._removeTimer !== undefined) {
        f._removeTimer--;
        if (f._removeTimer <= 0) {
          fruits.splice(i, 1);
          continue;
        }
      }

      // remove if completely off screen (missed)
      if (Physics.isOutOfBounds(f, W, H)) {
        fruits.splice(i, 1);
      }
    }
  },

  /* ---- render (called every animation frame) ---- */
  draw(engine) {
    const R = engine.renderer;

    // background
    R.clear('#0c0a18');
    R.drawGrid(0.05, 60);

    // draw camera-detected walls (colliders)
    const objects = engine.camera.getObjects();
    for (let i = 0; i < objects.length; i++) {
      R.drawCollider(objects[i], i, engine.camera.settings.color, engine.camera.frozen);
    }

    // draw bins at the bottom
    for (const bin of bins) {
      R.drawBin(bin.x, bin.y, bin.w, bin.h, bin.label, bin.color);
    }

    // draw spawn zone indicator at the top
    R.drawLaunchPoint(engine.W / 2, 30, 18, 'TRAI CAY ROI');

    // draw each fruit
    for (const f of fruits) {
      // subtle trail
      if (f.trail.length > 1) {
        const ctx = R.ctx;
        ctx.save();
        ctx.globalAlpha = 0.18;
        for (let t = 0; t < f.trail.length - 1; t++) {
          const alpha = (t + 1) / f.trail.length * 0.3;
          const size = f.r * 2 * ((t + 1) / f.trail.length) * 0.7;
          ctx.globalAlpha = alpha;
          R.drawEmoji(f.emoji, f.trail[t].x, f.trail[t].y, size);
        }
        ctx.restore();
      }

      // main emoji
      R.drawEmoji(f.emoji, f.x, f.y, f.r * 2);
    }

    // draw category hint labels above bins (small, helpful for young kids)
    if (levelData) {
      const ctx = R.ctx;
      ctx.save();
      ctx.font = "bold 13px 'Orbitron', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (const bin of bins) {
        // Show example emojis for each bin category
        const examples = levelData.fruits
          .filter(fr => fr.category === bin.label)
          .map(fr => fr.emoji)
          .join(' ');
        ctx.fillText(examples, bin.x, bin.y - bin.h / 2 - 12);
      }
      ctx.restore();
    }
  },

  /* ---- win / lose callbacks ---- */
  onWin(engine) {
    // Celebration particles around each bin
    for (const bin of bins) {
      engine.addParticles(bin.x, bin.y, '#10b981', 20);
    }
    engine.addFloatingText(engine.W / 2, engine.H / 2 - 60, 'TUYET VOI!', '#fbbf24', 80);
  },

  onLose(engine) {
    engine.addFloatingText(engine.W / 2, engine.H / 2 - 60, 'THU LAI NHE!', '#f43f5e', 80);
  },

  /* ---- cleanup ---- */
  cleanup() {
    fruits = [];
    bins = [];
    spawnTimer = 0;
    levelData = null;
  },
};
