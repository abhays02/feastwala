// public/support-module.js

function initSupportModule(options) {
  // WhatsApp order functionality
  if (options.enableWhatsapp) {
    // Add WhatsApp order button to cart page if it exists
    const cartPage = document.querySelector('.cart-page');
    if (cartPage) {
      const whatsappOrderBtn = document.createElement('button');
      whatsappOrderBtn.className = 'btn-primary whatsapp-order-btn';
      whatsappOrderBtn.innerHTML = '<i class="fa fa-whatsapp"></i> Order via WhatsApp';
      whatsappOrderBtn.addEventListener('click', () => {
        // Get cart items
        const cartItems = Array.from(document.querySelectorAll('.cart-item')).map(item => {
          const name = item.querySelector('.item-title').textContent.trim();
          const price = item.querySelector('.cart-price').textContent.trim();
          const quantity = item.querySelector('.cart-count').textContent.trim();
          return { name, price, quantity };
        });
        
        if (cartItems.length > 0) {
          generateWhatsAppOrderLink(cartItems);
        } else {
          alert('Your cart is empty. Please add items before ordering via WhatsApp.');
        }
      });
      
      // Add button after the checkout button
      const checkoutBtn = cartPage.querySelector('.btn-primary');
      if (checkoutBtn) {
        checkoutBtn.parentNode.insertBefore(whatsappOrderBtn, checkoutBtn.nextSibling);
      }
    }
    
    // Add WhatsApp order button to product cards
    document.querySelectorAll('.add-to-whatsapp-cart').forEach(button => {
      button.addEventListener('click', (e) => {
        const productId = e.target.dataset.productId;
        const productName = e.target.dataset.productName;
        const productPrice = e.target.dataset.productPrice;
        
        // Generate WhatsApp link for this single product
        generateWhatsAppOrderLink([{
          name: productName,
          price: productPrice,
          quantity: 1
        }]);
      });
    });
  }
}

// Function to generate WhatsApp order link
function generateWhatsAppOrderLink(products) {
  // Get customer name (this could be retrieved from user session/input)
  const customerName = prompt('Please enter your name:', '') || 'Customer';
  
  fetch('/support/api/whatsapp/generate-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      products,
      customerName
    })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      // Open WhatsApp link in new tab
      window.open(result.whatsappLink, '_blank');
    }
  })
  .catch(error => {
    console.error('Error generating WhatsApp link:', error);
  });
}

// Add WhatsApp quick order buttons to product cards
document.addEventListener('DOMContentLoaded', function() {
  const productCards = document.querySelectorAll('.product-card');
  
  productCards.forEach(card => {
    // Check if the card doesn't already have a WhatsApp button
    if (!card.querySelector('.whatsapp-quick-order')) {
      const addToCartBtn = card.querySelector('.add-to-cart');
      
      if (addToCartBtn) {
        const productData = addToCartBtn.dataset.pizza ? JSON.parse(addToCartBtn.dataset.pizza) : null;
        
        if (productData) {
          const whatsappBtn = document.createElement('button');
          whatsappBtn.className = 'whatsapp-quick-order';
          whatsappBtn.innerHTML = '<i class="fa fa-whatsapp"></i> Quick Order';
          whatsappBtn.dataset.productId = productData._id;
          whatsappBtn.dataset.productName = productData.name;
          whatsappBtn.dataset.productPrice = productData.price;
          
          whatsappBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateWhatsAppOrderLink([{
              name: productData.name,
              price: productData.price,
              quantity: 1
            }]);
          });
          
          // Add the WhatsApp button after the add to cart button
          addToCartBtn.parentNode.insertBefore(whatsappBtn, addToCartBtn.nextSibling);
        }
      }
    }
  });
});