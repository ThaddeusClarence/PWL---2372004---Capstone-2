const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Akses folder public
app.use(session({
    secret: 'secret_key_laboratorium_2026',
    resave: false,
    saveUninitialized: true
}));

// Multer Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/inventory')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// Set Pug sebagai template engine
app.set('view engine', 'pug');
app.set('views', './views');

// Konfigurasi Database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Sesuaikan dengan password database XAMPP kamu
    database: 'lab_management'
});

db.connect((err) => {
    if (err) {
        console.error('Error menghubungkan ke database:', err);
    } else {
        console.log('✅ Berhasil terhubung ke database MySQL (lab_management)');
    }
});

// Middleware Cek Login
const checkAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware Cek Admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Administrator') {
        next();
    } else {
        res.status(403).send('Forbidden: Hanya Administrator yang dapat mengakses halaman ini.');
    }
};

// Middleware Cek Admin atau Kalab (digantikan oleh checkInventoryAccess untuk beberapa route)
const checkAdminOrKalab = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'Administrator' || req.session.user.role === 'Kepala Laboratorium')) {
        next();
    } else {
        res.status(403).send('Forbidden: Akses ditolak.');
    }
};

// Middleware Cek Akses Inventaris Utama
const checkInventoryAccess = (req, res, next) => {
    if (req.session.user && req.session.user.role !== 'Administrator') {
        next();
    } else {
        res.status(403).send('Forbidden: Anda tidak memiliki akses ke halaman ini.');
    }
};

// Middleware Cek Akses Kelola Stok BHP
const checkConsumablesAccess = (req, res, next) => {
    if (req.session.user && req.session.user.role !== 'Administrator') {
        next();
    } else {
        res.status(403).send('Forbidden: Anda tidak memiliki akses ke halaman ini.');
    }
};

// Middleware Cek Akses Log Maintenance
const checkMaintenanceAccess = (req, res, next) => {
    if (req.session.user && req.session.user.role !== 'Administrator') {
        next();
    } else {
        res.status(403).send('Forbidden: Anda tidak memiliki akses ke halaman ini.');
    }
};

// Middleware Cek Kalab
const checkKalab = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Kepala Laboratorium') {
        next();
    } else {
        res.status(403).send('Forbidden: Hanya Kepala Laboratorium yang dapat mengakses halaman ini.');
    }
};

// Middleware Cek Kaprodi
const checkKaprodi = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Ketua Program Studi') {
        next();
    } else {
        res.status(403).send('Forbidden: Hanya Ketua Program Studi yang dapat mengakses halaman ini.');
    }
};

// Middleware Cek Staf Administrasi
const checkStafAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Staf Administrasi') {
        next();
    } else {
        res.status(403).send('Forbidden: Hanya Staf Administrasi yang dapat mengakses halaman ini.');
    }
};

// Middleware Cek Staf Laboratorium
const checkStaflab = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Staf Laboratorium') {
        next();
    } else {
        res.status(403).send('Forbidden: Hanya Staf Laboratorium yang dapat mengakses halaman ini.');
    }
};

// Middleware Cek Staf Lab atau Staf Admin
const checkStaflabOrStafAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'Staf Laboratorium' || req.session.user.role === 'Staf Administrasi')) {
        next();
    } else {
        res.status(403).send('Forbidden: Akses ditolak.');
    }
};

// Middleware Cek Kalab atau Staf Lab
const checkKalabOrStaflab = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'Kepala Laboratorium' || req.session.user.role === 'Staf Laboratorium')) {
        next();
    } else {
        res.status(403).send('Forbidden: Hanya Kepala Laboratorium dan Staf Laboratorium yang dapat mengedit.');
    }
};

// Route Halaman Login (GET)
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
});

// Route Proses Login (POST)
app.post('/login', (req, res) => {
    const { email, password, role } = req.body;
    console.log('=== DEBUG LOGIN ATTEMPT ===');
    console.log('Received Body:', { email, password, role });
    
    const query = 'SELECT id, email, password, name, role FROM users WHERE email = ? AND password = ? AND role = ?';
    db.query(query, [email, password, role], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.render('login', { error: 'Terjadi kesalahan pada server.' });
        }
        
        console.log('Query Results:', results);
        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/');
        } else {
            res.render('login', { error: 'Email, password, atau peran salah!' });
        }
    });
});

// Route Proses Tambah User oleh Admin (POST)
app.post('/admin/add-user', checkAuth, checkAdmin, (req, res) => {
    const { name, email, password, role } = req.body;
    
    // Cek apakah email sudah digunakan
    const checkQuery = 'SELECT id FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/?error=Terjadi kesalahan pada server.');
        }
        
        if (results.length > 0) {
            return res.redirect('/?error=Email sudah digunakan!');
        }
        
        // Simpan user baru ke database
        const insertQuery = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
        db.query(insertQuery, [name, email, password, role], (err, result) => {
            if (err) {
                console.error('Database Error:', err);
                return res.redirect('/?error=Gagal menambahkan pengguna.');
            }
            
            res.redirect('/?success=Pengguna baru berhasil ditambahkan!');
        });
    });
});

