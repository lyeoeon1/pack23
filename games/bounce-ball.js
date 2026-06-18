// ============================================================
// DAN BONG VAO RO  —  Bounce Ball game module
// Players place colored objects in front of the camera to
// create walls that deflect falling balls into a basket.
// ============================================================

let balls = [];
let spawnTimer = 0;
let basketRect = { x: 0, y: 0, w: 0, h: 0 };

// --------------- helpers ---------------

function randomBallColor() {
  const hue = 190 + Math.random() * 30;          // neon cyan-blue
  return `hsl(${hue}, 100%, 58%)`;
}

function makeBall(x, y, vx, vy, r) {
  return {
    x, y,
    px: x, py: y,
    vx, vy,
    r,
    hitCooldown: 0,
    scored: false,
    color: randomBallColor(),
    trail: [],
  };
}

function spawnBall(engine) {
  const lv = engine.getLevel();
  const lx = lv.launchX * engine.W;
  const ly = lv.launchY * engine.H;
  // slight randomness so balls spread a little
  const vx = lv.launchVX + (Math.random() - 0.5) * 1.2;
  const vy = lv.launchVY + (Math.random() - 0.5) * 0.6;
  balls.push(makeBall(lx, ly, vx, vy, lv.ballRadius));
}

// --------------- export ---------------

