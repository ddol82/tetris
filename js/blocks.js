const blockData = [
    [
        [0x4E00, 0x4640, 0x0E40, 0x4C40], // [0]'T' 
        [0x0400, 0x0400, 0x0400, 0x0400]
    ], [
        [0x3600, 0x2310, 0x0360, 0x4620], // [1]'S' 
        [0x0200, 0x0200, 0x0200, 0x0200]
    ], [
        [0xC600, 0x2640, 0x0C60, 0x4C80], // [2]'Z' 
        [0x0400, 0x0400, 0x0400, 0x0400]
    ], [
        [0x0F00, 0x2222, 0x00F0, 0x4444], // [3]'I' 
        [0x0200, 0x0020, 0x0040, 0x0400]
    ], [
        [0x2E00, 0x4460, 0x0E80, 0xC440], // [4]'J' 
        [0x0400, 0x0400, 0x0400, 0x0400]
    ], [
        [0x8E00, 0x6440, 0x0E20, 0x44C0], // [5]'L' 
        [0x0400, 0x0400, 0x0400, 0x0400]
    ], [
        [0x6600, 0x6600, 0x6600, 0x6600], // [6]'O' 
        [0x0400, 0x4000, 0x2000, 0x0200]
    ]
];

/*  block info (CW)
 * note : ! - 1, axis
 *  T 0100 0100 0000 0100    S 0011 0010 0000 0100    Z 1100 0010 0000 0100
 *    1!10 0!10 1!10 1!00      01!0 00!1 00!1 01!0      0!10 0!10 1!00 1!00
 *    0000 0100 0100 0100      0000 0001 0110 0010      0000 0100 0110 1000
 *    0000 0000 0000 0000      0000 0000 0000 0000      0000 0000 0000 0000
 * 
 *  I 0000 0010 0000 0100    J 0010 0100 0000 1100    L 1000 0110 0000 0100
 *    11!1 0010 0000 0!00      1!10 0!00 1!10 0!00      1!10 0!00 1!10 0!00
 *    0000 00!0 1!11 0100      0000 0110 1000 0100      0000 0100 0010 1100
 *    0000 0010 0000 0100      0000 0000 0000 0000      0000 0000 0000 0000
 * 
 *  O 0110 0!10 01!0 0110
 *    0!10 0110 0110 01!0
 *    0000 0000 0000 0000
 *    0000 0000 0000 0000
 */

export default class Block {
    constructor(type) {
        this.type = type;
        this.rotate = 0;
        this.axis = [];
        this.data = (type !== -1) ? this.getData() : [];
        this.rowData = (type !== -1) ? blockData[type][0][0] : 0x0000;
    }

    clone() {
        const newBlock = new Block(-1);
        newBlock.type = this.type;
        newBlock.rotate = this.rotate;
        newBlock.axis = this.axis;
        newBlock.data = this.data;
        newBlock.rowData = this.rowData;
        return newBlock;
    }

    rotateCW() {
        this.rotate = (this.rotate + 1) % 4;
        this.data = this.getData();
        this.rowData = blockData[this.type][0][this.rotate];
    }

    rotateCCW() {
        this.rotate = (this.rotate + 3) % 4;
        this.data = this.getData();
        this.rowData = blockData[this.type][0][this.rotate];
    }

    getData() {
        const tmpData = [];
        let idx = 0;
        for(let i = 0; i < 4; i++) {
            for(let j = 0; j < 4; j++) {
                if((blockData[this.type][0][this.rotate]&(1<<((4*i)+j))) > 0) {
                    tmpData.push([i-3, 3-j]);
                    idx++;
                    if((blockData[this.type][1][this.rotate]&(1<<((4*i)+j))) > 0) {
                        this.axis = [i-3, 3-j];
                    }
                }
            }
        }
        return tmpData;
    }
}