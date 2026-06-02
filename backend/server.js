const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend Build
// Use absolute path for reliability with PM2
const frontendPath = path.resolve(__dirname, '../frontend/dist');
console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sku TEXT,
                barcode TEXT,
                quantity INTEGER DEFAULT 0,
                price REAL DEFAULT 0.0,
                description TEXT,
                image_url TEXT
            )
        `);
    }
});

// API Routes

// Get all items
app.get('/api/items', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    db.all('SELECT * FROM items ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ items: rows });
    });
});

// Get a single item
app.get('/api/items/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json({ item: row });
    });
});

// Add a new item
app.post('/api/items', upload.single('image'), (req, res) => {
    const { name, sku, barcode, quantity, price, description } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const sql = `INSERT INTO items (name, sku, barcode, quantity, price, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, sku, barcode, quantity, price, description, imageUrl];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'Item added successfully',
            id: this.lastID
        });
    });
});

// Update an item
app.put('/api/items/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, sku, barcode, quantity, price, description } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Build the query dynamically based on whether an image was uploaded
    let sql = `UPDATE items SET name = ?, sku = ?, barcode = ?, quantity = ?, price = ?, description = ?`;
    let params = [name, sku, barcode, quantity, price, description];

    if (imageUrl !== undefined) {
        sql += `, image_url = ?`;
        params.push(imageUrl);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Item updated successfully', changes: this.changes });
    });
});

// Quick update stock
app.patch('/api/items/:id/stock', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (quantity === undefined) {
        return res.status(400).json({ error: 'Quantity is required' });
    }

    db.run(`UPDATE items SET quantity = ? WHERE id = ?`, [quantity, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Stock updated successfully', changes: this.changes });
    });
});

// Delete an item
app.delete('/api/items/:id', (req, res) => {
    const { id } = req.params;
    
    // Optional: Get the item first to delete the associated image file
    db.get('SELECT image_url FROM items WHERE id = ?', [id], (err, row) => {
        if (row && row.image_url) {
            const filePath = path.join(__dirname, row.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        db.run('DELETE FROM items WHERE id = ?', [id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Item deleted', changes: this.changes });
        });
    });
});

// Fallback to index.html for React routing
// This must be AFTER all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
