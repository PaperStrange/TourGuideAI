import { project } from './scene-config.js';
import { DOORS } from './content.js';

/**
 * Shijo, an authored architectural diorama.
 * Geography and place identities arrive from the city-content contract. Surface
 * materials, glazing, landscaping, lighting and the traveller are original art,
 * not a claim that a photographed facade or interior has been reconstructed.
 * The near building is deliberately cut down so the southern pavement is legible.
 */
const PALETTE = {
  paper: '#e7e6da', road: '#78827c', roadDeep: '#67766f', curb: '#f0ead9',
  pavement: '#d9d6c1', stone: '#d5d8c8', brass: '#b4a477',
  glass: '#6d8d88', glassDeep: '#3e625e', ink: '#263f39', vermilion: '#bd5946',
};
const layers = new Map();
let artCanvasFactory;

function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  if (!artCanvasFactory) artCanvasFactory = document.createElement('canvas');
  const c = artCanvasFactory.cloneNode(); c.width = width; c.height = height; return c;
}
function mix(a, b, t) { return a + (b - a) * t; }
function noise(x, y, seed = 0) {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
function poly(ctx, points, fill, stroke, lineWidth = 1) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}
function line(ctx, a, b, color, width = 1) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function rounded(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}
function scenePainter(ctx, camera, width, height) {
  const p = (x, y, h = 0) => project(x, y, h, camera, width, height);
  const ground = (x0, y0, x1, y1, fill, h = 0, stroke) =>
    poly(ctx, [p(x0,y0,h), p(x1,y0,h), p(x1,y1,h), p(x0,y1,h)], fill, stroke);
  const wall = (x0, x1, y, h0, h1, fill, stroke) =>
    poly(ctx, [p(x0,y,h0), p(x1,y,h0), p(x1,y,h1), p(x0,y,h1)], fill, stroke);
  return { p, ground, wall, scale: camera.scale };
}
function boundsOf(world) {
  const b = world.bounds;
  return { minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY };
}
function roadEdges(world) {
  return { low: world.roadSurface.southY, high: world.roadSurface.northY };
}

