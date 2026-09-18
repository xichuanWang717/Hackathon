const highlightedMachines = [
  { id: '8107', zone: '拉丝', status: 'normal', order: 'JW-260918-071', product: '0.76mm 镀锌钢丝', material: '盘条 Q195', capacity: '92%', queue: 2, change: '06:30', risk: '无' },
  { id: '8115', zone: '拉丝', status: 'idle', order: '待排', product: '—', material: '盘条 Q195', capacity: '36%', queue: 0, change: '无', risk: '无' },
  { id: '8124', zone: '拉丝', status: 'change', order: 'JW-260918-083', product: '0.95mm 光面钢丝', material: '盘条 65#', capacity: '78%', queue: 5, change: '进行中', risk: '换型剩余 42 分钟' },
  { id: '8204', zone: '捻股', status: 'normal', order: 'JW-260918-102', product: '1+6 B4 股', material: '1.77mm 光面钢丝', capacity: '88%', queue: 3, change: '08:10', risk: '无' },
  { id: '8218', zone: '捻股', status: 'risk', order: 'JW-260918-106', product: '6×29FI 股', material: '2.18mm 镀锌钢丝', capacity: '98%', queue: 8, change: '09:40', risk: '队列拥堵 3.5h' },
  { id: '8231', zone: '捻股', status: 'idle', order: '待排', product: '—', material: '1.65mm 镀锌钢丝', capacity: '41%', queue: 1, change: '无', risk: '无' },
  { id: '8304', zone: '合绳', status: 'risk', order: 'JW-260918-106', product: '30mm GT34Z(35W×K7+WSC)', material: '捻股组件 / WSC 绳芯', capacity: '96%', queue: 6, change: '07:20', risk: '可能影响 2 张订单交期' },
  { id: '8307', zone: '合绳', status: 'normal', order: 'JW-260918-111', product: '22mm GT8ZH', material: '8 股 + IWRC', capacity: '81%', queue: 2, change: '10:30', risk: '无' },
  { id: '8312', zone: '合绳', status: 'change', order: 'JW-260918-118', product: '12mm GT6Z', material: '6 股 + IWRC', capacity: '72%', queue: 4, change: '进行中', risk: '换型需 1.2h' }
];
// 真实设备编号来自《产品额定（平均值）》：47 台拉丝、50 台捻股、12 台合绳。
const deviceIds = {
  拉丝: ['8103','8104','8105','8106','8107','8108','8109','8110','8111','8112','8113','8114','8115','8116','8117','8118','8119','8120','8121','8122','8123','8124','8125','8126','8127','8128','8129','8130','8131','8132','8133','8134','8135','8136','8137','8138','8139','8140','8141','8142','8143','8144','8145','8146','8147','8148','8149'],
  捻股: ['8201','8202','8203','8204','8205','8206','8207','8208','8209','8210','8211','8212','8213','8214','8215','8216','8217','8218','8219','8220','8221','8222','8223','8224','8225','8226','8227','8228','8229','8230','8231','8232','8233','8234','8235','8236','8237','8238','8239','8240','8241','8242','8243','8244','8245','8247','8248','8249','8250','8251'],
  合绳: ['8301','8302','8303','8304','8305','8306','8307','8308','8309','8310','8246','8312']
};
const defaultStateCycle = ['normal','normal','normal','normal','normal','idle','normal','change','normal','normal','idle','normal','normal','risk'];
const makeMachine = (id, zone, index) => ({ id, zone, status: defaultStateCycle[index % defaultStateCycle.length], order: `JW-260918-${String(130 + index).padStart(3,'0')}`, product: zone === '拉丝' ? '镀锌钢丝' : zone === '捻股' ? '标准股型' : '标准钢丝绳', material: zone === '拉丝' ? '盘条 Q195' : '待模型接入', capacity: `${62 + (index * 7) % 30}%`, queue: 1 + index % 5, change: '待模型计算', risk: '无' });
const specialById = Object.fromEntries(highlightedMachines.map(machine => [machine.id, machine]));
// ↓ 以下四个数据源在接入后端时可被 window.applyBackendData(payload) 整体替换（见文件末尾）。
//   未调用时保持这些内置演示数据，保证路演现场永远有画面。
let machines = Object.entries(deviceIds).flatMap(([zone, ids]) => ids.map((id, index) => specialById[id] || makeMachine(id, zone, index)));
let tasks = [
  {machine:'8107 拉丝',label:'JW-071',left:4,width:36,status:'normal'}, {machine:'8115 拉丝',label:'待排',left:46,width:18,status:'change'}, {machine:'8124 拉丝',label:'JW-083 · 换型',left:18,width:41,status:'change'},
  {machine:'8204 捻股',label:'JW-102',left:8,width:40,status:'normal'}, {machine:'8218 捻股',label:'JW-106 · 拥堵',left:37,width:51,status:'risk'}, {machine:'8231 捻股',label:'JW-112',left:57,width:25,status:'normal'},
  {machine:'8304 合绳',label:'JW-106 · 临期',left:13,width:66,status:'risk'}, {machine:'8307 合绳',label:'JW-111',left:48,width:30,status:'normal'}, {machine:'8312 合绳',label:'换型中',left:5,width:27,status:'change'}
];
let risks = [
  {level:'risk', title:'8304 合绳机队列拥堵', text:'JW-106 可能延迟 6 小时，影响后续 2 张订单', time:'刚刚', machine:'8304'},
  {level:'change', title:'8124 拉丝机正在换型', text:'规格切换剩余 42 分钟，建议暂缓插入同类急单', time:'20:16', machine:'8124'},
  {level:'risk', title:'JW-260918-126 物料临期', text:'WSC 绳芯库存仅够 1.5 小时生产', time:'19:54', machine:'8304'}
];
let orders = [
  ['订单号','产品规格','数量','交期','状态'],['JW-260918-106','30mm GT34Z','1,600m','09/19 08:00','临期'],['JW-260918-111','22mm GT8ZH','2,000m','09/19 12:00','正常'],['JW-260918-118','12mm GT6Z','1,000m','09/19 16:00','换型中'],['JW-260918-126','28mm GT8PZ','2,000m','09/20 08:00','缺料风险']
];
let selected = machines.find(m => m.id === '8304');
let inserted = false;
let backendKpiLocked = false;          // 后端 KPI 到达后，前端不再自行推算
let lockedMachines = new Set();        // 人工锁定当前安排的设备（前端演示闭环）
let insertSnapshot = null;             // 紧急插单推演前的快照，用于撤回
let plantHighlightFn = null;           // 由 renderPlant 注入：高亮三维视图里选中的设备（canvas 无 DOM）
let importedDataset = {version:'内置演示数据', sheets:{}, rows:[], summary:{orders:0,devices:0,processes:0,materials:0}, issues:[]};
const $ = selector => document.querySelector(selector);
// DeepSeek V4 接口配置位：接入后端时只需替换 endpoint，并在服务端保存密钥。
const aiConfig = {provider:'DeepSeek', model:'deepseek-v4-pro', endpoint:'http://localhost:3000/api/ai/schedule', enabled:true};

