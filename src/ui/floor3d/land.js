"use strict";

/* THE LAND - the country around the operation, drawn on the floor's renderer as a diorama.

   One fixed piece of country: mountains to the north feeding a river through a dam, a town on
   its bank, an industrial road east to the power station, farmland to the south and a lake in
   the west. Every site the game sells has a plot on it, and so do the businesses the operation
   deals with. Which plot is yours, which are open and which are still years away comes from
   roomLandModel() in room.js; this file only draws what it is told.

   The terrain, its painted texture and the plots never change, so they are worked out once per
   page. The buildings on them are rebuilt when a status or the year changes. Every building is
   stamped with its property index the way floor batches are, so picking reuses the floor's own
   pick table. Nothing here touches game state. */

const FloorLand=(()=>{
  const T=FloorThree,W=150,D=100,NX=150,NZ=100,BASE=-6;
  const RIVER=[[42,-54],[39,-45],[34,-37],[31,-31],[24,-22],[15,-12],[6,-3],[-4,4],[-16,12],[-29,19],[-42,26],[-56,34]];
  const DAM={x:32.8,z:-34.6},RESERVOIR={x:37.5,z:-43,rx:7.5,rz:6.5,floor:4.3,level:6.1},LAKE={x:-57,z:34,rx:14,rz:8.5};
  const ROADS=[[[-40,9],[-12,6],[0,5],[18,6],[34,9],[52,4],[75,2]],[[18,6],[22,-6],[27,-18],[34,-24],[39,-28]],[[8,20],[-2,28],[-4,30]],[[34,9],[38,20],[44,26]],[[52,4],[56,-2]],[[-12,6],[-11,-13]]];
  const STREETS=[[[2,13],[28,13]],[[2,21],[26,21]],[[8,4],[8,26]],[[16,4],[16,26]],[[24,4],[24,26]]];
  const RAIL=[[75,42],[48,39],[20,40],[0,46],[-40,48],[-75,49]];
  /* Plots: where each property stands and how much flat ground it gets. */
  const SITES={
    home:{x:12,z:17,w:6,d:5},friend:{x:3.6,z:17,w:4,d:4},bank:{x:12,z:8.4,w:6.5,d:5},library:{x:20,z:16.8,w:6.5,d:5.6},
    exchange:{x:4.2,z:8.6,w:4.6,d:4.6},poolhq:{x:20,z:24.6,w:6.5,d:4.4},garage:{x:31,z:17,w:5,d:5},workshop:{x:42,z:15,w:14,d:8},
    warehouse:{x:59,z:20,w:20,d:13},container:{x:48,z:31,w:16,d:9},power:{x:50,z:-8,w:14,d:10},campus:{x:65,z:-3,w:16,d:14},
    megacampus:{x:-18,z:36,w:28,d:13},landfill:{x:-52,z:10,w:20,d:16},hydroplant:{x:39,z:-27,w:10,d:6},mast:{x:-11,z:-15,w:3.4,d:3.4},
    windfarm:{x:62,z:-19,w:25,d:5}
  };
  const PAD_KIND={home:"garden",friend:"garden",bank:"plaza",library:"plaza",exchange:"plaza",poolhq:"concrete",garage:"concrete",workshop:"concrete",warehouse:"concrete",container:"concrete",power:"concrete",campus:"concrete",megacampus:"concrete",landfill:"dirt",hydroplant:"concrete",mast:"gravel"};

  /* ---- noise and distances --------------------------------------------------------------- */
  function hash(x,z){let h=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296}
  function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf),a=hash(xi,zi),b=hash(xi+1,zi),c=hash(xi,zi+1),d=hash(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
  function fbm(x,z){let s=0,a=.5,f=1;for(let i=0;i<4;i++){s+=a*vnoise(x*f,z*f);f*=2.03;a*=.5}return s/.9375}
  function sm(a,b,v){const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)}
  function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.min(1,Math.max(0,((px-ax)*dx+(pz-az)*dz)/l)):0,x=ax+dx*t-px,z=az+dz*t-pz;return{d:Math.sqrt(x*x+z*z),t}}
  const RIVER_LEN=RIVER.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-RIVER[i][0],p[1]-RIVER[i][1]),0);
  function riverDist(x,z){let best=1e9,prog=0,acc=0;for(let i=1;i<RIVER.length;i++){const a=RIVER[i-1],b=RIVER[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),r=segDist(x,z,a[0],a[1],b[0],b[1]);if(r.d<best){best=r.d;prog=(acc+r.t*len)/RIVER_LEN}acc+=len}return{d:best,s:prog}}
  function lineDist(lines,x,z){let best=1e9;for(const line of lines)for(let i=1;i<line.length;i++){const d=segDist(x,z,line[i-1][0],line[i-1][1],line[i][0],line[i][1]).d;if(d<best)best=d}return best}
  function riverHalf(s){return 2+s*1.9}

  /* ---- the ground ------------------------------------------------------------------------ */
  function natural(x,z){
    let h=1.15+(fbm(x*.032+3.1,z*.032+7.7)-.5)*3.2;
    const north=sm(-15,-47,z);h+=north*north*(8.5+fbm(x*.075+5,z*.075+2)*17);
    h+=sm(-50,-74,x)*sm(26,0,z)*fbm(x*.06+11,z*.06+3)*8;
    const rz=(z+19)/4;h+=Math.exp(-rz*rz)*sm(46,54,x)*3.6;
    return h;
  }
  const PADS=Object.entries(SITES).filter(([k])=>k!=="windfarm").map(([k,s])=>({k,...s,h:Math.max(.7,natural(s.x,s.z))}));
  function heightAt(x,z){
    let h=natural(x,z);
    for(const p of PADS){const dx=Math.max(0,Math.abs(x-p.x)-p.w/2),dz=Math.max(0,Math.abs(z-p.z)-p.d/2),k=sm(3.4,0,Math.hypot(dx,dz));if(k>0)h+=(p.h-h)*k}
    const r=riverDist(x,z),half=riverHalf(r.s),k=sm(half+4.2,half,r.d);
    if(k>0){const floor=z<DAM.z?RESERVOIR.floor:-1.3;h+=(Math.min(floor,h)-h)*k}
    const rb=((x-RESERVOIR.x)/RESERVOIR.rx)**2+((z-RESERVOIR.z)/RESERVOIR.rz)**2;if(rb<2)h+=(Math.min(RESERVOIR.floor,h)-h)*sm(1.9,1,rb);
    const lb=((x-LAKE.x)/LAKE.rx)**2+((z-LAKE.z)/LAKE.rz)**2;if(lb<2.2)h+=(Math.min(-1.6,h)-h)*sm(2.1,.85,lb);
    return h;
  }
  let grid=null;
  function ensureGrid(){
    if(grid)return;grid=new Float32Array((NX+1)*(NZ+1));
    for(let j=0;j<=NZ;j++)for(let i=0;i<=NX;i++)grid[j*(NX+1)+i]=heightAt(i/NX*W-W/2,j/NZ*D-D/2);
  }
  function groundAt(x,z){
    const gx=Math.min(NX-1e-6,Math.max(0,(x+W/2)/W*NX)),gz=Math.min(NZ-1e-6,Math.max(0,(z+D/2)/D*NZ)),i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,r=NX+1;
    const a=grid[j*r+i],b=grid[j*r+i+1],c=grid[(j+1)*r+i],d=grid[(j+1)*r+i+1];
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
  }
  function slopeAt(x,z){return (Math.abs(groundAt(x+.6,z)-groundAt(x-.6,z))+Math.abs(groundAt(x,z+.6)-groundAt(x,z-.6)))/1.2}
  function forestAt(x,z){return fbm(x*.055+40,z*.055-12)}
  function inPad(x,z,m=0){for(const p of PADS)if(Math.abs(x-p.x)<p.w/2+m&&Math.abs(z-p.z)<p.d/2+m)return true;return false}
  const TOWN={x0:0,x1:29,z0:3,z1:27},FARMS=[[18,74,42.5,49.6],[60,74.6,27,38]];
  function inZone(z,x,zz){return x>=z[0]&&x<=z[1]&&zz>=z[2]&&zz<=z[3]}

  /* The painted ground: colour by height and slope, then fields, plots, roads and rail drawn over. */
  const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  const COL={bed:[38,66,66],sand:[201,184,138],wet:[163,150,112],grassA:[104,148,74],grassB:[138,170,88],forest:[58,96,56],alpine:[122,136,98],rock:[128,122,110],rock2:[148,142,128],snow:[236,240,238]};
  function groundColour(x,z,h,s){
    if(h<-.25)return COL.bed;
    if(h<.5)return mix(COL.wet,COL.sand,sm(-.25,.4,h));
    let c=mix(COL.grassA,COL.grassB,vnoise(x*.09+7,z*.09+3));
    const f=forestAt(x,z);if(f>.5&&h<10)c=mix(c,COL.forest,sm(.5,.62,f)*.85);
    c=mix(c,COL.alpine,sm(5.5,9,h));
    c=mix(c,mix(COL.rock,COL.rock2,vnoise(x*.3,z*.3)),Math.max(sm(.75,1.25,s),sm(10,13,h)*.6));
    c=mix(c,COL.snow,sm(12.2,15,h)*(1-sm(1.3,2,s)*.55));
    if(h<1.1)c=mix(COL.sand,c,sm(.5,1.1,h));
    return c;
  }
  let paintedGround=null;
  function paintGround(){
    if(paintedGround)return paintedGround;
    const TW=900,TH=600,cv=document.createElement("canvas");cv.width=TW;cv.height=TH;const g=cv.getContext("2d"),img=g.createImageData(TW,TH),px=img.data;
    for(let py=0;py<TH;py++){const z=(py+.5)/TH*D-D/2;for(let pi=0;pi<TW;pi++){const x=(pi+.5)/TW*W-W/2,h=groundAt(x,z),c=groundColour(x,z,h,slopeAt(x,z)),j=1+(hash(pi,py)-.5)*.06,o=(py*TW+pi)*4;px[o]=c[0]*j;px[o+1]=c[1]*j;px[o+2]=c[2]*j;px[o+3]=255}}
    g.putImageData(img,0,0);
    const sx=x=>(x+W/2)/W*TW,sz=z=>(z+D/2)/D*TH,u=TW/W;
    const fieldCols=["#c9b45a","#8fb058","#8a6b4a","#d6c552","#a7b866","#7a9a4a","#b59a5c"];
    for(const zone of FARMS){
      for(let x=zone[0];x<zone[1];){const fw=5.5+hash(x*7|0,3)*4;for(let z=zone[2];z<zone[3];){const fd=3.2+hash(x*3|0,z*5|0)*3,cx=x+fw/2,cz=z+fd/2;
        if(lineDist([RAIL],cx,cz)>3&&lineDist(ROADS,cx,cz)>2.4&&!inPad(cx,cz,1)){g.fillStyle=fieldCols[Math.floor(hash(x*11|0,z*13|0)*fieldCols.length)];g.globalAlpha=.88;g.fillRect(sx(x)+1,sz(z)+1,fw*u-2,fd*u-2);g.globalAlpha=.14;g.fillStyle="#2a2416";for(let k=2;k<fd*u-2;k+=3)g.fillRect(sx(x)+1,sz(z)+k,fw*u-2,1);g.globalAlpha=1}
        z+=fd}x+=fw}
    }
    const padCol={garden:"#77a356",plaza:"#b6ad9a",concrete:"#a9aca6",dirt:"#8c7b59",gravel:"#948f84"};
    for(const p of PADS){g.fillStyle=padCol[PAD_KIND[p.k]]||"#a9aca6";g.fillRect(sx(p.x-p.w/2),sz(p.z-p.d/2),p.w*u,p.d*u);g.strokeStyle="rgba(40,44,42,.35)";g.lineWidth=1;g.strokeRect(sx(p.x-p.w/2)+.5,sz(p.z-p.d/2)+.5,p.w*u-1,p.d*u-1)}
    const stroke=(lines,width,col,dash)=>{g.strokeStyle=col;g.lineWidth=width*u;g.lineCap="round";g.lineJoin="round";g.setLineDash(dash||[]);for(const line of lines){g.beginPath();line.forEach(([x,z],i)=>i?g.lineTo(sx(x),sz(z)):g.moveTo(sx(x),sz(z)));g.stroke()}g.setLineDash([])};
    stroke([RAIL],1.5,"#5a4a3c",[2,3]);stroke([RAIL],.5,"#2f2b28");
    stroke(STREETS,1.1,"#555a5b");stroke(ROADS,1.7,"#3c4143");stroke(ROADS,.12,"#d8cf9c",[6,8]);
    paintedGround=cv;return cv;
  }

  /* ---- instanced parts, stamped with the property they belong to ------------------------- */
  function makeBuilder(){
    const geos={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(.5,.5,1,14),cone:new T.CylinderGeometry(0,.5,1,7),taper:new T.CylinderGeometry(.28,.5,1,10),pylon:new T.CylinderGeometry(.1,.5,1,4),frustum:new T.CylinderGeometry(.36,.5,1,20)};
    const buckets=new Map(),d=new T.Object3D(),c=new T.Color();d.rotation.order="YXZ";
    function part(kind,pos,size,color,o={}){
      const look=o.hit?"h":o.glow?"g":o.unlit?"u":o.metal?"m":"s",key=kind+"|"+look;let b=buckets.get(key);
      if(!b){b={kind,look,m:[],c:[],pid:[]};buckets.set(key,b)}
      d.position.set(pos[0],pos[1],pos[2]);d.rotation.set(o.rx||0,o.ry||0,o.rz||0);d.scale.set(size[0],size[1],size[2]);d.updateMatrix();
      b.m.push(...d.matrix.elements);c.set(color);b.c.push(c.r,c.g,c.b);b.pid.push(o.pid===undefined?-1:o.pid);
    }
    function finish(root,materials){
      for(const b of buckets.values()){
        const mat=b.look==="h"?new T.MeshBasicMaterial({visible:false}):b.look==="g"?new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.42,blending:2,depthWrite:false}):b.look==="u"?new T.MeshBasicMaterial({color:0xffffff}):new T.MeshStandardMaterial({color:0xffffff,roughness:b.look==="m"?.28:.84,metalness:b.look==="m"?.72:.04,flatShading:b.kind!=="cyl"});
        materials.push(mat);
        const mesh=new T.InstancedMesh(geos[b.kind],mat,b.pid.length);mesh.instanceMatrix.array.set(b.m);mesh.setColorAt(0,c);mesh.instanceColor.array.set(b.c);
        mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();mesh.userData.batchIds=b.pid;mesh.userData.glow=b.look==="g";
        if(b.look==="s"||b.look==="m"){mesh.castShadow=true;mesh.receiveShadow=true}
        if(b.look==="g")mesh.renderOrder=2;
        root.add(mesh);
      }
      return geos;
    }
    return{part,finish,geos};
  }

  /* ---- buildings --------------------------------------------------------------------------- */
  const WALLS=[0xe7dcc4,0xd8c3a5,0xc9b8a3,0xe2d6c2,0xb7a48f,0xd6cbb5,0xcdbfa8],ROOFS=[0xa8503a,0x8c4a3a,0x5f6a6e,0x7a5643,0x96583f],LIT=0xffd590,GLASS=0x2c3b42;
  function rot(x,z,ry){const c=Math.cos(ry),s=Math.sin(ry);return(lx,lz)=>[x+lx*c+lz*s,z-lx*s+lz*c]}
  function house(B,x,y,z,w,d,h,wall,roof,ry,pid,lit){
    const at=rot(x,z,ry);B.part("box",[x,y+h/2,z],[w,h,d],wall,{ry,pid});
    B.part("box",[x,y+h,z],[w*1.05,d*.72,d*.72],roof,{ry,rx:Math.PI/4,pid});
    const [cx,cz]=at(-w*.28,-d*.18);B.part("box",[cx,y+h+d*.32,cz],[.42,d*.55,.42],0x8a6a58,{ry,pid});
    for(const k of [-.25,.25]){const [wx,wz]=at(w*k,d/2+.03);B.part("box",[wx,y+h*.5,wz],[w*.17,h*.28,.06],lit?LIT:GLASS,{ry,unlit:true,pid})}
  }
  function fence(B,s,y,col,pid){
    for(const side of [-1,1]){B.part("box",[s.x,y+.5,s.z+side*s.d/2],[s.w,.08,.08],col,{pid});B.part("box",[s.x+side*s.w/2,y+.5,s.z],[.08,.08,s.d],col,{pid})}
    for(let k=0;k<=Math.ceil(s.w/1.6);k++)for(const side of [-1,1])B.part("box",[s.x-s.w/2+k*s.w/Math.ceil(s.w/1.6),y+.35,s.z+side*s.d/2],[.1,.7,.1],col,{pid});
  }
  function construction(B,s,y,pid,cranes=1){
    fence(B,s,y,0xc9a95a,pid);
    for(let i=0;i<cranes;i++){
      const cx=s.x-s.w*.28+i*s.w*.4,cz=s.z-s.d*.15,hh=8+Math.min(6,s.w*.25);
      B.part("box",[cx,y+hh/2,cz],[.45,hh,.45],0xe1b23a,{pid});
      B.part("box",[cx+2.6,y+hh+.2,cz],[8,.38,.38],0xe1b23a,{pid});
      B.part("box",[cx-1.6,y+hh+.2,cz],[2.4,.38,.38],0xe1b23a,{pid});
      B.part("box",[cx-2.4,y+hh-.3,cz],[1,.9,.9],0x4a4f52,{pid});
      B.part("box",[cx+5,y+hh-1.8,cz],[.05,3.8,.05],0x2a2e30,{pid});
    }
    for(const dx of [-.3,0,.3])for(const dz of [-.25,.25])B.part("box",[s.x+dx*s.w,y+1.5,s.z+dz*s.d],[.28,3,.28],0x8d9497,{pid});
    B.part("box",[s.x,y+3,s.z],[s.w*.7,.22,s.d*.6],0x9aa1a3,{pid});
  }
  function forSale(B,s,y,pid){B.part("box",[s.x,y+.8,s.z+s.d/2-.6],[.12,1.6,.12],0x6b5a48,{pid});B.part("box",[s.x,y+1.5,s.z+s.d/2-.55],[1.6,.9,.08],0xf2e6c8,{pid});B.part("box",[s.x,y+1.5,s.z+s.d/2-.5],[1.2,.18,.02],0xd9534a,{pid,unlit:true})}
  function hit(B,s,y,h,pid){B.part("box",[s.x,y+h/2,s.z],[s.w,h,s.d],0,{hit:true,pid})}

  /* Each property: what it looks like open. Returns the height its label floats at. */
  const DRAW={
    home(B,s,y,pid){house(B,s.x-.4,y,s.z,4.2,3.4,2.6,0xeadfc6,0xb4553a,0,pid,true);house(B,s.x+2.4,y,s.z+.5,2.2,2.6,2,0xe0d2b6,0x9a4a35,0,pid,true);B.part("cone",[s.x-2.4,y+1.6,s.z+1.8],[1.4,2.8,1.4],0x3f6e3c,{pid});B.part("box",[s.x+.9,y+.3,s.z+2.2],[.3,.6,.3],0xc0392b,{pid});return 5.2},
    friend(B,s,y,pid){B.part("box",[s.x,y+2.9,s.z],[3.4,5.8,3.4],0xc7a586,{pid});for(let f=0;f<3;f++)for(const k of [-.9,0,.9])B.part("box",[s.x+k,y+1.2+f*1.7,s.z+1.73],[.55,.7,.05],hash(f,k*9|0)>.4?LIT:GLASS,{pid,unlit:true});B.part("box",[s.x,y+5.9,s.z],[3.6,.25,3.6],0x5e5148,{pid});B.part("cyl",[s.x+1.2,y+7.4,s.z-1],[.1,3,.1],0xcfd3d1,{pid});B.part("box",[s.x+1.85,y+8.4,s.z-1],[1.3,.75,.05],0xf7931a,{pid});B.part("box",[s.x+1.85,y+8.4,s.z-.97],[1.3,.2,.02],0x1d1d1b,{pid,unlit:true});return 9.6},
    bank(B,s,y,pid){B.part("box",[s.x,y+.25,s.z],[6.4,.5,4.8],0xcfc6b2,{pid});B.part("box",[s.x,y+2.2,s.z-.3],[5.8,3.4,3.8],0xe6dfcd,{pid});for(let k=0;k<5;k++)B.part("cyl",[s.x-2.4+k*1.2,y+2,s.z+1.9],[.42,3,.42],0xf1ebdc,{pid});B.part("box",[s.x,y+3.75,s.z],[6.4,.45,4.6],0xd9d1bd,{pid});B.part("box",[s.x,y+4,s.z+1.9],[6.2,1.25,1.25],0xd9d1bd,{pid,rx:Math.PI/4});return 6.4},
    library(B,s,y,pid){B.part("box",[s.x,y+1.7,s.z],[6,3.4,4.6],0xd8cdb6,{pid});B.part("box",[s.x,y+3.5,s.z],[6.2,.3,4.8],0xc4b89f,{pid});B.part("cyl",[s.x,y+4.3,s.z],[3,1.4,3],0xd8cdb6,{pid});B.part("cone",[s.x,y+5.9,s.z],[3.5,1.9,3.5],0x6f9a8e,{pid});for(const k of [-2,-1,0,1,2])B.part("box",[s.x+k*1.1,y+1.8,s.z+2.33],[.5,1.4,.05],GLASS,{pid,unlit:true});return 8},
    exchange(B,s,y,pid){B.part("box",[s.x,y+6.5,s.z],[3.8,13,3.8],0x5b8fae,{pid,metal:true});B.part("box",[s.x,y+13.2,s.z],[4.2,.5,4.2],0x3a4f5c,{pid});for(let f=1;f<8;f++){B.part("box",[s.x,y+f*1.6,s.z+1.92],[3.6,.1,.04],0xa9d7ff,{pid,unlit:true});B.part("box",[s.x+1.92,y+f*1.6,s.z],[.04,.1,3.6],0xa9d7ff,{pid,unlit:true})}return 15.4},
    poolhq(B,s,y,pid){B.part("box",[s.x,y+1.6,s.z],[6,3.2,3.8],0x8fa3ab,{pid});for(let k=0;k<4;k++)B.part("cyl",[s.x-2+k*1.3,y+3.45,s.z],[.8,.5,.8],0x4a575d,{pid});B.part("box",[s.x+2.4,y+5,s.z-1.2],[.12,4,.12],0xb9bcbd,{pid});for(let k=0;k<5;k++)B.part("box",[s.x-2.2+k*1.1,y+1,s.z+1.93],[.12,.12,.04],0x75e3b2,{pid,unlit:true});return 7.4},
    garage(B,s,y,pid){B.part("box",[s.x,y+1.3,s.z],[4.2,2.6,4.2],0xa9b1b3,{pid});B.part("box",[s.x,y+2.65,s.z],[4.4,.18,4.4],0x5f676a,{pid});B.part("box",[s.x,y+1,s.z+2.12],[2.8,2,.08],0x5a6266,{pid});for(let k=0;k<6;k++)B.part("box",[s.x,y+.2+k*.33,s.z+2.17],[2.8,.04,.02],0x7b8488,{pid});return 4.4},
    workshop(B,s,y,pid){B.part("box",[s.x,y+2,s.z],[13,4,7],0xbfc5c4,{pid});for(const k of [-2.3,0,2.3])B.part("box",[s.x,y+4,s.z+k],[13.2,1.55,1.55],0x8e979a,{pid,rx:Math.PI/4});for(const k of [-4,0,4])B.part("box",[s.x+k,y+1.4,s.z+3.53],[2.4,2.6,.06],0x5d6669,{pid});for(let k=0;k<4;k++)B.part("box",[s.x-5+k*1.1,y+.4,s.z+5],[.9,.8,.9],0x9b7a50,{pid});return 7},
    warehouse(B,s,y,pid){B.part("box",[s.x,y+3,s.z],[19,6,12],0xc9cdc9,{pid});B.part("box",[s.x,y+4.7,s.z],[19.1,.6,12.1],0xd98a2b,{pid});for(let k=0;k<6;k++)B.part("cyl",[s.x-7.5+k*3,y+6.3,s.z],[1,.6,1],0x8a9396,{pid});for(let k=0;k<4;k++)B.part("box",[s.x-6+k*4,y+1.3,s.z+6.03],[2.6,2.6,.06],0x4e5659,{pid});for(const k of [-4,4]){B.part("box",[s.x+k,y+1.1,s.z+8.3],[2.2,2.2,4.2],0xe8eaea,{pid});B.part("box",[s.x+k,y+.9,s.z+6.8],[2,1.8,1.4],0x2f6f9f,{pid})}return 9},
    container(B,s,y,pid){const cols=[0xc2462e,0x2f6f9f,0xd9a23a,0x3f8a5c,0x8d8f91,0xb05a2a];for(let r=0;r<4;r++)for(let c=0;c<5;c++){const stack=1+(hash(r*7,c*5)>.55?1:0);for(let k=0;k<stack;k++)B.part("box",[s.x-6+c*3,y+.65+k*1.3,s.z-3+r*2],[2.8,1.25,1.25],cols[Math.floor(hash(r*3+k,c*11)*cols.length)],{pid})}B.part("box",[s.x+7,y+1,s.z+3.2],[2,2,1.6],0xdedcd2,{pid});for(const k of [-7.4,7.4]){B.part("cyl",[s.x+k,y+4,s.z-4],[.2,8,.2],0x9aa1a3,{pid});B.part("box",[s.x+k,y+8.1,s.z-4],[.8,.3,.5],0xfff1c4,{pid,unlit:true})}return 9.5},
    power(B,s,y,pid){B.part("box",[s.x-2,y+2.75,s.z+1],[10,5.5,6.5],0x9aa1a4,{pid});B.part("box",[s.x-2,y+5.7,s.z+1],[10.2,.4,6.7],0x6d7477,{pid});B.part("cyl",[s.x-5.5,y+8.5,s.z-2.5],[1.5,17,1.5],0xcfd1ce,{pid});for(const h of [13,15.5])B.part("cyl",[s.x-5.5,y+h,s.z-2.5],[1.56,.8,1.56],0xb84a3a,{pid});B.part("frustum",[s.x+3.8,y+4.8,s.z-1.6],[7,9.6,7],0xd2d5d2,{pid});for(let k=0;k<3;k++)B.part("box",[s.x+3.2+k*1.3,y+.9,s.z+3.6],[1,1.8,1],0x6c7a7f,{pid});return 18.5},
    campus(B,s,y,pid){for(const k of [-4.6,0,4.6]){B.part("box",[s.x-1,y+1.8,s.z+k],[13,3.6,3.2],0xd3d7d5,{pid});for(let f=0;f<5;f++)B.part("cyl",[s.x-6+f*2.5,y+3.75,s.z+k],[1.1,.35,1.1],0x3f4a4f,{pid})}for(let k=0;k<4;k++){B.part("box",[s.x+7,y+.8,s.z-5+k*2.6],[1.4,1.6,1.1],0x6f7d82,{pid});B.part("cyl",[s.x+7,y+1.9,s.z-5+k*2.6],[.2,.7,.2],0xd8dcd9,{pid})}return 6.6},
    megacampus(B,s,y,pid){for(let r=0;r<3;r++)for(const c of [-6.6,6.6]){B.part("box",[s.x+c,y+1.6,s.z-4+r*3.6],[12,3.2,2.6],0xd6dad8,{pid});for(let f=0;f<5;f++)B.part("cyl",[s.x+c-4.8+f*2.4,y+3.35,s.z-4+r*3.6],[1,.3,1],0x3f4a4f,{pid})}for(const k of [-12,12]){B.part("pylon",[s.x+k,y+5,s.z-5.8],[1.2,10,1.2],0x9ea4a6,{pid});B.part("box",[s.x+k,y+9.6,s.z-5.8],[4,.25,.25],0x9ea4a6,{pid})}return 12.5},
    landfill(B,s,y,pid){B.part("frustum",[s.x,y+1.6,s.z],[18,3.2,13],0x7f8c52,{pid});B.part("box",[s.x+3,y+3.1,s.z+1.5],[6,.9,4.5],0x7a6448,{pid});for(let k=0;k<8;k++)B.part("cyl",[s.x-5+hash(k,2)*9,y+3.4,s.z-4+hash(k,5)*7],[.22,.7,.22],0xc8ccc9,{pid});B.part("cyl",[s.x-8.4,y+3,s.z+5.6],[.5,6,.5],0x8d9294,{pid});for(const k of [0,1])B.part("box",[s.x+6+k*2.4,y+.7,s.z+6.4],[1.6,1.1,1],0xd9b23a,{pid});return 8},
    hydroplant(B,s,y,pid,status){B.part("box",[s.x-1.8,y+2,s.z],[5.4,4,4.6],0xc6cac7,{pid});B.part("box",[s.x-1.8,y+4.1,s.z],[5.6,.25,4.8],0x7a8285,{pid});if(status==="soon"||status==="far")return 8;B.part("box",[s.x+2.8,y+1.5,s.z+.2],[4,3,5.4],0xd0d4d2,{pid});for(let f=0;f<3;f++)B.part("cyl",[s.x+2.8,y+3.1,s.z-1.8+f*1.8],[1,.3,1],0x3f4a4f,{pid});return 8},
    mast(B,s,y,pid){B.part("pylon",[s.x,y+7,s.z],[1.3,14,1.3],0xb8bcbd,{pid});for(const k of [0,2.1,4.2])B.part("cyl",[s.x+Math.cos(k)*.5,y+11.5,s.z+Math.sin(k)*.5],[.7,.25,.7],0xdfe3e1,{pid,rx:Math.PI/2,ry:k});B.part("box",[s.x+1.4,y+.7,s.z+1],[1.6,1.4,1.4],0xbfc3c1,{pid});return 16},
    windfarm(B,s,y,pid){return 12}
  };
  /* What may stand on a plot: a building, a building site a few years out, or a for-sale sign. */
  const BIG={megacampus:3,container:2,campus:2,warehouse:2,hydroplant:1};

  /* ---- the rest of the country --------------------------------------------------------------- */
  function trees(B){
    let n=0;
    for(let z=-D/2+1;z<D/2-1;z+=1.55)for(let x=-W/2+1;x<W/2-1;x+=1.55){
      const jx=x+(hash(x*10|0,z*10|0)-.5)*1.2,jz=z+(hash(z*10|0,x*7|0)-.5)*1.2,h=groundAt(jx,jz);
      if(h<.8||h>11.5||slopeAt(jx,jz)>.95)continue;
      const f=forestAt(jx,jz),town=jx>TOWN.x0-1&&jx<TOWN.x1+1&&jz>TOWN.z0-1&&jz<TOWN.z1+1;
      const wild=f>.52?.78:f>.45?.18:.025;
      if(hash(jx*31|0,jz*17|0)>(town?.06:wild))continue;
      if(inPad(jx,jz,1.6)||FARMS.some(zn=>inZone(zn,jx,jz))||lineDist(ROADS,jx,jz)<2||lineDist(STREETS,jx,jz)<1.4||lineDist([RAIL],jx,jz)<1.8)continue;
      if(riverDist(jx,jz).d<riverHalf(riverDist(jx,jz).s)+2)continue;
      if(jz>-22&&jz<-16&&jx>48)continue;
      const k=.7+hash(jx*3|0,jz*9|0)*.7,pine=h>5||f>.6,shade=[0x2f5e36,0x3b6b3a,0x4a7a3e,0x355f3a][Math.floor(hash(jx*5|0,jz*3|0)*4)];
      B.part("cyl",[jx,h+.3*k,jz],[.22*k,.6*k,.22*k],0x5a4330);
      if(pine)B.part("cone",[jx,h+1.6*k,jz],[1.5*k,2.6*k,1.5*k],shade);
      else{B.part("cone",[jx,h+1.3*k,jz],[2*k,1.8*k,2*k],shade);B.part("cone",[jx,h+2.1*k,jz],[1.4*k,1.3*k,1.4*k],shade)}
      if(++n>1700)return;
    }
  }
  function town(B,year){
    const spots=[];
    for(const [a,b] of STREETS){const along=a[1]===b[1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      for(let t=1.8;t<len-1.6;t+=3.1)for(const side of [-1,1]){const px=along?a[0]+t:a[0]+side*2.4,pz=along?a[1]+side*2.4:a[1]+t;spots.push({x:px,z:pz,ry:along?(side>0?Math.PI:0):(side>0?-Math.PI/2:Math.PI/2)})}}
    const ok=spots.filter(s=>!inPad(s.x,s.z,1.4)&&lineDist(ROADS,s.x,s.z)>2.2&&lineDist(STREETS,s.x,s.z)>1.6&&riverDist(s.x,s.z).d>7).sort((a,b)=>hash(a.x*13|0,a.z*7|0)-hash(b.x*13|0,b.z*7|0));
    const placed=[],want=Math.min(ok.length,26+Math.max(0,year-2009)*3);
    for(const s of ok){if(placed.length>=want)break;if(placed.some(p=>Math.hypot(p.x-s.x,p.z-s.z)<2.7))continue;placed.push(s);
      const i=placed.length,w=2.2+hash(i,1)*1.2,d=2+hash(i,2)*.8,h=1.7+hash(i,3)*1.2;
      house(B,s.x,groundAt(s.x,s.z),s.z,w,d,h,WALLS[Math.floor(hash(i,4)*WALLS.length)],ROOFS[Math.floor(hash(i,5)*ROOFS.length)],s.ry,-1,hash(i,6)>.45)}
  }
  function farms(B){
    for(const [x,z] of [[66,32],[30,45.5],[70,45.5]]){const y=groundAt(x,z);B.part("box",[x,y+1.1,z],[3.2,2.2,2.2],0xa8432f);B.part("box",[x,y+2.2,z],[3.3,1.6,1.6],0x4a3f3a,{rx:Math.PI/4});B.part("cyl",[x+2.5,y+2,z-.4],[1.2,4,1.2],0xc9c9c3);B.part("cone",[x+2.5,y+4.4,z-.4],[1.3,.8,1.3],0x8f9496)}
  }
  function pylonsAndWires(B,root,materials,geoms){
    const lines=[[[44,-4],[37,0],[30,3]],[[57,-2],[60,-1.5]],[[-4,30.5],[-2,28.6]]],tips=[];
    for(const line of lines){const row=[];for(const [x,z] of line){const y=groundAt(x,z);B.part("pylon",[x,y+3.2,z],[1,6.4,1],0x9ea4a6);B.part("box",[x,y+6.2,z],[2.8,.18,.18],0x9ea4a6);row.push([x,y+6.1,z])}tips.push(row)}
    const mat=new T.LineBasicMaterial({color:0x2a3236});materials.push(mat);
    for(const row of tips)for(let i=1;i<row.length;i++)for(const off of [-1.3,1.3]){const a=row[i-1],b=row[i],pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push(new T.Vector3(a[0]+(b[0]-a[0])*t+off*.2,a[1]+(b[1]-a[1])*t-Math.sin(t*Math.PI)*.6,a[2]+(b[2]-a[2])*t+off))}const g=new T.BufferGeometry().setFromPoints(pts);geoms.push(g);root.add(new T.Line(g,mat))}
  }
  function bridges(B){
    for(const line of ROADS)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      for(let t=0;t<len;t+=.5){const x=a[0]+(b[0]-a[0])*t/len,z=a[1]+(b[1]-a[1])*t/len,r=riverDist(x,z);if(r.d<.4&&z>DAM.z){const ry=Math.atan2(b[0]-a[0],b[1]-a[1]),span=riverHalf(r.s)*2+5;B.part("box",[x,.75,z],[2.4,.35,span],0x8d8f8a,{ry});for(const s of [-1,1]){const [px,pz]=rot(x,z,ry)(s*1.15,0);B.part("box",[px,1.15,pz],[.12,.45,span],0x6e7270,{ry})}break}}}
  }
  function dam(B,pid){
    B.part("box",[DAM.x,3,DAM.z],[15,8.6,2.2],0xb9bbb4,{pid});B.part("box",[DAM.x,7.45,DAM.z],[15.4,.5,2.8],0xa5a7a0,{pid});
    B.part("box",[DAM.x-1,3.2,DAM.z+1.14],[2.6,7.2,.08],0xcfe8ef,{pid,unlit:true});B.part("box",[DAM.x+2.6,3.2,DAM.z+1.14],[1.4,7.2,.08],0xa9cfd9,{pid,unlit:true});
  }

  /* Soft round sprites for steam and cloud. */
  function puffTexture(textures){
    const cv=document.createElement("canvas");cv.width=cv.height=64;const g=cv.getContext("2d"),r=g.createRadialGradient(32,32,2,32,32,30);
    r.addColorStop(0,"rgba(255,255,255,.95)");r.addColorStop(.55,"rgba(255,255,255,.45)");r.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=r;g.fillRect(0,0,64,64);
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);return tex;
  }
  let skyTexture=null;
  function sky(){
    if(skyTexture)return skyTexture;
    const cv=document.createElement("canvas");cv.width=4;cv.height=256;const g=cv.getContext("2d"),lin=g.createLinearGradient(0,0,0,256);
    lin.addColorStop(0,"#0a161d");lin.addColorStop(.5,"#163038");lin.addColorStop(1,"#0b1418");g.fillStyle=lin;g.fillRect(0,0,4,256);
    skyTexture=new T.CanvasTexture(cv);skyTexture.colorSpace=T.SRGBColorSpace;return skyTexture;
  }
  /* The diorama's earth sides, so the land reads as a model on a table rather than a cut. */
  function skirt(root,materials,geoms){
    const mat=new T.MeshStandardMaterial({color:0x4a3c30,roughness:1,flatShading:true,side:T.DoubleSide});materials.push(mat);
    const edges=[[NX,(i)=>[i/NX*W-W/2,D/2]],[NX,(i)=>[W/2-i/NX*W,-D/2]],[NZ,(i)=>[W/2,D/2-i/NZ*D]],[NZ,(i)=>[-W/2,i/NZ*D-D/2]]];
    for(const [n,pt] of edges){const g=new T.PlaneGeometry(1,1,n,1),p=g.attributes.position.array;
      for(let i=0;i<=n;i++){const [x,z]=pt(i),g=groundAt(x,z),top=z<=-D/2+.01&&x>26&&x<48?Math.max(g,RESERVOIR.level):g;p[i*3]=x;p[i*3+1]=top;p[i*3+2]=z;const o=(n+1+i)*3;p[o]=x;p[o+1]=BASE;p[o+2]=z}
      g.attributes.position.needsUpdate=true;g.computeVertexNormals();geoms.push(g);const m=new T.Mesh(g,mat);m.receiveShadow=true;root.add(m)}
  }

  /* ---- assembly ---------------------------------------------------------------------------- */
  let model=[];
  function describe(){
    const year=new Date(state.time).getUTCFullYear();
    model=typeof roomLandModel==="function"?roomLandModel():[];
    return{year,model,curtail:state.contract==="curtail"};
  }
  function signature(){const d=describe();return [d.year,d.curtail?1:0,...d.model.map(m=>m.key+":"+m.status)].join("|")}
  function build(desc){
    ensureGrid();
    const root=new T.Group(),materials=[],geoms=[],textures=[],anims=[],B=makeBuilder(),labels=[];
    /* Terrain: one sheet, heights from the grid, flat-shaded so the hills read as facets. */
    const tg=new T.PlaneGeometry(W,D,NX,NZ),tp=tg.attributes.position.array;
    for(let j=0;j<=NZ;j++)for(let i=0;i<=NX;i++)tp[(j*(NX+1)+i)*3+2]=grid[j*(NX+1)+i];
    tg.attributes.position.needsUpdate=true;tg.computeVertexNormals();geoms.push(tg);
    const groundTex=new T.CanvasTexture(paintGround());groundTex.colorSpace=T.SRGBColorSpace;textures.push(groundTex);
    const tmat=new T.MeshStandardMaterial({map:groundTex,roughness:.96,metalness:0,flatShading:true});materials.push(tmat);
    const terrain=new T.Mesh(tg,tmat);terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;terrain.castShadow=true;root.add(terrain);
    skirt(root,materials,geoms);
    /* Water: the river and lake at sea level, the reservoir held up behind the dam. */
    const wmat=new T.MeshStandardMaterial({color:0x2c7c94,roughness:.16,metalness:.08,transparent:true,opacity:.84});materials.push(wmat);
    const wg=new T.PlaneGeometry(W,D);geoms.push(wg);const water=new T.Mesh(wg,wmat);water.rotation.x=-Math.PI/2;water.position.y=.02;water.receiveShadow=true;root.add(water);
    const resDepth=(DAM.z-1.1)+D/2,rg=new T.PlaneGeometry(22,resDepth);geoms.push(rg);const res=new T.Mesh(rg,wmat);res.rotation.x=-Math.PI/2;res.position.set(37,RESERVOIR.level,-D/2+resDepth/2);root.add(res);
    const wA=new T.Color(0x2c7c94),wB=new T.Color(0x3a90a6);anims.push(t=>{wmat.color.copy(wA).lerp(wB,(Math.sin(t*.0009)+1)/2)});
    trees(B);town(B,desc.year);farms(B);bridges(B);pylonsAndWires(B,root,materials,geoms);
    /* Properties, in the model's order so a picked index is a model index. */
    desc.model.forEach((m,pid)=>{
      const s=SITES[m.key];if(!s)return;const y=groundAt(s.x,s.z);
      let top=4;
      if(m.key==="hydroplant")dam(B,pid);
      if(m.key==="windfarm")top=turbines(B,root,materials,geoms,anims,s,pid,desc.curtail);
      else if(m.status==="far"){if(m.key==="hydroplant")DRAW.hydroplant(B,s,y,pid,"far");forSale(B,s,y,pid)}
      else if(m.status==="soon"||m.status==="closed"){if(m.key==="hydroplant")DRAW.hydroplant(B,s,y,pid,"soon");construction(B,s,y,pid,BIG[m.key]||1);top=12}
      else top=DRAW[m.key]?DRAW[m.key](B,s,y,pid,m.status):4;
      hit(B,s,y,Math.max(2,top-1.5),pid);
      if(m.key==="power")steam(root,materials,textures,anims,s.x+3.8,y+9.8,s.z-1.6);
      if(m.key==="landfill"&&m.status!=="far")flare(root,materials,geoms,anims,s.x-8.4,y+6.2,s.z+5.6);
      if(m.key==="mast")blink(root,materials,geoms,anims,s.x,y+14.3,s.z);
      if(m.status==="yours"||m.status==="moving")beacon(root,materials,geoms,anims,s.x,y,s.z,m.status==="yours"?0xf7a13d:0x68bafa);
      labels.push({key:m.key,pos:[s.x,y+top+1.2,s.z]});
    });
    B.finish(root,materials);Object.values(B.geos).forEach(g=>geoms.push(g));
    clouds(root,materials,textures,anims);
    function animate(t){for(const a of anims)a(t)}
    function dispose(){root.traverse(o=>{if(o.isInstancedMesh)o.dispose()});geoms.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(x=>x.dispose())}
    const bounds={x:0,y:4,z:0,radius:Math.hypot(W,D)/2,minX:-W/2,maxX:W/2,minY:BASE,maxY:20,minZ:-D/2,maxZ:D/2};
    return{root,width:W,depth:D,cx:0,cz:0,bounds,labels,animate,dispose,animated:true,landmarks:[]};
  }
  function turbines(B,root,materials,geoms,anims,s,pid,curtail){
    const bladeGeo=new T.BoxGeometry(.32,4.4,.1),hubGeo=new T.CylinderGeometry(.32,.32,.6,10),mat=new T.MeshStandardMaterial({color:0xeef1ef,roughness:.6,flatShading:true});geoms.push(bladeGeo,hubGeo);materials.push(mat);
    let top=0;
    for(let i=0;i<6;i++){
      const x=s.x-s.w/2+3+i*(s.w-6)/5,z=s.z+(hash(i,9)-.5)*2,y=groundAt(x,z),hh=9.5;top=Math.max(top,hh+4.4);
      B.part("taper",[x,y+hh/2,z],[.9,hh,.9],0xe8ebe9,{pid});B.part("box",[x,y+hh+.25,z-.3],[.85,.8,2],0xe1e5e3,{pid});
      const rotor=new T.Group();rotor.position.set(x,y+hh+.25,z+.85);
      const hub=new T.Mesh(hubGeo,mat);hub.rotation.x=Math.PI/2;hub.castShadow=true;rotor.add(hub);
      for(let k=0;k<3;k++){const arm=new T.Group();arm.rotation.z=k*Math.PI*2/3;const blade=new T.Mesh(bladeGeo,mat);blade.position.y=2.3;blade.castShadow=true;arm.add(blade);rotor.add(arm)}
      root.add(rotor);const speed=(curtail?.0016:.0011)*(1+hash(i,4)*.25),phase=hash(i,7)*6;anims.push(t=>{rotor.rotation.z=-(t*speed+phase)});
    }
    B.part("box",[s.x+s.w/2-1,groundAt(s.x+s.w/2-1,s.z+3)+.8,s.z+3],[2,1.6,1.6],0xbfc3c1,{pid});
    return top;
  }
  function steam(root,materials,textures,anims,x,y,z){
    const tex=puffTexture(textures),puffs=[];
    for(let i=0;i<7;i++){const m=new T.SpriteMaterial({map:tex,transparent:true,opacity:.5,depthWrite:false});materials.push(m);const sp=new T.Sprite(m);root.add(sp);puffs.push({sp,m,o:i/7})}
    anims.push(t=>{for(const p of puffs){const k=(t*.00012+p.o)%1;p.sp.position.set(x+k*3,y+k*9,z-k*1.5);const s=2.5+k*6;p.sp.scale.set(s,s,1);p.m.opacity=.55*(1-k)*Math.min(1,k*6)}});
  }
  function flare(root,materials,geoms,anims,x,y,z){
    const g=new T.CylinderGeometry(0,.5,1,8);geoms.push(g);const m=new T.MeshBasicMaterial({color:0xff9a3a,transparent:true,opacity:.85,blending:2,depthWrite:false});materials.push(m);
    const fl=new T.Mesh(g,m);fl.position.set(x,y+.6,z);fl.renderOrder=3;root.add(fl);anims.push(t=>{const k=.8+Math.sin(t*.013)*.15+Math.sin(t*.031)*.1;fl.scale.set(.7*k,1.6*k,.7*k)});
  }
  function blink(root,materials,geoms,anims,x,y,z){
    const g=new T.BoxGeometry(.35,.35,.35);geoms.push(g);const m=new T.MeshBasicMaterial({color:0xff4a3a});materials.push(m);const b=new T.Mesh(g,m);b.position.set(x,y,z);root.add(b);
    anims.push(t=>{b.visible=Math.floor(t/700)%2===0});
  }
  function beacon(root,materials,geoms,anims,x,y,z,colour){
    const cg=new T.CylinderGeometry(.16,.16,1,8),rg=new T.TorusGeometry(1,.08,6,48);geoms.push(cg,rg);
    const cm=new T.MeshBasicMaterial({color:colour,transparent:true,opacity:.4,blending:2,depthWrite:false}),rm=cm.clone();materials.push(cm,rm);
    const col=new T.Mesh(cg,cm);col.scale.set(1,18,1);col.position.set(x,y+9,z);col.renderOrder=3;root.add(col);
    const ring=new T.Mesh(rg,rm);ring.rotation.x=Math.PI/2;ring.position.set(x,y+.2,z);ring.renderOrder=3;root.add(ring);
    anims.push(t=>{const k=(t*.0006)%1;ring.scale.setScalar(2.5+k*6);rm.opacity=.7*(1-k);cm.opacity=.28+.16*Math.sin(t*.003)});
  }
  function clouds(root,materials,textures,anims){
    const tex=puffTexture(textures),list=[];
    for(let i=0;i<6;i++){const g=new T.Group(),bx=-70+i*27,bz=-40+hash(i,3)*75;for(let k=0;k<4;k++){const m=new T.SpriteMaterial({map:tex,transparent:true,opacity:.2,depthWrite:false});materials.push(m);const sp=new T.Sprite(m);const s=7+hash(i,k)*6;sp.scale.set(s,s*.6,1);sp.position.set((k-1.5)*3.4,hash(k,i)*1.4,hash(i+k,2)*2);g.add(sp)}g.position.set(bx,24+hash(i,8)*3,bz);root.add(g);list.push({g,v:.0016+hash(i,6)*.0012})}
    let last=0;anims.push(t=>{const dt=last?Math.min(100,t-last):16;last=t;for(const c of list){c.g.position.x+=c.v*dt;if(c.g.position.x>90)c.g.position.x=-90}});
  }
  function property(pid){return model[pid]||null}
  return{build,describe,signature,property,sky};
})();
