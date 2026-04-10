const mongoose = require('mongoose');

const JoueurSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  telephone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  score: {
    type: Number,
    default: 0
  },
  aPaye: {
    type: Boolean,
    default: false
  },
  estConnecte: {
    type: Boolean,
    default: false
  },
  dateInscription: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Joueur', JoueurSchema);