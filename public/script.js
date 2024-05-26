// Инициализация событий и элементов после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.name = 'file';
    fileInput.required = true;
    document.getElementById('uploadForm').appendChild(fileInput);

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            dropZone.textContent = files[0].name;
        }
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            dropZone.textContent = fileInput.files[0].name;
        } else {
            dropZone.textContent = 'Перетащите файлы сюда или нажмите для выбора';
        }
    });

    document.getElementById('uploadForm').addEventListener('submit', async function(event) {
        event.preventDefault();
        const formData = new FormData();
        const usernameInput = document.getElementById('username');
        const username = usernameInput.value.trim() || 'guest'; // Установка имени пользователя как "guest", если поле пустое
        if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
            formData.append('username', username);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                displayFile(result.id, result.filename, result.size);
                // Обновление счётчика файлов
                const currentCount = parseInt(document.getElementById('fileCount').textContent.split(': ')[1]);
                updateFileCount(currentCount + 1);
                // Сброс поля выбора файла и имени пользователя
                fileInput.value = '';
                usernameInput.value = '';
                dropZone.textContent = 'Перетащите файлы сюда или нажмите для выбора';
            } else {
                alert('Ошибка при загрузке файла');
            }
        } else {
            alert('Пожалуйста, выберите файл для загрузки');
        }
    });
});

