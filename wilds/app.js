const API='https://wilds.mhdb.io/ja';
const W={armor:[],armorSets:[],weapons:[],skills:[],decorations:[],charms:[],targets:[],setTargets:[],groupTargets:[],weaponKind:'',loaded:false};
const LIMITS={armorBeam:260,armorPartPool:80,weaponPool:220,charmPool:100,pairPool:1200,maxEvaluations:180000,maxMilliseconds:5000,maxResults:30,freeCheckArmorPool:1000,freeCheckMilliseconds:1500};
const $=id=>document.getElementById(id);
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const PARTS=['head','chest','arms','waist','legs'];
const PART_LABEL={head:'頭',chest:'胴',arms:'腕',waist:'腰',legs:'脚'};
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
async function fetchJSON(path){
  const res=await fetch(`${API}${path}`,{headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error(`HTTP ${res.status} ${res.statusText} (${path})`);
  const data=await res.json();
  return Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:data);
}
function skillMaxLevel(skill){const levels=(skill?.ranks||[]).map(r=>Number(r.level)||0).filter(Boolean);return levels.length?Math.max(...levels):1;}
function levelOptions(max,current=1){return Array.from({length:max},(_,n)=>{const v=n+1;return `<option value="${v}" ${v===Number(current)?'selected':''}>Lv${v}</option>`;}).join('');}
function skillSearchText(skill){const local=(window.WILDS_SKILL_DETAILS||{})[norm(skill?.name)]||{};const parts=[skill?.name,skill?.description,local.description,...(local.levels||[]).flatMap(r=>[r?.effect,r?.description,r?.text])];for(const r of (skill?.ranks||[]))parts.push(r?.description,r?.effect,r?.text);return norm(parts.filter(Boolean).join(' ')).toLocaleLowerCase('ja');}
function setGroupRequired(skill,level){const r=(skill?.ranks||[]).find(x=>Number(x.level)===Number(level));return Number(r?.setPiecesRequired)||null;}
function skillHasNonWeaponSource(id){const sid=String(id);if(W.armor.some(a=>(a?.skills||[]).some(s=>String(s?.skill?.id)===sid)))return true;if(W.charms.some(c=>(c?.ranks||[]).some(r=>(r?.skills||[]).some(s=>String(s?.skill?.id)===sid))))return true;if(W.decorations.some(d=>d?.kind!=='weapon'&&(d?.skills||[]).some(s=>String(s?.skill?.id)===sid)))return true;return false;}
function skillHasWeaponSource(id){const sid=String(id);return W.weapons.filter(w=>!W.weaponKind||w?.kind===W.weaponKind).some(w=>(w?.skills||[]).some(s=>String(s?.skill?.id)===sid))||W.decorations.some(d=>d?.kind==='weapon'&&(d?.skills||[]).some(s=>String(s?.skill?.id)===sid));}
function skillAudit(){const orphan=[];for(const s of W.skills){if(!s||s.kind==='set'||s.kind==='group')continue;if(!skillHasNonWeaponSource(s.id)&&!skillHasWeaponSource(s.id))orphan.push(s.name);}return {normal:W.skills.filter(s=>s&&s.kind!=='set'&&s.kind!=='group'&&skillHasNonWeaponSource(s.id)).length,weaponOnly:W.skills.filter(s=>s&&s.kind!=='set'&&s.kind!=='group'&&!skillHasNonWeaponSource(s.id)&&skillHasWeaponSource(s.id)).length,orphan};}
function makeSkillPicker(containerId,kind,targets,addFn){const p=$(containerId);p.innerHTML='';const weaponSkills=new Set([...W.weapons.filter(w=>!W.weaponKind||w?.kind===W.weaponKind).flatMap(w=>(w?.skills||[]).map(s=>String(s?.skill?.id))),...W.decorations.filter(d=>d?.kind==='weapon').flatMap(d=>(d?.skills||[]).map(s=>String(s?.skill?.id)))]);const usable=W.skills.filter(x=>x&&x.kind!=='set'&&x.kind!=='group'&&(kind==='normal'?skillHasNonWeaponSource(x.id):kind==='weapon'?W.weaponKind&&weaponSkills.has(String(x.id))&&!skillHasNonWeaponSource(x.id):x.kind===kind));const search=document.createElement('input');search.type='search';search.placeholder='スキル名・効果で検索…';search.autocomplete='off';const sel=document.createElement('select');const lv=document.createElement('select');const b=document.createElement('button');b.textContent='＋追加';function sync(){const sk=usable.find(x=>String(x.id)===String(sel.value));const max=skillMaxLevel(sk);lv.innerHTML=levelOptions(max,Math.min(Number(lv.value)||1,max));}function populate(filter=''){const q=norm(filter).toLocaleLowerCase('ja');const list=q?usable.filter(x=>skillSearchText(x).includes(q)):usable;const prev=sel.value;sel.innerHTML='<option value="">スキルを選択…</option>'+list.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(list.some(x=>String(x.id)===String(prev)))sel.value=prev;sync();}sel.onchange=sync;search.oninput=()=>populate(search.value);b.onclick=()=>{const id=+sel.value;if(!id)return;const sk=usable.find(x=>x.id===id);const level=Math.min(Number(lv.value)||1,skillMaxLevel(sk));addFn({id,name:sk.name,level,source:kind==='weapon'?'weapon':'normal'});};p.append(search,sel,lv,b);populate();}
function weaponKindLabel(k){return ({'great-sword':'大剣','long-sword':'太刀','sword-shield':'片手剣','dual-blades':'双剣','hammer':'ハンマー','hunting-horn':'狩猟笛','lance':'ランス','gunlance':'ガンランス','switch-axe':'スラッシュアックス','charge-blade':'チャージアックス','insect-glaive':'操虫棍','light-bowgun':'ライトボウガン','heavy-bowgun':'ヘビィボウガン','bow':'弓'})[k]||k;}
function weaponKinds(){return [...new Set(W.weapons.map(w=>w?.kind).filter(Boolean))].sort((a,b)=>weaponKindLabel(a).localeCompare(weaponKindLabel(b),'ja'));}
function renderWeaponKindPicker(){const s=$('weaponKind');if(!s)return;const prev=W.weaponKind;const kinds=weaponKinds();s.innerHTML='<option value="">武器種を選択…</option>'+kinds.map(k=>`<option value="${esc(k)}">${esc(weaponKindLabel(k))}</option>`).join('');if(kinds.includes(prev))s.value=prev;else W.weaponKind='';renderPickers();}
function renderPickers(){makeSkillPicker('normalSkillPicker','normal',W.targets,t=>{upsertTarget(W.targets,t);renderTargets();save();});makeSkillPicker('weaponSkillPicker','weapon',W.targets,t=>{upsertTarget(W.targets,t);renderTargets();save();});makeSkillPicker('setSkillPicker','set',W.setTargets,t=>{upsertTarget(W.setTargets,t);renderTargets();save();});makeSkillPicker('groupSkillPicker','group',W.groupTargets,t=>{upsertTarget(W.groupTargets,t);renderTargets();save();});}
function upsertTarget(arr,t){const x=arr.find(v=>v.id===t.id);if(x){x.level=t.level;if(t.source)x.source=t.source;}else arr.push(t);}
function renderTargetRows(id,arr,kind,predicate=null){const d=$(id);d.innerHTML=arr.map((t,i)=>({t,i})).filter(x=>!predicate||predicate(x.t)).map(({t,i})=>{const sk=W.skills.find(x=>x.id===t.id);const max=skillMaxLevel(sk);const level=Math.min(Number(t.level)||1,max);t.level=level;const req=kind==='set'||kind==='group'?setGroupRequired(sk,level):null;const info=wildsSkillInfo(t.name);const levels=(info.levels||[]).filter(x=>x.level===level);return `<div class="selected-skill"><b>${esc(t.name)}</b><select data-i="${i}" class="targetLv">${levelOptions(max,level)}</select>${req?`<span class="small">${req}部位</span>`:''}${MHSkillPopover.button(t.name,{...info,levels})}<button data-i="${i}" class="removeTarget">削除</button></div>`;}).join('');d.querySelectorAll('.targetLv').forEach(e=>e.onchange=()=>{arr[+e.dataset.i].level=+e.value;renderTargets();save();});d.querySelectorAll('.removeTarget').forEach(e=>e.onclick=()=>{arr.splice(+e.dataset.i,1);renderTargets();save();});}
function renderTargets(){renderTargetRows('selectedNormalSkills',W.targets,'normal',t=>t.source!=='weapon');renderTargetRows('selectedWeaponSkills',W.targets,'normal',t=>t.source==='weapon');renderTargetRows('selectedSetSkills',W.setTargets,'set');renderTargetRows('selectedGroupSkills',W.groupTargets,'group');}
function itemSkills(item){const m=new Map();for(const x of (item?.skills||[])){const k=norm(x.skill?.name);if(k)m.set(k,(m.get(k)||0)+(Number(x.level)||0));}return m;}
function mergeMaps(arr){const m=new Map();for(const x of arr)for(const [k,v] of x)m.set(k,(m.get(k)||0)+v);return m;}
function slots(item){return (item?.slots||[]).map(Number).filter(Boolean).sort((a,b)=>b-a);}
function fitsDecoration(slot,d){return Number(d.slot)<=slot;}
function uniqueSkillNames(targets){return [...new Set(targets.map(t=>norm(t.name)))];}
function targetSource(t){if(t?.source==='weapon')return 'weapon';if(t?.source==='normal'||t?.source==='armor')return 'normal';const sk=W.skills.find(x=>String(x?.id)===String(t?.id));return sk?.kind==='weapon'&&!skillHasNonWeaponSource(t?.id)?'weapon':'normal';}
function weaponTargets(){return W.targets.filter(t=>targetSource(t)==='weapon');}
function armorTargets(){return W.targets.filter(t=>targetSource(t)!=='weapon');}
function skillCanComeFromArmor(t){const id=String(t?.id);return W.armor.some(a=>(a?.skills||[]).some(s=>String(s?.skill?.id)===id));}
function skillCanComeFromWeapon(t){const id=String(t?.id);return skillHasWeaponSource(id);}
function targetLevelFromSources(t,weapon,armor,charm,decos){const name=norm(t.name);const wm=itemSkills(weapon).get(name)||0;const am=mergeMaps([...armor.map(itemSkills),itemSkills(charm),...decos.map(itemSkills)]).get(name)||0;return wm+am;}
function scoreItem(item,targets){const m=item instanceof Map?item:itemSkills(item);let sat=0;for(const t of targets)sat+=Math.min(Number(t.level)||0,m.get(norm(t.name))||0);return sat;}
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
function bonusSkillForArmor(a,kind){const direct=armorSetMeta(a)?.[kind==='set'?'setBonusSkill':'groupBonusSkill'];if(direct)return direct;const sid=armorSetMeta(a)?.id??armorSetMeta(a)?.gameId??armorSetMeta(a)?.name;if(sid==null)return null;const set=W.armorSets.find(x=>String(x?.id??x?.gameId??x?.name??'')===String(sid));return set?.[kind==='set'?'setBonusSkill':'groupBonusSkill']||null;}
function armorIdentity(a){return String(a?.id??a?.gameId??a?._id??`${a?.kind}:${a?.name}`);}
function setIdentity(a){const meta=armorSetMeta(a);return String(meta?.id??meta?.gameId??meta?.name??'');}
function armorBonusPieces(armor,kind,name){const key=norm(name);if(kind==='group')return armor.reduce((n,a)=>n+(norm(bonusSkillForArmor(a,'group')?.name)===key?1:0),0);const bySet=new Map();for(const a of armor){if(norm(bonusSkillForArmor(a,'set')?.name)!==key)continue;const sid=setIdentity(a);if(sid)bySet.set(sid,(bySet.get(sid)||0)+1);}return Math.max(0,...bySet.values());}
function armorBonusSatisfied(armor,targets,kind){for(const t of targets){const sk=W.skills.find(x=>x.id===t.id);const req=setGroupRequired(sk,t.level);if(!req)return false;if(armorBonusPieces(armor,kind,t.name)<req)return false;}return true;}
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
    const basePool=byKind[p].slice().sort((a,b)=>{const sa=scoreItem(a,armorTargets()),sb=scoreItem(b,W.targets);return sb-sa||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0);}).slice(0,LIMITS.armorPartPool);
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
function fillDecorations(weaponSlots,armorSlots,baseSkills,weapon=null,armor=[],charm=null){
  const armorBase=mergeMaps([...armor.map(itemSkills),itemSkills(charm)]);
  const weaponBase=itemSkills(weapon);
  const deficits=W.targets.map(t=>{const n=norm(t.name);const have=(weaponBase.get(n)||0)+(armorBase.get(n)||0);return {name:n,need:Math.max(0,Number(t.level)-have),source:targetSource(t)};}).filter(x=>x.need>0);
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
    const opts=(candidatesByTarget.get(t.name)||[]).filter(o=>t.source==='weapon'||o.kind==='armor');for(const o of opts){let idx=-1;for(let j=0;j<avail.length;j++)if(avail[j].kind===o.kind&&fitsDecoration(avail[j].slot,o.d)){idx=j;break;}if(idx<0)continue;const nextAvail=avail.slice();nextAvail.splice(idx,1);const ng=new Map(gains);for(const s of (o.d.skills||[])){const n=norm(s.skill?.name);ng.set(n,(ng.get(n)||0)+(Number(s.level)||0));}rec(i,nextAvail,[...used,{name:o.d.name,slot:o.d.slot,kind:o.kind,skill:t.name,level:o.gain}],ng);}
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
  const deco=fillDecorations(slots(weapon),armor.flatMap(slots),base,weapon,armor,charm);
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
    // 通常スキルの目標がある場合だけ、差し替え後の装飾品成立性も確認する。
    // シリーズ/グループだけの検索では装飾品探索を行わない。
    if(W.targets.length && !decorationFeasible(c.weapon,armor,c.charm))return false;
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
  const deco=fillDecorations(slots(weapon),armor.flatMap(slots),base,weapon,armor,charm);
  const final=activeSkillMap(weapon,armor,charm,findDecorationObjects(deco.used));
  const normalRem=W.targets.map(t=>{const total=(itemSkills(weapon).get(norm(t.name))||0)+mergeMaps([...armor.map(itemSkills),itemSkills(charm),...findDecorationObjects(deco.used).map(itemSkills)]).get(norm(t.name))||0;return {name:norm(t.name),need:Math.max(0,Number(t.level)-total),source:targetSource(t)};}).filter(x=>x.need>0);
  const setRem=W.setTargets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-bonusLevel(armor,t,'set'))})).filter(x=>x.need>0);
  const groupRem=W.groupTargets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-bonusLevel(armor,t,'group'))})).filter(x=>x.need>0);
  const remaining=[...normalRem,...setRem,...groupRem];
  const sat=W.targets.reduce((s,t)=>s+Math.min(Number(t.level),final.get(norm(t.name))||0),0)
    +W.setTargets.reduce((s,t)=>s+Math.min(Number(t.level),bonusLevel(armor,t,'set')),0)
    +W.groupTargets.reduce((s,t)=>s+Math.min(Number(t.level),bonusLevel(armor,t,'group')),0);
  return {weapon,armor,charm,decos:deco.used,remaining,skills:final,sat,total:targetTotal(),slotScore:deco.weaponLeft.reduce((s,x)=>s+x,0)+deco.armorLeft.reduce((s,x)=>s+x,0)};
}
async function seriesOnlyCandidates(progress){
  const started=performance.now();
  const out=[];const seen=new Set();const deadline=started+LIMITS.maxMilliseconds;
  const byPart={};for(const p of PARTS)byPart[p]=W.armor.filter(a=>a?.kind===p);
  const relevant=[...W.setTargets,...W.groupTargets];

  // シリーズ／グループを「要求Lvを発動させるための必要部位数」で確定する。
  // 一度必要数を満たした部位は、この後の通常スキル探索では固定する。
  function satisfied(armor){
    return armorBonusSatisfied(armor,W.setTargets,'set')&&armorBonusSatisfied(armor,W.groupTargets,'group');
  }
  function addResult(armor){
    if(!armor.length||!satisfied(armor))return;
    // 要求Lvを満たした時点の構成だけを保存する。後から同シリーズを追加しない。
    const key=PARTS.map(p=>armor.find(a=>a?.kind===p)?.id||'').join('|');
    if(seen.has(key))return;
    seen.add(key);
    const weapon={id:'free-weapon',name:'フリー',skills:[],slots:[]};
    const charm={id:'free-charm',name:'フリー',skills:[],source:null};
    out.push({
      weapon,charm,
      armor:armor.slice().sort((x,y)=>PARTS.indexOf(x.kind)-PARTS.indexOf(y.kind)),
      decos:[],remaining:[],skills:new Map(),
      sat:targetTotal(),total:targetTotal(),
      slotScore:armor.reduce((n,a)=>n+slots(a).reduce((u,v)=>u+v,0),0)
    });
  }

  function dfs(i,armor){
    if(out.length>=Math.max(LIMITS.maxResults,120)||performance.now()>=deadline)return;
    // ここで満たしたら即確定。残り部位は絶対に選ばない。
    if(satisfied(armor)){addResult(armor);return;}
    if(i>=PARTS.length)return;
    const part=PARTS[i];
    // 現在の部位を選ばず次へ進む。
    dfs(i+1,armor);

    // この部位で条件を満たせる可能性がある防具だけを試す。
    const pool=byPart[part].filter(a=>{
      if(!relevant.length)return false;
      return relevant.some(t=>{
        const sk=W.skills.find(x=>String(x?.id)===String(t.id));
        const kind=sk?.kind==='group'?'group':'set';
        return norm(bonusSkillForArmor(a,kind)?.name)===norm(t.name);
      });
    });
    for(const a of pool){
      dfs(i+1,[...armor,a]);
      if(out.length>=Math.max(LIMITS.maxResults,120)||performance.now()>=deadline)return;
    }
  }
  dfs(0,[]);
  progress('②',`シリーズ防具を確定構成から探索中（${out.length}件）`,55);
  await yieldUI();
  return {candidates:out,estimated:out.length,evaluated:out.length,stopped:performance.now()>=deadline,elapsed:Math.round(performance.now()-started),mode:'series'};
}
async function seriesWithNormalCandidates(progress){
  const started=performance.now();
  const base=await seriesOnlyCandidates(()=>progress('②','シリーズ防具を先に確定中',45));
  const armorTargetsList=armorTargets();
  const weapons=W.weaponKind?W.weapons.filter(w=>w?.kind===W.weaponKind):[];
  const charms=flattenCharms();
  const charmPool=charms.slice().sort((a,b)=>scoreItem(b,armorTargetsList)-scoreItem(a,armorTargetsList)||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0)).slice(0,LIMITS.charmPool);
  const freeWeapon={id:'free-weapon',name:'フリー',skills:[],slots:[]};
  const out=[];const deadline=started+LIMITS.maxMilliseconds;const total=targetTotal();
  for(const core of base.candidates){
    if(performance.now()>=deadline)break;
    const fixed=new Set(core.armor.map(a=>a?.kind).filter(Boolean));
    const freeParts=PARTS.filter(p=>!fixed.has(p));
    let beams=[{armor:core.armor.slice(),skills:mergeMaps(core.armor.map(itemSkills)),slotScore:core.slotScore}];
    for(const part of freeParts){
      const pool=W.armor.filter(a=>a?.kind===part).slice().sort((a,b)=>scoreItem(b,armorTargetsList)-scoreItem(a,armorTargetsList)||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0)).slice(0,LIMITS.armorPartPool);
      const next=[];for(const st of beams)for(const a of pool)next.push({armor:[...st.armor,a],skills:mergeMaps([st.skills,itemSkills(a)]),slotScore:st.slotScore+slots(a).reduce((x,y)=>x+y,0)});
      next.sort((a,b)=>scoreItem(b.skills,armorTargetsList)-scoreItem(a.skills,armorTargetsList)||b.slotScore-a.slotScore);beams=next.slice(0,LIMITS.armorBeam);
    }
    let coreFound=false;
    for(const st of beams){
      for(const charm of charmPool){
        const ev=evaluateCombo(freeWeapon,st.armor,charm);
        if(ev.sat===total){out.push({...ev,freeParts:collapseFreeArmor(ev).freeParts});coreFound=true;break;}
        if(performance.now()>=deadline)break;
      }
      if(coreFound||performance.now()>=deadline)break;
    }
    if(!coreFound&&weapons.length){
      const wt=W.targets.filter(t=>skillCanComeFromWeapon(t));
      const wp=weapons.filter(w=>wt.some(t=>(itemSkills(w).get(norm(t.name))||0)>0)).sort((a,b)=>scoreItem(b,wt)-scoreItem(a,wt)||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0));
      for(const st of beams){
        for(const w of wp){
          for(const charm of charmPool){
            const ev=evaluateCombo(w,st.armor,charm);
            if(ev.sat===total){out.push({...ev,freeParts:collapseFreeArmor(ev).freeParts});coreFound=true;break;}
            if(performance.now()>=deadline)break;
          }
          if(coreFound||performance.now()>=deadline)break;
        }
        if(coreFound||performance.now()>=deadline)break;
      }
    }
    if(out.length>=LIMITS.maxResults)break;
    progress('③',`シリーズ固定後の防具側充足を評価中（${out.length}件）`,80);await yieldUI();
  }
  out.sort(rankCandidate);
  return {candidates:out.slice(0,LIMITS.maxResults),estimated:base.candidates.length,evaluated:out.length,stopped:performance.now()>=deadline,elapsed:Math.round(performance.now()-started),mode:'seriesNormal'};
}