function renderPlant(){
  const target = $('#plantMap');
  const zones = ['拉丝','捻股','合绳'];
  const palette = {normal:0x57ca8c,idle:0x3a9cff,change:0xf0b65a,risk:0xef6b75};
  target.innerHTML = `<div class="factory-3d-shell"><div class="factory-view-toolbar"><span>车间数字孪生</span><div class="factory-view-actions"><button class="plant-filter-toggle" type="button">筛选</button><button class="open-machines" type="button">打开设备态势</button><button class="factory-view-toggle" type="button">切换二维</button></div></div><div class="plant-filter-menu" hidden><b>设备状态</b><button type="button" data-status-filter="all">全部</button><button type="button" data-status-filter="normal">生产</button><button type="button" data-status-filter="idle">待排</button><button type="button" data-status-filter="change">换型</button><button type="button" data-status-filter="risk">风险</button></div><canvas class="factory-3d-canvas" aria-label="三层车间数字孪生设备图"></canvas><div class="factory-2d-view" hidden></div><div class="factory-3d-floor-labels"></div><div class="factory-3d-legend"><span><i class="normal"></i>生产</span><span><i class="idle"></i>待排</span><span><i class="change"></i>换型</span><span><i class="risk"></i>风险</span></div><div class="factory-3d-hint">拖拽旋转 · 滚轮缩放 · 点击设备查看详情</div><aside class="factory-3d-info" hidden></aside></div>`;
  const shell = target.querySelector('.factory-3d-shell');
  const canvas = target.querySelector('.factory-3d-canvas');
  const twoD = target.querySelector('.factory-2d-view');
  const toggle = target.querySelector('.factory-view-toggle');
  const floorLabels = target.querySelector('.factory-3d-floor-labels');
  const legend = target.querySelector('.factory-3d-legend');
  const hint = target.querySelector('.factory-3d-hint');
  const filterToggle = target.querySelector('.plant-filter-toggle');
  const filterMenu = target.querySelector('.plant-filter-menu');
  const openMachines = target.querySelector('.open-machines');
  const statusText = {normal:'生产',idle:'待排',change:'换型',risk:'风险'};
  let statusFilter = 'all';
  const render2D = () => {
    twoD.innerHTML = zones.map(zone => {
      const source = machines.filter(m=>m.zone===zone);
      const list = statusFilter === 'all' ? source : source.filter(m=>m.status===statusFilter);
      const active = source.filter(m=>m.status==='normal').length;
      const changing = source.filter(m=>m.status==='change').length;
      const atRisk = source.filter(m=>m.status==='risk').length;
      return `<section class="factory-2d-floor"><header><div><b>${zone}工段</b><span>${list.length}/${source.length} 台设备 · ${active} 台生产</span></div><small>${changing} 台换型 · ${atRisk} 台风险</small></header><div class="factory-2d-grid">${list.map(machine=>`<button type="button" class="factory-2d-machine ${machine.status}" data-machine="${machine.id}" title="${machine.id} · ${statusText[machine.status]}"><strong>${machine.id}</strong><span>${statusText[machine.status]}</span></button>`).join('') || '<p class="factory-2d-empty">当前筛选无设备</p>'}</div></section>`;
    }).join('');
    twoD.querySelectorAll('[data-machine]').forEach(button=>button.addEventListener('click',()=>selectMachine(button.dataset.machine)));
  };
  const applyStatusFilter = (next) => { statusFilter = next; filterMenu.querySelectorAll('[data-status-filter]').forEach(button=>button.classList.toggle('selected',button.dataset.statusFilter===statusFilter)); if(is2D) render2D(); visuals.forEach(({mesh,cap,machine})=>{const visible=statusFilter==='all'||machine.status===statusFilter;mesh.visible=visible;cap.visible=visible;}); if(plantHighlightFn)plantHighlightFn(selected&&selected.id); };
  filterToggle.addEventListener('click',()=>{filterMenu.hidden=!filterMenu.hidden;});
  filterMenu.querySelectorAll('[data-status-filter]').forEach(button=>button.addEventListener('click',()=>{applyStatusFilter(button.dataset.statusFilter);filterMenu.hidden=true;}));
  openMachines.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.page==='machines'));renderModule('machines');});
  let is2D = false;
  const setView = (mode) => { is2D = mode === '2d'; target.classList.toggle('plant-map-2d', is2D); twoD.hidden = !is2D; canvas.hidden = is2D; floorLabels.hidden = is2D; legend.hidden = is2D; hint.hidden = is2D; toggle.textContent = is2D ? '切换三维' : '切换二维'; if(is2D) render2D(); if(plantHighlightFn)plantHighlightFn(is2D?null:(selected&&selected.id)); };
  toggle.addEventListener('click',()=>setView(is2D ? '3d' : '2d'));
  // 三维不可用时优雅降级到二维矩阵，不让整个页面崩掉（原来这里会直接中断 init）。
  const degrade3D = (reason) => {
    try { setView('2d'); } catch (_) {}
    canvas.hidden = true; floorLabels.hidden = true; legend.hidden = true; hint.hidden = true; toggle.hidden = true;
    shell.insertAdjacentHTML('beforeend', `<div class="factory-3d-fallback"><b>三维视图暂不可用</b><span>${escapeHtml(reason)}已自动切换为二维设备矩阵，其余功能不受影响。</span></div>`);
  };
  if (!window.THREE) { degrade3D('未加载到 Three.js 运行库。'); return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); }
  catch (error) { degrade3D('当前浏览器或显卡不支持 WebGL。'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b2030, 18, 36);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xd9f5ff,0x071522,2.2));
  const key = new THREE.DirectionalLight(0xffffff,2.8); key.position.set(6,12,10); scene.add(key);
  const floorYs = [3.1,0,-3.1];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactive = [];
  const visuals = [];
  let yaw = .58, pitch = .52, distance = 18, dragging = false, moved = false, lastX = 0, lastY = 0;
  const updateCamera = () => { camera.position.set(Math.sin(yaw)*distance, Math.sin(pitch)*distance + 1, Math.cos(yaw)*distance); camera.lookAt(0,0,0); };
  updateCamera();
  zones.forEach((zone, zi) => {
    const list = machines.filter(m=>m.zone===zone);
    const active = list.filter(m=>m.status==='normal').length;
    const changing = list.filter(m=>m.status==='change').length;
    const atRisk = list.filter(m=>m.status==='risk').length;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(16,.16,7),new THREE.MeshStandardMaterial({color:0x12384c,roughness:.72,metalness:.18,transparent:true,opacity:.9}));
    platform.position.y=floorYs[zi]; root.add(platform);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(16.1,.2,7.1)),new THREE.LineBasicMaterial({color:0x3a9fbd,transparent:true,opacity:.45})); edge.position.y=floorYs[zi]+.11; root.add(edge);
    const columns = zone==='合绳'?4:8;
    list.forEach((machine,index)=>{
      const rows = Math.ceil(list.length/columns), col=index%columns, row=Math.floor(index/columns);
      const x = (col-(columns-1)/2)*1.75;
      const z = (row-(rows-1)/2)*.72;
      const material = new THREE.MeshStandardMaterial({color:palette[machine.status],emissive:palette[machine.status],emissiveIntensity:machine.status==='risk'?.95:.42,roughness:.35,metalness:.35});
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.75,.42,.52),material);
      mesh.position.set(x,floorYs[zi]+.38,z); mesh.userData={machine}; root.add(mesh); interactive.push(mesh);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(.78,.08,.55),new THREE.MeshStandardMaterial({color:palette[machine.status],emissive:palette[machine.status],emissiveIntensity:.26})); cap.position.set(x,floorYs[zi]+.63,z); root.add(cap); visuals.push({mesh,cap,machine});
    });
    const label = document.createElement('div'); label.className='factory-3d-floor-label'; label.innerHTML=`<b>${zone}工段</b><span>${list.length} 台设备 · ${active} 台生产</span><small>${changing} 台换型 · ${atRisk} 台风险</small>`; floorLabels.appendChild(label);
  });
  const pipeMaterial = new THREE.LineBasicMaterial({color:0x43d4d0,transparent:true,opacity:.7});
  [-1,1].forEach(x=>{const points=[new THREE.Vector3(x*6,floorYs[0]-.08,0),new THREE.Vector3(x*6,floorYs[1]+.08,0),new THREE.Vector3(x*6,floorYs[2]-.08,0)];root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),pipeMaterial));});
  // ---- 三维选中指示器 ----
  // 三维设备是 canvas 里的 mesh，没有 DOM，[data-machine] 高亮选不到它们，
  // 所以点击后必须靠这里给视觉反馈：线框盒 + 提亮发光 + 轻微放大。
  const selector = new THREE.Mesh(
    new THREE.BoxGeometry(1.0,.68,.76),
    new THREE.MeshBasicMaterial({color:0x8fe9ff,wireframe:true,transparent:true,opacity:.95})
  );
  selector.visible = false; root.add(selector);
  let highlighted = null;
  const clearHighlight = () => {
    if(!highlighted) return;
    highlighted.mesh.material.emissiveIntensity = highlighted.baseEmissive;
    highlighted.cap.material.emissiveIntensity = highlighted.baseCap;
    highlighted.mesh.scale.set(1,1,1);
    highlighted = null; selector.visible = false;
  };
  plantHighlightFn = (id) => {
    clearHighlight();
    if(!id || is2D) return;                        // 二维模式用 DOM 高亮
    const hit = visuals.find(v => v.machine.id === id);
    if(!hit || !hit.mesh.visible) return;          // 被状态筛选隐藏时不指示
    highlighted = hit;
    hit.baseEmissive = hit.mesh.material.emissiveIntensity;
    hit.baseCap = hit.cap.material.emissiveIntensity;
    hit.mesh.material.emissiveIntensity = 1.15;
    hit.cap.material.emissiveIntensity = .95;
    hit.mesh.scale.set(1.28,1.28,1.28);
    selector.position.copy(hit.mesh.position);
    selector.visible = true;
  };
  // 只读调试钩子：无头测试与现场排查时用来确认三维选中态，不参与业务逻辑
  window.__plant3d = { selector, visuals, current: () => (highlighted && highlighted.machine.id) || null };

  const resize=()=>{const w=shell.clientWidth,h=shell.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}; resize(); window.addEventListener('resize',resize);
  const showInfo=(machine)=>{const info=target.querySelector('.factory-3d-info');info.hidden=false;info.innerHTML=`<button class="factory-3d-close" aria-label="关闭设备详情">×</button><p class="eyebrow">设备详情 · ${statusText[machine.status]}</p><h3>${machine.id} · ${machine.zone}工段</h3><dl><dt>当前订单</dt><dd>${machine.order}</dd><dt>产能利用率</dt><dd>${machine.capacity}</dd><dt>等待队列</dt><dd>${machine.queue} 项</dd><dt>材料</dt><dd>${machine.material}</dd><dt>换型时间</dt><dd>${machine.change}</dd><dt>风险</dt><dd>${machine.risk}</dd></dl>`;info.querySelector('button').addEventListener('click',()=>{info.hidden=true;});selectMachine(machine.id);};
  const pointFromEvent=(event)=>{const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(interactive)[0];};
  canvas.addEventListener('pointerdown',event=>{dragging=true;moved=false;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!dragging)return; const dx=event.clientX-lastX,dy=event.clientY-lastY; if(Math.abs(dx)+Math.abs(dy)>2)moved=true; yaw-=dx*.008;pitch=Math.max(.22,Math.min(1.05,pitch+dy*.006));lastX=event.clientX;lastY=event.clientY;updateCamera();});
  canvas.addEventListener('pointerup',event=>{if(!moved){const hit=pointFromEvent(event);if(hit)showInfo(hit.object.userData.machine);}dragging=false;canvas.releasePointerCapture(event.pointerId);});
  canvas.addEventListener('wheel',event=>{event.preventDefault();distance=Math.max(11,Math.min(24,distance+event.deltaY*.012));updateCamera();},{passive:false});
  const tick=()=>{renderer.render(scene,camera);requestAnimationFrame(tick);};tick();
}
// 甘特图视角（设备 / 订单）与风险筛选 —— 右上角三个按钮的真实行为
let ganttView='machine';
let ganttRiskOnly=false;
function ganttRows(){
  const flat=[];
  tasks.forEach(t=>{(t.bars||[t]).forEach(b=>flat.push({bar:b,task:t}));});
  const picked=ganttRiskOnly?flat.filter(x=>x.bar.status==='risk'):flat;
  const keyOf=(x)=>ganttView==='order'?String(x.bar.label||x.task.machine):String(x.task.machine);
  const map=new Map();
  picked.forEach(x=>{const k=keyOf(x);if(!map.has(k))map.set(k,[]);map.get(k).push(x);});
  return [...map.entries()].map(([name,items])=>({name,bars:items}));
}
function renderGantt(){
  const rows=ganttRows();
  if(!rows.length){
    $('#ganttRows').innerHTML='<p class="empty-state">当前视角与筛选条件下没有排程任务</p>';
    return;
  }
  $('#ganttRows').innerHTML=rows.map(row=>`<div class="gantt-row"><label>${escapeHtml(row.name)}</label><div class="timeline">${row.bars.map(({bar,task})=>{const code=barCode(bar,task);const title=String(bar.title||'').replace(/"/g,'&quot;').replace(/\n/g,' ⏎ ');return `<button data-task="${escapeHtml(code)}" class="task ${bar.status}" style="left:${bar.left}%;width:${bar.width}%" title="${title}">${escapeHtml(bar.label)}</button>`;}).join('')}</div></div>`).join('');
  document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click',()=>selectMachine(button.dataset.task)));
}
function setGanttView(view){
  ganttView=view;
  document.querySelectorAll('[data-gantt-view]').forEach(b=>b.classList.toggle('selected',b.dataset.ganttView===view));
  renderGantt();
  showToast(view==='order'?'已切换为订单视角：一行一张订单，条形为该订单各工序任务':'已切换为设备视角：一行一台设备');
}
function toggleGanttRisk(){
  ganttRiskOnly=!ganttRiskOnly;
  document.querySelectorAll('[data-gantt-risk]').forEach(b=>b.classList.toggle('selected',ganttRiskOnly));
  renderGantt();
  showToast(ganttRiskOnly?'已筛选：仅显示风险任务':'已恢复显示全部任务');
}
function renderRisks(){
  const list=$('#riskList');
  if(!list)return;
  if(!risks.length){list.innerHTML='<p class="empty-state">当前没有风险条目</p>';return;}
  list.innerHTML = risks.map(r => `<div class="risk-item" ${r.machine?`data-risk-machine="${escapeHtml(r.machine)}"`:''}><i class="risk-badge ${escapeHtml(r.level||'')}"></i><div><b>${escapeHtml(r.title)}</b><p>${escapeHtml(r.text)}</p></div><time>${escapeHtml(r.time)}</time></div>`).join('');
  // 没有关联设备号的风险不再绑定点击（原来点了会定位失败）
  list.querySelectorAll('[data-risk-machine]').forEach(item=>item.addEventListener('click',()=>selectMachine(item.dataset.riskMachine)));
}
function renderOrders(){
  const table=$('#ordersTable');
  if(!table)return;
  if(!orders.length){table.innerHTML='<p class="empty-state">没有订单数据</p>';return;}
  table.innerHTML = orders.map((row,i)=>`<div class="order-row">${row.map((cell,j)=>{const st=String(cell??'');const cls=i&&j===4?(/临期|缺料|逾期/.test(st)?'at-risk':/换型/.test(st)?'hot':''):'';return `<span class="${cls}">${escapeHtml(st)}</span>`;}).join('')}</div>`).join('');
}
function renderAssistant(){
  // 数据可能为空（后端返回空集 / 导入空文件），先兜底，避免整页渲染中断
  if(!selected)selected=machines[0];
  if(!selected){
    $('#assistantContent').innerHTML='<section><h3>当前选中</h3><p>尚未加载设备数据。</p></section>';
    const b=$('#lockTask');if(b)b.textContent='锁定当前安排';
    return;
  }
  const riskText = selected.risk === '无' ? '当前无硬性冲突；保持现有顺序可减少换型。' : selected.risk;
  // 约束依据必须来自数据（后端 constraint_trace 的 R1–R10），不能写死标签。
  // 没有 trace 时如实说明「待引擎提供」，而不是编两条看似专业的依据。
  const traces=Array.isArray(selected.trace)?selected.trace:[];
  const chips=traces.length
    ? traces.map(t=>`<span class="constraint" title="${escapeHtml(t.text||'')}">${escapeHtml(t.rule||'')}${t.impact?' · '+escapeHtml(t.impact):''}</span>`).join('')
    : '<span class="constraint muted">待引擎提供 R1–R10 依据</span>';
  const traceList=traces.length
    ? `<ul class="trace-list">${traces.slice(0,6).map(t=>`<li><b>${escapeHtml(t.rule||'')}</b> ${escapeHtml(t.text||'')}${t.impact?` <em>${escapeHtml(t.impact)}</em>`:''}</li>`).join('')}</ul>`
    : `<p>${selected.order==='待排'?'该设备当前空闲，可作为插单的备选产能。':`订单 ${escapeHtml(selected.order)} 安排在此设备，当前加工 ${escapeHtml(selected.product)}。`}接入确定性算法引擎后，这里会逐条列出该排程受哪几条约束驱动。</p>`;
  $('#assistantContent').innerHTML = `
    <section><h3>当前选中</h3><p><b>${escapeHtml(selected.id)} · ${escapeHtml(selected.zone)}工段</b><br>${selected.status==='risk'?'风险处理优先':selected.status==='change'?'规格切换中':'按计划运行'} · 利用率 ${escapeHtml(selected.capacity)}</p></section>
    <section><h3>约束依据${traces.length?`（${traces.length} 条）`:''}</h3>${chips}${traceList}</section>
    <section><h3>影响评估</h3><p>材料：${escapeHtml(selected.material)}<br>等待队列：${selected.queue} 项 · 下次换型：${escapeHtml(selected.change)}<br>${escapeHtml(riskText)}</p></section>
    <section><h3>建议动作</h3><ul><li>查看同工段可用设备</li><li>${selected.status==='risk'?'将非紧急订单移至同工段低负荷机台后重新评估':lockedMachines.has(selected.id)?'该安排已锁定，重排时会保留':'锁定当前任务，保持排程稳定'}</li><li>进入插单推演对比交期影响</li></ul></section>${lockedMachines.size?`<section><h3>已锁定安排（${lockedMachines.size} 项）</h3><p>${[...lockedMachines].map(escapeHtml).join('、')}<br>重排时这些设备的当前安排将被保留。</p></section>`:''}`;
  const lockBtn=$('#lockTask');
  if(lockBtn)lockBtn.textContent=lockedMachines.has(selected.id)?`解除锁定 ${selected.id}`:'锁定当前安排';
}
function selectMachine(id){
  const next=machines.find(m=>m.id===id);
  if(!next){showToast(`未找到设备 ${id}`);return;}
  selected=next;
  renderAssistant();
  // 原来只找 .machine，但二维矩阵是 .factory-2d-machine、设备态势是 .machine-record，
  // 结果点击设备没有任何视觉反馈。改为按 data-machine 统一高亮。
  document.querySelectorAll('[data-machine]').forEach(e=>e.classList.toggle('selected-machine',e.dataset.machine===id));
  if(plantHighlightFn)plantHighlightFn(id);   // 三维视图高亮（canvas 无 DOM）
  showToast(`已定位 ${id}：${next.zone}工段 · ${next.order}`);
}
function showToast(message){ const t=$('#toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200); }

/* ------------------------------------------------------------------
 * KPI 统一口径（前端演示）
 * 全部指标从同一份数据（tasks / machines / risks）推导，保证页面各处数字自洽：
 * 不再出现「KPI 写死 92.4%，甘特图却挂着红色风险条」这种自相矛盾。
 * 后端接入后（applyBackendData）会锁定为后端口径，本函数自动让位。
 * ------------------------------------------------------------------ */
function computeKpi(){
  const bars=[];tasks.forEach(t=>{(t.bars||[t]).forEach(b=>bars.push(b));});
  const riskBars=bars.filter(b=>b.status==='risk').length;
  const onTime=bars.length?Math.max(0,(bars.length-riskBars)/bars.length):0;
  const caps=machines.map(m=>parseFloat(m.capacity)).filter(v=>Number.isFinite(v));
  const util=caps.length?caps.reduce((a,b)=>a+b,0)/caps.length/100:0;
  const congested=machines.filter(m=>m.status==='risk'||parseFloat(m.capacity)>=95).length;
  const riskOrders=risks.filter(r=>r.level==='risk').length;
  const warnOrders=risks.filter(r=>r.level==='change').length;
  return {onTime,util,congested,riskOrders,warnOrders,bars:bars.length,riskBars,atRiskMachines:riskBars};
}
function renderKpi(){
  if(backendKpiLocked)return;
  const k=computeKpi();
  const set=(sel,text)=>{const el=$(sel);if(el)el.textContent=text;};
  set('#onTimeRate',(k.onTime*100).toFixed(1)+'%');
  set('#utilRate',(k.util*100).toFixed(1)+'%');
  set('#deviceTotal',machines.length+' 台设备');
  set('#congestedCount',String(k.congested));
  set('#riskCount',String(k.riskOrders));
  set('#onTimeDelta',`${k.riskBars}/${k.bars} 条任务有风险`);
  set('#utilDelta',`全厂 ${machines.length} 台均值`);
  set('#congestedNote',k.congested?'需处理':'当前无');
  set('#riskDelta',k.warnOrders?`另有 ${k.warnOrders} 条预警`:'无预警');
  const locked=$('#lockedCount');
  if(locked)locked.textContent=lockedMachines.size+' 项';
}
// KPI 卡点击：按当前数据定位真正的来源，不再固定跳到 8304 / 8218
function focusFromKpi(filter){
  if(filter==='all'){
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.dataset.page==='dashboard'));
    renderModule('dashboard');
    showToast('已返回指挥总览');return;
  }
  if(filter==='risk'){
    const hit=risks.find(r=>r.level==='risk'&&r.machine)||risks.find(r=>r.machine);
    if(hit&&hit.machine){selectMachine(hit.machine);showToast(`已定位风险来源设备 ${hit.machine}`);return;}
    showToast('当前风险条目没有关联设备号');return;
  }
  const ranked=machines.map(m=>({m,cap:parseFloat(m.capacity)})).filter(x=>Number.isFinite(x.cap)).sort((a,b)=>b.cap-a.cap);
  if(ranked.length){selectMachine(ranked[0].m.id);showToast(`已定位负荷最高设备 ${ranked[0].m.id}（利用率 ${ranked[0].m.capacity}）`);return;}
  showToast('当前没有可定位的设备');
}
// 夜间护眼提示（设计规格要求：20:00–06:00 首次进入时提示，不强制切换）
function maybeSuggestEyeCare(){
  const hour=new Date().getHours();
  if(!(hour>=20||hour<6))return;
  if(localStorage.getItem('production-dashboard-eyecare')==='done')return;
  if(document.body.classList.contains('light'))return;
  const bar=document.createElement('div');
  bar.className='eye-care-notice';
  bar.setAttribute('role','status');
  bar.innerHTML=`<span>当前处于夜间时段（20:00–06:00），是否切换为浅色阅读主题以减轻眼部疲劳？</span><button type="button" id="eyeCareYes">切换浅色</button><button type="button" id="eyeCareNo">保持深色</button>`;
  document.body.appendChild(bar);
  const close=()=>{localStorage.setItem('production-dashboard-eyecare','done');bar.remove();};
  bar.querySelector('#eyeCareYes').addEventListener('click',()=>{if(!document.body.classList.contains('light'))toggleTheme();close();});
  bar.querySelector('#eyeCareNo').addEventListener('click',close);
}
function toggleLock(){
  const id=selected?.id;if(!id)return;
  if(lockedMachines.has(id)){lockedMachines.delete(id);showToast(`已解除锁定 ${id}`);}
  else{lockedMachines.add(id);showToast(`已锁定 ${id} 当前安排，后续重排将保留该任务`);}
  renderKpi();renderAssistant();
}
async function requestAiAdvice(){
  const button=$('#aiAssistantButton');
  button.disabled=true; button.textContent='分析中…';
  document.querySelector('.assistant-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
  showToast('AI 正在分析当前排产，通常需要 10–30 秒');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),35000);
  try {
    const response=await fetch(aiConfig.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({request:'请评估当前选中设备的排产风险，并给出下一步人工确认建议。注意：这只是策略建议，不是正式排程。请返回合法 JSON。',selected,nearbyMachines:machines.filter(m=>m.zone===selected.zone).slice(0,8)})});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error || 'AI 服务暂不可用');
    const answer=data.answer||{};
    const escape=value=>String(value??'').replace(/[<>&]/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[char]));
    const risks=Array.isArray(answer.risks)?answer.risks:[];
    const actions=Array.isArray(answer.actions)?answer.actions:[];
    $('#assistantContent').insertAdjacentHTML('afterbegin',`<section class="ai-advice-result"><h3>DeepSeek V4 · 候选策略建议</h3><p class="ai-advice-main">${escape(answer.recommendation||answer.text||'模型未返回文字建议')}</p><div class="ai-advice-columns"><div><b>风险判断</b><ul>${risks.map(item=>`<li>${escape(item)}</li>`).join('')||'<li>未返回额外风险</li>'}</ul></div><div><b>建议动作</b><ul>${actions.map(item=>`<li>${escape(item)}</li>`).join('')||'<li>请人工确认后再试排</li>'}</ul></div></div><small>这是一条 AI 策略建议，尚未经过排产算法校验，不是正式排程。</small></section>`);
    showToast('DeepSeek V4 已返回排产建议');
  } catch(error) {
    const timedOut=error.name==='AbortError';
    const card=`<section class="ai-advice-result ai-advice-error"><h3>AI 服务暂不可用</h3><p class="ai-advice-main">${timedOut?'请求超过 35 秒未返回，可能是网络或后端超时。':escapeHtml(error.message||'无法连接本地 AI 代理')}</p><ol class="ai-advice-steps"><li>确认本地代理已启动：<code>node "F:\\比赛\\黑客松\\智能排产指挥台\\ai-server.js"</code></li><li>确认已设置环境变量 <code>DEEPSEEK_API_KEY</code>——密钥只放后端，不要写进前端文件</li><li>AI 未就绪不影响演示：「人工调序」与「重排推演」两条链路不依赖 AI，可照常进行</li></ol><button type="button" class="ai-retry" id="aiRetry">重试</button></section>`;
    $('#assistantContent').insertAdjacentHTML('afterbegin',card);
    $('#aiRetry')?.addEventListener('click',()=>{document.querySelector('.ai-advice-error')?.remove();requestAiAdvice();});
    showToast(timedOut?'AI 分析超时，已给出排查步骤':'AI 服务未连接，已给出排查步骤');
  }
  finally { clearTimeout(timeout); button.disabled=false; button.textContent='AI排产顾问'; }
}
function simulateInsert(){
  // 再次点击 = 撤回推演，恢复原计划（原来只能演示一次，刷新页面才能重来）
  if(inserted){
    if(insertSnapshot){
      const m=machines.find(x=>x.id===insertSnapshot.machineId);
      if(m){m.capacity=insertSnapshot.capacity;m.queue=insertSnapshot.queue;m.risk=insertSnapshot.risk;}
      tasks=tasks.slice(0,insertSnapshot.tasksLen);
      // 按对象引用删除本次插入的风险，而不是假定它一定在第 1 条
      // （期间可能又插入了别的风险条目，slice 会删错）
      if(insertSnapshot.riskRef)risks=risks.filter(r=>r!==insertSnapshot.riskRef);
    }
    inserted=false;insertSnapshot=null;
    renderGantt();renderRisks();renderKpi();
    showToast('已撤回紧急插单推演，恢复当前计划');
    return;
  }
  if(!machines.length){showToast('当前没有设备数据，无法演示插单');return;}
  // 原来写死 8304/8307：后端数据里若没有这两台就报「缺少 8304」。
  // 改为优先用经典演示机台，找不到就按状态/同工段从真实数据里挑。
  const busy=machines.find(m=>m.id==='8304')||machines.find(m=>m.status==='risk')||machines.find(m=>m.zone==='合绳')||machines[0];
  const peer=machines.find(m=>m.id==='8307')||machines.find(m=>m.zone===busy.zone&&m.id!==busy.id)||busy;
  insertSnapshot={machineId:busy.id,capacity:busy.capacity,queue:busy.queue,risk:busy.risk,tasksLen:tasks.length,riskRef:null};
  inserted=true;
  const oldCapacity=busy.capacity, oldQueue=busy.queue;
  busy.capacity='100%';busy.queue=(Number(busy.queue)||0)+1;busy.risk='急单插入后，原有订单预计顺延 2.5 小时';
  tasks.push({machine:`${peer.id} ${peer.zone}`,label:'急单 JW-999',left:11,width:28,status:'risk'});
  const newRisk={level:'risk',title:'紧急插单 JW-999 已加入推演',text:`${peer.id} 接单可守住急单交期；${busy.id} 原有订单将顺延 2.5 小时`,time:'现在',machine:peer.id};
  risks=[newRisk,...risks];
  insertSnapshot.riskRef=newRisk;
  renderGantt();renderRisks();renderKpi();selectMachine(peer.id);
  showToast(`已生成插单影响方案（${busy.id} 负载 ${oldCapacity}→100%，队列 ${oldQueue}→${busy.queue}）；再次点击可撤回`);
}
function toggleTheme(){document.body.classList.toggle('light');const isLight=document.body.classList.contains('light');localStorage.setItem('production-dashboard-theme',isLight?'light':'dark');$('#themeToggle').textContent=isLight?'◐':'☼';showToast(isLight?'已切换浅色阅读主题':'已切换深色护眼主题');}
const pageMeta = {schedule:['智能排产','设定排产目标、锁定任务并生成可执行计划'],orders:['订单中心','查看订单交期、优先级与工艺匹配状态'],risks:['风险预警','聚焦影响交期与产能承诺的异常'],reschedule:['重排推演','比较插单、停机与物料延迟下的候选方案'],machines:['设备态势','查看全部设备编号的任务与负荷'],data:['数据管理','导入业务数据并导出排产成果']};
function pageFrame(page, body){const [title,sub]=pageMeta[page];return `<div class="module-header"><div><p class="eyebrow">${sub}</p><h2>${title}</h2></div><button class="primary-button" data-page-action="${page}">${page==='data'?'导入 Excel':page==='reschedule'?'新建推演':'导出当前视图'}</button></div>${body}`;}
function schedulePreviewMarkup(){
  const rows=tasks.slice(0,6);
  if(!rows.length)return '<p class="empty-state">当前没有可预览的排程任务</p>';
  const bars=rows.map(t=>{const bs=t.bars||[t];return `<div class="schedule-gantt-row"><b>${escapeHtml(t.machine)}</b><div class="schedule-track">${bs.map(b=>`<span class="plan-task ${b.status==='normal'?'running':b.status==='risk'?'risk':'setup'}" style="left:${b.left}%;width:${b.width}%" title="${escapeHtml(b.title||'')}">${escapeHtml(b.label)}</span>`).join('')}</div></div>`;}).join('');
  return `<div class="schedule-gantt" aria-label="当前计划的设备排程甘特图"><div class="schedule-gantt-head"><b>设备 / 工序</b><span>计划起点</span><span></span><span></span><span></span><span>计划终点</span></div>${bars}</div><div class="chart-legend"><span><i class="running"></i>生产任务</span><span><i class="setup"></i>换型</span><span><i class="risk"></i>风险待确认</span></div>`;
}
function schedulePage(){return pageFrame('schedule',`<div class="module-grid"><section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">优化偏好</p><h2>排产参数</h2></div></div><div class="form-list"><label>优化目标 <select id="optGoal"><option>准时交付优先</option><option>平衡交付与换型</option><option>设备利用率优先</option></select></label><label>排产窗口 <select id="optWindow"><option>未来 7 天</option><option>未来 14 天</option></select></label><label>已锁定任务 <b id="lockedCount">0 项</b></label><button class="primary-button" id="runTrial">生成试排方案</button></div></section><section class="panel module-card span-2"><div class="panel-heading"><div><p class="eyebrow">当前计划 · 设备视角</p><h2>设备排程预览</h2></div><span class="good" id="previewState">已加载</span></div><div id="schedulePreview">${schedulePreviewMarkup()}</div><p class="module-note" id="schedulePreviewNote">前端预演：按当前已加载计划绘制前 ${Math.min(6,tasks.length)} 行（共 ${tasks.length} 个设备行）。正式试排须由确定性算法引擎生成并做约束校验，前端不产出最终排程。</p></section></div>`)}
// 优先级由订单状态推导，不再固定写「第一条=紧急」；工艺匹配统一标「待引擎校验」——
// 导入或演示数据都未经确定性算法校验，不能显示成「已匹配」（项目口径：不伪装成已排程）。
const orderRows = (items=orders.slice(1)) => items.map(r=>{const st=String(r[4]||'');const hot=/临期|缺料|逾期/.test(st);const mid=/换型/.test(st);const pri=hot?'紧急':mid?'高':'常规';return `<div class="order-data" data-order="${escapeHtml(r[0])}"><span>${escapeHtml(r[0])}</span><span>${escapeHtml(r[1])}</span><span>${escapeHtml(r[2])}</span><span>${escapeHtml(r[3])}</span><span class="${hot?'danger':''}">${pri}</span><span>待引擎校验</span></div>`;}).join('') || '<p class="empty-state">没有找到匹配订单</p>';
function ordersPage(){return pageFrame('orders',`<section class="panel module-card"><div class="filter-row"><input id="orderSearch" placeholder="搜索订单号、规格或客户" /><button id="orderRiskFilter">仅看风险</button><button id="orderSort">交期升序 ▾</button><button id="newOrder" class="primary-button">新增订单</button></div><div class="data-table"><div class="data-head"><span>订单号</span><span>规格</span><span>数量</span><span>预发货日</span><span>优先级</span><span>工艺匹配</span></div><div id="orderTableBody">${orderRows()}</div></div></section>`)}
function riskSummaryMarkup(){
  const hard=risks.filter(r=>r.level==='risk').length;
  const warn=risks.filter(r=>r.level==='change').length;
  const devs=new Set(risks.map(r=>r.machine).filter(Boolean)).size;
  return `<div class="risk-summary"><div><b>${hard}</b><span>硬风险</span></div><div><b>${warn}</b><span>预警</span></div><div><b>${devs}</b><span>关联设备</span></div><div><b>${risks.length}</b><span>风险条目</span></div></div>`;
}
function risksPage(){return pageFrame('risks',`${riskSummaryMarkup()}<section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">按影响程度排序</p><h2>待处置风险</h2></div></div><div class="risk-action-list">${risks.map((r,i)=>`<button ${r.machine?`data-risk-machine="${escapeHtml(r.machine)}"`:''} class="risk-action"><i class="${escapeHtml(r.level||'')}"></i><div><b>${escapeHtml(r.title)}</b><p>${escapeHtml(r.text)}</p></div><span>${i===0?'立即处理':'查看方案'} →</span></button>`).join('')||'<p class="empty-state">当前没有待处置风险</p>'}</div></section>`)}
function reschedulePage(){return pageFrame('reschedule',`<div class="scenario-grid"><section class="panel module-card scenario selected" data-scenario="insert"><p class="eyebrow">场景 01</p><h2>紧急插单</h2><p>新订单要求在 24 小时内交付。</p><b class="danger" data-scenario-note="insert">影响 2 张订单</b><button class="primary-button" data-scenario-action="insert">运行推演</button></section><section class="panel module-card scenario" data-scenario="shutdown"><p class="eyebrow">场景 02</p><h2>设备停机</h2><p>选择设备和预计停机时段，计算替代机台。</p><b class="warning" data-scenario-note="shutdown">待选择设备</b><button data-scenario-action="shutdown">配置场景</button></section><section class="panel module-card scenario" data-scenario="material"><p class="eyebrow">场景 03</p><h2>物料延迟</h2><p>评估原材料未到货对下游工序的传播。</p><b class="info" data-scenario-note="material">待录入物料</b><button data-scenario-action="material">配置场景</button></section></div><div id="scenarioConfig" class="scenario-config"></div><section class="panel module-card manual-insert-card"><div class="panel-heading"><div><p class="eyebrow">人工输入 · 模拟预览</p><h2>自定义插单模板</h2></div><span class="module-note">填写后先生成影响预览，不直接改正式排程</span></div><div class="manual-insert-grid"><form id="manualInsertForm" class="manual-insert-form"><label>订单号<input name="orderId" required placeholder="例如 JW-260918-999"></label><label>产品规格<input name="spec" required placeholder="例如 30mm GT34Z"></label><label>数量<input name="quantity" type="number" min="1" required placeholder="米 / 吨"></label><label>要求交期<input name="due" type="datetime-local" required></label><label>物料<input name="material" required placeholder="例如 WSC 绳芯"></label><label>优先级<select name="priority"><option>紧急</option><option>高</option><option>常规</option></select></label><label>首选工段<select name="zone"><option>拉丝</option><option>捻股</option><option>合绳</option><option>不限</option></select></label><label>备注<textarea name="note" rows="2" placeholder="可填写客户、特殊工艺或不可切换设备"></textarea></label><button class="primary-button" type="submit">生成插单预览</button></form><aside class="manual-insert-guide"><h3>填写指导</h3><ol><li>订单号保持唯一，方便后续追踪。</li><li>数量和交期用于判断是否会挤压现有订单。</li><li>物料、首选工段会参与设备适配和换型评估。</li><li>不确定的字段可先填“待确认”，再让计划员补齐。</li></ol><div class="manual-template-example"><b>示例</b><code>JW-260918-999｜30mm GT34Z｜1600m｜09/19 08:00｜WSC 绳芯｜紧急</code></div></aside></div><div id="manualInsertResult" class="manual-insert-result" hidden></div></section><section class="panel module-card compare" id="scenarioCompare"></section>`)}
const machineRows = (items=machines) => items.map(m=>`<button class="machine-record" data-machine="${escapeHtml(m.id)}"><i class="${escapeHtml(m.status||'')}"></i><b>${escapeHtml(m.id)}</b><span>${escapeHtml(m.zone)}</span><span>${escapeHtml(m.order)}</span><span>利用率 ${escapeHtml(m.capacity)}</span><em>${m.status==='normal'?'生产中':m.status==='idle'?'待排':m.status==='change'?'换型中':'风险'}</em></button>`).join('') || '<p class="empty-state">没有符合条件的设备</p>';
function machinesPage(){return pageFrame('machines',`<section class="panel module-card"><div class="filter-row"><input id="machineSearch" placeholder="输入设备编号，例如 8304" /><select id="zoneFilter"><option value="all">全部工段</option><option>拉丝</option><option>捻股</option><option>合绳</option></select><select id="statusFilter"><option value="all">全部状态</option><option value="normal">生产中</option><option value="idle">待排</option><option value="change">换型中</option><option value="risk">风险</option></select></div><div id="machineTable" class="machine-list">${machineRows()}</div></section>`)}
function dataPage(){return pageFrame('data',`<div class="module-grid"><section class="panel module-card upload-card"><p class="eyebrow">导入数据</p><h2>订单与工艺文件</h2><div class="drop-zone" id="dropZone">⇅<b>拖入 Excel 文件</b><span id="fileHint">支持订单、设备、工艺、物料数据</span><input id="dataInput" type="file" accept=".xlsx,.xls,.csv" hidden><button id="chooseFile" type="button">选择文件</button></div><div id="importResult" class="import-result" hidden></div></section><section class="panel module-card"><p class="eyebrow">当前数据源</p><h2>数据状态</h2><div id="sourceList" class="source-list">${sourceListMarkup()}</div></section><section class="panel module-card"><p class="eyebrow">导出成果</p><h2>计划包</h2><div class="source-list"><p><b>排产计划表</b><button data-export="CSV">导出 CSV</button></p><p><b>设备甘特图</b><button data-export="PNG">导出 PNG</button></p><p><b>风险处置清单</b><button data-export="XLSX">导出 XLSX</button></p></div></section><section class="panel module-card import-preview-card" id="importPreviewCard" hidden><div class="panel-heading"><div><p class="eyebrow">标准化数据预览</p><h2>导入校验结果</h2></div><span id="importVersion" class="module-note"></span></div><div id="importSummary" class="import-summary"></div><div id="importIssues" class="import-issues"></div><div id="importRows" class="import-rows"></div></section></div>`)}
// 数据状态卡片：原来写死「内置演示订单 4 条 / 内置设备台账 109 台」，
// 导入数据或接入后端后与实际不符。改为按真实数据渲染。
function sourceListMarkup(){
  const imported=Object.keys(importedDataset.sheets||{}).length>0;
  const orderCount=Math.max(0,orders.length-1);
  return `<p><b>${imported?'已导入文件':'内置演示订单'}</b><span class="good">${orderCount} 条</span></p>`
    +`<p><b>设备台账</b><span class="good">${machines.length} 台</span></p>`
    +`<p><b>数据版本</b><span>${imported?escapeHtml(importedDataset.version):'内置演示'}</span></p>`;
}
// 订单按交期排序：真正重排表格数据（原来只弹一句提示，表却没动）。
// 演示数据的交期是 '09/19 08:00'，导入数据是 '2026-08-07'，两种写法都做兼容解析。
let orderSortAsc=true;
function sortOrdersByDue(){
  // 排序键必须含时分，否则同一天的多张订单会被当成并列（实测踩过：09/19 的 08:00/12:00/16:00 排不动）
  const key=v=>{const s=String(v||'');
    const md=s.match(/(\d{1,2})\/(\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2}))?/);
    if(md)return (Number(md[1])*100+Number(md[2]))*10000+(Number(md[3]||0)*100+Number(md[4]||0));
    const ymd=s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2}))?/);
    if(ymd)return (Number(ymd[2])*100+Number(ymd[3]))*10000+(Number(ymd[4]||0)*100+Number(ymd[5]||0));
    return Number.MAX_SAFE_INTEGER;};
  const rows=orders.slice(1).slice().sort((a,b)=>(key(a[3])-key(b[3]))*(orderSortAsc?1:-1));
  orders=[orders[0],...rows];
  $('#orderTableBody').innerHTML=orderRows(rows);
  showToast(`订单已按预发货日${orderSortAsc?'升序':'降序'}排列`);
}
// 「仅看风险」原来取的是过滤后数组的第 0 与第 3 条，与风险无关（真 bug）。
// 现在按订单状态判定，口径与 orderRows 里的优先级一致。
function applyOrderFilter(){
  const search=$('#orderSearch');
  const query=search?search.value.trim().toLowerCase():'';
  const onlyRisk=$('#orderRiskFilter')?.classList.contains('selected');
  let visible=orders.slice(1).filter(row=>row.join(' ').toLowerCase().includes(query));
  if(onlyRisk)visible=visible.filter(row=>/临期|缺料|逾期|风险/.test(String(row[4]||'')));
  const body=$('#orderTableBody');
  if(body)body.innerHTML=orderRows(visible);
}
function applyMachineFilter(){const query=$('#machineSearch').value.trim();const zone=$('#zoneFilter').value;const status=$('#statusFilter').value;const visible=machines.filter(m=>(!query||m.id.includes(query))&&(zone==='all'||m.zone===zone)&&(status==='all'||m.status===status));$('#machineTable').innerHTML=machineRows(visible);$('#machineTable').querySelectorAll('[data-machine]').forEach(btn=>btn.addEventListener('click',()=>selectMachine(btn.dataset.machine)));}
function setScenario(kind,silent){
  const meta={insert:['紧急插单','急单插入后需重算受影响设备队列与交期，候选设备见下方模板。'],shutdown:['设备停机','建议将停机设备的后续队列分流至同工段空闲机台，并锁定已开工任务。'],material:['物料延迟','建议提前分配现有库存至临近交期订单，并评估下游工序顺延。']}[kind];
  document.querySelectorAll('.scenario').forEach(card=>card.classList.toggle('selected',card.dataset.scenario===kind));
  const k=computeKpi();
  const pending='待引擎试排';
  $('#scenarioCompare').innerHTML=`<div><b>${meta[0]}方案对比</b><span>当前计划</span><span>推荐方案</span><span>低扰动</span></div><div><b>准时交付率</b><span>${(k.onTime*100).toFixed(1)}%</span><span>${pending}</span><span>${pending}</span></div><div><b>风险订单</b><span>${k.riskOrders}</span><span>${pending}</span><span>${pending}</span></div><p class="module-note">${meta[1]} 当前计划口径由页面数据实时推导；候选方案须由确定性算法引擎 /api/replan/config 试排后填入，前端不编造推演数字。</p>`;
  refreshScenarioNotes();
  setScenarioConfig(kind);
  renderKpi();
  if(!silent)showToast(`已切换至“${meta[0]}”推演方案`);
}
// 场景卡上的角标改为随数据变化，避免写死的「影响 2 张订单」长期不动。
function refreshScenarioNotes(){
  const k=computeKpi();
  const set=(kind,text)=>{const el=document.querySelector(`[data-scenario-note="${kind}"]`);if(el)el.textContent=text;};
  set('insert',`当前 ${k.riskOrders} 张风险订单`);
  set('shutdown','待选择设备');
  set('material','待录入物料');
}
function setupModule(page){const view=$('#moduleView');view.querySelectorAll('[data-machine]').forEach(btn=>btn.addEventListener('click',()=>{selectMachine(btn.dataset.machine);showToast(`已选中设备 ${btn.dataset.machine}`)}));view.querySelectorAll('[data-risk-machine]').forEach(btn=>btn.addEventListener('click',()=>{selectMachine(btn.dataset.riskMachine);renderModule('dashboard')}));if(page==='orders'){const search=$('#orderSearch');search.addEventListener('input',applyOrderFilter);$('#orderRiskFilter').addEventListener('click',event=>{event.currentTarget.classList.toggle('selected');applyOrderFilter()});$('#orderSort').addEventListener('click',()=>{orderSortAsc=!orderSortAsc;const el=$('#orderSort');if(el)el.textContent=`交期${orderSortAsc?'升序':'降序'} ▾`;sortOrdersByDue();});$('#newOrder').addEventListener('click',()=>{renderModule('reschedule');setScenario('insert',true);document.querySelector('.manual-insert-card')?.scrollIntoView({behavior:'smooth',block:'start'});showToast('新增订单请使用人工调序插单模板');});}if(page==='machines'){['machineSearch','zoneFilter','statusFilter'].forEach(id=>$('#'+id).addEventListener(id==='machineSearch'?'input':'change',applyMachineFilter));}if(page==='reschedule'){view.querySelectorAll('.scenario').forEach(card=>card.addEventListener('click',()=>setScenario(card.dataset.scenario)));const form=$('#manualInsertForm');form.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(form),orderId=data.get('orderId'),spec=data.get('spec'),quantity=data.get('quantity'),due=data.get('due'),material=data.get('material'),priority=data.get('priority'),zone=data.get('zone');const result=$('#manualInsertResult');result.hidden=false;result.innerHTML=`<b>已生成人工插单预览：${orderId}</b><span>${spec} · ${quantity} · ${due.replace('T',' ')} · ${material}</span><span>优先级：${priority} · 首选工段：${zone}</span><small>下一步：进入“运行推演”比较对现有订单交期和换型窗口的影响。</small>`;showToast('人工插单模板已生成预览');});view.querySelectorAll('[data-scenario-action]').forEach(btn=>btn.addEventListener('click',event=>{event.stopPropagation();setScenario(btn.dataset.scenarioAction);}));setScenario('insert',true);}if(page==='schedule'){$('#runTrial')?.addEventListener('click',updateSchedulePreview);}if(page==='data'){const input=$('#dataInput');$('#chooseFile').addEventListener('click',()=>input.click());input.addEventListener('change',()=>{const file=input.files[0];if(file){$('#fileHint').textContent=`已选择：${file.name}（${Math.ceil(file.size/1024)} KB），等待解析`;}});view.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.export;if(kind==='CSV')exportScheduleCSV();else if(kind==='PNG')exportGanttPNG();else if(kind==='XLSX')exportRisksXLSX();}));}const action=view.querySelector('[data-page-action]');if(action)action.addEventListener('click',()=>{const p=action.dataset.pageAction;if(p==='data')$('#dataInput')?.click();else if(p==='reschedule'){setScenario('insert');document.querySelector('.manual-insert-card')?.scrollIntoView({behavior:'smooth',block:'start'});}else exportCurrentView(p);});}
function renderModule(page){const view=$('#moduleView'), dashboard=$('#dashboardContent');
  // 导航高亮与无障碍状态统一在此处设置，避免多个入口各自维护、状态不一致
  document.querySelectorAll('.nav-item').forEach(item=>{const on=item.dataset.page===page;item.classList.toggle('active',on);if(on)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});
  if(page==='dashboard'){dashboard.hidden=false;view.hidden=true;$('#assistantPanel').hidden=false;$('.topbar h1').textContent='生产指挥总览';return;}dashboard.hidden=true;view.hidden=false;$('#assistantPanel').hidden=page==='data';$('.topbar h1').textContent=pageMeta[page][0];view.innerHTML=({schedule:schedulePage,orders:ordersPage,risks:risksPage,reschedule:reschedulePage,machines:machinesPage,data:dataPage}[page])();setupModule(page);}