// Route Proses Hapus User oleh Admin (POST)
app.post('/admin/delete-user/:id', checkAuth, checkAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Cegah admin menghapus akunnya sendiri yang sedang aktif login
    if (parseInt(userId) === req.session.user.id) {
        return res.redirect('/?error=Anda tidak dapat menghapus akun Anda sendiri!');
    }
    
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    db.query(deleteQuery, [userId], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/?error=Gagal menghapus pengguna.');
        }
        
        res.redirect('/?success=Pengguna berhasil dihapus!');
    });
});

// Route Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Route untuk halaman utama (Dilindungi oleh checkAuth)
app.get('/', checkAuth, (req, res) => {
    const role = req.session.user.role;
    
    if (role === 'Administrator') {
        const query = 'SELECT id, email, password, name, role, created_at FROM users';
        db.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.render('admin', { 
                    title: `Dashboard ${role}`, 
                    message: `Selamat Datang, ${req.session.user.name}`,
                    user: req.session.user,
                    usersList: [],
                    error: 'Gagal mengambil data pengguna.'
                });
            }
            res.render('admin', { 
                title: `Dashboard ${role}`, 
                message: `Selamat Datang, ${req.session.user.name}`,
                user: req.session.user,
                usersList: results,
                error: req.query.error || null,
                success: req.query.success || null
            });
        });
    } else {
        const invQuery = 'SELECT i.id, i.item_code, i.name, i.qr_code_path, i.qr_code_prodi_path, i.room_id, r.name as room_name, i.status, i.item_condition, i.received_date FROM inventory i LEFT JOIN rooms r ON i.room_id = r.id';
        const roomQuery = 'SELECT id, name FROM rooms';
        const consQuery = 'SELECT id, name, stock, unit FROM consumables';
        let procQuery = '';
        let procParams = [];
        const baseProcQuery = `
            SELECT p.*, u.name as creator_name,
                   (SELECT COUNT(*) FROM procurement_items pi WHERE pi.procurement_id = p.id AND pi.approval_status = 'Approved') as total_approved,
                   (SELECT COUNT(*) FROM procurement_items pi WHERE pi.procurement_id = p.id AND pi.approval_status = 'Approved' AND pi.received_date IS NOT NULL) as total_received
            FROM procurements p 
            JOIN users u ON p.created_by = u.id 
        `;
        
        if (role === 'Kepala Laboratorium') {
            procQuery = baseProcQuery + 'WHERE p.created_by = ? ORDER BY p.created_at DESC';
            procParams = [req.session.user.id];
        } else if (role === 'Ketua Program Studi') {
            procQuery = baseProcQuery + 'WHERE p.status IN ("Locked", "Finalized") ORDER BY p.created_at DESC';
        } else if (role === 'Staf Administrasi') {
            procQuery = baseProcQuery + 'WHERE p.status = "Finalized" ORDER BY p.created_at DESC';
        }

        db.query(invQuery, (err, inventoryList) => {
            db.query(roomQuery, (err, rooms) => {
                db.query(consQuery, (err, consumablesList) => {
                    if (procQuery) {
                        db.query(procQuery, procParams, (err, procurementsList) => {
                            renderDashboard(res, role, req, inventoryList, rooms, consumablesList, procurementsList);
                        });
                    } else {
                        renderDashboard(res, role, req, inventoryList, rooms, consumablesList, []);
                    }
                });
            });
        });

        function renderDashboard(res, role, req, inventoryList, rooms, consumablesList, procurementsList) {
             res.render('dashboard_unified', {
                 title: `Dashboard ${role}`, 
                 message: `Selamat Datang, ${req.session.user.name}`,
                 user: req.session.user,
                 inventoryList: inventoryList || [],
                 rooms: rooms || [],
                 consumablesList: consumablesList || [],
                 procurementsList: procurementsList || [],
                 error: req.query.error || null,
                 success: req.query.success || null
             });
        }
    }
});



// Route Proses Edit User (POST)
app.post('/admin/edit-user/:id', checkAuth, checkAdmin, (req, res) => {
    const userId = req.params.id;
    const { name, email, password, role } = req.body;
    
    // Jika mengedit diri sendiri, pastikan role tetap Administrator
    if (parseInt(userId) === req.session.user.id && role !== 'Administrator') {
        return res.redirect('/?error=Anda tidak dapat mengubah peran Administrator Anda sendiri!');
    }
    
    // Cek apakah email sudah digunakan oleh orang lain
    const checkQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
    db.query(checkQuery, [email, userId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/?error=Terjadi kesalahan pada server.');
        }
        
        if (results.length > 0) {
            return res.redirect('/?error=Email sudah digunakan oleh pengguna lain!');
        }
        
        const updateQuery = 'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?';
        db.query(updateQuery, [name, email, password, role, userId], (err, result) => {
            if (err) {
                console.error('Database Error:', err);
                return res.redirect('/?error=Gagal mengupdate data pengguna.');
            }
            
            // Jika mengedit diri sendiri, perbarui data user di sesi
            if (parseInt(userId) === req.session.user.id) {
                req.session.user.name = name;
                req.session.user.email = email;
                req.session.user.password = password;
                req.session.user.role = role;
            }
            
            res.redirect('/?success=Data pengguna berhasil diperbarui!');
        });
    });
});

