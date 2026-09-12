const $=id=>document.getElementById(id);
const state={db:null,decos:[],skillsMeta:[]};
const ELEMENTS=[['火','fire'],['水','water'],['氷','ice'],['雷','thunder'],['龍','dragon']];
let selectedElement='fire';
const LABEL={elementalAttack:'属性攻撃強化',elementalWeakness:'弱点特効【属性】',dragonConversion:'龍気変換',furious:'激昂',steelBlessing:'鋼殻の恩恵',dereliction:'伏魔響命',loadShells:'砲弾装填',frostcraft:'冰気錬成',guardUp:'ガード強化',embolden:'煽衛',evadeExtender:'回避距離'};
const Q_COST={elementalWeakness:9,dragonConversion:12,furious:9,steelBlessing:6,loadShells:6,frostcraft:12,guardUp:6,embolden:9,evadeExtender:6};
const Q_FORBIDDEN=new Set(['dereliction','berserk','heavenSent']);
const ELEMENT_KEYS=new Set(['fire','water','ice','thunder','dragon']);
const ELEMENT_SKILL_NAMES=new Set(['火属性攻撃強化','水属性攻撃強化','氷属性攻撃強化','雷属性攻撃強化','龍属性攻撃強化']);
function norm(s){return(s||'').replace(/cite属性/g,'【属性】').replace(/cite蝕/g,'【蝕】').replace(/cite鋭/g,'【鋭】').replace(/cite[^]*/g,'').replace(/ＵＰ/g,'UP').replace(/\s/g,'').trim()}
function keyFor(s){const n=norm(s);return ({'回避距離UP':'evadeExtender','弱点特効【属性】':'elementalWeakness','属性攻撃強化':'elementalAttack','火属性攻撃強化':'elementalAttack_fire','水属性攻撃強化':'elementalAttack_water','氷属性攻撃強化':'elementalAttack_ice','雷属性攻撃強化':'elementalAttack_thunder','龍属性攻撃強化':'elementalAttack_dragon','龍気変換':'dragonConversion','激昂':'furious','鋼殻の恩恵':'steelBlessing','伏魔響命':'dereliction','砲弾装填':'loadShells','冰気錬成':'frostcraft','ガード強化':'guardUp','煽衛':'embolden'})[n]||n}
function targetLabel(k){if(k.startsWith('elementalAttack_'))return `${ELEMENTS.find(x=>`elementalAttack_${x[1]}`===k)?.[0]||'火'}属性攻撃強化`;return LABEL[k]||k}
function skillPairs(row){const out=[];for(let i=1;i<=5;i++){const raw=row['スキル系統'+i],v=+(row['スキル値'+i]||0);if(raw&&v)out.push([keyFor(raw),v])}return out}
function armorRow(row,part){const skills={};skillPairs(row).forEach(([k,v])=>skills[k]=(skills[k]||0)+v);return{part,name:row['名前'],slots:[+row['スロット1']||0,+row['スロット2']||0,+row['スロット3']||0],rarity:+row['レア度']||0,skills}}
function parseSkillLevel(name){const m=String(name||'').match(/Lv(\d+)/);return m?+m[1]:1}
function buildSkillMeta(db){
  const map=new Map();
  (db.skill||[]).forEach(r=>{
    const raw=r['スキル系統']||r['発動スキル'];
    // CSVの「発動スキル」にはLv1/Lv2/Lv3が別行で存在するため、
    // リストには「スキル名」だけを1件として登録する。
    const rawName=norm(raw);
    const display=rawName.replace(/\s*Lv\s*\d+$/i,'').trim();
    if(!display||ELEMENT_SKILL_NAMES.has(display))return;
    if(/^(?:[1-4]スロ|スロット|slot)/i.test(display))return;
    const key=keyFor(display);
    if(!key||key.includes('属性攻撃強化_'))return;
    const maxFromActivation=parseSkillLevel(r['発動スキル']);
    const maxFromRow=+(r['最大Lv']||r['最大レベル']||0);
    const max=Math.max(maxFromActivation,maxFromRow,1);
    const category=r['カテゴリ']||'その他';
    const existing=map.get(key);
    if(!existing||max>existing.max)map.set(key,{key,name:key==='elementalWeakness'?'弱点特効【属性】':display,max,category,cost:+r['コスト']||0});
  });
  return [...map.values()].sort((a,b)=>a.category.localeCompare(b.category,'ja')||a.name.localeCompare(b.name,'ja'));
}
function targets(){ return window.__selectedTargets ? window.__selectedTargets() : {}; }
function merge(a,b){const o={...a};for(const[k,v]of Object.entries(b))o[k]=(o[k]||0)+v;return o}
function decos(db){return db.decorations.map(r=>{const effects=[];for(let i=1;i<=3;i++){const raw=r['スキル系統'+i],v=+(r['スキル値'+i]||0);const k=keyFor(raw);if(k&&v)effects.push([k,v])}return{name:r['名前'],size:+r['スロットサイズ']||0,effects}}).filter(d=>d.size&&d.effects.length)}
function charm(){const effects={};for(let i=1;i<=2;i++){const k=keyFor($(`charmSkill${i}`).value);const v=+$(`charmLv${i}`).value||0;if(k&&v)effects[k]=(effects[k]||0)+v}return{effects,slots:[+$('charmS1').value||0,+$('charmS2').value||0,+$('charmS3').value||0],label:$('charmName').value.trim()||'手持ち護石'} }
function addDecoEffects(rem,d){const n={...rem};for(const[k,v]of d.effects)if(n[k]!=null)n[k]=Math.max(0,n[k]-v);return n}
function fillDecos(slots,need){const usable=state.decos.filter(d=>d.size<=4);const ss=[...slots].filter(Boolean).sort((a,b)=>b-a);const memo=new Set();function dfs(i,rem,out){if(Object.values(rem).every(v=>v<=0))return out;if(i>=ss.length)return null;const key=i+'|'+Object.entries(rem).sort().map(x=>x.join(':')).join(',');if(memo.has(key))return null;const s=ss[i];const cand=usable.filter(d=>d.size<=s&&d.effects.some(([k,v])=>rem[k]>0)).sort((a,b)=>scoreDeco(b,rem)-scoreDeco(a,rem));for(const d of cand){const r=addDecoEffects(rem,d);const z=dfs(i+1,r,[...out,{...d,slot:s}]);if(z)return z}const z=dfs(i+1,rem,out);if(z)return z;memo.add(key);return null}return dfs(0,{...need},[])}
function scoreDeco(d,rem){return d.effects.reduce((n,[k,v])=>n+(rem[k]>0?v:0),0)/(d.size||1)}
function skillNeed(base,t){const n={};for(const k of Object.keys(t))n[k]=Math.max(0,t[k]-(base[k]||0));return n}
function slotsWithWeapon(slots){const w=+$('weaponSlot').value||0;return [...slots,...(w?[w]:[])]}
function quriousPlans(chosen,baseSlots,baseSkills,need,t){
  // 傀異錬成は「防具1部位につき1つのスキル付与候補」を部位ごとに扱う。
  // 同じスキルを複数部位へ付与できる可能性を残し、旧版の
  // 「スキルごとに+1を1回だけ」という誤った制約を撤廃する。
  const targetKeys=Object.keys(need).filter(k=>need[k]>0&&!Q_FORBIDDEN.has(k)&&Q_COST[k]);
  const perPiece=chosen.map((a,i)=>{
    const opts=[{piece:i,skill:null,level:0,cost:0}];
    for(const k of targetKeys) opts.push({piece:i,skill:k,level:1,cost:Q_COST[k]});
    return opts;
  });
  const results=[];
  function rec(i,add,skills,cost){
    if(i===perPiece.length){
      const after=merge(baseSkills,skills);
      const left=skillNeed(after,t);
      const deco=fillDecos(baseSlots,left);
      if(deco) results.push({skills:{...skills},plans:add.filter(x=>x.skill),deco,costUsed:cost});
      return;
    }
    for(const o of perPiece[i]){
      const ns={...skills};
      if(o.skill) ns[o.skill]=(ns[o.skill]||0)+1;
      rec(i+1,o.skill?[...add,o]:add,ns,cost+o.cost);
      if(results.length>=24)return;
    }
  }
  rec(0,[],{},0);
  return results.sort((a,b)=>a.plans.length-b.plans.length||a.costUsed-b.costUsed).slice(0,12);
}
function qCostClass(a){return a.rarity>=10?10:a.rarity===9?12:18}
function augmentFeasibility(armor,plans){return plans.map(p=>{const deficits=p.plans.map(x=>Math.max(0,x.cost-qCostClass(armor)));return {...p,baseCost:qCostClass(armor),deficits}})}
function renderResult(r,t,rank){const q=r.qplan,charm=r.charm,finalSkills=merge(merge(r.armorSkills,charm.effects),q?.skills||{});return `<section class="card result"><h2>候補 #${rank}</h2><div class="grid">${r.chosen.map(a=>`<div class="piece"><b>${a.part}</b> ${escapeHtml(a.name)}<br><span class="small">${a.rarity} / スロット ${a.slots.join('-')}</span></div>`).join('')}</div><div class="piece"><b>護石</b> ${escapeHtml(charm.label)}<br><span class="small">${Object.entries(charm.effects).map(([k,v])=>targetLabel(k)+' +'+v).join(' / ')||'スキルなし'} / スロット ${charm.slots.join('-')}</span></div>${q?.plans?.length?`<h3>傀異錬成プラン</h3>${q.plans.map(x=>`<span class="tag">${targetLabel(x.skill)} +1 / コスト${x.cost}</span>`).join('')}<p class="small">部位ごとのスキル付与候補として探索。費用表示は検索優先度用で、実際の錬成結果の防御・耐性・スロット変動は別途ゲーム内で確認してください。</p>`:''}<h3>装飾品</h3>${r.deco.length?r.deco.map(d=>`<span class="tag">${escapeHtml(d.name)} [${d.slot}]</span>`).join(''):'なし'}<h3>目標スキル</h3>${Object.entries(t).map(([k,v])=>`<span class="tag ${(finalSkills[k]||0)>=v?'oktag':'badtag'}">${targetLabel(k)} ${Math.min(v,finalSkills[k]||0)}/${v}</span>`).join('')}<p class="small">※護石は入力した手持ち護石を固定。傀異錬成は部位単位で候補を探索します。</p></section>`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function solve(){
  if(!state.db)return;const t=targets(),ch=charm(),allowQ=$('allowQurious').checked,parts=[['頭',state.db.head],['胴',state.db.chest],['腕',state.db.arms],['腰',state.db.waist],['脚',state.db.legs]],mr=$('tier').value==='mr',limit=Math.min(+$('limit').value||10,50);
  if(!Object.keys(t).length){render([],t,0,parts.map(([p,rows])=>rows),null,'目標スキルを1つ以上選択してください。');return}
  const pools=parts.map(([p,rows])=>rows.map(r=>armorRow(r,p)).filter(a=>!mr||a.rarity>=8));pools.forEach(p=>p.sort((a,b)=>scoreArmor(b,t)-scoreArmor(a,t)));
  const decoMaxBySkill={};for(const d of state.decos)for(const[k,v]of d.effects)decoMaxBySkill[k]=Math.max(decoMaxBySkill[k]||0,v);
  const impossible=[];for(const k of Object.keys(t)){const armorMax=pools.reduce((sum,p)=>sum+Math.max(0,...p.map(a=>a.skills[k]||0)),0),charmMax=ch.effects[k]||0,qMax=Q_FORBIDDEN.has(k)?0:(allowQ?1:0),decoPossible=decoMaxBySkill[k]||0;if(armorMax+charmMax+qMax+decoPossible<t[k])impossible.push(k)}
  if(impossible.length){render([],t,0,pools,`現条件では達成不能: ${impossible.map(k=>targetLabel(k)).join(' / ')}`);return}
  const remMax=Array.from({length:6},()=>({}));for(let i=4;i>=0;i--){const o={...(remMax[i+1]||{})};for(const k of Object.keys(t))o[k]=(o[k]||0)+Math.max(0,...pools[i].map(a=>a.skills[k]||0));remMax[i]=o}
  let nodes=0,results=[];const memo=new Set(),decoCache=new Map();const slotsKey=xs=>[...xs].sort((a,b)=>b-a).join(',');
  function decoFor(slots,need){const positive=Object.entries(need).filter(([,v])=>v>0);if(!positive.length)return [];const key=slotsKey(slots)+'|'+positive.map(([k,v])=>k+':'+v).join(',');if(decoCache.has(key))return decoCache.get(key);const z=fillDecos(slots,need)||null;decoCache.set(key,z);return z}
  function prune(i,skills){for(const k of Object.keys(t)){const have=skills[k]||0;if(have>=t[k])continue;const optimistic=have+(remMax[i][k]||0)+(allowQ&&!Q_FORBIDDEN.has(k)?5:0);if(optimistic>=t[k])continue;if((decoMaxBySkill[k]||0)>0)continue;return true}return false}
  function dfs(i,chosen,skills,slots){nodes++;if(nodes>250000)return true;if(prune(i,skills))return false;if(i===5){const base=merge(skills,ch.effects),need=skillNeed(base,t),allSlots=slotsWithWeapon([...slots,...ch.slots]),deco=decoFor(allSlots,need);if(deco){results.push({chosen,armorSkills:skills,charm:ch,deco,qplan:null});return results.length>=limit}if(!allowQ)return false;const qp=quriousPlans(chosen,allSlots,base,need,t);if(qp.length){const best=qp[0];results.push({chosen,armorSkills:skills,charm:ch,deco:best.deco,qplan:{...best,baseCost:0,deficits:[]}});return results.length>=limit}return false}
    const stateKey=i+'|'+Object.keys(t).map(k=>Math.min(t[k],skills[k]||0)).join(',')+'|'+slotsKey(slots);if(memo.has(stateKey))return false;memo.add(stateKey);for(const a of pools[i]){const ns=merge(skills,a.skills),nslots=[...slots,...a.slots];if(dfs(i+1,[...chosen,a],ns,nslots))return true}return false}
  dfs(0,[],{},[]);results=dedupe(results).slice(0,limit);render(results,t,nodes,pools,nodes>250000?'モバイル安全上限に到達しました。表示中の候補は確認済みのものです。':null)
}
function scoreArmor(a,t){return Object.entries(t).reduce((n,[k,v])=>n+Math.min(v,a.skills[k]||0)*100,0)+a.slots.reduce((n,x)=>n+x,0)*2+a.rarity}
function dedupe(rs){const s=new Set();return rs.filter(r=>{const k=r.chosen.map(x=>x.name).join('|')+'|'+r.deco.map(x=>x.name).join('|')+'|'+JSON.stringify(r.qplan?.plans||[]);if(s.has(k))return false;s.add(k);return true})}
function render(results,t,nodes,pools,note){$('status').className='card '+(results.length?'ok':'warn');$('status').innerHTML=`<b>${results.length?'完成候補を検出しました':'条件を満たす候補が見つかりません'}</b><p class="small">探索ノード ${nodes.toLocaleString()} / 防具候補 ${pools.map(x=>x.length).join(' / ')} / 装飾品 ${state.decos.length}種 / 傀異錬成 ${$('allowQurious').checked?'許容':'不許可'}</p>${note?`<p class="small">${escapeHtml(note)}</p>`:''}`;$('status').classList.remove('hidden');$('results').innerHTML=results.map((r,i)=>renderResult(r,t,i+1)).join('')||`<section class="card result"><h3>条件を満たす候補がありません</h3><p class="small">検索対象を「全防具」に広げる、護石条件を見直す、または「傀異錬成を許容する」を切り替えて再検索してください。</p></section>`}
function renderSkillPicker(){
  const root=$('skills');root.innerHTML='';
  root.insertAdjacentHTML('beforeend',`<div class="selectedHeader"><div><b>目標スキル</b><span id="selectedCount" class="small"></span></div><button type="button" id="addSkillBtn" class="secondary">＋ スキルを追加</button></div>`);
  root.insertAdjacentHTML('beforeend',`<div id="selectedSkills" class="selectedSkills"></div>`);
  root.insertAdjacentHTML('beforeend',`<div id="skillPickerPanel" class="pickerPanel hidden"><div class="skillTools"><input id="skillSearch" placeholder="スキル名を検索"><select id="skillCategory"><option value="all">カテゴリ：すべて</option>${[...new Set(state.skillsMeta.map(s=>s.category))].filter(Boolean).map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select><button type="button" id="closeSkillPicker" class="secondary">閉じる</button></div><div id="skillList" class="skillList"></div></div>`);
  const selected={};
  const renderSelected=()=>{
    const box=$('selectedSkills');const entries=Object.entries(selected).filter(([,v])=>v>0);
    $('selectedCount').textContent=entries.length?`（${entries.length}個）`:'';
    box.innerHTML=entries.map(([k,v])=>{
      if(k.startsWith('elementalAttack_')) return `<div class="selectedRow"><span class="selectedName">${escapeHtml(targetLabel(k))}</span><select data-selected-key="${escapeHtml(k)}">${Array.from({length:6},(_,i)=>`<option value="${i}" ${i===v?'selected':''}>Lv${i}</option>`).join('')}</select><button type="button" class="removeSkill" data-remove-key="${escapeHtml(k)}">×</button></div>`;
      const meta=state.skillsMeta.find(x=>x.key===k);const max=meta?.max||5;
      return `<div class="selectedRow"><span class="selectedName">${escapeHtml(targetLabel(k))}</span><select data-selected-key="${escapeHtml(k)}">${Array.from({length:max+1},(_,i)=>`<option value="${i}" ${i===v?'selected':''}>Lv${i}</option>`).join('')}</select><button type="button" class="removeSkill" data-remove-key="${escapeHtml(k)}" aria-label="${escapeHtml(targetLabel(k))}を削除">×</button></div>`;
    }).join('')||'<p class="small">目標スキルはまだ選択されていません。</p>';
    box.querySelectorAll('[data-selected-key]').forEach(el=>el.onchange=()=>{const k=el.dataset.selectedKey,v=+el.value||0;if(v)selected[k]=v;else delete selected[k];renderSelected();});
    box.querySelectorAll('[data-remove-key]').forEach(el=>el.onclick=()=>{delete selected[el.dataset.removeKey];renderSelected();});
  };
  const addCandidates=()=>{
    const q=$('skillSearch').value.trim().toLowerCase(),cat=$('skillCategory').value;
    const elemental=[['火','fire'],['水','water'],['氷','ice'],['雷','thunder'],['龍','dragon']].map(([jp,id])=>({key:`elementalAttack_${id}`,name:`${jp}属性攻撃強化`,max:5,category:'属性'}));
    const all=[...elemental,...state.skillsMeta.filter(s=>!s.key.startsWith('elementalAttack_'))];
    const candidates=all.filter(s=>!selected[s.key]&&(!q||s.name.toLowerCase().includes(q))&&(cat==='all'||s.category===cat));
    $('skillList').innerHTML=candidates.slice(0,80).map(s=>`<div class="skillCandidate" data-key="${escapeHtml(s.key)}"><span class="candidateName">${escapeHtml(s.name)}</span><select class="candidateLevel" data-candidate-key="${escapeHtml(s.key)}">${Array.from({length:s.max+1},(_,i)=>`<option value="${i}" ${i===1?'selected':''}>Lv${i}</option>`).join('')}</select><button type="button" class="candidateAdd" data-add-key="${escapeHtml(s.key)}">追加</button></div>`).join('')||'<p class="small">該当するスキルがありません。</p>';
    $('skillList').querySelectorAll('.candidateAdd').forEach(el=>el.onclick=()=>{const s=candidates.find(x=>x.key===el.dataset.addKey);if(!s)return;const sel=$(`skillList`).querySelector(`[data-candidate-key="${CSS.escape(s.key)}"]`);selected[s.key]=sel?Math.max(1,+sel.value||1):1;renderSelected();addCandidates();});
  };
  $('addSkillBtn').onclick=()=>{$('skillPickerPanel').classList.remove('hidden');$('skillSearch').focus();addCandidates();};
  $('closeSkillPicker').onclick=()=>{$('skillPickerPanel').classList.add('hidden');};
  $('skillSearch').oninput=addCandidates;$('skillCategory').onchange=addCandidates;
  renderSelected();
  window.__selectedTargets=()=>Object.fromEntries(Object.entries(selected).filter(([,v])=>v>0));
}
$('solveBtn').onclick=solve;$('resetBtn').onclick=()=>location.reload();
(async()=>{try{const db=await MHRSBLibrary.all((k,n)=>$('loadState').textContent=`${k} 読み込み完了（${n}件）`);state.db=db;state.decos=decos(db);state.skillsMeta=buildSkillMeta(db);renderSkillPicker();$('loadState').textContent=`データベース読み込み完了（スキル ${state.skillsMeta.length}種 / 装飾品 ${state.decos.length}種）`;$('loadState').className='loading ok';$('solveBtn').disabled=false;$('solveBtn').textContent='検索する'}catch(e){$('loadState').textContent='データベース読み込み失敗: '+e.message;$('loadState').className='loading err'}})();
