window.MHStorage={
  key(game){return 'mh_skill_solver_'+game+'_v18';},
  save(game,data){localStorage.setItem(this.key(game),JSON.stringify({savedAt:new Date().toISOString(),data}));},
  load(game){try{const x=JSON.parse(localStorage.getItem(this.key(game)));return x&&x.data?x:null;}catch(e){return null;}},
  clear(game){localStorage.removeItem(this.key(game));}
};
