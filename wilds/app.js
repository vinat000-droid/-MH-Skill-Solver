const API='https://wilds.mhdb.io/ja';
const W={armor:[],armorSets:[],weapons:[],skills:[],decorations:[],charms:[],targets:[],setTargets:[],groupTargets:[],loaded:false};
const LIMITS={armorBeam:260,armorPartPool:80,weaponPool:220,charmPool:100,pairPool:1200,maxEvaluations:180000,maxMilliseconds:5000,maxResults:30,freeCheckArmorPool:1000,freeCheckMilliseconds:1500};
const $=id=>document.getElementById(id);
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const PARTS=['head','chest','arms','waist','legs'];
const PART_LABEL={head:'頭',chest:'胴',arms:'腕',waist:'腰',legs:'脚'};
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
function skillMaxLevel(skill){const levels=(skill?.ranks||[]).map(r=>Number(r.level)||0).filter(Boolean);return levels.length?Math.max(...levels):1;}
function levelOptions(max,current=1){return Array.from({length:max},(_,n)=>{const v=n+1;return `<option value="${v}" ${v===Number(current)?'selected':''}>Lv${v}</option>`;}).join('');}
function skillSearchText(skill){const local=(window.WILDS_SKILL_DETAILS||{})[norm(skill?.name)]||{};const parts=[skill?.name,skill?.description,local.description,...(local.levels||[]).flatMap(r=>[r?.effect,r?.description,r?.text])];for(const r of (skill?.ranks||[]))parts.push(r?.description,r?.effect,r?.text);return norm(parts.filter(Boolean).join(' ')).toLocaleLowerCase('ja');}
function setGroupRequired(skill,level){const r=(skill?.ranks||[]).find(x=>Number(x.level)===Number(level));return Number(r?.setPiecesRequired)||null;}
function makeSkillPicker(containerId,kind,targets,addFn){const p=$(containerId);p.innerHTML='';const usable=W.skills.filter(x=>x&&(kind==='normal'?(x.kind==='armor'||x.kind==='weapon'):x.kind===kind));const search=document.createElement('input');search.type='search';search.placeholder='スキル名・効果で検索…';search.autocomplete='off';const sel=document.createElement('select');const lv=document.createElement('select');const b=document.createElement('button');b.textContent='＋追加';function sync(){const sk=usable.find(x=>String(x.id)===String(sel.value));const max=skillMaxLevel(sk);lv.innerHTML=levelOptions(max,Math.min(Number(lv.value)||1,max));}function populate(filter=''){const q=norm(filter).toLocaleLowerCase('ja');const list=q?usable.filter(x=>skillSearchText(x).includes(q)):usable;const prev=sel.value;sel.innerHTML='<option value="">スキルを選択…</option>'+list.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(list.some(x=>String(x.id)===String(prev)))sel.value=prev;sync();}sel.onchange=sync;search.oninput=()=>populate(search.value);b.onclick=()=>{const id=+sel.value;if(!id)return;const sk=usable.find(x=>x.id===id);const level=Math.min(Number(lv.value)||1,skillMaxLevel(sk));addFn({id,name:sk.name,level});};p.append(search,sel,lv,b);populate();}
function renderPickers(){makeSkillPicker('normalSkillPicker','normal',W.targets,t=>{upsertTarget(W.targets,t);renderTargets();save();});makeSkillPicker('setSkillPicker','set',W.setTargets,t=>{upsertTarget(W.setTargets,t);renderTargets();save();});makeSkillPicker('groupSkillPicker','group',W.groupTargets,t=>{upsertTarget(W.groupTargets,t);renderTargets();save();});}
function upsertTarget(arr,t){const x=arr.find(v=>v.id===t.id);if(x)x.level=t.level;else arr.push(t);}
function renderTargetRows(id,arr,kind){const d=$(id);d.innerHTML=arr.map((t,i)=>{const sk=W.skills.find(x=>x.id===t.id);const max=skillMaxLevel(sk);const level=Math.min(Number(t.level)||1,max);t.level=level;const req=kind==='set'||kind==='group'?setGroupRequired(sk,level):null;const info=wildsSkillInfo(t.name);const levels=(info.levels||[]).filter(x=>x.level===level);return `<div class="selected-skill"><b>${esc(t.name)}</b><select data-i="${i}" class="targetLv">${levelOptions(max,level)}</select>${req?`<span class="small">${req}部位</span>`:''}${MHSkillPopover.button(t.name,{...info,levels})}<button data-i="${i}" class="removeTarget">削除</button></div>`;}).join('');d.querySelectorAll('.targetLv').forEach(e=>e.onchange=()=>{arr[+e.dataset.i].level=+e.value;renderTargets();save();});d.querySelectorAll('.removeTarget').forEach(e=>e.onclick=()=>{arr.splice(+e.dataset.i,1);renderTargets();save();});}
function renderTargets(){renderTargetRows('selectedNormalSkills',W.targets,'normal');renderTargetRows('selectedSetSkills',W.setTargets,'set');renderTargetRows('selectedGroupSkills',W.groupTargets,'group');}
function itemSkills(item){const m=new Map();for(const x of (item?.skills||[])){const k=norm(x.skill?.name);if(k)m.set(k,(m.get(k)||0)+(Number(x.level)||0));}return m;}
function mergeMaps(arr){const m=new Map();for(const x of arr)for(const [k,v] of x)m.set(k,(m.get(k)||0)+v);return m;}
function slots(item){return (item?.slots||[]).map(Number).filter(Boolean).sort((a,b)=>b-a);}
function fitsDecoration(slot,d){return Number(d.slot)<=slot;}
function uniqueSkillNames(targets){return [...new Set(targets.map(t=>norm(t.name)))];}
function scoreItem(item,targets){const m=itemSkills(item);let sat=0;for(const t of targets)sat+=Math.min(Number(t.level)||0,m.get(norm(t.name))||0);return sat;}
function bonusLevel(armor,target,kind){
  const sk=W.skills.find(x=>x.id===target.id); const reqLevel=Number(target.level)||0;
  if(!sk||!reqLevel)return 0;
  if(kind==='group'){
    const pieces=armorBonusPieces(armor,'group',target.name);
    let lv=0; for(const r of (sk.ranks||[])) if(Number(r.setPiecesRequired)&&pieces>=Number(r.setPiecesRequired)) lv=Math.max(lv,Number(r.level)||0);
    return lv;
  }
  const pieces=armorBonusPieces(armor,'set',target.name);
  let lv=0; for(const r of (sk.ranks||[])) if(Number(r.setPiecesRequired)&&pieces>=Number(r.setPiecesRequired)) lv=Math.max(lv,Number(r.level)||0);
  return lv;
}
function targetTotal(){return [...W.targets,...W.setTargets,...W.groupTargets].reduce((s,t)=>s+Number(t.level||0),0);}
function flattenCharms(){const out=[{id:'none',name:'護石なし',skills:[],source:null}];for(const c of W.charms){if(c?.randomized)continue;for(const r of (c.ranks||[])){if(!(r.skills||[]).length)continue;out.push({id:`${c.id}:${r.id}`,name:r.name||c.name||`護石${c.id}`,skills:r.skills,source:c,rank:r});}}return out;}
function armorSetMeta(a){return a?.armorSet||null;}
function bonusSkillForArmor(a,kind){const s=armorSetMeta(a)?.[kind==='set'?'setBonusSkill':'groupBonusSkill'];return s||null;}
function armorIdentity(a){return String(a?.id??a?.gameId??a?._id??`${a?.kind}:${a?.name}`);}
function setIdentity(a){const meta=armorSetMeta(a);return String(meta?.id??meta?.gameId??meta?.name??'');}
function armorBonusPieces(armor,kind,name){const key=norm(name);if(kind==='group')return armor.reduce((n,a)=>n+(norm(bonusSkillForArmor(a,'group')?.name)===key?1:0),0);const bySet=new Map();for(const a of armor){if(norm(bonusSkillForArmor(a,'set')?.name)!==key)continue;const sid=setIdentity(a);if(sid)bySet.set(sid,(bySet.get(sid)||0)+1);}return Math.max(0,...bySet.values());}
function armorBonusSatisfied(armor,targets,kind){for(const t of targets){const sk=W.skills.find(x=>x.id===t.id);const req=setGroupRequired(sk,t.level);if(req&&armorBonusPieces(armor,kind,t.name)<req)return false;}return true;}
function armorCandidateScore(st){
  let s=0;
  for(const t of W.targets)s+=Math.min(Number(t.level)||0,st.skills.get(norm(t.name))||0);
  for(const t of W.setTargets)s+=Math.min(Number(t.level)||0,bonusLevel(st.set,t,'set'))*20;
  for(const t of W.groupTargets)s+=Math.min(Number(t.level)||0,bonusLevel(st.set,t,'group'))*20;
  return s*100+st.slotSum;
}
function armorCandidates(){
  const byKind={};for(const p of PARTS)byKind[p]=W.armor.filter(a=>a?.kind===p);
  const bonusNames=new Set([...W.setTargets,...W.groupTargets].map(t=>norm(t.name)));
  let beams=[{set:[],skills:new Map(),slotSum:0}];
  for(const p of PARTS){
    const basePool=byKind[p].slice().sort((a,b)=>{const sa=scoreItem(a,W.targets),sb=scoreItem(b,W.targets);return sb-sa||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0);}).slice(0,LIMITS.armorPartPool);
    const bonusPool=byKind[p].filter(a=>[bonusSkillForArmor(a,'set'),bonusSkillForArmor(a,'group')].some(x=>bonusNames.has(norm(x?.name))));
    const pool=[...new Map([...basePool,...bonusPool].map(a=>[armorIdentity(a),a])).values()];
    const next=[];
    for(const st of beams)for(const a of pool){const ss=slots(a).reduce((x,y)=>x+y,0);next.push({set:[...st.set,a],skills:mergeMaps([st.skills,itemSkills(a)]),slotSum:st.slotSum+ss});}
    next.sort((a,b)=>armorCandidateScore(b)-armorCandidateScore(a));
    beams=next.slice(0,LIMITS.armorBeam);
  }
  return beams.filter(st=>armorBonusSatisfied(st.set,W.setTargets,'set')&&armorBonusSatisfied(st.set,W.groupTargets,'group'));
}
function decorationPool(kind){return W.decorations.filter(d=>d?.kind===kind);}
function decoGain(d,name){return (d?.skills||[]).filter(s=>norm(s.skill?.name)===name).reduce((n,s)=>n+(Number(s.level)||0),0);}
function fillDecorations(weaponSlots,armorSlots,baseSkills){
  const deficits=W.targets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-(baseSkills.get(norm(t.name))||0))})).filter(x=>x.need>0);
  if(!deficits.length)return {used:[],remaining:[],weaponLeft:[...weaponSlots],armorLeft:[...armorSlots]};
  const allSlots=[...weaponSlots.map(slot=>({kind:'weapon',slot})),...armorSlots.map(slot=>({kind:'armor',slot}))].sort((a,b)=>b.slot-a.slot);
  const pools={weapon:decorationPool('weapon'),armor:decorationPool('armor')};
  const candidatesByTarget=new Map();
  for(const t of deficits){const list=[];for(const kind of ['weapon','armor'])for(const d of pools[kind]){const gain=decoGain(d,t.name);if(gain>0)list.push({d,kind,gain});}list.sort((a,b)=>b.gain-a.gain||Number(a.d.slot)-Number(b.d.slot));candidatesByTarget.set(t.name,list.slice(0,18));}
  let best=null;const start=Date.now();
  function rec(i,avail,used,gains){
    if(Date.now()-start>250)return;
    if(i>=deficits.length){const rem=deficits.reduce((n,t)=>n+Math.max(0,t.need-(gains.get(t.name)||0)),0);if(!best||rem<best.rem||rem===best.rem&&used.length<best.used.length)best={rem,used:[...used],avail:[...avail]};return;}
    const t=deficits[i];const have=gains.get(t.name)||0;if(have>=t.need){rec(i+1,avail,used,gains);return;}
    rec(i+1,avail,used,gains);
    const opts=candidatesByTarget.get(t.name)||[];for(const o of opts){let idx=-1;for(let j=0;j<avail.length;j++)if(avail[j].kind===o.kind&&fitsDecoration(avail[j].slot,o.d)){idx=j;break;}if(idx<0)continue;const nextAvail=avail.slice();nextAvail.splice(idx,1);const ng=new Map(gains);for(const s of (o.d.skills||[])){const n=norm(s.skill?.name);ng.set(n,(ng.get(n)||0)+(Number(s.level)||0));}rec(i,nextAvail,[...used,{name:o.d.name,slot:o.d.slot,kind:o.kind,skill:t.name,level:o.gain}],ng);}
  }
  rec(0,allSlots,[],new Map());
  const chosen=best?.used||[];const usedSlots=chosen.map(x=>({kind:x.kind,slot:x.slot}));const weaponLeft=[...weaponSlots],armorLeft=[...armorSlots];for(const u of usedSlots){const arr=u.kind==='weapon'?weaponLeft:armorLeft;const idx=arr.findIndex(s=>Number(s)===Number(u.slot));if(idx>=0)arr.splice(idx,1);}
  const rem=deficits.map(t=>({name:t.name,need:Math.max(0,t.need-chosen.filter(u=>u.skill===t.name).reduce((s,u)=>s+u.level,0))})).filter(x=>x.need>0);
  return {used:chosen,remaining:rem,weaponLeft,armorLeft};
}
function findDecorationObjects(used){return used.map(u=>W.decorations.find(d=>d.name===u.name&&d.kind===u.kind&&Number(d.slot)===Number(u.slot))||{name:u.name,slot:u.slot,kind:u.kind,skills:[{skill:{name:u.skill},level:u.level}]});}
function activeSkillMap(weapon,armor,charm,decos){return mergeMaps([itemSkills(weapon),...armor.map(itemSkills),itemSkills(charm),...decos.map(itemSkills)]);}
function targetSatisfiedFromMaps(base,extraDecos=[]){
  const m=mergeMaps([base,...extraDecos.map(itemSkills)]);
  return W.targets.every(t=>(m.get(norm(t.name))||0)>=Number(t.level||0));
}
function decorationFeasible(weapon,armor,charm){
  const base=mergeMaps([itemSkills(weapon),...armor.map(itemSkills),itemSkills(charm)]);
  const deco=fillDecorations(slots(weapon),armor.flatMap(slots),base);
  return deco.remaining.length===0;
}
function bonusTargetsSatisfiedFast(armor){
  return armorBonusSatisfied(armor,W.setTargets,'set')&&armorBonusSatisfied(armor,W.groupTargets,'group');
}
function isArmorSlotFree(c,part){
  // 「フリー」は、対象部位をその部位プール内のどの防具に差し替えても、
  // 通常スキル・装飾品・シリーズ/グループ条件を含めて目標を維持できる場合だけ成立させる。
  const pool=W.armor.filter(a=>a?.kind===part);
  if(!pool.length)return false;
  const others=c.armor.filter(a=>a?.kind!==part);
  const checkPool=pool.length>LIMITS.freeCheckArmorPool?pool.slice(0,LIMITS.freeCheckArmorPool):pool;
  const started=performance.now();
  for(const replacement of checkPool){
    const armor=[...others,replacement].sort((a,b)=>PARTS.indexOf(a.kind)-PARTS.indexOf(b.kind));
    if(!bonusTargetsSatisfiedFast(armor))return false;
    if(!decorationFeasible(c.weapon,armor,c.charm))return false;
    if(performance.now()-started>LIMITS.freeCheckMilliseconds)return false;
  }
  return true;
}
function detectFreeArmorParts(c){
  const free=[];
  for(const part of PARTS)if(isArmorSlotFree(c,part))free.push(part);
  return free;
}
function collapseFreeArmor(c){
  const free=detectFreeArmorParts(c);
  return {...c,freeParts:free};
}
function evaluateCombo(weapon,armor,charm){
  const base=mergeMaps([itemSkills(weapon),...armor.map(itemSkills),itemSkills(charm)]);
  const deco=fillDecorations(slots(weapon),armor.flatMap(slots),base);
  const final=activeSkillMap(weapon,armor,charm,findDecorationObjects(deco.used));
  const normalRem=W.targets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-(final.get(norm(t.name))||0))})).filter(x=>x.need>0);
  const setRem=W.setTargets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-bonusLevel(armor,t,'set'))})).filter(x=>x.need>0);
  const groupRem=W.groupTargets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-bonusLevel(armor,t,'group'))})).filter(x=>x.need>0);
  const remaining=[...normalRem,...setRem,...groupRem];
  const sat=W.targets.reduce((s,t)=>s+Math.min(Number(t.level),final.get(norm(t.name))||0),0)
    +W.setTargets.reduce((s,t)=>s+Math.min(Number(t.level),bonusLevel(armor,t,'set')),0)
    +W.groupTargets.reduce((s,t)=>s+Math.min(Number(t.level),bonusLevel(armor,t,'group')),0);
  return {weapon,armor,charm,decos:deco.used,remaining,skills:final,sat,total:targetTotal(),slotScore:deco.weaponLeft.reduce((s,x)=>s+x,0)+deco.armorLeft.reduce((s,x)=>s+x,0)};
}
function pairScore(w,c){return scoreItem(w,W.targets)+scoreItem(c,W.targets);}
function makeWeaponCharmPairs(){
  const charms=flattenCharms();
  const weaponPool=W.weapons.filter(Boolean).map(w=>({w,score:scoreItem(w,W.targets),slots:slots(w).reduce((s,x)=>s+x,0)})).sort((a,b)=>b.score-a.score||b.slots-a.slots).slice(0,LIMITS.weaponPool).map(x=>x.w);
  const charmPool=charms.map(c=>({c,score:scoreItem(c,W.targets)})).sort((a,b)=>b.score-a.score).slice(0,LIMITS.charmPool).map(x=>x.c);
  const wc=[];for(const w of weaponPool)for(const c of charmPool)wc.push({w,c,s:pairScore(w,c),slots:slots(w).reduce((a,b)=>a+b,0)});
  wc.sort((a,b)=>b.s-a.s||b.slots-a.slots);return wc.slice(0,LIMITS.pairPool);
}
function rankCandidate(a,b){const aFull=a.sat===a.total,bFull=b.sat===b.total;if(aFull!==bFull)return aFull?-1:1;if(a.sat!==b.sat)return b.sat-a.sat;if(a.remaining.length!==b.remaining.length)return a.remaining.length-b.remaining.length;return b.slotScore-a.slotScore;}
async function makeCandidates(progress){
  const started=performance.now();const armorStates=armorCandidates();progress('②','武器・護石候補を絞り込み中',35);
  await yieldUI();const pairs=makeWeaponCharmPairs();
  const estimated=armorStates.length*pairs.length;const maxEval=LIMITS.maxEvaluations;const deadline=started+LIMITS.maxMilliseconds;const total=targetTotal();
  progress('③',`候補を探索中（推定 ${estimated.toLocaleString()} / 上限 ${maxEval.toLocaleString()}）`,45);
  const out=[];let evaluated=0,stopped=false;
  outer:for(let ai=0;ai<armorStates.length;ai++){
    const st=armorStates[ai];
    for(let pi=0;pi<pairs.length;pi++){
      if(evaluated>=maxEval||performance.now()>=deadline){stopped=true;break outer;}
      const pair=pairs[pi];
      // Fast lower-bound pruning: if equipment already reaches every target, no decoration search is needed.
      const base=mergeMaps([st.skills,itemSkills(pair.w),itemSkills(pair.c)]);
      let baseSat=0;for(const t of W.targets)baseSat+=Math.min(Number(t.level),base.get(norm(t.name))||0);
      let bonusSat=0;for(const t of W.setTargets)bonusSat+=Math.min(Number(t.level),bonusLevel(st.set,t,'set'));for(const t of W.groupTargets)bonusSat+=Math.min(Number(t.level),bonusLevel(st.set,t,'group'));
      const c=collapseFreeArmor(evaluateCombo(pair.w,st.set,pair.c));evaluated++;
      if(c.sat===total||out.length<LIMITS.maxResults||baseSat+bonusSat>=Math.max(0,total-2)){out.push(c);out.sort(rankCandidate);if(out.length>LIMITS.maxResults)out.pop();}
      if(evaluated%500===0){const pct=45+Math.min(50,Math.round(evaluated/Math.max(1,Math.min(estimated,maxEval))*50));progress('③',`候補を探索中 ${evaluated.toLocaleString()}件 / 推定 ${estimated.toLocaleString()}件`,pct);await yieldUI();}
    }
  }
  out.sort(rankCandidate);
  return {candidates:out.slice(0,LIMITS.maxResults),estimated,evaluated,stopped,elapsed:Math.round(performance.now()-started)};
}
function wildsSkillInfo(name){const sk=W.skills.find(x=>norm(x.name)===norm(name));const local=(window.WILDS_SKILL_DETAILS||{})[norm(name)]||{};const description=local.description||sk?.description||'';if(!sk)return {name,description,levels:local.levels||[]};const ranks=(sk.ranks||[]).map(r=>({level:Number(r.level)||0,effect:r.description||r.effect||r.text||''})).filter(x=>x.level&&x.effect);if(ranks.length){const localByLevel=new Map((local.levels||[]).map(x=>[Number(x.level),x.effect]));return {name,description,levels:ranks.map(x=>localByLevel.has(x.level)?{...x,effect:localByLevel.get(x.level)}:x)};}return {name,description,levels:description?[{level:1,effect:description}]:[]};}
function actualBonusSkills(armor,kind){const result=new Map();if(kind==='group'){for(const a of armor){const b=bonusSkillForArmor(a,'group');const n=norm(b?.name);if(n)result.set(n,(result.get(n)||0)+1);}return result;}
  const bySkillSet=new Map();for(const a of armor){const b=bonusSkillForArmor(a,'set');const n=norm(b?.name);const sid=setIdentity(a);if(!n||!sid)continue;if(!bySkillSet.has(n))bySkillSet.set(n,new Map());const m=bySkillSet.get(n);m.set(sid,(m.get(sid)||0)+1);}
  for(const [name,counts] of bySkillSet){const sk=W.skills.find(s=>norm(s.name)===name);let max=0;for(const pieces of counts.values())for(const r of (sk?.ranks||[])){if(Number(r.setPiecesRequired)&&pieces>=Number(r.setPiecesRequired))max=Math.max(max,Number(r.level)||0);}if(max)result.set(name,max);}return result;}
