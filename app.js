'use strict';
(() => {
  const $ = id => document.getElementById(id), M = window.RayleighModel;
  const canvas = $('scene'), ctx = canvas.getContext('2d'), stage = document.querySelector('.stage');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {step:0, playing:!reducedMotion, time:0, phase:0, wavelength:450, source:true, wavefronts:[], redWavefronts:[]};
  const TAU = Math.PI*2, DT = 1/120, C = 88;
  let width=0, height=0, last=0, accumulator=0;
  function resetTime(){
    state.time=0;state.phase=0;state.wavefronts=[];state.redWavefronts=[];accumulator=0;
    // A developed pattern is visible even when reduced motion starts paused.
    for(let i=0;i<360;i++)tick(DT);
  }
  function selectStep(step){
    state.step=step;state.source=true;state.wavelength=450;$('wavelength').value=450;resetTime();
    document.querySelectorAll('[data-step]').forEach((b,i)=>{b.classList.toggle('active',i===step);b.setAttribute('aria-pressed',String(i===step));});
    $('wavelength-control').hidden=step!==2;$('comparison').hidden=step!==2;$('source').hidden=step===2;
    canvas.setAttribute('aria-label',[
      '上下に振動する負電荷から電磁波が広がる模式図',
      '光の電場と逆向きに電子分布がずれ、電気双極子が振動して電磁波を放射する模式図',
      '同じ強さの入射光について、赤650 nmと選択した波長の双極子振動と散乱を比較する模式図'
    ][step]);updateUI();draw();
  }
  function updateUI(){
    $('play').textContent=state.playing?'一時停止':'再生';$('play').setAttribute('aria-label',state.playing?'一時停止':'再生');
    $('source').setAttribute('aria-pressed',String(state.source));
    $('source').textContent=state.step===0?(state.source?'振動を止める':'振動させる'):(state.source?'光を切る':'光を当てる');
    $('wavelength-value').textContent=`${state.wavelength} nm`;
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
  function tick(dt){
    const oldTime=state.time,oldPhase=state.phase;state.time+=dt;
    const f=state.step===0?1:550/state.wavelength;state.phase+=TAU*.6*f*dt;
    function emit(fronts,before,after,peak,enabled){
      const n=Math.floor((after-Math.PI/2)/Math.PI);
      if(enabled&&n>Math.floor((before-Math.PI/2)/Math.PI)){
        const crossing=Math.PI/2+n*Math.PI;fronts.push({t:oldTime+dt*(crossing-before)/(after-before),strength:peak});
      }
      while(fronts.length&&state.time-fronts[0].t>20)fronts.shift();
    }
    emit(state.wavefronts,oldPhase,state.phase,f*f,state.source);
    const redOmega=TAU*.6*550/650;emit(state.redWavefronts,redOmega*oldTime,redOmega*state.time,(550/650)**2,true);
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
  function radiation(cx,cy,radius,color,red=false){
    // Successive extrema propagate outwards; the axial radiation is zero.
    for(const front of (red?state.redWavefronts:state.wavefronts)){
      const r=(state.time-front.t)*C;if(r<30||r>radius)continue;
      const alpha=Math.min(.9,.25+front.strength*.27)*Math.min(1,190/r)*Math.min(1,(radius-r)/30)*Math.min(1,(r-30)/12);
      for(let a=0;a<TAU;a+=TAU/48){
        const intensity=Math.cos(a+TAU/96)**2;if(intensity<.025)continue;
        ctx.lineWidth=2;ctx.strokeStyle=rgb(color,alpha*intensity);ctx.beginPath();ctx.arc(cx,cy,r,a,a+TAU/48+.005);ctx.stroke();
      }
    }
  }
  function incident(cx,cy,left,right,wavelength,phase,amplitude=24){
    const spatial=147*wavelength/550;ctx.beginPath();ctx.strokeStyle=rgb(M.color(wavelength),.9);ctx.lineWidth=2;
    for(let x=left;x<=right;x+=2){const y=cy-Math.sin(phase+TAU*(cx-x)/spatial)*amplitude;x===left?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  }
  function dipole(cx,cy,phase,on=true){
    const e=on?Math.sin(phase):0,dy=e*25;
    ctx.beginPath();ctx.fillStyle='rgba(114,225,222,.15)';ctx.strokeStyle='rgba(114,225,222,.8)';ctx.lineWidth=1.4;ctx.ellipse(cx,cy+dy,30,25,0,0,TAU);ctx.fill();ctx.stroke();
    disk(cx,cy,8,'#f3c77a','+');text('−',cx,cy+dy+(dy>=0?20:-12),'#72e1de',19);
  }
  function drawSingle(){
    const cx=width*(state.step===0?.5:.61),cy=height*.5;
    const scale=Math.min(1.6,Math.max(.38,Math.min(width/400,height/220)));
    ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);
    radiation(0,0,Math.hypot(width,height)/scale,state.step===0?[243,199,122]:M.color(450));
    if(state.step===0){disk(0,state.source?Math.sin(state.phase)*30:0,14,'#72e1de','−');}
    else{
      if(state.source){
        incident(0,0,-cx/scale+15,(width-cx)/scale-15,450,state.phase);
        arrow(-57,0,-57,-Math.sin(state.phase)*43,'#f3c77a');text('電場',-57,-59,'#f3c77a',12);text('光',-cx/scale+38,-38,rgb(M.color(450)),13);
      }
      dipole(0,0,state.phase,state.source);
    }
    ctx.restore();
  }
  function drawComparison(){
    const stacked=width<580&&height>width*.65;
    const availableH=height-24,paneW=stacked?width:width/2,paneH=stacked?availableH/2:availableH;
    [650,state.wavelength].forEach((lambda,i)=>{
      const left=stacked?0:i*paneW,top=stacked?i*paneH:0,cx=paneW*.5,cy=paneH*.49;
      const scale=Math.min(1.25,Math.max(.3,Math.min(paneW/240,(paneH-68)/130)));
      const phase=i===0?TAU*.6*550/650*state.time:state.phase;
      ctx.save();ctx.beginPath();ctx.rect(left,top,paneW,paneH);ctx.clip();ctx.translate(left+cx,top+cy);ctx.scale(scale,scale);
      radiation(0,0,Math.hypot(paneW,paneH)/scale,M.color(lambda),i===0);
      incident(0,0,(-cx+14)/scale,(paneW-cx-14)/scale,lambda,phase,20);dipole(0,0,phase);ctx.restore();
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
