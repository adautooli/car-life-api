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
  const { placa, modelo, ano } = req.body;

  if (!placa || !modelo || !ano) {
    return res.status(400).json({ status: false, msg: 'Todos os campos são obrigatórios' });
  }

  try {
    const existingCar = await Car.findOne({ placa });
    if (existingCar) {
      return res.status(400).json({ status: false, msg: 'Já existe um carro com essa placa' });
    }

    const newCar = new Car({
      placa,
      modelo,
      ano,
      user: req.userId
    });

    await newCar.save();

    res.status(201).json({ status: true, msg: 'Carro cadastrado com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao cadastrar carro:', err);
    res.status(500).json({ status: false, msg: 'Erro no servidor' });
  }
});

// Lista carros do usuário logado
router.get('/myCars', authenticate, async (req, res) => {
  try {
    const cars = await Car.find({ user: req.userId });
    res.status(200).json({ status: true, cars });
  } catch (err) {
    res.status(500).json({ status: false, msg: 'Erro ao buscar carros' });
  }
});

module.exports = router;
