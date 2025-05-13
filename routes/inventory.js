const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Transaction = require('../models/transaction');
const { isAuthenticated, checkRole } = require('../middleware/auth');

// Все маршруты в этом файле требуют аутентификации
router.use(isAuthenticated);

// Главная страница инвентаря
router.get('/', async (req, res) => {
  try {
    // Получение параметров запроса
    const { search, category, sort } = req.query;
    
    // Построение запроса
    let query = {};
    
    // Поиск по названию или штрих-коду
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { barcode: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Фильтрация по категории
    if (category) {
      query.category = category;
    }
    
    // Получение всех уникальных категорий
    const categories = await Product.distinct('category');
    
    // Получение товаров с сортировкой
    let sortOption = { createdAt: -1 }; // По умолчанию от новых к старым
    
    if (sort === 'name-asc') {
      sortOption = { name: 1 };
    } else if (sort === 'name-desc') {
      sortOption = { name: -1 };
    } else if (sort === 'stock-asc') {
      sortOption = { stockQuantity: 1 };
    } else if (sort === 'stock-desc') {
      sortOption = { stockQuantity: -1 };
    }
    
    const products = await Product.find(query).sort(sortOption);
    
    // Получение товаров с низким уровнем запасов
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
    }).limit(5);
    
    res.render('inventory', {
      title: 'Инвентарь | Система управления складом',
      products,
      categories,
      search: search || '',
      selectedCategory: category || '',
      sort: sort || 'date-desc',
      lowStockProducts,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Страница сканирования
router.get('/scan', (req, res) => {
  res.render('scanner', {
    title: 'Сканирование | Система управления складом',
    user: req.session.user
  });
});

// Страница добавления товара
router.get('/add', checkRole(['admin', 'manager']), (req, res) => {
  res.render('add-product', {
    title: 'Добавление товара | Система управления складом',
    user: req.session.user,
    error: null
  });
});

// Обработка добавления товара
router.post('/add', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const {
      barcode,
      name,
      description,
      category,
      price,
      cost,
      stockQuantity,
      zone,
      rack,
      shelf,
      minStockLevel,
      supplier,
      imageUrl
    } = req.body;
    
    // Проверка обязательных полей
    if (!barcode || !name || !category) {
      return res.render('add-product', {
        title: 'Добавление товара | Система управления складом',
        user: req.session.user,
        error: 'Штрих-код, название и категория обязательны к заполнению',
        formData: req.body
      });
    }
    
    // Проверка на существующий штрих-код
    const existingProduct = await Product.findOne({ barcode });
    if (existingProduct) {
      return res.render('add-product', {
        title: 'Добавление товара | Система управления складом',
        user: req.session.user,
        error: 'Товар с таким штрих-кодом уже существует',
        formData: req.body
      });
    }
    
    // Создание нового товара
    const newProduct = new Product({
      barcode,
      name,
      description: description || '',
      category,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      stockQuantity: parseInt(stockQuantity) || 0,
      location: {
        zone: zone || 'A',
        rack: rack || '01',
        shelf: shelf || '01'
      },
      minStockLevel: parseInt(minStockLevel) || 5,
      supplier: supplier || '',
      imageUrl: imageUrl || '',
      createdBy: req.session.userId
    });
    
    await newProduct.save();
    
    // Если добавлено с ненулевым количеством, создаем транзакцию прихода
    if (parseInt(stockQuantity) > 0) {
      const transaction = new Transaction({
        type: 'in',
        product: newProduct._id,
        barcode: newProduct.barcode,
        quantity: parseInt(stockQuantity),
        toLocation: {
          zone: zone || 'A',
          rack: rack || '01',
          shelf: shelf || '01'
        },
        reason: 'Начальное добавление товара',
        performedBy: req.session.userId
      });
      
      await transaction.save();
    }
    
    res.redirect('/inventory');
  } catch (error) {
    console.error(error);
    res.render('add-product', {
      title: 'Добавление товара | Система управления складом',
      user: req.session.user,
      error: 'Произошла ошибка при добавлении товара',
      formData: req.body
    });
  }
});

// Страница редактирования товара
router.get('/edit/:id', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).send('Товар не найден');
    }
    
    res.render('edit-product', {
      title: 'Редактирование товара | Система управления складом',
      product,
      user: req.session.user,
      error: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Обработка редактирования товара
router.post('/edit/:id', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).send('Товар не найден');
    }
    
    const {
      name,
      description,
      category,
      price,
      cost,
      zone,
      rack,
      shelf,
      minStockLevel,
      supplier,
      imageUrl
    } = req.body;
    
    // Обновление товара
    product.name = name;
    product.description = description || '';
    product.category = category;
    product.price = parseFloat(price) || 0;
    product.cost = parseFloat(cost) || 0;
    product.location = {
      zone: zone || 'A',
      rack: rack || '01',
      shelf: shelf || '01'
    };
    product.minStockLevel = parseInt(minStockLevel) || 5;
    product.supplier = supplier || '';
    product.imageUrl = imageUrl || '';
    
    await product.save();
    
    res.redirect('/inventory');
  } catch (error) {
    console.error(error);
    res.render('edit-product', {
      title: 'Редактирование товара | Система управления складом',
      product: {
        ...req.body,
        _id: req.params.id,
        location: {
          zone: req.body.zone,
          rack: req.body.rack,
          shelf: req.body.shelf
        }
      },
      user: req.session.user,
      error: 'Произошла ошибка при редактировании товара'
    });
  }
});

