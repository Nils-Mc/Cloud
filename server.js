require('dotenv').config(); // Lädt die .env-Datei
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = 'links.json'; // Speichert Links in dieser Datei

// Stellt statische Dateien bereit
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Links laden oder ein leeres Array initialisieren
let links = fs.existsSync(FILE_PATH) ? JSON.parse(fs.readFileSync(FILE_PATH)) : [];

// API: Alle Links abrufen
app.get('/api/links', (req, res) => {
    res.json(links);
});

// Seite zum Link hinzufügen
app.get('/add', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'add.html'));
});

// Seite zur Verwaltung der Links
app.get('/manage', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

// Seite zum Passwortschutz-Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// POST: Passwort-Login für das Dashboard
app.post('/dashboard-login', (req, res) => {
    const { password } = req.body;
    const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD; // Passwort aus .env

    if (password === DASHBOARD_PASSWORD) {
        res.send(`
            <script>
                localStorage.setItem("dashboardAccess", "true");
                window.location.href = "/dashboard";
            </script>
        `);
    } else {
        res.send("🚫 Falsches Passwort! <a href='/dashboard'>🔙 Zurück</a>");
    }
});

// POST: Link speichern
app.post('/add', (req, res) => {
    let { name, url, password } = req.body; // Um Fehler "Assignment to constant variable" zu vermeiden

    if (name && url && password) {
        const id = links.length + 1;

        // URL in eingebettetes Format umwandeln, wenn es ein Google Drive Ordner ist
        if (url.includes('drive.google.com/drive/folders/')) {
            const folderId = url.split('folders/')[1].split('?')[0];
            url = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
        }

        links.push({ id, name, url, password });
        fs.writeFileSync(FILE_PATH, JSON.stringify(links, null, 2));
        res.redirect('/manage');
    } else {
        res.send('⚠️ Bitte alle Felder ausfüllen!');
    }
});

// POST: Link löschen
app.post('/delete/:id', (req, res) => {
    links = links.filter(l => l.id != req.params.id);
    fs.writeFileSync(FILE_PATH, JSON.stringify(links, null, 2));
    res.redirect('/manage');
});

// POST: Link bearbeiten
app.post('/edit/:id', (req, res) => {
    let { name, url, password } = req.body; // Um Fehler "Assignment to constant variable" zu vermeiden
    const index = links.findIndex(l => l.id == req.params.id);

    if (index !== -1 && name && url && password) {
        // URL in eingebettetes Format umwandeln, wenn es ein Google Drive Ordner ist
        if (url.includes('drive.google.com/drive/folders/')) {
            const folderId = url.split('folders/')[1].split('?')[0];
            url = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
        }

        links[index] = { id: links[index].id, name, url, password };
        fs.writeFileSync(FILE_PATH, JSON.stringify(links, null, 2));
    }

    res.redirect('/manage');
});

// POST: Passwort prüfen und eingebetteten Link anzeigen
app.post('/link/:id', (req, res) => {
    const link = links.find(l => l.id == req.params.id);
    if (!link) return res.send("❌ Link nicht gefunden!");

    if (req.body.password === link.password) {
        res.send(`
            <html>
            <head>
                <title>${link.name}</title>
                <style>
                    body { margin: 0; overflow: hidden; background: #111; color: white; text-align: center; }
                    iframe { width: 100vw; height: 100vh; border: none; }
                    a { color: cyan; text-decoration: none; position: absolute; top: 10px; left: 10px; }
                </style>
            </head>
            <body>
                <a href="/">⬅️ Zurück</a>
                <iframe src="${link.url}"></iframe>
            </body>
            </html>
        `);
    } else {
        res.send("🚫 Falsches Passwort!");
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
