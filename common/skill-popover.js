(function(){
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function ensure(){
    let m=document.getElementById('skillInfoModal');
    if(m)return m;
    m=document.createElement('div');m.id='skillInfoModal';m.className='skillInfoModal hidden';
    m.innerHTML='<div class="skillInfoPanel" role="dialog" aria-modal="true"><button class="skillInfoClose" aria-label="閉じる">×</button><h3 id="skillInfoTitle"></h3><div id="skillInfoBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)close();});
    m.querySelector('.skillInfoClose').onclick=close;
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    return m;
  }
  function close(){const m=document.getElementById('skillInfoModal');if(m)m.classList.add('hidden');}
  function open(name,levels){
    const m=ensure();
    document.getElementById('skillInfoTitle').textContent=name;
    const rows=(levels||[]).filter(x=>x&&x.effect).map(x=>`<div class="skillInfoLevel"><b>Lv${esc(x.level)}</b><span>${esc(x.effect)}</span></div>`).join('');
    document.getElementById('skillInfoBody').innerHTML=rows||'<p class="small">このスキルの効果データは登録されていません。</p>';
    m.classList.remove('hidden');
  }
  window.MHSkillPopover={open,close,button:(name,levels)=>{const payload=encodeURIComponent(JSON.stringify({name,levels}));return `<button type="button" class="skillInfoBtn" data-skill-info="${payload}" aria-label="${esc(name)}の効果を表示">ⓘ</button>`;}};
  document.addEventListener('click',e=>{const b=e.target instanceof Element ? e.target.closest('.skillInfoBtn[data-skill-info]') : null;if(!b)return;e.preventDefault();e.stopPropagation();try{const raw=b.getAttribute('data-skill-info')||'';const x=JSON.parse(decodeURIComponent(raw));open(x.name,x.levels||[]);}catch(err){console.error('skill info popup error',err);}},true);
})();
