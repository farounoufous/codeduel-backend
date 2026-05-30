const express = require('express');
const router = express.Router();
const Partie = require('../models/Partie');
const Joueur = require('../models/Joueur');

// ===== CRÉER UNE NOUVELLE PARTIE =====
router.post('/creer', async (req, res) => {
  try {
    // Vérifier qu'il n'y a pas déjà une partie en attente ou en cours
    const partieExiste = await Partie.findOne({
      statut: { $in: ['attente', 'en_cours'] }
    });
    if (partieExiste) {
      return res.status(400).json({ message: 'Une partie est déjà en cours' });
    }

    const partie = new Partie();
    await partie.save();

    res.status(201).json({
      message: '✅ Partie créée',
      partie
    });

  } catch (err) {
    res.status(500).json({ message: '❌ Erreur serveur', erreur: err.message });
  }
});

// ===== REJOINDRE UNE PARTIE =====
router.post('/rejoindre', async (req, res) => {
  try {
    const { joueurId } = req.body;

    // Trouver la partie en attente
    const partie = await Partie.findOne({ statut: 'attente' });
    if (!partie) {
      return res.status(404).json({ message: 'Aucune partie disponible' });
    }

    // Vérifier que le joueur a payé
    const joueur = await Joueur.findById(joueurId);
    if (!joueur) {
      return res.status(404).json({ message: 'Joueur introuvable' });
    }
    if (!joueur.aPaye) {
      return res.status(403).json({ message: 'Paiement requis pour rejoindre' });
    }

    // Vérifier que le joueur n'est pas déjà dans la partie
    if (partie.joueurs.includes(joueurId)) {
      return res.status(400).json({ message: 'Joueur déjà dans la partie' });
    }

    // Ajouter le joueur et mettre à jour la cagnotte
    partie.joueurs.push(joueurId);
    partie.cagnotte += 300;

    // Démarrer la partie si 20 joueurs sont réunis
    if (partie.joueurs.length >= 10) {
      partie.statut = 'en_cours';
    }

    await partie.save();

    res.json({
      message: '✅ Joueur ajouté à la partie',
      joueursDansPartie: partie.joueurs.length,
      cagnotte: partie.cagnotte,
      statut: partie.statut
    });

  } catch (err) {
    res.status(500).json({ message: '❌ Erreur serveur', erreur: err.message });
  }
});

// ===== RÉCUPÉRER LA PARTIE EN COURS =====
router.get('/en-cours', async (req, res) => {
  try {
    const partie = await Partie.findOne({
      statut: { $in: ['attente', 'en_cours'] }
    }).populate('joueurs', 'nom telephone score');

    if (!partie) {
      return res.status(404).json({ message: 'Aucune partie en cours' });
    }

    res.json(partie);

  } catch (err) {
    res.status(500).json({ message: '❌ Erreur serveur', erreur: err.message });
  }
});

// ===== TERMINER UNE PARTIE ET PAYER LE GAGNANT =====
router.post('/terminer/:id', async (req, res) => {
  try {
    const partie = await Partie.findById(req.params.id)
      .populate('joueurs', 'nom telephone score');

    if (!partie) {
      return res.status(404).json({ message: 'Partie introuvable' });
    }

    // Trouver le joueur avec le score le plus élevé
    const gagnant = partie.joueurs.reduce((max, joueur) =>
      joueur.score > max.score ? joueur : max
    , partie.joueurs[0]);

    // ===== VIREMENT FEDAPAY =====
    const FedaPay = require('fedapay');
    FedaPay.default.setApiKey(process.env.FEDAPAY_SECRET_KEY);
    FedaPay.default.setEnvironment(process.env.FEDAPAY_ENV);

    // Créer le virement
    const virement = await FedaPay.Payout.create({
      amount: 5000,
      currency: { iso: 'XOF' },
      mode: 'mtn',
      customer: {
        firstname: gagnant.nom,
        lastname: '',
        phone_number: {
          number: gagnant.telephone,
          country: 'BJ'
        }
      }
    });

    // Envoyer le virement
    await FedaPay.Payout.sendNow([virement.id]);

    // Mettre à jour la partie
    partie.statut = 'terminee';
    partie.gagnant = gagnant._id;
    partie.dateFin = new Date();
    await partie.save();

    res.json({
      message: '🏆 Partie terminée ! Virement envoyé au gagnant !',
      gagnant: gagnant.nom,
      telephone: gagnant.telephone,
      cagnotte: 5000,
      virementId: virement.id
    });

  } catch (err) {
    console.error('Erreur virement:', err);
    res.status(500).json({ message: '❌ Erreur virement', erreur: err.message });
  }
});
module.exports = router;