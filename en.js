// ═══════════════════════════════════════════════
// LANG — English strings used by common.js
// ═══════════════════════════════════════════════
const LANG = {
  dateLocale:       'en-NZ',
  company:          n    => `Provider ${n}`,
  pkg:              n    => `Plan ${n}`,
  unnamed:          '(unnamed)',
  confirmClear:     n    => `Clear all inputs for Provider ${n}?`,
  toastCleared:     n    => `✓ Provider ${n} cleared`,
  toastSaved:       name => `✓ Saved "${name}"`,
  confirmPeakOnly:  (pName, n) => `"${pName}" has different peak hours than Provider ${n}'s current settings. Overwrite peak settings?`,
  toastPeakUpdated: name => `✓ Peak settings updated for "${name}"`,
  toastLoaded:      name => `✓ Loaded "${name}"`,
  confirmPeakMerge: (pName, n) => `"${pName}" has different peak hours than Provider ${n}'s current settings. Merging will also update the peak hours. Continue?`,
  alertMismatch:    (cur, inN) => `⚠️ Cannot merge: Provider is "${cur}" but the profile belongs to "${inN}".\nClear the provider first, or choose a profile from the same company.`,
  promptOverwrite:  (pName, list) => `All plan slots are taken. Where should "${pName}" go?\n\n${list}\n\nEnter 1–4 (cancel to skip):`,
  toastMerged:      n    => `✓ Merged plans into Provider ${n}`,
  toastCancelled:   'Cancelled',
  aiRunBtn:         '✨ Extract & Fill',
  aiRunningBtn:     'Extracting…',
  aiRunning:        'Calling AI, please wait…',
  aiSuccess:        '✓ Extraction successful — form filled in!',
  aiFailed:         msg  => `Failed: ${msg}`,
  aiErrNoKey:       'Please enter your OpenAI API Key',
  aiErrNoText:      'Please paste some pricing page text',
  toastAiFilled:    name => `✓ Filled in "${name}"`,
  aiPrompt: text => `You are a New Zealand electricity pricing data extractor. Extract plan pricing from the text below and return a JSON object.

JSON format:
{
  "name": "company name",
  "peakDays": "all"|"weekday"|"weekend"|"custom",
  "peakStart": 7, "peakEnd": 23,
  "nonPeakDayRate": "offpeak"|"peak",
  "wdPeakStart": 7, "wdPeakEnd": 23,
  "wePeakStart": 9, "wePeakEnd": 21,
  "weekdays": 21.5, "weekends": 8.5,
  "pkgs": [{"name":"plan name","daily":1.50,"isFlat":false,"peak":0.28,"offPeak":0.15,"enabled":true}]
}

Rules:
- peakDays: "all"=every day, "weekday"=weekdays only, "weekend"=weekends only, "custom"=different windows for each
- Convert rates to NZD/kWh (cents ÷ 100); daily charge in NZD/day
- Flat rate: isFlat=true, same value for peak and offPeak
- Up to 4 plans; use sensible defaults for missing fields

Text:
${text}`,
};

// ═══════════════════════════════════════════════
// RENDER: COMPANIES
// ═══════════════════════════════════════════════
function peakSummary(co) {
  const fmtT = h => `${Math.floor(h)}:${h%1?'30':'00'}`;
  switch(co.peakDays) {
    case 'all':     return `Every day · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)}`;
    case 'dual':    return `Dual peak · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)} / ${fmtT(co.peak2Start)}–${fmtT(co.peak2End)}`;
    case 'weekday': return `Weekdays only · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)}`;
    case 'weekend': return `Weekends only · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)}`;
    case 'custom':  return `Custom · Weekday ${fmtT(co.wdPeakStart)}–${fmtT(co.wdPeakEnd)} / Weekend ${fmtT(co.wePeakStart)}–${fmtT(co.wePeakEnd)}`;
    default:        return 'Peak hours';
  }
}

