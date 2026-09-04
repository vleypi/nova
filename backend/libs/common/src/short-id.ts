import { customAlphabet } from 'nanoid';

export const generateShortId = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  12,
);
