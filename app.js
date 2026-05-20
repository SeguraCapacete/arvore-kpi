// ── ESTADO GLOBAL ──────────────────────────────────────────────
let allData    = [];   // todos os registros carregados
let treeConfig = {};   // { categoria: [indicadores] }
let periods    = [];   // lista de períodos disponíveis
let activePeriod = 'all';
let activeCardId = null;
let chartInstance = null;

// ── DADOS DE EXEMPLO ────────────────────────────────────────────
const SAMPLE_DATA = [
  { indicador:'Resultado Operacional', categoria:'ROOT',      valor:87, meta:90, unidade:'%', periodo:'Mai/2025', historico:[78,80,82,83,85,87] },

  { indicador:'Qualidade',     categoria:'Resultado Operacional', valor:92, meta:95, unidade:'%', periodo:'Mai/2025', historico:[85,87,88,90,91,92] },
  { indicador:'Produtividade', categoria:'Resultado Operacional', valor:81, meta:85, unidade:'%', periodo:'Mai/2025', historico:[70,72,75,77,79,81] },
  { indicador:'Disponibilidade',categoria:'Resultado Operacional',valor:89, meta:90, unidade:'%', periodo:'Mai/2025', historico:[92,91,90,90,89,89] },

  { indicador:'Defeitos',    categoria:'Qualidade',     valor:1.2, meta:1.0, unidade:'%', periodo:'Mai/2025', historico:[2.1,1.9,1.7,1.5,1.3,1.2] },
  { indicador:'Retrabalho',  categoria:'Qualidade',     valor:3.5, meta:3.0, unidade:'%', periodo:'Mai/2025', historico:[5,4.5,4.2,4,3.8,3.5] },
  { indicador:'Ciclo médio', categoria:'Produtividade', valor:4.2, meta:4.0, unidade:'h', periodo:'Mai/2025', historico:[5.5,5.1,4.8,4.5,4.4,4.2] },
  { indicador:'OEE',         categoria:'Produtividade', valor:78,  meta:82,  unidade:'%', periodo:'Mai/2025', historico:[68,70,72,74,76,78] },
  { indicador:'Uptime',      categoria:'Disponibilidade',valor:94, meta:97,  unidade:'%', periodo:'Mai/2025', historico:[97,96,96,95,94,94] },
  { indicador:'Manutenção',  categoria:'Disponibilidade',valor:85, meta:90,  unidade:'%', periodo:'Mai/2025', historico:[84,84,85,85,85,85] },

  // Abr/2025
  { indicador:'Resultado Operacional', categoria:'ROOT',      valor:85, meta:90, unidade:'%', periodo:'Abr/2025', historico:[74,76,78,80,83,85] },
  { indicador:'Qualidade',     categoria:'Resultado Operacional', valor:91, meta:95, unidade:'%', periodo:'Abr/2025', historico:[82,84,86,88,90,91] },
  { indicador:'Produtividade', categoria:'Resultado Operacional', valor:79, meta:85, unidade:'%', periodo:'Abr/2025', historico:[68,70,72,74,77,79] },
  { indicador:'Disponibilidade',categoria:'Resultado Operacional',valor:90, meta:90, unidade:'%', periodo:'Abr/2025', historico:[88,89,89,90,90,90] },
  { indicador:'Defeitos',    categoria:'Qualidade',     valor:1.3, meta:1.0, unidade:'%', periodo:'Abr/2025', historico:[2.3,2.1,1.9,1.7,1.5,1.3] },
  { indicador:'Retrabalho',  categoria:'Qualidade',     valor:3.8, meta:3.0, unidade:'%', periodo:'Abr/2025', historico:[5.5,5,4.8,4.5,4.0,3.8] },
  { indicador:'Ciclo médio', categoria:'Produtividade', valor:4.4, meta:4.0, unidade:'h', periodo:'Abr/2025', historico:[6,5.5,5.2,4.9,4.6,4.4] },
  { indicador:'OEE',         categoria:'Produtividade', valor:76,  meta:82,  unidade:'%', periodo:'Abr/2025', historico:[64,66,68,71,74,76] },
  { indicador:'Uptime',      categoria:'Disponibilidade',valor:95, meta:97,  unidade:'%', periodo:'Abr/2025', historico:[95,95,95,95,95,95] },
  { indicador:'Manutenção',  categoria:'Disponibilidade',valor:86, meta:90,  unidade:'%', periodo:'Abr/2025', historico:[83,84,84,85,85,86] },
];

