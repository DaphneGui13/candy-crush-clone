'use strict';
/* ============ constants & helpers ============ */
const R=8,C=8;
const COLORS=[
 {base:'#ff4d6d',light:'#ffb3c1',dark:'#b3153a'},   // 0 heart
 {base:'#ff9f1c',light:'#ffd9a0',dark:'#c26a00'},   // 1 round
 {base:'#ffd60a',light:'#fff3a3',dark:'#c29a00'},   // 2 star
 {base:'#3ddc84',light:'#b4f5d0',dark:'#17894d'},   // 3 square
 {base:'#3fa9f5',light:'#b5e0ff',dark:'#1a68a8'},   // 4 diamond
 {base:'#a56bff',light:'#dcc6ff',dark:'#6128c4'}    // 5 hexagon
];
const COLOR_NAMES=['red','orange','yellow','green','blue','purple'];
const $=s=>document.querySelector(s);
const rnd=n=>Math.floor(Math.random()*n);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const key=(r,c)=>r*C+c;
const ease={
 out:p=>1-Math.pow(1-p,3),
 inOut:p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,
 in:p=>p*p,
 back:p=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2)},
 bounce:p=>{const n=7.5625,d=2.75;if(p<1/d)return n*p*p;if(p<2/d)return n*(p-=1.5/d)*p+.75;if(p<2.5/d)return n*(p-=2.25/d)*p+.9375;return n*(p-=2.625/d)*p+.984375}
};

/* ============ save data ============ */
const KEY='sweetpop-v1';
let S={unlocked:1,stars:[],hammer:3,shuffle:2,rainbow:1,coins:30,lastDaily:'',streak:0,sound:true,haptics:true};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ============ audio & haptics ============ */
let AC=null;
function initAudio(){
  try{ if(!AC&&S.sound){AC=new (window.AudioContext||window.webkitAudioContext)();} if(AC&&AC.state==='suspended')AC.resume(); }catch(e){}
}
function tone(f,d=.12,type='sine',v=.12,f2,delay=0){
  if(!S.sound||!AC)return;
  try{
    const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);
    if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.03);
  }catch(e){}
}
function noise(d=.3,v=.15){
  if(!S.sound||!AC)return;
  try{
    const n=Math.floor(AC.sampleRate*d),b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
    const s=AC.createBufferSource(),g=AC.createGain(),f=AC.createBiquadFilter();
    f.type='lowpass';f.frequency.value=900;g.gain.value=v;s.buffer=b;s.connect(f);f.connect(g);g.connect(AC.destination);s.start();
  }catch(e){}
}
const NOTES=[523,587,659,784,880,1047,1175,1319];
const sfx={
  tick:()=>tone(700,.05,'triangle',.08),
  swap:()=>tone(330,.09,'triangle',.1,440),
  bad:()=>{tone(180,.18,'sawtooth',.07,110)},
  pop:n=>{const f=NOTES[Math.min(n-1,NOTES.length-1)];tone(f,.16,'triangle',.14);tone(f*1.5,.12,'sine',.06,undefined,.04)},
  special:()=>{[660,880,1100,1320].forEach((f,i)=>tone(f,.14,'sine',.1,undefined,i*.05))},
  boom:()=>{noise(.35,.18);tone(120,.3,'sine',.15,50)},
  win:()=>{[523,659,784,1047,1319].forEach((f,i)=>tone(f,.28,'triangle',.14,undefined,i*.11))},
  lose:()=>{[392,330,262,196].forEach((f,i)=>tone(f,.3,'sawtooth',.07,undefined,i*.15))},
  shuffle:()=>{for(let i=0;i<6;i++)tone(300+i*80,.08,'triangle',.08,undefined,i*.04)},
  gem:()=>{tone(1568,.12,'sine',.12);tone(2093,.2,'sine',.1,undefined,.08)}
};
function haptic(ms){ if(S.haptics&&navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}} }

/* ============ levels ============ */
// pattern names -> jelly layout
function jellyMap(p,layers){
  const m=Array.from({length:R},()=>Array(C).fill(0));
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
    let on=false;
    switch(p){
      case 'bottom2':on=r>=6;break;
      case 'bottom4':on=r>=4;break;
      case 'center':on=r>=2&&r<=5&&c>=2&&c<=5;break;
      case 'checker':on=(r+c)%2===0;break;
      case 'border':on=r===0||c===0||r===R-1||c===C-1;break;
      case 'x':on=r===c||r+c===C-1||r===c+1&&false;break;
      case 'all':on=true;break;
    }
    if(on)m[r][c]=layers;
  }
  return m;
}
const L=(moves,colors,goal,jelly,layers=1)=>({moves,colors,goal,jelly,layers});
const LEVELS=[
 L(22,5,{score:900}),
 L(22,5,{score:1500}),
 L(20,5,{gems:4}),
 L(20,5,{collect:{0:14}}),
 L(22,5,{collect:{1:12,3:12}}),
 L(22,5,{score:3000,collect:{2:15}}),
 L(22,5,{jelly:1},'bottom2'),
 L(24,5,{jelly:1,gems:4},'center'),
 L(24,5,{jelly:1,score:3500},'checker'),
 L(24,5,{jelly:1,collect:{4:15}},'border'),
 L(24,6,{score:4500}),
 L(25,6,{collect:{0:15,5:15}}),
 L(25,6,{jelly:1,gems:5},'bottom4'),
 L(26,6,{jelly:1,score:4500},'checker'),
 L(24,6,{collect:{1:18,2:18}}),
 L(30,6,{jelly:1},'all'),
 L(26,6,{jelly:1,collect:{3:20}},'x'),
 L(26,6,{score:7000,gems:6}),
 L(28,6,{jelly:1,score:5000},'checker',2),
 L(32,6,{jelly:1,collect:{0:12,4:12},score:6000,gems:6},'border',2)
];

/* ============ canvas / sprites ============ */
const cv=$('#cv'),ctx=cv.getContext('2d');
let dpr=1,size=300,cell=34,pad=6,sprites={},icons={};

