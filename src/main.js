import * as THREE from '../vendor/three.module.js'

/* ============================================================
   ORBITAL // KESSLER PROTOCOL
   A 3D satellite-warfare hacking game for desktop and touch.
   ============================================================ */

const $ = id => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const rand = (a, b) => a + Math.random() * (b - a)
const pick = arr => arr[(Math.random() * arr.length) | 0]
const TAU = Math.PI * 2
const DEG = Math.PI / 180
const EARTH_R = 10
const STATION_LAT = 38.9
const STATION_LON = -77.0
const SUN = new THREE.Vector3(-0.55, 0.34, 0.76).normalize()

const SAT_DEFS = [
  {
    id: 'argus', name: 'ARGUS-7', cls: 'RECON', orbit: 'LEO', band: 'X-BAND', alt: '780 KM',
    sec: 1, inc: 53, raan: 20, radius: 12.45, period: 74, startDot: 0.88,
    dossier: 'Battlefield reconnaissance platform. Its electro-optical downlink is feeding live targeting imagery to enemy fires.',
    bonus: 'IMINT FEED CRACKED // TRACE GROWTH REDUCED',
    symbols: ['◆', '▲', '✚', '■'],
  },
  {
    id: 'vesper', name: 'VESPER-2', cls: 'COMMS', orbit: 'MEO', band: 'Ka-BAND', alt: '8,400 KM',
    sec: 2, inc: 57, raan: 96, radius: 13.75, period: 108, startDot: 0.62,
    dossier: 'Wideband communications relay. Carries the encrypted fire-control backbone between the constellation and enemy batteries.',
    bonus: 'COMMS RELAY SEIZED // TRACE GROWTH REDUCED',
    symbols: ['●', '◇', '✦', '▲'],
  },
  {
    id: 'nomad', name: 'NOMAD-6', cls: 'NAVIGATION', orbit: 'LEO', band: 'L-BAND', alt: '620 KM',
    sec: 2, inc: 82, raan: 192, radius: 12.7, period: 86, startDot: 0.31,
    dossier: 'Precision navigation bird. Its timing signal guides long-range munitions through terrain masking.',
    bonus: 'PNT SIGNAL SPOOFED // TRACE GROWTH REDUCED',
    symbols: ['▲', '■', '◆', '◉'],
  },
  {
    id: 'talon', name: 'TALON-4', cls: 'EARLY WARNING', orbit: 'LEO', band: 'S-BAND', alt: '1,100 KM',
    sec: 3, inc: 46, raan: 304, radius: 13.15, period: 96, startDot: 0.73,
    dossier: 'Space-based early-warning radar. It sweeps the horizon for launches and relays cueing data to interceptor batteries.',
    bonus: 'EW THREAT LIBRARY STOLEN // TRACE GROWTH REDUCED',
    symbols: ['✦', '◉', '▲', '◇'],
  },
  {
    id: 'helios', name: 'HELIOS-9', cls: 'SIGINT', orbit: 'GEO', band: 'Ku-BAND', alt: '35,786 KM',
    sec: 4, inc: 7, raan: 0, radius: 15.45, period: 230, startDot: 0.44,
    dossier: 'Geostationary signals-intelligence collector. Hardened command link. Persistent coverage makes it the highest-value target in the net.',
    bonus: 'SIGINT ARCHIVE EXFILTRATED // TRACE GROWTH REDUCED',
    symbols: ['■', '◆', '✦', '◉'],
  },
  {
    id: 'kestrel', name: 'KESTREL-1', cls: 'C2 / ASAT', orbit: 'GEO', band: 'X-BAND', alt: '36,100 KM',
    sec: 5, inc: 9, raan: 42, radius: 15.8, period: 248, startDot: 0.20,
    dossier: 'Constellation command node and anti-satellite platform. Black-hardened TT&C. Seizing it would decapitate Kestrel Net.',
    bonus: 'KESTREL C2 CAPTURED // ENEMY NETWORK DEGRADED',
    symbols: ['◉', '✦', '◆', '●'],
  },
]

const SEC_LABEL = ['', 'LOW', 'GUARDED', 'HARDENED', 'ELITE', 'BLACK']
const SEC_CLASS = ['', 'low', 'low', 'mid', 'high', 'high']

const store = {
  phase: 'title',
  trace: 5,
  intel: 0,
  time: 0,
  selected: null,
  hack: null,
  counter: null,
  nextCounter: 34,
  spoofReady: 0,
  endAt: 0,
  helpReturn: 'playing',
  started: false,
}
const stats = { hacked: [], maxTrace: 5 }

const ui = {
  app: $('app'),
  canvas: $('scene'),
  hud: $('hud'),
  title: $('titleScreen'),
  titleClock: $('titleClock'),
  startBtn: $('startBtn'),
  pause: $('pauseScreen'),
  help: $('helpScreen'),
  end: $('endScreen'),
  panel: $('panel'),
  markers: $('markers'),
  targetRail: $('targetRail'),
  log: $('log'),
  coach: $('coach'),
  coachText: $('coachText'),
  toasts: $('toasts'),
  counter: $('counterAlert'),
  purgeBtn: $('purgeBtn'),
  purgeTimer: $('purgeTimer'),
  counterFill: $('counterFill'),
  tracePct: $('tracePct'),
  traceFill: $('traceFill'),
  traceTrack: $('traceTrack'),
  spoofBtn: $('spoofBtn'),
  spoofCd: $('spoofCd'),
  intelPips: [...document.querySelectorAll('#intelPips i')],
  intelCount: $('intelCount'),
  flash: $('flash'),
  rotateHint: $('rotateHint'),
  panelName: $('panelName'),
  panelKicker: $('panelKicker'),
  panelClass: $('panelClass'),
  panelOrbit: $('panelOrbit'),
  panelBand: $('panelBand'),
  panelSec: $('panelSec'),
  panelSecNum: $('panelSecNum'),
  panelElev: $('panelElev'),
  panelPass: $('panelPass'),
  panelDossier: $('panelDossier'),
  hookView: $('hookView'),
  breachView: $('breachView'),
  securedView: $('securedView'),
  hookState: $('hookState'),
  freqZone: $('freqZone'),
  freqNeedle: $('freqNeedle'),
  lockPips: [...document.querySelectorAll('#lockPips i')],
  lockLabel: $('lockLabel'),
  lockBtn: $('lockBtn'),
  hookHint: $('hookHint'),
  abortHook: $('abortHook'),
  abortBreach: $('abortBreach'),
  breachState: $('breachState'),
  layerStrip: [...document.querySelectorAll('#layerStrip i')],
  protoRow: $('protoRow'),
  breachGrid: $('breachGrid'),
  layerTime: $('layerTime'),
  layerTimerFill: $('layerTimerFill'),
  securedCopy: $('securedCopy'),
  securedBonus: $('securedBonus'),
  securedClose: $('securedClose'),
  closePanel: $('closePanel'),
  pauseBtn: $('pauseBtn'),
  resumeBtn: $('resumeBtn'),
  pauseRestart: $('pauseRestart'),
  audioBtn: $('audioBtn'),
  fsBtn: $('fsBtn'),
  helpBtn: $('hudHelp'),
  helpClose: $('helpClose'),
  redeployBtn: $('redeployBtn'),
  endKicker: $('endKicker'),
  endTitle: $('endTitle'),
  endCopy: $('endCopy'),
  statIntel: $('statIntel'),
  statTime: $('statTime'),
  statTrace: $('statTrace'),
  statScore: $('statScore'),
  endSats: $('endSats'),
  endNote: document.querySelector('.end-note'),
  purgeLabel: $('purgeBtn'),
}

/* ============================================================
   AUDIO — small synthesized tactical soundscape
   ============================================================ */
class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.drone = null
    this.muted = false
  }
  init() {
    if (this.ctx) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.24
    this.master.connect(this.ctx.destination)
    this.startDrone()
  }
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }
  setMuted(m) {
    this.muted = m
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.24, this.ctx.currentTime, 0.05)
  }
  startDrone() {
    if (!this.ctx || this.drone) return
    const g = this.ctx.createGain()
    g.gain.value = 0.034
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 190
    const a = this.ctx.createOscillator()
    a.type = 'sawtooth'; a.frequency.value = 55
    const b = this.ctx.createOscillator()
    b.type = 'sine'; b.frequency.value = 82.4
    const c = this.ctx.createOscillator()
    c.type = 'sine'; c.frequency.value = 110.2
    const cg = this.ctx.createGain(); cg.gain.value = 0.22
    a.connect(filter); b.connect(filter); c.connect(cg); cg.connect(filter)
    filter.connect(g); g.connect(this.master)
    a.start(); b.start(); c.start()
    this.drone = { g }
  }
  tone(freq, dur = 0.12, type = 'sine', gain = 0.18, slide = null, delay = 0) {
    if (!this.ctx || this.muted) return
    const t0 = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g); g.connect(this.master)
    osc.start(t0); osc.stop(t0 + dur + 0.02)
  }
  noise(dur = 0.16, gain = 0.16, freq = 900) {
    if (!this.ctx || this.muted) return
    const len = Math.floor(this.ctx.sampleRate * dur)
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 0.8
    const g = this.ctx.createGain(); g.gain.value = gain
    src.connect(filter); filter.connect(g); g.connect(this.master)
    src.start()
  }
  click() { this.tone(1500, 0.045, 'triangle', 0.07) }
  lock(step) { this.tone(620 + step * 160, 0.1, 'sine', 0.2); this.tone(930 + step * 180, 0.16, 'triangle', 0.1, null, 0.06) }
  miss() { this.tone(150, 0.18, 'sawtooth', 0.14, 90); this.noise(0.1, 0.08, 400) }
  breach() { this.tone(520, 0.12, 'triangle', 0.14); this.tone(780, 0.22, 'sine', 0.12, null, 0.1) }
  wrong() { this.tone(110, 0.14, 'square', 0.1, 70); this.noise(0.12, 0.1, 300) }
  capture() {
    ;[523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'sine', 0.16, null, i * 0.09))
    this.tone(130, 0.5, 'sine', 0.12, 90)
  }
  alarm() {
    this.tone(880, 0.2, 'square', 0.11)
    this.tone(660, 0.24, 'square', 0.1, null, 0.24)
    this.tone(880, 0.2, 'square', 0.09, null, 0.52)
  }
  purge() { this.tone(300, 0.3, 'sine', 0.18, 900); this.noise(0.2, 0.1, 1600) }
  spoof() { this.tone(900, 0.26, 'sine', 0.16, 260); this.noise(0.2, 0.08, 2400) }
  win() {
    ;[392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.13, null, i * 0.12))
  }
  lose() {
    ;[330, 262, 196, 147].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.1, Math.max(70, f * 0.75), i * 0.16))
    this.noise(0.8, 0.12, 220)
  }
}
const audio = new AudioEngine()

