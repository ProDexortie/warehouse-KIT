const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Проверка авторизации пользователя
exports.isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Проверка роли пользователя
exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('403', {
        title: 'Доступ запрещен',
        message: 'У вас нет прав для доступа к этой странице',
        user: req.session.user
      });
    }
    
    next();
  };
};

// Проверка авторизации для API
exports.isAuthenticatedApi = (req, res, next) => {
  try {
    // Получение токена из заголовка
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Проверка токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
};

// Создание JWT токена
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
};