function shapePath(x,t,r){
  x.beginPath();
  switch(t){
    case 0: // heart
      x.moveTo(0,r*.85);
      x.bezierCurveTo(-r*1.25,r*.15,-r*.95,-r*.85,0,-r*.35);
      x.bezierCurveTo(r*.95,-r*.85,r*1.25,r*.15,0,r*.85);break;
    case 1: x.arc(0,0,r*.95,0,Math.PI*2);break;
    case 2: // star
      for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.5:r*1.08;x[i?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr+r*.05);}
      x.closePath();break;
    case 3: x.roundRect(-r*.82,-r*.82,r*1.64,r*1.64,r*.38);break;
    case 4: x.moveTo(0,-r*1.05);x.lineTo(r*.95,0);x.lineTo(0,r*1.05);x.lineTo(-r*.95,0);x.closePath();break;
    case 5: for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;x[i?'lineTo':'moveTo'](Math.cos(a)*r*.98,Math.sin(a)*r*.98);}x.closePath();break;
    default: x.arc(0,0,r,0,Math.PI*2);
  }
}
function drawGemShape(x,r){
  x.beginPath();x.arc(0,0,r*1.2,0,Math.PI*2);x.fillStyle='rgba(255,255,255,.9)';x.fill();
  x.beginPath();x.moveTo(0,-r);x.lineTo(r*.85,-r*.25);x.lineTo(0,r);x.lineTo(-r*.85,-r*.25);x.closePath();
  const g=x.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#fff3b0');g.addColorStop(.5,'#ffc933');g.addColorStop(1,'#d98a00');
  x.fillStyle=g;x.fill();x.lineWidth=r*.12;x.lineJoin='round';x.strokeStyle='#a86400';x.stroke();
  x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=r*.07;x.beginPath();
  x.moveTo(-r*.85,-r*.25);x.lineTo(r*.85,-r*.25);x.moveTo(0,-r);x.lineTo(-r*.3,-r*.25);x.lineTo(0,r);x.moveTo(0,-r);x.lineTo(r*.3,-r*.25);x.lineTo(0,r);x.stroke();
}
function makeGemSprite(){
  const S_=Math.max(8,Math.ceil(cell*dpr*.5)),c=document.createElement('canvas');c.width=c.height=S_;
  const x=c.getContext('2d');x.translate(S_/2,S_/2);drawGemShape(x,S_*.34);return c;
}
function makeSprite(t,s){
  const S_=Math.max(8,Math.ceil(cell*dpr)),c=document.createElement('canvas');
  c.width=c.height=S_;
  const x=c.getContext('2d');x.translate(S_/2,S_/2);
  const r=S_*.37;
  if(s==='c'){ // colour bomb: chocolate with sprinkles
    x.beginPath();x.arc(0,0,r*1.05,0,Math.PI*2);
    const g=x.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r*1.2);
    g.addColorStop(0,'#a8683f');g.addColorStop(.6,'#6b3a1f');g.addColorStop(1,'#331a0c');
    x.fillStyle=g;x.fill();x.lineWidth=r*.12;x.strokeStyle='#fff';x.stroke();
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2+.3,d=i%2?r*.45:r*.75;
      x.save();x.translate(Math.cos(a)*d,Math.sin(a)*d);x.rotate(a*2);
      x.fillStyle=COLORS[i%6].base;x.beginPath();x.roundRect(-r*.2,-r*.07,r*.4,r*.14,r*.07);x.fill();x.restore();
    }
  }else{
    const col=COLORS[t];
    if(s==='b'||s==='x'){ shapePath(x,t,r);x.lineWidth=r*.42;x.lineJoin='round';x.strokeStyle=s==='x'?'rgba(255,205,60,.98)':'rgba(255,255,255,.95)';x.stroke(); }
    shapePath(x,t,r);
    const g=x.createRadialGradient(-r*.35,-r*.4,r*.08,0,0,r*1.2);
    g.addColorStop(0,col.light);g.addColorStop(.5,col.base);g.addColorStop(1,col.dark);
    x.fillStyle=g;x.fill();x.lineWidth=r*.14;x.lineJoin='round';x.strokeStyle=col.dark;x.stroke();
    if(s==='h'||s==='v'||s==='x'){
      x.save();shapePath(x,t,r);x.clip();x.fillStyle='rgba(255,255,255,.78)';
      for(const k of [-.62,-.14,.34]){
        if(s!=='v')x.fillRect(-r*1.3,k*r,r*2.6,r*.22);
        if(s!=='h')x.fillRect(k*r,-r*1.3,r*.22,r*2.6);
      }
      x.restore();
    }
    if(s==='b'||s==='x'){ // sparkle
      x.fillStyle='rgba(255,255,255,.95)';x.beginPath();
      for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.12:r*.4;x[i?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr);}
      x.closePath();x.fill();
    }
  }
  // gloss
  x.save();x.translate(-r*.3,-r*.42);x.rotate(-.6);x.fillStyle='rgba(255,255,255,.55)';
  x.beginPath();x.ellipse(0,0,r*.3,r*.16,0,0,Math.PI*2);x.fill();x.restore();
  return c;
}
function buildSprites(){
  sprites={};icons={};
  for(let t=0;t<6;t++){
    for(const s of ['','h','v','b','x'])sprites[t+s]=makeSprite(t,s||null);
    icons[t]=sprites[t+''].toDataURL();
  }
  sprites['c']=makeSprite(-1,'c');
  sprites.gem=makeGemSprite();icons.gem=sprites.gem.toDataURL();
}
function spriteOf(cd){return cd.s==='c'?sprites['c']:sprites[cd.t+(cd.s||'')]}

function resize(){
  const wrap=$('#boardWrap');
  const w=wrap.clientWidth,h=wrap.clientHeight;
  size=Math.max(120,Math.floor(Math.min(w,h)));
  dpr=Math.min(window.devicePixelRatio||1,3);
  cv.style.width=cv.style.height=size+'px';
  cv.width=cv.height=Math.floor(size*dpr);
  pad=size*.02;cell=(size-pad*2)/C;
  buildSprites();
  if(typeof G!=='undefined'&&G)renderGoal();
}
new ResizeObserver(()=>{if(!$('#game').classList.contains('hidden'))resize()}).observe($('#boardWrap'));
addEventListener('orientationchange',()=>setTimeout(resize,200));

/* ============ tween & fx ============ */
const tweens=[];
function tw(obj,props,dur,fn=ease.out,delay=0){
  return new Promise(res=>{
    const from={};for(const k in props)from[k]=obj[k];
    tweens.push({obj,from,to:props,dur,t:-delay,fn,res});
  });
}
function updateTweens(dt){
  for(let i=tweens.length-1;i>=0;i--){
    const T=tweens[i];T.t+=dt;if(T.t<0)continue;
    const p=Math.min(1,T.t/T.dur),e=T.fn(p);
    for(const k in T.to)T.obj[k]=T.from[k]+(T.to[k]-T.from[k])*e;
    if(p>=1){tweens.splice(i,1);T.res();}
  }
}
const fx={parts:[],beams:[],pops:[],shake:0};
function burst(c,r,col,n=6){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,sp=1.5+Math.random()*3.5;
    fx.parts.push({x:c+.5,y:r+.5,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,life:.5+Math.random()*.4,max:.9,col,size:.07+Math.random()*.08});
  }
}
function popup(text,x,y,big=false){fx.pops.push({text,x,y,life:big?1.1:.8,max:big?1.1:.8,big});}