function init(){if(localStorage.getItem('production-dashboard-theme')==='light'){document.body.classList.add('light');$('#themeToggle').textContent='◐'}renderPlant();renderGantt();renderRisks();renderOrders();renderAssistant();renderKpi();maybeSuggestEyeCare();$('#themeToggle').addEventListener('click',toggleTheme);$('#simulateButton').addEventListener('click',simulateInsert);$('#aiAssistantButton').addEventListener('click',requestAiAdvice);$('#manualInsertButton').addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.page==='reschedule'));renderModule('reschedule');document.querySelector('.manual-insert-card')?.scrollIntoView({behavior:'smooth',block:'start'});});$('#lockTask').addEventListener('click',toggleLock);document.querySelectorAll('[data-gantt-view]').forEach(b=>b.addEventListener('click',()=>setGanttView(b.dataset.ganttView)));document.querySelectorAll('[data-gantt-risk]').forEach(b=>b.addEventListener('click',()=>toggleGanttRisk()));document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>renderModule(b.dataset.goto)));document.querySelectorAll('.kpi-card').forEach(card=>card.addEventListener('click',()=>focusFromKpi(card.dataset.filter)));document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));item.classList.add('active');renderModule(item.dataset.page)}));}
init();

function normalizeHeader(value){return String(value||'').trim().toLowerCase().replace(/[\s_—-]/g,'');}
function classifySheet(name, rows){const key=`${name} ${Object.keys(rows[0]||{}).join(' ')}`;if(/订单|order|交期|客户/.test(key))return 'orders';if(/设备|machine|机台|产能/.test(key))return 'devices';if(/工艺|process|工序|路线/.test(key))return 'processes';if(/物料|material|库存|原料/.test(key))return 'materials';return 'other';}
// 候选设备只做「空闲优先 + 利用率升序」的排序，并如实展示设备当前状态；
// 不再编造「匹配度 %」「预计开始时刻」「影响订单数」这类必须由算法引擎给出的结论。
function renderInsertCandidates(data){
  const requestedZone=data.zone==='不限'?null:data.zone;
  const base=machines.filter(machine=>!requestedZone||machine.zone===requestedZone);
  const rank=m=>{const idle=m.status==='idle'?0:1;const cap=parseFloat(m.capacity);return [idle,Number.isFinite(cap)?cap:999,m.queue||0];};
  return base.slice().sort((a,b)=>{const ra=rank(a),rb=rank(b);return ra[0]-rb[0]||ra[1]-rb[1]||ra[2]-rb[2];}).slice(0,3).map(m=>({machine:m}));
}
// 插单前后对比：当前值实时推导；插入后结果必须由算法引擎试排，前端不填假数字。
function insertCompareMarkup(){
  const k=computeKpi();
  return `<div class="insert-kpi-compare"><b>当前计划</b><span>准时交付率 ${(k.onTime*100).toFixed(1)}%</span><span>风险订单 ${k.riskOrders}</span><b>插入后预估</b><span>待引擎试排</span><span>待引擎试排</span></div>`;
}
function candidateMarkup(candidates){return `<div class="candidate-title">候选设备（按空闲优先、利用率升序排列 · 前端预演）</div><div class="candidate-list">${candidates.map((c,index)=>{const m=c.machine;const st=m.status==='idle'?'空闲':m.status==='risk'?'风险':'在产';return `<button type="button" class="candidate-row ${index===0?'selected':''}" data-candidate-machine="${escapeHtml(m.id)}"><span><b>${escapeHtml(m.id)} · ${escapeHtml(m.zone)}</b><small>${escapeHtml(m.order==='待排'?'当前待排':`当前 ${m.order}`)} · 利用率 ${escapeHtml(m.capacity)}</small></span><strong>${st}<small>当前状态</small></strong><em>队列 ${m.queue} 项<br />换型 ${escapeHtml(m.change)}</em></button>`;}).join('')}</div><div class="candidate-actions"><button type="button" class="primary-button" id="confirmCandidate">确认采用候选方案</button><button type="button" id="rejectCandidate">保留当前计划</button></div>`;}
document.addEventListener('change',event=>{if(event.target.id!=='dataInput')return;const file=event.target.files[0];if(file)parseImportFile(file).catch(error=>{console.error(error);const hint=$('#fileHint');if(hint)hint.textContent=`解析失败：${error.message||'文件格式不支持'}，请改用 UTF-8 CSV 或检查 Excel 文件`;showToast('文件解析失败，已显示具体原因')});});
document.addEventListener('click',event=>{if(event.target.closest('#dropZone')&&event.target.closest('#dropZone').id==='dropZone'&&event.target.id!=='chooseFile')$('#dataInput')?.click();});
document.addEventListener('dragover',event=>{const zone=event.target.closest('#dropZone');if(zone){event.preventDefault();zone.classList.add('dragging');}});
document.addEventListener('dragleave',event=>{const zone=event.target.closest('#dropZone');if(zone)zone.classList.remove('dragging');});
document.addEventListener('drop',event=>{const zone=event.target.closest('#dropZone');if(!zone)return;event.preventDefault();zone.classList.remove('dragging');const file=event.dataTransfer.files[0];if(file)parseImportFile(file).catch(error=>{console.error(error);showToast('文件解析失败，请检查格式')});});
document.addEventListener('submit',event=>{if(event.target.id!=='manualInsertForm')return;event.preventDefault();event.stopImmediatePropagation();const data=new FormData(event.target),orderId=data.get('orderId'),spec=data.get('spec'),quantity=data.get('quantity'),due=data.get('due'),material=data.get('material'),priority=data.get('priority'),zone=data.get('zone'),result=$('#manualInsertResult'),candidates=renderInsertCandidates({zone});result.hidden=false;result.innerHTML=`<b>已生成人工插单预览：${orderId}</b><span>${spec} · ${quantity} · ${due.replace('T',' ')} · ${material}</span><span>优先级：${priority} · 首选工段：${zone}</span>${candidateMarkup(candidates)}${insertCompareMarkup()}`;result.querySelectorAll('[data-candidate-machine]').forEach(button=>button.addEventListener('click',()=>{result.querySelectorAll('[data-candidate-machine]').forEach(item=>item.classList.remove('selected'));button.classList.add('selected');}));$('#confirmCandidate').addEventListener('click',()=>{const chosen=result.querySelector('.candidate-row.selected');showToast(`已提交人工确认：${chosen?.dataset.candidateMachine||'候选方案'}，等待算法引擎校验`);result.insertAdjacentHTML('beforeend','<div class="confirm-state good">已记录人工确认，尚未覆盖正式排程。</div>');});$('#rejectCandidate').addEventListener('click',()=>{showToast('已保留当前计划');result.insertAdjacentHTML('beforeend','<div class="confirm-state">已保留当前计划，未做排程变更。</div>');});showToast('人工插单已生成候选设备与影响预览');},true);

