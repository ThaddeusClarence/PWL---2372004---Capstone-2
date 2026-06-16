const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lab_management'
});

db.connect(err => {
    if (err) throw err;
    db.query('ALTER TABLE users CHANGE username email varchar(255) NOT NULL', (err) => {
        if (err && err.code !== 'ER_BAD_FIELD_ERROR') console.error(err);
        else {
            db.query('UPDATE users SET email = CONCAT(email, "@lab.com") WHERE email NOT LIKE "%@%"', (err2) => {
                if (err2) console.error(err2);
                else {
                    console.log('Successfully updated users table!');
                    db.query('SELECT * FROM users', (err3, results) => {
                        console.log(results);
                        db.end();
                    });
                }
            });
        }
    });
});
