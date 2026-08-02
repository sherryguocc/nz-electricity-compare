// ═══════════════════════════════════════════════
// STATE  (LANG is defined in zh.js / en.js before init runs)
// ═══════════════════════════════════════════════
const s = {
  cos: Array.from({length:3}, () => ({
    name: '', peakDays: 'all',
    peakStart: 7, peakEnd: 23,
    nonPeakDayRate: 'offpeak',
    wdPeakStart: 7,  wdPeakEnd: 23,
    wePeakStart: 9,  wePeakEnd: 21,
    weekdays: 21.5,  weekends: 8.5,
    peak2Start: 17,  peak2End: 21.5,
    pkgs: Array.from({length:4}, () => ({
      name:'', daily:'', isFlat:false, peak:'', offPeak:'', enabled:true
    }))
  })),
  mode: 'simple',
  sim: {total:'', peakPct:'40'},
  slots: Array(8).fill(''),
  hrs:   Array(24).fill(''),
};

let _aiCi = 0;
const peakOpen = [false, false, false];
const pkgOpen  = [false, false, false];

function togglePeak(ci) { peakOpen[ci] = !peakOpen[ci]; renderCos(); }
function togglePkgs(ci) { pkgOpen[ci]  = !pkgOpen[ci];  renderCos(); }

