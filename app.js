const $=id=>document.getElementById(id);
const state={db:null,decos:[]};
const TARGETS=[
 ['属性攻撃強化','elementalAttack',5],['弱点特効【属性】','elementalWeakness',3],['龍気変換','dragonConversion',3],['激昂','furious',3],['鋼殻の恩恵','steelBlessing',3],['伏魔響命','dereliction',3],['砲弾装填','loadShells',2],['冰気錬成','frostcraft',3],['ガード強化','guardUp',1],['煽衛','embolden',3],['回避距離','evadeExtender',3]
];
const LABEL=Object.fromEntries(TARGETS.map(x=>[x[1],x[0]]));
const MAX=Object.fromEntries(TARGETS.map(x=>[x[1],x[2]]));
const Q_COST={elementalAttack:9,elementalWeakness:9,dragonConversion:12,furious:9,steelBlessing:6,loadShells:6,frostcraft:12,guardUp:6,embolden:9,evadeExtender:6};
const Q_FORBIDDEN=new Set(['dereliction','berserk','heavenSent']);
function norm(s){return(s||'').replace(/cite[^]*/g,'').replace(/ＵＰ/g,'UP').replace(/\s/g,'').trim()}
function keyFor(s){const n=norm(s);return ({'回避距離UP':'evadeExtender','弱点特効属性':'elementalWeakness','属性攻撃強化':'elementalAttack','龍気変換':'dragonConversion','激昂':'furious','鋼殻の恩恵':'steelBlessing','伏魔響命':'dereliction','砲弾装填':'loadShells','冰気錬成':'frostcraft','ガード強化':'guardUp','煽衛':'embolden'})[n]||n}
function skillPairs(row){const out=[];for(let i=1;i<=5;i++){const raw=row['スキル系統'+i],v=+(row['スキル値'+i]||0);if(raw&&v)out.push([keyFor(raw),v])}return out}
function armorRow(row,part){const skills={};skillPairs(row).forEach(([k,v])=>skills[k]=(skills[k]||0)+v);return{part,name:row['名前'],slots:[+row['スロット1']||0,+row['スロット2']||0,+row['スロット3']||0],rarity:+row['レア度']||0,skills}}
function targets(){const t={};TARGETS.forEach(([n,id,m])=>t[id]=Math.max(0,Math.min(+$(`${id}`).value||0,m)));return t}
function merge(a,b){const o={...a};for(const[k,v]of Object.entries(b))o[k]=(o[k]||0)+v;return o}
function decos(db){return db.decorations.map(r=>{const effects=[];for(let i=1;i<=3;i++){const k=keyFor(r['スキル系統'+i]),v=+(r['スキル値'+i]||0);if(k&&v)effects.push([k,v])}return{name:r['名前'],size:+r['スロットサイズ']||0,effects}}).filter(d=>d.size&&d.effects.length)}
function charm(){const effects={};for(let i=1;i<=2;i++){const k=keyFor($(`charmSkill${i}`).value);const v=+$(`charmLv${i}`).value||0;if(k&&v)effects[k]=(effects[k]||0)+v}return{effects,slots:[+$('charmS1').value||0,+$('charmS2').value||0,+$('charmS3').value||0],label:$('charmName').value.trim()||'手持ち護石'} }
function addDecoEffects(rem,d){const n={...rem};for(const[k,v]of d.effects)if(n[k]!=null)n[k]=Math.max(0,n[k]-v);return n}
function fillDecos(slots,need){const usable=state.decos.filter(d=>d.size<=4);const ss=[...slots].filter(Boolean).sort((a,b)=>b-a);const memo=new Set();function dfs(i,rem,out){if(Object.values(rem).every(v=>v<=0))return out;if(i>=ss.length)return null;const key=i+'|'+Object.entries(rem).sort().map(x=>x.join(':')).join(',');if(memo.has(key))return null;const s=ss[i];const cand=usable.filter(d=>d.size<=s&&d.effects.some(([k,v])=>rem[k]>0)).sort((a,b)=>scoreDeco(b,rem)-scoreDeco(a,rem));for(const d of cand){const r=addDecoEffects(rem,d);const z=dfs(i+1,r,[...out,{...d,slot:s}]);if(z)return z}const z=dfs(i+1,rem,out);if(z)return z;memo.add(key);return null}return dfs(0,{...need},[])}
function scoreDeco(d,rem){return d.effects.reduce((n,[k,v])=>n+(rem[k]>0?v:0),0)/(d.size||1)}
function skillNeed(base,t){const n={};for(const k of Object.keys(t))n[k]=Math.max(0,t[k]-(base[k]||0));return n}
function allTargetMet(base,t){return Object.keys(t).every(k=>(base[k]||0)>=t[k])}
function slotsWithWeapon(slots){const w=+$('weaponSlot').value||0;return [...slots,...(w?[w]:[])]}
function quriousPlans(baseSlots,baseSkills,need,t){
  // Planner searches only the legal positive Qurious skill classes and slot expansion.
  // It deliberately does not invent forbidden skills. Cost feasibility is reported conservatively.
  const candidates=[];
  for(const k of Object.keys(need))if(need[k]>0&&Q_COST[k])candidates.push({skill:k,levels:Math.min(need[k],1),cost:Q_COST[k]});
  const results=[];
  const seen=new Set();
  function rec(i,skills,slots,plans,costUsed){
    const key=i+'|'+JSON.stringify(skills)+'|'+slots.join(',')+'|'+costUsed;if(seen.has(key))return;seen.add(key);
    const left=skillNeed(merge(baseSkills,skills),t);const deco=fillDecos(slots,left);
    if(deco)results.push({skills:{...skills},slots:[...slots],plans:[...plans],deco,costUsed});
    if(i>=candidates.length||plans.length>=3)return;
    for(let j=i;j<candidates.length;j++){
      const c=candidates[j];if((skills[c.skill]||0)>=need[c.skill])continue;
      const ns={...skills,[c.skill]:(skills[c.skill]||0)+1};rec(j+1,ns,slots,[...plans,c],costUsed+c.cost)
    }
  }
  rec(0,{},baseSlots,[],0);
  return results.sort((a,b)=>a.plans.length-b.plans.length||a.costUsed-b.costUsed).slice(0,8);
}
function qCostClass(a){return a.rarity>=10?10:a.rarity===9?12:18}
function augmentFeasibility(armor,plans){
  return plans.map(p=>{const deficits=p.plans.map(x=>Math.max(0,x.cost-qCostClass(armor)));return {...p,baseCost:qCostClass(armor),deficits}})
}
function renderResult(r,t,rank){const q=r.qplan;const charm=r.charm;const finalSkills=merge(merge(r.armorSkills,charm.effects),q?.skills||{});return `<section class="card result"><h2>候補 #${rank}</h2><div class="grid">${r.chosen.map(a=>`<div class="piece"><b>${a.part}</b> ${a.name}<br><span class="small">${a.rarity} / スロット ${a.slots.join('-')}</span></div>`).join('')}</div><div class="piece"><b>護石</b> ${escapeHtml(charm.label)}<br><span class="small">${Object.entries(charm.effects).map(([k,v])=>LABEL[k]?LABEL[k]+' +'+v:'').filter(Boolean).join(' / ')||'スキルなし'} / スロット ${charm.slots.join('-')}</span></div>${q?.plans?.length?`<h3>傀異錬成プラン</h3>${q.plans.map(x=>`<span class="tag">${LABEL[x.skill]||x.skill} +1 / コスト${x.cost}</span>`).join('')}<p class="small">基礎コスト ${q.baseCost}。必要コストとの差分: ${q.deficits.join(', ')||'0'}。差分がある場合は防御・耐性低下やスキル欠損を伴う錬成結果が必要です。</p>`:''}<h3>装飾品</h3>${r.deco.length?r.deco.map(d=>`<span class="tag">${d.name} [${d.slot}]</span>`).join(''):'なし'}<h3>目標スキル</h3>${Object.entries(t).map(([k,v])=>`<span class="tag ${finalSkills[k]>=v?'oktag':'badtag'}">${LABEL[k]} ${Math.min(v,finalSkills[k]||0)}/${v}</span>`).join('')}<p class="small">※護石は「入力した手持ち護石」を固定。傀異錬成は、ゲーム内で抽選可能なスキル種別とコストクラスを使った必要条件として表示します。</p></section>`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function solve(){const t=targets(),ch=charm(),parts=[['頭',state.db.head],['胴',state.db.chest],['腕',state.db.arms],['腰',state.db.waist],['脚',state.db.legs]],mr=$('tier').value==='mr';const pools=parts.map(([p,rows])=>rows.map(r=>armorRow(r,p)).filter(a=>!mr||a.rarity>=8));const limit=+$('limit').value||10;let nodes=0,results=[];
  // Prioritize armor that already carries requested skills and slots.
  pools.forEach(p=>p.sort((a,b)=>scoreArmor(b,t)-scoreArmor(a,t)));
  function dfs(i,chosen,skills,slots){nodes++;if(i===5){const need=skillNeed(merge(skills,ch.effects),t);const allSlots=slotsWithWeapon([...slots,...ch.slots]);const deco=fillDecos(allSlots,need);if(deco){results.push({chosen,armorSkills:skills,charm:ch,deco,qplan:null});return results.length>=limit}const qp=quriousPlans(allSlots,merge(skills,ch.effects),need,t);if(qp.length){const best=augmentFeasibility(chosen[0],qp[0]);results.push({chosen,armorSkills:skills,charm:ch,deco:best.deco,qplan:best});return results.length>=limit}return false}
    for(const a of pools[i]){const ns=merge(skills,a.skills),nslots=[...slots,...a.slots];if(i<4){ // coarse safe upper bound
        let can=true;for(const k of Object.keys(t)){let ub=ns[k]||0;for(let j=i+1;j<5;j++)for(const x of pools[j].slice(0,120))ub=Math.max(ub,ns[k]+(x.skills[k]||0));if(ub+(state.decos.length?4:0)<t[k]){ /* don't prune: decorations and qurious may fill */ }}
        void can;
      }
      if(dfs(i+1,[...chosen,a],ns,nslots))return true;
    }return false;
  }
  dfs(0,[],{},[]);results=dedupe(results).slice(0,limit);render(results,t,nodes,pools)
}
function scoreArmor(a,t){return Object.entries(t).reduce((n,[k,v])=>n+Math.min(v,a.skills[k]||0)*100,0)+a.slots.reduce((n,x)=>n+x,0)*2+a.rarity}
function dedupe(rs){const s=new Set();return rs.filter(r=>{const k=r.chosen.map(x=>x.name).join('|')+'|'+r.deco.map(x=>x.name).join('|')+'|'+JSON.stringify(r.qplan?.plans||[]);if(s.has(k))return false;s.add(k);return true})}
function render(results,t,nodes,pools){$('status').className='card '+(results.length?'ok':'warn');$('status').innerHTML=`<b>${results.length?'完成候補を検出しました':'条件を満たす候補が見つかりません'}</b><p class="small">探索ノード ${nodes.toLocaleString()} / 防具候補 ${pools.map(x=>x.length).join(' / ')} / 装飾品 ${state.decos.length}種</p>`;$('status').classList.remove('hidden');$('results').innerHTML=results.map((r,i)=>renderResult(r,t,i+1)).join('')||`<section class="card result"><h3>検索範囲を広げてください</h3><p class="small">護石条件を緩めるか、傀異錬成許容をONにして再検索してください。</p></section>`}
function makeUI(){TARGETS.forEach(([n,id,m])=>$('skills').insertAdjacentHTML('beforeend',`<div class="skill"><span>${n}</span><input id="${id}" type="number" min="0" max="${m}" value="${m}"></div>`))}
$('solveBtn').onclick=solve;$('resetBtn').onclick=()=>location.reload();makeUI();
(async()=>{try{const db=await MHRSBLibrary.all((k,n)=>$('loadState').textContent=`${k} 読み込み完了（${n}件）`);state.db=db;state.decos=decos(db);$('loadState').textContent=`データベース読み込み完了（装飾品 ${state.decos.length}種）`;$('loadState').className='loading ok';$('solveBtn').disabled=false;$('solveBtn').textContent='検索する'}catch(e){$('loadState').textContent='データベース読み込み失敗: '+e.message;$('loadState').className='loading err'}})();