// ── INICIALIZAÇÃO ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData(SAMPLE_DATA);
  showView('tree');
});

function loadData(data) {
  allData = data;
  periods = [...new Set(data.map(r => r.periodo).filter(Boolean))].sort().reverse();

  const sel = document.getElementById('period-sel');
  sel.innerHTML = '<option value="all">Todos</option>';
  periods.forEach(p => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = p;
    sel.appendChild(opt);
  });

  activePeriod = periods[0] || 'all';
  sel.value = activePeriod;

  buildTreeConfig();
  renderTree();
  buildConfigTable();
  showToast('✓ ' + data.length + ' indicadores carregados');
}

// ── FILTRO DE PERÍODO ───────────────────────────────────────────
function applyPeriodFilter() {
  activePeriod = document.getElementById('period-sel').value;
  buildTreeConfig();
  renderTree();
  closeDetail();
}

function filteredData() {
  if (activePeriod === 'all') return allData;
  return allData.filter(r => r.periodo === activePeriod);
}

// ── CONSTRUÇÃO DA HIERARQUIA ────────────────────────────────────
function buildTreeConfig() {
  treeConfig = {};
  const data = filteredData();

  // Agrupa por categoria pai
  data.forEach(row => {
    const cat = row.categoria || 'Sem categoria';
    if (!treeConfig[cat]) treeConfig[cat] = [];
    treeConfig[cat].push(row);
  });
}

// Retorna a árvore de níveis: [ [root], [filhos], [netos], ... ]
function buildLevels() {
  const data = filteredData();
  const roots = data.filter(r => r.categoria === 'ROOT');
  if (!roots.length) return [data]; // flat se não tiver ROOT

  const levels = [roots];
  let current = roots.map(r => r.indicador);

  for (let depth = 0; depth < 5; depth++) {
    const nextItems = data.filter(r => current.includes(r.categoria));
    if (!nextItems.length) break;
    levels.push(nextItems);
    current = nextItems.map(r => r.indicador);
  }
  return levels;
}