// 把日期值格式化为 'YYYY-MM-DD'：Excel 日期经 SheetJS 解析成 Date 对象后，直接拼字符串会变成浏览器时区的英文长串（如英国夏令时），这里统一成干净的中性日期。
function fmtDate(value){const pad=n=>String(n).padStart(2,'0');if(value instanceof Date && !isNaN(value.getTime())){let out=value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate());if(value.getHours()||value.getMinutes())out+=' '+pad(value.getHours())+':'+pad(value.getMinutes());return out;}if(value==null)return '';return String(value).trim();}
// 把导入的订单表映射到全局 orders，让「订单中心」和总览「优先订单」联动显示导入数据。
// 状态统一标“待确认”：导入数据未经过排产引擎，不伪装成已排程（遵守项目口径）。
function applyImportedOrders(){
  const aliases={id:['订单号','订单编号','项目编号','内部订单单号','订单单号'],spec:['产品规格','规格','品名'],qty:['数量','业务数量','计价数量'],due:['预发货日','交期','订单日期','交货日期','计划交期','要求交期']};
  const find=(row,fields)=>{for(const k in row){if(fields.some(f=>normalizeHeader(k).includes(normalizeHeader(f))))return row[k];}return '';};
  const mapped=[];
  Object.entries(importedDataset.sheets).forEach(([name,rows])=>{
    if(classifySheet(name,rows)!=='orders')return;
    rows.forEach(row=>{
      const id=String(find(row,aliases.id)??'').trim();
      if(!id)return;
      mapped.push([id,String(find(row,aliases.spec)??'').trim()||'—',String(find(row,aliases.qty)??'').trim()||'—',fmtDate(find(row,aliases.due))||'—','待确认']);
    });
  });
  if(!mapped.length)return 0;
  orders=['订单号','产品规格','数量','交期','状态',...mapped];
  renderOrders();
  return mapped.length;
}
// 覆盖 CSV 读取：优先按 UTF-8 文本解析，避免 Excel/系统代码页导致中文字段乱码。
async function parseImportFile(file){let sheets={};if(/\.csv$/i.test(file.name)){const text=new TextDecoder('utf-8').decode(await file.arrayBuffer());const lines=text.split(/\r?\n/).filter(line=>line.trim());const split=line=>{const values=[];let value='',quoted=false;for(const char of line){if(char==='"'){quoted=!quoted;continue;}if(char===','&&!quoted){values.push(value.trim());value='';}else value+=char;}values.push(value.trim());return values;};const headers=split(lines.shift()||'');sheets[file.name]=lines.map(line=>Object.fromEntries(split(line).map((value,index)=>[headers[index]||`字段${index+1}`,value])));}else{const buffer=await file.arrayBuffer();if(!window.XLSX)throw new Error('XLSX parser unavailable');const workbook=XLSX.read(buffer,{type:'array',cellDates:true});workbook.SheetNames.forEach(name=>{const rows=XLSX.utils.sheet_to_json(workbook.Sheets[name],{defval:''});if(rows.length)sheets[name]=rows;});}const checked=validateImportedSheets(sheets);importedDataset={version:`import-${new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)}`,sheets,rows:Object.values(sheets).flat(),summary:checked.summary,issues:checked.issues,warnings:checked.warnings};renderImportResult(file.name);const linked=applyImportedOrders();showToast(linked?('已同步 '+linked+' 条导入订单到订单中心'+(checked.issues.length?'，'+checked.issues.length+' 项需确认':'')):(checked.issues.length?('文件已解析，发现 '+checked.issues.length+' 项需要确认'):'文件解析完成，可用于插队候选计算'));}
function validateImportedSheets(sheets){const issues=[],warnings=[],summary={orders:0,devices:0,processes:0,materials:0};const aliases={orders:{id:['订单号','订单编号','项目编号','内部订单单号','订单单号'],due:['交期','订单日期','交货日期','计划交期','要求交期']},devices:{id:['设备编号','设备号','机台编号','机台号','设备']},processes:{id:['工序','工艺','工序名称']},materials:{id:['物料','物料编码','原料','库存物料']}};const hasAlias=(headers,fields)=>fields.some(field=>headers.some(header=>header.includes(normalizeHeader(field))));Object.entries(sheets).forEach(([name,rows])=>{const type=classifySheet(name,rows);if(type==='other')return;summary[type]+=rows.length;const headers=Object.keys(rows[0]||{}).map(normalizeHeader);if(type==='orders'){if(!hasAlias(headers,aliases.orders.id))issues.push(`${name}：未找到订单编号字段`);if(!hasAlias(headers,aliases.orders.due))issues.push(`${name}：未找到交期/订单日期字段`);}else if(type==='devices'&&!hasAlias(headers,aliases.devices.id))issues.push(`${name}：未找到设备编号字段`);else if(type==='processes'&&!hasAlias(headers,aliases.processes.id))issues.push(`${name}：未找到工序字段`);else if(type==='materials'&&!hasAlias(headers,aliases.materials.id))issues.push(`${name}：未找到物料字段`);const idFields=aliases[type]?.id||[];const idKey=Object.keys(rows[0]||{}).find(k=>idFields.some(field=>normalizeHeader(k).includes(normalizeHeader(field))));if(idKey){const seen=new Set();rows.forEach((row,index)=>{const id=String(row[idKey]??'').trim();if(!id)warnings.push(`${name} 第 ${index+2} 行：编号为空`);else if(seen.has(id))warnings.push(`${name}：编号 ${id} 重复`);seen.add(id);});}});if(summary.orders===0)warnings.push('未识别到订单数据，将继续使用内置演示订单');if(summary.devices===0)warnings.push('本文件未包含设备数据，将沿用页面内置设备台账');return {summary,issues,warnings};}
function renderImportResult(fileName){const card=$('#importPreviewCard');if(!card)return;card.hidden=false;const s=importedDataset.summary;$('#importVersion').textContent=importedDataset.version;$('#importSummary').innerHTML=`<div><b>${s.orders}</b><span>订单</span></div><div><b>${s.devices}</b><span>设备</span></div><div><b>${s.processes}</b><span>工艺</span></div><div><b>${s.materials}</b><span>物料</span></div>`;const checked=importedDataset;const issueItems=[...(checked.issues||[]).map(issue=>`<li>${issue}</li>`),...(checked.warnings||[]).map(warning=>`<li class="import-warning">${warning}</li>`)];$('#importIssues').innerHTML=issueItems.length?`<strong>${checked.issues?.length?'需要人工确认':'导入提示'}（${issueItems.length}）</strong><ul>${issueItems.join('')}</ul>`:'<strong class="good">校验通过：字段完整，可进入插队候选计算</strong>';const rows=Object.entries(importedDataset.sheets).flatMap(([name,values])=>values.slice(0,3).map(row=>({name,row}))).slice(0,8);$('#importRows').innerHTML=rows.length?`<div class="import-row-head"><span>来源</span><span>关键字段预览</span></div>${rows.map(({name,row})=>`<div class="import-row"><span>${name}</span><span>${Object.entries(row).slice(0,4).map(([k,v])=>`${k}: ${fmtDate(v)}`).join(' · ')}</span></div>`).join('')}`:'<p class="empty-state">文件中没有可预览数据</p>';$('#fileHint').textContent=`已解析：${fileName} · ${Object.keys(importedDataset.sheets).length} 个数据表`;$('#sourceList').innerHTML=`<p><b>${fileName}</b><span class="good">${s.orders} 条订单</span></p><p><b>设备台账</b><span class="good">${s.devices||machines.length} 台设备</span></p><p><b>数据版本</b><span>${importedDataset.version}</span></p>`;}

