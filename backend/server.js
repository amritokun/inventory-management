const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// 1. SERVE STATIC FILES FIRST
const frontendPath = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. API ROUTES
app.get('/api/items', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    db.all('SELECT * FROM items ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ items: rows });
    });
});

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (!err) {
        db.run(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sku TEXT, barcode TEXT, quantity INTEGER DEFAULT 0, price REAL DEFAULT 0.0, description TEXT, image_url TEXT)`);
    }
});

const upload = multer({ dest: 'uploads/' });
app.post('/api/items', upload.single('image'), (req, res) => {
    const { name, sku, barcode, quantity, price, description } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    db.run(`INSERT INTO items (name, sku, barcode, quantity, price, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`, [name, sku, barcode, quantity, price, description, imageUrl], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Success', id: this.lastID });
    });
});

app.patch('/api/items/:id/stock', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    db.run(`UPDATE items SET quantity = ? WHERE id = ?`, [quantity, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Success' });
    });
});

app.delete('/api/items/:id', (req, res) => {
    db.run('DELETE FROM items WHERE id = ?', [req.params.id], (err) => {
        res.json({ message: 'Deleted' });
    });
});

// 3. FALLBACK FOR ANY NON-MATCHING ROUTE
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
