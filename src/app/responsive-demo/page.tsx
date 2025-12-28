'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  ResponsiveNav,
  ResponsiveNavItem,
  ResponsiveNavGroup,
} from '@/components/layout';
import { Home, TrendingUp, BarChart3, Settings, User } from 'lucide-react';

/**
 * Responsive Design Demo Page
 * Shows all responsive components in action
 */
export default function ResponsiveDemoPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Responsive Navigation */}
      <ResponsiveNav
        logo={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-primary rounded-lg" />
            <span className="font-bold text-xl">CCCWAYS</span>
          </div>
        }
      >
        <ResponsiveNavGroup title="Main">
          <ResponsiveNavItem href="/" active>
            <Home className="w-5 h-5 inline-block md:mr-2" />
            <span className="hidden md:inline">Home</span>
          </ResponsiveNavItem>
          <ResponsiveNavItem href="/trading">
            <TrendingUp className="w-5 h-5 inline-block md:mr-2" />
            <span className="hidden md:inline">Trading</span>
          </ResponsiveNavItem>
          <ResponsiveNavItem href="/charts">
            <BarChart3 className="w-5 h-5 inline-block md:mr-2" />
            <span className="hidden md:inline">Charts</span>
          </ResponsiveNavItem>
        </ResponsiveNavGroup>

        <ResponsiveNavGroup title="Account">
          <ResponsiveNavItem href="/profile">
            <User className="w-5 h-5 inline-block md:mr-2" />
            <span className="hidden md:inline">Profile</span>
          </ResponsiveNavItem>
          <ResponsiveNavItem href="/settings">
            <Settings className="w-5 h-5 inline-block md:mr-2" />
            <span className="hidden md:inline">Settings</span>
          </ResponsiveNavItem>
        </ResponsiveNavGroup>
      </ResponsiveNav>

      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-accent-primary/20 to-transparent">
        <ResponsiveContainer size="xl" padding="lg">
          <ResponsiveStack direction="responsive" align="center" spacing="lg">
            <div className="flex-1">
              <h1 className="text-responsive-xl font-bold mb-4">
                Responsive Design Demo
              </h1>
              <p className="text-responsive-base text-text-secondary mb-6">
                This page demonstrates all responsive components. Resize your browser
                or view on different devices to see them in action.
              </p>
              <ResponsiveStack direction="responsive" spacing="md">
                <button className="touch-target px-6 py-3 bg-accent-primary rounded-lg font-medium">
                  Get Started
                </button>
                <button className="touch-target px-6 py-3 border border-accent-primary rounded-lg font-medium">
                  Learn More
                </button>
              </ResponsiveStack>
            </div>
            <div className="flex-1">
              <div className="glass-card p-8 text-center">
                <div className="w-full h-48 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg" />
              </div>
            </div>
          </ResponsiveStack>
        </ResponsiveContainer>
      </section>

      {/* Stats Grid */}
      <section className="section-padding">
        <ResponsiveContainer>
          <h2 className="text-responsive-lg font-bold mb-6">Statistics</h2>
          <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md">
            <StatCard title="Total Users" value="12,345" change="+12%" />
            <StatCard title="Active Trades" value="8,901" change="+8%" />
            <StatCard title="Win Rate" value="67.5%" change="+2.3%" />
            <StatCard title="Total Profit" value="$123,456" change="+18%" />
          </ResponsiveGrid>
        </ResponsiveContainer>
      </section>

      {/* Features Grid */}
      <section className="section-padding bg-bg-surface">
        <ResponsiveContainer>
          <h2 className="text-responsive-lg font-bold mb-6">Features</h2>
          <ResponsiveGrid cols={{ xs: 1, md: 2, lg: 3 }} gap="lg">
            <FeatureCard
              icon="📊"
              title="Advanced Charts"
              description="Professional trading charts with 100+ indicators and drawing tools"
            />
            <FeatureCard
              icon="🤖"
              title="AI Analysis"
              description="Machine learning powered pattern recognition and trend analysis"
            />
            <FeatureCard
              icon="📈"
              title="Real-time Data"
              description="Live market data from multiple exchanges with millisecond precision"
            />
            <FeatureCard
              icon="🔔"
              title="Smart Alerts"
              description="Customizable notifications for price levels and pattern formations"
            />
            <FeatureCard
              icon="📱"
              title="Mobile Ready"
              description="Fully responsive design that works perfectly on all devices"
            />
            <FeatureCard
              icon="🔒"
              title="Secure"
              description="Bank-level encryption and security for your trading data"
            />
          </ResponsiveGrid>
        </ResponsiveContainer>
      </section>

      {/* Responsive Typography Demo */}
      <section className="section-padding">
        <ResponsiveContainer>
          <h2 className="text-responsive-lg font-bold mb-6">
            Responsive Typography
          </h2>
          <div className="space-y-4 glass-card p-6">
            <div>
              <p className="text-text-muted text-sm mb-2">text-responsive-xl</p>
              <h1 className="text-responsive-xl font-bold">
                Extra Large Heading
              </h1>
            </div>
            <div>
              <p className="text-text-muted text-sm mb-2">text-responsive-lg</p>
              <h2 className="text-responsive-lg font-bold">Large Heading</h2>
            </div>
            <div>
              <p className="text-text-muted text-sm mb-2">text-responsive-base</p>
              <p className="text-responsive-base">
                This is base text that scales responsively. It's larger on desktop
                and smaller on mobile for optimal readability.
              </p>
            </div>
            <div>
              <p className="text-text-muted text-sm mb-2">text-responsive-sm</p>
              <p className="text-responsive-sm text-text-secondary">
                Small responsive text for captions and secondary information.
              </p>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* Visibility Demo */}
      <section className="section-padding bg-bg-surface">
        <ResponsiveContainer>
          <h2 className="text-responsive-lg font-bold mb-6">
            Responsive Visibility
          </h2>
          <div className="space-y-4">
            <div className="glass-card p-6 mobile-only">
              <p className="font-medium">📱 Mobile Only</p>
              <p className="text-text-secondary text-sm">
                This content only shows on mobile devices
              </p>
            </div>
            <div className="glass-card p-6 tablet-up">
              <p className="font-medium">💻 Tablet and Up</p>
              <p className="text-text-secondary text-sm">
                This content shows on tablets and larger screens
              </p>
            </div>
            <div className="glass-card p-6 desktop-only">
              <p className="font-medium">🖥️ Desktop Only</p>
              <p className="text-text-secondary text-sm">
                This content only shows on desktop screens (1024px+)
              </p>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* Footer */}
      <footer className="section-padding border-t border-white/10">
        <ResponsiveContainer>
          <ResponsiveStack direction="responsive" justify="between" align="center">
            <p className="text-text-secondary text-sm">
              © 2025 CCCWAYS. All rights reserved.
            </p>
            <ResponsiveStack direction="horizontal" spacing="md">
              <a href="#" className="text-text-secondary hover:text-accent-primary text-sm">
                Privacy
              </a>
              <a href="#" className="text-text-secondary hover:text-accent-primary text-sm">
                Terms
              </a>
              <a href="#" className="text-text-secondary hover:text-accent-primary text-sm">
                Contact
              </a>
            </ResponsiveStack>
          </ResponsiveStack>
        </ResponsiveContainer>
      </footer>
    </div>
  );
}

// Supporting Components

function StatCard({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="glass-card p-6 hover:bg-bg-card-hover transition-all">
      <p className="text-text-secondary text-sm mb-2">{title}</p>
      <p className="text-responsive-lg font-bold mb-1">{value}</p>
      <p className="text-success text-sm">{change}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-6 hover:bg-bg-card-hover transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-responsive-base font-bold mb-2">{title}</h3>
      <p className="text-text-secondary text-responsive-sm">{description}</p>
    </div>
  );
}
