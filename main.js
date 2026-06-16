'use strict';

// ==================== CONSTANTES ====================
const CATEGORIES = {
    expense: [
        { id: 'food',          name: 'Alimentation',          icon: 'fas fa-utensils',            color: '#FF6B6B' },
        { id: 'transport',     name: 'Transport',             icon: 'fas fa-car',                 color: '#4ECDC4' },
        { id: 'housing',       name: 'Logement',              icon: 'fas fa-home',                color: '#45B7D1' },
        { id: 'health',        name: 'Santé',                 icon: 'fas fa-heartbeat',           color: '#96CEB4' },
        { id: 'entertainment', name: 'Loisirs',               icon: 'fas fa-gamepad',             color: '#FFEAA7' },
        { id: 'shopping',      name: 'Shopping',              icon: 'fas fa-shopping-bag',        color: '#DDA0DD' },
        { id: 'education',     name: 'Éducation',             icon: 'fas fa-graduation-cap',      color: '#74B9FF' },
        { id: 'bills',         name: 'Factures (Jirama…)',    icon: 'fas fa-file-invoice-dollar', color: '#A29BFE' },
        { id: 'clothing',      name: 'Vêtements',             icon: 'fas fa-tshirt',              color: '#FD79A8' },
        { id: 'restaurant',    name: 'Restaurant',            icon: 'fas fa-concierge-bell',      color: '#E17055' },
        { id: 'subscriptions', name: 'Abonnements',           icon: 'fas fa-redo',                color: '#6C5CE7' },
        { id: 'other_expense', name: 'Autre',                 icon: 'fas fa-ellipsis-h',          color: '#636E72' }
    ],
    income: [
        { id: 'salary',        name: 'Salaire',               icon: 'fas fa-briefcase',           color: '#00B894' },
        { id: 'freelance',     name: 'Freelance',             icon: 'fas fa-laptop-code',         color: '#0984E3' },
        { id: 'investment',    name: 'Investissement',        icon: 'fas fa-chart-line',          color: '#6C5CE7' },
        { id: 'gift',          name: 'Cadeau',                icon: 'fas fa-gift',                color: '#E84393' },
        { id: 'refund',        name: 'Remboursement',         icon: 'fas fa-undo-alt',            color: '#FDCB6E' },
        { id: 'other_income',  name: 'Autre revenu',          icon: 'fas fa-plus',                color: '#636E72' }
    ]
};

// ==================== STATE ====================
let transactions = [];
let budgets = [];
let settings = {
    currency: 'MGA',
    theme: 'light',
    userName: 'Jean Dupont',
    userEmail: 'jean@email.com',
    monthlyIncome: 0
};

let currentPage = 'dashboard';
let currentType = 'expense';
let currentCategory = '';
let paginationPage = 1;
const PER_PAGE = 10;

let chartInstances = {};

