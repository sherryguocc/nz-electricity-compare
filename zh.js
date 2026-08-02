// ═══════════════════════════════════════════════
// LANG — Chinese strings used by common.js
// ═══════════════════════════════════════════════
const LANG = {
  dateLocale:       'zh-CN',
  company:          n    => `公司 ${n}`,
  pkg:              n    => `套餐 ${n}`,
  unnamed:          '(未命名)',
  confirmClear:     n    => `确认清空公司 ${n} 的所有输入？`,
  toastCleared:     n    => `✓ 已清空公司 ${n}`,
  toastSaved:       name => `✓ 已保存「${name}」`,
  confirmPeakOnly:  (pName, n) => `「${pName}」的高峰时间与公司 ${n} 现有设置不同，确认覆盖？`,
  toastPeakUpdated: name => `✓ 已更新「${name}」的高峰时间设置`,
  toastLoaded:      name => `✓ 已加载「${name}」`,
  confirmPeakMerge: (pName, n) => `「${pName}」的高峰时间与公司 ${n} 现有设置不同，合并时将一并覆盖高峰时间，确认？`,
  alertMismatch:    (cur, inN) => `⚠️ 无法合并：当前公司是「${cur}」，载入的档案属于「${inN}」。\n请先清空该公司，或选择同一公司的档案。`,
  promptOverwrite:  (pName, list) => `所有套餐位已有内容，「${pName}」放入哪个位置？\n\n${list}\n\n请输入 1–4（取消则跳过）：`,
  toastMerged:      n    => `✓ 已合并套餐至公司 ${n}`,
  toastCancelled:   '已取消',
  aiRunBtn:         '✨ 解析并填入',
  aiRunningBtn:     '解析中…',
  aiRunning:        '正在调用 AI，请稍候…',
  aiSuccess:        '✓ 解析成功，已自动填入表格！',
  aiFailed:         msg  => `解析失败：${msg}`,
  aiErrNoKey:       '请输入 OpenAI API Key',
  aiErrNoText:      '请粘贴定价页面文字',
  toastAiFilled:    name => `✓ 已填入「${name}」`,
  aiPrompt: text => `你是一个新西兰电费套餐数据提取助手。从以下文字中提取电力公司定价信息，返回JSON对象。

JSON格式：
{
  "name": "公司名称",
  "peakDays": "all"|"weekday"|"weekend"|"custom",
  "peakStart": 7, "peakEnd": 23,
  "nonPeakDayRate": "offpeak"|"peak",
  "wdPeakStart": 7, "wdPeakEnd": 23,
  "wePeakStart": 9, "wePeakEnd": 21,
  "weekdays": 21.5, "weekends": 8.5,
  "pkgs": [{"name":"套餐名","daily":1.50,"isFlat":false,"peak":0.28,"offPeak":0.15,"enabled":true}]
}

规则：
- peakDays: "all"=每天, "weekday"=仅工作日, "weekend"=仅周末, "custom"=工作日/周末不同
- 电价转换为NZD/kWh（cents除以100）；日租费单位NZD/天
- 统一电价时isFlat=true，peak和offPeak填相同值
- 最多4个套餐；缺失字段用合理默认值

文字：
${text}`,
};

