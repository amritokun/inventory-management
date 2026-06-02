const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'backend', 'database.sqlite'), (err) => {
    if (err) {
        console.error(err.message);
        process.exit(1);
    }
});

db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
