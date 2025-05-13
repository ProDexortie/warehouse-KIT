/**
 * Простой скрипт для тестирования работы камеры
 */

// Запускаем проверку при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  console.log('Загружен скрипт тестирования камеры');
  
  // Кнопка для запуска теста камеры
  const testCameraButton = document.createElement('button');
  testCameraButton.className = 'btn btn-warning mt-2 mb-2';
  testCameraButton.innerHTML = '<i class="fas fa-camera me-1"></i> Тест камеры (Отладка)';
  testCameraButton.id = 'testCameraButton';
  
  // Добавляем кнопку на страницу
  const scannerContainer = document.querySelector('.scanner-container');
  if (scannerContainer) {
    scannerContainer.parentNode.insertBefore(testCameraButton, scannerContainer.nextSibling);
    
    // Вешаем обработчик на кнопку
    testCameraButton.addEventListener('click', testCamera);
  }
  
  // Функция теста камеры
  function testCamera() {
    console.log('Запуск теста камеры');
    
    const videoElement = document.getElementById('video');
    if (!videoElement) {
      console.error('Элемент video не найден');
      alert('Ошибка: видеоэлемент не найден на странице');
      return;
    }
    
    // Проверка поддержки getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia не поддерживается в этом браузере');
      alert('Ваш браузер не поддерживает доступ к камере');
      return;
    }
    
    // Остановим текущий видеопоток, если он есть
    if (videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoElement.srcObject = null;
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
        videoElement.style.maxHeight = '300px';
        videoElement.style.objectFit = 'cover';
        
        // Создаем подпись с информацией о камере
        let cameraInfo = document.getElementById('cameraInfo');
        if (!cameraInfo) {
          cameraInfo = document.createElement('div');
          cameraInfo.id = 'cameraInfo';
          cameraInfo.className = 'alert alert-info mt-2';
          videoElement.parentNode.appendChild(cameraInfo);
        }
        
        // Получаем информацию о камере
        navigator.mediaDevices.enumerateDevices()
          .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            cameraInfo.innerHTML = `<strong>Найдены камеры:</strong> ${videoDevices.length}<br>`;
            videoDevices.forEach((device, index) => {
              cameraInfo.innerHTML += `Камера ${index + 1}: ${device.label || 'Название недоступно'}<br>`;
            });
            
            const activeTrack = stream.getVideoTracks()[0];
            if (activeTrack) {
              cameraInfo.innerHTML += `<br><strong>Активная камера:</strong> ${activeTrack.label}`;
              cameraInfo.innerHTML += `<br><strong>Настройки:</strong> ${JSON.stringify(activeTrack.getSettings())}`;
            }
          })
          .catch(err => {
            console.error('Ошибка при получении списка устройств:', err);
            cameraInfo.innerHTML += `<br>Не удалось получить информацию о камерах: ${err.message}`;
          });
      })
      .catch(function(err) {
        console.error('Ошибка доступа к камере:', err);
        alert(`Ошибка доступа к камере: ${err.name} - ${err.message}`);
        
        // Создаем информацию об ошибке
        let errorInfo = document.getElementById('cameraError');
        if (!errorInfo) {
          errorInfo = document.createElement('div');
          errorInfo.id = 'cameraError';
          errorInfo.className = 'alert alert-danger mt-2';
          videoElement.parentNode.appendChild(errorInfo);
        }
        
        errorInfo.innerHTML = `<strong>Ошибка доступа к камере:</strong><br>
          Тип: ${err.name}<br>
          Сообщение: ${err.message}<br>
          <span class="small">Проверьте, что в вашем браузере разрешен доступ к камере для этого сайта.</span>`;
      });
  }
});