/**
 * AutoClicker – Standalone version for the demo page + Bookmarklet generator
 * Optimized for iPad (touch) + desktop.
 */
(function () {
  "use strict";

  // ---------- State ----------
  const state = {
    positions: [],          // { id, x, y, label }
    intervalMs: 500,
    maxClicks: 0,           // 0 = infinite
    running: false,
    paused: false,
    clickCount: 0,
    startTime: 0,
    elapsedBeforePause: 0,
    timerId: null,
    posIndex: 0,
    picking: false,
  };

  // ---------- DOM refs ----------
  const $ = (sel) => document.querySelector(sel);
  const panel = $("#ac-panel");
  const titlebar = $("#ac-titlebar");
  const body = $("#ac-body");
  const restoreBtn = $("#ac-restore");
  const positionsEl = $("#ac-positions");
  const overlay = $("#ac-picker-overlay");
  const statClicks = $("#ac-stat-clicks");
  const statTime = $("#ac-stat-time");
  const statStatus = $("#ac-stat-status");

  // ---------- Demo targets ----------
  let demoClicks = 0;
  document.querySelectorAll(".demo-target").forEach((btn) => {
    btn.addEventListener("click", () => {
      demoClicks++;
      $("#demo-click-count").textContent = demoClicks;
      btn.classList.add("hit");
      setTimeout(() => btn.classList.remove("hit"), 200);
    });
  });

  // ---------- Panel open / minimize / close ----------
  function showPanel() {
    panel.classList.remove("hidden", "minimized");
    restoreBtn.hidden = true;
    document.getElementById("ac-root").setAttribute("aria-hidden", "false");
  }
  function hidePanel() {
    panel.classList.add("hidden");
    restoreBtn.hidden = false;
    stopClicker();
  }
  function minimizePanel() {
    panel.classList.add("minimized");
    restoreBtn.hidden = false;
  }
  function restorePanel() {
    panel.classList.remove("hidden", "minimized");
    restoreBtn.hidden = true;
  }

  $("#btn-open-panel")?.addEventListener("click", showPanel);
  $("#ac-close").addEventListener("click", hidePanel);
  $("#ac-minimize").addEventListener("click", minimizePanel);
  restoreBtn.addEventListener("click", restorePanel);

  // Open panel by default after short delay so user sees it
  setTimeout(showPanel, 600);

  // ---------- Drag (touch + mouse) – only from titlebar ----------
  let drag = null;

  function onPointerDown(e) {
    // Only start drag from titlebar, ignore buttons
    if (e.target.closest(".ac-window-controls")) return;
    const isTouch = e.type.startsWith("touch");
    const pt = isTouch ? e.touches[0] : e;
    const rect = panel.getBoundingClientRect();
    drag = {
      startX: pt.clientX,
      startY: pt.clientY,
      origLeft: rect.left,
      origTop: rect.top,
      isTouch,
    };
    // Prevent page scroll while dragging
    if (isTouch) e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag) return;
    const pt = drag.isTouch ? e.touches[0] : e;
    if (!pt) return;
    if (drag.isTouch) e.preventDefault();

    const dx = pt.clientX - drag.startX;
    const dy = pt.clientY - drag.startY;
    let left = drag.origLeft + dx;
    let top = drag.origTop + dy;

    // Keep mostly on screen
    const maxX = window.innerWidth - 40;
    const maxY = window.innerHeight - 40;
    left = Math.max(-panel.offsetWidth + 60, Math.min(left, maxX));
    top = Math.max(0, Math.min(top, maxY));

    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
  }

  function onPointerUp() {
    drag = null;
  }

  titlebar.addEventListener("mousedown", onPointerDown);
  titlebar.addEventListener("touchstart", onPointerDown, { passive: false });
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);

  // ---------- Interval chips ----------
  document.querySelectorAll(".ac-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".ac-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.intervalMs = parseInt(chip.dataset.ms, 10);
    });
  });

  $("#ac-set-custom").addEventListener("click", () => {
    const val = parseInt($("#ac-custom-ms").value, 10);
    if (!isNaN(val) && val >= 50) {
      state.intervalMs = val;
      document.querySelectorAll(".ac-chip").forEach((c) => c.classList.remove("active"));
    }
  });

  // ---------- Positions ----------
  function renderPositions() {
    positionsEl.innerHTML = "";
    if (state.positions.length === 0) {
      positionsEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim)">Noch keine Positionen</div>';
      return;
    }
    state.positions.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "ac-pos-item";
      row.innerHTML = `
        <span class="coords">#${i + 1} · x:${Math.round(p.x)} y:${Math.round(p.y)}</span>
        <button type="button" data-id="${p.id}" title="Löschen">×</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        state.positions = state.positions.filter((x) => x.id !== p.id);
        renderPositions();
      });
      positionsEl.appendChild(row);
    });
  }

  $("#ac-pick").addEventListener("click", () => {
    state.picking = true;
    overlay.hidden = false;
    // Next click/touch anywhere (except on the panel) becomes a position
  });

  function handlePick(e) {
    if (!state.picking) return;
    // Ignore if inside the panel
    if (e.target.closest(".ac-panel") || e.target.closest(".ac-restore")) return;

    e.preventDefault();
    e.stopPropagation();

    const isTouch = e.type.startsWith("touch");
    const pt = isTouch ? e.changedTouches[0] : e;
    const x = pt.clientX;
    const y = pt.clientY;

    state.positions.push({
      id: Date.now() + Math.random(),
      x,
      y,
      label: `Pos ${state.positions.length + 1}`,
    });
    state.picking = false;
    overlay.hidden = true;
    renderPositions();
  }

  // Capture phase so we get the event before page handlers
  document.addEventListener("click", handlePick, true);
  document.addEventListener("touchend", handlePick, true);

  // ---------- Click simulation ----------
  function simulateClickAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;

    // Visual feedback
    const flash = document.createElement("div");
    flash.style.cssText = `
      position:fixed;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;
      border-radius:50%;border:2px solid #00f0c8;pointer-events:none;z-index:100002;
      animation:ac-flash 0.35s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    // Full event sequence for better compatibility
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

    try {
      el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 1, pointerType: "touch", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 1, pointerType: "touch", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
      // Fallback
      if (typeof el.click === "function") el.click();
    } catch (err) {
      try { el.click(); } catch (_) {}
    }
  }

  // CSS for flash
  const styleFlash = document.createElement("style");
  styleFlash.textContent = `
    @keyframes ac-flash {
      0% { transform: scale(0.6); opacity: 1; box-shadow: 0 0 0 0 rgba(0,240,200,0.6); }
      100% { transform: scale(1.8); opacity: 0; box-shadow: 0 0 0 16px rgba(0,240,200,0); }
    }
  `;
  document.head.appendChild(styleFlash);

  // ---------- Start / Pause / Stop ----------
  function updateStats() {
    statClicks.textContent = state.clickCount;
    const elapsed = state.running && !state.paused
      ? state.elapsedBeforePause + (performance.now() - state.startTime)
      : state.elapsedBeforePause;
    statTime.textContent = (elapsed / 1000).toFixed(1) + " s";
    if (state.running && !state.paused) {
      statStatus.textContent = "Läuft";
      statStatus.style.color = "var(--success)";
    } else if (state.paused) {
      statStatus.textContent = "Pause";
      statStatus.style.color = "#ffd166";
    } else {
      statStatus.textContent = "Bereit";
      statStatus.style.color = "";
    }
  }

  function tick() {
    if (!state.running || state.paused) return;
    if (state.positions.length === 0) {
      stopClicker();
      return;
    }

    const pos = state.positions[state.posIndex % state.positions.length];
    simulateClickAt(pos.x, pos.y);
    state.clickCount++;
    state.posIndex++;
    updateStats();

    if (state.maxClicks > 0 && state.clickCount >= state.maxClicks) {
      stopClicker();
      return;
    }

    state.timerId = setTimeout(tick, state.intervalMs);
  }

  function startClicker() {
    if (state.positions.length === 0) {
      alert("Bitte zuerst mindestens eine Klickposition auswählen.");
      return;
    }
    state.maxClicks = parseInt($("#ac-count").value, 10) || 0;
    if (!state.running) {
      state.clickCount = 0;
      state.posIndex = 0;
      state.elapsedBeforePause = 0;
    }
    state.running = true;
    state.paused = false;
    state.startTime = performance.now();
    $("#ac-start").disabled = true;
    $("#ac-pause").disabled = false;
    $("#ac-stop").disabled = false;
    updateStats();
    tick();
  }

  function pauseClicker() {
    if (!state.running || state.paused) return;
    state.paused = true;
    state.elapsedBeforePause += performance.now() - state.startTime;
    clearTimeout(state.timerId);
    $("#ac-start").disabled = false;
    $("#ac-pause").disabled = true;
    updateStats();
  }

  function stopClicker() {
    state.running = false;
    state.paused = false;
    clearTimeout(state.timerId);
    state.timerId = null;
    $("#ac-start").disabled = false;
    $("#ac-pause").disabled = true;
    $("#ac-stop").disabled = true;
    updateStats();
  }

  $("#ac-start").addEventListener("click", startClicker);
  $("#ac-pause").addEventListener("click", pauseClicker);
  $("#ac-stop").addEventListener("click", stopClicker);

  // Live timer while running
  setInterval(() => {
    if (state.running && !state.paused) updateStats();
  }, 200);

  // ---------- Bookmarklet code ----------
  function buildBookmarklet() {
    const code = `javascript:void(function(){
if(window.__acLoaded){window.__acToggle&&window.__acToggle();return;}
window.__acLoaded=1;
var S=document.createElement('style');
S.textContent=\`.acp{position:fixed;z-index:2147483646;top:60px;right:12px;width:300px;max-width:calc(100vw - 20px);background:rgba(18,18,26,.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(0,240,200,.3);border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#e8e8f0;font-size:13px;overflow:hidden;touch-action:none}
.acp *{box-sizing:border-box}
.acp-h{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:linear-gradient(180deg,rgba(0,240,200,.12),transparent);border-bottom:1px solid rgba(0,240,200,.15);cursor:grab;user-select:none;-webkit-user-select:none}
.acp-t{font-weight:700;color:#00f0c8}
.acp-x{width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#fff;font-size:16px}
.acp-b{padding:12px;max-height:65vh;overflow-y:auto}
.acp button{min-height:40px;border-radius:9px;border:1px solid #2a2a3a;background:#1a1a26;color:#e8e8f0;font-weight:600;font-size:13px;cursor:pointer}
.acp .go{background:#00f0c8;color:#04120f;border:0;width:100%;margin-top:8px}
.acp .row{display:flex;gap:6px;margin-top:8px}
.acp .row button{flex:1}
.acp input{width:100%;min-height:38px;background:#0d0d14;border:1px solid #2a2a3a;border-radius:8px;color:#fff;padding:0 10px;margin-top:6px}
.acp .pos{font-size:12px;color:#9898b0;margin:4px 0}
.acp .st{font-size:12px;color:#9898b0;margin-top:8px}
.acr{position:fixed;bottom:24px;right:18px;width:48px;height:48px;border-radius:50%;border:2px solid #00f0c8;background:rgba(18,18,26,.9);color:#00f0c8;font-size:20px;z-index:2147483647;box-shadow:0 0 20px rgba(0,240,200,.35);display:none}
.aco{position:fixed;inset:0;background:rgba(0,20,18,.5);z-index:2147483645;display:flex;align-items:flex-start;justify-content:center;padding-top:18%;}
.aco span{background:#12121a;border:1px solid #00f0c8;color:#00f0c8;padding:12px 18px;border-radius:10px;font-weight:600}\`;
document.documentElement.appendChild(S);
var root=document.createElement('div');
root.innerHTML=\`<div class="acp" id="acp"><div class="acp-h" id="acph"><span class="acp-t">AutoClicker</span><button class="acp-x" id="acpx">×</button></div><div class="acp-b"><button id="acpick" style="width:100%">Klickposition auswählen</button><div id="acpos" class="pos">Noch keine Position</div><label style="font-size:11px;color:#9898b0">Intervall (ms)</label><input id="acms" type="number" value="500" min="50"><label style="font-size:11px;color:#9898b0;display:block;margin-top:8px">Anzahl (0=∞)</label><input id="accnt" type="number" value="0" min="0"><div class="row"><button id="acstart" class="go">Start</button><button id="acpause">Pause</button><button id="acstop">Stop</button></div><div class="st">Klicks: <b id="acsc">0</b> · Zeit: <b id="acst">0 s</b> · <b id="acss">Bereit</b></div></div></div><button class="acr" id="acr">●</button><div class="aco" id="aco" style="display:none"><span>Tippe auf die Position</span></div>\`;
document.documentElement.appendChild(root);
var P={pos:[],run:0,pau:0,cnt:0,t0:0,acc:0,tid:0,idx:0,pick:0};
var panel=document.getElementById('acp'),head=document.getElementById('acph');
function sim(x,y){var el=document.elementFromPoint(x,y);if(!el)return;var o={bubbles:true,cancelable:true,view:window,clientX:x,clientY:y};try{el.dispatchEvent(new PointerEvent('pointerdown',Object.assign({},o,{pointerId:1,pointerType:'touch',isPrimary:true})));el.dispatchEvent(new MouseEvent('mousedown',o));el.dispatchEvent(new PointerEvent('pointerup',Object.assign({},o,{pointerId:1,pointerType:'touch',isPrimary:true})));el.dispatchEvent(new MouseEvent('mouseup',o));el.dispatchEvent(new MouseEvent('click',o));if(el.click)el.click()}catch(e){try{el.click()}catch(_){}}}
function upd(){document.getElementById('acsc').textContent=P.cnt;var e=P.run&&!P.pau?P.acc+(performance.now()-P.t0):P.acc;document.getElementById('acst').textContent=(e/1000).toFixed(1)+' s';document.getElementById('acss').textContent=P.run&&!P.pau?'Läuft':P.pau?'Pause':'Bereit'}
function tick(){if(!P.run||P.pau||!P.pos.length)return;var p=P.pos[P.idx%P.pos.length];sim(p.x,p.y);P.cnt++;P.idx++;upd();var max=+document.getElementById('accnt').value||0;if(max>0&&P.cnt>=max){stop();return}P.tid=setTimeout(tick,+document.getElementById('acms').value||500)}
function start(){if(!P.pos.length){alert('Zuerst Position wählen');return}if(!P.run){P.cnt=0;P.idx=0;P.acc=0}P.run=1;P.pau=0;P.t0=performance.now();tick()}
function pause(){if(!P.run||P.pau)return;P.pau=1;P.acc+=performance.now()-P.t0;clearTimeout(P.tid);upd()}
function stop(){P.run=0;P.pau=0;clearTimeout(P.tid);upd()}
document.getElementById('acstart').onclick=start;
document.getElementById('acpause').onclick=pause;
document.getElementById('acstop').onclick=stop;
document.getElementById('acpx').onclick=function(){panel.style.display='none';document.getElementById('acr').style.display='block';stop()};
document.getElementById('acr').onclick=function(){panel.style.display='block';this.style.display='none'};
document.getElementById('acpick').onclick=function(){P.pick=1;document.getElementById('aco').style.display='flex'};
function onPick(e){if(!P.pick)return;if(e.target.closest&&e.target.closest('.acp'))return;e.preventDefault();e.stopPropagation();var t=e.changedTouches?e.changedTouches[0]:e;P.pos.push({x:t.clientX,y:t.clientY});P.pick=0;document.getElementById('aco').style.display='none';document.getElementById('acpos').textContent=P.pos.length+' Position(en)';}
document.addEventListener('click',onPick,true);document.addEventListener('touchend',onPick,true);
var d=null;
head.addEventListener('touchstart',function(e){if(e.target.closest('.acp-x'))return;var t=e.touches[0];var r=panel.getBoundingClientRect();d={x:t.clientX,y:t.clientY,l:r.left,t:r.top};e.preventDefault()},{passive:false});
head.addEventListener('mousedown',function(e){if(e.target.closest('.acp-x'))return;var r=panel.getBoundingClientRect();d={x:e.clientX,y:e.clientY,l:r.left,t:r.top}});
window.addEventListener('touchmove',function(e){if(!d)return;var t=e.touches[0];panel.style.left=(d.l+t.clientX-d.x)+'px';panel.style.top=(d.t+t.clientY-d.y)+'px';panel.style.right='auto';e.preventDefault()},{passive:false});
window.addEventListener('mousemove',function(e){if(!d)return;panel.style.left=(d.l+e.clientX-d.x)+'px';panel.style.top=(d.t+e.clientY-d.y)+'px';panel.style.right='auto'});
window.addEventListener('touchend',function(){d=null});window.addEventListener('mouseup',function(){d=null});
window.__acToggle=function(){if(panel.style.display==='none'){panel.style.display='block';document.getElementById('acr').style.display='none'}else{panel.style.display='none';document.getElementById('acr').style.display='block';stop()}};
})();`;
    return code;
  }

  const bmCode = buildBookmarklet();
  const ta = $("#bookmarklet-code");
  if (ta) ta.value = bmCode;

  $("#btn-copy-bookmarklet")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(bmCode);
      const btn = $("#btn-copy-bookmarklet");
      const old = btn.textContent;
      btn.textContent = "Kopiert!";
      setTimeout(() => (btn.textContent = old), 1800);
    } catch {
      ta.select();
      document.execCommand("copy");
      alert("Code markiert – bitte manuell kopieren (Strg/Cmd+C).");
    }
  });

  // Initial render
  renderPositions();
  updateStats();
})();
