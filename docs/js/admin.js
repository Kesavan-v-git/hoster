// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'mart_admin';

// Flag to prevent duplicate form listeners
let addProductFormInitialized = false;

// Check if admin is logged in
function checkAdminAuth() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    if (isLoggedIn) {
        showAdminDashboard();
    } else {
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    setupAddProductForm(); // Setup form handler when dashboard is shown
    loadProducts();
    loadOrders();
}

// Handle login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const errorDiv = document.getElementById('login-error');

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        errorDiv.textContent = '';
        showAdminDashboard();
    } else {
        errorDiv.textContent = 'Invalid username or password';
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('adminLoggedIn');
    showLoginScreen();
    document.getElementById('login-form').reset();
});

// Load products for admin
function loadProducts() {
    const productsRef = database.ref('products');

    productsRef.on('value', (snapshot) => {
        const products = snapshot.val() || {};
        displayAdminProducts(products);
    }, (error) => {
        console.error('Error loading products:', error);
        showAdminToast('Error loading products', 'error');
    });
}

// Display products in admin panel
function displayAdminProducts(products) {
    const productsList = document.getElementById('admin-products-list');

    if (Object.keys(products).length === 0) {
        productsList.innerHTML = '<div class="loading">No products added yet.</div>';
        return;
    }

    productsList.innerHTML = '';

    Object.keys(products).forEach(productId => {
        const product = products[productId];
        const productCard = createAdminProductCard(productId, product);
        productsList.appendChild(productCard);
    });
}

// Create admin product card
function createAdminProductCard(productId, product) {
    const card = document.createElement('div');
    card.className = 'admin-product-card';

    card.innerHTML = `
        <div class="admin-product-header">
            <div>
                <div class="admin-product-name">${product.name}</div>
                ${product.category ? `<div class="admin-product-detail">Category: ${product.category}</div>` : ''}
            </div>
        </div>
        <div class="admin-product-details">
            <div class="admin-product-detail">
                <strong>MRP:</strong> ₹${(product.mrp || product.price).toFixed(2)} 
                <strong>Price:</strong> ₹${product.price.toFixed(2)}
                ${product.discount > 0 ? `<span class="discount-badge">${product.discount}% OFF</span>` : ''}
            </div>
            <div class="admin-product-detail"><strong>Stock:</strong> ${product.stock} units</div>
            ${product.description ? `<div class="admin-product-detail"><strong>Description:</strong> ${product.description}</div>` : ''}
            ${product.imageUrl ? `<div class="admin-product-detail"><strong>Image:</strong> <a href="${product.imageUrl}" target="_blank">View</a></div>` : ''}
        </div>
        <div class="admin-product-actions">
            <button class="btn-edit" onclick="editProduct('${productId}')">Edit</button>
            <button class="btn-delete" onclick="deleteProduct('${productId}')">Delete</button>
        </div>
    `;

    return card;
}

// Add product form handler
function setupAddProductForm() {
    // Prevent duplicate listeners
    if (addProductFormInitialized) {
        return;
    }

    const addProductForm = document.getElementById('add-product-form');
    if (!addProductForm) {
        console.error('Add product form not found');
        return;
    }

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check if database is initialized
        if (typeof database === 'undefined') {
            showAdminToast('Database not initialized. Please refresh the page.', 'error');
            console.error('Database variable is undefined');
            return;
        }

        const productName = document.getElementById('product-name').value.trim();
        const productMrp = parseFloat(document.getElementById('product-mrp').value);
        const productPrice = parseFloat(document.getElementById('product-price').value);
        const productStock = parseInt(document.getElementById('product-stock').value);

        // Validate required fields
        if (!productName || isNaN(productMrp) || isNaN(productPrice) || isNaN(productStock)) {
            showAdminToast('Please fill all required fields correctly', 'error');
            return;
        }

        if (productMrp < 0 || productPrice < 0 || productStock < 0) {
            showAdminToast('Prices and stock cannot be negative', 'error');
            return;
        }

        if (productPrice > productMrp) {
            showAdminToast('Selling Price cannot be greater than MRP', 'error');
            return;
        }

        // Calculate discount
        const discount = productMrp > 0 ? Math.round(((productMrp - productPrice) / productMrp) * 100) : 0;

        const productData = {
            name: productName,
            mrp: productMrp,
            price: productPrice,
            discount: discount,
            stock: productStock,
            category: document.getElementById('product-category').value.trim() || '',
            imageUrl: document.getElementById('product-image').value.trim() || '',
            description: document.getElementById('product-description').value.trim() || ''
        };

        try {
            const productsRef = database.ref('products');
            const newProductRef = productsRef.push();

            // Set the data - returns a Promise
            await newProductRef.set(productData);

            // Clear form
            document.getElementById('add-product-form').reset();
            showAdminToast('Product added successfully', 'success');
        } catch (error) {
            console.error('Error adding product:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            showAdminToast(`Error: ${errorMessage}. Check console and database rules.`, 'error');
        }
    });

    addProductFormInitialized = true;
}

