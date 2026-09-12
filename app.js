const $=id=>document.getElementById(id);
const state={db:null,decos:[],skillsMeta:[]};
const ELEMENTS=[['火','fire'],['水','water'],['氷','ice'],['雷','thunder'],['龍','dragon']];
const LABEL={elementalAttack:'属性攻撃強化',elementalWeakness:'弱点特効【属性】',dragonConversion:'龍気変換',furious:'激昂',steelBlessing:'鋼殻の恩恵',dereliction:'伏魔響命',loadShells:'砲弾装填',frostcraft:'冰気錬成',guardUp:'ガード強化',embolden:'煽衛',evadeExtender:'回避距離'};
const Q_FORBIDDEN=new Set(['dereliction','berserk','heavenSent']);
// --- Legal endgame talisman / Qurious rules (Sunbreak Ver.16) ---
// Talisman ranks/maxima are conservative: only skills whose rank is verified are generated.
const TALISMAN_RULES={
  // name: [rank, maxLv as skill1, maxLv as skill2]
  'dereliction':['S',2,1], 'berserk':['S',2,1], 'frostcraft':['S',3,2], 'dragonConversion':['A',3,2],
  'furious':['A',3,2], 'elementalWeakness':['A',3,2], 'steelBlessing':['C',4,3], 'guardUp':['A',3,2],
  'evadeExtender':['B',3,2], 'embolden':['A',3,2], 'loadShells':['B',2,0],
  'attack':['A',3,2], 'weaknessExploit':['A',3,2], 'criticalBoost':['S',3,2], 'criticalEye':['A',3,2],
  'resuscitate':['A',3,2], 'coalescence':['A',3,2], 'bubbleDance':['B',3,3], 'disasterBlessing':['A',3,2],
  'mailOfHellfire':['A',3,2], 'strife':['A',3,2], 'bloodAwakening':['S',0,0], 'powderMantle':['A',3,2],
  'bloodlust':['A',3,2], 'burst':['A',3,2], 'windMantle':['A',3,2], 'intrepidHeart':['S',2,1],
  'wirebugWhisperer':['C',3,3], 'guard':['A',5,4], 'offensiveGuard':['S',3,2], 'rapidMorph':['A',3,2],
  'artillery':['S',3,2], 'loadShells':['B',2,0], 'tuneUp':['A',2,1], 'evadeWindow':['B',5,4],
  'staminaSurge':['C',3,2], 'staminaThief':['C',3,3], 'slugger':['B',3,2], 'earplugs':['B',5,4],
  'razorSharp':['S',3,2], 'spareShot':['S',3,2], 'ammoUp':['S',3,2], 'rapidFireUp':['S',3,2],
  'piercingShot':['S',3,2], 'spreadUp':['S',3,2], 'normalUp':['S',3,2], 'specialAmmoBoost':['A',2,0],
  'reloadSpeed':['B',3,2], 'recoilDown':['B',3,2], 'ballistics':['A',3,2], 'ballisticsUp':['A',3,2],
  'partbreaker':['B',3,2], 'agitator':['A',4,3], 'resentment':['A',4,3], 'maximumMight':['A',3,2],
  'latentPower':['A',5,4], 'counterstrike':['A',3,2], 'heroics':['A',5,3], 'fortify':['C',1,1],
  'divineBlessing':['C',3,2], 'speedEating':['C',3,3], 'recoveryUp':['C',3,3], 'recoverySpeed':['C',3,3],
  'defense':['C',7,6], 'fireRes':['C',3,3], 'waterRes':['C',3,3], 'iceRes':['C',3,3], 'thunderRes':['C',3,3], 'dragonRes':['C',3,3]
};
// Cost groups from the verified Qurious skill-cost table. Unknown skills are never generated as Qurious targets.
const Q_COST={};
const addQ=(cost,keys)=>keys.split('|').forEach(k=>Q_COST[k]=cost);
addQ(3,'flinchFree|staminaThief|elementalAttack_fire|elementalAttack_water|elementalAttack_ice|elementalAttack_thunder|elementalAttack_dragon|wallRunner|hornMaestro|defense|divineBlessing|recoveryUp|recoverySpeed|windRes|blightRes|poisonRes|paralysisRes|sleepRes|stunRes|mudRes|blastRes|speedSharpening|itemProlonger|wideRange|goodLuck|fortify|hungerRes|leap|diversion|mountingMaster|spiribirdCall|wallRunnerFly');
addQ(6,'loadShells|guard|guardUp|poisonAttack|paralysisAttack|sleepAttack|blastAttack|marathonRunner|constitution|staminaSurge|drawAttackForce|quickSheathe|slugger|specialAmmoBoost|steadiness|speedEating|tremorRes|bubbleDance|evadeWindow|evadeExtender|partbreaker|wallRunner|counterstrike|sedimentFortify|reloadSpeed|recoilDown|mistBlessing|steelBlessing|fireBlessing|embolden|intrepidHeart');
addQ(9,'razorSharp|mushroomancer|mindEye|criticalElement|ballistics|drawAttackSkill|focus|powerProlonger|offensiveGuard|earplugs|heroics|hellfireCloak|wirebugWhisperer|chargeMaster|statusTrigger|affinitySliding|bladescale|elementalWeakness|counterstrike|mailOfHellfire|strife|burst|powderMantle|windMantle|bloodlust');
addQ(12,'handicraft|agitator|peakPerformance|resentment|resuscitate|disasterBlessing|latentPower|maximumMight|goodLuck|burst|rapidMorph|artillery|sneakAttack|bloodrite|bloodlust|statusAttackBoost|dereliction|frostcraft|dragonConversion');
addQ(15,'criticalEye|criticalBoost|weaknessExploit|masterTouch|razorSharp|spareShot|normalUp|piercingShot|spreadUp|ammoUp|rapidFireUp|attack|fortify');
const Q_FORBIDDEN_REAL=new Set(['dereliction','berserk','heavenSent','bowChargePlus','windSerpentPower','thunderSerpentPower','bloodAwakening']);
// Endgame Haki/Enkaku talisman slot patterns. The post-5th-update tables use these fixed combinations.
const HAKI_SLOTS=[[4,1,1],[3,3,1],[2,2,2],[4,1,0],[3,2,1],[3,3,0],[4,0,0],[3,1,1],[3,2,0],[2,2,1],[3,1,0],[2,2,0],[3,0,0],[2,1,0],[1,1,1]];
const rankWeight={S:4,A:3,B:2,C:1};
function talismanRule(k){const direct=TALISMAN_RULES[k]; if(direct)return direct; const jp=targetLabel(k); const verified={
'伏魔響命':['S',2,1],'狂化':['S',2,1],'冰気錬成':['S',3,2],'龍気変換':['A',3,2],'激昂':['A',3,2],'弱点特効【属性】':['A',3,2],'鋼殻の恩恵':['C',4,3],'ガード強化':['A',3,2],'煽衛':['A',3,2],'回避距離UP':['B',3,2],'砲弾装填':['B',2,0],
'火属性攻撃強化':['B',5,3],'水属性攻撃強化':['B',5,3],'氷属性攻撃強化':['B',5,3],'雷属性攻撃強化':['B',5,3],'龍属性攻撃強化':['B',5,3],
'攻撃':['A',3,2],'弱点特効':['A',3,2],'超会心':['S',3,2],'見切り':['S',3,2],'連撃':['A',3,2],'業鎧〖修羅〗':['A',3,2],'奮闘':['A',3,2],'狂竜症〖蝕〗':['A',3,2],'粉塵纏':['A',3,2],'風纏':['A',3,2],'剛心':['S',2,1],'チューンアップ':['A',2,1],'回避性能':['B',5,4],'耳栓':['B',5,4],'ガード性能':['A',5,4]}; return verified[jp]||null}
function legalHakiCharm(effects,slots){
  const ks=Object.keys(effects).filter(k=>effects[k]>0);
  if(ks.length>2)return false;
  const ranks=ks.map(k=>talismanRule(k)?.[0]); if(ranks.some(r=>!r))return false;
  for(let i=0;i<ks.length;i++){
    const r=talismanRule(ks[i]); const max=r[i===0?1:2]; if(effects[ks[i]]>max)return false;
  }
  const maxA=ranks.some(r=>r==='S'||r==='A')?4:3;
  // Haki/Enkaku uses fixed legal slot combinations; any listed pattern is legal.
  return HAKI_SLOTS.some(x=>x.join(',')===slots.join(','));
}
function legalCharmForTarget(effects,slots){return legalHakiCharm(effects,slots)}
function qLegal(k,armor){
  const jp=targetLabel(k); const verifiedCost={'火属性攻撃強化':3,'水属性攻撃強化':3,'氷属性攻撃強化':3,'雷属性攻撃強化':3,'龍属性攻撃強化':3,'砲弾装填':6,'ガード強化':6,'回避距離UP':6,'鋼殻の恩恵':6,'煽衛':6,'弱点特効【属性】':9,'激昂':9,'業鎧〖修羅〗':12,'奮闘':9,'粉塵纏':9,'風纏':9,'狂竜症〖蝕〗':12,'冰気錬成':12,'龍気変換':12,'攻撃':15,'弱点特効':15,'超会心':15,'見切り':15,'連撃':12,'チューンアップ':12,'剛心':6,'回避性能':6,'耳栓':9,'ガード性能':6};
  if(Q_FORBIDDEN_REAL.has(k)||!Object.prototype.hasOwnProperty.call(verifiedCost,jp))return {legal:false,reason:'傀異錬成の対象スキルとして検証済みデータがありません'};
  const rarity=armor.rarity||10; const base=rarity>=10?10:(rarity===9?12:14); const cost=verifiedCost[jp]; const compensation=Math.max(0,cost-base);
  return {legal:true,cost,base,compensation,reason:compensation?`基礎コスト${base} < スキルコスト${cost}：マイナス補正を伴う合法ルート`:'基礎コスト内で付与可能'};
}

