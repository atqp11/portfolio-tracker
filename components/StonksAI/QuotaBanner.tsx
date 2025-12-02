/**
 * QuotaBanner Component
 * 
 * Displays user-friendly quota warnings and limits in the AI chat interface.
 * 
 * Scenarios handled:
 * - User is about to run out (≤3 messages left): Soft blue/yellow banner
 * - User has 1 message left: More prominent banner with lock icon
 * - User hits limit (0 left): Full-width blocking banner
 * - Portfolio change quota low: Tiny inline chip above input
 * - Portfolio change exhausted: Input disabled with message
 * - Paid user (unlimited): Nothing shown
 * - Just upgraded: Celebratory toast
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuotaStatus, type QuotaLevel } from '@lib/hooks/useQuotaStatus';
import Link from 'next/link';

// ============================================================================
// STYLES (inline for component encapsulation)
// ============================================================================

const styles = {
  // Top banner for chat quota warnings
  banner: {
    base: `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 0;
      transition: all 0.2s ease;
    `,
    low: `
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
      color: #93c5fd;
      border-bottom: 1px solid rgba(99, 102, 241, 0.2);
    `,
    critical: `
      background: linear-gradient(90deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%);
      color: #fcd34d;
      border-bottom: 1px solid rgba(251, 191, 36, 0.3);
    `,
    exhausted: `
      background: linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
      color: #fca5a5;
      border-bottom: 1px solid rgba(239, 68, 68, 0.2);
      padding: 12px 16px;
    `,
  },
  
  // Upgrade link
  upgradeLink: `
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    font-weight: 600;
    transition: all 0.15s ease;
    margin-left: 8px;
  `,
  
  // Portfolio change chip (above input)
  portfolioChip: {
    base: `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 6px;
      margin-bottom: 8px;
    `,
    low: `
      background: rgba(113, 113, 122, 0.2);
      color: #a1a1aa;
    `,
    critical: `
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    `,
    exhausted: `
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    `,
  },
  
  // Upgrade toast
  toast: `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  `,
};

// ============================================================================
// CSS KEYFRAMES (injected once)
// ============================================================================

const cssKeyframes = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  .quota-banner-upgrade-link:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    transform: translateX(2px);
  }
`;

// ============================================================================
// COMPONENTS
// ============================================================================

interface QuotaBannerProps {
  className?: string;
}

/**
 * Main chat quota banner - appears at top of chat
 */
export function ChatQuotaBanner({ className = '' }: QuotaBannerProps) {
  const quota = useQuotaStatus();
  
  // Don't show for unlimited users or comfortable quota
  if (quota.isLoading) return null;
  if (quota.isUnlimited) return null;
  if (quota.chatMessages.level === 'comfortable' || quota.chatMessages.level === 'unlimited') return null;
  
  const { level, remaining, limit } = quota.chatMessages;
  const nextLimit = quota.nextTierChatLimit;
  
  // Build banner content based on level
  let bannerStyle = styles.banner.base;
  let icon = '';
  let message = '';
  let ctaText = '';
  
  switch (level) {
    case 'low':
      bannerStyle += styles.banner.low;
      icon = '';
      message = `${remaining} message${remaining !== 1 ? 's' : ''} left today`;
      ctaText = nextLimit ? `Upgrade for ${nextLimit}/day →` : 'Upgrade →';
      break;
      
    case 'critical':
      bannerStyle += styles.banner.critical;
      icon = '🔒';
      message = `${remaining} message left`;
      ctaText = 'Upgrade for unlimited →';
      break;
      
    case 'exhausted':
      bannerStyle += styles.banner.exhausted;
      icon = '⏱️';
      message = `You've used all ${limit} messages today. Come back tomorrow`;
      ctaText = nextLimit ? `or upgrade for ${nextLimit}/day` : 'or upgrade';
      break;
  }
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssKeyframes }} />
      <div 
        className={`quota-banner ${className}`}
        style={{ ...parseStyle(bannerStyle) }}
        role="alert"
        aria-live="polite"
      >
        {icon && <span>{icon}</span>}
        <span>{message}</span>
        {level !== 'exhausted' ? (
          <span style={{ opacity: 0.7 }}>·</span>
        ) : null}
        <Link 
          href={quota.upgradeUrl}
          className="quota-banner-upgrade-link"
          style={parseStyle(styles.upgradeLink)}
        >
          {ctaText}
        </Link>
      </div>
    </>
  );
}

