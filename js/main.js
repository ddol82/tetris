import Block from './blocks.js'
import Queue from './queue.js'
import Controller from './controller.js'

export default class Tetris {
    constructor() {
        //board
        this.ceiling = 44;
        this.height = 20;
        this.width = 10;
        //block
        this.blockData = [];
        this.blockBag = [];
        this.nextBlockList = new Queue();
        //block - curr
        this.currBlock = undefined;
        this.currBlockX = 0;
        this.currBlockY = 0;
        this.currBlockLandStatus = false;
        this.currBlockLandCount = 500;
        this.currBlockLandForce = 15;
        //block - spin
        this.simulationBlock = undefined;
        this.simulationStatus = false;
        this.simulationSpecialStatus = false;
        this.simulationX = 0;
        this.simulationY = 0;
        //block - shadow
        this.shadowBlock = undefined;
        this.shadowBlockY = 0;
        this.shadowBlockLandStatus = false;
        //block - hold
        this.holdBeforeType = -1;
        this.holdBlockType = -1;
        this.canHoldStatus = true;
        //key
        this.keyHoldableStatus = true;
        this.keyRotatableCWStatus = true;
        this.keyRotatableCCWStatus = true;
        this.keyHardDropableStatus = true;
        //level
        this.level = 0;
        this.totalLine = 0;
        this.speed = 1000000;
        this.remain = 1000000;
        this.progressStatus = false;
        //score
        this.specialScore = '';
        this.backToBackChain = 0;
        this.comboChain = 0;
        this.score = 0;

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
                if(!this.currBlockLandStatus) this.score += 1;
                this.debugLogging('down');
            }
            document.querySelector('.score').innerHTML = (this.score+'').padStart(8, '0');
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

