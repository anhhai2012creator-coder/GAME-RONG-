const elements = ['Lửa', 'Băng', 'Sấm', 'Bóng Tối', 'Ánh Sáng', 'Rừng', 'Biển', 'Đất', 'Gió', 'Kim Loại', 'Độc', 'Pha Lê', 'Dung Nham', 'Không Gian', 'Thời Gian', 'Tinh Vân'];
const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ancient', 'Cosmic'];
const bodies = ['Serpent', 'Wyvern', 'Drake', 'Leviathan', 'Hydra', 'Phoenix-Dragon', 'Crystalback', 'Mecha-Wyrm', 'Celestial', 'Shadowfang'];
const wings = ['cánh lụa', 'cánh gai', 'cánh pha lê', 'cánh lửa', 'cánh thiên hà', 'cánh bão', 'cánh xương', 'cánh kim loại'];
const horns = ['sừng xoắn', 'sừng kép', 'vương miện sừng', 'sừng pha lê', 'sừng kiếm', 'không sừng', 'sừng ngọc', 'sừng mặt trăng'];
const auras = ['hào quang nhẹ', 'vòng lửa', 'sương băng', 'tia sét', 'bụi sao', 'khói tím', 'lá bay', 'sóng nước', 'vầng sáng thần thoại'];
const temperaments = ['hiền hòa', 'kiêu hãnh', 'hoang dã', 'bất khuất', 'tinh nghịch', 'bí ẩn', 'trung thành', 'lạnh lùng'];
const habitats = ['Núi Lửa Đỏ', 'Rừng Cổ Đại', 'Vực Băng', 'Đảo Mây', 'Hang Pha Lê', 'Biển Sâu', 'Tháp Thiên Hà', 'Sa Mạc Sấm'];
const prefixes = ['Aero', 'Pyro', 'Cryo', 'Volt', 'Nebu', 'Terra', 'Luna', 'Solar', 'Umbra', 'Aqua', 'Veno', 'Titan', 'Rune', 'Nova', 'Zen', 'Orion', 'Draco', 'Kairo', 'Mira', 'Elder'];
const suffixes = ['fang', 'wing', 'scale', 'flare', 'storm', 'claw', 'heart', 'spine', 'gaze', 'roar', 'crest', 'veil', 'shard', 'bloom', 'quake', 'ray'];

function colorFrom(seed, shift = 0) {
  const hue = (seed * 47 + shift * 83) % 360;
  const sat = 62 + (seed * 13 + shift) % 25;
  const light = 42 + (seed * 7 + shift) % 20;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function generateSpecies(count = 1200) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    const tier = Math.floor((i - 1) / 150) + 1;
    const rarity = rarities[Math.min(rarities.length - 1, tier - 1)];
    const element = elements[(i * 7 + tier) % elements.length];
    const body = bodies[(i * 5 + tier) % bodies.length];
    const wing = wings[(i * 3 + tier) % wings.length];
    const horn = horns[(i * 11 + tier) % horns.length];
    const aura = auras[(i * 13 + tier) % auras.length];
    const name = `${prefixes[i % prefixes.length]}${suffixes[(i * 9) % suffixes.length]} ${String(i).padStart(4, '0')}`;
    const power = 30 + tier * 18 + (i * 17) % 60;
    const speed = 20 + tier * 12 + (i * 19) % 55;
    const defense = 25 + tier * 15 + (i * 23) % 65;
    list.push({
      id: i,
      name,
      element,
      rarity,
      tier,
      power,
      speed,
      defense,
      temperament: temperaments[(i * 2 + tier) % temperaments.length],
      habitat: habitats[(i * 4 + tier) % habitats.length],
      body,
      wing,
      horn,
      aura,
      color1: colorFrom(i, 1),
      color2: colorFrom(i, 2),
      color3: colorFrom(i, 3),
      description: `${name} là rồng hệ ${element}, dáng ${body}, ${wing}, ${horn}, tỏa ${aura}. Cấp ${tier}, độ hiếm ${rarity}, phù hợp thám hiểm và solo theo cấp.`
    });
  }
  return list;
}

module.exports = { generateSpecies, rarities, elements };
