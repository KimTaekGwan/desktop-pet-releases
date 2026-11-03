// Desktop Pet 랜딩 데모 — "사이트에서 본 펫 = 설치 후 펫".
// 시트(demo/<id>/sheet.png)는 앱이 내보낸 그대로, 숫자(demo/motion.json)는 앱의 Motion 상수 그대로,
// 다음 행동을 고르는 규칙은 PetKit.BehaviorPolicy의 보통 모드(roam → wander → rest)를 그대로 옮겼다.
(async function () {
  const canvas = document.getElementById('demo');
  if (!canvas) return;
  const scene = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const CHARS = ['pomu', 'tori', 'nubi'];
  const FALLBACK = { blinkInterval: [4.4, 7.3], blinkClosed: 0.23, landingSettle: 0.32, dragThreshold: 7,
    breathe: { idle: [1.02, 3.2], sleep: [1.025, 2.8], sit: [1.025, 3.4] }, lean: { duration: 0.6, count: 2, offset: 3, angleDeg: 1.4 },
    heart: { rise: 0.9, scaleFrom: 0.72, scaleTo: 1.05, visible: 1.1 }, shadow: { liftReach: 200, alpha: [0.22, 0.05], scale: [1, 0.6] },
    sitHold: [4, 9], idleHold: [3, 7], stretchDuration: 2.4, walkSpeed: 28,
    postureWeights: { standing: { walk: 3, stretch: 2, sit: 6, sleep: 1 }, sitting: { walk: 2, stretch: 1, sit: 3, sleep: 6 } },
    frameWeights: { happy: [1, 2, 1, 1] } };
  const M = await fetch('demo/motion.json').then(r => r.json()).catch(() => FALLBACK);
  const sheets = {};
  for (const id of CHARS) {
    try {
      const manifest = await fetch(`demo/${id}/manifest.json`).then(r => r.json());
      const img = new Image(); img.src = `demo/${id}/sheet.png`;
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; });
      sheets[id] = { manifest, img };
    } catch (e) { /* 재료가 없으면 그 캐릭터는 건너뛴다 */ }
  }
  if (!Object.keys(sheets).length) return;
  scene.classList.add('live');

  // ---- 좌표: 캔버스 px. 바닥은 배경 그라데이션의 70% 선, 발판은 .win의 윗변
  const SCALE = 3, SIZE = 16 * SCALE;
  let W = 0, H = 0, GROUND = 0, PLATFORM = null;
  function layout() {
    const dpr = window.devicePixelRatio || 1;
    W = scene.clientWidth; H = scene.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    GROUND = Math.round(H * 0.7) - 2;
    const win = scene.querySelector('.win');
    PLATFORM = win ? { x1: win.offsetLeft, x2: win.offsetLeft + win.offsetWidth, y: win.offsetTop } : null;
  }
  layout(); window.addEventListener('resize', layout);

  // ---- 펫 상태
  const rnd = (a, b) => a + Math.random() * (b - a);
  const chance = p => Math.random() < p;
  const pet = { id: Object.keys(sheets)[0], x: 0, y: 0, dir: 1, behavior: 'idle', endsAt: 0, posture: 'standing',
    energy: 0.55, sleptAt: -1, vy: 0, frameAt: 0, blinkAt: 0, blinkUntil: 0, dragOffset: 0, hearts: [], leanAt: 0, settle: 0 };
  pet.x = W * 0.62; pet.y = GROUND;
  let now = 0;

  // ---- BehaviorPolicy 이식: 가중치 표 → lifecycle → rest/wander/roam
  function lifecycle(posture) {
    const t = M.postureWeights[posture]; const total = Object.values(t).reduce((a, b) => a + b, 0);
    let pick = Math.floor(Math.random() * total);
    for (const k of ['walk', 'stretch', 'sit', 'sleep']) { pick -= t[k]; if (pick < 0) return k; }
    return 'sit';
  }
  const drowsy = () => pet.energy < 0.25;
  function rest() {
    const stay = pet.posture === 'sitting' ? 'sit' : 'idle';
    switch (lifecycle(pet.posture)) {
      case 'walk': return 'idle';
      case 'stretch': return 'stretch';
      case 'sit': return 'sit';
      default: return drowsy() ? 'sleep' : stay;
    }
  }
  function wander() {
    if (pet.behavior !== 'walk' && chance(0.45)) { if (chance(0.5)) pet.dir = -pet.dir; return 'walk'; }
    return rest();
  }
  function roam() {
    if (drowsy() && chance(0.2 + 0.6 * (0.25 - pet.energy) / 0.25)) return pet.posture === 'sitting' ? 'sleep' : 'sit';
    return wander();
  }
  function hopTarget() {
    if (!PLATFORM || pet.y !== GROUND) return null;
    return pet.x > PLATFORM.x1 + 10 && pet.x < PLATFORM.x2 - 10 ? PLATFORM.y : null;
  }
  function next() {
    const hop = hopTarget();
    if (hop !== null && chance(0.45)) { pet.vy = -Math.sqrt(2 * 1800 * (pet.y - hop + 12)); enter('hopping'); return; }
    enter(roam());
  }

  function enter(b) {
    const prev = pet.behavior;
    pet.behavior = b; pet.frameAt = now; pet.settle = 0;
    pet.posture = b === 'sit' ? 'sitting' : 'standing';
    const hold = r => now + rnd(r[0], r[1]);
    switch (b) {
      // 깜빡임 예약은 행동을 다시 들어가도 리셋하지 않는다 (idle 유지가 깜빡임 간격보다 짧아 리셋하면 거의 안 깜빡인다)
      case 'idle': pet.endsAt = hold(M.idleHold); if (pet.blinkAt < now) pet.blinkAt = now + rnd(...M.blinkInterval); break;
      case 'sit': pet.endsAt = hold(M.sitHold); if (pet.blinkAt < now) pet.blinkAt = now + rnd(...M.blinkInterval); break;
      case 'walk': pet.endsAt = now + rnd(3, 8); break;
      case 'stretch': pet.endsAt = now + M.stretchDuration; break;
      case 'sleep': pet.sleptAt = now; pet.endsAt = now + 20; break;
      case 'petted': pet.endsAt = now + M.lean.duration * M.lean.count + 0.2; pet.leanAt = now; pet.hearts.push({ at: now, x: pet.x + 6 }); break;
      case 'happy': pet.endsAt = now + 1.6; break;
      default: pet.endsAt = Infinity;
    }
    if (prev === 'sleep' && b === 'idle') enter('stretch'); // 깨면 기지개
  }
  function land() { // 착지 숨 고르기: 0.32초 동안 첫 프레임, 그 뒤 다음 행동
    enter('idle'); pet.endsAt = now + M.landingSettle; pet.settle = now + M.landingSettle; pet.blinkAt = Math.max(pet.blinkAt, pet.settle);

  }

  // ---- 입력: 클릭=쓰다듬기, 7px 넘게 끌면 들기
  let press = null;
  const overPet = (mx, my) => Math.abs(mx - pet.x) < SIZE * 0.4 && my < pet.y && my > pet.y - SIZE * 0.9;
  function pos(e) { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  canvas.addEventListener('pointerdown', e => { const p = pos(e); if (overPet(p.x, p.y)) { press = { x: p.x, y: p.y, dragging: false }; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => {
    if (!press) return; const p = pos(e);
    if (!press.dragging && Math.hypot(p.x - press.x, p.y - press.y) >= M.dragThreshold) { press.dragging = true; pet.dragOffset = pet.y - press.y; enter('dragged'); }
    if (press.dragging) { pet.x = Math.max(SIZE / 2, Math.min(W - SIZE / 2, p.x)); pet.y = Math.min(GROUND, p.y + pet.dragOffset); }
  });
  const release = () => {
    if (!press) return;
    if (press.dragging) { pet.vy = 0; enter('falling'); }
    else if (pet.behavior !== 'sleep' && pet.behavior !== 'falling') enter('petted');
    press = null;
  };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  document.querySelectorAll('[data-char]').forEach(b => b.addEventListener('click', () => { if (sheets[b.dataset.char]) pet.id = b.dataset.char; }));
  canvas.style.cursor = 'grab';

  // ---- 루프
  let last = performance.now() / 1000;
  function tick(ms) {
    const t = ms / 1000; const dt = Math.min(0.1, t - last); last = t; now = t;
    if (pet.behavior === 'sleep') pet.energy = Math.min(1, (now - pet.sleptAt) / 20); else pet.energy = Math.max(0, pet.energy - dt / 120);
    switch (pet.behavior) {
      case 'walk': {
        pet.x += pet.dir * M.walkSpeed * dt;
        if (pet.y < GROUND && PLATFORM && (pet.x < PLATFORM.x1 || pet.x > PLATFORM.x2)) { pet.vy = 0; enter('falling'); break; } // 발판 끝에서 내려간다
        if (pet.x < SIZE / 2 || pet.x > W - SIZE / 2) { pet.x = Math.max(SIZE / 2, Math.min(W - SIZE / 2, pet.x)); pet.dir = -pet.dir; }
        break;
      }
      case 'hopping': pet.y += pet.vy * dt; pet.vy += 1800 * dt; if (pet.vy > 0 && pet.y >= PLATFORM.y) { pet.y = PLATFORM.y; land(); } break;
      case 'falling': {
        pet.vy += 1800 * dt; const ny = pet.y + pet.vy * dt;
        const onPlat = PLATFORM && pet.x > PLATFORM.x1 && pet.x < PLATFORM.x2 && pet.y <= PLATFORM.y && ny >= PLATFORM.y;
        if (onPlat) { pet.y = PLATFORM.y; land(); } else if (ny >= GROUND) { pet.y = GROUND; land(); } else pet.y = ny;
        break;
      }
      case 'dragged': break;
      default: if (now >= pet.endsAt) { if (pet.behavior === 'sleep') enter('idle'); else next(); }
    }
    if ((pet.behavior === 'idle' || pet.behavior === 'sit') && now >= pet.blinkAt) { pet.blinkUntil = now + M.blinkClosed; pet.blinkAt = now + M.blinkClosed + rnd(...M.blinkInterval); }
    draw();
    requestAnimationFrame(tick);
  }

  function frameOf(pose, count) { // 포즈 행의 프레임 번호: fps와 가중치(정점 홀드)로
    const s = sheets[pet.id]; const fps = (s.manifest.fps || {})[pose] || 4; const per = 1 / fps;
    const w = (M.frameWeights || {})[pose]; const weights = w ? Array.from({ length: count }, (_, i) => w[Math.floor(i * w.length / count)]) : Array(count).fill(1);
    const cycle = weights.reduce((a, b) => a + b, 0) * per; let u = ((now - pet.frameAt) % cycle);
    for (let i = 0; i < count; i++) { u -= weights[i] * per; if (u < 0) return i; }
    return count - 1;
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const s = sheets[pet.id]; const rows = s.manifest.rows; const fw = s.manifest.frameWidth;
    const has = p => rows.indexOf(p) >= 0;
    const ground = pet.y <= (PLATFORM ? PLATFORM.y : GROUND) + 1 && PLATFORM && pet.x > PLATFORM.x1 && pet.x < PLATFORM.x2 ? PLATFORM.y : GROUND;
    // 그림자: 들린 높이에 따라 옅고 작게
    const lift = Math.max(0, Math.min(1, (ground - pet.y) / M.shadow.liftReach));
    const sa = M.shadow.alpha[0] + (M.shadow.alpha[1] - M.shadow.alpha[0]) * lift, ss = M.shadow.scale[0] + (M.shadow.scale[1] - M.shadow.scale[0]) * lift;
    ctx.fillStyle = `rgba(0,0,0,${sa})`; ctx.beginPath(); ctx.ellipse(pet.x, ground + 1, SIZE * 0.36 * ss, SIZE * 0.07 * ss, 0, 0, Math.PI * 2); ctx.fill();
    // 포즈 → 행·프레임
    let pose = 'idle', frame = 0;
    const b = pet.behavior;
    if (b === 'walk') { pose = 'walk'; frame = frameOf('walk', 2); }
    else if (b === 'sleep') { pose = 'sleep'; frame = frameOf('sleep', 2); }
    else if (b === 'stretch' && has('stretch')) { pose = 'stretch'; frame = frameOf('stretch', 2); }
    else if (b === 'petted' || b === 'happy') { pose = 'happy'; frame = frameOf('happy', 2); }
    else if (b === 'dragged' && has('held')) { pose = 'held'; frame = frameOf('held', 2); }
    else if (b === 'sit' && has('sit')) { pose = 'sit'; frame = now < pet.blinkUntil ? 1 : 0; }
    else if (b === 'hopping' || b === 'falling' || b === 'dragged') { pose = 'idle'; frame = 1; }
    else { pose = 'idle'; frame = now < pet.blinkUntil ? 1 : 0; }
    const row = rows.indexOf(pose) >= 0 ? rows.indexOf(pose) : 0;
    // 호흡: 발밑 기준 세로 배율
    const br = (M.breathe || {})[b === 'sleep' ? 'sleep' : b === 'sit' ? 'sit' : 'idle'];
    const breathing = ['idle', 'sit', 'sleep', 'stretch'].includes(b) && br ? 1 + (br[0] - 1) * (0.5 - 0.5 * Math.cos(2 * Math.PI * now / br[1])) : 1;
    ctx.save();
    ctx.translate(pet.x, pet.y);
    if (b === 'petted') { // 몸 기울임 0.6초 × 2회
      const u = ((now - pet.leanAt) % M.lean.duration) / M.lean.duration, k = Math.sin(u * Math.PI);
      ctx.translate(M.lean.offset * k, 0); ctx.rotate(M.lean.angleDeg * Math.PI / 180 * k);
    }
    if (b === 'dragged') ctx.rotate(0.1 * Math.sin(now * 2 * Math.PI / 0.4));
    ctx.scale(-pet.dir, breathing);
    ctx.drawImage(s.img, frame * fw, row * fw, fw, fw, -SIZE / 2, -SIZE, SIZE, SIZE);
    ctx.restore();
    if (b === 'sleep' && Math.floor(now / 1.5) % 2 === 0) { ctx.fillStyle = '#fff'; ctx.font = '12px Menlo'; ctx.fillText('z', pet.x + 16, pet.y - SIZE - 4 - ((now % 1.5) * 10)); }
    // ♥: 0.72→1.05배로 0.9초 떠오르고 1.1초 보인다
    pet.hearts = pet.hearts.filter(h => now - h.at < M.heart.visible + 0.25);
    for (const h of pet.hearts) {
      const u = Math.min(1, (now - h.at) / M.heart.rise), e = 1 - (1 - u) * (1 - u);
      const sc = M.heart.scaleFrom + (M.heart.scaleTo - M.heart.scaleFrom) * e, fade = Math.max(0, Math.min(1, (M.heart.visible + 0.25 - (now - h.at)) / 0.25));
      ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#ff5c8a'; ctx.font = `${Math.round(13 * sc)}px Menlo`; ctx.fillText('♥', h.x, pet.y - SIZE - 2 - 18 * e); ctx.restore();
    }
  }
  enter('idle');
  requestAnimationFrame(tick);
})();