function drawGround(ctx, camera, width, height, world, targets) {
  const {p, ground, scale} = scenePainter(ctx, camera, width, height);
  const b = boundsOf(world), road = roadEdges(world);
  ground(b.minX, b.minY, b.maxX, b.maxY, PALETTE.pavement);
  ground(b.minX, road.low, b.maxX, road.high, PALETTE.road);
  // Fine mineral aggregate and broad, quiet bands of worn asphalt.
  for (let x=b.minX; x<b.maxX; x+=.53) for (let y=road.low; y<road.high; y+=.48) {
    const n=noise(x,y); const q=p(x+n*.3,y+n*.23);
    ctx.fillStyle=n>.53?'rgba(238,236,210,.065)':'rgba(29,58,46,.045)';
    ctx.fillRect(q.x,q.y,Math.max(.7,scale*.025),.8);
  }
  for (let x=b.minX; x<b.maxX; x+=8.7) {
    line(ctx,p(x,road.low),p(x+.6,road.high),'rgba(49,69,58,.1)',1);
  }
  // Lane treatment is an authored visual abstraction, never route guidance.
  const laneYs = [mix(road.low,road.high,.25),mix(road.low,road.high,.75)];
  for (const y of laneYs) for (let x=b.minX+1.6; x<b.maxX; x+=7.4) {
    ground(x,y-.045,Math.min(x+3.0,b.maxX),y+.045,'rgba(239,233,206,.64)');
  }
  ground(b.minX,world.roadCenterY-.035,b.maxX,world.roadCenterY+.035,'rgba(222,211,166,.60)');
  // Sidewalk tile joints follow world space, rather than swimming with the camera.
  for (const [y0,y1] of [[road.high,b.maxY],[b.minY,road.low]]) {
    for (let row=0,y=y0; y<y1; row++,y+=.70) {
      for (let x=b.minX-(row%2)*.70; x<b.maxX; x+=1.4) {
        const n=noise(x,y,3);
        ground(Math.max(x,b.minX),y,Math.min(x+1.38,b.maxX),Math.min(y+.675,y1),
          `rgba(${Math.round(210+n*20)},${Math.round(208+n*17)},${Math.round(187+n*19)},.72)`);
      }
    }
    // A soft dust/wear line, tactile paving and the bright face of the kerb.
    const curbY=y0===road.high?road.high:road.low;
    ground(b.minX,curbY-.12,b.maxX,curbY+.12,PALETTE.curb,.05);
    line(ctx,p(b.minX,curbY),p(b.maxX,curbY),'rgba(42,65,50,.24)',1.4);
    const tactileY=curbY+(y0===road.high?.7:-.7);
    ground(b.minX,tactileY-.13,b.maxX,tactileY+.13,'#c7b978',.025);
    for(let x=b.minX+.18;x<b.maxX;x+=.19) {
      line(ctx,p(x,tactileY-.09,.035),p(x,tactileY+.09,.035),'rgba(243,226,157,.53)',.6);
    }
    for(let x=b.minX+3;x<b.maxX;x+=9.4) {
      ground(x,curbY-.18,x+.6,curbY+.18,'#7c8477');
      for(let j=0;j<7;j++) line(ctx,p(x+.055+j*.076,curbY-.12),p(x+.055+j*.076,curbY+.12),'#364e44',.9);
    }
  }
  for (const crossing of targets.filter(t=>t.kind==='crossing')) {
    const x=world.crossing.x,halfWidth=world.crossing.width/2;
    // Source endpoints are sidewalk centrelines, not observed road edges.
    // Authored roadSurface defines the presentation kerbs and stripe treatment.
    for(let y=road.low+.3;y<road.high-.25;y+=1.11) {
      ground(x-halfWidth,y,x+halfWidth,Math.min(y+.58,road.high-.2),'#eeeada',.035);
      line(ctx,p(x-halfWidth,y,.035),p(x+halfWidth,y,.035),'rgba(255,252,231,.56)',.65);
    }
    for(const cy of [road.high+.64,road.low-.64]) {
      ground(x-1.20,cy-.39,x+1.20,cy+.39,'#d1bf77',.04);
      for(let ix=0;ix<12;ix++) for(let iy=0;iy<3;iy++) {
        const q=p(x-1.10+ix*.20,cy-.25+iy*.22,.05);
        ellipse(ctx,q.x,q.y,scale*.024,scale*.012,'#a89c64');
      }
    }
  }
  // Flush utility covers are generic material details, not source-backed POIs.
  for(const [x,y] of [[b.minX+8,road.high+1.5],[b.minX+43,road.low-1.2],[b.minX+34,world.roadCenterY+3]]) {
    const q=p(x,y);ellipse(ctx,q.x,q.y,scale*.44,scale*.147,'#747d6c');
    ctx.strokeStyle='#a1a68a';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(q.x,q.y,scale*.35,scale*.116,0,0,Math.PI*2);ctx.stroke();
    for(let d=-2;d<=2;d++) line(ctx,{x:q.x-scale*.23,y:q.y+d*scale*.035},{x:q.x+scale*.23,y:q.y+d*scale*.035},'#9fa58d',.7);
  }
  // Low-angle afternoon light: transparent projections of the northern facade.
  const northY=world.northFacadeY,north=world.buildings.north;
  poly(ctx,[p(north.minX,northY),p(north.maxX,northY),p(north.maxX-4,northY-6.5),p(north.minX-4,northY-6.5)],'rgba(46,73,59,.10)');
}