/* ============ game state ============ */
let G=null;
function newCandy(t,r,c,y){return{t,s:null,gem:false,x:c,y:y===undefined?r:y,sc:1,a:1,rot:0}}
function newGame(idx){
  const lv=LEVELS[idx];
  G={idx,lv,grid:[],jelly:jellyMap(lv.jelly,lv.layers),moves:lv.moves,score:0,got:{},
     jellyLeft:0,gemsGot:0,coinsEarned:0,busy:true,over:false,sel:null,mode:null,dead:false,idle:performance.now(),hint:null,start:{}};
  G.jelly.forEach(row=>row.forEach(v=>{if(v>0)G.jellyLeft++}));
  const n=lv.colors;
  do{
    G.grid=Array.from({length:R},()=>Array(C).fill(null));
    for(let r=0;r<R;r++)for(let c=0;c<C;c++){
      let t;
      do{t=rnd(n)}while((c>=2&&G.grid[r][c-1].t===t&&G.grid[r][c-2].t===t)||(r>=2&&G.grid[r-1][c].t===t&&G.grid[r-2][c].t===t));
      G.grid[r][c]=newCandy(t,r,c);
    }
  }while(!findMove());
  const ng=lv.goal.gems?3:1;
  for(let i=0;i<ng;i++){const q=G.grid[rnd(R)][rnd(C)];q.gem=true;}
}
function goalMet(){
  const g=G.lv.goal;
  if(g.score&&G.score<g.score)return false;
  if(g.collect)for(const t in g.collect)if((G.got[t]||0)<g.collect[t])return false;
  if(g.jelly&&G.jellyLeft>0)return false;
  if(g.gems&&G.gemsGot<g.gems)return false;
  return true;
}

/* ---- match logic ---- */
function findMatches(){
  const g=G.grid,runs=[];
  for(let r=0;r<R;r++){
    let c=0;
    while(c<C){
      const t=g[r][c].t;let e=c+1;
      while(e<C&&g[r][e].t===t)e++;
      if(t>=0&&e-c>=3){const cells=[];for(let i=c;i<e;i++)cells.push([r,i]);runs.push({dir:'h',cells});}
      c=e;
    }
  }
  for(let c=0;c<C;c++){
    let r=0;
    while(r<R){
      const t=g[r][c].t;let e=r+1;
      while(e<R&&g[e][c].t===t)e++;
      if(t>=0&&e-r>=3){const cells=[];for(let i=r;i<e;i++)cells.push([i,c]);runs.push({dir:'v',cells});}
      r=e;
    }
  }
  return runs;
}
function matchesAt(tm,r,c){
  const t=tm[r][c];if(t<0)return false;
  let h=1,i=c-1;while(i>=0&&tm[r][i]===t){h++;i--}
  i=c+1;while(i<C&&tm[r][i]===t){h++;i++}
  if(h>=3)return true;
  let v=1;i=r-1;while(i>=0&&tm[i][c]===t){v++;i--}
  i=r+1;while(i<R&&tm[i][c]===t){v++;i++}
  return v>=3;
}
function findMove(){
  const g=G.grid,tm=g.map(row=>row.map(x=>x.t));
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
    const a=g[r][c];
    if(a.s==='c')return [[r,c],c+1<C?[r,c+1]:[r,c-1]];
    for(const [dr,dc] of [[0,1],[1,0]]){
      const r2=r+dr,c2=c+dc;if(r2>=R||c2>=C)continue;
      const b=g[r2][c2];
      if(a.s&&b.s)return [[r,c],[r2,c2]];
      [tm[r][c],tm[r2][c2]]=[tm[r2][c2],tm[r][c]];
      const ok=matchesAt(tm,r,c)||matchesAt(tm,r2,c2);
      [tm[r][c],tm[r2][c2]]=[tm[r2][c2],tm[r][c]];
      if(ok)return [[r,c],[r2,c2]];
    }
  }
  return null;
}

