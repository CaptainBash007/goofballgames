(function(){
  // Prevent double-loading if included multiple times
  if (window.__GB_BALLPIT_ACTIVE) return; 
  window.__GB_BALLPIT_ACTIVE = true;
  // Secret easter egg: 30 fast background clicks => spawn a "ball pit" of goofball images
  const MAX_INTERVAL = 5000; // 5s window to register clicks
  const REQUIRED_CLICKS = 10; // require 10 clicks
  const CELL = 120; // background tile size proxy
  const BATCH = 140; // number of goofballs to spawn for a fuller "pit"
  const REMOTE_IMG = 'https://didyougetherefromthebitlylink.neocities.org/goofballgames.png';
  const LOCAL_IMG = 'goofballgames.png';
  const useLocalByDefault = (location.protocol === 'file:') || (navigator && navigator.onLine === false);

  function pickImgSrc(){
    return useLocalByDefault ? LOCAL_IMG : REMOTE_IMG;
  }

  let uniqueCells = new Set();
  let startTs = 0;
  let triggered = false;
  let hintEl = null;
  let hintTimer = 0;

  // Physics settings
  const SPRITE_W = 48, SPRITE_H = 48; // base size (not used when variation is enabled)
  const SIZE_MIN = 40, SIZE_MAX = 75; // per-ball size variation (px)
  const GRAVITY = 2200; // px/s^2
  const RESTITUTION = 0.5; // bounciness for collisions (a bit livelier to reduce sticking)
  const FRICTION = 0.997; // base damping (dt-scaled)
  const FLOOR_FRICTION = 0.999; // extra damping when touching ground (dt-scaled)
  const CELL_SIZE = 80; // spatial grid cell size (approx diameter of larger balls)
  const SOLVER_ITERS = 4; // more iterations for deeper overlaps
  const ROLL_BLEND = 3.5; // lower blend toward rolling to reduce spin
  const MU_TANGENT = 0.12; // lower tangential friction to reduce spin generation
  const ANGULAR_DAMP = 0.995; // base angular damping (dt scaled)
  const OMEGA_MAX = 10; // cap angular speed (rad/s)
  const SETTLE_VEL = 80; // px/s threshold to mark as settled
  const MAX_SIM_TIME = 20_000; // ms then cleanup
  const DRAIN_DELAY = 10_000; // ms before funnel opens
  const DRAIN_PULL = 1800; // px/s^2 pull toward bottom-right during drain
  const DRAIN_HOLE_W = 96; // width of the bottom-right hole
  const DRAIN_HOLE_H = 96; // height of the bottom-right hole

  function isBackgroundTarget(el){
    // Treat clicks on body/background areas (not on links/buttons/interactive areas) as background
    if (!el) return true;
    const tag = el.tagName?.toLowerCase();
    if (/a|button|input|textarea|select|label|iframe|video|audio/.test(tag)) return false;
    if (el.closest?.('.nav-bar, #header, .side-panel-wrapper, .favorites-container, .nav-button, .news-box')) return false;
    return true;
  }

  function spawnBallPit(){
    if (triggered) return; triggered = true;
    const container = document.createElement('div');
    container.className = 'ballpit-container';
    document.body.appendChild(container);

    const W = window.innerWidth, H = window.innerHeight;
    // Determine vertical point after which collisions are enabled (below nav/header)
    function computeCollisionStartY(){
      let y = 100; // fallback
      const sels = ['#header', '.nav-bar', '#bookmark-wrap', '.bookmark-alert'];
      for (const sel of sels){
        const el = document.querySelector(sel);
        if (el){
          try { y = Math.max(y, el.getBoundingClientRect().bottom); } catch(e){}
        }
      }
      // keep within viewport
      return Math.min(Math.max(0, y + 6), H - 10);
    }
    const COLLISION_START_Y = computeCollisionStartY();

  const sprites = [];
    for (let i=0;i<BATCH;i++){
      const img = document.createElement('img');
      img.src = pickImgSrc();
      img.onerror = function(){ if (img.src !== LOCAL_IMG) img.src = LOCAL_IMG; };
      img.alt = 'goofball';
      img.className = 'ballpit-ball';
      const size = Math.round(SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN));
      img.style.width = size + 'px';
      img.style.height = size + 'px';
      const x = Math.max(4, Math.random() * (W - size - 8));
      const y = -Math.random() * 240 - size;
      img.style.left = x + 'px';
      img.style.top = y + 'px';
      container.appendChild(img);
      sprites.push({ el: img, x, y, w: size, h: size, vx: (Math.random()-0.5)*110, vy: 0, settled: false, bounces: 0, restFrames: 0, onGround: false, omega: 0, angle: 0, collided: false });
    }

    function hash(cx, cy){ return cx + ',' + cy; }
    function buildGrid(){
      const grid = new Map();
      for (let i=0;i<sprites.length;i++){
        const s = sprites[i];
        const cx = Math.floor((s.x + s.w*0.5) / CELL_SIZE);
        const cy = Math.floor((s.y + s.h*0.5) / CELL_SIZE);
        const key = hash(cx, cy);
        const arr = grid.get(key) || []; arr.push(i); grid.set(key, arr);
      }
      return grid;
    }
    function neighbors(grid, cx, cy){
      const out = [];
      for (let oy=-1; oy<=1; oy++){
        for (let ox=-1; ox<=1; ox++){
          const arr = grid.get(hash(cx+ox, cy+oy));
          if (arr) out.push(arr);
        }
      }
      return out;
    }

  let lastTs = performance.now();
  let running = true;
  const startTime = lastTs;

    function step(ts){
      if (!running) return;
      const dt = Math.min(0.032, Math.max(0.001, (ts - lastTs) / 1000)); // clamp dt
      lastTs = ts;

      let allSettled = true;
      const age = ts - startTime;
      const draining = age >= DRAIN_DELAY;
      for (const s of sprites){
        if (s.settled) continue;
        allSettled = false;
        // integrate
        s.vy += GRAVITY * dt;
        // apply drain pull after delay
        if (draining){
          const tx = W - 6 - s.w*0.5;
          const ty = H + 40; // pull slightly below to encourage exit
          const dx = tx - (s.x + s.w*0.5);
          const dy = ty - (s.y + s.h*0.5);
          const len = Math.hypot(dx, dy) || 1;
          const ax = (dx / len) * DRAIN_PULL;
          const ay = (dy / len) * DRAIN_PULL;
          s.vx += ax * dt;
          s.vy += ay * dt;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
  // dt-scaled damping (approx at 60fps)
  const damp = Math.pow(FRICTION, dt*60);
  s.vx *= damp;
        
  // angular damping and update
  const adamp = Math.pow(ANGULAR_DAMP, dt*60);
  s.omega *= adamp;
  s.angle += s.omega * dt;

  // wall collisions
        if (s.x < 0){ s.x = 0; s.vx = -s.vx * 0.5; }
        if (s.x + s.w > W){ s.x = W - s.w; s.vx = -s.vx * 0.5; }

        // ground collision
        const gy = H - s.h;
        s.onGround = false;
        // during drain, allow a hole in bottom-right so items can fall through
        const inHole = draining && (s.x + s.w > W - DRAIN_HOLE_W) && (s.y + s.h > H - DRAIN_HOLE_H);
        if (s.y > gy && !inHole){
          s.y = gy;
          s.onGround = false;
          if (s.vy > 0){ s.vy = -s.vy * RESTITUTION; s.bounces++; }
          // floor friction when contacting ground
          const fdamp = Math.pow(FLOOR_FRICTION, dt*60);
          s.vx *= fdamp;
          // encourage rolling: blend omega toward no-slip value vx/R
          const R = s.w * 0.5;
          const targetOmega = s.vx / Math.max(1, R);
          s.omega += (targetOmega - s.omega) * Math.min(1, ROLL_BLEND * dt);
          // clamp excessive spin
          if (s.omega > OMEGA_MAX) s.omega = OMEGA_MAX;
          else if (s.omega < -OMEGA_MAX) s.omega = -OMEGA_MAX;
        }
      }

      // build spatial grid for collisions
      let grid = buildGrid();
      // resolve sprite-sprite collisions
      for (let iter=0; iter<SOLVER_ITERS; iter++){
        if (iter>0) grid = buildGrid();
        for (let i=0;i<sprites.length;i++){
          const a = sprites[i];
          const ax = Math.floor((a.x + a.w*0.5) / CELL_SIZE);
          const ay = Math.floor((a.y + a.h*0.5) / CELL_SIZE);
          const candsBlocks = neighbors(grid, ax, ay);
          for (const block of candsBlocks){
            for (const j of block){
              if (j <= i) continue; // handle pair once
              const b = sprites[j];
              // Circle-circle resolution
              const acx = a.x + a.w*0.5, acy2 = a.y + a.h*0.5;
              const bcx = b.x + b.w*0.5, bcy2 = b.y + b.h*0.5;
              let nx = acx - bcx, ny = acy2 - bcy2;
              let dist = Math.hypot(nx, ny);
              const rSum = (a.w + b.w) * 0.5;
              if (dist === 0){ nx = 1; ny = 0; dist = 0.0001; }
              const pen = rSum - dist;
              if (pen <= 0) continue;
              // normalize
              nx /= dist; ny /= dist;
              const push = pen * 0.5;
              a.x += nx * push; a.y += ny * push;
              b.x -= nx * push; b.y -= ny * push;
              // normal impulse
              const rvx = a.vx - b.vx;
              const rvy = a.vy - b.vy;
              const vrel = rvx * nx + rvy * ny;
              if (vrel < 0){
                const j = -(1 + RESTITUTION) * vrel * 0.5; // equal mass
                const impX = j * nx, impY = j * ny;
                a.vx += impX; a.vy += impY;
                b.vx -= impX; b.vy -= impY;
                a.collided = b.collided = true;

                // tangential friction impulse for rolling effect
                const tx = -ny, ty = nx;
                const vtan = rvx * tx + rvy * ty; // relative tangential velocity
                // limit friction impulse by mu * |normalImpulse|
                const maxF = MU_TANGENT * Math.abs(j);
                let jt = -vtan * 0.5; // equal mass factor
                if (jt > maxF) jt = maxF;
                if (jt < -maxF) jt = -maxF;
                const jtx = jt * tx, jty = jt * ty;
                a.vx += jtx; a.vy += jty;
                b.vx -= jtx; b.vy -= jty;
                // spin update from tangential impulse (disc: I = 0.5 m R^2, mass=1)
                const Ra = a.w * 0.5, Rb = b.w * 0.5;
                const SPIN_FACTOR = 0.35; // scale spin added by tangential impulse
                const dwA = SPIN_FACTOR * (2 * jt) / Math.max(1, Ra);
                const dwB = SPIN_FACTOR * (2 * jt) / Math.max(1, Rb);
                // directions: impulse opposite on B
                a.omega += dwA;
                b.omega -= dwB;
                // clamp excessive spin
                if (a.omega > OMEGA_MAX) a.omega = OMEGA_MAX; else if (a.omega < -OMEGA_MAX) a.omega = -OMEGA_MAX;
                if (b.omega > OMEGA_MAX) b.omega = OMEGA_MAX; else if (b.omega < -OMEGA_MAX) b.omega = -OMEGA_MAX;
              }
            }
          }
        }
      }

      // determine settled, cull if drained, and write DOM
      let moving = 0;
      for (const s of sprites){
        // remove if fully out the bottom (drain)
        if (s.y > H + 80){
          if (s.el && s.el.parentNode) s.el.parentNode.removeChild(s.el);
          s.settled = true; // mark as done
          continue;
        }
        const speedX = Math.abs(s.vx), speedY = Math.abs(s.vy);
        if (s.onGround && !s.collided && speedX < SETTLE_VEL*0.35 && speedY < SETTLE_VEL*0.35){
          s.restFrames++;
          if (s.restFrames > 12) s.settled = true;
        } else {
          s.restFrames = 0;
        }
        s.collided = false; // reset flag for next frame
        if (!s.settled) moving++;
        s.el.style.left = s.x + 'px';
        s.el.style.top = s.y + 'px';
        s.el.style.transform = 'rotate(' + s.angle + 'rad)';
      }

      if (allSettled || ts - startTime > MAX_SIM_TIME){
        // Success flash for the hint and auto-hide
        showSuccessHint();
        setTimeout(()=>{ container.remove(); triggered = false; }, 6000);
        running = false;
        return;
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function onClick(e){
    if (!isBackgroundTarget(e.target)) return;
    const now = Date.now();
    if (!startTs || now - startTs > MAX_INTERVAL){
      startTs = now; uniqueCells.clear();
    }
    const x = e.clientX;
    const y = e.clientY;
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    uniqueCells.add(cx + ',' + cy);
    // Show/update progress hint
    showProgressHint();
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hideProgressHint(); uniqueCells.clear(); startTs = 0; }, MAX_INTERVAL + 50);

    if (uniqueCells.size >= REQUIRED_CLICKS){
      spawnBallPit();
      uniqueCells.clear();
      startTs = 0;
      hideProgressHint(true);
    }
  }

  function isTyping(){
    const ae = document.activeElement;
    if (!ae) return false;
    const tag = ae.tagName?.toLowerCase();
    if (/input|textarea|select/.test(tag)) return true;
    if (ae.isContentEditable) return true;
    return false;
  }

  function onKey(e){
    if (isTyping()) return;
    // Press letter 'k' to instantly trigger the ball pit
    if ((e.key || '').toLowerCase() === 'k') {
      spawnBallPit();
    }
  }

  // Minimal CSS for the effect
  function injectCSS(){
    if (document.getElementById('ballpit-css')) return;
    const s = document.createElement('style');
    s.id = 'ballpit-css';
    s.textContent = `
      .ballpit-container{ position:fixed; inset:0; pointer-events:none; overflow:hidden; z-index:100000; }
      .ballpit-ball{ position:absolute; will-change: left, top; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35)); opacity:1; }

      .ballpit-hint{ position:fixed; bottom:12px; left:12px; z-index:100001; pointer-events:none;
        background: rgba(20,20,20,0.75); color:#fff; font: 600 12px/1.6 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        padding: 6px 8px; border-radius: 8px; opacity:0; transform: translateY(8px);
        transition: opacity .18s ease, transform .18s ease; }
      .ballpit-hint.show{ opacity:1; transform: translateY(0); }
      .ballpit-hint .bp-count{ font-weight:700; }
      .ballpit-hint.success{ background: rgba(16,120,16,0.9); }
    `;
    document.head.appendChild(s);
  }

  function ensureHint(){
    if (!hintEl){
      hintEl = document.createElement('div');
      hintEl.className = 'ballpit-hint';
      hintEl.innerHTML = '<span class="bp-count">0</span><span> / ' + REQUIRED_CLICKS + '</span>';
      document.body.appendChild(hintEl);
    }
  }

  function showProgressHint(){
    ensureHint();
    hintEl.classList.remove('success');
    const countSpan = hintEl.querySelector('.bp-count');
    if (countSpan) countSpan.textContent = String(uniqueCells.size);
    hintEl.classList.add('show');
  }

  function hideProgressHint(immediate){
    if (!hintEl) return;
    if (immediate){ hintEl.classList.remove('show'); return; }
    hintEl.classList.remove('show');
  }

  function showSuccessHint(){
    ensureHint();
    hintEl.classList.add('success','show');
    hintEl.textContent = '✓';
    setTimeout(()=>{ hideProgressHint(true); }, 900);
  }

  function init(){ injectCSS(); document.addEventListener('click', onClick, true); document.addEventListener('keydown', onKey, true); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
