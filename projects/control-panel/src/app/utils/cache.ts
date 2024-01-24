export class Cache<T> {
  private cache: { [key: string]: T } = {};

  async getOrCreate(key: string, factory: () => T | Promise<T>): Promise<T> {
    if (!this.cache[key]) {
      const value = await factory();
      this.cache[key] = value;
    }
    return this.cache[key];
  }
}
