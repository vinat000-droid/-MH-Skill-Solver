window.MHRSBLibrary=(()=>{
  const BASE='https://cdn.jsdelivr.net/gh/EXXXI/RiseSim@main/src/SimModel/';
  const files={skill:'MHR_SKILL.csv',decorations:'MHR_DECO.csv',head:'MHR_EQUIP_HEAD.csv',chest:'MHR_EQUIP_BODY.csv',arms:'MHR_EQUIP_ARM.csv',waist:'MHR_EQUIP_WST.csv',legs:'MHR_EQUIP_LEG.csv'};
  function parse(text){
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()&&!x.startsWith('//'));
    if(!lines.length)return [];
    const csv=(line)=>{const a=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q}else if(c===','&&!q){a.push(cur);cur=''}else cur+=c}a.push(cur);return a};
    const headers=csv(lines[0]).map(x=>x.replace(/^"|"$/g,'').replace(/^#/,''));
    return lines.slice(1).map(line=>{const a=csv(line),o={};headers.forEach((h,i)=>o[h]=a[i]??'');return o});
  }
  async function get(name){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),20000);try{const r=await fetch(BASE+files[name],{cache:'force-cache',signal:ctl.signal});if(!r.ok)throw new Error(name+' CSV '+r.status);return parse(await r.text())}catch(e){if(e.name==='AbortError')throw new Error(name+' CSV 読み込みタイムアウト');throw e}finally{clearTimeout(timer)}}
  async function all(cb){const keys=Object.keys(files);const out={};const pairs=await Promise.all(keys.map(async k=>[k,await get(k)]));for(const [k,v] of pairs){out[k]=v;cb?.(k,v.length)}return out}
  return{all};
})();