function glassBay(ctx, paint, x0, x1, y, h0, h1, index, warm=false) {
  const {p,wall,scale}=paint;
  const top=p(x0,y,h1),bottom=p(x0,y,h0);
  const gradient=ctx.createLinearGradient(top.x,top.y,bottom.x,bottom.y);
  gradient.addColorStop(0,warm?'#9da995':'#6e918c');
  gradient.addColorStop(.50,warm?'#b4b99e':'#94afa1');
  gradient.addColorStop(1,warm?'#657f6e':'#54766c');
  wall(x0,x1,y,h0,h1,gradient);
  // Reflections are asymmetrical and restrained; frames remain the dominant rhythm.
  const offset=(index%3)*.13;
  poly(ctx,[p(x0+.06,y,h1-.08),p(mix(x0,x1,.40+offset),y,h1-.08),p(mix(x0,x1,.69+offset/2),y,h0+.09),p(x0+.23,y,h0+.09)],'rgba(227,239,218,.20)');
  wall(x0,x1,y,mix(h0,h1,.23),mix(h0,h1,.25),'rgba(219,233,205,.13)');
  if(index%4===0) wall(x0+.05,x1-.05,y,h0+.08,h0+.30,'rgba(203,196,144,.20)');
  line(ctx,p(x0,y,h0),p(x0,y,h1),'#bac9b5',Math.max(1,scale*.031));
  line(ctx,p(x1,y,h0),p(x1,y,h1),'#566f60',Math.max(1,scale*.023));
  line(ctx,p(x0,y,h0),p(x1,y,h0),'#eef0d7',Math.max(1,scale*.035));
}

function lettering(ctx,paint,text,x,y,h,{size=.37,color='#f1ead5',spacing=.06,align='center'}={}) {
  const {p,scale}=paint,q=p(x,y,h);
  ctx.save();ctx.font=`500 ${Math.max(9,scale*size)}px "Noto Sans JP", "Yu Gothic", "Kyoto Sans", sans-serif`;
  ctx.textBaseline='middle';ctx.fillStyle=color;ctx.textAlign=align;
  if(spacing && align==='center') {
    const letters=[...text],measure=letters.map(c=>ctx.measureText(c).width),gap=scale*spacing;
    let left=q.x-(measure.reduce((a,b)=>a+b,0)+(letters.length-1)*gap)/2;
    ctx.textAlign='left';letters.forEach((c,i)=>{ctx.fillText(c,left,q.y);left+=measure[i]+gap;});
  } else ctx.fillText(text,q.x,q.y);
  ctx.restore();
}

function planter(ctx,paint,x,y,size=.72) {
  const {p,ground,wall,scale}=paint;
  const q=p(x,y);ellipse(ctx,q.x-scale*.18,q.y+scale*.085,scale*size*.90,scale*size*.26,'rgba(38,65,48,.15)');
  ground(x-size*.55,y-size*.40,x+size*.55,y+size*.4,'#b0af96',.62);
  wall(x-size*.55,x+size*.55,y-size*.40,.05,.62,'#979f86');
  wall(x-size*.50,x+size*.50,y-size*.40,.51,.65,'#d5d2b8');
  for(let k=0;k<23;k++) {
    const n=noise(k,x,4),m=noise(k,y,9);
    const leaf=p(x+(n-.5)*size*1.38,y+(m-.5)*size*.80,.6+(.6+noise(k,y,2))*.74);
    ellipse(ctx,leaf.x,leaf.y,scale*(.11+n*.06),scale*(.10+m*.06),['#436a4c','#69835a','#889a63','#a5ad73'][k%4]);
  }
}

function tree(ctx,paint,x,y,height=5.0) {
  const {p,scale}=paint;
  const q=p(x,y),tip=p(x,y,height);
  ellipse(ctx,q.x-scale*.65,q.y+scale*.2,scale*1.3,scale*.35,'rgba(34,65,45,.12)');
  line(ctx,q,tip,'#687760',scale*.095);line(ctx,{x:q.x+scale*.023,y:q.y},tip,'#a0a17c',scale*.028);
  for(let k=0;k<32;k++) {
    const n=noise(k,x,4),m=noise(k,y,3),angle=n*Math.PI*2;
    const r=Math.sqrt(m)*scale*1.20;
    ellipse(ctx,tip.x+Math.cos(angle)*r,tip.y+Math.sin(angle)*r*.55,scale*(.30+noise(k,y)*.28),scale*(.20+noise(k,x)*.23),['#567550','#718a59','#849a64','#9fae72'][k%4]);
  }
  // A few catching leaves give the canopy a hand-painted edge.
  for(let k=0;k<10;k++) {
    const n=noise(k,x,7),m=noise(k,y,8);
    ellipse(ctx,tip.x+(n-.5)*scale*1.65,tip.y+(m-.5)*scale*.85,scale*.085,scale*.045,'rgba(195,204,137,.57)');
  }
}

