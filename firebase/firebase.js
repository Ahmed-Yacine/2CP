const admin = require('firebase-admin');
const serviceAccount = require('firebaseKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '<BUCKET_NAME>.appspot.com',  // <BUCKET_NAME> is pur firebase project bucket name
});

const bucket = admin.storage().bucket();

module.exports = bucket;
