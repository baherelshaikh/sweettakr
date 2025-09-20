const bcrypt = require("bcryptjs");

// Hash password
const hashPassword = async (password, saltNumber) => {
    const salt = await bcrypt.genSalt(saltNumber); 
    return await bcrypt.hash(password, salt);
};

// Verify password
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

module.exports = { hashPassword, verifyPassword };
