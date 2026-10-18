/* jeedom-builder-panel — constructeur de scénarios façon Jeedom pour HA (sur mesure, Loïc) — v3
 * Look Jeedom réel (couleurs core2019, blocs remplis, Open Sans), éditeur d'expression (Commande/Opérateur/Fonction),
 * 3 entrées : Nouveau · Ouvrir une automatisation existante · Coller un YAML → éditer en blocs → réenregistrer.
 * Compile en automatisation HA native ; ce qui n'a pas d'équivalent est conservé verbatim en bloc « YAML brut ».
 */
let HASS = null;
function loadYaml(){return new Promise(r=>{if(window.jsyaml)return r();const s=document.createElement('script');s.src='/jeedom_builder_frontend/js-yaml.min.js';s.onload=()=>r();s.onerror=()=>r();document.head.appendChild(s);});}

const dom = id => (id||'').split('.')[0];
function areasOpts(){const a=HASS&&HASS.areas?Object.values(HASS.areas):[];const o=[['— Toutes les pièces —','__all__']];a.map(x=>[x.name,x.area_id]).sort((p,q)=>p[0].localeCompare(q[0])).forEach(x=>o.push(x));o.push(['(sans pièce)','__none__']);return o;}
function entArea(eid){const e=HASS&&HASS.entities&&HASS.entities[eid];if(!e)return null;if(e.area_id)return e.area_id;const d=e.device_id&&HASS.devices&&HASS.devices[e.device_id];return (d&&d.area_id)||null;}
function fname(eid){const s=HASS&&HASS.states&&HASS.states[eid];return s&&s.attributes&&s.attributes.friendly_name?s.attributes.friendly_name:eid;}
function entsIn(area,domf){if(!HASS||!HASS.states)return [];let ids=Object.keys(HASS.states);if(domf)ids=ids.filter(e=>domf.includes(dom(e)));if(area&&area!=='__all__')ids=ids.filter(e=>area==='__none__'?!entArea(e):entArea(e)===area);return ids.map(e=>[fname(e),e]).sort((p,q)=>p[0].localeCompare(q[0]));}
function svcOpts(eid){const d=dom(eid);const common=[['turn_on','turn_on'],['turn_off','turn_off'],['toggle','toggle']];if(!HASS||!HASS.services||!HASS.services[d])return common;const s=Object.keys(HASS.services[d]).sort();return s.length?s.map(x=>[x,x]):common;}

const TYPES={if:{c:'--scIF',leg:'Si'},action:{c:'--scAction',leg:'Action'},in:{c:'--scIN',leg:'Dans'},for:{c:'--scFOR',leg:'Pour'},variable:{c:'--scAction',leg:'Variable'},raw:{c:'--scCODE',leg:'YAML brut'}};
const FUNCS={'Temps':['time','time_between','time_diff','duration','durationBetween','sun','formatTime'],'Commandes / États':['value','valueDate','collectDate','lastCommunication','stateDuration','lastStateDuration','lastChangeStateDuration','stateChanges'],'Déclencheur':['trigger','triggerValue','triggerChange'],'Statistiques':['average','averageBetween','min','max','median','tendance','statistics','round','odd'],'Scénario / Variables':['variable','scenario','lastScenarioExecution','tag','name'],'Divers':['randText','randomColor','color_gradient','all']};
const OPS=['==','!=','>','<','>=','<=','&&','||','!','(',')','+','-','*','/'];

