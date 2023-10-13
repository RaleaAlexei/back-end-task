import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const saltRounds = 10;
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err)
        return reject(err);
      resolve(hash);
    });
  });

}
export async function checkPassword(password: string, passwordHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, passwordHash, (err: any, same: boolean) => {
      if (err)
        return reject(err);
      resolve(same);
    });
  });
}
const secretToken = process.env.TOKEN_SECRET as string;
export function generateToken(data: TokenData): string {
  return jwt.sign(data, secretToken, { expiresIn: '1800s' });
}

export function isValidToken(token: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretToken, (err: any, user: any) => {
      if (err){
        return resolve(false);
      }
      resolve(true);
    });
  });
}

export async function extraDataFromToken(token: string): Promise<TokenData> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretToken, (err: any, user: any) => {
      if (err)
        return reject(err);
      resolve(user as TokenData);
    });
  });
}
const usernameRegex = /[A-z0-9_.]/g;
const usernameMaxCharacters = 15;
const usernameMinCharacters = 6;
export function sanitizeUsername(username: string | any): boolean {
  if (typeof username !== 'string')
    return false;
  if (username.length < usernameMinCharacters || username.length > usernameMaxCharacters)
    return false;
  return usernameRegex.test(username);
}
const emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
export function sanitizeEmail(email: string | any): boolean {
  if (typeof email !== 'string')
    return false;
  const emailParts = email.split('@');
  if (emailParts.length !== 2)
    return false;
  const account = emailParts[0];
  if (account.length > 64)
    return false;
  const address = emailParts[1];
  if (address.length > 255)
    return false;
  return emailRegex.test(email);
}
const passwordMinLength = 8,
  passwordMaxLength = 128;
export function sanitizePassword(password: string | any): boolean {
  if (typeof password !== 'string')
    return false;
  if (password.length < passwordMinLength || password.length > passwordMaxLength)
    return false;
  return true;
}
export interface TokenData {
  id: number;
}