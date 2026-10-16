/* A radiating field, not a solid angular-intensity surface.
   All samples propagate radially at the same speed. Brightness is driven by
   the retarded acceleration squared, sin²(theta), and 1/r² at fixed exposure. */
(function(root){
  'use strict';
  const TAU=Math.PI*2,RMIN=.13,RMAX=1.75;
  const angularWeight=theta=>Math.sin(theta)**2;
  function direction(theta,phi){return [Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi)];}
  function rotate(p,yaw,pitch){
    const x=p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),z=-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);
    return [x,p[1]*Math.cos(pitch)-z*Math.sin(pitch),p[1]*Math.sin(pitch)+z*Math.cos(pitch)];
  }
  function project(p,yaw,pitch,size,cx,cy){const q=rotate(p,yaw,pitch),k=5/(5-q[2]);return {x:cx+q[0]*size*k,y:cy-q[1]*size*k,z:q[2]};}
  function sampleSignal(samples,time,key='field'){
    if(!samples.length||time<samples[0].t)return 0;
    let lo=0,hi=samples.length-1;
    if(time>=samples[hi].t)return samples[hi][key];
    while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid].t>time)hi=mid;else lo=mid;}
    const a=samples[lo],b=samples[hi],f=(time-a.t)/(b.t-a.t);
    return a[key]*(1-f)+b[key]*f;
  }
  function radiance(power,theta,radius){return 1-Math.exp(-.16*Math.max(0,power)*angularWeight(theta)/Math.max(.2,radius*radius));}
  // Two outward-moving sets of representative wavefront rings. Every point
  // moves radially at the same speed; dashes are wavefront samples, not paths.
  function wavefrontSegments(options){
    const {cx,cy,size,yaw,pitch,time,speed,signals,red=false}=options;
    const segments=[],spacing=.9;
    const offset=((time*speed)%spacing+spacing)%spacing;
    for(let radius=offset;radius<RMAX;radius+=spacing){
      if(radius<RMIN)continue;
      for(const theta of [Math.PI/3,Math.PI/2,2*Math.PI/3]){
        const t=time-radius/speed,mean=sampleSignal(signals,t,red?'redPower':'power');
        const fade=Math.min(1,(radius-RMIN)/.25)*Math.min(1,(RMAX-radius)/.3);
        const alpha=radiance(3*mean,theta,radius)*fade;
        if(alpha<.0005)continue;
        const count=theta===Math.PI/2?16:12;
        for(let ip=0;ip<count;ip++){
          const phi=TAU*ip/count;
          for(let k=0;k<3;k++){
            const a=project(direction(theta,phi+TAU/count*.55*k/3).map(v=>v*radius),yaw,pitch,size,cx,cy);
            const b=project(direction(theta,phi+TAU/count*.55*(k+1)/3).map(v=>v*radius),yaw,pitch,size,cx,cy);
            segments.push({a,b,z:(a.z+b.z)/2,alpha,theta});
          }
        }
      }
    }
    return segments;
  }
  // Painter order is shared by radiation and the source, not two overlays.
  function depthOrder(items){return items.sort((a,b)=>a.z-b.z);}
  const color=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function draw(ctx,options){
    const {cx,cy,size,yaw,pitch,color:base,phase,on,signals,time,speed,charge=true,red=false,probes=false,drawSource}=options;
    const powerKey=red?'redPower':'power';
    const at=p=>project(p,yaw,pitch,size,cx,cy);
    const top=at([0,1.58,0]),bottom=at([0,-1.58,0]);
    ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(bottom.x,bottom.y);ctx.strokeStyle='#425c70';ctx.setLineDash([4,6]);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
    const center=at([0,on?Math.sin(phase)*(charge?.24:-.12):0,0]);
    const items=wavefrontSegments(options).map(segment=>({...segment,kind:'wavefront'}));
    items.push({kind:'source',z:center.z});
    ctx.save();ctx.lineCap='round';
    for(const item of depthOrder(items)){
      if(item.kind==='source'){
        if(drawSource)drawSource({center,top,bottom,project:at,size});
        if(charge){
          const r=Math.max(7,Math.min(16,size*.105)),g=ctx.createRadialGradient(center.x-r*.3,center.y-r*.35,1,center.x,center.y,r);
          g.addColorStop(0,'#c2fffb');g.addColorStop(.5,'#72e1de');g.addColorStop(1,'#268b92');
          ctx.beginPath();ctx.fillStyle=g;ctx.arc(center.x,center.y,r,0,TAU);ctx.fill();ctx.fillStyle='#123a43';ctx.font=`${Math.max(13,r)}px sans-serif`;ctx.textAlign='center';ctx.fillText('−',center.x,center.y+r*.3);
        }
        continue;
      }
      const {a,b,alpha,theta,z}=item;
      // Perspective and subdued distant strokes make front/back legible.
      const depth=.48+.52*(z+RMAX)/(2*RMAX);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
      ctx.strokeStyle=color(base,alpha*.12*depth);ctx.lineWidth=5;ctx.stroke();
      ctx.strokeStyle=color(base,alpha*depth);ctx.lineWidth=(1+angularWeight(theta))*5/(5-z);ctx.stroke();
    }
    ctx.restore();
    if(probes){
      const r=1.42,mean=sampleSignal(signals,time-r/speed,powerKey);
      const labels=[];
      for(const theta of [0,Math.PI/4,Math.PI/2]){
        // One common meridian gives equally distant observation points.
        const p=at(direction(theta,yaw).map(v=>v*r)),intensity=mean*angularWeight(theta),a=1-Math.exp(-.45*intensity);
        ctx.beginPath();ctx.strokeStyle='#71889a';ctx.lineWidth=1;ctx.arc(p.x,p.y,4,0,TAU);ctx.stroke();
        if(a>.001){const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,12);g.addColorStop(0,color(base,a));g.addColorStop(1,color(base,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,12,0,TAU);ctx.fill();}
        ctx.font='12px "Yu Gothic",Meiryo,sans-serif';ctx.textAlign='center';ctx.fillStyle='#c4d3dc';
        const label=`${Math.round(theta*180/Math.PI)}° · ${intensity.toFixed(2)}`,w=ctx.measureText(label).width;
        let y=p.y+(theta===0?-12:22);
        while(labels.some(l=>Math.abs(l.x-p.x)<(l.w+w)/2+5&&Math.abs(l.y-y)<17))y+=18;
        labels.push({x:p.x,y,w});ctx.lineWidth=3;ctx.strokeStyle='#101f31';ctx.strokeText(label,p.x,y);ctx.fillText(label,p.x,y);
      }
    }
    return {center,top,bottom,project:at};
  }
  const api={direction,angularWeight,rotate,project,sampleSignal,radiance,wavefrontSegments,depthOrder,draw};
  root.Radiation3D=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