// --- MANAJEMEN RUANGAN OLEH ADMIN ---

// Route Halaman Daftar Ruangan (GET)
app.get('/admin/rooms', checkAuth, checkAdmin, (req, res) => {
    const query = 'SELECT id, name, description, created_at FROM rooms';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.render('admin_rooms', {
                title: 'Kelola Ruangan',
                user: req.session.user,
                roomsList: [],
                error: 'Gagal mengambil data ruangan.'
            });
        }
        
        res.render('admin_rooms', {
            title: 'Kelola Ruangan',
            user: req.session.user,
            roomsList: results,
            error: req.query.error || null,
            success: req.query.success || null
        });
    });
});

// Route Tambah Ruangan (POST)
app.post('/admin/rooms/add', checkAuth, checkAdmin, (req, res) => {
    const { name, description } = req.body;
    
    const insertQuery = 'INSERT INTO rooms (name, description) VALUES (?, ?)';
    db.query(insertQuery, [name, description], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/admin/rooms?error=Gagal menambahkan ruangan.');
        }
        
        res.redirect('/admin/rooms?success=Ruangan berhasil ditambahkan!');
    });
});

// Route Edit Ruangan (POST)
app.post('/admin/rooms/edit/:id', checkAuth, checkAdmin, (req, res) => {
    const roomId = req.params.id;
    const { name, description } = req.body;
    
    const updateQuery = 'UPDATE rooms SET name = ?, description = ? WHERE id = ?';
    db.query(updateQuery, [name, description, roomId], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect(`/admin/rooms?error=Gagal mengupdate ruangan.`);
        }
        
        res.redirect(`/admin/rooms?success=Ruangan berhasil diperbarui!`);
    });
});

// Route Hapus Ruangan (POST)
app.post('/admin/rooms/delete/:id', checkAuth, checkAdmin, (req, res) => {
    const roomId = req.params.id;
    
    const deleteQuery = 'DELETE FROM rooms WHERE id = ?';
    db.query(deleteQuery, [roomId], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/admin/rooms?error=Gagal menghapus ruangan.');
        }
        
        res.redirect('/admin/rooms?success=Ruangan berhasil dihapus!');
    });
});

// --- MANAJEMEN INVENTARIS ---
app.get('/inventory', checkAuth, checkInventoryAccess, (req, res) => {
    const query = `
        SELECT i.id, i.item_code, i.name, i.qr_code_path, i.qr_code_prodi_path, i.room_id, r.name as room_name, i.status, i.item_condition, i.received_date 
        FROM inventory i LEFT JOIN rooms r ON i.room_id = r.id
    `;
    db.query(query, (err, inventoryResults) => {
        if (err) {
            console.error('Database Error:', err);
            return res.render('inventory', { title: 'Kelola Inventaris', user: req.session.user, inventoryList: [], error: 'Gagal mengambil data inventaris.' });
        }
        db.query('SELECT id, name FROM rooms', (err, roomsResults) => {
            res.render('inventory', { 
                title: 'Kelola Inventaris', 
                user: req.session.user, 
                inventoryList: inventoryResults, 
                rooms: roomsResults || [],
                error: req.query.error || null,
                success: req.query.success || null
            });
        });
    });
});

app.post('/inventory/add', checkAuth, checkStafAdmin, upload.fields([{ name: 'qr_code_prodi', maxCount: 1 }]), async (req, res) => {
    const { item_code, name, room_id, status, item_condition, received_date } = req.body;
    let qr_code_path = null;
    
    if (item_code) {
        try {
            const fileName = 'qr_' + item_code.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
            const absolutePath = path.join(__dirname, 'public', 'uploads', 'inventory', fileName);
            await QRCode.toFile(absolutePath, item_code);
            qr_code_path = '/uploads/inventory/' + fileName;
        } catch (err) {
            console.error('QR Generate Error:', err);
        }
    }

    const qr_code_prodi_path = req.files && req.files['qr_code_prodi'] ? '/uploads/inventory/' + req.files['qr_code_prodi'][0].filename : null;
    
    const insertQuery = 'INSERT INTO inventory (item_code, name, qr_code_path, qr_code_prodi_path, room_id, status, item_condition, received_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(insertQuery, [item_code, name, qr_code_path, qr_code_prodi_path, room_id || null, status, item_condition, received_date || null], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/inventory?error=Gagal menambahkan inventaris.');
        }
        res.redirect('/inventory?success=Inventaris berhasil ditambahkan!');
    });
});

