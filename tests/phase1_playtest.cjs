const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

const gameUrl = pathToFileURL(path.resolve(__dirname, '..', 'AFWI.html')).href;
const chromePath = process.env.AFWI_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const results = [];

  async function test(name, body, dialogAnswers) {
    const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });
    const answers = (dialogAnswers || []).slice();
    page.on('dialog', async dialog => {
      const answer = answers.length ? answers.shift() : { accept: false };
      if (dialog.type() === 'prompt') {
        if (answer.accept === false) await dialog.dismiss();
        else await dialog.accept(answer.text == null ? '1' : String(answer.text));
      } else if (answer.accept) await dialog.accept();
      else await dialog.dismiss();
    });
    try {
      await page.goto(gameUrl, { waitUntil: 'load' });
      await body(page);
      assert(runtimeErrors.length === 0, `browser runtime errors: ${runtimeErrors.join(' | ')}`);
      results.push({ name, status: 'PASS' });
      process.stdout.write(`PASS ${name}\n`);
    } catch (error) {
      results.push({ name, status: 'FAIL', error: error.message });
      process.stderr.write(`FAIL ${name}: ${error.message}\n`);
    } finally {
      await page.close();
    }
  }

  await test('boot, content validation, and fixed five-ATO match format', async page => {
    const result = await page.evaluate(() => ({
      title: document.title,
      version: AFWI.Build.buildVersion,
      validation: AFWI.Validator.validateContent(),
      maxRounds: state.maxRounds,
      campaignGlobals: typeof CAMPAIGNS + ',' + typeof selectCampaign,
      campaignUi: !!document.getElementById('campaign-list'),
      rulesCycles: AFWI.Rules.manifest.defaultAtoCycles,
      corruptedPrcTitles: MASTER_DECK.filter(c => c.Side==='PRC' && c.Authoritative && /[ÃÂæçéå]/.test(c.TITLE||'')).map(c=>c.ID),
      mediumAda: getMasterCard('PRC-AUTH-SQ-02'),
      longAda: getMasterCard('PRC-AUTH-SQ-05'),
      prcAew: getMasterCard('PRC-AUTH-SQ-04'),
      specialMission: getMasterCard('PRC-AUTH-EN-08').DESC
    }));
    assert(result.title === 'AFWI Executive Edition', 'executive title missing');
    assert(result.version === '1.3.1-solid-locations', 'solid-location build version missing');
    assert(result.validation.valid && result.validation.errors.length === 0, 'content validation failed');
    assert(result.maxRounds === 5 && result.rulesCycles === 5, 'default match is not five ATO cycles');
    assert(result.campaignGlobals === 'undefined,undefined' && !result.campaignUi, 'campaign system was not removed');
    assert(result.corruptedPrcTitles.length === 0, `corrupted PRC titles: ${result.corruptedPrcTitles.join(',')}`);
    assert(result.mediumAda.Spd === 0 && result.mediumAda.ShtR === 2 && result.longAda.Spd === 0 && result.longAda.ShtR === 4, 'PRC ADA profiles are not operational');
    assert(result.prcAew.Tags.join(',') === 'AEW', 'PRC AEW was incorrectly tagged as a fifth-generation fighter');
    assert(!/\bOR\s*$/i.test(result.specialMission), 'Special Mission Aircraft still has an incomplete rules sentence');
  });

  await test('complete authoritative force pool is freely draftable', async page => {
    const result = await page.evaluate(() => {
      const visible = side => MASTER_DECK.filter(c => c.Side === side && c.Draftable).map(c => c.ID);
      const us = visible('US'), prc = visible('PRC');
      return {
        usSquadrons:us.filter(id=>getMasterCard(id).Type==='SQ').length,
        usEnablers:us.filter(id=>getMasterCard(id).Type==='EN').length,
        prcSquadrons:prc.filter(id=>getMasterCard(id).Type==='SQ').length,
        prcEnablers:prc.filter(id=>getMasterCard(id).Type==='EN').length,
        hasBomber:us.concat(prc).some(id=>{const c=getMasterCard(id);return c.Tags&&c.Tags.indexOf('Bomber')>=0;}),
        hasGen5:us.concat(prc).some(id=>{const c=getMasterCard(id);return c.Tags&&c.Tags.indexOf('Gen5')>=0;})
      };
    });
    assert(result.usSquadrons === 10 && result.prcSquadrons === 10, 'all authoritative squadrons are not draftable');
    assert(result.usEnablers === 34 && result.prcEnablers === 34, 'all authoritative enablers are not draftable');
    assert(result.hasBomber && result.hasGen5, 'free draft incorrectly filtered major capabilities');
  });

  await test('every authoritative card is selectable and removable in the draft UI', async page => {
    const result = await page.evaluate(() => {
      const failures=[];
      for(const side of ['US','PRC']) {
        setup.side=side; setup.selPosture=POSTURES[side].find(p=>p.title==='STANDARD'); setup.picks=[]; setup.draftNotice='';
        state[side.toLowerCase()].squadronLedger={};
        renderDraft();
        const expected=MASTER_DECK.filter(c=>c.Side===side&&c.Authoritative&&c.Draftable&&cardAllowedByPosture(c,setup.selPosture));
        const visible=[...document.querySelectorAll('#draft-pool-sq [data-card-id],#draft-pool-en [data-card-id]')].map(el=>el.getAttribute('data-card-id'));
        for(const card of expected) {
          if(visible.indexOf(card.ID)<0) failures.push(side+': missing '+card.ID);
          const masterIndex=MASTER_DECK.indexOf(card);
          draftCard(masterIndex);
          if(!setup.picks.some(p=>p.ID===card.ID)) failures.push(side+': could not select '+card.ID);
          const pickIndex=setup.picks.findIndex(p=>p.ID===card.ID);
          if(pickIndex>=0) undraftCard(pickIndex);
          if(setup.picks.some(p=>p.ID===card.ID)) failures.push(side+': could not return '+card.ID);
        }
      }
      return {failures,usCount:MASTER_DECK.filter(c=>c.Side==='US'&&c.Authoritative&&c.Draftable).length,prcCount:MASTER_DECK.filter(c=>c.Side==='PRC'&&c.Authoritative&&c.Draftable).length};
    });
    assert(result.usCount===44&&result.prcCount===44,'authoritative draft roster count changed');
    assert(result.failures.length===0,`draft selection failures: ${result.failures.join(' | ')}`);
  });

  await test('every authoritative Squadron deploys a complete playable unit profile', async page => {
    const result = await page.evaluate(() => {
      const failures=[]; window.confirm=()=>true; window.prompt=()=> '1';
      for(const card of MASTER_DECK.filter(c=>c.Authoritative&&c.Type==='SQ')) {
        const player=state[card.Side.toLowerCase()];
        player.squadronLedger={}; player.deployedSquadrons=[]; state.tokens=[];
        const ok=deploySquadronCard(card,player), made=state.tokens.filter(t=>t.parentSqId===card.ID);
        if(!ok || made.length!==card.Qty) failures.push(card.ID+': expected '+card.Qty+' tokens, made '+made.length);
        for(const tok of made) {
          if(typeof tok.canAttackAir!=='boolean'||typeof tok.canAttackSurface!=='boolean'||typeof tok.targetAcq!=='number'||typeof tok.attackThreshold!=='number') failures.push(card.ID+': incomplete combat profile');
        }
      }
      return {count:MASTER_DECK.filter(c=>c.Authoritative&&c.Type==='SQ').length,failures};
    });
    assert(result.count===20,'expected 20 authoritative Squadrons');
    assert(result.failures.length===0,`Squadron playability failures: ${result.failures.join(' | ')}`);
  });

  await test('posture restrictions and zero-cost draft exceptions', async page => {
    const result = await page.evaluate(() => {
      const joint = POSTURES.PRC.find(p => p.title === 'JOINT OPERATIONS');
      const ada = POSTURES.PRC.find(p => p.title === 'ADA');
      const standoff = POSTURES.US.find(p => p.title === 'STANDOFF');
      const sam = MASTER_DECK.find(c => c.Side === 'PRC' && c.Type === 'SQ' && c.Tags && c.Tags.indexOf('SAM') >= 0);
      const bomber = MASTER_DECK.find(c => c.Side === 'US' && c.Type === 'SQ' && c.Tags && c.Tags.indexOf('Bomber') >= 0);
      return {
        jointRejectsSam: !cardAllowedByPosture(sam, joint),
        adaSamCost: draftCost(sam, ada),
        standoffBomberCost: draftCost(bomber, standoff)
      };
    });
    assert(result.jointRejectsSam, 'Joint Operations allowed a SAM squadron');
    assert(result.adaSamCost === 0, 'ADA posture did not make SAM squadron zero-cost');
    assert(result.standoffBomberCost === 0, 'Standoff posture did not make bomber squadron zero-cost');
  });

  await test('aircraft generate at owning airbases with the US contingency option', async page => {
    const result = await page.evaluate(() => {
      const cards = {
        fighter: MASTER_DECK.find(c => c.Side==='US' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('Fighter')>=0),
        uas: MASTER_DECK.find(c => c.Side==='US' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('UAS')>=0),
        bomber: MASTER_DECK.find(c => c.Side==='US' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('Bomber')>=0),
        ada: MASTER_DECK.find(c => c.Side==='US' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('SAM')>=0),
        prcFighter: MASTER_DECK.find(c => c.Side==='PRC' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('Fighter')>=0),
        prcBomber: MASTER_DECK.find(c => c.Side==='PRC' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('Bomber')>=0)
      };
      state.us.posture=POSTURES.US.find(p=>p.title==='STANDARD');
      window.confirm = () => true;
      const usDefault = {fighter:getDeploymentLocation(cards.fighter),uas:getDeploymentLocation(cards.uas),ada:cards.ada?getDeploymentLocation(cards.ada):'us-airbase'};
      window.confirm = () => false;
      const contingency=getDeploymentLocation(cards.fighter);
      let answers=[false,true]; window.confirm=()=>answers.shift();
      const bomberBase=getDeploymentLocation(cards.bomber);
      window.confirm=()=>true; const bomberStandoff=getDeploymentLocation(cards.bomber);
      window.confirm=()=>false; const prcBomberBase=getDeploymentLocation(cards.prcBomber);
      window.confirm=()=>true; const prcBomberStandoff=getDeploymentLocation(cards.prcBomber);
      return {usDefault,contingency,bomberBase,bomberStandoff,prcBomberBase,prcBomberStandoff,prcFighter:getDeploymentLocation(cards.prcFighter)};
    });
    assert(Object.values(result.usDefault).every(loc=>loc==='us-airbase'), 'OK did not default US deployment to the airbase');
    assert(result.contingency === 'us-contingency', 'US contingency selection was not honored');
    assert(result.bomberBase==='us-airbase' && result.bomberStandoff==='us-standoff', 'US standoff-capable force locations failed');
    assert(result.prcBomberBase==='prc-airbase' && result.prcBomberStandoff==='prc-standoff' && result.prcFighter==='prc-airbase', 'PRC force locations failed');
  });

  await test('Enabler cards retain their explicit generation locations', async page => {
    const result = await page.evaluate(() => {
      const ada=getMasterCard('US-AUTH-EN-26'), ec130=getMasterCard('US-AUTH-EN-20'), j15=getMasterCard('PRC-AUTH-EN-26');
      window.confirm=()=>true; window.prompt=()=> '3';
      const adaBase=chooseGeneratedLocation(ada,'US');
      window.confirm=()=>false;
      const adaContingency=chooseGeneratedLocation(ada,'US');
      return {adaBase,adaContingency,ec130:chooseGeneratedLocation(ec130,'US'),j15:chooseGeneratedLocation(j15,'PRC')};
    });
    assert(result.adaBase === 'us-airbase' && result.adaContingency === 'us-contingency', 'Enabler base/contingency choice failed');
    assert(result.ec130 === 'lane-3' && result.j15 === 'lane-3', 'Enabler any-band exception failed');
  });

  await test('target acquisition thresholds and cyber Advantage', async page => {
    const result = await page.evaluate(() => {
      state.phase='action'; state.actionLocked=false; state.turnSide='US'; state.acts={move:1,acq:2,sht:1};
      state.us.cyber=2; state.prc.cyber=1;
      const sensor={side:'US',name:'Sensor',loc:'lane-3',acqR:3,shtR:-1,acqBonus:0,winchester:false,tags:['AEW']};
      const hard={side:'PRC',name:'Hard target',loc:'lane-3',targetAcq:3,acquired:false,tags:['Fighter']};
      state.tokens=[sensor,hard]; state.selected=sensor;
      AFWI.Random.setSequence([1,3]);
      select(hard);
      const first=hard.acquired;
      hard.acquired=false; state.selected=sensor; state.us.cyber=1; state.acts.acq=2; sensor.firstAcqDone=false;
      AFWI.Random.setSequence([1,4]);
      select(hard);
      return { cyberAdvSucceeded:first, normalUsedFirstDie:hard.acquired };
    });
    assert(result.cyberAdvSucceeded, 'cyber superiority did not grant Advantage');
    assert(!result.normalUsedFirstDie, 'normal acquisition incorrectly selected the unused second die');
  });

  await test('Air-to-Air and Air-to-Surface target domains are enforced', async page => {
    const result = await page.evaluate(() => {
      function unit(name,tags,air,surface){return {name,side:'US',loc:'lane-3',shtR:3,tags,canAttackAir:air,canAttackSurface:surface};}
      const f22=unit('F-22',['Fighter','Gen5'],true,false);
      const f35=unit('F-35',['Fighter','Gen5'],true,true);
      const bomber=unit('B-52',['Bomber'],false,true);
      const sam=unit('Patriot',['SAM'],true,false);
      const ship=unit('DDG',['Naval','SAG','SAM'],true,true);
      const fighterTarget={name:'J-20',side:'PRC',tags:['Fighter']};
      const j15Target={name:'J-15',side:'PRC',tags:['Naval','Carrier','Fighter','Gen4']};
      const shipTarget={name:'Type 055',side:'PRC',tags:['Naval','SAG','SAM']};
      const baseTarget={name:'PRC Airbase',side:'PRC',isAirbase:true,tags:[]};
      return {
        f22Air:attackDomainLegality(f22,fighterTarget).ok,
        f22Ship:attackDomainLegality(f22,shipTarget).ok,
        f35Ship:attackDomainLegality(f35,shipTarget).ok,
        bomberAir:attackDomainLegality(bomber,fighterTarget).ok,
        bomberShip:attackDomainLegality(bomber,shipTarget).ok,
        samAir:attackDomainLegality(sam,fighterTarget).ok,
        samShip:attackDomainLegality(sam,shipTarget).ok,
        shipAir:attackDomainLegality(ship,fighterTarget).ok,
        shipBase:attackDomainLegality(ship,baseTarget).ok,
        shipShip:attackDomainLegality(ship,shipTarget).ok,
        j15IsAir:!isSurfaceTarget(j15Target),
        profiles:{f22:getMasterCard('US-AUTH-SQ-05'),f35:getMasterCard('US-AUTH-SQ-08'),b52:getMasterCard('US-AUTH-SQ-02'),rq4:getMasterCard('US-AUTH-SQ-03'),sam:getMasterCard('PRC-AUTH-SQ-02')}
      };
    });
    assert(result.f22Air&&!result.f22Ship&&result.f35Ship,'fighter Air-to-Air/Air-to-Surface split failed');
    assert(!result.bomberAir&&result.bomberShip,'bomber target-domain enforcement failed');
    assert(result.samAir&&!result.samShip,'SAM target-domain enforcement failed');
    assert(result.shipAir&&result.shipBase&&!result.shipShip,'naval offensive domain enforcement failed');
    assert(result.j15IsAir,'carrier aircraft was incorrectly classified as a surface combatant');
    assert(result.profiles.f22.canAttackAir&&!result.profiles.f22.canAttackSurface&&result.profiles.f35.canAttackAir&&result.profiles.f35.canAttackSurface,'fifth-generation unit profiles are wrong');
    assert(!result.profiles.b52.canAttackAir&&result.profiles.b52.canAttackSurface&&!result.profiles.rq4.canAttackAir&&!result.profiles.rq4.canAttackSurface,'bomber/recon profiles are wrong');
    assert(result.profiles.sam.canAttackAir&&!result.profiles.sam.canAttackSurface,'authoritative SAM profile is wrong');
  });

  await test('naval surface combatants require three successful hits', async page => {
    const result = await page.evaluate(() => {
      state.phase='action';state.actionLocked=false;state.turnSide='US';state.us.vp=0;state.us.mission={title:'ATTRITION'};state.prc.losses=[];state.prc.navalLosses=0;state.tokens=[];
      state.us.buffs={nextAtk:'normal',nextCyb:'normal',moveDenied:false,attackMode:'normal',acquisitionMode:'normal',airAttackMode:'normal',bomberAttackMode:'normal',contingencyAutoGenerate:false,fighterRange:null,nextAutoHit:false,nextUASReroll:false,sofProtected:false};
      const attacker={side:'US',name:'F-35A',loc:'lane-3',shtR:1,attackThreshold:2,canAttackAir:true,canAttackSurface:true,explosive:false,winchesterType:'Standard',winchester:false,tags:['Fighter','Gen5']};
      const target={side:'PRC',name:'Type 055',loc:'lane-3',acquired:true,parentSqId:null,tags:['Naval','SAG','SAM'],maxHp:3,currentHp:3};
      state.tokens=[attacker,target];AFWI.Random.setSequence([4,4,4,4,4,4]);
      const history=[];
      for(let i=0;i<3;i++){resolveCommittedAttack(attacker,target,state.us,false,null);history.push({present:state.tokens.indexOf(target)>=0,hp:target.currentHp,vp:state.us.vp,losses:state.prc.losses.length});}
      return {history,navalLosses:state.prc.navalLosses};
    });
    assert(result.history[0].present&&result.history[0].hp===2&&result.history[0].vp===0,'first naval hit destroyed or scored the ship');
    assert(result.history[1].present&&result.history[1].hp===1&&result.history[1].vp===0,'second naval hit destroyed or scored the ship');
    assert(!result.history[2].present&&result.history[2].hp===0&&result.history[2].vp===3&&result.history[2].losses===1,'third naval hit did not destroy and score the ship');
    assert(result.navalLosses===1,'naval loss ledger did not record the destroyed surface combatant');
  });

  await test('Squadron cards stay masked until AQ 1 targeting reveals them', async page => {
    const result = await page.evaluate(() => {
      state.phase='action'; state.actionLocked=false; state.turnSide='US'; state.acts={move:1,acq:1,sht:1};
      state.us.cyber=1; state.prc.cyber=1; state.us.mission=null; state.prc.mission=null;
      state.us.deployedSquadrons=[]; state.prc.squadronLedger={};
      const squad={cardId:'SECRET-SQ',name:'SECRET WING',maxHp:2,currentHp:2,remainingQty:4,destroyed:false,vp:2,acquired:false,baseLoc:'prc-airbase'};
      state.prc.deployedSquadrons=[squad]; state.prc.squadronLedger['SECRET-SQ']={maxQty:4,remainingQty:4};
      const sensor={side:'US',cardId:'US-AUTH-SQ-05',name:'F-22 Raptor',loc:'lane-1',spd:2,acqR:3,shtR:1,acqBonus:0,targetAcq:2,attackThreshold:2,winchester:false,acquired:false,tags:['Fighter']};
      state.tokens=[sensor]; state.selected=null; drawUI();
      const before=document.querySelector('#prc-airbase .squadron-board-card').innerText;
      state.selected=sensor; AFWI.Random.setSequence([1]); targetDeployedSquadron('PRC',0);
      const after=document.querySelector('#prc-airbase .squadron-board-card').innerText;
      const tokenAcquired=squad.acquired, actions=state.acts.acq;
      squad.acquired=false; state.tokens=[]; phase5AcquireEnemy('US',1); drawUI();
      const enablerAfter=document.querySelector('#prc-airbase .squadron-board-card').innerText;
      return {before,after,tokenAcquired,actions,enablerAcquired:squad.acquired,enablerAfter};
    });
    assert(/UNIDENTIFIED SQUADRON/.test(result.before) && !/SECRET WING/.test(result.before), 'enemy Squadron identity leaked through fog of war');
    assert(result.tokenAcquired && /SECRET WING/.test(result.after), 'AQ 1 Squadron targeting did not persistently reveal the card');
    assert(result.actions === 0, 'Squadron acquisition did not consume the acquisition action');
    assert(result.enablerAcquired && /SECRET WING/.test(result.enablerAfter), 'Enabler acquisition did not reveal the targeted Squadron card');
  });

  await test('US row order and selected-token profile panel remain readable', async page => {
    const result = await page.evaluate(() => {
      state.phase='action'; state.actionLocked=false; state.turnSide='US'; state.acts={move:1,acq:1,sht:1};
      const tok={side:'US',cardId:'US-AUTH-SQ-05',name:'F-22 Raptor',loc:'us-airbase',spd:2,acqR:2,shtR:1,targetAcq:3,attackThreshold:2,winchesterType:'Standard',winchester:false,acquired:false,rogue:false,tags:['Fighter','Gen5']};
      state.tokens=[tok]; state.selected=tok; drawUI();
      const panel=document.getElementById('selected-unit-panel');
      const rendered=document.querySelector('#us-airbase .token');
      const style=getComputedStyle(rendered);
      return {
        row:Array.from(document.querySelector('#us-airbase').parentElement.children).map(el=>el.id),
        panelText:panel.innerText,
        panelClass:panel.className,
        width:style.width,
        height:style.height
      };
    });
    assert(result.row.join(',') === 'us-standoff,us-airbase,us-contingency', 'US airbase and contingency containers are not in the clarified order');
    assert(/F-22 Raptor/.test(result.panelText) && /Move: 2/.test(result.panelText) && /Sensor Range: 2/.test(result.panelText) && /Weapon Range: 1/.test(result.panelText) && /Target AQ: 3/.test(result.panelText) && /Hit: 2\+/.test(result.panelText), 'selected-token panel omitted required profile data');
    assert(/selected-unit-panel us/.test(result.panelClass), 'selected-token panel did not activate for the selected unit');
    assert(result.width === '72px' && result.height === '66px', 'existing token size changed');
  });

  await test('explosive attacks roll separate damage and cap base strikes', async page => {
    const result = await page.evaluate(() => {
      state.phase='action'; state.actionLocked=false; state.turnSide='US'; state.acts={move:1,acq:1,sht:1}; state.us.vp=0; state.prc.airbaseStrikes=0;
      const attacker={side:'US',name:'Bomber',loc:'lane-2',shtR:5,attackThreshold:2,hitThreshold:2,canAttackAir:false,canAttackSurface:true,explosive:true,winchesterType:'Standard',winchester:false,tags:['Bomber']};
      const base={isAirbase:true,side:'PRC',name:'PRC Airbase',loc:'prc-airbase',acquired:true};
      state.tokens=[attacker]; AFWI.Random.setSequence([4,1,3,1]);
      resolveCommittedAttack(attacker,base,state.us,false,null);
      return { strikes:state.prc.airbaseStrikes, vp:state.us.vp, winchester:attacker.winchester };
    });
    assert(result.strikes === 3 && result.vp === 3, 'explosive damage was not applied as a separate capped d4');
    assert(!result.winchester, 'natural 4 did not conserve bomber munitions');
  });

  await test('missile defense disadvantages hit and damage and expends naval salvo', async page => {
    const result = await page.evaluate(() => {
      state.phase='action'; state.actionLocked=false; state.turnSide='US'; state.acts={move:1,acq:1,sht:1}; state.us.vp=0; state.prc.airbaseStrikes=0;
      const attacker={side:'US',name:'Bomber',loc:'lane-2',shtR:5,attackThreshold:2,hitThreshold:2,canAttackAir:false,canAttackSurface:true,explosive:true,winchesterType:'Standard',winchester:false,tags:['Bomber']};
      const defender={side:'PRC',name:'DDG',loc:'lane-1',shtR:3,winchesterType:'Salvo',salvos:2,tags:['Naval','SAG','SAM']};
      const base={isAirbase:true,side:'PRC',name:'PRC Airbase',loc:'prc-airbase',acquired:true};
      state.tokens=[attacker,defender]; AFWI.Random.setSequence([4,2,4,1]);
      resolveCommittedAttack(attacker,base,state.us,true,defender);
      return { strikes:state.prc.airbaseStrikes, vp:state.us.vp, salvos:defender.salvos };
    });
    assert(result.strikes === 1 && result.vp === 1, 'missile defense did not disadvantage explosive damage');
    assert(result.salvos === 1, 'naval missile-defense salvo was not expended');
  });

  await test('Air Launched Decoy cancels a rolled PRC hit', async page => {
    const result = await page.evaluate(() => {
      window.confirm=()=>true; state.phase='action';state.actionLocked=false;state.turnSide='PRC';state.acts={move:1,acq:1,sht:1};state.prc.vp=0;state.prc.mission={title:'ATTRITION'};
      state.us.enHand=[JSON.parse(JSON.stringify(getMasterCard('US-AUTH-EN-19')))];state.us.discarded=[];
      const attacker={side:'PRC',name:'J-10',loc:'lane-3',shtR:1,attackThreshold:3,canAttackAir:true,canAttackSurface:false,explosive:false,winchesterType:'Standard',winchester:false,tags:['Fighter']};
      const target={side:'US',name:'F-16',loc:'lane-3',acquired:true,parentSqId:null,tags:['Fighter']};
      state.tokens=[attacker,target];AFWI.Random.setSequence([4,1]);resolveCommittedAttack(attacker,target,state.prc,false,null);
      return {targetPresent:state.tokens.indexOf(target)>=0,hand:state.us.enHand.length,discard:state.us.discarded.length,prcVP:state.prc.vp};
    });
    assert(result.targetPresent, 'decoy did not preserve the hit target');
    assert(result.hand === 0 && result.discard === 1, 'decoy reaction was not consumed');
    assert(result.prcVP === 0, 'cancelled hit incorrectly scored VP');
  });

  await test('opposing submarine cards cancel each other as reactions', async page => {
    const result = await page.evaluate(() => {
      window.confirm=()=>true;state.phase='action';state.actionLocked=false;state.turnSide='US';state.us.discarded=[];state.prc.discarded=[];
      state.us.enHand=[JSON.parse(JSON.stringify(getMasterCard('US-AUTH-EN-33')))];
      state.prc.enHand=[JSON.parse(JSON.stringify(getMasterCard('PRC-AUTH-EN-30')))];
      state.tokens=[{side:'PRC',name:'PRC Ship',loc:'lane-3',tags:['Naval','SAG']}];
      playCard('US',false,0);
      return {shipPresent:state.tokens.length===1,usHand:state.us.enHand.length,prcHand:state.prc.enHand.length,usDiscard:state.us.discarded.length,prcDiscard:state.prc.discarded.length,usDraftable:getMasterCard('US-AUTH-EN-33').Draftable,prcDraftable:getMasterCard('PRC-AUTH-EN-30').Draftable};
    });
    assert(result.shipPresent, 'cancelled submarine card still destroyed its target');
    assert(result.usHand === 0 && result.prcHand === 0 && result.usDiscard === 1 && result.prcDiscard === 1, 'submarine attack/counter cards were not both consumed');
    assert(!result.usDraftable && !result.prcDraftable, 'cancelled single-use cards were not removed from the match pool');
  });

  await test('Winchester rules for static ADA, UAS, and naval salvos', async page => {
    const result = await page.evaluate(() => {
      function reset() { state.phase='action'; state.actionLocked=false; state.turnSide='US'; state.acts={move:1,acq:1,sht:3}; state.tokens=[]; state.us.enHand=[]; state.prc.enHand=[]; }
      const target=()=>({side:'PRC',name:'Air target',loc:'lane-3',acquired:true,targetAcq:2,tags:['Fighter']});
      reset(); const ada={side:'US',name:'ADA',loc:'lane-3',shtR:2,attackThreshold:2,canAttackAir:true,canAttackSurface:false,explosive:false,winchesterType:'None',winchester:false,tags:['SAM']}; let t=target(); state.tokens=[ada,t]; AFWI.Random.setSequence([2,4]); resolveCommittedAttack(ada,t,state.us,false,null); const adaWinchester=ada.winchester;
      reset(); const uas={side:'US',name:'UAS',loc:'lane-3',shtR:2,attackThreshold:3,canAttackAir:true,canAttackSurface:true,explosive:false,winchesterType:'Infinite',winchester:false,tags:['UAS']}; t=target(); state.tokens=[uas,t]; AFWI.Random.setSequence([2,4]); resolveCommittedAttack(uas,t,state.us,false,null); const uasWinchester=uas.winchester;
      reset(); const ship={side:'US',name:'DDG',loc:'lane-3',shtR:3,attackThreshold:2,canAttackAir:true,canAttackSurface:true,explosive:false,winchesterType:'Salvo',salvos:2,winchester:false,tags:['Naval','SAG','SAM']}; t=target(); state.tokens=[ship,t]; AFWI.Random.setSequence([4,1]); resolveCommittedAttack(ship,t,state.us,false,null); const navalSalvos=ship.salvos;
      return {adaWinchester,uasWinchester,navalSalvos};
    });
    assert(!result.adaWinchester, 'static ADA went Winchester');
    assert(result.uasWinchester, 'UAS failed to go Winchester on natural 1-2');
    assert(result.navalSalvos === 2, 'naval natural 4 failed to conserve a salvo');
  });

  await test('Winchester state and HUD typography are prominent', async page => {
    const result = await page.evaluate(() => {
      state.phase='action';state.actionLocked=false;state.turnSide='US';state.acts={move:1,acq:1,sht:1};
      const tok={side:'US',cardId:'US-AUTH-SQ-10',name:'F-16C Fighting Falcon',loc:'lane-3',spd:2,acqR:2,shtR:1,targetAcq:3,attackThreshold:3,canAttackAir:true,canAttackSurface:true,winchesterType:'Standard',winchester:true,tags:['Fighter','Gen4'],acquired:false,rogue:false};
      state.tokens=[tok];state.selected=tok;drawUI();
      const tokenEl=document.querySelector('#lane-3 .token');
      const panel=document.getElementById('selected-unit-panel');
      return {tokenClass:tokenEl.className,badge:!!tokenEl.querySelector('.winchester-badge'),panelClass:panel.className,panelAlert:!!panel.querySelector('.selected-winchester-alert'),statusPill:!!document.querySelector('#unit-status .status-winchester'),hudFont:parseFloat(getComputedStyle(document.getElementById('unit-status')).fontSize),panelFont:parseFloat(getComputedStyle(panel.querySelector('.selected-stat')).fontSize)};
    });
    assert(/winchester/.test(result.tokenClass)&&result.badge,'Winchester token marker is not prominent');
    assert(/winchester/.test(result.panelClass)&&result.panelAlert&&result.statusPill,'Winchester HUD alert is incomplete');
    assert(result.hudFont>=13&&result.panelFont>=11,'HUD font sizes were not increased');
  });

  await test('Counter-UAS destroys tokens without runtime failure', async page => {
    const result = await page.evaluate(() => {
      state.prc.losses=[]; state.prc.squadronLedger={}; state.prc.enHand=[]; state.us.mission={title:'ATTRITION'}; state.us.vp=0;
      const uas1={side:'PRC',name:'UAS 1',parentSqId:null,loc:'lane-2',tags:['UAS']};
      const uas2={side:'PRC',name:'UAS 2',parentSqId:null,loc:'lane-3',tags:['UAS']};
      state.tokens=[uas1,uas2]; phase5DestroyEnemyUAS('US',2);
      return { remaining:state.tokens.length, losses:state.prc.losses.length, vp:state.us.vp };
    });
    assert(result.remaining === 0 && result.losses === 2, 'Counter-UAS did not destroy and archive both targets');
    assert(result.vp === 2, 'Counter-UAS kills did not score the active destruction mission');
  });

  await test('commander choice prompts select intended tracks and recovered cards', async page => {
    const result = await page.evaluate(() => {
      const answers=['2','2','2','2'];window.prompt=()=>answers.shift();window.confirm=()=>true;state.us.mission=null;state.prc.mission=null;state.us.enHand=[];state.prc.enHand=[];state.us.discarded=[];state.prc.discarded=[];
      const first={side:'PRC',name:'First',loc:'lane-2',acquired:false,tags:['Fighter']};
      const second={side:'PRC',name:'Second',loc:'lane-3',acquired:false,tags:['Fighter']};
      state.tokens=[first,second];phase5AcquireEnemy('US',1);
      const acquisition={first:first.acquired,second:second.acquired};
      first.acquired=true;state.tokens=[first,second];removeEnemyTokens('US',1,null,'Test Removal');
      const remaining=state.tokens.map(t=>t.name);
      state.us.discarded=[{ID:'A',TITLE:'First Card',Type:'EN'},{ID:'B',TITLE:'Second Card',Type:'EN'}];recoverDiscardedCard('US');
      const recovered=state.us.enHand.map(c=>c.ID),discarded=state.us.discarded.map(c=>c.ID);
      state.us.enHand=[JSON.parse(JSON.stringify(getMasterCard('US-AUTH-EN-28'))),JSON.parse(JSON.stringify(getMasterCard('US-AUTH-EN-29')))];state.us.discarded=[];offerBaseDamageCancellation('US');
      return {acquisition,remaining,recovered,discarded,reactionRemaining:state.us.enHand.map(c=>c.ID),reactionUsed:state.us.discarded.map(c=>c.ID)};
    });
    assert(!result.acquisition.first && result.acquisition.second, 'reconnaissance ignored the commander\'s track choice');
    assert(result.remaining.join(',') === 'First', 'target-removal effect ignored the commander\'s choice');
    assert(result.recovered.join(',') === 'B' && result.discarded.join(',') === 'A', 'recovery ignored the commander\'s card choice');
    assert(result.reactionRemaining.join(',') === 'US-AUTH-EN-28' && result.reactionUsed.join(',') === 'US-AUTH-EN-29', 'reaction selection ignored the defending commander\'s card choice');
  });

  await test('mission scoring uses authoritative categories and no generic token VP', async page => {
    const result = await page.evaluate(() => {
      function score(mission,tok){state.us.vp=0;state.prc.vp=0;state.us.mission={title:mission};state.prc.mission=null;checkMissionVP(tok);return state.us.vp;}
      state.us.vp=0;state.us.mission={title:'COUNTER-INTERVENTION'};state.prc.squadronLedger={SQ:{remainingQty:2,maxQty:2}};
      state.tokens=[{side:'PRC',name:'Ground 1',loc:'prc-airbase',parentSqId:'SQ',tags:['Fighter']},{side:'PRC',name:'Ground 2',loc:'prc-airbase',parentSqId:'SQ',tags:['Fighter']}];
      resolveDestroyedSquadronTokens('SQ','PRC'); const groundDestruction=state.us.vp;
      return {
        attrAircraft:score('ATTRITION',{side:'PRC',loc:'lane-2',tags:['Fighter'],vp:99}),
        attrBomber:score('ATTRITION',{side:'PRC',loc:'lane-2',tags:['Bomber'],vp:99}),
        attrSquadron:score('ATTRITION',{side:'PRC',loc:'prc-airbase',tags:['Squadron'],sqRef:{},vp:99}),
        interdictionAircraft:score('INTERDICTION',{side:'PRC',loc:'lane-2',tags:['Fighter'],vp:99}),
        counterGroundAir:score('COUNTER-INTERVENTION',{side:'PRC',loc:'prc-airbase',tags:['Fighter'],vp:99}),
        counterSAM:score('COUNTER-INTERVENTION',{side:'PRC',loc:'prc-airbase',tags:['SAM'],vp:99}),
        counterSquadron:score('COUNTER-INTERVENTION',{side:'PRC',loc:'prc-airbase',tags:['Squadron'],sqRef:{},vp:99}),
        groundDestruction
      };
    });
    assert(result.attrAircraft === 1 && result.attrBomber === 3 && result.attrSquadron === 2, 'Attrition category scoring is wrong');
    assert(result.interdictionAircraft === 2, 'Interdiction aircraft scoring is wrong');
    assert(result.counterGroundAir === 3 && result.counterSAM === 0 && result.counterSquadron === 0, 'Counter-Intervention scoring is wrong');
    assert(result.groundDestruction === 6, 'aircraft destroyed with their ground squadron did not score as ground kills');
  });

  await test('initiative winner always acts first without a turn-order prompt', async page => {
    const result = await page.evaluate(() => {
      state.forcedInitiativeWinner='PRC'; state.prc.cyber=1; state.us.cyber=1;
      state.us.enHand=[]; state.prc.enHand=[]; setup.usSacrifices=[]; setup.prcSacrifices=[];
      let prompts=0; window.confirm=()=>{prompts++;return true;}; AFWI.Random.setSequence([1,1,1,1,1]);
      resolveInitiativeBid();
      return {winner:state.intelAdvSide,first:state.initiativeFirstSide,prompts};
    });
    assert(result.winner === 'PRC' && result.first === 'PRC', 'initiative winner did not receive first action');
    assert(result.prompts === 0, 'initiative resolution still asked players to select first side');
  });

  await test('standoff deployment, movement, centering, and wrapping are operational', async page => {
    const result = await page.evaluate(() => {
      state.phase='action'; state.actionLocked=false; state.turnSide='US'; state.acts={move:1,acq:1,sht:1};
      state.us.posture=POSTURES.US.find(p=>p.title==='STANDARD'); state.us.deployedSquadrons=[]; state.us.squadronLedger={}; state.tokens=[];
      const bomber=MASTER_DECK.find(c=>c.Side==='US'&&c.Type==='SQ'&&c.Tags&&c.Tags.indexOf('Bomber')>=0);
      window.confirm=()=>true; deploySquadronCard(bomber,state.us); drawUI();
      const deployed=state.us.deployedSquadrons[0], tok=state.tokens[0];
      const cardInStandoff=!!document.querySelector('#us-standoff .squadron-board-card');
      const tokensInStandoff=document.querySelectorAll('#us-standoff .token').length;
      tok.loc='us-airbase'; state.selected=tok; state.acts.move=1; move('us-standoff');
      const moved=tok.loc;
      const fighter={side:'US',cardId:'US-AUTH-SQ-05',name:'F-22',loc:'us-airbase',spd:2,tags:['Fighter']};
      state.tokens.push(fighter); state.selected=fighter; state.acts.move=1; move('us-standoff');
      const baseStyle=getComputedStyle(document.getElementById('us-airbase'));
      return {baseLoc:deployed.baseLoc,cardInStandoff,tokensInStandoff,moved,fighterLoc:fighter.loc,justify:baseStyle.justifyContent,wrap:baseStyle.flexWrap};
    });
    assert(result.baseLoc==='us-standoff' && result.cardInStandoff && result.tokensInStandoff>0, 'standoff deployment did not render the squadron and tokens');
    assert(result.moved==='us-standoff' && result.fighterLoc==='us-airbase', 'standoff movement eligibility was not enforced');
    assert(result.justify==='center' && result.wrap==='wrap', 'board containers do not center and wrap deployed forces');
  });

  await test('ATO clearing preserves match attrition but removes transient force state', async page => {
    const result = await page.evaluate(() => {
      state.us.squadronLedger={SQ:{maxQty:4,remainingQty:2,currentHp:2}}; state.us.vp=7; state.us.cyber=3; state.us.sqHand=[{}]; state.us.enHand=[{}]; state.us.discarded=[{}]; state.us.losses=[{}]; state.us.deployedSquadrons=[{}]; state.tokens=[{}]; state.us.buffs.attackMode='adv';
      AFWI.ATOState.clear();
      return {ledger:state.us.squadronLedger.SQ, vp:state.us.vp, cyber:state.us.cyber, hands:state.us.sqHand.length+state.us.enHand.length, tokens:state.tokens.length, attackMode:state.us.buffs.attackMode};
    });
    assert(result.ledger.remainingQty === 2 && result.ledger.currentHp === 2, 'match attrition was erased between ATOs');
    assert(result.vp === 7 && result.cyber === 3, 'persistent match totals were erased');
    assert(result.hands === 0 && result.tokens === 0 && result.attackMode === 'normal', 'transient ATO state was not cleared');
  });

  await test('every authoritative enabler resolves against valid game state', async page => {
    const result = await page.evaluate(() => {
      const cards=MASTER_DECK.filter(c=>c.Authoritative && c.Type==='EN');
      const failures=[];
      function buffs(){return {nextAtk:'normal',nextCyb:'normal',moveDenied:false,attackMode:'normal',acquisitionMode:'normal',airAttackMode:'normal',bomberAttackMode:'normal',contingencyAutoGenerate:false,fighterRange:null,nextAutoHit:false,nextUASReroll:false,sofProtected:false};}
      function player(side){return {cyber:1,intel:0,vp:0,navalLosses:0,airbaseStrikes:0,squadronLedger:{},draftedSquadrons:{},sqHand:[],enHand:[],discarded:[],losses:[],deployedSquadrons:[],buffs:buffs(),posture:POSTURES[side][0],lastPostureId:null,mission:MISSIONS[side][1]};}
      function token(side,name,tags){return {isBase:false,parentSqId:null,side,cardId:'TEST-'+side+'-'+name,name,loc:'lane-3',spd:1,vp:1,acqR:2,shtR:2,winchesterType:tags.indexOf('Naval')>=0?'Salvo':'Standard',hitThreshold:2,targetAcq:2,attackThreshold:2,canAttackAir:true,canAttackSurface:true,acqBonus:0,acquired:false,winchester:false,rogue:false,tags,explosive:false,salvos:4};}
      window.confirm=()=>true; window.prompt=()=> '1';
      for(const source of cards){
        for(const master of MASTER_DECK) if(master.Authoritative) master.Draftable=true;
        state.us=player('US'); state.prc=player('PRC'); state.round=1;state.maxRounds=5;state.phase='action';state.actionLocked=false;state.gameOver=false;state.engineErrors=[];state.turnSide=source.Side;state.acts={move:1,acq:1,sht:1};state.selected=null;state.sqDeployedThisTurn=0;pendingAttack=null;
        state.tokens=[token('US','UAS',['UAS']),token('US','SHIP',['Naval','SAG','SAM']),token('US','FIGHTER',['Fighter']),token('PRC','UAS',['UAS']),token('PRC','SHIP',['Naval','SAG','SAM']),token('PRC','FIGHTER',['Fighter'])];
        const p=state[source.Side.toLowerCase()], enemy=state[source.Side==='US'?'prc':'us'];
        const lost=token(source.Side,'LOST AIRCRAFT',['Fighter']); lost.parentSqId='LOST-SQ'; p.losses=[lost]; p.squadronLedger['LOST-SQ']={cardId:'LOST-SQ',name:'Lost Squadron',maxHp:2,currentHp:2,maxQty:1,remainingQty:0,destroyed:false};
        const depleted=source.Side==='PRC'?getMasterCard('PRC-AUTH-SQ-06'):getMasterCard('US-AUTH-SQ-10');
        p.squadronLedger[depleted.ID]={cardId:depleted.ID,name:depleted.TITLE,maxHp:2,currentHp:2,maxQty:depleted.Qty,remainingQty:0,destroyed:false};
        p.discarded=[{ID:'SPENT-PLASSF',Side:source.Side,Type:'EN',TITLE:'Spent Card',EQ:'Cyber',DESC:'Spent',Use:'Multiple',Draftable:true,Family:'PLASSF (Cyber)'},{ID:'SPENT-SQ',Side:source.Side,Type:'SQ',TITLE:'Spent Squadron',EQ:'Fighter',DESC:'Spent',Draftable:true}];
        p.enHand=[JSON.parse(JSON.stringify(source))]; enemy.enHand=[];
        AFWI.Random.setSequence(new Array(40).fill(4));
        try{
          playCard(source.Side,false,0);
          if(p.enHand.some(c=>c.ID===source.ID)) failures.push(source.ID+': remained in hand');
          if(state.engineErrors.length) failures.push(source.ID+': '+state.engineErrors.map(e=>e.message).join('; '));
        }catch(error){failures.push(source.ID+': '+error.message);}
      }
      return {count:cards.length,failures};
    });
    assert(result.count === 68, `expected 68 authoritative enablers, found ${result.count}`);
    assert(result.failures.length === 0, `enabler failures: ${result.failures.join(' | ')}`);
  });

  await test('full five-ATO match simulation reaches a stable final game state', async page => {
    const result = await page.evaluate(() => {
      state.us.mission=null; state.prc.mission=null; state.us.vp=5; state.prc.vp=3; state.maxRounds=5;
      let completed=0;
      const original=showInterstitial;
      showInterstitial=(m,s,cb)=>cb();
      while(!state.gameOver && completed<5){
        state.phase='action'; state.actionLocked=false; state.tokens=[]; state.consecutivePasses=0;
        endRound(); completed++;
      }
      showInterstitial=original;
      return {completed,round:state.round,max:state.maxRounds,over:state.gameOver,phase:state.phase,winner:document.getElementById('go-winner').innerText,errors:state.engineErrors.slice()};
    });
    assert(result.completed === 5 && result.round === 6 && result.max === 5, 'five-ATO match length failed');
    assert(result.over && result.phase === 'gameOver' && result.winner === 'US FORCES WIN', 'final match result was not rendered');
    assert(result.errors.length === 0, `engine validation errors: ${result.errors.join(' | ')}`);
  });

  await test('complete first-ATO hot-seat playthrough advances the standard match', async page => {
    await page.click('#landing-ui button');
    await page.click('#btn-begin-setup');

    // US setup: one legal squadron is enough to complete an under-limit draft.
    await page.click('#posture-list .card');
    await page.click('#setup-step-1 .btn');
    await page.locator('#mission-list .card').filter({hasText:'ATTRITION'}).click();
    await page.click('#setup-step-2 .btn');
    await page.locator('#draft-pool-sq .card').filter({hasText:'F-22'}).first().click();
    await page.click('#btn-confirm-draft');
    await page.click('#interstitial-ui > .btn');

    // PRC setup.
    await page.click('#posture-list .card');
    await page.click('#setup-step-1 .btn');
    await page.locator('#mission-list .card').filter({hasText:'ATTRITION'}).click();
    await page.click('#setup-step-2 .btn');
    await page.locator('#draft-pool-sq .card').filter({hasText:'J-10'}).first().click();
    await page.click('#btn-confirm-draft');
    await page.evaluate(() => AFWI.Random.setSequence([4,1,1,1,1,1,1,1]));
    await page.click('#interstitial-ui > .btn');

    // Initiative and private intel handoff.
    await page.click('#btn-bid-start');
    await page.click('#btn-submit-bid');
    await page.click('#btn-bid-start');
    await page.click('#btn-submit-bid');
    await page.click('#interstitial-ui > .btn');
    assert(/US will act first/i.test(await page.textContent('#intel-result-box')), 'private intel summary did not show the initiative winner acting first');
    await page.click('#btn-intel-next');
    await page.click('#interstitial-ui > .btn');
    assert(await page.isVisible('#game-ui'), 'action board did not open after initiative/intel');

    const result = await page.evaluate(() => {
      window.confirm=()=>true;
      // Deploy the current side, hand off, and deploy the opponent.
      playCard(state.turnSide,true,0);
      const first=state.turnSide;
      endTurn(); dismissInterstitial();
      playCard(state.turnSide,true,0);
      const second=state.turnSide;
      endTurn(); dismissInterstitial();

      // Aircraft begin at their airbases. Stage both fighter forces forward,
      // then move each force to the center on its next turn.
      let mover=state.tokens.find(t=>t.side===state.turnSide);
      state.selected=mover; move(state.turnSide==='PRC'?'lane-2':'lane-4'); endTurn(); dismissInterstitial();
      mover=state.tokens.find(t=>t.side===state.turnSide);
      state.selected=mover; move(state.turnSide==='PRC'?'lane-2':'lane-4'); endTurn(); dismissInterstitial();
      mover=state.tokens.find(t=>t.side===state.turnSide);
      state.selected=mover; move('lane-3'); endTurn(); dismissInterstitial();
      mover=state.tokens.find(t=>t.side===state.turnSide);
      state.selected=mover; move('lane-3'); endTurn(); dismissInterstitial();

      // Both commanders acquire a target.
      let attacker=state.tokens.find(t=>t.side===state.turnSide);
      let target=state.tokens.find(t=>t.side!==state.turnSide);
      AFWI.Random.setSequence([4,1]); state.selected=attacker; select(target); endTurn(); dismissInterstitial();
      attacker=state.tokens.find(t=>t.side===state.turnSide);
      target=state.tokens.find(t=>t.side!==state.turnSide);
      AFWI.Random.setSequence([4,1]); state.selected=attacker; select(target); endTurn(); dismissInterstitial();

      // The first side fires, then two consecutive passes close ATO 1.
      attacker=state.tokens.find(t=>t.side===state.turnSide);
      target=state.tokens.find(t=>t.side!==state.turnSide && t.acquired);
      AFWI.Random.setSequence([4,1]); state.selected=attacker; select(target);
      const afterShot={tokens:state.tokens.length,usVP:state.us.vp,prcVP:state.prc.vp};
      passTurn(); dismissInterstitial(); passTurn(); dismissInterstitial();
      return {first,second,afterShot,over:state.gameOver,phase:state.phase,round:state.round,setupVisible:document.getElementById('setup-ui').style.display==='block',errors:state.engineErrors.slice()};
    });
    assert(result.first !== result.second, 'hot-seat side handoff did not alternate');
    assert(result.afterShot.tokens === 7, 'fighter engagement did not destroy exactly one aircraft');
    assert(result.afterShot.usVP + result.afterShot.prcVP === 1, 'Attrition kill did not score 1 VP');
    assert(!result.over && result.phase === 'draft' && result.round === 2 && result.setupVisible, 'consecutive passes did not advance the five-ATO match to ATO 2 setup');
    assert(result.errors.length === 0, `full-flow engine errors: ${result.errors.join(' | ')}`);
  });

  await test('landing-to-standard-match setup UI navigation', async page => {
    await page.click('#landing-ui button');
    assert(await page.isVisible('#scenario-ui'), 'scenario screen did not open');
    const summary = await page.textContent('#scenario-ui');
    assert(/Five ATO cycles/i.test(summary) && !await page.$('#campaign-list'), 'standard match briefing is incorrect');
    await page.click('#btn-begin-setup');
    assert(await page.isVisible('#setup-ui'), 'standard match did not enter player setup');
    const header = await page.textContent('#setup-header');
    assert(/US PLAYER/i.test(header), 'US setup did not start first');
  });

  await browser.close();
  const failures = results.filter(result => result.status === 'FAIL');
  process.stdout.write(`\n${results.length - failures.length}/${results.length} playtests passed.\n`);
  if (failures.length) {
    process.stderr.write(JSON.stringify(failures, null, 2) + '\n');
    process.exit(1);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
