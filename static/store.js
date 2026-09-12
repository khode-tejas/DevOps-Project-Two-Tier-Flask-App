/* TejasMart is a static shopping demo. The cart stays in this browser only. */
'use strict';

const products = JSON.parse(document.getElementById('catalog-data').textContent);
const byId = new Map(products.map(product => [product.id, product]));
const cards = new Map([...document.querySelectorAll('[data-product-id]')].map(card => [card.dataset.productId, card]));
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sprite = document.querySelector('.product-image use').getAttribute('href').split('#')[0];
const cartDialog = document.getElementById('cart-dialog');
let category = 'All';
let dealsOnly = false;
let cart = {};
let toastTimer;

try {
    const saved = JSON.parse(localStorage.getItem('tejasmart-cart') || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const [id, quantity] of Object.entries(saved)) {
            if (byId.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) cart[id] = quantity;
        }
    }
} catch (_) { /* Browsing still works when storage is unavailable. */ }

function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('visible'), 2600);
}

function scrollToCatalog() {
    document.getElementById('catalog').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

function filterProducts() {
    const query = document.getElementById('search').value.trim().toLowerCase();
    let visible = products.filter(product =>
        (category === 'All' || product.category === category) &&
        (!dealsOnly || product.original_price > product.price) &&
        `${product.name} ${product.category}`.toLowerCase().includes(query));
    const sort = document.getElementById('sort').value;
    if (sort === 'low') visible.sort((a, b) => a.price - b.price);
    if (sort === 'high') visible.sort((a, b) => b.price - a.price);
    if (sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name));
    const ids = new Set(visible.map(product => product.id));
    for (const [id, card] of cards) card.hidden = !ids.has(id);
    for (const product of visible) document.getElementById('product-grid').append(cards.get(product.id));
    document.getElementById('empty-products').hidden = visible.length > 0;
    const filterLabel = dealsOnly ? ' deals' : category !== 'All' ? ` in ${category}` : '';
    document.getElementById('results-status').textContent = `${visible.length} ${visible.length === 1 ? 'find' : 'finds'}${filterLabel}${query ? ` for “${query}”` : ''}`;
    for (const button of document.querySelectorAll('[data-category]')) {
        const active = button.dataset.category === category && !dealsOnly;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    }
    document.getElementById('deals-toggle').classList.toggle('active', dealsOnly);
    document.getElementById('deals-toggle').setAttribute('aria-pressed', String(dealsOnly));
}

function updateCart() {
    const entries = Object.entries(cart);
    const count = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
    const total = entries.reduce((sum, [id, quantity]) => sum + byId.get(id).price * quantity, 0);
    document.getElementById('cart-count').textContent = count;
    document.getElementById('drawer-count').textContent = count;
    document.getElementById('cart-open').setAttribute('aria-label', `Open cart, ${count} ${count === 1 ? 'item' : 'items'}`);
    document.getElementById('cart-total').textContent = money(total);
    document.getElementById('cart-summary').hidden = count === 0;
    document.getElementById('checkout-button').disabled = count === 0;
    const container = document.getElementById('cart-items');
    container.innerHTML = entries.map(([id, quantity]) => {
        const product = byId.get(id);
        const name = escapeHtml(product.name);
        return `<article class="cart-item"><div class="cart-item-image ${product.color}"><svg aria-hidden="true"><use href="${sprite}#${id}"/></svg></div><div><h3>${name}</h3><p class="cart-item-price">${money(product.price * quantity)}</p><div class="cart-item-controls"><div class="quantity-control"><button data-quantity="${id}" data-change="-1" aria-label="Decrease ${name} quantity" ${quantity === 1 ? 'disabled' : ''}>−</button><span aria-label="Quantity">${quantity}</span><button data-quantity="${id}" data-change="1" aria-label="Increase ${name} quantity" ${quantity === 99 ? 'disabled' : ''}>+</button></div><button class="remove-button" data-remove="${id}" aria-label="Remove ${name}">Remove</button></div></div></article>`;
    }).join('');
    if (!count) container.innerHTML = '<div class="cart-empty"><svg class="icon" aria-hidden="true"><use href="#i-bag"/></svg><h3>A little room for something good.</h3><p>Your cart is empty. Find your first everyday favorite.</p><button class="button button-dark" data-close="cart-dialog">Explore the collection ↗</button></div>';
    try { localStorage.setItem('tejasmart-cart', JSON.stringify(cart)); } catch (_) { /* In-memory cart remains usable. */ }
}

document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.add && byId.has(button.dataset.add)) {
        const id = button.dataset.add;
        if ((cart[id] || 0) >= 99) return toast('You can add up to 99 of each item.');
        cart[id] = (cart[id] || 0) + 1;
        updateCart();
        toast(`${byId.get(id).name} added to your cart`);
    }
    if (button.dataset.category) {
        category = button.dataset.category;
        dealsOnly = false;
        filterProducts();
        scrollToCatalog();
    }
    if (button.dataset.close) document.getElementById(button.dataset.close).close();
    if (button.dataset.remove) {
        delete cart[button.dataset.remove];
        updateCart();
        const focusTarget = document.querySelector('#cart-items button:not(:disabled)') || document.querySelector('[data-close="cart-dialog"]');
        focusTarget.focus();
    }
    if (button.dataset.quantity && byId.has(button.dataset.quantity) && cart[button.dataset.quantity]) {
        const id = button.dataset.quantity;
        cart[id] = Math.min(99, Math.max(1, cart[id] + Number(button.dataset.change)));
        const change = button.dataset.change;
        updateCart();
        const target = document.querySelector(`[data-quantity="${id}"][data-change="${change}"]:not(:disabled)`) || document.querySelector(`[data-quantity="${id}"]:not(:disabled)`);
        if (target) target.focus();
    }
});

document.getElementById('search').addEventListener('input', filterProducts);
document.getElementById('search-form').addEventListener('submit', event => { event.preventDefault(); filterProducts(); scrollToCatalog(); });
document.getElementById('sort').addEventListener('change', filterProducts);
document.getElementById('deals-toggle').addEventListener('click', () => { dealsOnly = !dealsOnly; category = 'All'; filterProducts(); scrollToCatalog(); });
document.getElementById('reset-filters').addEventListener('click', () => { category = 'All'; dealsOnly = false; document.getElementById('search').value = ''; document.getElementById('sort').value = 'featured'; filterProducts(); });
document.getElementById('cart-open').addEventListener('click', () => { updateCart(); cartDialog.showModal(); });
document.getElementById('checkout-button').addEventListener('click', () => {
    const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
    if (!count) return;
    document.getElementById('checkout-description').textContent = `You explored ${count} ${count === 1 ? 'item' : 'items'} totaling ${document.getElementById('cart-total').textContent}. Your demo cart is now clear.`;
    cart = {};
    updateCart();
    cartDialog.close();
    document.getElementById('checkout-dialog').showModal();
});
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
filterProducts();
updateCart();
