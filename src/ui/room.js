"use strict";

/* THE ROOM - the operation drawn as the place it happens, and the screen it is played from.

   The site's interior fills the main area. What a player does to the operation happens on it:
   the dashed tile on the floor is the shop, a machine opens its inspector, the meters open the
   site and the temperature opens the cooling. Every tab is still there, behind the toolbelt under
   the room, and opens as a panel beside it so the room stays in view and changes as the panel
   changes it.

   Nothing here decides anything. Every button carries the data-action the tabs use, so a purchase
   made from the room goes through the same review, the same tutorial hold and the same engine call
   as one made from the Mine tab. */

let roomPop=null,roomPanel=null,coachOpen=false,gameMenuOpen=false,guideOpen=false;

const ROOM_ICONS={
  home:'<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  mine:'<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 10h8M8 14h5"/><circle cx="16.5" cy="14" r="1"/>',
  pools:'<circle cx="12" cy="5.5" r="2"/><circle cx="5.5" cy="17" r="2"/><circle cx="18.5" cy="17" r="2"/><path d="M11 7.4 6.6 15.2M13 7.4l4.4 7.8M7.5 17h9"/>',
  vault:'<rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 8.8V7M12 17v-1.8M15.2 12H17M7 12h1.8"/>',
  site:'<path d="M3 20h18"/><path d="M5 20V9l7-4 7 4v11"/><path d="M9 20v-5h6v5"/>',
  bolt:'<path d="M13 3 6 13h5l-1 8 7-10h-5z"/>',
  book:'<path d="M4 5.5C7 4.5 9.5 5 12 6.5c2.5-1.5 5-2 8-1V18c-3-1-5.5-.5-8 1-2.5-1.5-5-2-8-1z"/><path d="M12 6.5V19"/>',
  tree:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 12h4M12 12V7a1 1 0 0 1 1-1h3M12 12v5a1 1 0 0 0 1 1h3"/>',
  list:'<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/>',
  method:'<circle cx="12" cy="12" r="8"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.5v.6"/><circle cx="12" cy="16.6" r=".6"/>',
  chart:'<path d="M4 20h16"/><path d="M7 16v-4M11 16V8M15 16v-6M19 16V5"/>',
  news:'<rect x="4" y="5" width="13" height="14" rx="1"/><path d="M17 9h3v8.5a1.5 1.5 0 0 1-3 0"/><path d="M7 9h7M7 12.5h7M7 16h4"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  more:'<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  snow:'<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
  expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  map:'<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>'
};

/* THE LAND. Every site the game sells has a plot, and so do the businesses the operation deals
   with. land.js draws them; this is what they are and what clicking one does. Sites take their
   name, price and date from FACILITIES so the map cannot disagree with the Facilities panel. */
