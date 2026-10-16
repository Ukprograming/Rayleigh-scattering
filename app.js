'use strict';
(() => {
  const $ = id => document.getElementById(id), M = window.RayleighModel;
  const canvas = $('scene'), ctx = canvas.getContext('2d'), stage = document.querySelector('.stage');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {step:0, playing:!reducedMotion, time:0, phase:0, wavelength:450, frequency:1, source:true,signals:[]};
  const camera={yaw:.45,pitch:.38};
  const TAU = Math.PI*2, DT = 1/120, C = 88;
  let width=0, height=0, last=0, accumulator=0;
  function resetTime(){
    state.time=0;state.phase=0;state.signals=[];accumulator=0;
    // A developed pattern is visible even when reduced motion starts paused.
    for(let i=0;i<1440;i++)tick(DT);
  }
  function selectStep(step){
    state.step=step;state.source=true;state.wavelength=450;$('wavelength').value=450;resetTime();
    document.querySelectorAll('[data-step]').forEach((b,i)=>{b.classList.toggle('active',i===step);b.setAttribute('aria-pressed',String(i===step));});
    $('frequency-control').hidden=step!==0;$('wavelength-control').hidden=step!==2;$('comparison').hidden=step!==2;$('source').hidden=step===2;
    $('view-label').hidden=step===2;$('rotate-hint').hidden=step===2;
    $('emission-strength').hidden=step!==0;
    $('view-label').textContent=step===0?'角度は振動軸から':'光の放射';
    canvas.setAttribute('aria-label',[
      '振動する負電荷から光が外向きに伝わる3D模式図。振動軸に垂直な90度方向が最大、45度で半分、軸上の0度ではゼロ。ドラッグまたは矢印キーで回転、Homeキーで向きを戻します',
      '光の電場と逆向きに電子分布がずれ、双極子が振動して放射する3D模式図。ドラッグまたは矢印キーで回転できます',
      '同じ強さの入射光について、赤650 nmと選択した波長の双極子振動と散乱を比較する3D模式図。ドラッグまたは矢印キーで回転できます'
    ][step]);updateUI();draw();
  }
  function updateUI(){
    $('play').textContent=state.playing?'一時停止':'再生';$('play').setAttribute('aria-label',state.playing?'一時停止':'再生');
    $('source').setAttribute('aria-pressed',String(state.source));
    $('source').textContent=state.step===0?(state.source?'振動を止める':'振動させる'):(state.source?'光を切る':'光を当てる');
    $('wavelength-value').textContent=`${state.wavelength} nm`;
    $('frequency-value').textContent=`${state.frequency.toFixed(1)} 倍`;
    const power=state.source?M.dipolePower(1,state.frequency):0;
    $('emission-value').textContent=`${power.toFixed(2)} 倍`;
    $('emission-bar').style.width=`${100*power/16}%`;
    const color=`rgb(${M.color(state.wavelength)})`;
    $('selected-wave').textContent=`${state.wavelength} nm`;$('selected-wave').style.color=color;
    $('intensity').textContent=M.relativeIntensity(state.wavelength).toFixed(2);
    $('intensity').setAttribute('aria-label',`散乱の強さ、赤を1として${M.relativeIntensity(state.wavelength).toFixed(2)}`);
    $('selected-bar').style.width=`${100*M.relativeIntensity(state.wavelength)/M.relativeIntensity(380)}%`;$('selected-bar').style.background=color;
  }
  document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>selectStep(Number(b.dataset.step))));
  $('play').addEventListener('click',()=>{state.playing=!state.playing;accumulator=0;updateUI();});
  $('source').addEventListener('click',()=>{state.source=!state.source;updateUI();draw();});
  $('wavelength').addEventListener('input',e=>{state.wavelength=Number(e.target.value);resetTime();updateUI();draw();});
  $('frequency').addEventListener('input',e=>{state.frequency=Number(e.target.value);updateUI();draw();});
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;camera.yaw+=(e.clientX-drag.x)*.008;camera.pitch=Math.max(-1.48,Math.min(1.48,camera.pitch+(e.clientY-drag.y)*.008));drag.x=e.clientX;drag.y=e.clientY;draw();});
  const endDrag=e=>{if(drag?.id===e.pointerId)drag=null;};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();
    if(e.key==='Home'){camera.yaw=.45;camera.pitch=.38;}
    if(e.key==='ArrowLeft')camera.yaw-=.15;if(e.key==='ArrowRight')camera.yaw+=.15;
    if(e.key==='ArrowUp')camera.pitch=Math.max(-1.48,camera.pitch-.15);if(e.key==='ArrowDown')camera.pitch=Math.min(1.48,camera.pitch+.15);draw();
  });
  function tick(dt){
    state.time+=dt;
    const f=state.step===0?state.frequency:550/state.wavelength;state.phase+=TAU*.6*f*dt;
    const redOmega=TAU*.6*550/650;
    state.signals.push({t:state.time,field:state.source?f*f*Math.sin(state.phase):0,power:state.source?f**4:0,red:(550/650)**2*Math.sin(redOmega*state.time),redPower:(550/650)**4});
    if(state.signals.length>3000)state.signals.splice(0,120);
  }
  const rgb=(color,a=1)=>`rgba(${color[0]},${color[1]},${color[2]},${a})`;
  function line(x1,y1,x2,y2,color,w=1){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=w;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function text(s,x,y,color='#b3c5d1',size=13){ctx.fillStyle=color;ctx.font=`${size}px "Yu Gothic",Meiryo,sans-serif`;ctx.textAlign='center';ctx.fillText(s,x,y);}
  function arrow(x1,y1,x2,y2,color){
    if(Math.hypot(x2-x1,y2-y1)<3)return;
    line(x1,y1,x2,y2,color,2);const a=Math.atan2(y2-y1,x2-x1),len=6;
    ctx.beginPath();ctx.fillStyle=color;ctx.moveTo(x2,y2);ctx.lineTo(x2-len*Math.cos(a-.5),y2-len*Math.sin(a-.5));ctx.lineTo(x2-len*Math.cos(a+.5),y2-len*Math.sin(a+.5));ctx.closePath();ctx.fill();
  }
  function disk(x,y,r,color,sign){ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,TAU);ctx.fill();if(sign)text(sign,x,y+5,'#102436',17);}
  function drawRadiator(cx,cy,size,wavelength,phase,red=false){
    return window.Radiation3D.draw(ctx,{cx,cy,size,...camera,color:state.step===0?[243,199,122]:M.color(wavelength),phase,on:state.source,signals:state.signals,red,time:state.time,speed:C/size,charge:state.step===0,probes:state.step===0&&size>55,drawSource:state.step!==0?view=>dipole3D(view,phase,size):undefined});
  }
  function dipole3D(view,phase,size){
    const field=state.source?Math.sin(phase):0;
    const nucleus=view.project([0,0,0]);
    const density=view.project([0,-field*.16,0]);
    // Two overlapping, soft density profiles keep the nucleus enclosed while
    // the denser side follows the electric force. Neither has a hard outline.
    function cloud(p,r,opacity){
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
      g.addColorStop(0,rgb([114,225,222],opacity));
      g.addColorStop(.28,rgb([114,225,222],opacity*.88));
      g.addColorStop(.58,rgb([114,225,222],opacity*.4));
      g.addColorStop(1,rgb([114,225,222],0));
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();
    }
    cloud(nucleus,size*.48,.23);
    cloud(density,size*.39,.76);
    // Embed the negative sign in the cloud, away from the fixed nucleus.
    const sign=view.project([.22,-field*.16,0]);
    line(sign.x-3,sign.y,sign.x+3,sign.y,'rgba(176,255,247,.8)',1.5);
    const r=Math.max(5,Math.min(10,size*.065));
    disk(nucleus.x,nucleus.y,r,'#f3c77a');
    line(nucleus.x-r*.45,nucleus.y,nucleus.x+r*.45,nucleus.y,'#513d20',1.3);
    line(nucleus.x,nucleus.y-r*.45,nucleus.x,nucleus.y+r*.45,'#513d20',1.3);
  }
  function incident3D(view,phase,wavelength,extent){
    ctx.beginPath();ctx.strokeStyle=rgb(M.color(wavelength),.9);ctx.lineWidth=2;
    for(let x=-extent;x<=extent;x+=.025){const p=view.project([x,Math.sin(phase-TAU*x/(147*wavelength/550/view.size))*.24,0]);x===-extent?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}ctx.stroke();
  }
  function drawSingle(){
    const size=Math.max(15,Math.min(width*.24,(height-48)*.26)),cx=width*.5,cy=34+(height-34)*.52;
    const incoming={size,project:p=>window.Radiation3D.project(p,camera.yaw,camera.pitch,size,cx,cy)};
    if(state.step===1&&state.source)incident3D(incoming,state.phase,450,Math.min(1.9,width/size*.46));
    const view=drawRadiator(cx,cy,size,450,state.phase);view.size=size;
    if(state.step===1){
      if(state.source){
        const a=view.project([-.65,0,0]),b=view.project([-.65,Math.sin(state.phase)*.36,0]);arrow(a.x,a.y,b.x,b.y,'#f3c77a');
      }
    }
  }
  function drawComparison(){
    const stacked=width<580&&height>width*.65;
    const availableH=height-24,paneW=stacked?width:width/2,paneH=stacked?availableH/2:availableH;
    [650,state.wavelength].forEach((lambda,i)=>{
      const left=stacked?0:i*paneW,top=stacked?i*paneH:0,cx=paneW*.5,cy=paneH*.49;
      const size=Math.max(9,Math.min(paneW*.24,(paneH-64)*.26));
      const phase=i===0?TAU*.6*550/650*state.time:state.phase;
      ctx.save();ctx.beginPath();ctx.rect(left,top,paneW,paneH);ctx.clip();
      const incoming={size,project:p=>window.Radiation3D.project(p,camera.yaw,camera.pitch,size,left+cx,top+cy)};
      incident3D(incoming,phase,lambda,Math.min(1.9,paneW/size*.44));
      drawRadiator(left+cx,top+cy,size,lambda,phase,i===0);ctx.restore();
    });
  }
  function draw(){if(!width||!height)return;ctx.clearRect(0,0,width,height);ctx.fillStyle='#101f31';ctx.fillRect(0,0,width,height);state.step===2?drawComparison():drawSingle();}
  new ResizeObserver(entries=>{
    const box=entries[0].contentRect;width=box.width;height=box.height;stage.classList.toggle('stacked',width<580&&height>width*.65);
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }).observe(stage);
  function frame(now){
    const elapsed=last?Math.min((now-last)/1000,.1):0;last=now;
    if(state.playing&&!document.hidden){accumulator+=elapsed;while(accumulator>=DT){tick(DT);accumulator-=DT;}draw();}requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;});selectStep(0);requestAnimationFrame(frame);
})();
