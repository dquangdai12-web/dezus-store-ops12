(()=>{
const qs=new URLSearchParams(location.search),mode=qs.get('mode')==='web'?'web':'mobile',STORAGE='dezus_visual_editor_'+mode+'_v1';
const frame=document.getElementById('preview'),device=document.getElementById('device'),pickBtn=document.getElementById('pickBtn');let doc=null,selected=null,picking=false,cfg=load();
const icons=['⌂','🏠','🏢','🏬','🏪','🛍️','🛒','🧾','💳','💵','💰','₫','📈','📉','📊','🎯','🏆','🥇','🥈','🥉','⭐','★','☆','✨','🔥','⚡','💎','👑','✓','✔','☑','✅','✕','✖','❌','＋','−','→','←','↑','↓','↗','↘','›','‹','»','«','⋯','…','☰','≡','⋮','⌄','⌃','⤴','⤵','👤','👥','🧑‍💼','🧑‍🏫','🙋','🪪','🔐','🔑','⚙️','🛠️','🔧','✎','✏️','📝','📌','📍','🔖','📎','📂','📁','🗂️','📄','📋','🗒️','🧮','🔍','🔎','📅','🗓️','⏰','⌚','⏱️','⏳','🕒','🌞','🌙','☀️','🌤️','🌧️','☔','🔔','🔕','📣','📢','⚠️','❗','❕','ℹ️','💡','📦','🧺','🏷️','👕','👗','👖','🧥','👟','📐','📏','🪞','🧹','🧽','🪣','🧴','🧼','🗑️','♻️','🚚','📮','📬','📤','📥','↔','🔄','🔁','💬','💭','☎️','📞','📱','💻','🖥️','📷','📸','🎥','🖼️','🔗','🌐','✉️','📧','📨','💌','❤️','💚','💙','🤍','🖤','👍','👎','👏','🤝','🎓','📚','📖','🧠','🧩','✍️','🔬','🧪','🧭','🗺️','🎨','🖌️','🪄','🧰','🔒','🔓','🛡️','🚨','⛔','🚫','🟢','🟡','🟠','🔴','⚪','⚫','◉','○','●','◇','◆','□','■','△','▲','▽','▼','◀','▶','✦','✧','❖','✪','✩','♡','⊕','⊖','⊙','◎'];
function load(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{"elements":{}}')}catch{return {elements:{}}}}function save(){localStorage.setItem(STORAGE,JSON.stringify(cfg));renderExport()}
function route(){try{return frame.contentWindow.localStorage.getItem('dezus_ops_route')||'dashboard'}catch{return'dashboard'}}
function rootPath(el){const root=el.closest('.mobile-bottom-nav')||el.closest('.main')||el.closest('.sidebar')||doc.body;const rk=root.classList?.contains('mobile-bottom-nav')?'bottom':root.classList?.contains('main')?'main':root.classList?.contains('sidebar')?'side':'body';let n=el,a=[];while(n&&n!==root){let p=n.parentElement;if(!p)break;a.unshift([...p.children].indexOf(n));n=p}return rk+'|'+a.join('.')}
function key(el){return route()+'::'+rootPath(el)}function resolve(k){let [rk,p]=k.split('|'),n=rk==='bottom'?doc.querySelector('.mobile-bottom-nav'):rk==='main'?doc.querySelector('.main'):rk==='side'?doc.querySelector('.sidebar'):doc.body;if(!n)return null;if(p)for(const i of p.split('.')){n=n.children[+i];if(!n)return null}return n}
function apply(el,o){if(!el||!o)return;Object.entries(o.style||{}).forEach(([k,v])=>el.style[k]=v);if(o.hidden)el.style.display='none';if(o.text!==undefined&&!el.querySelector('img,svg'))el.textContent=o.text;if(o.before){let s=el.querySelector(':scope>.ve-before');if(!s){s=doc.createElement('span');s.className='ve-before';el.prepend(s)}s.textContent=o.before;s.style.marginRight='5px'}if(o.after){let s=el.querySelector(':scope>.ve-after');if(!s){s=doc.createElement('span');s.className='ve-after';el.append(s)}s.textContent=o.after;s.style.marginLeft='5px'}if(o.icon!==undefined){if(el.tagName==='IMG'){el.style.display='none';let s=el.parentElement.querySelector(':scope>.ve-icon-replacement');if(!s){s=doc.createElement('span');s.className='ve-icon-replacement';el.parentElement.appendChild(s)}s.textContent=o.icon;s.style.fontSize=(o.iconSize||28)+'px'}else el.textContent=o.icon}}
function applyAll(){if(!doc)return;Object.entries(cfg.elements||{}).forEach(([full,o])=>{if(!full.startsWith(route()+'::'))return;apply(resolve(full.split('::')[1]),o)})}
function setStyle(k,v){if(!selected)return;let x=cfg.elements[key(selected)]||(cfg.elements[key(selected)]={style:{}});x.style=x.style||{};x.style[k]=v;selected.style[k]=v;save();fields()}
function setProp(k,v){if(!selected)return;let x=cfg.elements[key(selected)]||(cfg.elements[key(selected)]={style:{}});x[k]=v;apply(selected,x);save();fields()}
function clearHandles(){if(!doc)return;doc.querySelectorAll('.ve-handle,.ve-move-handle').forEach(x=>x.remove());doc.querySelectorAll('.ve-selected').forEach(x=>x.classList.remove('ve-selected'))}
function select(el){clearHandles();selected=el;if(!el){fields();return}el.classList.add('ve-selected');if(getComputedStyle(el).position==='static')el.style.position='relative';const mh=doc.createElement('span');mh.className='ve-move-handle';mh.textContent='✥';el.appendChild(mh);const rh=doc.createElement('span');rh.className='ve-handle';el.appendChild(rh);bindDrag(mh);bindResize(rh);fields()}
function bindDrag(h){h.onpointerdown=e=>{e.preventDefault();e.stopPropagation();let sx=e.clientX,sy=e.clientY,o=cfg.elements[key(selected)]||(cfg.elements[key(selected)]={style:{}}),tx=parseFloat(o.style?.['--ve-x']||0),ty=parseFloat(o.style?.['--ve-y']||0);h.setPointerCapture(e.pointerId);h.onpointermove=m=>{let x=tx+m.clientX-sx,y=ty+m.clientY-sy;selected.style.transform=`translate(${x}px,${y}px)`;o.style=o.style||{};o.style.transform=`translate(${x}px,${y}px)`;o.style['--ve-x']=String(x);o.style['--ve-y']=String(y)};h.onpointerup=()=>{h.onpointermove=null;save()}}}
function bindResize(h){h.onpointerdown=e=>{e.preventDefault();e.stopPropagation();let r=selected.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;h.setPointerCapture(e.pointerId);h.onpointermove=m=>{let w=Math.max(30,r.width+m.clientX-sx),hh=Math.max(20,r.height+m.clientY-sy);selected.style.width=w+'px';selected.style.height=hh+'px'};h.onpointerup=()=>{setStyle('width',selected.style.width);setStyle('height',selected.style.height);h.onpointermove=null}}}
function moveSibling(dir){if(!selected||!selected.parentElement)return;let p=selected.parentElement;if(dir<0&&selected.previousElementSibling)p.insertBefore(selected,selected.previousElementSibling);if(dir>0&&selected.nextElementSibling)p.insertBefore(selected.nextElementSibling,selected);cfg.elements[key(selected)]=cfg.elements[key(selected)]||{style:{}};cfg.elements[key(selected)].orderHint=dir;save()}
function setupFrame(){doc=frame.contentDocument;doc.documentElement.dataset.veMode=mode;doc.addEventListener('click',e=>{if(!picking)return;if(e.target.closest('.ve-handle,.ve-move-handle'))return;e.preventDefault();e.stopPropagation();picking=false;pickBtn.classList.remove('active');doc.body.classList.remove('ve-pick');select(e.target)},true);new frame.contentWindow.MutationObserver(()=>setTimeout(applyAll,30)).observe(doc.getElementById('app')||doc.body,{subtree:true,childList:true});setTimeout(()=>{applyAll();renderVisibility();renderFull()},300)}
function num(v,d=0){let n=parseFloat(v);return Number.isFinite(n)?n:d}function color(v,f='#172033'){if(!v||v==='transparent'||v==='rgba(0, 0, 0, 0)')return f;if(v.startsWith('#'))return v;let m=v.match(/\d+/g);return m?'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):f}
function fields(){let p=document.querySelector('.ve-pane[data-pane=layout]'),s=document.querySelector('.ve-pane[data-pane=style]');if(!selected){p.innerHTML='<div class="ve-group"><h3>Bố cục</h3><div class="ve-info">Chưa chọn mục. Bấm “🎯 Chọn mục”, rồi chạm vào card/chữ/nút trên preview.</div></div>';s.innerHTML='<div class="ve-group"><h3>Chữ & màu</h3><div class="ve-help">Sau khi chọn mục, các thông số sẽ hiện ở đây.</div></div>';return}let cs=frame.contentWindow.getComputedStyle(selected),r=selected.getBoundingClientRect();p.innerHTML=`<div class="ve-group"><h3>Di chuyển / thứ tự</h3><div class="ve-info">${selected.tagName.toLowerCase()} • ${String(selected.className||'').split(' ').slice(0,3).join('.')}</div><div class="ve-actions" style="margin-top:8px"><button class="ve-btn" id="up">↑ Đưa lên</button><button class="ve-btn" id="down">↓ Đưa xuống</button><button class="ve-btn" id="resetpos">Reset vị trí</button><button class="ve-btn danger" id="hide">Ẩn mục</button></div><div class="ve-help" style="margin-top:7px">Kéo nút ✥ trên phần tử để di chuyển tự do. Kéo ô tím góc phải dưới để phóng to/thu nhỏ trực tiếp.</div></div><div class="ve-group"><h3>Kích thước chính xác</h3><div class="ve-row"><label>Rộng (px)</label><input id="w" type="number" value="${Math.round(r.width)}"></div><div class="ve-row"><label>Cao (px)</label><input id="h" type="number" value="${Math.round(r.height)}"></div><div class="ve-row"><label>Rộng (%)</label><input id="wp" type="range" min="20" max="100" value="${Math.min(100,Math.round(r.width/(selected.parentElement?.getBoundingClientRect().width||r.width)*100))}"></div><div class="ve-actions"><button class="ve-btn" id="autoH">Chiều cao Auto</button><button class="ve-btn" id="fullW">Rộng 100%</button></div></div>`;s.innerHTML=`<div class="ve-group"><h3>Nội dung</h3><div class="ve-row" style="grid-template-columns:1fr"><textarea id="txt">${selected.textContent.trim()}</textarea></div><div class="ve-actions"><button class="ve-btn" id="saveTxt">Lưu chữ</button><button class="ve-btn" id="bold">Đậm</button></div></div><div class="ve-group"><h3>Chữ / khoảng cách / bo góc</h3><div class="ve-row"><label>Cỡ chữ</label><input id="fs" type="number" value="${num(cs.fontSize,14)}"></div><div class="ve-row"><label>Padding</label><input id="pad" type="number" value="${num(cs.paddingTop,0)}"></div><div class="ve-row"><label>Bo góc</label><input id="rad" type="number" value="${num(cs.borderRadius,0)}"></div><div class="ve-row"><label>Màu chữ</label><input id="tc" type="color" value="${color(cs.color)}"></div><div class="ve-row"><label>Màu nền</label><input id="bg" type="color" value="${color(cs.backgroundColor,'#ffffff')}"></div></div>`;document.getElementById('up').onclick=()=>moveSibling(-1);document.getElementById('down').onclick=()=>moveSibling(1);document.getElementById('resetpos').onclick=()=>{setStyle('transform','');setStyle('width','');setStyle('height','')};document.getElementById('hide').onclick=()=>setProp('hidden',true);document.getElementById('w').onchange=e=>setStyle('width',e.target.value+'px');document.getElementById('h').onchange=e=>setStyle('height',e.target.value+'px');document.getElementById('wp').oninput=e=>setStyle('width',e.target.value+'%');document.getElementById('autoH').onclick=()=>setStyle('height','auto');document.getElementById('fullW').onclick=()=>setStyle('width','100%');document.getElementById('saveTxt').onclick=()=>setProp('text',document.getElementById('txt').value);document.getElementById('bold').onclick=()=>setStyle('fontWeight',cs.fontWeight>='700'?'400':'800');document.getElementById('fs').onchange=e=>setStyle('fontSize',e.target.value+'px');document.getElementById('pad').onchange=e=>setStyle('padding',e.target.value+'px');document.getElementById('rad').onchange=e=>setStyle('borderRadius',e.target.value+'px');document.getElementById('tc').oninput=e=>setStyle('color',e.target.value);document.getElementById('bg').oninput=e=>setStyle('backgroundColor',e.target.value)}
function veLabel(el,i){
  if(!el)return 'Mục '+(i+1);
  const heading=el.matches?.('h1,h2,h3,h4')?el:el.querySelector?.('h1,h2,h3,h4,.page-title,.section-title,.label,.nav-label');
  let t=(heading?.textContent||el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'').replace(/\s+/g,' ').trim();
  if(!t){
    const txt=(el.textContent||'').replace(/\s+/g,' ').trim();
    t=txt.slice(0,42);
  }
  if(!t)t='Mục '+(i+1);
  return t.length>48?t.slice(0,48)+'…':t;
}
function visibilityCandidates(){
  if(!doc)return [];
  const arr=[];
  const main=doc.querySelector('.main');
  if(main){
    [...main.children].forEach(el=>{
      if(el.matches('script,style'))return;
      arr.push(el);
    });
  }
  const bottom=doc.querySelector('.mobile-bottom-nav');
  if(bottom)arr.push(bottom);
  const sidebar=doc.querySelector('.sidebar');
  if(mode==='web'&&sidebar)arr.push(sidebar);
  return [...new Set(arr)];
}
function renderVisibility(){
  const p=document.querySelector('.ve-pane[data-pane=visibility]');if(!p)return;
  if(!doc){p.innerHTML='<div class="ve-group"><h3>Ẩn / Hiện</h3><div class="ve-help">Preview đang tải...</div></div>';return}
  const items=visibilityCandidates();
  const rows=items.map((el,i)=>{
    const k=key(el),o=cfg.elements[k]||{},hidden=!!o.hidden||el.style.display==='none';
    return `<label class="ve-vis-item"><input type="checkbox" data-vis-key="${encodeURIComponent(k)}" ${hidden?'':'checked'}><span><b>${veLabel(el,i)}</b><small>${el.className?String(el.className).split(' ').slice(0,3).join(' · '):el.tagName.toLowerCase()}</small></span></label>`
  }).join('');
  p.innerHTML=`<div class="ve-group"><h3>Ẩn / Hiện nhanh</h3><div class="ve-help">Bỏ tick để ẩn cả khối. Tick lại để hiện. Danh sách áp dụng riêng cho ${mode==='mobile'?'Mobile':'Web'} và màn hình đang mở.</div><div class="ve-actions" style="margin:9px 0"><button class="ve-btn" id="veShowAll">Hiện tất cả</button><button class="ve-btn danger" id="veHideSelected">Ẩn mục đang chọn</button><button class="ve-btn" id="veRefreshVis">↻ Làm mới danh sách</button></div><div class="ve-vis-list">${rows||'<div class="ve-help">Không tìm thấy khối nào trên màn hình này.</div>'}</div></div>`;
  p.querySelectorAll('[data-vis-key]').forEach(ch=>ch.onchange=()=>{
    const full=decodeURIComponent(ch.dataset.visKey),el=resolve(full.split('::')[1]);
    cfg.elements[full]=cfg.elements[full]||{style:{}};
    cfg.elements[full].hidden=!ch.checked;
    if(el)el.style.display=ch.checked?'':'none';
    save();
  });
  document.getElementById('veShowAll').onclick=()=>{
    items.forEach(el=>{const k=key(el);cfg.elements[k]=cfg.elements[k]||{style:{}};cfg.elements[k].hidden=false;el.style.display=''});save();renderVisibility();
  };
  document.getElementById('veHideSelected').onclick=()=>{
    if(!selected)return alert('Hãy chọn một mục trên preview trước.');
    setProp('hidden',true);renderVisibility();
  };
  document.getElementById('veRefreshVis').onclick=renderVisibility;
}

function fullCandidates(){
  if(!doc)return [];
  const root=doc.querySelector('.main')||doc.body;
  const sels='section,.card,.kpi,.hero-card,.overview-leaderboard-card,.overview-violations-card,.premium-rank-card,.table-wrap,table,form,.toolbar,.section-title,.page-title,.field,.btn,.nav-btn,.mobile-bottom-nav,.activity-item,.task-card,.task-item,.schedule-card,.violation-card,.rank-card';
  const arr=[...root.querySelectorAll(sels)];
  if(mode==='web'){const side=doc.querySelector('.sidebar');if(side)arr.unshift(side)}
  const bottom=doc.querySelector('.mobile-bottom-nav');if(bottom)arr.push(bottom);
  return [...new Set(arr)].filter(el=>!el.closest('.ve-handle,.ve-move-handle'));
}
function fullObj(el){const k=key(el);cfg.elements[k]=cfg.elements[k]||{style:{}};cfg.elements[k].style=cfg.elements[k].style||{};return cfg.elements[k]}
function fullApplySelected(prop,val){
  const checks=[...document.querySelectorAll('.ve-full-check:checked')];
  if(!checks.length&&selected){setStyle(prop,val);return}
  checks.forEach(ch=>{const full=decodeURIComponent(ch.dataset.key),el=resolve(full.split('::')[1]);if(!el)return;const o=cfg.elements[full]||(cfg.elements[full]={style:{}});o.style=o.style||{};o.style[prop]=val;el.style[prop]=val});save();
}
function fullPropSelected(prop,val){
  const checks=[...document.querySelectorAll('.ve-full-check:checked')];
  if(!checks.length&&selected){setProp(prop,val);return}
  checks.forEach(ch=>{const full=decodeURIComponent(ch.dataset.key),el=resolve(full.split('::')[1]);if(!el)return;const o=cfg.elements[full]||(cfg.elements[full]={style:{}});o[prop]=val;apply(el,o)});save();renderFull();
}
function renderFull(){
  const p=document.querySelector('.ve-pane[data-pane=full]');if(!p)return;
  if(!doc){p.innerHTML='<div class="ve-group"><h3>FULL CONTROL</h3><div class="ve-help">Preview đang tải...</div></div>';return}
  const items=fullCandidates();
  const rows=items.map((el,i)=>{const k=key(el),o=cfg.elements[k]||{},hidden=!!o.hidden||el.style.display==='none';return `<div class="ve-full-item"><input class="ve-full-check" type="checkbox" data-key="${encodeURIComponent(k)}"><span><b>${veLabel(el,i)}</b><small>${String(el.className||el.tagName).split(' ').slice(0,4).join(' · ')}</small></span><button class="ve-mini ve-full-pick" data-key="${encodeURIComponent(k)}">Chọn</button></div>`}).join('');
  p.innerHTML=`<div class="ve-group"><h3>FULL CONTROL – tất cả mục</h3><div class="ve-help">Tick nhiều mục để chỉnh hàng loạt. Không tick mục nào thì các nút bên dưới áp dụng cho mục đang chọn trên preview.</div><div class="ve-actions" style="margin:8px 0"><button class="ve-btn" id="fcAll">Chọn tất cả</button><button class="ve-btn" id="fcNone">Bỏ chọn</button><button class="ve-btn danger" id="fcHide">Ẩn</button><button class="ve-btn" id="fcShow">Hiện</button></div><div class="ve-full-list">${rows}</div></div>
  <div class="ve-group"><h3>Kích thước / khoảng cách</h3><div class="ve-full-grid three"><label>Rộng<input id="fcW" placeholder="100% / 320px"></label><label>Cao<input id="fcH" placeholder="auto / 120px"></label><label>Cỡ chữ<input id="fcFs" type="number" placeholder="14"></label><label>Padding<input id="fcPad" type="number" placeholder="12"></label><label>Margin<input id="fcMar" type="number" placeholder="0"></label><label>Gap<input id="fcGap" type="number" placeholder="10"></label><label>Bo góc<input id="fcRad" type="number" placeholder="16"></label><label>Viền<input id="fcBorder" placeholder="1px solid #ddd"></label><label>Độ đậm<select id="fcWeight"><option value="">--</option><option value="400">400</option><option value="600">600</option><option value="700">700</option><option value="800">800</option><option value="900">900</option></select></label></div><div class="ve-chiprow" style="margin-top:8px"><button data-cols="1">1 cột</button><button data-cols="2">2 cột</button><button data-cols="3">3 cột</button><button data-cols="4">4 cột</button><button id="fcAuto">Auto width/height</button></div></div>
  <div class="ve-group"><h3>Màu / căn chỉnh</h3><div class="ve-full-grid"><label>Màu chữ<input id="fcColor" type="color" value="#172033"></label><label>Màu nền<input id="fcBg" type="color" value="#ffffff"></label><label>Căn chữ<select id="fcAlign"><option value="">--</option><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label><label>Căn items<select id="fcItems"><option value="">--</option><option value="flex-start">Đầu</option><option value="center">Giữa</option><option value="flex-end">Cuối</option><option value="stretch">Kéo đầy</option></select></label></div></div>
  <div class="ve-group"><h3>Nội dung / icon / thao tác</h3><textarea id="fcText" placeholder="Nội dung mới cho mục đang chọn"></textarea><div class="ve-actions" style="margin-top:7px"><button class="ve-btn" id="fcTextBtn">Đổi nội dung</button><button class="ve-btn" id="fcTop">Đưa lên đầu</button><button class="ve-btn" id="fcBottom">Đưa xuống cuối</button><button class="ve-btn danger" id="fcReset">Reset mục đã tick</button></div><div class="ve-batch-note">Thư viện icon đầy đủ nằm ở tab Icon. Bạn có thể chọn một mục trong danh sách rồi qua tab Icon để thay/thêm/xóa icon.</div></div>`;
  document.querySelectorAll('.ve-full-pick').forEach(b=>b.onclick=()=>{const full=decodeURIComponent(b.dataset.key),el=resolve(full.split('::')[1]);select(el);document.querySelector('.ve-tab[data-pane=layout]').click()});
  document.getElementById('fcAll').onclick=()=>document.querySelectorAll('.ve-full-check').forEach(x=>x.checked=true);
  document.getElementById('fcNone').onclick=()=>document.querySelectorAll('.ve-full-check').forEach(x=>x.checked=false);
  document.getElementById('fcHide').onclick=()=>fullPropSelected('hidden',true);
  document.getElementById('fcShow').onclick=()=>fullPropSelected('hidden',false);
  const map=[['fcW','width',''],['fcH','height',''],['fcFs','fontSize','px'],['fcPad','padding','px'],['fcMar','margin','px'],['fcGap','gap','px'],['fcRad','borderRadius','px'],['fcBorder','border','']];
  map.forEach(([id,prop,u])=>document.getElementById(id).onchange=e=>{if(e.target.value!=='')fullApplySelected(prop,e.target.value+u)});
  document.getElementById('fcWeight').onchange=e=>e.target.value&&fullApplySelected('fontWeight',e.target.value);
  document.getElementById('fcColor').oninput=e=>fullApplySelected('color',e.target.value);
  document.getElementById('fcBg').oninput=e=>fullApplySelected('backgroundColor',e.target.value);
  document.getElementById('fcAlign').onchange=e=>e.target.value&&fullApplySelected('textAlign',e.target.value);
  document.getElementById('fcItems').onchange=e=>e.target.value&&fullApplySelected('alignItems',e.target.value);
  document.querySelectorAll('[data-cols]').forEach(b=>b.onclick=()=>{fullApplySelected('display','grid');fullApplySelected('gridTemplateColumns',`repeat(${b.dataset.cols},minmax(0,1fr))`)});
  document.getElementById('fcAuto').onclick=()=>{fullApplySelected('width','');fullApplySelected('height','')};
  document.getElementById('fcTextBtn').onclick=()=>{const v=document.getElementById('fcText').value;if(v)fullPropSelected('text',v)};
  document.getElementById('fcTop').onclick=()=>{const checks=[...document.querySelectorAll('.ve-full-check:checked')];checks.forEach(ch=>{const full=decodeURIComponent(ch.dataset.key),el=resolve(full.split('::')[1]);if(el?.parentElement)el.parentElement.prepend(el)});save()};
  document.getElementById('fcBottom').onclick=()=>{const checks=[...document.querySelectorAll('.ve-full-check:checked')];checks.forEach(ch=>{const full=decodeURIComponent(ch.dataset.key),el=resolve(full.split('::')[1]);if(el?.parentElement)el.parentElement.append(el)});save()};
  document.getElementById('fcReset').onclick=()=>{const checks=[...document.querySelectorAll('.ve-full-check:checked')];if(!checks.length)return alert('Hãy tick mục cần reset.');checks.forEach(ch=>{const full=decodeURIComponent(ch.dataset.key);delete cfg.elements[full]});save();frame.contentWindow.location.reload()};
}
function renderIcons(){let p=document.querySelector('.ve-pane[data-pane=icon]');p.innerHTML='<div class="ve-group"><h3>Thư viện icon lớn</h3><input class="ve-icon-search" id="is" placeholder="Icon / ký hiệu"><div class="ve-icons" id="igs"></div><div class="ve-actions" style="margin-top:8px"><button class="ve-btn" id="before">Thêm trước</button><button class="ve-btn" id="after">Thêm sau</button><button class="ve-btn danger" id="removeIcon">Xóa/ẩn icon đang chọn</button></div></div>';let g=document.getElementById('igs'),chosen='★';icons.forEach(i=>{let b=document.createElement('button');b.className='ve-icon';b.textContent=i;b.onclick=()=>{chosen=i;if(selected)setProp('icon',i)};g.appendChild(b)});document.getElementById('before').onclick=()=>selected&&setProp('before',chosen);document.getElementById('after').onclick=()=>selected&&setProp('after',chosen);document.getElementById('removeIcon').onclick=()=>selected&&setProp('hidden',true)}
function renderExport(){let p=document.querySelector('.ve-pane[data-pane=export]');if(!p)return;p.innerHTML=`<div class="ve-group"><h3>Cấu hình ${mode==='mobile'?'Mobile':'Web'}</h3><div class="ve-actions"><button class="ve-btn primary" id="copy">Copy JSON</button><button class="ve-btn" id="dl">Tải JSON</button><button class="ve-btn danger" id="reset">Reset ${mode}</button></div><textarea class="ve-export" id="out" readonly>${JSON.stringify(cfg,null,2)}</textarea></div>`;document.getElementById('copy').onclick=async()=>{await navigator.clipboard.writeText(JSON.stringify(cfg,null,2));alert('Đã copy cấu hình '+mode)};document.getElementById('dl').onclick=()=>{let b=new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='dezus-'+mode+'-ui-config.json';a.click();URL.revokeObjectURL(a.href)};document.getElementById('reset').onclick=()=>{if(confirm('Reset toàn bộ chỉnh sửa '+mode+'?')){localStorage.removeItem(STORAGE);location.reload()}}}
document.getElementById('veModeTitle').textContent=mode==='mobile'?'DEZUS Mobile Editor':'DEZUS Web Editor';document.getElementById('veModeDesc').textContent=mode==='mobile'?'390 × 844 • giao diện mobile thật':'Desktop • giao diện web thật';document.getElementById('panelTitle').textContent=mode==='mobile'?'Chỉnh bản Mobile':'Chỉnh bản Web';device.className='ve-device '+mode;frame.onload=setupFrame;pickBtn.onclick=()=>{picking=!picking;pickBtn.classList.toggle('active',picking);doc?.body.classList.toggle('ve-pick',picking)};document.getElementById('reloadBtn').onclick=()=>frame.contentWindow.location.reload();document.querySelectorAll('.ve-tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.ve-tab,.ve-pane').forEach(x=>x.classList.remove('active'));t.classList.add('active');document.querySelector(`.ve-pane[data-pane="${t.dataset.pane}"]`).classList.add('active');if(t.dataset.pane==='full')renderFull();if(t.dataset.pane==='visibility')renderVisibility();if(t.dataset.pane==='export')renderExport()});fields();renderFull();renderVisibility();renderIcons();renderExport();
})();
