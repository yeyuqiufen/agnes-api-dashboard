const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_FILE = path.join(__dirname, '.env');

function loadEnv() {
  try {
    fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach(function(line) {
      var match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['\"]|['\"]$/g, '');
    });
  } catch (e) { }
}

loadEnv();
const AGNES_API_LOG_URL = process.env.AGNES_API_LOG_URL || 'https://platform-backend.agnes-ai.cn/api/log/self/star';

function readJsonSafe(f) {
  var c = fs.readFileSync(f, 'utf8');
  if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
  return JSON.parse(c);
}

function writeJson(f, obj) {
  fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
}

var billingData = null;
var lastFetchTime = null;
var isFetching = false;

try {
  billingData = readJsonSafe(DATA_FILE);
  lastFetchTime = billingData.lastFetchTime;
  console.log('Loaded:', billingData.summary.totalCount, 'records');
} catch (e) {
  console.log('No data file yet');
}

var UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

function utcToBeijing(utcISO) {
  var d = new Date(utcISO);
  var bj = new Date(d.getTime() + UTC_OFFSET_MS);
  var y = bj.getUTCFullYear();
  var m = String(bj.getUTCMonth() + 1).padStart(2, '0');
  var day = String(bj.getUTCDate()).padStart(2, '0');
  var h = String(bj.getUTCHours()).padStart(2, '0');
  var min = String(bj.getUTCMinutes()).padStart(2, '0');
  var s = String(bj.getUTCSeconds()).padStart(2, '0');
  return y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s;
}

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

async function scrape() {
  if (isFetching) { console.log('[scrape] already fetching'); return; }
  isFetching = true;
  console.log('[scrape] starting...');
  var token = process.env.AGNES_API_TOKEN;
  if (!token) { console.log('[scrape] no token'); isFetching = false; return; }
  var days = [];
  for (var i = 0; i < 3; i++) { var d = new Date(); d.setDate(d.getDate() - i); days.push(formatDate(d)); }
  console.log('[scrape] days:', days.join(','));
  var allItems = [];
  var pageSize = 100;
  for (var di = 0; di < days.length; di++) {
    var day = days[di];
    console.log('[scrape] fetching', day, '...');
    var page = 1;
    var totalOnPage = 0;
    do {
      var url = AGNES_API_LOG_URL + '?p=' + page + '&page_size=' + pageSize + '&start_timestamp=' + day + '&end_timestamp=' + day;
      try {
        var resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!resp.ok) { console.error('[scrape] HTTP', resp.status, 'for', day, 'page', page); break; }
        var json = await resp.json();
        var items = json.data && json.data.items ? json.data.items : [];
        var total = json.data && json.data.total ? json.data.total : items.length;
        totalOnPage = items.length;
        allItems = allItems.concat(items);
        console.log('[scrape]   page', page, 'got', items.length, 'items (total reported:', total + ')');
        page++;
      } catch (e) { console.error('[scrape] fetch error:', e.message); break; }
    } while (totalOnPage >= pageSize);
  }
  console.log('[scrape] total raw items:', allItems.length);
  var seen = {};
  var parsed = [];
  for (var j = 0; j < allItems.length; j++) {
    var item = allItems[j];
    var c = item.consumption || {};
    var utcStr = item.consumed_at || '';
    var bjTime = utcToBeijing(utcStr);
    var key = item.id + '_' + bjTime;
    if (seen[key]) continue;
    seen[key] = true;
    var inputTokens = c.input_tokens || 0;
    var outputTokens = c.output_tokens || 0;
    var cacheTokens = c.cache_tokens || 0;
    var model = item.model || 'unknown';
    var imageCount = Number(c.image_count || c.image_generation_count || c.images || item.image_count || item.image_generation_count || item.images || 0);
    var videoSeconds = Number(c.video_seconds || c.video_generation_seconds || c.duration_seconds || c.video_duration || c.duration || item.video_seconds || item.video_generation_seconds || item.duration_seconds || item.video_duration || item.duration || 0);
    if (!imageCount && /image/i.test(model)) imageCount = 1;
    parsed.push({ id: item.id, model: model, cost: item.amount_minor || 0, inputTokens: inputTokens, outputTokens: outputTokens, cacheTokens: cacheTokens, totalTokens: inputTokens + outputTokens, imageCount: imageCount, videoSeconds: videoSeconds, time: bjTime, status: 'success' });
  }
  parsed.sort(function(a,b){ return a.time.localeCompare(b.time); });
  console.log('[scrape] after dedup:', parsed.length, 'records');
  var bm = {}, bh = {}, ti = 0, to = 0, tc = 0, imageCount = 0, videoSeconds = 0;
  for (var k = 0; k < parsed.length; k++) {
    var r = parsed[k];
    ti += r.inputTokens; to += r.outputTokens; tc += r.cacheTokens;
    imageCount += r.imageCount || 0;
    videoSeconds += r.videoSeconds || 0;
    var mk = r.time.substring(0, 16), hk = r.time.substring(0, 13);
    if (!bm[mk]) bm[mk] = { i: 0, o: 0, c: 0 };
    if (!bh[hk]) bh[hk] = { i: 0, o: 0, c: 0 };
    bm[mk].i += r.inputTokens; bm[mk].o += r.outputTokens; bm[mk].c += r.cacheTokens;
    bh[hk].i += r.inputTokens; bh[hk].o += r.outputTokens; bh[hk].c += r.cacheTokens;
  }
  var mkKeys = Object.keys(bm).sort(), hkKeys = Object.keys(bh).sort();
  var result = {
    summary: { totalInput: ti, totalOutput: to, totalCache: tc, totalTokens: ti + to, totalCount: parsed.length, imageCount: imageCount, videoSeconds: videoSeconds },
    byMinute: { labels: mkKeys, input: mkKeys.map(function(k){return bm[k].i;}), output: mkKeys.map(function(k){return bm[k].o;}), cache: mkKeys.map(function(k){return bm[k].c;}) },
    byHour: { labels: hkKeys, input: hkKeys.map(function(k){return bh[k].i;}), output: hkKeys.map(function(k){return bh[k].o;}), cache: hkKeys.map(function(k){return bh[k].c;}) },
    rawData: parsed,
    lastFetchTime: new Date().toISOString()
  };
  writeJson(DATA_FILE, result);
  billingData = result;
  lastFetchTime = result.lastFetchTime;
  isFetching = false;
  console.log('[scrape] done. total:', parsed.length, 'records');
}