class JeedomBuilderPanel extends HTMLElement{
  set hass(h){HASS=h;this._hass=h;if(!this._booted){this._booted=true;this._boot();}else this._applyTheme();}
  _applyTheme(){if(this._root){const dk=this._hass&&this._hass.themes&&this._hass.themes.darkMode;this._root.classList.toggle('dark',!!dk);}}
  async _boot(){
    await loadYaml();
    this.innerHTML='';
    const root=document.createElement('div');root.className='jbp';this._root=root;this.appendChild(root);
    root.innerHTML=`<style>${JeedomBuilderPanel.css}</style>
      <div class="bar">
        <div class="ttl">Constructeur de scénarios</div><div class="sp"></div>
        <button class="jb-b" id="jb-new">Nouveau</button>
        <button class="jb-b" id="jb-open">Ouvrir une automatisation</button>
        <button class="jb-b" id="jb-paste">Coller un YAML</button>
        <button class="jb-b ok" id="jb-save">Enregistrer</button>
      </div>
      <div class="stage">
        <section class="sheet">
          <div class="scn-head"><div class="scn-row"><input class="scn-name" id="jb-name" value="Nouveau scénario"><span class="mode">Mode : Provoqué</span></div>
            <div class="trig"><span class="lab">Déclencheurs</span><div id="jb-trigs"></div><button class="addb" id="jb-addtrig" style="--c:var(--scAT)">＋ déclencheur</button></div></div>
          <div class="palette" id="jb-pal"></div>
          <div class="blocks" id="jb-blocks"></div>
        </section>
        <aside class="sheet yaml"><div class="yhead"><h2>Automatisation Home Assistant</h2><span class="tag">YAML natif</span></div><pre id="jb-yaml"></pre></aside>
      </div>
      <div class="status" id="jb-status">Crée un scénario, ou ouvre une automatisation existante pour la modifier en blocs.</div>
      <div class="ovl" id="jb-ovl"><div class="dlg"><div class="dlg-h"><b id="jb-dlg-t"></b><button class="jb-b" id="jb-ovl-x">Fermer</button></div><div id="jb-dlg-body"></div></div></div>`;
    this._applyTheme();
    this.model=[]; this.trigs=[{kind:'state',entity:'',to:'on'}]; this.editingId=null; this._origTriggers=null;
    const pal=root.querySelector('#jb-pal');
    [['if','Si'],['action','Action'],['in','Dans'],['for','Pour'],['variable','Variable'],['raw','YAML brut']].forEach(([t,l])=>{const b=document.createElement('button');b.className='addb';b.style.setProperty('--c','var('+TYPES[t].c+')');b.textContent='＋ '+l;b.onclick=()=>{this.model.push(this.newBlock(t));this.draw();};pal.append(b);});
    root.querySelector('#jb-addtrig').onclick=()=>{this.trigs.push({kind:'state',entity:'',to:'on'});this.draw();};
    root.querySelector('#jb-name').oninput=()=>this.ry();
    root.querySelector('#jb-new').onclick=()=>{this.model=[];this.trigs=[{kind:'state',entity:'',to:'on'}];this.editingId=null;this._origTriggers=null;root.querySelector('#jb-name').value='Nouveau scénario';this.draw();};
    root.querySelector('#jb-open').onclick=()=>this.openExisting();
    root.querySelector('#jb-paste').onclick=()=>this.openPaste();
    root.querySelector('#jb-save').onclick=()=>this.save();
    root.querySelector('#jb-ovl-x').onclick=()=>root.querySelector('#jb-ovl').classList.remove('open');
    root.addEventListener('click',(e)=>{if(!e.target.closest('.expr-wrap'))root.querySelectorAll('.pop.open').forEach(p=>p.classList.remove('open'));});
    this.draw();
  }

