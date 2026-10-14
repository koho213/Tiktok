const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/process', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).send('Aucun fichier.');

    const inputPath = req.file.path;
    const outputFileName = req.file.originalname.replace(/\.[^/.]+$/, "") + '_hd.mp4';
    const outputPath = path.join(__dirname, 'outputs', outputFileName);

    if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');

    // Commande FFmpeg sans réencodage (-c copy) pour injecter les métadonnées instantanément
    const cmd = `ffmpeg -i "${inputPath}" -c copy -metadata description='[{"creationDate":"2026-10-11T19:09:31+0100","make":"Android","videoIndex":1,"userSystem":"13","appRecord":"1","MD5":"","videoDevice":"","system":"13","userDevice":"M2101K6G","deviceResolution":[],"importPath":"","videoResolution":{"width":720,"height":1280},"videoDuration":8275,"isRecord":1,"isCropped":0,"sourceAppID":1233}]' -metadata copyright="4bc4446b5940dcf47e7e4eb70c78696f" "${outputPath}"`;

    exec(cmd, (error) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (error) {
            console.error(error);
            return res.status(500).send('Erreur FFmpeg');
        }
        res.download(outputPath, outputFileName, () => {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));
