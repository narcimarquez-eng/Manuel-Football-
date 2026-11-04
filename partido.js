// ============================================================================================
//  Manuel Football · el partido: 11 contra 11, fútbol arcade en el estadio de la intro
//  Los futbolistas salen del modelo de Manuel (jugador.glb, una versión ligera de nino.glb)
//  con otra cabeza, otro pelo, otra piel, otra altura y la equipación de su equipo.
// ============================================================================================
import * as THREE from 'three';
import { clone as clonarEsqueleto } from 'three/addons/utils/SkeletonUtils.js';

const V3 = THREE.Vector3;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const dif = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const azar = Math.random;
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const G = 9.8;

const RIVALES = [
  { nombre: 'TIBURONES', corto: 'TIB', camiseta: '#1f63d6', pantalon: '#0c1a3a', medias: '#1f63d6', portero: '#ff8a1c', marca: '#4f8dff' },
  { nombre: 'VOLCANES', corto: 'VOL', camiseta: '#c81f1c', pantalon: '#161616', medias: '#c81f1c', portero: '#2bd16b', marca: '#ff5a4e' },
  { nombre: 'HALCONES', corto: 'HAL', camiseta: '#169a46', pantalon: '#f0f0f0', medias: '#169a46', portero: '#f2d21b', marca: '#3fe07c' },
  { nombre: 'RELÁMPAGOS', corto: 'REL', camiseta: '#f0c419', pantalon: '#1a1a1a', medias: '#1a1a1a', portero: '#8a4cf0', marca: '#ffd84a' },
];
const MIOS = { nombre: 'MANUEL FC', corto: 'MFC', portero: '#21c46a', marca: '#ffffff' };
const NOMBRES_MIOS = ['IKER', 'PABLO', 'HUGO', 'CARLOS', 'DANI', 'LEO', 'MIGUEL', 'MARIO', 'ÁLEX', 'SERGIO'];
const NOMBRES_RIVAL = ['BRUNO', 'MARCOS', 'ÓSCAR', 'NICO', 'ADRIÁN', 'RAÚL', 'IVÁN', 'JORGE', 'LUCAS', 'TEO', 'GAEL', 'ENZO', 'RUBÉN'];
// 4-4-2 para un equipo que ataca hacia +X (x de -1 a 1 = de su portería a la contraria; z de -1 a 1 = ancho)
const FORMACION = [[-0.95, 0], [-0.62, -0.6], [-0.68, -0.2], [-0.68, 0.2], [-0.62, 0.6], [-0.3, -0.64], [-0.36, -0.2], [-0.36, 0.2], [-0.3, 0.64], [-0.05, -0.22], [-0.05, 0.22]];
const ROLES = ['POR', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'MED', 'DEL', 'DEL'];
const DORSALES = [1, 2, 4, 5, 3, 7, 6, 8, 11, 9, 10];
const PIELES = ['#f6d5bd', '#eec0a0', '#dca47e', '#c48a5e', '#9a6644', '#6e452c', '#4f3120'];
const PELOS = ['#16110d', '#2f1f15', '#55361d', '#8a5a2b', '#c9a05a', '#e3c98a', '#a5461b', '#ece4d4'];
const PEINADOS = ['corto', 'pinchos', 'afro', 'cresta', 'coleta', 'rizos', 'rapado', 'flequillo', 'corto', 'pinchos'];
const OJOS = ['#3b2a1a', '#2f5d8a', '#3f7a3a', '#5a3b1e', '#1c1c1c', '#6b4a2a'];
const DIFICULTAD = { 'Fácil': { robo: 0.55, reaccion: 0.55, puntería: 0.55, vel: 0.9, portero: 0.8 }, 'Normal': { robo: 1.0, reaccion: 0.8, puntería: 0.75, vel: 1.0, portero: 1.0 }, 'Difícil': { robo: 1.6, reaccion: 1.0, puntería: 0.9, vel: 1.08, portero: 1.15 } };

