const bucket = require('./firebase');

const uploadImageToFirebase = async (file) => {
  if (!file || !file.buffer || !file.originalname || !file.mimetype) {
    throw new Error('Invalid file input');
  }

  const fileName = `${Date.now()}-${file.originalname}`;
  const fileUpload = bucket.file(fileName);

  return new Promise((resolve, reject) => {
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });
    uploadFile
    blobStream.on('error', (err) => {
      console.error('Firebase upload error:', err);
      reject(err);
    });

    blobStream.on('finish', async () => {
      try {
        await fileUpload.makePublic();

        // the following url is related to our firebase project in firebase.console
        // bucket.name is the name of our Firebase Storage bucket
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
        resolve(publicUrl);
      } catch (err) {
        reject(err);
      }
    });

    blobStream.end(file.buffer);
  });
};

module.exports = uploadImageToFirebase;



/* 

Exemple pf using this function : 

1- const uploadImageToFirebase = require('./firebase/uploadImage');
2- const imageUrl = await uploadImageToFirebase(file);
 
And now send or save the imageUrl from or to the db
for exemple in carController

*/