app.post('/inventory/edit/:id', checkAuth, checkStafAdmin, upload.fields([{ name: 'qr_code_prodi', maxCount: 1 }]), async (req, res) => {
    const { item_code, name, room_id, status, item_condition, received_date } = req.body;
    
    let updates = [];
    let params = [];
    updates.push('item_code=?'); params.push(item_code);
    updates.push('name=?'); params.push(name);
    updates.push('room_id=?'); params.push(room_id || null);
    updates.push('status=?'); params.push(status);
    updates.push('item_condition=?'); params.push(item_condition);
    updates.push('received_date=?'); params.push(received_date || null);

    if (item_code) {
        try {
            const fileName = 'qr_' + item_code.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
            const absolutePath = path.join(__dirname, 'public', 'uploads', 'inventory', fileName);
            await QRCode.toFile(absolutePath, item_code);
            updates.push('qr_code_path=?');
            params.push('/uploads/inventory/' + fileName);
        } catch (err) {
            console.error('QR Generate Error:', err);
        }
    }

    if (req.files && req.files['qr_code_prodi']) {
        updates.push('qr_code_prodi_path=?');
        params.push('/uploads/inventory/' + req.files['qr_code_prodi'][0].filename);
    }
    
    params.push(req.params.id);
    const updateQuery = `UPDATE inventory SET ${updates.join(', ')} WHERE id=?`;
    
    db.query(updateQuery, params, (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/inventory?error=Gagal mengupdate inventaris.');
        }
        res.redirect('/inventory?success=Inventaris berhasil diperbarui!');
    });
});

app.post('/inventory/delete/:id', checkAuth, checkStafAdmin, (req, res) => {
    const deleteQuery = 'DELETE FROM inventory WHERE id = ?';
    db.query(deleteQuery, [req.params.id], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.redirect('/inventory?error=Gagal menghapus inventaris.');
        }
        res.redirect('/inventory?success=Inventaris berhasil dihapus!');
    });
});

// --- SIKLUS & PEMELIHARAAN INVENTARIS ---
app.get('/inventory/:id/history', checkAuth, checkMaintenanceAccess, (req, res) => {
    const invId = req.params.id;
    const invQuery = `
        SELECT i.*, r.name as room_name 
        FROM inventory i LEFT JOIN rooms r ON i.room_id = r.id 
        WHERE i.id = ?
    `;
    db.query(invQuery, [invId], (err, invResults) => {
        if (err || invResults.length === 0) {
            return res.redirect('/inventory?error=Aset tidak ditemukan.');
        }
        
        const logQuery = `
            SELECT m.*, u.name as user_name 
            FROM maintenance_logs m 
            LEFT JOIN users u ON m.user_id = u.id 
            WHERE m.inventory_id = ? 
            ORDER BY m.maintenance_date DESC
        `;
        db.query(logQuery, [invId], (err, logResults) => {
            if (err) {
                console.error(err);
                logResults = [];
            }
            
            db.query('SELECT id, name, stock FROM consumables WHERE stock > 0', (err, consResults) => {
                res.render('inventory_history', {
                    title: 'Riwayat Aset',
                    user: req.session.user,
                    inventory: invResults[0],
                    logs: logResults,
                    consumablesList: consResults || [],
                    error: req.query.error || null,
                    success: req.query.success || null
                });
            });
        });
    });
});

app.post('/inventory/:id/status', checkAuth, checkStaflab, (req, res) => {
    const invId = req.params.id;
    const { new_status } = req.body;
    db.query('UPDATE inventory SET status = ? WHERE id = ?', [new_status, invId], (err) => {
        if (err) return res.redirect(`/inventory/${invId}/history?error=Gagal memperbarui status.`);
        
        // Coba kembali ke dashboard (referer) jika memungkinkan, atau history
        const referer = req.get('Referrer');
        if (referer && referer.includes('/inventory/')) {
            res.redirect(`/inventory/${invId}/history?success=Status aset diubah menjadi ${new_status}.`);
        } else {
            res.redirect('/?success=Status aset berhasil diperbarui.');
        }
    });
});

