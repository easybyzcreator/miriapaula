import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Cake, 
  Printer, 
  Search, 
  X, 
  ExternalLink,
  Store,
  Truck,
  CheckCircle2,
  AlertCircle,
  Edit2,
  MessageCircle,
  Save,
  Calendar
} from 'lucide-react';
import { Order, Product, Settings } from '../types';
import { getCleanWhatsAppPhone, getCurrencySymbol } from '../utils/countryUtils';
import { sendOrderToWhatsApp, getContrastText } from '../utils/orderUtils';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface OrdersCalendarProps {
  orders: Order[];
  settings: Settings;
  products?: Product[];
  onSelectOrderInList?: (orderId: string) => void;
  onPrintOrder?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
}

type CalendarViewMode = 'grid' | 'agenda' | 'month';

// Helper to parse dates from various formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, Timestamp)
export function parseOrderDateTime(order: Order): { date: Date | null; timeStr: string; isPickup: boolean } {
  let targetDate: Date | null = null;
  let timeStr = '12:00 PM';
  const isPickup = !order.address || order.address.toLowerCase().includes('retirada') || order.address.toLowerCase().includes('pickup');

  // Try pickupDate first
  if (order.pickupDate && typeof order.pickupDate === 'string' && order.pickupDate.trim()) {
    const raw = order.pickupDate.trim();
    
    // Check if time is in pickupDate
    const timeMatch = raw.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
    if (timeMatch) {
      timeStr = timeMatch[1].toUpperCase();
    }

    // Date extraction
    const dateMatchSlash = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const dateMatchDash = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (dateMatchSlash) {
      const part1 = parseInt(dateMatchSlash[1], 10);
      const part2 = parseInt(dateMatchSlash[2], 10);
      const year = parseInt(dateMatchSlash[3], 10);

      // Distinguish MM/DD/YYYY vs DD/MM/YYYY - now default to DD/MM/YYYY as requested
      if (part1 > 12) {
        // DD/MM/YYYY
        targetDate = new Date(year, part2 - 1, part1);
      } else if (part2 > 12) {
        // MM/DD/YYYY
        targetDate = new Date(year, part1 - 1, part2);
      } else {
        // Default to DD/MM/YYYY
        targetDate = new Date(year, part2 - 1, part1);
      }
    } else if (dateMatchDash) {
      const year = parseInt(dateMatchDash[1], 10);
      const month = parseInt(dateMatchDash[2], 10);
      const day = parseInt(dateMatchDash[3], 10);
      targetDate = new Date(year, month - 1, day);
    }
  }

  // Fallback to createdAt
  if (!targetDate) {
    if (order.createdAt?.toDate) {
      targetDate = order.createdAt.toDate();
    } else if (order.createdAt?.seconds) {
      targetDate = new Date(order.createdAt.seconds * 1000);
    } else if (order.createdAt instanceof Date) {
      targetDate = order.createdAt;
    } else if (typeof order.createdAt === 'string') {
      const parsed = new Date(order.createdAt);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }
  }

  // If timeStr is still default and targetDate has time
  if (targetDate && timeStr === '12:00 PM') {
    const d = order.createdAt?.toDate 
      ? order.createdAt.toDate() 
      : (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : targetDate);
    if (d && typeof d.getHours === 'function') {
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
  }

  return { date: targetDate, timeStr, isPickup };
}

// Convert time string "12:00 PM" into hour number (0 to 23)
function getHourFromTimeString(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 12;
  let hour = parseInt(match[1], 10);
  const ampm = match[3] ? match[3].toUpperCase() : '';
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return hour;
}

export const OrdersCalendar: React.FC<OrdersCalendarProps> = ({
  orders,
  settings,
  products,
  onSelectOrderInList,
  onPrintOrder,
  onEditOrder
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('grid');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Direct date editing state
  const [isEditingPickupDate, setIsEditingPickupDate] = useState(false);
  const [editingPickupDateValue, setEditingPickupDateValue] = useState('');
  const [isSavingPickupDate, setIsSavingPickupDate] = useState(false);

  // Helper format currency
  const currencySymbol = getCurrencySymbol(settings?.currency);
  const formatCurrency = (val: number) => {
    if (settings?.currency === 'USD') {
      return `${Number(val || 0).toFixed(2)}`;
    }
    return `${currencySymbol} ${Number(val || 0).toFixed(2).replace('.', ',')}`;
  };

  // Week range calculations (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Month range calculations
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const days: (Date | null)[] = [];

    // Preceding empty/previous month days
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, 1 - (startDayOfWeek - i));
      days.push(prevDate);
    }

    // Days in current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Trailing days to fill 7-col grid (up to 35 or 42)
    while (days.length % 7 !== 0) {
      const nextDay = new Date(year, month + 1, days.length - (startDayOfWeek + lastDayOfMonth.getDate()) + 1);
      days.push(nextDay);
    }

    return days;
  }, [currentDate]);

  // Navigate functions
  const handlePrev = () => {
    const newD = new Date(currentDate);
    if (viewMode === 'month') {
      newD.setMonth(newD.getMonth() - 1);
    } else {
      newD.setDate(newD.getDate() - 7);
    }
    setCurrentDate(newD);
  };

  const handleNext = () => {
    const newD = new Date(currentDate);
    if (viewMode === 'month') {
      newD.setMonth(newD.getMonth() + 1);
    } else {
      newD.setDate(newD.getDate() + 7);
    }
    setCurrentDate(newD);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Map orders with parsed dates
  const parsedOrders = useMemo(() => {
    return orders.map(order => {
      const parsed = parseOrderDateTime(order);
      return {
        order,
        ...parsed
      };
    });
  }, [orders]);

  // Orders filtered by the current period
  const periodOrders = useMemo(() => {
    if (viewMode === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      return parsedOrders.filter(p => {
        if (!p.date) return false;
        return p.date.getFullYear() === year && p.date.getMonth() === month;
      });
    } else {
      const start = new Date(weekDays[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(weekDays[6]);
      end.setHours(23, 59, 59, 999);

      return parsedOrders.filter(p => {
        if (!p.date) return false;
        return p.date >= start && p.date <= end;
      });
    }
  }, [parsedOrders, viewMode, weekDays, currentDate]);

  // Format header period text (e.g. "Semana de 9 a 15 de Agosto de 2026")
  const periodTitle = useMemo(() => {
    const monthNamesPt = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    if (viewMode === 'month') {
      return `${monthNamesPt[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    }
    const start = weekDays[0];
    const end = weekDays[6];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const monthName = monthNamesPt[end.getMonth()];
    const year = end.getFullYear();

    if (start.getMonth() === end.getMonth()) {
      return `Semana de ${startDay} a ${endDay} de ${monthName} de ${year}`;
    } else {
      const startMonthName = monthNamesPt[start.getMonth()];
      return `Semana de ${startDay} de ${startMonthName} a ${endDay} de ${monthName} de ${year}`;
    }
  }, [viewMode, weekDays, currentDate]);

  // Hours for the grid (07:00 AM to 09:00 PM)
  const hoursList = useMemo(() => {
    const hours = [];
    for (let h = 7; h <= 21; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      hours.push({
        hour24: h,
        label: `${displayH.toString().padStart(2, '0')}:00 ${ampm}`
      });
    }
    return hours;
  }, []);

  // Today check helper
  const isToday = (d: Date | null) => {
    if (!d) return false;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  return (
    <div className="w-full space-y-6">
      {/* Calendar Card Container */}
      <div className="w-full bg-white border border-gray-200 rounded-3xl shadow-xl p-4 sm:p-7 space-y-6">
        
        {/* Top Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100/70 text-amber-900 shadow-sm border border-amber-200/50">
                <CalendarIcon size={22} className="text-[#865d39]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-gray-900">
                Cronograma de Entregas & Retiradas
              </h2>
            </div>
            <p className="text-[11px] font-extrabold tracking-[0.2em] text-gray-500 uppercase ml-1">
              VISUALIZAÇÃO DINÂMICA DOS PEDIDOS AGENDADOS
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-gray-100/80 rounded-2xl border border-gray-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-md font-extrabold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grade Semanal
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-white text-gray-900 shadow-md font-extrabold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Agenda Semanal
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-gray-900 shadow-md font-extrabold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensal
              </button>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 bg-white border border-gray-200/80 rounded-2xl p-1 shadow-sm">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-gray-700 cursor-pointer"
                aria-label="Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 rounded-xl text-xs font-black text-gray-800 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-gray-700 cursor-pointer"
                aria-label="Próximo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-header: Period Title & Order Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-200/50">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 font-sans">
            {periodTitle}
          </h3>
          <span className="self-start sm:self-auto px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gray-200/70 text-gray-700 border border-gray-300/60 shadow-sm">
            {periodOrders.length} {periodOrders.length === 1 ? 'PEDIDO NO PERÍODO' : 'PEDIDOS NO PERÍODO'}
          </span>
        </div>

        {/* --- VIEW 1: GRADE SEMANAL (IMAGE 1 STYLE) --- */}
        {viewMode === 'grid' && (
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                {/* Header Row */}
                <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200 text-center font-bold text-xs text-gray-700">
                  <div className="p-3.5 border-r border-gray-200 flex items-center justify-center text-gray-400">
                    <Clock size={16} />
                  </div>
                  {weekDays.map((d, i) => {
                    const todayActive = isToday(d);
                    const dayFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                    return (
                      <div
                        key={i}
                        className={`p-3 border-r border-gray-200 last:border-r-0 flex flex-col items-center justify-center gap-1 ${
                          todayActive ? 'bg-amber-100/50 font-black' : ''
                        }`}
                      >
                        <span className={`text-[11px] font-bold ${todayActive ? 'text-amber-900' : 'text-gray-500'}`}>
                          {dayNames[i]}
                        </span>
                        {todayActive ? (
                          <span 
                            className="px-2 py-0.5 rounded-md text-white font-black text-xs shadow-sm"
                            style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                          >
                            {dayFormatted}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-800">
                            {dayFormatted}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Grid Hour Rows */}
                <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-100">
                  {hoursList.map(hObj => (
                    <div key={hObj.hour24} className="grid grid-cols-8 min-h-[58px]">
                      {/* Hour Label */}
                      <div className="p-2 border-r border-gray-200 bg-gray-50/70 text-[11px] font-bold text-gray-500 flex items-center justify-center select-none">
                        {hObj.label}
                      </div>

                      {/* 7 Days Columns for this hour */}
                      {weekDays.map((d, dayIdx) => {
                        // Find orders that fall on this day & hour
                        const cellOrders = periodOrders.filter(p => {
                          if (!p.date) return false;
                          const matchesDay = (
                            p.date.getDate() === d.getDate() &&
                            p.date.getMonth() === d.getMonth() &&
                            p.date.getFullYear() === d.getFullYear()
                          );
                          if (!matchesDay) return false;
                          const hour = getHourFromTimeString(p.timeStr);
                          return hour === hObj.hour24;
                        });

                        return (
                          <div
                            key={dayIdx}
                            className={`p-1.5 border-r border-gray-100 last:border-r-0 relative transition-colors ${
                              isToday(d) ? 'bg-amber-50/30' : 'hover:bg-gray-50/60'
                            }`}
                          >
                            <div className="space-y-1.5">
                              {cellOrders.map(({ order, timeStr, isPickup }) => {
                                const isValidated = order.paymentStatus === 'half' || order.paymentStatus === 'full';
                                return (
                                  <motion.button
                                    key={order.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`w-full text-left p-2 rounded-xl border shadow-sm transition-all cursor-pointer flex flex-col gap-1 ${
                                      isValidated
                                        ? 'bg-amber-100/60 border-amber-300 text-amber-950 hover:bg-amber-100'
                                        : 'bg-white border-gray-200 text-gray-900 hover:bg-amber-50/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-extrabold text-[11px] truncate uppercase">
                                        {order.isB2B || order.isPJ ? (order.b2bCompanyName || order.customerName) : order.customerName}
                                      </span>
                                      <span className="font-black text-[11px] text-amber-900 shrink-0">
                                        {formatCurrency(order.total)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                                      <span>{isPickup ? '🏪' : '🚚'}</span>
                                      <span>{timeStr}</span>
                                      {isValidated && (
                                        <span 
                                          className="ml-auto text-[9px] font-black px-1.5 py-0.2 text-white rounded"
                                          style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                                        >
                                          OK
                                        </span>
                                      )}
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 2: AGENDA SEMANAL (DETAILED LIST PER DAY) --- */}
        {viewMode === 'agenda' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekDays.map((d, i) => {
              const dayOrders = periodOrders.filter(p => {
                if (!p.date) return false;
                return (
                  p.date.getDate() === d.getDate() &&
                  p.date.getMonth() === d.getMonth() &&
                  p.date.getFullYear() === d.getFullYear()
                );
              });
              const todayActive = isToday(d);
              const dayFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 space-y-3 flex flex-col ${
                    todayActive
                      ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${todayActive ? 'text-amber-900' : 'text-gray-500'}`}>
                        {dayNames[i]}
                      </span>
                      <span 
                        className={`text-xs font-black ${todayActive ? 'px-2 py-0.5 text-white rounded-md' : 'text-gray-800'}`}
                        style={todayActive ? { backgroundColor: settings?.primaryColor || '#865d39' } : {}}
                      >
                        {dayFormatted}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400">
                      {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </div>

                  <div className="space-y-2 flex-grow overflow-y-auto max-h-[300px]">
                    {dayOrders.length > 0 ? (
                      dayOrders.map(({ order, timeStr, isPickup }) => {
                        const isValidated = order.paymentStatus === 'half' || order.paymentStatus === 'full';
                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:shadow-md transition-all cursor-pointer space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-gray-900">
                                {order.customerName}
                              </span>
                              <span className="font-black text-xs text-amber-900">
                                {formatCurrency(order.total)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                              <span className="flex items-center gap-1">
                                {isPickup ? <Store size={13} className="text-amber-700" /> : <Truck size={13} className="text-amber-800" />}
                                {isPickup ? 'Retirada' : 'Entrega'} • {timeStr}
                              </span>
                              {isValidated && (
                                <span 
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded text-white"
                                  style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                                >
                                  Validado
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center py-6 text-xs text-gray-400 font-medium italic">
                        Nenhum pedido agendado
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- VIEW 3: MENSAL (MONTHLY GRID) --- */}
        {viewMode === 'month' && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center font-bold text-xs text-gray-600">
              {dayNames.map((n, idx) => (
                <div key={idx} className="p-3 border-r border-gray-200 last:border-r-0">
                  {n}
                </div>
              ))}
            </div>

            {/* Month Day Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-y divide-gray-100">
              {monthDays.map((d, i) => {
                if (!d) return <div key={i} className="min-h-[90px] bg-gray-50/50" />;
                const isCurrMonth = d.getMonth() === currentDate.getMonth();
                const todayActive = isToday(d);
                const dayOrders = periodOrders.filter(p => {
                  if (!p.date) return false;
                  return (
                    p.date.getDate() === d.getDate() &&
                    p.date.getMonth() === d.getMonth() &&
                    p.date.getFullYear() === d.getFullYear()
                  );
                });

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] p-2 border-r border-gray-100 last:border-r-0 flex flex-col gap-1 transition-colors ${
                      !isCurrMonth
                        ? 'bg-gray-50/40 opacity-40'
                        : todayActive
                        ? 'bg-amber-50/40'
                        : 'hover:bg-gray-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          todayActive
                            ? 'w-6 h-6 rounded-full text-white flex items-center justify-center shadow-sm font-black'
                            : 'text-gray-700'
                        }`}
                        style={todayActive ? { backgroundColor: settings?.primaryColor || '#865d39' } : {}}
                      >
                        {d.getDate()}
                      </span>
                      {dayOrders.length > 0 && (
                        <span className="text-[10px] font-black text-amber-900">
                          {dayOrders.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[80px]">
                      {dayOrders.map(({ order, timeStr }) => (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="px-1.5 py-1 rounded bg-amber-50/80 border border-amber-200 text-amber-950 text-[10px] font-bold truncate cursor-pointer hover:bg-amber-100 transition-all flex items-center justify-between gap-1"
                        >
                          <span className="truncate">{order.customerName}</span>
                          <span className="shrink-0 font-black">{timeStr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* DETALHES DO AGENDAMENTO MODAL (IMAGE 2 STYLE) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedOrder && (() => {
          const { timeStr, isPickup } = parseOrderDateTime(selectedOrder);
          const cleanPhone = selectedOrder.phone ? getCleanWhatsAppPhone(selectedOrder.phone, settings?.whatsappCountryCode || '+55') : '';
          
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 border border-gray-100"
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold tracking-[0.25em] text-gray-400 uppercase font-sans">
                      DETALHES DO AGENDAMENTO
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mt-1">
                      {selectedOrder.isB2B || selectedOrder.isPJ
                        ? (selectedOrder.b2bCompanyName || selectedOrder.customerName)
                        : selectedOrder.customerName
                      }
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                  
                  {/* Delivery Option & Scheduled Time Cards (Top 2 Pills) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Delivery / Pickup Card */}
                    <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/70 space-y-1">
                      <span className="text-[10px] font-extrabold tracking-[0.2em] text-gray-400 uppercase">
                        OPÇÃO DE ENTREGA
                      </span>
                      <div className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                        <span>{isPickup ? '🏪' : '🛵'}</span>
                        <span>{isPickup ? 'Pickup' : 'Delivery'}</span>
                      </div>
                      {selectedOrder.address && (
                        <p className="text-xs text-gray-600 font-medium pt-1">
                          {selectedOrder.address}
                        </p>
                      )}
                    </div>

                    {/* Scheduled Time Card */}
                    <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold tracking-[0.2em] text-gray-400 uppercase">
                          HORÁRIO AGENDADO
                        </span>
                        {!isEditingPickupDate && (
                          <button
                            type="button"
                            onClick={() => {
                              // Converter DD/MM/AAAA para YYYY-MM-DD para o datepicker nativo abrir na data correta
                              const cur = selectedOrder.pickupDate || '';
                              if (cur.includes('/')) {
                                const parts = cur.split('/');
                                if (parts.length === 3) {
                                  setEditingPickupDateValue(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                                } else {
                                  setEditingPickupDateValue('');
                                }
                              } else {
                                setEditingPickupDateValue(cur);
                              }
                              setIsEditingPickupDate(true);
                            }}
                            className="text-[11px] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            style={{ color: settings?.primaryColor || '#865d39' }}
                          >
                            <Calendar size={13} /> Alterar Data
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                        <Clock size={20} className="text-gray-600" />
                        <span>{timeStr}</span>
                      </div>
                      {selectedOrder.pickupDate && !isEditingPickupDate && (() => {
                        const d = parseOrderDateTime(selectedOrder).date;
                        const dateFormatted = d 
                          ? `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                          : selectedOrder.pickupDate;
                        return (
                          <p className="text-xs text-gray-600 font-medium pt-1">
                            Data: <strong className="text-gray-900 font-bold">{dateFormatted}</strong>
                          </p>
                        );
                      })()}
                      {isEditingPickupDate && (
                        <div className="pt-2 mt-1 border-t border-gray-200/80 space-y-2.5">
                          <label className="text-[10px] font-bold text-gray-700 uppercase block">
                            📅 Escolha a nova data no calendário:
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="date"
                              autoFocus
                              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-white text-gray-900 shadow-sm outline-none cursor-pointer hover:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                              style={{ colorScheme: 'light' }}
                              value={editingPickupDateValue}
                              onChange={e => setEditingPickupDateValue(e.target.value)}
                              onClick={e => {
                                try {
                                  (e.target as any).showPicker?.();
                                } catch (_) {}
                              }}
                            />
                            <button
                              type="button"
                              disabled={isSavingPickupDate || !editingPickupDateValue}
                              onClick={async () => {
                                if (!selectedOrder?.id) return;
                                setIsSavingPickupDate(true);
                                try {
                                  // Converte YYYY-MM-DD para DD/MM/AAAA
                                  let formatted = editingPickupDateValue;
                                  if (editingPickupDateValue.includes('-')) {
                                    const [y, m, d] = editingPickupDateValue.split('-');
                                    formatted = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
                                  }
                                  if (db) {
                                    await updateDoc(doc(db, 'pedidos', selectedOrder.id), {
                                      pickupDate: formatted
                                    });
                                  }
                                  setSelectedOrder({ ...selectedOrder, pickupDate: formatted });
                                  toast.success(`Data alterada para ${formatted}!`);
                                  setIsEditingPickupDate(false);
                                } catch (err) {
                                  console.error(err);
                                  toast.error('Erro ao atualizar data.');
                                } finally {
                                  setIsSavingPickupDate(false);
                                }
                              }}
                              className="px-4 py-2 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                              style={{ 
                                backgroundColor: settings?.primaryColor || '#865d39',
                                color: getContrastText(settings?.primaryColor || '#865d39')
                              }}
                            >
                              {isSavingPickupDate ? 'Salvando...' : 'Salvar Data'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingPickupDate(false)}
                              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                          {/* Botões de Atalho Rápido */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] font-bold text-gray-400 mr-1">Atalhos:</span>
                            {[
                              { label: 'Hoje', days: 0 },
                              { label: 'Amanhã', days: 1 },
                              { label: '+2 Dias', days: 2 },
                              { label: '+7 Dias', days: 7 }
                            ].map(quick => {
                              const targetDate = new Date();
                              targetDate.setDate(targetDate.getDate() + quick.days);
                              const y = targetDate.getFullYear();
                              const m = String(targetDate.getMonth() + 1).padStart(2, '0');
                              const d = String(targetDate.getDate()).padStart(2, '0');
                              const iso = `${y}-${m}-${d}`;
                              return (
                                <button
                                  key={quick.label}
                                  type="button"
                                  onClick={() => setEditingPickupDateValue(iso)}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer transition-colors"
                                >
                                  {quick.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact & Customer Info Section */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-extrabold tracking-[0.25em] text-gray-900 uppercase font-sans">
                      CONTATO E CADASTRO
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 font-medium block">Telefone:</span>
                        {selectedOrder.phone ? (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-900 hover:text-amber-950 hover:underline font-bold flex items-center gap-1.5 mt-0.5"
                          >
                            <Phone size={14} />
                            {selectedOrder.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 font-medium">Não informado</span>
                        )}
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 font-medium block">Aniversário:</span>
                        <span className="font-bold text-gray-800 mt-0.5 block">
                          {selectedOrder.birthday || 'Não informado'}
                        </span>
                      </div>

                      {selectedOrder.email && (
                        <div className="sm:col-span-2">
                          <span className="text-xs text-gray-500 font-medium block">E-mail:</span>
                          <span className="font-medium text-gray-800 mt-0.5 block">
                            {selectedOrder.email}
                          </span>
                        </div>
                      )}

                      {selectedOrder.observation && (
                        <div className="sm:col-span-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Observações do Cliente:</span>
                          <p className="text-xs text-amber-900 font-medium mt-1">
                            {selectedOrder.observation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items Section */}
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <span className="text-[11px] font-extrabold tracking-[0.25em] text-gray-900 uppercase font-sans">
                      ITENS DO PEDIDO
                    </span>
                    <div className="divide-y divide-gray-100 space-y-2">
                      {selectedOrder.items?.map((item, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-sm">
                          <div className="space-y-0.5">
                            <p className="font-bold text-gray-900">
                              {item.quantity}x {item.title} {item.price ? `- ${formatCurrency(item.price)} (cada)` : ''}
                            </p>
                            {item.selectedSize && (
                              <p className="text-xs text-gray-500">Tamanho: {item.selectedSize.name}</p>
                            )}
                            {item.mealOptions?.sides && item.mealOptions.sides.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Acompanhamentos: {item.mealOptions.sides.map(s => s.name).join(', ')}
                              </p>
                            )}
                            {item.cakeOptions && (
                              <p className="text-xs text-gray-500">
                                Bolo: {item.cakeOptions.size || ''} {item.cakeOptions.dough ? `• Massa: ${item.cakeOptions.dough}` : ''}
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-gray-900 shrink-0">
                            {formatCurrency((item.price || 0) * (item.quantity || 1))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="space-y-1.5 border-t border-gray-200 pt-4">
                    {selectedOrder.subtotal !== undefined && selectedOrder.subtotal > 0 && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                    )}
                    {selectedOrder.taxAmount !== undefined && selectedOrder.taxAmount > 0 && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Impostos ({selectedOrder.taxRate || 8.25}%):</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg sm:text-xl font-extrabold text-gray-900 pt-2 border-t border-gray-100">
                      <span>Total Geral:</span>
                      <span className="text-gray-900">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Reenviar pelo WhatsApp com cor da marca */}
                    <button
                      type="button"
                      onClick={() => sendOrderToWhatsApp(selectedOrder, settings)}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                      style={{ 
                        backgroundColor: settings?.primaryColor || '#424733',
                        color: getContrastText(settings?.primaryColor || '#424733')
                      }}
                      title="Reenviar resumo completo do pedido pelo WhatsApp"
                    >
                      <MessageCircle size={16} /> Reenviar no Whats
                    </button>

                    {/* Editar Pedido */}
                    <button
                      type="button"
                      onClick={() => {
                        const ord = selectedOrder;
                        setSelectedOrder(null);
                        if (onEditOrder) {
                          onEditOrder(ord);
                        } else if (onSelectOrderInList) {
                          onSelectOrderInList(ord.id);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                      title="Editar itens, valores e informações do pedido"
                    >
                      <Edit2 size={16} /> Editar Pedido
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const id = selectedOrder.id;
                        setSelectedOrder(null);
                        if (onSelectOrderInList) {
                          onSelectOrderInList(id);
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Search size={15} /> Ver na Lista
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onPrintOrder) {
                          onPrintOrder(selectedOrder);
                        } else {
                          window.print();
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Printer size={15} /> Imprimir Comanda
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="px-3.5 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                    >
                      Fechar
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
