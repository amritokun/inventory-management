const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = 3001;

// 1. PATHS
const frontendPath = path.resolve(__dirname, '../frontend/dist');
const uploadsPath = path.resolve(__dirname, 'uploads');

// Ensure uploads dir exists
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// 2. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 3. STATIC SERVING (Crucial Order)
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(frontendPath));

// 4. DATABASE
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) console.error('DB Error:', err.message);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sku TEXT, barcode TEXT, quantity INTEGER DEFAULT 0, price REAL DEFAULT 0.0, description TEXT, image_url TEXT)`);
    }
});

// 5. API ROUTES
app.get('/api/items', (req, res) => {
    db.all('SELECT * FROM items ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ items: rows });
    });
});

const storage = multer.diskStorage({
    destination: uploadsPath,
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.post('/api/items', upload.single('image'), (req, res) => {
    const { name, sku, barcode, quantity, price, description } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    db.run(`INSERT INTO items (name, sku, barcode, quantity, price, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [name, sku, barcode, quantity, price, description, imageUrl], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Success', id: this.lastID });
    });
});

app.put('/api/items/:id', upload.single('image'), (req, res) => {
    const { name, sku, barcode, quantity, price, description } = req.body;
    const { id } = req.params;
    
    if (req.file) {
        const imageUrl = `/uploads/${req.file.filename}`;
        db.run(`UPDATE items SET name = ?, sku = ?, barcode = ?, quantity = ?, price = ?, description = ?, image_url = ? WHERE id = ?`,
            [name, sku, barcode, quantity, price, description, imageUrl, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Updated with image' });
            });
    } else {
        db.run(`UPDATE items SET name = ?, sku = ?, barcode = ?, quantity = ?, price = ?, description = ? WHERE id = ?`,
            [name, sku, barcode, quantity, price, description, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Updated' });
            });
    }
});

app.patch('/api/items/:id/stock', (req, res) => {
    db.run(`UPDATE items SET quantity = ? WHERE id = ?`, [req.body.quantity, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Success' });
    });
});

app.delete('/api/items/:id', (req, res) => {
    db.run('DELETE FROM items WHERE id = ?', [req.params.id], () => res.json({ message: 'Deleted' }));
});

// 6. SPA FALLBACK (Must be last)
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend build not found. Please run build.');
    }
});

// 7. START
app.listen(PORT, () => {
    console.log(`Inventory App running on port ${PORT}`);
    const url = `http://localhost:${PORT}`;
    const startCmd = process.platform === 'win32' ? 'start' : 'open';
    exec(`${startCmd} ${url}`);
});
