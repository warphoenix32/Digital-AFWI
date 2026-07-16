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

  await test('boot, content validation, and five-campaign selector', async page => {
    const result = await page.evaluate(() => ({
      title: document.title,
      version: AFWI.Build.buildVersion,
      campaigns: CAMPAIGNS.map(c => ({ title: c.title, rounds: c.rounds })),
      validation: AFWI.Validator.validateContent(),
      selected: state.campaign && state.campaign.id,
      buttons: document.querySelectorAll('#campaign-list .card').length,
      corruptedPrcTitles: MASTER_DECK.filter(c => c.Side==='PRC' && c.Authoritative && /[ÃÂæçéå]/.test(c.TITLE||'')).map(c=>c.ID),
      mediumAda: getMasterCard('PRC-AUTH-SQ-02'),
      longAda: getMasterCard('PRC-AUTH-SQ-05'),
      prcAew: getMasterCard('PRC-AUTH-SQ-04'),
      specialMission: getMasterCard('PRC-AUTH-EN-08').DESC
    }));
    assert(result.title === 'AFWI 1.0 Final', 'final title missing');
    assert(result.version === '1.0.1-final-phase1', 'final build version missing');
    assert(result.campaigns.length === 5, 'five campaigns were not registered');
    assert(result.campaigns.map(c => c.rounds).join(',') === '1,2,5,2,2', 'campaign ATO lengths are incorrect');
    assert(result.validation.valid && result.validation.errors.length === 0, 'content validation failed');
    assert(result.selected === 'campaign-1' && result.buttons === 5, 'default campaign selector is not playable');
    assert(result.corruptedPrcTitles.length === 0, `corrupted PRC titles: ${result.corruptedPrcTitles.join(',')}`);
    assert(result.mediumAda.Spd === 0 && result.mediumAda.ShtR === 2 && result.longAda.Spd === 0 && result.longAda.ShtR === 4, 'PRC ADA profiles are not operational');
    assert(result.prcAew.Tags.join(',') === 'AEW', 'PRC AEW was incorrectly tagged as a fifth-generation fighter');
    assert(!/\bOR\s*$/i.test(result.specialMission), 'Special Mission Aircraft still has an incomplete rules sentence');
  });

  await test('campaign-specific force restrictions', async page => {
    const result = await page.evaluate(() => {
      function visible(campaignIndex, side) {
        selectCampaign(campaignIndex);
        return MASTER_DECK.filter(c => c.Side === side && c.Draftable && cardAllowedByCampaign(c)).map(c => c.ID);
      }
      const meetingUS = visible(0, 'US');
      const meetingPRC = visible(0, 'PRC');
      const worldUS = visible(3, 'US');
      const reservesUS = visible(4, 'US');
      const reservesPRC = visible(4, 'PRC');
      return {
        meetingUS, meetingPRC, worldUS, reservesUS, reservesPRC,
        meetingNoEnablers: meetingUS.every(id => getMasterCard(id).Type === 'SQ') && meetingPRC.every(id => getMasterCard(id).Type === 'SQ'),
        worldHasForbidden: worldUS.some(id => { const c=getMasterCard(id); return c.Tags && c.Tags.indexOf('Bomber') >= 0 || /special operations|long.range missile/i.test((c.TITLE||'')+' '+(c.DESC||'')); }),
        reservesHasForbidden: reservesUS.concat(reservesPRC).some(id => { const c=getMasterCard(id); return c.Tags && (c.Tags.indexOf('Gen5') >= 0 || c.Tags.indexOf('Bomber') >= 0) || c.Side==='PRC' && c.Tags && c.Tags.indexOf('SAM') >= 0 && /Long Range|SA-21/i.test((c.TITLE||'')+' '+(c.EQ||'')); })
      };
    });
    assert(result.meetingNoEnablers, 'Meeting Engagement exposed enablers');
    assert(result.meetingUS.length === 1 && result.meetingPRC.length === 1, 'Meeting Engagement did not lock the prescribed forces');
    assert(!result.worldHasForbidden, 'World Watches exposed a forbidden capability');
    assert(!result.reservesHasForbidden, 'Reserves exposed a forbidden capability');
  });

  await test('posture restrictions and zero-cost draft exceptions', async page => {
    const result = await page.evaluate(() => {
      selectCampaign(2);
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
        aew: MASTER_DECK.find(c => c.Side==='US' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('AEW')>=0),
        ada: MASTER_DECK.find(c => c.Side==='US' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('SAM')>=0),
        prcFighter: MASTER_DECK.find(c => c.Side==='PRC' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('Fighter')>=0),
        prcUas: MASTER_DECK.find(c => c.Side==='PRC' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('UAS')>=0),
        prcBomber: MASTER_DECK.find(c => c.Side==='PRC' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('Bomber')>=0),
        prcAew: MASTER_DECK.find(c => c.Side==='PRC' && c.Type==='SQ' && c.Tags && c.Tags.indexOf('AEW')>=0)
      };
      state.us.posture=POSTURES.US.find(p=>p.title==='STANDARD');
      window.confirm = () => false;
      const normal = {
        fighter: getDeploymentLocation(cards.fighter),
        uas: getDeploymentLocation(cards.uas),
        bomber: getDeploymentLocation(cards.bomber),
        aew: getDeploymentLocation(cards.aew),
        ada: cards.ada ? getDeploymentLocation(cards.ada) : 'us-airbase',
        prcFighter: getDeploymentLocation(cards.prcFighter),
        prcUas: getDeploymentLocation(cards.prcUas),
        prcBomber: getDeploymentLocation(cards.prcBomber),
        prcAew: getDeploymentLocation(cards.prcAew)
      };
      window.confirm = () => true;
      return {normal,contingency:getDeploymentLocation(cards.fighter)};
    });
    assert(Object.values(result.normal).slice(0,5).every(loc=>loc==='us-airbase'), 'a US squadron did not generate at the US airbase');
    assert(Object.values(result.normal).slice(5).every(loc=>loc==='prc-airbase'), 'a PRC squadron did not generate at the PRC airbase');
    assert(result.contingency === 'us-contingency', 'US contingency selection was not honored');
  });

  await test('Enabler cards retain their explicit generation locations', async page => {
    const result = await page.evaluate(() => {
      const ada=getMasterCard('US-AUTH-EN-26'), ec130=getMasterCard('US-AUTH-EN-20'), j15=getMasterCard('PRC-AUTH-EN-26');
      window.confirm=()=>false; window.prompt=()=> '3';
      const adaBase=chooseGeneratedLocation(ada,'US');
      window.confirm=()=>true;
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
    assert(!result.usDraftable && !result.prcDraftable, 'cancelled single-use cards were not removed from the campaign pool');
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
      function score(mission,tok){state.us.vp=0;state.prc.vp=0;state.us.mission={title:mission};state.prc.mission=null;state.campaign=null;checkMissionVP(tok);return state.us.vp;}
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

  await test('World Watches ATO bonus is capped and drives next initiative', async page => {
    const result = await page.evaluate(() => {
      selectCampaign(3); state.us.vp=0; state.prc.vp=0; state.us.mission=null; state.prc.mission=null;
      phase5Metrics.US.airKills=0; phase5Metrics.US.worldOpinionVP=0; phase5Metrics.PRC.airKills=0;
      for(let i=0;i<3;i++) checkMissionVP({side:'PRC',loc:'lane-2',tags:['Fighter']});
      state.round=1; state.phase='action'; state.actionLocked=false; state.tokens=[]; state.maxRounds=2;
      const original=showInterstitial; showInterstitial=(m,s,cb)=>cb();
      endRound(); showInterstitial=original;
      return { vp:state.us.vp, round:state.round, initiative:state.worldOpinionInitiative };
    });
    assert(result.vp === 2, 'World Watches bonus exceeded or missed the +2/ATO cap');
    assert(result.round === 2 && result.initiative === 'US', 'World Watches did not carry air-victory initiative into ATO 2');
  });

  await test('Reserves campaign awards intact drafted squadrons once at campaign end', async page => {
    const result = await page.evaluate(() => {
      selectCampaign(4); state.us.vp=0; state.prc.vp=0; state.us.mission=null; state.prc.mission=null;
      state.us.draftedSquadrons={A:true,B:true}; state.prc.draftedSquadrons={C:true};
      state.us.squadronLedger={A:{currentHp:2},B:{currentHp:0}}; state.prc.squadronLedger={C:{currentHp:1}};
      state.round=2;state.maxRounds=2;state.phase='action';state.actionLocked=false;state.tokens=[];
      endRound();
      const first={us:state.us.vp,prc:state.prc.vp,over:state.gameOver};
      state.actionLocked=false; endRound();
      return {first,us:state.us.vp,prc:state.prc.vp};
    });
    assert(result.first.over && result.first.us === 1 && result.first.prc === 1, 'Reserves intact-squadron bonus was wrong');
    assert(result.us === 1 && result.prc === 1, 'campaign-end reserves bonus scored more than once');
  });

  await test('ATO clearing preserves campaign attrition but removes transient force state', async page => {
    const result = await page.evaluate(() => {
      state.us.squadronLedger={SQ:{maxQty:4,remainingQty:2,currentHp:2}}; state.us.vp=7; state.us.cyber=3; state.us.sqHand=[{}]; state.us.enHand=[{}]; state.us.discarded=[{}]; state.us.losses=[{}]; state.us.deployedSquadrons=[{}]; state.tokens=[{}]; state.us.buffs.attackMode='adv';
      AFWI.ATOState.clear();
      return {ledger:state.us.squadronLedger.SQ, vp:state.us.vp, cyber:state.us.cyber, hands:state.us.sqHand.length+state.us.enHand.length, tokens:state.tokens.length, attackMode:state.us.buffs.attackMode};
    });
    assert(result.ledger.remainingQty === 2 && result.ledger.currentHp === 2, 'campaign attrition was erased between ATOs');
    assert(result.vp === 7 && result.cyber === 3, 'persistent campaign totals were erased');
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
        state.us=player('US'); state.prc=player('PRC'); state.round=1;state.maxRounds=5;state.phase='action';state.actionLocked=false;state.gameOver=false;state.engineErrors=[];state.turnSide=source.Side;state.acts={move:1,acq:1,sht:1};state.selected=null;state.sqDeployedThisTurn=0;pendingAttack=null;state.campaign=CAMPAIGNS[2];
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

  await test('full five-ATO campaign simulation reaches a stable final game state', async page => {
    const result = await page.evaluate(() => {
      selectCampaign(2); state.us.mission=null; state.prc.mission=null; state.us.vp=5; state.prc.vp=3;
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
    assert(result.completed === 5 && result.round === 6 && result.max === 5, 'five-ATO campaign length failed');
    assert(result.over && result.phase === 'gameOver' && result.winner === 'US FORCES WIN', 'final campaign result was not rendered');
    assert(result.errors.length === 0, `engine validation errors: ${result.errors.join(' | ')}`);
  });

  await test('complete Meeting Engagement hot-seat playthrough', async page => {
    await page.click('#landing-ui button');
    await page.click('#btn-begin-campaign');

    // US setup: the campaign restricts both choices and the force pool to one.
    await page.click('#posture-list .card');
    await page.click('#setup-step-1 .btn');
    await page.click('#mission-list .card');
    await page.click('#setup-step-2 .btn');
    await page.click('#draft-pool-sq .card');
    await page.click('#btn-confirm-draft');
    await page.click('#interstitial-ui > .btn');

    // PRC setup.
    await page.click('#posture-list .card');
    await page.click('#setup-step-1 .btn');
    await page.click('#mission-list .card');
    await page.click('#setup-step-2 .btn');
    await page.click('#draft-pool-sq .card');
    await page.click('#btn-confirm-draft');
    await page.evaluate(() => AFWI.Random.setSequence([4,1,1,1,1,1,1,1]));
    await page.click('#interstitial-ui > .btn');

    // Initiative and private intel handoff.
    await page.click('#btn-bid-start');
    await page.click('#btn-submit-bid');
    await page.click('#btn-bid-start');
    await page.click('#btn-submit-bid');
    await page.click('#interstitial-ui > .btn');
    assert(/PRC will act first/i.test(await page.textContent('#intel-result-box')), 'private intel summary did not show the initiative winner\'s selected first side');
    await page.click('#btn-intel-next');
    await page.click('#interstitial-ui > .btn');
    assert(await page.isVisible('#game-ui'), 'action board did not open after initiative/intel');

    const result = await page.evaluate(() => {
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

      // The first side fires, then two consecutive passes close the one-ATO campaign.
      attacker=state.tokens.find(t=>t.side===state.turnSide);
      target=state.tokens.find(t=>t.side!==state.turnSide && t.acquired);
      AFWI.Random.setSequence([4,1]); state.selected=attacker; select(target);
      const afterShot={tokens:state.tokens.length,usVP:state.us.vp,prcVP:state.prc.vp};
      passTurn(); dismissInterstitial(); passTurn();
      return {first,second,afterShot,over:state.gameOver,phase:state.phase,round:state.round,errors:state.engineErrors.slice()};
    });
    assert(result.first !== result.second, 'hot-seat side handoff did not alternate');
    assert(result.afterShot.tokens === 7, 'fighter engagement did not destroy exactly one aircraft');
    assert(result.afterShot.usVP + result.afterShot.prcVP === 1, 'Meeting Engagement Attrition kill did not score 1 VP');
    assert(result.over && result.phase === 'gameOver' && result.round === 2, 'consecutive passes did not finish the one-ATO campaign');
    assert(result.errors.length === 0, `full-flow engine errors: ${result.errors.join(' | ')}`);
  });

  await test('landing-to-campaign setup UI navigation', async page => {
    await page.click('#landing-ui button');
    assert(await page.isVisible('#scenario-ui'), 'scenario screen did not open');
    await page.click('#campaign-list .card:nth-child(3)');
    const summary = await page.textContent('#campaign-summary');
    assert(/5 ATO/i.test(summary), 'campaign selection did not update the summary');
    await page.click('#btn-begin-campaign');
    assert(await page.isVisible('#setup-ui'), 'campaign did not enter player setup');
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