export default {

  // ===== meta =====
  meta: {
    name: 'DAN BONG VAO RO',
    icon: '\u{1F3C0}',
    description: 'Dat tuong nay de dan bong vao ro',
    tip: `
      <b>Cach choi:</b><br>
      \u{1F3C0} Bong duoc ban tu goc trai phia tren<br>
      \u{1F9F1} Dat vat mau truoc camera de tao <b>tuong nay</b><br>
      \u{1F3AF} Dan bong vao <b>ro</b> o goc phai phia duoi<br>
      \u{2B50} Dat du so bong vao ro truoc khi het gio!
    `,
  },

  // ===== levels =====
  levels: [
    {
      title: 'Man 1 — De',
      target: 5,
      duration: 60,
      gravity: 0.28,
      ballRadius: 22,
      maxBalls: 14,
      bounce: 0.88,
      spawnInterval: 48,
      launchX: 0.10,
      launchY: 0.08,
      launchVX: 5.0,
      launchVY: 1.2,
      basketW: 190,
      basketH: 92,
      basketX: 0.78,
      basketY: 0.78,
      bg: '#09070f',
      gridAlpha: 0.08,
    },
    {
      title: 'Man 2 — Trung binh',
      target: 10,
      duration: 75,
      gravity: 0.32,
      ballRadius: 20,
      maxBalls: 16,
      bounce: 0.85,
      spawnInterval: 40,
      launchX: 0.08,
      launchY: 0.06,
      launchVX: 5.8,
      launchVY: 1.6,
      basketW: 155,
      basketH: 80,
      basketX: 0.82,
      basketY: 0.80,
      bg: '#0a0812',
      gridAlpha: 0.06,
    },
    {
      title: 'Man 3 — Kho',
      target: 16,
      duration: 90,
      gravity: 0.36,
      ballRadius: 18,
      maxBalls: 20,
      bounce: 0.82,
      spawnInterval: 32,
      launchX: 0.07,
      launchY: 0.05,
      launchVX: 6.5,
      launchVY: 2.0,
      basketW: 120,
      basketH: 68,
      basketX: 0.85,
      basketY: 0.82,
      bg: '#08060e',
      gridAlpha: 0.05,
    },
  ],

  // ===== lifecycle =====

  setup(engine) {
    balls = [];
    spawnTimer = 0;
    const lv = engine.getLevel();
    engine.state.target = lv.target;
    engine.state.duration = lv.duration;
    basketRect = {
      x: lv.basketX * engine.W,
      y: lv.basketY * engine.H,
      w: lv.basketW,
      h: lv.basketH,
    };
  },

  onStartLevel(engine) {
    balls = [];
    spawnTimer = 0;
    const lv = engine.getLevel();
    engine.state.target = lv.target;
    engine.state.duration = lv.duration;
    basketRect = {
      x: lv.basketX * engine.W,
      y: lv.basketY * engine.H,
      w: lv.basketW,
      h: lv.basketH,
    };
    // spawn the first ball immediately
    spawnBall(engine);
  },

  onLevelChanged(engine) {
    balls = [];
    spawnTimer = 0;
    const lv = engine.getLevel();
    engine.state.target = lv.target;
    engine.state.duration = lv.duration;
    basketRect = {
      x: lv.basketX * engine.W,
      y: lv.basketY * engine.H,
      w: lv.basketW,
      h: lv.basketH,
    };
  },

  // ===== physics tick =====

  update(engine) {
    if (!engine.state.running || engine.state.ended) return;

    const lv = engine.getLevel();
    const { W, H, Physics } = engine;
    const objects = engine.camera.getObjects();
    const bounceFactor = lv.bounce;

    // ---- auto-spawn ----
    const interval = engine._spawnSpeedSlider
      ? Number(engine._spawnSpeedSlider.value) || lv.spawnInterval
      : lv.spawnInterval;

    spawnTimer++;
    if (spawnTimer >= interval && balls.length < lv.maxBalls) {
      spawnBall(engine);
      spawnTimer = 0;
    }

    // ---- update each ball ----
    for (const ball of balls) {
      if (ball.scored) continue;

      // store previous position before physics
      const prevY = ball.y;

      Physics.applyGravity(ball, lv.gravity);

      // trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) ball.trail.shift();

      // cooldown
      if (ball.hitCooldown > 0) ball.hitCooldown--;

      // ---- collide with camera objects (walls) ----
      if (ball.hitCooldown === 0) {
        for (const obj of objects) {
          if (Physics.hitTestRect(ball, obj)) {
            Physics.bounceFromRect(ball, obj, bounceFactor);
            ball.hitCooldown = 12;

            // feedback
            const vol = Math.min(1, (Math.abs(ball.vx) + Math.abs(ball.vy)) / 18);
            const pitch = 0.8 + Math.random() * 0.5;
            engine.audio.playBounce(vol, pitch);
            engine.addParticles(ball.x, ball.y, ball.color, 8);
            engine.addFloatingText(ball.x, ball.y - ball.r - 8, 'NAY!', '#fbbf24', 32);
            break;
          }
        }
      }

      // ---- check scoring (ball enters basket from above) ----
      const basketTop = basketRect.y - basketRect.h / 2;
      const basketLeft = basketRect.x - basketRect.w / 2;
      const basketRight = basketRect.x + basketRect.w / 2;

      if (
        !ball.scored &&
        ball.vy > 0 &&
        Physics.crossedLine(prevY, ball.y, basketTop, ball.vy) &&
        ball.x > basketLeft &&
        ball.x < basketRight
      ) {
        ball.scored = true;
        // slow ball down inside basket
        ball.vx *= 0.3;
        ball.vy *= 0.25;

        engine.addScore(1);
        engine.audio.playScore();
        engine.addParticles(ball.x, basketTop, '#f97316', 16);
        engine.addFloatingText(
          ball.x, basketTop - 28,
          '+1 VAO RO!', '#10b981', 54,
        );
      }
    }

    // ---- remove balls that left the screen or scored & fell past basket ----
    const basketBottom = basketRect.y + basketRect.h / 2 + 60;
    balls = balls.filter(b => {
      if (b.scored && b.y > basketBottom) return false;
      if (Physics.isOutOfBounds(b, W, H)) return false;
      return true;
    });
  },

  // ===== render frame =====

  draw(engine) {
    const lv = engine.getLevel();
    const { W, H } = engine;
    const objects = engine.camera.getObjects();

    // background & grid
    engine.renderer.clear(lv.bg);
    engine.renderer.drawGrid(lv.gridAlpha);

    // launch point
    const lx = lv.launchX * W;
    const ly = lv.launchY * H;
    engine.renderer.drawLaunchPoint(lx, ly, lv.ballRadius, 'DIEM BAN');

    // trajectory preview
    engine.renderer.drawTrajectory(
      lx, ly,
      lv.launchVX, lv.launchVY,
      lv.gravity, objects, lv.bounce,
    );

    // camera-detected colliders (walls)
    const colorKey = engine.camera.settings.color;
    const frozen = engine.camera.frozen;
    for (let i = 0; i < objects.length; i++) {
      engine.renderer.drawCollider(objects[i], i, colorKey, frozen);
    }

    // basket
    engine.renderer.drawBasket(
      basketRect.x, basketRect.y,
      basketRect.w, basketRect.h,
    );

    // direction arrow from launch point toward basket
    const arrowLen = 60;
    const angle = Math.atan2(lv.launchVY, lv.launchVX);
    engine.renderer.drawArrow(
      lx, ly,
      lx + Math.cos(angle) * arrowLen,
      ly + Math.sin(angle) * arrowLen,
    );

    // balls
    for (const ball of balls) {
      engine.renderer.drawBall(ball);
    }
  },

  // ===== win / lose =====

  onWin(engine) {
    // burst of celebratory particles around the basket
    for (let i = 0; i < 5; i++) {
      engine.addParticles(
        basketRect.x + (Math.random() - 0.5) * basketRect.w,
        basketRect.y - basketRect.h / 2,
        '#f97316', 18,
      );
    }
  },

  onLose(_engine) {
    // nothing extra needed — engine already shows HET GIO
  },

  cleanup() {
    balls = [];
    spawnTimer = 0;
  },
};