/* ---- one clear step ---- */
async function step(runs,forced,hint,cascade){
  const g=G,grid=g.grid;
  const clear=new Set(),make=new Map();
  const hR=runs.filter(x=>x.dir==='h'),vR=runs.filter(x=>x.dir==='v');
  runs.forEach(run=>run.cells.forEach(([r,c])=>clear.add(key(r,c))));
  (forced||[]).forEach(k=>clear.add(k));
  const pri={x:4,c:3,b:2,h:1,v:1};
  const setMake=(k,s)=>{if(!make.has(k)||pri[s]>pri[make.get(k)])make.set(k,s)};
  const pivot=run=>{
    if(hint)for(const [r,c] of hint)if(run.cells.some(q=>q[0]===r&&q[1]===c))return key(r,c);
    const m=run.cells[run.cells.length>>1];return key(m[0],m[1]);
  };
  runs.forEach(run=>{
    const n=run.cells.length;
    if(n>=6)setMake(pivot(run),'x');
    else if(n>=5)setMake(pivot(run),'c');
    else if(n===4)setMake(pivot(run),run.dir==='h'?'v':'h');
  });
  hR.forEach(h=>vR.forEach(v=>h.cells.forEach(([r,c])=>{
    if(v.cells.some(q=>q[0]===r&&q[1]===c))setMake(key(r,c),'b');
  })));
  [...make.keys()].forEach(k=>{
    if(grid[(k/C)|0][k%C].s||(forced||[]).includes(k))make.delete(k);else clear.delete(k);
  });
  // chain reaction of special candies
  const trig=[...clear].filter(k=>grid[(k/C)|0][k%C].s),done=new Set();
  while(trig.length){
    const k=trig.pop();if(done.has(k))continue;done.add(k);
    const r=(k/C)|0,c=k%C,cd=grid[r][c];if(!cd||!cd.s)continue;
    const add=[];
    if(cd.s==='h'){for(let i=0;i<C;i++)add.push(key(r,i));fx.beams.push({k:'row',r,c,life:.45});}
    else if(cd.s==='v'){for(let i=0;i<R;i++)add.push(key(i,c));fx.beams.push({k:'col',r,c,life:.45});}
    else if(cd.s==='x'){
      for(let i=0;i<C;i++)add.push(key(r,i));for(let i=0;i<R;i++)add.push(key(i,c));
      fx.beams.push({k:'row',r,c,life:.5},{k:'col',r,c,life:.5});
    }
    else if(cd.s==='b'){
      for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){
        if(Math.abs(dr)+Math.abs(dc)>3)continue;
        const rr=r+dr,cc=c+dc;if(rr>=0&&rr<R&&cc>=0&&cc<C)add.push(key(rr,cc));
      }
      fx.beams.push({k:'ring',r,c,life:.5});
    }else if(cd.s==='c'){
      const cnt={};grid.forEach(row=>row.forEach(q=>{if(q&&q.t>=0)cnt[q.t]=(cnt[q.t]||0)+1}));
      let best=-1,bn=0;for(const t in cnt)if(cnt[t]>bn){bn=cnt[t];best=+t}
      grid.forEach((row,rr)=>row.forEach((q,cc)=>{if(q&&q.t===best)add.push(key(rr,cc))}));
      fx.beams.push({k:'flash',r,c,life:.5});
    }
    sfx.boom();haptic(25);fx.shake=Math.max(fx.shake,.35);
    add.forEach(kk=>{
      if(make.has(kk))return;clear.add(kk);
      const q=grid[(kk/C)|0][kk%C];if(q&&q.s&&!done.has(kk))trig.push(kk);
    });
  }
  // remove candies
  const ps=[];let cnt=0,sx=0,sy=0,gemHit=false;
  clear.forEach(k=>{
    const r=(k/C)|0,c=k%C,cd=grid[r][c];if(!cd)return;
    cnt++;sx+=c;sy+=r;
    if(cd.gem){g.gemsGot++;g.coinsEarned+=5;S.coins+=5;gemHit=true;popup('+5 🪙',c,r-.2);burst(c,r,'#ffc933',10);}
    const gc=g.lv.goal.collect;
    if(cd.t>=0&&gc&&gc[cd.t]!==undefined)g.got[cd.t]=(g.got[cd.t]||0)+1;
    if(g.jelly[r][c]>0){
      g.jelly[r][c]--;if(g.jelly[r][c]===0)g.jellyLeft--;
      burst(c,r,'#ff8fc7',6);
    }
    burst(c,r,cd.t>=0?COLORS[cd.t].base:'#8b5a3c',6);
    ps.push(tw(cd,{sc:0,a:0,rot:1},.2,ease.in));
    grid[r][c]=null;
  });
  // create special candies
  make.forEach((s,k)=>{
    const r=(k/C)|0,c=k%C,cd=grid[r][c];
    cd.s=s;if(s==='c')cd.t=-1;
    cd.sc=1.6;ps.push(tw(cd,{sc:1},.35,ease.back));
    burst(c,r,'#ffffff',10);sfx.special();haptic(20);
  });
  if(gemHit){sfx.gem();haptic(20);save();renderBoosters();}
  const pts=cnt*10*Math.min(cascade,5)+make.size*40;
  g.score+=pts;
  if(cnt)popup('+'+pts,sx/cnt,sy/cnt);
  renderHUD();
  await Promise.all(ps);
}

async function collapse(){
  const g=G,grid=g.grid,ps=[];
  let gemCount=0;grid.forEach(row=>row.forEach(q=>{if(q&&q.gem)gemCount++}));
  const gl=g.lv.goal.gems?4:2,gp=g.lv.goal.gems?.08:.03;
  for(let c=0;c<C;c++){
    let w=R-1;
    for(let r=R-1;r>=0;r--){
      const cd=grid[r][c];
      if(cd){
        if(r!==w){grid[w][c]=cd;grid[r][c]=null;ps.push(tw(cd,{y:w},.18+.07*Math.sqrt(w-r),ease.bounce));}
        w--;
      }
    }
    const n=w+1;
    for(let i=w;i>=0;i--){
      const cd=newCandy(rnd(g.lv.colors),i,c,i-n-.4);
      if(gemCount<gl&&Math.random()<gp){cd.gem=true;gemCount++}
      grid[i][c]=cd;
      ps.push(tw(cd,{y:i},.2+.07*Math.sqrt(i-cd.y),ease.bounce,(w-i)*.025));
    }
  }
  await Promise.all(ps);
}

const CHEERS=['Sweet!','Tasty!','Delicious!','Divine!'];
async function resolve(hint,forced){
  const g=G;let cascade=0,f=forced,h=hint,maxC=0;
  for(;;){
    const runs=findMatches();
    if(!runs.length&&!(f&&f.length))break;
    cascade++;maxC=cascade;sfx.pop(cascade);haptic(10);
    if(cascade>=2)popup(CHEERS[Math.min(cascade-2,3)],3.5,3.2,true);
    await step(runs,f,h,cascade);
    if(g.dead)return;
    f=null;h=null;
    await collapse();
    if(g.dead)return;
  }
  if(maxC>=3)await bonusJewel(maxC);
}
async function bonusJewel(n){
  const g=G,pool=[];
  g.grid.forEach((row,r)=>row.forEach((q,c)=>{if(q&&!q.s&&q.t>=0)pool.push([r,c,q])}));
  if(!pool.length)return;
  const [r,c,cd]=pool[rnd(pool.length)];
  cd.s=n>=5?'x':['h','v','b'][rnd(3)];cd.sc=1.8;
  popup('Bonus Jewel!',3.5,3.2,true);sfx.special();haptic(30);burst(c,r,'#ffffff',14);
  await tw(cd,{sc:1},.4,ease.back);
}

async function shuffleBoard(){
  const g=G,cs=[];
  g.grid.forEach(row=>row.forEach(x=>cs.push(x)));
  let ok=false;
  for(let i=0;i<300&&!ok;i++){
    for(let j=cs.length-1;j>0;j--){const k=rnd(j+1);[cs[j],cs[k]]=[cs[k],cs[j]]}
    cs.forEach((cd,i2)=>g.grid[(i2/C)|0][i2%C]=cd);
    ok=!findMatches().length&&!!findMove();
  }
  for(let i=0;i<500&&!ok;i++){
    cs.forEach(cd=>{if(!cd.s)cd.t=rnd(g.lv.colors)});
    ok=!findMatches().length&&!!findMove();
  }
  sfx.shuffle();
  await Promise.all(cs.map((cd,i)=>tw(cd,{x:i%C,y:(i/C)|0},.55,ease.inOut)));
}

/* ---- after-move checks ---- */
async function endCheck(){
  const g=G;
  if(g.dead)return;
  if(goalMet()){await win();return}
  if(g.moves<=0){await lose();return}
  if(!findMove()){popup('No moves – shuffling!',3.5,3.5,true);await sleep(500);await shuffleBoard();if(g.dead)return}
}

