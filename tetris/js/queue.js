export default class Queue {
    constructor() {
        this.data = [];
        this.front = 0;
        this.rear = 0;
    }

    size() {
        if(this.data[this.rear] === undefined) return 0;
        return this.rear - this.front + 1;
    }

    offer(value) {
        if(this.size() === 0) {
            this.data[0] = value;
        } else {
            this.rear += 1;
            this.data[this.rear] = value;
        }
    }

    peek() {
        return this.data[this.front];
    }

    poll() {
        const result = this.data[this.front];
        delete this.data[this.front];
        if(this.front === this.rear) {
            this.front = 0;
            this.rear = 0;
        } else {
            this.front += 1;
        }
        return result;
    }

    clear() {
        this.data = [];
        this.front = 0;
        this.rear = 0;
    }
}