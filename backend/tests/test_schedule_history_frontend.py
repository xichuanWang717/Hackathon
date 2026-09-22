import json
import subprocess
from pathlib import Path


FRONTEND = Path(__file__).resolve().parents[2] / 'frontend'


def run_bridge(prelude, assertions):
    harness = f"""
const fs = require('fs');
const vm = require('vm');
global.window = {{}};
global.sessionStorage = {{getItem:()=>null,setItem:()=>{{}},removeItem:()=>{{}}}};
global.document = {{readyState:'loading', addEventListener:()=>{{}}, querySelector:()=>null}};
global.setInterval = ()=>0;
global.setTimeout = (fn)=>fn();
{prelude}
vm.runInThisContext(fs.readFileSync({json.dumps(str(FRONTEND / 'backend-bridge.js'))}, 'utf8'));
{assertions}
"""
    return subprocess.run(['node', '-e', harness], capture_output=True, text=True,
                          encoding='utf-8', errors='replace', check=False)


def test_history_bridge_loads_list_and_specific_version():
    result = run_bridge("""
const calls=[];
global.fetch=(url)=>{calls.push(url);return Promise.resolve({ok:true,json:()=>Promise.resolve(url.endsWith('/history')?{versions:[{schedule_version:'SCH-1'}]}:{schedule_version:'SCH-1',dashboard:{kpi:{}}})})};
global.__calls=calls;
""", """
Promise.all([window.loadScheduleHistory(),window.loadScheduleHistoryVersion('SCH-1')]).then(values=>{
  if(values[0].versions[0].schedule_version!=='SCH-1')process.exit(2);
  if(values[1].schedule_version!=='SCH-1')process.exit(3);
  if(!__calls.includes('/api/schedule/history/SCH-1'))process.exit(4);
}).catch(()=>process.exit(5));
""")
    assert result.returncode == 0, result.stderr + result.stdout


def test_history_bridge_loads_only_selected_month():
    result = run_bridge("""
let called='';
global.fetch=(url)=>{called=url;return Promise.resolve({ok:true,json:()=>Promise.resolve({versions:[]})})};
""", """
window.loadScheduleHistory('2026-09').then(()=>{
  if(called!=='/api/schedule/history?month=2026-09')process.exit(11);
}).catch(()=>process.exit(12));
""")
    assert result.returncode == 0, result.stderr + result.stdout


def test_latest_history_selection_wins_and_current_can_be_restored():
    result = run_bridge("""
let resolves={}; let applied=[];
global.fetch=(url)=>new Promise(resolve=>{resolves[url]=data=>resolve({ok:true,json:()=>Promise.resolve(data)})});
window.applyBackendData=data=>applied.push(data.marker);
""", """
window.rememberCurrentSchedule({marker:'current',kpi:{}});
const old=window.selectScheduleVersion('OLD');
const latest=window.selectScheduleVersion('LATEST');
resolves['/api/schedule/history/LATEST']({schedule_version:'LATEST',dashboard:{marker:'latest',kpi:{}}});
resolves['/api/schedule/history/OLD']({schedule_version:'OLD',dashboard:{marker:'old',kpi:{}}});
Promise.all([old,latest]).then(()=>window.selectScheduleVersion('current')).then(()=>{
  if(applied.join(',')!=='latest,current')process.exit(6);
}).catch(()=>process.exit(7));
""")
    assert result.returncode == 0, result.stderr + result.stdout


def test_background_dashboard_refresh_does_not_replace_visible_history():
    result = run_bridge("""
let applied=[];
global.fetch=(url)=>Promise.resolve({ok:true,json:()=>Promise.resolve({schedule_version:'SCH-1',dashboard:{marker:'history',kpi:{}}})});
window.applyBackendData=data=>applied.push(data.marker);
""", """
window.rememberCurrentSchedule({marker:'current',kpi:{}});
window.selectScheduleVersion('SCH-1').then(()=>{
  window.receiveCurrentSchedule({marker:'refreshed',kpi:{}});
  if(applied.join(',')!=='history')process.exit(8);
  return window.selectScheduleVersion('current');
}).then(()=>{
  if(applied.join(',')!=='history,refreshed')process.exit(9);
}).catch(()=>process.exit(10));
""")
    assert result.returncode == 0, result.stderr + result.stdout