async function seriesWithWeaponCandidates(progress){
  return seriesWithWeaponAndNormalCandidates(progress);
}

async function seriesWithWeaponAndNormalCandidates(progress){
  const started=performance.now();
  const base=await seriesOnlyCandidates(()=>progress('②','シリーズ防具を先に確定中',45));
  const wt=weaponTargets();
  const at=armorTargets();
  const fallbackTargets=wt.filter(t=>skillCanComeFromArmor(t));
  const armorSearchTargets=[...at,...fallbackTargets.filter(f=>!at.some(a=>String(a.id)===String(f.id)))];
  const weapons=W.weapons.filter(w=>!W.weaponKind||w?.kind===W.weaponKind);
  const charms=flattenCharms();
  const out=[];
  const deadline=started+LIMITS.maxMilliseconds;
  const weaponPool=weapons.filter(w=>wt.some(t=>(itemSkills(w).get(norm(t.name))||0)>0)).sort((a,b)=>scoreItem(b,wt)-scoreItem(a,wt)||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0));
  const usefulCharms=charms.filter(c=>armorSearchTargets.some(t=>(itemSkills(c).get(norm(t.name))||0)>0));
  const charmPool=[...new Map([...usefulCharms,...charms.slice().sort((a,b)=>scoreItem(b,armorSearchTargets)-scoreItem(a,armorSearchTargets)||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0)).slice(0,LIMITS.charmPool)].map(c=>[String(c.id),c])).values()];

  function complete(weapon,armor,charm){
    const deco=fillDecorations(slots(weapon),armor.flatMap(slots),mergeMaps([itemSkills(weapon),...armor.map(itemSkills),itemSkills(charm)]),weapon,armor,charm);
    const used=findDecorationObjects(deco.used);
    const armorMap=mergeMaps([...armor.map(itemSkills),itemSkills(charm),...used.map(itemSkills)]);
    const wm=itemSkills(weapon);
    const remaining=[];
    for(const t of W.targets){
      const have=(wm.get(norm(t.name))||0)+(armorMap.get(norm(t.name))||0);
      if(have<Number(t.level||0))remaining.push({name:norm(t.name),need:Number(t.level||0)-have,source:targetSource(t)});
    }
    const final=activeSkillMap(weapon,armor,charm,used);
    const setRem=W.setTargets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-bonusLevel(armor,t,'set'))})).filter(x=>x.need>0);
    const groupRem=W.groupTargets.map(t=>({name:norm(t.name),need:Math.max(0,Number(t.level)-bonusLevel(armor,t,'group'))})).filter(x=>x.need>0);
    const rem=[...remaining,...setRem,...groupRem];
    const sat=W.targets.reduce((n,t)=>{const have=(wm.get(norm(t.name))||0)+(armorMap.get(norm(t.name))||0);return n+Math.min(Number(t.level||0),have)},0)+W.setTargets.reduce((n,t)=>n+Math.min(Number(t.level||0),bonusLevel(armor,t,'set')),0)+W.groupTargets.reduce((n,t)=>n+Math.min(Number(t.level||0),bonusLevel(armor,t,'group')),0);
    return {weapon,armor,charm,decos:deco.used,remaining:rem,skills:final,sat,total:targetTotal(),slotScore:deco.weaponLeft.reduce((s,x)=>s+x,0)+deco.armorLeft.reduce((s,x)=>s+x,0)};
  }

  for(const st of base.candidates){
    if(performance.now()>=deadline)break;
    const fixed=new Set(st.armor.map(a=>a?.kind).filter(Boolean));
    const freeParts=PARTS.filter(p=>!fixed.has(p));
    let beams=[{armor:st.armor.slice(),skills:mergeMaps(st.armor.map(itemSkills)),slotScore:st.slotScore}];
    for(const part of freeParts){
      const pool=W.armor.filter(a=>a?.kind===part).slice().sort((a,b)=>scoreItem(b,armorSearchTargets)-scoreItem(a,armorSearchTargets)||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0)).slice(0,LIMITS.armorPartPool);
      const next=[];for(const state of beams)for(const a of pool)next.push({armor:[...state.armor,a],skills:mergeMaps([state.skills,itemSkills(a)]),slotScore:state.slotScore+slots(a).reduce((x,y)=>x+y,0)});
      next.sort((a,b)=>scoreItem(b.skills,at)-scoreItem(a.skills,at)||b.slotScore-a.slotScore);beams=next.slice(0,LIMITS.armorBeam);
    }
    for(const st2 of beams){
      for(const w of weaponPool){
        for(const c of charmPool){
          if(performance.now()>=deadline)break;
          const ev=complete(w,st2.armor,c);
          if(ev.remaining.length)continue;
          out.push({...ev,freeParts:freeParts});out.sort(rankCandidate);if(out.length>LIMITS.maxResults)out.pop();
          break;
        }
      }
    }
    progress('③',`シリーズ固定後の不足スキルを評価中（${out.length}件）`,80);await yieldUI();
  }
  out.sort(rankCandidate);
  return {candidates:out.slice(0,LIMITS.maxResults),estimated:base.candidates.length*weaponPool.length,evaluated:out.length,stopped:performance.now()>=deadline,elapsed:Math.round(performance.now()-started),mode:'seriesWeaponNormal'};
}