/* ------------------------------------------------------------------
 * 真实交互层（替代原来的占位提示）
 * 导出：CSV / XLSX（本地 SheetJS）/ PNG（canvas 绘制）—— 真实产生文件
 * 试排：按当前已加载计划重绘预览（前端预演，不产出最终排程）
 * 场景：停机 / 物料延迟的影响预演，基于当前台账与任务计算
 * ------------------------------------------------------------------ */

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function stamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;}
function barCode(bar,task){const raw=String((bar&&bar.machine)||(task&&task.machine)||'');const m=raw.match(/\d{4}/);return m?m[0]:raw;}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function downloadText(text,filename,mime){downloadBlob(new Blob(['﻿'+text],{type:mime||'text/plain;charset=utf-8'}),filename);}
function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function scheduleRows(){const out=[];tasks.forEach(t=>{const bs=t.bars||[t];bs.forEach(b=>out.push({设备:barCode(b,t),工序:(String(t.machine).replace(/\d{4}\s*/,'').trim())||'',订单或状态:String(b.label||''),状态:String(b.status||''),说明:String(b.title||'').replace(/\n/g,' ')}));});return out;}

function exportScheduleCSV(){
  const rows=scheduleRows();
  if(!rows.length){showToast('当前没有可导出的排程');return;}
  const head=['设备','工序','订单或状态','状态','说明'];
  const csv=[head,...rows.map(r=>head.map(h=>r[h]))].map(r=>r.map(csvCell).join(',')).join('\r\n');
  downloadText(csv,`排产计划-${stamp()}.csv`,'text/csv;charset=utf-8');
  showToast(`已导出排产计划 CSV（${rows.length} 条任务）`);
}
function exportGanttPNG(){
  const rows=tasks.map(t=>({machine:t.machine,bars:(t.bars||[t])}));
  if(!rows.length){showToast('当前没有可导出的甘特任务');return;}
  const rowH=28,padTop=48,padLeft=132,width=1100,trackW=width-padLeft-40;
  const height=padTop+rows.length*rowH+34;
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const g=c.getContext('2d');
  const light=document.body.classList.contains('light');
  g.fillStyle=light?'#f4f8fb':'#0b1a26';g.fillRect(0,0,width,height);
  g.fillStyle=light?'#08273a':'#f2f8fc';g.font='bold 16px sans-serif';
  g.fillText('设备甘特图 · 当前计划',padLeft,28);
  g.font='12px sans-serif';g.fillStyle=light?'#385d71':'#a5bfce';
  g.fillText(`导出 ${new Date().toLocaleString('zh-CN')}`,padLeft,44);
  const colors={normal:'#57ca8c',idle:'#3a9cff',change:'#f0b65a',risk:'#ef6b75'};
  rows.forEach((r,i)=>{
    const y=padTop+i*rowH;
    g.fillStyle=light?'#000000':'#d0e1eb';g.font='12px sans-serif';
    g.fillText(String(r.machine).slice(0,18),8,y+18);
    g.fillStyle=light?'#dce8f0':'#12384c';g.fillRect(padLeft,y+4,trackW,rowH-12);
    r.bars.forEach(b=>{
      const left=Number(b.left)||0,wid=Number(b.width)||1;
      const x=padLeft+trackW*left/100;
      const w=Math.max(3,trackW*wid/100);
      g.fillStyle=colors[b.status]||'#3a9cff';g.fillRect(x,y+4,w,rowH-12);
      if(w>34){g.fillStyle='#06202e';g.font='10px sans-serif';g.fillText(String(b.label||'').slice(0,10),x+4,y+17);}
    });
  });
  c.toBlob(blob=>{if(blob){downloadBlob(blob,`设备甘特图-${stamp()}.png`);showToast('已导出设备甘特图 PNG');}},'image/png');
}
function exportRisksXLSX(){
  if(!risks.length){showToast('当前没有可导出的风险条目');return;}
  const data=risks.map(r=>({级别:r.level||'',标题:r.title||'',说明:r.text||'',时间:r.time||'',关联设备:r.machine||''}));
  if(window.XLSX){
    const ws=XLSX.utils.json_to_sheet(data);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'风险处置清单');
    XLSX.writeFile(wb,`风险处置清单-${stamp()}.xlsx`);
    showToast(`已导出风险处置清单 XLSX（${data.length} 条）`);
    return;
  }
  const head=['级别','标题','说明','时间','关联设备'];
  const csv=[head,...data.map(r=>head.map(h=>r[h]))].map(r=>r.map(csvCell).join(',')).join('\r\n');
  downloadText(csv,`风险处置清单-${stamp()}.csv`,'text/csv;charset=utf-8');
  showToast('XLSX 组件不可用，已改导出 CSV');
}
function exportCurrentView(page){
  if(page==='orders'){
    const head=orders[0],body=orders.slice(1);
    const csv=[head,...body].map(r=>r.map(csvCell).join(',')).join('\r\n');
    downloadText(csv,`订单中心-${stamp()}.csv`,'text/csv;charset=utf-8');
    showToast(`已导出订单中心 CSV（${body.length} 条）`);return;
  }
  if(page==='machines'){
    const data=machines.map(m=>({设备编号:m.id,工段:m.zone,状态:m.status,当前订单:m.order,产品:m.product,材料:m.material,利用率:m.capacity,队列:m.queue,换型:m.change,风险:m.risk}));
    const head=['设备编号','工段','状态','当前订单','产品','材料','利用率','队列','换型','风险'];
    const csv=[head,...data.map(r=>head.map(h=>r[h]))].map(r=>r.map(csvCell).join(',')).join('\r\n');
    downloadText(csv,`设备态势-${stamp()}.csv`,'text/csv;charset=utf-8');
    showToast(`已导出设备态势 CSV（${data.length} 台）`);return;
  }
  if(page==='risks'){exportRisksXLSX();return;}
  exportScheduleCSV();
}
function updateSchedulePreview(){
  const box=$('#schedulePreview');
  if(!box)return;
  box.innerHTML=schedulePreviewMarkup();
  const note=$('#schedulePreviewNote');
  if(note)note.textContent=`前端预演：已于 ${new Date().toLocaleTimeString('zh-CN')} 按当前计划重绘，共 ${tasks.length} 个设备行。正式试排须由确定性算法引擎生成并做约束校验，前端不产出最终排程。`;
  const state=$('#previewState');
  if(state)state.textContent='已刷新';
  showToast('已按当前优化偏好重绘排程预览');
}