/* ============================================================
   THREE.JS WORLD
   ============================================================ */
const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
})
renderer.setClearColor(0x010305, 1)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 500)

const stationDir = new THREE.Vector3(
  Math.cos(STATION_LAT * DEG) * Math.sin(STATION_LON * DEG),
  Math.sin(STATION_LAT * DEG),
  Math.cos(STATION_LAT * DEG) * Math.cos(STATION_LON * DEG),
).normalize()
const stationYaw = Math.atan2(stationDir.x, stationDir.z)

const view = {
  yaw: stationYaw,
  pitch: 0.4,
  targetYaw: stationYaw,
  targetPitch: 0.4,
  zoom: 1,
  baseDist: 34,
  fov: 46,
  auto: 0,
  dragVX: 0,
  dragVY: 0,
}

const world = {
  sats: [],
  markers: new Map(),
  rail: new Map(),
  siteMarker: null,
  reticle: null,
  beam: null,
  beamLine: null,
  beamParticles: null,
  effects: [],
  clock: 0,
}

/* ---------- procedural textures ---------- */
function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 31)
  grad.addColorStop(0, inner)
  grad.addColorStop(0.28, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
const GLOW_TEX = glowTexture()

function solarTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#0b2d42')
  grad.addColorStop(1, '#06141f')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 128)
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const px = x * 32 + 2
      const py = y * 32 + 2
      const cell = g.createLinearGradient(px, py, px + 28, py + 28)
      cell.addColorStop(0, '#15546f')
      cell.addColorStop(0.55, '#0a3149')
      cell.addColorStop(1, '#0d435c')
      g.fillStyle = cell
      g.fillRect(px, py, 28, 28)
      g.strokeStyle = 'rgba(103,203,214,.55)'
      g.lineWidth = 1
      g.strokeRect(px + 0.5, py + 0.5, 27, 27)
      g.fillStyle = 'rgba(145,235,245,.18)'
      g.fillRect(px + 2, py + 2, 24, 1)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
const SOLAR_TEX = solarTexture()

/* ---------- starfield ---------- */
function makeStars() {
  const group = new THREE.Group()
  const counts = [{ n: 1700, size: 0.55, opacity: 0.72 }, { n: 260, size: 1.25, opacity: 0.85 }, { n: 34, size: 2.2, opacity: 0.95 }]
  for (const layer of counts) {
    const positions = new Float32Array(layer.n * 3)
    const colors = new Float32Array(layer.n * 3)
    for (let i = 0; i < layer.n; i++) {
      const r = rand(80, 210)
      const theta = rand(0, TAU)
      const phi = Math.acos(rand(-1, 1))
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const tint = Math.random()
      const c = tint > 0.92 ? [1, 0.82, 0.62] : tint > 0.8 ? [0.56, 0.84, 1] : [0.78, 0.9, 0.94]
      const b = rand(0.55, 1)
      colors[i * 3] = c[0] * b
      colors[i * 3 + 1] = c[1] * b
      colors[i * 3 + 2] = c[2] * b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({
      size: layer.size, map: GLOW_TEX, vertexColors: true, transparent: true,
      opacity: layer.opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    })
    group.add(new THREE.Points(geo, mat))
  }
  return group
}
scene.add(makeStars())

/* ---------- earth ---------- */
const earthUniforms = {
  uSun: { value: SUN },
  uTime: { value: 0 },
}

const earthMat = new THREE.ShaderMaterial({
  uniforms: earthUniforms,
  vertexShader: /* glsl */`
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying vec3 vPos;
    void main() {
      vPos = position;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 uSun;
    uniform float uTime;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying vec3 vPos;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.03 + vec3(1.71, 4.13, 2.77);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 p = normalize(vPos);
      vec3 n = normalize(vNormalW);
      float h = fbm(p * 2.35 + vec3(7.1, 2.4, 5.3));
      float detail = fbm(p * 6.7 + vec3(2.7, 8.2, 1.4));
      float shape = h + detail * 0.11;

      float landMask = smoothstep(0.505, 0.552, shape);
      float shelf = smoothstep(0.462, 0.512, shape);
      float ice = smoothstep(0.80, 0.93, abs(p.y) + (detail - 0.5) * 0.16);

      vec3 deep = vec3(0.006, 0.030, 0.062);
      vec3 shallow = vec3(0.012, 0.105, 0.138);
      vec3 ocean = mix(deep, shallow, shelf);

      float elev = smoothstep(0.49, 0.67, h * 0.62 + detail * 0.52);
      vec3 lowland = vec3(0.042, 0.125, 0.068);
      vec3 highland = vec3(0.17, 0.185, 0.105);
      vec3 desert = vec3(0.29, 0.24, 0.14);
      float arid = smoothstep(0.52, 0.72, fbm(p * 3.6 + vec3(11.2, 1.9, 4.3)));
      vec3 landCol = mix(lowland, highland, elev);
      landCol = mix(landCol, desert, arid * 0.45);
      landCol = mix(landCol, vec3(0.46, 0.52, 0.5), ice * 0.9);

      vec3 albedo = mix(ocean, landCol, landMask);
      albedo = mix(albedo, vec3(0.74, 0.84, 0.87), ice * 0.92);

      float day = smoothstep(-0.18, 0.34, dot(n, uSun));
      float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vWorld)), 0.0), 2.8);
      vec3 col = albedo * (0.045 + day * 1.15);
      col += vec3(0.07, 0.32, 0.36) * rim * (0.35 + day * 0.65);

      // city lights on the night side
      float cityNoise = fbm(p * 27.0 + vec3(3.0, 9.0, 2.0));
      float city = smoothstep(0.555, 0.685, cityNoise) * landMask * (1.0 - day) * (1.0 - ice);
      city *= smoothstep(0.0, 0.18, 1.0 - abs(p.y));
      col += vec3(1.0, 0.58, 0.24) * city * 0.9;

      // ocean sun glint
      vec3 hVec = normalize(uSun + normalize(cameraPosition - vWorld));
      float spec = pow(max(dot(n, hVec), 0.0), 70.0) * (1.0 - landMask) * day;
      col += vec3(0.55, 0.75, 0.82) * spec * 0.35;

      // faint day-side scatter
      col += vec3(0.03, 0.10, 0.13) * pow(max(dot(n, uSun), 0.0), 2.0) * 0.2;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
})
const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 112, 112), earthMat)
earth.rotation.y = 0
scene.add(earth)

const gridMat = new THREE.LineBasicMaterial({
  color: 0x4de0d4, transparent: true, opacity: 0.085,
  blending: THREE.AdditiveBlending, depthWrite: false,
})
function makeGrid() {
  const pts = []
  for (let lat = -60; lat <= 60; lat += 20) {
    const r = Math.cos(lat * DEG) * (EARTH_R + 0.018)
    const y = Math.sin(lat * DEG) * (EARTH_R + 0.018)
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * TAU
      const b = ((i + 1) / 96) * TAU
      pts.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r)
    }
  }
  for (let lon = 0; lon < 360; lon += 20) {
    for (let i = 0; i < 64; i++) {
      const a = -Math.PI / 2 + (i / 64) * Math.PI
      const b = -Math.PI / 2 + ((i + 1) / 64) * Math.PI
      const r = EARTH_R + 0.018
      pts.push(
        Math.cos(a) * Math.cos(lon * DEG) * r, Math.sin(a) * r, Math.cos(a) * Math.sin(lon * DEG) * r,
        Math.cos(b) * Math.cos(lon * DEG) * r, Math.sin(b) * r, Math.cos(b) * Math.sin(lon * DEG) * r,
      )
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return new THREE.LineSegments(geo, gridMat)
}
scene.add(makeGrid())

const cloudUniforms = { uSun: { value: SUN }, uTime: { value: 0 } }
const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R + 0.055, 80, 80),
  new THREE.ShaderMaterial({
    uniforms: cloudUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vPos;
      void main() {
        vPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uSun;
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vPos;
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 x) {
        vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.07 + vec3(3.1, 1.7, 5.2); a *= 0.5; }
        return v;
      }
      void main() {
        vec3 p = normalize(vPos);
        vec3 n = normalize(vNormalW);
        float drift = uTime * 0.0035;
        float c = fbm(p * 3.25 + vec3(drift, drift * 0.3, -drift * 0.2));
        float c2 = fbm(p * 7.4 + vec3(-drift * 1.7, 3.0, drift));
        float mask = smoothstep(0.50, 0.68, c * 0.82 + c2 * 0.28);
        float day = smoothstep(-0.22, 0.34, dot(n, uSun));
        vec3 col = mix(vec3(0.36, 0.47, 0.53), vec3(0.93, 0.99, 1.0), day);
        gl_FragColor = vec4(col, mask * (0.05 + day * 0.18));
      }
    `,
  }),
)
clouds.renderOrder = 1
scene.add(clouds)

const atmoMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(0x4bd9ff) } },
  side: THREE.BackSide,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  vertexShader: /* glsl */`
    varying vec3 vN;
    void main() {
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vN;
    uniform vec3 uColor;
    void main() {
      float intensity = pow(0.66 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.4);
      gl_FragColor = vec4(uColor, 1.0) * intensity * 0.9;
    }
  `,
})
const atmo = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R + 0.85, 64, 64), atmoMat)
atmo.renderOrder = 2
scene.add(atmo)

const outerAtmo = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R + 1.9, 48, 48),
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x1b9fc9) } },
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vN;
      void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vN;
      uniform vec3 uColor;
      void main() {
        float i = pow(0.42 - dot(vN, vec3(0.0, 0.0, 1.0)), 2.2);
        gl_FragColor = vec4(uColor, 1.0) * clamp(i, 0.0, 1.0) * 0.28;
      }
    `,
  }),
)
outerAtmo.renderOrder = 2
scene.add(outerAtmo)

/* ---------- lighting ---------- */
const sunLight = new THREE.DirectionalLight(0xdff6ff, 2.1)
sunLight.position.copy(SUN).multiplyScalar(80)
scene.add(sunLight)
const rimLight = new THREE.DirectionalLight(0x225f8a, 0.65)
rimLight.position.copy(SUN).multiplyScalar(-60)
scene.add(rimLight)
scene.add(new THREE.AmbientLight(0x24434a, 1.1))

/* ---------- ground station ---------- */
const stationGroup = new THREE.Group()
stationGroup.position.copy(stationDir).multiplyScalar(EARTH_R + 0.012)
stationGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stationDir)
scene.add(stationGroup)

const stationCoreMat = new THREE.MeshBasicMaterial({ color: 0x8bfff2, transparent: true, opacity: 0.95 })
const stationCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), stationCoreMat)
stationCore.position.y = 0.16
stationGroup.add(stationCore)

const stationPost = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.045, 0.42, 6),
  new THREE.MeshBasicMaterial({ color: 0x36d9c8, transparent: true, opacity: 0.62 }),
)
stationPost.position.y = 0.21
stationGroup.add(stationPost)

const stationBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.01, 0.065, 1.55, 8, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x5ff5e0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
)
stationBeam.position.y = 0.78
stationGroup.add(stationBeam)

const stationRings = []
for (let i = 0; i < 3; i++) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x5ff5e0, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 40), mat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.025
  ring.userData.phase = i / 3
  stationGroup.add(ring)
  stationRings.push(ring)
}

/* ---------- satellite construction ---------- */
function orbitBasis(incDeg, raanDeg) {
  const inc = incDeg * DEG
  const raan = raanDeg * DEG
  const normal = new THREE.Vector3(Math.sin(inc) * Math.sin(raan), Math.cos(inc), Math.sin(inc) * Math.cos(raan)).normalize()
  const u = new THREE.Vector3(Math.cos(raan), 0, -Math.sin(raan)).normalize()
  const v = new THREE.Vector3().crossVectors(normal, u).normalize()
  return { u, v, normal }
}

function posAtTheta(sat, theta) {
  return new THREE.Vector3()
    .addScaledVector(sat.u, Math.cos(theta))
    .addScaledVector(sat.v, Math.sin(theta))
    .multiplyScalar(sat.radius)
}

function elevationAtTheta(sat, theta) {
  const p = posAtTheta(sat, theta).normalize()
  return Math.asin(clamp(p.dot(stationDir), -1, 1)) / DEG
}

function findStartTheta(sat, targetDot) {
  let best = 0
  let bestScore = Infinity
  for (let i = 0; i < 900; i++) {
    const theta = (i / 900) * TAU
    const p = posAtTheta(sat, theta).normalize()
    const d = p.dot(stationDir)
    if (d < 0.04) continue
    const score = Math.abs(d - targetDot)
    if (score < bestScore) { bestScore = score; best = theta }
  }
  return best
}

function makeSatMesh(sat, def) {
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({
    color: 0xcfdcdc, metalness: 0.9, roughness: 0.26, emissive: 0x18383d, emissiveIntensity: 0.9,
  })
  const dark = new THREE.MeshStandardMaterial({
    color: 0x263b42, metalness: 0.75, roughness: 0.36, emissive: 0x0b2024, emissiveIntensity: 1,
  })
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: SOLAR_TEX, metalness: 0.5, roughness: 0.3,
    emissive: 0x0a2c3c, emissiveIntensity: 0.85,
  })
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.34, 0.58), metal)
  group.add(body)
  const foil = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.14, 0.59),
    new THREE.MeshStandardMaterial({ color: 0xd9b96a, metalness: 0.85, roughness: 0.38, emissive: 0x4a3410, emissiveIntensity: 0.55 }),
  )
  foil.position.y = 0.08
  group.add(foil)
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.18), dark)
  collar.position.z = -0.12
  group.add(collar)
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.05), dark)
    arm.position.set(side * 0.24, 0, 0)
    group.add(arm)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.018, 0.38), panelMat)
    panel.position.set(side * 0.68, 0, 0)
    group.add(panel)
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(panel.geometry),
      new THREE.LineBasicMaterial({ color: 0x9cecf3, transparent: true, opacity: 0.55 }),
    )
    panel.add(frame)
  }
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 12, 1, true), metal)
  dish.rotation.x = Math.PI / 2
  dish.position.z = 0.42
  group.add(dish)
  const dishRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.012, 5, 16),
    new THREE.MeshBasicMaterial({ color: 0x9cecf3, transparent: true, opacity: 0.65 }),
  )
  dishRim.position.z = 0.53
  group.add(dishRim)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 6), dark)
  mast.rotation.x = Math.PI / 2
  mast.position.z = 0.3
  group.add(mast)
  for (const side of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 5), dark)
    rod.position.set(side * 0.13, 0.05, -0.12)
    group.add(rod)
  }

  const lightMat = new THREE.MeshBasicMaterial({ color: def.id === 'kestrel' ? 0xff2038 : 0xff3b54 })
  const statusLight = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), lightMat)
  statusLight.position.set(0.15, 0.22, 0.12)
  group.add(statusLight)

  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xd8fffa, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
  }))
  beacon.scale.set(0.24, 0.24, 1)
  beacon.position.set(0.15, 0.22, 0.12)
  group.add(beacon)

  const glowMat = new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xff2f4f, transparent: true, opacity: 0.62,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
  })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.set(0.58, 0.58, 1)
  group.add(glow)

  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(0.82, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  )
  hit.userData.satId = sat.id
  group.add(hit)
  group.userData.satId = sat.id

  group.scale.setScalar(def.orbit === 'GEO' ? 2.0 : 1.72)
  return { group, glow, statusLight, lightMat }
}

function makeOrbitLine(sat) {
  const pts = []
  for (let i = 0; i <= 260; i++) {
    const p = posAtTheta(sat, (i / 260) * TAU)
    pts.push(p.x, p.y, p.z)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  const mat = new THREE.LineBasicMaterial({
    color: 0xff3654, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  return { line: new THREE.Line(geo, mat), mat }
}

function initSatellites() {
  for (const def of SAT_DEFS) {
    const { u, v } = orbitBasis(def.inc, def.raan)
    const sat = {
      ...def,
      u, v,
      speed: TAU / def.period,
      theta: 0,
      initialTheta: 0,
      dot: 0,
      elev: 0,
      above: true,
      captured: false,
      aos: null,
      los: null,
      mesh: null,
      glow: null,
      orbitMat: null,
      orbitLine: null,
    }
    sat.initialTheta = findStartTheta(sat, def.startDot)
    sat.theta = sat.initialTheta
    const built = makeSatMesh(sat, def)
    sat.mesh = built.group
    sat.glow = built.glow
    sat.glowMat = built.glow.material
    sat.statusLight = built.statusLight
    sat.lightMat = built.lightMat
    scene.add(sat.mesh)
    const orbit = makeOrbitLine(sat)
    sat.orbitLine = orbit.line
    sat.orbitMat = orbit.mat
    scene.add(sat.orbitLine)
    world.sats.push(sat)
  }
  syncSatPositions()
}
initSatellites()

function syncSatPositions() {
  for (const sat of world.sats) {
    const p = posAtTheta(sat, sat.theta)
    sat.mesh.position.copy(p)
    sat.mesh.lookAt(0, 0, 0)
    const d = p.clone().normalize().dot(stationDir)
    sat.dot = d
    sat.elev = Math.asin(clamp(d, -1, 1)) / DEG
    sat.above = sat.elev > 4
  }
}

/* ---------- selection reticle ---------- */
const reticle = new THREE.Group()
const reticleMat = new THREE.MeshBasicMaterial({
  color: 0x8bfff2, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
})
for (let i = 0; i < 3; i++) {
  const arc = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.15, 40, 1, i * TAU / 3 + 0.15, TAU / 3 - 0.3), reticleMat)
  reticle.add(arc)
}
for (let i = 0; i < 4; i++) {
  const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.24), reticleMat)
  const a = i * Math.PI / 2
  tick.position.set(Math.cos(a) * 1.34, Math.sin(a) * 1.34, 0)
  tick.rotation.z = a + Math.PI / 2
  reticle.add(tick)
}
const reticleDot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), reticleMat)
reticle.add(reticleDot)
reticle.visible = false
scene.add(reticle)
world.reticle = reticle

/* ---------- uplink beam ---------- */
const beamLineGeo = new THREE.BufferGeometry()
const beamLinePositions = new Float32Array(36 * 3)
beamLineGeo.setAttribute('position', new THREE.BufferAttribute(beamLinePositions, 3))
const beamLine = new THREE.Line(beamLineGeo, new THREE.LineBasicMaterial({
  color: 0x7dfff0, transparent: true, opacity: 0.5,
  blending: THREE.AdditiveBlending, depthWrite: false,
}))
beamLine.visible = false
scene.add(beamLine)
world.beamLine = beamLine

const beamParticleCount = 26
const beamParticleGeo = new THREE.BufferGeometry()
beamParticleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(beamParticleCount * 3), 3))
const beamParticles = new THREE.Points(beamParticleGeo, new THREE.PointsMaterial({
  color: 0xaffff4, size: 0.19, map: GLOW_TEX, transparent: true, opacity: 0.92,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
}))
beamParticles.visible = false
scene.add(beamParticles)
world.beamParticles = beamParticles
world.beamOffset = 0

/* ---------- capture effects ---------- */
function spawnBurst(position, color = 0x6dffc1) {
  for (let i = 0; i < 2; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 48), mat)
    mesh.position.copy(position)
    mesh.quaternion.copy(camera.quaternion)
    mesh.userData.age = -i * 0.16
    scene.add(mesh)
    world.effects.push({ mesh, mat, life: 1.3 })
  }
}

function updateEffects(dt) {
  for (let i = world.effects.length - 1; i >= 0; i--) {
    const fx = world.effects[i]
    fx.mesh.userData.age += dt
    const age = fx.mesh.userData.age
    if (age < 0) { fx.mesh.visible = false; continue }
    fx.mesh.visible = true
    const k = age / fx.life
    if (k >= 1) {
      scene.remove(fx.mesh)
      fx.mesh.geometry.dispose(); fx.mat.dispose()
      world.effects.splice(i, 1)
      continue
    }
    const s = 1 + age * 5.5
    fx.mesh.scale.set(s, s, s)
    fx.mat.opacity = (1 - k) * 0.85
    fx.mesh.quaternion.copy(camera.quaternion)
  }
}

/* ---------- marker helpers ---------- */
function isOccluded(pos) {
  const cam = camera.position
  const d = new THREE.Vector3().subVectors(pos, cam)
  const len2 = d.lengthSq()
  if (len2 < 1e-6) return false
  const t = -cam.dot(d) / len2
  if (t <= 0 || t >= 1) return false
  const closest = cam.clone().addScaledVector(d, t)
  return closest.length() < EARTH_R * 0.992
}

function project(pos) {
  const v = pos.clone().project(camera)
  return {
    x: (v.x * 0.5 + 0.5) * window.innerWidth,
    y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    z: v.z,
    visible: v.z > -1 && v.z < 1 && !isOccluded(pos),
  }
}

/* ---------- camera ---------- */
function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  if (w <= 720 && h > w) { camera.fov = 62; view.baseDist = 44 }
  else if (w <= 1000 || h <= 500) { camera.fov = 52; view.baseDist = 36 }
  else { camera.fov = 46; view.baseDist = 34 }
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
}
window.addEventListener('resize', resize)
resize()

function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 9)
  view.yaw = lerp(view.yaw, view.targetYaw, k)
  view.pitch = lerp(view.pitch, view.targetPitch, k)
  const p = clamp(view.pitch, -1.15, 1.15)
  const dist = view.baseDist * view.zoom
  camera.position.set(
    dist * Math.cos(p) * Math.sin(view.yaw),
    dist * Math.sin(p),
    dist * Math.cos(p) * Math.cos(view.yaw),
  )
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
}

function resetCamera(instant = true) {
  view.targetYaw = stationYaw
  view.targetPitch = 0.4
  view.zoom = 1
  if (instant) {
    view.yaw = stationYaw
    view.pitch = 0.4
  }
}

/* ---------- world tick ---------- */
function updateWorld(realDt, simDt) {
  world.clock += realDt
  earthUniforms.uTime.value = world.clock
  cloudUniforms.uTime.value = world.clock

  if (store.phase === 'title') view.targetYaw += realDt * 0.028

  if (simDt > 0) {
    for (const sat of world.sats) {
      sat.theta = (sat.theta + sat.speed * simDt) % TAU
    }
    syncSatPositions()
  }

  // station pulse
  for (const ring of stationRings) {
    const t = (world.clock * 0.42 + ring.userData.phase) % 1
    ring.scale.setScalar(1 + t * 7.5)
    ring.material.opacity = (1 - t) * 0.42
  }
  stationCore.rotation.y += realDt * 1.4
  stationCore.position.y = 0.16 + Math.sin(world.clock * 2) * 0.02

  // satellite glow pulse + reticle
  const sel = store.selected ? world.sats.find(s => s.id === store.selected) : null
  for (const sat of world.sats) {
    const pulse = 0.78 + Math.sin(world.clock * 2.2 + sat.radius) * 0.18
    sat.glowMat.opacity = sat.captured ? 0.55 : pulse
    const blink = 0.55 + (Math.sin(world.clock * 5 + sat.raan) > 0 ? 0.45 : 0)
    sat.lightMat.color.setHex(sat.captured ? 0x59f2a5 : 0xff3b54)
    sat.glowMat.color.setHex(sat.captured ? 0x59f2a5 : (sat.id === 'kestrel' ? 0xff1c36 : 0xff3654))
    sat.statusLight.scale.setScalar(blink)
  }
  if (sel) {
    reticle.visible = true
    reticle.position.copy(sel.mesh.position)
    reticle.quaternion.copy(camera.quaternion)
    const pulse = 1 + Math.sin(world.clock * 3) * 0.06
    reticle.scale.setScalar(pulse)
    reticle.rotation.z = world.clock * 0.35
    reticleMat.color.setHex(sel.captured ? 0x59f2a5 : 0x8bfff2)
    if (isOccluded(sel.mesh.position)) reticle.visible = false
  } else {
    reticle.visible = false
  }

  // uplink beam
  const hacking = store.hack && sel && store.phase === 'playing' && sel.above
  if (hacking) {
    const start = stationDir.clone().multiplyScalar(EARTH_R + 0.15)
    const end = sel.mesh.position
    const mid = start.clone().add(end).multiplyScalar(0.5)
    mid.normalize().multiplyScalar(Math.max(start.length(), end.length()) + 0.8)
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    const posAttr = beamLine.geometry.attributes.position
    const pts = curve.getPoints(35)
    for (let i = 0; i < pts.length; i++) {
      posAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z)
    }
    posAttr.needsUpdate = true
    beamLine.geometry.computeBoundingSphere()
    beamLine.visible = true

    world.beamOffset = (world.beamOffset + realDt * 0.22) % 1
    beamLine.material.opacity = 0.72
    const pAttr = beamParticles.geometry.attributes.position
    for (let i = 0; i < beamParticleCount; i++) {
      const t = (i / beamParticleCount + world.beamOffset) % 1
      const p = curve.getPoint(t)
      pAttr.setXYZ(i, p.x, p.y, p.z)
    }
    pAttr.needsUpdate = true
    beamParticles.geometry.computeBoundingSphere()
    beamParticles.visible = true
  } else {
    beamLine.visible = false
    beamParticles.visible = false
  }

  updateEffects(realDt)
  updateCamera(realDt)
}

/* ============================================================
   HUD / DOM
   ============================================================ */
const pad = n => String(n).padStart(2, '0')
function mmss(seconds) {
  if (seconds == null || !isFinite(seconds)) return '--:--'
  const s = Math.max(0, Math.round(seconds))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}
function fmtTime(seconds) {
  const s = Math.max(0, seconds)
  return `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`
}
function stamp() {
  return `T+${mmss(store.time)}`
}

function addLog(text, kind = '') {
  const line = document.createElement('div')
  line.className = `log-line ${kind}`
  line.innerHTML = `<span class="t">${stamp()}</span>${text}`
  ui.log.appendChild(line)
  while (ui.log.children.length > 5) ui.log.removeChild(ui.log.firstChild)
}
function toast(text, kind = '') {
  const el = document.createElement('div')
  el.className = `toast ${kind}`
  el.textContent = text
  ui.toasts.appendChild(el)
  while (ui.toasts.children.length > 3) ui.toasts.removeChild(ui.toasts.firstChild)
  setTimeout(() => { el.remove() }, 2600)
}
function flash() {
  ui.flash.classList.remove('fire')
  void ui.flash.offsetWidth
  ui.flash.classList.add('fire')
}
function setHudVisible(v) {
  ui.hud.classList.toggle('active', v)
  ui.hud.setAttribute('aria-hidden', v ? 'false' : 'true')
}

/* ---------- markers ---------- */
function buildMarkers() {
  for (const sat of world.sats) {
    const el = document.createElement('button')
    el.className = 'marker'
    el.style.left = '50%'
    el.style.top = '50%'
    el.setAttribute('aria-label', `Select hostile satellite ${sat.name}`)
    el.innerHTML = `
      <span class="m-dot" aria-hidden="true"></span>
      <span class="m-body">
        <span class="m-name">${sat.name}</span>
        <span class="m-sub">EL --°</span>
      </span>
      <span class="m-bars" aria-hidden="true"><i></i><i></i><i></i></span>
    `
    el.addEventListener('pointerdown', e => e.stopPropagation())
    el.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      if (store.phase === 'playing' || store.phase === 'ending') {
        audio.resume()
        selectSat(sat.id)
      }
    })
    ui.markers.appendChild(el)
    world.markers.set(sat.id, { el, sub: el.querySelector('.m-sub') })

    const chip = document.createElement('button')
    chip.className = 'rail-chip'
    chip.setAttribute('aria-label', `Select hostile satellite ${sat.name}`)
    chip.innerHTML = `
      <span class="r-dot" aria-hidden="true"></span>
      <span class="r-copy">
        <span class="r-name">${sat.name}</span>
        <span class="r-sub">EL --°</span>
      </span>
    `
    chip.addEventListener('click', e => {
      e.preventDefault()
      if (store.phase === 'playing' || store.phase === 'ending') {
        audio.resume()
        selectSat(sat.id)
      }
    })
    ui.targetRail.appendChild(chip)
    world.rail.set(sat.id, { el: chip, sub: chip.querySelector('.r-sub') })
  }
  const site = document.createElement('div')
  site.className = 'site-marker'
  site.innerHTML = `<i aria-hidden="true"></i><span>SITE RAVEN</span>`
  ui.markers.appendChild(site)
  world.siteMarker = site
}

function predictCross(sat, threshold = 4) {
  const above = sat.elev > threshold
  const step = 0.02
  const maxSteps = 900
  let theta = sat.theta
  for (let i = 1; i <= maxSteps; i++) {
    theta += step
    const el = elevationAtTheta(sat, theta)
    if (above && el <= threshold) return (i * step) / sat.speed
    if (!above && el > threshold) return (i * step) / sat.speed
  }
  return null
}

function updateMarkerTexts() {
  for (const sat of world.sats) {
    const m = world.markers.get(sat.id)
    const r = world.rail.get(sat.id)
    if (sat.captured) {
      if (m) m.sub.textContent = 'SECURED'
      if (r) r.sub.textContent = 'SECURED'
    } else if (sat.above) {
      sat.los = predictCross(sat, 4)
      const el = `EL ${Math.max(0, sat.elev).toFixed(0)}°`
      if (m) m.sub.textContent = el
      if (r) r.sub.textContent = el
    } else {
      sat.aos = predictCross(sat, 4)
      const aos = sat.aos != null ? `AOS ${mmss(sat.aos)}` : 'AOS --:--'
      if (m) m.sub.textContent = aos
      if (r) r.sub.textContent = aos
    }
  }
}

function updateMarkers() {
  const show = store.phase === 'playing' || store.phase === 'ending' || store.phase === 'paused' || store.phase === 'help'
  ui.targetRail.hidden = !(store.phase === 'playing' || store.phase === 'ending')
  for (const sat of world.sats) {
    const m = world.markers.get(sat.id)
    if (!m) continue
    const r = world.rail.get(sat.id)
    if (r) {
      r.el.classList.toggle('below', !sat.above && !sat.captured)
      r.el.classList.toggle('captured', sat.captured)
      r.el.classList.toggle('selected', store.selected === sat.id)
    }
    if (!show) { m.el.style.display = 'none'; continue }
    const p = project(sat.mesh.position)
    const margin = 58
    const onScreen = p.visible && p.x > margin && p.x < window.innerWidth - margin && p.y > 42 && p.y < window.innerHeight - 12
    m.el.style.display = onScreen ? '' : 'none'
    if (!onScreen) continue
    m.el.style.left = `${p.x.toFixed(1)}px`
    m.el.style.top = `${p.y.toFixed(1)}px`
    m.el.classList.toggle('below', !sat.above && !sat.captured)
    m.el.classList.toggle('captured', sat.captured)
    m.el.classList.toggle('selected', store.selected === sat.id)
  }
  if (world.siteMarker) {
    const p = project(stationGroup.position)
    const onScreen = show && p.visible && p.x > 60 && p.x < window.innerWidth - 60 && p.y > 40 && p.y < window.innerHeight - 20
    world.siteMarker.style.display = onScreen ? '' : 'none'
    if (onScreen) {
      world.siteMarker.style.left = `${p.x.toFixed(1)}px`
      world.siteMarker.style.top = `${(p.y + 13).toFixed(1)}px`
    }
  }
}

/* ---------- HUD ---------- */
function updateTraceUI() {
  const t = clamp(store.trace, 0, 100)
  ui.tracePct.textContent = `${Math.round(t)}%`
  ui.traceFill.style.width = `${t}%`
  ui.traceTrack.classList.toggle('warn', t > 66)
  ui.spoofBtn.classList.toggle('urgent', !!store.counter)
  const cd = Math.max(0, store.spoofReady - store.time)
  ui.spoofCd.textContent = cd > 0 ? `${Math.ceil(cd)}s` : 'READY'
  ui.spoofBtn.disabled = cd > 0 || store.phase !== 'playing'
  ui.spoofBtn.setAttribute('aria-disabled', ui.spoofBtn.disabled ? 'true' : 'false')
  for (let i = 0; i < ui.intelPips.length; i++) {
    ui.intelPips[i].classList.toggle('on', i < store.intel)
  }
  ui.intelCount.textContent = String(store.intel)

  if (store.counter) {
    const remaining = Math.max(0, store.counter.until - store.time)
    ui.counter.hidden = false
    ui.purgeTimer.textContent = remaining.toFixed(1)
    ui.counterFill.style.width = `${(remaining / store.counter.duration) * 100}%`
  } else {
    ui.counter.hidden = true
  }
  document.body.classList.toggle('counter-active', !!store.counter)
}

function updateCoach() {
  let text = ''
  let alert = false
  if (store.phase === 'playing' || store.phase === 'ending') {
    if (store.counter) {
      text = 'COUNTER-INTRUSION SWEEP — TAP PURGE NOW'
      alert = true
    } else if (store.intel >= 4) {
      text = 'CONSTELLATION BLINDED — STAND BY FOR ASSESSMENT'
    } else if (!store.selected) {
      text = store.trace > 78
        ? 'TRACE CRITICAL — SPOOF THE UPLINK, THEN SELECT A TARGET'
        : 'TAP A HOSTILE SATELLITE TO DESIGNATE'
    } else if (store.selected && !store.counter) {
      // The target panel carries its own contextual instructions.
      text = ''
    } else {
      const sat = getSat(store.selected)
      if (sat && sat.captured) text = 'ASSET SECURED — RETURN TO ORBIT'
      else if (store.hack && store.hack.phase === 'hook') {
        if (!sat.above) { text = 'SIGNAL LOST — AWAITING ACQUISITION OF SIGNAL'; alert = true }
        else if (store.hack.locks === 0) text = 'LOCK THE CARRIER WHEN THE NEEDLE ENTERS THE WINDOW'
        else text = `CARRIER LOCK ${store.hack.locks}/3 — HOLD THE LINK`
      } else if (store.hack && store.hack.phase === 'breach') {
        text = sat.above ? 'REPEAT THE PROTOCOL GLYPHS IN ORDER' : 'COMMAND LINK FADED — AWAITING AOS'
        alert = !sat.above
      } else {
        text = 'INITIATE UPLINK HOOK TO SEIZE THE COMMAND LINK'
      }
    }
  }
  if (store.phase === 'paused') text = 'UPLINK HELD // SIMULATION PAUSED'
  if (store.phase === 'help') text = 'TACTICAL REFERENCE OPEN'
  const hide = !text
  if (ui.coach.classList.contains('hide') === hide && ui.coachText.textContent === text) return
  ui.coach.classList.toggle('hide', hide)
  ui.coach.classList.toggle('alert', alert)
  if (text) ui.coachText.textContent = text
}

/* ---------- panel basics ---------- */
function setPanelOpen(open) {
  ui.panel.classList.toggle('open', open)
  ui.panel.setAttribute('aria-hidden', open ? 'false' : 'true')
  document.body.classList.toggle('panel-open', open)
}

function fillPanel(sat) {
  ui.panelName.textContent = sat.name
  ui.panelKicker.textContent = sat.captured ? 'FRIENDLY ASSET // LINK SECURED' : 'HOSTILE ASSET // DESIGNATED'
  ui.panelClass.textContent = sat.cls
  ui.panelOrbit.textContent = sat.orbit
  ui.panelBand.textContent = sat.band
  ui.panelSec.textContent = `SEC ${sat.sec}`
  ui.panelSecNum.textContent = SEC_LABEL[sat.sec]
  ui.panelSecNum.className = SEC_CLASS[sat.sec]
  ui.panelDossier.textContent = sat.dossier
  ui.panelElev.textContent = sat.above ? `${Math.max(0, sat.elev).toFixed(0)}°` : '--'
  ui.panelPass.textContent = sat.above ? `LOS ${mmss(sat.los)}` : `AOS ${mmss(sat.aos)}`
}

function showSecured(sat) {
  ui.hookView.hidden = true
  ui.breachView.hidden = true
  ui.securedView.hidden = false
  ui.securedCopy.textContent = `${sat.name} is under friendly control. Its command link is ours; telemetry is being stripped in real time.`
  ui.securedBonus.textContent = sat.bonus
  ui.securedClose.onclick = () => closePanel()
}

function updateSelectedStatus() {
  if (!store.selected) return
  const sat = getSat(store.selected)
  if (!sat) return
  ui.panelElev.textContent = sat.above ? `${Math.max(0, sat.elev).toFixed(0)}°` : '--'
  ui.panelPass.textContent = sat.above ? `LOS ${mmss(sat.los)}` : `AOS ${mmss(sat.aos)}`
  if (store.hack && store.hack.satId === sat.id && store.hack.phase === 'hook') {
    const active = sat.above && store.phase === 'playing'
    ui.hookState.textContent = active ? 'ACQUIRING' : 'NO SIGNAL'
    ui.hookState.className = `phase-state ${active ? '' : 'bad'}`
    ui.lockBtn.disabled = !active
    ui.lockBtn.innerHTML = active ? 'LOCK SIGNAL <span class="key-hint">SPACE</span>' : 'AWAITING AOS'
    ui.hookHint.textContent = active
      ? 'Tap when the needle enters the acquisition window.'
      : `Orbital pass lost. Next acquisition in ${mmss(sat.aos)}.`
  }
  if (store.hack && store.hack.phase === 'breach' && !sat.above) {
    ui.breachState.textContent = 'NO SIGNAL'
    ui.breachState.className = 'phase-state bad'
  }
}

/* ---------- title clock ---------- */
function tickTitleClock() {
  const d = new Date()
  ui.titleClock.textContent = `T+${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}
