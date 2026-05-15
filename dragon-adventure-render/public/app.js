const socket = io();
let state = null;
let page = 1;
let pages = 1;
let selectedTab = 'adventure';
const $ = (id) => document.getElementById(id);

const savedId = localStorage.getItem('dragon_player_id');
const savedName = localStorage.getItem('dragon_player_name') || '';
$('playerName').value = savedName;

function dragonArt(d, big=false){
  const c1 = d.color1 || 'hsl(210 80% 55%)';
  const c2 = d.color2 || 'hsl(300 80% 55%)';
  const c3 = d.color3 || 'hsl(45 90% 60%)';
  return `<div class="dragon-art ${big?'big':''}" style="--c1:${c1};--c2:${c2};--c3:${c3}"><div class="aura"></div><div class="dragon"><div class="wing"></div><div class="horn"></div><div class="eye"></div></div></div>`;
}

function bar(v, max=260){ return `<div class="stat"><i style="width:${Math.min(100, Math.round(v/max*100))}%"></i></div>`; }
function toast(text){ $('reward').textContent = text; }

async function api(url, body){
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const json = await res.json();
  if(!res.ok) throw new Error(json.error || 'Có lỗi xảy ra');
  return json;
}

async function login(){
  const name = $('playerName').value.trim() || 'Nhà thám hiểm';
  const body = { name, id: localStorage.getItem('dragon_player_id') };
  const data = await api('/api/login', body);
  localStorage.setItem('dragon_player_id', data.player.id);
  localStorage.setItem('dragon_player_name', data.player.name);
  socket.emit('auth', data.player.id);
  updateState(data);
  $('dashboard').classList.remove('hidden');
  document.querySelector('.hero').style.display='none';
  loadSpecies();
}

function updateState(data){
  state = data;
  const p = data.player;
  $('nameLabel').textContent = p.name;
  $('statsLabel').textContent = `LV ${p.level} · ${p.coins} coin · ${p.gems} gem · ${p.shards} shard · XP ${p.xp}`;
  renderMyDragons(); renderEggs();
}

function renderMyDragons(){
  const box = $('myDragons');
  if(!state.dragons.length){ box.innerHTML = '<p>Chưa có rồng.</p>'; return; }
  box.innerHTML = state.dragons.map(d => `<div class="card">
    ${dragonArt(d)}
    <h4>${d.nickname}</h4>
    <span class="badge">${d.rarity}</span><span class="badge">Cấp ${d.tier}</span><span class="badge">LV.${d.level}</span><span class="badge">${d.element}</span>
    <p>${d.body} · ${d.wing} · ${d.horn}</p>
    <small>Sức mạnh</small>${bar(d.power+d.power_bonus)}<small>Tốc độ</small>${bar(d.speed)}<small>Phòng thủ</small>${bar(d.defense)}
    <div class="skill"></div>
    <button onclick="upgrade('${d.id}')">Nâng cấp</button>
  </div>`).join('');
}

function renderEggs(){
  const box = $('eggs');
  if(!state.eggs.length){ box.innerHTML = '<p>Chưa có trứng. Hãy quay spin để nhận trứng.</p>'; return; }
  const now = state.serverTime || Date.now();
  box.innerHTML = state.eggs.map(e => {
    const left = Math.max(0, e.hatch_at - now);
    const ready = left <= 0;
    return `<div class="card">
      ${dragonArt(e)}
      <h4>Trứng ${e.name}</h4><span class="badge">${e.rarity}</span><span class="badge">Cấp ${e.tier}</span>
      <p>${ready ? 'Đã sẵn sàng nở!' : 'Còn ' + Math.ceil(left/1000) + ' giây'}</p>
      <button ${ready?'':'disabled'} onclick="hatch('${e.id}')">Ấp nở</button>
    </div>`;
  }).join('');
}

