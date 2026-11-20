import {spawn} from 'node:child_process'; import fs from 'node:fs';
const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); // [{url,out,rep?}]
const port=9333+Math.floor(Math.random()*500);
const ch=spawn('google-chrome',['--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--hide-scrollbars',`--remote-debugging-port=${port}`,'--window-size=1000,700','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let targets; for(let i=0;i<50;i++){try{targets=await (await fetch(`http://127.0.0.1:${port}/json`)).json();break}catch{await sleep(200)}}
const t=targets.find(x=>x.type==='page'); const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const pend={}; ws.onmessage=m=>{const d=JSON.parse(m.data); if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
const ev=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true})).result?.result?.value;
for(const j of jobs){
  const w=j.w||1000,h=j.h||700;
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:j.url});
  let ok=false; for(let i=0;i<150;i++){await sleep(300); const ti=await ev('document.title'); if(ti==='READY'){ok=true;break} if(ti==='ERR')break}
  if(!ok){console.log('FAIL',j.out,await ev("document.getElementById('rep')&&document.getElementById('rep').textContent"));continue}
  await sleep(400);
  const shot=await send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(j.out,Buffer.from(shot.result.data,'base64'));
  if(j.rep) fs.writeFileSync(j.rep, await ev("document.getElementById('rep').textContent"));
  console.log('OK',j.out);
}
ws.close(); ch.kill();
