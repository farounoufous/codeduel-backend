const express = require('express');
const router = express.Router();
const { FedaPay, Transaction } = require('fedapay');
const Joueur = require('../models/Joueur');
const Partie = require('../models/Partie');

// Configurer FedaPay
FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
FedaPay.setEnvironment(process.env.FEDAPAY_ENV || 'sandbox');

// ===== INITIER UN PAIEMENT =====
router.post('/initier', async (req, res) => {
  try {
    const { joueurId, telephone, nom } = req.body;

    const transaction = await Transaction.create({
      description: 'Mise CodeDuel - 300 FCFA',
      amount: 300,
      currency: { iso: 'XOF' },
      callback_url: `${process.env.APP_URL}/api/paiement/callback`,
      customer: {
        firstname: nom,
        lastname: '',
        phone_number: {
          number: telephone,
          country: 'BJ'
        }
      }
    });

    // Générer le lien de paiement
    const token = await transaction.generateToken();

    res.json({
      message: 'Paiement initié',
      transactionId: transaction.id,
      paiementUrl: token.url,
      joueurId
    });

  } catch (err) {
    console.error('Erreur paiement:', err);
    res.status(500).json({ message: 'Erreur paiement', erreur: err.message });
  }
});

// ===== CALLBACK FEDAPAY (confirmation du paiement) =====
router.post('/callback', async (req, res) => {
  try {
    const { id, status } = req.body;

    if (status === 'approved') {
      console.log('✅ Paiement confirmé pour transaction:', id);
    }

    res.json({ message: 'Callback reçu' });

  } catch (err) {
    res.status(500).json({ message: 'Erreur callback', erreur: err.message });
  }
});

// ===== VÉRIFIER UN PAIEMENT =====
router.get('/verifier/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.retrieve(req.params.transactionId);

    res.json({
      statut: transaction.status,
      montant: transaction.amount,
      approuve: transaction.status === 'approved'
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur vérification', erreur: err.message });
  }
});

module.exports = router;