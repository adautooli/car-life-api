const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ status: false, msg: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1]; // Espera "Bearer <token>"

  if (!token) {
    return res.status(401).json({ status: false, msg: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // Você pode acessar isso nas rotas como req.userId
    next();
  } catch (err) {
    return res.status(403).json({ status: false, msg: 'Token expirado ou inválido' });
  }
};
