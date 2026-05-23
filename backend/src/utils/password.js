import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function hash(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function compare(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}
