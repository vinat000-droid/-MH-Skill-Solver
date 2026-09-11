/* MHRSB Skill Solver - data library loader
   Sunbreak 16.0 data source: EXXXI/RiseSim CSV data.
*/
window.MHRSBLibrary = (() => {
  const S = {
    skills: "https://raw.githubusercontent.com/EXXXI/RiseSim/refs/heads/main/src/SimModel/MHR_SKILL.csv",
    decorations: "https://raw.githubusercontent.com/EXXXI/RiseSim/refs/heads/main/src/SimModel/MHR_DECO.csv",
    head: "https://raw.githubusercontent.com/EXXXI/RiseSim/refs/heads/main/src/SimModel/MHR_EQUIP_HEAD.csv",
    chest: "https://raw.githubusercontent.com/EXXXI/RiseSim/refs/heads/main/src/SimModel/MHR_EQUIP_BODY.csv",
    arms: "https://raw.githubusercontent.com/EXXXI/RiseSim/refs/heads/main/src/SimModel/MHR_EQUIP_ARM.csv",
    waist: "https://raw.githubusercontent.com/EXXXI/RiseSim/refs/heads/main/src/SimModel/MHR_EQUIP_WST.csv",
    legs: "https://raw.githubusercontent.com/EXXXI/RiseSim/refs/heads/main/src/SimModel/MHR_EQUIP_LEG.csv"
  };

  function parseCSV(text) {
    const rows=[]; let row=[], cell="", quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){
        if(quoted && text[i+1]==='"'){cell+='"';i++;}
        else quoted=!quoted;
      } else if(c===',' && !quoted){row.push(cell);cell="";}
      else if((c==='\n'||c==='\r') && !quoted){
        if(c==='\r' && text[i+1]==='\n') i++;
        row.push(cell); if(row.some(v=>v!=="")) rows.push(row);
        row=[];cell="";
      } else cell+=c;
    }
    if(cell!==""||row.length){row.push(cell);rows.push(row);}
    if(!rows.length) return [];
    const header=rows[0].map(x=>x.trim());
    return rows.slice(1).map(r=>{
      const o={}; header.forEach((h,i)=>o[h]=(r[i]??"").trim()); return o;
    });
  }

  async function loadOne(key){
    const r=await fetch(S[key],{cache:"no-store"});
    if(!r.ok) throw new Error(key+" data fetch failed: "+r.status);
    return parseCSV(await r.text());
  }

  async function loadAll(){
    const keys=Object.keys(S);
    const out={};
    await Promise.all(keys.map(async k=>out[k]=await loadOne(k)));
    return out;
  }

  return {sources:S, parseCSV, loadOne, loadAll};
})();