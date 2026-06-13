/* 自重トレーニング 3D ガイド — シーン・UI・記録 */
(function () {
  'use strict';

  const DATA = window.BWT_DATA;
  const FIG = window.BWT_FIGURE;
  const LS_KEY = 'bwt-log-v1';
  const HALF_LIFE_DAYS = 14; // 鍛え度の半減期

  // ---------- シーン ----------
  const canvas = document.getElementById('gl');
  const stage = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12161d);
  scene.fog = new THREE.Fog(0x12161d, 7, 14);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);

  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x2a2f38, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(2.5, 4.5, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -3; sun.shadow.camera.right = 3;
  sun.shadow.camera.top = 3.5; sun.shadow.camera.bottom = -1;
  sun.shadow.camera.far = 12;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6f87b8, 0.3);
  rim.position.set(-2.5, 3, -2.5);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x171c26, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(8.4, 28, 0x2c3547, 0x222a39);
  grid.position.y = 0.002;
  scene.add(grid);

  // ---------- 器具 ----------
  const barMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.35, metalness: 0.7 });
  function cyl(r, h) { return new THREE.CylinderGeometry(r, r, h, 12); }
  function eqMesh(parent, geo, x, y, z, rx, rz) {
    const m = new THREE.Mesh(geo, barMat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    parent.add(m);
  }
  const pullupRig = new THREE.Group();
  eqMesh(pullupRig, cyl(0.018, 1.5), 0, 2.2, 0.05, 0, Math.PI / 2);
  eqMesh(pullupRig, cyl(0.03, 2.2), -0.72, 1.1, 0.05);
  eqMesh(pullupRig, cyl(0.03, 2.2), 0.72, 1.1, 0.05);
  eqMesh(pullupRig, new THREE.BoxGeometry(0.3, 0.04, 0.55), -0.72, 0.02, 0.05);
  eqMesh(pullupRig, new THREE.BoxGeometry(0.3, 0.04, 0.55), 0.72, 0.02, 0.05);
  scene.add(pullupRig);

  const dipRig = new THREE.Group();
  [-0.29, 0.29].forEach(function (x) {
    eqMesh(dipRig, cyl(0.02, 1.05), x, 1.1, 0, Math.PI / 2, 0);
    eqMesh(dipRig, cyl(0.022, 1.1), x, 0.55, -0.42);
    eqMesh(dipRig, cyl(0.022, 1.1), x, 0.55, 0.42);
    eqMesh(dipRig, new THREE.BoxGeometry(0.22, 0.04, 0.3), x, 0.02, -0.42);
    eqMesh(dipRig, new THREE.BoxGeometry(0.22, 0.04, 0.3), x, 0.02, 0.42);
  });
  scene.add(dipRig);

  // ---------- 人体モデル ----------
  const fig = FIG.build();
  scene.add(fig.group);

  // ---------- カメラ操作 (簡易オービット) ----------
  const cam = { az: 35, el: 14, r: 3.4, ty: 0.85 };
  let camGoal = null;
  const pointers = new Map();
  let pinchDist = 0;

  canvas.addEventListener('pointerdown', function (e) {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    camGoal = null;
    if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    if (pointers.size === 1) {
      cam.az -= (e.clientX - prev.x) * 0.4;
      cam.el = Math.max(2, Math.min(85, cam.el + (e.clientY - prev.y) * 0.3));
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchDist > 0) cam.r = clampR(cam.r * pinchDist / d);
      pinchDist = d;
    }
  });
  function releasePointer(e) { pointers.delete(e.pointerId); pinchDist = 0; }
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    cam.r = clampR(cam.r * Math.exp(e.deltaY * 0.001));
  }, { passive: false });
  function clampR(r) { return Math.max(1.6, Math.min(8, r)); }

  function updateCamera(dt) {
    if (camGoal) {
      const k = Math.min(1, dt * 4);
      cam.az += (camGoal.az - cam.az) * k;
      cam.el += (camGoal.el - cam.el) * k;
      cam.r += (camGoal.r - cam.r) * k;
      cam.ty += (camGoal.ty - cam.ty) * k;
      if (Math.abs(camGoal.az - cam.az) < 0.3 && Math.abs(camGoal.r - cam.r) < 0.02) camGoal = null;
    }
    const az = THREE.MathUtils.degToRad(cam.az);
    const el = THREE.MathUtils.degToRad(cam.el);
    camera.position.set(
      cam.r * Math.sin(az) * Math.cos(el),
      cam.ty + cam.r * Math.sin(el),
      cam.r * Math.cos(az) * Math.cos(el)
    );
    camera.lookAt(0, cam.ty, 0);
  }
  function flyTo(c) {
    // 近い方向から回り込む
    let az = c.az;
    while (az - cam.az > 180) az -= 360;
    while (az - cam.az < -180) az += 360;
    camGoal = { az: az, el: c.el, r: c.r, ty: c.ty };
  }

  // ---------- 記録 (localStorage) ----------
  function loadLog() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; }
  }
  function saveLog(log) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(log)); } catch (e) {}
  }
  function addLog(exId, sets, reps) {
    const log = loadLog();
    log.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), d: Date.now(), ex: exId, sets: sets, reps: reps });
    saveLog(log);
  }
  function exerciseById(id) {
    for (let i = 0; i < DATA.EXERCISES.length; i++) if (DATA.EXERCISES[i].id === id) return DATA.EXERCISES[i];
    return null;
  }
  // 筋肉ごとの蓄積負荷 (半減期つき)
  function muscleScores() {
    const log = loadLog();
    const now = Date.now();
    const scores = {};
    const lastDate = {};
    for (let i = 0; i < log.length; i++) {
      const e = log[i];
      const ex = exerciseById(e.ex);
      if (!ex) continue;
      const days = (now - e.d) / 86400000;
      const vol = e.sets * e.reps * (ex.volFactor || 1) * Math.pow(0.5, days / HALF_LIFE_DAYS);
      for (const m in ex.muscles) {
        scores[m] = (scores[m] || 0) + vol * ex.muscles[m];
        if (lastDate[m] === undefined || e.d > lastDate[m]) lastDate[m] = e.d;
      }
    }
    let max = 0;
    for (const m in scores) if (scores[m] > max) max = scores[m];
    return { scores: scores, max: max, lastDate: lastDate };
  }

  // ---------- 筋肉カラーリング ----------
  function loadColor(t) {
    const c = new THREE.Color();
    if (t <= 0) { c.setHex(FIG.MUSCLE_BASE); return c; }
    c.setHSL((55 - 55 * t) / 360, 0.85, 0.52);
    return c;
  }
  function heatColor(t) {
    const c = new THREE.Color();
    if (t <= 0) { c.setHex(0x3c4654); return c; }
    c.setHSL((215 - 215 * t) / 360, 0.78, 0.46 + 0.08 * t);
    return c;
  }
  function paintMuscle(id, color, glow) {
    const mat = fig.mats[id];
    if (!mat) return;
    mat.color.copy(color);
    mat.userData.baseColor.copy(color);
    mat.userData.baseEmissive.copy(color).multiplyScalar(glow);
    mat.emissive.copy(mat.userData.baseEmissive);
  }
  function applyExerciseColors(ex) {
    for (const id in DATA.MUSCLES) {
      const load = ex.muscles[id] || 0;
      paintMuscle(id, loadColor(load), 0.28 * load);
    }
  }
  function applyHeatColors() {
    const h = muscleScores();
    for (const id in DATA.MUSCLES) {
      const t = h.max > 0 ? (h.scores[id] || 0) / h.max : 0;
      paintMuscle(id, heatColor(t), 0.25 * t);
    }
    return h;
  }
  function setMuscleHover(id, on) {
    const mat = fig.mats[id];
    if (!mat) return;
    if (on) mat.emissive.setRGB(0.45, 0.45, 0.5);
    else mat.emissive.copy(mat.userData.baseEmissive);
  }

  // ---------- UI 状態 ----------
  let mode = 'exercise';
  let current = DATA.EXERCISES[0];
  let playing = true;
  let speed = 1;
  let phase = 0;

  const elList = document.getElementById('exercise-list');
  const elPanel = document.getElementById('panel');
  const btnPlay = document.getElementById('btn-play');
  const elSpeed = document.getElementById('speed');
  const elSpeedLabel = document.getElementById('speed-label');
  const elScrub = document.getElementById('scrub');
  const elToast = document.getElementById('toast');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  let toastTimer = null;
  function toast(msg) {
    elToast.textContent = msg;
    elToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { elToast.classList.remove('show'); }, 1800);
  }

  // 種目リスト
  function renderList() {
    elList.innerHTML = DATA.EXERCISES.map(function (ex) {
      return '<button class="ex-btn' + (ex === current ? ' active' : '') + '" data-ex="' + ex.id + '">' +
        '<span class="jp">' + esc(ex.jp) + '</span><span class="en">' + esc(ex.en) + '</span></button>';
    }).join('');
  }
  elList.addEventListener('click', function (e) {
    const btn = e.target.closest('.ex-btn');
    if (!btn) return;
    selectExercise(exerciseById(btn.dataset.ex));
  });

  function selectExercise(ex) {
    if (!ex) return;
    current = ex;
    phase = 0;
    applyExerciseColors(ex);
    updateEquipment();
    flyTo(ex.camera);
    renderList();
    renderExercisePanel();
  }

  function updateEquipment() {
    const eq = mode === 'exercise' ? current.equipment : null;
    pullupRig.visible = eq === 'pullup';
    dipRig.visible = eq === 'dip';
  }

  function muscleRowsHtml(loads, mode_) {
    const ids = Object.keys(loads).sort(function (a, b) { return loads[b] - loads[a]; });
    return ids.map(function (id) {
      const t = loads[id];
      const col = (mode_ === 'heat' ? heatColor(t) : loadColor(t)).getStyle();
      return '<div class="muscle-row" data-muscle="' + id + '">' +
        '<span>' + esc(DATA.MUSCLES[id]) + '</span>' +
        '<span class="bar-track"><span class="bar" style="width:' + Math.round(t * 100) + '%;background:' + col + '"></span></span>' +
        '<span class="pct">' + Math.round(t * 100) + '</span></div>';
    }).join('');
  }

  function bindMuscleHover(container) {
    container.querySelectorAll('.muscle-row').forEach(function (row) {
      row.addEventListener('mouseenter', function () { setMuscleHover(row.dataset.muscle, true); });
      row.addEventListener('mouseleave', function () { setMuscleHover(row.dataset.muscle, false); });
    });
  }

  // 種目ビューの右パネル
  function renderExercisePanel() {
    const ex = current;
    const log = loadLog();
    const now = Date.now();
    let total30 = 0;
    for (let i = 0; i < log.length; i++) {
      if (log[i].ex === ex.id && now - log[i].d < 30 * 86400000) total30 += log[i].sets * log[i].reps;
    }
    elPanel.innerHTML =
      '<h2>' + esc(ex.jp) + '<span class="en">' + esc(ex.en) + '</span></h2>' +
      '<p class="desc">' + esc(ex.desc) + '</p>' +
      '<h3>フォームのポイント</h3>' +
      '<ul class="points">' + ex.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
      '<h3>鍛える筋肉 (負荷の強さ)</h3>' +
      '<div id="muscle-list">' + muscleRowsHtml(ex.muscles, 'load') + '</div>' +
      '<h3>トレーニングを記録</h3>' +
      '<div class="log-form">' +
        '<label>セット<input id="in-sets" type="number" min="1" max="20" value="3"></label>' +
        '<label>' + esc(ex.unit === '秒' ? '秒数' : '回数') + '<input id="in-reps" type="number" min="1" max="999" value="' + (ex.unit === '秒' ? 30 : 10) + '"></label>' +
        '<span class="unit">' + esc(ex.unit) + '</span>' +
        '<button id="btn-log">記録する</button>' +
      '</div>' +
      '<p class="log-total">直近30日の累計: <b>' + total30 + ' ' + esc(ex.unit) + '</b></p>';

    bindMuscleHover(elPanel);
    document.getElementById('btn-log').addEventListener('click', function () {
      const sets = parseInt(document.getElementById('in-sets').value, 10);
      const reps = parseInt(document.getElementById('in-reps').value, 10);
      if (!(sets >= 1) || !(reps >= 1)) { toast('セット数と回数を入力してください'); return; }
      addLog(ex.id, sets, reps);
      toast(ex.jp + ' ' + sets + '×' + reps + esc(ex.unit) + ' を記録しました💪');
      renderExercisePanel();
    });
  }

  // 鍛え度マップの右パネル
  function renderHeatPanel() {
    const h = applyHeatColors();
    const hasData = h.max > 0;
    const now = Date.now();

    let rows = '';
    if (hasData) {
      const ids = Object.keys(DATA.MUSCLES).sort(function (a, b) { return (h.scores[b] || 0) - (h.scores[a] || 0); });
      rows = ids.map(function (id) {
        const t = (h.scores[id] || 0) / h.max;
        const col = heatColor(t).getStyle();
        let ago = '—';
        if (h.lastDate[id]) {
          const days = Math.floor((now - h.lastDate[id]) / 86400000);
          ago = days === 0 ? '今日' : days + '日前';
        }
        return '<div class="muscle-row" data-muscle="' + id + '">' +
          '<span>' + esc(DATA.MUSCLES[id]) + '</span>' +
          '<span class="bar-track"><span class="bar" style="width:' + Math.round(t * 100) + '%;background:' + col + '"></span></span>' +
          '<span class="ago">' + esc(ago) + '</span></div>';
      }).join('');
    }

    const log = loadLog().slice().reverse().slice(0, 8);
    const hist = log.map(function (e) {
      const ex = exerciseById(e.ex);
      if (!ex) return '';
      const d = new Date(e.d);
      return '<div class="hist-row">' +
        '<span class="date">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span>' +
        '<span class="what">' + esc(ex.jp) + ' ' + e.sets + '×' + e.reps + esc(ex.unit) + '</span>' +
        '<button data-del="' + esc(e.id) + '" title="削除">✕</button></div>';
    }).join('');

    elPanel.innerHTML =
      '<h2>鍛え度マップ<span class="en">Training Heatmap</span></h2>' +
      '<p class="desc">記録したトレーニングから筋肉ごとの蓄積負荷を表示します。負荷は約' + HALF_LIFE_DAYS + '日で半減するため、続けるほど濃く保てます。</p>' +
      '<div class="heat-legend"><span class="zero"></span><span>未トレ</span><span class="grad"></span><span>高</span></div>' +
      (hasData
        ? '<h3>筋肉ごとの鍛え度</h3><div id="muscle-list">' + rows + '</div>'
        : '<div class="heat-empty">まだ記録がありません。<br>「種目ビュー」でトレーニングを記録すると、鍛えた筋肉がモデル上に色づいて表示されます。</div>') +
      (hist
        ? '<h3>最近の記録</h3>' + hist + '<button id="btn-clear-log">全履歴を削除</button>'
        : '');

    bindMuscleHover(elPanel);
    elPanel.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        saveLog(loadLog().filter(function (e) { return e.id !== btn.dataset.del; }));
        renderHeatPanel();
        toast('記録を削除しました');
      });
    });
    const clearBtn = document.getElementById('btn-clear-log');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('トレーニング履歴をすべて削除しますか?')) {
          saveLog([]);
          renderHeatPanel();
        }
      });
    }
  }

  // モード切替
  const btnModeEx = document.getElementById('mode-exercise');
  const btnModeHeat = document.getElementById('mode-heat');
  function setMode(m) {
    mode = m;
    document.body.classList.toggle('heat-mode', m === 'heat');
    btnModeEx.classList.toggle('active', m === 'exercise');
    btnModeHeat.classList.toggle('active', m === 'heat');
    updateEquipment();
    if (m === 'heat') {
      renderHeatPanel();
      flyTo({ az: cam.az + 30, el: 12, r: 3.4, ty: 0.9 });
    } else {
      applyExerciseColors(current);
      flyTo(current.camera);
      renderExercisePanel();
    }
  }
  btnModeEx.addEventListener('click', function () { setMode('exercise'); });
  btnModeHeat.addEventListener('click', function () { setMode('heat'); });

  // 再生コントロール
  btnPlay.addEventListener('click', function () {
    playing = !playing;
    btnPlay.textContent = playing ? '❚❚' : '▶';
  });
  elSpeed.addEventListener('input', function () {
    speed = parseFloat(elSpeed.value);
    elSpeedLabel.textContent = '×' + speed.toFixed(1);
  });
  elScrub.addEventListener('input', function () {
    phase = elScrub.value / 1000;
  });

  // ---------- リサイズ ----------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- メインループ ----------
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (mode === 'exercise') {
      if (playing) {
        phase = (phase + dt * speed / current.cycle) % 1;
        elScrub.value = Math.round(phase * 1000);
      }
      const u = (1 - Math.cos(2 * Math.PI * phase)) / 2;
      FIG.setPose(fig, current.pose(u));
      FIG.applyContacts(fig, current.contacts);
    } else {
      FIG.setPose(fig, DATA.STAND_POSE);
      if (!camGoal && pointers.size === 0) cam.az += dt * 9; // ゆっくり自動回転
    }

    updateCamera(dt);
    renderer.render(scene, camera);
  }

  // ---------- 起動 ----------
  renderList();
  selectExercise(current);
  cam.az = current.camera.az; cam.el = current.camera.el;
  cam.r = current.camera.r; cam.ty = current.camera.ty;
  camGoal = null;
  animate();
})();
