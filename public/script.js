document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim() || 'guest'; // Установка имени пользователя как "guest", если поле пустое
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
    } else {
        alert('Ошибка при загрузке файла');
    }
});

async function loadFiles(order = 'asc', filterParam = 'id', author = '', filename = '', searchType = 'substring') {
    const response = await fetch(`/files?order=${order}&filterParam=${filterParam}&author=${encodeURIComponent(author)}&filename=${encodeURIComponent(filename)}&searchType=${searchType}`);
    if (response.ok) {
        const files = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = ''; // Очистка списка файлов перед загрузкой
        files.forEach(file => displayFile(file.id, file.filename, file.size));
        updateFileCount(files.length);
    } else {
        alert('Ошибка при загрузке списка файлов');
    }
}

function displayFile(id, filename, size) {
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
        </div>
    `;
    fileList.appendChild(fileCard);
}

function downloadFile(id) {
    const link = document.createElement('a');
    link.href = `/download/${id}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateFileCount(count) {
    const fileCountElement = document.getElementById('fileCount');
    fileCountElement.textContent = `Количество файлов: ${count}`;
}

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

function applyFilters() {
    const filterParam = document.getElementById('filterParamSelect').value;
    const order = document.getElementById('orderSelect').value;
    const author = document.getElementById('authorInput').value.trim();
    const filename = document.getElementById('filenameInput').value.trim();
    const searchType = document.getElementById('searchType').value;
    loadFiles(order, filterParam, author, filename, searchType);
}

function resetFilters() {
    document.getElementById('filenameInput').value = '';
    document.getElementById('authorInput').value = '';
    document.getElementById('searchType').value = 'substring';
    document.getElementById('filterParamSelect').value = 'id';
    document.getElementById('orderSelect').value = 'asc';
}

function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
}

async function deleteFile(id, filename) {
    const response = await fetch(`/delete/${id}`, {
        method: 'DELETE'
    });

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
                    fileCards[i].querySelector('.download-button').href = `/storage/${result.filename}`;
                    fileCards[i].querySelector('.download-button').textContent = 'Скачать';
                    fileCards[i].querySelector('.replace-button').setAttribute('onclick', `openReplaceModal('${result.id}', '${result.filename}')`);
                    fileCards[i].querySelector('.delete-button').setAttribute('onclick', `deleteFile('${result.id}', '${result.filename}')`);
                    fileCards[i].querySelector('.metadata-button').setAttribute('onclick', `showMetadata('${result.id}')`);
                    break;
                }
            }
            document.getElementById('modal').style.display = 'none';
        } else {
            alert('Ошибка при замене файла');
        }
    }
});

document.getElementById('cancel-replace').addEventListener('click', function() {
    document.getElementById('modal').style.display = 'none';
});

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
    const response = await fetch('/metadata');
    if (response.ok) {
        const metadata = await response.json();
        const fileMetadata = metadata.find(file => file.id === parseInt(id));
        if (fileMetadata) {
            const formattedMetadata = formatMetadata(fileMetadata);
            document.getElementById('metadataContent').textContent = formattedMetadata;
            document.getElementById('metadataModal').style.display = 'block';
        } else {
            alert('Метаданные не найдены');
        }
    } else {
        alert('Ошибка при получении метаданных');
    }
}

function formatMetadata(metadata) {
    return Object.entries(metadata).map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}: [${value.join(', ')}]`;
        }
        return `${key}: ${value}`;
    }).join('\n');
}

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

// Функция для проверки и реанимации файлов
document.getElementById('checkFilesButton').addEventListener('click', async function() {
    const response = await fetch('/check-files', {
        method: 'POST'
    });

    if (response.ok) {
        alert('Проверка завершена. Файлы реанимированы.');
        loadFiles(); // Перезагрузка списка файлов
    } else {
        alert('Ошибка при проверке файлов');
    }
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

// Установка дефолтного значения флажка "сетка" на неактивное при перезагрузке страницы
window.onload = function() {
    document.getElementById('viewToggle').checked = false;
    loadFiles();
};