const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());

// Rotas
app.use('/api', require('./routes/auth'));
app.use('/api/car', require('./routes/car'));
app.use('/api/transfer', require('./routes/transfer'));


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
