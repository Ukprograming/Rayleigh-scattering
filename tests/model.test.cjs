const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../model.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('650 nm reference and blue/red ratio',()=>{near(M.relativeIntensity(650),1);near(M.relativeIntensity(450),(650/450)**4);assert.ok(Math.abs(M.relativeIntensity(450)-4.353147)<.00001);});
test('halving wavelength gives 16 times the scattering at equal incident intensity',()=>near(M.relativeIntensity(380)/M.relativeIntensity(760),16));
test('power responds to acceleration: amplitude squared and frequency to the fourth',()=>{near(M.dipolePower(2,1),4);near(M.dipolePower(1,2),16);near(M.dipolePower(0,2),0);});
test('dipole has an axial null and a perpendicular maximum',()=>{near(M.angularIntensity(0),0);near(M.angularIntensity(Math.PI),0);near(M.angularIntensity(Math.PI/2),1);});
test('visible range is monotonic and finite',()=>{let previous=Infinity;for(let l=380;l<=750;l+=5){const p=M.relativeIntensity(l);assert.ok(p>0&&p<previous);previous=p;assert.ok(M.color(l).every(v=>Number.isInteger(v)&&v>=0&&v<=255));}});
const R=require('../radiation-3d.js');
test('radiation is zero along the axis and half maximum at 45 degrees',()=>{
  near(R.angularWeight(0),0);near(R.angularWeight(Math.PI),0);
  near(R.angularWeight(Math.PI/2),1);near(R.angularWeight(Math.PI/4),.5);
  for(let j=0;j<24;j++)near(Math.hypot(...R.direction(Math.PI/4,j*Math.PI/12)),1);
});
test('3D projection retains depth and responds to viewing angle',()=>{
  const a=R.project([1,0,0],0,.5,100,200,200),b=R.project([1,0,0],.8,.5,100,200,200);
  assert.notEqual(a.z,b.z);assert.notEqual(a.x,b.x);
  for(let t=0;t<=Math.PI;t+=.15)for(let p=0;p<2*Math.PI;p+=.3){const v=R.project(R.direction(t,p),.45,.38,100,200,200);assert.ok(Object.values(v).every(Number.isFinite));}
});
test('fixed exposure preserves frequency and angle differences instead of renormalizing them',()=>{
  const brightness=[.5,1,2].map(f=>R.radiance(M.dipolePower(1,f),Math.PI/2,1));
  assert.ok(brightness[0]<brightness[1]&&brightness[1]<brightness[2]);
  const exposure=x=>-Math.log(1-x);
  near(exposure(brightness[2])/exposure(brightness[1]),16);
  near(exposure(R.radiance(1,Math.PI/4,1))/exposure(brightness[1]),.5);
  near(R.radiance(16,0,1),0);
});
test('retarded source sampling retains earlier light after the source switches off',()=>{
  const samples=[{t:1,field:1,power:1},{t:2,field:0,power:1},{t:3,field:0,power:0}];
  near(R.sampleSignal(samples,.5,'power'),0);
  near(R.sampleSignal(samples,1.5,'power'),1);
  near(R.sampleSignal(samples,2.5,'power'),.5);
  near(R.sampleSignal(samples,4,'power'),0);
});
