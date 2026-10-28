import { Order, Settings } from '../types';
import { getCleanWhatsAppPhone, getCurrencySymbol } from './countryUtils';

/**
 * Formats a monetary number into a Brazilian-style currency string (e.g. 15.5 -> "15,50")
 */
export const formatCurrencyValue = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Calculates high contrast text color (black or white) for a given hex background
 */
export const getContrastText = (hexColor?: string): string => {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
};

/**
 * Currency input mask handler that takes raw user input string (digits or commas)
 * and returns the formatted display string ("15,00") and the parsed numeric float (15).
 */
export const handleCurrencyInputMask = (input: string): { display: string; value: number } => {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) {
    return { display: '', value: 0 };
  }
  const numericValue = parseInt(digits, 10) / 100;
  const display = numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return { display, value: numericValue };
};

/**
 * Formats full WhatsApp message text for an order
 */
export const formatOrderWhatsAppMessage = (order: Order, settings: Settings): string => {
  const brand = settings.brandName || 'Nossa Confeitaria';
  const currency = getCurrencySymbol(settings.currency || 'BRL');
  const shortId = order.id ? order.id.slice(-6).toUpperCase() : '';
  
  let msg = `✨ *RESUMO DO PEDIDO - ${brand.toUpperCase()}* ✨\n`;
  msg += `────────────────────────────\n`;
  if (shortId) {
    msg += `📋 *Pedido:* #${shortId}\n`;
  }
  msg += `👤 *Cliente:* ${order.customerName || 'Cliente'}\n`;
  if (order.phone) {
    msg += `📱 *WhatsApp:* ${order.phone}\n`;
  }

  // Entrega ou Retirada
  const isPickup = order.deliveryType === 'pickup';
  msg += `🚚 *Modalidade:* ${isPickup ? '🏪 Retirada no Local' : '🛵 Entrega (Delivery)'}\n`;
  
  if (order.pickupDate) {
    msg += `📅 *Data de ${isPickup ? 'Retirada' : 'Entrega'}:* ${order.pickupDate}\n`;
  }
  if (order.pickupTime) {
    msg += `⏰ *Horário Agendado:* ${order.pickupTime}\n`;
  }

  if (!isPickup) {
    const fullAddr = order.address || `${order.street || ''}, ${order.number || 'S/N'}${order.neighborhood ? ` - ${order.neighborhood}` : ''}`;
    if (fullAddr.trim()) {
      msg += `📍 *Endereço:* ${fullAddr}\n`;
    }
  }

  msg += `\n🛒 *ITENS DO PEDIDO:*\n`;
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      msg += `• *${item.quantity}x ${item.title}* — ${currency} ${formatCurrencyValue(itemTotal)}\n`;
      if (item.selectedSize) {
        msg += `   └ Tamanho/Opção: ${item.selectedSize.name}\n`;
      }
      if (item.cakeOptions) {
        const parts = [];
        if (item.cakeOptions.size) parts.push(`Tam: ${item.cakeOptions.size}`);
        if (item.cakeOptions.dough) parts.push(`Massa: ${item.cakeOptions.dough}`);
        if (item.cakeOptions.fillings?.length) parts.push(`Recheios: ${item.cakeOptions.fillings.join(', ')}`);
        if (item.cakeOptions.topping) parts.push(`Cob: ${item.cakeOptions.topping}`);
        if (item.cakeOptions.topper) parts.push(`Topper: ${item.cakeOptions.topper}`);
        if (parts.length > 0) msg += `   └ Bolo: ${parts.join(' | ')}\n`;
      }
      if (item.mealOptions?.sides?.length) {
        msg += `   └ Extras: ${item.mealOptions.sides.map(s => s.name).join(', ')}\n`;
      }
      if (item.mealOptions?.removals?.length) {
        msg += `   └ Sem: ${item.mealOptions.removals.join(', ')}\n`;
      }
      if (item.sandwichOptions?.fillings?.length) {
        msg += `   └ Recheios: ${item.sandwichOptions.fillings.join(', ')}\n`;
      }
      if (item.observation) {
        msg += `   └ Obs: ${item.observation}\n`;
      }
    });
  } else {
    msg += `• Nenhum item registrado.\n`;
  }

  msg += `────────────────────────────\n`;
  if (order.subtotal !== undefined && order.subtotal > 0 && Math.abs(order.subtotal - order.total) > 0.01) {
    msg += `💵 *Subtotal dos Itens:* ${currency} ${formatCurrencyValue(order.subtotal)}\n`;
  }
  if (order.deliveryFee !== undefined && order.deliveryFee > 0) {
    msg += `🛵 *Taxa de Frete:* ${currency} ${formatCurrencyValue(order.deliveryFee)}\n`;
  } else if (isPickup) {
    msg += `🏪 *Taxa de Retirada:* Grátis\n`;
  }
  if (order.taxAmount !== undefined && order.taxAmount > 0) {
    msg += `📊 *Taxas/Impostos:* ${currency} ${formatCurrencyValue(order.taxAmount)}\n`;
  }

  msg += `💰 *VALOR TOTAL: ${currency} ${formatCurrencyValue(order.total)}*\n`;

  const paymentText = order.paymentStatus === 'full'
    ? '✅ Pago Integralmente'
    : order.paymentStatus === 'half'
    ? '⏳ Sinal de 50% Pago (Restante no ato da entrega)'
    : '⏳ Pagamento Pendente';
  msg += `💳 *Status do Pagamento:* ${paymentText}\n`;

  if (order.observation) {
    msg += `\n📝 *Observações:* ${order.observation}\n`;
  }

  msg += `\nMuito obrigado pelo seu pedido! Se desejar alterar qualquer detalhe ou tiver dúvidas, é só responder aqui. 🎂❤️`;
  return msg;
};

/**
 * Triggers WhatsApp redirect to send the order to customer
 */
export const sendOrderToWhatsApp = (order: Order, settings: Settings) => {
  const msg = formatOrderWhatsAppMessage(order, settings);
  const cleanPhone = getCleanWhatsAppPhone(order.phone, settings?.whatsappCountryCode || '+55');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
};
