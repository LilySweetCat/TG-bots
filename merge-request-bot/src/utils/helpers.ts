import dotenv from 'dotenv';
dotenv.config();
import moment from 'moment-timezone';

moment.locale('ru'); // Устанавливаем локаль на русский
import fs from 'fs';
import path from 'path';
import jiraInstance from '../clients/jiraInstance.js';

export const timeZone = process.env.TZ || 'UTC';

export const checkMr = (ctx) => ctx.message?.text?.toLowerCase()?.includes('merge_requests');

// Функция для случайного выбора N элементов из массива
export const getRandomElements = <T>(array: T[], count: number) => {
  count = Math.min(Math.max(0, count), array.length);
  const selectedElements: T[] = [];
  const selectedIndexes = new Set();

  while (selectedElements.length < count) {
    const randomIndex = Math.floor(Math.random() * array.length);

    if (!selectedIndexes.has(randomIndex)) {
      selectedElements.push(array[randomIndex]);
      selectedIndexes.add(randomIndex);
    }
  }

  return selectedElements;
};

// Функция для определения текущего времени у пользователя
export const getUserCurrentTime = (ctx) => {
  // Время отправки сообщения в Unix формате (в секундах)
  const messageTimeUnix = ctx.message.date;

  // Текущее время на сервере в Unix формате (в секундах)
  const serverTimeUnix = Math.floor(Date.now() / 1000);

  // Разница во времени между сервером и пользователем в секундах
  const timeDifferenceInSeconds = serverTimeUnix - messageTimeUnix;

  // Предполагаемое текущее время у пользователя
  const userCurrentTime = moment().subtract(timeDifferenceInSeconds, 'seconds');

  return userCurrentTime;
};

// Функция для определения времени суток и возвращения соответствующего сообщения
export const getUserTimeMessage = (ctx) => {
  const userCurrentTime = getUserCurrentTime(ctx);
  const hour = parseInt(userCurrentTime.format('HH'), 10);

  let timeOfDayMessage;

  if (hour === 0) {
    timeOfDayMessage = 'У тебя полночь';
  } else if (hour >= 1 && hour <= 4) {
    timeOfDayMessage = `У тебя ${hour} ${hour === 1 ? 'час' : 'часа'} ночи`;
  } else if (hour >= 5 && hour < 12) {
    timeOfDayMessage = `У тебя ${hour} часов ночи`;
  } else if (hour >= 12 && hour < 18) {
    timeOfDayMessage = `У тебя ${hour} часов дня`;
  } else if (hour >= 18 && hour < 23) {
    timeOfDayMessage = `У тебя ${hour} ${hour === 1 ? 'час' : hour >= 2 && hour <= 4 ? 'часа' : 'часов'} вечера`;
  } else if (hour === 23) {
    timeOfDayMessage = 'У тебя 23 часа вечера';
  }

  return timeOfDayMessage + '. ';
};

export const formatDate = (dateText) => moment(dateText).format('DD MMMM YYYY');

export const formatDateTime = (date) => {
  return moment(date).tz(timeZone).format('DD MMMM YYYY в HH:mm');
};

export const isChatNotTeam = (ctx, teamChatId) => {
  return ctx.chat.id.toString() !== teamChatId.toString();
};

export const extractTaskFromTitle = (title) => {
  // Используем регулярное выражение для извлечения начальных букв + цифр после "-"
  const match = title.match(/[A-Z]+-\d+/i); // [A-Z]+ для букв до "-", \d+ для цифр после
  return match ? match[0] : null;
};

const getIssueType = (issueTypeId) => {
  if (issueTypeId === '1') {
    return '\n🚨☠Внимание Блокер☠🚨\nПросьба посмотреть оперативно!\n';
  } else if (issueTypeId === '2') {
    return '\n🚨☠Внимание Крит☠🚨\nПросьба посмотреть оперативно!\n';
  }

  return null;
};

export const extractJiraData = (issue) => {
  const jiraData = issue?.fields?.parent?.fields;

  if (!jiraData) return null;

  return {
    isIssue: jiraData.issuetype?.id === '10004',
    priority: getIssueType(jiraData.priority?.id),
  };
};

// Проверяет, что "бот" является отдельным словом с границами слова (пробелы, знаки препинания, начало или конец строки).
export const botRegex = /\bбот\b|бот(?=\s|$)|(?<=\s|^)бот/i;
