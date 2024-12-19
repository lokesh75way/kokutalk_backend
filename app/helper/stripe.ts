import { loadConfig } from "../helper/config";
loadConfig();

const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_51Q3INv1GVmxJOcoVtgbil4T1qqLhzJmfGPI7EhkeMEZZkCc5ILwR1s0tVku0iRN9p72ScSSzqkhhgvw9rd9f2LYe00JyFjXUFA"

const stripe = require('stripe')(stripeKey);

export const createCustomer = async (data:any) => {
    return await stripe.customers.create({
        email: data.email,
        name: data.name,
        payment_method: data.payment_method||undefined,
        address: data.address,
        invoice_settings: {
            default_payment_method: data.payment_method||undefined
        }
    });
}
export const updateDefaultPaymentMethod = async (customer:any, default_payment_method:any)=> await stripe.customers.update(customer, { invoice_settings: {default_payment_method}});
export const getCustomer = async(customerId:any)=> await stripe.customers.retrieve(customerId);

export const createCard = async (customer:any, source:any) => {
    return await stripe.customers.createSource(
      customer,
      { source }
    );
}
export const listPaymentMethods = async (customer:any)=> await stripe.paymentMethods.list({ customer, type: 'card'});
export const createPaymentMethod = async (data:any) => await stripe.paymentMethods.create({ type: 'card', ...data });
export const attachPaymentMethodToCustomer = async (paymentMethod:any, customer:any) => await stripe.paymentMethods.attach(paymentMethod, { customer });
export const detachPaymentMethodFromCustomer = async (id:any)=>await stripe.paymentMethods.detach(id);
export const getPaymentMethodById = async(id:any)=> await stripe.paymentMethods.retrieve(id);
export const getDefaultPaymentMethodByCustomer = async(customer:any)=>{
      const {invoice_settings} = await getCustomer(customer);
      if(invoice_settings && invoice_settings.default_payment_method)
      return await getPaymentMethodById(invoice_settings.default_payment_method);
}
export const createPaymentIntent = async (data: any) => await stripe.paymentIntents.create(data)

export const stripeErrorMessage = (type: string = 'default') => {
    switch (type) {
      case 'StripeCardError':
        return "Your card's expiration year is invalid.";
      case 'StripeRateLimitError':
        return "Too many requests made to the API too quickly";
      case 'StripeInvalidRequestError':
        return "Invalid parameters were supplied to Stripe's API";
      case 'StripeAPIError':
        return "An error occurred internally with Stripe's API";
      case 'StripeConnectionError':
        return "Some kind of error occurred during the HTTPS communication";
      case 'StripeAuthenticationError':
        return "You probably used an incorrect API key";
      case 'default':
        return ""  
      default:
        return "";
    }
}