tickTitleClock()
setInterval(tickTitleClock, 1000)

/* ---------- site marker css is added inline for locality ---------- */
const siteStyle = document.createElement('style')
siteStyle.textContent = `
.site-marker {
  position:absolute; left:0; top:0; transform:translate(-50%,-50%);
  display:flex; align-items:center; gap:5px; padding:2px 5px;
  font-family:var(--mono); font-size:7px; letter-spacing:.14em;
  color:rgba(149,252,238,.9); white-space:nowrap; pointer-events:none;
  background:rgba(2,10,12,.62); border-left:1px solid rgba(95,245,224,.55);
  text-shadow:0 0 6px rgba(0,0,0,.9);
}
.site-marker i { width:5px; height:5px; border:1px solid var(--cyan); transform:rotate(45deg); background:rgba(95,245,224,.25); box-shadow:0 0 8px rgba(95,245,224,.5); }
@media (max-width:720px){ .site-marker { font-size:6px; padding:1px 3px; letter-spacing:.1em; } }
`
document.head.appendChild(siteStyle)

/* ============================================================
   GAME LOGIC
   ============================================================ */
function getSat(id) {
  return world.sats.find(s => s.id === id)
}

function addTrace(n) {
  if (store.phase !== 'playing') return
  store.trace = clamp(store.trace + n, 0, 100)
  stats.maxTrace = Math.max(stats.maxTrace, store.trace)
  if (store.trace >= 100) endGame(false)
}

