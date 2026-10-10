"use strict";

/* UI LAYER - rendering is split by game system so future features stay local. */
function renderHeader(){
  const fs=fleet(),mc=monthlyCost(),online=operating(),p=priceAt(state.time),forecast=settlementForecast(),runway=mc.total?state.cash/mc.total:Infinity;
  const tickerBtc=value=>fmtBtc(value).replace(/ BTC$/,"");
  const exp=online?expectedDay():0;
  const speedButtons=[0,.5,1,2,4,8,16].map(s=>`<button class="speed ${state.speed===s?"active":""}" data-action="speed" data-value="${s}" aria-label="${s===0?"Pause":s+" times speed"}">${s===0?"Ⅱ":s+"×"}</button>`).join("");
  const mobileSections={play:{label:"Play",detail:"Time & session",tabs:["dashboard","ledger"]},operate:{label:"Operate",detail:"Fleet & site",tabs:["mine","facilities","energy","pools"]},treasury:{label:"Treasury",detail:"Capital & keys",tabs:["market","custody","finance"]},learn:{label:"Learn",detail:"Knowledge & rules",tabs:["learn","tech","method"]}},section=mobileSections[mobileMenuSection]||mobileSections.play;
  const mobileNav=`<section class="mobile-nav ${mobileMenuOpen?"open":""}" aria-label="Mobile navigation"><div class="mobile-menu-sections">${Object.entries(mobileSections).map(([id,item])=>`<button class="${mobileMenuSection===id?"active":""}" data-action="mobile-menu-section" data-value="${id}"><b>${item.label}</b><small>${item.detail}</small></button>`).join("")}</div><div class="mobile-menu-panel"><div class="mobile-menu-panel-head"><span>${section.label}</span><b>${section.detail}</b></div>${mobileMenuSection==="play"?`<div class="mobile-speed-panel"><div><span>Simulation speed</span><b data-live-speed-panel>${state.speed?`${state.speed}× running`:"Paused"}</b></div><div class="mobile-speeds" aria-label="Mobile simulation speed">${speedButtons}</div></div>`:""}<div class="mobile-nav-tabs">${section.tabs.map(t=>`<button class="${tabIsActive(t)?"active":""}" data-action="tab" data-value="${t}">${t}</button>`).join("")}</div></div></section>`;
  return `<header class="topbar">
    <div class="brand"><a class="coin" href="https://bitcoin.org/bitcoin.pdf" target="_blank" rel="noopener noreferrer" title="Read the Bitcoin whitepaper (opens in a new tab)" aria-label="Read the Bitcoin whitepaper (opens in a new tab)">₿</a><div><div class="brand-name">TIMECHAIN</div><div class="brand-sub">${APP_RELEASE} · seed ${state.seed}</div></div></div>
    <div class="era-chip" title="Era: ${eraAt(state.time)}"><strong><span class="era-full">${eraAt(state.time)}</span><span class="era-short">${eraShortAt(state.time)}</span></strong></div>
    ${topbarCashHtml(forecast)}
    <div class="clock"><strong id="live-date">${dateFmt(state.time)}</strong><span id="live-block">BLOCK ~${fmtNum(approxHeight(state.time))}</span></div>
    <div class="speeds" aria-label="Simulation speed">${speedButtons}</div>
    <div class="save-state${saveFailing?" save-failing":""}">${saveStateHtml()}</div>
    <button class="game-menu-button" data-action="game-menu" aria-expanded="${gameMenuOpen}" aria-controls="game-menu" title="Tutorial, saves, settings and feedback">${roomIcon("more")}<span>Game</span></button>
    <button class="mobile-pause-button ${state.speed?"running":"paused"}" data-action="speed" data-value="${state.speed?0:(state.returnSpeed||1)}" aria-label="${state.speed?"Pause simulation":"Run simulation"}"><span class="pause-icon" aria-hidden="true">${state.speed?"Ⅱ":"▶"}</span><span class="pause-label">${state.speed?"Pause":"Run"}</span></button>
    <button class="mobile-menu-button ${mobileMenuOpen?"active":""}" data-action="mobile-menu" aria-label="Menu, ${mobileMenuOpen?"close":"open"} navigation" aria-expanded="${mobileMenuOpen}"><i></i><i></i><i></i><span>Menu</span></button>
  </header>
  <div class="hud" aria-label="Operation status">
    <div class="hud-data">
      <div class="hud-item"><span class="hud-label">Next bill</span><strong id="live-next-bill" class="hud-value ${forecast.cashAfter<0?"red":forecast.cashAfter<forecast.estimated*.2?"orange":""}">${fmtUsd(forecast.estimated)}</strong><small id="live-next-bill-detail" class="hud-sub">Due ${dateFmt(forecast.dueAt,true)}</small></div>
      <div class="hud-item"><span class="hud-label">Cash runway</span><strong id="live-runway" class="hud-value ${runway<2?"red":runway<6?"orange":"green"}">${Number.isFinite(runway)?`${runway.toFixed(1)} mo`:"∞"}</strong><small id="live-runway-detail" class="hud-sub">${fmtUsd(mc.total)}/month</small></div>
      <div class="hud-item"><span class="hud-label">Expected / day</span><strong id="live-hud-yield" class="hud-value green">${fmtBtc(exp)}</strong><small class="hud-sub">${online?"mining":"offline"}</small></div>
      <div class="hud-item"><span class="hud-label">Self-held BTC</span><strong id="live-controlled-btc" class="hud-value green">${tickerBtc(controlled())}</strong><small class="hud-sub">your keys</small></div>
      <div class="hud-item"><span class="hud-label">Hash rate</span><strong id="live-your-hash" class="hud-value ${online?"green":"red"}">${fmtHash(online?fs.hash:0)}</strong><small id="live-your-status" class="hud-sub">${online?"online":"offline"}</small></div>
    </div>
    <div class="hud-controls">
      <button class="action small ${state.power?"danger":"primary"}" data-action="toggle-power" ${state.debt||state.policyLock?"disabled":""}>${state.power?"Shut miners down":"Start miners"}</button>
      <button class="action small hud-pop-btn" data-action="hud-stats" aria-expanded="false">Stats</button>
      <button class="action small hud-pop-btn" data-action="hud-decisions" aria-expanded="false">Decisions</button>
    </div>
  </div>
  <div class="hud-pop" id="hud-stats-pop" hidden>
    <section class="ticker" aria-label="Bitcoin network dashboard">
    <div class="ticker-group"><div class="ticker-group-label">Your money</div><div class="ticker-group-values">
    <div class="tick"><div class="label">Cash available</div><div id="live-fiat" class="value green">${fmtUsd(state.cash)}</div><div class="subvalue">Pays your operating bills</div></div>
    <div class="tick"><div class="label">Investments</div><div id="live-illiquid-fiat" class="value">${fmtUsd(equityValue())}</div><div class="subvalue">ETF + Strategy shares</div></div>
    <div class="tick"><div class="label">BTC held by others</div><div id="live-custodial-btc" class="value orange">${tickerBtc(claims())}</div><div class="subvalue">A company holds the keys · BTC</div></div>
    <div class="tick"><div class="label">Lightning locked</div><div id="live-lightning-btc" class="value ${lightningAvailable()?"":"dim"}">${tickerBtc(lightningLocked())}</div><div class="subvalue">${lightningAvailable()?"Set aside for fast payments · withdraw before ordinary spending":"Unlocks 15 Mar 2018"}</div></div>
    <div class="tick"><div class="label">Net worth</div><div id="live-worth" class="value">${fmtUsd(netWorth())}</div><div class="subvalue">Assets less liabilities</div></div>
    </div></div>
    <div class="ticker-group"><div class="ticker-group-label">Your operation</div><div class="ticker-group-values">
    <div class="tick"><div class="label">Power draw</div><div id="live-power" class="value">${fs.kw.toFixed(2)} kW</div><div id="live-power-rate" class="subvalue">${fmtUsd(mc.rate)}/kWh</div></div>
    </div></div>
    <div class="ticker-group"><div class="ticker-group-label">Bitcoin network</div><div class="ticker-group-values">
    <div class="tick"><div class="label">BTC / USD</div><div id="live-price" class="value orange">${state.time<MARKET?"NO MARKET":fmtUsd(p)}</div><div class="subvalue">recorded daily composite</div></div>
    <div class="tick"><div class="label">Network hash rate</div><div id="live-network-hash" class="value">${fmtHash(competitiveHashAt(state.time,fs.hash))}</div><div class="subvalue">Everyone's combined mining work each second</div></div>
    <div class="tick"><div class="label">Difficulty</div><div id="live-difficulty" class="value">${fmtDiff(difficultyAt(state.time))}</div><div class="subvalue">How hard it is to find the next block · holds until the next retarget</div></div>
    <div class="tick"><div class="label">New BTC / block</div><div id="live-subsidy" class="value">${fmtSubsidy(subsidyAt(state.time))}</div><div class="subvalue">New bitcoin paid to the winning miner</div></div>
    <div class="tick"><div class="label">Fees / block</div><div id="live-fees" class="value">${fmtBtc(feeAt(state.time))}</div><div class="subvalue">Fees paid by users in a block · 7-day mean</div></div>
    <div class="tick"><div class="label">Transactions</div><div id="live-transactions" class="value">${fmtNum(txAt(state.time))}</div><div class="subvalue">Payments in a block · 7-day mean</div></div>
    </div></div>
    <div class="ticker-group"><div class="ticker-group-label">Operator</div><div class="ticker-group-values">
    <div class="tick"><div class="label">Operator level</div><div id="live-xp-level" class="value">LV ${xpProgress().level}</div><div id="live-xp-remaining" class="subvalue">${fmtNum(Math.ceil(xpProgress().remaining))} XP to go</div></div>
    <div class="tick"><div class="label">Best share</div><div id="live-xp-best" class="value">${state.xp.bestDifficulty?fmtDifficulty(state.xp.bestDifficulty):"-"}</div><div class="subvalue"><span class="xp-track"><i id="live-xp-fill" style="width:${xpProgress().percent.toFixed(1)}%"></i></span></div></div>
    </div></div>
  </section>
  </div>
  <div class="hud-pop" id="hud-decisions-pop" hidden></div>
  ${mobileNav}`
}
/* HUD popouts: one open at a time, content rebuilt on open so it is always current. */
function hudTogglePop(which){
  const id=which==="hud-stats"?"hud-stats-pop":"hud-decisions-pop",other=which==="hud-stats"?"hud-decisions-pop":"hud-stats-pop";
  const el=document.getElementById(id),btn=document.querySelector(`[data-action="${which}"]`);
  const opening=el&&el.hidden;
  [id,other].forEach(x=>{const e=document.getElementById(x);if(e)e.hidden=true});
  document.querySelectorAll(".hud-pop-btn").forEach(b=>b.setAttribute("aria-expanded","false"));
  if(opening){
    if(id==="hud-decisions-pop")el.innerHTML=dashboardCommandCentre();
    el.hidden=false;
    if(btn)btn.setAttribute("aria-expanded","true");
  }
}
function nav(){
  const tabs=["dashboard","mine","pools","treasury","facilities","energy","learn","tech","ledger","method"];
  /* The toolbelt under the room. Home is lit only when no panel sits beside the room. */
  const on=t=>t==="dashboard"?activeTab==="dashboard"&&!roomPanel:activeTab===t;
  const panels=[["reports","Reports","chart"],["story","Story","news"]].map(([id,label,icon])=>`<button class="tab room-dock-panel ${activeTab==="dashboard"&&roomPanel===id?"active":""}" data-action="room-panel" data-value="${id}" title="${label}">${roomIcon(icon)}<span>${label}</span></button>`).join("");
  return `<nav class="tabs room-dock" aria-label="Game sections">${tabs.map(t=>{const locked=typeof offlineTabLocked==="function"&&offlineTabLocked(t),[label,icon]=ROOM_DOCK[t]||[t,"home"];return `<button class="tab ${on(t)?"active":""}${locked?" offline-locked":""}" data-action="tab" data-value="${t}" title="${locked?"No internet: this screen is locked":label}">${roomIcon(icon)}<span>${label}</span></button>`}).join("")}<i class="room-dock-gap" aria-hidden="true"></i>${panels}</nav>`
}
function poolDashboard(){
  const t=state.time, net=hashAt(t), active=poolData(), rows=POOLS.filter(p=>p.id!=="solo"&&p.id!=="other"&&t>=at(p.date)&&!poolClosed(p.id,t)).map(p=>({p,share:poolShareAt(p.id,t),eligible:poolEligible(p)})).filter(x=>x.share>0).sort((a,b)=>b.share-a.share);
  const top=rows.slice(0,6),namedShare=top.reduce((sum,x)=>sum+x.share,0),colors=["#f0a92f","#86c79a","#79c8d3","#b99a74","#b9a4ce","#e78270"],segments=[...top.map((x,i)=>({name:x.p.name,share:x.share,color:colors[i],hash:fmtHash(net*x.share)})),{name:"Other pools / solo",share:Math.max(0,1-namedShare),color:"#344344",hash:fmtHash(net*Math.max(0,1-namedShare))}].filter(x=>x.share>.001),selected=state.mode==="pool"?active:null;
  let angle=-90;const polar=a=>({x:110+94*Math.cos(a*Math.PI/180),y:110+94*Math.sin(a*Math.PI/180)}),slices=segments.map(segment=>{const start=angle,end=angle+segment.share*360,from=polar(start),to=polar(end),large=end-start>180?1:0;angle=end;return `<path d="M110 110 L${from.x.toFixed(2)} ${from.y.toFixed(2)} A94 94 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)} Z" fill="${segment.color}" stroke="#0b1011" stroke-width="2"/>`}).join(""),legend=chartLegendHtml(segments.map(segment=>({label:segment.name,value:`${(segment.share*100).toFixed(1)}%`,note:`${segment.hash} est. hash rate`,color:segment.color,style:"block"})),{layout:"list",label:"Pool share key",note:"share of estimated network hash rate"});
  return `<section class="card span-12"><div class="card-head"><h2>Mining pool concentration</h2><div class="meta">observed weekly shares · smoothed between anchors</div></div><div class="card-pad"><div class="pool-summary"><div><strong>${fmtHash(net)}</strong><span>network hash rate</span></div><div><strong>${selected?selected.name:"Solo mining"}</strong><span>your selected method</span></div><div><strong>${selected?(poolFeeAt(selected.id,state.time)*100).toFixed(2)+"%":"0%"}</strong><span>${selected?(POOL_SCHEMES[poolScheme(selected.id,state.time)]||{}).name+" fee":"base pool fee"}</span></div></div><div class="pool-concentration"><svg class="pool-pie" viewBox="0 0 220 220" role="img" aria-label="Estimated mining pool concentration">${slices}<circle cx="110" cy="110" r="52" fill="#101718" stroke="#263033"/><text x="110" y="105" text-anchor="middle" fill="#e6eee9" font-size="13" font-family="ui-monospace,monospace">POOLS</text><text x="110" y="122" text-anchor="middle" fill="#9ba8a3" font-size="9" font-family="ui-monospace,monospace">EST. SHARE</text></svg>${legend}</div><p class="modal-note">Named slices show the six largest available pools. The remainder is grouped as other pools / solo mining. Recent shares use mempool.space weekly block attribution; early history and dates between anchors are smoothed for gameplay, not an exact block-by-block reconstruction.</p><div class="actions" style="margin-top:12px;flex-wrap:wrap">${rows.map(x=>`<button class="action small ${state.pool===x.p.id&&state.mode==="pool"?"primary":""}" data-action="pool" data-value="${x.p.id}" ${x.eligible?"":"disabled"}>${x.p.name}${x.eligible?"":" · requires Block-template construction"}</button>`).join("")}<button class="action small ${state.mode==="solo"?"primary":""}" data-action="mode" data-value="solo">Solo</button></div></div></section>`
}
function openingChapterStage(){return `${state.uptimeDays>=1}:${state.mined>0}:${Math.min(2,state.operator.totalMonths)}`}
function operatorBriefing(){
  if(state.pendingSettlement)return"";
  const dismissed=new Set(state.guidance?.dismissed||[]),fs=fleet(),monthly=monthlyCost(),runway=monthly.total?state.cash/monthly.total:Infinity,temperature=roomTemperatureC(),faults=HARDWARE.reduce((sum,h)=>sum+hardwareFaultCount(h),0),load=fs.cap?fs.kw/fs.cap*100:0,canStart=!state.power&&!state.policyLock&&!siteOutage()&&!state.debt,lateStart=state.difficulty==="hard"||state.difficulty==="impossible";
  const candidates=[];
  if(gridCutOff())candidates.push({id:"grid-arrears",label:"Cash emergency",title:"The grid has disconnected your operation.",copy:`An unpaid bill left ${fmtUsd(state.debt)} in arrears. Mining is offline; rent and finance still accrue.`,recommendation:"Raise the cash, then clear the arrears from Finance.",action:"tab",value:"finance",button:"Resolve the unpaid bill",tone:"critical"});
  else if(state.debt>0)candidates.push({id:"grid-arrears-grace",label:"Bill missed",title:`${fmtUsd(state.debt)} is in arrears.`,copy:`You missed a bill. Power and internet are cut on ${dateFmt(state.arrearsDue)} if it is still owed.`,recommendation:"Clear the arrears before then.",action:"tab",value:"finance",button:"Clear the arrears",tone:"attention"});
  else if(!operating())candidates.push({id:"fleet-offline",label:"Operation paused",title:"Your machines are not mining.",copy:state.policyLock?state.policyLock:siteOutage()?"A site outage has interrupted mining while fixed costs continue.":"A stopped machine earns no BTC and uses no mining electricity, although fixed costs can continue.",recommendation:canStart?"Start the site when you are ready to compete for mining rewards.":"Review the active site constraint before making another operating decision.",action:canStart?"toggle-power":"tab",value:canStart?null:"facilities",button:canStart?"Start mining":"Review the site",tone:"attention"});
  if(temperature>=30)candidates.push({id:"high-temperature",label:"Equipment risk",title:"The mining room is too hot.",copy:`The room is ${temperature.toFixed(1)} °C. Heat is wearing the machines and raising fault risk.`,recommendation:"Cut the heat load or add cooling from Mine.",action:"tab",value:"mine",button:"Review cooling",tone:"critical"});
  if(faults>0)candidates.push({id:"open-faults",label:"Maintenance",title:`${faults} machine${faults===1?" has":"s have"} a component fault.`,copy:"A faulted machine hashes below its rate; an untreated fault can spread.",recommendation:"Open Mine and schedule a targeted repair.",action:"tab",value:"mine",button:"Inspect the fault",tone:"attention"});
  if(load>90)candidates.push({id:"capacity-pressure",label:"Site capacity",title:"The site is close to its electrical limit.",copy:`Active equipment uses ${load.toFixed(0)}% of capacity. Another purchase or overdrive could exceed it.`,recommendation:"Pause equipment or compare larger sites.",action:"tab",value:"facilities",button:"Review the site",tone:"attention"});
  if(state.sandbox)candidates.push({id:"sandbox-start",label:"Procedural sandbox",title:"You are now past the recorded history.",copy:`The record ends on ${dateFmt(END)}. Everything after is modelled projection, not recorded history.`,recommendation:`The next projected halving is ${dateFmt(nextHalvingTime(state.time),true)}. Judge your margin against it.`,action:"tab",value:"method",anchor:"method-sandbox",button:"Read how the sandbox is modelled"});
  if(state.time<MARKET&&!state.sandbox&&state.uptimeDays>=1&&monthly.total>0){
    const monthsToMarket=(MARKET-state.time)/(DAY*30.4375);
    if(runway<monthsToMarket+1)candidates.push({id:"no-market-cash",label:"Cash until the market opens",title:"Your cash may run out before Bitcoin has a price.",copy:`No market price until ${dateFmt(MARKET,true)}, so coins cannot be sold yet. Your cash lasts about ${Number.isFinite(runway)?runway.toFixed(1):"∞"} months.`,recommendation:"Keep costs down. A spare machine can be sold if a bill falls short.",action:"tab",value:"finance",button:"Review the bill",tone:"critical"});
  }
  if(state.uptimeDays<1)candidates.push({id:"first-run",label:"First shift",title:lateStart?"Your laptop cannot compete in this era.":"Your first job is to keep one laptop mining.",copy:lateStart?"Your opening laptop shows the rules; it is not a viable fleet in this era.":"Mining earns BTC; electricity and bills are paid in cash.",recommendation:lateStart?"Compare era-appropriate hardware before you start.":state.speed?"Let a few days pass, then compare income with the bill.":"Run at 1× and watch rewards, costs and competition.",action:lateStart||state.speed?"tab":"speed",value:lateStart||state.speed?"mine":"1",button:lateStart?"Compare current mining hardware":state.speed?"Review your laptop":"Run at 1×",definitions:true});
  if(!lateStart&&state.uptimeDays>=1&&state.operator.totalMonths<1)candidates.push({id:"first-work",label:"Chapter one · your laptop is working",title:state.mined>0?"Your laptop has earned its first bitcoin.":"The fan is spinning. The search continues.",copy:state.mined>0?`You have mined ${fmtBtc(state.mined)}. Rewards do not pay the electricity bill by themselves.`:"A quiet day is normal in solo mining; the bill still builds.",recommendation:"Cover the first bill. Review the forecast before buying more.",action:"tab",value:"finance",button:"Plan your first bill"});
  if(!lateStart&&state.operator.totalMonths>=1&&state.operator.totalMonths<2&&!state.debt)candidates.push({id:"first-month",label:"Chapter one complete",title:"One laptop. Your first month behind you.",copy:`${fmtNum(state.uptimeDays)} days running, ${fmtBtc(state.mined)} mined. ${state.operator.solventMonths>0?"You covered a bill without emergency finance.":"Build a stronger cash reserve."}`,recommendation:"Keep cash for the next bill, or expand. Your story is in the Ledger.",action:"tab",value:"ledger",button:"Look back at your first month"});
  if(state.uptimeDays>=1&&state.operator.totalMonths<1&&state.bill>0)candidates.push({id:"first-bill",label:"Operating cash",title:"Your first operating bill is building.",copy:`The bill has accrued ${fmtUsd(state.bill)}. It is paid in cash at the month boundary.`,recommendation:`You have ${Number.isFinite(runway)?`${runway.toFixed(1)} months of runway`:`no fixed burn limit`}. Review the forecast.`,action:"tab",value:"finance",button:"Review cash and bills"});
  if(state.uptimeDays>=3&&HARDWARE.some(h=>!h.permanent&&state.time>=at(h.date)&&!(state.hardware[h.id]||0)))candidates.push({id:"first-upgrade",label:"Fleet growth",title:"Faster mining hardware is available.",copy:"More hash rate earns more often, but costs more to buy and run.",recommendation:"Compare price, hash rate, energy and space before ordering.",action:"tab",value:"mine",button:"Compare mining hardware"});
  if(availablePool()&&state.mode==="solo")candidates.push({id:"pool-available",label:"Reward strategy",title:"You can now join a mining pool.",copy:"Solo pays only when your work finds a block. A pool pays smaller, steadier amounts after fees.",recommendation:"Compare timing, payout scheme and fee before switching.",action:"tab",value:"pools",button:"Compare solo and pool mining"});
  if(runway<3)candidates.push({id:"low-runway",label:"Cash warning",title:"Your operation has less than three months of cash runway.",copy:`${fmtUsd(state.cash)} covers about ${runway.toFixed(1)} months. BTC cannot pay a bill until sold.`,recommendation:"Cut costs, raise cash or delay expansion.",action:"tab",value:"finance",button:"Protect the cash runway",tone:"attention"});
  if(state.uptimeDays>=3&&(state.wallets.hot||0)>0&&!((state.wallets.cold||0)>0)&&!state.sandbox)candidates.push({id:"cold-storage",label:"Keys",title:"Everything you have mined is in one wallet, on one computer.",copy:"One fire, thief or dead disk takes every coin in it. Cold storage puts the key somewhere else.",recommendation:"Open Custody and set up cold storage.",action:"tab",value:"custody",button:"Set up cold storage"});
  const tip=candidates.find(candidate=>!dismissed.has(candidate.id));if(!tip)return"";
  const definitions=tip.definitions?`<details class="briefing-definitions"><summary>New to Bitcoin mining? Start with these terms</summary><dl><div><dt>BTC</dt><dd>The asset transferred on the Bitcoin network and paid as a mining reward.</dd></div><div><dt>Hash rate</dt><dd>How much mining work a machine performs each second.</dd></div><div><dt>Network difficulty</dt><dd>How hard the network currently makes it to find a block.</dd></div><div><dt>Operating bill</dt><dd>Your recurring electricity, internet, site and staffing costs, settled monthly.</dd></div></dl></details>`:"";
  return `<section class="card span-12 operator-briefing ${tip.tone||""}"><div class="briefing-copy"><div class="hero-kicker">Operator briefing · ${tip.label}</div><h2>${tip.title}</h2><p>${tip.copy}</p><div class="briefing-recommendation"><span>Recommended next step</span><b>${tip.recommendation}</b></div>${definitions}</div><div class="briefing-actions"><button class="action primary" data-action="${tip.action}" ${tip.value?`data-value="${tip.value}"`:""} ${tip.anchor?`data-anchor="${tip.anchor}"`:""}>${tip.button}</button><button class="action-link" data-action="dismiss-guidance" data-id="${tip.id}">Dismiss this advice</button></div></section>`;
}
function dashboardCommandCentre(){
  const fs=fleet(),monthly=monthlyCost(),runway=monthly.total?state.cash/monthly.total:Infinity,load=fs.cap?fs.kw/fs.cap*100:0,margin=state.time>=MARKET?expectedDailyBtcForHash(fs.hash)*priceAt(state.time)-dailyEnergyCostForWatts(fs.w*contractLoadFactor()):null;
  const custodyTotal=controlled()+claims(),selfShare=custodyTotal?controlled()/custodyTotal*100:100,nodeState=nodeOnline()?"At chain tip":state.node?"Offline or syncing":"Laptop node only";
  const cards=[
    {label:"How long will cash last?",value:Number.isFinite(runway)?`${runway.toFixed(1)} months`:"No fixed burn",detail:`${fmtUsd(state.cash)} cash · ${fmtUsd(monthly.total)}/month`,tone:runway<2?"critical":runway<6?"attention":"",tab:"finance",action:"Review finance"},
    {label:"Does mining cover its electricity?",value:margin===null?"BTC unpriced":fmtUsd(margin)+" / day",detail:`${fmtBtc(expectedDailyBtcForHash(fs.hash))} expected · before fixed costs`,tone:margin!==null&&margin<0?"critical":"",tab:"mine",action:"Review fleet"},
    {label:"Can the site take more miners?",value:`${load.toFixed(1)}% power`,detail:`${fs.space} / ${facility().space} floor units · ${facility().name}`,tone:load>90?"critical":load>75?"attention":"",tab:"facilities",action:"Review site"},
    {label:"Who controls spending and recovery?",value:`${selfShare.toFixed(0)}% self-held`,detail:`${custodyAssessmentLabel(custodyPosture().tier)}. ${custodyPosture().findings[0]?custodyPosture().findings[0].text:"No current findings in the game's checks; risks remain."} ${claims()>0?`${fmtBtc(claims())} held by custodians. `:""}${treasuryReach().cold>0?`Reserve ${treasuryReach().reachDays} day${treasuryReach().reachDays===1?"":"s"} away.`:""}`,tone:custodyPosture().rank<1||treasuryReach().coldTooSlow?"critical":claims()>controlled()||custodyPosture().rank<2?"attention":"",tab:"custody",action:"Review keys and recovery"},
    {label:"How do rewards arrive?",value:state.mode==="pool"?poolData().name:"Solo mining",detail:state.mode==="pool"?`${(poolFee()*100).toFixed(2)}% fee · smoothed payout`:"No pool fee · rewards can be far apart",tone:"",tab:"pools",action:"Review pools"},
    {label:"Who checks the chain?",value:nodeState,detail:nodeVerificationPath(),tone:nodeOnline()?"":"attention",tab:"custody",action:"Review node"}
  ];
  return `<section class="card span-12"><div class="card-head"><h2>Your next decisions</h2><div class="meta">CASH · MINING · SPACE · KEYS</div></div><div class="card-pad dashboard-command-grid">${cards.map(card=>`<article class="dashboard-command ${card.tone}"><span class="label">${card.label}</span><strong>${card.value}</strong><small>${card.detail}</small><button class="action small" data-action="tab" data-value="${card.tab}">${card.action}</button></article>`).join("")}</div></section>`
}
function buildQueueCard(){
  const rows=[];
  state.procurementOrders.forEach(o=>{const h=HARDWARE.find(x=>x.id===o.id),days=Math.max(0,Math.ceil((o.due-state.time)/DAY));rows.push({label:`${o.qty} × ${h?.name||o.id}`,detail:`In transit · ${o.vendor||h?.maker||"Supplier"}`,eta:days,tab:"mine"})});
  state.commissioningJobs.forEach(j=>{const h=HARDWARE.find(x=>x.id===j.id),days=Math.max(0,Math.ceil((j.due-state.time)/DAY));rows.push({label:`${j.qty} × ${h?.name||j.id}`,detail:"Commissioning",eta:days,tab:"mine"})});
  (state.retirementJobs||[]).forEach(j=>{const h=HARDWARE.find(x=>x.id===j.id),days=Math.max(0,Math.ceil((j.due-state.time)/DAY)),left=Math.max(0,Number(j.qty)-Number(j.done||0));rows.push({label:`${left} × ${h?.name||j.id}`,detail:"Retiring",eta:days,tab:"mine"})});
  (state.thermal.orders||[]).forEach(o=>{const item=COOLING_EQUIPMENT.find(x=>x.id===o.id),days=Math.max(0,Math.ceil((o.due-state.time)/DAY));rows.push({label:`${item?.name||o.id}`,detail:"Cooling install",eta:days,tab:"mine"})});
  (state.maintenance.serviceJobs||[]).forEach(job=>{
    const h=HARDWARE.find(x=>x.id===job.id),days=Math.max(0,Math.ceil((job.due-state.time)/DAY)),stageIdx=Number.isFinite(job.stage)?Math.min(job.stage,REPAIR_STAGES.length-1):0,stageName=REPAIR_STAGES[stageIdx]?.name,awaiting=!job.auto&&REPAIR_STAGES[job.stage]?.id==="work"&&!job.workDone;
    rows.push({label:`${h?.name||job.id} servicing`,detail:`${job.part?`Replacing ${sparePart(job.part)?.name||job.part}`:"Full refurbishment"}${stageName?` · ${stageName}`:""}`,eta:awaiting?null:days,awaiting,tab:"mine"});
  });
  if(state.facilityUpgradeJob){const f=FACILITIES.find(x=>x.id===state.facilityUpgradeJob.id),days=Math.max(0,Math.ceil((state.facilityUpgradeJob.due-state.time)/DAY));rows.push({label:`Upgrading to ${f?.name||state.facilityUpgradeJob.id}`,detail:"Facility upgrade",eta:days,tab:"facilities"})}
  if(state.relocationJob){const r=REGIONS.find(x=>x.id===state.relocationJob.id),days=Math.max(0,Math.ceil((state.relocationJob.due-state.time)/DAY));rows.push({label:`Relocating to ${r?.name||state.relocationJob.id}`,detail:"Facility relocation",eta:days,tab:"facilities"})}
  if(state.learning){const item=learningItem(),days=item?Math.max(0,item.days-(state.learning.progress||0)):0;rows.push({label:item?.title||"Learning",detail:item?.type||"Learning",eta:state.learning.waiting?null:days,awaiting:state.learning.waiting,tab:"learn"})}
  if(!rows.length)return"";
  return `<section class="card span-12 build-queue"><div class="card-head"><h2>Build queue</h2><div class="meta">${rows.length} IN PROGRESS</div></div><div class="card-pad">${rows.map(r=>`<div class="incoming-fleet-row"><div class="incoming-fleet-name"><b>${r.label}</b><small>${r.detail}</small></div><span class="build-queue-eta ${r.awaiting?"awaiting":""}">${r.awaiting?"Awaiting you":r.eta===0?"Due today":`${r.eta}d left`}</span><button class="action small" data-action="tab" data-value="${r.tab}">View</button></div>`).join("")}</div></section>`;
}
/* Reports: the charts and the score, opened from the toolbelt beside the room. */
function dashboard(){
  const historyBtc=state.history.length?state.history.map(x=>x.btc):[0,controlled()];
  return `<div class="grid">
    ${settlementForecastVisual()}
    <div class="dashboard-chapter span-12"><span>01 / Mining</span><h2>What determines your rewards?</h2><p>Your share of the work sets your expected output. Competition and payout timing determine how that feels day to day.</p></div>
    <section class="card span-8"><div class="card-head"><h2>Price and competition</h2><div class="meta">daily price · daily 14-day hash mean · indexed at game start</div></div><p class="concept-caption">A higher BTC price increases the value of rewards. More competing hash rate can reduce your share. Both lines start at 100; their slopes show relative change.</p><div class="chart-wrap"><div id="dashboard-market-chart">${chart(sampled(priceAt),"#f7931a",true,{points:sampled(hashAt),color:"#86c79a",label:"Network hash rate",mainLabel:"BTC/USD"})}</div><div class="chart-labels end"><span id="dashboard-chart-date">${dateFmt(state.time,true)}</span></div></div></section>
    ${networkShareCard()}
    <section class="card span-12"><div class="card-head"><h2>Transactions waiting for a block</h2><div class="meta">illustrative · modelled activity</div></div><p class="concept-caption">Miners collect transaction fees alongside newly issued BTC. This illustration shows fee priorities; it is not a live transaction queue or block countdown.</p><div id="dashboard-mempool" class="card-pad">${mempoolViz()}</div></section>

    <div class="dashboard-chapter span-12"><span>02 / Treasury</span><h2>Where is your bitcoin?</h2><p>A balance tells you how much you hold. Its location tells you who controls it and how quickly you can use it.</p></div>
    <section class="card span-6"><div class="card-head"><h2>Treasury map</h2><div class="meta">calculated</div></div><div id="dashboard-treasury" class="balance-list">${btcBreakdown()}</div></section>
    <section class="card span-6"><div class="card-head"><h2>Self-held BTC history</h2><div class="meta">simulation</div></div><div class="chart-wrap"><div id="dashboard-history-chart">${chart(historyBtc,"#86c79a",true,null,SELF_HELD_CHART_KEY)}</div><div class="chart-labels"><span>run start</span><span id="dashboard-history-value">${fmtBtc(controlled())}</span></div></div></section>

    <div class="dashboard-chapter span-12"><span>03 / Progress</span><h2>How well are you running the operation?</h2><p>Your score rewards paid bills, profitable mining, uptime and a fleet that keeps pace with its era.</p></div>
    ${operatorScoreVisual()}
  </div>`
}
