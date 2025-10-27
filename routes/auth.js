const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Car = require('../models/Car');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');
const moment = require('moment');
const resizeBase64Image = require('../utils/resizeBase64Image');
const multer = require('multer');
const sharp = require('sharp');
const { uploadBufferToCloudinary } = require('../utils/uploadCloudinary');

require('dotenv').config();

// Armazena o arquivo em memória (buffer) e aceita apenas imagens (até 8MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('Invalid file type'));
    cb(null, true);
  }
});

// Redimensiona/otimiza para avatar
async function normalizeAvatar(buffer) {
  return sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 85, mozjpeg: true })   // se preferir: .webp({ quality: 80 })
    .toBuffer();
}


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

    // Formatar data
    if (userObj.birthday) {
      userObj.birthday = moment(userObj.birthday).format('DD/MM/YYYY');
    }

    // Se não tiver imagem, remover o campo
    if (!userObj.profileImageUrl) {
      delete userObj.profileImageUrl;
    }

    res.json({ status: true, user: userObj });
  } catch (err) {
    res.status(500).json({ status: false, msg: 'Erro ao buscar usuário', error: err.message });
  }
});

// ✅ /me/full → Retorna dados do usuário + lista de carros
router.get('/me/full', authenticate, async (req, res) => {
  try {
    // 1️⃣ Buscar o usuário autenticado (sem a senha)
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ status: false, msg: 'Usuário não encontrado' });
    }

    // 2️⃣ Converter para objeto JS e formatar campos
    const userObj = user.toObject();

    // Formatar data de nascimento (DD/MM/YYYY)
    if (userObj.birthday) {
      userObj.birthday = moment(userObj.birthday).format('DD/MM/YYYY');
    }

    // Se não tiver imagem, remover o campo
    if (!userObj.profileImageUrl) {
      delete userObj.profileImageUrl;
    }

    // 3️⃣ Buscar carros do usuário
    const cars = await Car.find({ user: req.userId });

    // Sanitizar os carros (remover arrays vazios)
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

    // 4️⃣ Adicionar lista de carros ao objeto do usuário
    userObj.cars = sanitizedCars;

    // 5️⃣ Retornar resposta final
    res.status(200).json({ status: true, user: userObj });

  } catch (err) {
    console.error('❌ Erro ao buscar usuário completo:', err);
    res.status(500).json({
      status: false,
      msg: 'Erro ao buscar informações completas do usuário',
      error: err.message
    });
  }
});




// ✅ Atualizar perfil (sem alterar nome e email) + upload de avatar
router.patch('/me/update', authenticate, upload.single('profileImage'), async (req, res) => {
  try {
    const { birthday, password } = req.body;

    // Nunca permitir alterar email/fullName (ignora silenciosamente se vierem)
    if ('email' in req.body) delete req.body.email;
    if ('fullName' in req.body) delete req.body.fullName;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ status: false, msg: 'Usuário não encontrado' });

    // Atualiza somente campos enviados
    if (typeof birthday !== 'undefined') {
      user.birthday = birthday; // mantém seu formato atual; se quiser, converto para Date depois
    }

    // FOTO DE PERFIL
    // Prioridade: arquivo multipart (req.file). Se não vier, mantém compatibilidade com base64 no body.
    if (req.file) {
      try {
        const normalized = await normalizeAvatar(req.file.buffer);
        const url = await uploadBufferToCloudinary(normalized, { folder: 'profiles' });
        user.profileImageUrl = url;     // guarda só a URL
        if (user.profileImage) user.profileImage = undefined; // limpa legado base64
      } catch (e) {
        return res.status(400).json({ status: false, msg: 'Erro ao processar imagem: ' + e.message });
      }
    } else if (typeof req.body.profileImage === 'string' && req.body.profileImage.trim() !== '') {
      // Compat: recebeu base64 no body
      try {
        const b64 = req.body.profileImage.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(b64, 'base64');
        const normalized = await normalizeAvatar(buf);
        const url = await uploadBufferToCloudinary(normalized, { folder: 'profiles' });
        user.profileImageUrl = url;
        if (user.profileImage) user.profileImage = undefined;
      } catch (e) {
        return res.status(400).json({ status: false, msg: 'Erro ao processar imagem (base64): ' + e.message });
      }
    }

    if (typeof password !== 'undefined' && password !== '') {
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
    }

    await user.save();
    return res.json({
      status: true,
      msg: 'Perfil atualizado com sucesso',
      profileImageUrl: user.profileImageUrl
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, msg: 'Erro ao atualizar perfil', error: err.message });
  }
});

// Buscar usuário pelo e-mail
router.post('/user/search', authenticate, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: false, msg: "Email is required" });
    }

    // Busca o usuário pelo e-mail
    const user = await User.findOne({ email }).select('_id fullName email profileImageUrl');

    // Caso não encontre ninguém
    if (!user) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }

    // Retorna o usuário (mesmo que seja o próprio)
    return res.status(200).json({
      status: true,
      user,
    });
  } catch (err) {
    console.error("❌ Error searching user:", err);
    res.status(500).json({
      status: false,
      msg: "Server error while searching user",
      error: err.message,
    });
  }
});



module.exports = router;