function addPkgSlot(ci) {
  const idx = s.cos[ci].pkgs.findIndex(p => !p.enabled && (p.name||'').trim() === '');
  if (idx === -1) return;
  s.cos[ci].pkgs[idx].enabled = true;
  if (idx >= 2) pkgOpen[ci] = true;
  renderCos(); renderResults();
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const f   = v => parseFloat(v) || 0;
const fmt = v => `$${v.toFixed(2)}`;
const esc = v => String(v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function isPeakHour(h, ps, pe) {
  if (ps <= pe) return h >= ps && h < pe;
  return h >= ps || h < pe;
}

function peakFrac(ps, pe) {
  if (ps === pe) return 0;
  if (ps < pe)  return (pe - ps) / 24;
  return (24 - ps + pe) / 24;
}

// ═══════════════════════════════════════════════
// CALCULATION
// ═══════════════════════════════════════════════
function getDailyPkOp(co) {
  const wd = f(co.weekdays) || 21.5;
  const we = f(co.weekends) || 8.5;

  if (s.mode === 'simple') {
    const total = f(s.sim.total);
    const d  = total / 30;
    const pp = f(s.sim.peakPct) / 100;
    if (co.peakDays === 'custom') {
      const wdF = peakFrac(co.wdPeakStart, co.wdPeakEnd);
      const weF = peakFrac(co.wePeakStart, co.wePeakEnd);
      return {custom:true, wdPk:d*wdF, wdOp:d*(1-wdF), wePk:d*weF, weOp:d*(1-weF), d};
    }
    if (co.peakDays === 'dual') {
      const tf = Math.min(peakFrac(co.peakStart, co.peakEnd) + peakFrac(co.peak2Start, co.peak2End), 1);
      return {pkPerDay:d*tf, opPerDay:d*(1-tf), d};
    }
    return {pkPerDay:d*pp, opPerDay:d*(1-pp), d};
  }

  let hrs;
  if (s.mode === 'hourly') {
    hrs = s.hrs.map(f);
  } else {
    hrs = Array(24).fill(0);
    s.slots.forEach((v,i) => {
      const ph = f(v)/3;
      for (let h=i*3; h<i*3+3; h++) hrs[h] = ph;
    });
  }
  const d = hrs.reduce((a,v)=>a+v, 0);

  if (co.peakDays === 'custom') {
    let wdPk=0, wePk=0;
    hrs.forEach((v,h) => {
      if (isPeakHour(h, co.wdPeakStart, co.wdPeakEnd)) wdPk += v;
      if (isPeakHour(h, co.wePeakStart, co.wePeakEnd)) wePk += v;
    });
    return {custom:true, wdPk, wdOp:d-wdPk, wePk, weOp:d-wePk, d};
  }
  if (co.peakDays === 'dual') {
    let pk=0, op=0;
    hrs.forEach((v,h) => (isPeakHour(h,co.peakStart,co.peakEnd)||isPeakHour(h,co.peak2Start,co.peak2End)) ? (pk+=v) : (op+=v));
    return {pkPerDay:pk, opPerDay:op, d};
  }
  let pk=0, op=0;
  hrs.forEach((v,h) => isPeakHour(h, co.peakStart, co.peakEnd) ? (pk+=v) : (op+=v));
  return {pkPerDay:pk, opPerDay:op, d};
}

function monthlyKwh(co) {
  const day = getDailyPkOp(co);
  const wd  = f(co.weekdays) || 21.5;
  const we  = f(co.weekends) || 8.5;
  if (co.peakDays === 'custom') {
    return {pk: day.wdPk*wd + day.wePk*we, op: day.wdOp*wd + day.weOp*we, tot: day.d*30};
  }
  if (co.peakDays === 'all' || co.peakDays === 'dual') {
    return {pk: day.pkPerDay*30, op: day.opPerDay*30, tot: day.d*30};
  }
  const pdC = co.peakDays==='weekday' ? wd : we;
  const odC = co.peakDays==='weekday' ? we : wd;
  const pkFP = day.pkPerDay * pdC;
  const opFP = day.opPerDay * pdC;
  const oKwh = day.d * odC;
  return co.nonPeakDayRate === 'peak'
    ? {pk: pkFP+oKwh, op: opFP,      tot: day.d*30}
    : {pk: pkFP,      op: opFP+oKwh, tot: day.d*30};
}

function calcPkg(co, pkg) {
  const u = monthlyKwh(co);
  const energy = pkg.isFlat
    ? u.tot * f(pkg.peak)
    : u.pk  * f(pkg.peak) + u.op * f(pkg.offPeak);
  const daily = f(pkg.daily) * 30;
  return {energy, daily, total:energy+daily, kwh:u.tot};
}

// ═══════════════════════════════════════════════
// SAVE / LOAD
// ═══════════════════════════════════════════════
function getSaved() {
  try { return JSON.parse(localStorage.getItem('nz-elec-saved')||'[]'); }
  catch { return []; }
}

function clearCompany(ci) {
  if (!confirm(LANG.confirmClear(ci+1))) return;
  s.cos[ci] = {
    name:'', peakDays:'all',
    peakStart:7, peakEnd:23, peak2Start:17, peak2End:21.5,
    nonPeakDayRate:'offpeak',
    wdPeakStart:7, wdPeakEnd:23, wePeakStart:9, wePeakEnd:21,
    weekdays:21.5, weekends:8.5,
    pkgs: Array.from({length:4}, () => ({name:'', daily:'', isFlat:false, peak:'', offPeak:'', enabled:true}))
  };
  renderCos(); renderResults();
  toast(LANG.toastCleared(ci+1));
}

function saveCompany(ci) {
  const co   = s.cos[ci];
  const name = (co.name || LANG.company(ci+1)).trim();
  const saved = getSaved();
  const idx   = saved.findIndex(p => p.name === name);
  const prof  = {
    id: idx >= 0 ? saved[idx].id : Date.now(),
    savedAt: new Date().toLocaleDateString(LANG.dateLocale),
    name, data: JSON.parse(JSON.stringify(co))
  };
  if (idx >= 0) saved[idx] = prof; else saved.push(prof);
  localStorage.setItem('nz-elec-saved', JSON.stringify(saved));
  toast(LANG.toastSaved(name));
  renderCos();
}

function makePeakKey(co) {
  return [co.peakDays, co.peakStart, co.peakEnd, co.peak2Start??'', co.peak2End??''].join('|');
}

function peakSettingsDiffer(a, b) {
  return ['peakDays','peakStart','peakEnd','peak2Start','peak2End',
          'wdPeakStart','wdPeakEnd','wePeakStart','wePeakEnd'].some(k =>
    b[k] !== undefined && a[k] !== b[k]
  );
}

function applyPeakSettings(a, b) {
  ['peakDays','peakStart','peakEnd','peak2Start','peak2End',
   'nonPeakDayRate','wdPeakStart','wdPeakEnd','wePeakStart','wePeakEnd',
   'weekdays','weekends'].forEach(k => { if (b[k] !== undefined) a[k] = b[k]; });
}

function loadCompany(ci, profileId) {
  if (!profileId) return;
  const profile = profileId.startsWith('preset-')
    ? PRESETS.find(p => p.id === profileId)
    : getSaved().find(p => String(p.id) === String(profileId));
  if (!profile) return;

  const cur     = s.cos[ci];
  const curName = (cur.name || '').trim();
  const inName  = (profile.data.name || '').trim();
  const inData  = profile.data;

  const hasPlanData = inData.pkgs.some(p =>
    p.enabled && ((p.daily !== '' && p.daily !== 0) || (p.peak !== '' && p.peak !== 0))
  );

  if (!hasPlanData) {
    if (curName && peakSettingsDiffer(cur, inData)) {
      if (!confirm(LANG.confirmPeakOnly(profile.name, ci+1))) { renderCos(); return; }
    }
    applyPeakSettings(cur, inData);
    if (!curName && inName) cur.name = inName;
    peakOpen[ci] = true;
    renderCos(); renderResults();
    toast(LANG.toastPeakUpdated(inName || profile.name));
    return;
  }

  if (!curName) {
    s.cos[ci] = JSON.parse(JSON.stringify(inData));
    renderCos(); renderResults();
    toast(LANG.toastLoaded(profile.name));
    return;
  }

  if (inName && curName !== inName) {
    alert(LANG.alertMismatch(curName, inName));
    renderCos();
    return;
  }

  if (peakSettingsDiffer(cur, inData)) {
    if (!confirm(LANG.confirmPeakMerge(profile.name, ci+1))) { renderCos(); return; }
    applyPeakSettings(cur, inData);
  }

  const inPeakKey = makePeakKey(inData);
  const inPlans   = inData.pkgs.filter(p => p.enabled);
  for (const plan of inPlans) {
    const planCopy = JSON.parse(JSON.stringify(plan));
    if (!plan.isFlat) planCopy._peakKey = inPeakKey;
    const emptyIdx = cur.pkgs.findIndex(p => (p.name || '').trim() === '');
    if (emptyIdx !== -1) {
      cur.pkgs[emptyIdx] = planCopy;
    } else {
      const slotList = cur.pkgs.map((p, i) => `${i+1}: ${p.name || LANG.unnamed}`).join('\n');
      const choice = prompt(LANG.promptOverwrite(plan.name, slotList));
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx <= 3) {
        cur.pkgs[idx] = planCopy;
      } else {
        toast(LANG.toastCancelled);
        renderCos();
        return;
      }
    }
  }

  renderCos(); renderResults();
  toast(LANG.toastMerged(ci+1));
}

// ═══════════════════════════════════════════════
// AI MODAL
// ═══════════════════════════════════════════════
function openAiModal(ci) {
  _aiCi = ci;
  const key = localStorage.getItem('nz-elec-openai-key') || '';
  document.getElementById('apiKeyInput').value = key;
  document.getElementById('saveKeyCheck').checked = !!key;
  document.getElementById('aiText').value = '';
  document.getElementById('aiStatus').innerHTML = '';
  document.getElementById('aiRunBtn').disabled = false;
  document.getElementById('aiRunBtn').textContent = LANG.aiRunBtn;
  document.getElementById('aiModal').classList.add('open');
}

function closeModal() {
  document.getElementById('aiModal').classList.remove('open');
}

function setAiStatus(type, msg) {
  const el = document.getElementById('aiStatus');
  el.style.color = type==='success' ? 'var(--green)' : type==='error' ? '#dc2626' : 'var(--muted)';
  el.textContent = msg;
}

async function runAI() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const text   = document.getElementById('aiText').value.trim();
  if (!apiKey) { setAiStatus('error', LANG.aiErrNoKey);  return; }
  if (!text)   { setAiStatus('error', LANG.aiErrNoText); return; }

  if (document.getElementById('saveKeyCheck').checked)
    localStorage.setItem('nz-elec-openai-key', apiKey);

  const btn = document.getElementById('aiRunBtn');
  btn.disabled = true;
  btn.textContent = LANG.aiRunningBtn;
  setAiStatus('loading', LANG.aiRunning);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{role:'user', content: LANG.aiPrompt(text)}],
        response_format: {type:'json_object'},
        max_tokens: 1200
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data   = await res.json();
    const result = JSON.parse(data.choices[0].message.content);
    applyAiResult(_aiCi, result);
    setAiStatus('success', LANG.aiSuccess);
    setTimeout(closeModal, 1400);
  } catch(e) {
    setAiStatus('error', LANG.aiFailed(e.message));
    btn.disabled = false;
    btn.textContent = LANG.aiRunBtn;
  }
}

function applyAiResult(ci, r) {
  const co = s.cos[ci];
  ['name','peakDays','peakStart','peakEnd','nonPeakDayRate',
   'wdPeakStart','wdPeakEnd','wePeakStart','wePeakEnd','weekdays','weekends']
    .forEach(k => { if (r[k] !== undefined) co[k] = r[k]; });
  if (Array.isArray(r.pkgs)) {
    const list = r.pkgs.slice(0,4);
    list.forEach((p,i) => {
      co.pkgs[i] = {name:p.name??'', daily:p.daily??'', isFlat:p.isFlat??false,
                    peak:p.peak??'', offPeak:p.offPeak??'', enabled:true};
    });
    for (let i = list.length; i < 4; i++) co.pkgs[i].enabled = false;
  }
  renderCos(); renderResults();
  toast(LANG.toastAiFilled(co.name || LANG.company(ci+1)));
}

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════
function setMode(m) {
  s.mode = m;
  document.querySelectorAll('.mb').forEach((b,i) => {
    b.classList.toggle('on', ['simple','slots','hourly'][i] === m);
  });
  renderUsage(); renderResults();
}

let _toastT = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  if (_toastT) clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

// Close modal on overlay click
document.getElementById('aiModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
