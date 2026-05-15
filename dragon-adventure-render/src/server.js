const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
db.seed();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

function roomCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
function emitState(playerId){ io.to(playerId).emit('state', db.getPlayerState(playerId)); }
function emitRooms(){ io.emit('rooms', db.listRooms()); }
function activity(text){ io.emit('activity', { text, at: new Date().toLocaleTimeString('vi-VN') }); }
function bestDragon(playerId, minTier, maxTier){
  return db.state.playerDragons.map(d => db.speciesById(d.species_id) ? { ...d, ...db.speciesById(d.species_id) } : null)
    .filter(d => d && d.player_id === playerId && d.tier >= minTier && d.tier <= maxTier)
    .sort((a,b)=>b.level-a.level || (b.power+b.speed+b.defense+b.power_bonus)-(a.power+a.speed+a.defense+a.power_bonus))[0];
}

app.get('/api/species', (req,res)=>{
  const page = Math.max(1, Number(req.query.page || 1));
  const q = String(req.query.q || '').toLowerCase();
  const tier = req.query.tier ? Number(req.query.tier) : null;
  let rows = db.state.species.filter(s => (!tier || s.tier === tier) && (!q || s.name.toLowerCase().includes(q) || s.element.toLowerCase().includes(q)));
  const total = rows.length;
  rows = rows.slice((page-1)*48, page*48);
  res.json({ rows, total, page, pages: Math.max(1, Math.ceil(total / 48)) });
});

app.get('/api/leaderboard', (req,res)=>res.json(db.leaderboard()));

app.post('/api/login', (req,res)=>{
  const name = String(req.body.name || 'Nhà thám hiểm').trim().slice(0,24);
  let player = req.body.id ? db.playerById(req.body.id) : null;
  if (!player) player = db.createPlayer(name);
  else db.updatePlayer(player.id, { name });
  res.json(db.getPlayerState(player.id));
});

app.post('/api/spin', (req,res)=>{
  const player = db.playerById(req.body.playerId);
  if (!player) return res.status(404).json({ error:'Không tìm thấy người chơi.' });
  if (player.coins < 50) return res.status(400).json({ error:'Cần 50 coin để quay.' });
  player.coins -= 50;
  const roll = Math.random();
  let reward;
  if (roll < .28) { player.coins += 150; reward = { type:'coin', text:'+150 Coin' }; }
  else if (roll < .48) { player.shards += 20; reward = { type:'shard', text:'+20 Shard' }; }
  else if (roll < .66) { player.gems += 8; reward = { type:'gem', text:'+8 Gem' }; }
  else if (roll < .86) { const s = db.pickSpecies(1,5); db.addEgg(player.id, s, Date.now() + 45000); reward = { type:'egg', text:`Trứng ${s.rarity}: ${s.name}` }; }
  else { const s = db.pickSpecies(4,8); db.addDragon(player.id, s, 1); reward = { type:'dragon', text:`Rồng hiếm: ${s.name}` }; }
  player.updated_at = new Date().toISOString();
  db.save();
  activity(`${player.name} vừa quay được ${reward.text}`);
  emitState(player.id);
  res.json({ reward, state: db.getPlayerState(player.id) });
});

app.post('/api/hatch', (req,res)=>{
  const egg = db.state.eggs.find(e => e.id === req.body.eggId && e.player_id === req.body.playerId);
  if (!egg) return res.status(404).json({ error:'Không tìm thấy trứng.' });
  if (egg.hatch_at > Date.now()) return res.status(400).json({ error:'Trứng chưa đủ thời gian ấp.' });
  const species = db.speciesById(egg.species_id);
  db.removeEgg(egg.id);
  db.addDragon(req.body.playerId, species, 1);
  activity(`Một ${species.name} vừa nở khỏi trứng!`);
  emitState(req.body.playerId);
  res.json({ dragon: species, state: db.getPlayerState(req.body.playerId) });
});