function resetSatVisuals() {
  for (const sat of world.sats) {
    sat.captured = false
    sat.theta = sat.initialTheta
    sat.orbitMat.color.setHex(0xff3654)
    sat.orbitMat.opacity = 0.16
    sat.glowMat.color.setHex(0xff3654)
    sat.statusLight.scale.setScalar(1)
  }
  syncSatPositions()
}

function resetGame() {
  resetSatVisuals()
  store.trace = 5
  store.intel = 0
  store.time = 0
  store.selected = null
  store.hack = null
  store.counter = null
  store.nextCounter = 34
  store.spoofReady = 0
  store.endAt = 0
  store.started = true
  stats.hacked = []
  stats.maxTrace = 5
  ui.log.innerHTML = ''
  ui.toasts.innerHTML = ''
  ui.counter.hidden = true
  ui.end.hidden = true
  ui.pause.hidden = true
  ui.help.hidden = true
  setPanelOpen(false)
  world.effects.forEach(fx => { scene.remove(fx.mesh); fx.mesh.geometry.dispose(); fx.mat.dispose() })
  world.effects = []
  resetCamera(true)
  updateMarkerTexts()
  updateTraceUI()
  updateCoach()
}

function makeHook(sat) {
  const w = clamp(0.225 - (sat.sec - 1) * 0.022 + clamp(sat.elev, 0, 90) / 90 * 0.03, 0.105, 0.255)
  return {
    satId: sat.id,
    phase: 'hook',
    locks: 0,
    needle: rand(0.06, 0.94),
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: 0.52 + (sat.sec - 1) * 0.052,
    zoneW: w,
    zoneL: 0.06,
    layer: 0,
    seq: [],
    progress: 0,
    board: [],
    layerTime: 0,
    layerMax: 0,
    errors: 0,
    hits: 0,
  }
}

