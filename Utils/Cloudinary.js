const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name:"dj62xbjdj",
  api_key: "632715116798545",
  api_secret: "gCYSGdfvguRByBSFjw0B2xqoFQA",
});

module.exports = cloudinary;