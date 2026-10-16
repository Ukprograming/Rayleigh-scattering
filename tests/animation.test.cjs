const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const M=require('../model.js');
const R=require('../radiation-3d.js');

// Exercise the real animation/controller with a deterministic animation clock.
// Rendering geometry is covered separately; this checks the control-to-motion path.
function app(){
  const elements=new Map();
  function element(){return {value:'1',hidden:false,listeners:{},classList:{toggle(){}},setAttribute(){},style:{},addEventListener(type,fn){this.listeners[type]=fn;},setPointerCapture(){}};}
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const buttons=[0,1,2].map(i=>Object.assign(element(),{dataset:{step:String(i)}}));
  const stage=element();let callback,drawn,now=100;
  get('scene').getContext=()=>({clearRect(){},fillRect(){},setTransform(){}});
  const context={
    document:{hidden:false,getElementById:get,querySelector:()=>stage,querySelectorAll:()=>buttons,addEventListener(){}},
    window:{RayleighModel:M,Radiation3D:{draw(ctx,options){drawn={phase:options.phase,on:options.on,power:options.signals.at(-1)?.power??0,delayedPower:R.sampleSignal(options.signals,options.time-.5,'power')};return {};}}},
    matchMedia:()=>({matches:false}),devicePixelRatio:1,
    ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn([{contentRect:{width:1000,height:500}}]);}},
    requestAnimationFrame(fn){callback=fn;}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
  function frames(n){for(let i=0;i<n;i++){now+=1000/60;callback(now);}}
  frames(1);
  return {get,frames,drawn:()=>drawn,input(value){get('frequency').listeners.input({target:{value:String(value)}});}};
}
test('frequency slider changes particle oscillation frequency, not the animation clock',()=>{
  const phases=[];
  for(const speed of [.5,1,2]){
    const a=app();a.input(speed);const start=a.drawn().phase;a.frames(120);phases.push(a.drawn().phase-start);
    assert.equal(a.get('frequency-value').textContent,`${speed.toFixed(1)} 倍`);
  }
  assert.ok(Math.abs(phases[2]/phases[0]-4)<1e-9);
  assert.ok(Math.abs(phases[1]/phases[0]-2)<1e-9);
});
test('source stop ends emission while the animation continues',()=>{
  const a=app();const before=a.drawn().phase;
  a.get('source').listeners.click();a.frames(120);
  assert.equal(a.drawn().on,false);assert.equal(a.drawn().power,0);assert.ok(a.drawn().phase>before);
  a.get('source').listeners.click();a.frames(120);
  assert.equal(a.drawn().on,true);assert.equal(a.drawn().power,1);
});
test('speed changes reach the renderer with f^4 power and the readout matches',()=>{
  const a=app();
  for(const f of [.5,1,2]){
    a.input(f);a.frames(60);
    assert.equal(a.drawn().power,f**4);assert.equal(a.drawn().delayedPower,f**4);
    assert.equal(a.get('emission-value').textContent,`${(f**4).toFixed(2)} 倍`);
  }
  a.get('source').listeners.click();a.frames(6);
  assert.equal(a.drawn().power,0);assert.equal(a.drawn().delayedPower,16);
  assert.equal(a.get('emission-value').textContent,'0.00 倍');
  a.frames(60);assert.equal(a.drawn().delayedPower,0);
});