function rezone(hack) {
  const sat = getSat(hack.satId)
  const baseW = clamp(0.225 - (sat.sec - 1) * 0.022 + clamp(sat.elev, 0, 90) / 90 * 0.03, 0.105, 0.255)
  hack.zoneW = baseW * rand(0.88, 1.12)
  hack.zoneL = rand(0.05, 0.95 - hack.zoneW)
  ui.freqZone.style.left = `${hack.zoneL * 100}%`
  ui.freqZone.style.width = `${hack.zoneW * 100}%`
}

function updateHookUI() {
  const hack = store.hack
  if (!hack || hack.phase !== 'hook') return
  ui.freqNeedle.style.left = `${hack.needle * 100}%`
  for (let i = 0; i < ui.lockPips.length; i++) ui.lockPips[i].classList.toggle('on', i < hack.locks)
  ui.lockLabel.textContent = `CARRIER LOCKS ${hack.locks}/3`
  const sat = getSat(hack.satId)
  const active = sat && sat.above && store.phase === 'playing'
  ui.lockBtn.disabled = !active
  if (!active) {
    ui.hookState.textContent = 'NO SIGNAL'
    ui.hookState.className = 'phase-state bad'
  }
  updateSelectedStatus()
}

function selectSat(id) {
  if (store.phase !== 'playing' && store.phase !== 'ending') return
  const sat = getSat(id)
  if (!sat) return

  if (store.selected === id) {
    setPanelOpen(true)
    return
  }

  store.selected = id
  fillPanel(sat)
  setPanelOpen(true)

  if (sat.captured) {
    store.hack = null
    showSecured(sat)
    audio.click()
    return
  }

  store.hack = makeHook(sat)
  rezone(store.hack)
  ui.hookView.hidden = false
  ui.breachView.hidden = true
  ui.securedView.hidden = true
  ui.breachGrid.innerHTML = ''
  ui.hookState.textContent = sat.above ? 'ACQUIRING' : 'NO SIGNAL'
  ui.hookState.className = `phase-state ${sat.above ? '' : 'bad'}`
  ui.lockBtn.disabled = !sat.above
  updateHookUI()
  updateSelectedStatus()
  audio.click()
  if (!sat.above) {
    toast(`BELOW HORIZON // AOS ${mmss(sat.aos)}`, 'amber')
    addLog(`${sat.name} BELOW STATION HORIZON`, 'warn')
  } else {
    addLog(`DESIGNATED ${sat.name} // ${sat.cls} // ${sat.band}`, '')
  }
  ui.rotateHint.hidden = true
}

function closePanel() {
  store.selected = null
  store.hack = null
  setPanelOpen(false)
  audio.click()
}

function abortHack() {
  if (!store.hack) { closePanel(); return }
  addLog('UPLINK HOOK ABORTED', 'warn')
  toast('UPLINK ABORTED', 'amber')
  closePanel()
}

function lockSignal() {
  if (store.phase !== 'playing') return
  const hack = store.hack
  if (!hack || hack.phase !== 'hook') return
  const sat = getSat(hack.satId)
  if (!sat || !sat.above) {
    audio.miss()
    toast(`NO SIGNAL // AOS ${mmss(sat && sat.aos)}`, 'bad')
    return
  }
  const hit = hack.needle >= hack.zoneL && hack.needle <= hack.zoneL + hack.zoneW
  if (hit) {
    hack.locks++
    hack.hits++
    audio.lock(hack.locks)
    ui.freqNeedle.classList.add('hit')
    setTimeout(() => ui.freqNeedle.classList.remove('hit'), 160)
    addLog(`CARRIER LOCK ${hack.locks}/3 // ${sat.name}`, 'good')
    if (hack.locks >= 3) {
      startBreach(sat)
    } else {
      rezone(hack)
      toast(`CARRIER LOCKED ${hack.locks}/3`, 'good')
    }
  } else {
    hack.errors++
    addTrace(2.2)
    audio.miss()
    ui.freqNeedle.classList.add('miss')
    setTimeout(() => ui.freqNeedle.classList.remove('miss'), 200)
    toast('CARRIER MISS // TRACE +2.2', 'bad')
    addLog('ACQUISITION WINDOW MISSED', 'bad')
  }
}

function startBreach(sat) {
  const hack = store.hack
  if (!hack) return
  hack.phase = 'breach'
  hack.layer = 0
  hack.progress = 0
  setupLayer()
  ui.hookView.hidden = true
  ui.breachView.hidden = false
  ui.securedView.hidden = true
  audio.breach()
  flash()
  toast('HOOK ESTABLISHED // BREACHING COMMAND LINK', 'good')
  addLog(`${sat.name} COMMAND LINK OPEN // BREACH ACTIVE`, 'good')
}

