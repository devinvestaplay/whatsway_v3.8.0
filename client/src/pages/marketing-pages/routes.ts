import ProductWhatsappBusinessApiPage from "./ProductWhatsAppBusinessApi";
import ProductWhatsappMarketingPage from "./ProductWhatsAppMarketing";
import ProductAiAdsManagerPage from "./ProductAiAdsManager";
import ProductWhatsappChatbotsPage from "./ProductWhatsAppChatbots";
import ProductAiWhatsappChatbotPage from "./ProductAiWhatsappChatbot";
import ProductWhatsappPaymentsPage from "./ProductWhatsAppPayments";
import ProductWhatsappFormsPage from "./ProductWhatsAppForms";
import ProductWhatsappLinkQrPage from "./ProductWhatsAppLinkQr";
import ProductWhatsappBlueTickPage from "./ProductWhatsAppBlueTick";
import ProductShowroomKitPage from "./ProductShowroomKit";
import FeaturesOverviewPage from "./FeaturesOverview";
import FeaturesWhatsappBroadcastingPage from "./FeaturesWhatsappBroadcasting";
import FeaturesWhatsappAiAgentsPage from "./FeaturesWhatsappAiAgents";
import FeaturesAiWhatsappChatbotPage from "./FeaturesAiWhatsappChatbot";
import FeaturesAdsManagerPage from "./FeaturesAdsManager";
import FeaturesWhatsappChatbotsPage from "./FeaturesWhatsappChatbots";
import FeaturesWhatsappCatalogPage from "./FeaturesWhatsappCatalog";
import FeaturesWhatsappPaymentsPage from "./FeaturesWhatsappPayments";
import FeaturesWhatsappWebviewsPage from "./FeaturesWhatsappWebviews";
import FeaturesWhatsappFormsPage from "./FeaturesWhatsappForms";
import IndustriesOverviewPage from "./IndustriesOverview";
import IndustriesEducationPage from "./IndustriesEducation";
import IndustriesEcommercePage from "./IndustriesEcommerce";
import IndustriesFinanceInsurancePage from "./IndustriesFinanceInsurance";
import IndustriesHealthcarePage from "./IndustriesHealthcare";
import IndustriesAutomobilePage from "./IndustriesAutomobile";
import IndustriesRealEstatePage from "./IndustriesRealEstate";
import IndustriesItServicesInternetPage from "./IndustriesItServicesInternet";
import IndustriesEventsWebinarPage from "./IndustriesEventsWebinar";
import ResourcesHelpCenterPage from "./ResourcesHelpCenter";
import ResourcesTutorialsPage from "./ResourcesTutorials";
import ResourcesYoutubePage from "./ResourcesYoutube";
import ResourcesTemplateLibraryPage from "./ResourcesTemplateLibrary";
import ResourcesBlogPage from "./ResourcesBlog";
import ResourcesDeveloperApisPage from "./ResourcesDeveloperApis";
import ResourcesCaseStudiesPage from "./ResourcesCaseStudies";
import ResourcesAndroidAppPage from "./ResourcesAndroidApp";
import ResourcesIosAppPage from "./ResourcesIosApp";
import IntegrationsOverviewPage from "./IntegrationsOverview";
import IntegrationsShopifyPage from "./IntegrationsShopify";
import IntegrationsRazorpayPage from "./IntegrationsRazorpay";
import IntegrationsShopifyCheckoutsPage from "./IntegrationsShopifyCheckouts";
import IntegrationsWebengagePage from "./IntegrationsWebengage";
import IntegrationsLeadsquaredPage from "./IntegrationsLeadsquared";
import IntegrationsIntegratelyPage from "./IntegrationsIntegrately";
import IntegrationsWebhookApisPage from "./IntegrationsWebhookApis";

export const marketingRoutes = [
  { path: "/product/whatsapp-business-api", component: ProductWhatsappBusinessApiPage },
  { path: "/product/whatsapp-marketing", component: ProductWhatsappMarketingPage },
  { path: "/product/ai-ads-manager", component: ProductAiAdsManagerPage },
  { path: "/product/whatsapp-chatbots", component: ProductWhatsappChatbotsPage },
  { path: "/product/ai-whatsapp-chatbot", component: ProductAiWhatsappChatbotPage },
  { path: "/product/whatsapp-payments", component: ProductWhatsappPaymentsPage },
  { path: "/product/whatsapp-forms", component: ProductWhatsappFormsPage },
  { path: "/product/whatsapp-link-qr", component: ProductWhatsappLinkQrPage },
  { path: "/product/whatsapp-blue-tick", component: ProductWhatsappBlueTickPage },
  { path: "/product/showroom-kit", component: ProductShowroomKitPage },
  { path: "/features", component: FeaturesOverviewPage },
  { path: "/features/whatsapp-broadcasting", component: FeaturesWhatsappBroadcastingPage },
  { path: "/features/whatsapp-ai-agents", component: FeaturesWhatsappAiAgentsPage },
  { path: "/features/ai-whatsapp-chatbot", component: FeaturesAiWhatsappChatbotPage },
  { path: "/features/ads-manager", component: FeaturesAdsManagerPage },
  { path: "/features/whatsapp-chatbots", component: FeaturesWhatsappChatbotsPage },
  { path: "/features/whatsapp-catalog", component: FeaturesWhatsappCatalogPage },
  { path: "/features/whatsapp-payments", component: FeaturesWhatsappPaymentsPage },
  { path: "/features/whatsapp-webviews", component: FeaturesWhatsappWebviewsPage },
  { path: "/features/whatsapp-forms", component: FeaturesWhatsappFormsPage },
  { path: "/industries", component: IndustriesOverviewPage },
  { path: "/industries/education", component: IndustriesEducationPage },
  { path: "/industries/ecommerce", component: IndustriesEcommercePage },
  { path: "/industries/finance-insurance", component: IndustriesFinanceInsurancePage },
  { path: "/industries/healthcare", component: IndustriesHealthcarePage },
  { path: "/industries/automobile", component: IndustriesAutomobilePage },
  { path: "/industries/real-estate", component: IndustriesRealEstatePage },
  { path: "/industries/it-services-internet", component: IndustriesItServicesInternetPage },
  { path: "/industries/events-webinar", component: IndustriesEventsWebinarPage },
  { path: "/resources/help-center", component: ResourcesHelpCenterPage },
  { path: "/resources/tutorials", component: ResourcesTutorialsPage },
  { path: "/resources/youtube", component: ResourcesYoutubePage },
  { path: "/resources/template-library", component: ResourcesTemplateLibraryPage },
  { path: "/resources/blog", component: ResourcesBlogPage },
  { path: "/resources/developer-apis", component: ResourcesDeveloperApisPage },
  { path: "/resources/case-studies", component: ResourcesCaseStudiesPage },
  { path: "/resources/android-app", component: ResourcesAndroidAppPage },
  { path: "/resources/ios-app", component: ResourcesIosAppPage },
  { path: "/integrations/all", component: IntegrationsOverviewPage },
  { path: "/integrations/shopify", component: IntegrationsShopifyPage },
  { path: "/integrations/razorpay", component: IntegrationsRazorpayPage },
  { path: "/integrations/shopify-checkouts", component: IntegrationsShopifyCheckoutsPage },
  { path: "/integrations/webengage", component: IntegrationsWebengagePage },
  { path: "/integrations/leadsquared", component: IntegrationsLeadsquaredPage },
  { path: "/integrations/integrately", component: IntegrationsIntegratelyPage },
  { path: "/integrations/webhook-apis", component: IntegrationsWebhookApisPage },
];

