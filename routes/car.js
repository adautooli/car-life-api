const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware para autenticar o token e obter o usuário
const authenticate = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ status: false, msg: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ status: false, msg: 'Token inválido ou expirado' });
  }
};

// Cadastro de carro (somente para usuários autenticados)
router.post('/registerCar', authenticate, async (req, res) => {
  const { plate, model, modelYear, manufactureYear, color, mileage } = req.body;

  try {
    const existingCar = await Car.findOne({ plate });
    if (existingCar)
      return res.status(400).json({ status: false, msg: 'This plate is already registered' });

    const car = new Car({
      plate,
      model,
      modelYear,
      manufactureYear,
      color,
      mileage,
      user: req.userId
    });

    await car.save();

    res.status(201).json({ status: true, msg: 'Car registered successfully', car });
  } catch (err) {
    console.error('❌ Error registering car:', err);
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Lista carros do usuário logado
router.get('/myCars', authenticate, async (req, res) => {
  try {
    const cars = await Car.find({ user: req.userId });

    const sanitizedCars = cars.map(car => {
      const carObject = car.toObject();

      if (!carObject.previousOwners || carObject.previousOwners.length === 0) {
        delete carObject.previousOwners;
      }

      if (!carObject.transferHistory || carObject.transferHistory.length === 0) {
        delete carObject.transferHistory;
      }

      return carObject;
    });

    res.status(200).json({ status: true, cars: sanitizedCars });
  } catch (err) {
    res.status(500).json({ status: false, msg: 'Erro ao buscar carros' });
  }
});


module.exports = router;