function makeBoard(sat) {
  const cells = [...sat.symbols, ...sat.symbols, ...sat.symbols, ...sat.symbols]
  for (let i = cells.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells
}

function setupLayer() {
  const hack = store.hack
  const sat = getSat(hack.satId)
  hack.layerMax = Math.max(9.5, 17 - hack.layer * 2.3 - (sat.sec - 1) * 0.55)
  hack.layerTime = hack.layerMax
  const len = [3, 4, 4][hack.layer] + (sat.sec >= 4 ? 1 : 0)
  hack.seq = Array.from({ length: len }, () => pick(sat.symbols))
  hack.progress = 0
  hack.board = makeBoard(sat)
  renderBreach()
}

function renderBreach() {
  const hack = store.hack
  if (!hack || hack.phase !== 'breach') return
  const sat = getSat(hack.satId)
  for (let i = 0; i < ui.layerStrip.length; i++) {
    ui.layerStrip[i].className = i < hack.layer ? 'done' : i === hack.layer ? 'active' : ''
  }
  ui.protoRow.innerHTML = hack.seq.map((g, i) => {
    const cls = i < hack.progress ? 'done' : i === hack.progress ? 'current' : ''
    return `<span class="proto-cell ${cls}">${g}</span>`
  }).join('')
  ui.breachGrid.innerHTML = hack.board.map(g => (
    `<button class="cell" data-glyph="${g}" aria-label="Protocol glyph ${g}">${g}</button>`
  )).join('')
  ui.breachState.textContent = sat.above ? `LAYER ${hack.layer + 1}/3` : 'NO SIGNAL'
  ui.breachState.className = `phase-state ${sat.above ? '' : 'bad'}`
  ui.layerTime.textContent = `${hack.layerTime.toFixed(1)}s`
  ui.layerTimerFill.style.width = '100%'
  ui.layerTimerFill.className = ''
}

function completeLayer() {
  const hack = store.hack
  if (!hack) return
  const sat = getSat(hack.satId)
  if (hack.layer < 2) {
    hack.layer++
    audio.breach()
    toast(`FIREWALL LAYER ${hack.layer} BYPASSED`, 'good')
    addLog(`${sat.name} LAYER ${hack.layer}/3 BYPASSED`, 'good')
    setupLayer()
  } else {
    captureSat(sat)
  }
}

function failLayer() {
  const hack = store.hack
  if (!hack) return
  const sat = getSat(hack.satId)
  hack.progress = 0
  hack.errors++
  hack.layerTime = hack.layerMax
  hack.seq = Array.from({ length: hack.seq.length }, () => pick(sat.symbols))
  hack.board = makeBoard(sat)
  addTrace(4.5)
  audio.wrong()
  flash()
  toast('COUNTERMEASURE CYCLE EXPIRED // TRACE +4.5', 'bad')
  addLog('BREACH SEQUENCE PURGED BY ENEMY ICE', 'bad')
  renderBreach()
}

function handleGlyph(glyph, btn) {
  if (store.phase !== 'playing') return
  const hack = store.hack
  if (!hack || hack.phase !== 'breach') return
  const sat = getSat(hack.satId)
  if (!sat || !sat.above) return
  if (glyph === hack.seq[hack.progress]) {
    hack.progress++
    audio.breach()
    if (hack.progress >= hack.seq.length) {
      completeLayer()
    } else {
      renderBreach()
    }
  } else {
    hack.errors++
    addTrace(1.4)
    audio.wrong()
    btn.classList.add('wrong')
    setTimeout(() => btn.classList.remove('wrong'), 260)
    addLog('PROTOCOL MISMATCH // TRACE +1.4', 'bad')
  }
}

function captureSat(sat) {
  sat.captured = true
  store.intel++
  stats.hacked.push(sat.id)
  addTrace(-6)
  store.hack = null
  sat.orbitMat.color.setHex(0x59f2a5)
  sat.orbitMat.opacity = 0.3
  sat.glowMat.color.setHex(0x59f2a5)
  showSecured(sat)
  fillPanel(sat)
  spawnBurst(sat.mesh.position)
  audio.capture()
  flash()
  toast(`LINK SECURED // ${sat.name} SEIZED`, 'good')
  addLog(`${sat.name} SEIZED // ${sat.bonus.split(' // ')[0]}`, 'good')
  updateMarkerTexts()
  updateTraceUI()
  if (store.intel >= 4) {
    store.phase = 'ending'
    store.endAt = store.time + 2.8
    store.counter = null
    store.nextCounter = Infinity
    ui.counter.hidden = true
    addLog('CONSTELLATION COMMAND NETWORK COLLAPSING', 'good')
  }
}

function useSpoof() {
  if (store.phase !== 'playing') return
  const cd = store.spoofReady - store.time
  if (cd > 0) {
    toast(`SPOOF RECHARGING // ${Math.ceil(cd)}s`, 'amber')
    return
  }
  store.spoofReady = store.time + 22
  addTrace(-12)
  audio.spoof()
  toast('TRACE SPOOFED // −12%', 'good')
  addLog('UPLINK SIGNATURE SPOOFED', 'good')
  updateTraceUI()
}

function startCounter() {
  store.counter = { until: store.time + 6, duration: 6 }
  store.nextCounter = Infinity
  audio.alarm()
  flash()
  toast('COUNTER-INTRUSION SWEEP // PURGE NOW', 'bad')
  addLog('ENEMY DF SWEEP ACQUIRED SITE RAVEN', 'warn')
}

function purgeCounter() {
  if (!store.counter || store.phase !== 'playing') return
  store.counter = null
  store.nextCounter = store.time + rand(30, 44)
  addTrace(-9)
  audio.purge()
  toast('DF LOCK BROKEN // TRACE −9', 'good')
  addLog('COUNTER-INTRUSION SWEEP PURGED', 'good')
  ui.counter.hidden = true
}

function expireCounter() {
  store.counter = null
  store.nextCounter = store.time + rand(28, 40)
  addTrace(13)
  audio.wrong()
  flash()
  toast('SITE TRIANGULATED // TRACE +13', 'bad')
  addLog('COUNTER-INTRUSION UNPURGED // TRACE SPIKE', 'bad')
  ui.counter.hidden = true
}

function updateGame(dt) {
  if (store.phase === 'ending') {
    store.time += dt
    if (store.time >= store.endAt) endGame(true)
    return
  }
  if (store.phase !== 'playing') return

  store.time += dt

  const sat = store.selected ? getSat(store.selected) : null
  const hack = store.hack
  const linked = hack && sat && sat.above

  let rate = 0.095 + store.intel * 0.017
  if (linked) rate += hack.phase === 'hook' ? 0.215 : 0.175
  if (store.counter) rate += 0.09
  store.trace = clamp(store.trace + rate * dt, 0, 100)
  stats.maxTrace = Math.max(stats.maxTrace, store.trace)
  if (store.trace >= 100) { endGame(false); return }

  if (linked && hack.phase === 'hook') {
    hack.needle += hack.dir * hack.speed * dt
    if (hack.needle > 1) { hack.needle = 1 - (hack.needle - 1); hack.dir = -1 }
    if (hack.needle < 0) { hack.needle = -hack.needle; hack.dir = 1 }
    updateHookUI()
  }

  if (linked && hack.phase === 'breach') {
    hack.layerTime -= dt
    const pct = clamp(hack.layerTime / hack.layerMax, 0, 1)
    ui.layerTimerFill.style.width = `${pct * 100}%`
    ui.layerTimerFill.className = pct < 0.28 ? 'warn' : ''
    ui.layerTime.textContent = `${Math.max(0, hack.layerTime).toFixed(1)}s`
    if (hack.layerTime <= 0) failLayer()
  }

  if (store.counter && store.time >= store.counter.until) expireCounter()
  if (!store.counter && store.intel < 4 && store.time >= store.nextCounter) startCounter()
}

/* ---------- lifecycle ---------- */
function startGame() {
  audio.init()
  audio.resume()
  resetGame()
  store.phase = 'playing'
  setHudVisible(true)
  resetCamera(true)
  ui.title.classList.add('leaving')
  setTimeout(() => { ui.title.style.display = 'none' }, 560)
  ui.end.hidden = true
  ui.pause.hidden = true
  ui.help.hidden = true
  addLog('SITE RAVEN UPLINK ONLINE // ALL SYSTEMS NOMINAL', 'good')
  addLog('KESTREL NET // 6 HOSTILE ASSETS IN ORBIT')
  addLog('OBJECTIVE: SEIZE 4 COMMAND LINKS BEFORE TRACE 100%')
  toast('UPLINK ESTABLISHED // SELECT A HOSTILE ASSET', 'good')
  updateTrainings()
  setTimeout(() => { ui.rotateHint.hidden = false }, 700)
  setTimeout(() => { ui.rotateHint.hidden = true }, 6200)
}

function updateTrainings() {
  updateCoach()
  updateTraceUI()
  updateMarkers()
  updateMarkerTexts()
}

function pauseGame() {
  if (store.phase !== 'playing') return
  store.phase = 'paused'
  ui.pause.hidden = false
  audio.click()
}

function resumeGame() {
  if (store.phase !== 'paused') return
  store.phase = 'playing'
  ui.pause.hidden = true
  audio.resume()
  audio.click()
}

function openHelp() {
  if (store.phase !== 'playing') return
  store.helpReturn = 'playing'
  store.phase = 'help'
  ui.help.hidden = false
  audio.click()
}

function closeHelp() {
  if (store.phase !== 'help') return
  store.phase = store.helpReturn || 'playing'
  ui.help.hidden = true
  audio.resume()
  audio.click()
}

function restartGame() {
  audio.resume()
  resetGame()
  store.phase = 'playing'
  setHudVisible(true)
  ui.end.hidden = true
  ui.pause.hidden = true
  ui.help.hidden = true
  ui.title.style.display = 'none'
  addLog('UPLINK REESTABLISHED // SITE RAVEN ONLINE', 'good')
  addLog('KESTREL NET // 6 HOSTILE ASSETS IN ORBIT')
  toast('REDEPLOYED // SELECT A HOSTILE ASSET', 'good')
  updateTrainings()
}

function endGame(won) {
  if (store.phase === 'won' || store.phase === 'lost') return
  store.phase = won ? 'won' : 'lost'
  store.selected = null
  store.hack = null
  store.counter = null
  ui.counter.hidden = true
  setPanelOpen(false)
  setHudVisible(false)
  const score = Math.max(0, Math.round(
    store.intel * 1450 +
    (100 - store.trace) * 18 +
    Math.max(0, 240 - store.time) * 7 +
    (won ? 800 : 0),
  ))
  ui.end.classList.toggle('lost', !won)
  ui.endKicker.textContent = won
    ? 'OPERATION NIGHTGLASS // MISSION COMPLETE'
    : 'OPERATION NIGHTGLASS // UPLINK LOST'
  ui.endTitle.textContent = won ? 'CONSTELLATION BLINDED' : 'SITE RAVEN COMPROMISED'
  ui.endCopy.textContent = won
    ? `${store.intel} hostile satellites are under friendly control. Kestrel Net has gone dark and enemy fires are flying blind.`
    : `Enemy direction-finding locked Site Raven at ${Math.round(store.trace)}% trace. The uplink was destroyed before the constellation could be blinded.`
  ui.statIntel.textContent = `${store.intel}/6`
  ui.statTime.textContent = fmtTime(store.time)
  ui.statTrace.textContent = `${Math.round(store.trace)}%`
  ui.statScore.textContent = String(score)
  ui.endNote.textContent = won ? 'SITE RAVEN REMAINS OPERATIONAL' : 'SITE RAVEN LOST // EVACUATE'
  ui.endSats.innerHTML = world.sats.map(sat => (
    `<span class="end-sat ${sat.captured ? '' : 'lost-sat'}">${sat.name} · ${sat.captured ? 'SEIZED' : 'ACTIVE'}</span>`
  )).join('')
  ui.end.hidden = false
  ui.flash.classList.remove('fire')
  if (won) audio.win()
  else audio.lose()
}

/* ============================================================
   INPUT
   ============================================================ */
const raycaster = new THREE.Raycaster()
const ptrs = new Map()
let gesture = null
let pinchStartDist = 0
let pinchStartZoom = 1

ui.canvas.addEventListener('pointerdown', e => {
  if (store.phase !== 'playing' && store.phase !== 'ending') return
  ui.canvas.setPointerCapture(e.pointerId)
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (ptrs.size === 1) {
    gesture = {
      lastX: e.clientX, lastY: e.clientY,
      startX: e.clientX, startY: e.clientY,
      moved: 0, at: performance.now(), pinch: false,
    }
    ui.canvas.classList.add('dragging')
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()]
    pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y) || 1
    pinchStartZoom = view.zoom
    if (gesture) gesture.pinch = true
  }
  ui.rotateHint.hidden = true
})