function lamp(ctx,paint,x,y,dir=1) {
  const {p,scale}=paint,base=p(x,y),top=p(x,y,5.75),end=p(x+dir*.92,y,5.55);
  ellipse(ctx,base.x-scale*.5,base.y+scale*.03,scale*.62,scale*.08,'rgba(40,57,42,.12)');
  line(ctx,base,top,'#566b5b',Math.max(2,scale*.063));
  line(ctx,{x:base.x+1,y:base.y},{x:top.x+1,y:top.y},'#bac3a3',1);
  ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.quadraticCurveTo(top.x+dir*scale*.7,top.y-scale*.13,end.x,end.y);
  ctx.strokeStyle='#586e5a';ctx.lineWidth=scale*.067;ctx.stroke();
  rounded(ctx,end.x-scale*.25,end.y,scale*.50,scale*.085,2,'#c7cbb0');
  rounded(ctx,end.x-scale*.18,end.y+scale*.08,scale*.36,scale*.027,1,'#e4dfb9');
  rounded(ctx,base.x-scale*.06,base.y-scale*.28,scale*.12,scale*.28,2,'#657661');
}

function drawNorth(ctx,camera,width,height,world,targets) {
  const paint=scenePainter(ctx,camera,width,height),{p,ground,wall,scale}=paint;
  const b=boundsOf(world),y=world.northFacadeY,x0=world.buildings.north.minX,x1=world.buildings.north.maxX;
  const building=targets.find(t=>t.originalJapaneseName?.includes('三井'));
  // Modern office frontage: generous stone piers and deeply recessed glazing.
  wall(x0,x1,y,0,15.0,'#c7cebb');
  ground(x0,y,x1,y+5.0,'#d9ddc8',15.0);
  wall(x0,x1,y,13.9,15.0,'#dce0cb');
  wall(x0,x1,y,.0,.33,'#818d78');
  const bay=3.1;
  for(let x=x0,i=0;x<x1-.1;x+=bay,i++) {
    const xe=Math.min(x+bay,x1);
    wall(x,Math.min(x+.24,xe),y,.34,13.9,'#d6dac5');
    wall(x+.24,Math.min(x+.37,xe),y,.34,13.9,'#a9b8a0');
    for(let floor=0;floor<3;floor++) {
      const h0=4.4+floor*3.12,h1=h0+2.58;
      if(x+.54<xe) glassBay(ctx,paint,x+.47,xe-.12,y+.05,h0,h1,i+floor*3);
      if(x+1.81<xe) line(ctx,p(x+1.81,y,h0),p(x+1.81,y,h1),'#b0bfa8',Math.max(1,scale*.030));
    }
    const left=x+.43,right=xe-.10;
    if(right>left) {
      glassBay(ctx,paint,left,right,y+.035,.4,3.8,i,true);
      const qm=p(left,y,2.75),qr=p(right,y,2.75);
      line(ctx,qm,qr,'rgba(38,67,54,.38)',scale*.045);
      for(let k=0;k<6;k++) {
        const hx=left+(right-left)*k/6;
        line(ctx,p(hx,y,3.10),p(hx,y,3.7),'rgba(219,221,177,.35)',scale*.022);
      }
    }
  }
  // Continuous floor reveals, thin brass joints and a deeply shadowed ground-floor canopy.
  for(const h of [4.06,7.2,10.33,13.48]) {
    wall(x0,x1,y,h,h+.21,'#b4bfa6');
    wall(x0,x1,y,h+.21,h+.28,'#ebedcf');
  }
  ground(x0-.12,y-.95,x1+.12,y+.15,'#c9d0b8',4.05);
  wall(x0-.12,x1+.12,y-.95,3.84,4.05,'#596c57');
  wall(x0-.12,x1+.12,y-.98,4.02,4.09,'#e8e7c9');
  ground(x0,y-1.3,x1,y-.28,'rgba(49,68,47,.13)',.02);
  // Small repeated ceiling lights; no invented business identities.
  for(let x=x0+1;x<x1;x+=3.1) wall(x-.25,x+.25,y-.96,3.89,3.93,'#ded7a3');
  const labelX=building?.x ?? (x0+x1)/2;
  wall(labelX-5.8,labelX+5.8,y-.99,3.92,5.13,'#435e50');
  wall(labelX-5.8,labelX+5.8,y-1,5.10,5.16,'#c5bc8b');
  lettering(ctx,paint,world.buildings.north.nameJa,labelX,y-1.02,4.53,{size:.35,spacing:.035});
  // Authored door treatment stays centred on existing authored door anchors.
  for(const door of DOORS.filter(t=>t.side==='north')) {
    const x=door.x;
    wall(x-.66,x+.66,y-.025,.08,3.0,'#233e32');
    glassBay(ctx,paint,x-.57,x-.04,y-.045,.14,2.90,0);
    glassBay(ctx,paint,x+.04,x+.57,y-.045,.14,2.90,1);
    wall(x-.045,x+.045,y-.07,.12,2.92,'#cbd2b7');
    line(ctx,p(x-.13,y-.08,1.05),p(x-.13,y-.08,1.8),'#e0d5ab',scale*.035);
    line(ctx,p(x+.13,y-.08,1.05),p(x+.13,y-.08,1.8),'#e0d5ab',scale*.035);
    ground(x-.82,y-.7,x+.82,y,'#bfc5ad',.11);
  }
}

