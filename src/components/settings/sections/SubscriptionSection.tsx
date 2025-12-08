"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Crown,
  Check,
  X,
  CreditCard,
  Download,
  TrendingUp,
  Zap,
  MessageSquare,
  Upload,
  Clock,
} from "lucide-react";
import { 
  SettingCard, 
  SettingGroup,
  SettingsTabs,
} from "../components";
import { cn } from "@/lib/utils";

// Mock subscription data
const mockSubscription: {
  plan: "free" | "pro" | "enterprise";
  price: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: Date;
  usage: {
    messages: number;
    messagesLimit: number;
    storage: number;
    storageLimit: number;
  };
} = {
  plan: "pro",
  price: 19.99,
  billingCycle: "monthly",
  nextBillingDate: new Date("2025-01-06"),
  usage: {
    messages: 450,
    messagesLimit: 1000,
    storage: 2.5,
    storageLimit: 10,
  },
};

const mockPaymentMethod = {
  type: "card" as const,
  brand: "Visa",
  last4: "4242",
  expiryMonth: 12,
  expiryYear: 2026,
};

const mockInvoices = [
  { id: "1", date: new Date("2024-12-06"), amount: 19.99, status: "paid" as const },
  { id: "2", date: new Date("2024-11-06"), amount: 19.99, status: "paid" as const },
  { id: "3", date: new Date("2024-10-06"), amount: 19.99, status: "paid" as const },
];

