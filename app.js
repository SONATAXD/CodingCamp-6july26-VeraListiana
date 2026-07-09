/* ===========================================================
   Ledger — Expense & Budget Visualizer
   Vanilla JS. Data persists in localStorage only.
   =========================================================== */

(function () {
  'use strict';

  // ---------- Storage keys ----------
  const STORAGE_KEY = 'ledger_transactions';
  const CATEGORY_KEY = 'ledger_categories';
  const THEME_KEY = 'ledger_theme';

  // ---------- Default categories & colors ----------
  const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
  const CATEGORY_COLORS = {
    Food: '#d9782f',
    Transport: '#2f6fa8',
    Fun: '#a34fbf'
  };
  const EXTRA_COLOR_POOL = ['#6b7280', '#c9a227', '#3f9a5c', '#b3446c', '#4477aa', '#aa4499'];

  // ---------- DOM references ----------
  const form = document.getElementById('expenseForm');
  const itemNameInput = document.getElementById('itemName');
  const amountInput = document.getElementById('amount');
  const categorySelect = document.getElementById('category');
  const addCategoryToggle = document.getElementById('addCategoryToggle');
  const customCategoryField = document.getElementById('customCategoryField');
  const customCategoryInput = document.getElementById('customCategory');
  const formError = document.getElementById('formError');

  const totalBalanceEl = document.getElementById('totalBalance');
  const transactionListEl = document.getElementById('transactionList');
  const emptyStateEl = document.getElementById('emptyState');
  const sortSelect = document.getElementById('sortSelect');

  const chartCanvas = document.getElementById('categoryChart');
  const chartEmptyState = document.getElementById('chartEmptyState');
  const chartLegendEl = document.getElementById('chartLegend');

  const themeToggle = document.getElementById('themeToggle');

  let chartInstance = null;

  // ---------- State ----------
  let transactions = loadTransactions();
  let categories = loadCategories();

  // ===========================================================
  // Persistence helpers
  // ===========================================================
  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load transactions', e);
      return [];
    }
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  function loadCategories() {
    try {
      const raw = localStorage.getItem(CATEGORY_KEY);
      const custom = raw ? JSON.parse(raw) : [];
      return [...DEFAULT_CATEGORIES, ...custom.filter(c => !DEFAULT_CATEGORIES.includes(c))];
    } catch (e) {
      return [...DEFAULT_CATEGORIES];
    }
  }

  function saveCategories() {
    const custom = categories.filter(c => !DEFAULT_CATEGORIES.includes(c));
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(custom));
  }

  // ===========================================================
  // Category colors (stable per category name)
  // ===========================================================
  function colorFor(category) {
    if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
    // deterministic pick from pool based on string hash
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
    return EXTRA_COLOR_POOL[hash % EXTRA_COLOR_POOL.length];
  }

  // ===========================================================
  // Rendering: category <select>
  // ===========================================================
  function renderCategoryOptions() {
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  // ===========================================================
  // Formatting
  // ===========================================================
  function formatRupiah(value) {
    return 'Rp ' + Math.round(value).toLocaleString('id-ID');
  }

  // ===========================================================
  // Rendering: transaction list
  // ===========================================================
  function getSortedTransactions() {
    const list = [...transactions];
    const mode = sortSelect.value;

    if (mode === 'amount-desc') list.sort((a, b) => b.amount - a.amount);
    else if (mode === 'amount-asc') list.sort((a, b) => a.amount - b.amount);
    else if (mode === 'category') list.sort((a, b) => a.category.localeCompare(b.category));
    else list.sort((a, b) => b.createdAt - a.createdAt); // newest first

    return list;
  }

  function renderTransactionList() {
    const list = getSortedTransactions();
    transactionListEl.innerHTML = '';

    emptyStateEl.hidden = list.length !== 0;

    list.forEach(tx => {
      const li = document.createElement('li');
      li.className = 'tx-item';
      li.dataset.id = tx.id;

      const info = document.createElement('div');
      info.className = 'tx-item__info';

      const name = document.createElement('div');
      name.className = 'tx-item__name';
      name.textContent = tx.name;

      const tag = document.createElement('span');
      tag.className = 'tx-item__category';
      tag.textContent = tx.category;
      tag.style.backgroundColor = colorFor(tx.category);

      info.appendChild(name);
      info.appendChild(tag);

      const amount = document.createElement('div');
      amount.className = 'tx-item__amount';
      amount.textContent = formatRupiah(tx.amount);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tx-item__delete';
      deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => deleteTransaction(tx.id));

      li.appendChild(info);
      li.appendChild(amount);
      li.appendChild(deleteBtn);
      transactionListEl.appendChild(li);
    });
  }

  // ===========================================================
  // Rendering: total balance
  // ===========================================================
  function renderTotalBalance() {
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    totalBalanceEl.textContent = formatRupiah(total);
  }

  // ===========================================================
  // Rendering: pie chart
  // ===========================================================
  function renderChart() {
    const totalsByCategory = {};
    transactions.forEach(tx => {
      totalsByCategory[tx.category] = (totalsByCategory[tx.category] || 0) + tx.amount;
    });

    const labels = Object.keys(totalsByCategory);
    const data = labels.map(l => totalsByCategory[l]);
    const colors = labels.map(colorFor);

    chartCanvas.hidden = labels.length === 0;
    chartEmptyState.hidden = labels.length !== 0;
    chartLegendEl.innerHTML = '';

    if (labels.length === 0) {
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      return;
    }

    labels.forEach((label, i) => {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.style.backgroundColor = colors[i];
      li.appendChild(dot);
      li.appendChild(document.createTextNode(label + ' — ' + formatRupiah(data[i])));
      chartLegendEl.appendChild(li);
    });

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = data;
      chartInstance.data.datasets[0].backgroundColor = colors;
      chartInstance.update();
      return;
    }

    chartInstance = new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: getComputedStyle(document.body).getPropertyValue('--paper-raised').trim() || '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.label + ': ' + formatRupiah(ctx.parsed)
            }
          }
        }
      }
    });
  }

  function renderAll() {
    renderTotalBalance();
    renderTransactionList();
    renderChart();
  }

  // ===========================================================
  // Actions
  // ===========================================================
  function deleteTransaction(id) {
    transactions = transactions.filter(tx => tx.id !== id);
    saveTransactions();
    renderAll();
  }

  function addTransaction({ name, amount, category }) {
    transactions.push({
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name,
      amount,
      category,
      createdAt: Date.now()
    });
    saveTransactions();
    renderAll();
  }

  // ===========================================================
  // Form handling
  // ===========================================================
  addCategoryToggle.addEventListener('click', () => {
    const isHidden = customCategoryField.hidden;
    customCategoryField.hidden = !isHidden;
    addCategoryToggle.textContent = isHidden ? '– Cancel new category' : '+ Add custom category';
    if (isHidden) customCategoryInput.focus();
    else customCategoryInput.value = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formError.textContent = '';

    const name = itemNameInput.value.trim();
    const amountRaw = amountInput.value.trim();
    const amount = Number(amountRaw);
    const usingCustomCategory = !customCategoryField.hidden;
    const customCategory = customCategoryInput.value.trim();
    const category = usingCustomCategory ? customCategory : categorySelect.value;

    if (!name || !amountRaw || !category) {
      formError.textContent = 'Please fill in every field before submitting.';
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      formError.textContent = 'Amount must be a number greater than zero.';
      return;
    }

    if (usingCustomCategory && !categories.includes(category)) {
      categories.push(category);
      saveCategories();
      renderCategoryOptions();
    }

    categorySelect.value = category;
    addTransaction({ name, amount, category });

    // reset form
    form.reset();
    customCategoryField.hidden = true;
    addCategoryToggle.textContent = '+ Add custom category';
    itemNameInput.focus();
  });

  // ===========================================================
  // Sorting
  // ===========================================================
  sortSelect.addEventListener('change', renderTransactionList);

  // ===========================================================
  // Dark / light mode
  // ===========================================================
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.querySelector('.theme-toggle__icon').textContent = theme === 'dark' ? '☀' : '☾';
    if (chartInstance) {
      chartInstance.data.datasets[0].borderColor =
        getComputedStyle(document.body).getPropertyValue('--paper-raised').trim();
      chartInstance.update();
    }
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  // ===========================================================
  // Init
  // ===========================================================
  function init() {
    const savedTheme = localStorage.getItem(THEME_KEY) ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    renderCategoryOptions();
    renderAll();
  }

  init();
})();
