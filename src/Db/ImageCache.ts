export class ImageCache {
  name: string;
  guid: string;
  _cache: Promise<Cache> | null = null;
  constructor({ guid, name }: { guid: string; name: string }) {
    this.guid = guid;
    this.name = name;
  }
  private getCacheId = () => `${this.guid}/${this.name}`;
  static getCacheId(id: string) {
    return `${id}/${this.name}`;
  }
  static getCache(id: string) {
    return caches.open(this.getCacheId(id));
  }
  getCache() {
    return (this._cache ??= ImageCache.getCache(this.getCacheId()));
  }
  delete = async () => {
    await caches.delete(this.getCacheId());
  };
}
