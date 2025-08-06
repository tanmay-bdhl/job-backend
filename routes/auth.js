const express = require('express');
const { signup, googleSignup, login, googleLogin } = require('../controllers/authController');
const router = express.Router();

router.post('/signup', signup);
router.post('/signup/google', googleSignup);
router.post('/login', login);
router.post('/login/google', googleLogin);

module.exports = router;