async function attemptSwap(r1,c1,r2,c2){
  const g=G;
  if(g.busy||g.over)return;
  g.busy=true;g.sel=null;g.hint=null;g.idle=performance.now();
  const grid=g.grid,a=grid[r1][c1],b=grid[r2][c2];
  grid[r1][c1]=b;grid[r2][c2]=a;
  sfx.swap();
  await Promise.all([tw(a,{x:c2,y:r2},.17,ease.inOut),tw(b,{x:c1,y:r1},.17,ease.inOut)]);
  if(g.dead)return;
  let forced=null;
  if(a.s==='c'||b.s==='c'){
    forced=[];
    const cb=a.s==='c'?a:b,other=cb===a?b:a;
    if(other.s==='c'){for(let i=0;i<R*C;i++)forced.push(i);}
    else{
      const T=other.t;
      grid.forEach((row,r)=>row.forEach((cd,c)=>{
        if(cd.t===T){if(other.s&&cd!==other)cd.s=other.s;forced.push(key(r,c));}
      }));
      forced.push(key(r1,c1),key(r2,c2));
    }
  }else if(a.s&&b.s)forced=[key(r1,c1),key(r2,c2)];
  if(forced||findMatches().length){
    g.moves--;renderHUD();
    await resolve([[r2,c2],[r1,c1]],forced);
    if(g.dead)return;
    await endCheck();
  }else{
    grid[r1][c1]=a;grid[r2][c2]=b;
    sfx.bad();haptic(30);
    await Promise.all([tw(a,{x:c1,y:r1},.17,ease.inOut),tw(b,{x:c2,y:r2},.17,ease.inOut)]);
  }
  if(g.dead)return;
  g.busy=false;g.idle=performance.now();
}

async function useHammer(r,c){
  const g=G;
  g.busy=true;g.mode=null;g.sel=null;S.hammer--;save();renderBoosters();
  sfx.boom();fx.shake=.4;haptic(30);
  await resolve(null,[key(r,c)]);
  if(g.dead)return;
  await endCheck();
  if(g.dead)return;
  g.busy=false;g.idle=performance.now();
}
async function useShuffle(){
  const g=G;
  if(g.busy||g.over||S.shuffle<=0)return;
  g.busy=true;g.mode=null;S.shuffle--;save();renderBoosters();
  await shuffleBoard();
  if(g.dead)return;
  const runs=findMatches();
  if(runs.length)await resolve(null,null);
  if(g.dead)return;
  await endCheck();
  if(g.dead)return;
  g.busy=false;g.idle=performance.now();
}

/* ============ win / lose ============ */
async function win(){
  const g=G;g.over=true;
  const left=g.moves;
  if(left>0){
    popup(`Bonus +${left*50}`,3.5,3.5,true);
    for(let i=0;i<left;i++){g.moves--;g.score+=50;renderHUD();sfx.tick();await sleep(60);if(g.dead)return}
  }
  const pct=left/g.lv.moves;
  const stars=pct>=.4?3:pct>=.2?2:1;
  const prev=S.stars[g.idx]||0;
  if(stars>prev)S.stars[g.idx]=stars;
  S.unlocked=Math.max(S.unlocked,Math.min(LEVELS.length,g.idx+2));
  let reward='';
  const bonus=15+stars*10+Math.max(0,stars-prev)*10;S.coins+=bonus;
  if(stars===3){S.hammer++;reward+='🔨 +1 Hammer ';}
  if(g.idx%5===4){S.rainbow++;reward+='🌈 +1 Rainbow ';}
  if((g.idx+1)%3===0){S.shuffle++;reward+='🔀 +1 Shuffle';}
  save();renderBoosters();
  sfx.win();haptic([40,40,80]);
  for(let i=0;i<40;i++)burst(rnd(C),rnd(R),COLORS[rnd(6)].base,3);
  await sleep(700);
  if(g.dead)return;
  const last=g.idx>=LEVELS.length-1;
  showModal(`<h2>${last?'🏆 All Clear!':'Level Complete!'}</h2>
    <div class="stars">${[1,2,3].map(i=>`<span class="${i<=stars?'on':'off'}" style="animation-delay:${i*.2}s">★</span>`).join('')}</div>
    <p>Score: <b>${g.score}</b></p><p class="coinsBig">🪙 +${bonus+g.coinsEarned}</p>${g.coinsEarned?`<p style="font-size:14px;opacity:.7">(${g.gemsGot} gems collected)</p>`:''}${reward?`<p>${reward}</p>`:''}
    <div class="row">${last?'':'<button class="btn" data-act="next">Next Level ▶</button>'}
    <button class="btn alt" data-act="retry">Replay</button><button class="btn ghost" data-act="levels">Levels</button></div>`);
}
async function lose(){
  const g=G;g.over=true;
  sfx.lose();haptic(200);
  await sleep(500);if(g.dead)return;
  showModal(`<h2>Out of moves!</h2><p>So close! Score: <b>${g.score}</b></p>
    <div class="goalList">${goalChips(true)}</div>
    <div class="row"><button class="btn" data-act="continue" ${S.coins<50?'disabled':''}>+5 Moves · 🪙 50</button><button class="btn alt" data-act="retry">Try Again</button><button class="btn ghost" data-act="levels">Levels</button></div>`);
}

/* ============ UI ============ */
function goalChips(remaining){
  const gl=G.lv.goal;let h='';
  if(gl.score){
    const done=G.score>=gl.score;
    h+=`<div class="chip wide ${done?'done':''}"><span>⭐ Score</span><b>${Math.min(G.score,gl.score)}/${gl.score}</b><i style="width:${Math.min(100,G.score/gl.score*100)}%"></i></div>`;
  }
  if(gl.collect)for(const t in gl.collect){
    const left=Math.max(0,gl.collect[t]-(G.got[t]||0));
    h+=`<div class="chip ${left===0?'done':''}"><img alt="${COLOR_NAMES[t]} candy" src="${icons[t]||''}"><b>${left===0?'✓':left}</b></div>`;
  }
  if(gl.gems){const left=Math.max(0,gl.gems-G.gemsGot);h+=`<div class="chip ${left===0?'done':''}"><img alt="lucky gem" src="${icons.gem||''}"><b>${left===0?'✓':left}</b></div>`;}
  if(gl.jelly)h+=`<div class="chip ${G.jellyLeft===0?'done':''}"><span class="jl"></span><b>${G.jellyLeft===0?'✓':G.jellyLeft}</b></div>`;
  return h;
}
function renderGoal(){$('#goal').innerHTML=goalChips()}
function renderHUD(){
  $('#moves').textContent=G.moves;$('#score').textContent=G.score;
  $('#movesBox').classList.toggle('low',G.moves<=5&&G.moves>0);
  renderGoal();
}
function renderBoosters(){
  $('#nHammer').textContent=S.hammer;$('#nShuffle').textContent=S.shuffle;$('#nRainbow').textContent=S.rainbow;$('#nCoins').textContent=S.coins;
  $('#bHammer').disabled=S.hammer<=0&&!(G&&G.mode==='hammer');
  $('#bShuffle').disabled=S.shuffle<=0;
  $('#bRainbow').disabled=S.rainbow<=0&&!(G&&G.mode==='rainbow');
  $('#bHammer').classList.toggle('on',!!(G&&G.mode==='hammer'));
  $('#bRainbow').classList.toggle('on',!!(G&&G.mode==='rainbow'));
}
function showModal(html){$('#card').innerHTML=html;$('#modal').classList.remove('hidden')}
function hideModal(){$('#modal').classList.add('hidden')}