function renderCos() {
  const saved = getSaved();
  document.getElementById('coGrid').innerHTML = s.cos.map((co,ci) => {
    const col = COLORS[ci];
    const pd  = co.peakDays;
    const showExtra  = pd !== 'all' && pd !== 'dual';
    const showCustom = pd === 'custom';
    const showDual   = pd === 'dual';
    const otherLabel = pd==='weekday' ? 'Weekends/holidays' : (pd==='weekend' ? 'Weekdays' : '');
    const isOpen     = peakOpen[ci];
    const isPkgOpen  = pkgOpen[ci];

    const topPkgRows = co.pkgs.slice(0,2).map((p,pi) => {
      return (!p.enabled && (p.name||'').trim()==='') ? '' : renderPkgRow(ci,pi,p);
    }).join('');
    const extraPkgs   = co.pkgs.slice(2);
    const extraActive = extraPkgs.filter(p => p.enabled && ((p.name||'').trim() || p.daily || p.peak)).length;
    const extraRows   = isPkgOpen ? extraPkgs.map((p,pi) => {
      return (!p.enabled && (p.name||'').trim()==='') ? '' : renderPkgRow(ci,pi+2,p);
    }).join('') : '';
    const emptyInTop   = co.pkgs.slice(0,2).filter(p => !p.enabled && (p.name||'').trim()==='').length;
    const emptyInExtra = extraPkgs.filter(p => !p.enabled && (p.name||'').trim()==='').length;

    return `
    <div class="co-box">
      <div class="co-head" style="background:${col}15">
        <span class="co-dot" style="background:${col}"></span>
        <input class="co-name" style="color:${col}" placeholder="Provider ${ci+1}" value="${esc(co.name)}"
          oninput="s.cos[${ci}].name=this.value;renderResults()">
        <button class="hbtn ai ico" onclick="openAiModal(${ci})" title="AI fill">✨</button>
        <button class="hbtn ico" onclick="saveCompany(${ci})" title="Save">💾</button>
        <button class="hbtn ico" onclick="clearCompany(${ci})" title="Clear">🗑</button>
        <select class="load-sel" onchange="loadCompany(${ci},this.value)">
          <option value="">📂 Load…</option>
          <optgroup label="Built-in presets">
            ${PRESETS.map(p=>`<option value="${p.id}">📋 ${esc(p.name)}</option>`).join('')}
          </optgroup>
          ${saved.length?`<optgroup label="My saved">${saved.map(p=>`<option value="${p.id}">💾 ${esc(p.name)} (${p.savedAt})</option>`).join('')}</optgroup>`:''}
        </select>
      </div>

      <div class="peak-toggle" onclick="togglePeak(${ci})">
        <span>⚡ Peak: ${peakSummary(co)}</span>
        <span class="peak-chev">${isOpen?'▲':'▼'}</span>
      </div>

      ${isOpen ? `<div class="co-peak">
        <div class="prow">
          <span>Peak applies:</span>
          <div class="rg">
            ${[['all','Every day'],['dual','Dual peak'],['weekday','Weekdays only'],['weekend','Weekends only'],['custom','Custom']].map(([v,l])=>`
              <label class="ro"><input type="radio" name="pd${ci}" value="${v}" ${pd===v?'checked':''}
                onchange="s.cos[${ci}].peakDays=this.value;renderCos();renderResults()">${l}</label>
            `).join('')}
          </div>
        </div>

        ${!showCustom && !showDual ? `
        <div class="prow">
          <span>Peak hours:</span>
          <input type="number" class="numinput" min="0" max="23" value="${co.peakStart}"
            oninput="s.cos[${ci}].peakStart=+this.value;renderResults()">
          <span>:00 to</span>
          <input type="number" class="numinput" min="0" max="24" value="${co.peakEnd}"
            oninput="s.cos[${ci}].peakEnd=+this.value;renderResults()">
          <span>:00</span>
        </div>` : ''}

        ${showDual ? `
        <div class="prow">
          <span>Peak window 1:</span>
          <input type="number" class="numinput" min="0" max="23" step="0.5" value="${co.peakStart}"
            oninput="s.cos[${ci}].peakStart=+this.value;renderResults()">
          <span>:${co.peakStart%1?'30':'00'} to</span>
          <input type="number" class="numinput" min="0" max="24" step="0.5" value="${co.peakEnd}"
            oninput="s.cos[${ci}].peakEnd=+this.value;renderResults()">
          <span>:${co.peakEnd%1?'30':'00'}</span>
        </div>
        <div class="prow">
          <span>Peak window 2:</span>
          <input type="number" class="numinput" min="0" max="23" step="0.5" value="${co.peak2Start}"
            oninput="s.cos[${ci}].peak2Start=+this.value;renderResults()">
          <span>:${co.peak2Start%1?'30':'00'} to</span>
          <input type="number" class="numinput" min="0" max="24" step="0.5" value="${co.peak2End}"
            oninput="s.cos[${ci}].peak2End=+this.value;renderResults()">
          <span>:${co.peak2End%1?'30':'00'}</span>
        </div>` : ''}

        ${showExtra ? `<div class="extra-peak">
          ${showCustom ? `<div class="twin-peak">
            <div class="twin-row">
              <span class="twin-label">Weekday:</span>
              <input type="number" class="numinput" min="0" max="23" value="${co.wdPeakStart}"
                oninput="s.cos[${ci}].wdPeakStart=+this.value;renderResults()">
              <span>:00 to</span>
              <input type="number" class="numinput" min="0" max="24" value="${co.wdPeakEnd}"
                oninput="s.cos[${ci}].wdPeakEnd=+this.value;renderResults()">
              <span>:00 peak</span>
            </div>
            <div class="twin-row">
              <span class="twin-label">Weekend:</span>
              <input type="number" class="numinput" min="0" max="23" value="${co.wePeakStart}"
                oninput="s.cos[${ci}].wePeakStart=+this.value;renderResults()">
              <span>:00 to</span>
              <input type="number" class="numinput" min="0" max="24" value="${co.wePeakEnd}"
                oninput="s.cos[${ci}].wePeakEnd=+this.value;renderResults()">
              <span>:00 peak</span>
            </div>
          </div>` : `
          <div class="prow">
            <span>${otherLabel} charged at:</span>
            <div class="rg">
              <label class="ro"><input type="radio" name="npr${ci}" value="offpeak" ${co.nonPeakDayRate==='offpeak'?'checked':''}
                onchange="s.cos[${ci}].nonPeakDayRate=this.value;renderResults()">Off-peak rate</label>
              <label class="ro"><input type="radio" name="npr${ci}" value="peak" ${co.nonPeakDayRate==='peak'?'checked':''}
                onchange="s.cos[${ci}].nonPeakDayRate=this.value;renderResults()">Peak rate</label>
            </div>
          </div>`}
          <div class="day-count-row">
            <span>Weekdays <input type="number" class="numinput sm" step="0.5" min="0" max="30" value="${co.weekdays}"
              oninput="s.cos[${ci}].weekdays=+this.value;renderResults()"> days/month</span>
            <span>Weekends/holidays <input type="number" class="numinput sm" step="0.5" min="0" max="30" value="${co.weekends}"
              oninput="s.cos[${ci}].weekends=+this.value;renderResults()"> days/month</span>
          </div>
        </div>` : ''}
      </div>` : ''}

      <div class="pkg-list">
        ${topPkgRows}
        ${emptyInTop > 0 ? `<button class="pkg-add" onclick="addPkgSlot(${ci})">＋ Add plan (${emptyInTop} slot${emptyInTop>1?'s':''} available)</button>` : ''}
        <button class="pkg-more" onclick="togglePkgs(${ci})">
          ${isPkgOpen ? '▲ Collapse extra plans' : '▼ More plans'}
          ${!isPkgOpen && extraActive > 0 ? `<span class="pkg-more-badge">${extraActive}</span>` : ''}
        </button>
        ${isPkgOpen ? `${extraRows}
          ${emptyInExtra > 0 ? `<button class="pkg-add" onclick="addPkgSlot(${ci})">＋ Add plan (${emptyInExtra} slot${emptyInExtra>1?'s':''} available)</button>` : ''}
        ` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderPkgRow(ci, pi, p) {
  const dis = !p.enabled;
  return `
  <div class="pkg-row${dis?' off':''}">
    <div class="pkg-top">
      <input type="checkbox" class="pkg-enable" ${p.enabled?'checked':''}
        title="${p.enabled?'Click to disable':'Click to enable'}"
        onchange="s.cos[${ci}].pkgs[${pi}].enabled=this.checked;renderCos();renderResults()">
      <span class="pkg-num">${pi+1}.</span>
      <input class="pkg-name" placeholder="Plan name" value="${esc(p.name)}"
        oninput="s.cos[${ci}].pkgs[${pi}].name=this.value;renderResults()" ${dis?'disabled':''}>
      <label class="flat-lbl">
        <input type="checkbox" ${p.isFlat?'checked':''} ${dis?'disabled':''}
          onchange="s.cos[${ci}].pkgs[${pi}].isFlat=this.checked;renderCos();renderResults()">
        Flat rate
      </label>
    </div>
    <div class="pkg-rates">
      <div class="rf">
        <span class="rl">Daily charge $/day</span>
        <input class="ri" type="number" step="0.001" min="0" placeholder="0.000" value="${p.daily}"
          oninput="s.cos[${ci}].pkgs[${pi}].daily=this.value;renderResults()" ${dis?'disabled':''}>
      </div>
      <div class="rf">
        <span class="rl">${p.isFlat?'Rate':'Peak'} $/kWh</span>
        <input class="ri" type="number" step="0.0001" min="0" placeholder="0.0000" value="${p.peak}"
          oninput="s.cos[${ci}].pkgs[${pi}].peak=this.value;renderResults()" ${dis?'disabled':''}>
      </div>
      <div class="rf">
        <span class="rl">Off-peak $/kWh</span>
        <input class="ri" type="number" step="0.0001" min="0" placeholder="0.0000" value="${p.offPeak}"
          oninput="s.cos[${ci}].pkgs[${pi}].offPeak=this.value;renderResults()" ${dis||p.isFlat?'disabled':''}>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════
// RENDER: USAGE
// ═══════════════════════════════════════════════
function renderUsage() {
  const el = document.getElementById('usagePanel');
  if (s.mode === 'simple') {
    el.innerHTML = `
      <div class="urow">
        <div class="field">
          <label>Monthly usage</label>
          <input type="number" step="1" min="0" placeholder="e.g. 300" value="${s.sim.total}"
            oninput="s.sim.total=this.value;renderResults()">
          <span class="unit">kWh / month</span>
        </div>
        <div class="field">
          <label>Peak usage percentage</label>
          <input type="number" min="0" max="100" step="1" placeholder="40" value="${s.sim.peakPct}"
            oninput="s.sim.peakPct=this.value;renderResults()">
          <span class="unit">% during peak hours</span>
        </div>
      </div>
      <div class="tip">💡 In simple mode, "Custom" peak config uses window proportions automatically. The peak % only applies to Every day / Weekdays / Weekends modes.</div>`;
  } else if (s.mode === 'slots') {
    el.innerHTML = `
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Enter <strong>daily average</strong> usage per slot (kWh/day).</p>
      <div class="slots-grid">
        ${SLOT_LABELS.map((t,i)=>`
          <div class="sc">
            <span class="sl">${t}</span>
            <input class="si" type="number" min="0" step="0.1" placeholder="0" value="${s.slots[i]}"
              oninput="s.slots[${i}]=this.value;renderResults();updateSum()">
          </div>`).join('')}
      </div>
      <div class="usum" id="usum"></div>`;
    updateSum();
  } else {
    el.innerHTML = `
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Enter <strong>daily average</strong> usage per hour (kWh/day).</p>
      <div class="h-grid">
        ${Array.from({length:24},(_,h)=>`
          <div class="hc">
            <span class="hl">${String(h).padStart(2,'0')}:00</span>
            <input class="hi" type="number" min="0" step="0.01" placeholder="0" value="${s.hrs[h]}"
              oninput="s.hrs[${h}]=this.value;renderResults();updateSum()">
          </div>`).join('')}
      </div>
      <div class="usum" id="usum"></div>`;
    updateSum();
  }
}

function updateSum() {
  const el = document.getElementById('usum');
  if (!el) return;
  const daily = s.mode==='slots'
    ? s.slots.reduce((a,v)=>a+f(v),0)
    : s.hrs.reduce((a,v)=>a+f(v),0);
  el.innerHTML = `Total: <strong>${daily.toFixed(2)} kWh/day</strong>, approx. <strong>${(daily*30).toFixed(0)} kWh/month</strong>`;
}

// ═══════════════════════════════════════════════
// RENDER: RESULTS
// ═══════════════════════════════════════════════
function renderResults() {
  updateSum();
  const rows = [];
  s.cos.forEach((co,ci) => {
    co.pkgs.forEach((pkg,pi) => {
      if (!pkg.enabled || f(pkg.peak)===0) return;
      const c = calcPkg(co, pkg);
      rows.push({ci, cname:co.name||`Provider ${ci+1}`, pname:pkg.name||`Plan ${pi+1}`, ...c});
    });
  });
  rows.sort((a,b)=>a.total-b.total);

  // Peak mismatch warning
  const warnings = [];
  s.cos.forEach((co,ci) => {
    const nonFlat = co.pkgs.filter(p => p.enabled && !p.isFlat && p._peakKey);
    if (nonFlat.length < 2) return;
    if ([...new Set(nonFlat.map(p=>p._peakKey))].length > 1) {
      const names = nonFlat.map(p=>p.name||'(unnamed)').join(', ');
      warnings.push(`⚠️ Plans "${names}" under ${co.name||`Provider ${ci+1}`} have different peak configurations. Results use the same peak hours for all — please verify.`);
    }
  });
  document.getElementById('peakWarn').innerHTML = warnings.length
    ? warnings.map(w=>`<div class="peak-warn">${esc(w)}</div>`).join('') : '';

  if (!rows.length) {
    document.getElementById('sumBar').innerHTML = `<span style="color:var(--light)">Enter plan rates and usage data to see comparisons…</span>`;
    document.getElementById('tBody').innerHTML  = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--light);font-size:13px">No data yet — enter plan details below to get started</td></tr>`;
    return;
  }

  const minT = rows[0].total, maxT = rows[rows.length-1].total;
  document.getElementById('sumBar').innerHTML = `
    <span>Monthly usage: <span class="sv">${rows[0].kwh.toFixed(0)} kWh</span></span>
    <span>·</span>
    <span>Lowest: <span class="sv g">${fmt(minT)}</span></span>
    <span>·</span>
    <span>Highest: <span class="sv">${fmt(maxT)}</span></span>
    ${rows.length>1&&maxT>minT?`<span>·</span><span>Max saving: <span class="sv g">${fmt(maxT-minT)}/mo</span></span>`:''}`;
  document.getElementById('tBody').innerHTML = rows.map((r,i)=>`
    <tr class="${i===0?'best':''}">
      <td><span class="rk ${i===0?'g1':''}">${i+1}</span></td>
      <td><span class="dot" style="background:${COLORS[r.ci]}"></span>${esc(r.cname)}</td>
      <td>${esc(r.pname)}</td>
      <td class="dim mono">${fmt(r.energy)}</td>
      <td class="dim mono">${fmt(r.daily)}</td>
      <td class="mono total">${fmt(r.total)}</td>
    </tr>`).join('');
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
renderCos(); renderUsage(); renderResults();
