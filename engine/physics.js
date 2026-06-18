export function hitTestRect(entity, rect) {
  const left = rect.x - rect.w / 2;
  const right = rect.x + rect.w / 2;
  const top = rect.y - rect.h / 2;
  const bottom = rect.y + rect.h / 2;
  const cx = Math.max(left, Math.min(entity.x, right));
  const cy = Math.max(top, Math.min(entity.y, bottom));
  const dx = entity.x - cx, dy = entity.y - cy;
  return dx * dx + dy * dy < entity.r * entity.r;
}

export function bounceFromRect(entity, rect, bounceFactor = 0.88) {
  const left = rect.x - rect.w / 2;
  const right = rect.x + rect.w / 2;
  const top = rect.y - rect.h / 2;
  const bottom = rect.y + rect.h / 2;

  const oL = Math.abs((entity.x + entity.r) - left);
  const oR = Math.abs(right - (entity.x - entity.r));
  const oT = Math.abs((entity.y + entity.r) - top);
  const oB = Math.abs(bottom - (entity.y - entity.r));
  const min = Math.min(oL, oR, oT, oB);

  if (min === oT && entity.vy > 0) {
    entity.y = top - entity.r - 1;
    entity.vy = -Math.abs(entity.vy) * bounceFactor - 4.8;
    entity.vx += (entity.x - rect.x) * 0.028;
  } else if (min === oB && entity.vy < 0) {
    entity.y = bottom + entity.r + 1;
    entity.vy = Math.abs(entity.vy) * bounceFactor + 2.2;
    entity.vx += (entity.x - rect.x) * 0.018;
  } else if (min === oL && entity.vx > 0) {
    entity.x = left - entity.r - 1;
    entity.vx = -Math.abs(entity.vx) * bounceFactor - 1.2;
    entity.vy -= 1.2;
  } else if (min === oR && entity.vx < 0) {
    entity.x = right + entity.r + 1;
    entity.vx = Math.abs(entity.vx) * bounceFactor + 1.2;
    entity.vy -= 1.2;
  } else {
    entity.vy = -Math.abs(entity.vy) * bounceFactor - 3.2;
  }
  entity.vx = Math.max(-13, Math.min(13, entity.vx));
  entity.vy = Math.max(-18, Math.min(18, entity.vy));
}

export function isInsideRect(px, py, rect) {
  return px > rect.x - rect.w / 2 && px < rect.x + rect.w / 2 &&
         py > rect.y - rect.h / 2 && py < rect.y + rect.h / 2;
}

export function crossedLine(prevY, curY, lineY, vy) {
  return prevY < lineY && curY >= lineY && vy > 0;
}

export function applyGravity(entity, gravity) {
  entity.vy += gravity;
  entity.px = entity.x;
  entity.py = entity.y;
  entity.x += entity.vx;
  entity.y += entity.vy;
}

export function isOutOfBounds(entity, W, H, margin = 5) {
  return entity.x < -entity.r * margin ||
         entity.x > W + entity.r * margin ||
         entity.y > H + entity.r * 8;
}

export function simulateTrajectory(startX, startY, vx, vy, gravity, objects, bounceFactor, steps = 160) {
  const sim = { x: startX, y: startY, px: startX, py: startY, vx, vy, r: 10, hitCooldown: 0 };
  const points = [{ x: startX, y: startY }];

  for (let i = 0; i < steps; i++) {
    sim.vy += gravity;
    sim.x += sim.vx;
    sim.y += sim.vy;
    sim.hitCooldown = Math.max(0, sim.hitCooldown - 1);

    if (sim.hitCooldown === 0) {
      for (const obj of objects) {
        if (hitTestRect(sim, obj)) {
          bounceFromRect(sim, obj, bounceFactor);
          sim.hitCooldown = 12;
          points.push({ x: sim.x, y: sim.y });
          break;
        }
      }
    }

    if (i % 2 === 0) points.push({ x: sim.x, y: sim.y });
    if (sim.x < -100 || sim.x > 3000 || sim.y > 2200) break;
  }
  return points;
}
