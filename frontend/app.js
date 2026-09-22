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
const riskReasons = ['队列拥堵', '高负荷待处理', '可能影响交期'];
const makeMachine = (id, zone, index) => { const st = defaultStateCycle[index % defaultStateCycle.length]; return { id, zone, status: st, order: `JW-260918-${String(130 + index).padStart(3,'0')}`, product: zone === '拉丝' ? '镀锌钢丝' : zone === '捻股' ? '标准股型' : '标准钢丝绳', material: zone === '拉丝' ? '盘条 Q195' : '待模型接入', capacity: `${62 + (index * 7) % 30}%`, queue: 1 + index % 5, change: '待模型计算', risk: st === 'risk' ? riskReasons[index % riskReasons.length] : '无' }; };
const specialById = Object.fromEntries(highlightedMachines.map(machine => [machine.id, machine]));
// ↓ 以下四个数据源在接入后端时可被 window.applyBackendData(payload) 整体替换（见文件末尾）。
//   未调用时保持这些内置演示数据，保证路演现场永远有画面。
let machines = Object.entries(deviceIds).flatMap(([zone, ids]) => ids.map((id, index) => specialById[id] || makeMachine(id, zone, index)));
// order 字段是「任务↔订单」的显式关联，供完工归档使用（label 只作显示，短号无法反查订单）。
// 演示：106 占捻股+合绳，111 占拉丝+捻股，118 占满三道工序，126 只剩合绳（前道已完工）。
let tasks = [
  {machine:'8107 拉丝',order:'JW-260918-111',label:'JW-111',left:4,width:36,status:'normal'}, {machine:'8115 拉丝',order:'',label:'待排',left:46,width:18,status:'change'}, {machine:'8124 拉丝',order:'JW-260918-118',label:'JW-118 · 换型',left:18,width:41,status:'change'},
  {machine:'8204 捻股',order:'JW-260918-118',label:'JW-118',left:8,width:40,status:'normal'}, {machine:'8218 捻股',order:'JW-260918-106',label:'JW-106 · 拥堵',left:37,width:51,status:'risk'}, {machine:'8231 捻股',order:'JW-260918-111',label:'JW-111',left:57,width:25,status:'normal'},
  {machine:'8304 合绳',order:'JW-260918-106',label:'JW-106 · 临期',left:13,width:66,status:'risk'}, {machine:'8307 合绳',order:'JW-260918-126',label:'JW-126',left:48,width:30,status:'normal'}, {machine:'8312 合绳',order:'JW-260918-118',label:'JW-118 · 换型',left:5,width:27,status:'change'}
];
// order 字段标注该风险归属于哪张订单；归档该订单时这条风险会一并清除。
let risks = [
  {level:'risk', order:'JW-260918-106', title:'8304 合绳机队列拥堵', text:'JW-106 可能延迟 6 小时，影响后续 2 张订单', time:'刚刚', machine:'8304'},
  {level:'change', title:'8124 拉丝机正在换型', text:'规格切换剩余 42 分钟，建议暂缓插入同类急单', time:'20:16', machine:'8124'},
  {level:'risk', order:'JW-260918-126', title:'JW-260918-126 物料临期', text:'WSC 绳芯库存仅够 1.5 小时生产', time:'19:54', machine:'8304'}
];
let orders = [
  ['订单号','产品规格','数量','交期','状态'],['JW-260918-106','30mm GT34Z','1,600m','09/19 08:00','临期'],['JW-260918-111','22mm GT8ZH','2,000m','09/19 12:00','正常'],['JW-260918-118','12mm GT6Z','1,000m','09/19 16:00','换型中'],['JW-260918-126','28mm GT8PZ','2,000m','09/20 08:00','缺料风险']
];
let selected = machines.find(m => m.id === '8304');
let activeRiskIndex = null;
let pendingRiskForReplan = null;
let backendKpiLocked = false;          // 后端 KPI 到达后，前端不再自行推算
let lockedMachines = new Set();        // 人工锁定当前安排的设备（前端演示闭环）
let plantHighlightFn = null;           // 由 renderPlant 注入：高亮三维视图里选中的设备（canvas 无 DOM）

// 完工归档记录（版本留痕）：orderId/spec/qty/due/completedAt/onTime/delayDays/archivedAt/tasks/risks
// 归档后订单退出在排池：其甘特任务与关联风险一并移出并暂存在记录里，撤回时可原样恢复。
let archiveRecords = [];
// 归档页的顶部分页。待完工订单很多，已归档记录必须能一键直达。
let archiveView = 'pending';
// 删除只作用于当前排产版本：原始 Excel 始终保留，便于审计与恢复。
let deletedOrderRecords = [];
let importedDataset = {version:'内置演示数据', sheets:{}, rows:[], summary:{orders:0,devices:0,processes:0,materials:0}, issues:[]};
const $ = selector => document.querySelector(selector);
// DeepSeek V4 接口配置位：endpoint 用相对路径（同源），网页部署在哪 AI 请求就发到哪。
// 由 ai-server.js 一体化服务提供网页 + /api/ai/schedule，别人访问也能用 AI。
// 密钥只存在服务端环境变量，不写进前端文件。
const aiConfig = {provider:'DeepSeek', model:'deepseek-v4-pro', endpoint:'/api/ai/schedule', enabled:true};

/* ============================================================
   设备状态：全站唯一权威表
   ------------------------------------------------------------
   这张表是**唯一**的状态口径来源，下面 6 处全部由它派生，不再各写一份：
     ① 三维数字孪生的机台配色（palette）
     ② 三维图例、③ 三维筛选菜单
     ④ 顶部状态岛（颜色 / 中文名 / 排序）
     ⑤ 设备态势的筛选下拉与列表状态文字
     ⑥ 甘特图配色
   为什么必须统一：早前这几处各抄一份，后端一接进来就露馅 ——
   后端实际用的是 normal / queued / idle / risk 4 种，
   而前端表里没有 queued，24 台「已排产」被兜底并进「生产」，
   于是状态岛写「生产 25」、点进去只筛出 1 台，两处数字当场打架。
   现在未知状态不再被合并：见 statusMetaOf()，它会给未知 key 生成稳定的兜底色，
   宁可多出一项也绝不把 A 类设备错记成 B 类。
   ============================================================ */
const STATUS_META = [
  { key:'normal',      label:'生产',   short:'生产中',  color:'#57ca8c' },
  { key:'queued',      label:'已排产', short:'已排产',  color:'#22b8c4' },
  { key:'idle',        label:'待排',   short:'待排',    color:'#3a9cff' },
  { key:'change',      label:'换型',   short:'换型中',  color:'#f0b65a' },
  { key:'risk',        label:'风险',   short:'风险',    color:'#ef6b75' },
  { key:'maintenance', label:'维护',   short:'维护中',  color:'#8a9aa8' },
  { key:'fault',       label:'停机',   short:'故障停机', color:'#b3202e' },
  { key:'disabled',    label:'停用',   short:'停用',    color:'#55606a' }
];
const STATUS_BY_KEY = Object.fromEntries(STATUS_META.map(s => [s.key, s]));
// 未登记状态的稳定兜底色：哈希到一组与主色区分度尚可的备用色，同名 key 每次都得到同一个色
const STATUS_FALLBACK_COLORS = ['#7f8fa6','#9a7fd0','#c98a4b','#4f9e8f','#b06f9a','#6f87c9'];
function statusMetaOf(key){
  if (STATUS_BY_KEY[key]) return STATUS_BY_KEY[key];
  let h = 0;
  for (let i = 0; i < String(key).length; i += 1) h = (h * 31 + String(key).charCodeAt(i)) >>> 0;
  return { key, label:String(key), short:String(key), color:STATUS_FALLBACK_COLORS[h % STATUS_FALLBACK_COLORS.length], unknown:true };
}