const LAND_PLACES=[
  {key:"home",facility:"home"},{key:"garage",facility:"garage"},{key:"workshop",facility:"workshop"},{key:"warehouse",facility:"warehouse"},
  {key:"campus",facility:"campus"},{key:"container",facility:"container"},{key:"hydroplant",facility:"hydroplant"},{key:"megacampus",facility:"megacampus"},
  {key:"windfarm",name:"Ridge wind farm",kind:"contract",contract:"curtail",copy:"On windy nights its turbines make more power than the grid can take. It sells that surplus cheaply to any load that agrees to switch off when asked."},
  {key:"landfill",name:"County landfill",kind:"prospect",copy:"Buried waste gives off methane, and most of it is flared away. Burned in a generator, that gas could power miners on the spot."},
  {key:"power",name:"Power station",kind:"service",role:"Electricity",tab:"energy",cta:"Choose a power contract",copy:"Your electricity comes from here. You choose how to pay for it: steady, cheap or interruptible."},
  {key:"mast",name:"Telecom mast",kind:"service",role:"Internet",tab:"energy",cta:"Choose an internet plan",copy:"Your connection to the network runs through here. Better lines cost more and drop out less."},
  {key:"bank",name:"High Street bank",kind:"service",role:"Deposit boxes",tab:"custody",cta:"Open custody",copy:"A deposit box keeps a backup away from your machines, for a monthly fee."},
  {key:"library",name:"Public library",kind:"service",role:"Learning",tab:"learn",cta:"Open Learn",copy:"Books, mailing lists and podcasts. What you learn earns the knowledge that unlocks skills."},
  {key:"exchange",name:"Exchange office",kind:"service",role:"Market",tab:"market",cta:"Open the market",opens:MARKET,copy:"Where bitcoin meets dollars. Until a market exists, nobody here will buy your coins."},
  {key:"poolhq",name:"Mining pool",kind:"service",role:"Pools",tab:"pools",cta:"Open Pools",opens:at("2010-12-16"),copy:"Miners combine their work here for smaller, steadier payouts."},
  {key:"friend",name:"claude1337's flat",kind:"service",role:"A trusted friend",tab:"custody",cta:"Open custody",copy:"A sovereign micronation of one man and a cat. A trusted place to keep a backup, mostly."}
];
const LAND_HEADLINE=new Set(["windfarm","landfill","power","hydroplant"]);
function roomLandStatus(p){
  if(p.facility){
    const f=FACILITIES.find(x=>x.id===p.facility),opens=at(f.date);
    if(f.id===state.facility)return["yours","Your site"];
    if(state.facilityUpgradeJob&&state.facilityUpgradeJob.id===f.id)return["moving","Moving here"];
    if(state.time<opens)return[opens-state.time<DAY*365*3?"soon":"far",`Opens ${new Date(opens).getUTCFullYear()}`];
    return["open",facilityIsDownsize(f.id)?"Smaller site":"Available"];
  }
  if(p.opens&&state.time<p.opens)return["closed",`Opens ${dateFmt(p.opens,true)}`];
  if(p.kind==="contract")return["contract",state.contract===p.contract?"Your supplier":"Curtailment deal"];
  if(p.kind==="prospect")return["prospect","Not for sale"];
  return["service",p.role];
}
function roomLandName(p){return p.facility?FACILITIES.find(x=>x.id===p.facility)?.name||p.key:p.name}
/* What the land shows, in the order land.js stamps onto its buildings. */
function roomLandModel(){return LAND_PLACES.map(p=>{const [status,label]=roomLandStatus(p);return{key:p.key,name:roomLandName(p),status,label,tier:status==="yours"||status==="moving"||LAND_HEADLINE.has(p.key)?1:2}})}
function roomStageScale(){return state.stageView==="room"?"room":"land"}
function roomStageHosts3d(){return typeof floor3dAvailable==="function"&&floor3dAvailable()}
function roomIcon(name,cls="room-icon"){return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ROOM_ICONS[name]||""}</svg>`}

/* The toolbelt's label and icon for each tab, and the panel heading it opens with. */
const ROOM_DOCK={dashboard:["Room","home"],mine:["Mine","mine"],pools:["Pools","pools"],treasury:["Treasury","vault"],facilities:["Facilities","site"],energy:["Energy","bolt"],learn:["Learn","book"],tech:["Tech","tree"],ledger:["Ledger","list"],method:["Method","method"]};
const ROOM_DRAWER={
  mine:["Mine","Machines, servicing, cooling and the catalogue"],pools:["Pools","Solo or pool, and where income lands"],
  treasury:["Treasury","Market, custody and finance"],market:["Treasury","Market, custody and finance"],custody:["Treasury","Market, custody and finance"],finance:["Treasury","Market, custody and finance"],
  facilities:["Facilities","Sites, regions and capacity"],energy:["Energy","Power contracts and connectivity"],learn:["Learn","Books, posts and podcasts"],
  tech:["Tech","Skills that change the operation"],ledger:["Ledger","Every action, payment and event"],method:["Method","How every number is made"],
  reports:["Reports","Charts, network share and your score"],story:["The Bitcoin story","What happened while you were busy"],offline:["Offline","The line is cut"]
};

/* Which panel sits beside the room, or "" for the room alone. */
function roomDrawerKind(){
  if(activeTab!=="dashboard")return activeTab;
  if(roomPanel)return roomPanel;
  if(typeof internetCut==="function"&&internetCut())return "offline";
  return "";
}
function roomShellHtml(revision){
  if(activeTab!=="dashboard"){roomPop=null;roomPanel=null}
  const kind=roomDrawerKind(),offline=typeof internetCut==="function"&&internetCut();
  const body=kind==="story"?(offline?offlineSidebarHtml():sidebar()):kind?content(revision):"";
  return `<div class="shell room-shell${kind?" drawer-open":""}"><section class="stage" aria-label="Your operation">${roomStageHtml(kind)}</section>${kind?`<section class="drawer drawer-${kind}">${roomDrawerHead(kind)}<div class="content">${body}</div></section>`:""}</div>`;
}
function roomDrawerHead(kind){
  const [title,hint]=ROOM_DRAWER[kind]||[kind,""];
  return `<header class="drawer-head"><div><b>${title}</b><small>${hint}</small></div><button class="drawer-close" data-action="room-close-drawer" aria-label="Close ${title} and return to the room">${roomIcon("close")}<span>Room</span></button></header>`;
}
function roomStageHtml(kind){
  const home=!kind;
  const coach=home?`<div class="stage-coach${coachOpen?" open":""}"><div data-opening-stage="${openingChapterStage()}">${operatorBriefing()}</div><button class="coach-toggle" data-action="coach-toggle" aria-expanded="${coachOpen}">${coachOpen?"Less":"Why?"}</button></div>`:"";
  const three=roomStageHosts3d();
  return `${coach}<div class="room-frame${three?` is-3d scale-${roomStageScale()}`:""}">${three?roomStage3dHtml(home):roomCanvasHtml()}${home?roomInspectorHtml():""}</div>${roomBarHtml()}<div class="room-queue">${buildQueueCard()}</div>${nav()}`;
}
/* The stage in 3D: the land or the room, a switch between them, labels pinned to the land's
   properties, and the camera tools. The canvas itself is attached by mountFloor3d(). */
let roomLabelPos={},roomLabelSig="";
function roomStage3dHtml(home){
  const land=roomStageScale()==="land";
  const labels=land?roomLandModel().map(m=>{const at=roomLabelPos[m.key];return `<button class="land-label tier-${m.tier} is-${m.status}${at&&at.on?"":" off"}${at&&at.flip?" flip":""}" data-action="room-land" data-value="${m.key}" style="transform:translate(${at?at.x:-999}px,${at?at.y:-999}px);--lx:${at?at.lx:0}px"><b>${m.name}</b><small>${m.label}${m.status==="yours"?" · go inside":""}</small></button>`}).join(""):"";
  roomLabelSig="";
  return `<div class="floor-3d-mount stage-3d stage-${land?"land":"room"}" role="img" aria-label="${land?"Map of the land around your operation":`Inside ${facility().name}`}"><p class="stage-loading">Loading the 3D view…</p></div>${land?`<div class="stage-labels">${labels}</div>`:""}
    <div class="stage-switch" role="group" aria-label="View"><button class="${land?"active":""}" data-action="room-scale" data-value="land" aria-pressed="${land}">${roomIcon("map")}<span>Land</span></button><button class="${land?"":"active"}" data-action="room-scale" data-value="room" aria-pressed="${!land}">${roomIcon("site")}<span>${facility().name}</span></button></div>
    <p class="stage-readout" data-floor3d-readout>${land?"Drag to look around. Click your site to go inside.":"Drag to look around. Click a machine to inspect it."}</p>
    <div class="stage-tools">${!land&&home?`<button class="action small primary" data-action="room-pop" data-value="shop" aria-label="Add a machine">${roomIcon("plus")}<span>Add a machine</span></button>`:""}<button class="action small" data-action="floor3d-zoom" data-value="out" aria-label="Zoom out">&minus;</button><button class="action small" data-action="floor3d-zoom" data-value="in" aria-label="Zoom in">+</button><button class="action small" data-action="floor3d-reset"${typeof floor3dViewIsDefault==="function"&&!floor3dViewIsDefault()?"":" disabled"}>Reset view</button></div>`;
}
/* Pins each label above its property, hiding the less important of any two that collide. Runs
   after each 3D draw, and does nothing unless the camera or the canvas changed. */
function roomPlaceLabels(project,sig){
  const layer=document.querySelector(".stage-labels"),labels=typeof floor3dBuilt==="object"&&floor3dBuilt?floor3dBuilt.labels:null;if(!layer||!labels)return;
  const frame=layer.getBoundingClientRect(),placed=[...document.querySelectorAll(".stage-coach,.stage-switch,.stage-tools,.stage-readout:not(:empty),.room-inspector")].map(n=>n.getBoundingClientRect()).filter(r=>r.width).map(r=>({l:r.left-frame.left,t:r.top-frame.top,r:r.right-frame.left,b:r.bottom-frame.top}));
  const key=`${sig}|${placed.map(o=>`${o.l|0},${o.t|0},${o.r|0},${o.b|0}`).join(";")}`;if(key===roomLabelSig)return;roomLabelSig=key;
  const tiers=Object.fromEntries(roomLandModel().map(m=>[m.key,m.tier]));
  const order=labels.slice().sort((a,b)=>(tiers[a.key]||2)-(tiers[b.key]||2));
  for(const item of order){
    const el=layer.querySelector(`[data-value="${item.key}"]`);if(!el)continue;
    const p=project(item.pos),w=el.offsetWidth,h=el.offsetHeight,above=p.y-h-6,below=p.y+6;
    const spots=[[p.x-w/2,above,w/2],[p.x-12,above,12],[p.x-w+12,above,w-12],[p.x-w/2,below,w/2],[p.x-12,below,12],[p.x-w+12,below,w-12]];
    let pick=null;
    if(p.inView)for(const [sx,sy,lx] of spots){
      const x=Math.round(sx),y=Math.round(sy),box={l:x,t:y,r:x+w,b:y+h};
      if(box.l<2||box.t<2||box.r>frame.width-2||box.b>frame.height-2)continue;
      if(placed.some(o=>box.l<o.r+4&&box.r>o.l-4&&box.t<o.b+3&&box.b>o.t-3))continue;
      pick={x,y,lx,flip:sy===below};placed.push(box);break;
    }
    const at=pick||{x:Math.round(p.x-w/2),y:Math.round(above),lx:w/2,flip:false};
    roomLabelPos[item.key]={...at,on:!!pick};el.style.transform=`translate(${at.x}px,${at.y}px)`;el.style.setProperty("--lx",`${at.lx}px`);el.classList.toggle("flip",at.flip);el.classList.toggle("off",!pick);
  }
}
/* What clicking a property does: your own site takes you inside; anything else opens its card. */
function roomLandOpen(key){
  const p=LAND_PLACES.find(x=>x.key===key);if(!p)return;
  roomPanel=null;activeTab="dashboard";
  if(p.facility&&p.facility===state.facility){roomPop=null;state.stageView="room";save()}
  else roomPop={kind:"property",id:key};
  render(false);
}
function roomMachinePick(id){roomPanel=null;activeTab="dashboard";roomPop={kind:"machine",id};render(false)}
/* The canvas survives repaints; put it back in the new stage at once so it never blinks out. */
function roomAttach3d(){
  const host=document.querySelector(".stage-3d");if(!host)return false;
  if(typeof floor3dCanvas!=="undefined"&&floor3dCanvas&&floor3dCanvas.parentElement!==host)host.appendChild(floor3dCanvas);
  if(typeof mountFloor3d==="function")mountFloor3d();
  return true;
}

/* ---- the room itself ------------------------------------------------------------------ */

function roomBand(t){return t<32?"cool":t<42?"warm":t<52?"hot":"critical"}
function roomCanvasHtml(){
  const tier=facilityTier(),width=tier<=2?900:1200,techs=fieldTechnicianCount(),owned=floorOwnedHardware();
  const floorLimit=[12,28,72,110,130,150,170,190][tier-1]||110,shownIcons=Math.min(floorLimit,owned.reduce((sum,h)=>sum+(state.hardware[h.id]||0),0)),iconSize=shownIcons<=16?58:shownIcons<=32?48:shownIcons<=60?40:shownIcons<=90?32:shownIcons<=130?26:shownIcons<=170?22:18;
  const crew=[];(state.maintenance.serviceJobs||[]).filter(j=>!j.contracted&&Number(j.crew||0)>0).forEach(j=>{const jh=HARDWARE.find(x=>x.id===j.id);for(let c=0;c<Number(j.crew||0);c++)crew.push(jh?.name||j.id)});
  const scene=typeof floorScene==="function"?floorScene():null,cooling=miningFloorCooling();
  return `<div class="room-canvas mining-floor-card${scene?` floor-has-scene floor-${scene.kind}`:""}" style="--room-w:${width}px">${typeof floorSceneArtHtml==="function"?floorSceneArtHtml():""}<div class="facility-floor tier-${tier}">${typeof floorSmokeHtml==="function"?floorSmokeHtml():""}<div class="facility-room">${facilityInteriorSvg(tier)}${cooling?`<div class="room-hot room-cooling" data-action="room-pop" data-value="cooling" role="button" tabindex="0" title="Cooling plant: open the cooling options">${cooling}</div>`:""}<div class="floor-units" style="--icon-size:${iconSize}px">${roomUnitsHtml()}</div>${Array.from({length:Math.min(techs,6)},(_,i)=>technicianSprite(i,crew[i]||null)).join("")}</div></div></div>`;
}
/* Something on sale today that the site could rack today. When nothing fits, the tile stops being
   a shop and becomes the way out of the room. */
function roomCanAdd(){return HARDWARE.some(h=>!h.permanent&&state.time>=at(h.date)&&hardwarePurchaseLimits(h).siteMax>0)}
function roomUnitsHtml(){
  const owned=floorOwnedHardware(),released=HARDWARE.some(h=>!h.permanent&&state.time>=at(h.date)),full=released&&!roomCanAdd();
  const units=floorBatches().map(b=>{
    const h=b.hardware,job=b.job,picked=roomPop&&roomPop.kind==="machine"&&roomPop.id===h.id;
    const badge=b.status==="repair"&&job?.part?`<i class="part-badge" data-part="${job.part}">${(sparePart(job.part)?.name||job.part).slice(0,1)}</i>`:"";
    return `<div class="floor-miner ${b.status} ${h.id==="laptop"?"laptop-desk":""}${picked?" picked":""}" data-action="room-pop" data-value="machine" data-id="${h.id}" role="button" tabindex="0" title="${h.name} · ${b.qty>1?`${b.qty} units · `:""}${b.label}">${floorSprite(h.id)}${badge}${b.qty>1?`<b>×${fmtCompactNumber(b.qty)}</b>`:""}</div>`;
  }).join("");
  const add=`<div class="floor-miner room-add${full?" full":""}" data-action="room-pop" data-value="${full?"site":"shop"}" role="button" tabindex="0" title="${full?"Nothing more fits on this floor: open the site to expand":"Add a machine to the floor"}">${roomIcon(full?"expand":"plus")}<span>${full?"Expand":"Add"}</span></div>`;
  return floorSpriteSymbols(owned)+units+add;
}
function roomBarHtml(){
  const f=facility(),fs=fleet(),t=roomTemperatureC(),band=roomBand(t),online=operating();
  const power=fs.cap?Math.min(100,fs.kw/fs.cap*100):0,floor=f.space?Math.min(100,fs.space/f.space*100):0;
  const status=online?"Your machines are mining.":state.policyLock?"Politics has shut the site.":gridCutOff()?"The grid has cut you off.":state.debt>0?"An unpaid bill is in arrears.":"Mining is offline.";
  const latest=EVENTS.filter(e=>at(e.date)<=state.time).sort((a,b)=>at(b.date)-at(a.date))[0];
  return `<div class="room-bar">
    <button class="room-chip room-shop-chip" data-action="room-pop" data-value="shop">${roomIcon("plus")}<span><b>Add a machine</b><small>the shop</small></span></button>
    <button class="room-chip" data-action="room-pop" data-value="site" title="Your site and what it can hold">${roomIcon("site")}<span><b>${f.name}</b><small>${region().name}</small></span></button>
    <span class="room-status ${online?"on":"off"}"><i></i><b id="dashboard-status">${status}</b></span>
    <button class="room-chip room-temp ${band}" data-action="room-pop" data-value="cooling" title="Room temperature: open cooling">${roomIcon("snow")}<span><b>${t.toFixed(0)} °C</b><small>${band}</small></span></button>
    <button class="room-meter ${power>90?"high":""}" data-action="room-pop" data-value="site" title="Electrical capacity in use"><span>Site power used</span><i style="--w:${power.toFixed(1)}%"></i><b>${power.toFixed(0)}%</b></button>
    <button class="room-meter ${floor>90?"high":""}" data-action="room-pop" data-value="site" title="Floor space in use"><span>Floor</span><i style="--w:${floor.toFixed(1)}%"></i><b>${fmtCompactNumber(fs.space)} / ${fmtCompactNumber(f.space)}</b></button>
    ${latest?`<button class="room-chip room-news" data-action="room-panel" data-value="story" title="Open the Bitcoin story">${roomIcon("news")}<span><b>${latest.title}</b><small>${dateFmt(at(latest.date),true)} · the Bitcoin story</small></span></button>`:""}
  </div>`;
}

/* ---- the inspector: what clicking something in the room opens ------------------------- */

function roomInspectorHtml(){
  if(!roomPop)return"";
  const k=roomPop.kind,body=k==="shop"?roomShopHtml():k==="machine"?roomMachineHtml(roomPop.id):k==="site"?roomSiteHtml():k==="cooling"?roomCoolingHtml():k==="property"?roomPropertyHtml(roomPop.id):"";
  if(!body){roomPop=null;return""}
  const h=k==="machine"?HARDWARE.find(x=>x.id===roomPop.id):null,place=k==="property"?LAND_PLACES.find(x=>x.key===roomPop.id):null;
  const kicker={shop:"Shop",machine:h?.era||"Machine",site:region().name,cooling:"Cooling",property:place?roomLandStatus(place)[1]:""}[k],title={shop:"Add a machine",machine:h?.name||"Machine",site:facility().name,cooling:`${roomTemperatureC().toFixed(1)} °C in the room`,property:place?roomLandName(place):""}[k];
  return `<aside class="room-inspector" aria-label="${escapeHtml(title)}"><header><div><span>${kicker}</span><h3>${title}</h3></div><button class="room-x" data-action="room-close" aria-label="Close">${roomIcon("close")}</button></header><div class="room-inspector-body">${body}</div></aside>`;
}
function roomRatio(x){return x>=100?fmtCompactNumber(Math.round(x)):x>=10?x.toFixed(0):x.toFixed(1)}
function roomBuyButton(h,label){
  const limits=hardwarePurchaseLimits(h),afford=limits.fiatMax>0;
  const why=afford?"":limits.supplyMax<1?"None listed for sale right now":`One costs ${fmtUsd(limits.cost)}; you have ${fmtUsd(state.cash)}`;
  return `<button class="action small primary" data-action="buy-hw" data-id="${h.id}" data-value="1" ${afford?"":"disabled"}${why?` title="${escapeHtml(why)}"`:""}>${label||`Buy · ${fmtCompactUsd(limits.cost)}`}</button>`;
}
function roomShopHtml(){
  const forSale=HARDWARE.filter(h=>!h.permanent&&state.time>=at(h.date)).sort((a,b)=>at(b.date)-at(a.date)),shown=forSale.slice(0,4);
  const next=HARDWARE.filter(h=>!h.permanent&&at(h.date)>state.time).sort((a,b)=>at(a.date)-at(b.date))[0];
  const rows=shown.map(h=>{
    const limits=hardwarePurchaseLimits(h),fits=Math.max(0,Math.min(limits.powerMax,limits.spaceMax));
    return `<div class="room-row">${minerSvg(h.id)}<div class="room-row-main"><b>${h.name}</b><small>${fmtHash(h.hash)} · ${fmtNum(h.w)} W · ${fits?`room for ${fmtCompactNumber(fits)}`:"no room today"}</small></div>${roomBuyButton(h)}</div>`;
  }).join("");
  const teaser=next?`<div class="room-next"><span>Next release</span><b>${next.name}</b><small>${dateFmt(at(next.date),true)} · ${unlockInText(next.date)} · ${fmtHash(next.hash)}</small></div>`:"";
  const empty=shown.length?"":`<p class="room-note">Nothing is for sale yet. Your laptop is the whole fleet for now.</p>`;
  return `${empty}${rows}${teaser}<button class="action-link room-more" data-action="room-open" data-value="mine" data-section="buy">Full catalogue${forSale.length>shown.length?` · ${forSale.length-shown.length} more`:""}</button>`;
}
function roomMachineHtml(id){
  const h=HARDWARE.find(x=>x.id===id),n=state.hardware[id]||0;if(!h||n<1)return"";
  const rs=hardwareRepairState(h),paused=rs.paused,reason=hardwareOfflineReason(h),powered=thermalPowerAvailable(),unavailable=reason?Math.max(0,n-paused):rs.repairing,running=Math.max(0,n-paused-unavailable),faulted=hardwareFaultCount(h)>0||rs.repairing>0;
  const power=n===1
    ?`<button class="action small ${running?"danger":"primary"}" data-action="hardware-power" data-id="${h.id}" data-value="${running?"off":"on"}" data-qty="1" ${!running&&!paused?"disabled":""}>${running?"Stop hashing":"Start hashing"}</button>`
    :running?`<button class="action small danger" data-action="hardware-power" data-id="${h.id}" data-value="off" data-qty="${running}">Stop ${fmtCompactNumber(running)}</button>`
    :paused?`<button class="action small primary" data-action="hardware-power" data-id="${h.id}" data-value="on" data-qty="${paused}">Restart ${fmtCompactNumber(paused)}</button>`:"";
  const repair=faulted?`<button class="action small" data-action="room-open" data-value="mine" data-section="service" data-id="${h.id}">Repair</button>`:"";
  const another=!h.permanent&&state.time>=at(h.date)?roomBuyButton(h,`Buy another · ${fmtCompactUsd(hardwareUnitCost(h))}`):"";
  const better=HARDWARE.filter(x=>!x.permanent&&x.id!==h.id&&state.time>=at(x.date)&&x.hash>h.hash).sort((a,b)=>at(b.date)-at(a.date))[0];
  const upgrade=better?`<div class="room-upgrade">${minerSvg(better.id)}<div class="room-row-main"><span>${roomIcon("up")}Upgrade path</span><b>${better.name}</b><small>${roomRatio(better.hash/h.hash)}× the hash for ${roomRatio(better.w/h.w)}× the power</small></div>${roomBuyButton(better)}</div>`:"";
  return `<div class="room-machine">${minerSvg(h.id)}<div><b>${n>1?`${fmtCompactNumber(n)} machines`:"1 machine"}</b><small>${powered?fmtCompactNumber(running):0} hashing${paused?` · ${fmtCompactNumber(paused)} off`:""}${unavailable?` · ${fmtCompactNumber(unavailable)} ${reason?"offline":"in repair"}`:""}</small><small>${fmtHash(h.hash)} · ${fmtNum(h.w)} W each · ${maintenanceCondition(h).toFixed(0)}% condition</small></div></div>${reason?`<p class="room-note warn">${reason}</p>`:""}<div class="room-actions">${power}${repair}${another}</div>${upgrade}<button class="action-link room-more" data-action="room-open" data-value="mine" data-section="floor">Manage in Mine</button>`;
}
function roomMeterRow(label,value,pct){return `<div class="room-meter-row"><span>${label}</span><i style="--w:${Math.min(100,pct).toFixed(1)}%"></i><b>${value}</b></div>`}
function roomSiteHtml(){
  const f=facility(),fs=fleet(),busy=state.facilityUpgradeJob||state.relocationJob,next=FACILITIES[FACILITIES.findIndex(x=>x.id===f.id)+1];
  const job=state.facilityUpgradeJob?`Moving to ${FACILITIES.find(x=>x.id===state.facilityUpgradeJob.id)?.name||"a new site"}`:state.relocationJob?`Relocating to ${REGIONS.find(r=>r.id===state.relocationJob.id)?.name||"a new region"}`:"";
  const due=busy?Math.max(0,Math.ceil(((state.facilityUpgradeJob||state.relocationJob).due-state.time)/DAY)):0;
  let move="";
  if(next){
    const open=state.time>=at(next.date),reserve=facilityReserve(next),short=state.cash<next.cost+reserve;
    const why=!open?"":busy?"A move is already under way":short?`Needs ${fmtUsd(next.cost)} to fit out plus ${fmtUsd(reserve)} kept in cash`:"";
    move=`<div class="room-next site"><span>Next site</span><b>${next.name}</b><small>${next.desc}</small><small>${fmtNum(next.kw)} kW · ${fmtCompactNumber(next.space)} floor · ${fmtUsd(next.rent)}/month</small>${open?`<button class="action small primary" data-action="facility" data-id="${next.id}" ${why?`disabled title="${escapeHtml(why)}"`:""}>Move here · ${fmtCompactUsd(next.cost)}</button>`:`<em>Opens ${dateFmt(at(next.date),true)} · ${unlockInText(next.date)}</em>`}</div>`;
  }
  return `${roomMeterRow("Site power used",`${fs.kw.toFixed(2)} / ${fs.cap.toFixed(1)} kW`,fs.cap?fs.kw/fs.cap*100:0)}${roomMeterRow("Floor",`${fmtCompactNumber(fs.space)} / ${fmtCompactNumber(f.space)}`,f.space?fs.space/f.space*100:0)}<p class="room-note">${f.desc} Rent ${fmtUsd(f.rent)}/month.</p>${job?`<p class="room-note warn">${job} · ${due} day${due===1?"":"s"} left. Mining is paused until it lands.</p>`:""}${move}<button class="action-link room-more" data-action="tab" data-value="facilities">All sites and regions</button>`;
}
function roomPropertyHtml(key){
  const p=LAND_PLACES.find(x=>x.key===key);if(!p)return"";
  const [status,label]=roomLandStatus(p);
  if(p.facility)return roomFacilityHtml(FACILITIES.find(f=>f.id===p.facility),status);
  if(p.kind==="contract"){const on=state.contract===p.contract;return `<p class="room-note">${p.copy}</p><div class="room-actions"><button class="action small ${on?"":"primary"}" data-action="contract" data-id="${p.contract}" ${on?"disabled":""}>${on?"Your current contract":"Sign a curtailment contract"}</button></div><button class="action-link room-more" data-action="tab" data-value="energy">Compare power contracts</button>`}
  if(p.kind==="prospect")return `<p class="room-note">${p.copy}</p><p class="room-note warn">This land is not on the market.</p>`;
  return `<p class="room-note">${p.copy}</p>${status==="closed"?`<p class="room-note warn">${label}.</p>`:`<div class="room-actions"><button class="action small primary" data-action="tab" data-value="${p.tab}">${p.cta}</button></div>`}`;
}
/* A site on the land: yours to enter, one to move to, or one that opens later. The move button is
   the Facilities panel's own action, with the same cost, reserve and refusals. */
function roomFacilityHtml(f,status){
  const fs=fleet(),stats=`<small>${fmtNum(f.kw)} kW · ${fmtCompactNumber(f.space)} floor units · ${fmtUsd(f.rent)}/month</small>`;
  if(status==="yours")return `${roomMeterRow("Site power used",`${fs.kw.toFixed(2)} / ${fs.cap.toFixed(1)} kW`,fs.cap?fs.kw/fs.cap*100:0)}${roomMeterRow("Floor",`${fmtCompactNumber(fs.space)} / ${fmtCompactNumber(f.space)}`,f.space?fs.space/f.space*100:0)}<p class="room-note">${f.desc}</p><div class="room-actions"><button class="action small primary" data-action="room-scale" data-value="room">Go inside</button></div>`;
  const head=`<div class="room-next site"><b>${f.name}</b><small>${f.desc}</small>${stats}`;
  if(status==="moving"){const job=state.facilityUpgradeJob,days=Math.max(0,Math.ceil((job.due-state.time)/DAY));return `${head}</div><p class="room-note warn">The fleet arrives in ${days} day${days===1?"":"s"}. Mining is paused until it does.</p>`}
  if(status==="soon"||status==="far")return `${head}<em>Opens ${dateFmt(at(f.date),true)} · ${unlockInText(f.date)}</em></div>`;
  const down=facilityIsDownsize(f.id),busy=state.facilityUpgradeJob||state.relocationJob,cost=down?facilityDownsizeCost(f):f.cost,reserve=down?0:facilityReserve(f);
  const why=busy?"A move is already under way":down?facilityDownsizeBlockReason(f.id):state.cash<f.cost+reserve?`Needs ${fmtUsd(f.cost)} to fit out plus ${fmtUsd(reserve)} kept in cash`:"";
  return `${head}<button class="action small primary" data-action="facility" data-id="${f.id}" ${why?`disabled title="${escapeHtml(why)}"`:""}>${down?"Downsize":"Move here"} · ${fmtCompactUsd(cost)}</button></div><p class="room-note">${down?"A smaller site: lower rent, if the fleet fits.":`Mining pauses while the fleet moves. ${fmtUsd(reserve)} must stay in cash afterwards.`}</p>`;
}
function roomCoolingHtml(){
  const tier=facilityTier(),target=thermalTargetC(),ambient=ambientTemperatureC(),capacity=coolingCapacityKw(),heat=thermalPowerAvailable()?activeMinerWatts()/1000:0;
  const items=COOLING_EQUIPMENT.filter(item=>state.time>=at(item.date)&&tier>=item.minTier&&tier<=item.maxTier);
  const rows=items.map(item=>{
    const owned=state.thermal.equipment[item.id]||0,afford=state.cash>=item.cost;
    return `<div class="room-row">${coolingItemSvg(item.id)}<div class="room-row-main"><b>${item.name}${owned?` <em>×${fmtCompactNumber(owned)}</em>`:""}</b><small>+${fmtNum(item.coolingKw)} kW cooling · ${fmtNum(item.watts)} W · ${coolingInstallDays(item)}-day fit</small></div><button class="action small primary" data-action="buy-cooling" data-id="${item.id}" ${afford?"":`disabled title="${escapeHtml(`${item.name} costs ${fmtUsd(item.cost)}`)}"`}>${fmtCompactUsd(item.cost)}</button></div>`;
  }).join("");
  return `<p class="room-note">Heading for ${target.toFixed(1)} °C with ${ambient.toFixed(1)} °C outside. Machines put out ${heat.toFixed(2)} kW; the room sheds ${fmtNum(capacity)} kW at +10 °C.</p>${rows||`<p class="room-note">No cooling fits this site yet.</p>`}<button class="action-link room-more" data-action="room-open" data-value="mine" data-section="cooling">Cooling details</button>`;
}

/* ---- wiring --------------------------------------------------------------------------- */

function roomAction(a,b){
  const v=b.dataset.value;
  if(a==="room-pop"){const next={kind:v,id:b.dataset.id||null};roomPop=roomPop&&roomPop.kind===next.kind&&roomPop.id===next.id?null:next;if(roomPop&&roomPop.kind!=="property"&&state.stageView!=="room"){state.stageView="room";save()}render(false);return}
  if(a==="room-close"){roomPop=null;render(false);return}
  if(a==="room-scale"){roomPop=null;roomPanel=null;activeTab="dashboard";state.stageView=v==="room"?"room":"land";save();render(false);return}
  if(a==="room-land"){roomLandOpen(v);return}
  if(a==="room-panel"){roomPop=null;const same=activeTab==="dashboard"&&roomPanel===v;activeTab="dashboard";roomPanel=same?null:v;render(false);window.scrollTo({top:0,behavior:"instant"});return}
  if(a==="room-close-drawer"){roomPop=null;roomPanel=null;activeTab="dashboard";render(false);window.scrollTo({top:0,behavior:"instant"});return}
  if(a==="room-open"){
    roomPop=null;activeTab=openTab(v);
    if(v==="mine"&&b.dataset.section)state.mineSection=b.dataset.section;
    save();render(false);window.scrollTo({top:0,behavior:"instant"});
    if(b.dataset.section==="service"&&b.dataset.id&&typeof focusServiceRow==="function")requestAnimationFrame(()=>requestAnimationFrame(()=>focusServiceRow(b.dataset.id)));
    return;
  }
  if(a==="room-guide"){guideOpen=!guideOpen;document.querySelector(".drawer .section-orientation")?.classList.toggle("guide-open",guideOpen);b.setAttribute("aria-expanded",String(guideOpen));b.textContent=guideOpen?"Hide guide":"Guide";return}
  if(a==="coach-toggle"){coachOpen=!coachOpen;const coach=b.closest(".stage-coach");if(coach)coach.classList.toggle("open",coachOpen);b.setAttribute("aria-expanded",String(coachOpen));b.textContent=coachOpen?"Less":"Why?";return}
  if(a==="game-menu"){gameMenuOpen=!gameMenuOpen;const menu=document.getElementById("game-menu");if(menu)menu.hidden=!gameMenuOpen;b.setAttribute("aria-expanded",String(gameMenuOpen));}
}
function roomOwnsAction(a){return a.indexOf("room-")===0||a==="coach-toggle"||a==="game-menu"}

/* The room is drawn at its art's own size and scaled to the space it is given, so the laptop stays
   on its desk and the machines stay on the floor at any width. On the room alone it is also held
   inside the window's height, centred, so the toolbelt never falls below the fold. */
const ROOM_CANVAS_H=340;
function fitRoom(){
  const frame=document.querySelector(".room-frame"),canvas=frame&&frame.querySelector(".room-canvas");if(!canvas)return;
  const width=parseFloat(canvas.style.getPropertyValue("--room-w"))||900,avail=frame.clientWidth;if(!avail)return;
  let scale=avail/width;
  if(!document.body.classList.contains("drawer-open")){
    const stage=frame.closest(".stage"),below=(stage?.querySelector(".room-bar")?.offsetHeight||0)+(stage?.querySelector(".room-queue")?.offsetHeight||0)+(stage?.querySelector(".room-dock")?.offsetHeight||0);
    const top=frame.getBoundingClientRect().top+(window.scrollY||0),room=window.innerHeight-top-below-56;
    if(room>220)scale=Math.min(scale,room/ROOM_CANVAS_H);
  }
  scale=Math.max(.25,scale);
  frame.style.setProperty("--room-scale",scale.toFixed(4));
  frame.style.setProperty("--room-x",`${Math.max(0,(avail-width*scale)/2).toFixed(1)}px`);
}
/* The per-tab orientation panel becomes a strip in a panel: what the page is for and the next
   move stay in view, the rest opens on Guide. */
function roomGuideToggle(){
  const panel=document.querySelector(".drawer .section-orientation");if(!panel||panel.querySelector(".guide-toggle"))return;
  panel.classList.toggle("guide-open",guideOpen);
  panel.insertAdjacentHTML("afterbegin",`<button class="guide-toggle" data-action="room-guide" aria-expanded="${guideOpen}">${guideOpen?"Hide guide":"Guide"}</button>`);
}
function afterRoomRender(){
  document.body.classList.toggle("drawer-open",!!document.querySelector(".room-shell.drawer-open"));
  roomGuideToggle();
  if(!roomAttach3d())fitRoom();
}
/* Mine repaints its own panel without a full render; the room beside it still has to show what
   that panel just changed. */
function refreshRoom(){
  const stage=document.querySelector(".room-shell .stage");if(!stage)return;
  stage.innerHTML=roomStageHtml(roomDrawerKind());
  if(!roomAttach3d())fitRoom();
}
window.addEventListener("resize",fitRoom);
/* Escape closes what the room opened before anything else hears it: the tutorial treats Escape as
   Skip, and closing an inspector must never also end the tutorial. */
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape"||document.querySelector(".modal-backdrop"))return;
  if(gameMenuOpen){gameMenuOpen=false;const m=document.getElementById("game-menu");if(m)m.hidden=true}
  else if(roomPop){roomPop=null;render(false)}
  else return;
  e.preventDefault();e.stopPropagation();
},true);
document.addEventListener("keydown",e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches('[role="button"][data-action^="room-"]')){e.preventDefault();e.target.click()}
});
