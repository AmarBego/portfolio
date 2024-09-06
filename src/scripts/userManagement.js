let users = [];
let currentPage = 1;
const usersPerPage = 10;

export function filterUsers(searchTerm, role, status) {
    return users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = role === '' || user.role === role;
        const matchesStatus = status === '' || 
                              (status === 'active' && user.lastActive && new Date(user.lastActive) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
                              (status === 'inactive' && (!user.lastActive || new Date(user.lastActive) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
        return matchesSearch && matchesRole && matchesStatus;
    });
}

export function sortUsers(field, direction) {
    return users.sort((a, b) => {
        if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

export function paginateUsers(users, page) {
    const start = (page - 1) * usersPerPage;
    const end = start + usersPerPage;
    return users.slice(start, end);
}

function updateTable(filteredUsers) {
    const tbody = document.getElementById('users-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const paginatedUsers = paginateUsers(filteredUsers, currentPage);

    paginatedUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.dataset.userId = user._id;
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role || 'User'}</td>
            <td>${user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'N/A'}</td>
            <td>${user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'N/A'}</td>
            <td>
                <div class="dropdown">
                    <button class="dropbtn">Actions <i class="mdi:chevron-down"></i></button>
                    <div class="dropdown-content">
                        <button class="view-expenses">View Expenses</button>
                        <button class="view-due-transactions">Due Transactions</button>
                        <button class="edit-user">Edit User</button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePagination(filteredUsers.length);
}

function updatePagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');

    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevButton) prevButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = currentPage === totalPages;
}

async function fetchTransactions(userId) {
    try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/users/${userId}/transactions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            console.error('Received non-array data:', data);
            return []; // Return an empty array if data is not an array
        }
        return data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return []; // Return an empty array in case of any error
    }
}


function showModal(title, transactions) {
    const modal = document.getElementById('transactions-modal');
    const modalTitle = document.getElementById('modal-title');
    const transactionsList = document.getElementById('transactions-list');

    modalTitle.textContent = title;
    transactionsList.innerHTML = transactions.map(t => `
        <div class="transaction">
            <p>Description: ${t.category}</p>
            <p>Amount: $${t.amount.toFixed(2)}</p>
            <p>Date: ${new Date(t.date).toLocaleDateString()}</p>
            <p>Type: ${t.type}</p>
            ${t.dueDate ? `<p>Due Date: ${new Date(t.dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        ${transactions.indexOf(t) < transactions.length - 1 ? '<hr class="transaction-divider">' : ''}
    `).join('');
    modal.style.display = 'block';
}

export function setupEventListeners() {
    const searchInput = document.getElementById('search');
    const roleSelect = document.getElementById('filter-role');
    const statusSelect = document.getElementById('filter-status');
    const tableHeaders = document.querySelectorAll('.users-table th[data-sort]');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const userTable = document.querySelector('.users-table');
    const modal = document.getElementById('transactions-modal');
    const closeModal = document.getElementById('close-modal');

    // Fetch users data
    fetch(`${import.meta.env.PUBLIC_API_URL}/api/users`)
        .then(response => response.json())
        .then(data => {
            users = data;
            updateTable(users);
        });

    searchInput.addEventListener('input', handleFilters);
    roleSelect.addEventListener('change', handleFilters);
    statusSelect.addEventListener('change', handleFilters);

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            const currentDirection = header.getAttribute('data-direction') || 'asc';
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            
            tableHeaders.forEach(h => h.removeAttribute('data-direction'));
            header.setAttribute('data-direction', newDirection);

            const sortedUsers = sortUsers(field, newDirection);
            updateTable(sortedUsers);
        });
    });

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                handleFilters();
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(users.length / usersPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                handleFilters();
            }
        });
    }

    userTable.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('view-expenses') || target.classList.contains('view-due-transactions')) {
            const userId = target.closest('tr').dataset.userId;
            const userEmail = target.closest('tr').querySelector('td:nth-child(2)').textContent;
            const transactions = await fetchTransactions(userId);
            
            if (transactions.length === 0) {
                showModal(`No transactions for ${userEmail}`, []);
                return;
            }
            
            if (target.classList.contains('view-expenses')) {
                const expenses = transactions.filter(t => t.type === 'expense');
                showModal(`Expenses for ${userEmail}`, expenses);
            } else {
                const dueTransactions = transactions.filter(t => t.dueDate && new Date(t.dueDate) > new Date() && !t.isPaid);
                showModal(`Due Transactions for ${userEmail}`, dueTransactions);
            }
        }
    });
    
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function handleFilters() {
    const searchTerm = document.getElementById('search').value;
    const role = document.getElementById('filter-role').value;
    const status = document.getElementById('filter-status').value;

    const filteredUsers = filterUsers(searchTerm, role, status);
    updateTable(filteredUsers);
}