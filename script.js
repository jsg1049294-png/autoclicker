/**
 * AutoClicker – Standalone + Bookmarklet
 * Visible click markers + improved settings
 */
(function () {
  "use strict";

  const state = {
    positions: [],
    intervalMs: 500,
    maxClicks: 0,
    running: false,
    paused: false,
    clickCount: 0,
    startTime: 0,
    elapsedBeforePause: 0,
    timerId: null,
    posIndex: 0,
    picking: false,
  };

  const $ = (sel) => document.querySelector(sel);
  const panel = $("#ac-panel");
  const titlebar = $("#ac-titlebar");
  const restoreBtn = $("#ac-restore");
  const positionsEl = $("#ac-positions");
  const overlay = $("#ac-picker-overlay");
  const statClicks = $("#ac-stat-clicks");
  const statTime = $("#ac-stat-time");
  const statStatus = $("#ac-stat-status");
  const intervalDisplay = $("#ac-interval-display");
  const nextPosWrap = $("#ac-next-pos-wrap");
  const nextPosEl = $("#ac-next-pos");
  const clearPosBtn = $("#ac-clear-pos");

  // Demo targets
  let demoClicks = 0;
  document.querySelectorAll(".demo-target").forEach((btn) => {
    btn.addEventListener("click", () => {
      demoClicks++;
      $("#demo-click-count").textContent = demoClicks;
      btn.classList.add("hit");
      setTimeout(() => btn.classList.remove("hit"), 200);
    });
  });

  // Panel show / hide / minimize
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
  setTimeout(showPanel, 500);

  // Drag only from titlebar
  let drag = null;
  function onPointerDown(e) {
    if (e.target.closest(".ac-window-controls")) return;
    const isTouch = e.type.startsWith("touch");
    const pt = isTouch ? e.touches[0] : e;
    const rect = panel.getBoundingClientRect();
    drag = { startX: pt.clientX, startY: pt.clientY, origLeft: rect.left, origTop: rect.top, isTouch };
    if (isTouch) e.preventDefault();
  }
  function onPointerMove(e) {
    if (!drag) return;
    const pt = drag.isTouch ? e.touches[0] : e;
    if (!pt) return;
    if (drag.isTouch) e.preventDefault();
    let left = drag.origLeft + (pt.clientX - drag.startX);
    let top = drag.origTop + (pt.clientY - drag.startY);
    left = Math.max(-panel.offsetWidth + 60, Math.min(left, window.innerWidth - 40));
    top = Math.max(0, Math.min(top, window.innerHeight - 40));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
  }
  function onPointerUp() { drag = null; }
  titlebar.addEventListener("mousedown", onPointerDown);
  titlebar.addEventListener("touchstart", onPointerDown, { passive: false });
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);

  // Interval
  function formatInterval(ms) {
    if (ms < 1000) return (ms / 1000).toString().replace(".", ",") + " s";
    if (ms % 1000 === 0) return ms / 1000 + " s";
    return (ms / 1000).toFixed(2).replace(".", ",") + " s";
  }
  function setIntervalMs(ms) {
    state.intervalMs = ms;
    if (intervalDisplay) intervalDisplay.textContent = formatInterval(ms);
  }
  document.querySelectorAll(".ac-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".ac-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      setIntervalMs(parseInt(chip.dataset.ms, 10));
    });
  });
  $("#ac-set-custom").addEventListener("click", () => {
    const val = parseInt($("#ac-custom-ms").value, 10);
    if (!isNaN(val) && val >= 50) {
      setIntervalMs(val);
      document.querySelectorAll(".ac-chip").forEach((c) => c.classList.remove("active"));
    }
  });

  // ----- Position markers on screen -----
  function removeAllMarkers() {
    document.querySelectorAll(".ac-marker").forEach((m) => m.remove());
  }
  function placeMarkers() {
    removeAllMarkers();
    state.positions.forEach((p, i) => {
      const m = document.createElement("div");
      m.className = "ac-marker";
      m.id = "ac-marker-" + p.id;
      m.textContent = String(i + 1);
      m.style.left = p.x + "px";
      m.style.top = p.y + "px";
      document.body.appendChild(m);
    });
  }
  function highlightMarker(index) {
    document.querySelectorAll(".ac-marker").forEach((m, i) => {
      m.classList.toggle("active", i === index);
    });
    document.querySelectorAll(".ac-pos-item").forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });
  }

  function renderPositions() {
    positionsEl.innerHTML = "";
    if (state.positions.length === 0) {
      positionsEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:4px 0">Noch keine Positionen – tippe oben auf den Button</div>';
      if (clearPosBtn) clearPosBtn.hidden = true;
      removeAllMarkers();
      return;
    }
    if (clearPosBtn) clearPosBtn.hidden = false;
    state.positions.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "ac-pos-item";
      row.innerHTML = `
        <span class="ac-pos-num">${i + 1}</span>
        <span class="coords">x:${Math.round(p.x)} · y:${Math.round(p.y)}</span>
        <button type="button" title="Löschen">×</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        state.positions = state.positions.filter((x) => x.id !== p.id);
        renderPositions();
        placeMarkers();
      });
      positionsEl.appendChild(row);
    });
    placeMarkers();
  }

  clearPosBtn?.addEventListener("click", () => {
    state.positions = [];
    renderPositions();
    if (state.running) stopClicker();
  });

  $("#ac-pick").addEventListener("click", () => {
    state.picking = true;
    overlay.hidden = false;
  });

  function handlePick(e) {
    if (!state.picking) return;
    if (e.target.closest(".ac-panel") || e.target.closest(".ac-restore") || e.target.closest(".ac-marker")) return;
    e.preventDefault();
    e.stopPropagation();
    const isTouch = e.type.startsWith("touch");
    const pt = isTouch ? e.changedTouches[0] : e;
    state.positions.push({
      id: Date.now() + Math.random(),
      x: pt.clientX,
      y: pt.clientY,
    });
    state.picking = false;
    overlay.hidden = true;
    renderPositions();
  }
  document.addEventListener("click", handlePick, true);
  document.addEventListener("touchend", handlePick, true);

  // ----- Visible click pulse -----
  function showClickPulse(x, y) {
    const pulse = document.createElement("div");
    pulse.className = "ac-click-pulse";
    pulse.style.left = x + "px";
    pulse.style.top = y + "px";
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 600);
  }

  function simulateClickAt(x, y) {
    showClickPulse(x, y);
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    try {
      el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 1, pointerType: "touch", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 1, pointerType: "touch", isPrimary: true }));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
      if (typeof el.click === "function") el.click();
    } catch (err) {
      try { el.click(); } catch (_) {}
    }
  }

  // Stats & controls
  function updateStats() {
    statClicks.textContent = state.clickCount;
    const elapsed = state.running && !state.paused
      ? state.elapsedBeforePause + (performance.now() - state.startTime)
      : state.elapsedBeforePause;
    statTime.textContent = (elapsed / 1000).toFixed(1).replace(".", ",") + " s";
    if (state.running && !state.paused) {
      statStatus.textContent = "Läuft";
      statStatus.style.color = "var(--success)";
      if (nextPosWrap && state.positions.length) {
        nextPosWrap.hidden = false;
        const next = (state.posIndex % state.positions.length) + 1;
        nextPosEl.textContent = "#" + next;
      }
    } else if (state.paused) {
      statStatus.textContent = "Pause";
      statStatus.style.color = "#ffd166";
    } else {
      statStatus.textContent = "Bereit";
      statStatus.style.color = "";
      if (nextPosWrap) nextPosWrap.hidden = true;
    }
  }

  function tick() {
    if (!state.running || state.paused) return;
    if (state.positions.length === 0) {
      stopClicker();
      return;
    }
    const idx = state.posIndex % state.positions.length;
    const pos = state.positions[idx];
    highlightMarker(idx);
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
    $("#ac-stop").disabled = true;
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
    document.querySelectorAll(".ac-marker").forEach((m) => m.classList.remove("active"));
    document.querySelectorAll(".ac-pos-item").forEach((el) => el.classList.remove("active"));
    updateStats();
  }

  $("#ac-start").addEventListener("click", startClicker);
  $("#ac-pause").addEventListener("click", pauseClicker);
  $("#ac-stop").addEventListener("click", stopClicker);
  setInterval(() => { if (state.running && !state.paused) updateStats(); }, 200);

  window.addEventListener("resize", placeMarkers);

  // ---------- Bookmarklet (with visible markers + pulse) ----------
  function buildBookmarklet() {
    return `javascript:void(function(){
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
.acp .go{background:#00f0c8;color:#04120f;border:0;flex:1.3}
.acp .row{display:flex;gap:6px;margin-top:8px}
.acp .row button{flex:1}
.acp input{width:100%;min-height:38px;background:#0d0d14;border:1px solid #2a2a3a;border-radius:8px;color:#fff;padding:0 10px;margin-top:4px}
.acp .pos{font-size:12px;color:#9898b0;margin:6px 0}
.acp .st{font-size:12px;color:#9898b0;margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px}
.acp .lab{font-size:11px;color:#9898b0;text-transform:uppercase;letter-spacing:.04em;margin-top:8px}
.acr{position:fixed;bottom:24px;right:18px;width:48px;height:48px;border-radius:50%;border:2px solid #00f0c8;background:rgba(18,18,26,.9);color:#00f0c8;font-size:20px;z-index:2147483647;box-shadow:0 0 20px rgba(0,240,200,.35);display:none}
.aco{position:fixed;inset:0;background:rgba(0,20,18,.5);z-index:2147483645;display:flex;align-items:flex-start;justify-content:center;padding-top:18%}
.aco span{background:#12121a;border:1px solid #00f0c8;color:#00f0c8;padding:12px 18px;border-radius:10px;font-weight:600}
.acm{position:fixed;width:28px;height:28px;margin-left:-14px;margin-top:-14px;border-radius:50%;background:rgba(0,240,200,.9);color:#04120f;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2147483644;box-shadow:0 0 0 3px rgba(0,240,200,.35),0 4px 12px rgba(0,0,0,.4);font-family:-apple-system,sans-serif}
.acm.on{transform:scale(1.15);box-shadow:0 0 0 4px rgba(0,240,200,.5),0 0 18px rgba(0,240,200,.45)}
.acpulse{position:fixed;width:48px;height:48px;margin-left:-24px;margin-top:-24px;border-radius:50%;border:3px solid #00f0c8;background:rgba(0,240,200,.25);pointer-events:none;z-index:2147483645;animation:acp 0.55s ease-out forwards}
@keyframes acp{0%{transform:scale(.35);opacity:1}70%{transform:scale(1.2);opacity:.7}100%{transform:scale(1.6);opacity:0}}\`;
document.documentElement.appendChild(S);
var root=document.createElement('div');
root.innerHTML=\`<div class="acp" id="acp"><div class="acp-h" id="acph"><span class="acp-t">AutoClicker</span><button class="acp-x" id="acpx">×</button></div><div class="acp-b"><button id="acpick" style="width:100%;background:rgba(0,240,200,.12);border-color:rgba(0,240,200,.35);color:#00f0c8">+ Klickposition auswählen</button><div id="acpos" class="pos">Noch keine Position</div><button id="acclr" style="width:100%;margin-top:4px;font-size:12px;min-height:34px;display:none">Alle löschen</button><div class="lab">Intervall (ms)</div><input id="acms" type="number" value="500" min="50"><div class="lab">Anzahl (0 = unendlich)</div><input id="accnt" type="number" value="0" min="0"><div class="row"><button id="acstart" class="go">▶ Start</button><button id="acpause">⏸</button><button id="acstop">■</button></div><div class="st"><span>Klicks <b id="acsc">0</b></span><span>Zeit <b id="acst">0 s</b></span><span style="grid-column:1/-1">Status <b id="acss">Bereit</b></span></div></div></div><button class="acr" id="acr">●</button><div class="aco" id="aco" style="display:none"><span>Tippe auf die Position</span></div>\`;
document.documentElement.appendChild(root);
var P={pos:[],run:0,pau:0,cnt:0,t0:0,acc:0,tid:0,idx:0,pick:0};
var panel=document.getElementById('acp'),head=document.getElementById('acph');
function markers(){document.querySelectorAll('.acm').forEach(function(m){m.remove()});P.pos.forEach(function(p,i){var m=document.createElement('div');m.className='acm';m.textContent=String(i+1);m.style.left=p.x+'px';m.style.top=p.y+'px';document.body.appendChild(m);});}
function pulse(x,y){var d=document.createElement('div');d.className='acpulse';d.style.left=x+'px';d.style.top=y+'px';document.body.appendChild(d);setTimeout(function(){d.remove()},600);}
function sim(x,y){pulse(x,y);var el=document.elementFromPoint(x,y);if(!el)return;var o={bubbles:true,cancelable:true,view:window,clientX:x,clientY:y};try{el.dispatchEvent(new PointerEvent('pointerdown',Object.assign({},o,{pointerId:1,pointerType:'touch',isPrimary:true})));el.dispatchEvent(new MouseEvent('mousedown',o));el.dispatchEvent(new PointerEvent('pointerup',Object.assign({},o,{pointerId:1,pointerType:'touch',isPrimary:true})));el.dispatchEvent(new MouseEvent('mouseup',o));el.dispatchEvent(new MouseEvent('click',o));if(el.click)el.click()}catch(e){try{el.click()}catch(_){}}}
function upd(){document.getElementById('acsc').textContent=P.cnt;var e=P.run&&!P.pau?P.acc+(performance.now()-P.t0):P.acc;document.getElementById('acst').textContent=(e/1000).toFixed(1)+' s';document.getElementById('acss').textContent=P.run&&!P.pau?'Läuft':P.pau?'Pause':'Bereit'}
function tick(){if(!P.run||P.pau||!P.pos.length)return;var i=P.idx%P.pos.length;var p=P.pos[i];document.querySelectorAll('.acm').forEach(function(m,j){m.classList.toggle('on',j===i)});sim(p.x,p.y);P.cnt++;P.idx++;upd();var max=+document.getElementById('accnt').value||0;if(max>0&&P.cnt>=max){stop();return}P.tid=setTimeout(tick,+document.getElementById('acms').value||500)}
function start(){if(!P.pos.length){alert('Zuerst Position wählen');return}if(!P.run){P.cnt=0;P.idx=0;P.acc=0}P.run=1;P.pau=0;P.t0=performance.now();tick()}
function pause(){if(!P.run||P.pau)return;P.pau=1;P.acc+=performance.now()-P.t0;clearTimeout(P.tid);upd()}
function stop(){P.run=0;P.pau=0;clearTimeout(P.tid);document.querySelectorAll('.acm').forEach(function(m){m.classList.remove('on')});upd()}
document.getElementById('acstart').onclick=start;
document.getElementById('acpause').onclick=pause;
document.getElementById('acstop').onclick=stop;
document.getElementById('acpx').onclick=function(){panel.style.display='none';document.getElementById('acr').style.display='block';stop()};
document.getElementById('acr').onclick=function(){panel.style.display='block';this.style.display='none'};
document.getElementById('acpick').onclick=function(){P.pick=1;document.getElementById('aco').style.display='flex'};
document.getElementById('acclr').onclick=function(){P.pos=[];markers();document.getElementById('acpos').textContent='Noch keine Position';this.style.display='none';stop()};
function onPick(e){if(!P.pick)return;if(e.target.closest&&e.target.closest('.acp'))return;e.preventDefault();e.stopPropagation();var t=e.changedTouches?e.changedTouches[0]:e;P.pos.push({x:t.clientX,y:t.clientY});P.pick=0;document.getElementById('aco').style.display='none';document.getElementById('acpos').textContent=P.pos.length+' Position(en)';document.getElementById('acclr').style.display='block';markers();}
document.addEventListener('click',onPick,true);document.addEventListener('touchend',onPick,true);
var d=null;
head.addEventListener('touchstart',function(e){if(e.target.closest('.acp-x'))return;var t=e.touches[0];var r=panel.getBoundingClientRect();d={x:t.clientX,y:t.clientY,l:r.left,t:r.top};e.preventDefault()},{passive:false});
head.addEventListener('mousedown',function(e){if(e.target.closest('.acp-x'))return;var r=panel.getBoundingClientRect();d={x:e.clientX,y:e.clientY,l:r.left,t:r.top}});
window.addEventListener('touchmove',function(e){if(!d)return;var t=e.touches[0];panel.style.left=(d.l+t.clientX-d.x)+'px';panel.style.top=(d.t+t.clientY-d.y)+'px';panel.style.right='auto';e.preventDefault()},{passive:false});
window.addEventListener('mousemove',function(e){if(!d)return;panel.style.left=(d.l+e.clientX-d.x)+'px';panel.style.top=(d.t+e.clientY-d.y)+'px';panel.style.right='auto'});
window.addEventListener('touchend',function(){d=null});window.addEventListener('mouseup',function(){d=null});
window.__acToggle=function(){if(panel.style.display==='none'){panel.style.display='block';document.getElementById('acr').style.display='none'}else{panel.style.display='none';document.getElementById('acr').style.display='block';stop()}};
})();`;
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
      alert("Code markiert – bitte manuell kopieren.");
    }
  });

  renderPositions();
  updateStats();
  setIntervalMs(500);
})();
