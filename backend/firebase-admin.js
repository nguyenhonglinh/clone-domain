const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Tải file này từ Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { db }; 