const ELEMENT_SKILL_NAMES=new Set(ELEMENTS.map(([jp])=>`${jp}属性攻撃強化`));
function norm(s){return String(s??'').replace(/cite属性/g,'【属性】').replace(/cite[^]*/g,'').replace(/ＵＰ/g,'UP').replace(/\s/g,'').trim()}
function keyFor(s){const n=norm(s);return ({'回避距離UP':'evadeExtender','弱点特効【属性】':'elementalWeakness','属性攻撃強化':'elementalAttack','火属性攻撃強化':'elementalAttack_fire','水属性攻撃強化':'elementalAttack_water','氷属性攻撃強化':'elementalAttack_ice','雷属性攻撃強化':'elementalAttack_thunder','龍属性攻撃強化':'elementalAttack_dragon','龍気変換':'dragonConversion','激昂':'furious','鋼殻の恩恵':'steelBlessing','伏魔響命':'dereliction','砲弾装填':'loadShells','冰気錬成':'frostcraft','ガード強化':'guardUp','煽衛':'embolden'})[n]||n}
function targetLabel(k){if(k.startsWith('elementalAttack_'))return `${ELEMENTS.find(x=>`elementalAttack_${x[1]}`===k)?.[0]||'火'}属性攻撃強化`;return LABEL[k]||k}
function skillPairs(row){const out=[];for(let i=1;i<=5;i++){const raw=row['スキル系統'+i],v=+(row['スキル値'+i]||0);if(raw&&v)out.push([keyFor(raw),v])}return out}
function armorRow(row,part){const skills={};skillPairs(row).forEach(([k,v])=>skills[k]=(skills[k]||0)+v);return{part,name:row['名前']||row['装備名']||'名称不明',slots:[+row['スロット1']||0,+row['スロット2']||0,+row['スロット3']||0],rarity:+row['レア度']||0,skills}}
function parseSkillLevel(name){const m=String(name||'').match(/Lv\s*(\d+)/);return m?+m[1]:1}
function buildSkillMeta(db){const map=new Map();(db.skill||[]).forEach(r=>{const raw=r['スキル系統']||r['発動スキル'];const rawName=norm(raw);const display=rawName.replace(/\s*Lv\s*\d+$/i,'').trim();if(!display||ELEMENT_SKILL_NAMES.has(display)||/^(?:[1-4]スロ|スロット|slot)/i.test(display))return;const key=keyFor(display);if(!key||key.includes('属性攻撃強化_'))return;const max=Math.max(parseSkillLevel(r['発動スキル']),+(r['最大Lv']||r['最大レベル']||0),1);const category=r['カテゴリ']||'その他';const e=map.get(key);if(!e||max>e.max)map.set(key,{key,name:key==='elementalWeakness'?'弱点特効【属性】':display,max,category})});return [...map.values()].sort((a,b)=>a.category.localeCompare(b.category,'ja')||a.name.localeCompare(b.name,'ja'))}
function decos(db){return(db.decorations||[]).map(r=>{const effects=[];for(let i=1;i<=3;i++){const raw=r['スキル系統'+i],v=+(r['スキル値'+i]||0),k=keyFor(raw);if(k&&v)effects.push([k,v])}return{name:r['名前']||r['装飾品名']||'名称不明',size:+r['スロットサイズ']||0,effects}}).filter(d=>d.size&&d.effects.length)}
function charm(){const e={};for(let i=1;i<=2;i++){const k=keyFor($(`charmSkill${i}`)?.value);const v=+($(`charmLv${i}`)?.value||0);if(k&&v)e[k]=v}return{label:$('charmName')?.value?.trim()||'設定中の護石',effects:e,slots:[+$('charmS1')?.value||0,+$('charmS2')?.value||0,+$('charmS3')?.value||0],source:'設定済み護石'}}
function targets(){return window.__selectedTargets?window.__selectedTargets():{}}
function merge(a,b){const o={...a};for(const[k,v]of Object.entries(b||{}))o[k]=(o[k]||0)+v;return o}
function need(base,t){const n={};for(const[k,v]of Object.entries(t))n[k]=Math.max(0,v-(base[k]||0));return n}
function fulfilled(base,t){let got=0,total=0;for(const[k,v]of Object.entries(t)){total+=v;got+=Math.min(v,base[k]||0)}return total?got/total:0}
function slotValue(s){return s>=4?5:s>=3?3:s>=2?2:s>=1?1:0}
function slotScore(slots){return slots.reduce((n,s)=>n+slotValue(s),0)}
function maxSlot(slots){return Math.max(0,...slots)}
function canFitEffects(slots,effects){const ss=slots.filter(Boolean).sort((a,b)=>b-a);const es=[...effects].sort((a,b)=>b.size-a.size);function dfs(i,used){if(i===es.length)return true;for(let j=0;j<ss.length;j++)if(!used[j]&&ss[j]>=es[i].size){used[j]=true;if(dfs(i+1,used))return true;used[j]=false}return false}return dfs(0,[])}
function fillDecos(slots,needMap){
  const remaining={...needMap};const used=[];const ordered=[...state.decos].filter(d=>Object.keys(remaining).some(k=>d.effects.some(([ek])=>ek===k))).sort((a,b)=>{const ra=a.effects.reduce((n,[k,v])=>n+(remaining[k]?Math.min(remaining[k],v)*100:0),0);const rb=b.effects.reduce((n,[k,v])=>n+(remaining[k]?Math.min(remaining[k],v)*100:0),0);return rb-ra||a.size-b.size});
  const slotsLeft=slots.filter(Boolean).sort((a,b)=>b-a).map(x=>({size:x,used:false}));
  for(const d of ordered){let idx=-1;for(let i=0;i<slotsLeft.length;i++){if(!slotsLeft[i].used&&slotsLeft[i].size>=d.size){idx=i;break}}if(idx<0)continue;const useful=d.effects.some(([k,v])=>remaining[k]>0);if(!useful)continue;slotsLeft[idx].used=true;for(const[k,v]of d.effects)if(remaining[k]>0)remaining[k]=Math.max(0,remaining[k]-v);used.push({name:d.name,slot:d.size});if(Object.values(remaining).every(v=>v<=0))break}
  const done=Object.values(remaining).every(v=>v<=0);return{done,remaining,used,openSlots:slotsLeft.filter(x=>!x.used).map(x=>x.size)}
}
function charmCandidates(t,armorSkills){
  const fixed=charm(); const out=[];
  // Empty input means 'no fixed charm'; do not penalize it as an illegal talisman.
  fixed.legal=Object.keys(fixed.effects).length||fixed.slots.some(Boolean)?legalCharmForTarget(fixed.effects,fixed.slots):true; out.push(fixed);
  const n=need(armorSkills,t); const keys=Object.keys(n).filter(k=>n[k]>0).filter(k=>talismanRule(k));
  const candidates=[];
  // One-skill Haki candidates
  for(const k of keys){
    const rule=talismanRule(k); if(!rule)continue;
    const max=rule[1]; for(let lv=Math.min(n[k],max);lv>=1;lv--) for(const sl of HAKI_SLOTS){
      const effects={[k]:lv}; if(legalHakiCharm(effects,sl))candidates.push({label:`錬金候補：${targetLabel(k)} Lv${lv}`,effects,slots:sl,source:'傀異錬金術・覇気',generated:true,legal:true});
    }
  }
  // Two-skill candidates: respect skill1/skill2-specific maxima and any rank combination.
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    const a=keys[i],b=keys[j],ra=talismanRule(a),rb=talismanRule(b); if(!ra||!rb)continue;
    for(const [first,second] of [[a,b],[b,a]]){
      const rf=talismanRule(first),rs=talismanRule(second); const l1=Math.min(n[first],rf[1]),l2=Math.min(n[second],rs[2]);
      for(let x=l1;x>=1;x--)for(let y=l2;y>=1;y--){const effects={[first]:x,[second]:y};for(const sl of HAKI_SLOTS)if(legalHakiCharm(effects,sl))candidates.push({label:`錬金候補：${targetLabel(first)} Lv${x} / ${targetLabel(second)} Lv${y}`,effects,slots:sl,source:'傀異錬金術・覇気',generated:true,legal:true});}
    }
  }
  // Prefer candidates that remove more deficit, then more slots. Cap to keep iPhone search bounded.
  candidates.sort((a,b)=>{const da=Object.values(need(merge(armorSkills,a.effects),t)).reduce((x,y)=>x+y,0),db=Object.values(need(merge(armorSkills,b.effects),t)).reduce((x,y)=>x+y,0);return da-db||slotScore(b.slots)-slotScore(a.slots)});
  out.push(...candidates.slice(0,80));
  return out;
}
function qPlan(armor,t,ch,slots){
  const base=merge(armor.skills,ch.effects); const n=need(base,t); const plans=[]; const qs={};
  const priorities=Object.keys(n).filter(k=>n[k]>0).sort((a,b)=>{
    const ad=state.decos.some(d=>d.effects.some(([k])=>k===a)),bd=state.decos.some(d=>d.effects.some(([k])=>k===b));
    const am=state.decos.filter(d=>d.effects.some(([k])=>k===a)).reduce((m,d)=>Math.min(m,d.size),99),bm=state.decos.filter(d=>d.effects.some(([k])=>k===b)).reduce((m,d)=>Math.min(m,d.size),99);
    return (ad-bd)||(bm-am)||n[b]-n[a]
  });
  const pieces=armor.chosen||[];
  for(const k of priorities){
    let remain=n[k]; if(!remain)continue;
    // Each Qurious skill addition is +1 on one armor piece. The solver only emits it when the skill exists in the real pool.
    for(const piece of pieces){
      if(remain<=0)break; const q=qLegal(k,piece); if(!q.legal)continue;
      plans.push({part:piece.part,skill:k,legal:true,cost:q.cost,baseCost:q.base,compensation:q.compensation,reason:q.reason}); qs[k]=(qs[k]||0)+1; remain--;
    }
  }
  const after=merge(base,qs); const deco=fillDecos([...slots],need(after,t));
  return {plans,skills:qs,deco,complete:deco.done,deficit:deco.remaining};
}
function metric(st,ch,t,dec,q){const fs=merge(st.skills,ch.effects);const completion=fulfilled(fs,t);const slots=slotScore([...st.slots,...ch.slots,...getWeaponSlots()]);const open=maxSlot([...st.slots,...ch.slots,...getWeaponSlots()]);const deficit=Object.values(need(fs,t)).reduce((a,b)=>a+b,0);const qCount=q?.plans?.length||0;const illegalCharm=ch.legal===false?1:0;const legalQ=(q?.plans||[]).filter(x=>x.legal===false).length;return{completion,slots,open,deficit,qCount,illegalCharm,legalQ,score:completion*100000+slots*100+open*10-deficit*20-qCount*3-illegalCharm*1000000-legalQ*1000000}}
function renderResult(r,t,rank){const final=merge(merge(r.armorSkills,r.charm.effects),r.qplan?.skills||{});const needAfter=need(final,t);const metric=r.metric;return `<section class="card result"><h2>候補 #${rank}</h2><div class="metric"><b>スキル充足度 ${Math.round(metric.completion*100)}%</b><span>スロット評価 ${metric.slots}</span><span>最大スロット ④${metric.open>=4?'あり':'なし'}</span><span>不足Lv ${Object.values(needAfter).reduce((a,b)=>a+b,0)}</span></div><div class="grid">${r.chosen.map(a=>`<div class="piece"><b>${a.part}</b> ${escapeHtml(a.name)}<br><span class="small">${a.rarity} / スロット ${a.slots.join('-')}</span></div>`).join('')}</div><div class="piece"><b>護石</b> ${escapeHtml(r.charm.label)}${r.charm.generated?' <span class="tag">錬金候補・合法条件</span>':''}${r.charm.legal===false?' <span class="tag badtag">指定値は錬金条件外</span>':''}<br><span class="small">${Object.entries(r.charm.effects).map(([k,v])=>targetLabel(k)+' +'+v).join(' / ')||'スキルなし'} / スロット ${r.charm.slots.join('-')}</span></div><h3>装飾品</h3>${r.deco.used?.length?r.deco.used.map(d=>`<span class="tag">${escapeHtml(d.name)} [${d.slot}]</span>`).join(''):'なし'}${r.qplan?.plans?.length?`<h3>錬成余地</h3>${r.qplan.plans.map(x=>`<div class="augmentPlan"><span class="tag">${escapeHtml(x.part)}：${escapeHtml(targetLabel(x.skill))} +1</span><span class="small">${escapeHtml(x.reason)}${x.compensation?`（補填必要 ${x.compensation}）`:''}</span></div>`).join('')}`:`<p class="small">傀異錬成予定なし</p>`}<h3>目標スキル</h3>${Object.entries(t).map(([k,v])=>`<span class="tag ${(final[k]||0)>=v?'oktag':'badtag'}">${targetLabel(k)} ${Math.min(v,final[k]||0)}/${v}</span>`).join('')}<p class="small">この順位は「スキル充足度 → スロット構成 → 護石で補える余地 → 錬成負担」の順で評価しています。</p></section>`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function getWeaponSlots(){return[1,2,3].map(i=>Number(document.getElementById('weaponSlot'+i)?.value||0))}
async function solve(){
  if(!state.db)return;
  const btn=$('solveBtn');
  if(btn.dataset.busy==='1') return;
  btn.dataset.busy='1'; btn.disabled=true; btn.textContent='検索中…';
  const status=$('searchProgress');
  const setProgress=(title,detail,pct)=>{status.className='card progress';status.innerHTML=`<b>${title}</b><p class="small">${detail}</p><div class="progressbar"><i style="width:${pct}%"></i></div>`;status.classList.remove('hidden');};
  setProgress('検索中…','① 防具構成を探索しています',5);
  await new Promise(r=>setTimeout(r,30));const t=targets(),allowQ=$('allowQurious').checked;const parts=[['頭',state.db.head],['胴',state.db.chest],['腕',state.db.arms],['腰',state.db.waist],['脚',state.db.legs]];const mr=$('tier').value==='mr';const limit=Math.min(+$('limit').value||10,50);if(!Object.keys(t).length){render([],t,0,[], '目標スキルを1つ以上選択してください。');return}
  const pools=parts.map(([p,rows])=>rows.map(r=>armorRow(r,p)).filter(a=>!mr||a.rarity>=8));
  setProgress('検索中…','② 防具候補を絞り込んでいます',20); await new Promise(r=>setTimeout(r,20));const n=Object.keys(t).length;const cap=n<=1?100:n<=2?140:n<=3?180:n<=4?220:260;pools.forEach(p=>{p.sort((a,b)=>scoreArmor(b,t)-scoreArmor(a,t));if(p.length>cap)p.length=cap});
  const beam=n<=1?120:n<=2?180:n<=3?260:n<=4?360:n<=5?480:600;let states=[{chosen:[],skills:{},slots:[]}],nodes=0;const decoSkills=new Set(state.decos.flatMap(d=>d.effects.map(x=>x[0])));
  for(let i=0;i<5;i++){const next=[];for(const st of states)for(const a of pools[i]){nodes++;next.push({chosen:[...st.chosen,a],skills:merge(st.skills,a.skills),slots:[...st.slots,...a.slots]})}next.sort((a,b)=>stateScore(b,t,decoSkills)-stateScore(a,t,decoSkills));const seen=new Set(),kept=[];for(const st of next){const key=Object.keys(t).map(k=>Math.min(t[k],st.skills[k]||0)).join(',')+'|'+[...st.slots].sort((a,b)=>b-a).join(',');if(seen.has(key))continue;seen.add(key);kept.push(st);if(kept.length>=beam)break}states=kept}
  setProgress('検索中…','③ スキル充足度・スロット構成を評価しています',48); await new Promise(r=>setTimeout(r,20));
  const results=[];for(const st of states){for(const ch of charmCandidates(t,st.skills)){const allSlots=[...st.slots,...ch.slots,...getWeaponSlots()];const d=fillDecos(allSlots,need(merge(st.skills,ch.effects),t));let qp=null;if(allowQ&&!d.done)qp=qPlan({chosen:st.chosen,skills:st.skills},t,ch,allSlots);const finalComplete=ch.legal!==false && (d.done || (qp?.complete && (qp.plans||[]).every(x=>x.legal!==false)));const m=metric(st,ch,t,d,qp);results.push({chosen:st.chosen,armorSkills:st.skills,charm:ch,deco:d,qplan:qp,metric:m,complete:finalComplete})}}
  setProgress('検索中…','④ 護石・傀異錬成の余地を評価しています',78); await new Promise(r=>setTimeout(r,20));
  results.sort((a,b)=>(b.complete-a.complete)||((b.metric.score)-(a.metric.score)));const unique=[];const seen=new Set();for(const r of results){const k=r.chosen.map(x=>x.name).join('|')+'|'+r.charm.label+'|'+JSON.stringify(r.deco.used);if(seen.has(k))continue;seen.add(k);unique.push(r);if(unique.length>=limit)break}const complete=unique.filter(r=>r.complete).length;const note=`「スキル充足度＋スロット構成＋護石・錬成余地」で順位付け。完成 ${complete}件 / 未完成でも最も条件に近い候補を表示。探索ノード ${nodes.toLocaleString()}`;render(unique,t,nodes,pools,note); setProgress('検索完了', results.length ? `⑤ 候補 ${unique.length}件を表示しました` : '⑤ 条件に一致する候補はありませんでした', 100); setTimeout(()=>{status.classList.add('hidden')},900); btn.dataset.busy='0'; btn.disabled=false; btn.textContent='検索する'}
function scoreArmor(a,t){return Object.entries(t).reduce((n,[k,v])=>n+Math.min(v,a.skills[k]||0)*100,0)+slotScore(a.slots)*3+a.rarity}
function stateScore(st,t,decoSkills){let s=fulfilled(st.skills,t)*100000;s+=slotScore(st.slots)*100;for(const[k,v]of Object.entries(need(st.skills,t))){if(!decoSkills.has(k))s-=v*150;else s-=v*10}return s}
function render(results,t,nodes,pools,note){$('status').className='card '+(results.length?'ok':'warn');$('status').innerHTML=`<b>${results.length?'候補を検出しました':'候補なし'}</b><p class="small">探索ノード ${nodes.toLocaleString()} / 防具候補 ${pools.map(x=>x.length).join(' / ')} / 装飾品 ${state.decos.length}種 / 傀異錬成 ${$('allowQurious').checked?'許容':'不許可'}</p>${note?`<p class="small">${escapeHtml(note)}</p>`:''}`;$('status').classList.remove('hidden');$('results').innerHTML=results.map((r,i)=>renderResult(r,t,i+1)).join('')||`<section class="card result"><h3>候補がありません</h3><p class="small">検索対象を広げるか、護石・武器スロット・錬成許可を見直してください。</p></section>`}
function renderSkillPicker(){const root=$('skills');root.innerHTML='<div class="selectedHeader"><div><b>目標スキル</b><span id="selectedCount" class="small"></span></div><button type="button" id="addSkillBtn" class="secondary">＋ スキルを追加</button></div><div id="selectedSkills" class="selectedSkills"></div><div id="skillPickerPanel" class="pickerPanel hidden"><div class="skillTools"><input id="skillSearch" placeholder="スキル名を検索"><select id="skillCategory"><option value="all">カテゴリ：すべて</option></select><button type="button" id="closeSkillPicker" class="secondary">閉じる</button></div><div id="skillList" class="skillList"></div></div>';
  $('skillCategory').innerHTML='<option value="all">カテゴリ：すべて</option>'+[...new Set(state.skillsMeta.map(s=>s.category))].filter(Boolean).map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');const selected={};const renderSelected=()=>{$('selectedCount').textContent=Object.keys(selected).length?`（${Object.keys(selected).length}個）`:'';$('selectedSkills').innerHTML=Object.entries(selected).map(([k,v])=>{const max=k.startsWith('elementalAttack_')?5:(state.skillsMeta.find(x=>x.key===k)?.max||5);return `<div class="selectedRow"><span class="selectedName">${escapeHtml(targetLabel(k))}</span><select data-selected-key="${escapeHtml(k)}">${Array.from({length:max+1},(_,i)=>`<option value="${i}" ${i===v?'selected':''}>Lv${i}</option>`).join('')}</select><button type="button" class="removeSkill" data-remove-key="${escapeHtml(k)}">×</button></div>`}).join('')||'<p class="small">目標スキルはまだ選択されていません。</p>';$('selectedSkills').querySelectorAll('[data-selected-key]').forEach(e=>e.onchange=()=>{const v=+e.value;if(v)selected[e.dataset.selectedKey]=v;else delete selected[e.dataset.selectedKey];renderSelected()});$('selectedSkills').querySelectorAll('[data-remove-key]').forEach(e=>e.onclick=()=>{delete selected[e.dataset.removeKey];renderSelected()})};
  const addCandidates=()=>{const q=$('skillSearch').value.trim().toLowerCase(),cat=$('skillCategory').value;const elemental=ELEMENTS.map(([jp,id])=>({key:`elementalAttack_${id}`,name:`${jp}属性攻撃強化`,max:5,category:'属性'}));const all=[...elemental,...state.skillsMeta.filter(s=>!s.key.startsWith('elementalAttack_'))];const c=all.filter(s=>!selected[s.key]&&(!q||s.name.toLowerCase().includes(q))&&(cat==='all'||s.category===cat));$('skillList').innerHTML=c.slice(0,80).map(s=>`<div class="skillCandidate"><span class="candidateName">${escapeHtml(s.name)}</span><select class="candidateLevel" data-candidate-key="${escapeHtml(s.key)}">${Array.from({length:s.max+1},(_,i)=>`<option value="${i}" ${i===1?'selected':''}>Lv${i}</option>`).join('')}</select><button type="button" class="candidateAdd" data-add-key="${escapeHtml(s.key)}">追加</button></div>`).join('')||'<p class="small">該当するスキルがありません。</p>';$('skillList').querySelectorAll('.candidateAdd').forEach(e=>e.onclick=()=>{const k=e.dataset.addKey;const sel=$(`skillList`).querySelector(`[data-candidate-key="${CSS.escape(k)}"]`);selected[k]=Math.max(1,+(sel?.value||1));renderSelected();addCandidates()})};
  $('addSkillBtn').onclick=()=>{$('skillPickerPanel').classList.remove('hidden');$('skillSearch').focus();addCandidates()};$('closeSkillPicker').onclick=()=>$('skillPickerPanel').classList.add('hidden');$('skillSearch').oninput=addCandidates;$('skillCategory').onchange=addCandidates;renderSelected();window.__selectedTargets=()=>Object.fromEntries(Object.entries(selected).filter(([,v])=>v>0))}
$('solveBtn').onclick=solve;$('resetBtn').onclick=()=>location.reload();
(async()=>{try{const db=await MHRSBLibrary.all((k,n)=>$('loadState').textContent=`${k} 読み込み完了（${n}件）`);state.db=db;state.decos=decos(db);state.skillsMeta=buildSkillMeta(db);renderSkillPicker();$('loadState').textContent=`データベース読み込み完了（スキル ${state.skillsMeta.length}種 / 装飾品 ${state.decos.length}種）`;$('loadState').className='loading ok';$('solveBtn').disabled=false;$('solveBtn').textContent='検索する'}catch(e){$('loadState').textContent='データベース読み込み失敗: '+e.message;$('loadState').className='loading err'}})();