app.post('/api/upgrade', (req,res)=>{
  const player = db.playerById(req.body.playerId);
  const dragon = db.state.playerDragons.find(d => d.id === req.body.dragonId && d.player_id === req.body.playerId);
  if (!player || !dragon) return res.status(404).json({ error:'Không tìm thấy rồng.' });
  const costCoins = 80 + dragon.level * 35;
  const costShards = 5 + dragon.level * 2;
  if (player.coins < costCoins || player.shards < costShards) return res.status(400).json({ error:`Cần ${costCoins} coin và ${costShards} shard.` });
  player.coins -= costCoins; player.shards -= costShards; player.xp += 25; player.level = Math.max(player.level, 1 + Math.floor(player.xp/250));
  dragon.level += 1; dragon.power_bonus += 8 + dragon.level * 2;
  db.save(); emitState(player.id);
  res.json(db.getPlayerState(player.id));
});

app.post('/api/rooms', (req,res)=>{
  const player = db.playerById(req.body.playerId);
  if (!player) return res.status(404).json({ error:'Không tìm thấy người chơi.' });
  let code = roomCode();
  while (db.state.rooms.some(r => r.code === code)) code = roomCode();
  const minTier = Math.max(1, Math.min(8, Number(req.body.minTier || 1)));
  const maxTier = Math.max(minTier, Math.min(8, Number(req.body.maxTier || 8)));
  const room = db.createRoom(player.id, minTier, maxTier, code);
  room.log.push(`${player.name} đã tạo phòng cấp ${minTier}-${maxTier}.`);
  db.save(); emitRooms();
  res.json(room);
});

app.post('/api/rooms/join', (req,res)=>{
  const player = db.playerById(req.body.playerId);
  const code = String(req.body.code || '').toUpperCase();
  const room = db.state.rooms.find(r => r.code === code);
  if (!player || !room) return res.status(404).json({ error:'Không tìm thấy phòng.' });
  if (room.status !== 'waiting') return res.status(400).json({ error:'Phòng không còn chờ.' });
  const host = db.playerById(room.host_id);
  const hostDragon = bestDragon(host.id, room.min_tier, room.max_tier);
  const guestDragon = bestDragon(player.id, room.min_tier, room.max_tier);
  if (!hostDragon || !guestDragon) return res.status(400).json({ error:'Một người chơi chưa có rồng phù hợp cấp phòng.' });
  const hostScore = hostDragon.power + hostDragon.speed + hostDragon.defense + hostDragon.power_bonus + Math.random()*90;
  const guestScore = guestDragon.power + guestDragon.speed + guestDragon.defense + guestDragon.power_bonus + Math.random()*90;
  const winner = hostScore >= guestScore ? host : player;
  room.guest_id = player.id; room.status = 'finished';
  room.log.push(`${player.name} đã vào phòng.`);
  room.log.push(`${host.name} gọi ${hostDragon.name} LV.${hostDragon.level}.`);
  room.log.push(`${player.name} gọi ${guestDragon.name} LV.${guestDragon.level}.`);
  room.log.push(hostScore >= guestScore ? `${hostDragon.name} tung Long Vũ Bão thắng sát nút!` : `${guestDragon.name} phóng Thiên Hỏa Quang thắng áp đảo!`);
  room.log.push(`Người thắng: ${winner.name}`);
  winner.coins += 120; winner.shards += 12; winner.xp += 50; winner.level = Math.max(winner.level, 1 + Math.floor(winner.xp/250));
  db.save(); emitState(host.id); emitState(player.id); emitRooms();
  activity(`${winner.name} vừa thắng solo rồng phòng ${room.code}`);
  res.json(room);
});

io.on('connection', socket => {
  socket.on('auth', playerId => { if (playerId) { socket.join(playerId); emitState(playerId); } emitRooms(); });
  socket.on('rooms:refresh', emitRooms);
});

server.listen(PORT, () => console.log(`Dragon Adventure running on ${PORT}`));
