/* 自重トレーニング 3D ガイド — 種目・筋肉データ */
(function (g) {
  'use strict';

  function lerp(a, b, t) { return a + (b - a) * t; }

  // 脚の簡易FK: 股関節ピボット基準の足首相対位置 (root無回転時)
  // h: 股関節屈曲deg(前方+), k: 膝屈曲deg
  const THIGH = 0.42, SHIN = 0.40;
  function ankleRel(h, k) {
    const hr = h * Math.PI / 180;
    const sr = (h - k) * Math.PI / 180;
    return {
      y: -(THIGH * Math.cos(hr) + SHIN * Math.cos(sr)),
      z: THIGH * Math.sin(hr) + SHIN * Math.sin(sr),
    };
  }

  const MUSCLES = {
    chest:     '大胸筋',
    deltoid:   '三角筋',
    triceps:   '上腕三頭筋',
    biceps:    '上腕二頭筋',
    forearm:   '前腕筋群',
    abs:       '腹直筋',
    obliques:  '腹斜筋',
    lats:      '広背筋',
    traps:     '僧帽筋',
    lowerBack: '脊柱起立筋',
    glutes:    '大臀筋',
    quads:     '大腿四頭筋',
    hams:      'ハムストリングス',
    calves:    'ふくらはぎ',
  };

  // ポーズ組み立てヘルパー
  function arms(flex, abduct, bend) {
    return {
      shoulderL: { flex: flex, abduct: abduct },
      shoulderR: { flex: flex, abduct: abduct },
      elbowL: { bend: bend },
      elbowR: { bend: bend },
    };
  }
  function legs(flex, abduct, bend, plantar) {
    return {
      hipL: { flex: flex, abduct: abduct },
      hipR: { flex: flex, abduct: abduct },
      kneeL: { bend: bend },
      kneeR: { bend: bend },
      ankleL: { plantar: plantar },
      ankleR: { plantar: plantar },
    };
  }
  function merge() {
    const o = {};
    for (let i = 0; i < arguments.length; i++) Object.assign(o, arguments[i]);
    return o;
  }

  // 鍛え度マップ表示用の直立ポーズ
  const STAND_POSE = merge(
    { root: { pos: [0, 1.005, 0], rot: [0, 0, 0] } },
    arms(4, 14, 8),
    legs(0, 4, 0, 0)
  );

  const EXERCISES = [
    {
      id: 'pushup',
      jp: 'プッシュアップ',
      en: 'Push-up',
      desc: '胸・腕・体幹を同時に鍛える基本種目。体を一直線に保ったまま腕で押し上げる。',
      cycle: 2.6,
      unit: '回',
      muscles: { chest: 1.0, triceps: 0.7, deltoid: 0.6, abs: 0.4, forearm: 0.2 },
      points: [
        '頭からかかとまで一直線をキープ',
        '手は肩の真下よりやや外側に置く',
        '胸が床に近づくまで深く下ろす',
        '腰を反らせない・お尻を上げない',
      ],
      camera: { az: 75, el: 18, r: 3.2, ty: 0.45 },
      contacts: { points: ['handL', 'handR', 'toeL', 'toeR'], mode: 'min', target: 0.02 },
      pose: function (u) {
        const a = lerp(18, 10, u);            // 体幹の傾き(つま先支点)
        const flex = lerp(90, 45, u) - a;     // 上腕の対地角を保つ
        const bend = lerp(8, 95, u);
        return merge(
          { root: { pos: [0, lerp(0.42, 0.31, u), 0.22], rot: [90 - a, 0, 0] } },
          { neck: { bend: -30 }, spine: { bend: -2 } },
          arms(flex, 12, bend),
          legs(-3, 4, 0, 0)
        );
      },
    },
    {
      id: 'squat',
      jp: 'スクワット',
      en: 'Squat',
      desc: '下半身全体を鍛える「キング・オブ・エクササイズ」。お尻を引きながらしゃがむ。',
      cycle: 3.0,
      unit: '回',
      muscles: { quads: 1.0, glutes: 0.8, hams: 0.5, lowerBack: 0.4, calves: 0.3, abs: 0.3 },
      points: [
        '足は肩幅、つま先はやや外向き',
        '膝とつま先の向きを揃える',
        '太ももが床と平行になる深さまで',
        '胸を張って背中を丸めない',
      ],
      camera: { az: 40, el: 12, r: 3.0, ty: 0.75 },
      contacts: { points: ['toeL', 'toeR', 'heelL', 'heelR'], mode: 'min', target: 0.02 },
      pose: function (u) {
        const h = lerp(0, 100, u), k = lerp(0, 112, u);
        const ank = ankleRel(h, k);
        return merge(
          { root: { pos: [0, 0.155 - ank.y, -ank.z], rot: [0, 0, 0] } },
          { spine: { bend: lerp(5, 32, u) }, chest: { bend: lerp(0, 6, u) }, neck: { bend: lerp(-5, -18, u) } },
          arms(lerp(8, 80, u), 6, lerp(5, 15, u)),
          legs(h, 7, k, h - k)
        );
      },
    },
    {
      id: 'plank',
      jp: 'プランク',
      en: 'Plank',
      desc: '体幹の安定性を鍛える静的種目。肘とつま先で体を一直線に支え続ける。',
      cycle: 4.0,
      unit: '秒',
      volFactor: 0.34,
      muscles: { abs: 1.0, obliques: 0.6, lowerBack: 0.5, deltoid: 0.4, glutes: 0.3, quads: 0.2 },
      points: [
        '肘は肩の真下に置く',
        '頭からかかとまで一直線',
        'お腹を引き込み腰を反らせない',
        '呼吸を止めずにキープ',
      ],
      camera: { az: 90, el: 22, r: 3.0, ty: 0.4 },
      contacts: { points: ['handL', 'handR', 'toeL', 'toeR'], mode: 'min', target: 0.02 },
      pose: function (u) {
        const a = 5.5;
        const sway = Math.sin(u * Math.PI) * 1.5;
        return merge(
          { root: { pos: [0, 0.30, 0.18], rot: [90 - a, 0, 0] } },
          { neck: { bend: -25 }, spine: { bend: -2 + sway } },
          arms(90 - a, 8, 90),
          legs(-2, 4, 0, 0)
        );
      },
    },
    {
      id: 'pullup',
      jp: '懸垂(チンニング)',
      en: 'Pull-up',
      desc: '背中を鍛える最強の自重種目。バーにぶら下がり、顎がバーを越えるまで引き上げる。',
      cycle: 3.2,
      unit: '回',
      equipment: 'pullup',
      muscles: { lats: 1.0, biceps: 0.8, forearm: 0.6, traps: 0.6, deltoid: 0.3, abs: 0.3 },
      points: [
        '肩幅よりやや広めにバーを握る',
        '肩甲骨を寄せ下げてから引き上げる',
        '顎がバーを越えるまで',
        '反動を使わずコントロールして下ろす',
      ],
      camera: { az: 30, el: 18, r: 4.2, ty: 1.45 },
      contacts: { points: ['handL', 'handR'], mode: 'mean', target: 2.2 },
      pose: function (u) {
        // 手がバー位置(z)からずれないようrootを前後補正
        const zComp = -0.06 - 0.16 * Math.sin(Math.PI * u);
        return merge(
          { root: { pos: [0, lerp(1.15, 1.66, u), zComp], rot: [0, 0, 0] } },
          { neck: { bend: lerp(-8, -18, u) }, spine: { bend: lerp(-4, -8, u) } },
          arms(lerp(168, 28, u), lerp(20, 14, u), lerp(2, 142, u)),
          legs(lerp(6, 14, u), 4, lerp(25, 50, u), 30)
        );
      },
    },
    {
      id: 'lunge',
      jp: 'ランジ',
      en: 'Lunge',
      desc: '片脚ずつ集中的に鍛える種目。前後に開いた脚をまっすぐ沈み込ませる。',
      cycle: 2.8,
      unit: '回',
      muscles: { quads: 1.0, glutes: 0.9, hams: 0.6, calves: 0.4, abs: 0.4 },
      points: [
        '上体は常に立てたまま',
        '前膝はつま先より前に出しすぎない',
        '後ろ膝を床すれすれまで下ろす',
        '左右の脚を入れ替えて行う',
      ],
      camera: { az: 55, el: 12, r: 3.2, ty: 0.7 },
      contacts: { points: ['toeR', 'heelR', 'toeL'], mode: 'min', target: 0.02 },
      pose: function (u) {
        const hR = lerp(25, 80, u), kR = lerp(15, 80, u);
        const a = ankleRel(hR, kR);
        return merge(
          { root: { pos: [0, 0.155 - a.y, 0.26 - a.z], rot: [0, 0, 0] } },
          { spine: { bend: lerp(4, 10, u) }, neck: { bend: -6 } },
          arms(5, 10, 8),
          {
            hipR: { flex: hR, abduct: 5 }, kneeR: { bend: kR }, ankleR: { plantar: hR - kR },
            hipL: { flex: lerp(-12, -16, u), abduct: 5 }, kneeL: { bend: lerp(18, 60, u) },
            ankleL: { plantar: lerp(28, 45, u) },
          }
        );
      },
    },
    {
      id: 'dips',
      jp: 'ディップス',
      en: 'Dips',
      desc: '「上半身のスクワット」。平行バーに体を支え、腕の力で上下させる。',
      cycle: 2.8,
      unit: '回',
      equipment: 'dip',
      muscles: { triceps: 1.0, chest: 0.8, deltoid: 0.5, traps: 0.2, abs: 0.2 },
      points: [
        '肩をすくめず肩甲骨を下げる',
        '肘が90°になるまで下ろす',
        'やや前傾すると大胸筋に効く',
        '肩に痛みが出たら可動域を狭く',
      ],
      camera: { az: 45, el: 15, r: 3.6, ty: 1.05 },
      contacts: { points: ['handL', 'handR'], mode: 'mean', target: 1.1 },
      pose: function (u) {
        return merge(
          { root: { pos: [0, lerp(1.2, 0.97, u), lerp(0, 0.06, u)], rot: [lerp(4, 16, u), 0, 0] } },
          { neck: { bend: lerp(-5, -12, u) }, spine: { bend: lerp(2, 8, u) } },
          arms(lerp(0, -62, u), 8, lerp(4, 78, u)),
          legs(lerp(8, 14, u), 4, lerp(75, 95, u), 25)
        );
      },
    },
    {
      id: 'crunch',
      jp: 'クランチ',
      en: 'Crunch',
      desc: '腹直筋を集中的に鍛える種目。仰向けから背中を丸めて肩甲骨を浮かせる。',
      cycle: 2.5,
      unit: '回',
      muscles: { abs: 1.0, obliques: 0.5 },
      points: [
        '腰は床につけたまま',
        'おへそを覗き込むように背中を丸める',
        '反動を使わずゆっくり',
        '首だけで起き上がらない',
      ],
      camera: { az: 80, el: 35, r: 2.8, ty: 0.35 },
      contacts: { points: ['pelvisLow'], mode: 'mean', target: 0.125 },
      pose: function (u) {
        return merge(
          { root: { pos: [0, 0.125, 0.18], rot: [-90, 0, 0] } },
          { spine: { bend: lerp(2, 32, u) }, chest: { bend: lerp(0, 26, u) }, neck: { bend: lerp(6, 18, u) } },
          arms(lerp(140, 150, u), 55, 115),
          legs(lerp(52, 62, u), 6, lerp(110, 118, u), 32)
        );
      },
    },
    {
      id: 'hiplift',
      jp: 'ヒップリフト',
      en: 'Glute Bridge',
      desc: 'お尻ともも裏を鍛える種目。仰向けで膝を立て、お尻を持ち上げて体を一直線に。',
      cycle: 2.8,
      unit: '回',
      muscles: { glutes: 1.0, hams: 0.7, lowerBack: 0.5, abs: 0.2 },
      points: [
        'かかとで床を押してお尻を持ち上げる',
        '肩から膝まで一直線になるまで',
        '頂点でお尻をギュッと締める',
        '腰の反りではなくお尻の力で上げる',
      ],
      camera: { az: 85, el: 25, r: 3.0, ty: 0.35 },
      contacts: { points: ['backK'], mode: 'mean', target: 0.03 },
      pose: function (u) {
        return merge(
          { root: { pos: [0, lerp(0.125, 0.34, u), lerp(0.20, 0.10, u)], rot: [lerp(-90, -115, u), 0, 0] } },
          { spine: { bend: lerp(0, -4, u) }, neck: { bend: lerp(4, 26, u) } },
          arms(2, 14, 8),
          legs(lerp(55, -12, u), 8, lerp(112, 88, u), lerp(30, 6, u))
        );
      },
    },
    {
      id: 'backext',
      jp: 'バックエクステンション',
      en: 'Back Extension',
      desc: 'うつ伏せから手脚と胸を持ち上げ、背面全体を鍛える種目。',
      cycle: 3.0,
      unit: '回',
      muscles: { lowerBack: 1.0, glutes: 0.7, hams: 0.5, traps: 0.4 },
      points: [
        '手脚を同時にゆっくり持ち上げる',
        '腰だけでなく背中全体で反らす',
        '痛みが出ない範囲の高さで',
        '頂点で1〜2秒キープ',
      ],
      camera: { az: 95, el: 30, r: 3.0, ty: 0.3 },
      contacts: { points: ['pelvisLow'], mode: 'mean', target: 0.125 },
      pose: function (u) {
        return merge(
          { root: { pos: [0, 0.13, 0], rot: [90, 0, 0] } },
          { spine: { bend: lerp(-2, -24, u) }, chest: { bend: lerp(-2, -20, u) }, neck: { bend: lerp(-10, -18, u) } },
          arms(lerp(155, 172, u), 30, lerp(20, 8, u)),
          legs(lerp(2, -15, u), 8, 4, 25)
        );
      },
    },
    {
      id: 'pike',
      jp: 'パイクプッシュアップ',
      en: 'Pike Push-up',
      desc: '肩を集中的に鍛える腕立て。お尻を高く上げた「へ」の字姿勢で頭を床へ下ろす。',
      cycle: 2.8,
      unit: '回',
      muscles: { deltoid: 1.0, triceps: 0.8, traps: 0.6, chest: 0.4, abs: 0.4 },
      points: [
        'お尻を高く上げ体で「へ」の字を作る',
        '頭頂部を床に向かって下ろす',
        '肘は斜め後ろに曲げる',
        '肩に体重を乗せる意識で',
      ],
      camera: { az: 85, el: 15, r: 3.4, ty: 0.5 },
      contacts: { points: ['handL', 'handR', 'toeL', 'toeR'], mode: 'min', target: 0.02 },
      pose: function (u) {
        return merge(
          { root: { pos: [0, lerp(0.60, 0.50, u), lerp(-0.12, -0.02, u)], rot: [lerp(126, 142, u), 0, 0] } },
          { chest: { bend: lerp(-2, -6, u) }, neck: { bend: lerp(-15, -5, u) } },
          arms(lerp(160, 148, u), 14, lerp(4, 82, u)),
          legs(lerp(84, 92, u), 8, 6, lerp(-12, -6, u))
        );
      },
    },
  ];

  g.BWT_DATA = {
    MUSCLES: MUSCLES,
    EXERCISES: EXERCISES,
    STAND_POSE: STAND_POSE,
    lerp: lerp,
  };
})(typeof window !== 'undefined' ? window : globalThis);
