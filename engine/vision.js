const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const OBJECT_MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/latest/efficientdet_lite0.tflite';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

let _vision = null;

async function getVision() {
  if (_vision) return _vision;
  const { FilesetResolver } = await import(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
  );
  _vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return _vision;
}

export class VisionEngine {
  constructor() {
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.stream = null;
    this.objectDetector = null;
    this.handLandmarker = null;
    this._ready = false;
  }

  async initObjectDetection(opts = {}) {
    const vision = await getVision();
    const { ObjectDetector } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
    );
    this.objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: OBJECT_MODEL },
      runningMode: 'VIDEO',
      scoreThreshold: opts.scoreThreshold || 0.25,
      maxResults: opts.maxResults || 20,
    });
  }

  async initHandTracking(opts = {}) {
    const vision = await getVision();
    const { HandLandmarker } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
    );
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL },
      runningMode: 'VIDEO',
      numHands: opts.numHands || 2,
    });
  }

  async startCamera(deviceId = null) {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    // Try requested config first, then fallback to simple constraints
    const configs = [
      deviceId
        ? { video: { deviceId: { exact: deviceId }, width: 640, height: 480 }, audio: false }
        : { video: { facingMode: 'environment', width: 640, height: 480 }, audio: false },
      { video: { width: 640, height: 480 }, audio: false },
      { video: true, audio: false },
    ];
    for (const constraints of configs) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;
        await Promise.race([
          new Promise(r => { this.video.onloadeddata = r; }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Video timeout')), 8000)),
        ]);
        this._ready = true;
        return true;
      } catch (e) {
        console.warn('Camera attempt failed:', constraints, e.message);
      }
    }
    console.error('All camera configs failed');
    return false;
  }

  get ready() {
    return this._ready && this.video.readyState >= 2;
  }

  detectObjects(timestamp) {
    if (!this.objectDetector || !this.ready) return { detections: [] };
    return this.objectDetector.detectForVideo(this.video, timestamp);
  }

  detectHands(timestamp) {
    if (!this.handLandmarker || !this.ready) return { landmarks: [], handedness: [] };
    return this.handLandmarker.detectForVideo(this.video, timestamp);
  }

  getObjectsInZone(detections, zone) {
    const vw = this.video.videoWidth || 640;
    const vh = this.video.videoHeight || 480;
    return detections.filter(d => {
      const bb = d.boundingBox;
      const cx = (bb.originX + bb.width / 2) / vw;
      const cy = (bb.originY + bb.height / 2) / vh;
      return cx >= zone.x && cx <= zone.x + zone.w &&
             cy >= zone.y && cy <= zone.y + zone.h;
    });
  }

  countObjectsInZone(timestamp, zone) {
    const result = this.detectObjects(timestamp);
    return this.getObjectsInZone(result.detections, zone);
  }

  countFingers(landmarks) {
    if (!landmarks || landmarks.length === 0) return 0;
    const hand = landmarks[0];
    const tips = [4, 8, 12, 16, 20];
    const pips = [3, 6, 10, 14, 18];
    let count = 0;
    // Thumb: compare tip.x vs pip.x (depends on handedness but simplified)
    if (Math.abs(hand[4].x - hand[3].x) > 0.04) count++;
    // Other fingers: tip.y < pip.y means extended
    for (let i = 1; i < 5; i++) {
      if (hand[tips[i]].y < hand[pips[i]].y) count++;
    }
    return count;
  }

  isHandOpen(landmarks) {
    return this.countFingers(landmarks) >= 4;
  }

  isWaving(landmarks, prevLandmarks) {
    if (!landmarks || !prevLandmarks || landmarks.length === 0 || prevLandmarks.length === 0) return false;
    const curr = landmarks[0][8]; // index finger tip
    const prev = prevLandmarks[0][8];
    return Math.abs(curr.x - prev.x) > 0.06;
  }

  getHandCenter(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;
    const hand = landmarks[0];
    let x = 0, y = 0;
    for (const p of hand) { x += p.x; y += p.y; }
    return { x: x / hand.length, y: y / hand.length };
  }

  getDominantColor(region) {
    // Analyze dominant color from video frame within a bounding box
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const vw = this.video.videoWidth || 640;
    const vh = this.video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    ctx.drawImage(this.video, 0, 0);

    const x = Math.floor(region.originX);
    const y = Math.floor(region.originY);
    const w = Math.floor(region.width);
    const h = Math.floor(region.height);
    if (w <= 0 || h <= 0) return 'unknown';

    const data = ctx.getImageData(x, y, w, h).data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
      rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]; count++;
    }
    if (count === 0) return 'unknown';
    const r = rSum / count, g = gSum / count, b = bSum / count;
    return classifyColor(r, g, b);
  }

  destroy() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.objectDetector) this.objectDetector.close();
    if (this.handLandmarker) this.handLandmarker.close();
  }
}

function classifyColor(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = ((h * 60) + 360) % 360;
  const s = max === 0 ? 0 : d / max;
  const v = max / 255;

  if (v < 0.2) return 'den';
  if (s < 0.15 && v > 0.7) return 'trang';
  if (s < 0.15) return 'xam';
  if (h < 15 || h > 340) return 'do';
  if (h < 45) return 'cam';
  if (h < 70) return 'vang';
  if (h < 160) return 'xanh la';
  if (h < 250) return 'xanh duong';
  if (h < 300) return 'tim';
  return 'hong';
}
