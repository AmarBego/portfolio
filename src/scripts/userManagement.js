import { setupWebSocket, getWebSocket, closeWebSocket } from './websocket.js';
import { formatDate } from '../utils/dateUtils.js';

let users = [];
let currentPage = 1;

const usersPerPage = 10;

async function fetchTransactions(userId) {
    try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/users/${userId}/transactions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        return [];
    }
}

export function filterUsers(searchTerm) {
    return users.filter(user => {
        return user.username.toLowerCase().includes(searchTerm.toLowerCase());
    });
}

export function paginateUsers(users, page) {
    const start = (page - 1) * usersPerPage;
    const end = start + usersPerPage;
    return users.slice(start, end);
}

function handleFilters() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const filteredUsers = filterUsers(searchTerm);
    const paginatedUsers = paginateUsers(filteredUsers, currentPage);
    const rows = document.querySelectorAll('#users-body tr');
    
    rows.forEach((row, index) => {
        if (index < paginatedUsers.length) {
            const user = paginatedUsers[index];
            const username = user.username.toLowerCase();
            const matchesSearch = searchTerm.split('').every((char, i) => username[i] === char);
            
            if (matchesSearch) {
                row.style.display = '';
                row.dataset.userId = user._id;

                row.querySelector('td:nth-child(1)').textContent = user.username;

                const lastActiveCell = row.querySelector('td:nth-child(2)');
                lastActiveCell.textContent = user.lastActive 
                    ? formatDate(user.lastActive)
                    : 'N/A';
                const dateJoinedCell = row.querySelector('td:nth-child(3)');
                dateJoinedCell.textContent = user.dateJoined 
                    ? formatDate(user.dateJoined)
                    : 'N/A';
            } else {
                row.style.display = 'none';
            }
        } else {
            row.style.display = 'none';
        }
    });

    updatePagination(filteredUsers.length);
}

function updatePagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages || totalUsers === 0;
}

function showModal(title, transactions, userId, isDueTransactions = false) {
    const modal = document.getElementById('transactions-modal');
    const modalTitle = document.getElementById('modal-title');
    const transactionsList = document.getElementById('transactions-list');
    
    modal.dataset.userId = userId;
    modalTitle.textContent = title;
    
    if (transactions.length > 0) {
        const filteredTransactions = isDueTransactions 
            ? transactions.filter(t => t.type === 'expense' && t.isPaid === false)
            : transactions.filter(t => t.type === 'expense' && (t.isPaid === true || t.isPaid === null));
    
        transactionsList.innerHTML = filteredTransactions.map(t => `
            <div class="transaction-item">
                <p><strong>Description:</strong> ${t.category || 'N/A'}</p>
                <p><strong>Amount:</strong> $${t.amount.toFixed(2)}</p>
                <p><strong>Date:</strong> ${new Date(t.date).toLocaleDateString()}</p>
                ${isDueTransactions ? `<p><strong>Due Date:</strong> ${new Date(t.dueDate).toLocaleDateString()}</p>` : ''}
            </div>
        `).join('');
    
        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = '<p class="no-transactions">No transactions found.</p>';
        }
    } else {
        transactionsList.innerHTML = '<p class="no-transactions">No transactions found.</p>';
    }
    
    modal.style.display = 'block';
    document.dispatchEvent(new CustomEvent('updateTransactions', { detail: { transactions, userId } }));
}

function handleRealtimeUpdate(message) {
    switch (message.type) {
        case 'newUser':
            users.push(message.user);
            handleFilters();
            break;
        case 'updateUser':
            const userIndex = users.findIndex(u => u._id === message.user._id);
            if (userIndex !== -1) {
                users[userIndex] = message.user;
                handleFilters();
            }
            break;
        case 'newTransaction':
        case 'updateTransaction':
            updateTransactionsModal(message.transaction.userId, message.transaction);
            updateUserTransactionInfo(message.transaction.userId);
            break;
        case 'deleteTransaction':
            removeTransactionFromModal(message.transactionId);
            updateUserTransactionInfo(message.userId);
            break;
        default:
            console.log('Unhandled message type:', message.type);
    }
}