// ==================== UTILITAIRES ====================
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function formatCurrency(amount) {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(absAmount);
    return formatted + ' Ar';
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getMonthKey(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function getCategoryInfo(catId) {
    const allCats = [...CATEGORIES.expense, ...CATEGORIES.income];
    return allCats.find(c => c.id === catId) || { name: catId, icon: 'fas fa-tag', color: '#636E72' };
}

function getCurrentMonth() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// ==================== PERSISTANCE ====================
function saveData() {
    try {
        localStorage.setItem('moneyManager_transactions', JSON.stringify(transactions));
        localStorage.setItem('moneyManager_budgets', JSON.stringify(budgets));
        localStorage.setItem('moneyManager_settings', JSON.stringify(settings));
    } catch(e) { console.warn('localStorage non disponible'); }
}

function loadData() {
    try {
        const savedTrans    = localStorage.getItem('moneyManager_transactions');
        const savedBudgets  = localStorage.getItem('moneyManager_budgets');
        const savedSettings = localStorage.getItem('moneyManager_settings');
        if (savedTrans)    transactions = JSON.parse(savedTrans);
        if (savedBudgets)  budgets      = JSON.parse(savedBudgets);
        if (savedSettings) settings     = { ...settings, ...JSON.parse(savedSettings) };
        // Force MGA
        settings.currency = 'MGA';
    } catch(e) { console.warn('Erreur chargement données'); }
}

// ==================== TOASTS ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`.nav-link[data-page="${page}"]`).classList.add('active');

    const titles = {
        dashboard: 'Tableau de bord',
        transactions: 'Transactions',
        add: 'Nouvelle Transaction',
        budgets: 'Budgets',
        reports: 'Rapports',
        settings: 'Paramètres'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    paginationPage = 1;
    if (page === 'dashboard')    renderDashboard();
    if (page === 'transactions') renderTransactionsList();
    if (page === 'add')          initAddForm();
    if (page === 'budgets')      renderBudgets();
    if (page === 'reports')      renderReports();
    if (page === 'settings')     initSettings();

    closeSidebar();
}

function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    let totalIncome = 0, totalExpense = 0, monthCount = 0;
    const currentMonth = getCurrentMonth();

    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
        if (getMonthKey(t.date) === currentMonth) monthCount++;
    });

    const balance = totalIncome - totalExpense;

    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('monthTransactionCount').textContent = monthCount;

    const balanceTrend = document.getElementById('balanceTrend');
    if (transactions.length === 0) {
        balanceTrend.className = 'card-trend positive';
        balanceTrend.innerHTML = '<i class="fas fa-check"></i> Aucune donnée';
    } else if (balance >= 0) {
        balanceTrend.className = 'card-trend positive';
        balanceTrend.innerHTML = '<i class="fas fa-arrow-up"></i> Positif';
    } else {
        balanceTrend.className = 'card-trend negative';
        balanceTrend.innerHTML = '<i class="fas fa-arrow-down"></i> Négatif';
    }

    renderRecentTransactions();
    renderLineChart();
    renderDoughnutChart();
}

function renderRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

    if (recent.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h4>Aucune transaction</h4><p>Ajoutez votre première transaction</p></div>`;
        return;
    }

    let html = '';
    recent.forEach(t => {
        const cat = getCategoryInfo(t.category);
        const sign = t.type === 'income' ? '+' : '-';
        html += `
        <div class="transaction-item">
            <div class="trans-icon ${t.type}"><i class="${cat.icon}"></i></div>
            <div class="trans-details">
                <div class="trans-name">${escHtml(t.description)}</div>
                <div class="trans-category">${cat.name}</div>
            </div>
            <div class="trans-date">${formatDate(t.date)}</div>
            <div class="trans-amount ${t.type}">${sign} ${formatCurrency(t.amount)}</div>
            <div class="trans-actions">
                <button onclick="editTransaction('${t.id}')" title="Modifier"><i class="fas fa-pen"></i></button>
                <button class="delete-btn" onclick="deleteTransaction('${t.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==================== CHARTS ====================
function destroyChart(key) {
    if (chartInstances[key]) {
        chartInstances[key].destroy();
        delete chartInstances[key];
    }
}

function renderLineChart() {
    destroyChart('line');
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    const months = [];
    const incomeData = [];
    const expenseData = [];

    // Générer les 6 derniers mois
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        months.push(label);

        const inc = transactions.filter(t => t.type === 'income' && getMonthKey(t.date) === key).reduce((s, t) => s + t.amount, 0);
        const exp = transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === key).reduce((s, t) => s + t.amount, 0);
        incomeData.push(inc);
        expenseData.push(exp);
    }

    chartInstances['line'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Revenus (Ar)', data: incomeData, borderColor: '#00B894', backgroundColor: 'rgba(0,184,148,0.1)', fill: true, tension: 0.4, pointRadius: 4 },
                { label: 'Dépenses (Ar)', data: expenseData, borderColor: '#E17055', backgroundColor: 'rgba(225,112,85,0.1)', fill: true, tension: 0.4, pointRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw) } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('fr-FR') + ' Ar' } } }
        }
    });
}

function renderDoughnutChart() {
    destroyChart('doughnut');
    const ctx = document.getElementById('doughnutChart');
    if (!ctx) return;

    const currentMonth = getCurrentMonth();
    const monthExpenses = transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === currentMonth);

    const byCategory = {};
    monthExpenses.forEach(t => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(byCategory).map(k => getCategoryInfo(k).name);
    const data   = Object.values(byCategory);
    const colors = Object.keys(byCategory).map(k => getCategoryInfo(k).color);

    if (data.length === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><h4>Aucune dépense ce mois</h4></div>';
        return;
    }

    chartInstances['doughnut'] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2 }] },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + formatCurrency(ctx.raw) } }
            }
        }
    });
}

