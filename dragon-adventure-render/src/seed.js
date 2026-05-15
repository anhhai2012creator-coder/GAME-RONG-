const db = require('./db');
db.seed();
console.log(`Seeded/verified ${db.state.species.length} dragon species.`);