function updateTransactionsModal(userId, transaction) {
    const modal = document.getElementById('transactions-modal');
    if (modal && modal.style.display === 'block' && modal.dataset.userId === userId) {
        const isDueTransactions = modal.querySelector('#modal-title').textContent.includes('Due Transactions');
        
        if (transaction.type === 'expense') {
            if ((isDueTransactions && transaction.isPaid === false) ||
                (!isDueTransactions && (transaction.isPaid === true || transaction.isPaid === null))) {
                window.addTransactionToModal(transaction);
            } else {
                window.removeTransactionFromModal(transaction._id);
            }
        }

        const transactionsList = document.getElementById('transactions-list');
        if (transactionsList.children.length === 0) {
            const noTransactionsMessage = document.createElement('p');
            noTransactionsMessage.className = 'no-transactions';
            noTransactionsMessage.textContent = 'No transactions found.';
            transactionsList.appendChild(noTransactionsMessage);
        }
    }
}

function removeTransactionFromModal(transactionId) {
    const transactionElement = document.querySelector(`#transactions-list .transaction-item[data-transaction-id="${transactionId}"]`);
    if (transactionElement) {
        transactionElement.remove();
    }
    
    const transactionsList = document.getElementById('transactions-list');
    if (transactionsList.children.length === 0) {
        transactionsList.innerHTML = '<p>No transactions found.</p>';
    }
}

async function updateUserTransactionInfo(userId) {
    try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/users/${userId}/transactions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const transactions = await response.json();
        
        const userRow = document.querySelector(`#users-body tr[data-user-id="${userId}"]`);
        if (userRow) {
            const lastTransactionDate = transactions.length > 0 
                ? new Date(Math.max(...transactions.map(t => new Date(t.date)))).toLocaleDateString()
                : 'N/A';
            userRow.querySelector('td:nth-child(2)').textContent = lastTransactionDate;
        }
    } catch (error) {
        console.error('Error updating user transaction info:', error);
    }
}

function closeModal() {
    const modal = document.getElementById('transactions-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export function setupEventListeners() {
    setupWebSocket(handleRealtimeUpdate);
    const searchInput = document.getElementById('search');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const userTable = document.querySelector('.users-table');
    const modal = document.getElementById('transactions-modal');
    const closeModalButton = document.getElementById('close-modal');
    
    // Close modal on page load/refresh
    closeModal();

    fetch(`${import.meta.env.PUBLIC_API_URL}/api/users`)
        .then(response => response.json())
        .then(data => {
            users = data;
            handleFilters();
        });

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        handleFilters();
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
            const filteredUsers = filterUsers(searchInput.value.toLowerCase());
            const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                handleFilters();
            }
        });
    }

    userTable.addEventListener('click', async (event) => {
        const target = event.target.closest('.view-expenses, .view-due-transactions');
        if (target) {
            const row = target.closest('tr');
            const username = row.querySelector('td:first-child').textContent;
            const userId = row.dataset.userId;
            
            const transactions = await fetchTransactions(userId);
            
            if (target.classList.contains('view-expenses')) {
                const expenses = transactions.filter(t => t.type === 'expense' && (t.isPaid === true || t.isPaid === null));
                showModal(`Expenses for ${username}`, expenses, userId, false);
            } else {
                const dueTransactions = transactions.filter(t => t.type === 'expense' && t.isPaid === false);
                showModal(`Due Transactions for ${username}`, dueTransactions, userId, true);
            }
        }
    });

    closeModalButton.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    window.addEventListener('beforeunload', closeModal);

    return () => {
        closeWebSocket();
        window.removeEventListener('beforeunload', closeModal);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    closeModal();
});


export { handleRealtimeUpdate };
