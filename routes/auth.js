const express = require('express');
const router = express.Router();
const User = require('../models/User');
const getNextSequence = require('../utils/getNextSequence');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Cadastro
router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({status: false, msg: 'Email já cadastrado' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newId = await getNextSequence('user_id');


    const user = new User({ id: newId, fullName, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ status: true ,msg: 'Usuário cadastrado com sucesso' });
  } catch (err) {
    res.status(500).json({ status: false, msg: 'Erro no servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({status: false, msg: 'Usuário não encontrado' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({status: false, msg: 'Senha incorreta' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.json({status: true, token });
  } catch (err) {
    res.status(500).json({status: false, msg: 'Erro no servidor' });
  }
});

// Dados do usuário autenticado
router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ status: false, msg: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    res.json({ status: true, user });
  } catch (err) {
    res.status(401).json({status: false, msg: 'Token inválido ou expirado por favor faça login novamente' });
  }
});

module.exports = router;