/**
 * Portfolio change chip - appears above input box
 */
export function PortfolioChangeChip({ className = '' }: QuotaBannerProps) {
  const quota = useQuotaStatus();
  
  // Don't show for unlimited or comfortable
  if (quota.isLoading) return null;
  if (quota.portfolioChanges.level === 'comfortable' || quota.portfolioChanges.level === 'unlimited') return null;
  
  const { level, remaining } = quota.portfolioChanges;
  
  let chipStyle = styles.portfolioChip.base;
  let message = '';
  
  switch (level) {
    case 'low':
      chipStyle += styles.portfolioChip.low;
      message = `${remaining} portfolio edit${remaining !== 1 ? 's' : ''} left today`;
      break;
      
    case 'critical':
      chipStyle += styles.portfolioChip.critical;
      message = `1 portfolio edit left today`;
      break;
      
    case 'exhausted':
      chipStyle += styles.portfolioChip.exhausted;
      message = `Portfolio edit limit reached`;
      break;
  }
  
  return (
    <div 
      className={`portfolio-change-chip ${className}`}
      style={parseStyle(chipStyle)}
    >
      <span>{message}</span>
    </div>
  );
}

/**
 * Input disabled overlay - shows when quota exhausted
 */
export function QuotaExhaustedOverlay({ type }: { type: 'chat' | 'portfolio' }) {
  const quota = useQuotaStatus();
  
  const isExhausted = type === 'chat' 
    ? quota.chatMessages.level === 'exhausted'
    : quota.portfolioChanges.level === 'exhausted';
    
  if (!isExhausted) return null;
  
  const message = type === 'chat'
    ? `You've used all your messages today.`
    : `You've used all your portfolio edits today.`;
  
  return (
    <div 
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(10, 12, 14, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        zIndex: 10,
        borderRadius: '8px',
      }}
    >
      <span style={{ color: '#f87171', fontSize: '14px', fontWeight: 500 }}>
        {message}
      </span>
      <Link
        href={quota.upgradeUrl}
        style={{
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Upgrade for unlimited
      </Link>
    </div>
  );
}

/**
 * Upgrade celebration toast - shows briefly after upgrading
 */
export function UpgradeCelebrationToast({ 
  show, 
  tierName,
  onClose 
}: { 
  show: boolean; 
  tierName?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);
  
  if (!show) return null;
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssKeyframes }} />
      <div style={parseStyle(styles.toast)}>
        <span>🎉</span>
        <span>Welcome to {tierName || 'your new plan'}! Unlimited messages & portfolio changes</span>
      </div>
    </>
  );
}

/**
 * Combined quota status for chat - shows appropriate banner based on state
 */
export function ChatQuotaStatus() {
  const quota = useQuotaStatus();
  
  // Show nothing for unlimited users
  if (quota.isUnlimited) return null;
  
  // Show loading skeleton briefly
  if (quota.isLoading) return null;
  
  return <ChatQuotaBanner />;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse template literal style string into React style object
 */
function parseStyle(styleString: string): React.CSSProperties {
  const style: Record<string, string> = {};
  
  styleString
    .split(';')
    .filter(s => s.trim())
    .forEach(declaration => {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        // Convert kebab-case to camelCase
        const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        style[camelProperty] = value;
      }
    });
  
  return style as React.CSSProperties;
}

export default ChatQuotaBanner;
