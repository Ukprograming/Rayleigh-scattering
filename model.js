/* Classical, non-resonant dipole model. Shared by the animation and model checks. */
(function(root){
  'use strict';
  const Model={
    reference:650,
    relativeIntensity(wavelength){return (650/wavelength)**4;},
    relativeFrequency(wavelength){return 650/wavelength;},
    dipolePower(amplitude,frequency){return amplitude**2*frequency**4;},
    angularIntensity(theta){return Math.sin(theta)**2;},
    color(w){
      const stops=[[380,[155,115,255]],[450,[104,157,255]],[490,[74,215,225]],[530,[100,218,141]],[580,[240,216,109]],[620,[255,169,102]],[650,[255,126,127]],[750,[229,107,117]]];
      let j=stops.findIndex(s=>s[0]>=w); if(j<=0)return stops[j===-1?stops.length-1:0][1];
      const a=stops[j-1],b=stops[j],f=(w-a[0])/(b[0]-a[0]);return a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*f));
    }
  };
  if(typeof module!=='undefined'&&module.exports)module.exports=Model;
  root.RayleighModel=Model;
})(typeof window!=='undefined'?window:globalThis);