function drawSouth(ctx,camera,width,height,world,targets) {
  const paint=scenePainter(ctx,camera,width,height),{p,ground,wall,scale}=paint;
  const b=boundsOf(world),y=world.southFacadeY,x0=world.buildings.south.minX,x1=world.buildings.south.maxX;
  const building=targets.find(t=>t.originalJapaneseName?.includes('ダイヤ'));
  // A shallow architectural cutaway: upper storeys intentionally omitted for visibility.
  ground(x0,y,x1,b.minY,'#afb7a2',2.6);
  wall(x0,x1,y,0,2.6,'#718a76');
  for(let x=x0,i=0;x<x1;x+=3.2,i++) {
    const end=Math.min(x+3.2,x1);
    glassBay(ctx,paint,x+.15,end-.14,y,.30,2.35,i,true);
    wall(x,end,y,2.35,2.58,'#dce0c8');
    wall(x,x+.13,y,0,2.58,'#b9c5ad');
  }
  wall(x0,x1,y,0,.25,'#60755f');
  ground(x0-.13,y-.32,x1+.13,y+.24,'#e0dfc6',2.70);
  line(ctx,p(x0-.13,y+.24,2.70),p(x1+.13,y+.24,2.70),'#f4ecd4',scale*.035);
  for(let x=x0+1;x<x1;x+=1.3) {
    line(ctx,p(x,y-.5,2.61),p(x,b.minY,2.61),'rgba(70,93,68,.12)',1);
  }
  const labelX=x0+4;
  wall(labelX-3.5,labelX+3.5,y+.02,2.50,3.46,'#61735c');
  lettering(ctx,paint,world.buildings.south.nameJa,labelX,y+.03,3.03,{size:.32,spacing:.03});
  const bank=targets.find(t=>t.id==='mufg');
  if(bank) {
    const signX=Math.min(bank.x+4,x1-4.8);
    wall(signX-4.65,signX+4.65,y+.03,2.51,3.46,'#ad5949');
    lettering(ctx,paint,bank.originalJapaneseName,signX,y+.05,3.03,{size:.29,spacing:.006,color:'#fff0d6'});
    wall(signX-4.65,signX+4.65,y+.04,3.44,3.51,'#e5cdb2');
  }
  for(const door of DOORS.filter(t=>t.side==='south')) {
    const x=door.x;
    wall(x-.65,x+.65,y+.025,.06,2.4,'#324e40');
    glassBay(ctx,paint,x-.57,x+.57,y+.04,.13,2.26,2);
    line(ctx,p(x,y+.05,.14),p(x,y+.05,2.28),'#c0c8ae',scale*.043);
    ground(x-.78,y,x+.78,y+.58,'#bbc3ab',.055);
  }
}

