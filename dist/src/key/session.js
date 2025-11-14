class InMemoryPasswordStore {
    constructor() {
        this.map = new Map();
    }
    get(chatId) { return this.map.get(chatId); }
    set(chatId, password) { this.map.set(chatId, password); }
    delete(chatId) { this.map.delete(chatId); }
    clear() { this.map.clear(); }
}
export function validatePassword(password) {
    return typeof password === 'string' && password.length >= 8;
}
export class ChatSessionPasswords {
    constructor(store) { this.store = store ?? new InMemoryPasswordStore(); }
    set(chatId, password) {
        if (!validatePassword(password))
            throw new Error('Invalid password');
        this.store.set(chatId, password);
    }
    get(chatId) { return this.store.get(chatId); }
    clear(chatId) { this.store.delete(chatId); }
    clearAll() { this.store.clear(); }
}
