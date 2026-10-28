export interface Category {
  id: string;
  title: string;
  order: number;
  catalog?: 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4' | 'both' | 'all' | 'catalog_b2b' | 'b2b';
}

export type PriceType = 'fixed' | 'starting' | 'consult';

export interface Side {
  id: string;
  name: string;
  price: number;
  type?: 'side' | 'swap';
}

export interface ProductSize {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
}

export interface NutritionalInfo {
  calories?: string; // Valor Energético (kcal)
  carbs?: string; // Carboidratos (g)
  carbohydrates?: string; // Carboidratos (g)
  proteins?: string; // Proteínas (g)
  totalFat?: string; // Gorduras Totais (g)
  saturatedFat?: string; // Gorduras Saturadas (g)
  transFat?: string; // Gorduras Trans (g)
  fiber?: string; // Fibra Alimentar (g)
  sodium?: string; // Sódio (mg)
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  priceType?: PriceType;
  image: string; // Base64
  categoryId?: string;
  categoryTitle?: string;
  catalog?: string;
  isMeal?: boolean;
  isCustomCake?: boolean;
  ingredients?: string; // Comma separated
  allowedSides?: string[]; // IDs of sides
  isActive?: boolean;
  order?: number; // Ordem de exibição no cardápio
  hasSizes?: boolean;
  sizes?: ProductSize[];
  cakeGalleryId?: string; // Associated image gallery
  isCustomSandwich?: boolean; // Custom sandwich or tapioca with multiple fillings
  customFillings?: string; // Comma separated list of fillings
  nutritionalInfo?: NutritionalInfo;
  minQuantity?: number; // Quantidade mínima para pedido
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  mealOptions?: {
    removals: string[];
    sides: Side[];
  };
  selectedSize?: ProductSize;
  cakeOptions?: {
    size?: string;
    dough?: string;
    fillings?: string[];
    topping?: string;
    topper?: string;
    styleNumber?: number; // Selected image style number from gallery
  };
  sandwichOptions?: {
    fillings: string[];
  };
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  deliveryType?: 'delivery' | 'pickup';
  deliveryFee?: number;
  deliveryDistanceKm?: number;
  pickupDate?: string;
  pickupTime?: string;
  birthday: string;
  observation: string;
  email: string;
  isB2B?: boolean;
  isPJ?: boolean;
  b2bCompanyName?: string;
  b2bAddress?: string;
  b2bManagerName?: string;
  b2bZipCode?: string;
  b2bCity?: string;
  b2bFrequency?: string;
  b2bDate?: string;
  items: {
    title: string;
    quantity: number;
    price: number;
    priceType?: PriceType;
    isCustomItem?: boolean;
    observation?: string;
    mealOptions?: {
      removals: string[];
      sides: Side[];
    };
    selectedSize?: ProductSize;
    cakeOptions?: {
      size?: string;
      dough?: string;
      fillings?: string[];
      topping?: string;
      topper?: string;
      styleNumber?: number; // Selected style image number from gallery
    };
    sandwichOptions?: {
      fillings: string[];
    };
  }[];
  total: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  createdAt: any;
  orderLanguage?: string;
  paymentStatus?: 'pending' | 'half' | 'full';
}

export interface ImageGallery {
  id: string;
  title: string;
  name?: string;
  images: string[]; // maximum 6 base64 images
}

export interface DeliveryRange {
  id: string;
  maxKm: number;
  price: number;
}

export interface Settings {
  logo: string;
  primaryColor: string;
  whatsappNumber: string;
  whatsappCountryCode?: string;
  slug: string;
  brandName: string;
  adminPassword?: string;
  slogan?: string;
  whatsappClosingMessage?: string;
  backgroundImage?: string;
  glassColor?: string;
  textColor?: string;
  categoryTextColor?: string;
  brandTextColor?: string;
  priceColor?: string;
  detailsColor?: string;
  productTitleColor?: string;
  productDescColor?: string;
  sloganColor?: string;
  badgeColor?: string;
  minOrderValue?: number;
  minOrderEnabled?: boolean;
  language?: 'pt' | 'en' | 'es';
  currency?: 'BRL' | 'USD' | 'EUR' | string;
  checkoutTitle?: string;
  infoBlock1Title?: string;
  infoBlock1Text?: string;
  infoBlock2Title?: string;
  infoBlock2Text?: string;
  // Intro screen settings
  introEnabled?: boolean;
  introTitle?: string;
  introSubtitle?: string;
  introDescription?: string;
  introButtonText?: string;
  introBottomText?: string;
  // Catalog selector settings
  selectorEnabled?: boolean;
  selectorTitle?: string;
  selectorSubtitle?: string;
  catalog1Title?: string;
  catalog1Image?: string;
  catalog1Desc?: string;
  catalog1Slogan?: string;
  catalog1Active?: boolean;
  catalog2Title?: string;
  catalog2Image?: string;
  catalog2Desc?: string;
  catalog2Slogan?: string;
  catalog2Active?: boolean;
  catalog3Title?: string;
  catalog3Image?: string;
  catalog3Desc?: string;
  catalog3Slogan?: string;
  catalog3Active?: boolean;
  catalog4Title?: string;
  catalog4Image?: string;
  catalog4Desc?: string;
  catalog4Slogan?: string;
  catalog4Active?: boolean;
  // Custom Cake settings
  cakeSizes?: string[];
  cakeDoughs?: string[];
  cakeFillings?: string[];
  cakeFillingsMax?: number;
  cakeToppings?: string[];
  cakeToppers?: string[];
  // Fixed costs configurations
  fixedRent?: number;
  fixedInternet?: number;
  fixedElectricity?: number;
  fixedWater?: number;
  fixedGas?: number;
  fixedSistemas?: number;
  fixedMarketing?: number;
  fixedContabilidade?: number;
  fixedSalarios?: number;
  fixedMei?: number;
  customFixedCosts?: { label: string; amount: number }[];
  // Configuração de Entrega / Frete por KM
  deliveryEnabled?: boolean;
  deliveryOriginAddress?: string;
  deliveryOriginLat?: number;
  deliveryOriginLng?: number;
  deliveryRanges?: DeliveryRange[];
  deliveryPricePerKmExtra?: number;
  deliveryMaxKm?: number;
  deliveryFallbackPrice?: number;
  deliveryFreeAbove?: number;
  allowPickup?: boolean;
}

export interface VariableCost {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface Insumo {
  id: string;
  title: string;
  description?: string;
  image: string;
  link: string;
  category?: string;
  createdAt?: any;
}

