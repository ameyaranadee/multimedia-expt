const express = require("express"),
    bodyParser = require("body-parser"),
    app = express();

const multer = require('multer');
const sharp = require('sharp');
const upload = multer({ dest: 'uploads/' });
const admin = require('firebase-admin');

var serviceAccount = require('./admin.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://project-id.firebaseio.com",
    authDomain: "adbms-expt.firebaseapp.com",
});

var db = admin.database();
var userRef = db.ref("users");

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Render upload form
app.get('/', (req, res) => {
    res.render('index');
});

app.listen(3000, function () {
    console.log("App has started!!!");
});

app.post('/upload', upload.single('image'), async (req, res) => {
    const { path, mimetype } = req.file;

    // Check if uploaded file is an image
    if (!mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Only images are allowed' });
    }

    try {
        // Resize image to 200x200 pixels
        const buffer = await sharp(path).resize(200, 200).toBuffer();

        // TODO: Save buffer to storage (e.g. AWS S3, Google Cloud Storage)

        res.json({ message: 'Image uploaded and processed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});
