document.addEventListener('DOMContentLoaded', () => {
  const categoryButtons = document.querySelectorAll('[data-filter-category]');
  const productCards = document.querySelectorAll('[data-product-card]');
  const searchInput = document.querySelector('#product-search');

  const normalize = (value) => (value || '').toLowerCase().trim();

  const applyFilters = () => {
    const activeButton = document.querySelector('[data-filter-category].active');
    const category = activeButton ? normalize(activeButton.dataset.filterCategory) : 'all';
    const term = normalize(searchInput ? searchInput.value : '');

    productCards.forEach((card) => {
      const cardCategory = normalize(card.dataset.category);
      const cardName = normalize(card.dataset.name);
      const matchesCategory = category === 'all' || category === cardCategory;
      const matchesSearch = !term || cardName.includes(term);
      card.style.display = matchesCategory && matchesSearch ? '' : 'none';
    });
  };

  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  applyFilters();
});
