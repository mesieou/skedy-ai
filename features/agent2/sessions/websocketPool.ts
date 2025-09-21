import assert from "assert";

export class WebSocketPool {
  private apiKeys: string[];
  private counters: number[];

  constructor(apiKeys: string[]) {
    assert(apiKeys && apiKeys.length > 0, 'WebSocketPool: apiKeys array cannot be empty');
    assert(apiKeys.every(key => key && typeof key === 'string'), 'WebSocketPool: all apiKeys must be non-empty strings');
    this.apiKeys = apiKeys;
    this.counters = apiKeys.map(() => 0);
  }

  // Assign the API key with least number of calls to a session
  assign() {
    assert(this.apiKeys.length > 0, 'WebSocketPool.assign: no API keys available');
    const minIndex = this.counters.indexOf(Math.min(...this.counters));
    this.counters[minIndex]++;
    return { apiKey: this.apiKeys[minIndex], index: minIndex };
  }

  // Release the API key after a call is completed
  release(index: number) {
    assert(typeof index === 'number' && index >= 0 && index < this.counters.length, `WebSocketPool.release: invalid index ${index}`);
    assert(this.counters[index] > 0, `WebSocketPool.release: counter for index ${index} is already at zero`);
    this.counters[index]--;
  }
}

export const webSocketPool = new WebSocketPool([process.env.OPENAI_API_KEY!, process.env.OPENAI_API_KEY_2!]);
