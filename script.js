/* ============================================
   LUXE NAILS - SHOPPING CART & PAYPAL CHECKOUT
   ============================================
   
   SETUP INSTRUCTIONS:
   
   1. Get your PayPal Client ID:
      - Go to https://developer.paypal.com/dashboard/
      - Log in with your PayPal Business account
      - Click "Apps & Credentials"
      - Switch to "Live" mode (top right toggle)
      - Create an app or use the default one
      - Copy the "Client ID"
   
   2. In index.html, find this line near the bottom:
      <script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD">
      
      Replace YOUR_PAYPAL_CLIENT_ID with your actual Client ID
   
   3. Configure your store settings below
   
   ============================================ */

// ============================================
// STORE CONFIGURATION - EDIT THESE!
// ============================================
const STORE_CONFIG = {
    // Your store name (shown in PayPal checkout)
    storeName: 'LUXE NAILS',
    
    // Currency (USD, CAD, GBP, EUR, AUD, etc.)
    currency: 'USD',
    
    // Free shipping threshold (set to 0 to always charge shipping)
    freeShippingThreshold: 50,
    
    // Shipping cost when under free shipping threshold
    shippingCost: 5.99,
    
    // Your email for order notifications (optional - PayPal handles this)
    contactEmail: 'hello@luxenails.com'
};

// ============================================
// SHOPPING CART
// ============================================
let cart = JSON.parse(localStorage.getItem('luxeNailsCart')) || [];

// Update cart count badge
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

// Calculate cart totals
function calculateTotals() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = subtotal >= STORE_CONFIG.freeShippingThreshold ? 0 : STORE_CONFIG.shippingCost;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('luxeNailsCart', JSON.stringify(cart));
    updateCartCount();
}

// Add item to cart
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price: parseFloat(price), quantity: 1 });
    }
    
    saveCart();
    renderCart();
    showToast(`"${name}" added to cart!`);
    openCart();
}

// Remove item from cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
}

// Update item quantity
function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            renderCart();
        }
    }
}

// Render cart items
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartFooter = document.getElementById('cartFooter');
    
    if (cart.length === 0) {
        cartEmpty.style.display = 'flex';
        cartFooter.style.display = 'none';
        // Remove any existing cart items
        cartItems.querySelectorAll('.cart-item').forEach(el => el.remove());
        return;
    }
    
    cartEmpty.style.display = 'none';
    cartFooter.style.display = 'block';
    
    // Remove existing items
    cartItems.querySelectorAll('.cart-item').forEach(el => el.remove());
    
    // Add cart items
    cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="cart-item-image"></div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span class="cart-item-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Remove</button>
                </div>
            </div>
        `;
        cartItems.insertBefore(itemEl, cartEmpty);
    });
    
    // Update totals
    const { subtotal, shipping, total } = calculateTotals();
    document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cartShipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
    
    // Render PayPal buttons
    renderPayPalButtons();
}

// Open cart sidebar
function openCart() {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
    document.body.classList.add('no-scroll');
}

// Close cart sidebar
function closeCart() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
    document.body.classList.remove('no-scroll');
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

// Clear cart after successful purchase
function clearCart() {
    cart = [];
    saveCart();
    renderCart();
}

// ============================================
// PAYPAL INTEGRATION
// ============================================
function renderPayPalButtons() {
    const container = document.getElementById('paypal-button-container');
    
    // Clear existing buttons
    container.innerHTML = '';
    
    // Don't render if cart is empty
    if (cart.length === 0) return;
    
    // Check if PayPal SDK is loaded
    if (typeof paypal === 'undefined') {
        container.innerHTML = `
            <div style="padding: 1rem; background: #fff3cd; color: #856404; text-align: center; font-size: 0.85rem; border-radius: 4px;">
                <strong>PayPal Setup Required</strong><br>
                <span style="font-size: 0.8rem;">Replace YOUR_PAYPAL_CLIENT_ID in index.html with your PayPal Client ID</span>
            </div>
        `;
        return;
    }
    
    // Render PayPal buttons
    paypal.Buttons({
        // Button style
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 45
        },
        
        // Create the order
        createOrder: function(data, actions) {
            const { subtotal, shipping, total } = calculateTotals();
            
            return actions.order.create({
                purchase_units: [{
                    description: `${STORE_CONFIG.storeName} Order`,
                    amount: {
                        currency_code: STORE_CONFIG.currency,
                        value: total.toFixed(2),
                        breakdown: {
                            item_total: {
                                currency_code: STORE_CONFIG.currency,
                                value: subtotal.toFixed(2)
                            },
                            shipping: {
                                currency_code: STORE_CONFIG.currency,
                                value: shipping.toFixed(2)
                            }
                        }
                    },
                    items: cart.map(item => ({
                        name: item.name,
                        unit_amount: {
                            currency_code: STORE_CONFIG.currency,
                            value: item.price.toFixed(2)
                        },
                        quantity: item.quantity.toString()
                    }))
                }]
            });
        },
        
        // Handle successful payment
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(orderData) {
                // Payment successful!
                console.log('Payment completed:', orderData);
                
                // Close cart
                closeCart();
                
                // Show success message
                showToast('🎉 Order placed successfully! Thank you for your purchase!');
                
                // Clear the cart
                clearCart();
                
                // Optional: Send order details to yourself via email service
                // You would need a backend service for this
                // sendOrderNotification(orderData);
            });
        },
        
        // Handle errors
        onError: function(err) {
            console.error('PayPal error:', err);
            showToast('Payment failed. Please try again.');
        },
        
        // Handle cancel
        onCancel: function(data) {
            console.log('Payment cancelled:', data);
            showToast('Payment cancelled.');
        }
        
    }).render('#paypal-button-container');
}

// ============================================
// PRODUCT FILTERS
// ============================================
function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const products = document.querySelectorAll('.product-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter products
            const filter = btn.dataset.filter;
            products.forEach(product => {
                if (filter === 'all' || product.dataset.category === filter) {
                    product.style.display = 'block';
                } else {
                    product.style.display = 'none';
                }
            });
        });
    });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        reveals.forEach(el => {
            const top = el.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (top < windowHeight - 100) {
                el.classList.add('active');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check
}

// ============================================
// NAVBAR
// ============================================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// ============================================
// CURSOR GLOW
// ============================================
function initCursorGlow() {
    const cursor = document.getElementById('cursorGlow');
    
    if (window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
    } else {
        cursor.style.display = 'none';
    }
}

// ============================================
// NEWSLETTER
// ============================================
function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = form.querySelector('input').value;
            
            // Here you would typically send this to your email service
            console.log('Newsletter signup:', email);
            
            showToast('Thanks for subscribing! 💅');
            form.reset();
        });
    }
}

// ============================================
// SMOOTH SCROLL
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navbarHeight = document.getElementById('navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

// ============================================
// ADD TO CART BUTTONS
// ============================================
function initAddToCartButtons() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const { id, name, price } = btn.dataset;
            addToCart(id, name, price);
        });
    });
}

// ============================================
// CART CONTROLS
// ============================================
function initCartControls() {
    // Open cart
    document.getElementById('cartIcon').addEventListener('click', openCart);
    
    // Close cart
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);
}

// ============================================
// INITIALIZE EVERYTHING
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initCursorGlow();
    initScrollReveal();
    initFilters();
    initAddToCartButtons();
    initCartControls();
    initNewsletter();
    initSmoothScroll();
    
    // Initialize cart
    updateCartCount();
    renderCart();
    
    console.log('🌟 LUXE NAILS website loaded!');
    console.log('📝 Remember to add your PayPal Client ID in index.html');
});
