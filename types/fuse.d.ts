declare module 'fuse.js' {
  interface FuseOptions<T> {
    keys?: string[];
    threshold?: number;
    includeScore?: boolean;
    minMatchCharLength?: number;
  }

  interface FuseResult<T> {
    item: T;
    score?: number;
  }

  export default class Fuse<T> {
    constructor(list: T[], options?: FuseOptions<T>);
    search(query: string): FuseResult<T>[];
  }
}