export async function crearPartido(C) {
  const { scene, camera, renderer, EST, MAN, sonido, U } = C;
  const MOVIL = C.MOVIL;

  // ------------------------------------------------------------------------------------------
  //  Medidas del campo (sacadas de las porterías y los banderines del estadio)
  // ------------------------------------------------------------------------------------------
  const CAMPO = (() => {
    const v = new V3(), largos = [], anchos = [], banderas = [];
    for (const o of EST.mallas) {
      if (!/poste|post|goal|porter/i.test((o.material && o.material.name) || '')) continue;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        if (Math.abs(v.x) > 35 && Math.abs(v.x) < 70 && v.y > 2.1 && v.y < 2.8 && Math.abs(v.z) < 6) { largos.push(Math.abs(v.x)); anchos.push(Math.abs(v.z)); }
        if (Math.abs(v.x) > 35 && v.y > 0.9 && v.y < 1.8 && Math.abs(v.z) > 20 && Math.abs(v.z) < 50) banderas.push(Math.abs(v.z));
      }
    }
    const mediana = (a, q = 0.5) => { if (!a.length) return null; a.sort((x, y) => x - y); return a[Math.floor((a.length - 1) * q)]; };
    const L = mediana(largos, 0.3) || 52.5, P = Math.max(2.8, Math.min(4.5, (mediana(anchos, 0.95) || 3.72) - 0.08)), W = mediana(banderas) || L * 0.65;
    return { L, W, P, H: 2.44, area: 16.5, fondo: 2.0 };
  })();
  console.log('Campo:', CAMPO);
  const { L, W } = CAMPO;

  // ------------------------------------------------------------------------------------------
  //  Interfaz (marcador, barras, mensajes, controles táctiles, menús)
  // ------------------------------------------------------------------------------------------
  const css = document.createElement('style');
  css.textContent = `
    #pt { position: fixed; inset: 0; z-index: 12; pointer-events: none; font-family: Oswald, system-ui, sans-serif; color: #fff; }
    #pt .marcador { position: absolute; left: max(12px, env(safe-area-inset-left)); top: max(10px, env(safe-area-inset-top)); display: flex; align-items: stretch; border-radius: 10px; overflow: hidden;
      box-shadow: 0 6px 20px rgba(0,0,0,.45); font-weight: 700; letter-spacing: .06em; font-size: 17px; }
    #pt .marcador > span { padding: 6px 10px; display: flex; align-items: center; gap: 8px; }
    #pt .eqA { background: #f4f4f4; color: #1b1340; } #pt .eqB { color: #fff; }
    #pt .goles { background: #120d2b; font-size: 21px; min-width: 70px; justify-content: center; font-variant-numeric: tabular-nums; }
    #pt .reloj { background: rgba(10,10,24,.82); font-weight: 500; font-variant-numeric: tabular-nums; }
    #pt .barras { position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; align-items: center; }
    #pt .jugadorActivo { font-weight: 700; letter-spacing: .14em; font-size: 15px; text-shadow: 0 2px 6px #000; }
    #pt .barra { width: 220px; height: 10px; border-radius: 6px; background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.35); overflow: hidden; }
    #pt .barra i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #fff4b0, #f3c235, #ff5a1f); }
    #pt .super i { background: linear-gradient(90deg, #7a5cff, #46d4ff); }
    #pt .super.lleno i { background: linear-gradient(90deg, #ffde59, #ff7a1a, #ff2d55); animation: brilla .5s infinite alternate; }
    @keyframes brilla { from { filter: brightness(1); } to { filter: brightness(1.6); } }
    #pt .etq { font-size: 11px; letter-spacing: .25em; opacity: .85; }
    #pt .tiro { opacity: 0; transition: opacity .15s; } #pt .tiro.ver { opacity: 1; }
    #pt .mensaje { position: absolute; left: 0; right: 0; top: 34%; text-align: center; font-family: Cinzel, Georgia, serif; font-weight: 900; font-size: clamp(44px, 11vw, 150px);
      letter-spacing: .04em; background: linear-gradient(180deg, #fff6d6, #f3d27a 45%, #b8862b 70%, #fbe7a6); -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 18px rgba(0,0,0,.8)); opacity: 0; transform: scale(.6); transition: opacity .25s, transform .45s cubic-bezier(.2,1.6,.4,1); padding: 0 16px; }
    #pt .mensaje.ver { opacity: 1; transform: scale(1); }
    #pt .sub { position: absolute; left: 0; right: 0; top: calc(34% + clamp(54px, 12vw, 165px)); text-align: center; font-weight: 700; letter-spacing: .3em; font-size: clamp(14px, 2.4vw, 24px); text-shadow: 0 2px 10px #000; opacity: 0; transition: opacity .3s; padding: 0 16px; }
    #pt .sub.ver { opacity: 1; }
    #pt .ayuda { position: absolute; left: 50%; top: 64px; transform: translateX(-50%); background: rgba(8,8,20,.78); border: 1px solid rgba(243,210,122,.5); border-radius: 12px;
      padding: 10px 16px; font-size: 14px; line-height: 1.55; max-width: calc(100vw - 32px); opacity: 0; transition: opacity .4s; text-align: center; }
    #pt .ayuda.ver { opacity: 1; } #pt .ayuda b { color: #f3d27a; }
    #pt canvas.radar { position: absolute; right: max(12px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); width: 150px; height: 98px; border-radius: 8px; background: rgba(10,40,20,.55); border: 1px solid rgba(255,255,255,.3); }
    #pt .pausaB { position: absolute; right: max(12px, env(safe-area-inset-right)); top: calc(max(10px, env(safe-area-inset-top)) + 106px); pointer-events: auto; min-height: 38px; padding: 6px 14px; font-size: 15px; }
    #pt .tactil { position: absolute; inset: 0; pointer-events: none; display: none; }
    #pt.toque .tactil { display: block; }
    #pt .joy { position: absolute; left: 0; bottom: 0; width: 50%; height: 62%; pointer-events: auto; touch-action: none; }
    #pt .aro { position: absolute; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); background: rgba(255,255,255,.06); display: none; }
    #pt .palo { position: absolute; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; background: rgba(255,255,255,.4); display: none; }
    #pt .botones { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: max(18px, env(safe-area-inset-bottom)); width: 230px; height: 200px; pointer-events: none; }
    #pt .bt { position: absolute; border-radius: 50%; border: 2px solid rgba(255,255,255,.55); color: #fff; font: 700 15px Oswald, sans-serif; letter-spacing: .08em; pointer-events: auto; touch-action: none;
      display: flex; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; }
    #pt .bt.on { filter: brightness(1.5); transform: scale(.94); }
    #pt .bTiro { width: 96px; height: 96px; right: 0; bottom: 40px; background: rgba(220,60,40,.55); }
    #pt .bPase { width: 80px; height: 80px; right: 110px; bottom: 0; background: rgba(40,120,230,.55); }
    #pt .bSprint { width: 64px; height: 64px; right: 112px; bottom: 112px; background: rgba(240,190,30,.5); font-size: 22px; }
    .pt-panel { position: fixed; inset: 0; z-index: 25; display: flex; align-items: center; justify-content: center; padding: 16px; background: radial-gradient(ellipse at center, rgba(10,12,40,.55), rgba(0,0,0,.85));
      font-family: Oswald, system-ui, sans-serif; color: #f4f1ea; }
    .pt-panel[hidden] { display: none !important; }
    .pt-caja { width: min(560px, 100%); max-height: calc(100vh - 32px); overflow: auto; display: flex; flex-direction: column; gap: 14px; align-items: center; text-align: center; }
    .pt-caja h2 { margin: 0; font-family: Cinzel, Georgia, serif; font-weight: 900; font-size: clamp(30px, 7vw, 54px); letter-spacing: .05em;
      background: linear-gradient(180deg, #fff6d6, #f3d27a 45%, #b8862b 70%, #fbe7a6); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .pt-caja .vs { font-weight: 300; letter-spacing: .3em; font-size: 14px; color: #cfc7b0; }
    .pt-fila { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .pt-op { font: 500 14px Oswald, sans-serif; letter-spacing: .08em; padding: 9px 14px; min-height: 42px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.06); color: #f4f1ea; cursor: pointer; display: inline-flex; gap: 8px; align-items: center; }
    .pt-op.sel { border-color: #f3d27a; background: rgba(243,210,122,.18); }
    .pt-op i { width: 14px; height: 14px; border-radius: 50%; display: inline-block; border: 1px solid rgba(255,255,255,.6); }
    .pt-et { font-size: 12px; letter-spacing: .28em; color: #a9a290; }
    .pt-grande { font: 700 18px Oswald, sans-serif; letter-spacing: .12em; padding: 14px 34px; min-height: 52px; border-radius: 999px; border: none; cursor: pointer; background: linear-gradient(180deg, #f7dc8c, #c8962f); color: #1a1205; }
    .pt-sec { font: 500 15px Oswald, sans-serif; letter-spacing: .1em; padding: 11px 22px; min-height: 46px; border-radius: 999px; border: 1px solid rgba(243,210,122,.7); background: rgba(10,10,22,.6); color: #f4f1ea; cursor: pointer; }
    .pt-res { font-size: clamp(40px, 10vw, 76px); font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: .08em; }
    .pt-nota { font-size: 13px; color: #a9a290; line-height: 1.5; max-width: 460px; }
    @media (max-height: 520px) {
      .pt-caja { gap: 7px; } .pt-caja h2 { font-size: 26px; } .pt-op { min-height: 34px; padding: 5px 11px; font-size: 13px; }
      .pt-grande { min-height: 44px; padding: 9px 26px; font-size: 16px; } .pt-nota { display: none; } .pt-res { font-size: 38px; }
    }
  `;
  document.head.appendChild(css);
  const hud = document.createElement('div');
  hud.id = 'pt';
  hud.innerHTML = `
    <div class="marcador"><span class="eqA">MFC</span><span class="goles"><b class="gA">0</b>&nbsp;–&nbsp;<b class="gB">0</b></span><span class="eqB">RIV</span><span class="reloj">1ª · 00'</span></div>
    <canvas class="radar" width="300" height="196"></canvas>
    <button class="pt-sec pausaB" aria-label="Pausa">⏸</button>
    <div class="barras">
      <div class="jugadorActivo"></div>
      <div class="tiro"><div class="barra"><i></i></div></div>
      <div class="etq">SUPERTIRO</div><div class="barra super"><i></i></div>
    </div>
    <div class="mensaje"></div><div class="sub"></div>
    <div class="ayuda"></div>
    <div class="tactil">
      <div class="joy"><div class="aro"></div><div class="palo"></div></div>
      <div class="botones"><div class="bt bTiro">TIRO</div><div class="bt bPase">PASE</div><div class="bt bSprint">⚡</div></div>
    </div>`;
  document.body.appendChild(hud);
  const q = (s) => hud.querySelector(s);
  const panel = document.createElement('div');
  panel.className = 'pt-panel';
  document.body.appendChild(panel);

  // ------------------------------------------------------------------------------------------
  //  Controles: teclado, mando y pantalla táctil
  // ------------------------------------------------------------------------------------------
  const ENT = { x: 0, y: 0, pase: false, tiro: false, sprint: false, pausa: false };
  const teclas = new Set();
  const alTecla = (e, abajo) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (abajo) teclas.add(k); else teclas.delete(k);
    if (abajo && (k === 'p' || k === 'escape')) ENT.pausa = true;
  };
  const kd = (e) => alTecla(e, true), ku = (e) => alTecla(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const tactil = { x: 0, y: 0, pase: false, tiro: false, sprint: false, id: null, ox: 0, oy: 0 };
  const joy = q('.joy'), aro = q('.aro'), palo = q('.palo');
  const usarToque = () => hud.classList.add('toque');
  if (MOVIL) usarToque();
  addEventListener('touchstart', usarToque, { passive: true, once: true });
  joy.addEventListener('pointerdown', (e) => {
    tactil.id = e.pointerId; tactil.ox = e.clientX; tactil.oy = e.clientY; joy.setPointerCapture(e.pointerId);
    aro.style.display = palo.style.display = 'block'; aro.style.left = palo.style.left = e.clientX + 'px'; aro.style.top = palo.style.top = (e.clientY - joy.getBoundingClientRect().top) + 'px';
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== tactil.id) return;
    let dx = e.clientX - tactil.ox, dy = e.clientY - tactil.oy; const d = Math.hypot(dx, dy), m = 55;
    if (d > m) { dx *= m / d; dy *= m / d; }
    tactil.x = dx / m; tactil.y = -dy / m;
    palo.style.left = (tactil.ox + dx) + 'px'; palo.style.top = (tactil.oy + dy - joy.getBoundingClientRect().top) + 'px';
  });
  const soltarJoy = (e) => { if (e.pointerId !== tactil.id) return; tactil.id = null; tactil.x = tactil.y = 0; aro.style.display = palo.style.display = 'none'; };
  joy.addEventListener('pointerup', soltarJoy); joy.addEventListener('pointercancel', soltarJoy);
  for (const [sel, clave] of [['.bTiro', 'tiro'], ['.bPase', 'pase'], ['.bSprint', 'sprint']]) {
    const b = q(sel);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); tactil[clave] = true; b.classList.add('on'); });
    const fin = () => { tactil[clave] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin);
  }
  q('.pausaB').addEventListener('click', () => { ENT.pausa = true; });
  function leerEntrada() {
    let x = 0, y = 0;
    if (teclas.has('arrowleft') || teclas.has('a')) x -= 1;
    if (teclas.has('arrowright') || teclas.has('d')) x += 1;
    if (teclas.has('arrowup') || teclas.has('w')) y += 1;
    if (teclas.has('arrowdown') || teclas.has('s')) y -= 1;
    let pase = teclas.has('z') || teclas.has('j'), tiro = teclas.has('x') || teclas.has('k') || teclas.has(' '), sprint = teclas.has('shift') || teclas.has('l');
    x += tactil.x; y += tactil.y; pase = pase || tactil.pase; tiro = tiro || tactil.tiro; sprint = sprint || tactil.sprint;
    try {
      for (const gp of (navigator.getGamepads ? navigator.getGamepads() : [])) {
        if (!gp) continue;
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (Math.hypot(ax, ay) > 0.2) { x += ax; y -= ay; }
        const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
        if (b(14)) x -= 1; if (b(15)) x += 1; if (b(12)) y += 1; if (b(13)) y -= 1;
        pase = pase || b(0); tiro = tiro || b(1) || b(2); sprint = sprint || b(7) || b(5);
        if (b(9) && !ENT._start) ENT.pausa = true; ENT._start = b(9);
      }
    } catch (e) { /* sin mando */ }
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    ENT.x = x; ENT.y = y; ENT.pase = pase; ENT.tiro = tiro; ENT.sprint = sprint;
  }

  // ------------------------------------------------------------------------------------------
  //  Modelos: Manuel (el de la intro) y la base ligera para el resto
  // ------------------------------------------------------------------------------------------
  const ALIAS = {
    cadera: ['hips', 'raiz', 'pelvis', 'root'], cuello: ['neck', 'cuello', 'columna'], cabeza: ['head', 'cabeza'], cabezaFin: ['headtopend', 'headtop', 'headend'],
    brazoI: ['leftarm', 'brazol'], antebrazoI: ['leftforearm', 'antebrazol'], manoI: ['lefthand', 'manol'],
    brazoD: ['rightarm', 'brazor'], antebrazoD: ['rightforearm', 'antebrazor'], manoD: ['righthand', 'manor'],
    rodilla: ['leftleg', 'espinillal', 'lowerlegl', 'calfl'],
  };
  const normaliza = (n) => n.toLowerCase().replace(/mixamorig\d*/, '').replace(/[^a-z]/g, '');
  function huesosDe(raiz) {
    const todos = {}; raiz.traverse((o) => { if (o.isBone) todos[normaliza(o.name)] = o; });
    const h = {}; for (const [k, ns] of Object.entries(ALIAS)) h[k] = ns.map((n) => todos[n]).find(Boolean) || null;
    if (h.cuello === h.cabeza) h.cuello = h.cabeza && h.cabeza.parent;
    return h;
  }
  function limpiarClips(clips, caderas) {
    for (const clip of clips) {
      clip.tracks = clip.tracks.filter((t) => !/\.scale$/.test(t.name));
      for (const tr of clip.tracks) if (caderas && tr.name === caderas + '.position') { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } }
    }
    return clips;
  }
  const buscarClip = (clips, exactos, re) => clips.find((c) => exactos.includes(c.name.toLowerCase())) || (re && clips.find((c) => re.test(c.name)));
  const clipsDe = (clips) => ({
    idle: buscarClip(clips, ['idle', 'reposo'], /idle|reposo/i) || clips[0],
    walk: buscarClip(clips, ['walk', 'andar'], /walk|andar/i),
    run: buscarClip(clips, ['run', 'correr'], /^(?!.*pertiga).*(run|correr)/i),
    kick: buscarClip(clips, ['kick', 'lanzar'], /kick|lanzar/i),
    shoot: buscarClip(clips, ['shoot', 'kick', 'lanzar'], /shoot|kick|lanzar/i),
  });

  // Base ligera (jugador.glb). Si no está, se clona el modelo de Manuel.
  let base = null;
  try { const d = await C.descargar(['jugador.glb']); if (d) base = await C.parsear(d.buffer); } catch (e) { console.warn(e); }
  if (!base && MAN.gltf) base = { scene: clonarEsqueleto(MAN.gltf.scene), animations: MAN.gltf.animations };
  if (!base) throw new Error('No hay modelo para los jugadores');
  const baseEscena = base.scene;
  baseEscena.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && /^(bal[oó]n|ball|soccer|sphere)/i.test(o.name + ' ' + ((o.material && o.material.name) || ''))) o.visible = false; });
  { const sobran = []; baseEscena.traverse((o) => { if (o.isMesh && !o.visible) sobran.push(o); }); sobran.forEach((o) => o.parent && o.parent.remove(o)); }
  const hBase = huesosDe(baseEscena);
  limpiarClips(base.animations, hBase.cadera && hBase.cadera.name);
  const CLIPS = clipsDe(base.animations);
  // altura de 1,25 m sin contar los brazos y mirando a +Z
  const ALTO = 1.25;
  {
    const contenedor = new THREE.Group(); contenedor.add(baseEscena);
    baseEscena.position.set(0, 0, 0); baseEscena.rotation.set(0, 0, 0); baseEscena.scale.setScalar(1);
    contenedor.updateMatrixWorld(true);
    let y0 = Infinity, y1 = -Infinity; const v = new V3();
    baseEscena.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const p = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight, bs = o.skeleton.bones;
      for (let i = 0; i < p.count; i += 3) {
        let mejor = 0, w = -1; for (let k = 0; k < 4; k++) { const wk = (k === 0 ? sw.getX(i) : k === 1 ? sw.getY(i) : k === 2 ? sw.getZ(i) : sw.getW(i)); if (wk > w) { w = wk; mejor = (k === 0 ? si.getX(i) : k === 1 ? si.getY(i) : k === 2 ? si.getZ(i) : si.getW(i)); } }
        if (/arm|hand|mano|brazo|finger|thumb/i.test((bs[mejor] && bs[mejor].name) || '')) continue;
        o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
    });
    const e = ALTO / (y1 - y0); baseEscena.scale.setScalar(e); baseEscena.position.y = -y0 * e;
    contenedor.updateMatrixWorld(true);
    if (hBase.brazoI && hBase.brazoD) {
      const a = hBase.brazoI.getWorldPosition(new V3()), b = hBase.brazoD.getWorldPosition(new V3());
      if (new V3().crossVectors(a.sub(b).setY(0).normalize(), new V3(0, 1, 0)).z < 0) baseEscena.rotation.y = Math.PI;
    }
    contenedor.remove(baseEscena);
  }
  // Medidas en reposo para la cabeza nueva y las zonas de la equipación
  const MEDIDAS = (() => {
    const cont = new THREE.Group(); cont.add(baseEscena); cont.updateMatrixWorld(true);
    const h = hBase, p = (b) => b ? b.getWorldPosition(new V3()) : null;
    const cab = p(h.cabeza), fin = p(h.cabezaFin), cad = p(h.cadera), rod = p(h.rodilla), cue = p(h.cuello);
    const altoCabeza = cab && fin ? fin.distanceTo(cab) : ALTO * 0.15;
    let matAlto = new THREE.Matrix4();
    const cajaCabeza = new THREE.Box3(), cajaCuello = new THREE.Box3(), v = new V3();
    baseEscena.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      matAlto = o.matrixWorld.clone();
      const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bs = o.skeleton.bones;
      const esCabeza = bs.map((b) => b === h.cabeza || b === h.cabezaFin || (h.cabeza && b.parent === h.cabeza));
      const esCuello = bs.map((b) => b === h.cuello);
      const marca = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        let wc = 0, wn = 0;
        for (let k = 0; k < 4; k++) {
          const b = k === 0 ? si.getX(i) : k === 1 ? si.getY(i) : k === 2 ? si.getZ(i) : si.getW(i);
          const w = k === 0 ? sw.getX(i) : k === 1 ? sw.getY(i) : k === 2 ? sw.getZ(i) : sw.getW(i);
          if (esCabeza[b]) wc += w; if (esCuello[b]) wn += w;
        }
        marca[i] = wc + wn;
        if (wc > 0.5 || wn > 0.5) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); (wc > 0.5 ? cajaCabeza : cajaCuello).expandByPoint(v); }
      }
      g.setAttribute('aCabeza', new THREE.BufferAttribute(marca, 1));
    });
    cont.remove(baseEscena);
    const yCuello = cue ? cue.y : ALTO * 0.8, yCabeza = cab ? cab.y : ALTO * 0.86;
    const pCab = cab || new V3(0, ALTO * 0.86, 0);
    const cabeza = cajaCabeza.isEmpty() ? null : { centro: cajaCabeza.getCenter(new V3()).sub(pCab), tam: cajaCabeza.getSize(new V3()) };
    const cuello = cajaCuello.isEmpty() ? null : { abajo: cajaCuello.min.y - pCab.y, ancho: Math.max(cajaCuello.max.x - cajaCuello.min.x, cajaCuello.max.z - cajaCuello.min.z), z: (cajaCuello.min.z + cajaCuello.max.z) / 2 - pCab.z };
    console.log('Cabeza original:', cabeza, 'cuello:', cuello);
    return { cabeza, cuello, altoCabeza: clamp(altoCabeza, ALTO * 0.1, ALTO * 0.22), corte: yCuello + (yCabeza - yCuello) * 0.15, largoCuello: Math.max(0.03, yCabeza - yCuello), cintura: cad ? cad.y - ALTO * 0.035 : ALTO * 0.5, rodilla: rod ? rod.y - ALTO * 0.02 : ALTO * 0.28, matAlto };
  })();

  // Material que cambia la equipación blanca por los colores del equipo y el tono de la piel
  const lin = (hex) => new THREE.Color(hex);
  const PIEL_REF = lin('#e2ad8c');
  function materialJugador(m0, opc) {
    const m = m0.clone();
    if ('metalness' in m) { m.metalness = 0; m.metalnessMap = null; }
    const u = {
      uCamiseta: { value: lin(opc.camiseta || '#ffffff') }, uPantalon: { value: lin(opc.pantalon || '#ffffff') }, uMedias: { value: lin(opc.medias || '#ffffff') },
      uPiel: { value: new V3(lin(opc.piel).r / PIEL_REF.r, lin(opc.piel).g / PIEL_REF.g, lin(opc.piel).b / PIEL_REF.b) },
      uKit: { value: opc.cambiarKit ? 1 : 0 }, uCorte: { value: opc.cortar ? (MEDIDAS.cabeza ? 49 : MEDIDAS.corte) : 99 }, uCintura: { value: MEDIDAS.cintura }, uRodilla: { value: MEDIDAS.rodilla }, uMatAlto: { value: MEDIDAS.matAlto },
    };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uMatAlto; varying float vAlto; attribute float aCabeza; varying float vCab;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlto = (uMatAlto * vec4(position, 1.0)).y; vCab = aCabeza;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying float vAlto; varying float vCab; uniform vec3 uCamiseta, uPantalon, uMedias, uPiel; uniform float uCintura, uRodilla, uKit, uCorte;`)
        .replace('void main() {', 'void main() {\n  if (vCab > 0.45 && uCorte < 50.0) discard;\n  if (vAlto > uCorte) discard;')
        .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
          float sat = (mx - mn) / max(mx, 1e-4);
          float calido = (c.r - c.b) / max(c.r, 1e-4);
          float piel = smoothstep(0.14, 0.28, calido) * (1.0 - smoothstep(0.8, 0.94, calido)) * step(c.b, c.g) * step(c.g, c.r * 1.02) * smoothstep(0.03, 0.09, c.r) * (1.0 - smoothstep(0.12, 0.22, 1.0 - sat - 0.6));
          vec3 kit = vAlto > uCintura ? uCamiseta : (vAlto > uRodilla ? uPantalon : uMedias);
          float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
          // equipación nueva: toda la ropa del color del equipo, con las sombras de la tela
          c = mix(c, kit * clamp(pow(lum / 0.55, 0.8), 0.18, 1.2), (1.0 - piel) * uKit);
          c = mix(c, c * uPiel, piel);
          diffuseColor.rgb = c;
        }`);
    };
    m.customProgramCacheKey = () => 'jugador-equipacion-1';
    return m;
  }

  // ---------- Cabezas nuevas: cara pintada, orejas, nariz y peinado ----------
  function texturaCara(r) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = r.piel; g.fillRect(0, 0, 512, 256);
    const cx = 128, cy = 132;
    // mofletes
    g.fillStyle = 'rgba(225,95,95,.22)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 33, cy + 22, 13, 8, 0, 0, Math.PI * 2); g.fill(); }
    if (r.pecas) { g.fillStyle = 'rgba(120,60,30,.45)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(cx + (azar() - 0.5) * 60, cy + 12 + azar() * 10, 1.4, 0, Math.PI * 2); g.fill(); } }
    // ojos
    for (const s of [-1, 1]) {
      const ex = cx + s * 22, ey = cy - 4;
      g.fillStyle = '#fbfbf7'; g.beginPath(); g.ellipse(ex, ey, 10, r.ojoAlto, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = r.ojos; g.beginPath(); g.arc(ex + s * 0.5, ey + 1, 6.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0b0b0b'; g.beginPath(); g.arc(ex + s * 0.5, ey + 1, 3.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex - 2, ey - 2, 1.8, 0, Math.PI * 2); g.fill();
      // cejas
      g.strokeStyle = r.pelo; g.lineWidth = r.cejaGruesa ? 5 : 3.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex - 10, ey - 15 + s * r.cejaAng * -1); g.quadraticCurveTo(ex, ey - 19, ex + 10, ey - 15 + s * r.cejaAng); g.stroke();
    }
    // boca
    g.strokeStyle = '#7d2f2a'; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath();
    if (r.boca === 0) g.arc(cx, cy + 22, 12, 0.2 * Math.PI, 0.8 * Math.PI);
    else if (r.boca === 1) { g.moveTo(cx - 9, cy + 31); g.quadraticCurveTo(cx, cy + 35, cx + 9, cy + 31); }
    else { g.fillStyle = '#7d2f2a'; g.ellipse(cx, cy + 32, 7, 5, 0, 0, Math.PI * 2); g.fill(); }
    g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  const geoEsfera = new THREE.SphereGeometry(1, 28, 18);
  const geoCasquete = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const geoBolita = new THREE.SphereGeometry(1, 10, 8);
  const geoPincho = new THREE.ConeGeometry(1, 1, 7); geoPincho.translate(0, 0.5, 0);
  function crearCabeza(r, R) {
    const g = new THREE.Group();
    const mPiel = new THREE.MeshStandardMaterial({ color: r.piel, roughness: 0.75 });
    const mPelo = new THREE.MeshStandardMaterial({ color: r.pelo, roughness: 0.85 });
    const tc = texturaCara(r);
    const cara = new THREE.Mesh(geoEsfera, new THREE.MeshStandardMaterial({ map: tc, roughness: 0.7, emissive: 0xffffff, emissiveMap: tc, emissiveIntensity: 0.18 }));
    cara.scale.set(R * 0.93, R * 1.04, R * 0.98); cara.castShadow = true; g.add(cara);
    for (const s of [-1, 1]) { const o = new THREE.Mesh(geoBolita, mPiel); o.scale.set(R * 0.16, R * 0.24, R * 0.12); o.position.set(s * R * 0.93, -R * 0.05, -R * 0.02); g.add(o); }
    const nariz = new THREE.Mesh(geoBolita, mPiel); nariz.scale.setScalar(R * 0.14); nariz.position.set(0, -R * 0.12, R * 0.97); g.add(nariz);
    const pelo = (geo, sx, sy, sz, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mPelo); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
    const casco = (k = 1.06, rx = -0.32) => pelo(geoCasquete, R * k * 0.95, R * k * 1.02, R * k, 0, R * 0.02, -R * 0.03, rx);
    switch (r.peinado) {
      case 'corto': casco(); break;
      case 'rapado': pelo(geoCasquete, R * 0.955, R * 1.05, R * 0.995, 0, R * 0.01, 0, -0.38); break;
      case 'pinchos': casco(); for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2, e = 0.55 + (i % 3) * 0.12; const p = pelo(geoPincho, R * 0.2, R * 0.5, R * 0.2, Math.cos(a) * R * 0.55 * e, R * 0.75, Math.sin(a) * R * 0.55 * e - R * 0.12); p.lookAt(p.position.clone().multiplyScalar(2).add(new V3(0, R * 2, 0))); p.rotateX(Math.PI / 2); } break;
      case 'afro': casco(1.08); for (let i = 0; i < 26; i++) { const u = azar() * 0.9 + 0.1, a = azar() * Math.PI * 2, rr = Math.sqrt(1 - u * u); pelo(geoBolita, R * 0.36, R * 0.36, R * 0.36, Math.cos(a) * rr * R * 1.02, u * R * 1.02 + R * 0.08, Math.sin(a) * rr * R * 1.02 - R * 0.08); } break;
      case 'rizos': casco(1.05); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pelo(geoBolita, R * 0.22, R * 0.22, R * 0.22, Math.cos(a) * R * 0.95, R * 0.45, Math.sin(a) * R * 0.95 - R * 0.05); } break;
      case 'cresta': pelo(geoCasquete, R * 0.95, R * 1.04, R * 0.99, 0, R * 0.01, 0, -0.4); for (let i = 0; i < 6; i++) pelo(geoPincho, R * 0.14, R * 0.55, R * 0.25, 0, R * 0.8 - Math.abs(i - 2) * R * 0.07, R * 0.55 - i * R * 0.26, -0.4 - i * 0.18); break;
      case 'coleta': casco(1.07, -0.2); pelo(geoBolita, R * 0.3, R * 0.42, R * 0.3, 0, R * 0.05, -R * 1.18); pelo(geoBolita, R * 0.18, R * 0.18, R * 0.18, 0, R * 0.25, -R * 0.98); break;
      case 'flequillo': casco(1.07, -0.2); pelo(geoBolita, R * 0.75, R * 0.25, R * 0.4, 0, R * 0.55, R * 0.62, 0.5); break;
    }
    return g;
  }

  // ------------------------------------------------------------------------------------------
  //  Jugadores
  // ------------------------------------------------------------------------------------------
  const anilloGeo = new THREE.RingGeometry(0.55, 0.72, 32); anilloGeo.rotateX(-Math.PI / 2);
  const sombraGeo = new THREE.CircleGeometry(0.4, 20); sombraGeo.rotateX(-Math.PI / 2);
  const texSombra = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const matSombra = new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false });
  const raiz = new THREE.Group(); scene.add(raiz);

  function nuevoJugador(equipo, i, kit, nombre) {
    const j = { equipo, i, rol: ROLES[i], dorsal: DORSALES[i], nombre, pos: new V3(), vel: new V3(), rumbo: 0, objetivo: new V3(), tPensar: azar() * 0.3,
      tGolpeo: 0, v: 0, noToca: 0, aturdido: 0, plancha: 0, dirPlancha: new V3(), estirada: 0, ladoEstirada: 0, wI: 0, wD: 0, wU: 0, celebra: 0, escala: 1, esManuel: false, alt: 0 };
    j.grupo = new THREE.Group(); j.inclina = new THREE.Group(); j.grupo.add(j.inclina); raiz.add(j.grupo);
    const sombra = new THREE.Mesh(sombraGeo, matSombra); sombra.position.y = 0.02; sombra.renderOrder = 1; j.grupo.add(sombra);
    const esPortero = i === 0;
    if (equipo === 0 && i === 10 && MAN.modelo) {
      // Manuel: su propio modelo, su cara, el nº 10
      j.esManuel = true; j.nombre = 'MANUEL';
      j.modelo = MAN.modelo; j.inclina.add(MAN.modelo);
      j.mixer = MAN.mixer; j.h = huesosDe(MAN.modelo);
      const cl = clipsDe(MAN.clips || []);
      j.acc = {}; for (const [k, c] of Object.entries(cl)) if (c) j.acc[k] = j.mixer.clipAction(c);
      j.reposo = MAN.reposo;
    } else {
      const m = clonarEsqueleto(baseEscena);
      j.inclina.add(m); j.modelo = m;
      j.escala = esPortero ? 1.1 : 0.93 + azar() * 0.15;
      const rasgos = { piel: elegir(PIELES), pelo: elegir(PELOS), peinado: elegir(PEINADOS), ojos: elegir(OJOS), ojoAlto: 9 + azar() * 4, cejaAng: (azar() - 0.5) * 6, cejaGruesa: azar() < 0.4, boca: Math.floor(azar() * 3), pecas: azar() < 0.2 };
      const opc = { cortar: true, piel: rasgos.piel, cambiarKit: equipo === 1 || esPortero, camiseta: esPortero ? kit.portero : kit.camiseta, pantalon: esPortero ? '#1b1b1b' : kit.pantalon, medias: esPortero ? kit.portero : kit.medias };
      m.traverse((o) => { if (o.isSkinnedMesh) { o.material = materialJugador(o.material, opc); o.castShadow = true; o.frustumCulled = false; } });
      j.h = huesosDe(m);
      // la cabeza del modelo se encoge hasta desaparecer y en su sitio va una cabeza nueva
      if (j.h.cabeza && j.h.cuello) {
        const cont = new THREE.Group(); cont.add(m); cont.updateMatrixWorld(true);
        const qCab = j.h.cabeza.getWorldQuaternion(new THREE.Quaternion());
        const desfase = qCab.clone().invert();
        const sCuello = j.h.cuello.getWorldScale(new V3()).x;
        cont.remove(m); j.inclina.add(m);
        j.h.cabeza.scale.setScalar(0.001);
        const pivote = new THREE.Group(); j.h.cuello.add(pivote); pivote.scale.setScalar(1 / sCuello);
        const MC = MEDIDAS.cabeza;
        // un poco más grande que la original, como en los dibujos, y con la barbilla en su sitio
        const R = MC ? Math.max(MC.tam.x, MC.tam.z) * 0.5 * 0.98 : MEDIDAS.altoCabeza * 0.55;
        const centro = MC ? MC.centro.clone().add(new V3(0, R * 0.08, 0)) : new V3(0, MEDIDAS.altoCabeza * 0.45, 0);
        const cab = crearCabeza(rasgos, R); cab.position.copy(centro); pivote.add(cab);
        const MN = MEDIDAS.cuello;
        const abajo = MN ? MN.abajo - R * 0.15 : -MEDIDAS.largoCuello, arriba = centro.y - R * 0.55;
        const lc = Math.max(0.02, arriba - abajo), rc = MN ? clamp(MN.ancho * 0.42, R * 0.3, R * 0.55) : R * 0.42;
        const cuello = new THREE.Mesh(new THREE.CylinderGeometry(rc * 0.9, rc, lc, 14), new THREE.MeshStandardMaterial({ color: rasgos.piel, roughness: 0.8 }));
        cuello.position.set(0, abajo + lc / 2, MN ? MN.z : centro.z * 0.5); cuello.castShadow = true; pivote.add(cuello);
        j.pivoteCabeza = pivote; j.desfaseCabeza = desfase;
      }
      j.mixer = new THREE.AnimationMixer(m);
      j.acc = {}; for (const [k, c] of Object.entries(CLIPS)) if (c) j.acc[k] = j.mixer.clipAction(c);
      j.reposo = []; m.traverse((o) => { if (o.isBone) j.reposo.push([o, o.quaternion.clone()]); });
    }
    if (!j.acc.walk) j.acc.walk = j.acc.run || j.acc.idle;
    if (!j.acc.run) j.acc.run = j.acc.walk;
    j.grupo.scale.setScalar(j.escala);
    j.actual = null; anim(j, 'idle');
    return j;
  }
  function anim(j, nombre, ts = 1, fundido = 0.22) {
    const a = j.acc[nombre] || j.acc.idle; if (!a) return;
    if (j.actual !== a) { a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveWeight(1); a.play(); if (j.actual) j.actual.crossFadeTo(a, fundido, false); j.actual = a; }
    a.timeScale = ts;
  }
  function golpeo(j, nombre) {
    const a = j.acc[nombre] || j.acc.kick; if (!a) return;
    const ts = 2.0;
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.setEffectiveWeight(1); a.timeScale = ts; a.play();
    if (j.actual && j.actual !== a) j.actual.crossFadeTo(a, 0.06, false);
    j.actual = a; j.tGolpeo = Math.min(0.55, a.getClip().duration / ts * 0.75);
  }

  // ------------------------------------------------------------------------------------------
  //  Balón
  // ------------------------------------------------------------------------------------------
  const RB = 0.12;
  const balonMalla = (() => {
    const geo = new THREE.IcosahedronGeometry(RB, 3); const n = geo.attributes.position.count, col = new Float32Array(n * 3);
    const ic = new THREE.IcosahedronGeometry(1, 0).attributes.position, dirs = [];
    for (let i = 0; i < ic.count; i++) { const d = new V3().fromBufferAttribute(ic, i).normalize(); if (!dirs.some((e) => e.distanceTo(d) < 0.01)) dirs.push(d); }
    const v = new V3();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(geo.attributes.position, i).normalize(); const negro = dirs.some((d) => d.dot(v) > 0.94); const c = negro ? 0.05 : 0.95; col.set([c, c, c], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
    m.castShadow = true; return m;
  })();
  raiz.add(balonMalla);
  const sombraBalon = new THREE.Mesh(sombraGeo, matSombra); sombraBalon.scale.setScalar(0.45); raiz.add(sombraBalon);
  const balon = { pos: new V3(0, RB, 0), vel: new V3(), dueno: null, ultimo: null, receptor: null, efecto: new V3(), fuego: 0, tDueno: 0, enRed: 0, tiroA: null, superTiro: false, salvada: null };

  // Marca del jugador que controlas
  const marca = new THREE.Group();
  const anillo = new THREE.Mesh(anilloGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 2.6), transparent: true, opacity: 0.9, depthWrite: false }));
  anillo.position.y = 0.03; marca.add(anillo);
  const flecha = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.4, 2.8) }));
  flecha.rotation.x = Math.PI; flecha.position.y = 2.0; marca.add(flecha);
  raiz.add(marca);
  // Pase: una marca en el suelo sobre el compañero que recibirá
  const marcaPase = new THREE.Mesh(anilloGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 0.6), transparent: true, opacity: 0.0, depthWrite: false }));
  marcaPase.position.y = 0.03; raiz.add(marcaPase);

  // ------------------------------------------------------------------------------------------
  //  Estado del partido
  // ------------------------------------------------------------------------------------------
  const SUCESOS = { lista: [], tiros: 0, goles: 0, paradas: 0, fueras: 0, robos: 0, pases: 0, entradas: 0 };
  const P = {
    rival: RIVALES[0], dificultad: 'Normal', duracion: 3, equipos: [[], []], todos: [], goles: [0, 0], parte: 1, reloj: 0, estado: 'menu', tEstado: 0,
    saca: 0, controlado: null, superM: 0, cargaTiro: 0, tPase: 0, pasePrevio: false, tiroPrevio: false, escalaTiempo: 1, tCamara: 0,
    reanudar: null, celebrador: null, ultimoGol: null, tCanto: 8, tOla: 40, camara: { p: new V3(0, 30, 40), m: new V3() }, sacudida: 0,
    vistos: false,
  };
  const ATACA = (eq) => (eq === 0 ? 1 : -1);   // hacia dónde ataca cada equipo (en X)
  let DIF = DIFICULTAD.Normal;

  function montarEquipos() {
    for (const j of P.todos) { if (j.esManuel) { MAN.base.add(MAN.modelo); } raiz.remove(j.grupo); }
    P.equipos = [[], []]; P.todos = [];
    const nombresB = [...NOMBRES_RIVAL].sort(() => azar() - 0.5);
    for (let i = 0; i < 11; i++) {
      P.equipos[0].push(nuevoJugador(0, i, { camiseta: '#ffffff', pantalon: '#ffffff', medias: '#ffffff', portero: MIOS.portero }, i === 10 ? 'MANUEL' : NOMBRES_MIOS[i]));
      P.equipos[1].push(nuevoJugador(1, i, P.rival, nombresB[i]));
    }
    P.todos = [...P.equipos[0], ...P.equipos[1]];
    renderer.compile(scene, camera);
  }
  const casa = (j) => { const f = FORMACION[j.i], s = ATACA(j.equipo); return new V3(f[0] * L * s, 0, f[1] * W * 0.92 * s); };
  function colocarSaque(equipoSaca) {
    for (const j of P.todos) {
      const c = casa(j), s = ATACA(j.equipo);
      c.x = -s * Math.max(1.5, Math.abs(c.x) * 0.95);   // cada uno en su campo
      if (j.equipo !== equipoSaca) { const d = Math.hypot(c.x, c.z); if (d < 10.5) c.multiplyScalar(10.5 / Math.max(d, 0.1)); }
      j.pos.copy(c); j.vel.set(0, 0, 0); j.rumbo = s > 0 ? Math.PI / 2 : -Math.PI / 2; j.aturdido = 0; j.plancha = 0; j.estirada = 0; j.celebra = 0;
    }
    const eq = P.equipos[equipoSaca], s = ATACA(equipoSaca);
    eq[10].pos.set(-0.6 * s, 0, 0.2); eq[9].pos.set(-1.5 * s, 0, -6);
    balon.pos.set(0, RB, 0); balon.vel.set(0, 0, 0); balon.dueno = null; balon.receptor = null; balon.fuego = 0; balon.enRed = 0; balon.superTiro = false; balon.salvada = null;
    P.saca = equipoSaca;
    P.reanudar = { tipo: 'saque', equipo: equipoSaca, lanzador: eq[10], t: 0 };
    darBalon(eq[10]);
    if (equipoSaca === 0) controlar(eq[10]);
  }

  // ------------------------------------------------------------------------------------------
  //  Sonidos del partido
  // ------------------------------------------------------------------------------------------
  const S = sonido;
  const ahoraS = () => (S.ctx ? S.ctx.currentTime : 0);
  const pub = (n, r, t, tc) => { if (S.ctx) S.publico(n, r, t, tc); };
  function sPatada(fuerza = 0.5) {
    if (!S.ctx) return; const t = S.ctx.currentTime;
    const g = S.env(t, 0.002, 0.3, 0.01, 0.12, 0.25 + fuerza * 0.35); g.connect(S.bus);
    const o = S.osc('sine', 150 + fuerza * 60, t, t + 0.2, g); o.frequency.exponentialRampToValueAtTime(55, t + 0.1);
    const g2 = S.env(t, 0.001, 0.3, 0.005, 0.04, 0.2 + fuerza * 0.2), bp = S.filtro('bandpass', 1800, 0.8); bp.connect(g2); g2.connect(S.bus); S.ruidoDesde(t, 0.06, bp);
  }
  function sPito(veces = 1, largo = 0.35) {
    if (!S.ctx) return; let t = S.ctx.currentTime + 0.02;
    for (let k = 0; k < veces; k++) {
      const dur = k === veces - 1 ? largo : 0.22;
      const g = S.env(t, 0.01, 0.9, dur, 0.06, 0.12); g.connect(S.bus);
      const trem = S.ctx.createOscillator(), tg = S.ctx.createGain(); trem.frequency.value = 28; tg.gain.value = 0.05; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + dur + 0.1);
      S.osc('sine', 2950, t, t + dur + 0.1, g); S.osc('sine', 3020, t, t + dur + 0.1, g);
      t += dur + 0.12;
    }
  }
  function sFanfarria() {
    if (!S.ctx) return; const a = S.ctx.currentTime + 0.05, sp = 60 / 140;
    [[62, 0, 0.5], [66, 0.5, 0.5], [69, 1, 0.5], [74, 1.5, 2.5]].forEach(([m, p, d]) => { S.metal(m, a + p * sp, d * sp, 0.07); S.metal(m - 12, a + p * sp, d * sp, 0.05, 1300); });
    S.platillo(a + 1.5 * sp, 0.3, 3); S.taiko(a, 0.8); S.taiko(a + 1.5 * sp, 1); S.campana(86, a + 1.5 * sp, 0.06);
  }
  function sSuper() { if (!S.ctx) return; const a = S.ctx.currentTime + 0.02; S.braam(50, a, 1.6, 0.22); S.subida(a, 0.6, 0.25); S.platillo(a + 0.6, 0.3, 2); }
  let tVoz = 0;
  function narrar(txt, prioridad = false) {
    if (S.mudo || !('speechSynthesis' in window)) return;
    const ahora = performance.now();
    if (!prioridad && ahora - tVoz < 4000) return;
    tVoz = ahora;
    try { if (prioridad) speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'es-ES'; const v = speechSynthesis.getVoices().find((x) => /^es/i.test(x.lang)); if (v) u.voice = v; u.rate = 1.05; u.pitch = 0.95; speechSynthesis.speak(u); } catch (e) { /* sin voz */ }
  }

  // ------------------------------------------------------------------------------------------
  //  Mensajes en pantalla
  // ------------------------------------------------------------------------------------------
  let tMensaje = 0;
  function mensaje(txt, sub = '', dur = 2.2) {
    q('.mensaje').textContent = txt; q('.sub').textContent = sub;
    q('.mensaje').classList.add('ver'); q('.sub').classList.toggle('ver', !!sub);
    tMensaje = dur;
  }
  let tAyuda = 0;
  function ayuda(html, dur = 7) { q('.ayuda').innerHTML = html; q('.ayuda').classList.add('ver'); tAyuda = dur; }

  // ------------------------------------------------------------------------------------------
  //  Acciones con el balón
  // ------------------------------------------------------------------------------------------
  function darBalon(j) {
    if (balon.dueno !== j) { balon.tDueno = 0; }
    if (balon.dueno && balon.dueno.equipo !== j.equipo && j.equipo === 0) P.superM = Math.min(1, P.superM + 0.12);
    balon.dueno = j; balon.ultimo = j; balon.receptor = null; balon.fuego = 0; balon.superTiro = false; balon.efecto.set(0, 0, 0); balon.salvada = null; balon.tiroA = null;
    if (j.equipo === 0 && !P.autoMio) controlar(j);
  }
  function controlar(j) { if (j && j.equipo === 0) P.controlado = j; }
  const frente = (j) => new V3(Math.sin(j.rumbo), 0, Math.cos(j.rumbo));
  function soltar(j, vel) {
    balon.dueno = null; balon.vel.copy(vel); balon.ultimo = j; j.noToca = 0.32;
    balon.pos.y = Math.max(balon.pos.y, RB);
  }
  function mejorCompanero(j, dir, largo) {
    let mejor = null, nota = -1e9;
    for (const c of P.equipos[j.equipo]) {
      if (c === j || c.aturdido > 0) continue;
      const d = c.pos.clone().sub(j.pos); const dist = d.length(); if (dist < 3) continue;
      const cos = d.normalize().dot(dir);
      if (cos < 0.35) continue;
      let n = cos * 3 - Math.abs(dist - (largo ? 30 : 14)) / 12 + (c.pos.x - j.pos.x) * ATACA(j.equipo) / 14;
      // ¿está libre?
      for (const r of P.equipos[1 - j.equipo]) { const dr = r.pos.distanceTo(c.pos); if (dr < 4) n -= (4 - dr) * 0.4; }
      if (c.rol === 'POR') n -= 2;
      if (n > nota) { nota = n; mejor = c; }
    }
    return mejor;
  }
  function pasar(j, dir, largo) {
    const c = mejorCompanero(j, dir, largo);
    let destino, tiempo;
    if (c) {
      const dist0 = c.pos.distanceTo(j.pos);
      tiempo = largo ? clamp(dist0 / 17, 0.9, 1.9) : clamp(dist0 / 13, 0.25, 1.6);
      destino = c.pos.clone().addScaledVector(c.vel, tiempo * 0.8);
    } else {
      destino = j.pos.clone().addScaledVector(dir, largo ? 28 : 13); tiempo = largo ? 1.5 : 0.9;
    }
    destino.x = clamp(destino.x, -L + 1, L - 1); destino.z = clamp(destino.z, -W + 1, W - 1);
    const d = destino.clone().sub(balon.pos).setY(0), dist = d.length(); d.normalize();
    const v = new V3();
    if (largo) { const T = clamp(dist / 17, 0.9, 1.9); v.copy(d).multiplyScalar(dist / T * 0.93); v.y = 0.5 * G * T; }
    else { const vf = 4.5; v.copy(d).multiplyScalar(Math.sqrt(vf * vf + 2 * 3.2 * dist)); v.y = 0.6; }
    soltar(j, v); SUCESOS.pases++;
    golpeo(j, 'kick'); sPatada(largo ? 0.6 : 0.35);
    balon.receptor = c;
    if (c) { c.noToca = 0; if (j.equipo === 0) { P.superM = Math.min(1, P.superM + 0.05); if (!P.autoMio) controlar(c); } }
    if (c && j.equipo === 0) { marcaPase.position.set(c.pos.x, 0.03, c.pos.z); marcaPase.material.opacity = 0.9; }
  }
  function chutar(j, potencia, apuntaZ, superTiro = false) {
    const s = ATACA(j.equipo), gx = s * (L + 0.5);
    const precision = j.equipo === 0 ? 0.85 : DIF.puntería;
    let z = clamp(apuntaZ, -1, 1) * CAMPO.P * 0.8 + (azar() - 0.5) * CAMPO.P * (1 - precision) * 1.6;
    let y = 0.3 + potencia * 1.75 + (potencia > 0.93 && !superTiro ? azar() * 1.6 : 0);
    let vel = 15 + potencia * 17;
    if (superTiro) { vel = 36; y = 0.9 + azar() * 1.0; z = (azar() < 0.5 ? -1 : 1) * CAMPO.P * (0.55 + azar() * 0.3); }
    const d = new V3(gx - balon.pos.x, 0, z - balon.pos.z), dist = d.length(); d.normalize();
    const T = dist / vel;
    const v = d.clone().multiplyScalar(vel); v.y = (y - balon.pos.y + 0.5 * G * T * T) / T;
    soltar(j, v); SUCESOS.tiros++; SUCESOS.lista.push(`tiro ${j.equipo}${j.rol}${j.i} x=${j.pos.x.toFixed(0)} z=${j.pos.z.toFixed(0)} pot=${potencia.toFixed(2)}`);
    golpeo(j, 'shoot'); sPatada(0.6 + potencia * 0.4);
    balon.tiroA = 1 - j.equipo; balon.superTiro = superTiro; balon.salvada = null;
    if (superTiro) {
      balon.fuego = 2.2;
      // efecto: la curva lleva el balón hacia fuera y lo vuelve a meter
      balon.efecto.set(0, 0, -Math.sign(z) * 14);
    }
    // el portero decide ahora si llega
    decidirParada();
  }
  function decidirParada() {
    const eq = balon.tiroA; if (eq == null) return;
    const gk = P.equipos[eq][0], gx = ATACA(1 - eq) * L;
    const t = (gx - balon.pos.x) / (balon.vel.x || 1e-3);
    if (t <= 0 || t > 3) return;
    const zc = balon.pos.z + balon.vel.z * t, yc = balon.pos.y + balon.vel.y * t - 0.5 * G * t * t;
    const dentro = Math.abs(zc) < CAMPO.P + 0.2 && yc < CAMPO.H + 0.1 && yc > 0;
    const vel = balon.vel.length(), lejos = Math.abs(zc - gk.pos.z);
    const distTiro = Math.abs(gx - balon.pos.x);
    let p = (1.5 - vel / 40 - lejos * 0.1 - (distTiro < 9 ? 0.3 : 0) + (distTiro > 22 ? 0.12 : 0)) * DIF.portero;
    if (balon.superTiro) p *= 0.25;
    if (gk.equipo === 0 && P.controlado === gk) p *= 0.9;
    balon.salvada = { t: t, zc, yc, dentro, para: dentro ? azar() < clamp(p, 0.08, 0.92) : true, gk };
  }
  function entrada(j, dir) {
    if (j.plancha > 0 || j.aturdido > 0) return;
    SUCESOS.entradas++;
    j.plancha = 0.6; j.dirPlancha.copy(dir.lengthSq() > 0.01 ? dir.clone().normalize() : frente(j)); j.rumbo = Math.atan2(j.dirPlancha.x, j.dirPlancha.z);
    sPatada(0.2);
  }

  // ------------------------------------------------------------------------------------------
  //  Inteligencia de los jugadores
  // ------------------------------------------------------------------------------------------
  const tmp = new V3(), tmp2 = new V3();
  function objetivoPosicion(j) {
    const s = ATACA(j.equipo), c = casa(j), b = balon.pos;
    const poseemos = balon.dueno && balon.dueno.equipo === j.equipo;
    const empuje = poseemos ? 0.32 * L : -0.06 * L;
    let x = c.x + s * empuje + (b.x - s * 0.0) * 0.5;
    let z = c.z * 0.85 + b.z * 0.3;
    if (j.rol === 'DEF') x = s > 0 ? Math.min(x, b.x + 8, L * 0.35) : Math.max(x, b.x - 8, -L * 0.35);
    if (j.rol === 'DEL' && poseemos) x = s > 0 ? Math.max(x, b.x - 4) : Math.min(x, b.x + 4);
    if (j.rol === 'MED' && !poseemos) x = s > 0 ? Math.min(x, b.x + 3) : Math.max(x, b.x - 3);
    return tmp.set(clamp(x, -L + 2, L - 2), 0, clamp(z, -W + 1.5, W - 1.5));
  }
  function puntoPortero(j) {
    const gx = -ATACA(j.equipo) * L, b = balon.pos;
    const dz = b.z, dx = b.x - gx, d = Math.hypot(dx, dz);
    const sal = clamp(d * 0.07, 0.6, 3.5);
    return tmp.set(gx + Math.sign(dx || 1) * sal * Math.abs(dx) / Math.max(d, 1), 0, clamp(dz * sal / Math.max(d, 1) * 1.6, -CAMPO.P + 0.3, CAMPO.P - 0.3));
  }
  function cazadores(eq) {
    // los dos jugadores de campo más cercanos al balón (el primero va a por él)
    const lista = P.equipos[eq].filter((j) => j.rol !== 'POR' && j.aturdido <= 0);
    const objetivo = balon.dueno ? balon.dueno.pos : prediccionBalon(0.5);
    lista.sort((a, b) => a.pos.distanceToSquared(objetivo) - b.pos.distanceToSquared(objetivo));
    return lista.slice(0, 2);
  }
  function prediccionBalon(t) {
    const v = balon.vel; let p = balon.pos.clone().addScaledVector(v, t); if (balon.pos.y < 0.4) { const s = v.length(), dec = 3.2; if (s > 0.1) { const tt = Math.min(t, s / dec); p = balon.pos.clone().addScaledVector(v.clone().setY(0).normalize(), s * tt - 0.5 * dec * tt * tt); } }
    p.y = 0; return p;
  }
  function pensarDueno(j, dt) {
    const s = ATACA(j.equipo), gx = s * L;
    const aPorteria = new V3(gx - j.pos.x, 0, -j.pos.z * 0.6);
    const dist = Math.hypot(gx - j.pos.x, j.pos.z);
    let presion = 99, rivalCerca = null;
    for (const r of P.equipos[1 - j.equipo]) { const d = r.pos.distanceTo(j.pos); if (d < presion) { presion = d; rivalCerca = r; } }
    j.tPensar -= dt;
    if (j.tPensar <= 0 && balon.tDueno > 0.35) {
      j.tPensar = 0.25 + azar() * 0.25;
      const reac = j.equipo === 1 ? DIF.reaccion : 0.8;
      if (dist < 33 && Math.abs(j.pos.z) < 26 && azar() < (dist < 18 ? 0.85 : dist < 26 ? 0.45 : 0.18) * reac) { chutar(j, 0.55 + azar() * 0.35, (azar() - 0.5) * 1.8); return null; }
      if (Math.abs(j.pos.z) > W * 0.55 && s * j.pos.x > L - 22 && azar() < 0.5) { pasar(j, new V3(s * 0.3, 0, -Math.sign(j.pos.z)).normalize(), true); return null; }
      if (presion < 3.2 && azar() < 0.65 * reac) { pasar(j, new V3(s, 0, (azar() - 0.5) * 1.6).normalize(), azar() < 0.25); return null; }
      if (azar() < 0.08) { pasar(j, new V3(s, 0, (azar() - 0.5) * 2).normalize(), azar() < 0.5); return null; }
    }
    // regatea hacia la portería esquivando al que tiene delante
    const dir = aPorteria.normalize();
    if (rivalCerca && presion < 6) {
      const a = rivalCerca.pos.clone().sub(j.pos); const lado = Math.sign(dir.x * a.z - dir.z * a.x) || 1;
      dir.add(new V3(-dir.z * lado, 0, dir.x * lado).multiplyScalar(1.1 * (6 - presion) / 6)).normalize();
    }
    if (Math.abs(j.pos.z) > W - 3) dir.z -= Math.sign(j.pos.z) * 0.8;
    return dir.normalize().multiplyScalar(6.1 * (j.equipo === 1 ? DIF.vel : 1));
  }
  function pensar(j, dt) {
    // devuelve la velocidad deseada
    if (j.rol === 'POR') return pensarPortero(j, dt);
    if (balon.dueno === j) return pensarDueno(j, dt) || new V3();
    const eq = j.equipo, mios = balon.dueno && balon.dueno.equipo === eq;
    const vel = (j.equipo === 1 ? DIF.vel : 1);
    if (balon.receptor === j && !balon.dueno) {
      const p = prediccionBalon(Math.min(1.2, balon.pos.distanceTo(j.pos) / 10));
      return p.sub(j.pos).setY(0).clampLength(0, 6.4 * vel);
    }
    const caz = (!mios) ? cazadores(eq) : [];
    const suelto = !balon.dueno;
    if (caz[0] === j || (caz[1] === j && (suelto || Math.abs(balon.pos.x + ATACA(eq) * L) < 35))) {
      const p = balon.dueno ? balon.dueno.pos.clone().addScaledVector(balon.dueno.vel, 0.3) : prediccionBalon(Math.min(1.5, balon.pos.distanceTo(j.pos) / 8));
      // a veces el que presiona se tira en plancha (más en difícil)
      if (balon.dueno && j !== P.controlado) {
        const d = j.pos.distanceTo(balon.dueno.pos);
        if (d > 1.3 && d < 2.6 && azar() < dt * (j.equipo === 1 ? 0.5 * DIF.robo : 0.3)) entrada(j, balon.dueno.pos.clone().sub(j.pos).setY(0));
      }
      return p.sub(j.pos).setY(0).clampLength(0, (caz[0] === j ? 6.6 : 5.8) * vel);
    }
    if (!balon.dueno && !mios) {
      // balón suelto: el más cercano de mi equipo va a por él (ya cubierto por cazadores)
    }
    const o = objetivoPosicion(j).sub(j.pos); const d = o.length();
    if (d < 0.8) return o.set(0, 0, 0);
    return o.clampLength(0, d > 6 ? 5.2 * vel : 2.2);
  }
  function pensarPortero(j, dt) {
    const sv = balon.salvada;
    if (balon.dueno === j) {
      j.tPensar -= dt;
      if (j.tPensar <= 0 && balon.tDueno > 1.0) { j.tPensar = 0.3; pasar(j, new V3(ATACA(j.equipo), 0, (azar() - 0.5) * 1.4).normalize(), azar() < 0.6); }
      return new V3(ATACA(j.equipo) * 0.6, 0, 0);
    }
    if (sv && sv.gk === j && !balon.dueno && j.estirada <= 0) {
      const llegada = new V3(j.pos.x, 0, sv.zc);
      const dz = sv.zc - j.pos.z;
      const queda = (gk => (ATACA(1 - gk.equipo) * L - balon.pos.x) / (balon.vel.x || 1e-3))(j);
      if (Math.abs(dz) > 0.9 && queda > 0 && queda < 0.55 && sv.dentro) { j.estirada = 0.9; j.ladoEstirada = Math.sign(dz); j.dirPlancha.set(0, 0, Math.sign(dz)); }
      return llegada.sub(j.pos).clampLength(0, 6.5);
    }
    // balón suelto cerca del área: sale a por él
    const gx = -ATACA(j.equipo) * L;
    if (!balon.dueno && Math.abs(balon.pos.x - gx) < 14 && Math.abs(balon.pos.z) < 18 && balon.vel.length() < 9) return balon.pos.clone().sub(j.pos).setY(0).clampLength(0, 6);
    return puntoPortero(j).sub(j.pos).clampLength(0, 4.5);
  }

  // ------------------------------------------------------------------------------------------
  //  Jugador controlado
  // ------------------------------------------------------------------------------------------
  function entradaUsuario(j, dt) {
    const dir = new V3(ENT.x, 0, -ENT.y);   // la cámara mira hacia -Z: arriba en la pantalla es -Z
    const tiene = balon.dueno === j;
    const sprint = ENT.sprint;
    const vmax = tiene ? (sprint ? 7.4 : 6.0) : (sprint ? 8.0 : 6.5);
    const deseo = dir.clone().multiplyScalar(vmax);
    // pase: toque corto; mantener = pase largo
    if (ENT.pase && !P.pasePrevio) P.tPase = 0;
    if (ENT.pase) P.tPase += dt;
    if (!ENT.pase && P.pasePrevio) {
      if (tiene) pasar(j, dir.lengthSq() > 0.05 ? dir.clone().normalize() : frente(j), P.tPase > 0.28);
      else if (j.rol !== 'POR') cambiarJugador();
    }
    P.pasePrevio = ENT.pase;
    // tiro: mantener para cargar
    if (tiene) {
      if (ENT.tiro) P.cargaTiro = Math.min(1, P.cargaTiro + dt * 1.25);
      if (!ENT.tiro && P.tiroPrevio && P.cargaTiro > 0) {
        const potencia = P.cargaTiro, sup = P.superM >= 1 && potencia > 0.85;
        if (sup) superTiro(j); else chutar(j, potencia, ENT.y * -1 * ATACA(0) * 1.2 + (azar() - 0.5) * 0.3);
        P.cargaTiro = 0;
      }
    } else {
      if (ENT.tiro && !P.tiroPrevio) entrada(j, dir);
      P.cargaTiro = 0;
    }
    P.tiroPrevio = ENT.tiro;
    return deseo;
  }
  function cambiarJugador() {
    const lista = P.equipos[0].filter((j) => j.rol !== 'POR' && j !== P.controlado);
    const objetivo = balon.dueno ? balon.dueno.pos : balon.pos;
    lista.sort((a, b) => a.pos.distanceToSquared(objetivo) - b.pos.distanceToSquared(objetivo));
    if (lista[0]) controlar(lista[0]);
  }
  function superTiro(j) {
    P.superM = 0;
    P.escalaTiempo = 0.18; P.tLento = 0.9; P.superJ = j;
    sSuper();
    mensaje('¡SUPERTIRO!', j.nombre, 1.6);
    C.destello(0.8);
    chutar(j, 1, 0, true);
    narrar('¡Supertiro de ' + j.nombre.toLowerCase() + '!', true);
  }

  // ------------------------------------------------------------------------------------------
  //  Física del balón, robos, paradas, goles y saques
  // ------------------------------------------------------------------------------------------
  const ejeGiro = new V3();
  function actualizarBalon(dt) {
    const b = balon;
    if (b.dueno) {
      const j = b.dueno, f = frente(j);
      const lejos = 0.42 + Math.min(0.45, j.vel.length() * 0.04);
      const meta = j.pos.clone().addScaledVector(f, lejos * j.escala); meta.y = RB;
      b.pos.lerp(meta, 1 - Math.exp(-dt * 22));
      b.vel.copy(j.vel);
      b.tDueno += dt;
    } else {
      b.vel.y -= G * dt;
      if (b.efecto.lengthSq() > 0) { b.vel.addScaledVector(b.efecto, dt); b.efecto.multiplyScalar(Math.exp(-dt * 1.6)); if (b.fuego > 0 && b.fuego < 1.6) b.efecto.z = -b.efecto.z * 0.98; }
      b.vel.multiplyScalar(Math.exp(-0.08 * dt));
      b.pos.addScaledVector(b.vel, dt);
      if (b.pos.y < RB) {
        b.pos.y = RB;
        if (b.vel.y < -1.2) { b.vel.y = -b.vel.y * 0.52; b.vel.x *= 0.82; b.vel.z *= 0.82; if (Math.abs(b.vel.y) > 2) sPatada(0.08); }
        else b.vel.y = 0;
      }
      if (b.pos.y <= RB + 0.01) { const s = Math.hypot(b.vel.x, b.vel.z); if (s > 0) { const n = Math.max(0, s - (3.0 + s * 0.05) * dt); b.vel.x *= n / s; b.vel.z *= n / s; } }
      postes();
    }
    // giro del balón según lo que rueda
    const s = Math.hypot(b.vel.x, b.vel.z);
    if (s > 0.05) { ejeGiro.set(b.vel.z, 0, -b.vel.x).normalize(); balonMalla.rotateOnWorldAxis(ejeGiro, s * dt / RB); }
    balonMalla.position.copy(b.pos);
    sombraBalon.position.set(b.pos.x, 0.025, b.pos.z); sombraBalon.scale.setScalar(0.45 * clamp(1 - b.pos.y / 8, 0.3, 1));
    if (b.fuego > 0) { b.fuego -= dt; C.estela(b.pos, b.vel); }
    if (b.noAtrapar > 0) b.noAtrapar -= dt;
  }
  function postes() {
    const b = balon, { P: pw, H } = CAMPO;
    for (const s of [-1, 1]) {
      const gx = s * L;
      if (Math.abs(b.pos.x - gx) > 1.2) continue;
      for (const pz of [-pw, pw]) {
        const dx = b.pos.x - gx, dz = b.pos.z - pz, d = Math.hypot(dx, dz);
        if (d < RB + 0.07 && b.pos.y < H) { const n = new V3(dx / d, 0, dz / d); const vn = b.vel.dot(n); if (vn < 0) { b.vel.addScaledVector(n, -1.7 * vn); b.vel.multiplyScalar(0.7); sPatada(0.5); pub(0.55, 0.9, ahoraS(), 0.1); } }
      }
      const dy = b.pos.y - H, dx = b.pos.x - gx, d = Math.hypot(dx, dy);
      if (d < RB + 0.07 && Math.abs(b.pos.z) < pw) { const nx = dx / d, ny = dy / d; const vn = b.vel.x * nx + b.vel.y * ny; if (vn < 0) { b.vel.x -= 1.7 * vn * nx; b.vel.y -= 1.7 * vn * ny; b.vel.multiplyScalar(0.7); sPatada(0.5); } }
    }
  }
  function atrapadas(dt) {
    const b = balon;
    if (b.dueno || P.estado !== 'juego') return;
    // parada del portero
    const sv = b.salvada;
    if (sv) {
      const gk = sv.gk, d = Math.hypot(b.pos.x - gk.pos.x, b.pos.z - gk.pos.z), alcance = 1.0 + (gk.estirada > 0 ? 1.6 : 0.4);
      if (d < alcance && b.pos.y < 2.6 && (b.pos.x - gk.pos.x) * Math.sign(b.vel.x) < 0.3) {
        if (sv.para) {
          SUCESOS.paradas++;
          if (b.vel.length() < 21 && azar() < 0.6) { darBalon(gk); mensaje('¡PARADÓN!', gk.nombre, 1.4); narrar('¡Qué parada de ' + gk.nombre.toLowerCase() + '!'); }
          else { b.vel.x = -b.vel.x * 0.35; b.vel.z = b.vel.z * 0.4 + (azar() - 0.5) * 10; b.vel.y = 3 + azar() * 4; b.ultimo = gk; b.noAtrapar = 0.4; mensaje('¡PARADA!', gk.nombre, 1.2); }
          pub(0.6, 0.95, ahoraS(), 0.1); setTimeout(() => pub(0.45, 0.35, ahoraS(), 0.8), 1200);
          b.salvada = null; b.tiroA = null; b.superTiro = false; b.fuego = 0; b.efecto.set(0, 0, 0);
          return;
        }
      }
    }
    if (b.noAtrapar > 0) return;
    let mejor = null, md = 1e9;
    for (const j of P.todos) {
      if (j.noToca > 0 || j.aturdido > 0 || j.estirada > 0.2) continue;
      const d = Math.hypot(b.pos.x - j.pos.x, b.pos.z - j.pos.z);
      const radio = j.rol === 'POR' ? 0.95 : 0.85;
      const altura = j.rol === 'POR' && Math.abs(b.pos.x + ATACA(j.equipo) * L) < CAMPO.area ? 2.3 : 0.75 * j.escala;
      if (d < radio && b.pos.y < altura && d < md) {
        // un tiro muy fuerte rebota en el cuerpo
        if (b.vel.length() > 24 && j.rol !== 'POR') { b.vel.multiplyScalar(-0.3); b.vel.y = 2; b.ultimo = j; j.noToca = 0.25; sPatada(0.4); return; }
        if (b.tiroA != null && j.equipo === b.tiroA && j.rol === 'POR' && b.salvada && !b.salvada.para && b.vel.length() > 12) continue;
        md = d; mejor = j;
      }
      // cabezazo: balón alto que pasa por la cabeza de un atacante cerca del área
      if (d < 0.75 && b.pos.y > 0.9 * j.escala && b.pos.y < 1.7 * j.escala && j.rol !== 'POR' && b.vel.y < 1) {
        const s = ATACA(j.equipo);
        if (Math.abs(s * L - j.pos.x) < 20 && (j !== P.controlado || ENT.tiro || azar() < 0.4)) { cabezazo(j); return; }
        if (azar() < 0.6 * dt * 60) { mejor = j; md = d; }
      }
    }
    if (mejor) { darBalon(mejor); sPatada(0.15); }
  }
  function cabezazo(j) {
    const s = ATACA(j.equipo), gx = s * (L + 0.5), z = (azar() - 0.5) * CAMPO.P * 1.6;
    const d = new V3(gx - balon.pos.x, 0, z - balon.pos.z); const dist = d.length(); d.normalize();
    const v = d.multiplyScalar(17); const T = dist / 17; v.y = (0.6 - balon.pos.y + 0.5 * G * T * T) / T;
    soltar(j, v); balon.tiroA = 1 - j.equipo; decidirParada(); sPatada(0.5);
    j.salto = 0.4;
    mensaje('¡CABEZAZO!', j.nombre, 1);
  }
  function robos(dt) {
    const b = balon, o = b.dueno; if (!o || P.estado !== 'juego') return;
    if (b.tDueno < 0.45) return;
    for (const r of P.equipos[1 - o.equipo]) {
      if (r.aturdido > 0 || r.rol === 'POR') continue;
      const d = r.pos.distanceTo(o.pos);
      // entrada en plancha
      if (r.plancha > 0 && d < 1.25) {
        const dir = r.dirPlancha.clone(); soltar(o, dir.multiplyScalar(6).setY(1.5)); b.ultimo = r; o.aturdido = 1.1; o.caido = 1.1;
        if (r.equipo === 0) P.superM = Math.min(1, P.superM + 0.15);
        pub(0.55, 0.8, ahoraS(), 0.1);
        return;
      }
      // robo de pie (los que maneja el ordenador)
      if (r !== P.controlado && d < 0.9) {
        const tasa = r.equipo === 1 ? DIF.robo : 0.9;
        const pillo = (o === P.controlado && ENT.sprint) ? 0.6 : 1;
        if (azar() < tasa * pillo * dt) { SUCESOS.robos++; o.aturdido = 0.45; darBalon(r); sPatada(0.25); return; }
      }
    }
  }
  function comprobarGolYFuera() {
    const b = balon; if (b.dueno || P.estado !== 'juego') return;
    const { P: pw, H } = CAMPO;
    if (Math.abs(b.pos.x) > L + RB) {
      const lado = Math.sign(b.pos.x), marcaEq = lado > 0 ? 0 : 1;
      if (Math.abs(b.pos.z) < pw && b.pos.y < H) { gol(marcaEq); return; }
      // fuera por la línea de fondo
      const defiende = lado > 0 ? 1 : 0;
      if (b.ultimo && b.ultimo.equipo === defiende) reanudar('corner', 1 - defiende, new V3(lado * (L - 0.5), RB, Math.sign(b.pos.z || 1) * (W - 0.5)));
      else reanudar('puerta', defiende, new V3(lado * (L - 5.5), RB, 0));
      return;
    }
    if (Math.abs(b.pos.z) > W + RB) {
      const eq = b.ultimo ? 1 - b.ultimo.equipo : 0;
      reanudar('banda', eq, new V3(clamp(b.pos.x, -L + 1, L - 1), RB, Math.sign(b.pos.z) * (W - 0.5)));
    }
  }
  function reanudar(tipo, equipo, punto) {
    P.estado = 'parado'; P.tEstado = 0; SUCESOS.fueras++;
    const textos = { corner: 'CÓRNER', puerta: 'SAQUE DE PUERTA', banda: 'SAQUE DE BANDA' };
    mensaje(textos[tipo], equipo === 0 ? MIOS.nombre : P.rival.nombre, 1.3);
    balon.vel.set(0, 0, 0); balon.salvada = null; balon.tiroA = null; balon.fuego = 0; balon.efecto.set(0, 0, 0);
    P.reanudar = { tipo, equipo, punto, t: 0 };
  }
  function prepararReanudacion() {
    const R = P.reanudar; const eq = P.equipos[R.equipo];
    let lanzador;
    if (R.tipo === 'puerta') lanzador = eq[0];
    else { lanzador = eq.filter((j) => j.rol !== 'POR').sort((a, b) => a.pos.distanceToSquared(R.punto) - b.pos.distanceToSquared(R.punto))[0]; }
    R.lanzador = lanzador;
    const s = ATACA(R.equipo);
    const haciaDentro = new V3(R.tipo === 'corner' ? -Math.sign(R.punto.x) : s, 0, R.tipo === 'banda' || R.tipo === 'corner' ? -Math.sign(R.punto.z) * 0.8 : 0).normalize();
    lanzador.pos.copy(R.punto).addScaledVector(haciaDentro, -0.5).setY(0);
    lanzador.vel.set(0, 0, 0); lanzador.rumbo = Math.atan2(haciaDentro.x, haciaDentro.z);
    balon.pos.copy(R.punto); balon.pos.z = clamp(balon.pos.z, -W, W); balon.pos.x = clamp(balon.pos.x, -L, L);
    darBalon(lanzador);
    balon.pos.copy(lanzador.pos).addScaledVector(haciaDentro, 0.45).setY(RB);
    // los rivales se apartan
    for (const r of P.equipos[1 - R.equipo]) { const d = r.pos.distanceTo(balon.pos); if (d < 9) r.pos.add(r.pos.clone().sub(balon.pos).setY(0).normalize().multiplyScalar(9 - d)); }
    if (R.equipo === 0 && lanzador.rol !== 'POR') controlar(lanzador);
    if (R.equipo === 0 && !P.vistos) ayuda(MOVIL ? 'Pulsa <b>PASE</b> para sacar' : 'Pulsa <b>Z</b> para sacar (mantén para un pase largo)', 3);
  }
  function gol(eq) {
    P.goles[eq]++; SUCESOS.goles++;
    { const u = balon.ultimo, sv = balon.salvada; SUCESOS.lista.push(`gol ${eq} ultimo=${u ? u.equipo + u.rol + u.i : '-'} desde x=${u ? u.pos.x.toFixed(0) : ''} vel=${balon.vel.length().toFixed(0)} tiroA=${balon.tiroA} para=${sv ? sv.para + ' dentro=' + sv.dentro : 'sin decidir'}`); }
    P.estado = 'gol'; P.tEstado = 0;
    const autor = balon.ultimo && balon.ultimo.equipo === eq ? balon.ultimo : P.equipos[eq][10];
    P.celebrador = autor; P.ultimoGol = eq;
    balon.enRed = 1; balon.salvada = null; balon.tiroA = null;
    actualizarMarcador();
    mensaje('¡GOOOOL!', autor.nombre + (autor.esManuel ? ' · Nº 10' : ''), 4);
    if (eq === 0) { sFanfarria(); P.superM = Math.min(1, P.superM + 0.2); }
    pub(eq === 0 ? 0.85 : 0.6, eq === 0 ? 1.4 : 0.7, ahoraS(), 0.08);
    setTimeout(() => pub(0.55, 0.6, ahoraS(), 1.5), 5000);
    if (eq === 0 && S.ctx) { setTimeout(() => { for (let k = 0; k < 3; k++) sonido.canto(ahoraS() + k * 1.33, 0.6); }, 1500); }
    narrar('¡Goooool! ¡Gol de ' + autor.nombre.toLowerCase() + '!', true);
    P.escalaTiempo = 0.35; P.tLento = 1.2;
    U.excita.value = 1;
    const s = ATACA(eq);
    for (let k = 0; k < (eq === 0 ? 8 : 3); k++) setTimeout(() => { const a = azar() * Math.PI * 2; C.cohete(Math.cos(a) * (EST.techo.ax + 16), EST.techo.y + 4, Math.sin(a) * (EST.techo.az + 14), 26 + azar() * 20); if (S.ctx) sonido.petardo(ahoraS() + 1.3, 0.3); }, 300 + k * 260);
    if (eq === 0) C.confeti(new V3(s * (L - 8), 0, 0), MOVIL ? 300 : 600);
    for (const j of P.todos) { j.celebra = j.equipo === eq ? 5 : 0; }
  }
  function actualizarMarcador() {
    q('.gA').textContent = P.goles[0]; q('.gB').textContent = P.goles[1];
  }

  // ------------------------------------------------------------------------------------------
  //  Movimiento y animación de cada jugador
  // ------------------------------------------------------------------------------------------
  const _a = new V3(), _b = new V3(), _lat = new V3(), _fr = new V3(), _up = new V3(0, 1, 0), _t1 = new V3(), _t2 = new V3();
  function mover(j, deseo, dt) {
    if (j.aturdido > 0) { j.aturdido -= dt; deseo.set(0, 0, 0); }
    if (j.noToca > 0) j.noToca -= dt;
    if (j.plancha > 0) {
      j.plancha -= dt; j.vel.copy(j.dirPlancha).multiplyScalar(9.5 * clamp(j.plancha / 0.6, 0.15, 1));
      if (j.plancha <= 0) j.aturdido = 0.35;
      // en plancha también se lleva el balón suelto
      if (!balon.dueno && balon.pos.y < 0.5 && Math.hypot(balon.pos.x - j.pos.x, balon.pos.z - j.pos.z) < 1.1 && j.noToca <= 0) { soltar(j, j.dirPlancha.clone().multiplyScalar(7).setY(1)); }
    } else if (j.estirada > 0) {
      j.estirada -= dt; const f = j.estirada > 0.55 ? 7.5 : 0; j.vel.copy(j.dirPlancha).multiplyScalar(f);
      if (j.estirada <= 0) j.aturdido = 0.4;
    } else {
      const acel = 26 * dt;
      _a.copy(deseo).sub(j.vel).setY(0).clampLength(0, acel);
      j.vel.add(_a);
    }
    j.pos.addScaledVector(j.vel, dt);
    const margen = j.rol === 'POR' ? 0.5 : 3;
    j.pos.x = clamp(j.pos.x, -L - margen, L + margen); j.pos.z = clamp(j.pos.z, -W - 3, W + 3); j.pos.y = 0;
    const v = Math.hypot(j.vel.x, j.vel.z);
    if (j.plancha <= 0 && j.estirada <= 0) {
      let r;
      if (v > 0.6) r = Math.atan2(j.vel.x, j.vel.z);
      else r = Math.atan2(balon.pos.x - j.pos.x, balon.pos.z - j.pos.z);
      j.rumbo += dif(j.rumbo, r) * (1 - Math.exp(-dt * (balon.dueno === j ? 14 : 9)));
    }
    j.v = v;
  }
  function animar(j, dt, t) {
    // inclinación: plancha, estirada del portero y caída
    let rx = 0, rz = 0, y = 0;
    if (j.plancha > 0) rx = -1.15 * Math.min(1, (0.6 - j.plancha) * 8);
    if (j.estirada > 0) { rz = -j.ladoEstirada * 1.25 * Math.min(1, (0.9 - j.estirada) * 6); y = 0.25 * Math.sin(Math.min(1, (0.9 - j.estirada) / 0.5) * Math.PI); }
    if (j.caido > 0) { j.caido -= dt; rx = -1.4 * Math.min(1, j.caido * 3); }
    if (j.salto > 0) { j.salto -= dt; y = Math.sin(j.salto / 0.4 * Math.PI) * 0.45; }
    j.inclina.rotation.x = lerp(j.inclina.rotation.x, rx, 1 - Math.exp(-dt * 16));
    j.inclina.rotation.z = lerp(j.inclina.rotation.z, rz, 1 - Math.exp(-dt * 16));
    j.inclina.position.y = rx < -0.5 ? 0.25 : 0;
    j.grupo.position.set(j.pos.x, y + (j.celebra > 0 && j === P.celebrador ? Math.abs(Math.sin(t * 6)) * 0.18 : 0), j.pos.z);
    j.grupo.rotation.y = j.rumbo;
    // animación base
    if (j.tGolpeo > 0) j.tGolpeo -= dt;
    else if (j.plancha > 0 || j.estirada > 0 || j.caido > 0) anim(j, 'idle', 1);
    else if (j.v < 0.3) anim(j, 'idle', 1);
    else if (j.v < 2.6) anim(j, 'walk', clamp(j.v / 1.3, 0.8, 1.9));
    else anim(j, 'run', clamp(j.v / 3.4, 0.9, 1.9));
    if (!j.mixer) return;
    const visible = camera.position.distanceToSquared(j.pos) < 70 * 70;
    // los lejanos se animan a menos fotogramas
    j.acum = (j.acum || 0) + dt;
    if (!visible && j.acum < 1 / 15) return;
    for (const [o, qq] of j.reposo) o.quaternion.copy(qq);
    j.mixer.update(j.acum); j.acum = 0;
    // cabeza nueva siguiendo el hueso de la cabeza
    if (j.pivoteCabeza) { j.pivoteCabeza.position.copy(j.h.cabeza.position); j.pivoteCabeza.quaternion.copy(j.h.cabeza.quaternion).multiply(j.desfaseCabeza); }
    // brazos: celebración y estirada del portero
    let objI = 0, objD = 0, objU = 0;
    if (j.celebra > 0) { j.celebra -= dt; objU = 1; }
    if (j.estirada > 0) objU = 1;
    if (P.estado === 'final' && P.ganador === j.equipo) objU = 1;
    const kw = 1 - Math.exp(-dt * 8);
    j.wI = lerp(j.wI, objI, kw); j.wD = lerp(j.wD, objD, kw); j.wU = lerp(j.wU, objU, kw);
    if (j.wU > 0.01 && j.h.brazoI && j.h.brazoD) {
      j.grupo.updateMatrixWorld(true);
      j.h.brazoI.getWorldPosition(_a); j.h.brazoD.getWorldPosition(_b);
      _lat.subVectors(_a, _b).setY(0).normalize(); _fr.crossVectors(_lat, _up).normalize();
      const bombeo = Math.sin(t * Math.PI * 3 + j.i);
      for (const lado of [1, -1]) {
        _t1.copy(_up).addScaledVector(_lat, lado * 0.32).addScaledVector(_fr, 0.12 + 0.1 * bombeo).normalize();
        _t2.copy(_up).addScaledVector(_lat, lado * 0.1).addScaledVector(_fr, 0.15).normalize();
        C.apuntar(lado > 0 ? j.h.brazoI : j.h.brazoD, lado > 0 ? j.h.antebrazoI : j.h.antebrazoD, _t1, j.wU);
        C.apuntar(lado > 0 ? j.h.antebrazoI : j.h.antebrazoD, lado > 0 ? j.h.manoI : j.h.manoD, _t2, j.wU);
      }
    }
  }
  function separar() {
    const T = P.todos;
    for (let a = 0; a < T.length; a++) for (let b = a + 1; b < T.length; b++) {
      const A = T[a], Bj = T[b]; const dx = Bj.pos.x - A.pos.x, dz = Bj.pos.z - A.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 0.36 && d2 > 1e-6) { const d = Math.sqrt(d2), e = (0.6 - d) / 2; const nx = dx / d, nz = dz / d; A.pos.x -= nx * e; A.pos.z -= nz * e; Bj.pos.x += nx * e; Bj.pos.z += nz * e; }
    }
  }

  // ------------------------------------------------------------------------------------------
  //  Cámara (vista de tele desde la banda)
  // ------------------------------------------------------------------------------------------
  const camMira = new V3(), camPos = new V3();
  function camaraTele(dt, cerca = 0) {
    const f = balon.dueno ? balon.dueno.pos.clone().lerp(balon.pos, 0.5) : balon.pos.clone();
    const zoom = cerca;
    const objM = new V3(clamp(f.x, -L + 6, L - 6), 0, clamp(f.z * 0.8, -W * 0.75, W * 0.75) - 1);
    const vertical = camera.aspect < 1, alto = (vertical ? 10 : 7.6) - zoom * 1.5, distZ = (vertical ? 17 : 13) - zoom * 3;
    const objP = new V3(objM.x * 0.95, alto, objM.z + distZ);
    const k = 1 - Math.exp(-dt * 3.2);
    P.camara.m.lerp(objM, k); P.camara.p.lerp(objP, k);
    camPos.copy(P.camara.p); camMira.copy(P.camara.m);
  }
  function aplicarCamara(fov) {
    if (P.sacudida > 0) { camPos.x += (azar() - 0.5) * P.sacudida; camPos.y += (azar() - 0.5) * P.sacudida; P.sacudida *= 0.9; }
    camera.position.copy(camPos); camera.lookAt(camMira);
    const fv = C.ajustarFov(fov); if (Math.abs(camera.fov - fv) > 0.01) { camera.fov = fv; camera.updateProjectionMatrix(); }
    C.U_ESCALA.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    C.foco.position.copy(camMira).add(new V3(18, 45, 22)); C.foco.target.position.copy(camMira); C.foco.target.updateMatrixWorld();
  }

  // ------------------------------------------------------------------------------------------
  //  Radar
  // ------------------------------------------------------------------------------------------
  const radar = q('.radar'), rg = radar.getContext('2d');
  function dibujarRadar() {
    const w = radar.width, h = radar.height; rg.clearRect(0, 0, w, h);
    const X = (x) => (x / L * 0.46 + 0.5) * w, Z = (z) => (z / W * 0.44 + 0.5) * h;
    rg.strokeStyle = 'rgba(255,255,255,.45)'; rg.lineWidth = 2;
    rg.strokeRect(X(-L), Z(-W), X(L) - X(-L), Z(W) - Z(-W)); rg.beginPath(); rg.moveTo(X(0), Z(-W)); rg.lineTo(X(0), Z(W)); rg.stroke();
    rg.beginPath(); rg.arc(X(0), Z(0), 9.15 / W * 0.44 * h, 0, Math.PI * 2); rg.stroke();
    for (const j of P.todos) {
      rg.fillStyle = j.equipo === 0 ? '#ffffff' : P.rival.marca;
      if (j === P.controlado) rg.fillStyle = '#5ef2ff';
      rg.beginPath(); rg.arc(X(j.pos.x), Z(j.pos.z), j === P.controlado ? 6 : 4, 0, Math.PI * 2); rg.fill();
    }
    rg.fillStyle = '#ffd84a'; rg.beginPath(); rg.arc(X(balon.pos.x), Z(balon.pos.z), 3.5, 0, Math.PI * 2); rg.fill();
  }

  // ------------------------------------------------------------------------------------------
  //  Menús
  // ------------------------------------------------------------------------------------------
  function menuInicio() {
    P.estado = 'menu';
    const op = (grupo, valor, actual, extra = '') => `<button class="pt-op${valor === actual ? ' sel' : ''}" data-g="${grupo}" data-v="${valor}">${extra}${valor}</button>`;
    const pintar = () => {
      panel.innerHTML = `<div class="pt-caja">
        <h2>EL PARTIDO</h2>
        <div class="vs">MANUEL FC · CONTRA · ${P.rival.nombre}</div>
        <div class="pt-et">RIVAL</div>
        <div class="pt-fila">${RIVALES.map((r) => `<button class="pt-op${r === P.rival ? ' sel' : ''}" data-g="rival" data-v="${r.nombre}"><i style="background:${r.camiseta}"></i>${r.nombre}</button>`).join('')}</div>
        <div class="pt-et">DURACIÓN</div>
        <div class="pt-fila">${[['2', 'Corto · 2 min'], ['3', 'Normal · 3 min'], ['5', 'Largo · 5 min']].map(([v, t]) => `<button class="pt-op${+v === P.duracion ? ' sel' : ''}" data-g="dur" data-v="${v}">${t}</button>`).join('')}</div>
        <div class="pt-et">DIFICULTAD</div>
        <div class="pt-fila">${Object.keys(DIFICULTAD).map((d) => op('dif', d, P.dificultad)).join('')}</div>
        <button class="pt-grande" data-accion="jugar">⚽ ¡A JUGAR!</button>
        <div class="pt-nota">${MOVIL ? 'Joystick para correr · <b>PASE</b> (mantén: pase largo) · <b>TIRO</b> (mantén para cargar) · <b>⚡</b> sprint. Sin balón, PASE cambia de jugador y TIRO hace una entrada.' : 'Flechas o WASD para correr · <b>Z</b> pase (mantén: largo) · <b>X</b> tiro (mantén para cargar) · <b>Mayús</b> sprint. Sin balón: Z cambia de jugador, X hace una entrada. También vale un mando.'}<br>Con la barra de SUPERTIRO llena, carga el tiro a tope para lanzar un supertiro de fuego.</div>
      </div>`;
    };
    pintar(); panel.hidden = false; hud.style.display = 'none';
    panel.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.g === 'rival') { P.rival = RIVALES.find((r) => r.nombre === b.dataset.v); pintar(); }
      else if (b.dataset.g === 'dur') { P.duracion = +b.dataset.v; pintar(); }
      else if (b.dataset.g === 'dif') { P.dificultad = b.dataset.v; pintar(); }
      else if (b.dataset.accion === 'jugar') empezarPartido();
    };
  }
  function empezarPartido() {
    panel.hidden = true; hud.style.display = '';
    DIF = DIFICULTAD[P.dificultad];
    montarEquipos();
    q('.eqB').textContent = P.rival.corto; q('.eqB').style.background = P.rival.camiseta; q('.eqA').textContent = MIOS.corto;
    P.goles = [0, 0]; P.parte = 1; P.reloj = 0; P.superM = 0; actualizarMarcador();
    colocarSaque(0);
    P.estado = 'presentacion'; P.tEstado = 0;
    pub(0.55, 0.7, ahoraS(), 0.3); sonido.amortiguar(7000, ahoraS(), 0.1);
    mensaje('MANUEL FC', 'CONTRA ' + P.rival.nombre, 2.6);
    narrar('Bienvenidos al Bernabéu. Manuel F C contra ' + P.rival.nombre.toLowerCase() + '. ¡Empieza el partido!', true);
  }
  function menuPausa() {
    P.estadoAntes = P.estado; P.estado = 'pausa';
    panel.innerHTML = `<div class="pt-caja"><h2>PAUSA</h2><div class="pt-res">${P.goles[0]} – ${P.goles[1]}</div>
      <button class="pt-grande" data-accion="seguir">▶ SEGUIR</button>
      <div class="pt-fila"><button class="pt-sec" data-accion="reiniciar">↺ Empezar de nuevo</button><button class="pt-sec" data-accion="menu">Cambiar rival</button><button class="pt-sec" data-accion="intro">Ver la intro</button></div></div>`;
    panel.hidden = false;
    panel.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.accion === 'seguir') { panel.hidden = true; P.estado = P.estadoAntes; }
      else if (b.dataset.accion === 'reiniciar') empezarPartido();
      else if (b.dataset.accion === 'menu') menuInicio();
      else if (b.dataset.accion === 'intro') salir();
    };
  }
  function menuFinal() {
    const [a, b] = P.goles;
    const titulo = a > b ? '¡VICTORIA!' : a < b ? 'DERROTA' : 'EMPATE';
    panel.innerHTML = `<div class="pt-caja"><h2>${titulo}</h2><div class="vs">MANUEL FC · ${P.rival.nombre}</div><div class="pt-res">${a} – ${b}</div>
      <button class="pt-grande" data-accion="revancha">⚽ OTRO PARTIDO</button>
      <div class="pt-fila"><button class="pt-sec" data-accion="menu">Cambiar rival</button><button class="pt-sec" data-accion="intro">Ver la intro</button></div></div>`;
    panel.hidden = false;
    panel.onclick = (e) => {
      const bt = e.target.closest('button'); if (!bt) return;
      if (bt.dataset.accion === 'revancha') empezarPartido();
      else if (bt.dataset.accion === 'menu') menuInicio();
      else if (bt.dataset.accion === 'intro') salir();
    };
  }

  // ------------------------------------------------------------------------------------------
  //  Bucle del partido
  // ------------------------------------------------------------------------------------------
  let tTotal = 0;
  function paso(dtReal) {
    leerEntrada();
    if (ENT.pausa) { ENT.pausa = false; if (P.estado === 'pausa') { panel.hidden = true; P.estado = P.estadoAntes; } else if (!['menu', 'final'].includes(P.estado)) menuPausa(); }
    if (P.tLento > 0) { P.tLento -= dtReal; if (P.tLento <= 0) P.escalaTiempo = 1; }
    const dt = P.estado === 'pausa' ? 0 : dtReal * P.escalaTiempo;
    tTotal += dt;
    U.tiempo.value = tTotal;
    P.tEstado += dt;
    const est = P.estado;

    if (est === 'menu') {
      // vuelo lento sobre el campo con los equipos formados
      // vuelta lenta alrededor de los dos equipos formados en el centro
      const a = 0.35 + Math.sin(tTotal * 0.12) * 0.7;
      camPos.set(Math.sin(a) * 11, 2.6, Math.cos(a) * 11); camMira.set(0, 1.0, 0);
      if (C.PARAMS.has('retrato')) { const j = P.todos[+C.PARAMS.get('retrato') || 0]; camPos.set(j.pos.x + 0.6, 1.25, j.pos.z + 2.2); camMira.set(j.pos.x + 0.6, 0.95, j.pos.z); }
      aplicarCamara(40);
      for (const j of P.todos) animar(j, dtReal, tTotal);
      return;
    }
    if (est === 'pausa') { aplicarCamara(36); return; }

    // jugador que controlas
    const yo = P.controlado;
    for (const j of P.todos) {
      let deseo;
      if (est === 'juego') deseo = (j === yo && !P.autoMio) ? entradaUsuario(j, dt) : pensar(j, dt);
      else if (est === 'parado' || est === 'presentacion' || est === 'saque') {
        const R = P.reanudar;
        if (R && R.lanzador === j) deseo = new V3();
        else deseo = (j.rol === 'POR' ? puntoPortero(j) : objetivoPosicion(j)).clone().sub(j.pos).clampLength(0, 5);
        if (est === 'saque' || est === 'presentacion') { deseo.set(0, 0, 0); }
      } else if (est === 'gol' || est === 'descanso' || est === 'final') {
        if (j.celebra > 0 && est === 'gol') {
          const c = P.celebrador; const s = ATACA(j.equipo);
          const meta = j === c ? new V3(s * (L - 3), 0, Math.sign(c.pos.z || 1) * (W - 4)) : c.pos.clone();
          deseo = meta.sub(j.pos).setY(0); deseo.clampLength(0, j === c ? 5.5 : (deseo.length() > 2 ? 5 : 0));
        } else deseo = new V3();
      }
      mover(j, deseo || new V3(), dt);
    }
    separar();

    if (est === 'juego') {
      robos(dt); actualizarBalon(dt); atrapadas(dt); comprobarGolYFuera();
      // ¿cambio automático cuando defiendes y otro está mucho más cerca?
      if (!balon.dueno || balon.dueno.equipo === 1) {
        const objetivo = balon.dueno ? balon.dueno.pos : balon.pos;
        if (yo && yo.rol !== 'POR') {
          const mio = P.equipos[0].filter((j) => j.rol !== 'POR').sort((a, b) => a.pos.distanceToSquared(objetivo) - b.pos.distanceToSquared(objetivo))[0];
          if (mio && mio !== yo && yo.pos.distanceTo(objetivo) > mio.pos.distanceTo(objetivo) + 7 && yo.plancha <= 0) controlar(mio);
        }
      }
      if (balon.dueno && balon.dueno.equipo === 0) P.superM = Math.min(1, P.superM + dt * 0.035);
      // reloj: cada parte dura duración/2 minutos reales y en pantalla son 45 minutos
      P.reloj += dt;
      const mitad = P.duracion * 60 / 2;
      if (P.reloj >= mitad) {
        P.reloj = mitad;
        if (P.parte === 1) { P.estado = 'descanso'; P.tEstado = 0; sPito(2, 0.6); mensaje('DESCANSO', `${MIOS.nombre} ${P.goles[0]} – ${P.goles[1]} ${P.rival.nombre}`, 3); narrar('Final de la primera parte', true); }
        else { terminar(); }
      }
    } else {
      actualizarBalon(dt);
      if (est === 'presentacion' && P.tEstado > 2.6) { P.estado = 'saque'; P.tEstado = 0; }
      if (est === 'saque') {
        const R = P.reanudar;
        if (P.tEstado > 0.8 && !R.pitado) { R.pitado = true; sPito(1, 0.5); if (!P.vistos && R.equipo === 0) { ayuda(MOVIL ? 'Mueve el joystick y pulsa <b>PASE</b> para sacar · <b>TIRO</b> (mantén) para chutar · <b>⚡</b> para correr más' : 'Flechas para moverte · <b>Z</b> pase · <b>X</b> tiro (mantén para cargar) · <b>Mayús</b> sprint', 7); P.vistos = true; } }
        if (R.pitado) {
          if (R.equipo === 0 && !P.autoMio) { if (ENT.pase || ENT.tiro || Math.hypot(ENT.x, ENT.y) > 0.3 || P.tEstado > 6) { P.estado = 'juego'; P.pasePrevio = ENT.pase; P.tiroPrevio = ENT.tiro; if (!ENT.pase && !ENT.tiro && Math.hypot(ENT.x, ENT.y) < 0.3) pasar(R.lanzador, new V3(-ATACA(0), 0, 0.5).normalize(), false); } }
          else if (P.tEstado > 1.6) { P.estado = 'juego'; pasar(R.lanzador, new V3(-ATACA(R.equipo), 0, (azar() - 0.5)).normalize(), false); }
        }
      }
      if (est === 'parado') {
        const R = P.reanudar;
        if (P.tEstado > 1.0 && !R.listo) { R.listo = true; prepararReanudacion(); }
        if (R.listo) {
          const yoSaco = R.equipo === 0 && R.lanzador === P.controlado && !P.autoMio;
          const sacar = (largo) => {
            P.estado = 'juego'; const s = ATACA(R.equipo);
            let dir = new V3(s, 0, 0);
            if (R.tipo === 'corner') dir = new V3(-Math.sign(R.punto.x) * 0.9, 0, -Math.sign(R.punto.z)).normalize();
            if (R.tipo === 'banda') dir = new V3(s * 0.6, 0, -Math.sign(R.punto.z)).normalize();
            if (yoSaco && Math.hypot(ENT.x, ENT.y) > 0.3) dir = new V3(ENT.x, 0, -ENT.y).normalize();
            pasar(R.lanzador, dir, largo);
          };
          if (yoSaco) { if (!ENT.pase && P.pasePrevio) sacar(P.tPase > 0.28 || R.tipo === 'corner'); else if (P.tEstado > 7) sacar(R.tipo !== 'banda'); if (ENT.pase && !P.pasePrevio) P.tPase = 0; if (ENT.pase) P.tPase += dt; P.pasePrevio = ENT.pase; }
          else if (P.tEstado > 2.2) sacar(R.tipo === 'corner' || R.tipo === 'puerta' || azar() < 0.3);
        }
      }
      if (est === 'gol') {
        // el balón se queda en la red
        if (balon.enRed) { const s = Math.sign(balon.pos.x); balon.pos.x = clamp(balon.pos.x, -L - CAMPO.fondo + 0.2, L + CAMPO.fondo - 0.2); if (Math.abs(balon.pos.x) > L + CAMPO.fondo - 0.4) balon.vel.x *= -0.2; balon.vel.multiplyScalar(Math.exp(-dt * 3)); balon.pos.z = clamp(balon.pos.z, -CAMPO.P, CAMPO.P); }
        if (P.tEstado > 6) { colocarSaque(1 - P.ultimoGol); P.estado = 'saque'; P.tEstado = 0; }
      }
      if (est === 'descanso' && P.tEstado > 3.5) { P.parte = 2; P.reloj = 0; colocarSaque(1); P.estado = 'saque'; P.tEstado = 0; }
    }
    // animación
    for (const j of P.todos) animar(j, dt, tTotal);

    // cámara
    if (est === 'gol' && P.celebrador) {
      const c = P.celebrador.pos, a = P.tEstado * 0.5 + 0.6;
      const objP = new V3(c.x + Math.sin(a) * 6, 2.2, c.z + Math.cos(a) * 6);
      camPos.lerp(objP, 1 - Math.exp(-dtReal * (P.tEstado < 0.1 ? 60 : 4))); camMira.lerp(c.clone().setY(1.1), 1 - Math.exp(-dtReal * 6));
      aplicarCamara(42);
    } else if (P.tLento > 0 && P.superJ) {
      const j = P.superJ, s = ATACA(j.equipo);
      camPos.set(j.pos.x - s * 2.6, 1.1, j.pos.z + 2.4); camMira.copy(balon.pos).setY(0.8);
      aplicarCamara(34);
    } else {
      const cerca = (balon.dueno && balon.dueno === P.controlado && Math.abs(balon.pos.x - ATACA(0) * L) < 22) ? 0.25 : 0;
      camaraTele(dtReal, cerca); aplicarCamara(MOVIL && camera.aspect < 1 ? 46 : 36);
      if (P.superJ && P.tLento <= 0) P.superJ = null;
    }
    if (C.PARAMS.has('sigue')) { const j = P.todos[+C.PARAMS.get('sigue') || 0], an = +(C.PARAMS.get('angulo') || 0); camPos.set(j.pos.x + Math.sin(j.rumbo + an) * 2.2, 1.2, j.pos.z + Math.cos(j.rumbo + an) * 2.2); camMira.set(j.pos.x, 1.0, j.pos.z); aplicarCamara(40); }
    // marcas
    const yoAhora = P.controlado;
    marca.visible = !!yoAhora && est !== 'gol' && !P.autoMio;
    if (yoAhora) { marca.position.set(yoAhora.pos.x, 0, yoAhora.pos.z); flecha.position.y = 1.9 * yoAhora.escala + Math.sin(tTotal * 6) * 0.08; flecha.rotation.y += dtReal * 3; }
    marcaPase.material.opacity = Math.max(0, marcaPase.material.opacity - dtReal * 1.2);
    // interfaz
    const mitad = P.duracion * 60 / 2, min = Math.floor((P.reloj / mitad) * 45) + (P.parte === 2 ? 45 : 0);
    q('.reloj').textContent = `${P.parte}ª · ${String(min).padStart(2, '0')}'`;
    q('.jugadorActivo').textContent = yoAhora ? `${yoAhora.dorsal} · ${yoAhora.nombre}` : '';
    q('.tiro').classList.toggle('ver', P.cargaTiro > 0);
    q('.tiro i').style.width = (P.cargaTiro * 100) + '%';
    q('.super i').style.width = (P.superM * 100) + '%'; q('.super').classList.toggle('lleno', P.superM >= 1);
    if (tMensaje > 0) { tMensaje -= dtReal; if (tMensaje <= 0) { q('.mensaje').classList.remove('ver'); q('.sub').classList.remove('ver'); } }
    if (tAyuda > 0) { tAyuda -= dtReal; if (tAyuda <= 0) q('.ayuda').classList.remove('ver'); }
    dibujarRadar();
    // grada: se anima cuando hay peligro
    const peligro = Math.max(0, 1 - Math.abs(Math.abs(balon.pos.x) - L) / 30);
    if (est === 'juego') U.excita.value = lerp(U.excita.value, 0.2 + peligro * 0.7, 1 - Math.exp(-dtReal * 1.5));
    else if (est !== 'gol') U.excita.value = lerp(U.excita.value, 0.3, 1 - Math.exp(-dtReal));
    P.tOla -= dtReal; if (P.tOla < 0) { U.ola.value = lerp(U.ola.value, 1, 1 - Math.exp(-dtReal)); if (P.tOla < -12) { P.tOla = 50 + azar() * 40; } } else U.ola.value = lerp(U.ola.value, 0, 1 - Math.exp(-dtReal));
    U.olaAng.value = tTotal * 1.2;
    U.flash.value = 0.25 + peligro * 0.6;
    P.tPublico = (P.tPublico || 0) - dtReal;
    if (P.tPublico < 0 && est === 'juego' && sonido.ctx) { P.tPublico = 0.6; pub(0.38 + peligro * 0.25, 0.15 + peligro * 0.6, ahoraS(), 0.6); }
    P.tCanto -= dtReal; if (P.tCanto < 0 && sonido.ctx) { P.tCanto = 14 + azar() * 12; const a = ahoraS() + 0.1; for (let k = 0; k < 2; k++) { sonido.canto(a + k * 2.67, 0.5); [2, 2.5, 3].forEach((p) => sonido.palmas(a + k * 2.67 + p * 0.667, 12, 0.06)); } }
  }
  function terminar() {
    P.estado = 'final'; P.tEstado = 0; sPito(3, 0.9);
    const [a, b] = P.goles; P.ganador = a > b ? 0 : a < b ? 1 : -1;
    mensaje(a > b ? '¡VICTORIA!' : a < b ? 'FIN DEL PARTIDO' : 'EMPATE', `${MIOS.nombre} ${a} – ${b} ${P.rival.nombre}`, 4);
    narrar(a > b ? '¡Final del partido! ¡Gana el Manuel F C!' : 'Final del partido', true);
    if (a > b) { sFanfarria(); C.confeti(new V3(0, 0, 0), MOVIL ? 400 : 900); for (let k = 0; k < 10; k++) setTimeout(() => { const an = azar() * Math.PI * 2; C.cohete(Math.cos(an) * (EST.techo.ax + 16), EST.techo.y + 4, Math.sin(an) * (EST.techo.az + 14), 26 + azar() * 22); }, k * 300); }
    setTimeout(menuFinal, 4200);
  }
  function salir() {
    removeEventListener('keydown', kd); removeEventListener('keyup', ku);
    for (const j of P.todos) if (j.esManuel) { j.inclina.remove(MAN.modelo); MAN.base.add(MAN.modelo); }
    scene.remove(raiz); hud.remove(); panel.remove(); css.remove();
    C.alSalir();
  }

  // primer menú con los equipos formados en el centro
  montarEquipos();
  P.todos.forEach((j, k) => { const fila = j.equipo === 0 ? 1.6 : -1.6; j.pos.set((j.i - 5) * 1.4, 0, fila); j.rumbo = 0; });
  menuInicio();
  if (C.PARAMS.has('auto')) { P.autoMio = true; P.duracion = parseFloat(C.PARAMS.get('auto')) || 3; empezarPartido(); }
  return { paso, salir, P, balon, SUCESOS, pruebaGol: (eq) => { P.estado = 'juego'; balon.ultimo = P.equipos[eq][10]; gol(eq); }, pruebaSuper: () => { const j = P.equipos[0][10]; j.pos.set(L - 24, 0, 4); j.rumbo = Math.PI / 2; darBalon(j); balon.pos.set(L - 23.5, RB, 4); P.estado = 'juego'; P.superM = 1; superTiro(j); }, get estado() { return P.estado; } };
}