app.post('/inventory/:id/maintenance/add', checkAuth, checkStaflab, (req, res) => {
    const invId = req.params.id;
    const { maintenance_date, description, new_condition, consumable_id, quantity_used, final_status } = req.body;
    
    // Ambil kondisi lama
    db.query('SELECT item_condition, status FROM inventory WHERE id = ?', [invId], (err, results) => {
        if (err || results.length === 0) return res.redirect(`/inventory/${invId}/history?error=Gagal mencatat pemeliharaan.`);
        
        const previous_condition = results[0].item_condition;
        const finalStatusToSet = final_status || 'Active'; // Default ke Active jika tidak diset
        
        // Cek stok BHP jika ada yang digunakan
        if (consumable_id && quantity_used > 0) {
            db.query('SELECT stock FROM consumables WHERE id = ?', [consumable_id], (err, consResults) => {
                if (err || consResults.length === 0 || consResults[0].stock < quantity_used) {
                    return res.redirect(`/inventory/${invId}/history?error=Stok BHP tidak mencukupi untuk pemeliharaan ini.`);
                }
                
                // Lanjutkan insert log
                const insertLog = 'INSERT INTO maintenance_logs (inventory_id, user_id, maintenance_date, description, previous_condition, new_condition) VALUES (?, ?, ?, ?, ?, ?)';
                db.query(insertLog, [invId, req.session.user.id, maintenance_date, description, previous_condition, new_condition], (err, logResult) => {
                    if (err) return res.redirect(`/inventory/${invId}/history?error=Gagal menyimpan log.`);
                    const logId = logResult.insertId;
                    
                    // Insert ke maintenance_consumables dan kurangi stok
                    db.query('INSERT INTO maintenance_consumables (maintenance_log_id, consumable_id, quantity_used) VALUES (?, ?, ?)', [logId, consumable_id, quantity_used]);
                    db.query('UPDATE consumables SET stock = stock - ? WHERE id = ?', [quantity_used, consumable_id]);
                    
                    // Update kondisi dan status inventaris
                    db.query('UPDATE inventory SET item_condition = ?, status = ? WHERE id = ?', [new_condition, finalStatusToSet, invId], () => {
                        res.redirect(`/inventory/${invId}/history?success=Log pemeliharaan berhasil ditambahkan beserta penggunaan BHP.`);
                    });
                });
            });
        } else {
            // Tanpa penggunaan BHP
            const insertLog = 'INSERT INTO maintenance_logs (inventory_id, user_id, maintenance_date, description, previous_condition, new_condition) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(insertLog, [invId, req.session.user.id, maintenance_date, description, previous_condition, new_condition], (err) => {
                if (err) return res.redirect(`/inventory/${invId}/history?error=Gagal menyimpan log.`);
                
                // Update kondisi dan status inventaris
                db.query('UPDATE inventory SET item_condition = ?, status = ? WHERE id = ?', [new_condition, finalStatusToSet, invId], () => {
                    res.redirect(`/inventory/${invId}/history?success=Log pemeliharaan berhasil ditambahkan.`);
                });
            });
        }
    });
});

// --- MANAJEMEN BHP (Consumables) ---
app.get('/consumables', checkAuth, checkConsumablesAccess, (req, res) => {
    db.query('SELECT id, name, stock, unit FROM consumables', (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.render('consumables', { title: 'Kelola BHP', user: req.session.user, consumablesList: [], error: 'Gagal mengambil data BHP.' });
        }
        res.render('consumables', { 
            title: 'Kelola BHP', 
            user: req.session.user, 
            consumablesList: results, 
            error: req.query.error || null,
            success: req.query.success || null
        });
    });
});

app.post('/consumables/add', checkAuth, checkKalabOrStaflab, (req, res) => {
    const { name, stock, unit } = req.body;
    db.query('INSERT INTO consumables (name, stock, unit) VALUES (?, ?, ?)', [name, stock, unit], (err, result) => {
        if (err) return res.redirect('/consumables?error=Gagal menambahkan BHP.');
        res.redirect('/consumables?success=BHP berhasil ditambahkan!');
    });
});

app.post('/consumables/edit/:id', checkAuth, checkKalabOrStaflab, (req, res) => {
    const { name, stock, unit } = req.body;
    db.query('UPDATE consumables SET name=?, stock=?, unit=? WHERE id=?', [name, stock, unit, req.params.id], (err, result) => {
        if (err) return res.redirect('/consumables?error=Gagal mengupdate BHP.');
        res.redirect('/consumables?success=BHP berhasil diperbarui!');
    });
});

app.post('/consumables/delete/:id', checkAuth, checkKalabOrStaflab, (req, res) => {
    db.query('DELETE FROM consumables WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.redirect('/consumables?error=Gagal menghapus BHP.');
        res.redirect('/consumables?success=BHP berhasil dihapus!');
    });
});

// --- SISTEM PENGADAAN (DRAF KALAB) ---
app.get('/procurements', checkAuth, checkKalab, (req, res) => {
    const query = 'SELECT p.*, u.name as creator_name FROM procurements p JOIN users u ON p.created_by = u.id WHERE p.created_by = ? ORDER BY p.created_at DESC';
    db.query(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.render('procurements', { title: 'Draf Pengadaan', user: req.session.user, procurementsList: [], error: 'Gagal mengambil data pengadaan.' });
        }
        res.render('procurements', { 
            title: 'Draf Pengadaan Tahunan', 
            user: req.session.user, 
            procurementsList: results, 
            error: req.query.error || null,
            success: req.query.success || null
        });
    });
});

app.post('/procurements/add', checkAuth, checkKalab, (req, res) => {
    const { year, title } = req.body;
    db.query('INSERT INTO procurements (year, title, created_by, status) VALUES (?, ?, ?, ?)', [year, title, req.session.user.id, 'Draft'], (err, result) => {
        if (err) return res.redirect('/procurements?error=Gagal membuat draf pengadaan.');
        res.redirect(`/procurements/${result.insertId}?success=Draf pengadaan berhasil dibuat! Silakan mulai menambahkan daftar barang (Inventaris & BHP).`);
    });
});

app.post('/procurements/delete/:id', checkAuth, checkKalab, (req, res) => {
    const procId = req.params.id;
    db.query('DELETE FROM procurements WHERE id = ? AND created_by = ?', [procId, req.session.user.id], (err, result) => {
        if (err) return res.redirect('/procurements?error=Gagal menghapus draf pengadaan.');
        if (result.affectedRows === 0) return res.redirect('/procurements?error=Draf tidak dapat dihapus atau Anda tidak memiliki akses.');
        res.redirect('/procurements?success=Draf pengadaan berhasil dihapus!');
    });
});

