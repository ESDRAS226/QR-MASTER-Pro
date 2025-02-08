const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Ajout de gestion d'erreur pour MongoDB
mongoose.connect('mongodb://localhost:27017/qrcodes', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
}).then(() => {
    console.log('Connecté à MongoDB');
}).catch(err => {
    console.error('Erreur de connexion MongoDB:', err);
});

const qrCodeSchema = new mongoose.Schema({
    text: String,
    expirationDate: Date,
    scanCount: { type: Number, default: 0 },
    redirections: {
        morning: String,
        afternoon: String,
        evening: String
    }
});

const QRCode = mongoose.model('QRCode', qrCodeSchema);

app.post('/generate', async (req, res) => {
    const { text, expirationDate } = req.body;
    const qrCode = new QRCode({ text, expirationDate });
    await qrCode.save();
    res.json({ id: qrCode._id });
});

app.post('/generate-contextual', async (req, res) => {
    const { text, expirationDate, redirections } = req.body;
    const qrCode = new QRCode({ text, expirationDate, redirections });
    await qrCode.save();
    res.json({ id: qrCode._id });
});

app.get('/scan/:id', async (req, res) => {
    const qrCode = await QRCode.findById(req.params.id);
    if (!qrCode) {
        return res.status(404).send('QR Code not found');
    }
    if (new Date() > qrCode.expirationDate) {
        return res.status(410).send('QR Code expired');
    }
    qrCode.scanCount += 1;
    await qrCode.save();

    const hour = new Date().getHours();
    let redirectUrl = qrCode.text;
    if (hour < 12) {
        redirectUrl = qrCode.redirections.morning || qrCode.text;
    } else if (hour < 18) {
        redirectUrl = qrCode.redirections.afternoon || qrCode.text;
    } else {
        redirectUrl = qrCode.redirections.evening || qrCode.text;
    }

    res.redirect(redirectUrl);
});

// Ajout de gestion d'erreur globale
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Une erreur est survenue!' });
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
