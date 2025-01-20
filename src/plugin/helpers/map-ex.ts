export class MapEx<K, V> extends Map<K, V> {
  getOrSet(k: K, create: () => V) {
    let result = this.get(k);
    if (result === undefined) {
      result = create();
      this.set(k, result);
    }
    return result;
  }
}
