#!/usr/bin/env node
/**
 * Verify Stripe Environment Configuration
 * 
 * Checks that all required Stripe environment variables are set correctly
 * for testing checkout in test mode.
 */

const requiredVars = {
  // API Keys
  STRIPE_SECRET_KEY: {
    required: true,
    pattern: /^sk_test_/,
    description: 'Stripe Secret Key (Test Mode)',
  },
  STRIPE_PUBLISHABLE_KEY: {
    required: true,
    pattern: /^pk_test_/,
    description: 'Stripe Publishable Key (Test Mode)',
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    required: true,
    pattern: /^pk_test_/,
    description: 'Stripe Publishable Key (Public, Test Mode)',
  },
  
  // Webhook Secret (optional for local testing with Stripe CLI)
  STRIPE_WEBHOOK_SECRET: {
    required: false,
    pattern: /^whsec_/,
    description: 'Stripe Webhook Secret (for local testing, use Stripe CLI)',
  },
  
  // Price IDs (Service Layer)
  STRIPE_PRODUCT_BASIC_PRICE_ID: {
    required: true,
    pattern: /^price_test_/,
    description: 'Basic Tier Monthly Price ID (Test Mode)',
  },
  STRIPE_PRODUCT_PREMIUM_PRICE_ID: {
    required: true,
    pattern: /^price_test_/,
    description: 'Premium Tier Monthly Price ID (Test Mode)',
  },
  
  // Price IDs (Pricing Page - Monthly)
  NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY: {
    required: true,
    pattern: /^price_test_/,
    description: 'Basic Tier Monthly Price ID (Public)',
  },
  NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY: {
    required: true,
    pattern: /^price_test_/,
    description: 'Premium Tier Monthly Price ID (Public)',
  },
  
  // Price IDs (Pricing Page - Annual) - Optional
  NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL: {
    required: false,
    pattern: /^price_test_/,
    description: 'Basic Tier Annual Price ID (Public)',
  },
  NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL: {
    required: false,
    pattern: /^price_test_/,
    description: 'Premium Tier Annual Price ID (Public)',
  },
};

function checkEnvironment() {
  console.log('🔍 Verifying Stripe Environment Configuration...\n');
  
  const missing = [];
  const invalid = [];
  const warnings = [];
  
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    // Check if required variable is missing
    if (config.required && (!value || value.trim() === '')) {
      missing.push({ name: varName, description: config.description });
      continue;
    }
    
    // Check if optional variable is missing
    if (!config.required && (!value || value.trim() === '')) {
      warnings.push({ name: varName, description: config.description });
      continue;
    }
    
    // Check pattern match
    if (value && config.pattern && !config.pattern.test(value)) {
      invalid.push({
        name: varName,
        description: config.description,
        value: value.substring(0, 20) + '...',
        expected: config.pattern.toString(),
      });
    }
  }
  
  // Print results
  let hasErrors = false;
  
  if (missing.length > 0) {
    hasErrors = true;
    console.error('❌ Missing Required Environment Variables:\n');
    missing.forEach(({ name, description }) => {
      console.error(`   - ${name}`);
      console.error(`     ${description}`);
      console.error(`     Add to .env.local: ${name}=your_value_here\n`);
    });
  }
  
  if (invalid.length > 0) {
    hasErrors = true;
    console.error('❌ Invalid Environment Variables:\n');
    invalid.forEach(({ name, description, value, expected }) => {
      console.error(`   - ${name}`);
      console.error(`     ${description}`);
      console.error(`     Current: ${value}`);
      console.error(`     Expected pattern: ${expected}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Optional Environment Variables (Not Set):\n');
    warnings.forEach(({ name, description }) => {
      console.warn(`   - ${name}`);
      console.warn(`     ${description}\n`);
    });
  }
  
  if (!hasErrors) {
    console.log('✅ All required Stripe environment variables are configured correctly!\n');
    
    // Additional checks
    console.log('📋 Configuration Summary:\n');
    console.log('   API Keys:');
    console.log(`   - Secret Key: ${process.env.STRIPE_SECRET_KEY?.substring(0, 12)}...`);
    console.log(`   - Publishable Key: ${process.env.STRIPE_PUBLISHABLE_KEY?.substring(0, 12)}...`);
    console.log(`   - Public Key: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 12)}...\n`);
    
    console.log('   Price IDs:');
    console.log(`   - Basic Monthly: ${process.env.STRIPE_PRODUCT_BASIC_PRICE_ID || 'Not set'}`);
    console.log(`   - Premium Monthly: ${process.env.STRIPE_PRODUCT_PREMIUM_PRICE_ID || 'Not set'}`);
    if (process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL) {
      console.log(`   - Basic Annual: ${process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL}`);
    }
    if (process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL) {
      console.log(`   - Premium Annual: ${process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL}`);
    }
    console.log('');
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.log('💡 Tip: For local webhook testing, run:');
      console.log('   stripe listen --forward-to localhost:3000/api/stripe/webhook');
      console.log('   Then add the webhook secret to STRIPE_WEBHOOK_SECRET\n');
    }
    
    console.log('🚀 Ready to test Stripe checkout!');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Navigate to: http://localhost:3000/pricing');
    console.log('   3. Select a paid tier and complete checkout');
    console.log('   4. Use test card: 4242 4242 4242 4242\n');
  }
  
  return hasErrors ? 1 : 0;
}

// Run check
const exitCode = checkEnvironment();
process.exit(exitCode);

