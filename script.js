document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const sidebar = document.querySelector('.sidebar');
    const menuIcon = document.querySelector('.bx-menu');
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const dateInput = document.getElementById('date-input');
    const list = document.getElementById('todolist');
    const navItems = document.querySelectorAll('.nav-item[data-filter]');
    const newListBtn = document.querySelector('.new-list');
    const pageTitle = document.getElementById('page-title');
    const currentDateEl = document.getElementById('current-date');
    const tasksCountBadge = document.getElementById('tasks-count');

    // Sort Elements
    const sortBtns = document.querySelectorAll('.sort-btn');

    // Modal Elements
    const modal = document.getElementById('edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const editTextInput = document.getElementById('edit-text');
    const editDateInput = document.getElementById('edit-date');
    const editNotesInput = document.getElementById('edit-notes');

    // Priority Selector Elements
    const priorityBtns = document.querySelectorAll('.priority-btn');
    const editPriorityInput = document.getElementById('edit-priority'); // Hidden input

    // --- State ---
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let lists = JSON.parse(localStorage.getItem('lists')) || [];
    let currentFilter = 'all';
    let currentSort = 'added'; // added, date, priority, alphabetical
    let isSidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed')) || false;
    let currentEditingId = null;

    // --- Initialization ---
    function init() {
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        currentDateEl.textContent = new Date().toLocaleDateString('en-US', dateOptions);

        if (isSidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }

        // Init Flatpickrs
        flatpickr("#date-input", { dateFormat: "Y-m-d", placeholder: "Due Date" });
        flatpickr("#edit-date", { dateFormat: "Y-m-d" });

        renderListsSidebar();
        updateTasksCount();
        render();
    }

    // --- Sidebar Toggle ---
    menuIcon.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        isSidebarCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
    });

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav(item);
            currentFilter = item.dataset.filter;
            updateHeader(item.querySelector('span').textContent);
            render();
        });
    });

    newListBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const listName = prompt("Enter new list name:");
        if (listName && listName.trim()) {
            const newList = {
                id: 'list-' + Date.now(),
                name: listName.trim(),
                icon: 'bx-list-ul'
            };
            lists.push(newList);
            saveLists();
            renderListsSidebar();

            currentFilter = newList.id;
            updateHeader(newList.name);
            setTimeout(() => {
                const newItem = document.querySelector(`.nav-item[data-filter="${newList.id}"]`);
                if (newItem) setActiveNav(newItem);
            }, 50);

            render();
        }
    });

    function setActiveNav(targetItem) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        if (targetItem) targetItem.classList.add('active');
    }

    function updateHeader(title) {
        pageTitle.textContent = title;
    }

    function renderListsSidebar() {
        const existingDynamic = document.querySelectorAll('.nav-item.dynamic-list');
        existingDynamic.forEach(el => el.remove());

        lists.forEach(list => {
            const a = document.createElement('a');
            a.href = "#";
            a.className = 'nav-item dynamic-list';
            a.dataset.filter = list.id;
            if (currentFilter === list.id) a.classList.add('active');

            a.innerHTML = `
                <i class='bx ${list.icon}'></i>
                <span>${list.name}</span>
                <span class="badge">${getCountsForList(list.id)}</span>
            `;

            a.addEventListener('click', (e) => {
                e.preventDefault();
                setActiveNav(a);
                currentFilter = list.id;
                updateHeader(list.name);
                render();
            });
            newListBtn.parentNode.insertBefore(a, newListBtn);
        });
    }

    function getCountsForList(listId) {
        const count = todos.filter(t => t.listId === listId && !t.completed).length;
        return count > 0 ? count : '';
    }

    // --- Sorting Logic ---
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Active State
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set Sort
            currentSort = btn.dataset.sort;
            render();
        });
    });

    // --- Modal Logic ---

    // Priority Selector Click Logic
    priorityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            priorityBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            editPriorityInput.value = btn.dataset.value;
        });
    });

    function openEditModal(todo) {
        currentEditingId = todo.id;
        editTextInput.value = todo.text;

        // Date
        const fp = document.querySelector("#edit-date")._flatpickr;
        if (todo.date) {
            fp.setDate(todo.date);
        } else {
            fp.clear();
        }

        // Priority - Select the correct button
        const priority = todo.priority || 'none';
        priorityBtns.forEach(btn => {
            if (btn.dataset.value === priority) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
        editPriorityInput.value = priority;

        editNotesInput.value = todo.notes || '';

        modal.classList.add('show');
    }

    function closeEditModal() {
        modal.classList.remove('show');
        currentEditingId = null;
    }

    closeModalBtns.forEach(btn => btn.addEventListener('click', closeEditModal));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditModal();
    });

    // Save Edit
    saveEditBtn.addEventListener('click', () => {
        if (currentEditingId) {
            const newText = editTextInput.value.trim();
            if (!newText) return alert("Task name cannot be empty");

            const newDate = editDateInput.value;
            // Get priority from hidden input or selected button
            const newPriority = editPriorityInput.value;
            const newNotes = editNotesInput.value;

            todos = todos.map(t => {
                if (t.id === currentEditingId) {
                    return {
                        ...t,
                        text: newText,
                        date: newDate || null,
                        priority: newPriority,
                        notes: newNotes
                    };
                }
                return t;
            });

            saveAndRender();
            closeEditModal();
        }
    });


    // --- CRUD ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        const date = dateInput.value;
        if (text) {
            addTodo(text, date);
            input.value = '';
            dateInput._flatpickr.clear();
            input.focus();
        }
    });

    function addTodo(text, date) {
        let targetListId = null;
        let isImportant = false;
        let dueDate = date || null;

        if (currentFilter.startsWith('list-')) {
            targetListId = currentFilter;
        } else if (currentFilter === 'today') {
            if (!dueDate) dueDate = new Date().toISOString().split('T')[0];
        } else if (currentFilter === 'important') {
            isImportant = true;
        }

        const newTodo = {
            id: Date.now(),
            text: text,
            completed: false,
            date: dueDate,
            important: isImportant,
            listId: targetListId,
            priority: 'none',
            notes: '',
            createdAt: new Date().toISOString()
        };

        todos.unshift(newTodo);
        saveAndRender();
        renderListsSidebar();
    }

    function toggleComplete(id) {
        todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        saveAndRender();
        renderListsSidebar();
    }

    function deleteTodo(id) {
        if (confirm("Are you sure you want to delete this task?")) {
            todos = todos.filter(t => t.id !== id);
            saveAndRender();
            renderListsSidebar();
        }
    }

    // --- Storage & Render ---
    function saveAndRender() {
        localStorage.setItem('todos', JSON.stringify(todos));
        saveLists();
        updateTasksCount();
        render();
    }

    function saveLists() {
        localStorage.setItem('lists', JSON.stringify(lists));
    }

    function updateTasksCount() {
        const count = todos.filter(t => !t.listId && !t.completed).length;
        if (tasksCountBadge) tasksCountBadge.textContent = count > 0 ? count : '';
    }

    function render() {
        list.innerHTML = '';
        const todayStr = new Date().toISOString().split('T')[0];
        let filteredTodos = [];

        // 1. Filter
        switch (currentFilter) {
            case 'all':
                filteredTodos = [...todos];
                break;
            case 'today':
                filteredTodos = todos.filter(t => t.date === todayStr);
                break;
            case 'important':
                filteredTodos = todos.filter(t => t.important);
                break;
            case 'planned':
                filteredTodos = todos.filter(t => t.date && t.date >= todayStr);
                break;
            case 'tasks':
                filteredTodos = todos.filter(t => !t.listId);
                break;
            default:
                if (currentFilter.startsWith('list-')) {
                    filteredTodos = todos.filter(t => t.listId === currentFilter);
                }
                break;
        }

        // 2. Sort
        filteredTodos.sort((a, b) => {
            switch (currentSort) {
                case 'date':
                    // Sort by date (ascending). No date goes to bottom.
                    if (!a.date && !b.date) return 0;
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return new Date(a.date) - new Date(b.date);

                case 'priority':
                    // High > Medium > Low > None
                    const pMap = { high: 3, medium: 2, low: 1, none: 0 };
                    const pA = pMap[a.priority || 'none'];
                    const pB = pMap[b.priority || 'none'];
                    return pB - pA; // Descending priority

                case 'alphabetical':
                    return a.text.localeCompare(b.text);

                case 'added':
                default:
                    // Sort by ID (timestamp) descending (newest first)
                    return b.id - a.id;
            }
        });

        filteredTodos.forEach(todo => {
            const item = createTodoItem(todo);
            list.appendChild(item);
        });
    }

    function createTodoItem(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;
        li.draggable = true;

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleComplete(todo.id);
        });

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'todo-content';

        const todoText = document.createElement('div');
        todoText.className = 'todo-text';
        todoText.textContent = todo.text;

        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'todo-info';

        if ((currentFilter === 'all' || currentFilter === 'today' || currentFilter === 'planned' || currentFilter === 'important') && todo.listId) {
            const listObj = lists.find(l => l.id === todo.listId);
            if (listObj) {
                const listSpan = document.createElement('span');
                listSpan.innerHTML = `<i class='bx bx-list-ul'></i> ${listObj.name}`;
                infoDiv.appendChild(listSpan);
            }
        }

        if (todo.date) {
            const dateSpan = document.createElement('span');
            dateSpan.innerHTML = `<i class='bx bx-calendar'></i> ${todo.date}`;
            infoDiv.appendChild(dateSpan);
        }

        if (todo.priority && todo.priority !== 'none') {
            const prioritySpan = document.createElement('span');
            prioritySpan.className = `priority-tag ${todo.priority}`;
            prioritySpan.textContent = todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1);
            infoDiv.appendChild(prioritySpan);
        }

        if (todo.notes) {
            const notesSpan = document.createElement('span');
            notesSpan.className = 'note-indicator';
            notesSpan.innerHTML = "<i class='bx bx-note'></i>";
            infoDiv.appendChild(notesSpan);
        }

        if (todo.important) {
            const impSpan = document.createElement('span');
            impSpan.innerHTML = `<i class='bx bxs-star' style='color:orange'></i>`;
            infoDiv.appendChild(impSpan);
        }

        contentDiv.appendChild(todoText);
        contentDiv.appendChild(infoDiv);

        // Actions
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = "<i class='bx bx-trash'></i>";
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTodo(todo.id);
        });

        li.appendChild(checkbox);
        li.appendChild(contentDiv);
        li.appendChild(deleteBtn);

        // Event for Modal
        contentDiv.addEventListener('click', () => {
            openEditModal(todo);
        });

        // Drag Events
        li.addEventListener('dragstart', () => li.classList.add('dragging'));
        li.addEventListener('dragend', () => li.classList.remove('dragging'));

        return li;
    }

    // --- Drop on Release System ---
    // Item only moves when you release the mouse, no flickering during drag
    let dropTargetElement = null;

    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        // Just track where we would drop, don't move anything yet
        dropTargetElement = getDragAfterElement(list, e.clientX, e.clientY);
    });

    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggable = document.querySelector('.dragging');
        if (!draggable) return;

        // Now actually move the element
        if (dropTargetElement == null) {
            list.appendChild(draggable);
        } else {
            list.insertBefore(draggable, dropTargetElement);
        }
        dropTargetElement = null;
    });

    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];
        if (draggableElements.length === 0) return null;

        let closestElement = null;
        let closestDistance = Number.POSITIVE_INFINITY;

        for (const child of draggableElements) {
            const box = child.getBoundingClientRect();
            const centerX = box.left + box.width / 2;
            const centerY = box.top + box.height / 2;
            const distance = Math.hypot(x - centerX, y - centerY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestElement = child;
            }
        }

        if (!closestElement) return null;

        const box = closestElement.getBoundingClientRect();
        const centerX = box.left + box.width / 2;

        // Insert before or after based on horizontal position
        if (x > centerX) {
            return closestElement.nextElementSibling;
        } else {
            return closestElement;
        }
    }

    init();
});