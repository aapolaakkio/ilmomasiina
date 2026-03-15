import bcrypt from "bcrypt";

export default class AdminPasswordAuth {
  static validateNewPassword(password: string): void {
    if (password.length < 10) {
      throw new Error("Password must be at least 10 characters long");
    }
  }

  static createHash(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  static verifyHash(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }
}