function hasWeaponSkillTarget(){return W.targets.some(t=>targetSource(t)==='weapon');}
function isWeaponSkillOnly(){
  return !W.setTargets.length&&!W.groupTargets.length&&W.targets.length>0&&W.targets.every(t=>targetSource(t)==='weapon');
}
async function weaponOnlyCandidates(progress){
  const started=performance.now();
  const matched=[];
  const weapons=W.weapons.filter(w=>!W.weaponKind||w?.kind===W.weaponKind);
  const freeCharm={id:'free-charm',name:'フリー',skills:[],source:null};
  for(const w of weapons){
    const ev=evaluateCombo(w,[],freeCharm);
    if(ev.sat===targetTotal()){
      matched.push({...ev,freeParts:[...PARTS]});
    }
  }
  matched.sort((a,b)=>b.slotScore-a.slotScore||String(a.weapon?.name||'').localeCompare(String(b.weapon?.name||''),'ja'));
  progress('②',`武器スキルを満たす武器／武器装飾品を検索中（${weapons.length.toLocaleString()}件）`,70);
  await yieldUI();
  return {candidates:matched.slice(0,LIMITS.maxResults),estimated:weapons.length,evaluated:weapons.length,stopped:false,elapsed:Math.round(performance.now()-started),mode:'weaponOnly'};
}

