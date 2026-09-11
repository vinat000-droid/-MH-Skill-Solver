window.MHRSBLibrary=(()=>{
  const BASE='https://raw.githubusercontent.com/EXXXI/RiseSim/main/src/SimModel/';
  const files={skill:'MHR_SKILL.csv',decorations:'MHR_DECO.csv',head:'MHR_EQUIP_HEAD.csv',chest:'MHR_EQUIP_BODY.csv',arms:'MHR_EQUIP_ARM.csv',waist:'MHR_EQUIP_WST.csv',legs:'MHR_EQUIP_LEG.csv'};
  function parse(text){
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()&&!x.startsWith('//'));
    if(!lines.length)return [];
    const csv=(line)=>{const a=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q}else if(c===','&&!q){a.push(cur);cur=''}else cur+=c}a.push(cur);return a};
    const headers=csv(lines[0]).map(x=>x.replace(/^"|"$/g,''));
    return lines.slice(1).map(line=>{const a=csv(line),o={};headers.forEach((h,i)=>o[h]=a[i]??'');return o});
  }
  async function get(name){const r=await fetch(BASE+files[name],{cache:'force-cache'});if(!r.ok)throw new Error(name+' CSV '+r.status);return parse(await r.text())}
  async function all(cb){const out={};for(const k of Object.keys(files)){out[k]=await get(k);cb?.(k,out[k].length)}return out}
  return{all};
})();
