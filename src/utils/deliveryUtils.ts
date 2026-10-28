import { Settings, DeliveryRange } from '../types';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface DistanceResult {
  distanceKm: number;
  isEstimate: boolean;
}

export interface DeliveryCalculation {
  fee: number;
  isFree: boolean;
  isBeyondMax: boolean;
  distanceKm: number;
  matchedRange?: DeliveryRange;
  isEstimate: boolean;
}

/**
 * Consulta Código Postal / CEP para Portugal (7 ou 4 dígitos) e Brasil (8 dígitos)
 */
export async function fetchPostalCode(rawCode: string): Promise<{
  formatted: string;
  street?: string;
  bairro?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  country: 'Portugal' | 'Brasil';
} | null> {
  const clean = (rawCode || '').replace(/\D/g, '');
  if (!clean) return null;

  // 1. Portugal: 7 dígitos (ex: 4405570 -> 4405-570) ou 4 dígitos (ex: 4405)
  if (clean.length === 7 || clean.length === 4) {
    const formatted = clean.length === 7 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`https://json.geoapi.pt/cp/${formatted}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data) {
          // Concelho / Município (ex: Vila Nova de Gaia)
          const city = (typeof data.Concelho === 'string' && data.Concelho.trim()) ||
                       (typeof data.municipio === 'string' && data.municipio.trim()) ||
                       '';

          // Distrito (ex: Porto)
          const state = (typeof data.Distrito === 'string' && data.Distrito.trim()) ||
                        (typeof data.distrito === 'string' && data.distrito.trim()) ||
                        '';

          // Bairro / Freguesia / Localidade (ex: Valadares, Canelas, Arcozelo)
          let bairro = '';
          if (typeof data.Localidade === 'string' && data.Localidade.trim()) {
            bairro = data.Localidade.trim();
          } else if (Array.isArray(data.Localidade) && data.Localidade.length > 0) {
            bairro = String(data.Localidade[0]).trim();
          } else if (typeof data.freguesia === 'string' && data.freguesia.trim()) {
            bairro = data.freguesia.trim();
          } else if (Array.isArray(data.partes) && data.partes.length > 0 && data.partes[0].Local) {
            bairro = String(data.partes[0].Local).trim();
          }

          // Se a localidade retornada for igual ao concelho (ex: "Vila Nova de Gaia"),
          // mas em 'partes' houver um Local específico (ex: "Valadares"), usa o Local específico para o bairro!
          if (city && bairro.toLowerCase() === city.toLowerCase() && Array.isArray(data.partes)) {
            const specific = data.partes.find((p: any) => p.Local && p.Local.toLowerCase() !== city.toLowerCase());
            if (specific && specific.Local) {
              bairro = specific.Local.trim();
            }
          }

          // Se bairro ainda for vazio, tentar Designação Postal
          if (!bairro && typeof data['Designação Postal'] === 'string') {
            bairro = data['Designação Postal'].trim();
          }

          // Rua (se houver uma única artéria identificada neste código postal)
          let street = '';
          if (Array.isArray(data.partes) && data.partes.length > 0) {
            const arterias = Array.from(new Set(data.partes.map((p: any) => p.Artéria).filter(Boolean)));
            if (arterias.length === 1 && typeof arterias[0] === 'string') {
              street = arterias[0].trim();
            }
          } else if (Array.isArray(data.ruas) && data.ruas.length === 1 && typeof data.ruas[0] === 'string') {
            street = data.ruas[0].trim();
          }

          // Coordenadas geográficas exatas [lat, lng]
          let lat: number | undefined;
          let lng: number | undefined;
          const coords = data.centroide || data.centro || data.centroDeMassa;
          if (Array.isArray(coords) && coords.length >= 2) {
            const parsedLat = parseFloat(coords[0]);
            const parsedLng = parseFloat(coords[1]);
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
              lat = parsedLat;
              lng = parsedLng;
            }
          }

          return {
            formatted: clean.length === 7 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean,
            street: street || undefined,
            bairro: bairro || undefined,
            city: city || undefined,
            state: state || undefined,
            lat,
            lng,
            country: 'Portugal'
          };
        }
      }
    } catch (err) {
      console.warn('geoapi.pt Portugal postal code query failed:', err);
    }

    // Fallback Portugal via Nominatim com restrição countrycodes=pt
    try {
      const geo = await geocodeAddress({ cep: formatted, country: 'Portugal' });
      if (geo) {
        return {
          formatted,
          lat: geo.lat,
          lng: geo.lng,
          country: 'Portugal'
        };
      }
    } catch (err) {
      console.warn('OSM Portugal postal code query failed:', err);
    }
  }

  // 2. Brasil: 8 dígitos (ex: 01310100 -> 01310-100)
  if (clean.length === 8) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (!data.erro) {
          return {
            formatted: `${clean.slice(0, 5)}-${clean.slice(5)}`,
            street: data.logradouro || '',
            bairro: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
            country: 'Brasil'
          };
        }
      }
    } catch (err) {
      console.warn('ViaCEP request failed:', err);
    }
  }

  return null;
}

/**
 * Consulta CEP gratuitamente via ViaCEP (compatibilidade)
 */
export async function fetchViaCep(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
} | null> {
  const result = await fetchPostalCode(cep);
  if (result && result.country === 'Brasil') {
    return {
      logradouro: result.street || '',
      bairro: result.bairro || '',
      localidade: result.city || '',
      uf: result.state || ''
    };
  }
  return null;
}

/**
 * Geocodifica um endereço usando geoapi.pt e OpenStreetMap / Nominatim (100% gratuito)
 * com restrição estrita de país para evitar rotas incorretas.
 */
export async function geocodeAddress(params: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  country?: string;
}): Promise<GeocodeResult | null> {
  const { street, number, neighborhood, city, state, cep, country } = params;
  const cleanCep = (cep || '').replace(/\D/g, '');

  const isPortugal = 
    country === 'Portugal' || 
    cleanCep.length === 7 || 
    cleanCep.length === 4 ||
    (state && ['Porto', 'Lisboa', 'Braga', 'Aveiro', 'Coimbra', 'Faro', 'Setúbal', 'Leiria', 'Viseu', 'Viana do Castelo', 'Vila Real'].some(d => state.toLowerCase().includes(d.toLowerCase())));

  const isBrasil = !isPortugal && (country === 'Brasil' || cleanCep.length === 8);

  // 1. Se tiver Código Postal de Portugal, consulta geoapi.pt primeiro (coordenadas centroide exatas)
  if (isPortugal && (cleanCep.length === 7 || cleanCep.length === 4)) {
    try {
      const postalInfo = await fetchPostalCode(cleanCep);
      if (postalInfo && postalInfo.lat && postalInfo.lng) {
        // Se o usuário não digitou rua, as coordenadas do código postal já são perfeitas!
        if (!street || !street.trim()) {
          return {
            lat: postalInfo.lat,
            lng: postalInfo.lng,
            displayName: `${postalInfo.formatted}, ${postalInfo.bairro || neighborhood || ''}, ${postalInfo.city || city || ''}, Portugal`
          };
        }

        // Se digitou rua, tenta refinar com a rua no Nominatim restrito a Portugal
        const streetQuery = `${street}${number ? ` ${number}` : ''}, ${postalInfo.bairro || neighborhood || ''}, ${postalInfo.city || city || ''}`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(streetQuery)}&countrycodes=pt&limit=1&addressdetails=1`;
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'EasyMenuDelivery/1.0'
            }
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const results = await response.json();
            if (Array.isArray(results) && results.length > 0) {
              const item = results[0];
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng, displayName: item.display_name };
              }
            }
          }
        } catch (e) {
          // Fallback para as coordenadas do código postal
        }

        // Fallback seguro: usa as coordenadas exatas do código postal
        return {
          lat: postalInfo.lat,
          lng: postalInfo.lng,
          displayName: `${street ? `${street}, ` : ''}${postalInfo.formatted}, ${postalInfo.bairro || neighborhood || ''}, ${postalInfo.city || city || ''}, Portugal`
        };
      }
    } catch (e) {
      console.warn('Postal geocoding failed, trying Nominatim fallback:', e);
    }
  }

  // 2. Construir consultas estruturadas para o Nominatim
  const queries: string[] = [];
  const countryParam = isPortugal ? '&countrycodes=pt' : (isBrasil ? '&countrycodes=br' : '');
  const countryName = isPortugal ? 'Portugal' : (isBrasil ? 'Brasil' : (country || ''));

  const streetPart = street ? (number && !street.includes(number) ? `${street}, ${number}` : street) : '';
  const areaParts = [neighborhood, city, state].filter(Boolean);
  const areaPart = areaParts.join(', ');

  if (streetPart && areaPart) {
    queries.push(`${streetPart}, ${areaPart}`);
    if (countryName) queries.push(`${streetPart}, ${areaPart}, ${countryName}`);
  }
  if (street && city) {
    queries.push(`${street}, ${neighborhood ? `${neighborhood}, ` : ''}${city}`);
    if (countryName) queries.push(`${street}, ${city}, ${countryName}`);
  }
  if (neighborhood && city) {
    queries.push(`${neighborhood}, ${city}`);
    if (countryName) queries.push(`${neighborhood}, ${city}, ${countryName}`);
  }
  if (cep && (city || state)) {
    queries.push(`${cleanCep.length === 7 ? `${cleanCep.slice(0, 4)}-${cleanCep.slice(4)}` : cep} ${city || ''}`);
  }
  if (street) {
    queries.push(street);
    if (countryName) queries.push(`${street}, ${countryName}`);
  }
  if (city) {
    queries.push(city);
    if (countryName) queries.push(`${city}, ${countryName}`);
  }

  // Tenta as queries em sequência no Nominatim com countrycodes correto
  for (const q of queries) {
    try {
      const cleanQ = q.trim();
      if (!cleanQ) continue;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}${countryParam}&limit=1&addressdetails=1`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EasyMenuDelivery/1.0'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          const item = results[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            return {
              lat,
              lng,
              displayName: item.display_name
            };
          }
        }
      }
    } catch (e) {
      console.warn(`Nominatim query "${q}" failed:`, e);
    }
  }

  return null;
}

/**
 * Calcula distância entre dois pontos (em km)
 * Usa OSRM (Open Source Routing Machine) para distância real de tráfego,
 * com fallback matemático via fórmula Haversine + fator viário urbano (1.25x).
 */
export async function calculateDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DistanceResult> {
  // 1. Tentar rota viária real via OSRM (Gratuito)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const meters = data.routes[0].distance;
        if (typeof meters === 'number' && meters > 0) {
          const km = parseFloat((meters / 1000).toFixed(1));
          return {
            distanceKm: km < 0.1 ? 0.1 : km,
            isEstimate: false
          };
        }
      }
    }
  } catch (err) {
    console.warn('OSRM routing request failed, falling back to Haversine calculation:', err);
  }

  // 2. Fallback: Fórmula de Haversine com fator urbano (1.25x)
  const R = 6371; // Raio da Terra em km
  const dLat = (destLat - originLat) * (Math.PI / 180);
  const dLon = (destLng - originLng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originLat * (Math.PI / 180)) *
      Math.cos(destLat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const haversineKm = R * c;
  // Fator de rota urbana de 1.25 para aproximar trajeto de rua
  const estimatedKm = parseFloat((haversineKm * 1.25).toFixed(1));

  return {
    distanceKm: estimatedKm < 0.1 ? 0.1 : estimatedKm,
    isEstimate: true
  };
}

/**
 * Calcula o valor da taxa de entrega baseado nas faixas de km configuradas no admin
 */
export function calculateDeliveryFee(
  distanceKm: number,
  settings: Settings,
  subtotal: number,
  isEstimate: boolean = false
): DeliveryCalculation {
  // Verifica frete grátis por valor do pedido
  if (
    settings.deliveryFreeAbove &&
    settings.deliveryFreeAbove > 0 &&
    subtotal >= settings.deliveryFreeAbove
  ) {
    return {
      fee: 0,
      isFree: true,
      isBeyondMax: false,
      distanceKm,
      isEstimate
    };
  }

  const ranges = (settings.deliveryRanges || []).slice().sort((a, b) => a.maxKm - b.maxKm);

  // Sem faixas configuradas, usar fallback
  if (ranges.length === 0) {
    return {
      fee: settings.deliveryFallbackPrice || 0,
      isFree: (settings.deliveryFallbackPrice || 0) === 0,
      isBeyondMax: false,
      distanceKm,
      isEstimate
    };
  }

  // Procura a primeira faixa cujo maxKm seja maior ou igual à distância
  const matched = ranges.find(r => distanceKm <= r.maxKm);
  if (matched) {
    return {
      fee: matched.price,
      isFree: matched.price === 0,
      isBeyondMax: false,
      distanceKm,
      matchedRange: matched,
      isEstimate
    };
  }

  // Excedeu a maior faixa cadastrada
  const highestRange = ranges[ranges.length - 1];
  const maxAllowedKm = settings.deliveryMaxKm || highestRange.maxKm;

  if (settings.deliveryMaxKm && distanceKm > settings.deliveryMaxKm) {
    // Ultrapassou o raio máximo permitido
    return {
      fee: highestRange.price,
      isFree: false,
      isBeyondMax: true,
      distanceKm,
      matchedRange: highestRange,
      isEstimate
    };
  }

  // Se tiver preço por KM adicional
  if (settings.deliveryPricePerKmExtra && settings.deliveryPricePerKmExtra > 0) {
    const extraKm = Math.ceil(distanceKm - highestRange.maxKm);
    const extraFee = extraKm * settings.deliveryPricePerKmExtra;
    const finalFee = parseFloat((highestRange.price + extraFee).toFixed(2));
    return {
      fee: finalFee,
      isFree: false,
      isBeyondMax: false,
      distanceKm,
      matchedRange: highestRange,
      isEstimate
    };
  }

  // Se não tiver preço por km adicional nem limite estrito, cobra a última faixa
  return {
    fee: highestRange.price,
    isFree: highestRange.price === 0,
    isBeyondMax: false,
    distanceKm,
    matchedRange: highestRange,
    isEstimate
  };
}