ui.canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return
  const prev = ptrs.get(e.pointerId)
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (ptrs.size === 2 && pinchStartDist > 0) {
    const [a, b] = [...ptrs.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
    view.zoom = clamp(pinchStartZoom * (pinchStartDist / d), 0.55, 1.65)
    if (gesture) gesture.pinch = true
    return
  }
  if (!gesture || ptrs.size !== 1) return
  const dx = e.clientX - prev.x
  const dy = e.clientY - prev.y
  gesture.moved += Math.abs(dx) + Math.abs(dy)
  view.targetYaw -= dx * 0.0052
  view.targetPitch = clamp(view.targetPitch + dy * 0.0046, -1.15, 1.15)
  gesture.lastX = e.clientX
  gesture.lastY = e.clientY
})

function endPointer(e, cancelled = false) {
  const was = ptrs.get(e.pointerId)
  ptrs.delete(e.pointerId)
  if (ptrs.size < 2) pinchStartDist = 0
  if (ptrs.size === 0 && gesture) {
    const dist = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY)
    const dur = performance.now() - gesture.at
    if (!cancelled && !gesture.pinch && gesture.moved < 11 && dist < 12 && dur < 700) {
      handleTap(e.clientX, e.clientY)
    }
    gesture = null
    ui.canvas.classList.remove('dragging')
  }
  if (was && ptrs.size === 1) {
    const [a] = [...ptrs.values()]
    gesture = {
      lastX: a.x, lastY: a.y, startX: a.x, startY: a.y,
      moved: 99, at: performance.now(), pinch: true,
    }
  }
}
ui.canvas.addEventListener('pointerup', e => endPointer(e, false))
ui.canvas.addEventListener('pointercancel', e => endPointer(e, true))

ui.canvas.addEventListener('wheel', e => {
  if (store.phase !== 'playing' && store.phase !== 'ending') return
  e.preventDefault()
  view.zoom = clamp(view.zoom * Math.exp(e.deltaY * 0.0012), 0.55, 1.65)
}, { passive: false })

function handleTap(clientX, clientY) {
  if (store.phase !== 'playing' && store.phase !== 'ending') return
  const rect = ui.canvas.getBoundingClientRect()
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1
  const ny = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
  const targets = [earth, ...world.sats.map(s => s.mesh)]
  const hits = raycaster.intersectObjects(targets, true)
  if (!hits.length) return
  const first = hits[0].object
  if (first === earth) return
  let obj = first
  let id = obj.userData.satId
  while (!id && obj.parent) { obj = obj.parent; id = obj.userData.satId }
  if (id) {
    audio.resume()
    selectSat(id)
  }
}

/* ============================================================
   BUTTON BINDINGS
   ============================================================ */
ui.startBtn.addEventListener('click', () => { startGame() })
ui.spoofBtn.addEventListener('click', () => useSpoof())
ui.pauseBtn.addEventListener('click', () => pauseGame())
ui.resumeBtn.addEventListener('click', () => resumeGame())
ui.pauseRestart.addEventListener('click', () => restartGame())
ui.redeployBtn.addEventListener('click', () => restartGame())
ui.helpBtn.addEventListener('click', () => openHelp())
ui.helpClose.addEventListener('click', () => closeHelp())
ui.lockBtn.addEventListener('click', () => lockSignal())
ui.abortHook.addEventListener('click', () => abortHack())
ui.abortBreach.addEventListener('click', () => abortHack())
ui.closePanel.addEventListener('click', () => closePanel())
ui.purgeBtn.addEventListener('click', () => purgeCounter())
ui.breachGrid.addEventListener('click', e => {
  const btn = e.target.closest('.cell')
  if (!btn) return
  handleGlyph(btn.dataset.glyph, btn)
})
ui.audioBtn.addEventListener('click', () => {
  audio.init()
  audio.setMuted(!audio.muted)
  ui.audioBtn.classList.toggle('muted', audio.muted)
  ui.audioBtn.setAttribute('aria-pressed', audio.muted ? 'false' : 'true')
  if (!audio.muted) audio.click()
})
ui.fsBtn.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    else await document.exitFullscreen()
  } catch (err) { /* unsupported on some mobile browsers */ }
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden && store.phase === 'playing') pauseGame()
})

window.addEventListener('keydown', e => {
  if (e.repeat) return
  if (store.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault(); startGame(); return
  }
  if (e.code === 'Escape') {
    if (store.phase === 'help') closeHelp()
    else if (store.phase === 'paused') resumeGame()
    else if (store.phase === 'playing' && store.selected) closePanel()
    else if (store.phase === 'playing') pauseGame()
    return
  }
  if (e.code === 'KeyP') {
    if (store.phase === 'playing') pauseGame()
    else if (store.phase === 'paused') resumeGame()
    return
  }
  if (e.code === 'KeyH') { if (store.phase === 'playing') openHelp(); return }
  if (e.code === 'KeyM') { ui.audioBtn.click(); return }
  if (e.code === 'KeyS' && store.phase === 'playing') { useSpoof(); return }
  if (e.code === 'Space' && store.phase === 'playing') {
    if (store.hack && store.hack.phase === 'hook') {
      e.preventDefault()
      lockSignal()
    }
  }
})

ui.canvas.addEventListener('contextmenu', e => e.preventDefault())

/* ============================================================
   MAIN LOOP
   ============================================================ */
buildMarkers()
setHudVisible(false)
updateMarkerTexts()
updateTraceUI()
updateCoach()
resetCamera(true)
updateWorld(0, 0)
renderer.render(scene, camera)

let lastFrame = performance.now()
let uiTimer = 0
let slowTimer = 0

function frame(now) {
  requestAnimationFrame(frame)
  const realDt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
  lastFrame = now
  const simulating = store.phase === 'playing' || store.phase === 'ending' || store.phase === 'title'
  const simDt = simulating ? realDt : 0

  updateGame(realDt)
  updateWorld(realDt, simDt)

  uiTimer += realDt
  if (uiTimer >= 0.1) {
    updateTraceUI()
    updateCoach()
    uiTimer = 0
  }
  slowTimer += realDt
  if (slowTimer >= 0.26) {
    updateMarkerTexts()
    updateSelectedStatus()
    slowTimer = 0
  }

  updateMarkers()
  renderer.render(scene, camera)
}
requestAnimationFrame(frame)
