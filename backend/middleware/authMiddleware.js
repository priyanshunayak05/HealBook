const { authenticate } = require("./auth");

const protect = authenticate;

module.exports = { protect };
