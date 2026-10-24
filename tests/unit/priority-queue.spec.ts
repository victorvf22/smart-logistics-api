import { PriorityQueue } from '../../src/domain/algorithms/priority-queue';

describe('PriorityQueue (Binary Min-Heap)', () => {
    let pq: PriorityQueue<string>;

    beforeEach(() => {
        pq = new PriorityQueue<string>();
    });

    it('should initialize empty with size 0', () => {
        expect(pq.isEmpty()).toBe(true);
        expect(pq.size()).toBe(0);
        expect(pq.peek()).toBeUndefined();
        expect(pq.dequeue()).toBeUndefined();
    });

    it('should extract elements in ascending numeric priority order', () => {
        pq.enqueue('NodeC', 15);
        pq.enqueue('NodeA', 5);
        pq.enqueue('NodeB', 10);
        pq.enqueue('NodeD', 1);

        expect(pq.isEmpty()).toBe(false);
        expect(pq.size()).toBe(4);
        expect(pq.peek()).toBe('NodeD');

        expect(pq.dequeue()).toBe('NodeD');
        expect(pq.dequeue()).toBe('NodeA');
        expect(pq.dequeue()).toBe('NodeB');
        expect(pq.dequeue()).toBe('NodeC');
        expect(pq.dequeue()).toBeUndefined();
        expect(pq.isEmpty()).toBe(true);
    });

    it('should handle elements with equal priority correctly', () => {
        pq.enqueue('X', 10);
        pq.enqueue('Y', 10);

        const first = pq.dequeue();
        const second = pq.dequeue();

        expect(['X', 'Y']).toContain(first);
        expect(['X', 'Y']).toContain(second);
        expect(pq.isEmpty()).toBe(true);
    });
});