function renderMenu(){
  const el=$('#levels');el.innerHTML='';
  $('#sumLine').textContent='🪙 '+S.coins+'  ·  ⭐ '+S.stars.reduce((a,b)=>a+(b||0),0);
  $('#btnDaily').textContent=dailyState().can?'🎁 Daily ❗':'🎁 Daily';
  LEVELS.forEach((_,i)=>{
    const b=document.createElement('button');
    const locked=i>=S.unlocked,st=S.stars[i]||0;
    b.className='lv'+(locked?' locked':'')+(i===S.unlocked-1?' cur':'');
    b.innerHTML=locked?'🔒':`${i+1}<small>${'★'.repeat(st)}${'☆'.repeat(3-st)}</small>`;
    b.setAttribute('aria-label','Level '+(i+1)+(locked?' locked':''));
    if(!locked)b.onclick=()=>{initAudio();sfx.tick();intro(i)};
    el.appendChild(b);
  });
}
function showMenu(){
  if(G)G.dead=true;G=null;tweens.length=0;
  $('#game').classList.add('hidden');$('#menu').classList.remove('hidden');
  hideModal();renderMenu();
}
function describeGoal(lv){
  const gl=lv.goal,items=[];
  if(gl.score)items.push(`<div class="chip">⭐ Reach <b>${gl.score}</b> points</div>`);
  if(gl.collect)for(const t in gl.collect)items.push(`<div class="chip"><img alt="" src="${icons[t]||makeSprite(+t,null).toDataURL()}">Collect <b>${gl.collect[t]}</b> ${COLOR_NAMES[t]}</div>`);
  if(gl.gems)items.push(`<div class="chip"><img alt="" src="${icons.gem||''}">Find <b>${gl.gems}</b> lucky gems</div>`);
  if(gl.jelly)items.push(`<div class="chip"><span class="jl"></span>Clear all <b>jelly</b>${lv.layers>1?' (2 layers!)':''}</div>`);
  return items.join('');
}
function intro(i){
  if(!Object.keys(icons).length){$('#game').classList.remove('hidden');$('#menu').classList.add('hidden');resize();$('#game').classList.add('hidden');$('#menu').classList.remove('hidden');}
  const lv=LEVELS[i];
  showModal(`<h2>Level ${i+1}</h2><p>You have <b>${lv.moves}</b> moves</p><div class="goalList">${describeGoal(lv)}</div>${lv.goal.gems?'<p style="font-size:14px;opacity:.75">Gems hide on candies – clear that candy to grab the gem! 🪙 +5 each</p>':''}
    <div class="row"><button class="btn" data-act="play" data-i="${i}">Play!</button><button class="btn ghost" data-act="close">Back</button></div>`);
}
function startLevel(i){
  hideModal();
  $('#menu').classList.add('hidden');$('#game').classList.remove('hidden');
  if(G)G.dead=true;tweens.length=0;fx.parts.length=fx.beams.length=fx.pops.length=0;
  resize();
  newGame(i);
  $('#lvlNum').textContent=i+1;
  renderHUD();renderBoosters();
  // drop-in animation
  const ps=[];
  G.grid.forEach((row,r)=>row.forEach((cd,c)=>{cd.y=r-R-1;ps.push(tw(cd,{y:r},.45+r*.03,ease.bounce,c*.03+(R-r)*.01))}));
  const g=G;
  Promise.all(ps).then(()=>{if(g.dead)return;g.busy=false;g.idle=performance.now()});
}
function openPause(){
  if(!G)return;
  showModal(`<h2>Paused</h2><div class="row">
    <div class="tog">Sound <button id="tSound" class="${S.sound?'on':''}" aria-label="Toggle sound"></button></div>
    <div class="tog">Vibration <button id="tHap" class="${S.haptics?'on':''}" aria-label="Toggle vibration"></button></div>
    <button class="btn" data-act="close">Resume</button><button class="btn alt" data-act="retry">Restart</button><button class="btn ghost" data-act="levels">Levels</button></div>`);
  bindToggles();
}
function openSettings(){
  showModal(`<h2>Settings</h2><div class="row">
    <div class="tog">Sound <button id="tSound" class="${S.sound?'on':''}" aria-label="Toggle sound"></button></div>
    <div class="tog">Vibration <button id="tHap" class="${S.haptics?'on':''}" aria-label="Toggle vibration"></button></div>
    <button class="btn ghost" data-act="resetAsk">Reset progress</button>
    <button class="btn" data-act="close">Done</button></div>`);
  bindToggles();
}
function bindToggles(){
  $('#tSound').onclick=e=>{S.sound=!S.sound;e.target.classList.toggle('on',S.sound);save();initAudio();sfx.tick()};
  $('#tHap').onclick=e=>{S.haptics=!S.haptics;e.target.classList.toggle('on',S.haptics);save();haptic(30)};
}
$('#card').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  initAudio();
  const a=b.dataset.act;
  if(a==='close')hideModal();
  else if(a==='play')startLevel(+b.dataset.i);
  else if(a==='retry')startLevel(G.idx);
  else if(a==='next')startLevel(G.idx+1);
  else if(a==='levels')showMenu();
  else if(a==='buy'){const it=SHOP.find(i=>i.id===b.dataset.item);if(it&&S.coins>=it.cost){S.coins-=it.cost;S[it.id]++;save();sfx.gem();renderBoosters();renderMenu();openShop();}}
  else if(a==='claim'){const d=dailyState();if(d.can){const r=DAILY[d.idx];S.lastDaily=dstr(new Date());S.streak=d.next;S.coins+=r.c;S.hammer+=r.hammer||0;S.shuffle+=r.shuffle||0;S.rainbow+=r.rainbow||0;save();sfx.win();renderMenu();renderBoosters();openDaily();}}
  else if(a==='continue'){if(S.coins>=50&&G){S.coins-=50;save();G.moves+=5;G.over=false;G.busy=false;G.idle=performance.now();hideModal();renderHUD();renderBoosters();sfx.special();}}
  else if(a==='resetAsk'){
    showModal(`<h2>Reset?</h2><p>This erases all stars and progress.</p><div class="row"><button class="btn" data-act="reset">Yes, reset</button><button class="btn ghost" data-act="close">Cancel</button></div>`);
  }else if(a==='reset'){S={unlocked:1,stars:[],hammer:3,shuffle:2,rainbow:1,coins:30,lastDaily:'',streak:0,sound:S.sound,haptics:S.haptics};save();hideModal();renderMenu();}
});
$('#btnContinue').onclick=()=>{initAudio();intro(Math.min(S.unlocked,LEVELS.length)-1)};
$('#btnSettings').onclick=()=>{initAudio();openSettings()};
$('#btnPause').onclick=()=>{initAudio();openPause()};
function setMode(m,msg){
  initAudio();if(!G||G.busy||G.over)return;
  G.mode=G.mode===m?null:m;G.sel=null;sfx.tick();renderBoosters();
  if(G.mode)popup(msg,3.5,3.5,true);
}
$('#bHammer').onclick=()=>setMode('hammer','Tap a candy to smash!');
$('#bRainbow').onclick=()=>setMode('rainbow','Tap a candy to make a Rainbow!');
$('#bShop').onclick=()=>{initAudio();openShop()};
$('#btnShopMenu').onclick=()=>{initAudio();openShop()};
$('#btnDaily').onclick=()=>{initAudio();openDaily()};
async function useRainbow(r,c){
  const g=G;
  g.busy=true;g.mode=null;g.sel=null;S.rainbow--;save();renderBoosters();
  const cd=g.grid[r][c];cd.t=-1;cd.s='c';cd.sc=1.9;
  sfx.special();haptic(30);burst(c,r,'#ffffff',16);
  await tw(cd,{sc:1},.4,ease.back);
  if(g.dead)return;
  g.busy=false;g.idle=performance.now();
}
/* ---- shop & daily gift ---- */
const SHOP=[{id:'hammer',icon:'🔨',name:'Hammer',cost:40},{id:'shuffle',icon:'🔀',name:'Shuffle',cost:30},{id:'rainbow',icon:'🌈',name:'Rainbow Jewel',cost:80}];
function openShop(){
  showModal(`<h2>Shop</h2><p class="coinsBig">🪙 ${S.coins}</p><div class="row">${SHOP.map(i=>`<div class="shopRow"><span>${i.icon} ${i.name}<small>You have ${S[i.id]}</small></span><button class="btn small" data-act="buy" data-item="${i.id}" ${S.coins<i.cost?'disabled':''}>🪙 ${i.cost}</button></div>`).join('')}<button class="btn" data-act="close">Done</button></div>`);
}
const dstr=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
const DAILY=[{c:20},{c:30},{c:30,hammer:1},{c:40},{c:40,rainbow:1},{c:50},{c:100,shuffle:1,hammer:1,rainbow:1}];
const dText=r=>'🪙'+r.c+(r.hammer?'<br>🔨':'')+(r.shuffle?'🔀':'')+(r.rainbow?'🌈':'');
function dailyState(){
  const can=S.lastDaily!==dstr(new Date());
  const next=can?(S.lastDaily===dstr(new Date(Date.now()-864e5))?S.streak+1:1):S.streak;
  return{can,next,idx:Math.max(0,(next-1)%7)};
}
function openDaily(){
  const d=dailyState();
  showModal(`<h2>🎁 Daily Gift</h2><p>Come back every day for bigger rewards!</p>
    <div class="days">${DAILY.map((r,i)=>`<div class="${i===d.idx?'cur':''} ${(!d.can&&i<=d.idx)||(d.can&&i<d.idx)?'got':''}">Day ${i+1}<br>${dText(r)}</div>`).join('')}</div>
    <div class="row">${d.can?'<button class="btn" data-act="claim">Claim!</button>':'<p>Already claimed today ✔<br>Come back tomorrow!</p>'}<button class="btn ghost" data-act="close">Close</button></div>`);
}
$('#bShuffle').onclick=()=>{initAudio();useShuffle()};