// ═══════════════════════════════════════════════
// RENDER: COMPANIES
// ═══════════════════════════════════════════════
function peakSummary(co) {
  const fmtT = h => `${Math.floor(h)}:${h%1?'30':'00'}`;
  switch(co.peakDays) {
    case 'all':     return `每天 · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)}`;
    case 'dual':    return `双高峰 · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)} / ${fmtT(co.peak2Start)}–${fmtT(co.peak2End)}`;
    case 'weekday': return `仅工作日 · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)}`;
    case 'weekend': return `仅周末 · ${fmtT(co.peakStart)}–${fmtT(co.peakEnd)}`;
    case 'custom':  return `自定义 · 工作日 ${fmtT(co.wdPeakStart)}–${fmtT(co.wdPeakEnd)} / 周末 ${fmtT(co.wePeakStart)}–${fmtT(co.wePeakEnd)}`;
    default:        return '高峰时段';
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
    const otherLabel = pd==='weekday' ? '周末/节假日' : (pd==='weekend' ? '工作日' : '');
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
        <input class="co-name" style="color:${col}" placeholder="电力公司 ${ci+1}" value="${esc(co.name)}"
          oninput="s.cos[${ci}].name=this.value;renderResults()">
        <button class="hbtn ai ico" onclick="openAiModal(${ci})" title="AI 填入">✨</button>
        <button class="hbtn ico" onclick="saveCompany(${ci})" title="保存">💾</button>
        <button class="hbtn ico" onclick="clearCompany(${ci})" title="清空">🗑</button>
        <select class="load-sel" onchange="loadCompany(${ci},this.value)">
          <option value="">📂 加载…</option>
          <optgroup label="内置预设">
            ${PRESETS.map(p=>`<option value="${p.id}">📋 ${esc(p.name)}</option>`).join('')}
          </optgroup>
          ${saved.length?`<optgroup label="我的保存">${saved.map(p=>`<option value="${p.id}">💾 ${esc(p.name)} (${p.savedAt})</option>`).join('')}</optgroup>`:''}
        </select>
      </div>

      <div class="peak-toggle" onclick="togglePeak(${ci})">
        <span>⏰ ${esc(peakSummary(co))}</span>
        <span class="peak-chev">${isOpen?'▲':'▼'}</span>
      </div>

      ${isOpen ? `<div class="co-peak">
        <div class="prow">
          <span>高峰适用：</span>
          <div class="rg">
            ${[['all','每天'],['dual','双高峰'],['weekday','仅工作日'],['weekend','仅周末'],['custom','自定义']].map(([v,l])=>`
              <label class="ro"><input type="radio" name="pd${ci}" value="${v}" ${pd===v?'checked':''}
                onchange="s.cos[${ci}].peakDays=this.value;renderCos();renderResults()">${l}</label>
            `).join('')}
          </div>
        </div>

        ${!showCustom && !showDual ? `
        <div class="prow">
          <span>高峰时段：</span>
          <input type="number" class="numinput" min="0" max="23" value="${co.peakStart}"
            oninput="s.cos[${ci}].peakStart=+this.value;renderResults()">
          <span>:00 至</span>
          <input type="number" class="numinput" min="0" max="24" value="${co.peakEnd}"
            oninput="s.cos[${ci}].peakEnd=+this.value;renderResults()">
          <span>:00</span>
        </div>` : ''}

        ${showDual ? `
        <div class="prow">
          <span>高峰时段1：</span>
          <input type="number" class="numinput" min="0" max="23" step="0.5" value="${co.peakStart}"
            oninput="s.cos[${ci}].peakStart=+this.value;renderResults()">
          <span>:${co.peakStart%1?'30':'00'} 至</span>
          <input type="number" class="numinput" min="0" max="24" step="0.5" value="${co.peakEnd}"
            oninput="s.cos[${ci}].peakEnd=+this.value;renderResults()">
          <span>:${co.peakEnd%1?'30':'00'}</span>
        </div>
        <div class="prow">
          <span>高峰时段2：</span>
          <input type="number" class="numinput" min="0" max="23" step="0.5" value="${co.peak2Start}"
            oninput="s.cos[${ci}].peak2Start=+this.value;renderResults()">
          <span>:${co.peak2Start%1?'30':'00'} 至</span>
          <input type="number" class="numinput" min="0" max="24" step="0.5" value="${co.peak2End}"
            oninput="s.cos[${ci}].peak2End=+this.value;renderResults()">
          <span>:${co.peak2End%1?'30':'00'}</span>
        </div>` : ''}

        ${showExtra ? `<div class="extra-peak">
          ${showCustom ? `<div class="twin-peak">
            <div class="twin-row">
              <span class="twin-label">工作日：</span>
              <input type="number" class="numinput" min="0" max="23" value="${co.wdPeakStart}"
                oninput="s.cos[${ci}].wdPeakStart=+this.value;renderResults()">
              <span>:00 至</span>
              <input type="number" class="numinput" min="0" max="24" value="${co.wdPeakEnd}"
                oninput="s.cos[${ci}].wdPeakEnd=+this.value;renderResults()">
              <span>:00 为高峰</span>
            </div>
            <div class="twin-row">
              <span class="twin-label">周末：</span>
              <input type="number" class="numinput" min="0" max="23" value="${co.wePeakStart}"
                oninput="s.cos[${ci}].wePeakStart=+this.value;renderResults()">
              <span>:00 至</span>
              <input type="number" class="numinput" min="0" max="24" value="${co.wePeakEnd}"
                oninput="s.cos[${ci}].wePeakEnd=+this.value;renderResults()">
              <span>:00 为高峰</span>
            </div>
          </div>` : `
          <div class="prow">
            <span>${otherLabel}统一按：</span>
            <div class="rg">
              <label class="ro"><input type="radio" name="npr${ci}" value="offpeak" ${co.nonPeakDayRate==='offpeak'?'checked':''}
                onchange="s.cos[${ci}].nonPeakDayRate=this.value;renderResults()">低谷电价</label>
              <label class="ro"><input type="radio" name="npr${ci}" value="peak" ${co.nonPeakDayRate==='peak'?'checked':''}
                onchange="s.cos[${ci}].nonPeakDayRate=this.value;renderResults()">高峰电价</label>
            </div>
          </div>`}
          <div class="day-count-row">
            <span>工作日 <input type="number" class="numinput sm" step="0.5" min="0" max="30" value="${co.weekdays}"
              oninput="s.cos[${ci}].weekdays=+this.value;renderResults()"> 天/月</span>
            <span>周末/节假日 <input type="number" class="numinput sm" step="0.5" min="0" max="30" value="${co.weekends}"
              oninput="s.cos[${ci}].weekends=+this.value;renderResults()"> 天/月</span>
          </div>
        </div>` : ''}
      </div>` : ''}

      <div class="pkg-list">
        ${topPkgRows}
        ${emptyInTop > 0 ? `<button class="pkg-add" onclick="addPkgSlot(${ci})">＋ 添加套餐（还有 ${emptyInTop} 个空位）</button>` : ''}
        <button class="pkg-more" onclick="togglePkgs(${ci})">
          ${isPkgOpen ? '▲ 收起更多套餐' : '▼ 更多套餐'}
          ${!isPkgOpen && extraActive > 0 ? `<span class="pkg-more-badge">${extraActive}</span>` : ''}
        </button>
        ${isPkgOpen ? `${extraRows}
          ${emptyInExtra > 0 ? `<button class="pkg-add" onclick="addPkgSlot(${ci})">＋ 添加套餐（还有 ${emptyInExtra} 个空位）</button>` : ''}
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
        title="${p.enabled?'点击禁用':'点击启用'}"
        onchange="s.cos[${ci}].pkgs[${pi}].enabled=this.checked;renderCos();renderResults()">
      <span class="pkg-num">${pi+1}.</span>
      <input class="pkg-name" placeholder="套餐名称" value="${esc(p.name)}"
        oninput="s.cos[${ci}].pkgs[${pi}].name=this.value;renderResults()" ${dis?'disabled':''}>
      <label class="flat-lbl">
        <input type="checkbox" ${p.isFlat?'checked':''} ${dis?'disabled':''}
          onchange="s.cos[${ci}].pkgs[${pi}].isFlat=this.checked;renderCos();renderResults()">
        统一电价
      </label>
    </div>
    <div class="pkg-rates">
      <div class="rf">
        <span class="rl">日租费 $/天</span>
        <input class="ri" type="number" step="0.001" min="0" placeholder="0.000" value="${p.daily}"
          oninput="s.cos[${ci}].pkgs[${pi}].daily=this.value;renderResults()" ${dis?'disabled':''}>
      </div>
      <div class="rf">
        <span class="rl">${p.isFlat?'电价':'高峰'} $/kWh</span>
        <input class="ri" type="number" step="0.0001" min="0" placeholder="0.0000" value="${p.peak}"
          oninput="s.cos[${ci}].pkgs[${pi}].peak=this.value;renderResults()" ${dis?'disabled':''}>
      </div>
      <div class="rf">
        <span class="rl">低谷 $/kWh</span>
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
          <label>月总用电量</label>
          <input type="number" step="1" min="0" placeholder="如：300" value="${s.sim.total}"
            oninput="s.sim.total=this.value;renderResults()">
          <span class="unit">kWh / 月</span>
        </div>
        <div class="field">
          <label>高峰时段用电占比</label>
          <input type="number" min="0" max="100" step="1" placeholder="40" value="${s.sim.peakPct}"
            oninput="s.sim.peakPct=this.value;renderResults()">
          <span class="unit">% 为高峰用电</span>
        </div>
      </div>
      <div class="tip">💡 粗略模式下，「自定义」高峰配置会根据时段长度自动计算高峰占比，峰值百分比仅用于「每天/仅工作日/仅周末」模式。</div>`;
  } else if (s.mode === 'slots') {
    el.innerHTML = `
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px">输入每个时段的<strong>日均</strong>用电量（kWh/天）。</p>
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
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px">输入每小时的<strong>日均</strong>用电量（kWh/天）。</p>
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
  el.innerHTML = `合计：<strong>${daily.toFixed(2)} kWh/天</strong>，约 <strong>${(daily*30).toFixed(0)} kWh/月</strong>`;
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
      rows.push({ci, cname:co.name||`公司 ${ci+1}`, pname:pkg.name||`套餐 ${pi+1}`, ...c});
    });
  });
  rows.sort((a,b)=>a.total-b.total);

  // Peak mismatch warning
  const warnings = [];
  s.cos.forEach((co,ci) => {
    const nonFlat = co.pkgs.filter(p => p.enabled && !p.isFlat && p._peakKey);
    if (nonFlat.length < 2) return;
    if ([...new Set(nonFlat.map(p=>p._peakKey))].length > 1) {
      const names = nonFlat.map(p=>p.name||'(未命名)').join('、');
      warnings.push(`⚠️ ${co.name||`公司 ${ci+1}`} 下的套餐「${names}」来自不同的高峰时段配置，当前统一使用同一套峰时计算，请核实结果是否符合实际。`);
    }
  });
  document.getElementById('peakWarn').innerHTML = warnings.length
    ? warnings.map(w=>`<div class="peak-warn">${esc(w)}</div>`).join('') : '';

  if (!rows.length) {
    document.getElementById('sumBar').innerHTML = `<span style="color:var(--light)">请填入套餐电价和用电量…</span>`;
    document.getElementById('tBody').innerHTML  = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--light);font-size:13px">暂无数据，请在下方填入套餐参数</td></tr>`;
    return;
  }

  const minT = rows[0].total, maxT = rows[rows.length-1].total;
  document.getElementById('sumBar').innerHTML = `
    <span>月用电量：<span class="sv">${rows[0].kwh.toFixed(0)} kWh</span></span>
    <span>·</span>
    <span>最低月费：<span class="sv g">${fmt(minT)}</span></span>
    <span>·</span>
    <span>最高月费：<span class="sv">${fmt(maxT)}</span></span>
    ${rows.length>1&&maxT>minT?`<span>·</span><span>最多可省：<span class="sv g">${fmt(maxT-minT)}/月</span></span>`:''}`;
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