/* 场景配置与影响预演（前端预演，正式重排由算法引擎 /api/replan/config 产出） */
function scenarioConfigMarkup(kind){
  if(kind==='shutdown'){
    const opts=machines.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.id)} · ${escapeHtml(m.zone)} · ${escapeHtml(m.order==='待排'?'当前待排':m.order)}</option>`).join('');
    return `<section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">场景 02 · 参数</p><h2>设置停机设备与时长</h2></div></div><div class="scenario-form"><label>停机设备<select id="shutdownDevice">${opts}</select></label><label>停机时长（小时）<input id="shutdownHours" type="number" min="1" max="240" value="8" /></label><button class="primary-button" id="runShutdown" type="button">生成影响预演</button></div><div id="scenarioResult" class="scenario-result"></div></section>`;
  }
  if(kind==='material'){
    return `<section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">场景 03 · 参数</p><h2>录入物料延迟</h2></div></div><div class="scenario-form"><label>物料名称<input id="materialName" placeholder="例如 WSC 绳芯 / IWRC 绳芯" value="WSC 绳芯" /></label><label>延迟小时<input id="materialHours" type="number" min="1" max="240" value="12" /></label><button class="primary-button" id="runMaterial" type="button">生成影响预演</button></div><div id="scenarioResult" class="scenario-result"></div></section>`;
  }
  const total=tasks.length;
  return `<section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">场景 01 · 参数</p><h2>紧急插单</h2></div></div><p class="module-note">紧急插单请使用下方「自定义插单模板」填写订单明细；这里给出当前计划的整体规模作为对比基线。</p><div class="scenario-form"><button class="primary-button" id="runInsertBaseline" type="button">查看当前计划基线</button></div><div id="scenarioResult" class="scenario-result">${total?`<p>当前计划共 ${total} 个设备行任务。</p>`:''}</div></section>`;
}
function affectPreview(payload){
  const zone=payload.zone||'';
  const rows=scheduleRows().filter(r=>!zone||r.工序===zone||machines.some(m=>m.id===r.设备&&m.zone===zone));
  const machinesInZone=zone?machines.filter(m=>m.zone===zone):machines;
  const idle=machinesInZone.filter(m=>m.status==='idle');
  const affected=rows.length;
  const alternatives=idle.slice(0,3).map(m=>`${m.id}（${m.status==='idle'?'待排':'负荷 '+m.capacity}）`).join('、')||'同工段暂无空闲机台';
  return {affected,alternatives,zone};
}
function runScenarioPreview(kind){
  const box=$('#scenarioResult');
  if(!box)return;
  if(kind==='shutdown'){
    const code=$('#shutdownDevice')?.value||'';
    const hours=Number($('#shutdownHours')?.value||0);
    const dev=machines.find(m=>m.id===code);
    if(!dev){showToast('请选择停机设备');return;}
    const hit=scheduleRows().filter(r=>r.设备===code);
    const info=affectPreview({zone:dev.zone});
    box.innerHTML=`<div class="scenario-impact"><b>影响预演：${escapeHtml(code)} 停机 ${hours} 小时</b><ul><li>该设备当前有 <b>${hit.length}</b> 条任务受影响，需改派或顺延</li><li>同工段（${escapeHtml(dev.zone)}）当前计划任务 <b>${info.affected}</b> 条</li><li>可承接的候选机台：${escapeHtml(info.alternatives)}</li></ul><small>前端预演：按当前台账与任务清单估算，未做设备时间重叠与工艺适配校验；正式重排须由算法引擎 /api/replan/config 产出。</small></div>`;
    showToast(`已生成 ${code} 停机影响预演`);return;
  }
  if(kind==='material'){
    const name=$('#materialName')?.value||'物料';
    const hours=Number($('#materialHours')?.value||0);
    const zones=tasks.length?[...new Set(machines.map(m=>m.zone))]:[];
    const downstream=scheduleRows().length;
    box.innerHTML=`<div class="scenario-impact"><b>影响预演：${escapeHtml(name)} 延迟 ${hours} 小时</b><ul><li>可能影响下游工序任务 <b>${downstream}</b> 条</li><li>涉及工段：${zones.map(z=>escapeHtml(z)).join('、')||'—'}</li><li>建议：优先把现有库存分配给临近交期订单，并锁定已开工任务</li></ul><small>前端预演：物料与订单的对应关系由算法引擎维护，这里仅给出规模估算，不作为正式结论。</small></div>`;
    showToast('已生成物料延迟影响预演');return;
  }
  const boxSrc=scheduleRows();
  box.innerHTML=`<div class="scenario-impact"><b>当前计划基线</b><ul><li>设备行任务 <b>${tasks.length}</b> 个，任务条 <b>${boxSrc.length}</b> 条</li><li>风险条目 <b>${risks.length}</b> 条</li><li>插单请使用下方模板，提交后生成候选设备与影响预览</li></ul><small>前端预演：基线来自当前已加载计划。</small></div>`;
}
function setScenarioConfig(kind){
  const host=$('#scenarioConfig');
  if(host)host.innerHTML=scenarioConfigMarkup(kind);
  const run={shutdown:'#runShutdown',material:'#runMaterial',insert:'#runInsertBaseline'}[kind];
  const btn=run?$(run):null;
  if(btn)btn.addEventListener('click',()=>runScenarioPreview(kind));
}

