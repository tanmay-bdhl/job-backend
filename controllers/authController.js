const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

function validateEmail(email) {
  return /.+@.+\..+/.test(email);
}

function generateToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

exports.signup = async (req, res) => {
  const { email, password } = req.body;
  console.log('[AUTH][SIGNUP][REQ]', {
    emailPreview: typeof email === 'string' ? email.slice(0, 3) + '***' : undefined,
    ip: req.ip,
    ua: req.get && req.get('user-agent'),
    time: new Date().toISOString(),
  });
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });
    const token = generateToken(user);
    res.status(200).json({ user: { email: user.email, id: user._id }, token });
  } catch (err) {
    console.error('[AUTH][SIGNUP][ERR]', { message: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.googleSignup = async (req, res) => {
  const { credential } = req.body;
  console.log('[AUTH][GOOGLE_SIGNUP][REQ]', {
    hasCredential: Boolean(credential),
    ip: req.ip,
    ua: req.get && req.get('user-agent'),
    time: new Date().toISOString(),
  });
  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required' });
  }
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) {
      return res.status(401).json({ message: 'Invalid Google token: no email' });
    }
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, password: '' });
    }
    const token = generateToken(user);
    res.status(200).json({ user: { email: user.email, id: user._id }, token });
  } catch (err) {
    console.error('[AUTH][GOOGLE_SIGNUP][ERR]', { message: err.message, stack: err.stack });
    res.status(401).json({ message: 'Invalid Google token' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log('[AUTH][LOGIN][REQ]', {
    emailPreview: typeof email === 'string' ? email.slice(0, 3) + '***' : undefined,
    hasPassword: Boolean(password),
    ip: req.ip,
    ua: req.get && req.get('user-agent'),
    time: new Date().toISOString(),
  });
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.status(200).json({ user: { email: user.email, id: user._id }, token });
  } catch (err) {
    console.error('[AUTH][LOGIN][ERR]', { message: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.googleLogin = async (req, res) => {
  const { credential } = req.body;
  console.log('[AUTH][GOOGLE_LOGIN][REQ]', {
    hasCredential: Boolean(credential),
    ip: req.ip,
    ua: req.get && req.get('user-agent'),
    time: new Date().toISOString(),
  });
  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required' });
  }
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) {
      return res.status(401).json({ message: 'Invalid Google token: no email' });
    }
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, password: '-' });
    }
    const token = generateToken(user);
    res.status(200).json({ user: { email: user.email, id: user._id }, token });
  } catch (err) {
    console.error('[AUTH][GOOGLE_LOGIN][ERR]', { message: err.message, stack: err.stack });
    res.status(401).json({ message: 'Invalid Google token' });
  }
}; 