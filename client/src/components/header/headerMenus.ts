import {
  BadgeCheck,
  Bot,
  Briefcase,
  CalendarDays,
  Car,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  Flame,
  GraduationCap,
  Globe2,
  HeartPulse,
  HelpCircle,
  Home as HomeIcon,
  Link2,
  MousePointer2,
  PlayCircle,
  Radio,
  Settings2,
  ShoppingCart,
  Smile,
  Sparkles,
  Store,
  UserRound,
  Wifi,
} from "lucide-react";
import type { ComponentType } from "react";

export type HeaderMenuKey =
  | "product"
  | "features"
  | "industries"
  | "resources"
  | "integrations";

export type HeaderMenuItem = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
};

export const headerMenuLabels: Record<HeaderMenuKey, string> = {
  product: "Product",
  features: "Features",
  industries: "Industries",
  resources: "Resources",
  integrations: "Integrations",
};

export const headerMenus: Record<HeaderMenuKey, HeaderMenuItem[]> = {
  product: [
    { icon: Briefcase, title: "WhatsApp Business API", description: "Get FREE WhatsApp API", href: "/product/whatsapp-business-api" },
    { icon: Radio, title: "WhatsApp Marketing", description: "Broadcast, automate and grow", href: "/product/whatsapp-marketing" },
    { icon: MousePointer2, title: "AI Ads Manager", description: "5X your leads right away", href: "/product/ai-ads-manager" },
    { icon: Bot, title: "WhatsApp Chatbots", description: "Automate your messaging with AI", href: "/product/whatsapp-chatbots" },
    { icon: Bot, title: "AI WhatsApp Chatbot", description: "Automate everything with AI", href: "/product/ai-whatsapp-chatbot" },
    { icon: CircleDollarSign, title: "WhatsApp Payments", description: "Collect payments within WhatsApp", href: "/product/whatsapp-payments" },
    { icon: ClipboardList, title: "WhatsApp Forms", description: "Native forms within WhatsApp", href: "/product/whatsapp-forms" },
    { icon: Link2, title: "WhatsApp Link and QR", description: "Free WhatsApp link and QR generator", href: "/product/whatsapp-link-qr" },
    { icon: BadgeCheck, title: "WhatsApp Blue Tick", description: "Get a verified badge", href: "/product/whatsapp-blue-tick" },
    { icon: ShoppingCart, title: "Showroom Kit", description: "QR stand for your offline store", href: "/product/showroom-kit" },
  ],
  features: [
    { icon: Flame, title: "Features", description: "Explore all powerful platform features", href: "/features" },
    { icon: Radio, title: "WhatsApp Broadcasting", description: "Retargeting, CRM and more", href: "/features/whatsapp-broadcasting" },
    { icon: Smile, title: "WhatsApp AI Agents", description: "Build AI agents on WhatsApp", href: "/features/whatsapp-ai-agents" },
    { icon: Bot, title: "AI WhatsApp Chatbot", description: "Automate anything with AI", href: "/features/ai-whatsapp-chatbot" },
    { icon: MousePointer2, title: "Ads Manager", description: "3X your leads", href: "/features/ads-manager" },
    { icon: Bot, title: "WhatsApp Chatbots", description: "Drag and drop flow builder", href: "/features/whatsapp-chatbots" },
    { icon: FileText, title: "WhatsApp Catalog", description: "Sell products on WhatsApp", href: "/features/whatsapp-catalog" },
    { icon: CreditCard, title: "WhatsApp Payments", description: "Collect payments via UPI and card", href: "/features/whatsapp-payments" },
    { icon: Globe2, title: "WhatsApp Webviews", description: "Web within WhatsApp", href: "/features/whatsapp-webviews" },
    { icon: ClipboardList, title: "WhatsApp Forms", description: "Native data collection", href: "/features/whatsapp-forms" },
  ],
  industries: [
    { icon: Sparkles, title: "All Industries", description: "Industry-wise use cases", href: "/industries" },
    { icon: GraduationCap, title: "Education", description: "Edtech, coaches, institutes", href: "/industries/education" },
    { icon: ShoppingCart, title: "E-commerce", description: "Brands and D2C", href: "/industries/ecommerce" },
    { icon: CircleDollarSign, title: "Finance and Insurance", description: "Fintech, banking and more", href: "/industries/finance-insurance" },
    { icon: HeartPulse, title: "Healthcare", description: "Appointment booking, hospitals", href: "/industries/healthcare" },
    { icon: Car, title: "Automobile", description: "Book test drives, sell faster", href: "/industries/automobile" },
    { icon: HomeIcon, title: "Real Estate", description: "Developers, brokers, coworking", href: "/industries/real-estate" },
    { icon: Wifi, title: "IT Services and Internet", description: "Showcase your services", href: "/industries/it-services-internet" },
    { icon: CalendarDays, title: "Events and Webinar", description: "Boost attendance", href: "/industries/events-webinar" },
  ],
  resources: [
    { icon: HelpCircle, title: "Help Center", description: "FAQs, how-to's and more", href: "/resources/help-center" },
    { icon: GraduationCap, title: "Tutorials", description: "Learn how to use the platform", href: "/resources/tutorials" },
    { icon: PlayCircle, title: "Youtube", description: "Tutorials, podcasts, events and more", href: "/resources/youtube" },
    { icon: FileText, title: "Template Library", description: "Explore the right templates", href: "/resources/template-library" },
    { icon: FileText, title: "Blog", description: "Latest updates and stories", href: "/resources/blog" },
    { icon: Link2, title: "Developer APIs", description: "Send templates via API", href: "/resources/developer-apis" },
    { icon: FileText, title: "Case Studies", description: "Business growth stories", href: "/resources/case-studies" },
    { icon: Store, title: "Android App", description: "Download on mobile", href: "/resources/android-app" },
    { icon: Store, title: "iOS App", description: "Download on mobile", href: "/resources/ios-app" },
  ],
  integrations: [
    { icon: Settings2, title: "Explore all Integrations", description: "Automate notifications", href: "/integrations/all" },
    { icon: ShoppingCart, title: "Shopify", description: "Abandoned cart, order status and more", href: "/integrations/shopify" },
    { icon: CircleDollarSign, title: "Razorpay", description: "Send payment notifications", href: "/integrations/razorpay" },
    { icon: ShoppingCart, title: "Shopify Checkouts", description: "Simple checkout and more", href: "/integrations/shopify-checkouts" },
    { icon: Settings2, title: "WebEngage", description: "Automate your journeys", href: "/integrations/webengage" },
    { icon: UserRound, title: "LeadSquared", description: "Connect your CRM", href: "/integrations/leadsquared" },
    { icon: Link2, title: "Integrately", description: "Build automations", href: "/integrations/integrately" },
    { icon: Settings2, title: "Webhook APIs", description: "Receive incoming data to your backend", href: "/integrations/webhook-apis" },
  ],
};

export const headerMenuOrder: HeaderMenuKey[] = [
  "product",
  "features",
  "industries",
  "resources",
  "integrations",
];


