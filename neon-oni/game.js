(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), portrait: $('portrait'), playerName: $('playerName'), livesValue: $('livesValue'),
    healthFill: $('healthFill'), meterFill: $('meterFill'), stageName: $('stageName'),
    waveValue: $('waveValue'), scoreValue: $('scoreValue'),
    comboBlock: $('comboBlock'), comboValue: $('comboValue'), banner: $('banner'),
    soundButton: $('soundButton'), pauseButton: $('pauseButton'),
    menu: $('menu'), playButton: $('playButton'), rosterButton: $('rosterButton'), rosterCount: $('rosterCount'),
    roster: $('roster'), rosterGrid: $('rosterGrid'), closeRosterButton: $('closeRosterButton'),
    rosterBackButton: $('rosterBackButton'), rosterUnlocked: $('rosterUnlocked'), rosterTotal: $('rosterTotal'),
    pauseScreen: $('pauseScreen'), pauseStats: $('pauseStats'), resumeButton: $('resumeButton'), quitButton: $('quitButton'),
    stageClear: $('stageClear'), clearScore: $('clearScore'), clearKills: $('clearKills'),
    clearCombo: $('clearCombo'), clearLives: $('clearLives'), clearUnlock: $('clearUnlock'),
    nextStageButton: $('nextStageButton'), clearMenuButton: $('clearMenuButton'),
    gameOver: $('gameOver'), overEyebrow: $('overEyebrow'), overTitle: $('overTitle'),
    overCopy: $('overCopy'), overScore: $('overScore'), overStage: $('overStage'),
    overKills: $('overKills'), overCombo: $('overCombo'), overRecord: $('overRecord'),
    retryButton: $('retryButton'), overMenuButton: $('overMenuButton'), toast: $('toast')
  };

  // ==================================================================
  // ПЕРСОНАЖИ
  // Вся графика рисуется кодом: скелет, одежда, волосы, глаза.
  // Ни одного внешнего изображения — вся стилистика авторская.
  // ==================================================================
  const FIGHTERS = {
    yuki: {
      id: 'yuki', name: 'ЁКИ', role: 'УЛИЧНЫЙ БОЕЦ',
      skin: '#ffd8bf', skinDark: '#e6b098',
      hair: '#3fd2ea', hairDark: '#1b7f97', hairLight: '#bdf3ff',
      outfit: '#1e2c60', outfitDark: '#101a40',
      accent: '#ff6ea8', eye: '#2f6be0', hairStyle: 'twin', ribbon: '#ff6ea8',
      hp: 120, speed: 150, power: 1.0, unlockAt: 0
    },
    ren: {
      id: 'ren', name: 'РЭН', role: 'РОНИН',
      skin: '#e8bd9a', skinDark: '#c9976f',
      hair: '#e04a5a', hairDark: '#8f2433', hairLight: '#ff9aa4',
      outfit: '#2b1b3f', outfitDark: '#180e26',
      accent: '#ffb44f', eye: '#c8402a', hairStyle: 'topknot', blade: true,
      hp: 100, speed: 176, power: 0.85, unlockAt: 1
    },
    kaede: {
      id: 'kaede', name: 'КАЭДЭ', role: 'ТЕНЬ',
      skin: '#ffe2cd', skinDark: '#d9ac8f',
      hair: '#9d7bff', hairDark: '#5b3fa8', hairLight: '#d9c9ff',
      outfit: '#12333a', outfitDark: '#0a1f24',
      accent: '#63e7ff', eye: '#5ad1e6', hairStyle: 'long',
      hp: 92, speed: 198, power: 0.74, unlockAt: 2
    }
  };
  const FIGHTER_ORDER = ['yuki', 'ren', 'kaede'];

  const FOES = {
    oni: {
      name: 'ОНИ', hp: 46, speed: 62, power: 1, score: 120,
      skin: '#8fbf6a', skinDark: '#5f8a44',
      hair: '#d84a3a', hairDark: '#8c2a20', hairLight: '#ff8a6a',
      outfit: '#3a2038', outfitDark: '#241426',
      accent: '#ffb44f', eye: '#ffdd44', hairStyle: 'horns', scale: 1.0, ai: 'melee'
    },
    kozame: {
      name: 'КОЗАМЭ', hp: 94, speed: 40, power: 1.5, score: 220,
      skin: '#6f8fd0', skinDark: '#4a63a0',
      hair: '#2f3a6a', hairDark: '#1a2144', hairLight: '#6a7cc0',
      outfit: '#20263f', outfitDark: '#12162a',
      accent: '#ff4757', eye: '#ff6ea8', hairStyle: 'mask', scale: 1.22, ai: 'melee'
    },
    kodama: {
      name: 'КОДАМА', hp: 30, speed: 112, power: 0.7, score: 160,
      skin: '#f0d0a8', skinDark: '#c9a276',
      hair: '#ffd166', hairDark: '#b8912f', hairLight: '#fff0b8',
      outfit: '#1a3a2e', outfitDark: '#0e231b',
      accent: '#b6ff3d', eye: '#e04a5a', hairStyle: 'bob', scale: 0.84, ai: 'melee'
    },
    tori: {
      name: 'ТОРИ', hp: 38, speed: 58, power: 0.8, score: 200,
      skin: '#c8a8d8', skinDark: '#9678a8',
      hair: '#4a2a6a', hairDark: '#2a1440', hairLight: '#8a5ab0',
      outfit: '#2a2040', outfitDark: '#170f26',
      accent: '#63e7ff', eye: '#b6ff3d', hairStyle: 'hood', scale: 0.96, ai: 'thrower'
    },
    // Щитоносец держит щит спереди: удар в лоб отскакивает, обойти можно
    // только уходом вглубь или приёмом. Это заставляет работать осью W и S.
    jitte: {
      name: 'ДЖИТТЕ', hp: 88, speed: 46, power: 1.2, score: 300,
      skin: '#8ea8c8', skinDark: '#5f7690',
      hair: '#c8d4e4', hairDark: '#7d8a9e', hairLight: '#ffffff',
      outfit: '#1e2c44', outfitDark: '#101a2c',
      accent: '#63e7ff', eye: '#ff6ea8', hairStyle: 'mask', scale: 1.14, ai: 'melee',
      guard: true, shield: '#8fd8f0'
    }
  };

  const BOSSES = {
    kido: {
      name: 'КИДО', hp: 340, speed: 54, power: 1.7, score: 1500,
      skin: '#d05a6a', skinDark: '#8c2f3f',
      hair: '#f0e0d0', hairDark: '#b0a090', hairLight: '#ffffff',
      outfit: '#2a1030', outfitDark: '#160820',
      accent: '#ff3d6e', eye: '#ffd166', hairStyle: 'crown', scale: 1.6, ai: 'melee', boss: true
    },
    goshin: {
      name: 'ГОШИН', hp: 470, speed: 60, power: 1.8, score: 2200,
      skin: '#7ab0d0', skinDark: '#4a80a0',
      hair: '#ffb44f', hairDark: '#b8801f', hairLight: '#ffe0a0',
      outfit: '#12303a', outfitDark: '#081c22',
      accent: '#ff4757', eye: '#ff6ea8', hairStyle: 'horns', scale: 1.55, ai: 'melee', boss: true
    },
    mura: {
      name: 'МУРА', hp: 640, speed: 68, power: 2.0, score: 3000,
      skin: '#b07ad0', skinDark: '#7a4aa0',
      hair: '#2a0a3a', hairDark: '#150520', hairLight: '#7a3aa0',
      outfit: '#1a0a2a', outfitDark: '#0c0414',
      accent: '#9d7bff', eye: '#b6ff3d', hairStyle: 'crown', scale: 1.6, ai: 'melee', boss: true
    },
    kuro: {
      name: 'КУРО', hp: 900, speed: 62, power: 2.2, score: 5000,
      skin: '#2e2e40', skinDark: '#15151f',
      hair: '#e8e0d0', hairDark: '#a89a88', hairLight: '#ffffff',
      outfit: '#08080f', outfitDark: '#000000',
      accent: '#b6ff3d', eye: '#ff3d6e', hairStyle: 'crown', scale: 1.78, ai: 'melee', boss: true
    }
  };

  // Пропорции фигуры. Голова крупная — 1:3.75 от роста, это аниме-стиль.
  const INK = '#140a1e';
  const HEAD_H = 34;
  const HEAD_W = 29;
  const NECK = 8;
  const TORSO = 36;
  const LEG = 42;
  const ARM_U = 17;
  const ARM_L = 16;
  const BODY_H = LEG + TORSO + NECK + HEAD_H;   // 120
  const TAU = Math.PI * 2;
  // Общий множитель фигуры. Рисование ведётся в единицах по 120 px,
  // а в мир попадает с этим коэффициентом — так один параметр
  // управляет размером сразу всех бойцов.
  const FIG = 1.3;

  // Затемнение цвета: тёмная одежда не сливается в одно пятно
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  const GRAVITY = 780;
  const JUMP_V = 300;
  const DASH_SPEED = 460;
  const DASH_TIME = 0.16;
  const DASH_CD = 0.5;
  const FLOOR_DEPTH = 112;

  const COMBO_TIMES = [0.16, 0.18, 0.26];
  const COMBO_DMG = [7, 9, 15];
  const COMBO_PUSH = [70, 90, 230];
  const COMBO_LIFT = [0, 0, 16];
  const COMBO_WINDOW = 0.5;

  // ==================================================================
  // РИСОВАНИЕ ПЕРСОНАЖА
  // Всё рисуется кодом: скелет, одежда, волосы, глаза.
  // Каждая форма обводится тёмным контуром — иначе фигура теряется в фоне.
  // ==================================================================
  function inkStroke(g, w) {
    g.strokeStyle = INK;
    g.lineWidth = w;
    g.lineJoin = 'round';
    g.stroke();
  }

  function capsule(g, x0, y0, x1, y1, w, color) {
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokeStyle = INK;
    g.lineWidth = w + 4;
    g.stroke();
    g.strokeStyle = color;
    g.lineWidth = w;
    g.stroke();
  }

  function makePose() {
    return {
      thighF: 0.1, shinF: 0, thighB: -0.1, shinB: 0,
      armF: 0.2, foreF: 0.3, armB: -0.2, foreB: 0.2,
      lean: 0, headTilt: 0, crouch: 0, bob: 0, armLen: 1
    };
  }

  function joint(x, y, ang, len) {
    return { x: x + Math.sin(ang) * len, y: y + Math.cos(ang) * len };
  }

  function foot(g, x, y, color, w) {
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(x, y, (w || 9) + 1.6, 4.6, 0, 0, TAU);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, w || 9, 3.4, 0, 0, TAU);
    g.fill();
  }

  // Форма головы: широкий верх, сужается к подбородку
  function facePath(g) {
    const hw = HEAD_W * 0.5;
    const hh = HEAD_H * 0.5;
    g.beginPath();
    g.moveTo(0, -hh);
    g.bezierCurveTo(hw * 0.76, -hh, hw, -hh * 0.42, hw, 0);
    g.bezierCurveTo(hw, hh * 0.48, hw * 0.64, hh * 0.86, 0, hh);
    g.bezierCurveTo(-hw * 0.64, hh * 0.86, -hw, hh * 0.48, -hw, 0);
    g.bezierCurveTo(-hw, -hh * 0.42, -hw * 0.76, -hh, 0, -hh);
    g.closePath();
  }

  // Волосы позади головы: силуэт должен быть шире головы
  function drawHairBack(g, def, color) {
    const st = def.hairStyle;
    const hw = HEAD_W * 0.5;
    const hh = HEAD_H * 0.5;
    g.fillStyle = color;
    if (st === 'long') {
      g.beginPath();
      g.moveTo(-hw, -hh * 0.2);
      g.bezierCurveTo(-hw * 1.7, hh * 0.5, -hw * 1.5, hh * 1.9, -hw * 0.85, hh * 2.3);
      g.lineTo(hw * 0.5, hh * 1.9);
      g.bezierCurveTo(-hw * 0.1, hh * 0.8, hw * 0.3, hh * 0.1, hw * 0.9, -hh * 0.5);
      g.closePath();
      g.fill();
      inkStroke(g, 2.6);
    } else if (st === 'twin') {
      [-1, 1].forEach((s) => {
        g.beginPath();
        g.moveTo(s * hw * 0.5, -hh * 0.5);
        g.bezierCurveTo(s * hw * 1.7, -hh * 0.3, s * hw * 1.6, hh * 1.1, s * hw * 0.75, hh * 1.55);
        g.bezierCurveTo(s * hw * 0.4, hh * 0.7, s * hw * 0.4, hh * 0.1, s * hw * 0.5, -hh * 0.5);
        g.closePath();
        g.fill();
        inkStroke(g, 2.4);
      });
    } else if (st === 'bob') {
      g.beginPath();
      g.ellipse(0, hh * 0.1, hw * 1.16, hh * 1.06, 0, 0, TAU);
      g.fill();
      inkStroke(g, 2.4);
    } else if (st === 'hood') {
      g.beginPath();
      g.moveTo(-hw * 1.3, hh * 0.7);
      g.bezierCurveTo(-hw * 1.4, -hh * 1.5, hw * 1.4, -hh * 1.5, hw * 1.3, hh * 0.7);
      g.bezierCurveTo(hw * 0.7, hh * 0.2, -hw * 0.7, hh * 0.2, -hw * 1.3, hh * 0.7);
      g.closePath();
      g.fill();
      inkStroke(g, 2.6);
    } else if (st === 'horns') {
      [-1, 1].forEach((s) => {
        g.beginPath();
        g.ellipse(s * hw * 1.05, hh * 0.25, hw * 0.3, hh * 0.42, s * 0.35, 0, TAU);
        g.fill();
        inkStroke(g, 2.2);
      });
    }
  }

  // Чёлка: несколько крупных острых прядей, кончики остаются НАД бровью,
  // иначе волосы накрывают глаз и лицо перестаёт читаться.
  function drawFringe(g, def, color, light) {
    const hw = HEAD_W * 0.5;
    const hh = HEAD_H * 0.5;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(-hw * 1.02, -hh * 0.3);
    g.bezierCurveTo(-hw * 1.14, -hh * 1.0, -hw * 0.6, -hh * 1.16, 0, -hh * 1.14);
    g.bezierCurveTo(hw * 0.68, -hh * 1.12, hw * 1.08, -hh * 0.92, hw * 1.02, -hh * 0.26);
    g.lineTo(hw * 0.74, -hh * 0.4);
    g.lineTo(hw * 0.9, -hh * 0.88);
    g.lineTo(hw * 0.38, -hh * 0.46);
    g.lineTo(hw * 0.46, -hh * 0.95);
    g.lineTo(hw * 0.04, -hh * 0.5);
    g.lineTo(-hw * 0.06, -hh * 0.96);
    g.lineTo(-hw * 0.42, -hh * 0.46);
    g.lineTo(-hw * 0.52, -hh * 0.9);
    g.lineTo(-hw * 0.76, -hh * 0.38);
    g.lineTo(-hw * 0.82, -hh * 0.84);
    g.closePath();
    g.fill();
    // Контур пряди красится её же тёмным оттенком, а не чёрным:
    // при крупном увеличении чёрная обводка превращает чёлку в пилу.
    g.strokeStyle = shade(color, -70);
    g.lineWidth = 1.6;
    g.lineJoin = 'round';
    g.stroke();

    // блик на макушке
    g.fillStyle = light;
    g.globalAlpha = 0.42;
    g.beginPath();
    g.ellipse(-hw * 0.24, -hh * 0.8, hw * 0.42, hh * 0.13, -0.18, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  }

  // Глаз: склера, радужка, зрачок, два блика, толстый лофт ресниц
  function drawEye(g, def, flash) {
    g.save();
    g.translate(HEAD_W * 0.19, HEAD_H * 0.1);
    g.rotate(-0.1);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(0, 0, HEAD_W * 0.185, HEAD_H * 0.215, 0, 0, TAU);
    g.fill();
    g.fillStyle = flash ? '#d8503a' : def.eye;
    g.beginPath();
    g.ellipse(HEAD_W * 0.026, HEAD_H * 0.018, HEAD_W * 0.128, HEAD_H * 0.186, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#1c1024';
    g.beginPath();
    g.ellipse(HEAD_W * 0.034, HEAD_H * 0.024, HEAD_W * 0.07, HEAD_H * 0.124, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(-HEAD_W * 0.034, -HEAD_H * 0.098, HEAD_W * 0.06, HEAD_H * 0.078, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(HEAD_W * 0.088, HEAD_H * 0.11, HEAD_W * 0.036, HEAD_H * 0.042, 0, 0, TAU);
    g.fill();
    g.restore();

    // лофт ресниц — главная примета аниме-глаз
    g.strokeStyle = flash ? '#3a1420' : def.hairDark;
    g.lineCap = 'round';
    g.lineWidth = HEAD_W * 0.1;
    g.beginPath();
    g.moveTo(HEAD_W * 0.01, -HEAD_H * 0.06);
    g.quadraticCurveTo(HEAD_W * 0.17, -HEAD_H * 0.27, HEAD_W * 0.35, -HEAD_H * 0.12);
    g.stroke();
    g.lineWidth = HEAD_W * 0.055;
    g.beginPath();
    g.moveTo(HEAD_W * 0.33, -HEAD_H * 0.13);
    g.lineTo(HEAD_W * 0.43, -HEAD_H * 0.2);
    g.stroke();
  }

  function drawFace(g, def, flash) {
    const skin = flash ? '#ffffff' : def.skin;
    const skinDark = flash ? '#ffffff' : def.skinDark;

    g.fillStyle = skin;
    facePath(g);
    g.fill();
    inkStroke(g, 2.4);

    // тень на дальней щеке
    g.save();
    facePath(g);
    g.clip();
    g.fillStyle = skinDark;
    g.globalAlpha = 0.45;
    g.beginPath();
    g.ellipse(-HEAD_W * 0.3, HEAD_H * 0.06, HEAD_W * 0.26, HEAD_H * 0.42, 0, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.restore();

    // уши
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(HEAD_W * 0.06, HEAD_H * 0.1, HEAD_W * 0.07, HEAD_H * 0.1, 0, 0, TAU);
    g.fill();

    drawEye(g, def, flash);

    // бровь
    g.strokeStyle = flash ? '#3a1420' : def.hairDark;
    g.lineCap = 'round';
    g.lineWidth = HEAD_W * 0.065;
    g.globalAlpha = 0.88;
    g.beginPath();
    g.moveTo(HEAD_W * 0.02, -HEAD_H * 0.3);
    g.quadraticCurveTo(HEAD_W * 0.18, -HEAD_H * 0.37, HEAD_W * 0.31, -HEAD_H * 0.29);
    g.stroke();
    g.globalAlpha = 1;

    // нос — короткий штрих у основания, иначе читается как родинка
    g.strokeStyle = skinDark;
    g.lineWidth = HEAD_W * 0.035;
    g.globalAlpha = 0.7;
    g.beginPath();
    g.moveTo(HEAD_W * 0.24, HEAD_H * 0.2);
    g.lineTo(HEAD_W * 0.275, HEAD_H * 0.235);
    g.stroke();
    g.globalAlpha = 1;

    // рот
    if (flash) {
      g.strokeStyle = skinDark;
      g.lineWidth = HEAD_W * 0.055;
      g.beginPath();
      g.moveTo(HEAD_W * 0.15, HEAD_H * 0.33);
      g.lineTo(HEAD_W * 0.26, HEAD_H * 0.33);
      g.stroke();
    } else {
      g.strokeStyle = skinDark;
      g.lineWidth = HEAD_W * 0.05;
      g.beginPath();
      g.moveTo(HEAD_W * 0.15, HEAD_H * 0.33);
      g.quadraticCurveTo(HEAD_W * 0.21, HEAD_H * 0.37, HEAD_W * 0.26, HEAD_H * 0.33);
      g.stroke();
    }

    // румянец
    g.fillStyle = 'rgba(255,120,150,0.3)';
    g.beginPath();
    g.ellipse(HEAD_W * 0.02, HEAD_H * 0.22, HEAD_W * 0.13, HEAD_H * 0.06, 0, 0, TAU);
    g.fill();
  }

  // Чёлка и украшения поверх головы
  function drawHairFront(g, def, flash) {
    const hair = flash ? '#ffffff' : def.hair;
    const hairLight = flash ? '#ffffff' : (def.hairLight || def.hair);
    const hairDark = flash ? '#ffffff' : def.hairDark;
    const st = def.hairStyle;
    const hw = HEAD_W * 0.5;
    const hh = HEAD_H * 0.5;

    drawFringe(g, def, hair, hairLight);

    if (st === 'twin') {
      // хвостики по бокам головы
      [-1, 1].forEach((s) => {
        g.fillStyle = hair;
        g.beginPath();
        g.moveTo(s * hw * 0.72, -hh * 0.5);
        g.bezierCurveTo(s * hw * 1.6, -hh * 0.2, s * hw * 1.5, hh * 0.7, s * hw * 0.8, hh * 0.9);
        g.bezierCurveTo(s * hw * 0.5, hh * 0.3, s * hw * 0.5, -hh * 0.2, s * hw * 0.72, -hh * 0.5);
        g.closePath();
        g.fill();
        inkStroke(g, 2.2);
        // резинка
        g.fillStyle = flash ? '#ffffff' : (def.ribbon || def.accent);
        g.beginPath();
        g.moveTo(s * hw * 0.6, -hh * 0.62);
        g.lineTo(s * hw * 1.05, -hh * 0.86);
        g.lineTo(s * hw * 1.1, -hh * 0.44);
        g.closePath();
        g.fill();
        inkStroke(g, 1.6);
      });
    } else if (st === 'topknot') {
      g.fillStyle = hair;
      g.beginPath();
      g.ellipse(-hw * 0.1, -hh * 1.18, hw * 0.42, hh * 0.34, 0, 0, TAU);
      g.fill();
      inkStroke(g, 2.2);
      g.fillStyle = flash ? '#ffffff' : def.accent;
      g.beginPath();
      g.moveTo(-hw * 0.48, -hh * 0.94);
      g.lineTo(hw * 0.3, -hh * 0.82);
      g.lineTo(hw * 0.3, -hh * 0.66);
      g.lineTo(-hw * 0.48, -hh * 0.78);
      g.closePath();
      g.fill();
    } else if (st === 'horns') {
      [-1, 1].forEach((s) => {
        g.fillStyle = hairLight;
        g.beginPath();
        g.moveTo(s * hw * 0.34, -hh * 0.7);
        g.bezierCurveTo(s * hw * 1.5, -hh * 1.3, s * hw * 1.5, -hh * 2.1, s * hw * 0.6, -hh * 1.85);
        g.bezierCurveTo(s * hw * 0.95, -hh * 1.4, s * hw * 0.7, -hh * 0.95, s * hw * 0.34, -hh * 0.7);
        g.closePath();
        g.fill();
        inkStroke(g, 2.2);
      });
    } else if (st === 'crown') {
      g.fillStyle = flash ? '#ffffff' : def.accent;
      g.beginPath();
      g.moveTo(-hw * 0.92, -hh * 0.76);
      g.lineTo(-hw * 1.12, -hh * 1.8);
      g.lineTo(-hw * 0.4, -hh * 1.14);
      g.lineTo(0, -hh * 1.95);
      g.lineTo(hw * 0.4, -hh * 1.14);
      g.lineTo(hw * 1.12, -hh * 1.8);
      g.lineTo(hw * 0.92, -hh * 0.76);
      g.closePath();
      g.fill();
      inkStroke(g, 2.4);
      g.fillStyle = hairLight;
      g.beginPath();
      g.arc(0, -hh * 1.5, hw * 0.14, 0, TAU);
      g.fill();
    } else if (st === 'mask') {
      // маска закрывает глаза
      g.fillStyle = flash ? '#ffffff' : def.outfitDark;
      g.beginPath();
      g.moveTo(-hw * 0.9, -hh * 0.22);
      g.lineTo(hw * 1.0, -hh * 0.34);
      g.lineTo(hw * 0.92, hh * 0.36);
      g.lineTo(-hw * 0.78, hh * 0.42);
      g.closePath();
      g.fill();
      inkStroke(g, 2.2);
      g.fillStyle = flash ? '#ffffff' : def.accent;
      g.fillRect(-hw * 0.5, -hh * 0.1, hw * 1.3, hh * 0.2);
      g.fillStyle = '#ffe066';
      g.beginPath();
      g.moveTo(-hw * 0.4, -hh * 0.12);
      g.lineTo(hw * 0.66, -hh * 0.12);
      g.lineTo(hw * 0.4, hh * 0.06);
      g.closePath();
      g.fill();
    } else if (st === 'bob') {
      g.fillStyle = hair;
      g.beginPath();
      g.moveTo(-hw * 1.06, hh * 0.62);
      g.bezierCurveTo(-hw * 1.3, -hh * 0.8, hw * 1.3, -hh * 0.8, hw * 1.06, hh * 0.62);
      g.lineTo(hw * 0.8, hh * 0.62);
      g.bezierCurveTo(hw * 1.0, -hh * 0.3, hw * 0.6, -hh * 0.5, hw * 0.3, -hh * 0.34);
      g.lineTo(-hw * 0.3, -hh * 0.34);
      g.bezierCurveTo(-hw * 0.6, -hh * 0.5, -hw * 1.0, -hh * 0.3, -hw * 0.8, hh * 0.62);
      g.closePath();
      g.fill();
      inkStroke(g, 2.2);
    } else if (st === 'hood') {
      g.fillStyle = hair;
      g.beginPath();
      g.moveTo(-hw * 1.3, hh * 0.72);
      g.bezierCurveTo(-hw * 1.42, -hh * 1.5, hw * 1.42, -hh * 1.5, hw * 1.3, hh * 0.72);
      g.lineTo(hw * 1.0, hh * 0.72);
      g.bezierCurveTo(hw * 1.16, -hh * 0.9, -hw * 1.16, -hh * 0.9, -hw * 1.0, hh * 0.72);
      g.closePath();
      g.fill();
      inkStroke(g, 2.4);
    }

    // мягкий объём волос поверх, чтобы причёска не читалась плоским пятном
    g.fillStyle = hairDark;
    g.globalAlpha = 0.16;
    g.beginPath();
    g.ellipse(-hw * 0.1, -hh * 0.88, hw * 0.9, hh * 0.2, 0, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  }

  // Основной рисователь. Масштаб по X умножается на facing — персонаж
  // просто отражается, а все позы остаются в единой системе координат.
  function drawFighter(g, def, x, y, scale, facing, pose, opt) {
    const o = opt || {};
    g.save();
    g.translate(x, y);
    g.scale(scale * facing, scale);
    if (o.alpha !== undefined) g.globalAlpha = o.alpha;

    const flash = !!o.flash;
    const skin = flash ? '#ffffff' : def.skin;
    const skinDark = flash ? '#ffffff' : def.skinDark;
    const outfit = flash ? '#ffffff' : def.outfit;
    const hair = flash ? '#ffffff' : def.hair;
    const hairDark = flash ? '#ffffff' : def.hairDark;
    const accent = flash ? '#ffffff' : def.accent;

    const crouch = pose.crouch || 0;
    const bob = pose.bob || 0;
    const hipY = -(LEG + crouch * 9) + bob;
    const shoulderY = hipY - TORSO;

    g.save();
    g.rotate((pose.lean || 0) * 0.05);

    // ---- задняя нога: брюки до щиколотки, дальше кожа ----
    let k = joint(-5, hipY, pose.thighB, LEG * 0.46);
    let f = joint(k.x, k.y, pose.shinB, LEG * 0.44);
    let a = joint(f.x, f.y, pose.shinB, 7);
    capsule(g, -5, hipY, k.x, k.y, 14, shade(outfit, -66));
    capsule(g, k.x, k.y, f.x, f.y, 12, shade(outfit, -76));
    capsule(g, f.x, f.y, a.x, a.y, 8.5, skinDark);
    foot(g, a.x, a.y, shade(accent, -34), 7.4);

    // ---- задняя рука: рукав темнее корпуса, иначе сливается с торсом ----
    let e = joint(-3, shoulderY + 5, pose.armB, ARM_U * pose.armLen);
    let h = joint(e.x, e.y, pose.foreB, ARM_L * pose.armLen);
    capsule(g, -3, shoulderY + 5, e.x, e.y, 11.5, shade(outfit, -40));
    capsule(g, e.x, e.y, h.x, h.y, 8.6, skinDark);
    g.fillStyle = INK;
    g.beginPath(); g.arc(h.x, h.y, 5.2, 0, TAU); g.fill();
    g.fillStyle = skinDark;
    g.beginPath(); g.arc(h.x, h.y, 3.8, 0, TAU); g.fill();

    // ---- торс: покатые плечи с дельтовидными шапками, узкая талия ----
    g.fillStyle = outfit;
    g.beginPath();
    g.moveTo(-9, hipY + 2);
    g.lineTo(-13, shoulderY + 7);
    g.quadraticCurveTo(-14, shoulderY - 3, -8, shoulderY - 4);
    g.quadraticCurveTo(0, shoulderY - 6, 8, shoulderY - 4);
    g.quadraticCurveTo(14, shoulderY - 3, 13, shoulderY + 7);
    g.lineTo(9, hipY + 2);
    g.quadraticCurveTo(0, hipY + 8, -9, hipY + 2);
    g.closePath();
    g.fill();
    inkStroke(g, 2.6);
    // воротник, ремень и накладной карман — дают силуэту детали
    g.fillStyle = accent;
    g.beginPath();
    g.moveTo(-8, shoulderY + 1);
    g.quadraticCurveTo(0, shoulderY + 12, 8, shoulderY + 1);
    g.lineTo(6, shoulderY);
    g.quadraticCurveTo(0, shoulderY + 8, -6, shoulderY);
    g.closePath();
    g.fill();
    g.fillStyle = shade(outfit, -74);
    g.fillRect(-9.5, hipY - 5, 19, 6);
    g.fillStyle = shade(outfit, -30);
    g.fillRect(-6, hipY + 4, 12, 7);

    // ---- передняя нога ----
    k = joint(5, hipY, pose.thighF, LEG * 0.46);
    f = joint(k.x, k.y, pose.shinF, LEG * 0.44);
    a = joint(f.x, f.y, pose.shinF, 7);
    capsule(g, 5, hipY, k.x, k.y, 15, shade(outfit, -28));
    capsule(g, k.x, k.y, f.x, f.y, 12.5, shade(outfit, -40));
    capsule(g, f.x, f.y, a.x, a.y, 9, skin);
    foot(g, a.x, a.y, accent, 8.2);

    // ---- шея и голова ----
    capsule(g, 0, shoulderY + 1, 0, shoulderY - NECK, 9, skinDark);
    g.save();
    g.translate(0, shoulderY - NECK - HEAD_H * 0.5);
    g.rotate((pose.headTilt || 0) * 0.04);
    drawHairBack(g, def, hairDark);
    drawFace(g, def, flash);
    drawHairFront(g, def, flash);
    if (o.scream) {
      g.fillStyle = '#5c1a2c';
      g.beginPath();
      g.ellipse(HEAD_W * 0.21, HEAD_H * 0.34, HEAD_W * 0.09, HEAD_H * 0.11, 0, 0, TAU);
      g.fill();
      inkStroke(g, 1.8);
    }
    g.restore();

    // ---- передняя рука ----
    e = joint(3, shoulderY + 5, pose.armF, ARM_U * pose.armLen);
    h = joint(e.x, e.y, pose.foreF, ARM_L * pose.armLen);
    capsule(g, 3, shoulderY + 5, e.x, e.y, 12, shade(outfit, -50));
    capsule(g, e.x, e.y, h.x, h.y, 9, skin);
    g.fillStyle = INK;
    g.beginPath(); g.arc(h.x, h.y, 5.4, 0, TAU); g.fill();
    g.fillStyle = skin;
    g.beginPath(); g.arc(h.x, h.y, 4, 0, TAU); g.fill();
    if (def.blade) {
      g.save();
      g.translate(h.x, h.y);
      g.rotate(pose.foreF - pose.armF);
      g.fillStyle = INK;
      g.beginPath();
      g.moveTo(0, -4);
      g.lineTo(34, -2.2);
      g.lineTo(39, 0);
      g.lineTo(34, 2.2);
      g.lineTo(0, 4);
      g.closePath();
      g.fill();
      g.fillStyle = '#eef0fa';
      g.beginPath();
      g.moveTo(1, -2.6);
      g.lineTo(33, -1.4);
      g.lineTo(37, 0);
      g.lineTo(33, 1.4);
      g.lineTo(1, 2.6);
      g.closePath();
      g.fill();
      g.fillStyle = accent;
      g.fillRect(-2, -5, 6, 10);
      g.restore();
    }
    // Щит держится перед собой: именно он отбивает удар спереди
    if (def.shield) {
      const sp = joint(2, shoulderY + 6, 0.12, 30);
      g.save();
      g.translate(sp.x, sp.y);
      g.rotate(-0.12);
      g.fillStyle = INK;
      g.beginPath();
      g.moveTo(0, -30);
      g.quadraticCurveTo(9, -22, 8, 2);
      g.quadraticCurveTo(6, 24, 0, 30);
      g.quadraticCurveTo(-6, 24, -7, 2);
      g.quadraticCurveTo(-8, -22, 0, -30);
      g.closePath();
      g.fill();
      g.fillStyle = def.shield;
      g.beginPath();
      g.moveTo(0, -27);
      g.quadraticCurveTo(7, -20, 6, 2);
      g.quadraticCurveTo(4, 21, 0, 26);
      g.quadraticCurveTo(-5, 21, -6, 2);
      g.quadraticCurveTo(-7, -20, 0, -27);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath();
      g.moveTo(0, -22);
      g.quadraticCurveTo(3, -16, 2, 4);
      g.lineTo(-1, 4);
      g.quadraticCurveTo(-1, -16, 0, -22);
      g.closePath();
      g.fill();
      g.fillStyle = shade(def.shield, -50);
      g.fillRect(-8, -3, 16, 3);
      g.restore();
    }

    g.restore();
    g.restore();
  }

  // ==================================================================
  // СЦЕНЫ
  // ==================================================================
  const STAGES = [
    {
      name: 'УЛИЦА ДОЖДЯ', sky: ['#1a0b28', '#0d0518'], ground: '#241033',
      accent: '#ff6ea8', lantern: '#ffb44f', rain: true, width: 2100,
      waves: [['oni', 'oni', 'kodama'], ['kozame', 'oni', 'oni', 'kodama'], ['kozame', 'kozame', 'tori']],
      boss: 'kido'
    },
    {
      name: 'РЫНОК ФОНАРИЙ', sky: ['#2a1020', '#140610'], ground: '#301a1c',
      accent: '#ffb44f', lantern: '#ff6ea8', rain: false, width: 2400,
      waves: [['oni', 'kodama', 'kodama', 'tori'], ['kozame', 'kozame', 'tori'], ['kozame', 'tori', 'oni', 'oni']],
      boss: 'goshin'
    },
    {
      name: 'КРЫША ТОШИОКА', sky: ['#101a33', '#060a18'], ground: '#182238',
      accent: '#63e7ff', lantern: '#9d7bff', rain: false, width: 2700,
      waves: [['tori', 'tori', 'kozame'], ['kozame', 'kozame', 'kozame', 'oni'], ['tori', 'kozame', 'oni', 'kodama']],
      boss: 'mura'
    },
    {
      name: 'СТАНЦИЯ КОГЭН', sky: ['#0d1a1e', '#04090c'], ground: '#12222a',
      accent: '#b6ff3d', lantern: '#e8f4ff', rain: false, width: 3000,
      waves: [['jitte', 'oni', 'kodama'], ['jitte', 'jitte', 'tori', 'oni'], ['jitte', 'kozame', 'kozame', 'tori']],
      boss: 'kuro', indoor: true
    }
  ];

  // ==================================================================
  // ПРОФИЛЬ
  // ==================================================================
  const STORAGE_KEY = 'neon-oni-profile-v1';

  // В APK страница открыта по file://, где localStorage держится на
  // непрозрачном происхождении и может молча не сохранять прогресс.
  // Поэтому при наличии моста AndroidStore пишем через него,
  // а localStorage оставляем запасным вариантом и для веба.
  const nativeStore = (typeof window !== 'undefined' && window.AndroidStore) ? window.AndroidStore : null;

  function readProfileRaw() {
    if (nativeStore) {
      try {
        const v = nativeStore.load(STORAGE_KEY);
        if (v) return v;
      } catch (e) { /* мост недоступен, идём дальше */ }
    }
    try { return localStorage.getItem(STORAGE_KEY) || null; } catch (e) { return null; }
  }

  function writeProfileRaw(text) {
    if (nativeStore) {
      try { nativeStore.save(STORAGE_KEY, text); } catch (e) { /* игнорируем, есть запасной путь */ }
    }
    try { localStorage.setItem(STORAGE_KEY, text); } catch (e) { /* приватный режим */ }
  }

  function loadProfile() {
    const base = { best: 0, bestStage: 0, fighters: { yuki: true }, totalKills: 0 };
    let raw = null;
    try { raw = JSON.parse(readProfileRaw() || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return base;
    return {
      best: Math.max(0, Math.floor(Number(raw.best) || 0)),
      bestStage: Math.max(0, Math.floor(Number(raw.bestStage) || 0)),
      fighters: {
        yuki: !!(raw.fighters && raw.fighters.yuki),
        ren: !!(raw.fighters && raw.fighters.ren),
        kaede: !!(raw.fighters && raw.fighters.kaede)
      },
      totalKills: Math.max(0, Math.floor(Number(raw.totalKills) || 0))
    };
  }
  function saveProfile() {
    writeProfileRaw(JSON.stringify(profile));
  }
  let profile = loadProfile();

  // ==================================================================
  // СОСТОЯНИЕ
  // ==================================================================
  let viewport = { w: 900, h: 600 };
  let dpr = 1;
  let lastFrame = performance.now();
  let ambient = 0;
  let toastTimer = 0;
  let bannerTimer = 0;
  let soundOn = true;
  let menuScroll = 0;

  const audio = { ctx: null, master: null };

  // Одно место на весь ввод: удержание и одноразовые нажатия
  const input = {
    left: false, right: false, up: false, down: false,
    attackHeld: false, jumpHeld: false, specialHeld: false, dashHeld: false,
    attackEdge: false, jumpEdge: false, specialEdge: false, dashEdge: false
  };

  let mode = 'menu';
  let stage = null;
  let run = null;

  // ==================================================================
  // ЗВУК
  // ==================================================================
  function ensureAudio() {
    if (!soundOn) return;
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        audio.ctx = new AC();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.32;
        audio.master.connect(audio.ctx.destination);
      } catch (e) { audio.ctx = null; audio.master = null; }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!soundOn || !audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(Math.max(30, freq), now);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + (slideTo || 0)), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol || 0.02), now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(audio.master);
    o.start(now); o.stop(now + dur + 0.02);
  }

  function noise(dur, vol) {
    if (!soundOn || !audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime;
    const n = Math.floor(audio.ctx.sampleRate * dur);
    const buf = audio.ctx.createBuffer(1, n, audio.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const g = audio.ctx.createGain();
    g.gain.value = vol || 0.05;
    src.connect(g); g.connect(audio.master);
    src.start(now);
  }

  const sfxHit = () => { tone(220, 0.06, 'square', 0.028, -110); noise(0.06, 0.035); };
  const sfxSwing = () => tone(520, 0.07, 'triangle', 0.015, -260);
  const sfxHurt = () => { tone(150, 0.14, 'sawtooth', 0.036, -60); noise(0.1, 0.035); };
  const sfxDash = () => tone(700, 0.1, 'sawtooth', 0.02, -400);
  const sfxJump = () => tone(340, 0.09, 'triangle', 0.02, 260);
  const sfxSpecial = () => { tone(180, 0.28, 'sawtooth', 0.04, 520); noise(0.2, 0.045); };
  const sfxKill = () => { tone(400, 0.14, 'triangle', 0.03, -260); noise(0.12, 0.045); };
  const sfxCoin = () => tone(880, 0.08, 'triangle', 0.022, 380);
  const sfxStage = () => tone(300, 0.5, 'triangle', 0.05, 500);

  // ==================================================================
  // СОЗДАНИЕ БОЙЦОВ
  // ==================================================================
  function makeFighter(id) {
    const def = FIGHTERS[id] || FIGHTERS.yuki;
    return {
      def, scale: 1,
      x: 140, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      facing: 1, hp: def.hp, maxHp: def.hp,
      state: 'idle', stateT: 0,
      attackIndex: 0, comboWindow: 0, hitDone: false,
      meter: 0, maxMeter: 100,
      invuln: 0, hurtFlash: 0,
      downT: 0, walkPhase: 0, pose: makePose(),
      specialT: 0, specialHit: false, dashT: 0, dashCd: 0
    };
  }

  function makeFoe(typeId, x, y, hpMul) {
    const def = FOES[typeId] || BOSSES[typeId];
    const boss = !!def.boss;
    const mul = hpMul || 1;
    return {
      def, type: typeId, boss, scale: def.scale,
      x, y, z: 0, vx: 0, vy: 0, vz: 0, facing: -1,
      hp: Math.round(def.hp * mul), maxHp: Math.round(def.hp * mul),
      state: 'walk', stateT: 0, hitDone: false,
      hitFlash: 0, invuln: 0, attackCd: 0.5 + Math.random() * 0.6,
      launchT: 0, walkPhase: Math.random() * 6, pose: makePose(),
      dead: false, deathT: 0, ai: def.ai, score: def.score,
      guard: !!def.guard, guardHit: 0
    };
  }

  // ==================================================================
  // ПОЗЫ
  // ==================================================================
  // Боевая стойка: передняя рука наготове, задняя у рёбер, ноги разведены.
  function poseIdle(p, t) {
    const z = p.pose;
    const s = Math.sin(t * 2.6);
    const s2 = Math.sin(t * 2.6 + 0.9);
    z.bob = s * 0.9;
    z.thighF = 0.24 + s * 0.03; z.shinF = -0.2;
    z.thighB = -0.3 + s2 * 0.02; z.shinB = -0.12;
    z.armF = 0.56 + s * 0.06; z.foreF = -0.62;
    z.armB = -0.28 - s * 0.05; z.foreB = -0.95;
    z.lean = 0.22; z.headTilt = s * 0.05; z.crouch = 0.6; z.armLen = 1;
  }

  function poseWalk(p, ratio) {
    const z = p.pose;
    const ph = p.walkPhase;
    z.bob = -Math.abs(Math.sin(ph)) * 2;
    z.thighF = Math.sin(ph) * 0.62 * ratio;
    z.shinF = Math.max(0, -Math.sin(ph - 0.6)) * 0.7 * ratio;
    z.thighB = -Math.sin(ph) * 0.62 * ratio;
    z.shinB = Math.max(0, Math.sin(ph - 0.6)) * 0.7 * ratio;
    z.armF = -Math.sin(ph) * 0.5 * ratio;
    z.foreF = 0.3 + Math.abs(Math.sin(ph)) * 0.2;
    z.armB = Math.sin(ph) * 0.5 * ratio;
    z.foreB = 0.3;
    z.lean = 0.16 * ratio; z.headTilt = 0; z.crouch = 0; z.armLen = 1;
  }

  function poseAttack(p, idx, k) {
    const z = p.pose;
    const ext = k < 0.45 ? k / 0.45 : Math.max(0, 1 - (k - 0.45) / 0.55);
    z.bob = 0; z.crouch = idx === 2 ? 2 : 0; z.headTilt = 0; z.armLen = 1;
    if (idx === 0) {
      z.armF = -0.4 - ext * 1.0; z.foreF = -0.2 - ext * 0.5;
      z.armB = 0.5; z.foreB = 0.7;
      z.lean = 0.5 + ext * 0.5;
      z.thighF = 0.3; z.shinF = -0.1; z.thighB = -0.3; z.shinB = 0.1;
    } else if (idx === 1) {
      z.armB = 0.3 + ext * 1.1; z.foreB = 0.2 + ext * 0.4;
      z.armF = -0.6; z.foreF = -0.2;
      z.lean = -0.4 - ext * 0.5;
      z.thighF = -0.2; z.shinF = 0.1; z.thighB = 0.35; z.shinB = -0.1;
    } else {
      const spin = k * Math.PI * 2;
      z.armF = -1.2 + Math.sin(spin) * 0.4; z.foreF = -0.1;
      z.armB = -1.0 - Math.sin(spin) * 0.4; z.foreB = 0.2;
      z.lean = Math.sin(spin) * 0.5; z.crouch = 1.5;
      z.thighF = Math.sin(spin * 0.5) * 0.7; z.shinF = 0.2;
      z.thighB = -Math.sin(spin * 0.5) * 0.5; z.shinB = 0.3;
    }
  }

  function poseJump(p, vz) {
    const z = p.pose;
    const up = vz > 0;
    z.bob = 0; z.crouch = 0; z.armLen = 1;
    z.thighF = up ? 0.9 : 0.3; z.shinF = up ? -1.1 : -0.2;
    z.thighB = up ? -0.4 : -0.5; z.shinB = up ? -0.6 : 0.4;
    z.armF = up ? -1.6 : -0.5; z.foreF = 0.2;
    z.armB = up ? -1.2 : 0.2; z.foreB = 0.4;
    z.lean = up ? 0.2 : -0.2; z.headTilt = 0;
  }

  function poseDash(p) {
    const z = p.pose;
    z.bob = -1; z.crouch = 2; z.armLen = 1; z.lean = 0.9; z.headTilt = 0;
    z.thighF = 0.9; z.shinF = -0.3; z.thighB = -0.8; z.shinB = 0.5;
    z.armF = -1.3; z.foreF = -0.4; z.armB = 1.0; z.foreB = 0.6;
  }

  function poseHurt(p) {
    const z = p.pose;
    z.bob = 0; z.crouch = 0.5; z.armLen = 1; z.lean = -1.2; z.headTilt = -0.8;
    z.thighF = -0.4; z.shinF = 0.3; z.thighB = 0.3; z.shinB = -0.2;
    z.armF = 1.2; z.foreF = 0.8; z.armB = -1.0; z.foreB = 0.5;
  }

  function poseDown(p) {
    const z = p.pose;
    z.bob = 0; z.crouch = 3; z.armLen = 1; z.lean = -1.45; z.headTilt = -0.6;
    z.thighF = 0.2; z.shinF = 0.3; z.thighB = 0.1; z.shinB = 0.4;
    z.armF = 1.3; z.foreF = 1.2; z.armB = 1.1; z.foreB = 1.0;
  }

  function poseFoeWalk(f) {
    const z = f.pose;
    const ph = f.walkPhase;
    z.bob = -Math.abs(Math.sin(ph)) * 1.6; z.crouch = 0; z.armLen = f.boss ? 1.25 : 1;
    z.thighF = Math.sin(ph) * 0.55; z.shinF = Math.max(0, -Math.sin(ph - 0.6)) * 0.6;
    z.thighB = -Math.sin(ph) * 0.55; z.shinB = Math.max(0, Math.sin(ph - 0.6)) * 0.6;
    z.armF = -Math.sin(ph) * 0.45; z.foreF = 0.4;
    z.armB = Math.sin(ph) * 0.45; z.foreB = 0.4;
    z.lean = 0.12; z.headTilt = Math.sin(ph * 0.5) * 0.08;
  }

  function poseFoeAttack(f, k) {
    const z = f.pose;
    const wind = k < 0.55;
    z.bob = 0; z.armLen = f.boss ? 1.25 : 1;
    z.lean = wind ? -0.5 : 0.9;
    z.armF = wind ? 1.4 : -1.5; z.foreF = wind ? 1.0 : -0.2;
    z.armB = wind ? -0.6 : 0.4; z.foreB = 0.5;
    z.thighF = wind ? -0.3 : 0.5; z.shinF = wind ? 0.2 : -0.2;
    z.thighB = wind ? 0.3 : -0.4; z.shinB = 0.2;
    z.crouch = wind ? 1 : 0; z.headTilt = 0;
  }

  function poseFoeHurt(f) {
    const z = f.pose;
    z.bob = 0; z.crouch = 0.5; z.armLen = f.boss ? 1.25 : 1;
    z.lean = -1.1; z.headTilt = -0.6;
    z.thighF = -0.4; z.shinF = 0.3; z.thighB = 0.3; z.shinB = 0.2;
    z.armF = 1.1; z.foreF = 0.8; z.armB = -0.9; z.foreB = 0.6;
  }

  function poseThrow(f, k) {
    const z = f.pose;
    z.bob = 0; z.crouch = 0; z.armLen = 1; z.headTilt = 0;
    z.lean = -0.3 + k * 0.6;
    z.armF = -2.0 + k * 2.2; z.foreF = -0.4;
    z.armB = 0.3; z.foreB = 0.4;
    z.thighF = 0.2; z.shinF = 0; z.thighB = -0.2; z.shinB = 0;
  }

  // ==================================================================
  // БОЙ
  // ==================================================================
  function attackBox(p) {
    const reach = (p.attackIndex === 2 ? 46 : 34) * FIG;
    return {
      x: p.facing > 0 ? p.x + 8 * FIG : p.x - 8 * FIG - reach,
      y: p.y - 92 * FIG, w: reach, h: 78 * FIG
    };
  }

  function startAttack() {
    const p = run.p;
    if (p.state === 'down' || p.state === 'hurt' || p.state === 'special' || p.state === 'dash') return;
    p.attackIndex = p.comboWindow > 0 ? (p.attackIndex + 1) % 3 : 0;
    p.state = 'attack';
    p.stateT = 0;
    p.hitDone = false;
    p.vx *= 0.3;
    sfxSwing();
  }

  function doHit() {
    const p = run.p;
    if (p.hitDone) return;
    const box = attackBox(p);
    let hitAny = false;
    let blockedAny = false;
    for (const e of run.foes) {
      if (e.dead) continue;
      const h = BODY_H * e.scale * FIG;
      const top = e.y - h - 8 * FIG;
      const bot = e.y - 8 * FIG;
      if (e.x + 22 * e.scale * FIG < box.x || e.x - 22 * e.scale * FIG > box.x + box.w) continue;
      if (bot < box.y || top > box.y + box.h) continue;
      // Щитоносец держит щит спереди: удар в лоб только отскакивает.
      // Обойти можно уходом вглубь (W и S) или приёмом, который бьёт
      // с обхода. Именно это заставляет пользоваться осью глубины.
      if (e.guard && e.facing === p.facing) {
        if (!blockedAny) {
          blockedAny = true;
          burst(e.x + p.facing * 20 * e.scale * FIG, e.y - 60 * e.scale * FIG, 7, '#cfe8ff');
          tone(900, 0.05, 'square', 0.022, -300);
          run.shake = Math.max(run.shake, 3);
          p.hitDone = true;
        }
        continue;
      }
      hitFoe(e, COMBO_DMG[p.attackIndex] * p.def.power, COMBO_PUSH[p.attackIndex], COMBO_LIFT[p.attackIndex]);
      hitAny = true;
    }
    if (hitAny) {
      p.hitDone = true;
      p.meter = Math.min(p.maxMeter, p.meter + 9);
      run.combo++;
      run.comboT = 1.7;
      if (run.combo > run.bestCombo) run.bestCombo = run.combo;
      run.shake = Math.max(run.shake, p.attackIndex === 2 ? 9 : 4);
      run.hitStop = p.attackIndex === 2 ? 0.09 : 0.045;
      sfxHit();
      run.pops.push({ x: p.x + 20 * FIG * p.facing, y: p.y - BODY_H * FIG - 4, life: 0.5, max: 0.5, n: run.combo });
    }
  }

  function hitFoe(e, dmg, push, lift, ignoreGuard) {
    const p = run.p;
    // Приём проходит сквозь щит: это единственный прямой способ пробить
    // щитоносца, если нет запаса по глубине.
    if (e.guard && e.facing === p.facing && !ignoreGuard) return false;
    e.hp -= dmg;
    e.hitFlash = 0.12;
    e.vx += p.facing * push;
    e.facing = -p.facing;
    run.score += Math.round(dmg);
    if (lift > 0) {
      e.vz = lift;
      e.z = Math.max(0.01, e.z);
      e.state = 'air';
      e.stateT = 0;
      burst(e.x, e.y - 58 * FIG, 5, '#ffffff');
    } else {
      e.state = 'hurt';
      e.stateT = 0;
    }
    if (e.hp <= 0) killFoe(e);
    return true;
  }

  function killFoe(e) {
    if (e.dead) return;
    e.dead = true;
    e.hp = 0;
    e.deathT = 0;
    run.kills += 1;
    profile.totalKills += 1;
    run.score += e.score;
    sfxKill();
    run.shake = Math.max(run.shake, e.boss ? 16 : 5);
    burst(e.x, e.y - 24, e.boss ? 34 : 14, e.boss ? '#ffb44f' : e.def.accent);
    const coins = e.boss ? 6 : 2;
    for (let i = 0; i < coins; i++) {
      run.pickups.push({ x: e.x, y: e.y - 10, z: 40 + i * 14, vz: 40, vx: (Math.random() - 0.5) * 90, life: 1.6 });
    }
  }

  function hurtPlayer(dmg, sourceDir) {
    const p = run.p;
    if (p.invuln > 0 || p.state === 'down' || run.invulnT > 0) return;
    p.hp -= dmg;
    p.invuln = 0.55;
    p.hurtFlash = 0.18;
    p.state = 'hurt';
    p.stateT = 0;
    p.vx = -sourceDir * 140;
    run.combo = 0;
    run.shake = Math.max(run.shake, 8);
    sfxHurt();
    burst(p.x, p.y - 66 * FIG, 8, '#ff3d6e');
    if (p.hp <= 0) {
      p.hp = 0;
      p.state = 'down';
      p.stateT = 0;
      p.downT = 0;
      run.lives--;
      run.livesUsed++;
      run.invulnT = 1.2;
      run.shake = Math.max(run.shake, 14);
    }
  }

  function burst(x, y, n, color) {
    const count = run.reduced ? Math.min(n, 3) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 70 + Math.random() * 230;
      run.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50,
        life: 0.35 + Math.random() * 0.3, max: 0.65, color, r: 2 + Math.random() * 3
      });
    }
    if (run.particles.length > 300) run.particles.splice(0, run.particles.length - 300);
  }

  // ==================================================================
  // ОБНОВЛЕНИЕ ИГРОКА
  // ==================================================================
  function updatePlayer(dt) {
    const p = run.p;
    const def = p.def;
    p.stateT += dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.comboWindow = Math.max(0, p.comboWindow - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);

    const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    if (p.state !== 'special' && p.state !== 'dash') {
      const base = def.speed;
      const cap = p.state === 'attack' ? 70 : base;
      p.vx += mx * base * 4.2 * dt;
      p.vx = Math.max(-cap, Math.min(cap, p.vx));
      if (mx === 0) p.vx *= Math.pow(0.0006, dt);
      p.vy += my * 130 * dt;
      p.vy = Math.max(-90, Math.min(90, p.vy));
      if (my === 0) p.vy *= Math.pow(0.002, dt);
    }
    if (mx !== 0 && (p.state === 'idle' || p.state === 'walk')) p.facing = mx;

    // прыжок
    if (input.jumpEdge && p.z <= 0.01 && (p.state === 'idle' || p.state === 'walk')) {
      p.vz = JUMP_V;
      p.z = 0.01;
      p.state = 'jump';
      p.stateT = 0;
      sfxJump();
    }
    if (p.z > 0 || p.vz > 0) {
      p.vz -= GRAVITY * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) { p.z = 0; p.vz = 0; p.state = 'idle'; p.stateT = 0; }
    }

    // рывок
    if (input.dashEdge && p.dashCd <= 0 && p.state !== 'down' && p.state !== 'special') {
      p.state = 'dash';
      p.stateT = 0;
      p.dashT = DASH_TIME;
      p.dashCd = DASH_CD;
      p.invuln = Math.max(p.invuln, DASH_TIME + 0.06);
      if (mx !== 0) p.facing = mx;
      sfxDash();
      burst(p.x, p.y - 4, 6, 'rgba(255,255,255,0.55)');
    }

    if (input.attackEdge) startAttack();
    if (input.specialEdge) useSpecial();

    // состояния
    if (p.state === 'attack') {
      const dur = COMBO_TIMES[p.attackIndex];
      if (p.stateT > dur * 0.35) doHit();
      if (p.stateT >= dur) {
        p.state = 'idle';
        p.stateT = 0;
        p.comboWindow = COMBO_WINDOW;
      }
    } else if (p.state === 'special') {
      p.specialT += dt;
      p.vx = p.facing * 340;
      if (!p.specialHit) {
        p.specialHit = true;
        for (const e of run.foes) {
          if (e.dead) continue;
          if (Math.abs(e.x - p.x) < 115 * FIG && Math.abs(e.y - p.y) < 42 * FIG) hitFoe(e, 22 * def.power, 300, 22, true);
        }
        run.shake = Math.max(run.shake, 12);
        burst(p.x + 40 * FIG * p.facing, p.y - 26 * FIG, 18, def.accent);
        run.pops.push({ x: p.x, y: p.y - 52 * FIG, life: 0.7, max: 0.7, text: 'ПРИЁМ' });
      }
      if (p.specialT > 0.34) { p.state = 'idle'; p.stateT = 0; }
    } else if (p.state === 'dash') {
      p.dashT -= dt;
      p.vx = p.facing * DASH_SPEED;
      if (p.dashT <= 0) { p.state = 'idle'; p.stateT = 0; }
    } else if (p.state === 'hurt') {
      p.vx *= Math.pow(0.02, dt);
      if (p.stateT > 0.26) { p.state = 'idle'; p.stateT = 0; }
    } else if (p.state === 'down') {
      p.downT += dt;
      p.vx *= Math.pow(0.001, dt);
      if (p.downT > 1.4) respawnPlayer();
    } else if (p.z <= 0.01) {
      p.state = Math.abs(p.vx) > 12 ? 'walk' : 'idle';
      p.walkPhase += dt * (7 + Math.abs(p.vx) * 0.05);
      if (p.comboWindow <= 0) p.attackIndex = 0;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    clampPlayer(p);

    // поза
    if (p.state === 'attack') poseAttack(p, p.attackIndex, Math.min(1, p.stateT / COMBO_TIMES[p.attackIndex]));
    else if (p.z > 0) poseJump(p, p.vz);
    else if (p.state === 'dash') poseDash(p);
    else if (p.state === 'hurt') poseHurt(p);
    else if (p.state === 'down') poseDown(p);
    else if (p.state === 'walk') poseWalk(p, Math.min(1, Math.abs(p.vx) / def.speed));
    else if (p.state === 'special') {
      poseAttack(p, 2, 0.3);
      p.pose.lean = 1.4;
      p.pose.armF = -1.6;
      p.pose.foreF = -0.1;
    } else poseIdle(p, ambient);

    if (p.state === 'walk' && Math.abs(p.vx) > 90 && Math.random() < dt * 14) {
      burst(p.x - p.facing * 8, p.y - 2, 1, 'rgba(255,255,255,0.45)');
    }
  }

  function useSpecial() {
    const p = run.p;
    if (p.meter < p.maxMeter || p.state === 'down' || p.state === 'special') return;
    p.meter = 0;
    p.state = 'special';
    p.stateT = 0;
    p.specialT = 0;
    p.specialHit = false;
    sfxSpecial();
    run.shake = Math.max(run.shake, 7);
  }

  function clampPlayer(p) {
    const half = 26;
    p.x = Math.max(half, Math.min(stage.width - half, p.x));
    const baseY = groundY();
    p.y = Math.max(baseY, Math.min(baseY + FLOOR_DEPTH, p.y));
  }

  function respawnPlayer() {
    const p = run.p;
    if (run.lives <= 0) { endRun(false); return; }
    p.hp = p.maxHp;
    p.x = Math.max(90, run.camX + viewport.w * 0.3);
    p.y = groundY();
    p.z = 0; p.vz = 0; p.vx = 0; p.vy = 0;
    p.state = 'idle';
    p.stateT = 0;
    p.downT = 0;
    p.invuln = 1.7;
  }

  // ==================================================================
  // ОБНОВЛЕНИЕ ВРАГОВ
  // ==================================================================
  function updateFoe(e, dt) {
    if (e.dead) {
      e.deathT += dt;
      e.vx *= Math.pow(0.02, dt);
      e.x += e.vx * dt;
      if (e.z > 0) {
        e.vz -= GRAVITY * dt;
        e.z += e.vz * dt;
        if (e.z < 0) { e.z = 0; e.vz = 0; }
      }
      return;
    }

    e.stateT += dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.invuln = Math.max(0, e.invuln - dt);
    e.attackCd = Math.max(0, e.attackCd - dt);

    const p = run.p;
    if (p.state === 'down' && run.lives <= 0) {
      e.vx *= Math.pow(0.01, dt);
      e.x += e.vx * dt;
      poseFoeWalk(e);
      return;
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (e.state === 'hurt') {
      e.vx *= Math.pow(0.004, dt);
      e.x += e.vx * dt;
      if (e.stateT > 0.22) { e.state = 'walk'; e.stateT = 0; }
      poseFoeHurt(e);
      return;
    }
    if (e.state === 'air') {
      e.vx *= Math.pow(0.05, dt);
      e.x += e.vx * dt;
      e.z += e.vz * dt;
      e.vz -= GRAVITY * dt;
      if (e.z <= 0) {
        e.z = 0; e.vz = 0;
        e.state = 'down';
        e.stateT = 0;
        e.launchT = 0.55;
        burst(e.x, e.y - 8, 6, '#c9c9d8');
        run.shake = Math.max(run.shake, 4);
      }
      poseFoeHurt(e);
      return;
    }
    if (e.state === 'down') {
      e.launchT -= dt;
      e.vx *= Math.pow(0.01, dt);
      e.x += e.vx * dt;
      if (e.launchT <= 0) { e.state = 'walk'; e.stateT = 0; e.attackCd = 0.35; }
      poseFoeHurt(e);
      return;
    }
    if (e.state === 'attack') {
      const dur = e.boss ? 0.52 : 0.4;
      if (e.stateT > dur * 0.55 && !e.hitDone) {
        e.hitDone = true;
        if (adx < (e.boss ? 124 : 86) * e.scale && ady < 30 * FIG) hurtPlayer(Math.round(9 * e.def.power), Math.sign(dx) || 1);
        burst(e.x + e.facing * 34 * e.scale * FIG, e.y - 62 * e.scale * FIG, 4, '#ffffff');
      }
      if (e.stateT >= dur) { e.state = 'walk'; e.stateT = 0; e.attackCd = e.boss ? 0.5 : 0.7; }
      poseFoeAttack(e, Math.min(1, e.stateT / dur));
      return;
    }
    if (e.state === 'throw') {
      const dur = 0.42;
      if (e.stateT > dur * 0.5 && !e.hitDone) {
        e.hitDone = true;
        run.knives.push({ x: e.x + e.facing * 14, y: e.y - 72 * e.scale * FIG, vx: e.facing * 300, life: 3, dmg: 7 });
        tone(900, 0.06, 'triangle', 0.016, -500);
      }
      if (e.stateT >= dur) { e.state = 'walk'; e.stateT = 0; e.attackCd = 1.1; }
      poseThrow(e, Math.min(1, e.stateT / dur));
      return;
    }

    // преследование
    e.facing = dx >= 0 ? 1 : -1;
    const speed = e.boss ? e.def.speed * (0.9 + Math.sin(ambient * 1.7) * 0.25) : e.def.speed;

    if (e.ai === 'thrower') {
      if (adx > 190) e.vx = e.facing * speed;
      else if (adx < 120) e.vx = -e.facing * speed * 0.7;
      else e.vx *= Math.pow(0.02, dt);
      if (e.attackCd <= 0 && adx < 320 * FIG && ady < 34 * FIG) { e.state = 'throw'; e.stateT = 0; e.hitDone = false; }
    } else {
      const want = (e.boss ? 62 : 54) * e.scale;
      if (adx > want) e.vx = e.facing * speed;
      else e.vx *= Math.pow(0.02, dt);
      if (e.attackCd <= 0 && adx < (e.boss ? 112 : 78) * e.scale && ady < 24 * FIG) {
        e.state = 'attack'; e.stateT = 0; e.hitDone = false;
      }
    }
    if (ady > 8) e.vy = 52;
    else if (ady < -8) e.vy = -52;
    else e.vy *= Math.pow(0.02, dt);

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.walkPhase += dt * 6.5;

    const half = 22 * e.scale * FIG;
    e.x = Math.max(half, Math.min(stage.width - half, e.x));
    const baseY = groundY();
    e.y = Math.max(baseY, Math.min(baseY + FLOOR_DEPTH, e.y));

    // расталкивание, чтобы враги не слипались в одну точку
    for (const o of run.foes) {
      if (o === e || o.dead) continue;
      const ddx = o.x - e.x;
      const ddy = o.y - e.y;
      const dist = Math.hypot(ddx, ddy);
      const minD = 55 * (e.scale + o.scale) * 0.5;
      if (dist > 0.01 && dist < minD) {
        const push = (minD - dist) * 0.5;
        e.x -= (ddx / dist) * push;
        o.x += (ddx / dist) * push;
      }
    }

    if (e.state !== 'throw') poseFoeWalk(e);
  }

  function updateKnives(dt) {
    const p = run.p;
    for (let i = run.knives.length - 1; i >= 0; i--) {
      const k = run.knives[i];
      k.x += k.vx * dt;
      k.life -= dt;
      if (k.x < 0 || k.x > stage.width || k.life <= 0) { run.knives.splice(i, 1); continue; }
      if (Math.abs(k.x - p.x) < 24 * FIG && Math.abs(k.y - (p.y - 66 * FIG)) < 34 * FIG) {
        hurtPlayer(k.dmg, Math.sign(k.vx) || 1);
        run.knives.splice(i, 1);
      }
    }
  }

  function updatePickups(dt) {
    const p = run.p;
    for (let i = run.pickups.length - 1; i >= 0; i--) {
      const c = run.pickups[i];
      c.life -= dt;
      c.vz -= 900 * dt;
      c.z += c.vz * dt;
      c.x += c.vx * dt;
      if (c.z < 6) { c.z = 6; c.vz = 0; c.vx *= Math.pow(0.02, dt); }
      if (c.life <= 0) { run.pickups.splice(i, 1); continue; }
      if (Math.abs(c.x - p.x) < 26 && Math.abs(c.y - p.y) < 30 && c.z < 26) {
        run.score += 50;
        p.meter = Math.min(p.maxMeter, p.meter + 7);
        sfxCoin();
        run.pickups.splice(i, 1);
      }
    }
  }

  // ==================================================================
  // ВОЛНЫ
  // ==================================================================
  function startStage(idx) {
    const def = STAGES[idx];
    stage = { def, width: def.width, index: idx };
    const p = makeFighter(run.fighterId);
    p.x = 120;
    p.y = groundY();
    run.p = p;
    run.foes = [];
    run.knives = [];
    run.pickups = [];
    run.particles = [];
    run.pops = [];
    run.wave = 0;
    run.waveT = 1.4;
    run.bossSpawned = false;
    run.camX = 0;
    mode = 'playing';
    hideAll();
    els.hud.classList.remove('is-hidden');
    els.playerName.textContent = FIGHTERS[run.fighterId].name;
    els.stageName.textContent = def.name;
    showBanner(def.name);
    sfxStage();
    updateHud();
  }

  // Враги вбегают с той стороны, где за игроком больше свободного места.
  // Если выбирать по камере, у левого края карты они появятся вплотную
  // и окажутся за границей экрана.
  function spawnSide() {
    const roomLeft = run.p.x - 70;
    const roomRight = stage.width - 70 - run.p.x;
    return roomRight >= roomLeft ? 1 : -1;
  }

  function spawnWave() {
    const list = stage.def.waves[run.wave];
    const baseY = groundY();
    const dir = spawnSide();
    const edge = dir > 0
      ? Math.min(stage.width - 40, run.camX + viewport.w + 44)
      : Math.max(40, run.camX - 44);
    list.forEach((type, i) => {
      const x = Math.max(28, Math.min(stage.width - 28, edge + dir * (i * 58 + Math.random() * 34)));
      const y = baseY + Math.random() * FLOOR_DEPTH * 0.78;
      run.foes.push(makeFoe(type, x, y));
    });
    run.waveT = 0;
    run.wave++;
    showBanner('ВОЛНА ' + run.wave + '/' + (stage.def.waves.length + 1));
  }

  function spawnBoss() {
    const dir = spawnSide();
    const x = dir > 0
      ? Math.min(stage.width - 60, run.camX + viewport.w + 80)
      : Math.max(60, run.camX - 80);
    run.foes.push(makeFoe(stage.def.boss, x, groundY() + 30, 1 + stage.index * 0.35));
    run.bossSpawned = true;
    showBanner(BOSSES[stage.def.boss].name);
  }

  function updateWaves(dt) {
    const alive = run.foes.filter((f) => !f.dead).length;
    if (run.wave <= stage.def.waves.length) {
      if (alive === 0) {
        run.waveT -= dt;
        if (run.waveT <= 0) {
          if (run.wave < stage.def.waves.length) spawnWave();
          else { run.wave++; run.waveT = 1.2; showBanner('ПРИГОТОВЬТЕСЬ'); }
        }
      }
    } else if (!run.bossSpawned) {
      run.waveT -= dt;
      if (run.waveT <= 0) spawnBoss();
    } else if (alive === 0) {
      finishStage();
    }
  }

  function finishStage() {
    if (mode !== 'playing') return;
    const idx = stage.index;

    // Последняя улица пройдена — это победа, а не экран «следующая улица».
    // Раньше endRun(true) не вызывался нигде, и победа была недостижима.
    if (idx + 1 >= STAGES.length) {
      if (run.score > profile.best) profile.best = run.score;
      if (STAGES.length > profile.bestStage) profile.bestStage = STAGES.length;
      saveProfile();
      endRun(true);
      return;
    }

    mode = 'clear';
    if (run.score > profile.best) profile.best = run.score;
    if (idx + 1 > profile.bestStage) profile.bestStage = idx + 1;
    saveProfile();

    els.clearScore.textContent = String(run.score);
    els.clearKills.textContent = String(run.kills);
    els.clearCombo.textContent = String(run.bestCombo);
    els.clearLives.textContent = String(run.livesUsed);
    const nextIdx = idx + 1;
    const nextFighter = FIGHTER_ORDER.find((fid) => FIGHTERS[fid].unlockAt === nextIdx && !profile.fighters[fid]);
    if (nextFighter) {
      profile.fighters[nextFighter] = true;
      saveProfile();
      els.clearUnlock.classList.remove('is-hidden');
      els.clearUnlock.textContent = 'ОТКРЫТ БОЕЦ: ' + FIGHTERS[nextFighter].name + ' — ' + FIGHTERS[nextFighter].role;
    } else {
      els.clearUnlock.classList.add('is-hidden');
    }
    els.nextStageButton.style.display = '';
    hideAll();
    els.stageClear.classList.remove('is-hidden');
    updateProfileUi();
  }

  function endRun(won) {
    if (mode === 'over') return;
    mode = 'over';
    const isRecord = run.score > profile.best;
    if (isRecord) profile.best = run.score;
    saveProfile();
    if (won) {
      els.overEyebrow.textContent = 'ТОКИО УСПОКОИЛОСЬ';
      els.overTitle.textContent = 'ПОБЕДА';
      // Без числительного: «все 3 улицы» и «все 4 улицы» требуют разного
      // падежа, и текст протухал бы при каждой новой сцене.
      els.overCopy.textContent = 'Токио снова твой. Последний босс убрался в тоннель.';
    } else {
      els.overEyebrow.textContent = 'ТЕМНОТА СГУСТИЛАСЬ';
      els.overTitle.textContent = 'ПОРАЖЕНИЕ';
      els.overCopy.textContent = 'Они оказались быстрее.';
    }
    els.overScore.textContent = String(run.score);
    els.overStage.textContent = (stage.index + 1) + ' / ' + STAGES.length;
    els.overKills.textContent = String(run.kills);
    els.overCombo.textContent = String(run.bestCombo);
    els.overRecord.classList.toggle('is-hidden', !isRecord);
    hideAll();
    els.gameOver.classList.remove('is-hidden');
    updateProfileUi();
  }

  // ==================================================================
  // ГЕОМЕТРИЯ
  // ==================================================================
  function groundY() {
    return viewport.h * 0.79;
  }

  function updateCamera(dt) {
    const p = run.p;
    const max = Math.max(0, stage.width - viewport.w);
    const target = Math.max(0, Math.min(max, p.x - viewport.w * 0.36));
    run.camX += (target - run.camX) * (1 - Math.pow(0.0009, dt));
  }

  // ==================================================================
  // ФОН
  // ==================================================================
  function drawSkyline(parallax, color, baseY, scale, scrollX) {
    const span = 240;
    const total = run ? run.camX * parallax : (scrollX || 0) * parallax;
    const off = total % span;
    for (let i = -1; i < viewport.w / span + 2; i++) {
      const bx = i * span - off;
      const seed = Math.floor(total / span) + i;
      const h = (60 + ((seed * 97) % 130)) * scale;
      const w = 90 + ((seed * 53) % 70);
      ctx.fillStyle = color;
      ctx.fillRect(bx, baseY - h, w, h);
      ctx.fillStyle = 'rgba(255,220,140,0.26)';
      for (let wy = baseY - h + 10; wy < baseY - 12; wy += 16) {
        for (let wx = bx + 8; wx < bx + w - 10; wx += 14) {
          if (((wx * 7 + wy * 13 + seed * 31) % 11) < 4) ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }

  // Фасады и уличный реквизит. Без этого средняя часть кадра —
  // пустое небо, и бойцу не на чем стоять взглядом.
  const SIGNS = ['麺', '酒', '焼', '刀', '鬼', '夜', '雷', '福'];
  function drawMidground() {
    const def = stage.def;
    const gy = groundY();
    const wallTop = gy - 330;

    // стена-фасад: снизу плотная, сверху растворяется в небе
    const wg = ctx.createLinearGradient(0, wallTop, 0, gy);
    wg.addColorStop(0, 'rgba(14,6,24,0.0)');
    wg.addColorStop(0.34, 'rgba(14,6,24,0.72)');
    wg.addColorStop(1, 'rgba(16,7,26,0.96)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, wallTop, viewport.w, gy - wallTop);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 137 - run.camX * 0.62) % 300 + 300) % 300 - 50;
      ctx.fillRect(x, wallTop + 120, 4, gy - wallTop - 120);
    }
    // карниз над вывесками
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, gy - 172, viewport.w, 5);
    ctx.strokeStyle = def.accent;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gy - 172);
    ctx.lineTo(viewport.w, gy - 172);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // В помещении фасад другой: плитка, колонны и трубы под потолком
    if (def.indoor) { drawStation(gy, wallTop); return; }

    // неоновые вывески
    const sw = 300;
    const soff = (run.camX * 0.62) % sw;
    for (let i = -1; i < viewport.w / sw + 2; i++) {
      const seed = Math.floor((run.camX * 0.62) / sw) + i;
      const x = i * sw - soff + ((seed * 47) % 90);
      const y = wallTop + 34 + ((seed * 71) % 46);
      const col = (seed % 3 === 0) ? def.accent : def.lantern;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(x - 12, y - 30, 62, 58);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      ctx.strokeRect(x - 8, y - 26, 54, 50);
      ctx.shadowBlur = 0;
      ctx.fillStyle = col;
      ctx.font = '700 30px serif';
      ctx.textAlign = 'center';
      ctx.fillText(SIGNS[((seed % SIGNS.length) + SIGNS.length) % SIGNS.length], x + 19, y + 12);
    }

    // уличный реквизит у заднего края тротуара
    const pw = 152;
    const poff = (run.camX * 0.8) % pw;
    for (let i = -1; i < viewport.w / pw + 2; i++) {
      const seed = Math.floor((run.camX * 0.8) / pw) + i;
      const x = i * pw - poff + ((seed * 83) % 40);
      const kind = ((seed % 3) + 3) % 3;
      ctx.save();
      ctx.globalAlpha = 0.92;
      if (kind === 0) {
        // ящики
        ctx.fillStyle = 'rgba(46,26,32,0.95)';
        ctx.fillRect(x, gy - 32, 32, 32);
        ctx.strokeStyle = 'rgba(255,180,79,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, gy - 31, 30, 30);
        ctx.fillStyle = 'rgba(58,32,38,0.95)';
        ctx.fillRect(x + 25, gy - 48, 26, 48);
        ctx.strokeRect(x + 26, gy - 47, 24, 46);
      } else if (kind === 1) {
        // торговый автомат
        ctx.fillStyle = 'rgba(30,18,42,0.95)';
        ctx.fillRect(x, gy - 60, 29, 60);
        ctx.fillStyle = 'rgba(99,231,255,0.22)';
        ctx.fillRect(x + 4, gy - 54, 21, 25);
        ctx.fillStyle = 'rgba(255,180,79,0.5)';
        ctx.fillRect(x + 4, gy - 25, 21, 3);
        ctx.fillStyle = 'rgba(255,110,168,0.45)';
        ctx.fillRect(x + 4, gy - 17, 21, 3);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, gy - 59, 27, 58);
      } else {
        // столб с фонарём
        ctx.strokeStyle = 'rgba(24,14,36,0.95)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 10, gy);
        ctx.lineTo(x + 10, gy - 126);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 10, gy - 126);
        ctx.quadraticCurveTo(x + 32, gy - 132, x + 34, gy - 116);
        ctx.stroke();
        ctx.fillStyle = def.lantern;
        ctx.shadowColor = def.lantern;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(x + 34, gy - 108, 8, 11, 0, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        // конус света
        ctx.globalAlpha = 0.07;
        ctx.beginPath();
        ctx.moveTo(x + 34, gy - 100);
        ctx.lineTo(x - 12, gy);
        ctx.lineTo(x + 80, gy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Перрон метро вместо уличного фасада: плитка, колонны, лампы в ряд.
  function drawStation(gy, wallTop) {
    const def = stage.def;
    ctx.strokeStyle = 'rgba(210,235,240,0.07)';
    ctx.lineWidth = 1;
    for (let y = wallTop + 60; y < gy; y += 22) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(viewport.w, y); ctx.stroke();
    }
    const tw = 44;
    const toff = (run.camX * 0.62) % tw;
    for (let i = -1; i < viewport.w / tw + 2; i++) {
      const x = i * tw - toff;
      ctx.beginPath(); ctx.moveTo(x, wallTop + 60); ctx.lineTo(x, gy); ctx.stroke();
    }
    // колонны
    const cw = 190;
    const coff = (run.camX * 0.72) % cw;
    for (let i = -1; i < viewport.w / cw + 2; i++) {
      const x = i * cw - coff + 30;
      ctx.fillStyle = 'rgba(30,52,58,0.95)';
      ctx.fillRect(x, wallTop + 74, 26, gy - wallTop - 74);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, wallTop + 74, 7, gy - wallTop - 74);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 20, wallTop + 74, 6, gy - wallTop - 74);
    }

    // Полоса с названием станции рисуется после колонн, иначе колонны
    // перекрывают буквы ровно в том месте, где они стоят.
    ctx.fillStyle = 'rgba(6,16,20,0.96)';
    ctx.fillRect(0, gy - 156, viewport.w, 44);
    ctx.strokeStyle = 'rgba(210,235,240,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, gy - 155.5, viewport.w - 1, 43);
    ctx.fillStyle = 'rgba(232,244,255,0.85)';
    ctx.font = '700 22px "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const nameX = ((-run.camX * 0.62) % 620 + 620) % 620;
    ctx.fillText('КОГЭН', nameX + 44, gy - 134);
    ctx.fillStyle = def.accent;
    ctx.fillRect(nameX + 176, gy - 138, 70, 5);
    ctx.textBaseline = 'alphabetic';

    // Лампы под потолком
    const lw = 240;
    const loff = (run.camX * 0.72) % lw;
    for (let i = -1; i < viewport.w / lw + 2; i++) {
      const x = i * lw - loff + 60;
      const y = wallTop + 34;
      // конус света, а не прямоугольник: иначе лампа выглядит серой колонной
      ctx.fillStyle = def.lantern;
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + 44, y + 4);
      ctx.lineTo(x + 84, gy);
      ctx.lineTo(x - 40, gy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(20,34,40,0.95)';
      ctx.fillRect(x - 8, y - 9, 60, 9);
      ctx.fillStyle = def.lantern;
      ctx.shadowColor = def.lantern;
      ctx.shadowBlur = 20;
      ctx.fillRect(x, y, 44, 4);
      ctx.shadowBlur = 0;
    }
  }

  function drawBackground() {
    const def = stage.def;
    const g = ctx.createLinearGradient(0, 0, 0, groundY());
    g.addColorStop(0, def.sky[0]);
    g.addColorStop(1, def.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewport.w, viewport.h);

    // Луна с ореолом, окрашенная под палитру сцены.
    // В помещении её быть не должно: станция метро под землёй.
    if (!def.indoor) {
      const mx = viewport.w * 0.78;
      const my = viewport.h * 0.14;
      ctx.fillStyle = def.lantern;
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.arc(mx, my, 92, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(mx, my, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(mx, my, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.arc(mx - 8, my + 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + 10, my - 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Вместо луны — вентиляционные трубы под потолком
      ctx.strokeStyle = 'rgba(150,190,200,0.14)';
      ctx.lineWidth = 5;
      const py = viewport.h * 0.1;
      for (let i = 0; i < 3; i++) {
        const y = py + i * 15;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(viewport.w, y);
        ctx.stroke();
      }
    }

    drawSkyline(0.12, 'rgba(28,14,44,0.85)', groundY() + 6, 1);
    drawSkyline(0.26, 'rgba(18,8,32,0.9)', groundY() + 10, 0.72);

    // фонари
    const spacing = 260;
    const off = (run.camX * 0.5) % spacing;
    for (let i = -1; i < viewport.w / spacing + 2; i++) {
      const seed = Math.floor((run.camX * 0.5) / spacing) + i;
      const px = i * spacing - off + ((seed * 61) % 40);
      const topY = groundY() - 210 - ((seed * 37) % 50);
      ctx.strokeStyle = 'rgba(30,18,44,0.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, groundY() + 4);
      ctx.lineTo(px, topY);
      ctx.stroke();
      const glow = 0.6 + Math.sin(ambient * 2 + seed) * 0.14;
      ctx.fillStyle = def.lantern;
      ctx.globalAlpha = 0.2 * glow;
      ctx.beginPath();
      ctx.arc(px, topY + 12, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = def.lantern;
      ctx.shadowColor = def.lantern;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(px, topY + 12, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawGround() {
    const def = stage.def;
    const gy = groundY();
    ctx.fillStyle = def.ground;
    ctx.fillRect(0, gy, viewport.w, viewport.h - gy);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(0, gy, viewport.w, FLOOR_DEPTH);

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    const spacing = 64;
    const off = run.camX % spacing;
    for (let i = -1; i < viewport.w / spacing + 2; i++) {
      const x = i * spacing - off;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x - 30, viewport.h);
      ctx.stroke();
    }
    for (let j = 1; j < 5; j++) {
      const y = gy + (FLOOR_DEPTH / 5) * j;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(viewport.w, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (def.rain) {
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = def.lantern;
      const spacing2 = 260;
      const off2 = (run.camX * 0.5) % spacing2;
      for (let i = -1; i < viewport.w / spacing2 + 2; i++) {
        ctx.fillRect(i * spacing2 - off2, gy, 14, 40);
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = def.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.shadowColor = def.accent;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(viewport.w, gy);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawRain() {
    if (!stage.def.rain) return;
    ctx.strokeStyle = 'rgba(200,220,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const seed = i * 137;
      const x = (seed * 7 + ambient * 220) % (viewport.w + 60) - 30;
      const y = (seed * 13 + ambient * 640) % viewport.h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 13);
      ctx.stroke();
    }
  }

  // ==================================================================
  // РЕНДЕР БОЙЦОВ
  // ==================================================================
  function drawShadow(a, camX) {
    const sx = a.x - camX;
    if (sx < -60 || sx > viewport.w + 60) return;
    const h = Math.max(0, a.z || 0);
    const k = Math.max(0.25, 1 - h / 110);
    ctx.globalAlpha = 0.34 * k;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(sx, a.y + 1, 22 * FIG * k * (a.scale || 1), 6 * FIG * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawActor(a, camX) {
    const sx = a.x - camX;
    if (sx < -150 || sx > viewport.w + 150) return;
    let alpha = 1;
    if (a.dead) alpha = Math.max(0, 1 - a.deathT * 2.2);
    else if (a.invuln > 0 && Math.floor(ambient * 22) % 2 === 0) alpha = 0.45;
    drawFighter(ctx, a.def, sx, a.y - (a.z || 0), (a.scale || 1) * FIG, a.facing, a.pose, {
      flash: a.hitFlash > 0 || a.hurtFlash > 0,
      alpha,
      scream: a.state === 'hurt' || a.state === 'down'
    });
  }

  // Указатель над игроком: в свалке врагов без него не найти себя
  function drawPlayerMark(camX) {
    const p = run.p;
    if (!p) return;
    const sx = p.x - camX;
    if (sx < -40 || sx > viewport.w + 40) return;
    const y = p.y - (p.z || 0) - BODY_H * FIG - 16 * FIG + Math.sin(ambient * 4) * 3;
    const col = p.invuln > 0 && Math.floor(ambient * 14) % 2 === 0 ? 'rgba(255,255,255,0.25)' : '#ff6ea8';
    ctx.save();
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(sx, y + 8 * FIG);
    ctx.lineTo(sx - 7 * FIG, y - 3 * FIG);
    ctx.lineTo(sx + 7 * FIG, y - 3 * FIG);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFoeHp(e, camX) {
    if (e.dead || e.hp >= e.maxHp) return;
    const sx = e.x - camX;
    const sy = e.y - BODY_H * e.scale * FIG - 10 * FIG;
    const w = 52 * e.scale * FIG;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(sx - w / 2, sy, w, 4);
    const r = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = r > 0.5 ? '#b6ff3d' : r > 0.22 ? '#ffb44f' : '#ff4757';
    ctx.fillRect(sx - w / 2, sy, w * r, 4);
  }

  function drawPickups(camX) {
    for (const c of run.pickups) {
      ctx.save();
      ctx.translate(c.x - camX, c.y - c.z);
      ctx.globalAlpha = Math.min(1, c.life * 2);
      ctx.rotate(ambient * 3);
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 12;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }

  function drawKnives(camX) {
    for (const k of run.knives) {
      ctx.save();
      ctx.translate(k.x - camX, k.y);
      ctx.rotate(ambient * 30 * (k.vx > 0 ? 1 : -1));
      ctx.fillStyle = '#dfe8ff';
      ctx.shadowColor = '#63e7ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(camX) {
    ctx.save();
    for (const q of run.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - camX - q.r / 2, q.y - q.r / 2, q.r, q.r);
    }
    ctx.restore();
  }

  function drawPops(camX) {
    ctx.save();
    ctx.textAlign = 'center';
    for (const q of run.pops) {
      const k = q.life / q.max;
      ctx.globalAlpha = Math.max(0, k);
      if (q.n) {
        ctx.font = '700 20px "Arial Black", sans-serif';
        ctx.fillStyle = '#ffb44f';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 10;
        ctx.fillText(q.n + 'x', q.x - camX, q.y - (1 - k) * 26);
      } else {
        ctx.font = '900 17px "Arial Black", sans-serif';
        ctx.fillStyle = '#ff6ea8';
        ctx.shadowColor = '#ff3d6e';
        ctx.shadowBlur = 12;
        ctx.fillText(q.text, q.x - camX, q.y - (1 - k) * 22);
      }
    }
    ctx.restore();
  }

  function drawBossBar() {
    let boss = null;
    for (const f of run.foes) { if (f.boss && !f.dead) { boss = f; break; } }
    if (!boss) return;
    const w = Math.min(520, viewport.w - 60);
    const x = (viewport.w - w) / 2;
    const y = viewport.h - 46;
    ctx.fillStyle = 'rgba(10,3,20,0.8)';
    ctx.fillRect(x - 3, y - 3, w + 6, 16);
    ctx.fillStyle = 'rgba(255,61,110,0.22)';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = '#ff3d6e';
    ctx.shadowColor = '#ff3d6e';
    ctx.shadowBlur = 12;
    ctx.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd7e6';
    ctx.font = '700 10px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(boss.def.name, viewport.w / 2, y - 8);
  }

  // Фон меню
  function drawMenuBackdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, viewport.h);
    g.addColorStop(0, '#1a0b28');
    g.addColorStop(1, '#0a0412');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewport.w, viewport.h);
    const gy = viewport.h * 0.78;
    menuScroll += 0.014;
    for (let layer = 0; layer < 2; layer++) {
      const scale = layer ? 0.7 : 1;
      const par = layer ? 0.4 : 0.2;
      const alpha = layer ? 0.9 : 0.95;
      ctx.fillStyle = layer ? 'rgba(18,8,32,' + alpha + ')' : 'rgba(26,13,42,' + alpha + ')';
      const span = 120;
      const off = (menuScroll * par * 60) % span;
      for (let i = -1; i < viewport.w / span + 2; i++) {
        const seed = i + layer * 53;
        const h = (50 + ((seed * 97) % 150)) * scale;
        const w = 56 + ((seed * 53) % 44);
        const x = i * span - off;
        ctx.fillRect(x, gy - h, w, h);
        if (layer) {
          ctx.fillStyle = 'rgba(255,200,120,0.22)';
          for (let wy = gy - h + 10; wy < gy - 12; wy += 16) {
            for (let wx = x + 7; wx < x + w - 8; wx += 13) {
              if (((wx * 7 + wy * 13 + seed * 31) % 11) < 3) ctx.fillRect(wx, wy, 5, 7);
            }
          }
          ctx.fillStyle = 'rgba(18,8,32,' + alpha + ')';
        }
      }
    }
    ctx.fillStyle = 'rgba(255,110,168,0.14)';
    ctx.fillRect(0, gy, viewport.w, 3);
  }

  // ==================================================================
  // ОСНОВНОЙ РЕНДЕР
  // ==================================================================
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stage || !run) { drawMenuBackdrop(); return; }

    // тряска сдвигает камеру, поэтому переменная должна быть изменяемой
    let camX = run.camX;
    const shake = run.shake;
    if (shake > 0 && !run.reduced) {
      camX += (Math.random() - 0.5) * shake;
    }

    drawBackground();
    drawMidground();
    drawGround();

    const list = run.foes.slice();
    if (run.p) list.push(run.p);
    list.sort((a, b) => a.y - b.y);

    for (const a of list) drawShadow(a, camX);
    drawPickups(camX);
    for (const a of list) drawActor(a, camX);
    for (const e of run.foes) drawFoeHp(e, camX);
    drawPlayerMark(camX);
    drawKnives(camX);
    drawParticles(camX);
    drawPops(camX);
    drawRain();
    drawBossBar();
  }

  // ==================================================================
  // ЦИКЛ
  // ==================================================================
  function frame(now) {
    let dt = (now - lastFrame) / 1000;
    lastFrame = now;
    dt = Math.max(0, Math.min(1 / 30, dt));
    ambient += dt;

    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) els.banner.classList.remove('show');
    }
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) els.toast.classList.remove('visible');
    }

    if (run && stage) {
      if (mode === 'playing') {
        run.invulnT = Math.max(0, run.invulnT - dt);
        run.comboT = Math.max(0, run.comboT - dt);
        if (run.comboT <= 0) run.combo = 0;
        run.shake = Math.max(0, run.shake - dt * 40);

        if (run.hitStop > 0) {
          run.hitStop -= dt;
        } else {
          updatePlayer(dt);
          for (const e of run.foes) updateFoe(e, dt);
          updateKnives(dt);
          updatePickups(dt);
          updateWaves(dt);
          updateCamera(dt);
        }

        for (let i = run.particles.length - 1; i >= 0; i--) {
          const q = run.particles[i];
          q.life -= dt;
          q.vy += 620 * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          if (q.life <= 0) run.particles.splice(i, 1);
        }
        for (let i = run.pops.length - 1; i >= 0; i--) {
          run.pops[i].life -= dt;
          if (run.pops[i].life <= 0) run.pops.splice(i, 1);
        }
        run.foes = run.foes.filter((f) => !(f.dead && f.deathT > 1.2));

        updateHud();
      } else {
        // вне боя позы всё равно слегка оживают
        poseIdle(run.p, ambient);
        for (const e of run.foes) if (!e.dead) poseFoeWalk(e);
      }
    }

    // одноразовые нажатия читаем один кадр
    input.attackEdge = false;
    input.jumpEdge = false;
    input.specialEdge = false;
    input.dashEdge = false;

    render();
    requestAnimationFrame(frame);
  }

  // ==================================================================
  // HUD
  // ==================================================================
  function updateHud() {
    if (!run || !run.p) return;
    const p = run.p;
    els.healthFill.style.transform = 'scaleX(' + Math.max(0, p.hp / p.maxHp) + ')';
    els.meterFill.style.transform = 'scaleX(' + Math.max(0, p.meter / p.maxMeter) + ')';
    els.livesValue.textContent = '×' + Math.max(0, run.lives);
    els.scoreValue.textContent = String(run.score);
    els.waveValue.textContent = run.bossSpawned
      ? 'БОСС'
      : 'ВОЛНА ' + Math.max(1, Math.min(run.wave, stage.def.waves.length)) + '/' + (stage.def.waves.length + 1);
    if (run.combo > 1) {
      els.comboBlock.classList.remove('is-hidden');
      els.comboValue.textContent = String(run.combo);
    } else {
      els.comboBlock.classList.add('is-hidden');
    }
  }

  function showBanner(text) {
    els.banner.textContent = text;
    els.banner.classList.remove('show');
    void els.banner.offsetWidth;
    els.banner.classList.add('show');
    bannerTimer = 1.5;
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 1700);
  }

  // ==================================================================
  // ЭКРАНЫ
  // ==================================================================
  function hideAll() {
    [els.menu, els.roster, els.pauseScreen, els.stageClear, els.gameOver]
      .forEach((s) => s.classList.add('is-hidden'));
  }

  function updateProfileUi() {
    const unlocked = FIGHTER_ORDER.filter((id) => profile.fighters[id]).length;
    els.rosterCount.textContent = String(unlocked);
    els.rosterUnlocked.textContent = String(unlocked);
    els.rosterTotal.textContent = String(FIGHTER_ORDER.length);
  }

  function startRun(fighterId) {
    ensureAudio();
    run = {
      fighterId, p: null, foes: [], knives: [], pickups: [], particles: [], pops: [],
      score: 0, kills: 0, combo: 0, comboT: 0, bestCombo: 0,
      lives: 3, livesUsed: 0, wave: 0, waveT: 1.4, camX: 0,
      shake: 0, hitStop: 0, invulnT: 0, bossSpawned: false,
      reduced: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    paintPortrait(fighterId);
    startStage(0);
  }

  function pauseGame() {
    if (mode !== 'playing') return;
    mode = 'paused';
    els.pauseStats.innerHTML =
      '<div class="pause-stat"><span>СЧЁТ</span><b>' + run.score + '</b></div>' +
      '<div class="pause-stat"><span>УБИТО</span><b>' + run.kills + '</b></div>' +
      '<div class="pause-stat"><span>КОМБО</span><b>' + run.bestCombo + '</b></div>' +
      '<div class="pause-stat"><span>ЖИЗНИ</span><b>' + Math.max(0, run.lives) + '</b></div>';
    hideAll();
    els.pauseScreen.classList.remove('is-hidden');
  }

  function resumeGame() {
    if (mode !== 'paused') return;
    mode = 'playing';
    hideAll();
  }

  function renderRoster() {
    els.rosterGrid.innerHTML = FIGHTER_ORDER.map((id) => {
      const f = FIGHTERS[id];
      const open = !!profile.fighters[id];
      return '<article class="fighter-card' + (open ? '' : ' locked') + '" data-fighter="' + id + '">' +
        '<div class="fc-portrait" data-f="' + id + '"></div>' +
        '<div class="fc-name">' + f.name + '</div>' +
        '<div class="fc-role">' + f.role + '</div>' +
        (open ? '' : '<div class="fc-lock">ЗАКРЫТ</div>') +
        '</article>';
    }).join('');

    FIGHTER_ORDER.forEach((id) => {
      const holder = els.rosterGrid.querySelector('[data-f="' + id + '"]');
      if (!holder) return;
      const c = document.createElement('canvas');
      c.width = 150;
      c.height = 168;
      c.style.width = '150px';
      c.style.height = '168px';
      holder.appendChild(c);
      const g = c.getContext('2d');
      g.save();
      g.translate(75, 162);
      g.scale(1.06, 1.06);
      const pz = makePose();
      pz.armF = 0.34; pz.foreF = 0.42; pz.armB = -0.28; pz.foreB = 0.3;
      pz.thighF = 0.12; pz.thighB = -0.14;
      drawFighter(g, FIGHTERS[id], 0, 0, 1, 1, pz, {});
      g.restore();
    });
  }

  // Портрет в HUD: только голова и плечи, поэтому масштаб крупный,
  // а точка привязки смещена вниз за пределы холста.
  let portraitCtx = null;
  const PORTRAIT = 160;
  const PORTRAIT_SCALE = 2.9;
  // Центр головы в системе координат фигуры (от ступней вверх)
  const HEAD_MID = LEG + TORSO + NECK + HEAD_H * 0.5;
  function paintPortrait(id) {
    if (!portraitCtx) return;
    portraitCtx.clearRect(0, 0, PORTRAIT, PORTRAIT);
    portraitCtx.save();
    portraitCtx.translate(PORTRAIT / 2, PORTRAIT / 2 + (HEAD_MID + 6) * PORTRAIT_SCALE);
    portraitCtx.scale(PORTRAIT_SCALE, PORTRAIT_SCALE);
    const pz = makePose();
    pz.armF = 0.3; pz.foreF = 0.4; pz.armB = -0.26; pz.foreB = 0.3;
    drawFighter(portraitCtx, FIGHTERS[id] || FIGHTERS.yuki, 0, 0, 1, 1, pz, {});
    portraitCtx.restore();
  }

  // ==================================================================
  // ВВОД
  // ==================================================================
  const MOVE_KEYS = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down' };
  const ACT_KEYS = {
    KeyJ: 'attack', KeyF: 'attack', KeyZ: 'attack',
    KeyK: 'jump', Space: 'jump',
    KeyL: 'special', KeyX: 'special',
    ShiftLeft: 'dash', ShiftRight: 'dash'
  };

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
      ensureAudio();
      const mv = MOVE_KEYS[e.code];
      if (mv) input[mv] = true;
      const act = ACT_KEYS[e.code];
      if (act) {
        const heldKey = act + 'Held';
        if (!input[heldKey]) input[act + 'Edge'] = true;
        input[heldKey] = true;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (mode === 'playing') pauseGame();
        else if (mode === 'paused') resumeGame();
      }
      if (e.code === 'KeyR' && mode === 'over') startRun(run.fighterId);
    });

    window.addEventListener('keyup', (e) => {
      const mv = MOVE_KEYS[e.code];
      if (mv) input[mv] = false;
      const act = ACT_KEYS[e.code];
      if (act) input[act + 'Held'] = false;
    });

    window.addEventListener('blur', () => {
      input.left = input.right = input.up = input.down = false;
      input.attackHeld = input.jumpHeld = input.specialHeld = input.dashHeld = false;
      if (mode === 'playing') pauseGame();
    });

    // сенсор: тап — удар, свайп — движение/рывок
    let tStart = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (mode !== 'playing') return;
      ensureAudio();
      tStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!tStart || mode !== 'playing') { tStart = null; return; }
      const dx = e.clientX - tStart.x;
      const dy = e.clientY - tStart.y;
      const dt = performance.now() - tStart.t;
      tStart = null;
      if (Math.hypot(dx, dy) < 20 && dt < 240) { input.attackEdge = true; return; }
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 24) { input.right = true; setTimeout(() => { input.right = false; }, 150); }
        else if (dx < -24) { input.left = true; setTimeout(() => { input.left = false; }, 150); }
        else input.dashEdge = true;
      } else if (dy < -18) input.jumpEdge = true;
      else input.specialEdge = true;
    });
  }

  // ==================================================================
  // ИНТЕРФЕЙС
  // ==================================================================
  function bindUi() {
    els.playButton.addEventListener('click', () => {
      ensureAudio();
      // идём бойцом с самым большим открытием, либо первым доступным
      const owned = FIGHTER_ORDER.filter((id) => profile.fighters[id]);
      const f = owned.length ? owned[owned.length - 1] : 'yuki';
      startRun(f);
    });
    els.rosterButton.addEventListener('click', () => {
      mode = 'roster';
      renderRoster();
      hideAll();
      els.roster.classList.remove('is-hidden');
    });
    els.closeRosterButton.addEventListener('click', backToMenu);
    els.rosterBackButton.addEventListener('click', backToMenu);
    els.rosterGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.fighter-card');
      if (!card) return;
      const id = card.dataset.fighter;
      if (!profile.fighters[id]) { showToast('БОЕЦ ЗАКРЫТ'); tone(150, 0.12, 'square', 0.028, -40); return; }
      ensureAudio();
      startRun(id);
    });
    els.pauseButton.addEventListener('click', () => { if (mode === 'playing') pauseGame(); });
    els.resumeButton.addEventListener('click', resumeGame);
    els.quitButton.addEventListener('click', backToMenu);
    els.nextStageButton.addEventListener('click', () => {
      const next = stage.index + 1;
      if (next < STAGES.length) startStage(next);
    });
    els.clearMenuButton.addEventListener('click', backToMenu);
    els.overMenuButton.addEventListener('click', backToMenu);
    els.retryButton.addEventListener('click', () => startRun(run.fighterId));
    els.soundButton.addEventListener('click', () => {
      soundOn = !soundOn;
      els.soundButton.classList.toggle('muted', !soundOn);
      if (soundOn) { ensureAudio(); tone(520, 0.08, 'triangle', 0.024, 160); }
    });
  }

  function backToMenu() {
    // Рекорд и открытые бойцы не должны теряться из-за выхода в меню
    if (run) saveProfile();
    mode = 'menu';
    run = null;
    stage = null;
    els.hud.classList.add('is-hidden');
    hideAll();
    els.menu.classList.remove('is-hidden');
    updateProfileUi();
  }

  // ==================================================================
  // РАЗМЕР И СТАРТ
  // ==================================================================
  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewport.w = Math.max(320, rect.width);
    viewport.h = Math.max(320, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(viewport.w * dpr);
    canvas.height = Math.round(viewport.h * dpr);
  }

  function init() {
    bindInput();
    bindUi();
    resize();
    window.addEventListener('resize', resize);
    updateProfileUi();

    const pc = document.createElement('canvas');
    pc.width = PORTRAIT;
    pc.height = PORTRAIT;
    pc.style.position = 'absolute';
    pc.style.inset = '0';
    pc.style.width = '100%';
    pc.style.height = '100%';
    els.portrait.appendChild(pc);
    portraitCtx = pc.getContext('2d');
    paintPortrait('yuki');

    requestAnimationFrame(frame);

    if (/[?&]debug\b/.test(window.location.search)) {
      window.__oni = {
        state: () => (run ? {
          mode, stage: stage ? stage.index + 1 : 0, score: run.score, kills: run.kills,
          combo: run.combo, bestCombo: run.bestCombo, lives: run.lives, wave: run.wave,
          hp: run.p ? run.p.hp : 0, maxHp: run.p ? run.p.maxHp : 0,
          fighter: run.fighterId, pstate: run.p ? run.p.state : null,
          foes: run.foes.filter((f) => !f.dead).length, boss: run.bossSpawned
        } : { mode }),
        start: (f) => startRun(f || 'yuki'),
        startStage: (i) => { if (run) startStage(Math.max(0, Math.min(STAGES.length - 1, i))); },
        stageInfo: (i) => ({ name: STAGES[i].name, waves: STAGES[i].waves.length, boss: STAGES[i].boss, width: STAGES[i].width }),
        addFoes: (n) => {
          if (!run) return;
          const list = stage.def.waves[Math.min(run.wave - 1, stage.def.waves.length - 1)];
          for (let i = 0; i < n; i++) {
            run.foes.push(makeFoe(list[i % list.length], run.p.x + 130 + i * 45, groundY() + 20));
          }
        },
        spawnBoss: () => { if (run && !run.bossSpawned) { run.wave = stage.def.waves.length + 1; spawnBoss(); } },
        count: () => STAGES.length,
        bossHp: () => { const b = run && run.foes.find((f) => f.boss && !f.dead); return b ? b.hp + '/' + b.maxHp : null; },
        // Поставить конкретного врага рядом с игроком
        spawnFoe: (type) => {
          if (!run) return false;
          const p = run.p;
          const f = makeFoe(type, p.x + p.facing * 60, p.y);
          run.foes.push(f);
          return true;
        },
        // Список врагов с HP, чтобы проверять щит снаружи
        foes: () => (run ? run.foes.filter((f) => !f.dead).map((f) => ({ type: f.type, hp: f.hp, facing: f.facing, guard: !!f.guard })) : []),
        // Развернуть щит: true — щит лицом к игроку, удар блокируется
        faceGuard: (toPlayer) => {
          const g = run && run.foes.find((f) => f.guard && !f.dead);
          if (!g) return 'нет щитоносца';
          g.facing = toPlayer ? run.p.facing : -run.p.facing;
          return g.facing;
        },
        // Один удар текущим ударом комбо
        punch: () => { const p = run && run.p; if (!p) return 'нет игрока'; p.hitDone = false; doHit(); return 'удар'; },
        // Приём целиком, без ожидания кадра
        doSpecial: () => {
          const p = run && run.p;
          if (!p) return 'нет игрока';
          p.state = 'special'; p.stateT = 0; p.specialT = 0; p.specialHit = false;
          return 'приём';
        },
        // Чистый стенд: убрать всех и оставить ровно одного врага заданного типа
        soloFoe: (type) => {
          if (!run) return null;
          const p = run.p;
          run.foes = run.foes.filter((f) => f.dead);
          const f = makeFoe(type, p.x + p.facing * 55, p.y);
          f.vx = 0; f.attackCd = 99;
          run.foes.push(f);
          return { hp: f.hp, facing: f.facing, guard: !!f.guard, x: Math.round(f.x), px: Math.round(p.x) };
        },
        // Живой объект щитоносца для чтения HP
        guard: () => {
          if (!run) return null;
          const g = run.foes.find((f) => !f.dead);
          return g ? { hp: g.hp, maxHp: g.maxHp, type: g.type, facing: g.facing, guard: !!g.guard } : null;
        },
        hurt: (n) => {
          if (!run || !run.p) return;
          run.p.hp -= (n || 10);
          if (run.p.hp <= 0) {
            run.p.hp = 0; run.p.state = 'down'; run.p.downT = 0;
            run.lives--; run.livesUsed++; run.invulnT = 1.2;
          }
        },
        killAll: () => { if (run) run.foes.forEach((f) => { if (!f.dead) killFoe(f); }); },
        fighters: FIGHTER_ORDER,
        body: { BODY_H, HEAD_H, LEG, TORSO, ARM_U, ARM_L, GRAVITY, JUMP_V, DASH_SPEED, FLOOR_DEPTH },
        setMeter: (v) => { if (run && run.p) run.p.meter = (v || 0) * run.p.maxMeter / 100; },
        _meter: () => (run && run.p ? Math.round(run.p.meter) : -1),
        // Сырое положение бойца — нужно, чтобы измерять физику в браузере
        _p: () => (run && run.p ? { x: run.p.x, y: run.p.y, z: run.p.z, vx: run.p.vx, vz: run.p.vz, state: run.p.state } : null),
        groundY: () => groundY(),
        view: () => ({ w: viewport.w, h: viewport.h, camX: run ? run.camX : 0, floor: FLOOR_DEPTH }),

        // Карточки для листинга: иконка и обложка рисуются теми же
        // бойцами, что и в игре, поэтому стиль не разъезжается.
        card: (w, h, kind) => {
          const cv = document.createElement('canvas');
          cv.width = w;
          cv.height = h;
          const g = cv.getContext('2d');
          const hero = FIGHTERS.yuki;
          const icon = kind === 'icon';
          const accent = icon ? '#ff6ea8' : '#ffb44f';

          const bg = g.createLinearGradient(0, 0, w, h);
          bg.addColorStop(0, '#31123f');
          bg.addColorStop(0.55, '#170829');
          bg.addColorStop(1, '#0a0414');
          g.fillStyle = bg;
          g.fillRect(0, 0, w, h);

          // неоновая сетка
          g.strokeStyle = 'rgba(255,110,168,0.14)';
          g.lineWidth = Math.max(1, w / 480);
          for (let i = 0; i <= 8; i++) {
            g.beginPath(); g.moveTo((i / 8) * w, 0); g.lineTo((i / 8) * w, h); g.stroke();
          }
          for (let i = 0; i <= 6; i++) {
            g.beginPath(); g.moveTo(0, (i / 6) * h); g.lineTo(w, (i / 6) * h); g.stroke();
          }

          // Раскладка. На иконке берётся фигура целиком: силуэт с хвостами
          // читается в мелком значке лучше, чем портрет с чёлкой.
          const heroScale = icon ? w / 158 : h / 180;
          const heroX = icon ? w * 0.5 : w * 0.74;
          const heroY = icon ? h * 1.0 : h * 1.04;
          const foeScale = icon ? w / 235 : h / 250;

          const foes = icon
            ? [['kozame', 0.1, 1.0], ['oni', 0.9, 0.95]]
            : [['kozame', 0.34, 0.9], ['oni', 0.47, 0.85], ['tori', 0.58, 0.8]];
          foes.forEach((f) => {
            g.save();
            g.globalAlpha = icon ? 0.42 : 0.62;
            g.filter = 'blur(1.5px)';
            g.translate(w * f[1], h * 1.06);
            g.scale(foeScale * f[2], foeScale * f[2]);
            const pz = makePose();
            pz.armF = 0.9; pz.foreF = -0.5; pz.armB = -0.5; pz.foreB = -0.2;
            pz.thighF = 0.34; pz.shinF = -0.3; pz.thighB = -0.4; pz.shinB = -0.2;
            pz.lean = 0.3; pz.crouch = 0.8;
            drawFighter(g, FOES[f[0]], 0, 0, 1, 1, pz, {});
            g.restore();
          });

          // ореол за героем — силуэт должен читаться на мелком значке
          const halo = g.createRadialGradient(heroX, h * 0.46, 0, heroX, h * 0.46, h * 0.6);
          halo.addColorStop(0, icon ? 'rgba(255,110,168,0.34)' : 'rgba(255,180,79,0.2)');
          halo.addColorStop(1, 'rgba(255,110,168,0)');
          g.fillStyle = halo;
          g.fillRect(0, 0, w, h);

          // герой
          g.save();
          g.translate(heroX, heroY);
          g.scale(heroScale, heroScale);
          const hp = makePose();
          hp.armF = icon ? -0.5 : -0.5;
          hp.foreF = icon ? -0.9 : -0.9;
          hp.armB = -0.4; hp.foreB = -0.7;
          hp.thighF = 0.4; hp.shinF = -0.34; hp.thighB = -0.46; hp.shinB = -0.2;
          hp.lean = 0.26; hp.crouch = 0.9;
          drawFighter(g, hero, 0, 0, 1, 1, hp, {});
          g.restore();

          if (!icon) {
            // затемнение слева, чтобы название читалось поверх фона
            const sc = g.createLinearGradient(0, 0, w * 0.72, 0);
            sc.addColorStop(0, 'rgba(8,3,16,0.92)');
            sc.addColorStop(0.6, 'rgba(8,3,16,0.55)');
            sc.addColorStop(1, 'rgba(8,3,16,0)');
            g.fillStyle = sc;
            g.fillRect(0, 0, w, h);

            g.textAlign = 'left';
            g.font = '900 ' + Math.round(h * 0.23) + 'px "Arial Black", sans-serif';
            g.fillStyle = '#ffd7e6';
            g.shadowColor = '#ff3d6e';
            g.shadowBlur = 24;
            g.fillText('NEON', w * 0.05, h * 0.4);
            g.shadowBlur = 0;
            g.fillStyle = accent;
            g.shadowColor = accent;
            g.shadowBlur = 24;
            g.fillText('//ONI', w * 0.05, h * 0.66);
            g.shadowBlur = 0;
            g.fillStyle = 'rgba(255,225,240,0.9)';
            g.font = '700 ' + Math.round(h * 0.05) + 'px "Arial Black", sans-serif';
            g.fillText('БИТ-ЭМ-АП · НОЧНОЙ ТОКИО', w * 0.05, h * 0.77);
          }

          // рамка
          g.strokeStyle = accent;
          g.globalAlpha = 0.65;
          g.lineWidth = Math.max(2, w / 190);
          g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2);
          g.globalAlpha = 1;
          return cv.toDataURL('image/png');
        },
        // Лист персонажей крупным планом: единственный способ честно
        // проверить арт, не разглядывая 40-пиксельную голову в бою.
        sheet: (headOnly) => {
          const old = document.getElementById('artSheet');
          if (old) old.remove();
          const all = [];
          FIGHTER_ORDER.forEach((id) => all.push({ def: FIGHTERS[id], name: FIGHTERS[id].name }));
          Object.keys(FOES).forEach((k) => all.push({ def: FOES[k], name: FOES[k].name }));
          Object.keys(BOSSES).forEach((k) => all.push({ def: BOSSES[k], name: BOSSES[k].name }));
          const cv = document.createElement('canvas');
          cv.id = 'artSheet';
          cv.width = 1280;
          cv.height = 760;
          cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:999;background:#180c26';
          document.body.appendChild(cv);
          const g = cv.getContext('2d');
          g.fillStyle = '#180c26';
          g.fillRect(0, 0, 1280, 760);
          const cols = 5;
          const cw = 1280 / cols;
          const ch = headOnly ? 300 : 240;
          const rows = Math.ceil(all.length / cols);
          g.fillStyle = '#ffffff';
          g.font = '700 14px "Arial Black", sans-serif';
          g.textAlign = 'center';
          all.forEach((a, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = col * cw + cw / 2;
            g.strokeStyle = 'rgba(255,255,255,0.1)';
            g.strokeRect(col * cw + 0.5, row * ch + 0.5, cw, ch);
            g.save();
            if (headOnly) {
              // центр головы (HEAD_MID выше ступней) должен попасть в середину ячейки
              const S = 3.4;
              g.translate(x, row * ch + ch * 0.46 + HEAD_MID * S);
              g.scale(S, S);
            } else {
              g.translate(x, row * ch + ch - 26);
              g.scale(1.42, 1.42);
            }
            const pz = makePose();
            pz.armF = 0.56; pz.foreF = -0.62; pz.armB = -0.28; pz.foreB = -0.95;
            pz.thighF = 0.24; pz.shinF = -0.2; pz.thighB = -0.3; pz.shinB = -0.12;
            pz.crouch = 0.6; pz.lean = 0.22;
            drawFighter(g, a.def, 0, 0, 1, 1, pz, {});
            g.restore();
            g.fillStyle = '#ffffff';
            g.fillText(a.name, x, row * ch + 22);
          });
          g.fillStyle = '#ff6ea8';
          g.fillText('всего ' + all.length + ', строк ' + rows, 20, 18);
          return all.length;
        },
        profile: () => profile
      };
    }
  }

  init();
})();
