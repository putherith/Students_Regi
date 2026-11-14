const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'navy-gold-review');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = path.join(output, `chrome-profile-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });

const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,900',
  pathToFileURL(path.join(root, 'index.html')).href,
], { windowsHide: true, stdio: 'ignore' });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getTarget() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const portFile = path.join(profile, 'DevToolsActivePort');
    if (fs.existsSync(portFile)) {
      const port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const target = targets.find(item => item.type === 'page' && item.url.includes('index.html'));
      if (target) return target.webSocketDebuggerUrl;
    }
    await delay(150);
  }
  throw new Error('Chrome DevTools target not ready');
}

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  };
  const ready = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  return {
    ready,
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => socket.close(),
  };
}

async function inspect(client, width, height, label) {
  await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 861 });
  await delay(600);
  const inspected = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      document.getElementById('app-settings-modal').classList.remove('is-open');
      document.getElementById('toast-container').style.display='none';
      const sidebar=document.getElementById('app-actions').getBoundingClientRect();
      const metrics=document.querySelector('.metrics').getBoundingClientRect();
      const list=document.querySelector('.list-panel').getBoundingClientRect();
      return {
        viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        sidebar:{x:sidebar.x,y:sidebar.y,width:sidebar.width},
        metrics:{x:metrics.x,y:metrics.y,width:metrics.width},
        list:{x:list.x,y:list.y,width:list.width},
        visibleMetrics:[...document.querySelectorAll('.metric')].filter(el=>getComputedStyle(el).display!=='none').length,
        modalOpen:document.getElementById('app-settings-modal').classList.contains('is-open'),
        version:document.querySelector('.footer-version')?.textContent.trim()
      };
    })()`
  });
  const result = inspected.result.value;
  if (result.scrollWidth > result.viewport + 1 || result.modalOpen || result.version !== 'កំណែ 2.1.80') {
    throw new Error(`${label} layout failed: ${JSON.stringify(result)}`);
  }
  if (width > 860 && (result.sidebar.x < 10 || result.sidebar.width < 210 || result.visibleMetrics !== 3)) {
    throw new Error(`Desktop shell failed: ${JSON.stringify(result)}`);
  }
  const capture = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(output, `${label}.png`), Buffer.from(capture.data, 'base64'));
  return result;
}

(async () => {
  try {
    const client = connect(await getTarget());
    await client.ready;
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    const desktop = await inspect(client, 1440, 900, 'desktop');
    const sections = {};
    for (const [name, selector] of [
      ['form', '.form-panel'],
      ['report', '.report-view'],
      ['classes', '.class-browser-panel'],
      ['list', '.list-panel'],
    ]) {
      const evaluated = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          document.querySelector('[data-sidebar-view="${name}"]').click();
          const section=document.querySelector('${selector}');
          return {visible:getComputedStyle(section).display!=='none' && !section.hidden,
            y:section.getBoundingClientRect().y,scrollY,
            scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
        })()`
      });
      sections[name] = evaluated.result.value;
      if (!sections[name].visible || sections[name].scrollWidth > sections[name].viewport + 1) {
        throw new Error(`${name} view failed: ${JSON.stringify(sections[name])}`);
      }
      if (name !== 'list') {
        await delay(150);
        const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(screenshot.data, 'base64'));
      }
    }
    const mobile = await inspect(client, 390, 844, 'mobile');
    client.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ desktop, sections, mobile }, null, 2));
    console.log(JSON.stringify({ desktop, sections, mobile }, null, 2));
  } finally {
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
