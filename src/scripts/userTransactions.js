const expenseButtons = document.querySelectorAll('.view-expenses');
const dueTransactionButtons = document.querySelectorAll('.view-due-transactions');
const modal = document.getElementById('transactions-modal');
const modalTitle = document.getElementById('modal-title');
const transactionsList = document.getElementById('transactions-list');
const closeModal = document.getElementById('close-modal');

function showModal(title, transactions) {
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

function showPopupMessage(button, message) {
    const popupMessage = button.parentElement.querySelector('.popup-message');
    popupMessage.textContent = message;
    popupMessage.style.display = 'block';
    setTimeout(() => {
        popupMessage.style.display = 'none';
    }, 3000);
}

async function fetchTransactions(userId) {
    const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/users/${userId}/transactions`);
    return await response.json();
}

async function updateButtonState(button, transactions, filterFn, emptyMessage) {
    const filteredTransactions = transactions.filter(filterFn);
    if (filteredTransactions.length === 0) {
        button.disabled = true;
        button.addEventListener('click', () => showPopupMessage(button, emptyMessage));
    } else {
        button.disabled = false;
    }
    return filteredTransactions;
}

document.querySelectorAll('.user-card').forEach(async (userCard) => {
    const userId = userCard.dataset.userId;
    const transactions = await fetchTransactions(userId);
    
    const expenseButton = userCard.querySelector('.view-expenses');
    const dueTransactionButton = userCard.querySelector('.view-due-transactions');
    const userEmail = userCard.querySelector('p').textContent;

    const expenses = await updateButtonState(
        expenseButton,
        transactions,
        t => t.type === 'expense',
        'No expenses available'
    );

    const dueTransactions = await updateButtonState(
        dueTransactionButton,
        transactions,
        t => t.dueDate && new Date(t.dueDate) > new Date() && !t.isPaid,
        'No due transactions'
    );

    expenseButton.addEventListener('click', () => {
        if (!expenseButton.disabled) {
            showModal(`Expenses for ${userEmail}`, expenses);
        }
    });

    dueTransactionButton.addEventListener('click', () => {
        if (!dueTransactionButton.disabled) {
            showModal(`Due Transactions for ${userEmail}`, dueTransactions);
        }
    });
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});