const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');

const root = path.resolve(__dirname, '..');
const gameUrl = pathToFileURL(path.join(root, 'AFWI.html')).href;
// Visual validation is read-only with respect to the committed screenshot baseline.
// Set AFWI_SCREENSHOT_OUTPUT explicitly when new review artifacts are requested.
const outputDir = process.env.AFWI_SCREENSHOT_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'afwi-visual-'));
const chromePath = process.env.AFWI_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1050 }, deviceScaleFactor: 1 });
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  page.on('dialog', dialog => dialog.dismiss());

  await page.goto(gameUrl, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outputDir, 'phase2-corrections-landing-1680x1050.png'), fullPage: true });

  const landing = await page.evaluate(() => ({
    title: document.title,
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    hero: getComputedStyle(document.getElementById('landing-ui')).backgroundImage,
    logoLoaded: document.querySelector('.landing-logo').complete && document.querySelector('.landing-logo').naturalWidth > 0
  }));
  assert(landing.title === 'AFWI Executive Edition', 'Executive page title is missing.');
  assert(landing.width <= landing.viewport, 'Landing page overflows horizontally.');
  assert(/landing-command-center-v2/.test(landing.hero), 'New command-center landing image is not active.');
  assert(landing.logoLoaded, 'Landing logo did not load.');

  await page.click('#landing-ui button');
  await page.click('#btn-begin-setup');
  await page.hover('#setup-step-1 .btn');
  await page.screenshot({ path: path.join(outputDir, 'phase2-corrections-setup-1680x1050.png'), fullPage: true });
  const setupTheme = await page.evaluate(() => {
    const container=getComputedStyle(document.getElementById('setup-ui'));
    const button=getComputedStyle(document.querySelector('#setup-step-1 .btn'));
    return {background:container.backgroundImage,color:container.color,buttonBorder:button.borderColor,buttonOutline:button.outlineColor};
  });
  assert(/radial-gradient/.test(setupTheme.background), 'Setup UI does not use the command-glass theme.');
  assert(setupTheme.buttonBorder === 'rgb(240, 185, 74)' && setupTheme.buttonOutline === 'rgba(240, 185, 74, 0.42)', 'Setup button hover is not visibly highlighted.');

  await page.evaluate(() => {
    const usCards = ['US-AUTH-SQ-10','US-AUTH-SQ-08','US-AUTH-SQ-02','US-AUTH-SQ-04'].map(getMasterCard);
    const prcCards = ['PRC-AUTH-SQ-06','PRC-AUTH-SQ-08','PRC-AUTH-SQ-07','PRC-AUTH-SQ-04'].map(getMasterCard);
    state.us.sqHand = usCards.slice(1);
    state.prc.sqHand = prcCards.slice(1);
    state.us.enHand = ['US-AUTH-EN-06','US-AUTH-EN-20','US-AUTH-EN-27'].map(getMasterCard);
    state.prc.enHand = ['PRC-AUTH-EN-07','PRC-AUTH-EN-16','PRC-AUTH-EN-26'].map(getMasterCard);
    state.us.posture = POSTURES.US[0];
    state.prc.posture = POSTURES.PRC[0];
    state.us.mission = MISSIONS.US[1];
    state.prc.mission = MISSIONS.PRC[2];
    state.us.deployedSquadrons = [];
    state.prc.deployedSquadrons = [];
    state.us.squadronLedger = {};
    state.prc.squadronLedger = {};
    state.tokens = [];
    window.confirm = () => true;
    deploySquadronCard(usCards[0], state.us);
    deploySquadronCard(prcCards[0], state.prc);
    state.tokens[0].loc = 'lane-4';
    state.tokens[1].loc = 'lane-3';
    state.tokens[4].loc = 'lane-2';
    state.tokens[5].loc = 'lane-3';
    state.tokens.filter(t => t.side === 'PRC').forEach((t, index) => { t.acquired = index < 2; });
    state.tokens.filter(t => t.side === 'US').forEach(t => { t.acquired = true; });
    state.turnSide = 'US';
    state.phase = 'action';
    state.round = 2;
    state.acts = { move:1, acq:1, sht:1, sq:1 };
    state.selected = state.tokens.find(t => t.side === 'US');
    document.querySelectorAll('body > div').forEach(el => { if (el.id && /-ui$/.test(el.id)) el.style.display = 'none'; });
    document.getElementById('game-ui').style.display = 'block';
    drawUI();
  });

  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outputDir, 'phase2-corrections-us-command-1680x1050.png') });

  const board = await page.evaluate(() => {
    const box = selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right };
    };
    const zones = [...document.querySelectorAll('.zone')];
    const bases = ['#prc-standoff','#prc-airbase','#us-standoff','#us-airbase','#us-contingency'];
    return {
      usPanel: box('#panel-us'), prcPanel: box('#panel-prc'), board:box('.board'), hud:box('#selected-unit-panel'),
      prcZone: box('.zone-prc'), usZone: box('.zone-us'),
      usStandoff: box('#us-standoff'), usAirbase: box('#us-airbase'), usContingency: box('#us-contingency'),
      zoneOpacities: bases.map(selector => getComputedStyle(document.querySelector(selector),'::before').opacity),
      zoneBackgrounds: bases.map(selector => getComputedStyle(document.querySelector(selector),'::before').backgroundImage),
      mas: [...document.querySelectorAll('#mas-indicator .mas-cell')].map(el => ({ action:el.dataset.action, className:el.className })),
      descriptions: [...document.querySelectorAll('#panel-us .card-description')].map(el => el.textContent.trim()),
      tokens: [...document.querySelectorAll('.token:not(.unknown)')].map(el => ({
        type: el.querySelector('.token-type') && el.querySelector('.token-type').textContent.trim(),
        src: el.querySelector('img') && el.querySelector('img').getAttribute('src'),
        loaded: !el.querySelector('img') || el.querySelector('img').naturalWidth > 0
      })),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      zonesCount: zones.length
    };
  });

  assert(Math.abs(board.usPanel.width - board.prcPanel.width) < 0.5, 'Command side panels are not equal width.');
  assert(Math.abs(board.usPanel.height - board.prcPanel.height) < 0.5, 'Command side panels are not equal height.');
  assert(board.hud.x >= board.board.x && board.hud.right <= board.board.right && board.hud.width >= board.board.width - 20, `Selected-token HUD is not constrained to the board column (${board.hud.width}/${board.board.width}).`);
  assert(Math.abs(board.usZone.width - board.prcZone.width) < 0.5, 'US and PRC play areas are not equal width.');
  assert(Math.abs(board.usZone.height - board.prcZone.height) < 0.5, 'US and PRC play areas are not equal height.');
  assert(new Set(board.zoneOpacities).size === 1, 'Play-area image transparency is not equal.');
  assert(board.zoneBackgrounds.every(value => value && value !== 'none'), 'A location background image is missing.');
  assert(board.usStandoff.x < board.usAirbase.x && board.usAirbase.x < board.usContingency.x, 'US airbase/contingency order is incorrect.');
  assert(Math.abs(board.usStandoff.width - board.usAirbase.width) < 1 && Math.abs(board.usAirbase.width - board.usContingency.width) < 1, 'US location columns are not equal.');
  assert(board.mas.length === 3 && board.mas.every(item => /available/.test(item.className)), 'M-A-S availability indicator is incomplete.');
  assert(board.descriptions.length >= 4 && board.descriptions.every(Boolean), 'Squadron or Enabler descriptive text is missing.');
  assert(board.tokens.length > 0 && board.tokens.every(token => token.type && token.loaded), 'A visible token lacks its type or a valid image.');
  const f16 = board.tokens.find(token => token.type === 'F-16C');
  assert(f16 && /f16-plan\.svg/.test(f16.src) && !/f15/.test(f16.src), 'F-16 token uses an ambiguous aircraft image.');
  assert(!board.overflow, 'Game board overflows horizontally at the executive viewport.');

  await page.evaluate(() => {
    state.turnSide = 'PRC';
    state.acts = { move:0, acq:1, sht:0, sq:1 };
    state.selected = state.tokens.find(t => t.side === 'PRC');
    drawUI();
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outputDir, 'phase2-corrections-prc-command-1680x1050.png') });

  const masSpent = await page.evaluate(() => [...document.querySelectorAll('#mas-indicator .mas-cell')].map(el => el.className));
  assert(/spent/.test(masSpent[0]) && /available/.test(masSpent[1]) && /spent/.test(masSpent[2]), 'M-A-S spent state does not track the action pool.');

  const locationScrolling = await page.evaluate(() => {
    const locations=['prc-standoff','prc-airbase','us-standoff','us-airbase','us-contingency'];
    state.us.deployedSquadrons=[]; state.prc.deployedSquadrons=[]; state.tokens=[]; state.turnSide='US';
    locations.forEach((loc, locationIndex) => {
      const side=loc.indexOf('prc-')===0?'PRC':'US';
      for(let i=0;i<18;i++) state.tokens.push({side,cardId:side==='US'?'US-AUTH-SQ-10':'PRC-AUTH-SQ-06',name:side==='US'?'F-16C Fighting Falcon':'J-10 Firebird',loc,spd:2,acqR:2,shtR:1,targetAcq:3,attackThreshold:3,winchesterType:'Standard',winchester:false,acquired:true,rogue:false,tags:['Fighter','Gen4']});
    });
    drawUI();
    return locations.map(id=>{
      const el=document.getElementById(id), style=getComputedStyle(el); el.scrollTop=el.scrollHeight;
      return {id,overflowY:style.overflowY,wrap:style.flexWrap,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,scrollTop:el.scrollTop};
    });
  });
  assert(locationScrolling.every(item=>item.overflowY==='auto' && item.wrap==='wrap' && item.scrollHeight>item.clientHeight && item.scrollTop>0), `A populated location failed to scroll: ${JSON.stringify(locationScrolling)}`);
  assert(runtimeErrors.length === 0, `Browser runtime errors: ${runtimeErrors.join(' | ')}`);

  const report = {
    build: '1.3.0-combat-roster',
    viewport: '1680x1050',
    checks: 22,
    status: 'PASS',
    screenshots: [
      'phase2-corrections-landing-1680x1050.png',
      'phase2-corrections-setup-1680x1050.png',
      'phase2-corrections-us-command-1680x1050.png',
      'phase2-corrections-prc-command-1680x1050.png'
    ]
  };
  fs.writeFileSync(path.join(outputDir, 'phase2-visual-regression.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`PASS Phase Two visual regression (${report.checks} checks)\n`);
  await browser.close();
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
