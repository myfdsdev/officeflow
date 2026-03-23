import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, paymentMethod, amount } = await req.json();

    // Get subscription
    const subscription = await base44.entities.Subscription.list('-created_date', 1);
    const sub = subscription.find(s => s.id === subscriptionId);

    if (!sub) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Get company
    const company = await base44.entities.Company.list('-created_date', 1);
    const comp = company.find(c => c.id === sub.company_id);

    if (!comp || comp.owner_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Process payment based on method
    let transactionId = '';
    
    if (paymentMethod === 'PayPal') {
      // PayPal API integration would go here
      // For now, we'll create a mock transaction
      transactionId = 'PP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // In production:
      // const response = await fetch('https://api-m.paypal.com/v2/checkout/orders', { ... });
      // const paypalOrder = await response.json();
      // transactionId = paypalOrder.id;
    } else if (paymentMethod === 'Razorpay') {
      // Razorpay API integration would go here
      transactionId = 'RZP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // In production:
      // const response = await fetch('https://api.razorpay.com/v1/orders', { ... });
      // const razorpayOrder = await response.json();
      // transactionId = razorpayOrder.id;
    }

    // Update subscription
    const updatedSub = await base44.entities.Subscription.update(subscriptionId, {
      status: 'completed',
      transaction_id: transactionId
    });

    // Update company subscription
    await base44.entities.Company.update(comp.id, {
      subscription_status: 'active',
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    return Response.json({
      success: true,
      transactionId,
      subscription: updatedSub,
      message: 'Payment processed successfully'
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return Response.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
});