/* ============ input ============ */
let touch=null;
function cellFromEvent(e){
  const rc=cv.getBoundingClientRect();
  const x=(e.clientX-rc.left)*(size/rc.width)-pad,y=(e.clientY-rc.top)*(size/rc.height)-pad;
  const c=Math.floor(x/cell),r=Math.floor(y/cell);
  if(r<0||r>=R||c<0||c>=C)return null;
  return{r,c};
}
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();initAudio();
  if(!G||G.busy||G.over)return;
  const p=cellFromEvent(e);if(!p)return;
  G.idle=performance.now();G.hint=null;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(G.mode==='hammer'){useHammer(p.r,p.c);return}
  if(G.mode==='rainbow'){useRainbow(p.r,p.c);return}
  if(G.sel){
    const s=G.sel;
    if(s.r===p.r&&s.c===p.c){G.sel=null;return}
    if(Math.abs(s.r-p.r)+Math.abs(s.c-p.c)===1){G.sel=null;attemptSwap(s.r,s.c,p.r,p.c);return}
  }
  G.sel={r:p.r,c:p.c};sfx.tick();haptic(5);
  touch={x:e.clientX,y:e.clientY,r:p.r,c:p.c};
});
cv.addEventListener('pointermove',e=>{
  if(!touch||!G||G.busy||G.over)return;
  const dx=e.clientX-touch.x,dy=e.clientY-touch.y,th=cell*.45*(cv.getBoundingClientRect().width/size);
  if(Math.max(Math.abs(dx),Math.abs(dy))<th)return;
  let r2=touch.r,c2=touch.c;
  if(Math.abs(dx)>Math.abs(dy))c2+=dx>0?1:-1;else r2+=dy>0?1:-1;
  const s=touch;touch=null;G.sel=null;
  if(r2>=0&&r2<R&&c2>=0&&c2<C)attemptSwap(s.r,s.c,r2,c2);
});
const endTouch=()=>{touch=null};
cv.addEventListener('pointerup',endTouch);cv.addEventListener('pointercancel',endTouch);
cv.addEventListener('contextmenu',e=>e.preventDefault());