// ==================== TRANSACTIONS LIST ====================
function renderTransactionsList() {
    const filterType = document.getElementById('filterType').value;
    const filterCat  = document.getElementById('filterCategory').value;
    const filterMon  = document.getElementById('filterMonth').value;
    const search     = (document.getElementById('searchInput').value || '').toLowerCase();

    let filtered = [...transactions];
    if (filterType !== 'all') filtered = filtered.filter(t => t.type === filterType);
    if (filterCat  !== 'all') filtered = filtered.filter(t => t.category === filterCat);
    if (filterMon)             filtered = filtered.filter(t => getMonthKey(t.date) === filterMon);
    if (search)                filtered = filtered.filter(t => t.description.toLowerCase().includes(search) || getCategoryInfo(t.category).name.toLowerCase().includes(search));

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = filtered.length;
    const totalPages = Math.ceil(total / PER_PAGE) || 1;
    if (paginationPage > totalPages) paginationPage = 1;

    const start  = (paginationPage - 1) * PER_PAGE;
    const paged  = filtered.slice(start, start + PER_PAGE);

    document.getElementById('transactionCount').textContent = `${total} transaction${total !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('transactionsBody');
    if (paged.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-search"></i><h4>Aucun résultat</h4><p>Modifiez vos filtres</p></div></td></tr>`;
    } else {
        tbody.innerHTML = paged.map(t => {
            const cat  = getCategoryInfo(t.category);
            const sign = t.type === 'income' ? '+' : '-';
            const amtClass = t.type === 'income' ? 'color:var(--success);font-weight:700' : 'color:var(--danger);font-weight:700';
            return `<tr>
                <td>${formatDate(t.date)}</td>
                <td>${escHtml(t.description)}</td>
                <td><span style="display:inline-flex;align-items:center;gap:5px"><i class="${cat.icon}" style="color:${cat.color}"></i>${cat.name}</span></td>
                <td><span class="type-badge ${t.type}">${t.type === 'income' ? 'Revenu' : 'Dépense'}</span></td>
                <td style="${amtClass}">${sign} ${formatCurrency(t.amount)}</td>
                <td>
                    <div style="display:flex;gap:6px">
                        <button onclick="editTransaction('${t.id}')" style="background:none;border:none;cursor:pointer;color:var(--primary)" title="Modifier"><i class="fas fa-pen"></i></button>
                        <button onclick="deleteTransaction('${t.id}')" style="background:none;border:none;cursor:pointer;color:var(--danger)" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // Pagination
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === paginationPage) btn.classList.add('active');
        btn.addEventListener('click', () => { paginationPage = i; renderTransactionsList(); });
        paginationEl.appendChild(btn);
    }

    // Remplir filtre catégorie
    populateCategoryFilter();
}

function populateCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    const current = sel.value;
    const usedCats = [...new Set(transactions.map(t => t.category))];
    sel.innerHTML = '<option value="all">Toutes catégories</option>';
    usedCats.forEach(cId => {
        const cat = getCategoryInfo(cId);
        const opt = document.createElement('option');
        opt.value = cId;
        opt.textContent = cat.name;
        sel.appendChild(opt);
    });
    sel.value = current;
}

// ==================== ADD FORM ====================
function initAddForm() {
    currentType = 'expense';
    currentCategory = '';
    document.getElementById('transType').value = 'expense';
    document.getElementById('transDate').value  = new Date().toISOString().split('T')[0];
    document.getElementById('transAmount').value      = '';
    document.getElementById('transDescription').value = '';
    document.getElementById('transNote').value         = '';
    document.getElementById('transCategory').value     = '';
    document.getElementById('toggleExpense').classList.add('active');
    document.getElementById('toggleIncome').classList.remove('active');
    renderCategoryGrid();
}

function renderCategoryGrid() {
    const grid = document.getElementById('categoryGrid');
    const cats = CATEGORIES[currentType];
    grid.innerHTML = cats.map(cat => `
        <div class="category-item ${currentCategory === cat.id ? 'selected' : ''}" data-cat="${cat.id}">
            <i class="${cat.icon}" style="color:${cat.color}"></i>
            <span>${cat.name}</span>
        </div>`).join('');

    grid.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            grid.querySelectorAll('.category-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            currentCategory = item.dataset.cat;
            document.getElementById('transCategory').value = currentCategory;
        });
    });
}

// ==================== CRUD ====================
function addTransaction(data) {
    transactions.push({
        id: generateId(),
        type: data.type,
        amount: parseFloat(data.amount),
        date: data.date,
        description: data.description.trim(),
        category: data.category,
        note: (data.note || '').trim(),
        createdAt: new Date().toISOString()
    });
    saveData();
    showToast('Transaction enregistrée avec succès !');
}

function updateTransaction(id, newData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions[index] = { ...transactions[index], ...newData };
        saveData();
        showToast('Transaction modifiée');
    }
}

function deleteTransaction(id) {
    if (!confirm('Voulez-vous vraiment supprimer cette transaction ?')) return;
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    showToast('Transaction supprimée', 'info');
    if (currentPage === 'dashboard')    renderDashboard();
    if (currentPage === 'transactions') renderTransactionsList();
}

function editTransaction(id) {
    const trans = transactions.find(t => t.id === id);
    if (!trans) return;

    document.getElementById('editId').value          = trans.id;
    document.getElementById('editAmount').value      = trans.amount;
    document.getElementById('editDate').value        = trans.date;
    document.getElementById('editDescription').value = trans.description;
    document.getElementById('editType').value        = trans.type;

    const editCatSel = document.getElementById('editCategory');
    editCatSel.innerHTML = '';
    CATEGORIES[trans.type].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        editCatSel.appendChild(opt);
    });
    editCatSel.value = trans.category;

    document.getElementById('editModal').classList.add('active');
}

// ==================== BUDGETS ====================
function renderBudgets() {
    const grid = document.getElementById('budgetsGrid');
    if (budgets.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-bullseye"></i><h4>Aucun budget défini</h4><p>Créez un budget pour suivre vos dépenses</p></div>`;
        return;
    }

    const currentMonth = getCurrentMonth();
    grid.innerHTML = budgets.map(b => {
        const cat   = getCategoryInfo(b.category);
        const spent = transactions.filter(t => t.type === 'expense' && t.category === b.category && getMonthKey(t.date) === currentMonth).reduce((s, t) => s + t.amount, 0);
        const pct   = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
        const cls   = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'safe';

        return `<div class="budget-card">
            <div class="budget-header">
                <div class="budget-cat">
                    <div class="budget-cat-icon" style="background:${cat.color}22;color:${cat.color}"><i class="${cat.icon}"></i></div>
                    <span class="budget-cat-name">${cat.name}</span>
                </div>
                <div class="budget-actions">
                    <button class="budget-action-btn" onclick="openEditBudget('${b.id}')" title="Modifier"><i class="fas fa-pen"></i></button>
                    <button class="budget-action-btn delete" onclick="deleteBudget('${b.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="budget-amounts">
                <span class="budget-spent" style="color:${cls === 'danger' ? 'var(--danger)' : cls === 'warning' ? 'var(--warning)' : 'var(--text-primary)'}">
                    ${formatCurrency(spent)}
                </span>
                <span class="budget-limit">/ ${formatCurrency(b.amount)}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
            <div class="budget-percentage">${pct.toFixed(0)}% utilisé</div>
        </div>`;
    }).join('');
}

function openAddBudget() {
    document.getElementById('editBudgetId').value = '';
    document.getElementById('budgetAmount').value = '';
    document.getElementById('budgetModalTitle').textContent = 'Nouveau budget';

    const sel = document.getElementById('budgetCategory');
    sel.innerHTML = '';
    const existingCats = budgets.map(b => b.category);
    CATEGORIES.expense.forEach(cat => {
        if (!existingCats.includes(cat.id)) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            sel.appendChild(opt);
        }
    });

    if (sel.options.length === 0) {
        showToast('Tous les budgets de catégories sont déjà définis', 'info');
        return;
    }
    document.getElementById('budgetModal').classList.add('active');
}

