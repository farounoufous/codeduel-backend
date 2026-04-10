const express = require('express');
const router = express.Router();
const Joueur = require('../models/Joueur');

// Inscription
router.post('/inscription', async (req, res) => {
  try {
    const { nom, telephone } = req.body;
    const existe = await Joueur.findOne({ telephone });
    if (existe) {
      return res.status(400).json({ message: 'Ce numéro est déjà inscrit' });
    }
    const joueur = new Joueur({ nom, telephone });
    await joueur.save();
    res.status(201).json({ message: 'Inscription réussie', joueur });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// Connexion
router.post('/connexion', async (req, res) => {
  try {
    const { telephone } = req.body;
    const joueur = await Joueur.findOne({ telephone });
    if (!joueur) {
      return res.status(404).json({ message: 'Joueur introuvable' });
    }
    res.json({ message: 'Connexion réussie', joueur });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// Tous les joueurs
router.get('/', async (req, res) => {
  try {
    const joueurs = await Joueur.find().sort({ score: -1 });
    res.json(joueurs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// Un joueur par ID
router.get('/:id', async (req, res) => {
  try {
    const joueur = await Joueur.findById(req.params.id);
    if (!joueur) {
      return res.status(404).json({ message: 'Joueur introuvable' });
    }
    res.json(joueur);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;