/* ------------------------------------------------------------------
 * 数据接入层（后端就绪）
 * 前端只负责“画”，业务规则与状态口径由后端算好。后端算法完成后，
 * 调用 window.applyBackendData(payload) 把 /api/dashboard 结果灌进来即可，
 * 无需改动任何渲染函数；未调用时页面保持上方内置演示数据。
 * payload 契约（与「智能排产助手-v1」的 /api/dashboard 对齐）：
 *   machines : [{id, zone, status, order, product, material, capacity, queue, change, risk, note?, trace?}]
 *   tasks    : [{machine:'8304 合绳', bars:[{label, left, width, status, title?, machine}]}]
 *   risks    : [{level, title, text, time, machine}]
 *   orders   : [['订单号','产品规格','数量','交期','状态'], [...], ...]
 *   kpi      : {on_time_rate, on_time_rate_fresh, utilization, device_total, congested, risk_orders}
 *   gantt    : {labels:[...], days}
 *   engines  : {scheduler, tasks, changeovers}
 * ------------------------------------------------------------------ */
window.applyBackendData = function (d) {
  if (!d) return;
  backendKpiLocked = true;   // 后端口径优先，前端不再自行推算 KPI
  // 整体换数据前先丢弃前端推演的临时状态，否则撤回时会去改后端数据
  inserted=false; insertSnapshot=null; lockedMachines.clear();
  if (Array.isArray(d.machines) && d.machines.length) machines = d.machines;
  if (Array.isArray(d.tasks) && d.tasks.length) tasks = d.tasks;
  if (Array.isArray(d.risks) && d.risks.length) risks = d.risks;
  if (Array.isArray(d.orders) && d.orders.length) orders = d.orders;

  if (d.kpi) {
    const k = d.kpi;
    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    if (k.on_time_rate != null) setText('#onTimeRate', (k.on_time_rate * 100).toFixed(1) + '%');
    if (k.on_time_rate_fresh != null) {
      const em = document.querySelector('.kpi-card[data-filter="all"] em');
      if (em) { em.className = 'info'; em.textContent = '剔积压 ' + (k.on_time_rate_fresh * 100).toFixed(1) + '%'; }
    }
    if (k.utilization != null) setText('#utilRate', (k.utilization * 100).toFixed(1) + '%');
    if (k.device_total != null) setText('#deviceTotal', k.device_total + ' 台设备');
    if (k.congested != null) setText('#congestedCount', k.congested);
    if (k.risk_orders != null) setText('#riskCount', k.risk_orders);
  }

  if (d.gantt && Array.isArray(d.gantt.labels)) {
    const head = document.querySelector('.gantt-header');
    if (head) head.innerHTML = '<span>设备 / 工序</span>' + d.gantt.labels.map(l => '<span>' + l + '</span>').join('');
  }

  selected = machines.find(m => m.id === selected?.id) || machines[0];
  renderPlant(); renderGantt(); renderRisks(); renderOrders(); renderAssistant();

  const dot = document.querySelector('.live-dot');
  const foot = document.querySelector('.sidebar-foot');
  const eng = d.engines || {};
  if (dot) dot.textContent = '已接入后端';
  if (foot) foot.innerHTML = 'V0.3 引擎已接入<br />设备 ' + ((d.kpi && d.kpi.device_total) || machines.length) + ' 台 · 排程 ' + (eng.tasks || 0) + ' 条';
};
