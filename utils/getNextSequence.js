const mongoose = require('mongoose');

const getNextSequence = async (sequenceName) => {
  const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  return counter.value.sequence_value;
};

module.exports = getNextSequence;
