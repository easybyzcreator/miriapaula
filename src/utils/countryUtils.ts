export interface CountryInfo {
  code: string; // '+55', '+1', '+351', '+34'
  country: string; // 'BR', 'US', 'PT', 'ES'
  name: string;
  flag: string;
  placeholder: string;
  defaultCurrency: 'BRL' | 'USD' | 'EUR';
  minDigits: number;
  maxDigits: number;
}

export const COUNTRY_OPTIONS: Record<string, CountryInfo> = {
  '+55': {
    code: '+55',
    country: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    placeholder: '(11) 99999-9999',
    defaultCurrency: 'BRL',
    minDigits: 10,
    maxDigits: 11
  },
  '+1': {
    code: '+1',
    country: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    placeholder: '(555) 123-4567',
    defaultCurrency: 'USD',
    minDigits: 10,
    maxDigits: 10
  },
  '+351': {
    code: '+351',
    country: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    placeholder: '912 345 678',
    defaultCurrency: 'EUR',
    minDigits: 9,
    maxDigits: 9
  },
  '+34': {
    code: '+34',
    country: 'ES',
    name: 'Espanha',
    flag: '🇪🇸',
    placeholder: '612 34 56 78',
    defaultCurrency: 'EUR',
    minDigits: 9,
    maxDigits: 9
  }
};

export const CURRENCY_OPTIONS = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro (R$)', flag: '🇧🇷', preview: 'R$ 45,00' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano ($)', flag: '🇺🇸', preview: '$45.00' },
  { code: 'EUR', symbol: '€', name: 'Euro (€) - Portugal / Espanha', flag: '🇪🇺', preview: '€ 45,00' }
];

export const getCurrencySymbol = (currency?: string): string => {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  return 'R$';
};

export const formatPhoneByCountry = (value: string, countryCode: string = '+55'): string => {
  let val = (value || '').replace(/\D/g, '');
  if (!val) return '';

  const country = COUNTRY_OPTIONS[countryCode] || COUNTRY_OPTIONS['+55'];

  if (countryCode === '+1') {
    // US: (999) 999-9999
    if (val.length > 10) val = val.slice(0, 10);
    if (val.length <= 3) return `(${val}`;
    if (val.length <= 6) return `(${val.slice(0, 3)}) ${val.slice(3)}`;
    return `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
  }

  if (countryCode === '+351') {
    // Portugal: 999 999 999
    if (val.length > 9) val = val.slice(0, 9);
    if (val.length <= 3) return val;
    if (val.length <= 6) return `${val.slice(0, 3)} ${val.slice(3)}`;
    return `${val.slice(0, 3)} ${val.slice(3, 6)} ${val.slice(6)}`;
  }

  if (countryCode === '+34') {
    // Espanha: 999 99 99 99
    if (val.length > 9) val = val.slice(0, 9);
    if (val.length <= 3) return val;
    if (val.length <= 5) return `${val.slice(0, 3)} ${val.slice(3)}`;
    if (val.length <= 7) return `${val.slice(0, 3)} ${val.slice(3, 5)} ${val.slice(5)}`;
    return `${val.slice(0, 3)} ${val.slice(3, 5)} ${val.slice(5, 7)} ${val.slice(7)}`;
  }

  // Default Brasil: (99) 99999-9999 / (99) 9999-9999
  if (val.length > 11) val = val.slice(0, 11);
  if (val.length <= 2) return `(${val}`;
  if (val.length <= 6) return `(${val.slice(0, 2)}) ${val.slice(2)}`;
  if (val.length <= 10) return `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
  return `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
};

export const getCleanWhatsAppPhone = (phone: string, countryCode: string = '+55'): string => {
  let clean = (phone || '').replace(/\D/g, '');
  if (!clean) return '';

  const ddi = countryCode.replace(/\D/g, ''); // '55', '1', '351', '34'

  // If the phone doesn't start with the DDI, prepend it
  if (!clean.startsWith(ddi)) {
    clean = ddi + clean;
  }
  return clean;
};
