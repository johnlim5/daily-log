/* 自重トレーニング 3D ガイド — 関節付き人体モデル */
(function (g) {
  'use strict';

  const NEUTRAL = 0x6b7686;     // 骨格・非筋肉パーツ
  const MUSCLE_BASE = 0x55606e; // 筋肉の未ハイライト色

  // 関節の長さ定数 (data.js のFKと一致させること)
  const UPPER_ARM = 0.28, FOREARM = 0.26, THIGH = 0.42, SHIN = 0.40;

  function build() {
    const mats = {};
    const neutral = new THREE.MeshStandardMaterial({ color: NEUTRAL, roughness: 0.6, metalness: 0.05 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.4 });

    function muscleMat(id) {
      if (!mats[id]) {
        mats[id] = new THREE.MeshStandardMaterial({
          color: MUSCLE_BASE, roughness: 0.45, metalness: 0.05,
        });
        mats[id].userData = { baseColor: new THREE.Color(MUSCLE_BASE), baseEmissive: new THREE.Color(0x000000) };
      }
      return mats[id];
    }

    const joints = {};
    const keys = {};

    function grp(name, parent, x, y, z) {
      const o = new THREE.Group();
      o.position.set(x, y, z);
      parent.add(o);
      joints[name] = o;
      return o;
    }
    function key(name, parent, x, y, z) {
      const o = new THREE.Object3D();
      o.position.set(x, y, z);
      parent.add(o);
      keys[name] = o;
    }
    function mesh(parent, geo, mat, x, y, z, sx, sy, sz) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (sx !== undefined) m.scale.set(sx, sy, sz);
      m.castShadow = true;
      parent.add(m);
      return m;
    }
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
    const sph = (r) => new THREE.SphereGeometry(r, 18, 14);
    const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

    // ---- 骨盤 (root) ----
    const root = new THREE.Group();
    joints.root = root;
    mesh(root, box(0.24, 0.15, 0.16), neutral, 0, -0.02, 0);
    mesh(root, sph(0.075), muscleMat('glutes'), -0.07, -0.06, -0.07, 1, 1.15, 0.85);
    mesh(root, sph(0.075), muscleMat('glutes'), 0.07, -0.06, -0.07, 1, 1.15, 0.85);
    key('pelvisLow', root, 0, -0.10, 0);

    // ---- 腰椎 → 体幹下部 ----
    const spine = grp('spine', root, 0, 0.10, 0);
    mesh(spine, cap(0.095, 0.10), neutral, 0, 0.10, 0, 1.25, 1, 0.8);
    mesh(spine, box(0.15, 0.20, 0.05), muscleMat('abs'), 0, 0.10, 0.085);
    mesh(spine, box(0.05, 0.17, 0.09), muscleMat('obliques'), -0.10, 0.09, 0.02);
    mesh(spine, box(0.05, 0.17, 0.09), muscleMat('obliques'), 0.10, 0.09, 0.02);
    mesh(spine, box(0.17, 0.17, 0.05), muscleMat('lowerBack'), 0, 0.09, -0.075);

    // ---- 胸郭 ----
    const chest = grp('chest', spine, 0, 0.22, 0);
    mesh(chest, cap(0.125, 0.07), neutral, 0, 0.07, 0, 1.2, 1, 0.78);
    mesh(chest, sph(0.07), muscleMat('chest'), -0.072, 0.095, 0.095, 1.25, 0.95, 0.55);
    mesh(chest, sph(0.07), muscleMat('chest'), 0.072, 0.095, 0.095, 1.25, 0.95, 0.55);
    mesh(chest, box(0.24, 0.15, 0.05), muscleMat('lats'), 0, 0.02, -0.075);
    mesh(chest, box(0.17, 0.06, 0.07), muscleMat('traps'), 0, 0.185, -0.04);
    key('backK', chest, 0, 0.15, -0.10);

    // ---- 首・頭 ----
    const neck = grp('neck', chest, 0, 0.215, 0);
    mesh(neck, cap(0.042, 0.05), neutral, 0, 0.035, 0);
    mesh(neck, sph(0.10), neutral, 0, 0.155, 0, 0.88, 1.08, 0.95);
    mesh(neck, sph(0.012), eyeMat, -0.034, 0.175, 0.085);
    mesh(neck, sph(0.012), eyeMat, 0.034, 0.175, 0.085);
    key('headTop', neck, 0, 0.26, 0);

    // ---- 腕 (s: -1=左/+1=右) ----
    function buildArm(s) {
      const L = s < 0 ? 'L' : 'R';
      const sh = grp('shoulder' + L, chest, 0.21 * s, 0.155, 0);
      mesh(sh, sph(0.062), muscleMat('deltoid'), 0, 0, 0, 1.1, 1.15, 1.05);
      mesh(sh, cap(0.038, 0.13), neutral, 0, -0.15, 0);
      mesh(sh, cap(0.034, 0.06), muscleMat('biceps'), 0, -0.13, 0.036);
      mesh(sh, cap(0.032, 0.085), muscleMat('triceps'), 0, -0.145, -0.036);
      const el = grp('elbow' + L, sh, 0, -UPPER_ARM, 0);
      mesh(el, cap(0.034, 0.15), muscleMat('forearm'), 0, -0.115, 0, 1, 1, 0.95);
      mesh(el, sph(0.040), neutral, 0, -FOREARM, 0, 0.9, 1.1, 1.2);
      key('hand' + L, el, 0, -FOREARM - 0.03, 0);
    }
    buildArm(-1);
    buildArm(1);

    // ---- 脚 ----
    function buildLeg(s) {
      const L = s < 0 ? 'L' : 'R';
      const hp = grp('hip' + L, root, 0.10 * s, -0.05, 0);
      mesh(hp, cap(0.052, 0.24), neutral, 0, -0.20, 0);
      mesh(hp, cap(0.048, 0.16), muscleMat('quads'), 0, -0.185, 0.045);
      mesh(hp, cap(0.043, 0.15), muscleMat('hams'), 0, -0.20, -0.045);
      const kn = grp('knee' + L, hp, 0, -THIGH, 0);
      mesh(kn, sph(0.052), neutral, 0, -0.005, 0, 0.95, 1, 0.95);
      mesh(kn, cap(0.036, 0.20), neutral, 0, -0.20, 0);
      mesh(kn, cap(0.040, 0.10), muscleMat('calves'), 0, -0.145, -0.038);
      const an = grp('ankle' + L, kn, 0, -SHIN, 0);
      mesh(an, box(0.085, 0.06, 0.21), neutral, 0, -0.045, 0.045);
      key('toe' + L, an, 0, -0.075, 0.15);
      key('heel' + L, an, 0, -0.075, -0.06);
    }
    buildLeg(-1);
    buildLeg(1);

    return { group: root, joints: joints, keys: keys, mats: mats };
  }

  const JOINT_NAMES = [
    'spine', 'chest', 'neck',
    'shoulderL', 'shoulderR', 'elbowL', 'elbowR',
    'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR',
  ];

  // pose: data.js の各種目 pose(u) が返すオブジェクト (角度はdeg)
  function setPose(fig, pose) {
    const J = fig.joints;
    const D = THREE.MathUtils.degToRad;
    for (let i = 0; i < JOINT_NAMES.length; i++) J[JOINT_NAMES[i]].rotation.set(0, 0, 0);

    const r = pose.root || {};
    const rp = r.pos || [0, 1, 0];
    const rr = r.rot || [0, 0, 0];
    J.root.position.set(rp[0], rp[1], rp[2]);
    J.root.rotation.set(D(rr[0]), D(rr[1]), D(rr[2]));

    if (pose.spine) J.spine.rotation.x = D(pose.spine.bend || 0);
    if (pose.chest) J.chest.rotation.x = D(pose.chest.bend || 0);
    if (pose.neck) J.neck.rotation.x = D(pose.neck.bend || 0);

    const sides = [['L', -1], ['R', 1]];
    for (let i = 0; i < sides.length; i++) {
      const L = sides[i][0], s = sides[i][1];
      const sh = pose['shoulder' + L] || {};
      const el = pose['elbow' + L] || {};
      const hp = pose['hip' + L] || {};
      const kn = pose['knee' + L] || {};
      const an = pose['ankle' + L] || {};
      J['shoulder' + L].rotation.set(D(-(sh.flex || 0)), 0, D(s * (sh.abduct || 0)));
      J['elbow' + L].rotation.x = D(-(el.bend || 0));
      J['hip' + L].rotation.set(D(-(hp.flex || 0)), 0, D(s * (hp.abduct || 0)));
      J['knee' + L].rotation.x = D(kn.bend || 0);
      J['ankle' + L].rotation.x = D(an.plantar || 0);
    }
  }

  // 接地補正: 指定キーポイントが目標高さに合うようrootを上下させる
  const _v = new THREE.Vector3();
  function applyContacts(fig, contacts) {
    if (!contacts) return;
    fig.group.updateMatrixWorld(true);
    let val;
    if (contacts.mode === 'min') {
      val = Infinity;
      for (let i = 0; i < contacts.points.length; i++) {
        fig.keys[contacts.points[i]].getWorldPosition(_v);
        if (_v.y < val) val = _v.y;
      }
    } else { // mean
      val = 0;
      for (let i = 0; i < contacts.points.length; i++) {
        fig.keys[contacts.points[i]].getWorldPosition(_v);
        val += _v.y;
      }
      val /= contacts.points.length;
    }
    fig.group.position.y += contacts.target - val;
  }

  g.BWT_FIGURE = {
    build: build,
    setPose: setPose,
    applyContacts: applyContacts,
    MUSCLE_BASE: MUSCLE_BASE,
  };
})(typeof window !== 'undefined' ? window : globalThis);