// Страница товара
router.get('/view/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).send('Товар не найден');
    }
    
    // Получение истории транзакций для этого товара
    const transactions = await Transaction.find({ product: product._id })
      .sort({ timestamp: -1 })
      .populate('performedBy', 'username fullName');
    
    res.render('view-product', {
      title: `${product.name} | Система управления складом`,
      product,
      transactions,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Удаление товара
router.post('/delete/:id', checkRole(['admin']), async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    
    // Удаление всех транзакций, связанных с этим товаром
    await Transaction.deleteMany({ product: req.params.id });
    
    res.redirect('/inventory');
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера');
  }
});

// Страница приема товара
router.get('/receive', (req, res) => {
  res.render('receive', {
    title: 'Прием товара | Система управления складом',
    user: req.session.user
  });
});

// Обработка приема товара
router.post('/receive', async (req, res) => {
  try {
    const { barcode, quantity, zone, rack, shelf, reason } = req.body;
    
    // Поиск товара по штрих-коду
    const product = await Product.findOne({ barcode });
    
    if (!product) {
      return res.render('receive', {
        title: 'Прием товара | Система управления складом',
        user: req.session.user,
        error: 'Товар с таким штрих-кодом не найден',
        formData: req.body
      });
    }
    
    const parsedQuantity = parseInt(quantity);
    
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.render('receive', {
        title: 'Прием товара | Система управления складом',
        user: req.session.user,
        error: 'Количество должно быть положительным числом',
        formData: req.body
      });
    }
    
    // Обновление количества товара
    product.stockQuantity += parsedQuantity;
    
    // Обновление местоположения товара, если указано
    if (zone && rack && shelf) {
      product.location = {
        zone,
        rack,
        shelf
      };
    }
    
    await product.save();
    
    // Создание транзакции
    const transaction = new Transaction({
      type: 'in',
      product: product._id,
      barcode: product.barcode,
      quantity: parsedQuantity,
      toLocation: {
        zone: zone || product.location.zone,
        rack: rack || product.location.rack,
        shelf: shelf || product.location.shelf
      },
      reason: reason || 'Прием товара',
      performedBy: req.session.userId
    });
    
    await transaction.save();
    
    res.redirect('/inventory');
  } catch (error) {
    console.error(error);
    res.render('receive', {
      title: 'Прием товара | Система управления складом',
      user: req.session.user,
      error: 'Произошла ошибка при приеме товара',
      formData: req.body
    });
  }
});

// Страница отгрузки товара
router.get('/ship', (req, res) => {
  res.render('ship', {
    title: 'Отгрузка товара | Система управления складом',
    user: req.session.user
  });
});

// Обработка отгрузки товара
router.post('/ship', async (req, res) => {
  try {
    const { barcode, quantity, reason } = req.body;
    
    // Поиск товара по штрих-коду
    const product = await Product.findOne({ barcode });
    
    if (!product) {
      return res.render('ship', {
        title: 'Отгрузка товара | Система управления складом',
        user: req.session.user,
        error: 'Товар с таким штрих-кодом не найден',
        formData: req.body
      });
    }
    
    const parsedQuantity = parseInt(quantity);
    
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.render('ship', {
        title: 'Отгрузка товара | Система управления складом',
        user: req.session.user,
        error: 'Количество должно быть положительным числом',
        formData: req.body
      });
    }
    
    // Проверка наличия достаточного количества
    if (product.stockQuantity < parsedQuantity) {
      return res.render('ship', {
        title: 'Отгрузка товара | Система управления складом',
        user: req.session.user,
        error: `Недостаточное количество товара. В наличии: ${product.stockQuantity}`,
        formData: req.body
      });
    }
    
    // Обновление количества товара
    product.stockQuantity -= parsedQuantity;
    await product.save();
    
    // Создание транзакции
    const transaction = new Transaction({
      type: 'out',
      product: product._id,
      barcode: product.barcode,
      quantity: parsedQuantity,
      fromLocation: {
        zone: product.location.zone,
        rack: product.location.rack,
        shelf: product.location.shelf
      },
      reason: reason || 'Отгрузка товара',
      performedBy: req.session.userId
    });
    
    await transaction.save();
    
    res.redirect('/inventory');
  } catch (error) {
    console.error(error);
    res.render('ship', {
      title: 'Отгрузка товара | Система управления складом',
      user: req.session.user,
      error: 'Произошла ошибка при отгрузке товара',
      formData: req.body
    });
  }
});

// API для получения товара по штрих-коду
router.get('/api/product/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
    
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// API для получения товаров с низким уровнем запасов
router.get('/api/products/low-stock', async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
    }).limit(5);
    
    res.json(lowStockProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;