function pairScore(w,c){return scoreItem(w,W.targets)+scoreItem(c,W.targets);}
function makeWeaponCharmPairs(){
  const charms=flattenCharms();
  const weaponPool=W.weapons.filter(w=>!W.weaponKind||w?.kind===W.weaponKind).map(w=>({w,score:scoreItem(w,W.targets),slots:slots(w).reduce((s,x)=>s+x,0)})).sort((a,b)=>b.score-a.score||b.slots-a.slots).slice(0,LIMITS.weaponPool).map(x=>x.w);
  const charmPool=charms.map(c=>({c,score:scoreItem(c,W.targets)})).sort((a,b)=>b.score-a.score).slice(0,LIMITS.charmPool).map(x=>x.c);
  const wc=[];for(const w of weaponPool)for(const c of charmPool)wc.push({w,c,s:pairScore(w,c),slots:slots(w).reduce((a,b)=>a+b,0)});
  wc.sort((a,b)=>b.s-a.s||b.slots-a.slots);return wc.slice(0,LIMITS.pairPool);
}
function rankCandidate(a,b){const aFull=a.sat===a.total,bFull=b.sat===b.total;if(aFull!==bFull)return aFull?-1:1;if(a.sat!==b.sat)return b.sat-a.sat;if(a.remaining.length!==b.remaining.length)return a.remaining.length-b.remaining.length;return b.slotScore-a.slotScore;}

