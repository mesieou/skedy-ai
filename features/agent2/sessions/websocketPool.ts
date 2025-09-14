export class WebSocketPool {
  private apiKeys: string[];
  private counters: number[];

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys;
    this.counters = apiKeys.map(() => 0);
  }

  // Assign the API key with least number of calls to a session
  assign() {
    const minIndex = this.counters.indexOf(Math.min(...this.counters));
    this.counters[minIndex]++;
    return { apiKey: this.apiKeys[minIndex], index: minIndex };
  }

  // Release the API key after a call is completed
  release(index: number) { this.counters[index]--; }
}

export const webSocketPool = new WebSocketPool([process.env.OPENAI_API_KEY!, process.env.OPENAI_API_KEY_2!]);
