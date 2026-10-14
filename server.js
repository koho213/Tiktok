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

    const silencePath = path.join(__dirname, 'uploads', `silence_${Date.now()}.aac`);

    // Étape 1 : Créer le fichier audio silencieux
    const createSilenceCmd = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -c:a aac "${silencePath}"`;

    exec(createSilenceCmd, (err) => {
        if (err) {
            console.error(err);
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            return res.status(500).send('Erreur génération audio');
        }

        // Étape 2 : Mappage multi-flux Video (0:v + 0:v) et Audio (0:a + 1:a + 1:a)
        const ffmpegCmd = `ffmpeg -i "${inputPath}" -i "${silencePath}" -map 0:v -map 0:v -map 0:a -map 1:a -map 1:a -c:v copy -c:a aac -metadata title="Edited by K.hocine" -metadata artist="K.hocine" -metadata:s:v:0 title="Primary Video Track" -metadata:s:v:1 title="Secondary Video Shield" -metadata:s:a:1 title="S1" -metadata:s:a:1 language="eng" -metadata:s:a:2 title="S2" -metadata:s:a:2 language="eng" -metadata description='[{"creationDate":"2026-10-14T03:25:00+0100","make":"Android","videoIndex":1,"userSystem":"14","appRecord":"1","MD5":"","videoDevice":"","system":"14","userDevice":"M2101K6G","deviceResolution":[],"importPath":"","videoResolution":{"width":720,"height":1280},"videoDuration":8275,"isRecord":1,"isCropped":0,"sourceAppID":1233}]' -metadata copyright="K.hocine" "${outputPath}"`;

        exec(ffmpegCmd, (error) => {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(silencePath)) fs.unlinkSync(silencePath);

            if (error) {
                console.error(error);
                return res.status(500).send('Erreur traitement FFmpeg');
            }

            res.download(outputPath, outputFileName, () => {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));