async function armorFirstCandidates(progress){
  const started=performance.now();
  const armorStates=armorCandidates();
  const charms=flattenCharms();
  const armorTargetList=armorTargets();
  const fallbackTargets=W.targets.filter(t=>skillCanComeFromWeapon(t));
  const searchTargets=[...armorTargetList,...fallbackTargets.filter(t=>!armorTargetList.some(a=>String(a.id)===String(t.id)))];
  const charmPool=charms.slice().sort((a,b)=>scoreItem(b,searchTargets)-scoreItem(a,searchTargets)||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0)).slice(0,LIMITS.charmPool);
  const weapons=W.weaponKind?W.weapons.filter(w=>w?.kind===W.weaponKind):[];
  const out=[];const total=targetTotal();const deadline=started+LIMITS.maxMilliseconds;
  const freeWeapon={id:'free-weapon',name:'フリー',skills:[],slots:[]};
  const freeCharm={id:'free-charm',name:'フリー',skills:[],source:null};

  for(let ai=0;ai<armorStates.length;ai++){
    if(performance.now()>=deadline)break;
    const armor=armorStates[ai].set;
    let found=false;
    // まず武器を使わず、防具＋護石＋装飾品だけで成立するか確認する。
    for(const charm of charmPool){
      const ev=evaluateCombo(freeWeapon,armor,charm);
      if(ev.sat===total){out.push({...ev,freeParts:collapseFreeArmor(ev).freeParts});found=true;break;}
      if(performance.now()>=deadline)break;
    }
    // 防具側で不足した場合だけ、選択された武器種から武器を再検索する。
    if(!found&&weapons.length){
      const candidates=weapons.filter(w=>searchTargets.some(t=>skillCanComeFromWeapon(t)&&((itemSkills(w).get(norm(t.name))||0)>0)))
        .sort((a,b)=>scoreItem(b,weaponTargets())-scoreItem(a,weaponTargets())||slots(b).reduce((x,y)=>x+y,0)-slots(a).reduce((x,y)=>x+y,0));
      for(const w of candidates){
        for(const charm of charmPool){
          const ev=evaluateCombo(w,armor,charm);
          if(ev.sat===total){out.push({...ev,freeParts:collapseFreeArmor(ev).freeParts});found=true;break;}
          if(performance.now()>=deadline)break;
        }
        if(found||performance.now()>=deadline)break;
      }
    }
    if(out.length>=LIMITS.maxResults)break;
    if(ai%20===0){progress('③',`防具側で充足確認中 ${(ai+1).toLocaleString()} / ${armorStates.length.toLocaleString()}`,65);await yieldUI();}
  }
  out.sort(rankCandidate);
  return {candidates:out.slice(0,LIMITS.maxResults),estimated:armorStates.length,evaluated:armorStates.length,stopped:performance.now()>=deadline,elapsed:Math.round(performance.now()-started),mode:'armorFirst'};
}

