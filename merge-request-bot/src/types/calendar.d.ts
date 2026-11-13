declare module 'telegraf-calendar-telegram' {
  import type { InlineKeyboardMarkup } from 'grammy/types';
  interface CalendarOptions {
    startWeekDay?: number;
    weekDayNames?: string[];
    monthNames?: string[];
    minDate?: Date;
  }
  export default class Calendar {
    constructor(bot: unknown, options?: CalendarOptions);
    getCalendar(date?: Date): { reply_markup: InlineKeyboardMarkup };
  }
}
