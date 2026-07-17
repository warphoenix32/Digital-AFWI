const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

const gameUrl = pathToFileURL(path.resolve(__dirname, '..', 'AFWI.html')).href;
const chromePath = process.env.AFWI_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const browser = await chromium.launch({headless:true, executablePath:chromePath, args:['--no-sandbox','--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport:{width:1680,height:1050}});
  const runtimeErrors=[];
  page.on('pageerror', error=>runtimeErrors.push(error.message));
  page.on('console', message=>{if(message.type()==='error') runtimeErrors.push(message.text());});
  page.on('dialog', dialog=>dialog.accept());
  await page.goto(gameUrl,{waitUntil:'load'});

  const exhaustive = await page.evaluate(() => {
    const cards=MASTER_DECK.filter(c=>c.Authoritative&&c.Type==='EN');
    const failures=[];
    const coverage={US:0,PRC:0,generated:0,reaction:0,cyberIntel:0,recovery:0};
    function buffs(){return {nextAtk:'normal',nextCyb:'normal',moveDenied:false,attackMode:'normal',acquisitionMode:'normal',airAttackMode:'normal',bomberAttackMode:'normal',contingencyAutoGenerate:false,fighterRange:null,nextAutoHit:false,nextUASReroll:false,sofProtected:false};}
    function player(side){return {cyber:1,intel:0,vp:0,navalLosses:0,airbaseStrikes:0,squadronLedger:{},draftedSquadrons:{},sqHand:[],enHand:[],discarded:[],losses:[],deployedSquadrons:[],buffs:buffs(),posture:POSTURES[side][0],lastPostureId:null,mission:MISSIONS[side][1]};}
    function token(side,name,tags){return {isBase:false,parentSqId:null,side,cardId:'TEST-'+side+'-'+name,name,loc:'lane-3',spd:1,vp:1,acqR:2,shtR:2,winchesterType:tags.indexOf('Naval')>=0?'Salvo':'Standard',hitThreshold:2,targetAcq:2,attackThreshold:2,canAttackAir:true,canAttackSurface:true,acqBonus:0,acquired:false,winchester:false,rogue:false,tags,explosive:false,salvos:4};}
    window.confirm=()=>true; window.prompt=()=> '1';
    for(const source of cards){
      coverage[source.Side]++;
      if(/generate:/i.test(source.DESC||'')) coverage.generated++;
      if(/play immediately|play anytime|cancel/i.test(source.DESC||'')) coverage.reaction++;
      if(/cyber|intel|acquire/i.test((source.EQ||'')+' '+(source.DESC||''))) coverage.cyberIntel++;
      if(/recover|return any spent|return any discarded|regenerated/i.test(source.DESC||'')) coverage.recovery++;
      for(const master of MASTER_DECK) if(master.Authoritative) master.Draftable=true;
      state.us=player('US'); state.prc=player('PRC'); state.round=1; state.maxRounds=5; state.phase='action'; state.actionLocked=false; state.gameOver=false; state.engineErrors=[]; state.turnSide=source.Side; state.acts={move:1,acq:1,sht:1}; state.selected=null; state.sqDeployedThisTurn=0; pendingAttack=null;
      state.tokens=[token('US','UAS',['UAS']),token('US','SHIP',['Naval','SAG','SAM']),token('US','FIGHTER',['Fighter']),token('PRC','UAS',['UAS']),token('PRC','SHIP',['Naval','SAG','SAM']),token('PRC','FIGHTER',['Fighter'])];
      const p=state[source.Side.toLowerCase()], enemy=state[source.Side==='US'?'prc':'us'];
      const lost=token(source.Side,'LOST AIRCRAFT',['Fighter']); lost.parentSqId='LOST-SQ'; p.losses=[lost]; p.squadronLedger['LOST-SQ']={cardId:'LOST-SQ',name:'Lost Squadron',maxHp:2,currentHp:2,maxQty:1,remainingQty:0,destroyed:false};
      const depleted=source.Side==='PRC'?getMasterCard('PRC-AUTH-SQ-06'):getMasterCard('US-AUTH-SQ-10');
      p.squadronLedger[depleted.ID]={cardId:depleted.ID,name:depleted.TITLE,maxHp:2,currentHp:2,maxQty:depleted.Qty,remainingQty:0,destroyed:false};
      p.discarded=[{ID:'SPENT-PLASSF',Side:source.Side,Type:'EN',TITLE:'Spent Card',EQ:'Cyber',DESC:'Spent',Use:'Multiple',Draftable:true,Family:'PLASSF (Cyber)'},{ID:'SPENT-SQ',Side:source.Side,Type:'SQ',TITLE:'Spent Squadron',EQ:'Fighter',DESC:'Spent',Draftable:true}];
      p.enHand=[JSON.parse(JSON.stringify(source))]; enemy.enHand=[]; AFWI.Random.setSequence(new Array(40).fill(4));
      try{
        playCard(source.Side,false,0);
        if(p.enHand.some(c=>c.ID===source.ID)) failures.push(source.ID+': remained in hand');
        if(state.engineErrors.length) failures.push(source.ID+': '+state.engineErrors.map(e=>e.message).join('; '));
      }catch(error){failures.push(source.ID+': '+error.message);}
    }
    return {count:cards.length,coverage,failures};
  });
  assert(exhaustive.count===68,'expected 68 authoritative enablers');
  assert(exhaustive.coverage.US===34&&exhaustive.coverage.PRC===34,'enabler side coverage is incomplete');
  assert(exhaustive.coverage.generated>0&&exhaustive.coverage.reaction>0&&exhaustive.coverage.cyberIntel>0&&exhaustive.coverage.recovery>0,'enabler category coverage is incomplete');
  assert(exhaustive.failures.length===0,`exhaustive enabler failures: ${exhaustive.failures.join(' | ')}`);
  process.stdout.write(`PASS exhaustive registry: ${exhaustive.count}/68 enablers (${exhaustive.coverage.US} US, ${exhaustive.coverage.PRC} PRC)\n`);

  const generated = await page.evaluate(() => {
    function reset(side){AFWI.ATOState.clear(); state.phase='action';state.actionLocked=false;state.turnSide=side;state.acts={move:1,acq:1,sht:1};state.engineErrors=[];window.confirm=()=>true;window.prompt=()=> '3';}
    function play(id,side){reset(side);const p=state[side.toLowerCase()];p.enHand=[JSON.parse(JSON.stringify(getMasterCard(id)))];playCard(side,false,0);return state.tokens.map(t=>({name:t.name,loc:t.loc,generated:t.generatedByEnabler}));}
    return {ec130:play('US-AUTH-EN-20','US'),ada:play('US-AUTH-EN-26','US'),j15:play('PRC-AUTH-EN-26','PRC')};
  });
  assert(generated.ec130.some(t=>t.generated&&t.loc==='lane-3'),'EC-130 generation/location failed');
  assert(generated.ada.some(t=>t.generated&&t.loc==='us-airbase'),'US ADA Airbase generation failed');
  assert(generated.j15.filter(t=>t.generated&&t.loc==='lane-3').length===4,'J-15 generated force quantity/location failed');
  process.stdout.write('PASS generated-unit quantities and explicit locations\n');

  const reactions = await page.evaluate(() => {
    window.confirm=()=>true; state.phase='action';state.actionLocked=false;state.turnSide='PRC';state.acts={move:1,acq:1,sht:1};state.prc.vp=0;state.prc.mission={title:'ATTRITION'};
    state.us.enHand=[JSON.parse(JSON.stringify(getMasterCard('US-AUTH-EN-19')))];state.us.discarded=[];
    const attacker={side:'PRC',name:'J-10',loc:'lane-3',shtR:1,attackThreshold:3,canAttackAir:true,canAttackSurface:false,explosive:false,winchesterType:'Standard',winchester:false,tags:['Fighter']};
    const target={side:'US',name:'F-16',loc:'lane-3',acquired:true,parentSqId:null,tags:['Fighter']};
    state.tokens=[attacker,target];AFWI.Random.setSequence([4,1]);resolveCommittedAttack(attacker,target,state.prc,false,null);
    const decoy={targetPresent:state.tokens.indexOf(target)>=0,hand:state.us.enHand.length,discard:state.us.discarded.length,vp:state.prc.vp};
    state.phase='action';state.actionLocked=false;state.turnSide='US';state.us.discarded=[];state.prc.discarded=[];
    state.us.enHand=[JSON.parse(JSON.stringify(getMasterCard('US-AUTH-EN-33')))];state.prc.enHand=[JSON.parse(JSON.stringify(getMasterCard('PRC-AUTH-EN-30')))];state.tokens=[{side:'PRC',name:'PRC Ship',loc:'lane-3',tags:['Naval','SAG']}];
    playCard('US',false,0);
    return {decoy,submarine:{shipPresent:state.tokens.length===1,usHand:state.us.enHand.length,prcHand:state.prc.enHand.length,usDiscard:state.us.discarded.length,prcDiscard:state.prc.discarded.length}};
  });
  assert(reactions.decoy.targetPresent&&reactions.decoy.hand===0&&reactions.decoy.discard===1&&reactions.decoy.vp===0,'Air Launched Decoy reaction failed');
  assert(reactions.submarine.shipPresent&&reactions.submarine.usHand===0&&reactions.submarine.prcHand===0&&reactions.submarine.usDiscard===1&&reactions.submarine.prcDiscard===1,'submarine counter-reaction failed');
  process.stdout.write('PASS reaction and cancellation timing\n');

  const domains = await page.evaluate(() => {
    window.confirm=()=>true;window.prompt=()=> '1';state.phase='action';state.actionLocked=false;state.gameOver=false;state.engineErrors=[];
    state.turnSide='US';state.us.cyber=1;state.us.enHand=[JSON.parse(JSON.stringify(getMasterCard('US-AUTH-EN-05')))];AFWI.Random.setSequence([4]);playCard('US',false,0);const cyber=state.us.cyber;
    const enemy={side:'PRC',name:'Track',loc:'lane-3',acquired:false,tags:['Fighter']};state.tokens=[enemy];phase5AcquireEnemy('US',1);const acquired=enemy.acquired;
    state.prc.cyber=1;state.turnSide='PRC';state.prc.enHand=[JSON.parse(JSON.stringify(getMasterCard('PRC-AUTH-EN-20')))];state.tokens=[{side:'US',name:'UAS',loc:'lane-3',parentSqId:null,tags:['UAS']}];playCard('PRC',false,0);const uasRemaining=state.tokens.filter(t=>t.side==='US'&&t.tags&&t.tags.indexOf('UAS')>=0).length;
    return {cyber,acquired,uasRemaining,errors:state.engineErrors.slice()};
  });
  assert(domains.cyber===2,'cyber enabler did not improve the Cyber Rate');
  assert(domains.acquired,'intel/reconnaissance enabler path did not acquire the target');
  assert(domains.uasRemaining===0,'Counter-UAS enabler did not destroy the target');
  assert(domains.errors.length===0,`domain enabler errors: ${domains.errors.join(' | ')}`);
  process.stdout.write('PASS cyber, intel, and Counter-UAS effects\n');

  assert(runtimeErrors.length===0,`browser runtime errors: ${runtimeErrors.join(' | ')}`);
  process.stdout.write('PASS enabler-focused browser playtest: 4/4 groups\n');
  await browser.close();
}

main().catch(error=>{process.stderr.write(`${error.stack||error.message}\n`);process.exit(1);});
