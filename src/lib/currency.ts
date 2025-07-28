export type Currency = 'USD' | 'EUR' | 'DKK'

export interface CurrencyInfo {
  code: Currency
  symbol: string
  name: string
  locale: string
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-EU'
  },
  DKK: {
    code: 'DKK',
    symbol: 'kr',
    name: 'Danish Krone',
    locale: 'da-DK'
  }
}

export const getCurrencySymbol = (currency: Currency = 'USD'): string => {
  return CURRENCIES[currency].symbol
}

export const formatCurrency = (amount: number, currency: Currency = 'USD'): string => {
  const currencyInfo = CURRENCIES[currency]
  
  // For DKK, format with symbol after the amount
  if (currency === 'DKK') {
    return `${amount.toFixed(2)} ${currencyInfo.symbol}`
  }
  
  // For USD and EUR, format with symbol before the amount
  return `${currencyInfo.symbol}${amount.toFixed(2)}`
}

export const getCurrencyOptions = () => {
  return Object.values(CURRENCIES).map(currency => ({
    value: currency.code,
    label: `${currency.name} (${currency.symbol})`
  }))
}