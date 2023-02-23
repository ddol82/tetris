import Block from './blocks.js'
import Queue from './queue.js'
import Controller from './controller.js'

export default class Tetris {
    constructor() {
        //board
        this.height = 20;
        this.width = 10;
        //block
        this.blockData = [];
        this.blockBag = [];
        this.currBlock = undefined;
        this.currBlockX = 0;
        this.currBlockY = 0;
        this.currBlockLandStatus = false;
        this.currBlockLandCount = 500;
        this.currBlockLandForce = 15;
        this.shadowBlock = undefined;
        this.shadowBlockY = 0;
        this.shadowBlockLandStatus = false;
        this.nextBlockList = new Queue();
        this.holdBeforeType = -1;
        this.holdBlockType = -1;
        this.canHoldStatus = true;
        this.keyHoldableStatus = true;
        this.keyRotatableCWStatus = true;
        this.keyRotatableCCWStatus = true;
        this.keyHardDropableStatus = true;
        //level
        this.level = 0;
        this.speed = 1000000;
        this.remain = 1000000;
        this.progressStatus = false;
        //controller
        this.controller = new Controller();
        //controller - movement
        setInterval(() => {
            if(!this.progressStatus) return;
            if(this.controller.keyLeftCheck) {
                this.move('left');
                this.debugLogging('left');
            } else if(this.controller.keyRightCheck) {
                this.move('right');
                this.debugLogging('right');
            }
            if(this.controller.keyDownCheck) {
                this.remain = this.speed;
                this.move('down');
                this.debugLogging('down');
            }
        }, 66);
        //controller - toggle
        setInterval(() => {
            if(!this.progressStatus) return;
            if(this.keyRotatableCCWStatus && this.controller.keyZCheck) {
                this.rotate('CCW');
                this.debugLogging('rotate CCW');
                this.keyRotatableCCWStatus = false;
            }
            if(this.keyRotatableCWStatus && this.controller.keyXCheck) {
                this.rotate('CW');
                this.debugLogging('rotate CW');
                this.keyRotatableCWStatus = false;
            }
            if(this.keyHoldableStatus && this.controller.keyShiftCheck) {
                this.hold();
                this.debugLogging('hold attempting');
                this.keyHoldableStatus = false;
            }
            if(this.keyHardDropableStatus && this.controller.keySpaceCheck) {
                this.hardDrop();
                this.debugLogging('hard drop attempting');
                this.keyHardDropableStatus = false;
            }
            if(!this.controller.keyZCheck) this.keyRotatableCCWStatus = true;
            if(!this.controller.keyXCheck) this.keyRotatableCWStatus = true;
            if(!this.controller.keyShiftCheck) this.keyHoldableStatus = true;
            if(!this.controller.keySpaceCheck) this.keyHardDropableStatus = true;
        }, 10);
        //controller - auto drop control
        setInterval(() => {
            this.remain -= 10;
            if(this.remain <= 0) {
                this.remain = this.speed;
                this.move('down');
                this.debugLogging('drop');
            }
            if(this.currBlockLandStatus) {
                this.currBlockLandCount -= 10;
                if(this.currBlockLandStatus &&
                    (this.currBlockLandCount <= 0 ||
                    this.currBlockLandForce <= 0)) {
                    this.drop();
                }
            }
        }, 10);
    }

    init() {
        this.initBlockData();
        this.renderBoard();
        this.initNext();
        this.initHold();
    }

    start() {
        if(this.progressStatus) return;
        this.init();
        this.nextBlockList = new Queue();
        this.blockBag = [];
        for(let i = 0; i < 5; i++) {
            this.createNextBlock();
        }
        this.progressStatus = true;
        this.setLevel(1);
        this.remain = this.speed;
        this.pollBlock(0, false);
        this.move('');
    }

