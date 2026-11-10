const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
});

const date = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatMoney(amount: number): string {
  return money.format(amount);
}

export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}