function streetFurniture(world) {
  const n=world.buildings.north,s=world.buildings.south,ny=world.northFacadeY,sy=world.southFacadeY;
  return [
    ...[n.minX+2.3,n.minX+12.1,n.maxX-2].map(x=>({x,y:ny-1.08,kind:'planter',size:.85})),
    ...[n.minX+8.6,n.maxX-5.8].map(x=>({x,y:ny-1.48,kind:'tree',size:4.6})),
    ...[n.minX+2.9,n.maxX-12].map(x=>({x,y:ny-2.55,kind:'lamp',size:1})),
    ...[s.minX+2,s.maxX-2].map(x=>({x,y:sy+.70,kind:'planter',size:.7})),
  ].sort((a,b)=>b.y-a.y);
}

function drawFurniture(ctx,paint,prop,state,inFront=false) {
  ctx.save();
  // Near foliage softens instead of swallowing the traveller. Sorting still
  // changes at the world-space baseline; the fade is a readability treatment.
  const reach=prop.kind==='tree'?1.6:.85;
  if(inFront&&prop.kind!=='lamp'&&Math.abs(prop.x-state.x)<reach&&state.y-prop.y<2.4)ctx.globalAlpha=.48;
  if(prop.kind==='tree')tree(ctx,paint,prop.x,prop.y,prop.size);
  else if(prop.kind==='lamp')lamp(ctx,paint,prop.x,prop.y,prop.size);
  else planter(ctx,paint,prop.x,prop.y,prop.size);
  ctx.restore();
}

function sceneCache(world,targets,scale) {
  // Bake the detailed static scene once per scale/content. Camera motion only
  // translates it, leaving the live frame budget for movement, feedback and light.
  const b=boundsOf(world),key=JSON.stringify([b,world.roadCenterY,world.roadSurface,world.buildings,world.crossing,world.northFacadeY,world.southFacadeY,scale,targets.map(t=>[t.id,t.x,t.y,t.originalJapaneseName])]);
  if(layers.has(key)) return layers.get(key);
  const w=Math.ceil((b.maxX-b.minX+6)*scale),h=Math.ceil((b.maxY-b.minY+25)*scale/3);
  const camera={x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2+5.5,scale};
  const base=makeCanvas(w,h),foreground=makeCanvas(w,h);
  const c=base.getContext('2d');drawGround(c,camera,w,h,world,targets);drawNorth(c,camera,w,h,world,targets);
  drawSouth(foreground.getContext('2d'),camera,w,h,world,targets);
  const result={base,foreground,camera,w,h};layers.set(key,result);
  if(layers.size>4) layers.delete(layers.keys().next().value);
  return result;
}

