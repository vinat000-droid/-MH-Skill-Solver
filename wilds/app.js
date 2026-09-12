const API='https://wilds.mhdb.io/ja';
const W={armor:[],skills:[],decorations:[],charms:[],targets:[],loaded:false};
const $=id=>document.getElementById(id);
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
function renderPicker(){
 const p=$('skillPicker');p.innerHTML='';
 const sel=document.createElement('select');sel.id='skillSelect';sel.innerHTML='<option value="">スキルを選択…</option>'+W.skills.filter(x=>x.kind==='armor'||x.kind==='set'||x.kind==='group').map(x=>`<option value="${x.id}">${norm(x.name)}</option>`).join('');
 const lv=document.createElement('select');lv.id='skillLevel';lv.innerHTML='<option value="1">Lv1</option><option value="2">Lv2</option><option value="3">Lv3</option><option value="4">Lv4</option><option value="5">Lv5</option><option value="6">Lv6</option><option value="7">Lv7</option>';
 const b=document.createElement('button');b.textContent='＋追加';b.onclick=()=>{const id=+sel.value;if(!id)return;const s=W.skills.find(x=>x.id===id);const max=Math.max(1,...(s?.ranks||[]).map(r=>r.level));const level=Math.min(+lv.value,max);if(!W.targets.some(t=>t.id===id))W.targets.push({id,name:s.name,level});renderTargets();};p.append(sel,lv,b);
}
function renderTargets(){const d=$('selectedSkills');d.innerHTML=W.targets.map((t,i)=>`<div class="selected-skill"><b>${t.name}</b><select data-i="${i}" class="targetLv">${[...Array(7)].map((_,n)=>`<option value="${n+1}" ${t.level===n+1?'selected':''}>Lv${n+1}</option>`).join('')}</select><button data-i="${i}" class="removeTarget">削除</button></div>`).join('');document.querySelectorAll('.targetLv').forEach(e=>e.onchange=()=>{W.targets[+e.dataset.i].level=+e.value;save();});document.querySelectorAll('.removeTarget').forEach(e=>e.onclick=()=>{W.targets.splice(+e.dataset.i,1);renderTargets();save();});}
function skillMap(items){const m=new Map();for(const x of items){if(!x?.skill?.name)continue;const k=norm(x.skill.name);m.set(k,(m.get(k)||0)+(+x.level||0));}return m;}
function armorSkills(a){const m=new Map();for(const x of (a.skills||[])){const k=norm(x.skill?.name);if(k)m.set(k,(m.get(k)||0)+(+x.level||0));}return m;}
function mergeMaps(arr){const m=new Map();for(const x of arr)for(const [k,v] of x)m.set(k,(m.get(k)||0)+v);return m;}
function slots(a){return (a.slots||[]).map(Number).filter(Boolean).sort((a,b)=>b-a);}
function fitsDecoration(slot,d){return Number(d.slot)<=slot;}
function bestDecoFill(slotsArr, deficits){
 const used=[];let left=[...slotsArr];const sorted=[...W.decorations].sort((a,b)=>Number(b.slot)-Number(a.slot));
 for(const target of deficits){let need=target.need;if(need<=0)continue;const ds=sorted.filter(d=>(d.skills||[]).some(s=>norm(s.skill?.name)===target.name));
   while(need>0){let pick=null,idx=-1;for(let i=0;i<left.length;i++){const d=ds.find(x=>fitsDecoration(left[i],x));if(d){pick=d;idx=i;break;}}if(!pick)break;const gain=Math.max(...pick.skills.filter(s=>norm(s.skill?.name)===target.name).map(s=>+s.level||0));used.push({name:pick.name,slot:pick.slot,skill:target.name,level:gain});left.splice(idx,1);need-=gain;}
 }
 return {used,remaining:deficits.map(x=>({...x,need:Math.max(0,x.need-used.filter(u=>u.skill===x.name).reduce((s,u)=>s+u.level,0))})).filter(x=>x.need>0),left};
}
function scoreCandidate(skills, usedSlots, remaining){let sat=0,total=0;for(const t of W.targets){total+=t.level;sat+=Math.min(t.level,skills.get(t.name)||0);}return {sat,total,slotScore:usedSlots.reduce((s,x)=>s+x,0),remaining};}
function makeCandidates(){
 const byKind={};for(const a of W.armor){(byKind[a.kind]??=[]).push(a);}
 const parts=['head','chest','arms','waist','legs'];for(const p of parts)byKind[p]=(byKind[p]||[]).slice().sort((a,b)=>{const sa=armorSkills(a),sb=armorSkills(b);let aa=0,bb=0;for(const t of W.targets){aa+=Math.min(t.level,sa.get(t.name)||0);bb+=Math.min(t.level,sb.get(t.name)||0);}return bb-aa;}).slice(0,80);
 let beams=[{set:[],skills:new Map(),slots:[]}];
 for(const part of parts){const next=[];for(const st of beams){for(const a of byKind[part]){const ms=mergeMaps([st.skills,armorSkills(a)]);next.push({set:[...st.set,a],skills:ms,slots:[...st.slots,...slots(a)]});}}next.sort((a,b)=>scoreCandidate(b.skills,b.slots,[]).sat-scoreCandidate(a.skills,a.slots,[]).sat || b.slots.reduce((x,y)=>x+y,0)-a.slots.reduce((x,y)=>x+y,0));beams=next.slice(0,300);}
 const out=[];for(const st of beams){const deficits=W.targets.map(t=>({name:t.name,need:Math.max(0,t.level-(st.skills.get(t.name)||0))})).filter(x=>x.need>0);const fill=bestDecoFill(st.slots,deficits);const final=mergeMaps([st.skills,skillMap(fill.used.map(u=>({skill:{name:u.skill},level:u.level})))]);const rem=W.targets.map(t=>({name:t.name,need:Math.max(0,t.level-(final.get(t.name)||0))})).filter(x=>x.need>0);const sc=scoreCandidate(final,st.slots,rem);out.push({set:st.set,skills:final,slots:st.slots,decorations:fill.used,remaining:rem,score:sc});}
 out.sort((a,b)=>b.score.sat-a.score.sat || a.remaining.length-b.remaining.length || b.score.slotScore-a.score.slotScore);return out.slice(0,30);
}
function renderResults(cands){const r=$('results');if(!cands.length){$('status').classList.remove('hidden');$('status').textContent='候補なし';r.innerHTML='';return;} $('status').classList.add('hidden');r.innerHTML=cands.map((c,i)=>`<section class="card result"><h3>#${i+1} 充足 ${c.score.sat}/${c.score.total}</h3><div>${c.set.map(a=>`<div>${a.kind}: ${a.name}</div>`).join('')}</div><div class="small">装飾品: ${c.decorations.length?c.decorations.map(d=>`${d.name}×1`).join(' / '):'なし'}</div>${c.remaining.length?`<div class="warn">不足: ${c.remaining.map(x=>x.name+' Lv'+x.need).join(' / ')}</div>`:'<div class="ok">目標スキル充足</div>'}</section>`).join('');}
async function loadDB(){try{const [armor,skills,deco,charms]=await Promise.all(['armor','skills','decorations','charms'].map(k=>fetch(API+'/'+k).then(r=>r.json())));W.armor=armor;W.skills=skills;W.decorations=deco;W.charms=charms;W.loaded=true;$('dbVersion').textContent=`Wilds 日本語DB loaded / Armor ${armor.length} / Skills ${skills.length} / Decorations ${deco.length}`;renderPicker();$('solveBtn').disabled=false;$('solveBtn').textContent='検索する';const saved=MHStorage.load('wilds');if(saved?.data){restore(saved.data);} }catch(e){$('dbVersion').textContent='Wilds 日本語DBの読み込みに失敗しました';$('status').classList.remove('hidden');$('status').textContent='DB接続エラー: '+e.message;}}
function stateData(){return {targets:W.targets,charmSkill:$('charmSkill').value,charmLv:$('charmLv').value,charmA1:$('charmA1').value,charmW1:$('charmW1').value,w:[1,2,3].map(i=>$('weaponSlot'+i).value)};}
function save(){MHStorage.save('wilds',stateData());}
function restore(d){W.targets=d.targets||[];renderTargets();if($('charmSkill')){$('charmSkill').value=d.charmSkill||'';$('charmLv').value=d.charmLv||0;$('charmA1').value=d.charmA1||0;$('charmW1').value=d.charmW1||0;}for(let i=1;i<=3;i++)if(d.w?.[i-1])$('weaponSlot'+i).value=d.w[i-1];}
$('solveBtn').onclick=async()=>{if(!W.loaded||!W.targets.length){$('status').classList.remove('hidden');$('status').textContent='目標スキルを1つ以上選択してください。';return;}MHSearchUI.start();await new Promise(r=>setTimeout(r,20));MHSearchUI.step('②','防具構成を探索中',35);const c=makeCandidates();MHSearchUI.step('③','スロット・装飾品を評価中',75);renderResults(c);save();MHSearchUI.done();};
$('saveBtn').onclick=()=>save();$('loadBtn').onclick=()=>{const x=MHStorage.load('wilds');if(x?.data)restore(x.data);};$('clearSaveBtn').onclick=()=>{MHStorage.clear('wilds');W.targets=[];renderTargets();};
['charmSkill','charmLv','charmA1','charmW1','weaponSlot1','weaponSlot2','weaponSlot3'].forEach(id=>$(id).addEventListener('change',save));
loadDB();
