/**
 * Stripe integration exports
 */

export {
  getStripe,
  stripe,
  createOrRetrieveCustomer,
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  createCustomerPortalSession,
  constructWebhookEvent,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from './client';

export type {
  StripeTier,
  StripeProduct,
  StripePrice,
  StripeCustomer,
  StripeSubscription,
  WebhookEvent,
  CheckoutSessionCreateRequest,
  CheckoutSessionCreateResponse,
} from './types';

export {
  checkoutRequestSchema,
  portalRequestSchema,
  webhookHeadersSchema,
  type CheckoutRequest,
  type PortalRequest,
  type WebhookHeaders,
} from './validation';