function drawTraveller(ctx,p,scale,state,now,reducedMotion=false) {
  const unit=scale/38,walking=state.moving&&!state.paused&&!reducedMotion;
  const phase=walking?now*.013:0,swing=Math.sin(phase),bounce=walking?Math.abs(Math.sin(phase))*.9:0;
  const x=p.x,y=p.y-bounce*unit;
  const side=state.facing==='west'?-1:1;
  const back=state.facing==='north',front=state.facing==='south';
  ctx.save();ctx.translate(x,y);ctx.scale(unit,unit);
  ellipse(ctx,-3,1.4,11.5,4,'rgba(39,57,41,.22)');
  // Grounding halo, crisp ivory rim and a tiny orange luggage tag preserve legibility.
  ctx.strokeStyle='rgba(246,246,221,.62)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,1,13.2,4.4,0,0,Math.PI*2);ctx.stroke();
  for(const leg of [-1,1]) {
    const dx=leg*3.0+(walking?swing*leg*2.2:0),dy=walking?Math.max(0,-swing*leg)*2:0;
    rounded(ctx,dx-2.5,-15-dy,5,14,2,'#425d50');
    rounded(ctx,dx-2.7,-3.1-dy,6.6,3.6,1.5,'#e5dcc0');
    rounded(ctx,dx-2.7,-1.2-dy,6.9,1.7,.8,'#6b7761');
  }
  // Arms precede the coat so their alternating swing reads as walking.
  for(const arm of [-1,1]) {
    const move=walking?swing*arm*2.5:0;
    rounded(ctx,arm*7.4-2.1,-28+move,4.4,13,2.2,'#e3c291');
    ellipse(ctx,arm*7.4,-15+move,2.1,2.3,'#ddb790');
  }
  rounded(ctx,-7.5,-31,15,19,4.5,'#e4c581');
  rounded(ctx,-7.0,-20,14.0,7.5,2,'#d7ae67');
  line(ctx,{x:-5,y:-14},{x:5,y:-14},'#f2d69b',.8);
  if(back) {
    rounded(ctx,-5.2,-30,10.4,14,3.5,'#788b68','#465f4b');
    rounded(ctx,-4.0,-25,8,8,2,'#92a078');line(ctx,{x:-3,y:-29},{x:3,y:-29},'#c3bb85',1);
    rounded(ctx,3.6,-24,2.7,5.6,.8,'#c26949');
  } else if(!front) {
    rounded(ctx,-side*7.2-2.8,-30,6.0,13,2.6,'#748665','#526c53');
    line(ctx,{x:side*4.2,y:-29},{x:-side*2,y:-15},'#8b8b62',1.3);
    rounded(ctx,-side*7.2-2,-24,2.8,5,1,'#c96b48');
  } else {
    line(ctx,{x:-5.6,y:-28},{x:-4.3,y:-14},'#87916c',1.5);
    line(ctx,{x:5.6,y:-28},{x:4.3,y:-14},'#87916c',1.5);
    rounded(ctx,-2.5,-22,5,6.6,1.1,'#a76243');
  }
  ellipse(ctx,0,-35.2,6.2,6.5,'#e0b78e');
  ellipse(ctx,side*5.5,-35.2,1.5,2.1,'#d2a47d');
  // An unmistakable straw bucket hat is the player's recurring silhouette.
  ellipse(ctx,-.5,-39.0,10.0,3.2,'#b69b67');
  rounded(ctx,-6.7,-46.1,13.1,8.7,3.7,'#eddaaa');
  ellipse(ctx,-.3,-45.2,6.6,2.2,'#f5e4b7');
  rounded(ctx,-6.6,-40.8,13.0,2.8,.8,'#849477');
  ellipse(ctx,-.4,-38.2,10.2,2.5,'#e7ce94');
  if(!back) {
    ellipse(ctx,front?-2.1:side*3.3,-34.1,.65,.85,'#3a4b3c');
    if(front)ellipse(ctx,2.1,-34.1,.65,.85,'#3a4b3c');
    line(ctx,{x:front?-1.3:side*3.1,y:-31.8},{x:front?1.3:side*4.9,y:-32.0},'#b08666',.65);
  }
  ctx.restore();
}

