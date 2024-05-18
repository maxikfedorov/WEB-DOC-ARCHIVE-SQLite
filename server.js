const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const iconv = require('iconv-lite');

const app = express();
const PORT = 3000;
const db = new Database(path.join(__dirname, 'db', 'archive.db'));

// Настройка CORS
app.use(cors());

// Создание таблиц в базе данных, если они не существуют
db.exec(`
    CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT,
        filename TEXT,
        uploadDate DATETIME,
        modifyDate DATETIME,
        extension TEXT,
        size REAL,
        state TEXT,
        relatedFiles TEXT,
        data BLOB
    );
    CREATE TABLE IF NOT EXISTS trash (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileId INTEGER,
        filename TEXT,
        deleteDate DATETIME,
        data BLOB,
        FOREIGN KEY (fileId) REFERENCES files(id)
    );
`);

// Настройка хранилища для multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        // Конвертация имени файла в UTF-8
        file.originalname = iconv.decode(Buffer.from(file.originalname, 'latin1'), 'utf-8');
        cb(null, true);
    }
});

app.use(express.static('public'));

// Функция для очистки имени файла
const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
};

// Маршрут для загрузки файлов
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Файл не загружен');
    }

    const stmt = db.prepare(`
        INSERT INTO files (author, filename, uploadDate, modifyDate, extension, size, state, relatedFiles, data)
        VALUES (?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
        req.body.username || 'guest',
        req.file.originalname,
        path.extname(req.file.originalname),
        req.file.size / 1024, // Размер файла в килобайтах
        'Current',
        JSON.stringify([]),
        req.file.buffer
    );

    res.json({ id: info.lastInsertRowid, filename: req.file.originalname, size: req.file.size / 1024 });
});

// Маршрут для получения списка файлов
app.get('/files', (req, res) => {
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
    const filterParam = req.query.filterParam === 'size' ? 'size' : 'id';
    const author = req.query.author || '';
    const filename = req.query.filename || '';
    const searchType = req.query.searchType === 'exact' ? '=' : 'LIKE';
    const authorQuery = searchType === 'LIKE' ? `%${author}%` : author;
    const filenameQuery = searchType === 'LIKE' ? `%${filename}%` : filename;

    let query = `
        SELECT id, filename, size FROM files 
        WHERE state = 'Current'
    `;
    const params = [];

    if (author) {
        query += ` AND author ${searchType} ?`;
        params.push(authorQuery);
    }

    if (filename) {
        query += ` AND filename ${searchType} ?`;
        params.push(filenameQuery);
    }

    query += ` ORDER BY ${filterParam} ${order}`;

    const stmt = db.prepare(query);
    const files = stmt.all(...params);
    res.json(files);
});

// Маршрут для удаления файлов (перемещение в корзину)
app.delete('/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const stmt = db.prepare(`
        SELECT * FROM files WHERE id = ?
    `);
    const fileMeta = stmt.get(id);

    if (!fileMeta) {
        return res.status(404).send('Файл не найден');
    }

    const deleteStmt = db.prepare(`
        INSERT INTO trash (fileId, filename, deleteDate, data)
        VALUES (?, ?, datetime('now'), ?)
    `);
    deleteStmt.run(id, fileMeta.filename, fileMeta.data);

    const updateStmt = db.prepare(`
        UPDATE files SET state = 'Deleted', modifyDate = datetime('now') WHERE id = ?
    `);
    updateStmt.run(id);

    res.sendStatus(200);
});

// Маршрут для замены файлов
app.post('/replace', upload.single('file'), (req, res) => {
    const oldId = parseInt(req.body.oldId);
    const stmt = db.prepare(`
        SELECT * FROM files WHERE id = ?
    `);
    const oldFileMeta = stmt.get(oldId);

    if (!oldFileMeta) {
        return res.status(404).send('Старый файл не найден');
    }

    const deleteStmt = db.prepare(`
        INSERT INTO trash (fileId, filename, deleteDate, data)
        VALUES (?, ?, datetime('now'), ?)
    `);
    deleteStmt.run(oldId, oldFileMeta.filename, oldFileMeta.data);

    const updateStmt = db.prepare(`
        UPDATE files SET state = 'Deleted', modifyDate = datetime('now') WHERE id = ?
    `);
    updateStmt.run(oldId);

    const insertStmt = db.prepare(`
        INSERT INTO files (author, filename, uploadDate, modifyDate, extension, size, state, relatedFiles, data)
        VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
    `);

    const info = insertStmt.run(
        oldFileMeta.author,
        req.file.originalname,
        oldFileMeta.uploadDate,
        path.extname(req.file.originalname),
        req.file.size / 1024, // Размер файла в килобайтах
        'Current',
        JSON.stringify([oldId]),
        req.file.buffer
    );

    // Обновление поля relatedFiles у старого файла
    const newId = info.lastInsertRowid;
    const relatedFiles = JSON.parse(oldFileMeta.relatedFiles);
    relatedFiles.push(newId);

    const updateRelatedFilesStmt = db.prepare(`
        UPDATE files SET relatedFiles = ? WHERE id = ?
    `);
    updateRelatedFilesStmt.run(JSON.stringify(relatedFiles), oldId);

    res.json({ id: newId, filename: req.file.originalname, oldFilename: oldFileMeta.filename });
});

// Маршрут для скачивания файла
app.get('/download/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const stmt = db.prepare(`
        SELECT filename, data FROM files WHERE id = ?
    `);
    const file = stmt.get(id);

    if (!file) {
        return res.status(404).send('Файл не найден');
    }

    const encodedFileName = encodeURIComponent(file.filename);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.send(file.data);
});

// Маршрут для проверки и реанимации файлов
app.post('/check-files', (req, res) => {
    const stmt = db.prepare(`
        SELECT * FROM files WHERE state = 'Current'
    `);
    const metaData = stmt.all();

    const updateStmt = db.prepare(`
        UPDATE files SET state = 'Deleted', modifyDate = ? WHERE id = ?
    `);

    metaData.forEach(file => {
        if (!file) {
            updateStmt.run(new Date().toISOString(), file.id);
        }
    });

    res.sendStatus(200);
});

//Очистка корзины
app.post('/empty-trash', (req, res) => {
    const deleteStmt = db.prepare(`
        DELETE FROM trash
    `);
    deleteStmt.run();

    const updateStmt = db.prepare(`
        UPDATE files SET state = 'Purged', modifyDate = datetime('now') WHERE state = 'Deleted'
    `);
    updateStmt.run();

    res.sendStatus(200);
});

// Маршрут для получения метаданных
app.get('/metadata', (req, res) => {
    const stmt = db.prepare(`
        SELECT * FROM files
    `);
    const metaData = stmt.all();
    res.json(metaData);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
