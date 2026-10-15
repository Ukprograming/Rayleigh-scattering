const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../model.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('650 nm reference and blue/red ratio',()=>{near(M.relativeIntensity(650),1);near(M.relativeIntensity(450),(650/450)**4);assert.ok(Math.abs(M.relativeIntensity(450)-4.353147)<.00001);});
test('halving wavelength gives 16 times the scattering at equal incident intensity',()=>near(M.relativeIntensity(380)/M.relativeIntensity(760),16));
test('power responds to acceleration: amplitude squared and frequency to the fourth',()=>{near(M.dipolePower(2,1),4);near(M.dipolePower(1,2),16);near(M.dipolePower(0,2),0);});
test('dipole has an axial null and a perpendicular maximum',()=>{near(M.angularIntensity(0),0);near(M.angularIntensity(Math.PI),0);near(M.angularIntensity(Math.PI/2),1);});
test('visible range is monotonic and finite',()=>{let previous=Infinity;for(let l=380;l<=750;l+=5){const p=M.relativeIntensity(l);assert.ok(p>0&&p<previous);previous=p;assert.ok(M.color(l).every(v=>Number.isInteger(v)&&v>=0&&v<=255));}});