function openEditBudget(id) {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;
    document.getElementById('editBudgetId').value = id;
    document.getElementById('budgetAmount').value = budget.amount;
    document.getElementById('budgetModalTitle').textContent = 'Modifier le budget';

    const sel = document.getElementById('budgetCategory');
    sel.innerHTML = '';
    const cat = getCategoryInfo(budget.category);
    const opt = document.createElement('option');
    opt.value = budget.category;
    opt.textContent = cat.name;
    sel.appendChild(opt);

    document.getElementById('budgetModal').classList.add('active');
}

function deleteBudget(id) {
    if (!confirm('Supprimer ce budget ?')) return;
    budgets = budgets.filter(b => b.id !== id);
    saveData();
    showToast('Budget supprimé', 'info');
    renderBudgets();
}

// ==================== REPORTS ====================
function renderReports() {
    renderBarChart();
    renderTopExpenses();
    renderPieChart();
}

function renderBarChart() {
    destroyChart('bar');
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    const byCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(([k]) => getCategoryInfo(k).name);
    const data   = sorted.map(([, v]) => v);
    const colors = sorted.map(([k]) => getCategoryInfo(k).color);

    if (data.length === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><h4>Aucune dépense enregistrée</h4></div>';
        return;
    }

    chartInstances['bar'] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Dépenses (Ar)', data, backgroundColor: colors, borderRadius: 6 }] },
        options: {
            responsive: true,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatCurrency(ctx.raw) } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('fr-FR') + ' Ar' } } }
        }
    });
}

