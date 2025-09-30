const mongoose = require('mongoose');

const playSchema = new mongoose.Schema({
  title: String,
  author: String,
  year: Number,
  // add any other fields your plays have
});

module.exports = mongoose.model('Play', playSchema, 'plays'); 
// 'plays' ensures Mongoose uses the existing collection
