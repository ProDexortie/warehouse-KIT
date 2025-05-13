const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { generateToken, isAuthenticated, checkRole } = require('../middleware/auth');

// Страница входа
router.get('/login', async (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  
  // Проверяем, есть ли пользователи в системе
  try {
    const userCount = await User.countDocuments();
    
    // Если пользователей нет, показываем страницу первоначальной настройки
    if (userCount === 0) {
      return res.render('initial-setup', { 
        title: 'Начальная настройка | Система управления складом',
        error: null 
      });
    }
    
    // Иначе показываем обычную страницу входа
    res.render('login', { 
      title: 'Вход | Система управления складом',
      error: null 
    });
  } catch (error) {
    console.error('Ошибка при проверке пользователей:', error);
    res.render('login', { 
      title: 'Вход | Система управления складом',
      error: 'Ошибка при подключении к базе данных. Пожалуйста, попробуйте позже.' 
    });
  }
});

// Обработка входа
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Проверка наличия username и password
    if (!username || !password) {
      return res.render('login', { 
        title: 'Вход | Система управления складом',
        error: 'Введите имя пользователя и пароль' 
      });
    }
    
    // Поиск пользователя
    const user = await User.findOne({ username });
    if (!user) {
      return res.render('login', { 
        title: 'Вход | Система управления складом',
        error: 'Пользователь не найден' 
      });
    }
    
    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { 
        title: 'Вход | Система управления складом',
        error: 'Неверный пароль' 
      });
    }
    
    // Создание сессии
    req.session.userId = user._id;
    req.session.user = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    };
    
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('login', { 
      title: 'Вход | Система управления складом',
      error: 'Произошла ошибка при входе. Попробуйте еще раз.' 
    });
  }
});

// Обработка первоначальной настройки
router.post('/initial-setup', async (req, res) => {
  try {
    // Проверяем, есть ли уже пользователи в системе
    const userCount = await User.countDocuments();
    
    if (userCount > 0) {
      return res.redirect('/login');
    }
    
    const { username, password, fullName } = req.body;
    
    // Проверка наличия всех полей
    if (!username || !password || !fullName) {
      return res.render('initial-setup', { 
        title: 'Начальная настройка | Система управления складом',
        error: 'Все поля обязательны к заполнению'
      });
    }
    
    // Создание первого администратора
    const newUser = new User({
      username,
      password,
      fullName,
      role: 'admin' // Первый пользователь всегда администратор
    });
    
    await newUser.save();
    
    // Автоматический вход после регистрации
    req.session.userId = newUser._id;
    req.session.user = {
      id: newUser._id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role
    };
    
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('initial-setup', { 
      title: 'Начальная настройка | Система управления складом',
      error: 'Произошла ошибка при создании пользователя'
    });
  }
});

// Страница регистрации (только для админа)
router.get('/register', (req, res) => {
  // Проверка, является ли пользователь админом
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  
  res.render('register', { 
    title: 'Регистрация | Система управления складом',
    error: null,
    user: req.session.user
  });
});

// Обработка регистрации
router.post('/register', async (req, res) => {
  try {
    // Проверка, является ли пользователь админом
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    
    const { username, password, fullName, role } = req.body;
    
    // Проверка наличия всех полей
    if (!username || !password || !fullName || !role) {
      return res.render('register', { 
        title: 'Регистрация | Система управления складом',
        error: 'Все поля обязательны к заполнению',
        user: req.session.user
      });
    }
    
    // Проверка на существующего пользователя
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { 
        title: 'Регистрация | Система управления складом',
        error: 'Пользователь с таким именем уже существует',
        user: req.session.user
      });
    }
    
    // Создание нового пользователя
    const newUser = new User({
      username,
      password,
      fullName,
      role
    });
    
    await newUser.save();
    
    res.redirect('/users');
  } catch (error) {
    console.error(error);
    res.render('register', { 
      title: 'Регистрация | Система управления складом',
      error: 'Произошла ошибка при регистрации',
      user: req.session.user
    });
  }
});

// Выход из системы
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Ошибка при выходе');
    }
    res.redirect('/login');
  });
});

// API для входа
router.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Проверка наличия username и password
    if (!username || !password) {
      return res.status(400).json({ message: 'Введите имя пользователя и пароль' });
    }
    
    // Поиск пользователя
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }
    
    // Создание JWT токена
    const token = generateToken(user._id);
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Управление пользователями (только для админа)
router.get('/users', async (req, res) => {
  try {
    // Проверка, является ли пользователь админом
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.redirect('/login');
    }
    
    const users = await User.find().select('-password');
    
    res.render('users', { 
      title: 'Пользователи | Система управления складом',
      users,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router;