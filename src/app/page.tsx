"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  Brain,
  ArrowLeft,
  Sparkles
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      
      {/* Main Content - z-20 to ensure visibility above backgrounds */}
      <div className="relative z-20">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50">
          <div className="surface mx-4 mt-4 rounded-2xl px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <span className="text-white font-serif font-bold text-lg">C</span>
                </div>
                <span className="font-serif text-2xl font-bold text-glow">CCWAYS</span>
              </motion.div>
              
              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="pt-32 px-4 min-h-screen">
          <div className="max-w-7xl mx-auto w-full">
            {/* Hero Text */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-16"
            >
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 text-glow">
                تحليل ذكي
                <br />
                <span className="text-accent-primary">للعملات الرقمية</span>
              </h1>
              <p className="text-foreground-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto mb-8">
                منصة متكاملة مدعومة بالذكاء الاصطناعي للتحليل الفني والأساسي وتحليل السلسلة
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/chat">
                  <Button size="lg" className="glow-primary">
                    <Sparkles className="ml-2" />
                    ابدأ التحليل
                  </Button>
                </Link>
                <Button size="lg" variant="outline">
                  <ArrowLeft className="ml-2" />
                  استكشف المميزات
                </Button>
              </div>
            </motion.div>

            {/* Feature Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mb-16 px-2 lg:px-0"
            >
              <FeatureCard 
                icon={<TrendingUp className="w-8 h-8" />}
                title="التحليل الفني"
                description="17 مدرسة تحليلية مع أكثر من 100 مؤشر"
                color="text-accent-tertiary"
              />
              <FeatureCard 
                icon={<Wallet className="w-8 h-8" />}
                title="تحليل On-Chain"
                description="تتبع الحيتان والمحافظ الذكية"
                color="text-accent-primary"
              />
              <FeatureCard 
                icon={<BarChart3 className="w-8 h-8" />}
                title="التحليل الأساسي"
                description="تحليل المشاريع والفرق والاقتصاد"
                color="text-green-500"
              />
              <FeatureCard 
                icon={<Brain className="w-8 h-8" />}
                title="ذكاء اصطناعي"
                description="وكلاء AI متخصصون لكل نوع تحليل"
                color="text-accent-secondary"
              />
            </motion.div>

            {/* Demo Section - Chat Area (No Background) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mb-16"
            >
              <h2 className="font-serif text-3xl font-bold text-center mb-8">
                محادثة ذكية
              </h2>
              <div className="chat-area max-w-3xl mx-auto p-6 rounded-2xl border border-surface-border/30">
                {/* Sample Chat Messages */}
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="chat-bubble-user px-4 py-3 rounded-2xl rounded-bl-md max-w-[80%]">
                      <p className="text-sm">حلل لي عملة Bitcoin تحليلاً فنياً شاملاً</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="chat-bubble-agent px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                      <p className="text-sm">
                        <span className="text-accent-primary font-semibold">تحليل Bitcoin الفني:</span>
                        <br /><br />
                        📊 السعر الحالي: $97,500
                        <br />
                        📈 الاتجاه: صاعد (Bullish)
                        <br />
                        🎯 المقاومة التالية: $100,000
                        <br />
                        🛡️ الدعم: $92,000
                        <br /><br />
                        المؤشرات تشير إلى استمرار الاتجاه الصاعد...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sidebar Demo */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-16"
            >
              <h2 className="font-serif text-3xl font-bold text-center mb-8">
                واجهة احترافية
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar Demo */}
                <div className="sidebar p-4 rounded-2xl border">
                  <h3 className="font-semibold mb-4 text-accent-primary">القائمة الجانبية</h3>
                  <nav className="space-y-2">
                    {["الملف الشخصي", "المفضلة", "المشاريع", "المعهد", "المحادثات"].map((item) => (
                      <div key={item} className="px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        {item}
                      </div>
                    ))}
                  </nav>
                </div>
                
                {/* Center - Menu Demo */}
                <div className="menu p-4 rounded-2xl">
                  <h3 className="font-semibold mb-4 text-accent-primary">القوائم</h3>
                  <div className="space-y-2">
                    {["التحليل الفني", "تحليل On-Chain", "التحليل الأساسي", "الأدوات الذكية"].map((item) => (
                      <div key={item} className="px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right - Card Demo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">البطاقات</CardTitle>
                    <CardDescription>تصميم احترافي للبطاقات</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-foreground-muted">
                      <p>✓ دعم الوضع الليلي والنهاري</p>
                      <p>✓ تأثيرات زجاجية</p>
                      <p>✓ حركات سلسة</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="surface mt-20 py-8 lg:py-12">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 text-center">
            <p className="text-foreground-muted text-sm">
              © 2024 CCWAYS. جميع الحقوق محفوظة.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <Card className="group hover:glow-primary transition-all duration-300">
      <CardContent className="p-6">
        <div className={`${color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-foreground-muted text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
