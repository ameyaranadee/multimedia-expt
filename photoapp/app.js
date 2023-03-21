const express = require("express"),
    bodyParser = require("body-parser"),
    app = express();

const multer = require('multer');
const sharp = require('sharp');
const upload = multer({ dest: 'uploads/' });
const admin = require('firebase-admin')

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', './views');

var serviceAccount = require('./admin.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://adbms-expt-default-rtdb.asia-southeast1.firebasedatabase.app/",
    authDomain: "adbms-expt.firebaseapp.com",
    storageBucket: 'gs://adbms-expt.appspot.com'
});

// Render upload form
app.get('/', (req, res) => {
    res.render('index');
});

// Set up route to handle POST request from form submission
app.post('/upload', upload.single('image'), function (req, res, next) {
    const file = req.file;
    if (!file) {
      const error = new Error('Please upload a file');
      error.status = 400;
      return next(error);
    }
    // Upload file to Firebase Storage
    const bucket = admin.storage().bucket();
    const timestamp = new Date().getTime().toString();
    const fileName = `${timestamp}-${file.originalname}`;
    const fileRef = bucket.file(fileName);
    const stream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });
    stream.on('error', function (error) {
      console.log('Error uploading file:', error);
      next(error);
    });
    stream.on('finish', function () {
      // Add file information to Firebase Realtime Database
      const db = admin.database();
      const ref = db.ref('uploads');
      ref.push({
        filename: fileName,
        contentType: file.mimetype,
        size: file.size
      }, function (error) {
        if (error) {
          console.log('Error adding file to database:', error);
          next(error);
        } else {
          res.send('File uploaded successfully');
        }
      });
    });
    stream.end(req.file.buffer);
  });

app.listen(3000, function () {
    console.log("App has started!!!");
});