window.MHSearchUI={
  mount(){
    if(document.getElementById('searchProgress')) return;
    const d=document.createElement('div');d.id='searchProgress';d.className='card progress hidden';document.body.appendChild(d);
  },
  start(){this.mount();const d=document.getElementById('searchProgress');d.classList.remove('hidden');d.innerHTML='<strong>検索中…</strong><div class="progress-step">① 防具構成を探索中</div><div class="progress-step">② スキル充足度・スロット構成を評価中</div><div class="progress-step">③ 補完候補を評価中</div><div class="progress-bar"><i id="mhProgressFill"></i></div>';},
  step(n,text,pct){const d=document.getElementById('searchProgress');if(!d)return;let s=d.querySelector('.progress-step');if(s)s.textContent=n+' '+text;let f=document.getElementById('mhProgressFill');if(f)f.style.width=pct+'%';},
  done(text='検索完了'){const d=document.getElementById('searchProgress');if(!d)return;d.querySelector('strong').textContent=text;const f=document.getElementById('mhProgressFill');if(f)f.style.width='100%';setTimeout(()=>d.classList.add('hidden'),1200);},
  error(text){const d=document.getElementById('searchProgress');if(!d)return;d.classList.remove('hidden');d.querySelector('strong').textContent='検索エラー';const s=d.querySelector('.progress-step');if(s)s.textContent=text;}
};
