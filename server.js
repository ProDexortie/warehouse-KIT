require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const path = require('path');
const jwt = require('jsonwebtoken');

// Инициализация Express
const app = express();
const PORT = process.env.PORT || 3000;

// Настройка Mongoose и подключение к MongoDB
mongoose.set('strictQuery', false); // Устраняет предупреждение о deprecated опции
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Подключено к MongoDB'))
.catch(err => console.error('Ошибка подключения к MongoDB:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессий
app.use(session({
  secret: process.env.JWT_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 60 * 60 * 24 // 1 день
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 день
}));

// Настройка шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Промежуточное ПО для проверки аутентификации
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.userId ? true : false;
  res.locals.user = req.session.user || null;
  next();
});

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');

// Использование маршрутов
app.use('/', authRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/reports', reportsRoutes);

// Главная страница
app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('index', { 
    title: 'Главная | Система управления складом',
    user: req.session.user 
  });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Страница не найдена',
    user: req.session.user 
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});