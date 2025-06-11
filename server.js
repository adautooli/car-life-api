const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json({ limit: '100mb' }));

// Rotas
app.use('/api', require('./routes/auth'));
app.use('/api/car', require('./routes/car'));
app.use('/api/transfer', require('./routes/transfer'));


// Middleware para tratamento de erro de payload grande
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      status: false,
      msg: 'A Imagem enviada é muito grande, por favor envie uma nova imagem com no máximo 5mb',
    });
  }

  // Outros erros não tratados
  console.error('Erro não tratado:', err);
  res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
});



// Conexão com MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () =>
      console.log(`🚀 Servidor rodando na porta ${PORT}`)
    );
  })
  .catch(err => console.error('❌ Erro ao conectar no MongoDB', err));
