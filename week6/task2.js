(() => {
'use strict';

const cv=document.querySelector('#cv'),gl=D.context(cv);
if(!gl)return;

const VS=`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uVP,uModel;
out vec3 vP,vN,vLocal;
out vec2 vUV;
void main(){
 vec4 world=uModel*vec4(aPos,1.0);
 vP=world.xyz;
 vN=normalize(mat3(transpose(inverse(uModel)))*aNormal);
 vLocal=aPos;
 vUV=aUV;
 gl_Position=uVP*world;
}`;

const FS=`#version 300 es
precision highp float;
const float PI=3.14159265;
in vec3 vP,vN,vLocal;
in vec2 vUV;
out vec4 outColor;
uniform sampler2D uWastelandTexture,uWastelandNormal,uWastelandARM;
uniform sampler2D uTerrainColor,uTerrainNormal,uTerrainARM,uEnv;
uniform vec3 uEye,uLight,uTint;
uniform float uPower,uAmbient,uEnvPower,uSolarCondition,uViewMode;

vec3 srgbToLinear(vec3 c){
 return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));
}
vec3 linearToSrgb(vec3 c){
 return mix(12.92*c,1.055*pow(c,vec3(1.0/2.4))-.055,step(vec3(.0031308),c));
}
float hash31(vec3 p){
 p=fract(p*0.3183099+vec3(0.71,0.113,0.419));
 p*=17.0;
 return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise3(vec3 p){
 vec3 i=floor(p),f=fract(p);
 f=f*f*(3.0-2.0*f);
 return mix(
  mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),
      mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),
      mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){
 float value=0.0,amplitude=0.5;
 for(int octave=0;octave<4;octave++){
  value+=amplitude*noise3(p);
  p=p*2.03+vec3(1.7,9.2,3.4);
  amplitude*=0.5;
 }
 return value;
}
float hash21(vec2 p){
 return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
vec3 directPBR(vec3 N,vec3 V,vec3 L,vec3 base,float rough,float metal,float attenuation){
 vec3 H=normalize(V+L);
 float nl=max(dot(N,L),0.0),nv=max(dot(N,V),0.0);
 float nh=max(dot(N,H),0.0),vh=max(dot(V,H),0.0);
 float a=rough*rough,a2=a*a;
 float den=nh*nh*(a2-1.0)+1.0;
 float D=a2/max(PI*den*den,1e-6);
 float k=(rough+1.0)*(rough+1.0)/8.0;
 float G=(nl/(nl*(1.0-k)+k))*(nv/(nv*(1.0-k)+k));
 vec3 F0=mix(vec3(0.04),base,metal);
 vec3 F=F0+(1.0-F0)*pow(1.0-vh,5.0);
 vec3 kd=(1.0-F)*(1.0-metal);
 return (kd*base/PI+D*G*F/max(4.0*nl*nv,1e-4))*nl*uPower*attenuation;
}
void main(){
 vec3 N=normalize(vN),V=normalize(uEye-vP);
 vec3 lightOffset=uLight-vP;
 float lightDistance=length(lightOffset);
 vec3 L=lightOffset/max(lightDistance,1e-4);
 float attenuation=1.0/(1.0+0.12*lightDistance+0.08*lightDistance*lightDistance);
 vec3 surface=normalize(vLocal);
 float climate=clamp(uSolarCondition,0.0,1.0);
 float terrain=fbm(surface*3.7+vec3(vUV*1.8,2.3));
 float landMask=smoothstep(.46,.54,terrain);
 float waterMask=(1.0-landMask);
 float cloudNoise=fbm(surface*10.0+vec3(vUV*4.0,7.1));
 float cloudMask=smoothstep(.61,.75,cloudNoise);
 if(uViewMode>0.5&&uViewMode<1.5){outColor=vec4(vec3(climate),1.0);return;}
 if(uViewMode>1.5){outColor=vec4(0.0,0.0,0.0,1.0);return;}

 vec3 wastelandBase=srgbToLinear(texture(uWastelandTexture,vUV).rgb)*uTint;
 vec3 terrainBase=srgbToLinear(texture(uTerrainColor,vUV).rgb)*uTint;
 vec3 oceanColor=vec3(.012,.13,.30)+vec3(.025,.11,.18)*terrain;
 vec3 earthLikeColor=mix(terrainBase,oceanColor,waterMask);
 earthLikeColor=mix(earthLikeColor,vec3(.82,.89,.94),cloudMask*.82);
 vec3 base=mix(wastelandBase,earthLikeColor,climate);
 vec3 wastelandARM=texture(uWastelandARM,vUV).rgb;
 vec3 terrainARM=texture(uTerrainARM,vUV).rgb;
 float ao=mix(wastelandARM.r,terrainARM.r,climate);
 float earthLikeRoughness=mix(terrainARM.g,.045,waterMask);
 earthLikeRoughness=mix(earthLikeRoughness,.32,cloudMask*.82);
 float wastelandRoughness=clamp(wastelandARM.g,.58,1.0);
 float rough=mix(wastelandRoughness,earthLikeRoughness,climate);
 float wastelandMetal=wastelandARM.b;
 float earthLikeMetal=mix(terrainARM.b,.32,waterMask);
 float metal=mix(wastelandMetal,earthLikeMetal,climate);

 vec3 dp1=dFdx(vP),dp2=dFdy(vP);
 vec2 du1=dFdx(vUV),du2=dFdy(vUV);
 vec3 T=cross(dp2,N)*du1.x+cross(N,dp1)*du2.x;
 vec3 B=cross(dp2,N)*du1.y+cross(N,dp1)*du2.y;
 float inv=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-8));
 float wastelandHeight=texture(uWastelandNormal,vUV).r;
 float terrainHeight=texture(uTerrainNormal,vUV).r;
 vec3 wastelandMapN=normalize(vec3(-dFdx(wastelandHeight)*12.0,-dFdy(wastelandHeight)*12.0,1.0));
 vec3 terrainMapN=normalize(vec3(-dFdx(terrainHeight)*12.0,-dFdy(terrainHeight)*12.0,1.0));
 vec3 mapN=normalize(mix(wastelandMapN,terrainMapN,climate));
 mapN.xy*=.65+climate*.45;
 float surfaceHeight=landMask*climate*.025+cloudMask*climate*.006;
 mapN.xy+=vec2(dFdx(surfaceHeight),dFdy(surfaceHeight))*12.0;
 N=normalize(mat3(T*inv,B*inv,N)*normalize(mapN));
 N=normalize(mix(N,normalize(vN),waterMask*climate*.8));

 vec3 color=directPBR(N,V,L,base,rough,metal,attenuation);
 vec3 F0=mix(vec3(0.04),base,metal);
 color+=uAmbient*ao*(base*(1.0-metal)*(1.0-F0)+F0);
 vec3 reflected=reflect(-V,N);
 vec2 envUV=vec2(atan(reflected.z,reflected.x)/(2.0*PI)+0.5,
                 asin(clamp(reflected.y,-1.0,1.0))/PI+0.5);
 vec3 envColor=srgbToLinear(textureLod(uEnv,envUV,rough*7.0).rgb);
 color+=uEnvPower*ao*envColor*F0;
 color=max(color,vec3(0.0));
 color=color/(1.0+color);
 outColor=vec4(linearToSrgb(color),1.0);
}`;

const RING_FS=`#version 300 es
precision highp float;
in vec3 vP,vN,vLocal;
in vec2 vUV;
uniform vec3 uEye,uLight;
uniform float uEventAmount,uViewMode;
out vec4 outColor;
float hash31(vec3 p){
 p=fract(p*0.3183099+vec3(.71,.113,.419));
 p*=17.0;
 return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise3(vec3 p){
 vec3 i=floor(p),f=fract(p);
 f=f*f*(3.0-2.0*f);
 return mix(
  mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),
      mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),
      mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){
 float value=0.0,amplitude=.5;
 for(int i=0;i<4;i++){
  value+=amplitude*noise3(p);
  p=p*2.03+vec3(1.7,9.2,3.4);
  amplitude*=.5;
 }
 return value;
}
float eventPattern(vec2 uv,vec3 local,float amount){
 float density=clamp(amount,0.0,1.0);
 float grain=fbm(vec3(local.xz*(18.0+72.0*density),uv.y*mix(3.0,18.0,density)));
 float bands=.5+.5*sin(uv.x*(24.0+120.0*density)+grain*9.0);
 return smoothstep(.22-density*.14,.66-density*.20,grain*.72+bands*.28)*density;
}
void main(){
 float dust=clamp(uEventAmount,0.0,1.0);
 float grain=fbm(vec3(vLocal.xz*(18.0+72.0*dust),vUV.y*mix(3.0,18.0,dust)));
 float bands=.5+.5*sin(vUV.x*(24.0+120.0*dust)+grain*9.0);
 float event=eventPattern(vUV,vLocal,uEventAmount);
 if(uViewMode>1.5){outColor=vec4(vec3(event),1.0);return;}
 if(uViewMode>.5||dust<.001){outColor=vec4(0.0);return;}
 vec3 N=normalize(vN);
 if(!gl_FrontFacing)N=-N;
 vec3 L=normalize(uLight-vP);
 vec3 V=normalize(uEye-vP);
 float diffuse=.28+.72*max(dot(N,L),0.0);
 float fresnel=.7+.3*pow(1.0-max(dot(N,V),0.0),3.0);
 vec3 ringColor=mix(vec3(.22,.17,.12),vec3(.82,.73,.56),grain*.7+bands*.3);
 ringColor*=diffuse*fresnel;
 float alpha=event*(.08+.82*uEventAmount);
 outColor=vec4(ringColor,alpha);
}`;

const SUN_FS=`#version 300 es
precision highp float;
in vec3 vP,vN,vLocal;
in vec2 vUV;
uniform vec3 uEye;
uniform float uTime,uSunRotation;
out vec4 outColor;

float hash31(vec3 p){
 p=fract(p*0.3183099+vec3(0.71,0.113,0.419));
 p*=17.0;
 return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise3(vec3 p){
 vec3 i=floor(p),f=fract(p);
 f=f*f*(3.0-2.0*f);
 return mix(
  mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),
      mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),
      mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){
 float value=0.0,amplitude=0.5;
 for(int octave=0;octave<5;octave++){
  value+=amplitude*noise3(p);
  p=p*2.03+vec3(1.7,9.2,3.4);
  amplitude*=0.5;
 }
 return value;
}
vec3 domainWarp(vec3 p){
 vec3 warp=vec3(fbm(p),fbm(p+vec3(5.2,1.3,2.8)),fbm(p+vec3(1.7,9.2,3.1)));
 return p+(warp-0.5)*1.7;
}
void main(){
 vec3 surface=normalize(vLocal);
 float c=cos(uSunRotation),s=sin(uSunRotation);
 vec3 N=normalize(vec3(c*surface.x+s*surface.z,surface.y,-s*surface.x+c*surface.z));
 vec3 V=normalize(uEye-vP);
 vec3 flow=vec3(uTime*0.018,uTime*0.035,-uTime*0.012);
 vec3 warped=domainWarp(surface*3.2+flow);
 float convection=fbm(warped*1.6+flow*0.45);
 float sunspot=fbm(warped*1.25-flow*0.3);
 float flarePulse=0.72+0.28*sin(uTime*1.4);
 float flareCore=fbm(warped*2.8+flow*1.7);
 float flare=flarePulse*smoothstep(0.62,0.88,flareCore)
  *smoothstep(0.82,0.95,dot(surface,normalize(vec3(0.45,0.35,0.82))));
 float facing=max(dot(N,V),0.0);
 float volume=smoothstep(0.02,0.92,facing);
 vec3 darkRed=vec3(0.5,0.1,0.0),orange=vec3(1.0,0.4,0.05),hotWhite=vec3(1.1,0.9,0.5);
 vec3 solarSurface=mix(darkRed,orange,smoothstep(0.28,0.62,sunspot));
 float heat=smoothstep(0.34,0.72,convection);
 solarSurface=mix(solarSurface,hotWhite,volume*(0.55+heat*0.45)*0.9);
 solarSurface+=hotWhite*flare*0.9;
 solarSurface*=mix(0.28,1.0,volume);
 float fresnel=pow(1.0-facing,4.0);
 vec3 corona=vec3(1.0,0.48,0.08)*fresnel*0.75;
 outColor=vec4(mix(darkRed*0.35,solarSurface,volume)+corona,1.0);
}`;

const prog=D.program(gl,VS,FS);
const sunProg=D.program(gl,VS,SUN_FS);
const ringProg=D.program(gl,VS,RING_FS);
const U=D.uniforms(gl,prog,[
 'uVP','uModel','uEye','uLight','uTint',
 'uPower','uAmbient','uEnvPower','uSolarCondition','uViewMode',
 'uWastelandTexture','uWastelandNormal','uWastelandARM',
 'uTerrainColor','uTerrainNormal','uTerrainARM','uEnv'
]);
const SU=D.uniforms(gl,sunProg,['uVP','uModel','uEye','uTime','uSunRotation']);
const RU=D.uniforms(gl,ringProg,['uVP','uModel','uEye','uLight','uEventAmount','uViewMode']);
const sphere=D.upload(gl,D.revolution(D.profiles.sphere(1,48),96));
function makeRing(innerRadius,outerRadius,segments,radialSegments){
 const pos=[],nrm=[],uv=[],idx=[];
 for(let r=0;r<=radialSegments;r++){
  const radius=innerRadius+(outerRadius-innerRadius)*r/radialSegments;
  for(let i=0;i<=segments;i++){
   const angle=2*Math.PI*i/segments;
   pos.push(radius*Math.cos(angle),0,radius*Math.sin(angle));
   nrm.push(0,1,0);
   uv.push(r/radialSegments,i/segments);
  }
 }
 const stride=segments+1;
 for(let r=0;r<radialSegments;r++){
  for(let i=0;i<segments;i++){
   const a=r*stride+i,b=a+stride;
   idx.push(a,a+1,b,a+1,b+1,b);
  }
 }
 return {pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),idx:new Uint16Array(idx)};
}
const ring=D.upload(gl,makeRing(1.0,1.82,128,12));
class TextureLoader{
 load(url){
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  const promise=new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>{
   gl.bindTexture(gl.TEXTURE_2D,tex);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
   gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
   resolve();
  };
  img.onerror=()=>reject(new Error(`텍스처 로딩 실패: ${url}`));
  img.src=url;
  });
  return {texture:tex,promise};
 }
 data(rgba){
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(rgba));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  return tex;
 }
}
const textureLoader=new TextureLoader();
const textureJobs=[];
function loadImageTexture(path){
 const loaded=textureLoader.load(path);
 textureJobs.push(loaded.promise);
 return loaded.texture;
}
function makeMaterialMaps(folder,name,roughness){
 const root=`${folder}/textures/${name}`;
 return {
  color:loadImageTexture(`${root}_diff_4k.jpg`),
  normal:loadImageTexture(`${root}_disp_4k.png`),
  arm:textureLoader.data([255,Math.round(roughness*255),0,255])
 };
}
const wastelandMaps=makeMaterialMaps('gravelly_sand_4k','gravelly_sand',.92);
const terrainMaps=makeMaterialMaps('rocky_terrain_02_4k','rocky_terrain_02',.78);
const envTex=loadImageTexture('assets/week06/studio_small_09_tonemapped.jpg');
Promise.all(textureJobs).then(()=>{
 document.querySelector('#status').textContent='모래·암석 색상/높이 텍스처 로딩 완료 · ARM 기본값 적용';
},error=>{
 document.querySelector('#status').textContent=`${error.message} · HTTP 서버와 week6 에셋 경로를 확인하세요`;
});