app.get('/procurements/:id', checkAuth, checkKalab, (req, res) => {
    const procId = req.params.id;
    // Cek apakah procurement ini milik kalab yang login
    db.query('SELECT * FROM procurements WHERE id = ? AND created_by = ?', [procId, req.session.user.id], (err, procResults) => {
        if (err || procResults.length === 0) return res.redirect('/procurements?error=Draf tidak ditemukan atau Anda tidak memiliki akses.');
        
        const procurement = procResults[0];
        
        db.query('SELECT pi.*, i.name as replace_item_name FROM procurement_items pi LEFT JOIN inventory i ON pi.replace_inventory_id = i.id WHERE pi.procurement_id = ?', [procId], (err, itemResults) => {
            if (err) itemResults = [];
            
            // Ambil daftar inventaris untuk opsi replacement
            db.query('SELECT id, name, item_code FROM inventory WHERE status != "Disposed"', (err, invResults) => {
                res.render('procurement_detail', {
                    title: `Detail Draf: ${procurement.title}`,
                    user: req.session.user,
                    procurement: procurement,
                    items: itemResults || [],
                    inventoryList: invResults || [],
                    error: req.query.error || null,
                    success: req.query.success || null
                });
            });
        });
    });
});

app.post('/procurements/:id/items/add', checkAuth, checkKalab, (req, res) => {
    const procId = req.params.id;
    const { item_type, name, price, quantity, link, replace_inventory_id } = req.body;
    
    // Pastikan status masih Draft
    db.query('SELECT status FROM procurements WHERE id = ? AND created_by = ?', [procId, req.session.user.id], (err, results) => {
        if (err || results.length === 0 || results[0].status !== 'Draft') {
            return res.redirect(`/procurements/${procId}?error=Tidak dapat menambah item, draf sudah dikunci.`);
        }
        
        const replaceId = (replace_inventory_id && replace_inventory_id.trim() !== '') ? replace_inventory_id : null;
        const insertQuery = 'INSERT INTO procurement_items (procurement_id, item_type, name, price, quantity, link, replace_inventory_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
        
        db.query(insertQuery, [procId, item_type, name, price, quantity, link, replaceId], (err) => {
            if (err) return res.redirect(`/procurements/${procId}?error=Gagal menambahkan item.`);
            res.redirect(`/procurements/${procId}?success=Item berhasil ditambahkan ke draf!`);
        });
    });
});

app.post('/procurements/:id/items/edit/:item_id', checkAuth, checkKalab, (req, res) => {
    const procId = req.params.id;
    const itemId = req.params.item_id;
    const { item_type, name, price, quantity, link, replace_inventory_id } = req.body;
    
    db.query('SELECT status FROM procurements WHERE id = ? AND created_by = ?', [procId, req.session.user.id], (err, results) => {
        if (err || results.length === 0 || results[0].status !== 'Draft') {
            return res.redirect(`/procurements/${procId}?error=Tidak dapat mengedit item, draf sudah dikunci.`);
        }
        
        const replaceId = (replace_inventory_id && replace_inventory_id.trim() !== '') ? replace_inventory_id : null;
        const updateQuery = 'UPDATE procurement_items SET item_type = ?, name = ?, price = ?, quantity = ?, link = ?, replace_inventory_id = ? WHERE id = ? AND procurement_id = ?';
        
        db.query(updateQuery, [item_type, name, price, quantity, link, replaceId, itemId, procId], (err) => {
            if (err) return res.redirect(`/procurements/${procId}?error=Gagal mengedit item.`);
            res.redirect(`/procurements/${procId}?success=Item berhasil diedit.`);
        });
    });
});

app.post('/procurements/:id/items/delete/:item_id', checkAuth, checkKalab, (req, res) => {
    const procId = req.params.id;
    const itemId = req.params.item_id;
    
    db.query('SELECT status FROM procurements WHERE id = ? AND created_by = ?', [procId, req.session.user.id], (err, results) => {
        if (err || results.length === 0 || results[0].status !== 'Draft') {
            return res.redirect(`/procurements/${procId}?error=Tidak dapat menghapus item, draf sudah dikunci.`);
        }
        
        db.query('DELETE FROM procurement_items WHERE id = ? AND procurement_id = ?', [itemId, procId], (err) => {
            if (err) return res.redirect(`/procurements/${procId}?error=Gagal menghapus item.`);
            res.redirect(`/procurements/${procId}?success=Item berhasil dihapus.`);
        });
    });
});

app.post('/procurements/:id/lock', checkAuth, checkKalab, (req, res) => {
    const procId = req.params.id;
    db.query('UPDATE procurements SET status = "Locked" WHERE id = ? AND created_by = ? AND status = "Draft"', [procId, req.session.user.id], (err) => {
        if (err) return res.redirect(`/procurements/${procId}?error=Gagal mengunci draf.`);
        res.redirect(`/procurements/${procId}?success=Draf berhasil dikunci!`);
    });
});

