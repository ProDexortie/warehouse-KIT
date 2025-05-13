const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Transaction = require('../models/transaction');
const { isAuthenticated, checkRole } = require('../middleware/auth');

// Все маршруты в этом файле требуют аутентификации
router.use(isAuthenticated);

// Главная страница отчетов
router.get('/', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    // Общее количество товаров
    const totalProducts = await Product.countDocuments();
    
    // Общая стоимость инвентаря
    const productValues = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$stockQuantity", "$price"] } },
          totalCost: { $sum: { $multiply: ["$stockQuantity", "$cost"] } }
        }
      }
    ]);
    
    const totalValue = productValues.length > 0 ? productValues[0].totalValue : 0;
    const totalCost = productValues.length > 0 ? productValues[0].totalCost : 0;
    
    // Товары с низким уровнем запасов
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
    });
    
    // Товары с нулевым запасом
    const outOfStockProducts = await Product.find({ stockQuantity: 0 });
    
    // Транзакции за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = await Transaction.find({
      timestamp: { $gte: thirtyDaysAgo }
    }).sort({ timestamp: -1 });
    
    // Подсчет транзакций по типам
    const inTransactions = recentTransactions.filter(t => t.type === 'in').length;
    const outTransactions = recentTransactions.filter(t => t.type === 'out').length;
    const moveTransactions = recentTransactions.filter(t => t.type === 'move').length;
    const adjustmentTransactions = recentTransactions.filter(t => t.type === 'adjustment').length;
    
    res.render('reports', {
      title: 'Отчеты | Система управления складом',
      totalProducts,
      totalValue,
      totalCost,
      lowStockProducts,
      outOfStockProducts,
      inTransactions,
      outTransactions,
      moveTransactions,
      adjustmentTransactions,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Отчет о транзакциях
router.get('/transactions', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    // Получение параметров запроса
    const { startDate, endDate, type, search } = req.query;
    
    // Построение запроса
    let query = {};
    
    // Фильтрация по датам
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    } else if (startDate) {
      query.timestamp = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.timestamp = { $lte: new Date(endDate + 'T23:59:59.999Z') };
    }
    
    // Фильтрация по типу транзакции
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // Поиск по штрих-коду
    if (search) {
      query.barcode = { $regex: search, $options: 'i' };
    }
    
    // Получение транзакций с данными о товаре и пользователе
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .populate('product', 'name')
      .populate('performedBy', 'username fullName');
    
    res.render('transaction-report', {
      title: 'Отчет о транзакциях | Система управления складом',
      transactions,
      startDate: startDate || '',
      endDate: endDate || '',
      type: type || 'all',
      search: search || '',
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Отчет о товарах
router.get('/products', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    // Получение параметров запроса
    const { category, sort, stockStatus } = req.query;
    
    // Построение запроса
    let query = {};
    
    // Фильтрация по категории
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Фильтрация по статусу запасов
    if (stockStatus === 'low') {
      query = {
        ...query,
        $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
      };
    } else if (stockStatus === 'out') {
      query = {
        ...query,
        stockQuantity: 0
      };
    } else if (stockStatus === 'high') {
      query = {
        ...query,
        $expr: { $gt: ['$stockQuantity', { $multiply: ['$minStockLevel', 2] }] }
      };
    }
    
    // Получение всех уникальных категорий
    const categories = await Product.distinct('category');
    
    // Получение товаров с сортировкой
    let sortOption = { name: 1 }; // По умолчанию по названию (A-Z)
    
    if (sort === 'name-desc') {
      sortOption = { name: -1 };
    } else if (sort === 'stock-asc') {
      sortOption = { stockQuantity: 1 };
    } else if (sort === 'stock-desc') {
      sortOption = { stockQuantity: -1 };
    } else if (sort === 'value-asc') {
      sortOption = { price: 1 };
    } else if (sort === 'value-desc') {
      sortOption = { price: -1 };
    }
    
    const products = await Product.find(query).sort(sortOption);
    
    // Расчет общей стоимости и количества
    const totalValue = products.reduce((sum, product) => {
      return sum + (product.price * product.stockQuantity);
    }, 0);
    
    const totalCost = products.reduce((sum, product) => {
      return sum + (product.cost * product.stockQuantity);
    }, 0);
    
    const totalItems = products.reduce((sum, product) => {
      return sum + product.stockQuantity;
    }, 0);
    
    res.render('product-report', {
      title: 'Отчет о товарах | Система управления складом',
      products,
      categories,
      selectedCategory: category || 'all',
      sort: sort || 'name-asc',
      stockStatus: stockStatus || 'all',
      totalValue,
      totalCost,
      totalItems,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Экспорт отчета о товарах в CSV
router.get('/export/products', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    
    // Заголовки столбцов
    let csv = 'Штрих-код,Название,Категория,Количество,Цена,Себестоимость,Общая стоимость,Местоположение\n';
    
    // Данные
    products.forEach(product => {
      const totalValue = product.price * product.stockQuantity;
      const location = `${product.location.zone}-${product.location.rack}-${product.location.shelf}`;
      
      csv += `"${product.barcode}","${product.name}","${product.category}",${product.stockQuantity},${product.price},${product.cost},${totalValue},"${location}"\n`;
    });
    
    // Установка заголовков ответа для скачивания файла
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products-report.csv');
    
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Экспорт отчета о транзакциях в CSV
router.get('/export/transactions', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    // Получение параметров запроса
    const { startDate, endDate, type } = req.query;
    
    // Построение запроса
    let query = {};
    
    // Фильтрация по датам
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    } else if (startDate) {
      query.timestamp = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.timestamp = { $lte: new Date(endDate + 'T23:59:59.999Z') };
    }
    
    // Фильтрация по типу транзакции
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .populate('product', 'name')
      .populate('performedBy', 'username fullName');
    
    // Заголовки столбцов
    let csv = 'Дата,Тип,Документ,Штрих-код,Название товара,Количество,Откуда,Куда,Причина,Пользователь\n';
    
    // Данные
    transactions.forEach(transaction => {
      const date = transaction.timestamp.toISOString().split('T')[0];
      const time = transaction.timestamp.toTimeString().split(' ')[0];
      const datetime = `${date} ${time}`;
      
      const transactionType = {
        'in': 'Приход',
        'out': 'Расход',
        'move': 'Перемещение',
        'adjustment': 'Корректировка'
      }[transaction.type];
      
      const fromLocation = transaction.fromLocation 
        ? `${transaction.fromLocation.zone}-${transaction.fromLocation.rack}-${transaction.fromLocation.shelf}`
        : '';
      
      const toLocation = transaction.toLocation
        ? `${transaction.toLocation.zone}-${transaction.toLocation.rack}-${transaction.toLocation.shelf}`
        : '';
      
      const productName = transaction.product ? transaction.product.name : 'Неизвестный товар';
      const userName = transaction.performedBy ? transaction.performedBy.fullName : 'Неизвестный пользователь';
      
      csv += `"${datetime}","${transactionType}","${transaction.documentNumber}","${transaction.barcode}","${productName}",${transaction.quantity},"${fromLocation}","${toLocation}","${transaction.reason}","${userName}"\n`;
    });
    
    // Установка заголовков ответа для скачивания файла
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions-report.csv');
    
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// API для получения последних транзакций
router.get('/api/transactions/recent', async (req, res) => {
  try {
    const recentTransactions = await Transaction.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('product', 'name');
    
    // Преобразование данных для клиента
    const formattedTransactions = recentTransactions.map(transaction => ({
      _id: transaction._id,
      type: transaction.type,
      quantity: transaction.quantity,
      timestamp: transaction.timestamp,
      productName: transaction.product ? transaction.product.name : 'Неизвестный товар',
      documentNumber: transaction.documentNumber
    }));
    
    res.json(formattedTransactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;