async function makeCandidates(progress){
  if(isWeaponSkillOnly()&&!W.targets.some(t=>skillCanComeFromArmor(t))) return weaponOnlyCandidates(progress);
  // シリーズ条件がある場合は、通常スキル検索より先にシリーズ防具を確定する。
  // シリーズ＋武器スキルでは、シリーズを満たした部位を固定し、武器だけを後段で探索する。
  if((W.setTargets.length||W.groupTargets.length) && (W.targets.length||hasWeaponSkillTarget())){
    if(hasWeaponSkillTarget()){
      const hasArmorNormal=W.targets.some(t=>targetSource(t)!=='weapon');
      return hasArmorNormal
        ? seriesWithWeaponAndNormalCandidates(progress)
        : seriesWithWeaponCandidates(progress);
    }
    return seriesWithNormalCandidates(progress);
  }
  if(!W.targets.length && (W.setTargets.length||W.groupTargets.length)) return seriesOnlyCandidates(progress);
  if(W.targets.length && !hasWeaponSkillTarget()) return armorFirstCandidates(progress);
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
function allActiveSkills(c){const m=new Map();const free=new Set(c.freeParts||[]);for(const x of [c.weapon,c.charm])for(const s of (x?.skills||[])){const n=norm(s.skill?.name);if(n)m.set(n,(m.get(n)||0)+(Number(s.level)||0));}for(const a of c.armor)if(!free.has(a?.kind))for(const s of (a?.skills||[])){const n=norm(s.skill?.name);const def=W.skills.find(x=>norm(x.name)===n);if(n&&def?.kind!=='set'&&def?.kind!=='group')m.set(n,(m.get(n)||0)+(Number(s.level)||0));}for(const d of findDecorationObjects(c.decos))for(const s of (d.skills||[])){const n=norm(s.skill?.name);if(n)m.set(n,(m.get(n)||0)+(Number(s.level)||0));}
  const shownArmor=c.armor.filter(a=>!free.has(a?.kind));const set=actualBonusSkills(shownArmor,'set');for(const [n,lv] of set)m.set(n,Math.max(m.get(n)||0,lv));const group=actualBonusSkills(shownArmor,'group');for(const [n,pieces] of group){const sk=W.skills.find(s=>norm(s.name)===n);let lv=0;for(const r of (sk?.ranks||[])){if(Number(r.setPiecesRequired)&&pieces>=Number(r.setPiecesRequired))lv=Math.max(lv,Number(r.level)||0);}if(lv)m.set(n,Math.max(m.get(n)||0,lv));}
  return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ja'));}
function renderAllActiveSkills(c){const list=allActiveSkills(c);return `<details open class="active-skills"><summary>発動スキル（${list.length}種）</summary><div class="skill-list">${list.map(([name,lv])=>`<div class="active-skill-line"><span>${esc(name)} Lv${lv}</span>${MHSkillPopover.button(name,wildsSkillInfo(name))}</div>`).join('')}</div></details>`;}
function candidateActualStats(c){const active=new Map(allActiveSkills(c));let sat=0;for(const t of W.targets)sat+=Math.min(Number(t.level)||0,active.get(norm(t.name))||0);for(const t of W.setTargets)sat+=Math.min(Number(t.level)||0,active.get(norm(t.name))||0);for(const t of W.groupTargets)sat+=Math.min(Number(t.level)||0,active.get(norm(t.name))||0);const remaining=[];for(const t of [...W.targets,...W.setTargets,...W.groupTargets]){const need=Math.max(0,Number(t.level||0)-(active.get(norm(t.name))||0));if(need>0)remaining.push({name:norm(t.name),need});}return {active,sat,total:targetTotal(),remaining};}
function renderResults(cands,meta){
  const r=$('results');
  if(!cands.length){$('status').classList.remove('hidden');$('status').textContent=meta.stopped?'候補なし（探索上限／時間上限に到達。これだけでは「不可能」とは判定しません）':'候補なし（指定条件では充足構成を確認できませんでした）';r.innerHTML='';return;}
  $('status').classList.remove('hidden');
  $('status').textContent=meta.mode==='weaponOnly'?`該当武器 ${cands.length}件（DB ${meta.evaluated.toLocaleString()}件を確認）`:`検索 ${meta.evaluated.toLocaleString()}件を評価${meta.stopped?'（探索上限または時間上限で打ち切り）':''}`;
  if(meta.mode==='weaponOnly'){
    r.innerHTML=cands.map((c,i)=>`<section class="card result"><h3>#${i+1} ${esc(c.weapon?.name||'—')}</h3><div class="grid"><div class="piece"><b>武器スキル</b><div>${[...(c.weapon?.skills||[])].map(s=>`${esc(s.skill?.name||'')} Lv${Number(s.level)||0}`).join(' / ')||'—'}</div></div><div class="piece"><b>武器スロット</b><div>${slots(c.weapon).join(' / ')||'なし'}</div></div></div><div class="small" style="margin-top:10px">防具：フリー　／　護石：フリー</div></section>`).join('');
    return;
  }
  r.innerHTML=cands.map((c,i)=>{const stats=candidateActualStats(c);return `<section class="card result"><h3>#${i+1} 目標充足 ${stats.sat}/${stats.total}</h3><div><b>武器:</b> ${c.weapon?.id==='free-weapon'?'<b>フリー</b>':esc(c.weapon?.name||'—')}</div>${c.charm?.id==='free-charm'?'<div><b>護石:</b> <b>フリー</b></div>':c.charm?.source?`<div><b>護石:</b> ${esc(c.charm.name)}</div>`:'<div><b>護石:</b> なし</div>'}<div>${PARTS.map(part=>{if(c.freeParts?.includes(part))return `<div>${PART_LABEL[part]}: <b>フリー</b></div>`;const a=c.armor.find(x=>x?.kind===part);return `<div>${PART_LABEL[part]}: ${esc(a?.name||'—')}</div>`;}).join('')}</div>${renderAllActiveSkills(c)}<div class="small">装飾品: ${c.decos.length?c.decos.map(d=>`${esc(d.name)}×1`).join(' / '):'なし'}</div>${stats.remaining.length?`<div class="warn">目標不足: ${stats.remaining.map(x=>esc(x.name)+' Lv'+x.need).join(' / ')}`:'<div class="ok">目標スキル充足</div>'}</section>`}).join('');
}

async function loadDB(){try{const [armor,armorSets,weapons,skills,deco,charms]=await Promise.all(['/armor','/armor/sets','/weapons','/skills','/decorations','/charms'].map(fetchJSON));W.armor=armor;W.armorSets=armorSets;W.weapons=weapons;W.skills=skills;W.decorations=deco;W.charms=charms;W.loaded=true;const audit=skillAudit();const normalCount=audit.normal;const weaponOnlyCount=audit.weaponOnly;const setCount=skills.filter(s=>s?.kind==='set').length;const groupCount=skills.filter(s=>s?.kind==='group').length;$('dbVersion').textContent=`Wilds 日本語DB loaded / Armor ${armor.length} / Weapons ${weapons.length} / Skills ${skills.length} / 通常候補 ${normalCount} / 武器限定 ${weaponOnlyCount} / Series ${setCount} / Group ${groupCount} / 未供給 ${audit.orphan.length} / Decorations ${deco.length} / Charms ${charms.length}`;renderPickers();$('solveBtn').disabled=false;$('solveBtn').textContent='検索する';const saved=MHStorage.load('wilds');if(saved?.data)restore(saved.data);}catch(e){$('dbVersion').textContent='Wilds 日本語DBの読み込みに失敗しました';$('status').classList.remove('hidden');$('status').textContent='DB接続エラー: '+e.message;}}
function stateData(){return {targets:W.targets,setTargets:W.setTargets,groupTargets:W.groupTargets,weaponKind:W.weaponKind};}
function save(){MHStorage.save('wilds',stateData());}
function restore(d){W.targets=d.targets||[];W.setTargets=d.setTargets||[];W.groupTargets=d.groupTargets||[];W.weaponKind=d.weaponKind||'';renderTargets();if(W.loaded)renderWeaponKindPicker();}
$('solveBtn').onclick=async()=>{
  if(!W.loaded||(!W.targets.length&&!W.setTargets.length&&!W.groupTargets.length)){$('status').classList.remove('hidden');$('status').textContent='目標スキルを1つ以上選択してください。';return;}
  if(hasWeaponSkillTarget()&&!W.weaponKind){$('status').classList.remove('hidden');$('status').textContent='武器スキルを検索する場合は、武器種を選択してください。';return;}
  if(!W.targets.length&&!W.setTargets.length&&W.groupTargets.length){$('status').classList.remove('hidden');$('status').textContent='グループスキルだけでは検索できません。通常スキルまたはシリーズスキルを1つ以上指定してください。';return;}$('solveBtn').disabled=true;MHSearchUI.start();try{MHSearchUI.step('①','防具候補を枝刈り探索中',15);await yieldUI();const meta=await makeCandidates((n,t,p)=>MHSearchUI.step(n,t,p));renderResults(meta.candidates,meta);save();MHSearchUI.done(meta.stopped?'探索上限に達したため打ち切りました':'検索完了');}catch(e){console.error(e);MHSearchUI.error(e.message||String(e));$('status').classList.remove('hidden');$('status').textContent='検索エラー: '+(e.message||e);}finally{$('solveBtn').disabled=false;}};
$('saveBtn').onclick=save;$('loadBtn').onclick=()=>{const x=MHStorage.load('wilds');if(x?.data)restore(x.data);};$('clearSaveBtn').onclick=()=>{MHStorage.clear('wilds');W.targets=[];W.setTargets=[];W.groupTargets=[];W.weaponKind='';renderTargets();if(W.loaded)renderWeaponKindPicker();};
const _loadDB=loadDB;loadDB=async()=>{await _loadDB();const s=$('weaponKind');if(s)s.onchange=()=>{W.weaponKind=s.value;renderPickers();save();};};
loadDB();