app.post('/procurements/:id/unlock', checkAuth, checkKalab, (req, res) => {
    const procId = req.params.id;
    db.query('UPDATE procurements SET status = "Draft" WHERE id = ? AND created_by = ? AND status = "Locked"', [procId, req.session.user.id], (err) => {
        if (err) return res.redirect(`/procurements/${procId}?error=Gagal membuka kunci draf.`);
        res.redirect(`/procurements/${procId}?success=Draf berhasil dibuka kembali (unlocked) dan dapat diubah!`);
    });
});

// --- SISTEM PENGADAAN (REVIEW KAPRODI) ---
app.get('/kaprodi/procurements', checkAuth, checkKaprodi, (req, res) => {
    const query = 'SELECT p.*, u.name as creator_name FROM procurements p JOIN users u ON p.created_by = u.id WHERE p.status IN ("Locked", "Finalized") ORDER BY p.created_at DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.render('kaprodi_procurements', { title: 'Review Pengadaan', user: req.session.user, procurementsList: [], error: 'Gagal mengambil data pengadaan.' });
        }
        res.render('kaprodi_procurements', { 
            title: 'Review Draf Pengadaan', 
            user: req.session.user, 
            procurementsList: results, 
            error: req.query.error || null,
            success: req.query.success || null
        });
    });
});

app.get('/kaprodi/procurements/:id', checkAuth, checkKaprodi, (req, res) => {
    const procId = req.params.id;
    db.query('SELECT p.*, u.name as creator_name FROM procurements p JOIN users u ON p.created_by = u.id WHERE p.id = ? AND p.status IN ("Locked", "Finalized")', [procId], (err, procResults) => {
        if (err || procResults.length === 0) return res.redirect('/kaprodi/procurements?error=Draf tidak ditemukan atau belum dikunci.');
        
        const procurement = procResults[0];
        
        db.query('SELECT pi.*, i.name as replace_item_name FROM procurement_items pi LEFT JOIN inventory i ON pi.replace_inventory_id = i.id WHERE pi.procurement_id = ?', [procId], (err, itemResults) => {
            if (err) itemResults = [];
            
            res.render('kaprodi_procurement_detail', {
                title: `Detail Draf: ${procurement.title}`,
                user: req.session.user,
                procurement: procurement,
                items: itemResults || [],
                error: req.query.error || null,
                success: req.query.success || null
            });
        });
    });
});

app.post('/kaprodi/procurements/:id/item/:item_id/review', checkAuth, checkKaprodi, (req, res) => {
    const procId = req.params.id;
    const itemId = req.params.item_id;
    const { approval_status } = req.body; // 'Approved' atau 'Rejected'
    
    // Pastikan status draf masih Locked
    db.query('SELECT status FROM procurements WHERE id = ?', [procId], (err, results) => {
        if (err || results.length === 0 || results[0].status !== 'Locked') {
            return res.redirect(`/kaprodi/procurements/${procId}?error=Tidak dapat mereview, draf mungkin sudah difinalisasi.`);
        }
        
        db.query('UPDATE procurement_items SET approval_status = ? WHERE id = ? AND procurement_id = ?', [approval_status, itemId, procId], (err) => {
            if (err) return res.redirect(`/kaprodi/procurements/${procId}?error=Gagal mengupdate status item.`);
            res.redirect(`/kaprodi/procurements/${procId}?success=Status item berhasil diperbarui!`);
        });
    });
});

app.post('/kaprodi/procurements/:id/finalize', checkAuth, checkKaprodi, (req, res) => {
    const procId = req.params.id;
    
    // Pastikan tidak ada item yang masih 'Pending'
    db.query('SELECT COUNT(*) as count FROM procurement_items WHERE procurement_id = ? AND approval_status = "Pending"', [procId], (err, results) => {
        if (err) return res.redirect(`/kaprodi/procurements/${procId}?error=Terjadi kesalahan pada database.`);
        
        if (results[0].count > 0) {
            return res.redirect(`/kaprodi/procurements/${procId}?error=Gagal difinalisasi. Semua item harus sudah di-review (Approved/Rejected).`);
        }
        
        db.query('UPDATE procurements SET status = "Finalized" WHERE id = ? AND status = "Locked"', [procId], (err) => {
            if (err) return res.redirect(`/kaprodi/procurements/${procId}?error=Gagal memfinalisasi draf.`);
            res.redirect(`/kaprodi/procurements/${procId}?success=Draf berhasil difinalisasi!`);
        });
    });
});

