export const generateInvoice = (order) => {
  const itemsRows = order.products.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.productId.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${(Number(item.price) || 0).toFixed(2)} EGP EGP</td>
    </tr>
  `).join("");

  const subtotal = order.products.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = order.shippingCost || 0;
  const total = subtotal + shipping;
  return `
  <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden;">
    
    <!-- Header -->
    <div style="background:#fafafa;padding:20px;text-align:center;">
      <h2 style="margin:0;color:#333;">Order #${order.randomId} Confirmed</h2>
      <p style="margin:5px 0;color:#777;">Thank you for your purchase! We’re getting your order ready to be shipped.</p>
    </div>

    <!-- Order summary -->
    <div style="padding:20px;">
      <h3 style="margin-top:0;border-bottom:1px solid #eee;padding-bottom:5px;">Order Summary</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th style="padding:8px;text-align:left;">Product</th>
            <th style="padding:8px;text-align:center;">Quantity</th>
            <th style="padding:8px;text-align:right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <table style="width:100%;margin-top:20px;border-collapse:collapse;">
       <tr>
  <td style="padding:8px;text-align:right;">Subtotal</td>
  <td style="padding:8px;text-align:right;">${order.subtotal.toFixed(2)} EGP</td>
</tr>
<tr>
  <td style="padding:8px;text-align:right;">Shipping</td>
  <td style="padding:8px;text-align:right;">${order.shippingCost.toFixed(2)} EGP</td>
</tr>
<tr style="font-weight:bold;border-top:2px solid #eee;">
  <td style="padding:8px;text-align:right;">Total</td>
  <td style="padding:8px;text-align:right;color:#E91E63;">${order.totalPrice.toFixed(2)} EGP</td>
</tr>

      </table>
    </div>

    <!-- Shipping and Billing -->
    <div style="padding:20px;background:#fafafa;display:flex;flex-wrap:wrap;gap:20px;">
      <div style="flex:1;min-width:220px;">
        <h4 style="margin:0 0 5px 0;">Shipping Address</h4>
        <p style="margin:0;color:#555;">
          ${order.firstName} ${order.lastName}<br/>
          ${order.address}<br/>
          ${order.city}<br/>
          ${order.governorate}<br/>
          Phone: ${order.phone}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px;text-align:center;font-size:13px;color:#888;">
      If you have any questions, please contact with us on this number.<br/>
      Thank you for shopping with us! 💖
    </div>
  </div>
  `;
};


