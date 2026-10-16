const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../radiation-3d.js');
function render(power){
  const alphas=[];let fills=0;
  const ctx={beginPath(){},moveTo(){},lineTo(){},setLineDash(){},save(){},restore(){},fill(){fills++;},stroke(){const match=/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/.exec(this.strokeStyle);if(match)alphas.push(Number(match[1]));}};
  const signals=[{t:0,field:Math.sqrt(power),power},{t:100,field:Math.sqrt(power),power}];
  R.draw(ctx,{cx:300,cy:250,size:100,yaw:.45,pitch:.38,color:[243,199,122],phase:0,on:true,signals,time:50,speed:.88,charge:false,probes:false});
  return {weight:alphas.reduce((a,b)=>a+b,0),fills};
}
test('actual radiation drawing becomes brighter with greater power and contains no filled surface',()=>{
  const weak=render(.0625),normal=render(1),strong=render(16),off=render(0);
  assert.ok(weak.weight<normal.weight&&normal.weight<strong.weight);
  assert.equal(off.weight,0);
  for(const r of [weak,normal,strong,off])assert.equal(r.fills,0);
});
const baseOptions={cx:300,cy:250,size:100,yaw:.45,pitch:.38,color:[243,199,122],phase:1.2,on:true,signals:[{t:0,power:1},{t:100,power:1}],time:50,speed:.88,probes:false};
test('representative wavefronts stay sparse and the source is drawn between rear and front light',()=>{
  for(const pitch of [-1.2,-.38,.38,1.2]){
    const events=[];
    const ctx={beginPath(){},moveTo(){},lineTo(){},setLineDash(){},save(){},restore(){},arc(){},fillText(){},createRadialGradient(){return {addColorStop(){}};},fill(){events.push('charge');},stroke(){events.push('light');}};
    R.draw(ctx,{...baseOptions,pitch});
    const source=events.indexOf('charge');
    assert.ok(source>1&&source<events.length-1,'both rear and front light surround the charge');
    assert.ok(events.length<=482,'at most two sets of three dashed rings');
    const segments=R.wavefrontSegments({...baseOptions,pitch});
    const sorted=R.depthOrder([...segments,{z:R.project([0,Math.sin(1.2)*.24,0],.45,pitch,100,300,250).z}]);
    for(let i=1;i<sorted.length;i++)assert.ok(sorted[i].z>=sorted[i-1].z);
  }
});
test('molecular source callback shares the radiation depth ordering',()=>{
  const events=[];
  const ctx={beginPath(){},moveTo(){},lineTo(){},setLineDash(){},save(){},restore(){},stroke(){events.push('light');}};
  R.draw(ctx,{...baseOptions,charge:false,drawSource(){events.push('dipole');}});
  const i=events.indexOf('dipole');assert.ok(i>1&&i<events.length-1);
});
