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

    // Chemin temporaire pour le flux de silence secondaire
    const silencePath = path.join(__dirname, 'uploads', `silence_${Date.now()}.aac`);

    // Étape 1 : Créer un flux audio de silence d'une seconde
    const createSilenceCmd = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -c:a aac "${silencePath}"`;

    exec(createSilenceCmd, (err) => {
        if (err) {
            console.error(err);
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            return res.status(500).send('Erreur génération audio secondaire');
        }

        // Étape 2 : Assembler la vidéo, l'audio principal, le flux secondaire et injecter les métadonnées
        const ffmpegCmd = `ffmpeg -i "${inputPath}" -i "${silencePath}" -map 0:v -map 0:a -map 1:a -c:v copy -c:a aac -metadata:s:a:1 title="S" -metadata:s:a:1 language="eng" -metadata description='[{"creationDate":"2026-10-11T19:09:31+0100","make":"Android","videoIndex":1,"userSystem":"13","appRecord":"1","MD5":"","videoDevice":"","system":"13","userDevice":"M2101K6G","deviceResolution":[],"importPath":"","videoResolution":{"width":720,"height":1280},"videoDuration":8275,"isRecord":1,"isCropped":0,"sourceAppID":1233}]' -metadata copyright="4bc4446b5940dcf47e7e4eb70c78696f" "${outputPath}"`;

        exec(ffmpegCmd, (error) => {
            // Nettoyage des fichiers temporaires
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