    move(dir) {
        let allow = true;
        switch(dir) {
            case 'left' :
                this.currBlock.data.map(v => {
                    const dataX = this.currBlockX + v[1] - 1;
                    const dataY = this.currBlockY + v[0];
                    if(dataX < 0) {allow = false; return;}
                    if(this.blockData[dataY][dataX] !== -1) {allow = false; return;}
                });
                if(!allow) break;
                this.currBlockX -= 1;
                this.currBlockLandCount = 500;
                this.renderCurrBlock();
                break;
            case 'right' :
                this.currBlock.data.map(v => {
                    const dataX = this.currBlockX + v[1] + 1;
                    const dataY = this.currBlockY + v[0];
                    if(dataX > 9) {allow = false; return;};
                    if(this.blockData[dataY][dataX] !== -1) {allow = false; return;};
                });
                if(!allow) break;
                this.currBlockX += 1;
                this.currBlockLandCount = 500;
                this.renderCurrBlock();
                break;
            case 'down' :
                if(this.currBlockLandStatus) break;
                this.currBlockY -= 1;
                this.renderCurrBlock();
                break;
        }
        this.landCheck();
        this.currBlockLandCount = 500;
        if(this.currBlockLandStatus) this.currBlockLandForce -= 1;
    }

    rotate(dir) {
        const resultBlock = this.currBlock.clone();
        let placable = false;
        switch(dir) {
            case 'CW' : resultBlock.rotateCW(); break;
            case 'CCW' : resultBlock.rotateCCW();
        }
        let resultX = this.currBlockX;
        let resultY = this.currBlockY;
        console.log(resultBlock);
        resultBlock.data.map(v => {
            let dataX = resultX + v[1];
            let dataY = resultY + v[0];
            while(dataX < 0) {
                resultX += 1;
                dataX = resultX + v[1];
            }
            while(dataX > 9) {
                resultX -= 1;
                dataX = resultX + v[1];
            }
            while(dataY < 0) {
                resultY += 1;
                dataY = resultY + v[0];
            }
            if(this.blockData[dataY][dataX] !== -1) {allow = false; return;}
            placable = true;
        });
        if(!placable) return;
        this.currBlockLandCount = 500;
        if(this.currBlockLandStatus) this.currBlockLandForce -= 1;
        this.currBlockX = resultX;
        this.currBlockY = resultY;
        this.currBlock = resultBlock.clone();
        this.landCheck();
        this.renderCurrBlock();
    }

    hold() {
        if(this.canHoldStatus) {
            this.canHoldStatus = false;
            this.holdBeforeType = this.holdBlockType;
            this.holdBlockType = this.currBlock.type;
            this.renderHoldBlock();
            this.pollBlock(0, this.holdBeforeType !== -1);
        }
    }

