export declare class PromiseQueue {
    maxConcurrent: number;
    paused: boolean;
    private queue;
    private pendingPromiseCount;
    constructor(maxConcurrent?: number);
    add<T>(promiseGenerator: () => Promise<T>): Promise<T>;
    pause(): void;
    resume(): void;
    private dequeue;
}