function allActiveSkills(c){const m=new Map();for(const x of [c.weapon,c.charm,...c.armor])for(const s of (x?.skills||[])){const n=norm(s.skill?.name);if(n)m.set(n,(m.get(n)||0)+(Number(s.level)||0));}for(const d of findDecorationObjects(c.decos))for(const s of (d.skills||[])){const n=norm(s.skill?.name);if(n)m.set(n,(m.get(n)||0)+(Number(s.level)||0));}
  const set=actualBonusSkills(c.armor,'set');for(const [n,lv] of set)m.set(n,Math.max(m.get(n)||0,lv));const group=actualBonusSkills(c.armor,'group');for(const [n,pieces] of group){const sk=W.skills.find(s=>norm(s.name)===n);let lv=0;for(const r of (sk?.ranks||[])){if(Number(r.setPiecesRequired)&&pieces>=Number(r.setPiecesRequired))lv=Math.max(lv,Number(r.level)||0);}if(lv)m.set(n,Math.max(m.get(n)||0,lv));}
  return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ja'));}
function renderAllActiveSkills(c){const list=allActiveSkills(c);return `<details open class="active-skills"><summary>発動スキル（${list.length}種）</summary><div class="skill-list">${list.map(([name,lv])=>`<div class="active-skill-line"><span>${esc(name)} Lv${lv}</span>${MHSkillPopover.button(name,wildsSkillInfo(name))}</div>`).join('')}</div></details>`;}
function renderResults(cands,meta){const r=$('results');if(!cands.length){$('status').classList.remove('hidden');$('status').textContent='候補なし';r.innerHTML='';return;}$('status').classList.remove('hidden');$('status').textContent=`検索 ${meta.evaluated.toLocaleString()}件を評価${meta.stopped?'（探索上限または時間上限で打ち切り）':''}`;r.innerHTML=cands.map((c,i)=>`<section class="card result"><h3>#${i+1} 目標充足 ${c.sat}/${c.total}</h3><div><b>武器:</b> ${esc(c.weapon.name)}</div>${c.charm?.source?`<div><b>護石:</b> ${esc(c.charm.name)}</div>`:'<div><b>護石:</b> なし</div>'}<div>${PARTS.map(part=>{if(c.freeParts?.includes(part))return `<div>${PART_LABEL[part]}: <b>フリー</b></div>`;const a=c.armor.find(x=>x?.kind===part);return `<div>${PART_LABEL[part]}: ${esc(a?.name||'—')}</div>`;}).join('')}</div>${renderAllActiveSkills(c)}<div class="small">装飾品: ${c.decos.length?c.decos.map(d=>`${esc(d.name)}×1`).join(' / '):'なし'}</div>${c.remaining.length?`<div class="warn">目標不足: ${c.remaining.map(x=>esc(x.name)+' Lv'+x.need).join(' / ')}</div>`:'<div class="ok">目標スキル充足</div>'}</section>`).join('');}
async function fetchJSON(path){const r=await fetch(API+path);if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);return r.json();}
async function loadDB(){try{const [armor,armorSets,weapons,skills,deco,charms]=await Promise.all(['/armor','/armor/sets','/weapons','/skills','/decorations','/charms'].map(fetchJSON));W.armor=armor;W.armorSets=armorSets;W.weapons=weapons;W.skills=skills;W.decorations=deco;W.charms=charms;W.loaded=true;$('dbVersion').textContent=`Wilds 日本語DB loaded / Armor ${armor.length} / Weapons ${weapons.length} / Skills ${skills.length} / Decorations ${deco.length} / Charms ${charms.length}`;renderPickers();$('solveBtn').disabled=false;$('solveBtn').textContent='検索する';const saved=MHStorage.load('wilds');if(saved?.data)restore(saved.data);}catch(e){$('dbVersion').textContent='Wilds 日本語DBの読み込みに失敗しました';$('status').classList.remove('hidden');$('status').textContent='DB接続エラー: '+e.message;}}
function stateData(){return {targets:W.targets,setTargets:W.setTargets,groupTargets:W.groupTargets};}
function save(){MHStorage.save('wilds',stateData());}
function restore(d){W.targets=d.targets||[];W.setTargets=d.setTargets||[];W.groupTargets=d.groupTargets||[];renderTargets();}
$('solveBtn').onclick=async()=>{
  if(!W.loaded||(!W.targets.length&&!W.setTargets.length&&!W.groupTargets.length)){$('status').classList.remove('hidden');$('status').textContent='目標スキルを1つ以上選択してください。';return;}
  if(!W.targets.length&&!W.setTargets.length&&W.groupTargets.length){$('status').classList.remove('hidden');$('status').textContent='グループスキルだけでは検索できません。通常スキルまたはシリーズスキルを1つ以上指定してください。';return;}$('solveBtn').disabled=true;MHSearchUI.start();try{MHSearchUI.step('①','防具候補を枝刈り探索中',15);await yieldUI();const meta=await makeCandidates((n,t,p)=>MHSearchUI.step(n,t,p));renderResults(meta.candidates,meta);save();MHSearchUI.done(meta.stopped?'探索上限に達したため打ち切りました':'検索完了');}catch(e){console.error(e);MHSearchUI.error(e.message||String(e));$('status').classList.remove('hidden');$('status').textContent='検索エラー: '+(e.message||e);}finally{$('solveBtn').disabled=false;}};
$('saveBtn').onclick=save;$('loadBtn').onclick=()=>{const x=MHStorage.load('wilds');if(x?.data)restore(x.data);};$('clearSaveBtn').onclick=()=>{MHStorage.clear('wilds');W.targets=[];W.setTargets=[];W.groupTargets=[];renderTargets();};
loadDB();
