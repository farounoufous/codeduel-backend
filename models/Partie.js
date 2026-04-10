const mongoose = require('mongoose');

const PartieSchema = new mongoose.Schema({
  statut: {
    type: String,
    enum: ['attente', 'en_cours', 'terminee'],
    default: 'attente'
  },
  joueurs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Joueur'
  }],
  gagnant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Joueur',
    default: null
  },
  cagnotte: {
    type: Number,
    default: 0
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateFin: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Partie', PartieSchema);