// Edit product
function editProduct(productId) {
    const productsRef = database.ref(`products/${productId}`);

    productsRef.once('value', (snapshot) => {
        const product = snapshot.val();

        if (!product) {
            showAdminToast('Product not found', 'error');
            return;
        }

        // Create edit modal
        const editModal = document.createElement('div');
        editModal.className = 'modal show';
        editModal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                <h2>Edit Product</h2>
                <form id="edit-product-form">
                    <div class="form-group">
                        <label for="edit-product-name">Product Name *</label>
                        <input type="text" id="edit-product-name" value="${product.name}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-product-mrp">MRP (₹) *</label>
                            <input type="number" id="edit-product-mrp" value="${product.mrp || product.price}" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-product-price">Selling Price (₹) *</label>
                            <input type="number" id="edit-product-price" value="${product.price}" step="0.01" min="0" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-product-stock">Stock Quantity *</label>
                            <input type="number" id="edit-product-stock" value="${product.stock}" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-product-category">Category</label>
                            <input type="text" id="edit-product-category" value="${product.category || ''}" placeholder="e.g., Food, Beverages, Snacks">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-image">Image URL</label>
                        <input type="url" id="edit-product-image" value="${product.imageUrl || ''}" placeholder="https://example.com/image.jpg">
                    </div>
                    <div class="form-group">
                        <label for="edit-product-description">Description</label>
                        <textarea id="edit-product-description" rows="3">${product.description || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn-submit">Update Product</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(editModal);

        // Handle edit form submission
        document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const mrp = parseFloat(document.getElementById('edit-product-mrp').value);
            const price = parseFloat(document.getElementById('edit-product-price').value);

            if (price > mrp) {
                showAdminToast('Selling Price cannot be greater than MRP', 'error');
                return;
            }

            const discount = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

            const updatedProduct = {
                name: document.getElementById('edit-product-name').value.trim(),
                mrp: mrp,
                price: price,
                discount: discount,
                stock: parseInt(document.getElementById('edit-product-stock').value),
                category: document.getElementById('edit-product-category').value.trim() || '',
                imageUrl: document.getElementById('edit-product-image').value.trim() || '',
                description: document.getElementById('edit-product-description').value.trim() || ''
            };

            if (!updatedProduct.name || updatedProduct.price < 0 || updatedProduct.stock < 0) {
                showAdminToast('Please fill all required fields correctly', 'error');
                return;
            }

            try {
                await productsRef.update(updatedProduct);
                editModal.remove();
                showAdminToast('Product updated successfully', 'success');
            } catch (error) {
                console.error('Error updating product:', error);
                showAdminToast('Error updating product. Please try again.', 'error');
            }
        });

        // Close modal on background click
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                editModal.remove();
            }
        });
    });
}

// Delete product
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    const productsRef = database.ref(`products/${productId}`);

    productsRef.remove()
        .then(() => {
            showAdminToast('Product deleted successfully', 'success');
        })
        .catch((error) => {
            console.error('Error deleting product:', error);
            showAdminToast('Error deleting product. Please try again.', 'error');
        });
}

// Load orders
function loadOrders() {
    const ordersRef = database.ref('orders');

    ordersRef.orderByChild('timestamp').limitToLast(100).on('value', (snapshot) => {
        const orders = snapshot.val() || {};
        displayOrders(orders);
    }, (error) => {
        console.error('Error loading orders:', error);
    });
}

// Display orders
function displayOrders(orders) {
    const ordersList = document.getElementById('orders-list');

    if (Object.keys(orders).length === 0) {
        ordersList.innerHTML = '<div class="loading">No orders yet.</div>';
        return;
    }

    // Convert to array and sort by timestamp (newest first)
    const ordersArray = Object.keys(orders).map(orderId => ({
        id: orderId,
        ...orders[orderId]
    })).sort((a, b) => b.timestamp - a.timestamp);

    ordersList.innerHTML = ordersArray.map(order => {
        const orderDate = new Date(order.timestamp).toLocaleString();

        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-date">${orderDate}</div>
                    </div>
                </div>
                <div class="order-customer">
                    <div class="order-customer-item"><strong>Customer:</strong> ${order.customerName}</div>
                    <div class="order-customer-item"><strong>Email:</strong> ${order.email}</div>
                    <div class="order-customer-item"><strong>Mobile:</strong> ${order.mobile}</div>
                    <div class="order-customer-item"><strong>Hostel No:</strong> ${order.hostelNo}</div>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span>${item.name} × ${item.quantity}</span>
                            <span>₹${item.total.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">Total: ₹${order.total.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// View orders modal
document.getElementById('view-orders-btn').addEventListener('click', () => {
    document.getElementById('orders-modal').classList.add('show');
});

document.getElementById('close-orders-modal').addEventListener('click', () => {
    document.getElementById('orders-modal').classList.remove('show');
});

document.getElementById('orders-modal').addEventListener('click', (e) => {
    if (e.target.id === 'orders-modal') {
        document.getElementById('orders-modal').classList.remove('show');
    }
});

// Show toast message (admin)
function showAdminToast(message, type = 'success') {
    // Create or get toast element
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Make functions available globally
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

// Initialize
checkAdminAuth();

