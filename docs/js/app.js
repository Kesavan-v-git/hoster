const ADMIN_EMAIL = 'harishjagesh@gmail.com';

// Cart Management
let cart = JSON.parse(sessionStorage.getItem('cart')) || {};
let products = {};

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const cartSidebar = document.getElementById('cart-sidebar');
const cartButton = document.getElementById('cart-button');
const closeCartBtn = document.getElementById('close-cart');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const cartCount = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutModal = document.getElementById('checkout-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelCheckoutBtn = document.getElementById('cancel-checkout');
const checkoutForm = document.getElementById('checkout-form');
const orderSummary = document.getElementById('order-summary');
const toast = document.getElementById('toast');

// Load products from Firebase
function loadProducts() {
    const productsRef = database.ref('products');

    productsRef.on('value', (snapshot) => {
        products = snapshot.val() || {};
        displayProducts();
        updateCartUI();
    }, (error) => {
        console.error('Error loading products:', error);
        showToast('Error loading products. Please refresh the page.', 'error');
    });
}

// Display products
function displayProducts() {
    if (Object.keys(products).length === 0) {
        productsGrid.innerHTML = '<div class="loading">No products available at the moment.</div>';
        return;
    }

    productsGrid.innerHTML = '';

    Object.keys(products).forEach(productId => {
        const product = products[productId];
        const productCard = createProductCard(productId, product);
        productsGrid.appendChild(productCard);
    });
}

// Create product card
function createProductCard(productId, product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const isOutOfStock = product.stock <= 0;
    const stockClass = isOutOfStock ? 'stock-out' : (product.stock < 5 ? 'stock-low' : '');

    card.innerHTML = `
        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.style.display='none'">` : ''}
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
            <div class="product-stock ${stockClass}">
                ${isOutOfStock ? 'Out of Stock' : `Stock: ${product.stock} available`}
            </div>
            <div class="product-footer">
            <div class="product-price-container">
                 <span class="product-price">₹${product.price.toFixed(2)}</span>
                 ${(product.mrp && product.mrp > product.price) ? `
                    <span class="product-mrp">₹${product.mrp.toFixed(2)}</span>
                    <span class="product-discount">${product.discount}% OFF</span>
                 ` : ''}
            </div>
                <button class="btn-add-cart" 
                        onclick="addToCart('${productId}')" 
                        ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `;

    return card;
}

// Add to cart
function addToCart(productId) {
    if (!products[productId] || products[productId].stock <= 0) {
        showToast('Product is out of stock', 'error');
        return;
    }

    const currentQuantity = cart[productId] || 0;
    const product = products[productId];

    if (currentQuantity >= product.stock) {
        showToast('Maximum available stock reached for this item', 'error');
        return;
    }

    cart[productId] = currentQuantity + 1;
    saveCart();
    updateCartUI();
    showToast('Item added to cart', 'success');
}

// Remove from cart
function removeFromCart(productId) {
    delete cart[productId];
    saveCart();
    updateCartUI();
    displayProducts(); // Refresh to update add buttons
}

// Update quantity
function updateQuantity(productId, change) {
    const currentQuantity = cart[productId] || 0;
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const product = products[productId];
    if (newQuantity > product.stock) {
        showToast('Cannot exceed available stock', 'error');
        return;
    }

    cart[productId] = newQuantity;
    saveCart();
    updateCartUI();
}

// Save cart to sessionStorage
function saveCart() {
    sessionStorage.setItem('cart', JSON.stringify(cart));
}

// Update cart UI
function updateCartUI() {
    const cartItemsArray = Object.keys(cart);
    const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const total = calculateTotal();

    cartCount.textContent = totalItems;

    if (cartItemsArray.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        checkoutBtn.disabled = true;
        cartTotal.textContent = '0.00';
    } else {
        cartItems.innerHTML = cartItemsArray.map(productId => {
            const product = products[productId];
            const quantity = cart[productId];
            if (!product) return '';

            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${product.name}</div>
                        <div class="cart-item-price">₹${product.price.toFixed(2)} × ${quantity}</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" onclick="updateQuantity('${productId}', -1)">-</button>
                        <span class="item-quantity">${quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${productId}', 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart('${productId}')">Remove</button>
                    </div>
                </div>
            `;
        }).join('');

        checkoutBtn.disabled = false;
        cartTotal.textContent = total.toFixed(2);
    }
}

// Calculate cart total
function calculateTotal() {
    return Object.keys(cart).reduce((total, productId) => {
        const product = products[productId];
        const quantity = cart[productId];
        return total + (product ? product.price * quantity : 0);
    }, 0);
}