        this.level = 0;
        this.totalLine = 0;
        this.backToBackChain = 0;
        this.comboChain = 0;
        this.score = 0;
        document.querySelector('.line').innerHTML = `Line : ${this.totalLine}`;
    }

    start() {
        if(this.progressStatus) return;
        this.init();
        if(document.querySelector('.finish-show') !== null)
            document.querySelector('.finish-show').className = 'finish';
        document.querySelector('.combo').innerHTML = `Combo : ${this.comboChain}`;
        document.querySelector('.b2b').innerHTML = `B2B x ${this.backToBackChain}`;
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

    gameOver() {
        if(document.querySelector('.finish') !== null)
            document.querySelector('.finish').className = 'finish-show';
        this.progressStatus = false;
        this.remain = 10000000;
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
        if(this.currBlock.type === 6) return; // O
        this.simulationStatus = false;
        this.simulationBlock = this.currBlock.clone();
        this.simulationX = this.currBlockX;
        this.simulationY = this.currBlockY;
        switch(dir) {
            case 'CW' : this.simulationBlock.rotateCW(); break;
            case 'CCW' : this.simulationBlock.rotateCCW();
        }
        let placable = true;
        switch(this.simulationBlock.type) {
            case 0 : //T
                this.checkBlockT();
                break;
            case 1 : //S
                this.checkBlockS();
                break;
            case 2 : //Z
                this.checkBlockZ();
                break;
            case 3 : //I
                this.checkBlockI();
                break;
            case 4 : //J
                this.checkBlockJ();
                break;
            case 5 : //L
                this.checkBlockL();
        }
        if(!this.simulationStatus) return;
        this.currBlockLandCount = 500;
        if(this.currBlockLandStatus) this.currBlockLandForce -= 1;
        this.currBlockX = this.simulationX;
        this.currBlockY = this.simulationY;
        this.currBlock = this.simulationBlock.clone();
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

        let tooHighStatus = true;
        this.currBlock.data.map(v => {
            const dataX = this.currBlockX + v[1];
            const dataY = this.currBlockY + v[0];
            if(dataY < 20) tooHighStatus = false;
            this.blockData[dataY][dataX] = this.currBlock.type;
        });
        if(tooHighStatus) {
            this.gameOver();
            return;
        }
        this.lineClearCheck();

        this.simulationSpecialStatus = false;
        this.specialScore = '';

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
            this.score += 2;
            this.currBlockY -= 1;
            this.landCheck();
        }
        this.drop();
    }

    lineClearCheck() {
        let erase = 0;
        for(let i = 0; i < this.ceiling; i++) {
            let lineFullStatus = true;
            for(let j = 0; j < 10; j++) {
                if(this.blockData[i][j] === -1) {
                    lineFullStatus = false;
                    break;
                }
            }
            if(lineFullStatus) {
                erase += 1;
                for(let j = 0; j < 10; j++) {
                    this.blockData[i][j] = -1;
                }
            }
        }
        //score
        let getScore = this.specialScore==='' ? [0, 100, 300, 500, 800][erase] : 0;
        //line clear and drop
        let cursor = 0;
        for(let i = 0; i < this.ceiling; i++) {
            let lineEmptyStatus = true;
            for(let j = 0; j < 10; j++) {
                if(this.blockData[i][j] > -1) {
                    lineEmptyStatus = false;
                    break;
                }
            }
            if(cursor < i) {
                for(let j = 0; j < 10; j++) {
                    this.blockData[cursor][j] = this.blockData[i][j];
                }
            }
            if(!lineEmptyStatus) cursor += 1;
        }
        for(let i = 0; i < 4; i++) {
            for(let j = 0; j < 10; j++) {
                this.blockData[cursor + i][j] = -1;
            }
        }
        let perfectClear = true;
        for(let i = 0; i < 10; i++) {
            if(this.blockData[0][i] > -1) {
                perfectClear = false;
                break;
            }
        }
        //perfect clear
        if(perfectClear) {
            this.specialScore = 'Perfect Clear!';
            this.simulationSpecialStatus = true;
            switch(erase) {
                case 1 :
                    getScore = 800;
                    break;
                case 2 :
                    getScore = 1200;
                    break;
                case 3 :
                    getScore = 1800;
                    break;
                case 4 :
                    getScore = 2000 + (this.backToBackChain > 0 ? 1200 : 0);
                    break;
            }
        }
        
        //combo
        if(erase > 0) this.comboChain += 1;
        else this.comboChain = 0;
        //Tetris
        if(erase === 4) {
            this.specialScore = 'tetris';
            this.simulationSpecialStatus = true;
        }
        //Special
        if(this.simulationSpecialStatus) {
            this.backToBackChain += 1;
            //Special type
            switch(this.specialScore) {
                case 'tetris':
                    this.specialScore = 'Tetris!';
                    break;
                case 'tspin-mini':
                    switch(erase) {
                        case 0:
                            getScore = 100;
                            this.specialScore = "T-spin Mini";
                            break;
                        case 1:
                            this.specialScore = "T-spin Mini Single";
                            break;
                    }
                    break;
                case 'tspin':
                    switch(erase) {
                        case 0:
                            this.specialScore = "T-spin";
                            break;
                        case 1:
                            this.specialScore = "T-spin Single!";
                            break;
                        case 2:
                            this.specialScore = "T-spin Double!";
                            break;
                        case 3:
                            this.specialScore = "T-spin Triple!";
                            break;
                    }
                    break;
                default:
                    break;
            }
            if(this.backToBackChain > 1) {
                this.specialScore = "B2B " + this.specialScore;
            }
        } else if(erase > 0) {
            this.backToBackChain = 0;
        }
        getScore *= this.level;
        if(this.specialScore !== 'clear') {
            getScore += this.comboChain * 50 * this.level;
            getScore *= 1 + (this.backToBackChain >= 2) * 0.5;
        }
        
        this.debugLogging('score get : ' + getScore);
        this.score += getScore;
        this.totalLine += erase;
        if(this.totalLine - 40 * this.level >= 0) this.setLevel(this.level + 1);
        document.querySelector('.line').innerHTML = `Line : ${this.totalLine}`;
        document.querySelector('.combo').innerHTML = `Combo : ${this.comboChain}`;
        document.querySelector('.b2b').innerHTML = `B2B x ${this.backToBackChain}`;
        document.querySelector('.special').innerHTML = this.specialScore;
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

        if(this.currBlock.type === 1 || this.currBlock.type === 2) {
            this.currBlock.rotate = 2;
        }

        this.renderCurrBlock();
        if(!isHoldback) this.createNextBlock();
    }

    initBlockData() {
        this.blockData = [...Array(this.ceiling)].map(_=>[...Array(10)].map(v=>-1));
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
            let widthFrom = 3;
            let widthTo = 1;
            let height = 4;
            switch(block.type) {
                case 3 : height = 3;
                case 6 : widthTo = 0;
                    break;
                case 1 : widthFrom = 2;
                    widthTo = 0;
            }
            const tmp = [];
            idx++;

            tmp.push('<table>');
            tmp.push('<tbody>');
            for(let j = height-1; j >= 2; j--) {
                tmp.push('<tr>');
                for(let k = widthFrom; k >= widthTo; k--) {
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
        if(this.holdBlockType === -1) {
            document.querySelector('.hold').innerHTML = '<table></table>';
            return;
        }
        const hold = document.querySelector('.hold');
        const block = new Block(this.holdBlockType);
        const tmp = [];
        let widthFrom = 3;
        let widthTo = 1;
        let height = 4;
        switch(block.type) {
            case 3 : height = 3;
            case 6 : widthTo = 0;
                break;
            case 1 : widthFrom = 2;
                widthTo = 0;
        }

        tmp.push('<table>');
        tmp.push('<tbody>');
        for(let j = height-1; j >= 2; j--) {
            tmp.push('<tr>');
            for(let k = widthFrom; k >= widthTo; k--) {
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

    simulationCrashCheck(correctionX, correctionY) {
        let simulationCheckStatus = false;
        this.simulationBlock.data.map(v => {
            const dataX = this.simulationX + v[1] + correctionX;
            const dataY = this.simulationY + v[0] + correctionY;
            if(dataX < 0 || dataX > 9 || dataY < 0) {simulationCheckStatus = true; return;}
            if(this.blockData[dataY][dataX] !== -1) {simulationCheckStatus = true; return;}
        });
        return simulationCheckStatus;
    }

    simulationPossible(axisX, axisY) {
        this.simulationX += axisX;
        this.simulationY += axisY;
        this.simulationStatus = true;
    }

    checkBlockT() {
        let axisX = this.simulationX+this.simulationBlock.axis[1];
        let axisY = this.simulationY+this.simulationBlock.axis[0];
        //no stuck
        if(!this.simulationCrashCheck(0, 0)) {
            this.simulationStatus = true;
            if(((this.blockData[axisY+1][axisX-1] > -1) +
                    (this.blockData[axisY+1][axisX+1] > -1) +
                    (this.blockData[axisY-1][axisX-1] > -1) +
                    (this.blockData[axisY-1][axisX+1] > -1)) >= 3 &&
                    this.currBlock.rotate !== this.simulationBlock.rotate) {
                        this.simulationSpecialStatus = true;
                        this.specialScore = 'tspin';
            } else {
                this.simulationSpecialStatus = false;
                this.specialScore = '';
            }
            return;
        }
        //triple
        if(this.currBlock.rotate === 0) {
            switch(this.simulationBlock.rotate) {
                case 1:
                    if(this.blockData[axisY+1][axisX-1] > -1) {
                        if(!this.simulationCrashCheck(-1, -2)) {
                            this.simulationPossible(-1, -2);
                            this.simulationSpecialStatus = true;
                            this.specialScore = 'tspin';
                        }
                    }
                    break;
                case 3:
                    if(this.blockData[this.simulationY+this.simulationBlock.axis[0]+1][this.simulationX+this.simulationBlock.axis[1]+1] > -1) {
                        if(!this.simulationCrashCheck(1, -2)) {
                            this.simulationPossible(1, -2);
                            this.simulationSpecialStatus = true;
                            this.specialScore = 'tspin';
                        }
                    }
                    break;
            }
            return;
        }
        //mini
        switch(this.currBlock.rotate) {
            case 0 :
                switch(this.simulationBlock.rotate) {
                    case 1 :
                        if(axisY-1 >= 0 && 
                                this.blockData[axisY-1][axisX-1] === -1) {
                            if(axisX-2 < 0 || (
                                    this.blockData[axisY][axisX-2] > -1 &&
                                    this.blockData[axisY-1][axisX] > -1) &&
                                    !this.simulationCrashCheck(-1, 0)) {
                                this.simulationPossible(-1, 0);
                                if(axisX-2 < 0 || this.blockData[axisY+1][axisX-2] > -1) {
                                    this.simulationSpecialStatus = true;
                                    this.specialScore = 'tspin-mini';
                                }
                            }
                            break;
                        }
                        if(this.blockData[axisY+1][axisX+1] > -1 &&
                                !this.simulationCrashCheck(-1, 1)) {
                            this.simulationPossible(-1, 1);
                            break;
                        }
                        if(this.currBlockLandStatus && 
                                !this.simulationCrashCheck(0, 1)) {
                            this.simulationPossible(0, 1);
                            break;
                        }
                        break;
                    case 3 :
                        if(axisY-1 >= 0 && 
                                this.blockData[axisY-1][axisX+1] === -1) {
                            if(axisX+2 > 9 || (
                                    this.blockData[axisY][axisX+2] > -1 &&
                                    this.blockData[axisY-1][axisX] > -1) &&
                                    !this.simulationCrashCheck(1, 0)) {
                                this.simulationPossible(1, 0);
                                if(axisX+2 > 9 || this.blockData[axisY+1][axisX+2] > -1) {
                                    this.simulationSpecialStatus = true;
                                    this.specialScore = 'tspin-mini';
                                }
                            }
                            break;
                        }
                        if(this.blockData[axisY+1][axisX-1] > -1 &&
                                !this.simulationCrashCheck(1, 1)) {
                            this.simulationPossible(1, 1);
                            break;
                        }
                        if(this.currBlockLandStatus && 
                                !this.simulationCrashCheck(0, 1)) {
                            this.simulationPossible(0, 1);
                            break;
                        }
                }
            case 1 :
                if(!this.simulationCrashCheck(1, 0)) {
                    this.simulationPossible(1, 0);
                    break;
                }
                if(!this.simulationCrashCheck(1, -1)) {
                    this.simulationPossible(1, -1);
                    if(this.simulationBlock.rotate === 0 && (axisY-2 < 0 ||
                            this.blockData[axisY-2][axisX])) {
                        this.simulationSpecialStatus = true;
                        this.specialScore = 'tspin-mini';
                        break;
                    }
                    if(this.simulationBlock.rotate === 2 && 
                            this.simulationCrashCheck(1, -1) &&
                            ((this.blockData[axisY+1-1][axisX-1+1] > -1) + //수정필요!!
                            (this.blockData[axisY+1-1][axisX+1+1] > -1) +
                            (this.blockData[axisY-1-1][axisX-1+1] > -1) +
                            (this.blockData[axisY-1-1][axisX+1+1] > -1)) >= 3) {
                        this.simulationSpecialStatus = true;
                        this.specialScore = 'tspin';
                    }
                }
                break;
            case 2 :
                if(!this.simulationCrashCheck(-1, -1)) {
                    this.simulationPossible(-1, -1);
                    break;
                }
                if(!this.simulationCrashCheck(1, -1)) {
                    this.simulationPossible(1, -1);
                }
            case 3 :
                if(!this.simulationCrashCheck(-1, 0)) {
                    this.simulationPossible(-1, 0);
                } else if(!this.simulationCrashCheck(-1, -1)) {
                    this.simulationPossible(-1, -1);
                    if(this.simulationBlock.rotate === 0 && (axisY-2 < 0 ||
                            this.blockData[axisY-2][axisX])) {
                        this.simulationSpecialStatus = true;
                        this.specialScore = 'tspin-mini';
                    } else if(this.simulationBlock.rotate === 2 && 
                        this.simulationCrashCheck(-1, -1) &&
                        ((this.blockData[axisY+1-1][axisX-1-1] > -1) +
                        (this.blockData[axisY+1-1][axisX+1-1] > -1) +
                        (this.blockData[axisY-1-1][axisX-1-1] > -1) +
                        (this.blockData[axisY-1-1][axisX+1-1] > -1)) >= 3) {
                    this.simulationSpecialStatus = true;
                    this.specialScore = 'tspin';
                    }
                }
                break;
        }
    }

    checkBlockS() {
        let axisX = this.currBlockX+this.currBlock.axis[1];
        let axisY = this.currBlockY+this.currBlock.axis[0];
        if(this.currBlock.rotate === 0 &&
                this.simulationBlock.rotate === 3 &&
                this.blockData[axisY][axisX+1] > -1 &&
                !this.simulationCrashCheck(0, -2)) {
            this.simulationPossible(0, -2);
            return;
        }
        if(!this.simulationCrashCheck(0, 0)) {
            this.simulationPossible(0, 0);
            return;
        }
        switch(this.currBlock.rotate) {
            case 0:
                if(this.simulationBlock.rotate === 1) {
                    if((this.blockData[axisY+1][axisX-1] > -1 ||
                            this.blockData[axisY+2][axisX-1] > -1) &&
                            this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, -2)) {
                        this.simulationPossible(-1, -2);
                        break;
                    }
                    if(!this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                        break;
                    }
                }
                break;
            case 1:
                if(this.simulationBlock.rotate === 2 &&
                        !this.simulationCrashCheck(1, -1) &&
                        this.blockData[axisY-1][axisX] > -1) {
                    this.simulationPossible(1, -1);
                    break;
                }
                if(!this.simulationCrashCheck(1, 0)) {
                    this.simulationPossible(1, 0);
                    break;
                }
                if(this.simulationBlock.rotate === 0 &&
                        !this.simulationCrashCheck(1, -1)) {
                    this.simulationPossible(0, -1);
                    break;
                }
                if(this.simulationBlock.rotate === 0 &&
                        !this.simulationCrashCheck(1, 2)) {
                    this.simulationPossible(1, 2);
                    break;
                }
                if(this.simulationBlock.rotate === 0 &&
                        this.blockData[axisY+1][axisX+1] > -1 &&
                        !this.simulationCrashCheck(1, 2)) {
                    this.simulationPossible(1, 2);
                    break;
                }
                break;
            case 3:
                if(this.simulationBlock.rotate === 2 &&
                        (axisX + 1 > 9 || this.blockData[axisY][axisX+1] > -1) &&
                        !this.simulationCrashCheck(-1, -1)) {
                    this.simulationPossible(-1, -1);
                    break;
                }
                if(this.simulationBlock.rotate === 0 &&
                        !this.simulationCrashCheck(-1, -1)) {
                    this.simulationPossible(-1, -1);
                    break;
                }
                if(!this.simulationCrashCheck(-1, 0)) {
                    this.simulationPossible(-1, 0);
                    break;
                }
                if(this.simulationBlock.rotate === 0 &&
                        this.blockData[axisY+1][axisX] > -1 &&
                        !this.simulationCrashCheck(0, 2)) {
                    this.simulationPossible(0, 2);
                    break;
                }
        }
    }
    
    checkBlockZ() {
        let axisX = this.currBlockX+this.currBlock.axis[1];
        let axisY = this.currBlockY+this.currBlock.axis[0];
        if(this.currBlock.rotate === 0 &&
                this.simulationBlock.rotate === 1 &&
                this.blockData[axisY][axisX-1] > -1 &&
                !this.simulationCrashCheck(0, -2)) {
            this.simulationPossible(0, -2);
        }
        if(!this.simulationCrashCheck(0, 0)) {
            this.simulationPossible(0, 0);
            return;
        }
        switch(this.currBlock.rotate) {
            case 0:
                if(this.simulationBlock.rotate === 1) {
                    if(this.blockData[axisY+1][axisX+1] &&
                         !this.simulationCrashCheck(-1, 1)) {
                            this.simulationPossible(-1, 1);
                         }
                }
                if(this.simulationBlock.rotate === 3 &&
                        (this.blockData[axisY+1][axisX+1] > -1 ||
                        this.blockData[axisY+2][axisX+1] > -1)) {
                    if(!this.simulationCrashCheck(1, -2)) {
                        this.simulationPossible(1, -2);
                        break;
                    }
                    if(!this.simulationCrashCheck(0, -2)) {
                        this.simulationPossible(0, -2);
                        break;
                    }
                    break;
                }
                if(!this.simulationCrashCheck(0, 1)) {
                    this.simulationPossible(0, 1);
                    break;
                }
                break;
            case 1:
                if(this.simulationBlock.rotate === 0) {
                    if((axisX+2 > 9 || this.blockData[axisY][axisX+2]) &&
                            !this.simulationCrashCheck(1, -1)) {
                        this.simulationPossible(1, -1);
                        break;
                    }
                    if(this.blockData[axisY+1][axisX] > -1 &&
                        axisX-1 >= 0 && this.blockData[axisY+2][axisX-1] > -1 &&
                        !this.simulationCrashCheck(0, 2)) {
                            this.simulationPossible(0, 2);
                            break;
                        }
                    if(!this.simulationCrashCheck(1, 0)) {
                        this.simulationPossible(1, 0);
                        break;
                    }
                    break;
                }
                if(this.simulationBlock.rotate === 2) {
                    if((axisX + 2 > 9 || this.blockData[axisY][axisX+2]) &&
                            !this.simulationCrashCheck(1, -1)) {
                        this.simulationPossible(1, -1);
                        break;
                    }
                }
            case 3:
                if(this.simulationBlock.rotate === 2 &&
                        !this.simulationCrashCheck(-1, -1) &&
                        this.blockData[axisY-1][axisX] > -1) {
                    this.simulationPossible(-1, -1);
                    break;
                }
                if(this.simulationBlock.rotate === 0) {
                    if(!this.simulationCrashCheck(0, -1)) {
                        this.simulationPossible(0, -1);
                        break;
                    }
                    if(this.blockData[axisY+1][axisX-1] > -1 &&
                            !this.simulationCrashCheck(-1, 2)) {
                        this.simulationPossible(-1, 2);
                        break;
                    }
                }
                        
                if(!this.simulationCrashCheck(-1, 0)) {
                    this.simulationPossible(-1, 0);
                    break;
                }
        }
    }

    checkBlockI() {
        if(!this.simulationCrashCheck(0, 0)) {
            this.simulationPossible(0, 0);
            return;
        }
        let axisX = this.currBlockX+this.currBlock.axis[1];
        let axisY = this.currBlockY+this.currBlock.axis[0];
        switch(this.currBlock.rotate) {
            case 0: case 2:
                if(!this.simulationCrashCheck(0, 1)) {
                    this.simulationPossible(0, 1);
                    break;
                }
                if(!this.simulationCrashCheck(0, 2)) {
                    this.simulationPossible(0, 1);
                    break;
                }
                break;
            case 1:
                if(!this.simulationCrashCheck(1, 0)) {
                    this.simulationPossible(0, 1);
                    break;
                }
                if(!this.simulationCrashCheck(2, 0)) {
                    this.simulationPossible(0, 2);
                    break;
                }
                if(!this.simulationCrashCheck(-1, 0)) {
                    this.simulationPossible(-1, 0);
                    break;
                }
                break;
            case 3:
                if(!this.simulationCrashCheck(-1, 0)) {
                    this.simulationPossible(-1, 0);
                    break;
                }
                if(!this.simulationCrashCheck(-2, 0)) {
                    this.simulationPossible(-2, 0);
                    break;
                }
                if(!this.simulationCrashCheck(1, 0)) {
                    this.simulationPossible(1, 0);
                    break;
                }
        }
    }

    checkBlockJ() {
        if(!this.simulationCrashCheck(0, 0)) {
            this.simulationStatus = true;
            return;
        }
        let axisX = this.currBlockX+this.currBlock.axis[1];
        let axisY = this.currBlockY+this.currBlock.axis[0];
        switch(this.currBlock.rotate) {
            case 0:
                if(this.simulationBlock.rotate === 1) {
                    if((this.blockData[axisY+1][axisX-1] > -1 ||
                            this.blockData[axisY+2][axisX-1] > -1) &&
                            this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, -2)) {
                        this.simulationPossible(-1, -2);
                        break;
                    }
                    if(this.blockData[axisY+1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, 1)) {
                        this.simulationPossible(-1, 1);
                        break;
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                    break;
                }
                if(this.simulationBlock.rotate === 3) {
                    if(this.blockData[axisY+1][axisX] > -1 &&
                            !this.simulationCrashCheck(1, 1)) {
                        this.simulationPossible(1, 1);
                        break;
                    }
                    if(this.blockData[axisY+2][axisX+1] > -1 &&
                            this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(1, 0)) {
                        this.simulationPossible(1, 0);
                        break;
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                    break;
                } 
                break;
            case 1:
                if(this.simulationBlock.rotate === 2) {
                    if(this.blockData[axisY][axisX+1] > -1 ||
                        (axisX+2 <= 9 && this.blockData[axisY][axisX+2] > -1)) {
                        if(!this.simulationCrashCheck(1, -1)) {
                            this.simulationPossible(1, -1);
                            break;
                        }
                        if(!this.simulationCrashCheck(1, 1)) {
                            this.simulationPossible(1, 1);
                            break;
                        }
                    }
                    if(axisX-1 < 0 && !this.simulationCrashCheck(1, 0)) {
                        this.simulationPossible(1, 0);
                    }
                }
                if(this.simulationBlock.rotate === 0) {
                    if(this.blockData[axisY][axisX+1] > -1 &&
                            !this.simulationCrashCheck(1, -1)) {
                        this.simulationPossible(1, -1);
                        break;
                    }
                    if(axisX-1 < 0 && !this.simulationCrashCheck(1, 0)) {
                        this.simulationPossible(1, 0);
                    }
                }
                break;
            case 2:
                if(this.simulationBlock.rotate === 3) {
                    if(this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(1, -1)) {
                        this.simulationPossible(1, -1);
                        break;
                    }
                    if(this.blockData[axisY+1][axisX-1] > -1 &&
                            this.blockData[axisY-1][axisX+1] > -1 &&
                            !this.simulationCrashCheck(1, 1)) {
                        this.simulationPossible(1, 1);
                        break;
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                }
                if(this.simulationBlock.rotate === 1) {
                    if(this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, -1)) {
                        this.simulationPossible(-1, -1);
                        break;
                    }
                    if((axisX-2 < 0 || this.blockData[axisY-1][axisX-2] > -1) &&
                            this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, -2)) {
                        this.simulationPossible(-1, -2);
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                }  
                break;
            case 3:
                if(this.simulationBlock.rotate === 0) {
                    if(!this.simulationCrashCheck(-1, -1) &&
                            (this.blockData[axisY][axisX-1] > -1 ||
                            (this.blockData[axisY][axisX-2] > -1 &&
                            (axisX+1 > 9 ||
                            this.blockData[axisY][axisX+1] > -1)))
                            ) {
                        this.simulationPossible(-1, -1);
                        break;
                    } 
                    if(!this.simulationCrashCheck(-1, 0)) {
                        this.simulationPossible(-1, 0);
                        break;
                    }
                }
                if(this.simulationBlock.rotate === 2) {
                    if(this.blockData[axisY][axisX-1] > -1) {
                        if(this.blockData[axisY-1][axisX-1] > -1 &&
                                !this.simulationCrashCheck(1, 0)) {
                            this.simulationPossible(1, 0);
                            break;
                        }
                        if(!this.simulationCrashCheck(-1, 1)) {
                            this.simulationPossible(-1, 1);
                            break;
                        }     
                    }
                    if(((this.blockData[axisY][axisX+1] > -1) ^
                            (this.blockData[axisY][axisX-1] > -1)) &&
                            !this.simulationCrashCheck(-1, -1)) {
                        this.simulationPossible(-1, -1);
                        break;
                    }
                    if(!this.simulationCrashCheck(-1, 0)) {
                        this.simulationPossible(-1, 0);
                        break;
                    }
                }
        }
    }

    checkBlockL() {
        if(!this.simulationCrashCheck(0, 0)) {
            this.simulationStatus = true;
            return;
        }
        let axisX = this.currBlockX+this.currBlock.axis[1];
        let axisY = this.currBlockY+this.currBlock.axis[0];
        switch(this.currBlock.rotate) {
            case 0:
                if(this.simulationBlock.rotate === 3) {
                    if((this.blockData[axisY+1][axisX+1] > -1 ||
                            this.blockData[axisY+2][axisX+1] > -1) &&
                            this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(1, -2)) {
                        this.simulationPossible(1, -2);
                        break;
                    }
                    if(this.blockData[axisY+1][axisX] > -1 &&
                            !this.simulationCrashCheck(1, 1)) {
                        this.simulationPossible(1, 1);
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                    break;
                }
                if(this.simulationBlock.rotate === 1) {
                    if(this.blockData[axisY+1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, 1)) {
                        this.simulationPossible(-1, 1);
                        break;
                    }
                    if(this.blockData[axisY+2][axisX-1] > -1 &&
                            this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, 0)) {
                        this.simulationPossible(-1, 0);
                        break;
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                }
                break;
            case 1:
                if(this.simulationBlock.rotate === 0) {
                    if(!this.simulationCrashCheck(1, -1) &&
                            (this.blockData[axisY][axisX+1] > -1 ||
                            (this.blockData[axisY][axisX+2] > -1 &&
                            (axisX-1 < 0 ||
                            this.blockData[axisY][axisX-1] > -1)))
                            ) {
                        this.simulationPossible(1, -1);
                        break;
                    } 
                    if(axisX-1 < 0 && !this.simulationCrashCheck(1, 0)) {
                        this.simulationPossible(1, 0);
                        break;
                    }
                }
                if(this.simulationBlock.rotate === 2) {
                    if(this.blockData[axisY][axisX+1] > -1 &&
                            !this.simulationCrashCheck(1, 1)) {
                        this.simulationPossible(1, 1);
                        break;
                    }
                    if(this.blockData[axisY-1][axisX+1] > -1 &&
                            !this.simulationCrashCheck(1, 0)) {
                        this.simulationPossible(1, 0);
                        break;
                    }
                    if(((this.blockData[axisY][axisX+1] > -1) ^
                            (this.blockData[axisY][axisX-1] > -1)) &&
                            !this.simulationCrashCheck(1, -1)) {
                        this.simulationPossible(1, -1);
                        break;
                    }
                    if(axisX-1 < 0 && !this.simulationCrashCheck(1, 0)) {
                        this.simulationPossible(1, 0);
                        break;
                    }
                }
                break;
            case 2:
                if(this.simulationBlock.rotate === 1) {
                    if(this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, -1)) {
                        this.simulationPossible(-1, -1);
                        break;
                    }
                    if(this.blockData[axisY+1][axisX+1] > -1 &&
                            this.blockData[axisY-1][axisX-1] > -1 &&
                            !this.simulationCrashCheck(-1, 1)) {
                        this.simulationPossible(-1, 1);
                        break;
                    }
                    if(this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(-1, 0)) {
                        this.simulationPossible(-1, 0);
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                }
                if(this.simulationBlock.rotate === 3) {
                    if(this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(1, -1)) {
                        this.simulationPossible(1, -1);
                        break;
                    }
                    if((axisX+2 > 9 || this.blockData[axisY-1][axisX+2] > -1) &&
                            this.blockData[axisY-1][axisX] > -1 &&
                            !this.simulationCrashCheck(1, -2)) {
                        this.simulationPossible(1, -2);
                    }
                    if(this.currBlockLandStatus && !this.simulationCrashCheck(0, 1)) {
                        this.simulationPossible(0, 1);
                    }
                }  
                break;
            case 3:
                if(this.simulationBlock.rotate === 2) {
                    if(this.blockData[axisY][axisX-1] > -1 ||
                            (axisX-2 >= 0 && this.blockData[axisY][axisX-2] > -1)) {
                        if(!this.simulationCrashCheck(-1, -1)) {
                            this.simulationPossible(-1, -1);
                            break;
                        }
                        if(!this.simulationCrashCheck(-1, 1)) {
                            this.simulationPossible(-1, 1);
                            break;
                        }
                    }
                    if(axisX+1 > 9 && !this.simulationCrashCheck(-1, 0)) {
                        this.simulationPossible(-1, 0);
                    }
                }
                if(this.simulationBlock.rotate === 0) {
                    if(this.blockData[axisY][axisX-1] > -1 &&
                            !this.simulationCrashCheck(-1, -1)) {
                        this.simulationPossible(-1, -1);
                        break;
                    }
                    if(axisX+1 > 9 && !this.simulationCrashCheck(-1, 0)) {
                        this.simulationPossible(-1, 0);
                    }
                }
        }
    }

    setLevel(value) {
        this.level = value;
        this.speed = Math.max(1000 - (this.level - 1) * 100, 30);

        document.querySelector('.level').innerHTML = `Level : ${this.level}`;
    }

    debugLogging(msg) {
        console.log(msg);
    }
}