const S=D.UI('#ui',[
 {id:'solarDistance',label:'태양과의 거리',min:2.05,max:4.35,step:.01,value:3.2,fmt:v=>v.toFixed(2)},
 {id:'eventAmount',label:'주위 먼지 집적도 · 고리 농도',min:0,max:100,step:1,value:45,fmt:v=>`${Math.round(v)}%`},
 {id:'viewMode',type:'select',label:'계산 결과 보기',value:'0',options:[
  {value:'0',label:'PBR 재질'},
  {value:'1',label:'물, 대륙 분포'},
  {value:'2',label:'행성 고리'}]},
 {id:'selfRotation',type:'check',label:'행성 자전',value:true},
 {id:'compare',type:'check',label:'기본 행성과 비교 (두 조건 0)',value:false}
]);

const cam=D.orbit(cv,{dist:8.5,pitch:.2});
document.querySelector('#reset').onclick=()=>{cam.dist=8.5;cam.yaw=0;cam.pitch=.2;};
document.querySelector('#note').textContent='행성은 태양을 공전하지 않고 제자리에서 자전합니다. 거리 슬라이더가 행성을 태양 중심을 지나는 직선 위에서 이동시키며, 가까울수록 암석·물 지형, 멀수록 모래 황무지로 부드럽게 전환합니다.';
const view=D.M4.create(),proj=D.M4.create(),vp=D.M4.create();
const sunModel=D.M4.create(),planetModel=D.M4.create();
const minSolarDistance=2.05,maxSolarDistance=4.35;
let planetRotation=0;
let visible=true;
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(cv);

