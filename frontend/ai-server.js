// 智能排产指挥台 · 一体化服务（静态网页 + DeepSeek AI 代理）
// ------------------------------------------------------------------
// 用途：一个 node 服务同时提供「网页」和「AI 接口」，解决「别人用不了」的问题。
//   启动后，本机访问 http://localhost:3000/ 即可用完整网页 + AI 排产顾问；
//   部署到服务器后，别人访问 http://<服务器地址>:3000/ 也能用（AI 请求走相对路径，同源）。
//
// 启动：
//   Windows PowerShell:
//     $env:DEEPSEEK_API_KEY="你的Key"; node ai-server.js
//   服务器（Linux/Mac）:
//     DEEPSEEK_API_KEY="你的Key" node ai-server.js
//
// 安全：API Key 只存在服务端环境变量，不写进前端文件、不下发给浏览器。
// ------------------------------------------------------------------
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const port = Number(process.env.AI_PORT || 3000);
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
const apiKey = process.env.DEEPSEEK_API_KEY;

// 静态文件根目录 = 本文件所在目录（网页三件套都在这里）
const STATIC_DIR = __dirname;

// 跨平台 curl：Windows 是 curl.exe，Linux/Mac 是 curl
const CURL = process.platform === 'win32' ? 'curl.exe' : 'curl';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const callDeepSeek = (payload) => new Promise((resolve, reject) => {
  const curl = spawn(CURL, [
    '-sS', '-X', 'POST', 'https://api.deepseek.com/chat/completions',
    '-H', 'Content-Type: application/json',
    '-H', `Authorization: Bearer ${apiKey}`,
    '--data-binary', '@-'
  ]);
  let output = '', error = '';
  curl.stdout.on('data', chunk => { output += chunk; });
  curl.stderr.on('data', chunk => { error += chunk; });
  curl.on('error', reject);
  curl.on('close', code => {
    if (code !== 0) return reject(new Error(error || `curl exited ${code}`));
    try { resolve(JSON.parse(output)); }
    catch { reject(new Error('DeepSeek 返回了无效 JSON')); }
  });
  curl.stdin.end(JSON.stringify(payload));
});

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
};

const sendFile = (res, filePath) => {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
};

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // ---------- 1) AI 接口 ----------
  if (urlPath === '/api/ai/schedule') {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    if (req.method !== 'POST') return sendJson(res, 404, { error: 'Not Found' });
    if (!apiKey) return sendJson(res, 503, { error: 'DEEPSEEK_API_KEY 未配置，请先在服务端设置环境变量。' });

    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        const data = await callDeepSeek({
          model,
          messages: [
            { role: 'system', content: '你是工厂排产顾问。只能依据订单、设备、物料和交期约束给出可解释的排产建议；不要虚构不存在的数据。请用中文回答，并严格输出合法 JSON，包含 recommendation、risks、actions 字段。' },
            { role: 'user', content: JSON.stringify(input) }
          ],
          response_format: { type: 'json_object' }
        });
        if (data.error) return sendJson(res, 502, { error: data.error.message || 'DeepSeek 请求失败' });
        const content = data.choices?.[0]?.message?.content || '{}';
        let answer;
        try { answer = JSON.parse(content); } catch { answer = { text: content }; }
        return sendJson(res, 200, { model: data.model || model, answer });
      } catch (error) {
        return sendJson(res, 500, { error: error.message || '服务端处理失败' });
      }
    });
    return;
  }

  // ---------- 2) 静态文件（网页） ----------
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.normalize(path.join(STATIC_DIR, rel));
  // 防目录穿越：只允许访问静态目录内的文件
  if (!filePath.startsWith(STATIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log('智能排产指挥台已启动：');
  console.log(`  网页   ：http://localhost:${port}/`);
  console.log(`  AI 接口：http://localhost:${port}/api/ai/schedule`);
  if (!apiKey) console.log('  ⚠ 未设置 DEEPSEEK_API_KEY，AI 排产顾问将返回 503（网页本身仍可用）。');
  console.log('  部署后其他人访问：http://<服务器地址>:' + port + '/');
});