async function upgrade(id){ try{ updateState(await api('/api/upgrade', { playerId: state.player.id, dragonId:id })); toast('Rồng đã mạnh hơn!'); } catch(e){ toast(e.message); } }
async function hatch(id){ try{ const data = await api('/api/hatch', { playerId: state.player.id, eggId:id }); updateState(data.state); toast(`Nở thành công: ${data.dragon.name}`); } catch(e){ toast(e.message); } }

async function spin(){
  if(!state) return;
  $('wheel').classList.remove('spinning'); void $('wheel').offsetWidth; $('wheel').classList.add('spinning');
  try{ const data = await api('/api/spin', { playerId: state.player.id }); setTimeout(()=>{ updateState(data.state); toast(data.reward.text); }, 900); }
  catch(e){ toast(e.message); }
}

async function loadSpecies(){
  const q = encodeURIComponent($('searchDragon').value || '');
  const tier = $('tierFilter').value;
  const res = await fetch(`/api/species?page=${page}&q=${q}&tier=${tier}`);
  const data = await res.json(); pages = data.pages || 1;
  $('pageInfo').textContent = `Trang ${data.page}/${pages} · ${data.total} loài`;
  $('speciesGrid').innerHTML = data.rows.map(d => `<div class="card">
    ${dragonArt(d)}<h4>${d.name}</h4>
    <span class="badge">${d.rarity}</span><span class="badge">Cấp ${d.tier}</span><span class="badge">${d.element}</span>
    <p>${d.description}</p>
    <small>Sức mạnh</small>${bar(d.power)}<small>Tốc độ</small>${bar(d.speed)}<small>Phòng thủ</small>${bar(d.defense)}
  </div>`).join('');
}

async function createRoom(){
  try{ const room = await api('/api/rooms', { playerId: state.player.id, minTier:$('minTier').value, maxTier:$('maxTier').value }); $('roomResult').innerHTML = `Mã phòng: <b>${room.code}</b><br>Gửi mã này cho người chơi khác.`; }
  catch(e){ $('roomResult').textContent = e.message; }
}
async function joinRoom(){
  try{ const room = await api('/api/rooms/join', { playerId: state.player.id, code:$('joinCode').value }); $('roomResult').innerHTML = room.log.map(x=>`<div>${x}</div>`).join(''); }
  catch(e){ $('roomResult').textContent = e.message; }
}
function renderRooms(rooms){
  $('roomList').innerHTML = rooms.map(r => `<div class="card"><h4>Phòng ${r.code}</h4><span class="badge">Cấp ${r.min_tier}-${r.max_tier}</span><span class="badge">${r.status}</span><p>${(r.log||[]).slice(-2).join('<br>')}</p>${r.status==='waiting'?`<button onclick="$('joinCode').value='${r.code}';joinRoom()">Vào nhanh</button>`:''}</div>`).join('') || '<p>Chưa có phòng.</p>';
}

$('startBtn').onclick = login;
$('spinBtn').onclick = spin;
$('createRoom').onclick = createRoom;
$('joinRoom').onclick = joinRoom;
$('searchDragon').oninput = () => { page=1; loadSpecies(); };
$('tierFilter').onchange = () => { page=1; loadSpecies(); };
$('prevPage').onclick = () => { page = Math.max(1,page-1); loadSpecies(); };
$('nextPage').onclick = () => { page = Math.min(pages,page+1); loadSpecies(); };
document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{ selectedTab=btn.dataset.tab; document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn)); document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id===selectedTab)); if(selectedTab==='encyclopedia') loadSpecies(); });

socket.on('state', updateState);
socket.on('rooms', renderRooms);
socket.on('activity', a => { const div = document.createElement('div'); div.textContent = `[${a.at}] ${a.text}`; $('activity').appendChild(div); });
setInterval(()=>{ if(state) { state.serverTime = Date.now(); renderEggs(); } }, 1000);

fetch('/api/species?page=1').then(r=>r.json()).then(d=>{ if(d.rows[0]) $('heroDragon').innerHTML = dragonArt(d.rows[77] || d.rows[0], true); });
if(savedId){ login().catch(()=>{}); }