function renderPlant(){
  const target = $('#plantMap');
  const zones = ['拉丝','捻股','合绳'];
  const palette = Object.fromEntries(STATUS_META.map(s => [s.key, parseInt(s.color.slice(1), 16)]));
  target.innerHTML = `<div class="factory-3d-shell"><div class="factory-view-toolbar"><span>车间数字孪生</span><div class="factory-view-actions"><button class="plant-filter-toggle" type="button">筛选</button><button class="open-machines" type="button">打开设备态势</button><button class="factory-view-toggle" type="button">切换二维</button></div></div><div class="plant-filter-menu" hidden><b>设备状态</b><button type="button" data-status-filter="all">全部</button>${STATUS_META.map(s=>`<button type="button" data-status-filter="${s.key}">${s.label}</button>`).join('')}</div><canvas class="factory-3d-canvas" aria-label="三层车间数字孪生设备图"></canvas><div class="factory-2d-view" hidden></div><div class="factory-3d-floor-labels"></div><div class="factory-3d-legend">${STATUS_META.map(s=>`<span><i class="${s.key}" style="--c:${s.color}"></i>${s.label}</span>`).join('')}</div><div class="factory-3d-hint">拖拽旋转 · 滚轮缩放 · 点击设备查看详情</div><aside class="factory-3d-info" hidden></aside></div>`;
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
      return `<section class="factory-2d-floor"><header><div><b>${zone}工段</b><span>${list.length}/${source.length} 台设备 · ${active} 台生产</span></div><small>${changing} 台换型 · ${atRisk} 台风险</small></header><div class="factory-2d-grid">${list.map(machine=>`<button type="button" class="factory-2d-machine ${escapeHtml(deviceDisplayStatus(machine))}" data-machine="${escapeHtml(machine.id)}" title="${escapeHtml(machine.id)} · ${escapeHtml(statusText[deviceDisplayStatus(machine)]||'')}"><strong>${escapeHtml(machine.id)}</strong><span>${escapeHtml(statusText[deviceDisplayStatus(machine)]||'')}</span></button>`).join('') || '<p class="factory-2d-empty">当前筛选无设备</p>'}</div></section>`;
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
      const dstatus = deviceDisplayStatus(machine);
      const material = new THREE.MeshStandardMaterial({color:palette[dstatus],emissive:palette[dstatus],emissiveIntensity:dstatus==='risk'?.95:.42,roughness:.35,metalness:.35});
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
  const resize=()=>{const w=shell.clientWidth,h=shell.clientHeight;if(!w||!h)return false;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();return true;};
  // 只读状态与安全的尺寸恢复入口：总览隐藏期间不能用 0×0 覆盖有效画布，返回总览后由路由主动同步。
  window.__plant3d = { selector, visuals, current: () => (highlighted && highlighted.machine.id) || null, resize };
  resize(); window.addEventListener('resize',resize);
  const showInfo=(machine)=>{const info=target.querySelector('.factory-3d-info');info.hidden=false;info.innerHTML=`<button class="factory-3d-close" aria-label="关闭设备详情">×</button><p class="eyebrow">设备详情 · ${escapeHtml(statusText[machine.status]||'')}</p><h3>${escapeHtml(machine.id)} · ${escapeHtml(machine.zone)}工段</h3><dl><dt>当前订单</dt><dd>${escapeHtml(machine.order)}</dd><dt>产能利用率</dt><dd>${escapeHtml(machine.capacity)}</dd><dt>等待队列</dt><dd>${escapeHtml(machine.queue)} 项</dd><dt>材料</dt><dd>${escapeHtml(machine.material)}</dd><dt>换型时间</dt><dd>${escapeHtml(machine.change)}</dd><dt>风险</dt><dd>${escapeHtml(machine.risk)}</dd></dl>`;info.querySelector('button').addEventListener('click',()=>{info.hidden=true;});selectMachine(machine.id);};
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
let ganttProcessFilter='all';
let scheduleHistory=[];
let activeScheduleSnapshot=null;
let selectedHistoryMonth='';
let selectedHistoryWeek='';
function scheduleVersionLabel(item){
  const time=String(item.created_at||'').replace('T',' ').slice(5,16);
  const type={weekly_official:'正式周计划',weekly_replay:'历史排程回放',rush_order:'紧急插单',manual_adjust:'人工调序',event_replan:'事件重排'}[item.version_type]||item.reason||'排程版本';
  return `${type} · R${item.revision_no||1} · ${time||'未知时间'}`;
}
function renderScheduleHistoryControls(){
  const monthSelect=$('#scheduleMonthSelect');
  const weekSelect=$('#scheduleWeekSelect');
  const select=$('#scheduleVersionSelect');
  const meta=$('#scheduleHistoryMeta');
  if(!monthSelect||!weekSelect||!select||!meta)return;
  const months=[...new Set(scheduleHistory.map(item=>String(item.week_start||'').slice(0,7)).filter(Boolean))].sort().reverse();
  if(!selectedHistoryMonth||!months.includes(selectedHistoryMonth))selectedHistoryMonth=months[0]||'';
  monthSelect.innerHTML=months.length?months.map(month=>`<option value="${month}">${month.slice(0,4)}年${month.slice(5)}月</option>`).join(''):'<option value="">暂无历史</option>';
  monthSelect.value=selectedHistoryMonth;
  const monthItems=scheduleHistory.filter(item=>String(item.week_start||'').startsWith(selectedHistoryMonth));
  const weeks=[...new Map(monthItems.map(item=>[item.plan_key,item])).values()].sort((a,b)=>String(b.week_start).localeCompare(String(a.week_start)));
  if(!selectedHistoryWeek||!weeks.some(item=>item.plan_key===selectedHistoryWeek))selectedHistoryWeek=weeks[0]?.plan_key||'';
  weekSelect.innerHTML=weeks.length?weeks.map(item=>`<option value="${escapeHtml(item.plan_key)}">${String(item.week_start).slice(5).replace('-','月')}日—${String(item.week_end).slice(5).replace('-','月')}日</option>`).join(''):'<option value="">暂无周计划</option>';
  weekSelect.value=selectedHistoryWeek;
  const weekItems=monthItems.filter(item=>item.plan_key===selectedHistoryWeek).sort((a,b)=>{
    if(a.version_type==='weekly_official'&&b.version_type!=='weekly_official')return -1;
    if(b.version_type==='weekly_official'&&a.version_type!=='weekly_official')return 1;
    return (b.revision_no||0)-(a.revision_no||0);
  });
  const selected=activeScheduleSnapshot?.schedule_version||'current';
  select.innerHTML='<option value="current">当前计划</option>'+weekItems.map(item=>`<option value="${escapeHtml(item.schedule_version)}">${escapeHtml(scheduleVersionLabel(item))}</option>`).join('');
  select.value=weekItems.some(item=>item.schedule_version===selected)?selected:'current';
  const weekIndex=weeks.findIndex(item=>item.plan_key===selectedHistoryWeek);
  $('#schedulePrevWeek').disabled=weekIndex<0||weekIndex===weeks.length-1;
  $('#scheduleNextWeek').disabled=weekIndex<=0;
  if(activeScheduleSnapshot){
    const cutoffMeta=window.formatScheduleCutoffMeta?.(activeScheduleSnapshot)||'';
    meta.hidden=false;
    meta.innerHTML=`<strong>历史版本 · 只读</strong>${cutoffMeta?`<span>${escapeHtml(cutoffMeta)}</span>`:''}<span>${escapeHtml(String(activeScheduleSnapshot.created_at||'').replace('T',' '))}</span><span>操作人：${escapeHtml(activeScheduleSnapshot.created_by||'—')}</span><span>原因：${escapeHtml(activeScheduleSnapshot.reason||'正式排程发布')}</span><button type="button" data-return-current-schedule>返回当前计划</button>`;
    meta.querySelector('[data-return-current-schedule]')?.addEventListener('click',()=>selectScheduleHistory('current'));
  }else{
    meta.hidden=true;
    meta.innerHTML='';
  }
}
async function loadHistoryMonth(month){
  if(!month||!window.loadScheduleHistory)return;
  const data=await window.loadScheduleHistory(month);
  scheduleHistory=scheduleHistory.filter(item=>!String(item.week_start||'').startsWith(month)).concat(data.versions||[]);
  selectedHistoryMonth=month;
  selectedHistoryWeek='';
  renderScheduleHistoryControls();
}
function moveHistoryWeek(step){
  const weeks=[...new Set(scheduleHistory.filter(item=>String(item.week_start||'').startsWith(selectedHistoryMonth)).map(item=>item.plan_key))].sort().reverse();
  const next=weeks[weeks.indexOf(selectedHistoryWeek)+step];
  if(next){selectedHistoryWeek=next;renderScheduleHistoryControls();activateSelectedHistoryWeek();}
}
async function activateSelectedHistoryWeek(){
  const version=window.preferredScheduleVersion?.(scheduleHistory,selectedHistoryWeek)||'';
  if(version)await selectScheduleHistory(version);
}
async function selectScheduleHistory(version){
  const select=$('#scheduleVersionSelect');
  if(!window.selectScheduleVersion)return;
  if(select)select.disabled=true;
  try{
    const snapshot=await window.selectScheduleVersion(version);
    if(version!=='current'&&!snapshot)return;
    activeScheduleSnapshot=version==='current'?null:snapshot;
    renderScheduleHistoryControls();
    renderGantt();
    showToast(version==='current'?'已返回当前正式计划':`正在查看 ${scheduleVersionLabel(snapshot)}`);
  }catch(error){
    if(select)select.value=activeScheduleSnapshot?.schedule_version||'current';
    showToast(`历史版本加载失败：${error.message||'请重新选择'}`);
  }finally{
    if(select)select.disabled=false;
  }
}
window.setScheduleHistoryVersions=function(items){scheduleHistory=Array.isArray(items)?items:[];renderScheduleHistoryControls();};
function ganttRows(){
  const flat=[];
  tasks.forEach(t=>{
    const bars=t.bars||[t];
    bars.forEach((b,index)=>{
      const previousOrder=[...bars.slice(0,index)].reverse().find(item=>item.status!=='change'&&item.label)?.label;
      const nextOrder=bars.slice(index+1).find(item=>item.status!=='change'&&item.label)?.label;
      flat.push({bar:b,task:t,orderName:b.status==='change'?(nextOrder||previousOrder||'未关联订单'):String(b.label||t.order||t.machine)});
    });
  });
  let picked=ganttRiskOnly?flat.filter(x=>x.bar.status==='risk'):flat;
  if(ganttProcessFilter!=='all')picked=picked.filter(x=>String(x.bar.process||'')===ganttProcessFilter);
  const keyOf=(x)=>ganttView==='order'?x.orderName:String(x.task.machine);
  const map=new Map();
  picked.forEach(x=>{const k=keyOf(x);if(!map.has(k))map.set(k,[]);map.get(k).push(x);});
  return [...map.entries()].map(([name,items])=>({name,bars:items,processes:[...new Set(items.map(x=>x.bar.process).filter(Boolean))]}));
}
function renderGantt(){
  const rows=ganttRows();
  if(!rows.length){
    $('#ganttRows').innerHTML='<p class="empty-state">当前视角与筛选条件下没有排程任务</p>';
    return;
  }
  const maxEnd=Math.max(100,...rows.flatMap(row=>row.bars.map(item=>(Number(item.bar.left)||0)+(Number(item.bar.width)||1))));
  const canvas=$('#ganttCanvas');
  if(canvas){
    const days=Number(canvas.style.getPropertyValue('--gantt-days'))||7;
    const labelWidth=ganttView==='order'?174:116;
    canvas.classList.toggle('order-view',ganttView==='order');
    canvas.style.minWidth=`${labelWidth+126*days*Math.ceil(maxEnd/100)}px`;
    const heading=canvas.querySelector('.gantt-header span:first-child');
    if(heading)heading.textContent=ganttView==='order'?'订单 / 工序':'设备 / 工序';
  }
  const panelTitle=document.querySelector('.gantt-panel .panel-heading h2');
  if(panelTitle)panelTitle.textContent=activeScheduleSnapshot?'历史甘特图':(ganttView==='order'?'订单甘特图':'设备甘特图');
  $('#ganttRows').innerHTML=rows.map(row=>`<div class="gantt-row"><label title="${escapeHtml(row.name)}"><span>${escapeHtml(row.name)}</span><small>${escapeHtml(row.processes.join(' → ')||'换型')}</small></label><div class="timeline">${row.bars.map(({bar,task})=>{const code=barCode(bar,task);const machineId=String(bar.machine||task.machine||'—').split(/\s+/)[0];const taskText=ganttView==='order'?`${machineId} · ${bar.process||'换型'}`:bar.label;const orderId=ganttView==='order'?row.name:(bar.label||'');const rawTitle=bar.status==='change'?`${row.name} · ${machineId} · 换型\n${bar.title||'换型占用'}`:(bar.title||'');const title=String(rawTitle).replace(/"/g,'&quot;').replace(/\n/g,' ⏎ ');return `<button data-task="${escapeHtml(code)}" data-task-order="${escapeHtml(orderId)}" data-task-process="${escapeHtml(bar.process||'')}" class="task ${escapeHtml(bar.status||'')}" style="left:${Number(bar.left)||0}%;width:${Number(bar.width)||1}%" title="${escapeHtml(title)}">${escapeHtml(taskText)}</button>`;}).join('')}</div></div>`).join('');
  document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click',()=>selectScheduleTask(button.dataset.taskOrder,button.dataset.taskProcess,button.dataset.task)));
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
function setGanttProcess(process){
  ganttProcessFilter=process;
  document.querySelectorAll('[data-gantt-process]').forEach(b=>b.classList.toggle('selected',b.dataset.ganttProcess===process));
  renderGantt();
  showToast(process==='all'?'已显示拉丝、捻股、合绳全部工序':`已筛选：${process}工序预测`);
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
  const decisionHtml = decisionExplanationMarkup(selected.order, selected.zone, selected.id);
  $('#assistantContent').innerHTML = `
    <section><h3>当前选中</h3><p><b>${escapeHtml(selected.id)} · ${escapeHtml(selected.zone)}工段</b><br>${selected.status==='risk'?'风险处理优先':selected.status==='change'?'规格切换中':'按计划运行'} · 利用率 ${escapeHtml(selected.capacity)}</p></section>
    ${decisionHtml}
    <section><h3>约束依据${traces.length?`（${traces.length} 条）`:''}</h3>${chips}${traceList}</section>
    <section><h3>影响评估</h3><p>材料：${escapeHtml(selected.material)}<br>等待队列：${selected.queue} 项 · 下次换型：${escapeHtml(selected.change)}<br>${escapeHtml(riskText)}</p></section>
    <section><h3>设备操作</h3>${renderDeviceOps()}</section>
    <section><h3>建议动作</h3><ul><li>查看同工段可用设备</li><li>${selected.status==='risk'?'将非紧急订单移至同工段低负荷机台后重新评估':lockedMachines.has(selected.id)?'该安排已锁定，重排时会保留':'锁定当前任务，保持排程稳定'}</li><li>进入插单推演对比交期影响</li></ul></section>${lockedMachines.size?`<section><h3>已锁定安排（${lockedMachines.size} 项）</h3><p>${[...lockedMachines].map(escapeHtml).join('、')}<br>重排时这些设备的当前安排将被保留。</p></section>`:''}`;
  const lockBtn=$('#lockTask');
  if(lockBtn)lockBtn.textContent=lockedMachines.has(selected.id)?`解除锁定 ${selected.id}`:'锁定当前安排';
  document.querySelectorAll('[data-device-op]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const op = btn.dataset.deviceOp;
      if(op === 'toggle') applyDeviceOp('toggle');
      else openDeviceOpForm(op);
    });
  });
}
// 设备操作区：计划维修 / 紧急停机 / 停用启用（对应赛题进阶任务「设备异常」）
function renderDeviceOps(){
  const id = selected ? selected.id : '';
  const mm = maintenanceOf(id);
  return `<div class="device-ops">
      <button type="button" data-device-op="maintenance">计划维修</button>
      <button type="button" data-device-op="fault">紧急停机</button>
      <button type="button" data-device-op="toggle">${mm&&mm.type==='disabled'?'启用设备':'停用设备'}</button>
    </div>
    <div id="deviceOpForm"></div>
    ${mm?`<p class="module-note">当前：<b>${escapeHtml(maintenanceLabel(id)||'')}</b>${mm.note?'（'+escapeHtml(mm.note)+'）':''}</p>`:''}`;
}
function applyDeviceOp(type){
  if(!selected) return;
  const id = selected.id;
  if(type === 'maintenance'){
    const start = $('#opStart').value;
    const hours = Number($('#opHours').value) || 1;
    if(!start || isNaN(new Date(start).getTime())){ showToast('请填写开始时间'); return; }
    const end = new Date(new Date(start).getTime() + hours*3600000);
    setMaintenance(id, 'maintenance', start, toDatetimeLocal(end), '计划维修 '+hours+' 小时');
    showToast(`已设置 ${id} 计划维修 ${hours} 小时`);
  }
  else if(type === 'fault'){
    const end = $('#opRecover').value;
    if(!end || isNaN(new Date(end).getTime())){ showToast('请填写预计恢复时间'); return; }
    setMaintenance(id, 'fault', toDatetimeLocal(new Date()), end, '突发故障停机');
    showToast(`已设置 ${id} 故障停机，预计恢复 ${end.replace('T',' ')}`);
  }
  else if(type === 'toggle'){
    const mm = maintenanceOf(id);
    if(mm && mm.type === 'disabled'){ setMaintenance(id, null); showToast(`已启用设备 ${id}`); }
    else { setMaintenance(id, 'disabled', '', '', '停用'); showToast(`已停用设备 ${id}`); }
  }
  renderAssistant(); renderPlant(); renderGantt(); renderRisks(); renderKpi();
}
function openDeviceOpForm(type){
  const form = $('#deviceOpForm');
  if(!form) return;
  if(type === 'maintenance'){
    form.innerHTML = `<div class="device-op-form"><label>开始时间 <input type="datetime-local" id="opStart" value="${toDatetimeLocal(new Date())}"></label><label>时长(小时) <input type="number" id="opHours" min="1" value="4"></label><button type="button" class="primary-button" id="opConfirm">确认维修</button></div>`;
    $('#opConfirm').addEventListener('click', ()=>applyDeviceOp('maintenance'));
  }
  else if(type === 'fault'){
    form.innerHTML = `<div class="device-op-form"><label>预计恢复时间 <input type="datetime-local" id="opRecover" value="${toDatetimeLocal(new Date(Date.now()+4*3600000))}"></label><button type="button" class="primary-button" id="opConfirm">确认停机</button></div>`;
    $('#opConfirm').addEventListener('click', ()=>applyDeviceOp('fault'));
  }
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
// 某张在排订单是否「预计有风险」：它的甘特任务条里出现风险状态即算。
function orderAtRisk(orderId){
  return tasks.some(t=>taskBelongsTo(t,orderId) && (t.bars||[t]).some(b=>b.status==='risk'));
}
function computeKpi(){
  // 准时交付率是「订单级」指标 —— 交期是订单的属性，不是甘特任务条的属性。
  //   在排订单 → 看「预计」：其任务条里有没有风险
  //   已归档订单 → 看「实际」：完工时间 vs 计划交期
  // 归档 = 订单从「在排池」挪到「已归档池」，分子分母同步移动，
  // 所以归档本身不会让这个比率凭空跳动（之前按任务条算，归档后会误跳）。
  const activeIds=orders.slice(1).map(r=>String(r[0]));
  const activeOk=activeIds.filter(id=>!orderAtRisk(id)).length;
  const judged=archiveRecords.filter(a=>a.onTime!==null);
  const archivedOk=judged.filter(a=>a.onTime===true).length;
  const totalOrders=activeIds.length+judged.length;
  const okOrders=activeOk+archivedOk;
  const onTime=totalOrders?Math.max(0,okOrders/totalOrders):0;
  const caps=machines.map(m=>parseFloat(m.capacity)).filter(v=>Number.isFinite(v));
  const util=caps.length?caps.reduce((a,b)=>a+b,0)/caps.length/100:0;
  const congested=machines.filter(m=>m.status==='risk'||parseFloat(m.capacity)>=95).length;
  const riskOrders=risks.filter(r=>r.level==='risk').length;
  const warnOrders=risks.filter(r=>r.level==='change').length;
  const downMachines=machines.filter(m=>maintenanceOf(m.id)).length;
  return {onTime,util,congested,riskOrders,warnOrders,downMachines,
          orders:totalOrders,badOrders:totalOrders-okOrders,
          activeOrders:activeIds.length,archivedJudged:judged.length};
}
function renderKpi(){
  renderStatusIsland();   // 顶部状态岛与 KPI 同源刷新；必须在 backendKpiLocked 早退之前，否则接上后端后它就不再更新
  if(backendKpiLocked)return;
  const k=computeKpi();
  const set=(sel,text)=>{const el=$(sel);if(el)el.textContent=text;};
  set('#onTimeRate',(k.onTime*100).toFixed(1)+'%');
  set('#utilRate',(k.util*100).toFixed(1)+'%');
  set('#deviceTotal',machines.length+' 台设备');
  set('#congestedCount',String(k.congested));
  set('#riskCount',String(k.riskOrders));
  set('#onTimeDelta',`${k.badOrders}/${k.orders} 单有风险或超期`);
  set('#utilDelta',`全厂 ${machines.length} 台均值`);
  set('#congestedNote',k.congested?'需处理':'当前无');
  set('#riskDelta',k.warnOrders?`另有 ${k.warnOrders} 条预警`:'无预警');
  const locked=$('#lockedCount');
  if(locked)locked.textContent=lockedMachines.size+' 项';
}

/* ============================================================
   顶部「产线状态岛」
   ------------------------------------------------------------
   一排彩色圆圈：一个圈 = 一种设备状态，圈内数字 = 该状态的设备台数，
   圈外弧长 = 该状态占全厂设备的比例。点圆圈 → 进入「设备态势」并按该状态筛选。
   数据口径：deviceDisplayStatus()（维护/停机/停用优先于设备自身 status），
   与三维态势图、设备台账、右侧 AI 面板完全同源，不另算一套。
   紧急条目也全部取自既有数据源，不编造新数字：
     · deviceDisplayStatus()==='fault' 的设备（故障停机）
     · risks 里 level==='risk' 的条目
     · 订单池里状态含「临期 / 逾期 / 缺料」的订单
   ============================================================ */
// 状态岛直接沿用 STATUS_META 的顺序与配色（表格里那 8 种就是图例的 8 项）
const ISLAND_STATUS = STATUS_META;
const MACHINE_STATUS_TEXT = Object.fromEntries(STATUS_META.map(s => [s.key, s.short]));
// 筛选下拉：8 项全都在，且顺序与状态岛、三维图例一致
const machineStatusOptions = [['all','全部状态']].concat(STATUS_META.map(s => [s.key, s.short]));
// 状态岛要展示的完整集合 = 登记表 ∪ 当前数据里实际出现的状态。
// 后端将来换词表（比如冒出 paused）时，多出一项灰底项，而不是被悄悄并进「生产」。
function islandStatusList(){
  const seen = new Set(STATUS_META.map(s => s.key));
  const extra = [];
  machines.forEach(m => {
    const k = deviceDisplayStatus(m);
    if (!seen.has(k)) { seen.add(k); extra.push(statusMetaOf(k)); }
  });
  return STATUS_META.concat(extra);
}
let machineFilterRequest = null;   // 状态岛点进来的待应用状态筛选，由设备态势页消费后清空
let islandUrgentKey = null;        // 上一轮紧急条目的指纹，用于「新增紧急信息」的一次性提示

/* ---- 「神虎 GT8 镀锌钢丝绳」断面 ----
   用户给的品牌参考图：8 个钢股环绕一根绳芯，每股自己又是「1 芯 + 6 丝」的六角束，
   股与股相切、缝隙里透出蓝色的纤维绳芯。
   数字全部按真实几何算，不做手绘：wireR 4.2 / 股内环 8.4 → 单股半径 12.6；
   8 股若要相切，环半径 R = 25.2 / (2·sin22.5°) ≈ 32.9，故取 33。
   实心点：最小外缘 33+12.6+0.6(描边) ≈ 46 < 50，稳稳落在 viewBox 内。
   用 SVG 而不是 CSS：一是 56 个圆的六角排布用 CSS 写不出来，
   二是矢量在任何尺寸下都保持锐利（药丸悬停时断面会从 30px 长到 38px）。 */
function ropeCrossSectionSVG(){
  const C = 50;
  const cw = (x, y, r) => `<circle class="rw-wire" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}"/>`;
  // 一根「股」= 中心 1 丝 + 若干圈六角密排。rings 是各圈半径（单位为丝半径）：
  // [2] → 1+6=7 丝；[2,4] → 1+6+12=19 丝。单股实半径 = (最外圈系数 + 1) × 丝半径。
  function strand(cx, cy, wireR, rings){
    let s = `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)})">` + cw(0, 0, wireR);
    rings.forEach((k, idx) => {
      const n = 6 * (idx + 1), rr = k * wireR, off = idx ? 30 / (idx + 1) : 0;
      for (let i = 0; i < n; i += 1){
        const b = (i * 360 / n + off) * Math.PI / 180;
        s += cw(rr * Math.cos(b), rr * Math.sin(b), wireR);
      }
    });
    return s + '</g>';
  }
  /* ---- 几何是全算出来的，不是手摆的 ----
     ① 外层 8 股各 7 丝：丝半径 4.2 → 单股半径 12.6。
        为什么不用更"像照片"的每股 19 丝：实测把 19 丝股缩到药丸里的 30/38px 时，
        丝径只剩 1.7px，黑描边糊成一片灰，反而**看不清是钢丝绳**；7 丝在真实尺寸下最立得住。
     ② 8 股相切：相邻股中心距 = 2·R·sin(180/8) = 2×12.6 → R = 12.6/sin22.5° = 32.9。
        外缘 = R + 12.6 = 45.5 < 50 ✓（描边 0.6 后仍不越界）
     ③ 绳芯必须把中间那个洞填掉：股的内缘在 R−12.6 = 20.3 处，
        所以绳芯顶到 19.1（留 1.2 的窄缝给蓝色）。**这是唯一能让蓝色变成
        「股缝里的星形」而不是「一个大蓝盘」的办法** —— 第一版就是栽在这里。
     ④ 蓝色垫底半径取到外缘附近，于是外缘的尖角缝里也会透出一点蓝，
        和参考图外圈的蓝色小缺角一致。 */
  const outerWire = 4.2, outerRings = [2];
  const cluster = outerWire * (outerRings[outerRings.length - 1] + 1);      // 12.6
  const R = cluster / Math.sin(Math.PI / 8);                               // 32.9
  const coreWire = (R - cluster - 1.2) / 5;                                // 19 丝绳芯 → 3.82
  const out = [`<circle class="rw-core" cx="50" cy="50" r="${(R + cluster - 5).toFixed(2)}"/>`];
  out.push(strand(C, C, coreWire, [2, 4]));                                 // 中心绳芯（比外层股细密）
  for (let i = 0; i < 8; i += 1){
    const a = (-90 + i * 45) * Math.PI / 180;
    out.push(strand(C + R * Math.cos(a), C + R * Math.sin(a), outerWire, outerRings));
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${out.join('')}</svg>`;
}

function collectUrgentAlerts(){
  const out = [];
  machines.forEach(m => {
    if(deviceDisplayStatus(m) === 'fault') out.push({ level:'停机', text:`${m.id} ${maintenanceLabel(m.id) || '故障停机'}`, goto:'machines' });
  });
  risks.forEach(r => {
    if(r.level === 'risk') out.push({ level:'风险', text:`${r.title}${r.text ? '：' + r.text : ''}`, goto:'risks' });
  });
  orders.slice(1).forEach(row => {
    const status = String(row[4] || '');
    if(/临期|逾期|缺料/.test(status)) out.push({ level:status, text:`订单 ${row[0]} ${status}（交期 ${row[3] || '—'}）`, goto:'orders' });
  });
  return out;
}
function renderStatusIsland(){
  // 断面是静态矢量，只注入一次（每次重渲染都重写 76 个圆纯属浪费，也会打断悬停动画）
  const rope = $('#islandRope');
  if (rope && !rope.childElementCount) rope.innerHTML = ropeCrossSectionSVG();
  const list = islandStatusList();
  // 「工段设备态势」的图例也在这里刷新：它和状态岛是同一套状态词表，
  // 分开维护必然漂移（后端加了 queued，图例却没加，两处对不上）。
  const legend = $('#statusLegend');
  if (legend) legend.innerHTML = list.map(s => `<i class="${escapeHtml(s.key)}${s.unknown?' status-unknown':''}"${s.unknown?` style="--c:${s.color}"`:''}></i>${escapeHtml(s.label)}`).join(' ');
  const dots = $('#islandDots');
  if(!dots) return;                       // 非指挥总览页 / HTML 未更新时静默跳过
  const counts = {};
  list.forEach(s => { counts[s.key] = 0; });
  // 逐台按 deviceDisplayStatus() 计数，和列表筛选用的是同一个函数，
  // 因此「岛上数字」与「点进去筛出的行数」天然恒等 —— 这是本模块的硬约束。
  machines.forEach(m => { const k = deviceDisplayStatus(m); if (k in counts) counts[k] += 1; });
  const total = machines.length;
  dots.innerHTML = list.map(s => {
    const n = counts[s.key];
    const pct = total ? (n / total * 100) : 0;
    const label = escapeHtml(s.label);
    const tip = `${label} ${n} 台 · 占 ${pct.toFixed(1)}%`;
    return `<button type="button" class="island-dot${n ? '' : ' zero'}${n >= 100 ? ' dense' : ''}${s.unknown ? ' unknown' : ''}" data-island-status="${escapeHtml(s.key)}" style="--c:${s.color};--p:${pct.toFixed(1)}" title="${tip} · 点击跳到设备态势按此状态筛选" aria-label="${tip}，点击查看该类设备"><span class="ring"><b>${n}</b></span><span class="cap">${label}</span></button>`;
  }).join('');
  const alerts = collectUrgentAlerts();
  // 静止态只剩一枚断面，紧急信息没地方写 —— 所以断面右上角点一颗脉冲红点。
  // 不能因为收起了条带，就把停机/风险/逾期一起藏起来。
  const islandEl = $('#statusIsland');
  if (islandEl) islandEl.classList.toggle('has-alert', alerts.length > 0);
  const alert = $('#islandAlert');
  if(alert){
    if(alerts.length){
      alert.hidden = false;
      alert.innerHTML = `<i></i>紧急 ${alerts.length} 条`;
      alert.title = alerts.slice(0, 4).map(a => `${a.level}｜${a.text}`).join('\n');
    } else {
      alert.hidden = true;
      alert.innerHTML = '';
    }
  }
  // 只在「紧急条目发生新增」时提示一次：首帧不弹（避免每次进页面都吵），
  // 后端 60s 静默重取回来的同样内容也不会重复弹。
  const key = alerts.map(a => a.level + '|' + a.text).sort().join('||');
  if(islandUrgentKey !== null && key && key !== islandUrgentKey) showToast(`产线新增紧急信息 ${alerts.length} 条，顶部状态岛已提示`);
  islandUrgentKey = key;
}
// 点状态圈：把状态带到设备态势页，由 machinesPage() 预置下拉并直接筛选列表
function goMachineStatus(status){
  if(!ISLAND_STATUS.some(s => s.key === status)) return;
  machineFilterRequest = status;
  renderModule('machines');
  showToast(`已按「${MACHINE_STATUS_TEXT[status]}」筛选设备态势（共 ${machines.filter(m => deviceDisplayStatus(m) === status).length} 台）`);
}
// 点紧急提醒：跳到第一条紧急条目所属的页面
function openUrgentAlert(){
  const first = collectUrgentAlerts()[0];
  renderModule(first ? first.goto : 'risks');
  showToast(first ? `已定位紧急信息：${first.text}` : '当前没有紧急信息');
}
// KPI 卡点击：按当前数据定位真正的来源，不再固定跳到 8304 / 8218
function focusFromKpi(filter){
  if(filter==='all'){
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.dataset.page==='dashboard'));
    renderModule('dashboard');
    showToast('已返回指挥总览');return;
  }
  if(filter==='risk'){
    const index=risks.findIndex(r=>r.level==='risk');
    if(index<0){showToast('当前没有待处置风险');return;}
    activeRiskIndex=index;
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.dataset.page==='risks'));
    renderModule('risks');
    requestAnimationFrame(()=>document.querySelector('.risk-action.expanded')?.scrollIntoView({behavior:'smooth',block:'center'}));
    showToast('已打开首条风险的处置卡，可定位、查看订单或进入重排推演');
    return;
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
    const advisorName=data.source==='rule_engine'?'排产规则助手（已接入后端）':(data.model||'DeepSeek V4');
    const escape=value=>String(value??'').replace(/[<>&]/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[char]));
    const risks=Array.isArray(answer.risks)?answer.risks:[];
    const actions=Array.isArray(answer.actions)?answer.actions:[];
    $('#assistantContent').insertAdjacentHTML('afterbegin',`<section class="ai-advice-result"><h3>${escape(advisorName)} · 候选策略建议</h3><p class="ai-advice-main">${escape(answer.recommendation||answer.text||'模型未返回文字建议')}</p><div class="ai-advice-columns"><div><b>风险判断</b><ul>${risks.map(item=>`<li>${escape(item)}</li>`).join('')||'<li>未返回额外风险</li>'}</ul></div><div><b>建议动作</b><ul>${actions.map(item=>`<li>${escape(item)}</li>`).join('')||'<li>请人工确认后再试排</li>'}</ul></div></div><small>这是候选策略建议；最终计划仍须经过确定性排产算法校验与人工确认。</small></section>`);
    showToast(`${advisorName} 已返回排产建议`);
  } catch(error) {
    const timedOut=error.name==='AbortError';
    const card=`<section class="ai-advice-result ai-advice-error"><h3>AI 服务暂不可用</h3><p class="ai-advice-main">${timedOut?'请求超过 35 秒未返回，可能是网络或后端超时。':escapeHtml(error.message||'无法连接本地 AI 代理')}</p><ol class="ai-advice-steps"><li>确认本地代理已启动：<code>node frontend/ai-server.js</code></li><li>确认已设置环境变量 <code>DEEPSEEK_API_KEY</code>——密钥只放后端，不要写进前端文件</li><li>AI 未就绪不影响演示：「人工调序」与「重排推演」两条链路不依赖 AI，可照常进行</li></ol><button type="button" class="ai-retry" id="aiRetry">重试</button></section>`;
    $('#assistantContent').insertAdjacentHTML('afterbegin',card);
    $('#aiRetry')?.addEventListener('click',()=>{document.querySelector('.ai-advice-error')?.remove();requestAiAdvice();});
    showToast(timedOut?'AI 分析超时，已给出排查步骤':'AI 服务未连接，已给出排查步骤');
  }
  finally { clearTimeout(timeout); button.disabled=false; button.textContent='AI排产顾问'; }
}
/* 顶栏「紧急插单」入口。
   旧 simulateInsert 会在前端硬编码 JW-999、写死“顺延 2.5 小时”并直接改内存里的设备负载，
   看起来像排产、实际不经过任何一条 R1–R10 约束，点击刷新即消失。已整段移除。
   现在这个按钮只做一件事：把用户送到重排推演页的插单模板，真正的重排由算法引擎产出。 */
function openRushInsertForm(){
  renderModule('reschedule');
  setScenario('insert',true);
  const card=document.querySelector('.manual-insert-card');
  if(!card){showToast('插单模板未就绪，请打开重排推演页');return;}
  card.scrollIntoView({behavior:'smooth',block:'start'});
  // 高亮一下落点，避免用户以为按钮没反应
  card.classList.add('flash-target');
  setTimeout(()=>card.classList.remove('flash-target'),1800);
  const pri=card.querySelector('select[name="priority"]');
  if(pri)pri.value='紧急';
  const first=card.querySelector('input[name="orderId"]');
  if(first)setTimeout(()=>first.focus({preventScroll:true}),450);
  showToast('请填写插单明细；提交后由算法引擎重排受影响的设备队列');
}
// 测量顶栏高度，供 KPI 行 sticky 的 top 偏移使用（响应式下顶栏高度会变）
function syncTopbarHeight(){
  const tb = document.querySelector('.topbar');
  if(tb) document.documentElement.style.setProperty('--topbar-h', (tb.offsetHeight||0) + 'px');
}
window.addEventListener('resize', syncTopbarHeight);

function toggleTheme(){document.body.classList.toggle('light');const isLight=document.body.classList.contains('light');localStorage.setItem('production-dashboard-theme',isLight?'light':'dark');$('#themeToggle').textContent=isLight?'◐':'☼';showToast(isLight?'已切换浅色阅读主题':'已切换深色护眼主题');}
const pageMeta = {schedule:['智能排产','设定排产目标、锁定任务并生成可执行计划'],orders:['订单中心','查看订单交期、优先级与工艺匹配状态'],risks:['风险预警','聚焦影响交期与产能承诺的异常'],reschedule:['重排推演','比较插单、停机与物料延迟下的候选方案'],archive:['完工归档','登记完工并沉淀版本留痕，形成排产闭环'],analysis:['数据分析','设备利用率与质量问题的分类汇总与原因分析'],machines:['设备态势','查看全部设备编号的任务与负荷'],data:['数据管理','导入业务数据并导出排产成果']};
function pageFrame(page, body){const [title,sub]=pageMeta[page];return `<div class="module-header"><div><p class="eyebrow">${sub}</p><h2>${title}</h2></div><button class="primary-button" data-page-action="${page}">${page==='data'?'导入 Excel':page==='reschedule'?'新建推演':'导出当前视图'}</button></div>${body}`;}
function schedulePreviewMarkup(){
  const rows=tasks.slice(0,6);
  if(!rows.length)return '<p class="empty-state">当前没有可预览的排程任务</p>';
  const bars=rows.map(t=>{const bs=t.bars||[t];return `<div class="schedule-gantt-row"><b>${escapeHtml(t.machine)}</b><div class="schedule-track">${bs.map(b=>`<span class="plan-task ${b.status==='normal'?'running':b.status==='risk'?'risk':'setup'}" style="left:${b.left}%;width:${b.width}%" title="${escapeHtml(b.title||'')}">${escapeHtml(b.label)}</span>`).join('')}</div></div>`;}).join('');
  return `<div class="schedule-gantt" aria-label="当前计划的设备排程甘特图"><div class="schedule-gantt-head"><b>设备 / 工序</b><span>计划起点</span><span></span><span></span><span></span><span>计划终点</span></div>${bars}</div><div class="chart-legend"><span><i class="running"></i>生产任务</span><span><i class="setup"></i>换型</span><span><i class="risk"></i>风险待确认</span></div>`;
}
function schedulePage(){return pageFrame('schedule',`<div class="module-grid"><section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">优化偏好</p><h2>排产参数</h2></div></div><div class="form-list"><label>优化目标 <select id="optGoal"><option>准时交付优先</option><option>平衡交付与换型</option><option>设备利用率优先</option></select></label><label>排产窗口 <select id="optWindow"><option>未来 7 天</option><option>未来 14 天</option></select></label><label>已锁定任务 <b id="lockedCount">0 项</b></label><button class="primary-button" id="runTrial">生成试排方案</button></div></section><section class="panel module-card span-2"><div class="panel-heading"><div><p class="eyebrow">当前计划 · 设备视角</p><h2>设备排程预览</h2></div><span class="good" id="previewState">已加载</span></div><div id="schedulePreview">${schedulePreviewMarkup()}</div><p class="module-note" id="schedulePreviewNote">前端预演：按当前已加载计划绘制前 ${Math.min(6,tasks.length)} 行（共 ${tasks.length} 个设备行）。正式试排须由确定性算法引擎生成并做约束校验，前端不产出最终排程。</p></section></div>`)}
// 优先级由订单状态推导，不再固定写「第一条=紧急」；订单行只显示已知的实际排产状态。
// ============ 订单优先级与延期容忍度（R8/R9 人工标注） ============
// 优先级：0=常规(最低) 1=临期(中等) 2=紧急(最高，紧急插单)
// 延期容忍：true=可延期3天(可容忍客户，软约束) false=不可延期(罚款客户，硬约束)
// 因订单表无客户字段，R8 罚款/容忍、R9 优先级需由企业人工导入标注。
const PRIORITY_STORAGE_KEY = 'production-dashboard-order-priority';
const TOLERANCE_STORAGE_KEY = 'production-dashboard-order-tolerance';
function readAnnotationStore(key){
  try{
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }catch(_){ return {}; }
}
function saveAnnotationStore(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){ /* 私密浏览等场景下仍保持本页可用 */ }
}
let orderPriority = readAnnotationStore(PRIORITY_STORAGE_KEY); // {订单号: 0|1|2}
let orderTolerant = readAnnotationStore(TOLERANCE_STORAGE_KEY); // {订单号: true|false}
let selectedOrder = null;  // 当前在助手面板选中的订单
let backendDecisionIndex = {};

function decisionExplanationMarkup(orderId, process, device){
  const info=backendDecisionIndex[orderId];
  if(!info)return `<section class="decision-explanation"><h3>排程决策解释</h3><p class="module-note">当前对象暂无正式排程依据，不能生成设备选择或插队原因。</p></section>`;
  const operations=Array.isArray(info.operations)?info.operations:[];
  const op=operations.find(item=>(!process||item.process===process)&&(!device||item.device===device))||operations[0];
  if(!op)return `<section class="decision-explanation"><h3>排程决策解释</h3><p class="module-note">该订单尚未形成可解释的正式工序计划。</p></section>`;
  const rules=(op.rules||[]).slice(0,6);
  const priorityRule=rules.find(item=>item.rule==='R8'||item.rule==='R9');
  const related=op.related_orders||info.related_orders||[];
  return `<section class="decision-explanation"><h3>排程决策解释</h3>
    <dl class="decision-grid"><dt>设备选择</dt><dd><b>${escapeHtml(op.device)} · ${escapeHtml(op.process)}</b><br>${escapeHtml(op.device_reason||'暂无选机依据')}</dd>
    <dt>计划时段</dt><dd>${escapeHtml(String(op.start||'').replace('T',' '))} → ${escapeHtml(String(op.end||'').replace('T',' '))}</dd>
    <dt>优先级作用</dt><dd>${escapeHtml(priorityRule?priorityRule.text:'未记录人工插队；顺序由订单分类、交期余量和 ATC 优先级共同确定。')}</dd>
    <dt>换型原因</dt><dd>${escapeHtml(op.changeover_reason||'本工序未触发换型记录。')}</dd></dl>
    <h3>实际生效规则</h3>${rules.length?`<ul class="trace-list">${rules.map(item=>`<li><b>${escapeHtml(item.rule)}</b> ${escapeHtml(item.text)}${item.impact?` <em>${escapeHtml(item.impact)}</em>`:''}</li>`).join('')}</ul>`:'<p class="module-note">没有可展示的规则记录。</p>'}
    <h3>关联订单</h3><p>${related.length?related.map(escapeHtml).join('、'):'当前设备后续没有其他订单。'}</p><small>关联订单表示同机后续可能受人工调整传播影响，不代表已经发生延期。</small></section>`;
}

function selectScheduleTask(orderId, process, device){
  const machine=machines.find(item=>item.id===device);
  if(machine)selected=machine;
  selectedOrder=orderId;
  $('#assistantContent').innerHTML=`<section><h3>当前选中任务</h3><p><b>${escapeHtml(orderId||'换型任务')}</b><br>${escapeHtml(device)} · ${escapeHtml(process||'设备占用')}</p></section>${decisionExplanationMarkup(orderId,process,device)}<section><h3>设备操作</h3>${renderDeviceOps()}</section>`;
  showToast(`已打开 ${orderId||device} 的排程解释`);
}

function priorityLevel(orderId){
  if(orderId in orderPriority) return orderPriority[orderId];
  const row = orders.find((r,i)=>i>0 && String(r[0])===orderId);
  const st = row ? String(row[4]||'') : '';
  return /临期|缺料|逾期/.test(st) ? 1 : 0;   // 默认：临期→中等，其余→最低
}
function priorityLabel(level){ return ['常规','临期','紧急'][level] ?? '常规'; }
function setPriority(orderId, level){ orderPriority[orderId] = Math.max(0, Math.min(2, Number(level)||0)); saveAnnotationStore(PRIORITY_STORAGE_KEY, orderPriority); }
function isTolerant(orderId){ return orderTolerant[orderId] === true; }
function setTolerant(orderId, val){ orderTolerant[orderId] = !!val; saveAnnotationStore(TOLERANCE_STORAGE_KEY, orderTolerant); }
// 预留接口：把人工标注的优先级 + 延期容忍度导出为结构化数据，
// 供后端排产接口（如 POST /api/replan）读取 —— R8 延期容忍、R9 优先级是排产的输入约束。
// 后端据此在「无法保证全部准时」时优先保障「不可延期」订单，把违约罚款降到最低。
// 解析延期容忍清单：CSV 两列「订单号, 是否可延期3天」，批量标记 orderTolerant。
// 标记词：是/可延期/true/1/y/yes → 可延期；否则 → 不可延期。
function parseTolerantImport(text){
  const lines = String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  let count = 0;
  lines.forEach((line, idx)=>{
    if(idx === 0 && /订单|延期|容忍|客户/.test(line)) return;
    const cols = line.split(/[,，\t]/).map(c=>c.trim());
    const orderId = cols[0];
    if(!orderId) return;
    const flag = (cols[1]||'').toLowerCase();
    setTolerant(orderId, /是|可延期|true|1|y|yes/.test(flag));
    count++;
  });
  return count;
}

// ============ 设备台账增减（主数据管理） ============
// 新增设备：编号需 4 位数字且唯一；工段决定工序归属。新设备默认「待排」。
function addDevice(code, zone){
  code = String(code||'').trim();
  if(!code) return '请输入设备编号';
  if(!/^\d{4}$/.test(code)) return '设备编号应为 4 位数字（如 8304）';
  if(machines.some(m=>m.id===code)) return '设备编号已存在';
  machines.push({ id:code, zone, status:'idle', order:'待排', product:'—', material:'待模型接入', capacity:'0%', queue:0, change:'无', risk:'无' });
  return null;
}
// 删除设备：从台账移除，并清理其甘特任务与锁定状态
function removeDevice(code){
  const i = machines.findIndex(m=>m.id===code);
  if(i < 0) return false;
  machines.splice(i, 1);
  tasks = tasks.filter(t=>{ const c = barCode(t, null); return c !== code; });
  lockedMachines.delete(code);
  return true;
}

// ============ 设备维护/停机/停用（对应赛题进阶任务「设备异常」） ============
// type: 'maintenance'(维护中/计划维修，灰) | 'fault'(故障停机，深红) | 'disabled'(停用，深灰)
// start/end: 时间戳字符串（维护/停机的开始与预计结束）；note: 原因/说明
let machineMaintenance = {};

function maintenanceOf(code){ return machineMaintenance[code] || null; }
function setMaintenance(code, type, start, end, note){
  if(type == null){ delete machineMaintenance[code]; }
  else { machineMaintenance[code] = { type, start, end, note: note||'' }; }
}
// 设备显示状态：优先维护/停机/停用，否则用自身 status
function deviceDisplayStatus(m){
  const mm = maintenanceOf(m.id);
  if(mm) return mm.type;
  return m.status;
}
// 维护/停机状态的中文与说明（含停产时间）
function maintenanceLabel(code){
  const mm = maintenanceOf(code);
  if(!mm) return null;
  const names = { maintenance:'维护中', fault:'故障停机', disabled:'停用' };
  const label = names[mm.type] || mm.type;
  let dur = '';
  if(mm.type !== 'disabled' && mm.end){
    const end = new Date(mm.end), now = new Date();
    if(!isNaN(end.getTime())) dur = '（预计恢复 ' + (mm.type==='fault'?'':'至 ') + mm.end.replace('T',' ').slice(0,16) + '）';
  }
  return label + dur;
}

function getOrderAnnotations(){
  const out = {};
  orders.slice(1).forEach(r=>{
    const id = String(r[0]);
    out[id] = { priority: priorityLevel(id), tolerant: isTolerant(id), due: r[3] };
  });
  return out;
}

// 点击订单：助手面板切换为该订单的优先级/延期容忍设置
function selectOrder(orderId){
  selectedOrder = orderId;
  renderOrderAssistant(orderId);
}
function renderOrderAssistant(orderId){
  const lv = priorityLevel(orderId);
  const tol = isTolerant(orderId);
  const row = orders.find((r,i)=>i>0 && String(r[0])===orderId);
  $('#assistantContent').innerHTML = `
    <section><h3>订单详情</h3><p><b>${escapeHtml(orderId)}</b><br>${escapeHtml(row?row[1]:'')} · ${escapeHtml(row?row[2]:'')} · 交期 ${escapeHtml(row?row[3]:'')}</p></section>
    <section><h3>优先级（R9）</h3>
      <div class="pri-row"><input type="range" id="priRange" min="0" max="2" step="1" value="${lv}"><b id="priLabel">${priorityLabel(lv)}</b></div>
      <div class="pri-scale"><span>常规</span><span>临期</span><span>紧急</span></div>
      <p class="module-note">紧急插单＝最高，临期＝中等，常规＝最低。拖动进度条调整优先级。</p>
    </section>
    ${decisionExplanationMarkup(orderId)}
    <section><h3>延期容忍度（R8）</h3>
      <label class="tol-switch"><input type="checkbox" id="tolCheck" ${tol?'checked':''}> 客户可延期3天</label>
      <p class="module-note">解释：勾选＝该客户有 3 天延期容忍度，延期 ≤3 天不罚款（软约束）；不勾选＝延期即罚款（硬约束）。此标记由企业人工导入。</p>
    </section>
    <section><h3>排产策略</h3><p class="module-note">当无法保证全部准时交付时，排产优先保障「不可延期」订单，把违约罚款降到最低。</p></section>
  `;
  $('#priRange').addEventListener('input', () => {
    const v = Number($('#priRange').value);
    setPriority(orderId, v);
    const label = $('#priLabel');
    if(label) label.textContent = priorityLabel(v);
    // 订单中心表格同步刷新优先级列
    const body = $('#orderTableBody');
    if(body) body.innerHTML = orderRows(orders.slice(1));
  });
  $('#priRange').addEventListener('change', () => {
    showToast(`已保存 ${orderId} 的优先级：${priorityLabel(priorityLevel(orderId))}；重新试排后将参与排序`);
  });
  $('#tolCheck').addEventListener('change', e => {
    setTolerant(orderId, e.target.checked);
    const body = $('#orderTableBody');
    if(body) body.innerHTML = orderRows(orders.slice(1));
    showToast(e.target.checked ? `已标记 ${orderId} 可延期3天` : `已标记 ${orderId} 不可延期（罚款客户）`);
  });
}

function orderScheduleState(orderId){
  const info=backendDecisionIndex[orderId];
  if(!info)return '<span class="tol-none" title="当前订单尚未收到后端正式排程结果">未加载排程</span>';
  const status=String(info.status||'');
  if(status==='exception'||status==='risk')return '<span class="pri-lv pri-1" title="已形成排程，但预计存在交期或资源风险">已排程·有风险</span>';
  if(status==='manual')return '<span class="tol-tag" title="该订单需要计划员确认后才能发布">需人工确认</span>';
  return '<span class="tol-tag" title="已通过当前后端排产计算并形成工序安排">已形成排程</span>';
}
const orderRows = (items=orders.slice(1)) => items.map(r=>{const id=String(r[0]);const lv=priorityLevel(id);const tol=isTolerant(id);return `<div class="order-data" data-order="${escapeHtml(id)}"><span>${escapeHtml(id)}</span><span>${escapeHtml(r[1])}</span><span>${escapeHtml(r[2])}</span><span>${escapeHtml(r[3])}</span><span class="pri-lv pri-${lv}">${priorityLabel(lv)}</span>${tol?'<span class="tol-tag" title="客户有3天延期容忍度：延期≤3天不罚款（软约束），由企业人工导入">可延期3天</span>':'<span class="tol-none">不可延期</span>'}${orderScheduleState(id)}<span><button type="button" class="order-delete" data-delete-order="${escapeHtml(id)}" title="从本次排产中移除，原始Excel订单不会被修改">删除</button></span></div>`;}).join('') || '<p class="empty-state">没有找到匹配订单</p>';
function ordersPage(){return pageFrame('orders',`<section class="panel module-card"><div class="filter-row"><input id="orderSearch" aria-label="搜索订单：订单号、规格或客户" placeholder="搜索订单号、规格或客户" /><button id="orderRiskFilter">仅看风险</button><button id="orderSort" title="按业务优先级排序：紧急、临期、常规；同级优先不可延期和更早交期">优先级排序 ↓</button><button id="newOrder" class="primary-button">新增订单</button></div><p class="module-note">删除仅从本次排产版本移除，并同步清除对应任务与风险；不修改原始Excel订单。</p><div class="data-table order-table"><div class="data-head"><span>订单号</span><span>规格</span><span>数量</span><span>预发货日</span><span>优先级</span><span>延期容忍</span><span>排产状态</span><span>操作</span></div><div id="orderTableBody">${orderRows()}</div></div></section>`)}
function riskSummaryMarkup(){
  const hard=risks.filter(r=>r.level==='risk').length;
  const warn=risks.filter(r=>r.level==='change').length;
  const devs=new Set(risks.map(r=>r.machine).filter(Boolean)).size;
  // 罚款风险订单：不可延期（R8 硬约束）且临期/紧急 —— 排产须优先保障
  const penaltyRisk = orders.slice(1).filter(r=>!isTolerant(String(r[0])) && priorityLevel(String(r[0]))>=1).length;
  const down = machines.filter(m=>maintenanceOf(m.id)).length;
  return `<div class="risk-summary"><div><b>${hard}</b><span>硬风险</span></div><div><b>${warn}</b><span>预警</span></div><div><b>${penaltyRisk}</b><span>罚款风险订单</span></div><div><b>${down}</b><span>停机设备</span></div></div>`;
}
function riskRelatedOrders(r){
  const explicit = backendDecisionIndex[r.order]?.related_orders || [];
  const sameMachine = r.machine ? tasks.filter(t => String(t.machine||'').startsWith(String(r.machine))).flatMap(t => (t.bars||[t]).map(b => b.order || t.order)).filter(Boolean) : [];
  return [...new Set([r.order, ...explicit, ...sameMachine].filter(Boolean))].slice(0, 8);
}
function riskDetailMarkup(r, index){
  if(activeRiskIndex !== index) return '';
  const related = riskRelatedOrders(r);
  const hasOrder = Boolean(r.order && orders.some((row,i) => i > 0 && String(row[0]) === String(r.order)));
  return `<div class="risk-action-detail"><p><b>处置依据：</b>${escapeHtml(r.machine ? `设备 ${r.machine} 的当前队列、工序约束与订单交期` : '订单交期与当前排程约束')}。</p><p><b>可能受影响订单：</b>${related.length ? related.map(escapeHtml).join('、') : '后端暂未返回关联订单，需通过重排引擎确认'}。</p><div class="risk-action-buttons">${r.machine ? `<button type="button" data-risk-command="locate" data-risk-index="${index}">定位设备</button>` : ''}${hasOrder ? `<button type="button" data-risk-command="order" data-risk-index="${index}">查看订单</button>` : ''}<button type="button" class="primary-button" data-risk-command="replan" data-risk-index="${index}">进入重排推演</button></div><small>以上操作只生成定位或推演上下文；不会直接覆盖已发布计划。</small></div>`;
}
function risksPage(){return pageFrame('risks',`${riskSummaryMarkup()}<section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">按影响程度排序</p><h2>待处置风险</h2></div></div><div class="risk-action-list">${risks.map((r,i)=>`<article class="risk-action ${activeRiskIndex===i?'expanded':''}"><i class="${escapeHtml(r.level||'')}"></i><div><b>${escapeHtml(r.title)}</b><p>${escapeHtml(r.text)}</p></div><button type="button" class="risk-open" data-risk-command="detail" data-risk-index="${i}">${activeRiskIndex===i?'收起':'查看处置'} →</button>${riskDetailMarkup(r,i)}</article>`).join('')||'<p class="empty-state">当前没有待处置风险</p>'}</div></section>`) }
function reschedulePage(){return pageFrame('reschedule',`<div class="scenario-grid"><section class="panel module-card scenario selected" data-scenario="insert"><p class="eyebrow">场景 01</p><h2>紧急插单</h2><p>新订单要求在 24 小时内交付。</p><b class="danger" data-scenario-note="insert">由引擎计算影响</b><button class="primary-button" data-scenario-action="insert">运行推演</button></section><section class="panel module-card scenario" data-scenario="shutdown"><p class="eyebrow">场景 02</p><h2>设备停机</h2><p>选择设备和预计停机时段，计算替代机台。</p><b class="warning" data-scenario-note="shutdown">待选择设备</b><button data-scenario-action="shutdown">配置场景</button></section><section class="panel module-card scenario" data-scenario="material"><p class="eyebrow">场景 03</p><h2>物料延迟</h2><p>评估原材料未到货对下游工序的传播。</p><b class="info" data-scenario-note="material">待录入物料</b><button data-scenario-action="material">配置场景</button></section></div><div id="scenarioConfig" class="scenario-config"></div><section class="panel module-card manual-insert-card"><div class="panel-heading"><div><p class="eyebrow">人工输入 · 引擎试排</p><h2>自定义紧急插单</h2></div><span class="module-note">先生成真实候选方案，人工确认后发布正式排程</span></div><div class="manual-insert-grid"><form id="manualInsertForm" class="manual-insert-form"><label>订单号<input name="orderId" required placeholder="例如 JW-260918-999"></label><label>产品规格<input name="spec" required placeholder="例如 30mm GT34Z(35W*K7+WSC)"></label><label>数量（米）<input name="quantity" type="number" min="1" required placeholder="例如 1600"></label><label>要求交期<input name="due" type="datetime-local" required></label><label>物料<input name="material" required placeholder="例如 WSC 绳芯"></label><label>优先级<select name="priority"><option>紧急</option><option>高</option><option>常规</option></select></label><label>首选工段<select name="zone"><option>拉丝</option><option>捻股</option><option>合绳</option><option>不限</option></select></label><label>确认人<input name="confirmedBy" required placeholder="计划员姓名"></label><label>确认原因<textarea name="reason" rows="2" required placeholder="例如 客户书面要求紧急交付"></textarea></label><label>备注<textarea name="note" rows="2" placeholder="可填写特殊工艺或不可切换设备"></textarea></label><button class="primary-button" type="submit">调用引擎生成候选方案</button></form><aside class="manual-insert-guide"><h3>填写指导</h3><ol><li>订单号必须唯一，确认发布后进入订单中心。</li><li>规格必须包含完整股数、每股丝数和绳芯。</li><li>候选方案由后端校验设备、换型和工序间隔。</li><li>无法按时完成时会显示最早交付时间，不虚构保证。</li></ol><div class="manual-template-example"><b>示例</b><code>JW-260918-999｜30mm GT34Z(35W*K7+WSC)｜1600m｜紧急</code></div></aside></div><div id="manualInsertResult" class="manual-insert-result" hidden></div></section><section class="panel module-card compare" id="scenarioCompare"></section>`)}
// 状态文字与状态点颜色全部取自 STATUS_META：状态岛、下拉、列表三处不可能再对不上。
// 未登记状态走 status-unknown + 内联 --c，不会因为「没写 CSS 类」而丢色。
const machineRows = (items=machines) => items.map(m=>{const st=deviceDisplayStatus(m);const meta=statusMetaOf(st);return `<button class="machine-record" data-machine="${escapeHtml(m.id)}"><i class="${escapeHtml(st)}${meta.unknown?' status-unknown':''}"${meta.unknown?` style="--c:${meta.color}"`:''}></i><b>${escapeHtml(m.id)}</b><span>${escapeHtml(m.zone)}</span><span>${escapeHtml(m.order)}</span><span>利用率 ${escapeHtml(m.capacity)}</span><em>${escapeHtml(meta.short)}</em></button>`;}).join('') || '<p class="empty-state">没有符合条件的设备</p>';
function machinesPage(){
  // 从顶部状态岛点进来时会带一个待应用状态：预置下拉 + 直接把列表筛好。
  // 否则用户点了圆圈还得在下拉里再选一次，等于没省事。
  const requested = ISLAND_STATUS.some(s => s.key === machineFilterRequest) ? machineFilterRequest : 'all';
  const list = requested === 'all' ? machines : machines.filter(m => deviceDisplayStatus(m) === requested);
  return pageFrame('machines',`<section class="panel module-card"><div class="filter-row"><input id="machineSearch" aria-label="按设备编号搜索" placeholder="输入设备编号，例如 8304" /><select id="zoneFilter" aria-label="按工段筛选"><option value="all">全部工段</option><option>拉丝</option><option>捻股</option><option>合绳</option></select><select id="statusFilter" aria-label="按设备状态筛选">${machineStatusOptions.map(([v,t])=>`<option value="${v}"${v===requested?' selected':''}>${t}</option>`).join('')}</select></div><div id="machineTable" class="machine-list">${machineRows(list)}</div></section>`)}
function dataPage(){return pageFrame('data',`<div class="module-grid"><section class="panel module-card upload-card"><p class="eyebrow">导入数据</p><h2>订单与工艺文件</h2><div class="drop-zone" id="dropZone">⇅<b>拖入 Excel 文件</b><span id="fileHint">支持订单、设备、工艺、物料数据</span><input id="dataInput" type="file" accept=".xlsx,.xls,.csv" aria-label="选择要导入的数据文件" hidden><button id="chooseFile" type="button">选择文件</button></div><div id="importResult" class="import-result" hidden></div></section><section class="panel module-card"><p class="eyebrow">设备台账管理</p><h2>设备增减</h2><div class="device-mgr-form"><label>设备编号 <input id="newDeviceCode" placeholder="例如 8304" /></label><label>工段 <select id="newDeviceZone"><option>拉丝</option><option>捻股</option><option>合绳</option></select></label><button id="addDeviceBtn" class="primary-button" type="button">新增设备</button></div><div class="device-mgr-form"><label>删除设备 <select id="delDeviceSelect"></select></label><button id="delDeviceBtn" type="button">删除</button></div><p class="module-note" id="deviceMgrNote">当前台账 <b>${machines.length}</b> 台设备。</p></section><section class="panel module-card"><p class="eyebrow">当前数据源</p><h2>数据状态</h2><div id="sourceList" class="source-list">${sourceListMarkup()}</div></section><section class="panel module-card"><p class="eyebrow">导出成果</p><h2>计划包</h2><div class="source-list"><p><b>排产计划表</b><button data-export="CSV">导出 CSV</button></p><p><b>设备甘特图</b><button data-export="PNG">导出 PNG</button></p><p><b>风险处置清单</b><button data-export="XLSX">导出 XLSX</button></p></div></section><section class="panel module-card"><p class="eyebrow">人工标注 · R8 延期容忍</p><h2>客户延期容忍度导入</h2><p class="module-note">导入 CSV（两列：订单号, 是否可延期3天），批量标记客户延期容忍度。示例行：JW-260918-106,是</p><div class="source-list"><p><b>延期容忍清单</b><button data-import-tolerant="1" type="button">选择 CSV 文件</button></p></div><input id="tolerantInput" type="file" accept=".csv" hidden><div id="tolerantResult" class="module-note"></div></section><section class="panel module-card import-preview-card" id="importPreviewCard" hidden><div class="panel-heading"><div><p class="eyebrow">标准化数据预览</p><h2>导入校验结果</h2></div><span id="importVersion" class="module-note"></span></div><div id="importSummary" class="import-summary"></div><div id="importIssues" class="import-issues"></div><div id="importRows" class="import-rows"></div></section></div>`)}
// 数据状态卡片：原来写死「内置演示订单 4 条 / 内置设备台账 109 台」，
// 导入数据或接入后端后与实际不符。改为按真实数据渲染。
function sourceListMarkup(){
  const imported=Object.keys(importedDataset.sheets||{}).length>0;
  const orderCount=Math.max(0,orders.length-1);
  return `<p><b>${imported?'已导入文件':'内置演示订单'}</b><span class="good">${orderCount} 条</span></p>`
    +`<p><b>设备台账</b><span class="good">${machines.length} 台</span></p>`
    +`<p><b>数据版本</b><span>${imported?escapeHtml(importedDataset.version):'内置演示'}</span></p>`;
}
// 统一的交期解析：演示数据是 '09/19 08:00'（无年份，按当年），导入/后端数据是 '2026-08-07'。
// 解析成 Date 后既能排序，也能与「完工时间」比较判定准时 —— 排序与归档共用这一处。
function parseDueDate(value){
  const s=String(value||'').trim();
  let m=s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2}))?/);
  if(m)return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0));
  m=s.match(/(\d{1,2})\/(\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2}))?/);
  if(m)return new Date(new Date().getFullYear(),+m[1]-1,+m[2],+(m[3]||0),+(m[4]||0));
  return null;
}
// 订单中心默认按业务优先级，而非单纯日期：紧急→临期→常规；同级先保不可延期，再看预发货日。
let orderSortAsc=false;
function sortOrdersByPriority(notify=true){
  const key=v=>{const d=parseDueDate(v);return d?d.getTime():Number.MAX_SAFE_INTEGER;};
  const rows=orders.slice(1).slice().sort((a,b)=>{
    const priorityGap=priorityLevel(String(b[0]))-priorityLevel(String(a[0]));
    if(priorityGap)return priorityGap*(orderSortAsc?1:-1);
    const hardFirst=Number(isTolerant(String(a[0])))-Number(isTolerant(String(b[0])));
    if(hardFirst)return hardFirst;
    return key(a[3])-key(b[3]);
  });
  orders=[orders[0],...rows];
  $('#orderTableBody').innerHTML=orderRows(rows);
  if(notify)showToast(`订单已按优先级${orderSortAsc?'升序':'降序'}排列；同级先保障不可延期订单`);
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
function applyMachineFilter(){const query=$('#machineSearch').value.trim();const zone=$('#zoneFilter').value;const status=$('#statusFilter').value;const visible=machines.filter(m=>(!query||m.id.includes(query))&&(zone==='all'||m.zone===zone)&&(status==='all'||deviceDisplayStatus(m)===status));$('#machineTable').innerHTML=machineRows(visible);$('#machineTable').querySelectorAll('[data-machine]').forEach(btn=>btn.addEventListener('click',()=>selectMachine(btn.dataset.machine)));}
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
/* ------------------------------------------------------------------
 * 完工归档（排产闭环的最后一环）
 * 定位：完工确认不是「系统自动判定」，而是计划员依据车间 / MES 回报手工登记。
 *       所以这里记录操作时间与判定依据，形成可追溯的版本留痕。
 * 联动：归档 = 该订单退出在排池 —— 甘特任务移除、关联风险清除、KPI 按在排重算。
 *       被移出的任务与风险暂存在归档记录里，撤回时原样恢复。
 * ------------------------------------------------------------------ */

// 关联判定：优先用显式 order 字段（后端 task 带 order_id）；没有则退回「订单号出现在文本里」。
// 注意不能反过来用 label 去 includes 订单号 —— 演示数据的 label 是 'JW-071' 这类短号，会把关系搞错。
function taskBelongsTo(task, orderId){
  if(!task || !orderId) return false;
  if(String(task.order||'').trim()) return String(task.order)===orderId;
  const bars = task.bars || [task];
  if(bars.some(b=>String(b.order||'').trim()===orderId)) return true;
  return bars.some(b=>String(b.label||'').includes(orderId));
}
function riskBelongsTo(r, orderId){
  if(!r || !orderId) return false;
  if(String(r.order||'').trim()) return String(r.order)===orderId;
  return (String(r.title||'')+String(r.text||'')).includes(orderId);
}
function deleteOrderFromPlan(orderId){
  const index = orders.findIndex((row,i) => i > 0 && String(row[0]) === String(orderId));
  if(index < 1) return false;
  const row = orders[index];
  const removedTasks = tasks.filter(task => taskBelongsTo(task, orderId));
  const removedRisks = risks.filter(risk => riskBelongsTo(risk, orderId));
  deletedOrderRecords.unshift({orderId, row, removedTasks, removedRisks, deletedAt:new Date().toISOString()});
  orders = orders.filter((_,i) => i !== index);
  tasks = tasks.filter(task => !removedTasks.includes(task));
  risks = risks.filter(risk => !removedRisks.includes(risk));
  if(selectedOrder === orderId) selectedOrder = null;
  return true;
}
function toDatetimeLocal(d){
  const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
// 延期展示：不足一天按小时显示，避免把 1 小时延期写成「1 天」
function formatDelay(ms){
  if(!ms||ms<=0) return '—';
  const h=ms/3600000;
  return h<24 ? `${h.toFixed(1)} 小时` : `${(h/24).toFixed(1)} 天`;
}
function shortTime(iso){
  const d=iso?new Date(iso):null;
  if(!d||isNaN(d.getTime()))return '—';
  const p=n=>String(n).padStart(2,'0');
  return `${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 登记完工并归档。completedAt 为 Date；成功返回归档记录，失败返回 null。
function registerCompletion(orderId, completedAt, archiveMode='manual'){
  const idx = orders.findIndex((r,i)=>i>0 && String(r[0])===orderId);
  if(idx < 1) return null;
  const row = orders[idx];
  const dueDate = parseDueDate(row[3]);
  const onTime = (dueDate && completedAt) ? completedAt.getTime() <= dueDate.getTime() : null;
  const delayMs = (onTime === false) ? (completedAt.getTime()-dueDate.getTime()) : 0;

  const removedTasks = tasks.filter(t=>taskBelongsTo(t, orderId));
  const removedRisks = risks.filter(r=>riskBelongsTo(r, orderId));

  const record = {
    orderId, spec: row[1], qty: row[2], due: row[3], status: String(row[4]||''),
    completedAt: completedAt.toISOString(),
    completedLabel: toDatetimeLocal(completedAt).replace('T',' '),
    onTime, delayMs, archiveMode,
    archivedAt: new Date().toISOString(),
    removedTasks, removedRisks,
  };
  archiveRecords = [record, ...archiveRecords];
  tasks = tasks.filter(t=>!removedTasks.includes(t));
  risks = risks.filter(r=>!removedRisks.includes(r));
  orders = orders.filter((_,i)=>i!==idx);
  return record;
}

// 撤回归档：订单回到在排池，甘特任务与风险按原样恢复。
function unarchiveOrder(orderId){
  const i = archiveRecords.findIndex(a=>a.orderId===orderId);
  if(i < 0) return false;
  const rec = archiveRecords[i];
  tasks = [...tasks, ...(rec.removedTasks||[])];
  risks = [...(rec.removedRisks||[]), ...risks];
  orders = [orders[0], [rec.orderId, rec.spec, rec.qty, rec.due, rec.status||'在排'], ...orders.slice(1)];
  archiveRecords = archiveRecords.filter((_,k)=>k!==i);
  return true;
}

function archiveStats(){
  const judged = archiveRecords.filter(a=>a.onTime!==null);
  const onTime = judged.filter(a=>a.onTime===true).length;
  const rate = judged.length ? (onTime/judged.length*100).toFixed(1)+'%' : '—';
  const avgDelay = judged.length ? (archiveRecords.reduce((s,a)=>s+(a.delayMs||0),0)/judged.length/86400000).toFixed(1) : '—';
  return {pending: Math.max(0, orders.length-1), total: archiveRecords.length, rate, avgDelay, judged: judged.length};
}

function archivePage(){
  const st = archiveStats();
  const pendingRows = orders.slice(1).map(r=>`<div class="order-data"><span>${escapeHtml(r[0])}</span><span>${escapeHtml(r[1])}</span><span>${escapeHtml(r[2])}</span><span>${escapeHtml(r[3])}</span><span class="archive-actions"><button type="button" class="primary-button archive-go" data-complete="${escapeHtml(r[0])}">登记完工</button><button type="button" class="archive-strict" data-complete-strict="${escapeHtml(r[0])}" title="按原始交期判定，不使用客户延期容忍">未延期归档</button></span></div>`).join('')
    || '<p class="empty-state">在排池为空，全部订单已归档</p>';
  const archivedRows = archiveRecords.map(a=>`<div class="order-data">
      <span>${escapeHtml(a.orderId)}</span><span>${escapeHtml(a.spec)}</span>
      <span>${escapeHtml(a.due)}</span><span>${escapeHtml(a.completedLabel)}</span>
      <span class="${a.onTime===false?'danger':a.onTime===true?'good':''}">${a.onTime===null?'无法判定':a.onTime?'准时':'超期'}</span>
      <span>${formatDelay(a.delayMs)}</span>
      <span class="archive-meta">${escapeHtml(shortTime(a.archivedAt))} · ${a.archiveMode==='strict'?'未延期（严格交期）':'人工登记'} · 移出 ${(a.removedTasks||[]).length} 条任务 / ${(a.removedRisks||[]).length} 条风险</span>
      <span><button type="button" class="archive-undo" data-unarchive="${escapeHtml(a.orderId)}">撤回</button></span>
    </div>`).join('') || '<p class="empty-state">还没有归档记录。在上方登记完工后，这里会出现版本留痕。</p>';
  return pageFrame('archive', `
    <div class="risk-summary">
      <div><b>${st.pending}</b><span>待完工确认</span></div>
      <div><b>${st.total}</b><span>已归档订单</span></div>
      <div><b>${st.rate}</b><span>已归档准时率</span></div>
      <div><b>${st.avgDelay}</b><span>平均延期天数</span></div>
    </div>
    <div class="archive-switch" role="tablist" aria-label="完工归档视图">
      <button type="button" role="tab" data-archive-view="pending" aria-selected="${archiveView==='pending'}" class="${archiveView==='pending'?'active':''}">待完工确认 <b>${st.pending}</b></button>
      <button type="button" role="tab" data-archive-view="archived" aria-selected="${archiveView==='archived'}" class="${archiveView==='archived'?'active':''}">已归档订单 <b>${st.total}</b></button>
    </div>
    <section class="panel module-card" ${archiveView!=='pending'?'hidden':''}>
      <div class="panel-heading"><div><p class="eyebrow">在排池</p><h2>待完工确认</h2></div>
        <span class="module-note">完工确认由计划员依据车间 / MES 回报手工登记</span></div>
      <div id="archiveForm" class="archive-form" hidden></div>
      <div class="data-table archive-pending">
        <div class="data-head"><span>订单号</span><span>规格</span><span>数量</span><span>计划交期</span><span>操作</span></div>
        ${pendingRows}
      </div>
    </section>
    <section class="panel module-card" ${archiveView!=='archived'?'hidden':''}>
      <div class="panel-heading"><div><p class="eyebrow">版本留痕</p><h2>已归档订单</h2></div>
        <span class="module-note">归档后退出在排池，准时率按已判定记录计算</span></div>
      <div class="data-table archive-table">
        <div class="data-head"><span>订单号</span><span>规格</span><span>计划交期</span><span>完工时间</span><span>准时判定</span><span>延期</span><span>归档留痕</span><span>操作</span></div>
        ${archivedRows}
      </div>
    </section>`);
}

// 「登记完工」小表单：完工时间可改，便于演示准时 / 超期两种情况
function openArchiveForm(orderId, mode='manual'){
  const host = $('#archiveForm');
  if(!host) return;
  const row = orders.find((r,i)=>i>0 && String(r[0])===orderId);
  const strict = mode==='strict';
  const originalDue = row ? parseDueDate(row[3]) : null;
  const defaultCompletedAt = strict && originalDue ? originalDue : new Date();
  host.hidden = false;
  host.innerHTML = `<div class="archive-form-inner">
      <b>${strict?'未延期归档':'登记完工'}：${escapeHtml(orderId)}</b>
      <span>计划交期 ${escapeHtml(row?row[3]:'—')}</span>
      ${strict?'<span class="archive-mode">未延期（严格交期）</span>':''}
      <label>完工时间<input type="datetime-local" id="archiveCompletedAt" aria-label="完工时间" value="${toDatetimeLocal(defaultCompletedAt)}" /></label>
      <button type="button" class="primary-button" id="archiveConfirm">确认归档</button>
      <button type="button" id="archiveCancel">取消</button>
      <small>${strict?'本次按原始交期进行严格准时判定，不调用客户延期容忍；请以车间 / MES 的真实完工时间为准。':'归档后该订单退出在排池：甘特任务移除、关联风险清除、KPI 按在排重算。可在下方「已归档」中撤回。'}</small>
    </div>`;
  host.scrollIntoView({behavior:'smooth', block:'center'});
  $('#archiveCancel').addEventListener('click',()=>{host.hidden=true;host.innerHTML='';});
  $('#archiveConfirm').addEventListener('click',()=>{
    const val = $('#archiveCompletedAt')?.value;
    const at = val ? new Date(val) : new Date();
    if(isNaN(at.getTime())){ showToast('完工时间格式不正确'); return; }
    const rec = registerCompletion(orderId, at, mode);
    host.hidden = true; host.innerHTML = '';
    if(!rec){ showToast('未找到该订单，可能已被归档'); return; }
    archiveView = 'archived';
    renderModule('archive'); renderGantt(); renderRisks(); renderOrders(); renderKpi();
    showToast(rec.onTime===null
      ? `已归档 ${orderId}（交期无法解析，未作准时判定）`
      : `已归档 ${orderId}：${rec.onTime?'准时':'超期 '+formatDelay(rec.delayMs)}，移出 ${rec.removedTasks.length} 条甘特任务`);
  });
}

/* ------------------------------------------------------------------
 * 生产数据分析（加分任务，两个方向都做）
 * 方向② 设备利用率分析：数据自足（排产结果天然带设备占用）
 * 方向① 质量分析：基于《典型质量案例.xlsx》（样例很薄，如实展示）
 *
 * 数据来源：雏形阶段用「排产引擎 v1 的真实结果」作为示例数据硬编码在此，
 *          页面顶部明确标注「示例数据」；算法接口定型后调用
 *          window.applyAnalysisData(payload) 整体替换，无需改渲染函数。
 *
 * 图表规范（遵循 dataviz）：
 *   - 利用率/分布/Top 都是「magnitude」→ 单色顺序蓝，柱长编码量级，不做彩虹色
 *   - 单一量纲才画图；量纲不统一的原因分类用表格，不硬凑柱状图
 *   - 文本用 ink 变量，不用系列色；每张图都有表格视图兜底
 * ------------------------------------------------------------------ */

// 雏形数据：来自排产引擎 v1（run_demo 实测），非编造
let analysisData = {
  source: 'demo',
  totalDevices: 109,
  changeoverCount: 486,
  changeoverHours: 1646,
  idleCount: 14,
  manualQueue: 49,
  utilByProcess: [
    { process: '拉丝', rate: 0.236 },
    { process: '捻股', rate: 0.414 },
    { process: '合绳', rate: 0.0375 },
  ],
  distribution: [
    { label: '0%', count: 14 },
    { label: '0–20%', count: 38 },
    { label: '20–40%', count: 17 },
    { label: '40–60%', count: 25 },
    { label: '60–80%', count: 13 },
    { label: '80–100%', count: 2 },
  ],
  topDevices: [
    { code: '8227', process: '捻股', rate: 0.809 },
    { code: '8206', process: '捻股', rate: 0.801 },
    { code: '8240', process: '捻股', rate: 0.783 },
    { code: '8205', process: '捻股', rate: 0.770 },
    { code: '8123', process: '拉丝', rate: 0.745 },
    { code: '8125', process: '拉丝', rate: 0.721 },
    { code: '8138', process: '拉丝', rate: 0.587 },
    { code: '8137', process: '拉丝', rate: 0.577 },
  ],
  reasons: [
    { title: '无适配订单', evidence: '14 台设备完全闲置（利用率 0），规格与设备不适配', suggest: '按规格重新分配订单，或评估设备转产可行性' },
    { title: '换型损失', evidence: '486 次换型，累计 1646 小时', suggest: '同规格订单连排，降低换型频次' },
    { title: '交期前置等待', evidence: '订单集中在 9 月（269 单），工序间隔造成等待', suggest: '均衡交期分布，避免月底集中交付' },
    { title: '产能过剩', evidence: '合绳工序利用率仅 3.75%，12 台合绳机大量闲置', suggest: '评估合绳需求，必要时设备转产或合并产能' },
  ],
  quality: [
    { process: '拉丝', issue: '拉丝压线', batch: '5 批', cause: '排线不良，流入捻股工序', fix: '排线时仔细观察，确保排线良好无压线' },
    { process: '拉丝', issue: '接头断丝', batch: '1 批', cause: '焊接不良，未严格执行焊接操作', fix: '严格按规定操作' },
    { process: '捻股', issue: '压伤', batch: '—', cause: '复测钢丝强度低（2146MPa）', fix: '拉丝工序勤检查钢丝，发现问题及时调整' },
    { process: '捻股', issue: '股有缝', batch: '—', cause: '未按实际捻距调整股缝隙', fix: '严格按工单工艺执行，确认各项参数' },
    { process: '合绳', issue: '打拧', batch: '—', cause: '外部电网停电', fix: '分割使用，规避停电影响' },
  ],
};

// ---- 图表渲染（SVG，单色顺序蓝）----

// 设备利用率分布直方图（单系列 → 统一蓝色）
function distributionSvg(){
  const d = analysisData.distribution;
  const max = Math.max(...d.map(x => x.count));
  const W = 560, H = 220, padL = 30, padR = 8, padT = 18, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = d.length, slot = plotW / n;
  let bars = '';
  d.forEach((x, i) => {
    const h = max ? (x.count / max) * plotH : 0;
    const bx = padL + i * slot + slot * 0.2;
    const bw = slot * 0.6;
    const by = padT + plotH - h;
    bars += `<rect x="${bx}" y="${by}" width="${bw}" height="${h}" rx="3" fill="var(--an-blue)"/>`;
    bars += `<text x="${bx + bw / 2}" y="${padT + plotH + 16}" text-anchor="middle" class="an-tick">${x.label}</text>`;
    if (x.count > 0) bars += `<text x="${bx + bw / 2}" y="${by - 5}" text-anchor="middle" class="an-val">${x.count}</text>`;
  });
  return `<svg class="an-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="设备利用率分布直方图">${bars}</svg>`;
}

// Top 设备横向条形图
function topDevicesSvg(){
  const d = analysisData.topDevices;
  const maxRate = Math.max(...d.map(x => x.rate));
  const W = 560, rowH = 30, padL = 46, padR = 44, topPad = 8, botPad = 8;
  const H = topPad + d.length * rowH + botPad;
  const trackW = W - padL - padR;
  let rows = '';
  d.forEach((x, i) => {
    const y = topPad + i * rowH;
    const w = maxRate ? (x.rate / maxRate) * trackW : 0;
    rows += `<text x="${padL - 8}" y="${y + 16}" text-anchor="end" class="an-tick">${x.code}</text>`;
    rows += `<rect x="${padL}" y="${y + 4}" width="${w}" height="14" rx="3" fill="var(--an-blue)"/>`;
    rows += `<text x="${padL + w + 6}" y="${y + 16}" class="an-val">${(x.rate * 100).toFixed(0)}%</text>`;
  });
  return `<svg class="an-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="高负荷设备利用率排行">${rows}</svg>`;
}

// 顶部全局 stat tile
function analysisStatsMarkup(){
  const st = [
    { k: analysisData.totalDevices, label: '设备总数', hint: '三工序合计' },
    { k: `${analysisData.changeoverCount} 次`, label: '换型', hint: `累计 ${analysisData.changeoverHours} 小时` },
    { k: analysisData.idleCount, label: '闲置设备', hint: '利用率为 0' },
    { k: analysisData.manualQueue, label: '人工确认', hint: '未自动排产的订单' },
  ];
  return `<div class="risk-summary an-stats">${st.map(s => `<div><b>${s.k}</b><span>${s.label}</span><small class="an-hint">${s.hint}</small></div>`).join('')}</div>`;
}

function utilByProcessMarkup(){
  return analysisData.utilByProcess.map(p => {
    const hot = p.rate < 0.1;
    return `<div class="an-proc ${hot ? 'an-proc-low' : ''}"><b>${(p.rate * 100).toFixed(1)}%</b><span>${p.process}</span><small>${hot ? '利用率偏低' : '平均利用率'}</small></div>`;
  }).join('');
}

function qualitySummaryMarkup(){
  // 按工序聚合问题类型与批次
  const byProcess = {};
  analysisData.quality.forEach(q => {
    (byProcess[q.process] = byProcess[q.process] || { issues: 0, types: [] });
    byProcess[q.process].issues += 1;
    byProcess[q.process].types.push(q.issue);
  });
  const order = ['拉丝', '捻股', '合绳'];
  return order.filter(p => byProcess[p]).map(p => {
    const it = byProcess[p];
    return `<div><b>${it.issues}</b><span>${p}质量问题</span><small class="an-hint">${it.types.join('、')}</small></div>`;
  }).join('');
}


// 分析报告执行摘要：从 analysisData 推导文字结论，applyAnalysisData 替换后自动更新。
// 定位「月度可复用」：每月重跑排产，同一口径生成分布、原因分类与本报告。
function analysisReportMarkup(){
  const proc = Object.fromEntries(analysisData.utilByProcess.map(p=>[p.process, p.rate]));
  const sorted = analysisData.utilByProcess.slice().sort((a,b)=>b.rate-a.rate);
  const bottleneck = sorted[0];
  const excess = sorted[sorted.length-1];
  const zero = (analysisData.distribution.find(d=>d.label==='0%')||{count:0}).count;
  const low = (analysisData.distribution.find(d=>d.label==='0–20%')||{count:0}).count;
  const lowTotal = zero + low;
  const lowPct = analysisData.totalDevices ? (lowTotal/analysisData.totalDevices*100).toFixed(1) : '—';
  const changeoverDays = analysisData.changeoverHours ? (analysisData.changeoverHours/24).toFixed(0) : '0';
  const idle = analysisData.idleCount;
  return `<section class="panel module-card an-report">
    <div class="panel-heading"><div><p class="eyebrow">分析报告 · 月度可复用</p><h2>执行摘要</h2></div>
      <span class="module-note">${analysisData.source==='demo'?'示例数据（排产引擎 v1 实测）':'来自算法引擎'}</span></div>
    <div class="an-report-body">
      <div class="an-report-col">
        <h3>核心结论</h3>
        <ol>
          <li><b>${escapeHtml(bottleneck.process)}是产能瓶颈</b>：平均利用率 ${(bottleneck.rate*100).toFixed(1)}% 为三工序最高，高负荷设备集中在该工段。</li>
          <li><b>${escapeHtml(excess.process)}产能过剩</b>：平均利用率仅 ${(excess.rate*100).toFixed(1)}%，设备大量闲置。</li>
          <li><b>近半设备低效</b>：${idle} 台完全闲置（0%）+ ${low} 台低负荷（&lt;20%），占 ${analysisData.totalDevices} 台的 ${lowPct}%。</li>
          <li><b>换型损失可观</b>：${analysisData.changeoverCount} 次换型累计 ${analysisData.changeoverHours} 小时，约合 ${changeoverDays} 天。</li>
        </ol>
      </div>
      <div class="an-report-col">
        <h3>改进建议</h3>
        <ul>
          ${analysisData.reasons.map(r=>`<li><b>${escapeHtml(r.title)}</b>：${escapeHtml(r.suggest)}。</li>`).join('')}
        </ul>
      </div>
    </div>
    <p class="module-note an-report-meta">口径：数据为排产引擎 v1 模拟结果（253 单 × 3 工序，基准日 2026-09-19），非企业真实生产数据。本报告可复用为月度分析机制——每月重跑排产，用同一口径生成利用率分布、原因分类与本摘要，形成趋势对比。</p>
  </section>`;
}

function analysisPage(){

  const srcNote = analysisData.source === 'demo'
    ? '示例数据：来自排产引擎 v1 实测结果（253 单 × 3 工序）。算法接口定型后由 applyAnalysisData 替换。'
    : '数据来自算法引擎。';
  return pageFrame('analysis', `
    ${analysisStatsMarkup()}
    ${analysisReportMarkup()}

    <section class="panel module-card">
      <div class="panel-heading"><div><p class="eyebrow">加分方向② · 设备利用率分析</p><h2>各工序平均利用率</h2></div></div>
      <div class="an-proc-row">${utilByProcessMarkup()}</div>
    </section>

    <div class="analysis-grid">
      <section class="panel module-card">
        <div class="panel-heading"><div><p class="eyebrow">设备利用率分布</p><h2>109 台设备按利用率分桶</h2></div></div>
        ${distributionSvg()}
        <p class="module-note">桶内数字为设备台数；14 台闲置 + 38 台低负荷（<20%）是主要改善空间。</p>
      </section>
      <section class="panel module-card">
        <div class="panel-heading"><div><p class="eyebrow">高负荷设备</p><h2>利用率 Top 8</h2></div></div>
        ${topDevicesSvg()}
        <p class="module-note">最高负荷集中在捻股工序（82 段），捻股是当前瓶颈。</p>
      </section>
    </div>

    <section class="panel module-card">
      <div class="panel-heading"><div><p class="eyebrow">利用率原因分类</p><h2>为什么设备利用率不均</h2></div>
        <span class="module-note">量纲不同，用表格而非柱状图，避免误导</span></div>
      <div class="an-reason-table">
        <div class="data-head"><span>原因</span><span>定量证据</span><span>改进建议</span></div>
        ${analysisData.reasons.map(r => `<div class="order-data"><span class="an-reason-title">${escapeHtml(r.title)}</span><span>${escapeHtml(r.evidence)}</span><span>${escapeHtml(r.suggest)}</span></div>`).join('')}
      </div>
    </section>

    <section class="panel module-card">
      <div class="panel-heading"><div><p class="eyebrow">加分方向① · 质量分析</p><h2>各工序质量问题汇总</h2></div>
        <span class="module-note">样例数据仅 7 条，结论供参考，需企业补充样本</span></div>
      <div class="risk-summary an-quality-summary">${qualitySummaryMarkup()}</div>
      <div class="data-table an-quality-table">
        <div class="data-head"><span>工序</span><span>问题类型</span><span>批次</span><span>原因分析</span><span>改进措施</span></div>
        ${analysisData.quality.map(q => `<div class="order-data"><span>${escapeHtml(q.process)}</span><span>${escapeHtml(q.issue)}</span><span>${escapeHtml(q.batch)}</span><span>${escapeHtml(q.cause)}</span><span>${escapeHtml(q.fix)}</span></div>`).join('')}
      </div>
      <p class="module-note">初步归因：拉丝问题源于排线/焊接操作执行不到位；捻股问题源于原材料强度与工艺参数；合绳打拧为外部电网停电所致。</p>
    </section>

    <p class="module-note an-src-note">${srcNote}</p>
  `);
}

function setupModule(page){const view=$('#moduleView');view.querySelectorAll('[data-machine]').forEach(btn=>btn.addEventListener('click',()=>{selectMachine(btn.dataset.machine);showToast(`已选中设备 ${btn.dataset.machine}`)}));view.querySelectorAll('[data-risk-machine]').forEach(btn=>btn.addEventListener('click',()=>{selectMachine(btn.dataset.riskMachine);renderModule('dashboard')}));if(page==='orders'){const search=$('#orderSearch');sortOrdersByPriority(false);search.addEventListener('input',applyOrderFilter);$('#orderRiskFilter').addEventListener('click',event=>{event.currentTarget.classList.toggle('selected');applyOrderFilter()});$('#orderSort').addEventListener('click',()=>{orderSortAsc=!orderSortAsc;const el=$('#orderSort');if(el)el.textContent=`优先级排序 ${orderSortAsc?'↑':'↓'}`;sortOrdersByPriority();});$('#newOrder').addEventListener('click',()=>{renderModule('reschedule');setScenario('insert',true);document.querySelector('.manual-insert-card')?.scrollIntoView({behavior:'smooth',block:'start'});showToast('新增订单请使用人工调序插单模板');});}if(page==='machines'){['machineSearch','zoneFilter','statusFilter'].forEach(id=>$('#'+id).addEventListener(id==='machineSearch'?'input':'change',applyMachineFilter));machineFilterRequest=null;}if(page==='reschedule'){view.querySelectorAll('.scenario').forEach(card=>card.addEventListener('click',()=>setScenario(card.dataset.scenario)));view.querySelectorAll('[data-scenario-action]').forEach(btn=>btn.addEventListener('click',event=>{event.stopPropagation();setScenario(btn.dataset.scenarioAction);}));setScenario('insert',true);}if(page==='archive'){
    view.querySelectorAll('[data-archive-view]').forEach(btn=>btn.addEventListener('click',()=>{
      archiveView = btn.dataset.archiveView;
      renderModule('archive');
    }));
    view.querySelectorAll('[data-complete]').forEach(btn=>btn.addEventListener('click',()=>openArchiveForm(btn.dataset.complete)));
    view.querySelectorAll('[data-complete-strict]').forEach(btn=>btn.addEventListener('click',()=>openArchiveForm(btn.dataset.completeStrict, 'strict')));
    view.querySelectorAll('[data-unarchive]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.unarchive;
      if(unarchiveOrder(id)){archiveView='pending';renderModule('archive');renderGantt();renderRisks();renderOrders();renderKpi();showToast(`已撤回 ${id}，订单回到在排池，任务与风险已恢复`);}
    }));
  }
  if(page==='schedule'){$('#runTrial')?.addEventListener('click',updateSchedulePreview);}if(page==='data'){const input=$('#dataInput');$('#chooseFile').addEventListener('click',()=>input.click());const addBtn=view.querySelector('#addDeviceBtn');const delBtn=view.querySelector('#delDeviceBtn');const delSel=view.querySelector('#delDeviceSelect');
    if(addBtn){addBtn.addEventListener('click',()=>{const code=$('#newDeviceCode').value;const zone=$('#newDeviceZone').value;const err=addDevice(code,zone);if(err){showToast(err);return;}renderModule('data');renderKpi();showToast('已新增设备 '+code+'（'+zone+'工段）');});}
    if(delBtn&&delSel){const refreshDel=()=>{delSel.innerHTML=machines.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.id)} · ${escapeHtml(m.zone)}</option>`).join('');};refreshDel();delBtn.addEventListener('click',()=>{const code=delSel.value;if(!code){showToast('请选择要删除的设备');return;}if(!removeDevice(code)){showToast('删除失败');return;}renderModule('data');renderKpi();showToast('已删除设备 '+code);});}
    const tolBtn=view.querySelector('[data-import-tolerant]');const tolInput=$('#tolerantInput');if(tolBtn&&tolInput){tolBtn.addEventListener('click',()=>tolInput.click());tolInput.addEventListener('change',()=>{const f=tolInput.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const n=parseTolerantImport(rd.result);const r=$('#tolerantResult');if(r)r.textContent='已导入 '+n+' 条延期容忍标注（可在订单中心查看）';showToast('已导入 '+n+' 条延期容忍标注');};rd.readAsText(f,'utf-8');});}input.addEventListener('change',()=>{const file=input.files[0];if(file){$('#fileHint').textContent=`已选择：${file.name}（${Math.ceil(file.size/1024)} KB），等待解析`;}});view.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.export;if(kind==='CSV')exportScheduleCSV();else if(kind==='PNG')exportGanttPNG();else if(kind==='XLSX')exportRisksXLSX();}));}const action=view.querySelector('[data-page-action]');if(action)action.addEventListener('click',()=>{const p=action.dataset.pageAction;if(p==='data')$('#dataInput')?.click();else if(p==='reschedule'){setScenario('insert');document.querySelector('.manual-insert-card')?.scrollIntoView({behavior:'smooth',block:'start'});}else exportCurrentView(p);});}
function renderModule(page){const view=$('#moduleView'), dashboard=$('#dashboardContent');
  // 顶栏悬浮（sticky）只在指挥总览页生效，其他页面顶栏随内容滚动
  document.body.classList.toggle('is-dashboard', page==='dashboard');
  // 导航高亮与无障碍状态统一在此处设置，避免多个入口各自维护、状态不一致
  document.querySelectorAll('.nav-item').forEach(item=>{const on=item.dataset.page===page;item.classList.toggle('active',on);if(on)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});
  if(page==='dashboard'){
    dashboard.hidden=false;view.hidden=true;$('#assistantPanel').hidden=false;$('.topbar h1').textContent='生产指挥总览';
    // 回到总览时刷新其动态区域，避免在别的页面改了数据（如登记完工）后这里显示旧内容。
    // 注意不调用 renderPlant：重建三维场景会重置用户已经拖好的视角，代价也高。
    renderGantt();renderRisks();renderOrders();renderAssistant();renderKpi();
    requestAnimationFrame(()=>window.__plant3d?.resize?.());
    return;
  }dashboard.hidden=true;view.hidden=false;$('#assistantPanel').hidden=false;$('.topbar h1').textContent=pageMeta[page][0];view.innerHTML=({schedule:schedulePage,orders:ordersPage,risks:risksPage,reschedule:reschedulePage,archive:archivePage,analysis:analysisPage,machines:machinesPage,data:dataPage}[page])();setupModule(page);}
function init(){if(localStorage.getItem('production-dashboard-theme')==='light'){document.body.classList.add('light');$('#themeToggle').textContent='◐'}renderPlant();renderGantt();renderRisks();renderOrders();renderAssistant();renderKpi();document.body.classList.add('is-dashboard');maybeSuggestEyeCare();$('#themeToggle').addEventListener('click',toggleTheme);$('#rushInsertButton').addEventListener('click',openRushInsertForm);$('#aiAssistantButton').addEventListener('click',requestAiAdvice);$('#manualInsertButton').addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.page==='reschedule'));renderModule('reschedule');document.querySelector('.manual-insert-card')?.scrollIntoView({behavior:'smooth',block:'start'});});$('#lockTask').addEventListener('click',toggleLock);// 状态岛用事件委托绑定：renderStatusIsland() 每次 renderKpi 都会重建这批按钮，
// 逐个 addEventListener 会随刷新不断堆积失效的旧监听。委托到 document 一劳永逸。
document.addEventListener('click',event=>{
  const row=event.target.closest('[data-order]');if(row)selectOrder(row.dataset.order);
  const dot=event.target.closest('[data-island-status]');
  if(dot){goMachineStatus(dot.dataset.islandStatus);return;}
  if(event.target.closest('#islandAlert')){openUrgentAlert();return;}
});document.querySelectorAll('[data-gantt-view]').forEach(b=>b.addEventListener('click',()=>setGanttView(b.dataset.ganttView)));document.querySelectorAll('[data-gantt-process]').forEach(b=>b.addEventListener('click',()=>setGanttProcess(b.dataset.ganttProcess)));document.querySelectorAll('[data-gantt-risk]').forEach(b=>b.addEventListener('click',()=>toggleGanttRisk()));document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>renderModule(b.dataset.goto)));document.querySelectorAll('.kpi-card').forEach(card=>card.addEventListener('click',()=>focusFromKpi(card.dataset.filter)));document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));item.classList.add('active');renderModule(item.dataset.page)}));}
init();
$('#scheduleVersionSelect')?.addEventListener('change',event=>selectScheduleHistory(event.target.value));
$('#scheduleMonthSelect')?.addEventListener('change',event=>loadHistoryMonth(event.target.value).then(activateSelectedHistoryWeek).catch(error=>showToast(`月份加载失败：${error.message}`)));
$('#scheduleWeekSelect')?.addEventListener('change',event=>{selectedHistoryWeek=event.target.value;renderScheduleHistoryControls();activateSelectedHistoryWeek();});
$('#schedulePrevWeek')?.addEventListener('click',()=>moveHistoryWeek(1));
$('#scheduleNextWeek')?.addEventListener('click',()=>moveHistoryWeek(-1));

// 风险预警页由动态模板生成，使用事件委托保证每次重绘后的处置按钮都可用。
document.addEventListener('click', event => {
  const button = event.target.closest('[data-risk-command]');
  if(!button) return;
  const index = Number(button.dataset.riskIndex);
  const risk = risks[index];
  if(!risk) return;
  const command = button.dataset.riskCommand;
  if(command === 'detail'){
    activeRiskIndex = activeRiskIndex === index ? null : index;
    renderModule('risks');
  } else if(command === 'locate' && risk.machine){
    selectMachine(risk.machine);
    showToast(`已定位风险设备 ${risk.machine}`);
  } else if(command === 'order' && risk.order){
    selectOrder(risk.order);
    showToast(`已打开订单 ${risk.order} 的规则与优先级详情`);
  } else if(command === 'replan'){
    pendingRiskForReplan = risk;
    renderModule('reschedule');
    const scenario = /物料|库存/.test(`${risk.title} ${risk.text}`) ? 'material'
      : risk.level === 'change' ? 'shutdown' : 'insert';
    setScenario(scenario, true);
    const config = $('#scenarioConfig');
    if(config) config.insertAdjacentHTML('afterbegin', `<div class="risk-replan-context"><b>已带入风险：</b>${escapeHtml(risk.title)}<br><span>${escapeHtml(risk.text || '请根据现场信息补充原因后运行推演。')}</span></div>`);
    showToast(`已带入风险“${risk.title}”，请在此生成候选重排方案`);
  }
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-delete-order]');
  if(!button) return;
  event.preventDefault();
  event.stopPropagation();
  const orderId = button.dataset.deleteOrder;
  if(!window.confirm(`确认从本次排产中删除订单 ${orderId} 吗？\n对应甘特任务和风险将同步移除；原始Excel订单不会被修改。`)) return;
  if(!deleteOrderFromPlan(orderId)){showToast(`未找到订单 ${orderId}`);return;}
  renderModule('orders');
  renderGantt(); renderRisks(); renderOrders(); renderKpi();
  showToast(`已从本次排产中移除 ${orderId}；原始Excel订单未修改`);
});

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
document.addEventListener('submit',async event=>{
  if(event.target.id!=='manualInsertForm')return;
  event.preventDefault();event.stopImmediatePropagation();
  const data=new FormData(event.target),result=$('#manualInsertResult');
  const payload={orderId:String(data.get('orderId')||'').trim(),spec:String(data.get('spec')||'').trim(),
    quantity:Number(data.get('quantity')),due:String(data.get('due')||''),material:String(data.get('material')||''),
    confirmedBy:String(data.get('confirmedBy')||'').trim(),reason:String(data.get('reason')||'').trim()};
  result.hidden=false;result.innerHTML='<div class="confirm-state">正在调用确定性排产引擎生成候选方案…</div>';
  if(typeof window.requestRushOrderCandidate!=='function'){
    result.innerHTML='<div class="confirm-state danger">后端排产服务未连接，不能发布急单。</div>';return;
  }
  try{
    const candidate=await window.requestRushOrderCandidate(payload);
    const options=(candidate.options||[]);
    const recommended=candidate.recommendation?.option;
    result.innerHTML=`<b>引擎已生成急单候选：${escapeHtml(payload.orderId)}</b><span>${escapeHtml(payload.spec)} · ${escapeHtml(payload.quantity)}m · 交期 ${escapeHtml(payload.due.replace('T',' '))}</span><div class="candidate-list">${options.map(option=>{const impact=option.impact||{},available=option.applicable!==false;return `<button type="button" class="candidate-row ${option.option_id===recommended?'selected':''}" data-rush-option="${escapeHtml(option.option_id)}" ${available?'':'disabled'}><span><b>${escapeHtml(option.name)}</b><small>${available?'硬约束校验通过':'无法形成完整三工序计划'}</small></span><strong>${available?'可发布':'不可发布'}<small>${option.earliest_delivery_at?`最早 ${escapeHtml(option.earliest_delivery_at.replace('T',' '))}`:'—'}</small></strong><em>影响 ${Number(impact.moved_orders||0)} 单<br>新增超期 ${Number(impact.newly_late||0)} 单</em></button>`}).join('')}</div><div class="candidate-actions"><button type="button" class="primary-button" id="confirmCandidate">确认并发布正式排程</button><button type="button" id="rejectCandidate">保留当前计划</button></div>`;
    result.querySelectorAll('[data-rush-option]:not([disabled])').forEach(button=>button.addEventListener('click',()=>{result.querySelectorAll('[data-rush-option]').forEach(item=>item.classList.remove('selected'));button.classList.add('selected');}));
    $('#confirmCandidate').addEventListener('click',async()=>{
      const chosen=result.querySelector('[data-rush-option].selected:not([disabled])');
      if(!chosen){showToast('请选择一个可发布方案');return;}
      const button=$('#confirmCandidate');button.disabled=true;button.textContent='正在校验并发布…';
      try{
        await window.applyRushOrderCandidate(candidate.candidate_version,chosen.dataset.rushOption,payload.confirmedBy,payload.reason);
        showToast(`急单 ${payload.orderId} 已加入订单中心并更新甘特图`);
        document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.page==='orders'));
        renderModule('orders');
      }catch(error){button.disabled=false;button.textContent='确认并发布正式排程';result.insertAdjacentHTML('beforeend',`<div class="confirm-state danger">发布失败：${escapeHtml(error.message)}</div>`);}
    });
    $('#rejectCandidate').addEventListener('click',()=>{showToast('已保留当前正式计划');result.insertAdjacentHTML('beforeend','<div class="confirm-state">候选方案未发布，正式排程保持不变。</div>');});
  }catch(error){result.innerHTML=`<div class="confirm-state danger">急单试排失败：${escapeHtml(error.message)}</div>`;}
},true);

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
function renderImportResult(fileName){const card=$('#importPreviewCard');if(!card)return;card.hidden=false;const s=importedDataset.summary;$('#importVersion').textContent=importedDataset.version;$('#importSummary').innerHTML=`<div><b>${s.orders}</b><span>订单</span></div><div><b>${s.devices}</b><span>设备</span></div><div><b>${s.processes}</b><span>工艺</span></div><div><b>${s.materials}</b><span>物料</span></div>`;const checked=importedDataset;const issueItems=[...(checked.issues||[]).map(issue=>`<li>${escapeHtml(issue)}</li>`),...(checked.warnings||[]).map(warning=>`<li class="import-warning">${escapeHtml(warning)}</li>`)];$('#importIssues').innerHTML=issueItems.length?`<strong>${checked.issues?.length?'需要人工确认':'导入提示'}（${issueItems.length}）</strong><ul>${issueItems.join('')}</ul>`:'<strong class="good">校验通过：字段完整，可进入插队候选计算</strong>';const rows=Object.entries(importedDataset.sheets).flatMap(([name,values])=>values.slice(0,3).map(row=>({name,row}))).slice(0,8);$('#importRows').innerHTML=rows.length?`<div class="import-row-head"><span>来源</span><span>关键字段预览</span></div>${rows.map(({name,row})=>`<div class="import-row"><span>${escapeHtml(name)}</span><span>${Object.entries(row).slice(0,4).map(([k,v])=>`${escapeHtml(k)}: ${escapeHtml(fmtDate(v))}`).join(' · ')}</span></div>`).join('')}`:'<p class="empty-state">文件中没有可预览数据</p>';$('#fileHint').textContent=`已解析：${fileName} · ${Object.keys(importedDataset.sheets).length} 个数据表`;$('#sourceList').innerHTML=`<p><b>${escapeHtml(fileName)}</b><span class="good">${s.orders} 条订单</span></p><p><b>设备台账</b><span class="good">${s.devices||machines.length} 台设备</span></p><p><b>数据版本</b><span>${importedDataset.version}</span></p>`;}

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
  const rows=ganttRows().map(row=>({machine:`${row.name}${row.processes.length?' · '+row.processes.join('/'):''}`,bars:row.bars.map(item=>item.bar)}));
  if(!rows.length){showToast('当前没有可导出的甘特任务');return;}
  const rowH=28,padTop=48,padLeft=132,width=1100,trackW=width-padLeft-40;
  const horizon=Math.max(100,...rows.flatMap(row=>row.bars.map(b=>(Number(b.left)||0)+(Number(b.width)||1))));
  const height=padTop+rows.length*rowH+34;
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const g=c.getContext('2d');
  const light=document.body.classList.contains('light');
  g.fillStyle=light?'#f4f8fb':'#0b1a26';g.fillRect(0,0,width,height);
  g.fillStyle=light?'#08273a':'#f2f8fc';g.font='bold 16px sans-serif';
  g.fillText(`设备甘特图 · ${ganttProcessFilter==='all'?'全部工序':ganttProcessFilter} · 当前视图`,padLeft,28);
  g.font='12px sans-serif';g.fillStyle=light?'#385d71':'#a5bfce';
  g.fillText(`导出 ${new Date().toLocaleString('zh-CN')}`,padLeft,44);
  // 与状态岛 / 设备态势同一份配色（含 queued、维护、停机、停用），导出图不再自成一色
  const colors=Object.fromEntries(STATUS_META.map(s=>[s.key,s.color]));
  rows.forEach((r,i)=>{
    const y=padTop+i*rowH;
    g.fillStyle=light?'#000000':'#d0e1eb';g.font='12px sans-serif';
    g.fillText(String(r.machine).slice(0,18),8,y+18);
    g.fillStyle=light?'#dce8f0':'#12384c';g.fillRect(padLeft,y+4,trackW,rowH-12);
    r.bars.forEach(b=>{
      const left=Number(b.left)||0,wid=Number(b.width)||1;
      const x=padLeft+trackW*left/horizon;
      const w=Math.max(3,trackW*wid/horizon);
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
// 导出完整的 Markdown 分析报告（结论 + 数据表格 + 建议 + 口径），数据驱动。
function exportAnalysisReport(){
  const sorted = analysisData.utilByProcess.slice().sort((a,b)=>b.rate-a.rate);
  const bottleneck = sorted[0], excess = sorted[sorted.length-1];
  const zero = (analysisData.distribution.find(d=>d.label==='0%')||{count:0}).count;
  const low = (analysisData.distribution.find(d=>d.label==='0–20%')||{count:0}).count;
  const lowTotal = zero + low;
  const lowPct = analysisData.totalDevices ? (lowTotal/analysisData.totalDevices*100).toFixed(1) : '—';
  const changeoverDays = analysisData.changeoverHours ? (analysisData.changeoverHours/24).toFixed(0) : '0';

  const L = [];
  L.push('# 智能排产助手 · 生产数据分析报告');
  L.push('');
  L.push(`> 生成时间：${new Date().toLocaleString('zh-CN')}　｜　数据来源：${analysisData.source==='demo'?'排产引擎 v1 模拟结果（非企业真实数据）':'算法引擎'}`);
  L.push('');
  L.push('## 一、核心结论');
  L.push('');
  L.push(`1. **${bottleneck.process}是产能瓶颈**：平均利用率 ${(bottleneck.rate*100).toFixed(1)}%，为三工序最高，高负荷设备集中在该工段。`);
  L.push(`2. **${excess.process}产能过剩**：平均利用率仅 ${(excess.rate*100).toFixed(1)}%，设备大量闲置。`);
  L.push(`3. **近半设备低效**：${zero} 台完全闲置（0%）+ ${low} 台低负荷（<20%），占 ${analysisData.totalDevices} 台的 ${lowPct}%。`);
  L.push(`4. **换型损失可观**：${analysisData.changeoverCount} 次换型累计 ${analysisData.changeoverHours} 小时，约合 ${changeoverDays} 天。`);
  L.push('');
  L.push('## 二、设备利用率分析（加分方向②）');
  L.push('');
  L.push('### 各工序平均利用率');
  L.push('');
  L.push('| 工序 | 平均利用率 |');
  L.push('|---|---|');
  analysisData.utilByProcess.forEach(p=>L.push(`| ${p.process} | ${(p.rate*100).toFixed(1)}% |`));
  L.push('');
  L.push('### 利用率分布（按设备台数）');
  L.push('');
  L.push('| 区间 | 设备数 |');
  L.push('|---|---|');
  analysisData.distribution.forEach(d=>L.push(`| ${d.label} | ${d.count} |`));
  L.push('');
  L.push('### 高负荷设备 Top 8');
  L.push('');
  L.push('| 设备 | 工段 | 利用率 |');
  L.push('|---|---|---|');
  analysisData.topDevices.forEach(d=>L.push(`| ${d.code} | ${d.process} | ${(d.rate*100).toFixed(0)}% |`));
  L.push('');
  L.push('### 利用率不均的原因分类');
  L.push('');
  analysisData.reasons.forEach(r=>L.push(`- **${r.title}**：${r.evidence}。建议：${r.suggest}。`));
  L.push('');
  L.push('## 三、质量分析（加分方向①）');
  L.push('');
  L.push('| 工序 | 问题类型 | 批次 | 原因分析 | 改进措施 |');
  L.push('|---|---|---|---|---|');
  analysisData.quality.forEach(q=>L.push(`| ${q.process} | ${q.issue} | ${q.batch} | ${q.cause} | ${q.fix} |`));
  L.push('');
  L.push('## 四、口径说明');
  L.push('');
  L.push('本报告数据为排产引擎 v1 模拟结果（253 单 × 3 工序，基准日 2026-09-19），非企业真实生产数据。');
  L.push('本报告可复用为月度分析机制：每月重跑排产，用同一口径生成利用率分布、原因分类与本报告，形成趋势对比。');
  L.push('');

  downloadText(L.join('\n'), `生产数据分析报告-${stamp()}.md`, 'text/markdown;charset=utf-8');
  showToast('已导出分析报告（Markdown）');
}

function exportCurrentView(page){
  if(page==='dashboard'){exportGanttPNG();return;}
  if(page==='orders'){
    const head=['订单号','产品规格','数量','交期','状态','优先级','延期容忍'];
    const body=orders.slice(1).map(r=>{
      const id=String(r[0]);
      return [...r, priorityLabel(priorityLevel(id)), isTolerant(id)?'可延期3天':'不可延期'];
    });
    const csv=[head,...body].map(r=>r.map(csvCell).join(',')).join('\r\n');
    downloadText(csv,`订单中心-${stamp()}.csv`,'text/csv;charset=utf-8');
    showToast(`已导出订单中心 CSV（${body.length} 条，含优先级与延期容忍）`);return;
  }
  if(page==='machines'){
    const data=machines.map(m=>({设备编号:m.id,工段:m.zone,状态:m.status,当前订单:m.order,产品:m.product,材料:m.material,利用率:m.capacity,队列:m.queue,换型:m.change,风险:m.risk}));
    const head=['设备编号','工段','状态','当前订单','产品','材料','利用率','队列','换型','风险'];
    const csv=[head,...data.map(r=>head.map(h=>r[h]))].map(r=>r.map(csvCell).join(',')).join('\r\n');
    downloadText(csv,`设备态势-${stamp()}.csv`,'text/csv;charset=utf-8');
    showToast(`已导出设备态势 CSV（${data.length} 台）`);return;
  }
  if(page==='risks'){exportRisksXLSX();return;}
  if(page==='analysis'){exportAnalysisReport();return;}
  if(page==='archive'){
    const head=['订单号','规格','计划交期','完工时间','准时判定','延期'];
    const rows=archiveRecords.map(a=>[a.orderId,a.spec,a.due,a.completedLabel,a.onTime===null?'无法判定':a.onTime?'准时':'超期',formatDelay(a.delayMs)]);
    const csv=[head,...rows].map(r=>r.map(csvCell).join(',')).join('\n');
    downloadText(csv,`完工归档-${stamp()}.csv`,'text/csv;charset=utf-8');
    showToast(`已导出完工归档 CSV（${rows.length} 条）`);return;
  }
  exportScheduleCSV();
}
async function updateSchedulePreview(){
  const box=$('#schedulePreview');
  if(!box)return;
  const goal=$('#optGoal')?.value||'准时交付优先';
  const windowText=$('#optWindow')?.value||'未来 14 天';
  const objective={准时交付优先:'on_time',平衡交付与换型:'balanced',设备利用率优先:'utilization'}[goal];
  const note=$('#schedulePreviewNote');
  const state=$('#previewState');
  const button=$('#runTrial');
  if(typeof window.requestBackendSchedulePreview!=='function'){
    if(note)note.textContent='后端排产引擎未连接，无法生成按优化目标变化的正式试排。';
    return;
  }
  if(button){button.disabled=true;button.textContent='正在计算试排…';}
  if(state){state.className='warning';state.textContent='后端计算中';}
  if(note)note.textContent=`正在按“${goal} · ${windowText}”调用后端确定性算法试排，结果将替换此预览但不会覆盖已发布计划。`;
  try{
    const preview=await window.requestBackendSchedulePreview({
      objective,windowDays:windowText.includes('7')?7:14,
      onProgress:job=>{
        if(state){state.className='warning';state.textContent=`计算中 ${job.progress||0}%`;}
        if(note)note.textContent=`正在按“${goal} · ${windowText}”试排：${job.stage||'处理中'}（${job.progress||0}%）。结果不会覆盖已发布计划。`;
      }
    });
    box.innerHTML=schedulePreviewMarkup();
    if(state){state.className='good';state.textContent='试排完成';}
    if(note)note.textContent=`正式试排完成：${goal} · ${windowText}。设备策略 ${preview.algorithm?.device_policy||'—'}，ATC 参数 k=${preview.algorithm?.atc_k??'—'}；该结果仅用于对比，尚未发布。`;
    showToast(`已生成“${goal}”试排方案`);
  }catch(error){
    if(state){state.className='danger';state.textContent='试排失败';}
    if(note)note.textContent=`试排失败：${error.message||'后端未返回结果'}。当前正式计划未被修改。`;
    showToast('后端试排失败，未覆盖当前计划');
  }finally{if(button){button.disabled=false;button.textContent='生成试排方案';}}
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
// 数据分析接口：算法定型后调用，替换雏形示例数据
window.applyAnalysisData = function (d) {
  if (!d) return;
  analysisData = Object.assign({}, analysisData, d, { source: 'engine' });
  const view = $('#moduleView');
  const page = document.querySelector('.nav-item[aria-current="page"]');
  if (page && page.dataset.page === 'analysis') renderModule('analysis');
};

window.applyBackendData = function (d) {
  if (!d) return;
  backendKpiLocked = true;   // 后端口径优先，前端不再自行推算 KPI
  // 整体换数据前丢弃前端的临时锁定状态，避免与后端的正式计划交叉
  lockedMachines.clear();
  if (Array.isArray(d.machines) && d.machines.length) machines = d.machines;
  if (Array.isArray(d.tasks) && d.tasks.length) tasks = d.tasks;
  if (Array.isArray(d.risks) && d.risks.length) risks = d.risks;
  if (Array.isArray(d.orders) && d.orders.length) orders = d.orders;
  backendDecisionIndex = d.order_explanations || {};

  if (d.time_context) {
    const context = d.time_context;
    const timeNode = document.querySelector('#scheduleTimeContext');
    if (timeNode) {
      const now = String(context.platform_now || '').replace('T', ' ').replace('+08:00', '');
      const baseline = String(context.schedule_baseline || '').replace('T', ' ');
      timeNode.textContent = `北京时间 ${now || '—'}`;
      timeNode.title = `当前甘特图展示北京时间起未来 ${context.default_view_days || 14} 天；排产计算从 ${baseline || '—'} 开始。`;
    }
  }

  if (d.kpi) {
    const k = d.kpi;
    // 首页交付 KPI 采用完整有效订单的预测口径，不能误读首个 14 天无到期单的 0% 空窗口。
    const forecast = k.future_order_summary || (k.kpi_scope && k.kpi_scope.future) || k;
    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    if (forecast.strict_on_time_rate != null) setText('#onTimeRate', (forecast.strict_on_time_rate * 100).toFixed(1) + '%');
    if (forecast.strict_on_time_rate != null) {
      const em = document.querySelector('.kpi-card[data-filter="all"] em');
      if (em) { em.className = 'info'; em.textContent = '预测 ' + (forecast.denominator || 0) + ' 单 · 严格交期'; }
    }
    if (k.utilization != null) setText('#utilRate', (k.utilization * 100).toFixed(1) + '%');
    if (k.device_total != null) setText('#deviceTotal', k.device_total + ' 台设备');
    if (k.congested != null) setText('#congestedCount', k.congested);
    if (k.risk_orders != null) setText('#riskCount', k.risk_orders);
  }

  if (d.gantt && Array.isArray(d.gantt.labels)) {
    const head = document.querySelector('.gantt-header');
    const intervals=Math.max(7, Number(d.gantt.days)||d.gantt.labels.length);
    const canvas=document.querySelector('#ganttCanvas');
    if(canvas)canvas.style.setProperty('--gantt-days',intervals);
    if (head) head.innerHTML = '<span>设备 / 工序</span>' + Array.from({length:intervals},(_,i)=>`<span>${i%2===0?escapeHtml(d.gantt.labels[Math.floor(i/2)]||''):''}</span>`).join('');
  }

  selected = machines.find(m => m.id === selected?.id) || machines[0];
  renderPlant(); renderGantt(); renderRisks(); renderOrders(); renderAssistant();
  // 状态岛必须在这里显式刷新：上面刚把 machines 整体换掉，而 renderKpi() 一进来
  // 就被 backendKpiLocked 短路，永远不会走到 KPI 赋值那几行 —— 不补这一句，
  // 状态岛会一直挂着接入后端之前的演示分布（实测：岛上写「待排 17」，
  // 点进去实际筛出 43 台，两处口径打架）。
  // 先把紧急条目基线清空：否则「演示数据 → 后端数据」这次整体换源，
  // 会被下面的新增判定当成「产线新增紧急信息 8 条」弹一次提示 —— 换源不是新增。
  islandUrgentKey = null;
  renderStatusIsland();

  const dot = document.querySelector('.live-dot');
  const foot = document.querySelector('.sidebar-foot');
  const eng = d.engines || {};
  if (dot) dot.textContent = '已接入后端';
  if (foot) foot.innerHTML = '设备 ' + ((d.kpi && d.kpi.device_total) || machines.length) + ' 台 · 排程 ' + (eng.tasks || 0) + ' 条';
};