function drawTarget(ctx,frame,target) {
  const {camera,width,height,state,now}=frame;
  const visited=state.visitedIds?.includes(target.id);
  const active=frame.nearbyTargetId===target.id||state.selectedTargetId===target.id;
  const selected=state.selectedTargetId===target.id;
  const y=target.approachY??target.y;
  const q=project(target.approachX??target.x,y,.05,camera,width,height),scale=camera.scale;
  if(q.x<-50||q.x>width+50||q.y<-60||q.y>height+60) return;
  const color=visited?'#496d58':target.modelled===false?'#b38a58':'#ba6a47';
  const pulse=selected&&!frame.reducedMotion?Math.sin(now*.003)*.10+1:1;
  if(selected||active) {
    ellipse(ctx,q.x,q.y,scale*.90*pulse,scale*.27*pulse,'rgba(251,243,207,.35)');
    ctx.beginPath();ctx.ellipse(q.x,q.y,scale*.84,scale*.25,0,0,Math.PI*2);
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);
  }
  // Compact pins are game affordances, never traffic signals or geographic facts.
  const pinY=q.y-(active?35:27);
  line(ctx,{x:q.x,y:q.y-2},{x:q.x,y:pinY+7},'rgba(71,83,62,.40)',1);
  ellipse(ctx,q.x,pinY,active?9.5:7.0,active?9.5:7.0,visited?'#496d58':'#f4eed5');
  ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(q.x,pinY,active?9.5:7,0,Math.PI*2);ctx.stroke();
  if(visited) {
    ctx.beginPath();ctx.moveTo(q.x-3.0,pinY);ctx.lineTo(q.x-.5,pinY+2.4);ctx.lineTo(q.x+3.8,pinY-2.7);
    ctx.strokeStyle='#fff6dc';ctx.lineWidth=1.6;ctx.stroke();
  } else if(target.modelled===false) {
    line(ctx,{x:q.x-2.5,y:pinY},{x:q.x+2.5,y:pinY},color,1.5);
  } else {
    ellipse(ctx,q.x,pinY,2.1,2.1,color);
  }
}

/** Engine-owned camera and interpolated actor state; coordinates are CSS pixels. */
export function drawWorld(ctx, frame) {
  const {width,height,camera,state,world,targets,now=0}=frame;
  if(!width||!height||!world||!camera) return;
  ctx.save();ctx.clearRect(0,0,width,height);
  const bg=ctx.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#dce2cf');bg.addColorStop(1,'#eee8d2');
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  const cache=sceneCache(world,targets,camera.scale);
  const dx=width/2-cache.w/2+(cache.camera.x-camera.x)*camera.scale;
  const dy=height/2-cache.h/2+(camera.y-cache.camera.y)*camera.scale/3;
  ctx.drawImage(cache.base,dx,dy);
  // Soft foreground atmosphere bridges the diorama into the UI paper, not a debug grid.
  const foregroundAlpha=state.y<world.southFacadeY+2.3?.72:1;
  ctx.save();ctx.globalAlpha=foregroundAlpha;ctx.drawImage(cache.foreground,dx,dy);ctx.restore();
  const actor=project(state.x,state.y,0,camera,width,height);
  const paint=scenePainter(ctx,camera,width,height),furniture=streetFurniture(world);
  for(const prop of furniture.filter(p=>p.y>=state.y))drawFurniture(ctx,paint,prop,state);
  for(const target of targets)drawTarget(ctx,{...frame,now},target);
  drawTraveller(ctx,actor,camera.scale,state,now,frame.reducedMotion);
  for(const prop of furniture.filter(p=>p.y<state.y))drawFurniture(ctx,paint,prop,state,true);
  // The traveller is rendered after the low southern cutaway intentionally;
  // blocking geometry is engine-owned and remains independent of the art treatment.
  const sunlight=ctx.createLinearGradient(0,0,width,height);
  sunlight.addColorStop(0,'rgba(255,242,190,.065)');sunlight.addColorStop(.7,'rgba(255,242,190,0)');sunlight.addColorStop(1,'rgba(42,69,53,.025)');
  ctx.fillStyle=sunlight;ctx.fillRect(0,0,width,height);
  ctx.restore();
}

export function clearArtCache() { layers.clear(); }