// Open checkout modal
function openCheckoutModal() {
    if (Object.keys(cart).length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    // Build order summary
    let summaryHTML = '<h3>Order Summary</h3>';
    Object.keys(cart).forEach(productId => {
        const product = products[productId];
        const quantity = cart[productId];
        if (product) {
            const itemTotal = product.price * quantity;
            summaryHTML += `
                <div class="order-summary-item">
                    <span>${product.name} × ${quantity}</span>
                    <span>₹${itemTotal.toFixed(2)}</span>
                </div>
            `;
        }
    });
    summaryHTML += `
        <div class="order-summary-item">
            <span><strong>Total</strong></span>
            <span><strong>₹${calculateTotal().toFixed(2)}</strong></span>
        </div>
    `;

    orderSummary.innerHTML = summaryHTML;
    checkoutModal.classList.add('show');
}

// Close checkout modal
function closeCheckoutModal() {
    checkoutModal.classList.remove('show');
    checkoutForm.reset();
}

// Handle checkout form submission
checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = checkoutForm.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return; // Prevent double submission if disable logic fails somehow

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Placing Order...';

    const customerName = document.getElementById('customer-name').value.trim();
    const customerEmail = document.getElementById('customer-email').value.trim();
    const customerMobile = document.getElementById('customer-mobile').value.trim();
    const hostelNo = document.getElementById('hostel-no').value.trim();

    if (!customerName || !customerEmail || !customerMobile || !hostelNo) {
        showToast('Please fill all required fields', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    // Prepare order data
    const orderItems = Object.keys(cart).map(productId => {
        const product = products[productId];
        const quantity = cart[productId];
        return {
            productId: productId,
            name: product.name,
            quantity: quantity,
            price: product.price,
            total: product.price * quantity,
        };
    });

    const orderData = {
        customerName: customerName,
        email: customerEmail,
        mobile: customerMobile,
        hostelNo: hostelNo,
        items: orderItems,
        status: "Pending",
        total: calculateTotal(),
        timestamp: Date.now()
    };

    try {
        // Update stock before saving order
        const stockUpdates = {};
        for (const productId of Object.keys(cart)) {
            const product = products[productId];
            const orderedQuantity = cart[productId];

            if (product && product.stock >= orderedQuantity) {
                const newStock = product.stock - orderedQuantity;
                stockUpdates[`products/${productId}/stock`] = newStock;
            } else {
                showToast(`Insufficient stock for ${product?.name || 'product'}. Please refresh and try again.`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }
        }

        // Save order to Firebase
        const ordersRef = database.ref('orders');
        const newOrderRef = ordersRef.push();
        await newOrderRef.set(orderData);
        const orderId = newOrderRef.key;

        // Update stock in Firebase
        if (Object.keys(stockUpdates).length > 0) {
            const updatesRef = database.ref();
            await updatesRef.update(stockUpdates);
            console.log('Stock updated successfully');
        }

        // Log order to Google Sheets
        try {
            await logOrderToGoogleSheets(orderData, orderId);
        } catch (sheetError) {
            console.error('Error logging to Google Sheets:', sheetError);
            // Don't fail the order if logging fails
        }


        // Clear cart
        cart = {};
        saveCart();
        updateCartUI();
        displayProducts(); // Refresh product display (will show updated stock)

        // Show success message
        showToast('Order placed successfully! Order ID: ' + orderId, 'success');
        showToast('Order placed successfully! Order ID: ' + orderId, 'success');
        closeCheckoutModal();

        // Button will be effectively "re-enabled" when the modal is closed and reopened (form reset)
        // But let's reset it here just in case
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;

    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Error placing order. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});


async function logOrderToGoogleSheets(orderData, orderId) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL') {
        console.warn('Google Script URL not configured');
        return;
    }

    // Format data for Google Sheet
    // Expected columns: Timestamp, Order ID, Customer Name, Mobile, Hostel, Items, Total
    const itemsString = orderData.items.map(item =>
        `${item.name} (${item.quantity})`
    ).join(', ');

    const payload = {
        action: 'logOrder',
        data: {
            timestamp: new Date(orderData.timestamp).toLocaleString(),
            orderId: orderId,
            customerName: orderData.customerName,
            email: orderData.email,
            mobile: orderData.mobile,
            hostel: orderData.hostelNo,
            items: itemsString,
            total: orderData.total,
            status: orderData.status || 'Pending'
        }
    };

    // Use no-cors mode for Google Apps Script
    // Note: We won't get a readable response in no-cors mode, but the request will go through
    await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        // mode: 'no-cors', // headers are not allowed in no-cors, so we use text/plain
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
    });

    console.log('Order sent to Google Sheet');
}

// Show toast message
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Event Listeners
cartButton.addEventListener('click', () => {
    cartSidebar.classList.add('open');
});

closeCartBtn.addEventListener('click', () => {
    cartSidebar.classList.remove('open');
});

checkoutBtn.addEventListener('click', openCheckoutModal);

closeModalBtn.addEventListener('click', closeCheckoutModal);
cancelCheckoutBtn.addEventListener('click', closeCheckoutModal);

checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) {
        closeCheckoutModal();
    }
});

// Initialize
loadProducts();
updateCartUI();

// Make functions available globally for onclick handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;

