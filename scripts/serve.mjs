import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { networkInterfaces } from 'node:os';
const root = path.resolve(import.meta.dirname, '../dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(name==='/__qa__/gestures.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(path.resolve(root,'../tests/gestures.html')));return;}
    let file = path.resolve(root, '.' + name);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const type = mime[path.extname(file)];
    if (!type && path.basename(file) !== '.nojekyll') throw new Error('Non-public file');
    res.writeHead(200, { 'Content-Type': type || 'text/plain', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
const host=process.env.HOST||'0.0.0.0',port=Number(process.env.PORT||4173);
server.listen(port,host,()=>{console.log('Listen: '+host+':'+port);console.log('Local: http://127.0.0.1:'+port);if(host==='0.0.0.0')for(const addresses of Object.values(networkInterfaces()))for(const a of addresses||[])if(a.family==='IPv4'&&!a.internal)console.log('Network: http://'+a.address+':'+port);});