const plans = [
  {
    id: "free",
    name: "Free",
    nameAr: "مجاني",
    price: 0,
    features: [
      { name: "100 رسالة شهرياً", included: true },
      { name: "النماذج الأساسية", included: true },
      { name: "1 GB تخزين", included: true },
      { name: "النماذج المتقدمة", included: false },
      { name: "أولوية الردود", included: false },
      { name: "الدعم الفني", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    nameAr: "احترافي",
    price: 19.99,
    popular: true,
    features: [
      { name: "1000 رسالة شهرياً", included: true },
      { name: "جميع النماذج", included: true },
      { name: "10 GB تخزين", included: true },
      { name: "النماذج المتقدمة", included: true },
      { name: "أولوية الردود", included: true },
      { name: "الدعم الفني", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    nameAr: "مؤسسات",
    price: 99.99,
    features: [
      { name: "رسائل غير محدودة", included: true },
      { name: "جميع النماذج", included: true },
      { name: "100 GB تخزين", included: true },
      { name: "API مخصص", included: true },
      { name: "دعم مخصص 24/7", included: true },
      { name: "تدريب الفريق", included: true },
    ],
  },
];

export function SubscriptionSection() {
  const [activeTab, setActiveTab] = React.useState("plan");

  const tabs = [
    { id: "plan", label: "الخطة الحالية" },
    { id: "billing", label: "الفوترة" },
    { id: "invoices", label: "الفواتير" },
  ];

  const usagePercentage = (mockSubscription.usage.messages / mockSubscription.usage.messagesLimit) * 100;
  const storagePercentage = (mockSubscription.usage.storage / mockSubscription.usage.storageLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Current Plan Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-primary rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <h2 className="text-2xl font-bold text-foreground">
                خطة {plans.find(p => p.id === mockSubscription.plan)?.nameAr}
              </h2>
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <p className="text-primary text-xl font-bold mt-2">
              ${mockSubscription.price}/شهر
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              التجديد التالي: {mockSubscription.nextBillingDate.toLocaleDateString("ar")}
            </p>
          </div>
          
          <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:brightness-90 transition-colors">
            ترقية الخطة
          </button>
        </div>
      </motion.div>

      <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {/* Plan Tab */}
        {activeTab === "plan" && (
          <div className="space-y-6">
            {/* Usage */}
            <SettingGroup title="الاستهلاك">
              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      الرسائل
                    </span>
                    <span className="text-sm font-medium">
                      {mockSubscription.usage.messages} / {mockSubscription.usage.messagesLimit}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        usagePercentage > 80 ? "bg-destructive" : 
                        usagePercentage > 50 ? "bg-secondary" : "bg-primary"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePercentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      التخزين
                    </span>
                    <span className="text-sm font-medium">
                      {mockSubscription.usage.storage} GB / {mockSubscription.usage.storageLimit} GB
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        storagePercentage > 80 ? "bg-destructive" : 
                        storagePercentage > 50 ? "bg-secondary" : "bg-primary"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${storagePercentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </SettingGroup>

            {/* Plan Features */}
            <SettingGroup title="مميزات خطتك">
              <div className="grid gap-3">
                {plans.find(p => p.id === mockSubscription.plan)?.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-right">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </SettingGroup>

            {/* Compare Plans */}
            <SettingGroup title="مقارنة الخطط">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    className={cn(
                      "bg-card border rounded-xl p-4 text-center relative",
                      plan.id === mockSubscription.plan
                        ? "border-primary ring-2 ring-primary"
                        : "border-border hover:border-primary"
                    )}
                    whileHover={{ y: -2 }}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        الأكثر شعبية
                      </span>
                    )}
                    {plan.id === mockSubscription.plan && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                        خطتك الحالية
                      </span>
                    )}
                    
                    <h3 className="text-lg font-bold mt-2">{plan.nameAr}</h3>
                    <p className="text-2xl font-bold text-primary mt-2">
                      ${plan.price}
                      <span className="text-sm text-muted-foreground font-normal">/شهر</span>
                    </p>
                    
                    {plan.id !== mockSubscription.plan && (
                      <button className={cn(
                        "w-full mt-4 py-2 rounded-lg font-medium text-sm transition-colors",
                        plan.id === "enterprise" 
                          ? "bg-muted text-foreground hover:brightness-90"
                          : "bg-primary text-primary-foreground hover:brightness-90"
                      )}>
                        {plan.id === "enterprise" ? "تواصل معنا" : "ترقية"}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </SettingGroup>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <SettingGroup title="وسيلة الدفع">
              <SettingCard
                icon={<CreditCard className="w-5 h-5" />}
                title={`${mockPaymentMethod.brand} •••• ${mockPaymentMethod.last4}`}
                description={`تنتهي في ${mockPaymentMethod.expiryMonth}/${mockPaymentMethod.expiryYear}`}
              >
                <div className="flex gap-2">
                  <button className="text-sm text-primary hover:underline">تعديل</button>
                  <button className="text-sm text-destructive hover:underline">حذف</button>
                </div>
              </SettingCard>

              <button className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                + إضافة وسيلة دفع جديدة
              </button>
            </SettingGroup>

            <SettingGroup title="دورة الفوترة">
              <div className="grid grid-cols-2 gap-3">
                <button className={cn(
                  "p-4 rounded-xl border text-center transition-colors",
                  mockSubscription.billingCycle === "monthly"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary"
                )}>
                  <span className="font-medium">شهري</span>
                  <p className="text-sm text-muted-foreground mt-1">$19.99/شهر</p>
                </button>
                <button className={cn(
                  "p-4 rounded-xl border text-center transition-colors relative",
                  mockSubscription.billingCycle === "yearly"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary"
                )}>
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    وفر 20%
                  </span>
                  <span className="font-medium">سنوي</span>
                  <p className="text-sm text-muted-foreground mt-1">$15.99/شهر</p>
                </button>
              </div>
            </SettingGroup>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-6">
            <SettingGroup title="سجل الفواتير">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-card">
                    <tr>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">التاريخ</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">المبلغ</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">الحالة</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mockInvoices.map((invoice) => (
                      <tr key={invoice.id} className="transition-colors hover:brightness-95">
                        <td className="p-3 text-sm">{invoice.date.toLocaleDateString("ar")}</td>
                        <td className="p-3 text-sm">${invoice.amount}</td>
                        <td className="p-3">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            invoice.status === "paid" 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-destructive text-destructive-foreground"
                          )}>
                            {invoice.status === "paid" ? "مدفوعة" : "معلقة"}
                          </span>
                        </td>
                        <td className="p-3">
                          <button className="text-sm text-primary hover:underline flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SettingGroup>
          </div>
        )}
      </SettingsTabs>
    </div>
  );
}
