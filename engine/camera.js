export const COLOR_PRESETS = {
  yellow: { label: 'vang', hue: 55, glow: '#fbbf24', base: 'rgba(251,191,36,0.18)', rgb: [251, 191, 36] },
  pink:   { label: 'hong', hue: 325, glow: '#ec4899', base: 'rgba(236,72,153,0.18)', rgb: [236, 72, 153] },
  green:  { label: 'xanh la', hue: 125, glow: '#10b981', base: 'rgba(16,185,129,0.18)', rgb: [16, 185, 129] },
  blue:   { label: 'xanh duong', hue: 215, glow: '#3b82f6', base: 'rgba(59,130,246,0.18)', rgb: [59, 130, 246] },
};

const SMOOTHING = 0.72;

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hueDist(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

export class CameraDetector {
  constructor() {
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.stream = null;

    this.hidden = document.createElement('canvas');
    this.hctx = this.hidden.getContext('2d', { willReadFrequently: true });

    this.maskCanvas = document.createElement('canvas');
    this.mctx = this.maskCanvas.getContext('2d');

    this.frozen = false;
    this.frozenObjects = [];
    this.stableObjects = [];

    this.settings = {
      color: 'yellow',
      sensitivity: 60,
      minSize: 35,
      maxObjects: 4,
    };
  }

  async start(deviceId = null) {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    const constraints = { video: { width: 640, height: 360 }, audio: false };
    if (deviceId) constraints.video.deviceId = { exact: deviceId };
    else constraints.video.facingMode = 'environment';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      return true;
    } catch (e) {
      console.error('Camera error:', e);
      return false;
    }
  }

  async listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  }

  freeze() {
    this.frozen = true;
    this.frozenObjects = this.stableObjects.map(o => ({ ...o }));
  }

  unfreeze() {
    this.frozen = false;
    this.frozenObjects = [];
  }

  toggleFreeze() {
    if (this.frozen) this.unfreeze(); else this.freeze();
  }

  getObjects() {
    return this.frozen && this.frozenObjects.length ? this.frozenObjects : this.stableObjects;
  }

  detect(W, H) {
    if (this.frozen && this.frozenObjects.length) return this.frozenObjects;
    if (this.video.readyState < 2) return [];

    const vw = this.hidden.width = 192;
    const vh = this.hidden.height = 108;
    this.hctx.save();
    this.hctx.scale(-1, 1);
    this.hctx.drawImage(this.video, -vw, 0, vw, vh);
    this.hctx.restore();

    const img = this.hctx.getImageData(0, 0, vw, vh);
    const data = img.data;
    const preset = COLOR_PRESETS[this.settings.color];
    const sens = this.settings.sensitivity;
    const minPx = this.settings.minSize;
    const maxObj = this.settings.maxObjects;
    const hueTol = 12 + (100 - sens) * 0.45;

    const mask = new Uint8Array(vw * vh);
    for (let y = 0; y < vh; y++) {
      for (let x = 0; x < vw; x++) {
        const i = (y * vw + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const { h, s, v } = rgbToHsv(r, g, b);
        const ok = v > 0.28 && s > 0.28 && hueDist(h, preset.hue) < hueTol;
        const yGuard = this.settings.color !== 'yellow' || (r > 120 && g > 95 && b < 145 && r > b * 1.15 && g > b * 1.1);
        if (ok && yGuard) mask[y * vw + x] = 1;
      }
    }

    this._renderMask(mask, data, vw, vh, preset);

    const components = this._findComponents(mask, vw, vh, minPx, maxObj);
    const newObjects = components.map(c => {
      const cx = (c.minX + c.maxX) / 2 / vw * W;
      const cy = (c.minY + c.maxY) / 2 / vh * H;
      const bw = Math.max(70, (c.maxX - c.minX) / vw * W * 1.35);
      const bh = Math.max(30, (c.maxY - c.minY) / vh * H * 1.65);
      return { x: cx, y: cy, w: bw, h: bh, count: c.count, colorName: preset.label, life: 4 };
    });

    this.stableObjects = this._smooth(newObjects);
    return this.getObjects();
  }

  _renderMask(mask, data, vw, vh, preset) {
    this.maskCanvas.width = vw;
    this.maskCanvas.height = vh;
    const img = this.mctx.createImageData(vw, vh);
    const d = img.data;
    const mc = preset.rgb;
    for (let i = 0; i < mask.length; i++) {
      const idx = i * 4;
      if (mask[i]) {
        d[idx] = mc[0]; d[idx + 1] = mc[1]; d[idx + 2] = mc[2]; d[idx + 3] = 255;
      } else {
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 * 0.2;
        d[idx] = d[idx + 1] = d[idx + 2] = gray; d[idx + 3] = 255;
      }
    }
    this.mctx.putImageData(img, 0, 0);
  }

  _findComponents(mask, vw, vh, minPx, maxObj) {
    const visited = new Uint8Array(vw * vh);
    const components = [];
    const qx = [], qy = [];

    for (let sy = 0; sy < vh; sy++) {
      for (let sx = 0; sx < vw; sx++) {
        if (!mask[sy * vw + sx] || visited[sy * vw + sx]) continue;
        let head = 0;
        qx.length = 0; qy.length = 0;
        qx.push(sx); qy.push(sy);
        visited[sy * vw + sx] = 1;
        let minX = sx, minY = sy, maxX = sx, maxY = sy, count = 0;

        while (head < qx.length) {
          const x = qx[head], y = qy[head]; head++;
          count++;
          if (x < minX) minX = x; if (y < minY) minY = y;
          if (x > maxX) maxX = x; if (y > maxY) maxY = y;
          for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
            if (nx < 0 || nx >= vw || ny < 0 || ny >= vh) continue;
            const ni = ny * vw + nx;
            if (mask[ni] && !visited[ni]) { visited[ni] = 1; qx.push(nx); qy.push(ny); }
          }
        }

        const bw = maxX - minX + 1, bh = maxY - minY + 1;
        if (count >= minPx && bw >= 3 && bh >= 3 && count <= vw * vh * 0.35) {
          components.push({ minX, minY, maxX, maxY, count });
        }
      }
    }
    return components.sort((a, b) => b.count - a.count).slice(0, maxObj);
  }

  _smooth(newObjects) {
    const used = new Set();
    const result = [];

    for (const old of this.stableObjects) {
      let bestIdx = -1, bestDist = Infinity;
      for (let i = 0; i < newObjects.length; i++) {
        if (used.has(i)) continue;
        const d = Math.hypot(old.x - newObjects[i].x, old.y - newObjects[i].y);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx !== -1 && bestDist < 180) {
        const n = newObjects[bestIdx];
        used.add(bestIdx);
        result.push({
          ...n,
          x: old.x * SMOOTHING + n.x * (1 - SMOOTHING),
          y: old.y * SMOOTHING + n.y * (1 - SMOOTHING),
          w: old.w * SMOOTHING + n.w * (1 - SMOOTHING),
          h: old.h * SMOOTHING + n.h * (1 - SMOOTHING),
          life: Math.min((old.life || 0) + 1, 10),
        });
      } else if ((old.life || 0) > 0) {
        result.push({ ...old, life: old.life - 1 });
      }
    }
    for (let i = 0; i < newObjects.length; i++) {
      if (!used.has(i)) result.push({ ...newObjects[i], life: 4 });
    }
    return result.sort((a, b) => b.count - a.count).slice(0, this.settings.maxObjects);
  }
}