    drop() {
        this.landCheck();
        if(!this.currBlockLandStatus) return;
        this.currBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.currBlockY + v[0];
            this.blockData[dataY][dataX] = this.currBlock.type;
        });
        this.canHoldStatus = true;
        this.currBlockLandCount = 500;
        this.currBlockLandForce = 15;
        this.renderBoard();
        this.pollBlock(0, false);
        this.move('');
    }

    hardDrop() {
        this.landCheck();
        while(!this.currBlockLandStatus) {
            this.currBlockY -= 1;
            this.landCheck();
        }
        this.drop();
    }

    gameOver() {
        this.progressStatus = false;
        this.remain = 10000000;
    }

    landCheck() {
        let landCheckStatus = false;
        this.currBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.currBlockY + v[0] - 1;
            if(dataY < 0) {landCheckStatus = true; return;};
            if(this.blockData[dataY][dataX] !== -1) {landCheckStatus = true; return;};
        });
        this.currBlockLandStatus = landCheckStatus;
    }

    landShadowCheck() {
        let landCheckStatus = false;
        this.shadowBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.shadowBlockY + v[0] - 1;
            if(dataY < 0) {landCheckStatus = true; return;};
            if(this.blockData[dataY][dataX] !== -1) {landCheckStatus = true; return;};
        });
        this.shadowBlockLandStatus = landCheckStatus;
    }

    pollBlock(correction, isHoldback) {
        if(!this.progressStatus) return;
        if((correction === 2 && this.currBlock.type === 3) || correction === 3) {
            this.gameOver();
            return;
        }
        if(isHoldback) {
            this.currBlock = new Block(this.holdBeforeType);
        } else {
            if(correction === 0) {
                this.currBlock = new Block(this.nextBlockList.poll());
            }
        }
        
        this.currBlockX = 3;
        this.currBlockY = 19 + (this.currBlock.type === 3) + correction;

        let crashCheck = false;
        this.currBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.currBlockY + v[0];
            if(this.blockData[dataY][dataX] !== -1) {
                this.pollBlock(correction + 1, isHoldback);
                crashCheck = true;
            }
        });
        if(crashCheck) return;

        this.renderCurrBlock();
        if(!isHoldback) this.createNextBlock();
    }

    initBlockData() {
        this.blockData = [...Array(23)].map(_=>[...Array(10)].map(v=>-1));
    }

    initNext() {
        this.nextBlockList.clear();
        const next = document.querySelector('.next-container');
        const tmp = [];
        for(let i = 0; i < 5; i++) {
            tmp.push(`<div class="next b${i}"></div>`);
        }
        next.innerHTML = tmp.join``;
    }

    initHold() {
        const next = document.querySelector('.hold-container');
        next.innerHTML = '<div class="hold"></div>';
        this.holdBlockType = -1;
        this.canHoldStatus = true;
        this.renderHoldBlock();
    }

    createNextBlock() {
        if(this.blockBag.length == 0) this.blockBag = this.blockBag.concat(this.createBlockBag());
        this.debugLogging(`type ${this.blockBag[0]} added.`);
        this.nextBlockList.offer(this.blockBag[0]);
        this.blockBag = this.blockBag.filter((_,i) => i !== 0);
        this.renderNextBlockList();
    }

    createBlockBag() {
        let arr = [...Array(7)].map((_,i) => i)
        let result = [];
        while(arr.length > 0) {
            const ranNum = ~~(Math.random()*arr.length);
            result.push(arr[ranNum]);
            arr = arr.filter((_,i) => i !== ranNum);
        }
        return result;
    }

    createShadowBlock() {
        this.shadowBlock = this.currBlock.clone();
        this.shadowBlockY = this.currBlockY;
        this.landShadowCheck();
        while(!this.shadowBlockLandStatus) {
            this.shadowBlockY -= 1;
            this.landShadowCheck();
        }
    }

    renderNextBlockList() {
        if(this.nextBlockList.size === 0) return;
        let idx = 0;
        this.nextBlockList.data.forEach(v => {
            const next = document.querySelector(`.b${idx}`);
            const block = new Block(v);
            const tmp = [];
            idx++;

            tmp.push('<table>');
            tmp.push('<tbody>');
            for(let j = 3; j >= 2; j--) {
                tmp.push('<tr>');
                for(let k = 3; k >= 0; k--) {
                    tmp.push(`<td${(block.rowData&(1<<((4*j)+k))) > 0 ? (" class=t"+v) : ""}></td$>`);
                }
                tmp.push('</tr>');
            }
            tmp.push('</tbody>');
            tmp.push('</table>');
            next.innerHTML = tmp.join``;
        })
    }

    renderHoldBlock() {
        if(this.holdBlockType === -1) return;
        const hold = document.querySelector(`.hold`);
        const block = new Block(this.holdBlockType);
        this.debugLogging(block);
        const tmp = [];

        tmp.push('<table>');
        tmp.push('<tbody>');
        for(let j = 3; j >= 2; j--) {
            tmp.push('<tr>');
            for(let k = 3; k >= 0; k--) {
                tmp.push(`<td${(block.rowData&(1<<((4*j)+k))) > 0  ? (" class=t" + this.holdBlockType) : ""}></td$>`);
            }
            tmp.push('</tr>');
        }
        tmp.push('</tbody>');
        tmp.push('</table>');
        hold.innerHTML = tmp.join``;
    }
    
    renderBoard() {
        const stage = document.querySelector('.stage');
        const board = [];
        for(let i = 0; i <= this.height; i++) {
            board.push('<tr>');
            for(let j = 0; j < this.width; j++) {
                board.push(`<td class="${i===0 ? "bd-top" : ""} bd${this.blockData[this.height - i][j]}"></td>`);
            }
            board.push('</tr>');
        }
        stage.innerHTML = board.join``;
    }

    renderCurrBlock() {
        this.createShadowBlock();
        this.shadowBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.shadowBlockY + v[0];
            this.blockData[dataY][dataX] = -2;
        });
        this.currBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.currBlockY + v[0];
            this.blockData[dataY][dataX] = this.currBlock.type;
        });
        this.renderBoard();
        this.shadowBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.shadowBlockY + v[0];
            this.blockData[dataY][dataX] = -1;
        });
        this.currBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.currBlockY + v[0];
            this.blockData[dataY][dataX] = -1;
        });
    }

    setLevel(value) {
        this.level = value;
        this.speed = Math.max(1000 - (this.level - 1) * 50, 50);
    }

    debugLogging(msg) {
        console.log(msg);
    }
}