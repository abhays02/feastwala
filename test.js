try {
  const mongoose = require('mongoose');
  console.log('Mongoose loaded successfully!');
  console.log('Mongoose version:', mongoose.version);
} catch (err) {
  console.error('Error loading mongoose:', err);
}