// ── RENDER ÁRVORE ───────────────────────────────────────────────
function renderTree() {
  const container = document.getElementById('tree-container');
  const sub = document.getElementById('tree-sub');
  container.innerHTML = '';

  const levels = buildLevels();
  if (!levels.length || !levels[0].length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">◈</div>
      <p>Nenhum dado para o período selecionado.</p>
    </div>`;
    return;
  }

  const period = activePeriod === 'all' ? 'Todos os períodos' : activePeriod;
  sub.textContent = period + ' · ' + filteredData().length + ' indicadores';

  levels.forEach((level, li) => {
    // Conector horizontal entre níveis
    if (li > 0) {
      const hRow = document.createElement('div');
      hRow.className = 'h-connector';
      const totalCards = level.length;
      // linha horizontal que abrange os cards
      const line = document.createElement('div');
      line.className = 'h-line-seg';
      line.style.width = Math.min(totalCards * 167, 800) + 'px';
      hRow.appendChild(line);
      container.appendChild(hRow);
    }

    const row = document.createElement('div');
    row.className = 'tree-level';
    row.style.marginTop = li === 0 ? '0' : '0';

    level.forEach((item, idx) => {
      const col = document.createElement('div');
      col.className = 'node-col';

      // Conector vertical descendente (exceto último nível)
      const hasChildren = filteredData().some(r => r.categoria === item.indicador);

      if (li > 0) {
        const vTop = document.createElement('div');
        vTop.className = 'connector-v';
        col.appendChild(vTop);
      }

      col.appendChild(makeCard(item, li === 0));

      if (hasChildren) {
        const vBot = document.createElement('div');
        vBot.className = 'connector-v';
        col.appendChild(vBot);
      }

      row.appendChild(col);
    });

    container.appendChild(row);
  });
}

// ── CARD KPI ────────────────────────────────────────────────────
function getStatus(item) {
  // Para indicadores onde menor = melhor (Defeitos, Retrabalho, Ciclo médio)
  const lowerBetter = ['defeitos','retrabalho','ciclo','tempo','prazo'];
  const isLower = lowerBetter.some(k => item.indicador.toLowerCase().includes(k));

  const pct = isLower
    ? item.meta / item.valor * 100
    : item.valor / item.meta * 100;

  if (pct >= 97) return 'green';
  if (pct >= 88) return 'yellow';
  return 'red';
}

function getBarPct(item) {
  const lowerBetter = ['defeitos','retrabalho','ciclo','tempo','prazo'];
  const isLower = lowerBetter.some(k => item.indicador.toLowerCase().includes(k));
  const pct = isLower
    ? item.meta / item.valor * 100
    : item.valor / item.meta * 100;
  return Math.min(100, Math.round(pct));
}

function getTrend(item) {
  if (!item.historico || item.historico.length < 2) return { label: '—', cls: 'trend-flat' };
  const hist = item.historico;
  const last  = hist[hist.length - 1];
  const prev  = hist[hist.length - 2];
  const diff  = last - prev;
  const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(1);

  const lowerBetter = ['defeitos','retrabalho','ciclo','tempo','prazo'];
  const isLower = lowerBetter.some(k => item.indicador.toLowerCase().includes(k));

  if (diff === 0) return { label: '— estável', cls: 'trend-flat' };
  const good = isLower ? diff < 0 : diff > 0;
  return {
    label: (good ? '▲' : '▼') + ' ' + diffStr + (item.unidade || ''),
    cls: good ? 'trend-up' : 'trend-down'
  };
}

function makeCard(item, isRoot = false) {
  const card = document.createElement('div');
  const status = getStatus(item);
  const barPct = getBarPct(item);
  const trend  = getTrend(item);
  const id = item.indicador + '_' + (item.periodo || '');

  card.className = `kpi-card status-${status}${isRoot ? ' root' : ''}${activeCardId === id ? ' active' : ''}`;
  card.onclick = () => openDetail(item, id);

  const badgeMap = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' };
  const badgeLbl = { green: '✓ Meta', yellow: '⚠ Próximo', red: '✗ Abaixo' };

  card.innerHTML = `
    <div class="kpi-name">${item.indicador}</div>
    <div class="kpi-value">${item.valor}<span class="kpi-unit">${item.unidade || ''}</span></div>
    <div class="kpi-footer">
      <span class="badge ${badgeMap[status]}">${badgeLbl[status]}</span>
      <span class="${trend.cls}">${trend.label}</span>
    </div>
    <div class="kpi-meta">Meta: ${item.meta}${item.unidade || ''}</div>
    <div class="kpi-bar-bg">
      <div class="kpi-bar bar-${status}" style="width:${barPct}%"></div>
    </div>
  `;
  return card;
}

// ── PAINEL DE DETALHE ───────────────────────────────────────────
function openDetail(item, id) {
  activeCardId = id;

  // Re-render cards para atualizar active
  renderTree();

  const panel   = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  panel.classList.remove('hidden');

  const status  = getStatus(item);
  const barPct  = getBarPct(item);
  const trend   = getTrend(item);
  const hist    = item.historico || [];
  const months  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const labels  = hist.map((_, i) => months[i] || 'M' + (i+1));

  const badgeMap = { green:'badge-green', yellow:'badge-yellow', red:'badge-red' };
  const badgeLbl = { green:'✓ Atingindo meta', yellow:'⚠ Próximo da meta', red:'✗ Abaixo da meta' };
  const colorMap = { green:'#3ecf8e', yellow:'#f5a623', red:'#e05252' };

  content.innerHTML = `
    <div style="margin-bottom:1rem">
      <div class="detail-title">${item.indicador}</div>
      <div class="detail-cat">${item.categoria === 'ROOT' ? 'Indicador raiz' : item.categoria} · ${item.periodo || '—'}</div>
    </div>

    <span class="badge ${badgeMap[status]}" style="font-size:12px;padding:4px 10px">${badgeLbl[status]}</span>

    <div class="metric-grid" style="margin-top:1rem">
      <div class="metric-box">
        <div class="metric-box-label">Realizado</div>
        <div class="metric-box-val" style="color:${colorMap[status]}">${item.valor}<span style="font-size:13px;font-weight:400;color:var(--text3)">${item.unidade||''}</span></div>
      </div>
      <div class="metric-box">
        <div class="metric-box-label">Meta</div>
        <div class="metric-box-val">${item.meta}<span style="font-size:13px;font-weight:400;color:var(--text3)">${item.unidade||''}</span></div>
      </div>
      <div class="metric-box">
        <div class="metric-box-label">Atingimento</div>
        <div class="metric-box-val">${barPct}%</div>
      </div>
      <div class="metric-box">
        <div class="metric-box-label">Tendência</div>
        <div class="metric-box-val" style="font-size:16px"><span class="${trend.cls}">${trend.label}</span></div>
      </div>
    </div>

    ${hist.length > 1 ? `
    <div class="chart-wrap" style="margin-top:1rem">
      <div class="chart-label">Histórico dos últimos ${hist.length} períodos</div>
      <canvas id="detail-chart" height="130"></canvas>
    </div>` : ''}

    <div style="margin-top:1rem">
      <div class="kpi-bar-bg" style="height:4px;border-radius:4px">
        <div class="kpi-bar bar-${status}" style="width:${barPct}%;height:4px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-top:4px">
        <span>0</span><span>Meta ${item.meta}${item.unidade||''}</span>
      </div>
    </div>
  `;

  // Gráfico de histórico
  if (hist.length > 1) {
    setTimeout(() => {
      const ctx = document.getElementById('detail-chart');
      if (!ctx) return;
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: item.indicador,
              data: hist,
              borderColor: colorMap[status],
              backgroundColor: colorMap[status] + '22',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: colorMap[status],
            },
            {
              label: 'Meta',
              data: new Array(hist.length).fill(item.meta),
              borderColor: '#3a3d46',
              borderDash: [5, 4],
              pointRadius: 0,
              fill: false,
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#9499a6', font: { size: 11 } } }
          },
          scales: {
            x: { ticks: { color: '#5a5f6e', font: { size: 11 } }, grid: { color: '#2a2d34' } },
            y: { ticks: { color: '#5a5f6e', font: { size: 11 } }, grid: { color: '#2a2d34' } }
          }
        }
      });
    }, 50);
  }
}

function closeDetail() {
  activeCardId = null;
  document.getElementById('detail-panel').classList.add('hidden');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

// ── UPLOAD DE ARQUIVO ────────────────────────────────────────────
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileInput(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
  e.target.value = ''; // reset para permitir re-upload do mesmo arquivo
}

function processFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => {
      const data = parseCSV(e.target.result);
      if (data.length) { loadData(data); showView('tree'); }
    };
    reader.readAsText(file, 'UTF-8');
  } else if (['xlsx','xls'].includes(ext)) {
    const reader = new FileReader();
    reader.onload = e => {
      const wb   = XLSX.read(e.target.result, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const data = normalizeRows(rows);
      if (data.length) { loadData(data); showView('tree'); }
      else showToast('⚠ Verifique as colunas da planilha (veja o modelo)');
    };
    reader.readAsArrayBuffer(file);
  } else {
    showToast('⚠ Formato não suportado. Use .xlsx ou .csv');
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/["""]/g,''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(/[;,]/).map(v => v.trim().replace(/["""]/g,''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
  return normalizeRows(rows);
}

// Normaliza chaves do objeto para o padrão esperado
function normalizeRows(rows) {
  return rows.map(row => {
    // Aceita variações de nome de coluna
    const get = (...keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.toLowerCase().includes(k));
        if (found && row[found] !== '') return row[found];
      }
      return '';
    };

    const hist = get('historico','histórico','history');
    const historico = hist
      ? String(hist).split(/[;|,]/).map(Number).filter(n => !isNaN(n))
      : [];

    return {
      indicador: String(get('indicador','kpi','nome','name') || '').trim(),
      categoria: String(get('categoria','category','pai','parent','grupo') || 'Sem categoria').trim(),
      valor:     parseFloat(get('valor','value','realizado','real','actual')) || 0,
      meta:      parseFloat(get('meta','goal','target','objetivo')) || 0,
      unidade:   String(get('unidade','unit','und') || '%').trim(),
      periodo:   String(get('periodo','período','period','mes','mês','month') || '').trim(),
      historico,
    };
  }).filter(r => r.indicador); // remove linhas sem nome
}

// ── TABELA DE CONFIGURAÇÃO ──────────────────────────────────────
function buildConfigTable() {
  const body = document.getElementById('config-body');
  const data = filteredData();
  if (!data.length) return;

  const categories = [...new Set(data.map(r => r.categoria))];

  body.innerHTML = `
    <p style="color:var(--text2);font-size:13px;margin-bottom:1rem">
      Defina a categoria pai de cada indicador para montar a hierarquia da árvore.
    </p>
    <table class="config-table">
      <thead><tr><th>Indicador</th><th>Categoria pai</th><th>Valor</th><th>Meta</th></tr></thead>
      <tbody>
        ${data.map(row => `
          <tr>
            <td>${row.indicador}</td>
            <td>
              <select onchange="updateCategoria('${row.indicador}', '${row.periodo}', this.value)">
                <option value="ROOT" ${row.categoria==='ROOT'?'selected':''}>ROOT (topo)</option>
                ${categories.filter(c=>c!=='ROOT' && c!==row.indicador).map(c =>
                  `<option value="${c}" ${row.categoria===c?'selected':''}>${c}</option>`
                ).join('')}
              </select>
            </td>
            <td>${row.valor} ${row.unidade||''}</td>
            <td>${row.meta} ${row.unidade||''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top:1rem">
      <button class="btn-primary" onclick="showView('tree')">⬡ Ver árvore</button>
    </div>
  `;
}

function updateCategoria(indicador, periodo, novaCategoria) {
  allData = allData.map(r =>
    r.indicador === indicador && (r.periodo === periodo || periodo === '')
      ? { ...r, categoria: novaCategoria }
      : r
  );
  buildTreeConfig();
  renderTree();
}

// ── DOWNLOAD TEMPLATE ────────────────────────────────────────────
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['indicador','categoria','valor','meta','unidade','periodo','historico'],
    ['Resultado Operacional','ROOT',87,90,'%','Mai/2025','78;80;82;83;85;87'],
    ['Qualidade','Resultado Operacional',92,95,'%','Mai/2025','85;87;88;90;91;92'],
    ['Produtividade','Resultado Operacional',81,85,'%','Mai/2025','70;72;75;77;79;81'],
    ['Defeitos','Qualidade',1.2,1.0,'%','Mai/2025','2.1;1.9;1.7;1.5;1.3;1.2'],
    ['Ciclo médio','Produtividade',4.2,4.0,'h','Mai/2025','5.5;5.1;4.8;4.5;4.4;4.2'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KPIs');
  XLSX.writeFile(wb, 'modelo-indicadores.xlsx');
  showToast('⬇ Planilha modelo baixada!');
}

// ── NAVEGAÇÃO ────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + name).classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const idx = { tree: 0, upload: 1, config: 2 };
  document.querySelectorAll('.nav-btn')[idx[name]]?.classList.add('active');

  if (name === 'config') buildConfigTable();
  if (name === 'tree')   renderTree();
}

// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}