function renderTopExpenses() {
    const container = document.getElementById('topExpenses');
    const top5 = [...transactions].filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><h4>Aucune dépense</h4></div>';
        return;
    }

    container.innerHTML = top5.map((t, i) => {
        const cat = getCategoryInfo(t.category);
        return `<div class="top-expense-item">
            <div class="top-expense-rank">${i + 1}</div>
            <div class="top-expense-info">
                <div class="top-expense-name">${escHtml(t.description)}</div>
                <div class="top-expense-category">${cat.name} · ${formatDate(t.date)}</div>
            </div>
            <div class="top-expense-amount">- ${formatCurrency(t.amount)}</div>
        </div>`;
    }).join('');
}

function renderPieChart() {
    destroyChart('pie');
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;

    const byType = {
        income:  transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    };

    if (byType.income === 0 && byType.expense === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-percentage"></i><h4>Aucune donnée</h4></div>';
        return;
    }

    chartInstances['pie'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Revenus', 'Dépenses'],
            datasets: [{ data: [byType.income, byType.expense], backgroundColor: ['#00B894', '#E17055'], borderWidth: 2 }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + formatCurrency(ctx.raw) } }
            }
        }
    });
}

// ==================== SETTINGS ====================
function initSettings() {
    document.getElementById('userName').value      = settings.userName;
    document.getElementById('userEmail').value     = settings.userEmail;
    document.getElementById('userCurrency').value  = 'MGA';
    document.getElementById('monthlyIncome').value = settings.monthlyIncome || '';
}

function updateSidebarUser() {
    const initials = settings.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.getElementById('userAvatarSidebar').textContent = initials;
    document.getElementById('userNameSidebar').textContent   = settings.userName;
    document.getElementById('userEmailSidebar').textContent  = settings.userEmail;
}

