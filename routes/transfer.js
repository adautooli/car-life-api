const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const User = require('../models/User');
const OwnershipTransfer = require('../models/OwnershipTransfer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ status: false, msg: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ status: false, msg: 'Invalid or expired token' });
  }
};
router.post('/initiate', authenticate, async (req, res) => {
  const { carId, newOwnerId } = req.body;

  try {
    const car = await Car.findById(carId);
    if (!car) 
      return res.status(404).json({ status: false, msg: 'Car not found' });

    // Verifica se o usuário logado é o dono do carro
    if (car.user.toString() !== req.userId)
      return res.status(403).json({ status: false, msg: 'Not the car owner' });

    // Verifica se o novo dono é o mesmo que o atual dono
    if (car.user.toString() === newOwnerId)
      return res.status(400).json({ status: false, msg: 'Cannot transfer to yourself' });

    // Verifica se já existe uma transferência em andamento para este carro
    const existingTransfer = await OwnershipTransfer.findOne({
      car: carId,
      status: { $in: ['pending'] } // ajuste conforme o nome do seu status
    });

    if (existingTransfer) {
      return res.status(400).json({
        status: false,
        msg: 'There is already an active transfer for this car'
      });
    }

    // Cria nova transferência
    const transfer = new OwnershipTransfer({
      car: car._id,
      from: req.userId,
      to: newOwnerId,
      status: 'pending'
    });

    await transfer.save();

    car.transferHistory.push(transfer._id);
    await car.save();

    res.status(201).json({ status: true, msg: 'Transfer initiated', transfer });
  } catch (err) {
    console.error('❌ Error initiating transfer:', err);
    res.status(500).json({ status: false, msg: 'Server error', error: err.message });
  }
});


router.post('/accept', authenticate, async (req, res) => {
    const { transferId } = req.body;
  
    try {
      const transfer = await OwnershipTransfer.findById(transferId).populate('car');
      if (!transfer || transfer.status !== 'pending')
        return res.status(400).json({ status: false, msg: 'Invalid transfer' });
      if (transfer.to.toString() !== req.userId)
        return res.status(403).json({ status: false, msg: 'Not authorized to accept' });
  
      const car = await Car.findById(transfer.car._id);
      const previousOwner = await User.findById(transfer.from);
  
      car.previousOwners.push({ userId: previousOwner._id, name: previousOwner.fullName });
      car.user = transfer.to;
      transfer.status = 'completed';
      transfer.finishedAt = new Date();
  
      await transfer.save();
      await car.save();
  
      res.json({ status: true, msg: 'Ownership transferred' });
    } catch (err) {
      res.status(500).json({ status: false, msg: 'Server error', error: err.message });
    }
  });
  

  router.post('/reject', authenticate, async (req, res) => {
    const { transferId, reason } = req.body;
  
    try {
      const transfer = await OwnershipTransfer.findById(transferId);
      if (!transfer || transfer.status !== 'pending')
        return res.status(400).json({ status: false, msg: 'Invalid transfer' });
      if (transfer.to.toString() !== req.userId)
        return res.status(403).json({ status: false, msg: 'Not authorized to reject' });
  
      transfer.status = 'rejected';
      transfer.finishedAt = new Date();
      transfer.rejectionReason = reason;
  
      await transfer.save();
  
      res.json({ status: true, msg: 'Transfer rejected' });
    } catch (err) {
      res.status(500).json({ status: false, msg: 'Server error', error: err.message });
    }
  });
  

  router.post('/status', authenticate, async (req, res) => {
    const { transferId } = req.body;
  
    try {
      const transfer = await OwnershipTransfer.findById(transferId)
        .populate('car')
        .populate('from', 'fullName email')
        .populate('to', 'fullName email');
  
      if (!transfer) {
        return res.status(404).json({ status: false, msg: 'Transfer not found' });
      }
  
      res.json({ status: true, transfer });
    } catch (err) {
      res.status(500).json({ status: false, msg: 'Server error', error: err.message });
    }
  });
  

module.exports = router;