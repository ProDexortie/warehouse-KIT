/**
 * Основной JavaScript файл для системы управления складом
 */

document.addEventListener('DOMContentLoaded', function() {
  // Инициализация всплывающих подсказок
  const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  Array.from(tooltips).forEach(tooltip => {
    new bootstrap.Tooltip(tooltip);
  });
  
  // Инициализация всплывающих уведомлений
  const toasts = document.querySelectorAll('.toast');
  Array.from(toasts).forEach(toast => {
    new bootstrap.Toast(toast, {
      delay: 5000
    }).show();
  });
  
  // Автоматическое скрытие уведомлений через 5 секунд
  setTimeout(() => {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    Array.from(alerts).forEach(alert => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    });
  }, 5000);
  
  // Обработка форм с подтверждением
  const confirmForms = document.querySelectorAll('form[data-confirm]');
  Array.from(confirmForms).forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const confirmMessage = this.getAttribute('data-confirm');
      
      if (confirm(confirmMessage)) {
        this.submit();
      }
    });
  });
  
  // Обработка кнопок "Вернуться назад"
  const backButtons = document.querySelectorAll('.btn-back');
  Array.from(backButtons).forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      window.history.back();
    });
  });
  
  // Обработка завершения загрузки страницы
  window.addEventListener('load', function() {
    // Скрытие индикатора загрузки
    const pageLoader = document.querySelector('.page-loader');
    if (pageLoader) {
      pageLoader.classList.add('page-loader-hidden');
      
      setTimeout(() => {
        pageLoader.style.display = 'none';
      }, 300);
    }
    
    // Анимация появления контента
    const fadeElements = document.querySelectorAll('.fade-in');
    Array.from(fadeElements).forEach(element => {
      element.classList.add('fade-in-visible');
    });
  });
  
  // Обновление текущего времени
  const clockElement = document.getElementById('current-time');
  if (clockElement) {
    updateClock();
    setInterval(updateClock, 1000);
    
    function updateClock() {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('ru-RU');
      const formattedDate = now.toLocaleDateString('ru-RU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      clockElement.textContent = `${formattedDate}, ${formattedTime}`;
    }
  }
  
  // Обработка фильтров таблиц
  const tableFilter = document.getElementById('table-filter');
  if (tableFilter) {
    tableFilter.addEventListener('input', function() {
      const searchText = this.value.toLowerCase();
      const table = document.querySelector(this.getAttribute('data-target'));
      const rows = table.querySelectorAll('tbody tr');
      
      Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchText) ? '' : 'none';
      });
    });
  }
  
  // Функционал для копирования текста
  const copyButtons = document.querySelectorAll('.btn-copy');
  Array.from(copyButtons).forEach(button => {
    button.addEventListener('click', function() {
      const target = document.querySelector(this.getAttribute('data-target'));
      const text = target.textContent || target.value;
      
      navigator.clipboard.writeText(text).then(() => {
        // Показать уведомление об успешном копировании
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check"></i> Скопировано';
        
        setTimeout(() => {
          this.innerHTML = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Ошибка при копировании текста: ', err);
      });
    });
  });
  
  // Динамический расчет в формах
  initCalculations();
  
  // Обработка событий изменения форм
  const calculateForms = document.querySelectorAll('form[data-calculate]');
  Array.from(calculateForms).forEach(form => {
    const inputs = form.querySelectorAll('input[data-calc], select[data-calc]');
    
    Array.from(inputs).forEach(input => {
      input.addEventListener('input', function() {
        initCalculations();
      });
      
      input.addEventListener('change', function() {
        initCalculations();
      });
    });
  });
  
  // Функция инициализации расчетов
  function initCalculations() {
    // Расчет суммы
    const sumElements = document.querySelectorAll('[data-calc-sum]');
    Array.from(sumElements).forEach(element => {
      const selector = element.getAttribute('data-calc-sum');
      const inputs = document.querySelectorAll(selector);
      
      let sum = 0;
      Array.from(inputs).forEach(input => {
        sum += parseFloat(input.value) || 0;
      });
      
      element.textContent = sum.toFixed(2);
    });
    
    // Расчет произведения
    const multiplyElements = document.querySelectorAll('[data-calc-multiply]');
    Array.from(multiplyElements).forEach(element => {
      const selectors = element.getAttribute('data-calc-multiply').split(',');
      
      let result = 1;
      selectors.forEach(selector => {
        const input = document.querySelector(selector);
        if (input) {
          result *= parseFloat(input.value) || 0;
        }
      });
      
      element.textContent = result.toFixed(2);
    });
  }
});