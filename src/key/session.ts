type PasswordStore = {
  get(chatId: string): string | undefined;
  set(chatId: string, password: string): void;
  delete(chatId: string): void;
  clear(): void;
};

class InMemoryPasswordStore implements PasswordStore {
  private map = new Map<string, string>();
  get(chatId: string) { return this.map.get(chatId); }
  set(chatId: string, password: string) { this.map.set(chatId, password); }
  delete(chatId: string) { this.map.delete(chatId); }
  clear() { this.map.clear(); }
}

export function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

export class ChatSessionPasswords {
  private store: PasswordStore;
  constructor(store?: PasswordStore) { this.store = store ?? new InMemoryPasswordStore(); }
  set(chatId: string, password: string) {
    if (!validatePassword(password)) throw new Error('Invalid password');
    this.store.set(chatId, password);
  }
  get(chatId: string) { return this.store.get(chatId); }
  clear(chatId: string) { this.store.delete(chatId); }
  clearAll() { this.store.clear(); }
}

