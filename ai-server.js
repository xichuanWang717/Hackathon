const http = require('http');
const {spawn} = require('child_process');

const port = Number(process.env.AI_PORT || 3000);
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
const apiKey = process.env.DEEPSEEK_API_KEY;

const callDeepSeek = (payload) => new Promise((resolve, reject) => {
  const curl = spawn('curl.exe', ['-sS','-X','POST','https://api.deepseek.com/chat/completions','-H','Content-Type: application/json','-H',`Authorization: Bearer ${apiKey}`,'--data-binary','@-']);
  let output = '', error = '';
  curl.stdout.on('data', chunk => { output += chunk; });
  curl.stderr.on('data', chunk => { error += chunk; });
  curl.on('error', reject);
  curl.on('close', code => { if (code !== 0) reject(new Error(error || `curl exited ${code}`)); else { try { resolve(JSON.parse(output)); } catch { reject(new Error('DeepSeek 返回了无效 JSON')); } } });
  curl.stdin.end(JSON.stringify(payload));
});

const send = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST' || req.url !== '/api/ai/schedule') return send(res, 404, {error:'Not Found'});
  if (!apiKey) return send(res, 503, {error:'DEEPSEEK_API_KEY 未配置，请先设置环境变量。'});
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
  req.on('end', async () => {
    try {
      const input = JSON.parse(body || '{}');
      const data = await callDeepSeek({model,messages:[{role:'system',content:'你是工厂排产顾问。只能依据订单、设备、物料和交期约束给出可解释的排产建议；不要虚构不存在的数据。请用中文回答，并严格输出合法 JSON，包含 recommendation、risks、actions 字段。'},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'}});
      if (data.error) return send(res, 502, {error:data.error.message || 'DeepSeek 请求失败', upstream:data});
      const content = data.choices?.[0]?.message?.content || '{}';
      let answer;
      try { answer = JSON.parse(content); } catch { answer = {text: content}; }
      return send(res, 200, {model:data.model || model, answer});
    } catch (error) {
      return send(res, 500, {error:error.message || '服务端处理失败'});
    }
  });
});

server.listen(port, () => console.log(`AI 排产代理已启动：http://localhost:${port}/api/ai/schedule`));