// --- SISTEM PENGADAAN (STAF ADMINISTRASI) ---
app.get('/stafadmin/procurements', checkAuth, checkStafAdmin, (req, res) => {
    const query = `
        SELECT p.*, u.name as creator_name,
               (SELECT COUNT(*) FROM procurement_items pi WHERE pi.procurement_id = p.id AND pi.approval_status = 'Approved') as total_approved,
               (SELECT COUNT(*) FROM procurement_items pi WHERE pi.procurement_id = p.id AND pi.approval_status = 'Approved' AND pi.received_date IS NOT NULL) as total_received
        FROM procurements p 
        JOIN users u ON p.created_by = u.id 
        WHERE p.status = "Finalized" ORDER BY p.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.render('stafadmin_procurements', { title: 'Daftar Draf Final', user: req.session.user, procurementsList: [], error: 'Gagal mengambil data pengadaan.' });
        }
        res.render('stafadmin_procurements', { 
            title: 'Daftar Draf Pengadaan (Final)', 
            user: req.session.user, 
            procurementsList: results, 
            error: req.query.error || null,
            success: req.query.success || null
        });
    });
});

app.get('/stafadmin/procurements/:id', checkAuth, checkStafAdmin, (req, res) => {
    const procId = req.params.id;
    db.query('SELECT p.*, u.name as creator_name FROM procurements p JOIN users u ON p.created_by = u.id WHERE p.id = ? AND p.status = "Finalized"', [procId], (err, procResults) => {
        if (err || procResults.length === 0) return res.redirect('/stafadmin/procurements?error=Draf tidak ditemukan atau belum difinalisasi.');
        
        const procurement = procResults[0];
        
        // Ambil item yang disetujui (Approved)
        db.query('SELECT pi.*, i.name as replace_item_name FROM procurement_items pi LEFT JOIN inventory i ON pi.replace_inventory_id = i.id WHERE pi.procurement_id = ? AND pi.approval_status = "Approved"', [procId], (err, itemResults) => {
            if (err) itemResults = [];
            
            db.query('SELECT id, name FROM rooms', (err, roomsResults) => {
                res.render('stafadmin_procurement_detail', {
                    title: `Detail Penerimaan Barang: ${procurement.title}`,
                    user: req.session.user,
                    procurement: procurement,
                    items: itemResults || [],
                    rooms: roomsResults || [],
                    error: req.query.error || null,
                    success: req.query.success || null
                });
            });
        });
    });
});

app.post('/stafadmin/procurements/:id/item/:item_id/receive', checkAuth, checkStafAdmin, upload.single('qr_code'), async (req, res) => {
    const procId = req.params.id;
    const itemId = req.params.item_id;
    const { received_date, item_code, room_id } = req.body;
    
    // Uploaded file should be QR Prodi
    const qr_code_prodi_path = req.file ? '/uploads/inventory/' + req.file.filename : null;
    let qr_code_path = null;

    if (item_code) {
        try {
            const fileName = 'qr_' + item_code.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
            const absolutePath = path.join(__dirname, 'public', 'uploads', 'inventory', fileName);
            await QRCode.toFile(absolutePath, item_code);
            qr_code_path = '/uploads/inventory/' + fileName;
        } catch (err) {
            console.error('QR Generate Error during receive:', err);
        }
    }

    db.query('SELECT * FROM procurement_items WHERE id = ? AND procurement_id = ? AND approval_status = "Approved"', [itemId, procId], (err, items) => {
        if (err || items.length === 0) return res.redirect(`/stafadmin/procurements/${procId}?error=Item tidak valid atau belum disetujui.`);
        const item = items[0];

        if (item.received_date) {
            return res.redirect(`/stafadmin/procurements/${procId}?error=Item ini sudah diterima sebelumnya.`);
        }

        db.query('UPDATE procurement_items SET received_date = ? WHERE id = ?', [received_date, itemId], (err) => {
            if (err) return res.redirect(`/stafadmin/procurements/${procId}?error=Gagal mengupdate tanggal terima.`);

            if (item.item_type === 'Inventory') {
                const insertInv = 'INSERT INTO inventory (item_code, name, room_id, status, item_condition, qr_code_path, qr_code_prodi_path, received_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                db.query(insertInv, [item_code, item.name, room_id || null, 'Active', 'Baru', qr_code_path, qr_code_prodi_path, received_date], (err) => {
                    if (err) console.error("Error insert inventory:", err);
                    
                    // Jika replace barang, ubah status barang lama
                    if (item.replace_inventory_id) {
                        db.query('UPDATE inventory SET status = "Disposed" WHERE id = ?', [item.replace_inventory_id]);
                    }
                });
            } else if (item.item_type === 'Consumable') {
                // Cek apakah consumable dengan nama sama sudah ada
                db.query('SELECT id, stock FROM consumables WHERE name = ?', [item.name], (err, cons) => {
                    if (cons && cons.length > 0) {
                        const newStock = cons[0].stock + item.quantity;
                        db.query('UPDATE consumables SET stock = ? WHERE id = ?', [newStock, cons[0].id]);
                    } else {
                        // Insert consumable baru
                        // Asumsi unit default 'Pcs' karena di draf tidak ada kolom unit
                        db.query('INSERT INTO consumables (name, stock, unit) VALUES (?, ?, ?)', [item.name, item.quantity, 'Pcs']);
                    }
                });
            }
            res.redirect(`/stafadmin/procurements/${procId}?success=Barang berhasil diterima dan dicatat!`);
        });
    });
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan aman di http://localhost:${PORT}`);
});