const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { generateSpecies } = require('./dragons');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'dragon_adventure.json');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const initial = () => ({ players: [], species: generateSpecies(1200), playerDragons: [], eggs: [], rooms: [] });
let state = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : initial();
if (!state.species || state.species.length < 1000) state.species = generateSpecies(1200);

function save(){ fs.writeFileSync(dbPath, JSON.stringify(state, null, 2)); }
function id(){ return randomUUID(); }
function now(){ return new Date().toISOString(); }
function playerById(playerId){ return state.players.find(p => p.id === playerId); }
function speciesById(speciesId){ return state.species.find(s => s.id === Number(speciesId)); }
function pickSpecies(minTier=1, maxTier=8){ const rows = state.species.filter(s => s.tier >= minTier && s.tier <= maxTier); return rows[Math.floor(Math.random() * rows.length)] || state.species[0]; }
function publicDragon(pd){ const s = speciesById(pd.species_id); return { ...pd, ...s }; }
function getPlayerState(playerId){
  const player = playerById(playerId);
  if (!player) return null;
  const dragons = state.playerDragons.filter(d => d.player_id === playerId).map(publicDragon).sort((a,b)=>b.level-a.level);
  const eggs = state.eggs.filter(e => e.player_id === playerId).map(e => ({ ...e, ...speciesById(e.species_id) })).sort((a,b)=>a.hatch_at-b.hatch_at);
  return { player, dragons, eggs, serverTime: Date.now() };
}
function createPlayer(name){
  const player = { id: id(), name, coins: 500, gems: 20, shards: 30, level: 1, xp: 0, created_at: now(), updated_at: now() };
  state.players.push(player);
  const starter = pickSpecies(1,2);
  state.playerDragons.push({ id: id(), player_id: player.id, species_id: starter.id, nickname: starter.name, level: 1, xp: 0, power_bonus: 0, hatched_at: now() });
  save();
  return player;
}
function updatePlayer(playerId, patch){ const p = playerById(playerId); if (!p) return null; Object.assign(p, patch, { updated_at: now() }); save(); return p; }
function addDragon(playerId, species, level=1){ const d = { id:id(), player_id:playerId, species_id: species.id, nickname: species.name, level, xp:0, power_bonus:0, hatched_at: now() }; state.playerDragons.push(d); save(); return d; }
function addEgg(playerId, species, hatchAt){ const e = { id:id(), player_id:playerId, species_id:species.id, hatch_at:hatchAt, created_at:now() }; state.eggs.push(e); save(); return e; }
function removeEgg(eggId){ state.eggs = state.eggs.filter(e => e.id !== eggId); save(); }
function createRoom(hostId, minTier, maxTier, code){ const r = { id:id(), code, host_id:hostId, guest_id:null, min_tier:minTier, max_tier:maxTier, status:'waiting', log:[], created_at:now(), updated_at:now() }; state.rooms.push(r); save(); return r; }
function updateRoom(room, patch){ Object.assign(room, patch, { updated_at: now() }); save(); return room; }
function listRooms(){ return [...state.rooms].sort((a,b)=>String(b.created_at).localeCompare(a.created_at)).slice(0,30); }
function leaderboard(){ return [...state.players].sort((a,b)=>b.level-a.level || b.xp-a.xp).slice(0,20).map(({name,level,xp,coins,gems})=>({name,level,xp,coins,gems})); }
function seed(){ if (!state.species || state.species.length < 1000) { state.species = generateSpecies(1200); save(); } else save(); }

module.exports = { state, save, id, playerById, speciesById, pickSpecies, getPlayerState, createPlayer, updatePlayer, addDragon, addEgg, removeEgg, createRoom, updateRoom, listRooms, leaderboard, seed };
