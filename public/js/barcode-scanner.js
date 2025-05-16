/**
 * Улучшенный универсальный модуль для сканирования штрих-кодов
 * Используется на страницах приема и отгрузки товаров
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('barcode-scanner.js загружен');
  
  // Элементы интерфейса
  const scanButton = document.getElementById('scanButton');
  const barcodeInput = document.getElementById('barcode');
  const startScanButton = document.getElementById('startScanButton');
  const switchCameraButton = document.getElementById('switchCameraButton');
  const scanFromImageButton = document.getElementById('scanFromImageButton');
  const imageInput = document.getElementById('imageInput');
  const quantityInput = document.getElementById('quantity');
  const videoElement = document.getElementById('video');
  
  // Переменная для хранения экземпляра Quagga
  let scanner = null;
  
  // Проверка наличия необходимых элементов
  if (!scanButton) console.error('Не найден элемент scanButton');
  if (!barcodeInput) console.error('Не найден элемент barcode');
  if (!startScanButton) console.error('Не найден элемент startScanButton');
  if (!videoElement) console.error('Не найден элемент video');
  
  // Проверка наличия Quagga
  if (typeof Quagga === 'undefined') {
    console.error('ОШИБКА: Библиотека Quagga не загружена!');
    alert('Ошибка: Библиотека для сканирования штрих-кодов не загружена. Перезагрузите страницу или используйте другой браузер.');
    return;
  }
  
  // Инициализация модального окна для сканирования
  let scanModal;
  try {
    scanModal = new bootstrap.Modal(document.getElementById('scanModal'));
  } catch (error) {
    console.error('Ошибка инициализации модального окна:', error);
  }
  
  // Обработчик кнопки сканирования
  if (scanButton) {
    scanButton.addEventListener('click', function() {
      console.log('Нажата кнопка сканирования');
      if (scanModal) scanModal.show();
    });
  }
  
  // Инициализация сканирования при нажатии на кнопку
  if (startScanButton) {
    startScanButton.addEventListener('click', function() {
      console.log('Запуск сканирования');
      startScanning();
    });
  }
  
  // Переключение камеры
  if (switchCameraButton) {
    switchCameraButton.addEventListener('click', function() {
      console.log('Переключение камеры');
      switchCamera();
    });
  }
  
  // Сканирование из изображения
  if (scanFromImageButton && imageInput) {
    scanFromImageButton.addEventListener('click', function() {
      console.log('Выбор изображения для сканирования');
      imageInput.click();
    });
    
    imageInput.addEventListener('change', function(e) {
      console.log('Загружено изображение для сканирования');
      scanFromImage(e);
    });
  }
  
  // Прослушивание события открытия модального окна
  const modalElement = document.getElementById('scanModal');
  if (modalElement) {
    modalElement.addEventListener('shown.bs.modal', function() {
      console.log('Модальное окно открыто');
      // При открытии модального окна подготавливаем видеоэлемент, но не запускаем сканирование
      prepareCamera();
    });
    
    // При закрытии модального окна останавливаем камеру и сканер
    modalElement.addEventListener('hidden.bs.modal', function() {
      console.log('Модальное окно закрыто, останавливаем камеру и сканер');
      stopCamera();
      if (scanner) {
        scanner.stop();
        scanner = null;
      }
    });
  }
  
  // Функция для подготовки камеры (без запуска сканирования)
  function prepareCamera() {
    console.log('Подготовка камеры...');
    
    // Проверка поддержки getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia не поддерживается в этом браузере');
      alert('Ваш браузер не поддерживает доступ к камере');
      return;
    }
    
    // Остановим текущий видеопоток, если он есть
    stopCamera();
    
    // Настройки для камеры
    const constraints = {
      video: { 
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };
    
    // Запрашиваем доступ к камере
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        console.log('Доступ к камере получен:', stream);
        
        // Устанавливаем поток как источник для видеоэлемента
        videoElement.srcObject = stream;
        
        // Запускаем воспроизведение
        videoElement.play()
          .then(() => console.log('Видео запущено успешно'))
          .catch(err => console.error('Ошибка при запуске видео:', err));
          
        // Настраиваем стили для видимости
        videoElement.style.display = 'block';
        videoElement.style.backgroundColor = '#000';
        videoElement.style.width = '100%';
        videoElement.style.objectFit = 'cover';
      })
      .catch(function(err) {
        console.error('Ошибка доступа к камере:', err);
        alert(`Ошибка доступа к камере: ${err.name} - ${err.message}`);
        
        const scanLoading = document.getElementById('scanLoading');
        if (scanLoading) scanLoading.classList.add('d-none');
      });
  }
  
  // Функция для остановки камеры
  function stopCamera() {
    if (videoElement && videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoElement.srcObject = null;
      console.log('Камера остановлена');
    }
  }
  
  // Функция для запуска сканирования с камеры
  function startScanning() {
    console.log('Запуск функции startScanning()');
    
    // Останавливаем предыдущий сканер, если он активен
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    
    // Элементы интерфейса для отображения состояния
    const scanLoading = document.getElementById('scanLoading');
    const scanOverlay = document.getElementById('scanOverlay');
    
    // Показываем индикатор загрузки
    if (scanLoading) scanLoading.classList.remove('d-none');
    if (scanOverlay) scanOverlay.classList.add('d-none');
    
    // Проверяем наличие видеопотока
    if (!videoElement || !videoElement.srcObject) {
      console.error('Видеопоток не инициализирован');
      prepareCamera(); // Пробуем инициализировать камеру
      
      // Даем время на инициализацию камеры
      setTimeout(() => {
        if (videoElement && videoElement.srcObject) {
          initializeScanner();
        } else {
          console.error('Не удалось инициализировать камеру');
          if (scanLoading) scanLoading.classList.add('d-none');
        }
      }, 1000);
    } else {
      initializeScanner();
    }
  }
  
  // Инициализация сканера
  function initializeScanner() {
    try {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoElement,
          constraints: {
            width: 640,
            height: 480
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ]
        }
      }, function(err) {
        if (err) {
          console.error('Ошибка при инициализации Quagga:', err);
          alert('Ошибка при инициализации сканера: ' + err);
          
          const scanLoading = document.getElementById('scanLoading');
          if (scanLoading) scanLoading.classList.add('d-none');
          return;
        }
        
        console.log('Quagga инициализирован успешно');
        
        // Скрываем индикатор загрузки и показываем оверлей сканирования
        const scanLoading = document.getElementById('scanLoading');
        const scanOverlay = document.getElementById('scanOverlay');
        if (scanLoading) scanLoading.classList.add('d-none');
        if (scanOverlay) scanOverlay.classList.remove('d-none');
        
        try {
          // Запускаем сканирование
          Quagga.start();
          scanner = Quagga;
          
          // Обработчик обнаружения штрих-кода
          Quagga.onDetected(function(result) {
            console.log('Штрих-код обнаружен:', result);
            const code = result.codeResult.code;
            
            // Воспроизводим звуковой сигнал
            beep();
            
            // Заполняем поле ввода штрих-кода
            if (barcodeInput) {
              barcodeInput.value = code;
            }
            
            // Останавливаем сканер
            if (scanner) {
              scanner.stop();
              scanner = null;
            }
            
            // Закрываем модальное окно
            if (scanModal) scanModal.hide();
            
            // Вызываем функцию поиска товара (если она определена)
            if (typeof window.fetchProduct === 'function') {
              window.fetchProduct();
            }
          });
        } catch (startError) {
          console.error('Ошибка при запуске Quagga:', startError);
          alert('Ошибка при запуске сканера: ' + startError);
        }
      });
    } catch (initError) {
      console.error('Ошибка при вызове Quagga.init:', initError);
      alert('Ошибка при инициализации сканера: ' + initError);
    }
  }
  
  // Функция для переключения между камерами
  function switchCamera() {
    console.log('Переключение камеры');
    
    // Останавливаем текущий сканер
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    
    // Определяем текущий режим камеры и меняем его
    const currentFacingMode = videoElement.getAttribute('data-facing-mode') || 'environment';
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Устанавливаем новый режим камеры
    videoElement.setAttribute('data-facing-mode', newFacingMode);
    console.log(`Переключение с ${currentFacingMode} на ${newFacingMode}`);
    
    // Останавливаем текущий видеопоток
    stopCamera();
    
    // Настройки для новой камеры
    const constraints = {
      video: { 
        facingMode: newFacingMode,
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };
    
    // Запрашиваем доступ к новой камере
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        console.log('Доступ к новой камере получен:', stream);
        
        // Устанавливаем поток как источник для видеоэлемента
        videoElement.srcObject = stream;
        
        // Запускаем воспроизведение
        videoElement.play()
          .then(() => {
            console.log('Видео запущено успешно');
            // Перезапускаем сканер с новой камерой
            startScanning();
          })
          .catch(err => console.error('Ошибка при запуске видео:', err));
      })
      .catch(function(err) {
        console.error('Ошибка при переключении камеры:', err);
        alert(`Ошибка при переключении камеры: ${err.name} - ${err.message}`);
      });
  }
  
  // Функция для сканирования штрих-кода из изображения
  function scanFromImage(e) {
    console.log('Сканирование из изображения');
    
    if (!e.target.files || e.target.files.length === 0) {
      console.error('Файл не выбран');
      return;
    }
    
    const file = e.target.files[0];
    console.log('Выбран файл:', file.name);
    
    // Останавливаем текущий сканер
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    
    // Создаем URL для файла
    const fileUrl = URL.createObjectURL(file);
    
    // Показываем индикатор загрузки
    const scanLoading = document.getElementById('scanLoading');
    const scanOverlay = document.getElementById('scanOverlay');
    if (scanLoading) scanLoading.classList.remove('d-none');
    if (scanOverlay) scanOverlay.classList.add('d-none');
    
    try {
      // Настраиваем Quagga для обработки одного изображения
      Quagga.decodeSingle({
        src: fileUrl,
        numOfWorkers: 0,
        inputStream: {
          size: 800
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ]
        }
      }, function(result) {
        // Освобождаем URL
        URL.revokeObjectURL(fileUrl);
        
        // Скрываем индикатор загрузки
        if (scanLoading) scanLoading.classList.add('d-none');
        if (scanOverlay) scanOverlay.classList.remove('d-none');
        
        console.log('Результат сканирования изображения:', result);
        
        if (result && result.codeResult) {
          // Штрих-код найден
          const code = result.codeResult.code;
          
          // Воспроизводим звуковой сигнал
          beep();
          
          // Заполняем поле ввода штрих-кода
          if (barcodeInput) {
            barcodeInput.value = code;
          }
          
          // Закрываем модальное окно
          if (scanModal) scanModal.hide();
          
          // Вызываем функцию поиска товара (если она определена)
          if (typeof window.fetchProduct === 'function') {
            window.fetchProduct();
          }
        } else {
          // Штрих-код не найден
          console.error('Штрих-код не обнаружен в изображении');
          alert("Штрих-код не обнаружен. Попробуйте другое изображение или сделайте снимок штрих-кода более четко.");
        }
        
        // Очищаем поле ввода файла для возможности повторного выбора того же файла
        if (imageInput) {
          imageInput.value = null;
        }
      });
    } catch (error) {
      console.error('Ошибка при обработке изображения:', error);
      alert('Ошибка при обработке изображения: ' + error);
      URL.revokeObjectURL(fileUrl);
      
      // Скрываем индикатор загрузки
      if (scanLoading) scanLoading.classList.add('d-none');
    }
  }
  
  // Функция для воспроизведения звукового сигнала при успешном сканировании
  function beep() {
    try {
      const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" + Array(1e3).join("123"));
      beepSound.volume = 0.2;
      beepSound.play().catch(err => console.error('Ошибка воспроизведения звука:', err));
    } catch (error) {
      console.error('Ошибка при воспроизведении звукового сигнала:', error);
    }
  }
  
  // Обрабатываем функцию fetchProduct для страниц receive.ejs и ship.ejs
  if (!window.fetchProduct && barcodeInput) {
    // Определяем функцию, только если она еще не определена
    window.fetchProduct = function() {
      const barcode = barcodeInput.value.trim();
      
      if (!barcode) {
        return;
      }
      
      console.log('Запрос информации о товаре с штрих-кодом:', barcode);
      
      // Элементы для отображения информации о товаре
      const productInfo = document.getElementById('productInfo');
      const productInfoEmpty = document.getElementById('productInfoEmpty');
      const productInfoLoading = document.getElementById('productInfoLoading');
      const productInfoNotFound = document.getElementById('productInfoNotFound');
      
      // Показываем индикатор загрузки
      if (productInfo) productInfo.classList.add('d-none');
      if (productInfoNotFound) productInfoNotFound.classList.add('d-none');
      if (productInfoEmpty) productInfoEmpty.classList.add('d-none');
      if (productInfoLoading) productInfoLoading.classList.remove('d-none');
      
      // Запрос к API
      fetch(`/inventory/api/product/${barcode}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Товар не найден');
          }
          return response.json();
        })
        .then(product => {
          console.log('Товар найден:', product);
          
          // Заполняем информацию о товаре
          if (document.querySelector('.product-name')) {
            document.querySelector('.product-name').textContent = product.name;
          }
          
          if (document.querySelector('.product-quantity')) {
            document.querySelector('.product-quantity').textContent = `${product.stockQuantity} шт.`;
          }
          
          if (document.querySelector('.product-location')) {
            document.querySelector('.product-location').textContent = 
              `${product.location.zone}-${product.location.rack}-${product.location.shelf}`;
          }
          
          if (document.querySelector('.product-category')) {
            document.querySelector('.product-category').textContent = product.category;
          }
          
          if (document.querySelector('.product-price')) {
            document.querySelector('.product-price').textContent = `${product.price.toFixed(2)} ₽`;
          }
          
          // Предварительный расчет
          updatePreview(product.stockQuantity);
          
          // Заполняем поля местоположения для страницы приема
          if (document.getElementById('zone') && !document.getElementById('zone').value) {
            document.getElementById('zone').value = product.location.zone;
          }
          
          if (document.getElementById('rack') && !document.getElementById('rack').value) {
            document.getElementById('rack').value = product.location.rack;
          }
          
          if (document.getElementById('shelf') && !document.getElementById('shelf').value) {
            document.getElementById('shelf').value = product.location.shelf;
          }
          
          // Показываем информацию о товаре
          if (productInfoLoading) productInfoLoading.classList.add('d-none');
          if (productInfoNotFound) productInfoNotFound.classList.add('d-none');
          if (productInfo) productInfo.classList.remove('d-none');
        })
        .catch(error => {
          console.error('Ошибка при поиске товара:', error);
          
          // Показываем сообщение об ошибке
          if (productInfoLoading) productInfoLoading.classList.add('d-none');
          if (productInfo) productInfo.classList.add('d-none');
          if (productInfoNotFound) productInfoNotFound.classList.remove('d-none');
        });
    };
  }
  
  // Функция для обновления предварительного расчета
  function updatePreview(currentQuantity) {
    if (!document.querySelector('.preview-alert')) {
      return;
    }
    
    // Получаем значение количества
    const quantity = parseInt(quantityInput.value) || 0;
    
    // Определяем текущую страницу
    const isReceivePage = window.location.pathname.includes('/receive');
    const isShipPage = window.location.pathname.includes('/ship');
    
    // Расчет нового количества в зависимости от страницы
    let newQuantity;
    if (isReceivePage) {
      newQuantity = currentQuantity + quantity;
      
      // Отображаем результат
      document.querySelector('.new-quantity').textContent = `${newQuantity} шт.`;
      document.querySelector('.preview-alert').classList.remove('d-none');
      
    } else if (isShipPage) {
      newQuantity = currentQuantity - quantity;
      
      // Отображаем результат
      document.querySelector('.new-quantity').textContent = `${newQuantity} шт.`;
      document.querySelector('.preview-alert').classList.remove('d-none');
      
      // Проверка на достаточное количество
      const insufficientWarning = document.querySelector('.insufficient-quantity-warning');
      if (insufficientWarning) {
        if (newQuantity < 0) {
          insufficientWarning.classList.remove('d-none');
          // Отключаем кнопку отправки формы
          const submitButton = document.querySelector('button[type="submit"]');
          if (submitButton) submitButton.disabled = true;
        } else {
          insufficientWarning.classList.add('d-none');
          // Включаем кнопку отправки формы
          const submitButton = document.querySelector('button[type="submit"]');
          if (submitButton) submitButton.disabled = false;
        }
      }
    }
  }
  
  // Обработчик изменения количества
  if (quantityInput) {
    quantityInput.addEventListener('input', function() {
      const productInfo = document.getElementById('productInfo');
      if (productInfo && !productInfo.classList.contains('d-none')) {
        const currentQuantityElement = document.querySelector('.product-quantity');
        if (currentQuantityElement) {
          const currentQuantityText = currentQuantityElement.textContent;
          const currentQuantity = parseInt(currentQuantityText) || 0;
          updatePreview(currentQuantity);
        }
      }
    });
  }
  
  // Вызываем поиск товара при загрузке страницы, если штрих-код уже введен
  if (barcodeInput && barcodeInput.value.trim() && typeof window.fetchProduct === 'function') {
    window.fetchProduct();
  }
});