/* ============ rendering ============ */
let lastT=performance.now();
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function draw(t){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,size,size);
  // panel
  ctx.fillStyle='rgba(255,255,255,.45)';rr(0,0,size,size,size*.045);ctx.fill();
  if(!G)return;
  ctx.save();
  if(fx.shake>0){const s=fx.shake*cell*.25;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s)}
  ctx.translate(pad,pad);
  // cell tiles + jelly
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
    ctx.fillStyle=(r+c)%2?'rgba(255,255,255,.22)':'rgba(255,255,255,.4)';
    rr(c*cell+1,r*cell+1,cell-2,cell-2,cell*.18);ctx.fill();
    const j=G.jelly[r][c];
    if(j>0){
      const g2=ctx.createLinearGradient(0,r*cell,0,(r+1)*cell);
      if(j>=2){g2.addColorStop(0,'rgba(190,110,255,.75)');g2.addColorStop(1,'rgba(150,70,230,.75)')}
      else{g2.addColorStop(0,'rgba(255,150,205,.65)');g2.addColorStop(1,'rgba(255,100,175,.65)')}
      ctx.fillStyle=g2;rr(c*cell+1,r*cell+1,cell-2,cell-2,cell*.18);ctx.fill();
      ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.stroke();
    }
  }
  // candies (clipped to board)
  ctx.save();ctx.beginPath();ctx.rect(0,0,cell*C,cell*R);ctx.clip();
  const hint=G.hint;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
    const cd=G.grid[r][c];if(!cd||cd.a<=0.01)continue;
    const sp=spriteOf(cd);if(!sp)continue;
    let sc=cd.sc,rot=cd.rot*Math.PI;
    if(cd.s)sc*=1+.05*Math.sin(t*5+r+c);
    if(G.sel&&G.sel.r===r&&G.sel.c===c)sc*=1.12+.06*Math.sin(t*10);
    if(hint&&((hint[0][0]===r&&hint[0][1]===c)||(hint[1][0]===r&&hint[1][1]===c)))rot+=Math.sin(t*12)*.18;
    ctx.save();
    ctx.globalAlpha=Math.max(0,cd.a);
    ctx.translate((cd.x+.5)*cell,(cd.y+.5)*cell);ctx.rotate(rot);ctx.scale(sc,sc);
    ctx.drawImage(sp,-cell/2,-cell/2,cell,cell);
    if(cd.gem&&sprites.gem){const pu=1+.12*Math.sin(t*6+r*2+c);ctx.save();ctx.translate(cell*.24,cell*.24);ctx.scale(pu,pu);ctx.drawImage(sprites.gem,-cell*.21,-cell*.21,cell*.42,cell*.42);ctx.restore();}
    ctx.restore();
    if(G.sel&&G.sel.r===r&&G.sel.c===c){
      ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=3;rr(c*cell+2,r*cell+2,cell-4,cell-4,cell*.2);ctx.stroke();
    }
  }
  ctx.restore();
  // beams
  for(const b of fx.beams){
    const a=Math.max(0,b.life/.5);
    ctx.save();ctx.globalAlpha=a;
    if(b.k==='row'){const g3=ctx.createLinearGradient(0,0,0,cell);g3.addColorStop(0,'rgba(255,255,255,0)');g3.addColorStop(.5,'#fff');g3.addColorStop(1,'rgba(255,255,255,0)');ctx.translate(0,b.r*cell);ctx.fillStyle=g3;ctx.fillRect(0,-cell*.1,cell*C,cell*1.2)}
    else if(b.k==='col'){const g3=ctx.createLinearGradient(0,0,cell,0);g3.addColorStop(0,'rgba(255,255,255,0)');g3.addColorStop(.5,'#fff');g3.addColorStop(1,'rgba(255,255,255,0)');ctx.translate(b.c*cell,0);ctx.fillStyle=g3;ctx.fillRect(-cell*.1,0,cell*1.2,cell*R)}
    else if(b.k==='ring'){const p=1-a;ctx.strokeStyle='#fff';ctx.lineWidth=cell*.25*a;ctx.beginPath();ctx.arc((b.c+.5)*cell,(b.r+.5)*cell,cell*(.5+p*2.6),0,Math.PI*2);ctx.stroke()}
    else{ctx.fillStyle='#fff';ctx.globalAlpha=a*.6;ctx.fillRect(0,0,cell*C,cell*R)}
    ctx.restore();
  }
  // particles
  for(const p of fx.parts){
    ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x*cell,p.y*cell,p.size*cell,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  // popups
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  for(const p of fx.pops){
    const k=1-p.life/p.max,a=Math.min(1,p.life/(p.max*.4));
    ctx.globalAlpha=a;
    ctx.font=`700 ${cell*(p.big?.62:.42)*(p.big?Math.min(1,.6+k*3):1)}px ui-rounded,'Arial Rounded MT Bold',system-ui,sans-serif`;
    const x=(p.x+.5)*cell,y=(p.y+.5)*cell-k*cell*(p.big?.8:1.1);
    ctx.lineWidth=cell*.14;ctx.strokeStyle='#ff4f9a';ctx.strokeText(p.text,x,y);
    ctx.fillStyle='#fff';ctx.fillText(p.text,x,y);
  }
  ctx.globalAlpha=1;
  ctx.restore();
}
function frame(now){
  const dt=Math.min(.05,(now-lastT)/1000);lastT=now;
  updateTweens(dt);
  for(let i=fx.parts.length-1;i>=0;i--){const p=fx.parts[i];p.life-=dt;p.vy+=9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)fx.parts.splice(i,1)}
  for(let i=fx.beams.length-1;i>=0;i--){fx.beams[i].life-=dt;if(fx.beams[i].life<=0)fx.beams.splice(i,1)}
  for(let i=fx.pops.length-1;i>=0;i--){fx.pops[i].life-=dt;if(fx.pops[i].life<=0)fx.pops.splice(i,1)}
  fx.shake=Math.max(0,fx.shake-dt);
  if(G&&!G.busy&&!G.over&&!G.hint&&!G.mode&&now-G.idle>5000){const m=findMove();if(m)G.hint=m;}
  if(!$('#game').classList.contains('hidden'))draw(now/1000);
  requestAnimationFrame(frame);
}
/* ============ boot ============ */
renderMenu();
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{lastT=performance.now()});

/* ============ PWA: service worker + install prompt ============ */
let deferredPrompt=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if('serviceWorker' in navigator){
  addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})});
}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(!isStandalone())$('#installBtn').classList.add('show');});
addEventListener('appinstalled',()=>{deferredPrompt=null;$('#installBtn').classList.remove('show');});
if(isIOS&&!isStandalone())$('#installBtn').classList.add('show');
$('#installBtn').onclick=async()=>{
  if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch(e){}deferredPrompt=null;$('#installBtn').classList.remove('show');}
  else showModal(`<h2>Install Sweet Pop</h2><p>Tap the <b>Share</b> button in Safari, then choose <b>Add to Home Screen</b>.</p><div class="row"><button class="btn" data-act="close">Got it</button></div>`);
};
