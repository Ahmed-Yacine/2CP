const mongoose = require('mongoose');
const dotenv = require('dotenv');
  // Uncaught Exception
  process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting Down...');
    console.log(err.name, err.message);
    process.exit(1);
  });
  
dotenv.config({ path: './config.env' });
  
const app = require('./App');
const { db } = require('./models/UserModel');


const DB = process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
mongoose.connect(DB)
.then( 
  async con => 
    {
    console.log('DB connection successful!');
  }
);

const port = process.env.PORT || 3000;
const Server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

  // Unhandled Rejection
  process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    Server.close(() => {
      process.exit(1);
    });
  });