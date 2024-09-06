let users = [];
let currentPage = 1;
const usersPerPage = 10;

export function filterUsers(searchTerm) {
    return users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
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

async function fetchTransactions(userId) {
    try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/users/${userId}/transactions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            console.error('Received non-array data:', data);
            return [];
        }
        return data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

function showModal(title, transactions, isDueTransactions = false) {
    const modal = document.getElementById('transactions-modal');
    const modalTitle = document.getElementById('modal-title');
    const transactionsList = document.getElementById('transactions-list');

    modalTitle.textContent = title;
    
    if (transactions.length > 0) {
        const filteredTransactions = isDueTransactions 
            ? transactions 
            : transactions.filter(t => t.isPaid !== false);

        transactionsList.innerHTML = filteredTransactions.map(t => `
            <div class="transaction-item">
                <p><strong>Amount:</strong> $${t.amount.toFixed(2)}</p>
                <p><strong>Description:</strong> ${t.category || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(t.date).toLocaleDateString()}</p>
                ${isDueTransactions && t.dueDate ? `<p><strong>Due Date:</strong> ${new Date(t.dueDate).toLocaleDateString()}</p>` : ''}
            </div>
        `).join('');

        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = '<p>No transactions found.</p>';
        }
    } else {
        transactionsList.innerHTML = '<p>No transactions found.</p>';
    }

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
        });

    searchInput.addEventListener('input', handleFilters);

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            const currentDirection = header.getAttribute('data-direction') || 'asc';
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            
            tableHeaders.forEach(h => h.removeAttribute('data-direction'));
            header.setAttribute('data-direction', newDirection);

            const sortedUsers = sortUsers(field, newDirection);
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
        const target = event.target.closest('.view-expenses, .view-due-transactions');
        if (target) {
            const userId = target.closest('tr').dataset.userId;
            const username = target.closest('tr').querySelector('td:first-child').textContent;
            const transactions = await fetchTransactions(userId);
            
            if (transactions.length === 0) {
                showModal(`No transactions for ${username}`, []);
                return;
            }
            
            if (target.classList.contains('view-expenses')) {
                const expenses = transactions.filter(t => t.type === 'expense');
                showModal(`Expenses for ${username}`, expenses, false);
            } else {
                const dueTransactions = transactions.filter(t => t.dueDate && new Date(t.dueDate) > new Date() && !t.isPaid);
                showModal(`Due Transactions for ${username}`, dueTransactions, true);
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
    const filteredUsers = filterUsers(searchTerm);
}