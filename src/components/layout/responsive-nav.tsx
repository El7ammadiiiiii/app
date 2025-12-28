'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

interface ResponsiveNavProps {
  children: React.ReactNode;
  className?: string;
  logo?: React.ReactNode;
  mobileBreakpoint?: number;
}

/**
 * Responsive navigation component with mobile drawer
 * Shows full nav on desktop, hamburger menu on mobile
 */
export function ResponsiveNav({
  children,
  className,
  logo,
  mobileBreakpoint = 768,
}: ResponsiveNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // Close menu when window is resized to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className={cn('relative z-30', className)}>
        <div className="responsive-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            {logo && <div className="flex-shrink-0">{logo}</div>}

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-6 flex-1 justify-end">
              {children}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden touch-target p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="mobile-nav-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="mobile-nav-panel open">
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                {logo && <div>{logo}</div>}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="touch-target p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Menu Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

interface ResponsiveNavItemProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}

/**
 * Navigation item that works in both desktop and mobile contexts
 */
export function ResponsiveNavItem({
  children,
  href,
  onClick,
  className,
  active = false,
}: ResponsiveNavItemProps) {
  const baseClasses = cn(
    'touch-target px-4 py-2 rounded-lg transition-all',
    'hover:bg-white/10',
    active && 'bg-white/10 text-accent-primary',
    className
  );

  if (href) {
    return (
      <a href={href} className={baseClasses} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <button className={baseClasses} onClick={onClick}>
      {children}
    </button>
  );
}

interface ResponsiveNavGroupProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * Navigation group for organizing items in mobile menu
 */
export function ResponsiveNavGroup({
  children,
  title,
  className,
}: ResponsiveNavGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <div className="px-4 py-2 text-sm font-medium text-text-muted">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