D.loop((time,deltaTime)=>{
 if(!visible||document.hidden)return;
 if(S.selfRotation)planetRotation+=deltaTime*.8;
 D.fit(cv);
 gl.viewport(0,0,cv.width,cv.height);
 gl.clearColor(.005,.007,.018,1);
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.enable(gl.DEPTH_TEST);
 const eye=cam.eye([0,0,0]);
 D.M4.lookAt(view,eye,[0,0,0],[0,1,0]);
 D.M4.perspective(proj,Math.PI/4,cv.width/cv.height,.1,100);
 D.M4.multiply(vp,proj,view);

 const viewMode=Number(S.viewMode);
 if(viewMode===0){
  D.M4.identity(sunModel);
  D.M4.rotateY(sunModel,sunModel,time*.15);
  D.M4.scale(sunModel,sunModel,[1.15,1.15,1.15]);
  gl.useProgram(sunProg);
  gl.uniformMatrix4fv(SU.uVP,false,vp);
  gl.uniformMatrix4fv(SU.uModel,false,sunModel);
  gl.uniform3fv(SU.uEye,eye);
  gl.uniform1f(SU.uTime,time);
  gl.uniform1f(SU.uSunRotation,time*.15);
  gl.bindVertexArray(sphere.vao);
  gl.drawElements(gl.TRIANGLES,sphere.count,gl.UNSIGNED_SHORT,0);
 }

 gl.useProgram(prog);
 gl.uniformMatrix4fv(U.uVP,false,vp);
 gl.uniform3fv(U.uEye,eye);
 gl.uniform3fv(U.uLight,[0,0,0]);
 gl.uniform3fv(U.uTint,[1,1,1]);
 [
  wastelandMaps.color,wastelandMaps.normal,wastelandMaps.arm,
  terrainMaps.color,terrainMaps.normal,terrainMaps.arm,envTex
 ].forEach((tex,i)=>{
  gl.activeTexture(gl.TEXTURE0+i);
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform1i(U[['uWastelandTexture','uWastelandNormal','uWastelandARM','uTerrainColor','uTerrainNormal','uTerrainARM','uEnv'][i]],i);
 });
 gl.bindVertexArray(sphere.vao);
 const solarDistance=S.solarDistance;
 const normalizedDistance=Math.min(1,Math.max(0,
  (solarDistance-minSolarDistance)/(maxSolarDistance-minSolarDistance)));
 const solarCondition=S.compare?0:1-smoothstep(.12,.88,normalizedDistance);
 const eventAmount=S.compare?0:S.eventAmount/100;
 const drawPlanet=()=>{
  gl.useProgram(prog);
  D.M4.identity(planetModel);
  D.M4.translate(planetModel,planetModel,[solarDistance,0,0]);
  D.M4.rotateY(planetModel,planetModel,planetRotation);
  D.M4.scale(planetModel,planetModel,[.58,.58,.58]);
  gl.uniformMatrix4fv(U.uModel,false,planetModel);
  gl.uniform1f(U.uSolarCondition,solarCondition);
  gl.uniform1f(U.uViewMode,Number(S.viewMode));
  gl.uniform1f(U.uPower,4.0);
  gl.uniform1f(U.uAmbient,.12);
  gl.uniform1f(U.uEnvPower,.7);
  gl.bindVertexArray(sphere.vao);
  gl.drawElements(gl.TRIANGLES,sphere.count,gl.UNSIGNED_SHORT,0);
 };
 const drawRing=(distance,eventAmount,maskOnly=false)=>{
  D.M4.identity(planetModel);
  if(!maskOnly){
   D.M4.translate(planetModel,planetModel,[distance,0,0]);
  }
  D.M4.rotateY(planetModel,planetModel,planetRotation);
  D.M4.rotateX(planetModel,planetModel,.55);
  D.M4.scale(planetModel,planetModel,[.58,.58,.58]);
  gl.useProgram(ringProg);
  gl.uniformMatrix4fv(RU.uVP,false,vp);
  gl.uniformMatrix4fv(RU.uModel,false,planetModel);
  gl.uniform3fv(RU.uEye,eye);
  gl.uniform3fv(RU.uLight,[0,0,0]);
  gl.uniform1f(RU.uEventAmount,eventAmount);
  gl.uniform1f(RU.uViewMode,Number(S.viewMode));
  gl.bindVertexArray(ring.vao);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.drawElements(gl.TRIANGLES,ring.count,gl.UNSIGNED_SHORT,0);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
 };
 if(viewMode!==2)drawPlanet();
 if(viewMode===0)drawRing(solarDistance,eventAmount);
 if(viewMode===2)drawRing(0,eventAmount,true);
 gl.bindVertexArray(null);
});

function smoothstep(edge0,edge1,value){
 const t=Math.min(1,Math.max(0,(value-edge0)/(edge1-edge0)));
 return t*t*(3-2*t);
}
})();
