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

app.get('/success', (req, res) => {
    res.render('success');
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
            res.render('success', { fileName: fileName });
        }
      });
    });
    stream.end(req.file.buffer);
  });

// Set up route to handle POST request to resize image
app.post('/resize', function (req, res, next) {
    const bucket = admin.storage().bucket();
    const timestamp = new Date().getTime().toString();
    const fileName = req.body.fileName;
    const resizedFileName = `resized-${timestamp}-${fileName}`;
  
    // Download original image from Firebase Storage
    const fileRef = bucket.file(fileName);
    fileRef.download(function (error, contents) {
      if (error) {
        console.log('Error downloading file:', error);
        next(error);
      } else {
        // Resize image using sharp library
        sharp(contents)
          .resize(200, 200)
          .toBuffer(function (error, data) {
            if (error) {
              console.log('Error resizing image:', error);
              next(error);
            } else {
              // Upload resized image to Firebase Storage
              const resizedFileRef = bucket.file(resizedFileName);
              const stream = resizedFileRef.createWriteStream({
                metadata: {
                  contentType: file.mimetype
                }
              });
              stream.on('error', function (error) {
                console.log('Error uploading file:', error);
                next(error);
              });
              stream.on('finish', function () {
                console.log('Image resized successfully');
                res.render('resize', {bucket: bucket, file: resizedFileRef })
              });
              stream.end(data);
            }
          });
      }
    });
  });
 

app.listen(3000, function () {
    console.log("App has started!!!");
});