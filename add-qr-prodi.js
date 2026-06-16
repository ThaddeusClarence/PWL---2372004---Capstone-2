const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lab_management'
});

db.connect(err => {
    if (err) throw err;
    db.query('ALTER TABLE inventory ADD COLUMN qr_code_prodi_path VARCHAR(255) AFTER qr_code_path', (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') console.error(err);
        else console.log('Successfully added qr_code_prodi_path!');
        db.end();
    });
});
