const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', 'db_config.env') });

const app = express();
app.use(cors());
app.use(express.json());
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Asegurar que la carpeta uploads existe
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Conexión a la base de datos
let db;
async function connectDB() {
    try {
        db = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log('Conectado a la base de datos MySQL');
    } catch (err) {
        console.error('Error al conectar a la base de datos:', err);
    }
}
connectDB();

// Endpoints

// 1. Obtener catálogos para los selectores
app.get('/api/catalogos', async (req, res) => {
    try {
        const [unidades] = await db.query('SELECT idunidadmedida as id, nombreunidad as nombre FROM unidadmedida ORDER BY nombre');
        const [presentaciones] = await db.query('SELECT idpresentacion as id, nombrepresentacion as nombre FROM presentacion ORDER BY nombre');
        const [laboratorios] = await db.query('SELECT idlaboratorio as id, nombrelaboratorio as nombre FROM laboratorio ORDER BY nombre');
        
        res.json({ unidades, presentaciones, laboratorios });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Listar productos (últimos 50)
app.get('/api/productos', async (req, res) => {
    try {
        const [productos] = await db.query(`
            SELECT p.*, u.nombreunidad, pr.nombrepresentacion, l.nombrelaboratorio 
            FROM producto p
            LEFT JOIN unidadmedida u ON p.unidadmedida_idunidadmedida = u.idunidadmedida
            LEFT JOIN presentacion pr ON p.presentacion_idpresentacion = pr.idpresentacion
            LEFT JOIN laboratorio l ON p.laboratorio_idlaboratorio = l.idlaboratorio
            ORDER BY p.idproducto DESC 
            LIMIT 50
        `);
        res.json(productos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Registrar producto
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    try {
        const {
            nombre, codbarra, vencimiento, ubicacion, 
            idunidad, idpresentacion, idlaboratorio,
            composicion, precioventa, precioblister, preciocaja, stock
        } = req.body;

        // Generar código interno estilo NewFarma
        const codigoproducto = `NewFarma-${Date.now()}`;
        const imagen_path = req.file ? `uploads/${req.file.filename}` : null;
        const estado = 'Activo';

        const [result] = await db.query(
            `INSERT INTO producto (
                codigoproducto, nombre, vencimiento, estado, composicion, 
                ubicacion, presentacion_idpresentacion, unidadmedida_idunidadmedida, 
                laboratorio_idlaboratorio, stock, precioventa, precioblister, 
                preciocaja, codbarra, imagen_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                codigoproducto, nombre, vencimiento, estado, composicion,
                ubicacion, idpresentacion, idunidad, idlaboratorio,
                stock, precioventa, precioblister, preciocaja, codbarra, imagen_path
            ]
        );

        res.status(201).json({ message: 'Producto registrado con éxito', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT} y disponible en la red local`);
});