// ==================== DEMO DATA ====================
function loadDemoData() {
    transactions = [
        { id: generateId(), type: 'income',  amount: 2500000, date: '2025-06-28', description: 'Salaire juin',         category: 'salary',        note: '' },
        { id: generateId(), type: 'income',  amount: 600000,  date: '2025-06-15', description: 'Freelance web',        category: 'freelance',     note: '' },
        { id: generateId(), type: 'expense', amount: 800000,  date: '2025-06-01', description: 'Loyer juin',            category: 'housing',       note: '' },
        { id: generateId(), type: 'expense', amount: 250000,  date: '2025-06-05', description: 'Courses au marché',     category: 'food',          note: '' },
        { id: generateId(), type: 'expense', amount: 180000,  date: '2025-06-08', description: 'Facture Jirama',        category: 'bills',         note: '' },
        { id: generateId(), type: 'expense', amount: 45000,   date: '2025-06-10', description: 'Taxi Antananarivo',     category: 'transport',     note: '' },
        { id: generateId(), type: 'expense', amount: 120000,  date: '2025-06-12', description: 'Restaurant Colbert',    category: 'restaurant',    note: '' },
        { id: generateId(), type: 'expense', amount: 75000,   date: '2025-06-14', description: 'Pharmacie',             category: 'health',        note: '' },
        { id: generateId(), type: 'income',  amount: 300000,  date: '2025-05-30', description: 'Remboursement ami',     category: 'refund',        note: '' },
        { id: generateId(), type: 'expense', amount: 350000,  date: '2025-05-20', description: 'Vêtements boutique',    category: 'clothing',      note: '' },
        { id: generateId(), type: 'expense', amount: 50000,   date: '2025-05-18', description: 'Netflix + Canal+',      category: 'subscriptions', note: '' },
        { id: generateId(), type: 'income',  amount: 2500000, date: '2025-05-28', description: 'Salaire mai',           category: 'salary',        note: '' },
        { id: generateId(), type: 'expense', amount: 800000,  date: '2025-05-01', description: 'Loyer mai',             category: 'housing',       note: '' },
        { id: generateId(), type: 'expense', amount: 200000,  date: '2025-05-10', description: 'Épicerie Shoprite',     category: 'food',          note: '' },
    ];

    budgets = [
        { id: generateId(), category: 'food',      amount: 600000  },
        { id: generateId(), category: 'housing',   amount: 900000  },
        { id: generateId(), category: 'transport', amount: 200000  },
        { id: generateId(), category: 'bills',     amount: 300000  },
        { id: generateId(), category: 'health',    amount: 200000  },
    ];

    saveData();
    showToast('Données de démonstration chargées ! 🇲🇬', 'success');
    navigateTo('dashboard');
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Appliquer le thème sauvegardé
    if (settings.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeIcon').className = 'fas fa-sun';
    }

    updateSidebarUser();

    // Navigation sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.page); });
    });

    // Sidebar mobile
    document.getElementById('menuBtn').addEventListener('click', openSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    // Voir tout
    document.getElementById('viewAllTransactions').addEventListener('click', e => { e.preventDefault(); navigateTo('transactions'); });

    // Thème
    document.getElementById('themeToggle').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            settings.theme = 'light';
            document.getElementById('themeIcon').className = 'fas fa-moon';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            settings.theme = 'dark';
            document.getElementById('themeIcon').className = 'fas fa-sun';
        }
        saveData();
    });

    // Toggle dépense / revenu
    document.getElementById('toggleExpense').addEventListener('click', () => {
        currentType = 'expense';
        document.getElementById('transType').value = 'expense';
        document.getElementById('toggleExpense').classList.add('active');
        document.getElementById('toggleIncome').classList.remove('active');
        currentCategory = '';
        renderCategoryGrid();
    });
    document.getElementById('toggleIncome').addEventListener('click', () => {
        currentType = 'income';
        document.getElementById('transType').value = 'income';
        document.getElementById('toggleIncome').classList.add('active');
        document.getElementById('toggleExpense').classList.remove('active');
        currentCategory = '';
        renderCategoryGrid();
    });

    // Formulaire ajout transaction
    document.getElementById('transactionForm').addEventListener('submit', e => {
        e.preventDefault();
        const amount      = document.getElementById('transAmount').value;
        const date        = document.getElementById('transDate').value;
        const description = document.getElementById('transDescription').value.trim();
        const category    = document.getElementById('transCategory').value;
        const note        = document.getElementById('transNote').value.trim();

        if (!amount || parseFloat(amount) <= 0) { showToast('Montant invalide', 'error'); return; }
        if (!date)        { showToast('Veuillez choisir une date', 'error'); return; }
        if (!description) { showToast('Veuillez saisir une description', 'error'); return; }
        if (!category)    { showToast('Veuillez choisir une catégorie', 'error'); return; }

        addTransaction({ type: currentType, amount, date, description, category, note });
        document.getElementById('transactionForm').reset();
        initAddForm();
    });

    document.getElementById('resetFormBtn').addEventListener('click', e => { e.preventDefault(); initAddForm(); });

    // Filtres transactions
    ['filterType', 'filterCategory', 'filterMonth'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => { paginationPage = 1; renderTransactionsList(); });
    });
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('filterType').value     = 'all';
        document.getElementById('filterCategory').value = 'all';
        document.getElementById('filterMonth').value    = '';
        paginationPage = 1;
        renderTransactionsList();
    });

    // Recherche
    document.getElementById('searchInput').addEventListener('input', () => { paginationPage = 1; if (currentPage === 'transactions') renderTransactionsList(); });

    // Bouton ajouter dans transactions
    document.getElementById('addTransBtn').addEventListener('click', () => navigateTo('add'));

    // Modal Edit Transaction
    document.getElementById('editForm').addEventListener('submit', e => {
        e.preventDefault();
        const id   = document.getElementById('editId').value;
        const type = document.getElementById('editType').value;

        // Recalculer catégorie disponible si le type change
        const cat = document.getElementById('editCategory').value;

        updateTransaction(id, {
            amount:      parseFloat(document.getElementById('editAmount').value),
            date:        document.getElementById('editDate').value,
            description: document.getElementById('editDescription').value.trim(),
            type,
            category:    cat
        });
        document.getElementById('editModal').classList.remove('active');
        if (currentPage === 'dashboard')    renderDashboard();
        if (currentPage === 'transactions') renderTransactionsList();
    });

    // Mise à jour des catégories dans edit modal quand le type change
    document.getElementById('editType').addEventListener('change', function() {
        const type = this.value;
        const sel  = document.getElementById('editCategory');
        sel.innerHTML = '';
        CATEGORIES[type].forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id; opt.textContent = cat.name;
            sel.appendChild(opt);
        });
    });

    document.getElementById('closeEditModal').addEventListener('click',  () => document.getElementById('editModal').classList.remove('active'));
    document.getElementById('cancelEditBtn').addEventListener('click',   () => document.getElementById('editModal').classList.remove('active'));

    // Budgets
    document.getElementById('addBudgetBtn').addEventListener('click', openAddBudget);
    document.getElementById('closeBudgetModal').addEventListener('click',  () => document.getElementById('budgetModal').classList.remove('active'));
    document.getElementById('cancelBudgetBtn').addEventListener('click',   () => document.getElementById('budgetModal').classList.remove('active'));

    document.getElementById('budgetForm').addEventListener('submit', e => {
        e.preventDefault();
        const editId  = document.getElementById('editBudgetId').value;
        const catId   = document.getElementById('budgetCategory').value;
        const amount  = parseFloat(document.getElementById('budgetAmount').value);

        if (!amount || amount <= 0) { showToast('Montant invalide', 'error'); return; }

        if (editId) {
            const idx = budgets.findIndex(b => b.id === editId);
            if (idx !== -1) { budgets[idx].amount = amount; }
        } else {
            if (budgets.find(b => b.category === catId)) { showToast('Budget déjà existant pour cette catégorie', 'error'); return; }
            budgets.push({ id: generateId(), category: catId, amount });
        }
        saveData();
        document.getElementById('budgetModal').classList.remove('active');
        showToast('Budget enregistré');
        renderBudgets();
    });

    // Profil
    document.getElementById('profileForm').addEventListener('submit', e => {
        e.preventDefault();
        settings.userName     = document.getElementById('userName').value.trim() || settings.userName;
        settings.userEmail    = document.getElementById('userEmail').value.trim() || settings.userEmail;
        settings.currency     = 'MGA'; // toujours MGA
        settings.monthlyIncome = parseFloat(document.getElementById('monthlyIncome').value) || 0;
        saveData();
        updateSidebarUser();
        showToast('Profil sauvegardé');
    });

    // Export JSON
    document.getElementById('exportBtn').addEventListener('click', () => {
        const data = { transactions, budgets, settings };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `moneymanager_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Export réussi');
    });

    // Import JSON
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.transactions) transactions = data.transactions;
                if (data.budgets)      budgets      = data.budgets;
                if (data.settings)     settings     = { ...settings, ...data.settings, currency: 'MGA' };
                saveData();
                updateSidebarUser();
                showToast('Import réussi !');
                navigateTo('dashboard');
            } catch {
                showToast('Fichier invalide', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Reset tout
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (!confirm('Supprimer TOUTES les données ? Cette action est irréversible.')) return;
        transactions = [];
        budgets = [];
        settings = { currency: 'MGA', theme: settings.theme, userName: 'Jean Dupont', userEmail: 'jean@email.com', monthlyIncome: 0 };
        saveData();
        updateSidebarUser();
        showToast('Toutes les données supprimées', 'info');
        navigateTo('dashboard');
    });

    // Démo
    document.getElementById('loadDemoBtn').addEventListener('click', () => {
        if (confirm('Charger les données de démonstration en Ariary ? Les données actuelles seront remplacées.')) loadDemoData();
    });

    // Démarrage : si aucune donnée, partir sur dashboard vide
    navigateTo('dashboard');
});
