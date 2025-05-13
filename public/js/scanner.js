/**
 * Улучшенный файл для сканирования штрих-кодов с исправленными ошибками
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Scanner.js загружен');
  
  // Переменная для хранения экземпляра Quagga (объявляем вначале!)
  let scanner = null;
  
  // Проверяем, находимся ли мы на странице сканирования
  const scannerPage = document.getElementById('scannerPage');
  
  // Автоматическая инициализация камеры при загрузке страницы сканирования
  if (scannerPage) {
    console.log('Обнаружена страница сканирования, инициализация камеры...');
    
    // Предварительная инициализация базового видеопотока перед запуском сканера
    initializeCamera().then(() => {
      console.log('Базовая инициализация камеры выполнена, готово для сканирования');
    }).catch(error => {
      console.error('Ошибка при инициализации камеры:', error);
    });
  }
  
  // Проверка наличия Quagga
  if (typeof Quagga === 'undefined') {
    console.error('ОШИБКА: Библиотека Quagga не загружена!');
    alert('Ошибка: Библиотека для сканирования штрих-кодов не загружена. Перезагрузите страницу или попробуйте другой браузер.');
  } else {
    console.log('Библиотека Quagga успешно загружена');
  }

  // Обработчики для основной страницы сканирования
  if (scannerPage) {
    console.log('Обнаружена страница сканирования');
    
    const barcodeInput = document.getElementById('barcodeInput');
    const searchButton = document.getElementById('searchButton');
    const startScanButton = document.getElementById('startButton');
    const switchCameraButton = document.getElementById('switchCameraButton');
    const scanFromImageButton = document.getElementById('scanFromImageButton');
    const imageInput = document.getElementById('imageInput');
    
    // Прямая проверка всех необходимых элементов
    if (!barcodeInput) console.error('Не найден элемент barcodeInput');
    if (!searchButton) console.error('Не найден элемент searchButton');
    if (!startScanButton) console.error('Не найден элемент startButton');
    if (!switchCameraButton) console.error('Не найден элемент switchCameraButton');
    if (!scanFromImageButton) console.error('Не найден элемент scanFromImageButton');
    if (!imageInput) console.error('Не найден элемент imageInput');
    
    // Быстрые кнопки действий
    const quickButtons = {
      view: document.getElementById('quickViewButton'),
      receive: document.getElementById('quickReceiveButton'),
      ship: document.getElementById('quickShipButton')
    };
    
    // Логгирование для диагностики
    if (quickButtons.view) console.log('Найдена кнопка quickViewButton');
    if (quickButtons.receive) console.log('Найдена кнопка quickReceiveButton');
    if (quickButtons.ship) console.log('Найдена кнопка quickShipButton');
    
    // Обработчик кнопки Начать сканирование
    if (startScanButton) {
      console.log('Добавление обработчика для кнопки startButton');
      startScanButton.addEventListener('click', function() {
        console.log('Нажата кнопка Начать сканирование');
        startScanning();
      });
    }
    
    // Обработчик кнопки Переключить камеру
    if (switchCameraButton) {
      console.log('Добавление обработчика для кнопки switchCameraButton');
      switchCameraButton.addEventListener('click', function() {
        console.log('Нажата кнопка Переключить камеру');
        switchCamera();
      });
    }
    
    // Обработчик кнопки Сканировать из изображения
    if (scanFromImageButton && imageInput) {
      console.log('Добавление обработчика для кнопки scanFromImageButton');
      scanFromImageButton.addEventListener('click', function() {
        console.log('Нажата кнопка Сканировать из изображения');
        imageInput.click();
      });
      
      imageInput.addEventListener('change', function(e) {
        console.log('Выбрано изображение для сканирования');
        scanFromImage(e);
      });
    }
    
    // Обработчик кнопки Найти
    if (searchButton) {
      console.log('Добавление обработчика для кнопки searchButton');
      searchButton.addEventListener('click', function() {
        console.log('Нажата кнопка Найти');
        searchProduct();
      });
    }
    
    // Обработка нажатия Enter в поле ввода штрих-кода
    if (barcodeInput) {
      barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchButton.click();
        }
      });
    }
    
    // Функция поиска товара по штрих-коду
    function searchProduct() {
      const barcode = barcodeInput.value.trim();
      
      if (!barcode) {
        return;
      }
      
      // Показать индикатор загрузки
      document.getElementById('scanResultEmpty').classList.add('d-none');
      document.getElementById('scanResultNotFound').classList.add('d-none');
      document.getElementById('scanResultContent').classList.add('d-none');
      document.getElementById('scanResultLoading').classList.remove('d-none');
      
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
          
          // Заполнение информации о товаре
          document.querySelector('.product-name').textContent = product.name;
          document.querySelector('.product-category').textContent = product.category;
          document.querySelector('.product-barcode').textContent = `Штрих-код: ${product.barcode}`;
          document.querySelector('.product-quantity').textContent = `${product.stockQuantity} шт.`;
          document.querySelector('.product-location').textContent = `${product.location.zone}-${product.location.rack}-${product.location.shelf}`;
          document.querySelector('.product-price').textContent = `${product.price.toFixed(2)} ₽`;
          document.querySelector('.product-min-stock').textContent = `${product.minStockLevel} шт.`;
          document.querySelector('.product-description').textContent = product.description || 'Нет описания';
          
          // Обновление ссылок
          document.querySelector('.product-view-link').href = `/inventory/view/${product._id}`;
          document.querySelector('.product-receive-link').href = `/inventory/receive?barcode=${product.barcode}`;
          document.querySelector('.product-ship-link').href = `/inventory/ship?barcode=${product.barcode}`;
          
          // Включение кнопок быстрых действий
          if (quickButtons.view) quickButtons.view.disabled = false;
          if (quickButtons.receive) quickButtons.receive.disabled = false;
          if (quickButtons.ship) quickButtons.ship.disabled = false;
          
          // Настройка кнопок быстрых действий
          if (quickButtons.view) {
            quickButtons.view.onclick = function() {
              window.location.href = `/inventory/view/${product._id}`;
            };
          }
          
          if (quickButtons.receive) {
            quickButtons.receive.onclick = function() {
              document.querySelector('#quickActionTitle').textContent = 'Прием товара';
              document.querySelector('#quickLocationSection').classList.remove('d-none');
              document.querySelector('#quickActionSubmit').className = 'btn btn-success';
              document.querySelector('#quickActionSubmit').innerHTML = '<i class="fas fa-check me-1"></i> Подтвердить прием';
              
              document.querySelector('#quickActionCard').classList.remove('d-none');
              document.querySelector('#quickActionSubmit').onclick = function() {
                const quantity = document.querySelector('#quickQuantity').value;
                const zone = document.querySelector('#quickZone').value;
                const rack = document.querySelector('#quickRack').value;
                const shelf = document.querySelector('#quickShelf').value;
                const reason = document.querySelector('#quickReason').value;
                
                window.location.href = `/inventory/receive?barcode=${product.barcode}&quantity=${quantity}&zone=${zone}&rack=${rack}&shelf=${shelf}&reason=${reason}`;
              };
            };
          }
          
          if (quickButtons.ship) {
            quickButtons.ship.onclick = function() {
              document.querySelector('#quickActionTitle').textContent = 'Отгрузка товара';
              document.querySelector('#quickLocationSection').classList.add('d-none');
              document.querySelector('#quickActionSubmit').className = 'btn btn-danger';
              document.querySelector('#quickActionSubmit').innerHTML = '<i class="fas fa-check me-1"></i> Подтвердить отгрузку';
              
              document.querySelector('#quickActionCard').classList.remove('d-none');
              document.querySelector('#quickActionSubmit').onclick = function() {
                const quantity = document.querySelector('#quickQuantity').value;
                const reason = document.querySelector('#quickReason').value;
                
                window.location.href = `/inventory/ship?barcode=${product.barcode}&quantity=${quantity}&reason=${reason}`;
              };
            };
          }
          
          // Обработчик кнопки отмены быстрого действия
          document.querySelector('#quickActionCancel').onclick = function() {
            document.querySelector('#quickActionCard').classList.add('d-none');
          };
          
          // Отображение результата
          document.getElementById('scanResultLoading').classList.add('d-none');
          document.getElementById('scanResultEmpty').classList.add('d-none');
          document.getElementById('scanResultNotFound').classList.add('d-none');
          document.getElementById('scanResultContent').classList.remove('d-none');
        })
        .catch(error => {
          console.error('Ошибка при поиске товара:', error);
          
          // Отображение ошибки
          document.getElementById('scanResultLoading').classList.add('d-none');
          document.getElementById('scanResultEmpty').classList.add('d-none');
          document.getElementById('scanResultContent').classList.add('d-none');
          
          // Установка сообщения об ошибке
          document.getElementById('notFoundMessage').textContent = `Товар с штрих-кодом "${barcode}" не найден`;
          document.getElementById('scanResultNotFound').classList.remove('d-none');
          
          // Отключение кнопок быстрых действий
          if (quickButtons.view) quickButtons.view.disabled = true;
          if (quickButtons.receive) quickButtons.receive.disabled = true;
          if (quickButtons.ship) quickButtons.ship.disabled = true;
        });
    }
  }
  
  // Обработчик кнопки сканирования на страницах приема/отгрузки
  const scanButton = document.getElementById('scanButton'); // кнопка на страницах приема/отгрузки
  if (scanButton) {
    console.log('Обнаружена кнопка сканирования на странице приема/отгрузки');
    
    const scanModal = new bootstrap.Modal(document.getElementById('scanModal'));
    const startScanButton = document.getElementById('startScanButton');
    
    scanButton.addEventListener('click', function() {
      console.log('Нажата кнопка сканирования на странице приема/отгрузки');
      scanModal.show();
    });
    
    if (startScanButton) {
      startScanButton.addEventListener('click', function() {
        console.log('Нажата кнопка Начать сканирование внутри модального окна');
        startScanningInModal();
      });
    }
  }
  
  // Функция для предварительной инициализации камеры
  function initializeCamera() {
    return new Promise((resolve, reject) => {
      const videoElement = document.getElementById('video');
      if (!videoElement) {
        return reject('Видеоэлемент не найден');
      }
      
      // Проверка поддержки getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return reject('Ваш браузер не поддерживает доступ к камере');
      }
      
      // Остановим текущий видеопоток, если он есть
      if (videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
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
        .then(stream => {
          // Устанавливаем поток как источник для видеоэлемента
          videoElement.srcObject = stream;
          
          // Событие при загрузке метаданных видео
          videoElement.onloadedmetadata = () => {
            // Запускаем воспроизведение
            videoElement.play()
              .then(() => {
                console.log('Предварительная инициализация камеры успешна');
                resolve(stream);
              })
              .catch(err => {
                console.error('Ошибка при запуске видео:', err);
                reject(err);
              });
          };
        })
        .catch(err => {
          console.error('Ошибка доступа к камере:', err);
          reject(err);
        });
    });
  }
  
  // Функция начала сканирования на основной странице
  function startScanning() {
    console.log('Запуск функции startScanning()');
    
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    
    const scanLoading = document.getElementById('scanLoading');
    const scanOverlay = document.getElementById('scanOverlay');
    const videoElement = document.getElementById('video');
    
    if (scanLoading) scanLoading.classList.remove('d-none');
    if (scanOverlay) scanOverlay.classList.add('d-none');
    
    // Проверка наличия элементов перед запуском
    if (!videoElement) {
      console.error('Не найден элемент video');
      alert('Ошибка: Элемент видео не найден на странице');
      return;
    }
    
    // Убедимся, что камера инициализирована или инициализируем её
    const ensureCameraInitialized = videoElement.srcObject 
      ? Promise.resolve(videoElement.srcObject)
      : initializeCamera();
    
    ensureCameraInitialized.then(stream => {
      // Логгирование для отладки
      console.log('Камера инициализирована, запускаем Quagga');
      
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
            
            if (scanLoading) scanLoading.classList.add('d-none');
            return;
          }
          
          console.log('Quagga инициализирован успешно');
          
          if (scanLoading) scanLoading.classList.add('d-none');
          if (scanOverlay) scanOverlay.classList.remove('d-none');
          
          try {
            Quagga.start();
            scanner = Quagga;
            
            Quagga.onDetected(function(result) {
              console.log('Штрих-код обнаружен:', result);
              const code = result.codeResult.code;
              
              // Воспроизведение звукового сигнала
              beep();
              
              // Заполнение поля штрих-кода
              const barcodeInput = document.getElementById('barcodeInput');
              if (barcodeInput) {
                barcodeInput.value = code;
                
                // Поиск товара
                const searchButton = document.getElementById('searchButton');
                if (searchButton) searchButton.click();
              }
              
              // Остановка сканера
              if (scanner) {
                scanner.stop();
                scanner = null;
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
    }).catch(error => {
      console.error('Не удалось инициализировать камеру для сканирования:', error);
      alert('Не удалось получить доступ к камере: ' + error);
    });
  }
  
  // Функция начала сканирования в модальном окне
  function startScanningInModal() {
    console.log('Запуск функции startScanningInModal()');
    
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    
    const scanLoading = document.getElementById('scanLoading');
    const scanOverlay = document.getElementById('scanOverlay');
    const videoElement = document.getElementById('video');
    
    if (scanLoading) scanLoading.classList.remove('d-none');
    if (scanOverlay) scanOverlay.classList.add('d-none');
    
    try {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoElement,
          constraints: {
            facingMode: "environment",
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
          console.error('Ошибка при инициализации Quagga в модальном окне:', err);
          alert('Ошибка при инициализации сканера: ' + err);
          
          if (scanLoading) scanLoading.classList.add('d-none');
          return;
        }
        
        console.log('Quagga в модальном окне инициализирован успешно');
        
        if (scanLoading) scanLoading.classList.add('d-none');
        if (scanOverlay) scanOverlay.classList.remove('d-none');
        
        try {
          Quagga.start();
          scanner = Quagga;
          
          Quagga.onDetected(function(result) {
            console.log('Штрих-код обнаружен в модальном окне:', result);
            const code = result.codeResult.code;
            
            // Воспроизведение звукового сигнала
            beep();
            
            // Заполнение поля штрих-кода
            const barcodeInput = document.getElementById('barcode');
            if (barcodeInput) {
              barcodeInput.value = code;
              
              // Закрытие модального окна
              const scanModal = bootstrap.Modal.getInstance(document.getElementById('scanModal'));
              if (scanModal) scanModal.hide();
              
              // Поиск товара (если находимся на странице сканирования)
              const fetchProduct = window.fetchProduct;
              if (typeof fetchProduct === 'function') {
                fetchProduct();
              }
            }
            
            // Остановка сканера
            if (scanner) {
              scanner.stop();
              scanner = null;
            }
          });
        } catch (startError) {
          console.error('Ошибка при запуске Quagga в модальном окне:', startError);
          alert('Ошибка при запуске сканера: ' + startError);
        }
      });
    } catch (initError) {
      console.error('Ошибка при вызове Quagga.init в модальном окне:', initError);
      alert('Ошибка при инициализации сканера: ' + initError);
    }
  }
  
  // Функция переключения камеры
  function switchCamera() {
    console.log('Переключение камеры');
    
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    
    const videoElement = document.getElementById('video');
    
    // Получаем текущий режим камеры
    const currentFacingMode = videoElement.getAttribute('data-facing-mode') || 'environment';
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Обновляем атрибут режима
    videoElement.setAttribute('data-facing-mode', newFacingMode);
    
    console.log(`Переключение с ${currentFacingMode} на ${newFacingMode}`);
    
    // Перезапускаем сканер с новыми настройками
    startScanning();
  }
  
  // Функция сканирования из изображения
  function scanFromImage(e) {
    console.log('Сканирование из изображения');
    
    if (!e.target.files || e.target.files.length === 0) {
      console.error('Файл не выбран');
      return;
    }
    
    const file = e.target.files[0];
    console.log('Выбран файл:', file.name);
    
    // Остановка текущего сканера
    if (scanner) {
      scanner.stop();
      scanner = null;
    }
    
    // Создание URL для файла
    const fileUrl = URL.createObjectURL(file);
    
    try {
      // Настройка сканера для обработки изображения
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
        // Освобождение URL
        URL.revokeObjectURL(fileUrl);
        
        console.log('Результат сканирования изображения:', result);
        
        if (result && result.codeResult) {
          const code = result.codeResult.code;
          
          // Воспроизведение звукового сигнала
          beep();
          
          // Заполнение поля штрих-кода
          const barcodeInput = document.getElementById('barcodeInput');
          if (barcodeInput) {
            barcodeInput.value = code;
            
            // Поиск товара
            const searchButton = document.getElementById('searchButton');
            if (searchButton) searchButton.click();
          }
        } else {
          console.error('Штрих-код не обнаружен в изображении');
          alert("Штрих-код не обнаружен. Попробуйте другое изображение или сделайте снимок штрих-кода более четко.");
        }
        
        // Очистка поля ввода для возможности выбора того же файла повторно
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
          imageInput.value = null;
        }
      });
    } catch (error) {
      console.error('Ошибка при обработке изображения:', error);
      alert('Ошибка при обработке изображения: ' + error);
      URL.revokeObjectURL(fileUrl);
    }
  }
  
  // Звуковой сигнал при успешном сканировании
  function beep() {
    try {
      const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" + Array(1e3).join("123"));
      beepSound.volume = 0.2;
      beepSound.play().catch(err => console.error('Ошибка воспроизведения звука:', err));
    } catch (error) {
      console.error('Ошибка при воспроизведении звукового сигнала:', error);
    }
  }
});