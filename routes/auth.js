const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');
const moment = require('moment');
const resizeBase64Image = require('../utils/resizeBase64Image');
require('dotenv').config();

// ✅ Cadastro
router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ status: false, msg: 'Email já cadastrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullName, email, password: hashedPassword });

    await user.save();

    res.status(201).json({ status: true, msg: 'Usuário cadastrado com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao cadastrar usuário:', err);
    res.status(500).json({ status: false, msg: 'Erro no servidor' });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ status: false, msg: 'Usuário não encontrado' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ status: false, msg: 'Senha incorreta' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.json({ status: true, token });
  } catch (err) {
    res.status(500).json({ status: false, msg: 'Erro no servidor' });
  }
});

// ✅ Dados do usuário autenticado
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ status: false, msg: 'Usuário não encontrado' });

    const userObj = user.toObject();

    
    if (userObj.birthday) {
      userObj.birthday = moment(userObj.birthday, 'DD/MM/YYYY').format('DD/MM/YYYY');
    } else {
      delete userObj.birthday;
    }

    
    if (!userObj.profileImage) {
      delete userObj.profileImage;
    }

    res.json({ status: true, user: userObj });
  } catch (err) {
    res.status(500).json({ status: false, msg: 'Erro ao buscar usuário', error: err.message });
  }
});


// ✅ Atualizar perfil (sem alterar nome e email)
router.patch('/me/update', authenticate, async (req, res) => {
  const { birthday, profileImage, password } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ status: false, msg: 'Usuário não encontrado' });

    if (birthday !== undefined) user.birthday = birthday;

    if (profileImage !== undefined) {
      try {
        const resized = await resizeBase64Image(profileImage);
        user.profileImage = resized;
      } catch (err) {
        return res.status(400).json({ status: false, msg: 'Erro ao processar imagem: ' + err.message });
      }
    }

    if (password !== undefined) {
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
    }

    await user.save();
    res.json({ status: true, msg: 'Perfil atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ status: false, msg: 'Erro ao atualizar perfil', error: err.message });
  }
});


module.exports = router;