  // ---------- champs ----------
  opt(v,l,sel){const o=document.createElement('option');o.value=v;o.textContent=l;if(sel)o.selected=true;return o;}
  cmdRow(node,domf){
    const w=document.createElement('div');w.className='cmd';
    const ra=document.createElement('select');ra.className='fc';areasOpts().forEach(([l,v])=>ra.appendChild(this.opt(v,l,v===node.area)));
    const re=document.createElement('select');re.className='fc';const rc=document.createElement('select');rc.className='fc';
    const fillE=()=>{re.innerHTML='';const list=entsIn(node.area,domf);list.forEach(([l,v])=>re.appendChild(this.opt(v,l.length>30?l.slice(0,30)+'…':l,v===node.entity)));if(!list.some(x=>x[1]===node.entity)){node.entity=list[0]?list[0][1]:'';}fillC();};
    const fillC=()=>{rc.innerHTML='';svcOpts(node.entity).forEach(([l,v])=>rc.appendChild(this.opt(v,l,v===node.cmd)));if(!svcOpts(node.entity).some(x=>x[1]===node.cmd))node.cmd=svcOpts(node.entity)[0][1];};
    fillE();
    ra.onchange=()=>{node.area=ra.value;fillE();this.draw();};
    re.onchange=()=>{node.entity=re.value;fillC();this.draw();};
    rc.onchange=()=>{node.cmd=rc.value;this.draw();};
    if(domf){w.append(ra,re);}else{w.append(ra,re,rc);}
    return w;
  }
  exprField(node,key){
    const wrap=document.createElement('div');wrap.className='expr-wrap';
    const inp=document.createElement('input');inp.className='fc expr';inp.value=node[key]||'';
    const btn=document.createElement('button');btn.className='expr-btn';btn.textContent='＋';
    const pop=document.createElement('div');pop.className='pop';
    pop.innerHTML=`<div class="tabs"><button class="tab on" data-t="cmd">Commande</button><button class="tab" data-t="op">Opérateur</button><button class="tab" data-t="fn">Fonction</button></div><div class="tabc"></div>`;
    wrap.append(inp,btn,pop);
    inp.oninput=()=>{node[key]=inp.value;this.ry();};
    const insert=(txt)=>{const s=inp.selectionStart??inp.value.length,e=inp.selectionEnd??s;inp.value=inp.value.slice(0,s)+txt+inp.value.slice(e);node[key]=inp.value;inp.focus();const np=s+txt.length;inp.setSelectionRange(np,np);this.ry();};
    const tc=pop.querySelector('.tabc');
    const rt=(t)=>{tc.innerHTML='';
      if(t==='op'){const g=document.createElement('div');g.className='ops';OPS.forEach(o=>{const b=document.createElement('button');b.className='op';b.textContent=o;b.onclick=()=>insert(' '+o+' ');g.append(b);});tc.append(g);}
      else if(t==='fn'){const g=document.createElement('div');g.className='fns';Object.entries(FUNCS).forEach(([grp,fns])=>{const h=document.createElement('div');h.className='fgroup';h.textContent=grp;g.append(h);fns.forEach(f=>{const b=document.createElement('button');b.className='fn';b.textContent=f+'()';b.onclick=()=>insert(f+'()');g.append(b);});});tc.append(g);}
      else{const box=document.createElement('div');box.className='cmdins';const tmp={area:'__all__',entity:''};const cm=this.cmdRow(tmp,['']);/*area+entity only via domf hack*/
        // on veut area+entity : réutilise cmdRow sans commande
        box.append(this.areaEntityPicker(tmp));const ins=document.createElement('button');ins.className='ins';ins.textContent='Insérer #[…]#';ins.onclick=()=>{if(tmp.entity)insert('#['+tmp.entity+']# ');};box.append(ins);tc.append(box);}
    };
    pop.querySelectorAll('.tab').forEach(tb=>tb.onclick=(e)=>{e.stopPropagation();pop.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));tb.classList.add('on');rt(tb.dataset.t);});
    btn.onclick=(e)=>{e.stopPropagation();this._root.querySelectorAll('.pop.open').forEach(p=>{if(p!==pop)p.classList.remove('open');});pop.classList.toggle('open');rt('cmd');};
    return wrap;
  }
  areaEntityPicker(tmp){
    const w=document.createElement('div');w.className='cmd';
    const ra=document.createElement('select');ra.className='fc';areasOpts().forEach(([l,v])=>ra.appendChild(this.opt(v,l,v===tmp.area)));
    const re=document.createElement('select');re.className='fc';
    const fill=()=>{re.innerHTML='';const list=entsIn(ra.value,null);list.forEach(([l,v])=>re.appendChild(this.opt(v,l.length>28?l.slice(0,28)+'…':l)));tmp.entity=re.value;};
    ra.onchange=()=>{tmp.area=ra.value;fill();};re.onchange=()=>{tmp.entity=re.value;};fill();
    w.append(ra,re);return w;
  }
  bic(t,title,fn){const b=document.createElement('span');b.className='bic';b.textContent=t;b.title=title;b.onclick=(e)=>{e.stopPropagation();fn();};return b;}

  newBlock(t){
    if(t==='if')return{t:'if',expr:'',then:[],els:[]};
    if(t==='action')return{t:'action',area:'__all__',entity:'',cmd:'turn_on'};
    if(t==='in')return{t:'in',dur:'00:00:30',do:[]};
    if(t==='for')return{t:'for',n:3,do:[]};
    if(t==='variable')return{t:'variable',name:'ma_var',val:''};
    if(t==='raw')return{t:'raw',yaml:'# YAML d’action HA\n'};
  }

  // ---------- rendu ----------
  renderList(list,host){list.forEach((n,i)=>host.appendChild(this.renderBlock(n,list,i)));}
  renderBlock(n,parent,idx){
    const m=TYPES[n.t];const el=document.createElement('div');el.className='blk';el.style.setProperty('--c','var('+m.c+')');
    const h=document.createElement('div');h.className='bhead';
    h.append(Object.assign(document.createElement('span'),{className:'leg',textContent:m.leg}));
    h.append(Object.assign(document.createElement('span'),{className:'sp'}));
    h.append(this.bic('▾','Replier',()=>el.classList.toggle('collapsed')));
    h.append(this.bic('⧉','Dupliquer',()=>{parent.splice(idx+1,0,JSON.parse(JSON.stringify(n)));this.draw();}));
    h.append(this.bic('✕','Supprimer',()=>{parent.splice(idx,1);this.draw();}));
    el.append(h);
    const row=()=>{const r=document.createElement('div');r.className='brow';return r;};
    const lab=(t)=>Object.assign(document.createElement('span'),{className:'lbl',textContent:t});
    if(n.t==='action'){const r=row();r.append(this.cmdRow(n,null));el.append(r);}
    else if(n.t==='if'){const r=row();r.append(lab('Si'),this.exprField(n,'expr'));el.append(r);
      const a=this.sub('Alors');this.renderList(n.then,a.nest);el.append(a.box);
      const b=this.sub('Sinon');this.renderList(n.els,b.nest);el.append(b.box);}
    else if(n.t==='in'){const r=row();const d=document.createElement('input');d.className='fc';d.style.width='110px';d.value=n.dur;d.oninput=()=>{n.dur=d.value;this.ry();};r.append(lab('Dans'),d,lab('(hh:mm:ss) faire'));el.append(r);const s=this.sub('');this.renderList(n.do,s.nest);el.append(s.box);}
    else if(n.t==='for'){const r=row();const c=document.createElement('input');c.className='fc';c.style.width='60px';c.value=n.n;c.oninput=()=>{n.n=c.value;this.ry();};r.append(lab('Pour'),c,lab('fois faire'));el.append(r);const s=this.sub('');this.renderList(n.do,s.nest);el.append(s.box);}
    else if(n.t==='variable'){const r=row();const nm=document.createElement('input');nm.className='fc';nm.style.width='130px';nm.value=n.name;nm.oninput=()=>{n.name=nm.value;this.ry();};r.append(lab('Variable'),nm,lab('='),this.exprField(n,'val'));el.append(r);}
    else if(n.t==='raw'){const r=row();const ta=document.createElement('textarea');ta.className='rawta';ta.value=n.yaml;ta.oninput=()=>{n.yaml=ta.value;this.ry();};r.append(ta);el.append(r);el.append(Object.assign(document.createElement('div'),{className:'lbl',style:'opacity:.8;margin-top:6px',textContent:'Conservé tel quel — réinjecté à l’identique.'}));}
    if(n.t==='if'||n.t==='in'||n.t==='for'){const add=document.createElement('button');add.className='addb';add.style.setProperty('--c','var(--scAction)');add.style.marginTop='8px';add.textContent='＋ action';add.onclick=()=>{(n.then||n.do).push(this.newBlock('action'));this.draw();};el.append(add);}
    return el;
  }
  sub(label){const box=document.createElement('div');box.className='sub';if(label)box.append(Object.assign(document.createElement('div'),{className:'slab',textContent:label}));const nest=document.createElement('div');nest.className='nest';box.append(nest);return{box,nest};}

  renderTrigs(){const host=this._root.querySelector('#jb-trigs');host.innerHTML='';
    this.trigs.forEach((tr,i)=>{const chip=document.createElement('div');chip.className='trigchip';
      if(tr.kind==='state'){chip.append(Object.assign(document.createElement('span'),{className:'lbl',textContent:'Quand'}));chip.append(this.cmdRow(tr,['']));chip.append(Object.assign(document.createElement('span'),{className:'lbl',textContent:'passe à'}));const to=document.createElement('input');to.className='fc';to.style.width='90px';to.value=tr.to||'';to.oninput=()=>{tr.to=to.value;this.ry();};chip.append(to);}
      else if(tr.kind==='time'){chip.append(Object.assign(document.createElement('span'),{className:'lbl',textContent:'À'}));const at=document.createElement('input');at.className='fc';at.style.width='90px';at.value=tr.at||'';at.oninput=()=>{tr.at=at.value;this.ry();};chip.append(at);}
      else{const ta=document.createElement('input');ta.className='fc';ta.style.flex='1';ta.value=tr.yaml||'';ta.readOnly=true;chip.append(Object.assign(document.createElement('span'),{className:'lbl',textContent:'Déclencheur brut'}),ta);}
      const k=document.createElement('select');k.className='fc';[['state','état'],['time','heure']].forEach(([v,l])=>k.appendChild(this.opt(v,l,v===tr.kind)));k.onchange=()=>{tr.kind=k.value;this.draw();};
      if(tr.kind!=='raw')chip.append(k);
      chip.append(this.bic('✕','Supprimer',()=>{this.trigs.splice(i,1);this.draw();}));
      host.append(chip);});
  }

  draw(){if(!this._root)return;this.renderTrigs();const b=this._root.querySelector('#jb-blocks');b.innerHTML='';this.renderList(this.model,b);this.ry();}

  // ---------- compile ----------
  exprTpl(e){if(!e)return 'true';return e.replace(/#\[([^\]]+)\]#/g,(m,id)=>`states('${id}')`);}
  svc(n){const d=dom(n.entity);if(d==='climate'&&['heat','off','cool','auto','dry','fan_only'].includes(n.cmd))return{action:'climate.set_hvac_mode',target:{entity_id:n.entity},data:{hvac_mode:n.cmd}};return {action:d+'.'+n.cmd,target:{entity_id:n.entity}};}
  walk(list,out){list.forEach(n=>{
    if(n.t==='action'){if(n.entity)out.push(this.svc(n));}
    else if(n.t==='in'){out.push({delay:n.dur});this.walk(n.do,out);}
    else if(n.t==='for'){const s=[];this.walk(n.do,s);out.push({repeat:{count:Number(n.n)||1,sequence:s}});}
    else if(n.t==='variable'){out.push({variables:{[n.name]:n.val}});}
    else if(n.t==='if'){const th=[];this.walk(n.then,th);const el=[];this.walk(n.els,el);const node={'if':[{condition:'template',value_template:'{{ '+this.exprTpl(n.expr)+' }}'}],then:th};if(el.length)node['else']=el;out.push(node);}
    else if(n.t==='raw'){try{const o=jsyaml.load(n.yaml);if(Array.isArray(o))o.forEach(x=>x&&out.push(x));else if(o)out.push(o);}catch(e){}}
  });}
  compileTriggers(){return this.trigs.map(tr=>{if(tr.kind==='state'){const t={trigger:'state',entity_id:tr.entity};if(tr.to)t.to=tr.to;return t;}if(tr.kind==='time')return{trigger:'time',at:tr.at};if(tr.kind==='raw'){try{return jsyaml.load(tr.yaml);}catch(e){return null;}}return null;}).filter(Boolean);}
  compile(){const acts=[];this.walk(this.model,acts);const name=this._root.querySelector('#jb-name').value.trim()||'Scénario';
    const id=this.editingId||('jb_'+name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40)||('jb_'+Date.now()));
    return {id,alias:name,description:(this.editingId?'':'Créé par le constructeur de scénarios (Jeedom-like). ')+'Éditable en YAML.',mode:'single',triggers:this.compileTriggers(),conditions:[],actions:acts};}

  esc(s){s=''+s;return /[:#{}\[\],&*?|<>=!%@`"']/.test(s)||s===''?JSON.stringify(s):s;}
  toY(o,ind){const p='  '.repeat(ind);if(Array.isArray(o)){if(!o.length)return p+'[]';return o.map(v=>(v&&typeof v==='object')?p+'- '+this.toY(v,ind+1).trimStart().replace(/\n/g,'\n'+p+'  '):p+'- '+this.esc(v)).join('\n');}if(o&&typeof o==='object')return Object.entries(o).map(([k,v])=>(v&&typeof v==='object')?p+k+':\n'+this.toY(v,ind+1):p+k+': '+this.esc(v)).join('\n');return p+this.esc(o);}
  ry(){if(this._root)this._root.querySelector('#jb-yaml').textContent=this.toY(this.compile(),0);}
  status(msg,kind){const el=this._root.querySelector('#jb-status');el.textContent=msg;el.className='status '+(kind||'');}

  // ---------- import / save ----------
  condToExpr(c){const one=x=>{if(x==null)return 'true';if(typeof x==='string')return x;
    if(x.condition==='template')return (x.value_template||'').replace(/^\s*\{\{\s*/,'').replace(/\s*\}\}\s*$/,'');
    if(x.condition==='state')return `#[${x.entity_id}]# == ${JSON.stringify(x.state)}`;
    if(x.condition==='numeric_state'){let s=`#[${x.entity_id}]#`;if(x.above!=null)s+=' > '+x.above;if(x.below!=null)s+=' < '+x.below;return s;}
    if(x.condition==='time'){const t=[];if(x.after)t.push('time() >= '+JSON.stringify(String(x.after).slice(0,5)));if(x.before)t.push('time() <= '+JSON.stringify(String(x.before).slice(0,5)));return t.join(' && ')||'true';}
    if(x.condition==='and')return '('+(x.conditions||[]).map(one).join(' && ')+')';
    if(x.condition==='or')return '('+(x.conditions||[]).map(one).join(' || ')+')';
    if(x.condition==='not')return '!('+(x.conditions||[]).map(one).join(' && ')+')';
    return JSON.stringify(x);};return Array.isArray(c)?c.map(one).join(' && '):one(c);}
  actToModel(a){if(a==null)return [];
    if(a.delay!=null)return [{t:'in',dur:(typeof a.delay==='string'?a.delay:this.normDelay(a.delay)),do:[]}];
    if(a.repeat&&a.repeat.count!=null)return [{t:'for',n:a.repeat.count,do:this.listToModel(a.repeat.sequence||[])}];
    if(a['if']!=null)return [{t:'if',expr:this.condToExpr(a['if']),then:this.listToModel(a.then||[]),els:this.listToModel(a['else']||[])}];
    if(a.choose){const o=(a.choose||[]).map(c=>({t:'if',expr:this.condToExpr(c.conditions||[]),then:this.listToModel(c.sequence||[]),els:[]}));if(a['default'])o.push({t:'if',expr:'true',then:this.listToModel(a['default']),els:[]});return o;}
    if(a.variables)return Object.entries(a.variables).map(([k,v])=>({t:'variable',name:k,val:typeof v==='string'?v:JSON.stringify(v)}));
    const svc=a.action||a.service;if(svc){let e=(a.target&&a.target.entity_id)||a.entity_id||(a.data&&a.data.entity_id);e=Array.isArray(e)?e[0]:e;const cmd=svc.split('.')[1]||'';const extra=a.data?Object.keys(a.data).filter(k=>k!=='entity_id').length:0;if(e&&cmd&&!extra)return [{t:'action',area:entArea(e)||'__all__',entity:e,cmd}];}
    return [{t:'raw',yaml:jsyaml.dump(a).trim()}];}
  normDelay(d){const z=x=>String(x||0).padStart(2,'0');return z(d.hours)+':'+z(d.minutes)+':'+z(d.seconds);}
  listToModel(l){const out=[];(Array.isArray(l)?l:[l]).forEach(a=>this.actToModel(a).forEach(n=>out.push(n)));return out;}
  importConfig(o){
    if(!o)return;this.editingId=o.id||null;this._root.querySelector('#jb-name').value=o.alias||o.id||'Automatisation';
    const trigs=o.triggers||o.trigger||[];this.trigs=(Array.isArray(trigs)?trigs:[trigs]).filter(Boolean).map(t=>{const k=t.trigger||t.platform;if(k==='state')return{kind:'state',area:entArea(Array.isArray(t.entity_id)?t.entity_id[0]:t.entity_id)||'__all__',entity:Array.isArray(t.entity_id)?t.entity_id[0]:t.entity_id,to:t.to!=null?String(t.to):''};if(k==='time')return{kind:'time',at:t.at};return{kind:'raw',yaml:jsyaml.dump(t).trim()};});
    if(!this.trigs.length)this.trigs=[{kind:'state',entity:'',to:'on'}];
    let acts=this.listToModel(o.actions||o.action||[]);const conds=o.conditions||o.condition;
    if(conds&&(Array.isArray(conds)?conds.length:true))acts=[{t:'if',expr:this.condToExpr(conds),then:acts,els:[]}];
    this.model=acts;this._root.querySelector('#jb-ovl').classList.remove('open');this.draw();
    this.status('Importé : '+(o.alias||o.id)+' — modifie puis Enregistre pour réécrire cette automatisation.','ok');
  }
  openExisting(){
    const body=this._root.querySelector('#jb-dlg-body');this._root.querySelector('#jb-dlg-t').textContent='Ouvrir une automatisation';
    const autos=Object.keys(this._hass.states).filter(e=>e.startsWith('automation.')).map(e=>({e,id:this._hass.states[e].attributes.id,name:this._hass.states[e].attributes.friendly_name||e})).filter(a=>a.id).sort((a,b)=>a.name.localeCompare(b.name));
    body.innerHTML='<div class="autolist"></div>';const list=body.querySelector('.autolist');
    autos.forEach(a=>{const b=document.createElement('button');b.className='autoitem';b.textContent=a.name;b.onclick=async()=>{this.status('Chargement…');try{const cfg=await this._hass.callApi('GET','config/automation/config/'+a.id);this.importConfig(cfg);}catch(err){this.status('Impossible de charger : '+(err.message||err),'err');}};list.append(b);});
    if(!autos.length)list.innerHTML='<div class="lbl" style="color:var(--muted)">Aucune automatisation enregistrée.</div>';
    this._root.querySelector('#jb-ovl').classList.add('open');
  }
  openPaste(){
    this._root.querySelector('#jb-dlg-t').textContent='Coller un YAML';
    this._root.querySelector('#jb-dlg-body').innerHTML='<p class="dlg-note">Colle le YAML d’une automatisation HA. Ce qui n’a pas d’équivalent bloc est conservé en « YAML brut ».</p><textarea id="jb-paste-ta" spellcheck="false"></textarea><div class="dlg-f"><button class="addb" id="jb-paste-go" style="--c:var(--scIN)">Convertir en blocs</button></div>';
    this._root.querySelector('#jb-paste-go').onclick=()=>{let o;try{o=jsyaml.load(this._root.querySelector('#jb-paste-ta').value);}catch(e){this.status('YAML invalide : '+e.message,'err');return;}if(Array.isArray(o))o=o[0];this.importConfig(o);};
    this._root.querySelector('#jb-ovl').classList.add('open');
  }
  async save(){
    const cfg=this.compile();if(!cfg.triggers.length){this.status('Ajoute au moins un déclencheur.','err');return;}
    try{await this._hass.callApi('POST','config/automation/config/'+cfg.id,cfg);await this._hass.callService('automation','reload');this.editingId=cfg.id;this.status('✅ « '+cfg.alias+' » enregistrée — visible dans Réglages → Automatisations, éditable en YAML.','ok');}
    catch(e){this.status('Échec : '+(e.message||e),'err');}
  }
}

JeedomBuilderPanel.css=`
.jbp{--canvas:#e6e8ec;--panel:#f3f4f7;--ink:#2b2b2b;--muted:#6a7180;--line:#cfd4dd;--chrome:#4a6b82;
 --scIF:85,110,130;--scElse:70,95,115;--scAction:155,146,138;--scIN:85,138,72;--scAT:107,137,147;--scFOR:172,136,42;--scCODE:180,80,45;--scCOM:70,70,70;--scSep:35,35,35;
 --form:#fbfcfe;--formTxt:#4b4b4b;--lightTxt:#f0f0f0;
 min-height:100%;background:var(--canvas);color:var(--ink);font-family:"Open Sans",system-ui,sans-serif;font-size:14px;padding:16px 18px 40px}
.jbp.dark{--canvas:#15181d;--panel:#1d2127;--ink:#e7e7e7;--muted:#9099a8;--line:#2c323c;--chrome:#6ea2c0;
 --scIF:65,90,110;--scElse:50,75,95;--scAction:132,120,112;--scIN:75,128,62;--scAT:92,122,132;--scFOR:152,116,22;--scCODE:160,60,25;--scCOM:60,60,60;--scSep:20,20,20;--form:#e6e6e6;--formTxt:#383838;--lightTxt:#ececec}
.jbp *{box-sizing:border-box}
.jbp .bar{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.jbp .ttl{font-size:19px;font-weight:700}.jbp .sp{flex:1 1 auto}
.jbp .jb-b{cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:7px;padding:8px 13px;font:inherit;font-size:12.5px;font-weight:600}
.jbp .jb-b.ok{background:rgb(var(--scIN));color:#fff;border-color:transparent}
.jbp .stage{display:grid;grid-template-columns:1fr 380px;gap:16px;align-items:start}
@media(max-width:960px){.jbp .stage{grid-template-columns:1fr}}
.jbp .sheet{background:var(--panel);border:1px solid var(--line);border-radius:8px}
.jbp .scn-head{padding:13px 15px;border-bottom:1px solid var(--line)}
.jbp .scn-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.jbp .scn-name{font-size:16px;font-weight:700;border:none;background:transparent;color:var(--ink);border-bottom:2px dashed var(--line);padding:3px 2px;min-width:200px}
.jbp .scn-name:focus{outline:none;border-bottom-color:var(--chrome)}
.jbp .mode{font-size:11px;font-weight:600;color:#fff;background:var(--chrome);padding:4px 9px;border-radius:4px}
.jbp .trig{margin-top:11px;display:flex;flex-direction:column;gap:7px}
.jbp .trig .lab{font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
.jbp .trigchip{display:flex;align-items:center;gap:7px;flex-wrap:wrap;background:rgb(var(--scAT));color:var(--lightTxt);border-radius:5px;padding:6px 9px;font-size:13px}
.jbp .palette{display:flex;flex-wrap:wrap;gap:7px;padding:11px 15px;border-bottom:1px solid var(--line)}
.jbp .addb{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12px;font-weight:600;color:var(--lightTxt);cursor:pointer;border:none;border-radius:5px;padding:6px 11px;background:rgb(var(--c))}
.jbp .blocks{padding:13px 15px;display:flex;flex-direction:column;gap:10px}
.jbp .blk{background:rgb(var(--c));border-radius:5px;padding:8px 9px;box-shadow:0 1px 2px rgba(0,0,0,.18)}
.jbp .bhead{display:flex;align-items:center;gap:8px;color:var(--lightTxt)}
.jbp .leg{font-weight:700;font-size:12px;letter-spacing:.05em;text-transform:uppercase}
.jbp .bic{width:24px;height:22px;display:grid;place-items:center;border-radius:4px;color:var(--lightTxt);cursor:pointer;background:rgba(255,255,255,.14);font-size:12px}
.jbp .bic:hover{background:rgba(255,255,255,.26)}
.jbp .brow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:7px}
.jbp .blk.collapsed .brow,.jbp .blk.collapsed .sub{display:none}
.jbp .lbl{color:var(--lightTxt);font-size:12.5px;font-weight:600}
.jbp .sub{margin-top:8px;border-left:4px solid rgb(var(--scSep));border-radius:0 5px 5px 0;padding:8px 8px 8px 10px;background:rgba(0,0,0,.09);display:flex;flex-direction:column;gap:9px}
.jbp .sub .slab{color:var(--lightTxt);font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;opacity:.9}
.jbp .nest{display:flex;flex-direction:column;gap:9px}
.jbp .nest:empty::after{content:"— aucune action —";color:var(--lightTxt);opacity:.6;font-size:12px;font-style:italic}
.jbp .fc{font:inherit;font-size:12.5px;border:1px solid rgba(0,0,0,.18);background:var(--form);color:var(--formTxt);padding:5px 7px;border-radius:4px}
.jbp select.fc{max-width:200px}
.jbp .cmd{display:flex}.jbp .cmd select{border-radius:0}.jbp .cmd select:first-child{border-radius:4px 0 0 4px}.jbp .cmd select:last-child{border-radius:0 4px 4px 0}.jbp .cmd select+select{border-left:none}
.jbp .expr-wrap{display:flex;flex:1 1 240px;min-width:200px;position:relative}
.jbp .expr{flex:1 1 auto;font-family:"IBM Plex Mono",ui-monospace,monospace;border-radius:4px 0 0 4px}
.jbp .expr-btn{border:1px solid rgba(0,0,0,.18);border-left:none;background:var(--form);color:var(--chrome);cursor:pointer;padding:0 10px;border-radius:0 4px 4px 0;font-weight:700}
.jbp .pop{position:absolute;top:calc(100% + 4px);left:0;z-index:40;width:min(430px,86vw);background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 12px 34px rgba(0,0,0,.3);display:none}
.jbp .pop.open{display:block}
.jbp .pop .tabs{display:flex;border-bottom:1px solid var(--line)}
.jbp .pop .tab{flex:1;padding:9px;font-size:12px;font-weight:700;cursor:pointer;color:var(--muted);border:none;background:transparent}
.jbp .pop .tab.on{color:var(--chrome);box-shadow:inset 0 -2px 0 var(--chrome)}
.jbp .pop .tabc{padding:11px;max-height:240px;overflow:auto}
.jbp .ops{display:flex;flex-wrap:wrap;gap:6px}
.jbp .op{font-family:"IBM Plex Mono",monospace;font-size:13px;font-weight:600;border:1px solid var(--line);background:var(--canvas);color:var(--ink);border-radius:5px;padding:6px 10px;cursor:pointer}
.jbp .fns{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.jbp .fn{text-align:left;font-family:"IBM Plex Mono",monospace;font-size:12px;border:1px solid var(--line);background:var(--canvas);color:var(--ink);border-radius:5px;padding:6px 8px;cursor:pointer}
.jbp .fgroup{font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:8px 0 5px;grid-column:1/-1}
.jbp .cmdins{display:flex;flex-direction:column;gap:8px}.jbp .ins{align-self:flex-start;font:inherit;font-size:12px;font-weight:700;color:#fff;background:var(--chrome);border:none;border-radius:5px;padding:6px 12px;cursor:pointer}
.jbp .rawta{width:100%;font-family:"IBM Plex Mono",monospace;font-size:12px;line-height:1.5;color:var(--formTxt);background:var(--form);border:1px solid rgba(0,0,0,.18);border-radius:4px;padding:8px;resize:vertical;min-height:54px}
.jbp .yaml{position:sticky;top:14px}
.jbp .yhead{display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid var(--line)}
.jbp .yhead h2{margin:0;font-size:14px;font-weight:700}.jbp .yhead .tag{margin-left:auto;font-size:11px;font-weight:600;color:#fff;background:rgb(var(--scIN));padding:4px 9px;border-radius:999px}
.jbp pre#jb-yaml{margin:0;padding:13px 14px;font-family:"IBM Plex Mono",monospace;font-size:12px;line-height:1.6;white-space:pre;overflow:auto;max-height:72vh;color:var(--ink)}
.jbp .status{margin-top:12px;font-size:12.5px;color:var(--muted)}.jbp .status.ok{color:rgb(var(--scIN))}.jbp .status.err{color:#d9534f;font-weight:600}
.jbp .ovl{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;padding:18px}
.jbp .ovl.open{display:flex}
.jbp .dlg{width:min(680px,94vw);max-height:86vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.jbp .dlg-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.jbp .dlg-note{color:var(--muted);font-size:12.5px;margin:0 0 10px}
.jbp #jb-paste-ta{width:100%;min-height:260px;font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:var(--formTxt);background:var(--form);border:1px solid rgba(0,0,0,.18);border-radius:6px;padding:10px}
.jbp .dlg-f{display:flex;justify-content:flex-end;margin-top:10px}
.jbp .autolist{display:flex;flex-direction:column;gap:6px}
.jbp .autoitem{text-align:left;font:inherit;font-size:13px;border:1px solid var(--line);background:var(--canvas);color:var(--ink);border-radius:6px;padding:9px 11px;cursor:pointer}
.jbp .autoitem:hover{border-color:var(--chrome);color:var(--chrome)}
`;
customElements.define('jeedom-builder-panel',JeedomBuilderPanel);
console.info('%c JEEDOM-BUILDER %c v3 ','background:#4a6b82;color:#fff;border-radius:3px 0 0 3px','background:#123;color:#fff;border-radius:0 3px 3px 0');