function sendJson(res, code, obj) {
  if (res.headersSent) return;
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function sendFile(res, fp, cts) {
  if (res.headersSent) return;
  var ext = path.extname(fp);
  var ct = cts[ext] || 'application/octet-stream';
  try {
    var data = fs.readFileSync(fp);
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  } catch (e) {
    if (res.headersSent) return;
    res.writeHead(404);
    res.end('Not found');
  }
}

var server = http.createServer(function(req,res) {
  var pu = new URL(req.url, 'http://localhost:' + PORT);
  if (pu.pathname === '/api/data') {
    sendJson(res, 200, billingData || { summary: {}, byMinute: {}, byHour: {}, rawData: [], lastFetchTime: null });
  } else if (pu.pathname === '/api/refresh') {
    if (!isFetching) scrape();
    sendJson(res, 200, { message: isFetching ? 'refreshing' : 'ready', isFetching: isFetching, totalTokens: billingData ? billingData.summary.totalTokens : 0, count: billingData ? billingData.summary.totalCount : 0 });
  } else if (pu.pathname === '/api/stats') {
    sendJson(res, 200, { totalTokens: billingData ? billingData.summary.totalTokens : 0, count: billingData ? billingData.summary.totalCount : 0, lastFetchTime: lastFetchTime, isFetching: isFetching });
  } else {
    var fp = path.join(PUBLIC_DIR, pu.pathname === '/' ? 'index.html' : pu.pathname);
    sendFile(res, fp, { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' });
  }
});
server.on('error', function(e){ console.error('Server error:', e.message); });
server.listen(PORT, '0.0.0.0', function() { console.log('Dashboard at http://localhost:' + PORT); if (!billingData || !billingData.summary || billingData.summary.totalCount === 0) { scrape(); } });
