import { COLOR_PRESETS } from './camera.js';
import { simulateTrajectory } from './physics.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 0;
    this.H = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.W = this.canvas.width = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
  }

  clear(bg = '#09070f') {
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  drawGrid(alpha = 0.08, gap = 56) {
    const { ctx, W, H } = this;
    ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gap) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  drawCollider(obj, index, colorKey = 'yellow', frozen = false) {
    const { ctx } = this;
    const preset = COLOR_PRESETS[colorKey] || COLOR_PRESETS.yellow;
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.fillStyle = preset.base;
    ctx.strokeStyle = frozen ? '#f43f5e' : preset.glow;
    ctx.lineWidth = frozen ? 5 : 3;
    ctx.shadowBlur = frozen ? 20 : 12;
    ctx.shadowColor = frozen ? '#f43f5e' : preset.glow;
    ctx.beginPath();
    ctx.roundRect(-obj.w / 2, -obj.h / 2, obj.w, obj.h, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${frozen ? 'KHOA' : 'TUONG'} ${index + 1}`, 0, 5);
    ctx.restore();
  }

  drawBall(ball) {
    const { ctx } = this;
    if (ball.trail && ball.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
      for (let i = 1; i < ball.trail.length; i++) ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
      ctx.strokeStyle = ball.color.replace('hsl', 'hsla').replace(')', ',0.35)');
      ctx.lineWidth = ball.r * 1.1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  drawEmoji(emoji, x, y, size) {
    const { ctx } = this;
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
  }

  drawEntity(entity) {
    if (entity.emoji) {
      this.drawEmoji(entity.emoji, entity.x, entity.y, entity.r * 2);
    } else {
      this.drawBall(entity);
    }
  }

  drawParticles(particles) {
    const { ctx } = this;
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloatingTexts(texts) {
    const { ctx } = this;
    ctx.font = "bold 24px 'Orbitron',sans-serif";
    ctx.textAlign = 'center';
    for (const f of texts) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color || '#10b981';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawLaunchPoint(x, y, radius, label = 'LAUNCH POINT') {
    const { ctx } = this;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#818cf8';
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(129,140,248,0.2)';
    ctx.fill();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = "bold 13px 'Orbitron',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - radius - 14);
    ctx.restore();
  }

  drawTrajectory(startX, startY, vx, vy, gravity, objects, bounceFactor) {
    const points = simulateTrajectory(startX, startY, vx, vy, gravity, objects, bounceFactor);
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(129,140,248,0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 8]);
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  }

  drawArrow(x1, y1, x2, y2) {
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 14 * Math.cos(angle - 0.55), y2 - 14 * Math.sin(angle - 0.55));
    ctx.lineTo(x2 - 14 * Math.cos(angle + 0.55), y2 - 14 * Math.sin(angle + 0.55));
    ctx.closePath();
    ctx.fill();
  }

  drawBasket(x, y, w, h) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-w * 0.7, -h * 1.2, w * 1.4, h * 1.5, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-w * 0.35, -h * 0.9, w * 0.7, h * 0.6, 6);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + w * t, -h / 2);
      ctx.lineTo((-w / 2 + 18) + (w - 36) * t, h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w / 2 - w * t, -h / 2);
      ctx.lineTo((w / 2 - 18) - (w - 36) * t, h / 2);
      ctx.stroke();
    }

    ctx.strokeStyle = '#f97316';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#f97316';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = "bold 20px 'Orbitron',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('RO', 0, -h / 2 - 16);
    ctx.restore();
  }

  drawBin(x, y, w, h, label, color = '#6366f1') {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.stroke();

    ctx.fillStyle = color.replace(')', ',0.15)').replace('rgb', 'rgba');
    ctx.fillRect(-w / 2, -h / 2, w, h);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = "bold 16px 'Orbitron',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 6);
    ctx.restore();
  }

  drawLetterSlot(x, y, size, letter = '', filled = false) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = filled ? '#10b981' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, 8);
    ctx.stroke();
    if (filled) {
      ctx.fillStyle = 'rgba(16,185,129,0.15)';
      ctx.fill();
    }
    if (letter) {
      ctx.fillStyle = filled ? '#10b981' : 'rgba(255,255,255,0.5)';
      ctx.font = `bold ${size * 0.6}px 'Orbitron',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 0, 0);
    }
    ctx.restore();
  }

  drawPlatform(obj, index, colorKey, frozen) {
    const { ctx } = this;
    const preset = COLOR_PRESETS[colorKey] || COLOR_PRESETS.yellow;
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.fillStyle = frozen ? 'rgba(244,63,94,0.2)' : preset.base;
    ctx.strokeStyle = frozen ? '#f43f5e' : preset.glow;
    ctx.lineWidth = frozen ? 4 : 3;
    ctx.shadowBlur = frozen ? 16 : 10;
    ctx.shadowColor = frozen ? '#f43f5e' : preset.glow;
    ctx.beginPath();
    ctx.roundRect(-obj.w / 2, -obj.h / 2, obj.w, obj.h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }
}