// Обновление статуса файла
async function updateStatus(id, newStatus) {
    const response = await fetch(`/update-status/${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
        const selectElement = document.querySelector(`.file-card select[onchange="updateStatus(${id}, this.value)"]`);
        selectElement.className = `status-select ${getStatusClass(newStatus)}`;
    } else {
        alert('Ошибка при обновлении статуса');
    }
}

// Загрузка файлов с фильтрацией и сортировкой
async function loadFiles(order = 'asc', filterParam = 'id', author = '', filename = '', searchType = 'substring') {
    const response = await fetch(`/files?order=${order}&filterParam=${filterParam}&author=${encodeURIComponent(author)}&filename=${encodeURIComponent(filename)}&searchType=${searchType}`);
    if (response.ok) {
        const files = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = ''; // Очистка списка файлов перед загрузкой
        files.forEach(file => displayFile(file.id, file.filename, file.size, file.status));
        updateFileCount(files.length);
    } else {
        alert('Ошибка при загрузке списка файлов');
    }
}

// Отображение файла в списке
function displayFile(id, filename, size, status) {
    const fileList = document.getElementById('fileList');
    const fileCard = document.createElement('div');
    fileCard.className = 'file-card';
    fileCard.innerHTML = `
        <p class="file-name">${filename}</p>
        <p class="file-size">${size.toFixed(2)} KB</p>
        <div class="file-actions">
            <button class="download-button" onclick="downloadFile(${id})">Скачать</button>
            <button class="replace-button" onclick="openReplaceModal('${id}', '${filename}')">Заменить</button>
            <button class="delete-button" onclick="deleteFile('${id}', '${filename}')">Удалить</button>
            <button class="metadata-button" onclick="showMetadata('${id}')">Метаданные</button>
            <button class="comment-button" onclick="openCommentModal(${id})">Комментарии</button>
            <select class="status-select ${getStatusClass(status)}" onchange="updateStatus(${id}, this.value)">
                <option value="В работе" ${status === 'В работе' ? 'selected' : ''}>В работе</option>
                <option value="Отклонён" ${status === 'Отклонён' ? 'selected' : ''}>Отклонён</option>
                <option value="Принят" ${status === 'Принят' ? 'selected' : ''}>Принят</option>
            </select>
        </div>
    `;
    fileList.appendChild(fileCard);
}

// Получение CSS-класса для статуса файла
function getStatusClass(status) {
    switch (status) {
        case 'В работе':
            return 'status-in-progress';
        case 'Отклонён':
            return 'status-rejected';
        case 'Принят':
            return 'status-accepted';
        default:
            return '';
    }
}

// Скачивание файла
function downloadFile(id) {
    const link = document.createElement('a');
    link.href = `/download/${id}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Обновление счётчика файлов
function updateFileCount(count) {
    const fileCountElement = document.getElementById('fileCount');
    fileCountElement.textContent = `Количество файлов: ${count}`;
}

// document.getElementById('uploadForm').addEventListener('submit', async function(event) {
//     event.preventDefault();
//     const formData = new FormData();
//     const usernameInput = document.getElementById('username');
//     const username = usernameInput.value.trim() || 'guest'; // Установка имени пользователя как "guest", если поле пустое
//     formData.append('file', fileInput.files[0]);
//     formData.append('username', username);

//     const response = await fetch('/upload', {
//         method: 'POST',
//         body: formData
//     });

//     if (response.ok) {
//         const result = await response.json();
//         displayFile(result.id, result.filename, result.size);
//         // Обновление счётчика файлов
//         const currentCount = parseInt(document.getElementById('fileCount').textContent.split(': ')[1]);
//         updateFileCount(currentCount + 1);
//         // Сброс поля выбора файла и имени пользователя
//         fileInput.value = '';
//         usernameInput.value = '';
//         dropZone.textContent = 'Перетащите файлы сюда или нажмите для выбора';
//     } else {
//         alert('Ошибка при загрузке файла');
//     }
// });

document.getElementById('filterButton').addEventListener('click', function() { 
    document.getElementById('filterModal').style.display = 'block';
});

document.getElementById('applyFilterButton').addEventListener('click', function() {
    applyFilters();
});

document.getElementById('resetFilterButton').addEventListener('click', function() {
    resetFilters();
    applyFilters();
});

// Применение фильтров для загрузки файлов
function applyFilters() {
    const filterParam = document.getElementById('filterParamSelect').value;
    const order = document.getElementById('orderSelect').value;
    const author = document.getElementById('authorInput').value.trim();
    const filename = document.getElementById('filenameInput').value.trim();
    const searchType = document.getElementById('searchType').value;
    loadFiles(order, filterParam, author, filename, searchType);
}

// Сброс фильтров к значениям по умолчанию
function resetFilters() {
    document.getElementById('filenameInput').value = '';
    document.getElementById('authorInput').value = '';
    document.getElementById('searchType').value = 'substring';
    document.getElementById('filterParamSelect').value = 'id';
    document.getElementById('orderSelect').value = 'asc';
}

// Закрытие модального окна фильтрации
function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
}

// Удаление файла
async function deleteFile(id, filename) {
    const response = await fetch(`/delete/${id}`, {
        method: 'DELETE'
    });
    const currentCount = parseInt(document.getElementById('fileCount').textContent.split(': ')[1]);
    updateFileCount(currentCount - 1);
    if (response.ok) {
        // Удаление карточки файла из DOM
        const fileList = document.getElementById('fileList');
        const fileCards = fileList.getElementsByClassName('file-card');
        
        for (let i = 0; i < fileCards.length; i++) {
            if (fileCards[i].querySelector('p').textContent === filename) {
                fileList.removeChild(fileCards[i]);
                
                break;
            }
        }
    } else {
        alert('Ошибка при удалении файла');
    }
}

let oldIdToReplace = '';
let newFileToReplace = null;

// Удаление файла
function openReplaceModal(id, oldFilename) {
    oldIdToReplace = id;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = () => {
        newFileToReplace = fileInput.files[0];
        document.getElementById('modal-text').textContent = `Заменить ${oldFilename} на ${newFileToReplace.name}?`;
        document.getElementById('modal').style.display = 'block';
    };
    fileInput.click();
}

// Удаление файла
document.getElementById('confirm-replace').addEventListener('click', async function() {
    if (newFileToReplace) {
        const formData = new FormData();
        formData.append('file', newFileToReplace);
        formData.append('oldId', oldIdToReplace);

        const response = await fetch('/replace', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            // Обновление карточки файла в DOM
            const fileList = document.getElementById('fileList');
            const fileCards = fileList.getElementsByClassName('file-card');
            for (let i = 0; i < fileCards.length; i++) {
                if (fileCards[i].querySelector('p').textContent === result.oldFilename) {
                    fileCards[i].querySelector('p').textContent = result.filename;
                    fileCards[i].querySelector('.download-button').setAttribute('onclick', `downloadFile(${result.id})`);
                    fileCards[i].querySelector('.replace-button').setAttribute('onclick', `openReplaceModal('${result.id}', '${result.filename}')`);
                    fileCards[i].querySelector('.delete-button').setAttribute('onclick', `deleteFile('${result.id}', '${result.filename}')`);
                    fileCards[i].querySelector('.metadata-button').setAttribute('onclick', `showMetadata('${result.id}')`);
                    break;
                }
            }
            document.getElementById('modal').style.display = 'none';
            showSuccessBanner(); // Показ баннера после успешной замены файла
        } else {
            alert('Ошибка при замене файла');
        }
    }
});

// Удаление файла
document.getElementById('cancel-replace').addEventListener('click', function() {
    document.getElementById('modal').style.display = 'none';
});

// Закрытие модального окна замены файла
function closeReplaceModal() {
    document.getElementById('modal').style.display = 'none';
}

document.querySelectorAll('.close').forEach(closeButton => {
    closeButton.addEventListener('click', function() {
        closeButton.closest('.modal').style.display = 'none';
    });
});

// Функция для отображения метаданных
async function showMetadata(id) {
    const response = await fetch(`/metadata/${id}`);
    if (response.ok) {
        const fileMetadata = await response.json();
        const formattedMetadata = formatMetadata(fileMetadata);
        document.getElementById('metadataContent').textContent = formattedMetadata;
        document.getElementById('metadataModal').style.display = 'block';
    } else {
        alert('Ошибка при получении метаданных');
    }
}

// Форматирование метаданных для отображения
function formatMetadata(metadata) {
    return Object.entries(metadata).map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}: [${value.join(', ')}]`;
        }
        return `${key}: ${value}`;
    }).join('\n');
}

// Закрытие модального окна метаданных
function closeMetadataModal() {
    document.getElementById('metadataModal').style.display = 'none';
}

// Функция для открытия модального окна опорожнения корзины
document.getElementById('emptyTrashButton').addEventListener('click', function() {
    document.getElementById('emptyTrashModal').style.display = 'block';
});

// Функция для закрытия модального окна опорожнения корзины
function closeEmptyTrashModal() {
    document.getElementById('emptyTrashModal').style.display = 'none';
}

// Функция для подтверждения опорожнения корзины
document.getElementById('confirmEmptyTrash').addEventListener('click', async function() {
    const response = await fetch('/empty-trash', {
        method: 'POST'
    });

    if (response.ok) {
        alert('Корзина очищена');
        document.getElementById('emptyTrashModal').style.display = 'none';
    } else {
        alert('Ошибка при очистке корзины');
    }
});

// Функция для отмены опорожнения корзины
document.getElementById('cancelEmptyTrash').addEventListener('click', function() {
    document.getElementById('emptyTrashModal').style.display = 'none';
});

// Закрытие модальных окон при нажатии на область вне модального окна
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Функция для переключения вида в зависимости от ширины окна
function handleResize() {
    const fileList = document.getElementById('fileList');
    const viewToggle = document.getElementById('viewToggle');
    const windowWidth = window.innerWidth;

    if (windowWidth <= 1020) {
        if (fileList.classList.contains('list-view')) {
            fileList.classList.remove('list-view');
            fileList.classList.add('grid-view');
        }
        viewToggle.disabled = true; // Деактивация кнопки переключения вида
        viewToggle.checked = true; // Установка состояния кнопки в grid-view
        viewToggle.classList.add('disabled'); // Добавление класса для понижения прозрачности
    } else {
        viewToggle.disabled = false; // Активация кнопки переключения вида
        viewToggle.classList.remove('disabled'); // Удаление класса для понижения прозрачности
    }
}

// Добавление обработчика события resize
window.addEventListener('resize', handleResize);

// Вызов функции при загрузке страницы для установки начального состояния
window.onload = function() {
    document.getElementById('viewToggle').checked = false;
    loadFiles();
    handleResize(); // Установка начального состояния в зависимости от ширины окна
};

// Переключение между построчным видом и сеткой
document.getElementById('viewToggle').addEventListener('change', function(event) {
    const fileList = document.getElementById('fileList');
    if (event.target.checked) {
        fileList.classList.remove('list-view');
        fileList.classList.add('grid-view');
    } else {
        fileList.classList.remove('grid-view');
        fileList.classList.add('list-view');
    }
});

// Показ баннера успешной замены файла
function showSuccessBanner() {
    const banner = document.getElementById('successBanner');
    banner.style.display = 'block';
    banner.style.opacity = '1';
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => {
            banner.style.display = 'none';
        }, 1000); // Время затухания должно совпадать с transition в CSS
    }, 2000); // Время показа баннера перед началом затухания
}

// Открытие модального окна истории изменений
document.getElementById('viewHistoryButton').addEventListener('click', function() {
    loadHistory();
});

// Загрузка истории изменений с фильтрацией
document.getElementById('historyFilterSelect').addEventListener('change', function() {
    const filter = this.value;
    loadHistory(filter);
});

// Загрузка истории изменений
async function loadHistory(filter = 'last10') {
    const response = await fetch(`/history?filter=${filter}`);
    if (response.ok) {
        const history = await response.json();
        const historyContent = document.getElementById('historyContent');
        historyContent.innerHTML = ''; // Очистка содержимого перед загрузкой

        // Применение класса для сетки в зависимости от фильтра
        if (['today', 'yesterday', 'last7Days', 'allTime'].includes(filter)) {
            historyContent.classList.add('history-grid-view');
        } else {
            historyContent.classList.remove('history-grid-view');
        }

        history.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'history-entry';
            entryElement.innerHTML = `
                <p class="history-author">Автор: ${entry.author}</p>
                <p class="history-date">Дата: ${entry.changeDate}</p>
                <p class="history-filename">Файл: ${entry.filename}</p>
                <p class="history-text">Изменение: ${entry.changeText}</p>
            `;
            historyContent.appendChild(entryElement);
        });

        document.getElementById('historyModal').style.display = 'block';
    } else {
        alert('Ошибка при загрузке истории изменений');
    }
}

// Очистка истории изменений
document.getElementById('clearHistoryButton').addEventListener('click', async function() {
    const response = await fetch('/clear-history', {
        method: 'POST'
    });

    if (response.ok) {
        alert('История очищена');
        loadHistory(); // Перезагрузка истории после очистки
    } else {
        alert('Ошибка при очистке истории');
    }
});

// Закрытие модального окна истории изменений
function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

// Открытие модального окна комментариев
function openCommentModal(fileId) {
    const commentForm = document.getElementById('commentForm');
    commentForm.dataset.fileId = fileId;
    loadComments(fileId);
    document.getElementById('commentModal').style.display = 'block';
}


// Закрытие модального окна комментариев
function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
}

// Загрузка комментариев для файла
async function loadComments(fileId) {
    const response = await fetch(`/comments/${fileId}`);
    if (response.ok) {
        const comments = await response.json();
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerHTML = `
                <p><strong>${comment.author}</strong> (${comment.commentDate}):</p>
                <p>${comment.comment}</p>
            `;
            commentsList.appendChild(commentElement);
        });
    } else {
        alert('Ошибка при загрузке комментариев');
    }
}

// Добавление нового комментария
document.getElementById('commentForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const fileId = event.target.dataset.fileId;
    const author = document.getElementById('commentAuthor').value;
    const comment = document.getElementById('commentText').value;

    const response = await fetch('/add-comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileId, author, comment })
    });

    if (response.ok) {
        loadComments(fileId);
        document.getElementById('commentAuthor').value = '';
        document.getElementById('commentText').value = '';
    } else {
        alert('Ошибка при добавлении комментария');
    }
});

// Установка дефолтного значения флажка "сетка" на неактивное при перезагрузке страницы
window.onload = function() {
    document.getElementById('viewToggle').checked = false;
    loadFiles();
};

