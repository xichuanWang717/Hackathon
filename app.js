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
const machines = Object.entries(deviceIds).flatMap(([zone, ids]) => ids.map((id, index) => specialById[id] || makeMachine(id, zone, index)));
const tasks = [
  {machine:'8107 拉丝',label:'JW-071',left:4,width:36,status:'normal'}, {machine:'8115 拉丝',label:'待排',left:46,width:18,status:'change'}, {machine:'8124 拉丝',label:'JW-083 · 换型',left:18,width:41,status:'change'},
  {machine:'8204 捻股',label:'JW-102',left:8,width:40,status:'normal'}, {machine:'8218 捻股',label:'JW-106 · 拥堵',left:37,width:51,status:'risk'}, {machine:'8231 捻股',label:'JW-112',left:57,width:25,status:'normal'},
  {machine:'8304 合绳',label:'JW-106 · 临期',left:13,width:66,status:'risk'}, {machine:'8307 合绳',label:'JW-111',left:48,width:30,status:'normal'}, {machine:'8312 合绳',label:'换型中',left:5,width:27,status:'change'}
];
const risks = [
  {level:'risk', title:'8304 合绳机队列拥堵', text:'JW-106 可能延迟 6 小时，影响后续 2 张订单', time:'刚刚', machine:'8304'},
  {level:'change', title:'8124 拉丝机正在换型', text:'规格切换剩余 42 分钟，建议暂缓插入同类急单', time:'20:16', machine:'8124'},
  {level:'risk', title:'JW-260918-126 物料临期', text:'WSC 绳芯库存仅够 1.5 小时生产', time:'19:54', machine:'8304'}
];
const orders = [
  ['订单号','产品规格','数量','交期','状态'],['JW-260918-106','30mm GT34Z','1,600m','09/19 08:00','临期'],['JW-260918-111','22mm GT8ZH','2,000m','09/19 12:00','正常'],['JW-260918-118','12mm GT6Z','1,000m','09/19 16:00','换型中'],['JW-260918-126','28mm GT8PZ','2,000m','09/20 08:00','缺料风险']
];
let selected = machines.find(m => m.id === '8304');
let inserted = false;
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
  const applyStatusFilter = (next) => { statusFilter = next; filterMenu.querySelectorAll('[data-status-filter]').forEach(button=>button.classList.toggle('selected',button.dataset.statusFilter===statusFilter)); if(is2D) render2D(); visuals.forEach(({mesh,cap,machine})=>{const visible=statusFilter==='all'||machine.status===statusFilter;mesh.visible=visible;cap.visible=visible;}); };
  filterToggle.addEventListener('click',()=>{filterMenu.hidden=!filterMenu.hidden;});
  filterMenu.querySelectorAll('[data-status-filter]').forEach(button=>button.addEventListener('click',()=>{applyStatusFilter(button.dataset.statusFilter);filterMenu.hidden=true;}));
  openMachines.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.page==='machines'));renderModule('machines');});
  let is2D = false;
  const setView = (mode) => { is2D = mode === '2d'; target.classList.toggle('plant-map-2d', is2D); twoD.hidden = !is2D; canvas.hidden = is2D; floorLabels.hidden = is2D; legend.hidden = is2D; hint.hidden = is2D; toggle.textContent = is2D ? '切换三维' : '切换二维'; if(is2D) render2D(); };
  toggle.addEventListener('click',()=>setView(is2D ? '3d' : '2d'));
  if (!window.THREE) { canvas.hidden=true; floorLabels.hidden=true; legend.hidden=true; hint.hidden=true; shell.insertAdjacentHTML('beforeend','<div class="factory-3d-fallback"><b>三维视图暂时不可用</b><span>当前可先使用二维设备矩阵；联网后刷新可恢复三维。</span></div>'); return; }
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
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
  const resize=()=>{const w=shell.clientWidth,h=shell.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}; resize(); window.addEventListener('resize',resize);
  const showInfo=(machine)=>{const info=target.querySelector('.factory-3d-info');info.hidden=false;info.innerHTML=`<button class="factory-3d-close" aria-label="关闭设备详情">×</button><p class="eyebrow">设备详情 · ${statusText[machine.status]}</p><h3>${machine.id} · ${machine.zone}工段</h3><dl><dt>当前订单</dt><dd>${machine.order}</dd><dt>产能利用率</dt><dd>${machine.capacity}</dd><dt>等待队列</dt><dd>${machine.queue} 项</dd><dt>材料</dt><dd>${machine.material}</dd><dt>换型时间</dt><dd>${machine.change}</dd><dt>风险</dt><dd>${machine.risk}</dd></dl>`;info.querySelector('button').addEventListener('click',()=>{info.hidden=true;});selectMachine(machine.id);};
  const pointFromEvent=(event)=>{const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(interactive)[0];};
  canvas.addEventListener('pointerdown',event=>{dragging=true;moved=false;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!dragging)return; const dx=event.clientX-lastX,dy=event.clientY-lastY; if(Math.abs(dx)+Math.abs(dy)>2)moved=true; yaw-=dx*.008;pitch=Math.max(.22,Math.min(1.05,pitch+dy*.006));lastX=event.clientX;lastY=event.clientY;updateCamera();});
  canvas.addEventListener('pointerup',event=>{if(!moved){const hit=pointFromEvent(event);if(hit)showInfo(hit.object.userData.machine);}dragging=false;canvas.releasePointerCapture(event.pointerId);});
  canvas.addEventListener('wheel',event=>{event.preventDefault();distance=Math.max(11,Math.min(24,distance+event.deltaY*.012));updateCamera();},{passive:false});
  const tick=()=>{renderer.render(scene,camera);requestAnimationFrame(tick);};tick();
}
function renderGantt(){
  $('#ganttRows').innerHTML = tasks.map(task => `<div class="gantt-row"><label>${task.machine}</label><div class="timeline"><button data-task="${task.machine.slice(0,4)}" class="task ${task.status}" style="left:${task.left}%;width:${task.width}%">${task.label}</button></div></div>`).join('');
  document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click',()=>selectMachine(button.dataset.task)));
}
function renderRisks(){
  $('#riskList').innerHTML = risks.map(r => `<div class="risk-item" data-risk-machine="${r.machine}"><i class="risk-badge ${r.level}"></i><div><b>${r.title}</b><p>${r.text}</p></div><time>${r.time}</time></div>`).join('');
  document.querySelectorAll('[data-risk-machine]').forEach(item=>item.addEventListener('click',()=>selectMachine(item.dataset.riskMachine)));
}
function renderOrders(){ $('#ordersTable').innerHTML = orders.map((row,i)=>`<div class="order-row">${row.map((cell,j)=>`<span class="${i&&j===4?(cell==='临期'||cell==='缺料风险'?'at-risk':cell==='换型中'?'hot':''):''}">${cell}</span>`).join('')}</div>`).join(''); }
function renderAssistant(){
  const riskText = selected.risk === '无' ? '当前无硬性冲突；保持现有顺序可减少换型。' : selected.risk;
  $('#assistantContent').innerHTML = `
    <section><h3>当前选中</h3><p><b>${selected.id} · ${selected.zone}工段</b><br>${selected.status==='risk'?'风险处理优先':selected.status==='change'?'规格切换中':'按计划运行'} · 利用率 ${selected.capacity}</p></section>
    <section><h3>约束依据</h3><span class="constraint">设备适配</span><span class="constraint">交期优先</span>${selected.status==='change'?'<span class="constraint">换型成本</span>':''}<p>${selected.order==='待排'?'该设备当前空闲，可作为插单的备选产能。':`订单 ${selected.order} 安排在此设备：当前加工 ${selected.product}，可避免额外设备切换。`}</p></section>
    <section><h3>影响评估</h3><p>材料：${selected.material}<br>等待队列：${selected.queue} 项 · 下次换型：${selected.change}<br>${riskText}</p></section>
    <section><h3>建议动作</h3><ul><li>查看同工段可用设备</li><li>${selected.status==='risk'?'将非紧急订单移至 8307 后重新评估':'锁定当前任务，保持排程稳定'}</li><li>进入插单推演对比交期影响</li></ul></section>`;
}
function selectMachine(id){ const next = machines.find(m=>m.id===id); if(!next) return; selected=next; renderAssistant(); document.querySelectorAll('.machine').forEach(e=>e.classList.toggle('selected-machine',e.dataset.machine===id)); showToast(`已定位 ${id}：${next.zone}工段 · ${next.order}`); }
function showToast(message){ const t=$('#toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200); }
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
  } catch(error) { showToast(error.name==='AbortError'?'AI 分析超时，请检查后端或稍后重试':`AI 接口未连接：${error.message}`); }
  finally { clearTimeout(timeout); button.disabled=false; button.textContent='AI排产顾问'; }
}
function simulateInsert(){
  if(inserted){showToast('紧急插单方案已在推演中');return;}
  inserted=true; const riskMachine=machines.find(m=>m.id==='8304');riskMachine.capacity='100%';riskMachine.queue=7;riskMachine.risk='急单插入后，JW-106 预计顺延 2.5 小时';tasks.push({machine:'8307 合绳',label:'急单 JW-999',left:11,width:28,status:'risk'});risks.unshift({level:'risk',title:'紧急插单 JW-999 已加入推演',text:'8307 接单可守住急单交期；JW-106 将顺延 2.5 小时',time:'现在',machine:'8307'});$('#riskCount').textContent='8';$('#congestedCount').textContent='4';renderGantt();renderRisks();selectMachine('8307');showToast('已生成插单影响方案：请在右侧确认处理动作');
}
function toggleTheme(){document.body.classList.toggle('light');const isLight=document.body.classList.contains('light');localStorage.setItem('production-dashboard-theme',isLight?'light':'dark');$('#themeToggle').textContent=isLight?'◐':'☼';showToast(isLight?'已切换浅色阅读主题':'已切换深色护眼主题');}
const pageMeta = {schedule:['智能排产','设定排产目标、锁定任务并生成可执行计划'],orders:['订单中心','查看订单交期、优先级与工艺匹配状态'],risks:['风险预警','聚焦影响交期与产能承诺的异常'],reschedule:['重排推演','比较插单、停机与物料延迟下的候选方案'],machines:['设备态势','查看 109 台真实设备编号的任务与负荷'],data:['数据管理','导入业务数据并导出排产成果']};
function pageFrame(page, body){const [title,sub]=pageMeta[page];return `<div class="module-header"><div><p class="eyebrow">${sub}</p><h2>${title}</h2></div><button class="primary-button">${page==='data'?'导入 Excel':page==='reschedule'?'新建推演':'导出当前视图'}</button></div>${body}`;}
function schedulePage(){return pageFrame('schedule',`<div class="module-grid"><section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">优化偏好</p><h2>排产参数</h2></div></div><div class="form-list"><label>优化目标 <select><option>准时交付优先</option><option>平衡交付与换型</option><option>设备利用率优先</option></select></label><label>排产窗口 <select><option>未来 7 天</option><option>未来 14 天</option></select></label><label>已锁定任务 <b>12 项</b></label><button class="primary-button" onclick="document.getElementById('simulateButton').click()">生成试排方案</button></div></section><section class="panel module-card span-2"><div class="panel-heading"><div><p class="eyebrow">候选方案 A · 2026-09-18 夜班</p><h2>设备排程预览</h2></div><span class="good">可执行</span></div><div class="schedule-gantt" aria-label="候选方案 A 的设备排程甘特图"><div class="schedule-gantt-head"><b>设备 / 工序</b><span>20:00</span><span>22:00</span><span>00:00</span><span>02:00</span><span>04:00</span><span>06:00</span><span>08:00</span></div><div class="schedule-gantt-row"><b>8107 · 拉丝</b><div class="schedule-track"><span class="plan-task running" style="left:4%;width:43%">JW-071</span><span class="plan-task setup" style="left:48%;width:13%">换型</span></div></div><div class="schedule-gantt-row"><b>8204 · 捻股</b><div class="schedule-track"><span class="plan-task running" style="left:8%;width:37%">JW-102</span><span class="plan-task risk" style="left:47%;width:28%">JW-106</span></div></div><div class="schedule-gantt-row"><b>8307 · 合绳</b><div class="schedule-track"><span class="plan-task running" style="left:18%;width:49%">JW-111</span><span class="plan-task setup" style="left:70%;width:11%">换型</span></div></div></div><div class="chart-legend"><span><i class="running"></i>生产任务</span><span><i class="setup"></i>换型</span><span><i class="risk"></i>风险待确认</span></div><p class="module-note">模拟数据：预计准时交付率 92.4%；8218 捻股设备存在拥堵风险，需计划员确认是否分流。</p></section></div>`)}
const orderRows = (items=orders.slice(1)) => items.map((r,i)=>`<div class="order-data" data-order="${r[0]}"><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span><span>${r[3]}</span><span class="${i===0?'danger':''}">${i===0?'紧急':'常规'}</span><span class="good">已匹配</span></div>`).join('') || '<p class="empty-state">没有找到匹配订单</p>';
function ordersPage(){return pageFrame('orders',`<section class="panel module-card"><div class="filter-row"><input id="orderSearch" placeholder="搜索订单号、规格或客户" /><button id="orderRiskFilter">仅看风险</button><button id="orderSort">交期升序 ▾</button><button id="newOrder" class="primary-button">新增订单</button></div><div class="data-table"><div class="data-head"><span>订单号</span><span>规格</span><span>数量</span><span>预发货日</span><span>优先级</span><span>工艺匹配</span></div><div id="orderTableBody">${orderRows()}</div></div></section>`)}
function risksPage(){return pageFrame('risks',`<div class="risk-summary"><div><b>2</b><span>硬风险</span></div><div><b>5</b><span>预警</span></div><div><b>3</b><span>换型影响</span></div><div><b>1</b><span>物料临期</span></div></div><section class="panel module-card"><div class="panel-heading"><div><p class="eyebrow">按影响程度排序</p><h2>待处置风险</h2></div></div><div class="risk-action-list">${risks.map((r,i)=>`<button data-risk-machine="${r.machine}" class="risk-action"><i class="${r.level}"></i><div><b>${r.title}</b><p>${r.text}</p></div><span>${i===0?'立即处理':'查看方案'} →</span></button>`).join('')}</div></section>`)}
function reschedulePage(){return pageFrame('reschedule',`<div class="scenario-grid"><section class="panel module-card scenario selected" data-scenario="insert"><p class="eyebrow">场景 01</p><h2>紧急插单</h2><p>新订单要求在 24 小时内交付。</p><b class="danger">影响 2 张订单</b><button class="primary-button">运行推演</button></section><section class="panel module-card scenario" data-scenario="shutdown"><p class="eyebrow">场景 02</p><h2>设备停机</h2><p>选择设备和预计停机时段，计算替代机台。</p><b class="warning">待选择设备</b><button>配置场景</button></section><section class="panel module-card scenario" data-scenario="material"><p class="eyebrow">场景 03</p><h2>物料延迟</h2><p>评估原材料未到货对下游工序的传播。</p><b class="info">待录入物料</b><button>配置场景</button></section></div><section class="panel module-card manual-insert-card"><div class="panel-heading"><div><p class="eyebrow">人工输入 · 模拟预览</p><h2>自定义插单模板</h2></div><span class="module-note">填写后先生成影响预览，不直接改正式排程</span></div><div class="manual-insert-grid"><form id="manualInsertForm" class="manual-insert-form"><label>订单号<input name="orderId" required placeholder="例如 JW-260918-999"></label><label>产品规格<input name="spec" required placeholder="例如 30mm GT34Z"></label><label>数量<input name="quantity" type="number" min="1" required placeholder="米 / 吨"></label><label>要求交期<input name="due" type="datetime-local" required></label><label>物料<input name="material" required placeholder="例如 WSC 绳芯"></label><label>优先级<select name="priority"><option>紧急</option><option>高</option><option>常规</option></select></label><label>首选工段<select name="zone"><option>拉丝</option><option>捻股</option><option>合绳</option><option>不限</option></select></label><label>备注<textarea name="note" rows="2" placeholder="可填写客户、特殊工艺或不可切换设备"></textarea></label><button class="primary-button" type="submit">生成插单预览</button></form><aside class="manual-insert-guide"><h3>填写指导</h3><ol><li>订单号保持唯一，方便后续追踪。</li><li>数量和交期用于判断是否会挤压现有订单。</li><li>物料、首选工段会参与设备适配和换型评估。</li><li>不确定的字段可先填“待确认”，再让计划员补齐。</li></ol><div class="manual-template-example"><b>示例</b><code>JW-260918-999｜30mm GT34Z｜1600m｜09/19 08:00｜WSC 绳芯｜紧急</code></div></aside></div><div id="manualInsertResult" class="manual-insert-result" hidden></div></section><section class="panel module-card compare" id="scenarioCompare"><div><b>方案对比</b><span>当前计划</span><span>交期优先</span><span>低扰动</span></div><div><b>准时交付率</b><span>92.4%</span><span class="good">93.1%</span><span>91.8%</span></div><div><b>受影响订单</b><span>7</span><span>4</span><span class="good">3</span></div></section>`)}
const machineRows = (items=machines) => items.map(m=>`<button class="machine-record" data-machine="${m.id}"><i class="${m.status}"></i><b>${m.id}</b><span>${m.zone}</span><span>${m.order}</span><span>利用率 ${m.capacity}</span><em>${m.status==='normal'?'生产中':m.status==='idle'?'待排':m.status==='change'?'换型中':'风险'}</em></button>`).join('') || '<p class="empty-state">没有符合条件的设备</p>';
function machinesPage(){return pageFrame('machines',`<section class="panel module-card"><div class="filter-row"><input id="machineSearch" placeholder="输入设备编号，例如 8304" /><select id="zoneFilter"><option value="all">全部工段</option><option>拉丝</option><option>捻股</option><option>合绳</option></select><select id="statusFilter"><option value="all">全部状态</option><option value="normal">生产中</option><option value="idle">待排</option><option value="change">换型中</option><option value="risk">风险</option></select></div><div id="machineTable" class="machine-list">${machineRows()}</div></section>`)}
function dataPage(){return pageFrame('data',`<div class="module-grid"><section class="panel module-card upload-card"><p class="eyebrow">导入数据</p><h2>订单与工艺文件</h2><div class="drop-zone">⇅<b>拖入 Excel 文件</b><span id="fileHint">支持订单、设备、工艺、物料数据</span><input id="dataInput" type="file" accept=".xlsx,.xls,.csv" hidden><button id="chooseFile">选择文件</button></div></section><section class="panel module-card"><p class="eyebrow">当前数据源</p><h2>数据状态</h2><div class="source-list"><p><b>订单信息.xlsx</b><span class="good">323 条订单</span></p><p><b>产品额定（平均值）.xlsx</b><span class="good">109 台设备</span></p><p><b>典型质量案例.xlsx</b><span class="warning">5 条案例</span></p></div></section><section class="panel module-card"><p class="eyebrow">导出成果</p><h2>计划包</h2><div class="source-list"><p><b>排产计划表</b><button data-export="CSV">导出 CSV</button></p><p><b>设备甘特图</b><button data-export="PNG">导出 PNG</button></p><p><b>风险处置清单</b><button data-export="XLSX">导出 XLSX</button></p></div></section></div>`)}
function applyOrderFilter(){const query=$('#orderSearch').value.trim().toLowerCase();const onlyRisk=$('#orderRiskFilter').classList.contains('selected');let visible=orders.slice(1).filter(row=>row.join(' ').toLowerCase().includes(query));if(onlyRisk)visible=visible.filter((_,index)=>index===0||index===3);$('#orderTableBody').innerHTML=orderRows(visible);}
function applyMachineFilter(){const query=$('#machineSearch').value.trim();const zone=$('#zoneFilter').value;const status=$('#statusFilter').value;const visible=machines.filter(m=>(!query||m.id.includes(query))&&(zone==='all'||m.zone===zone)&&(status==='all'||m.status===status));$('#machineTable').innerHTML=machineRows(visible);$('#machineTable').querySelectorAll('[data-machine]').forEach(btn=>btn.addEventListener('click',()=>selectMachine(btn.dataset.machine)));}
function setScenario(kind){const content={insert:['紧急插单','新急单安排至 8307 可保证交期，JW-106 将顺延 2.5 小时。','93.1%','4'],shutdown:['设备停机','建议将 8218 的后续队列分流至 8204 与 8231，并锁定已开工任务。','91.6%','6'],material:['物料延迟','WSC 绳芯延迟会影响 8304；建议提前分配现有库存至重点客户订单。','90.8%','5']}[kind];document.querySelectorAll('.scenario').forEach(card=>card.classList.toggle('selected',card.dataset.scenario===kind));$('#scenarioCompare').innerHTML=`<div><b>${content[0]}方案对比</b><span>当前计划</span><span>推荐方案</span><span>低扰动</span></div><div><b>准时交付率</b><span>92.4%</span><span class="good">${content[2]}</span><span>91.8%</span></div><div><b>受影响订单</b><span>7</span><span>${content[3]}</span><span class="good">3</span></div><p class="module-note">${content[1]}</p>`;showToast(`已切换至“${content[0]}”推演方案`);}
function setupModule(page){const view=$('#moduleView');view.querySelectorAll('[data-machine]').forEach(btn=>btn.addEventListener('click',()=>{selectMachine(btn.dataset.machine);showToast(`已选中设备 ${btn.dataset.machine}`)}));view.querySelectorAll('[data-risk-machine]').forEach(btn=>btn.addEventListener('click',()=>{selectMachine(btn.dataset.riskMachine);renderModule('dashboard')}));if(page==='orders'){const search=$('#orderSearch');search.addEventListener('input',applyOrderFilter);$('#orderRiskFilter').addEventListener('click',event=>{event.currentTarget.classList.toggle('selected');applyOrderFilter()});$('#orderSort').addEventListener('click',()=>showToast('订单已按预发货日升序排列'));$('#newOrder').addEventListener('click',()=>showToast('新增订单表单将在接入后端后启用'));}if(page==='machines'){['machineSearch','zoneFilter','statusFilter'].forEach(id=>$('#'+id).addEventListener(id==='machineSearch'?'input':'change',applyMachineFilter));}if(page==='reschedule'){view.querySelectorAll('.scenario').forEach(card=>card.addEventListener('click',()=>setScenario(card.dataset.scenario)));const form=$('#manualInsertForm');form.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(form),orderId=data.get('orderId'),spec=data.get('spec'),quantity=data.get('quantity'),due=data.get('due'),material=data.get('material'),priority=data.get('priority'),zone=data.get('zone');const result=$('#manualInsertResult');result.hidden=false;result.innerHTML=`<b>已生成人工插单预览：${orderId}</b><span>${spec} · ${quantity} · ${due.replace('T',' ')} · ${material}</span><span>优先级：${priority} · 首选工段：${zone}</span><small>下一步：进入“运行推演”比较对现有订单交期和换型窗口的影响。</small>`;showToast('人工插单模板已生成预览');});}if(page==='schedule'){view.querySelector('.primary-button').addEventListener('click',()=>{simulateInsert();showToast('已按当前偏好生成新的试排方案')});}if(page==='data'){const input=$('#dataInput');$('#chooseFile').addEventListener('click',()=>input.click());input.addEventListener('change',()=>{const file=input.files[0];if(file){$('#fileHint').textContent=`已选择：${file.name}（${Math.ceil(file.size/1024)} KB），等待解析`;showToast('文件已选择；当前为前端演示模式') }});view.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>showToast(`已生成 ${button.dataset.export} 导出任务（演示模式）`)));}}
function renderModule(page){const view=$('#moduleView'), dashboard=$('#dashboardContent');if(page==='dashboard'){dashboard.hidden=false;view.hidden=true;$('#assistantPanel').hidden=false;$('.topbar h1').textContent='生产指挥总览';return;}dashboard.hidden=true;view.hidden=false;$('#assistantPanel').hidden=page==='data';$('.topbar h1').textContent=pageMeta[page][0];view.innerHTML=({schedule:schedulePage,orders:ordersPage,risks:risksPage,reschedule:reschedulePage,machines:machinesPage,data:dataPage}[page])();setupModule(page);}
function init(){if(localStorage.getItem('production-dashboard-theme')==='light'){document.body.classList.add('light');$('#themeToggle').textContent='◐'}renderPlant();renderGantt();renderRisks();renderOrders();renderAssistant();$('#themeToggle').addEventListener('click',toggleTheme);$('#simulateButton').addEventListener('click',simulateInsert);$('#aiAssistantButton').addEventListener('click',requestAiAdvice);$('#manualInsertButton').addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.page==='reschedule'));renderModule('reschedule');document.querySelector('.manual-insert-card')?.scrollIntoView({behavior:'smooth',block:'start'});});$('#lockTask').addEventListener('click',()=>showToast(`已锁定 ${selected.id} 当前安排，后续重排将保留该任务`));document.querySelectorAll('.kpi-card').forEach(card=>card.addEventListener('click',()=>{if(card.dataset.filter==='risk') selectMachine('8304');if(card.dataset.filter==='congested') selectMachine('8218');else showToast('已应用指标筛选（演示状态）')}));document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));item.classList.add('active');renderModule(item.dataset.page)}));}
init();
