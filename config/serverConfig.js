const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.join(__dirname, "../", ".env") 
});

module.exports = {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_KEY: process.env.JWT_KEY
};