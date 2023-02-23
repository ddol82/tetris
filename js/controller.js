export default class Controller {
    constructor() {
        this.keyLeftCheck = false;
        this.keyRightCheck = false;
        this.keyDownCheck = false;
        this.keyZCheck = false;
        this.keyXCheck = false;
        this.keyShiftCheck = false;
        this.keySpaceCheck = false;
        document.addEventListener('keydown', e => {
            switch(e.key) {
                case 'ArrowLeft' :
                    if(!this.keyLeftCheck) {
                        this.keyLeftCheck = true;
                    }
                    break;
                case 'ArrowRight' :
                    if(!this.keyRightCheck) {
                        this.keyRightCheck = true;
                    }
                    break;
                case 'ArrowDown' :
                    if(!this.keyDownCheck) {
                        this.keyDownCheck = true;
                    }
                    break;
                case 'z' : case 'Z' :
                    if(!this.keyZCheck) {
                        this.keyZCheck = true;
                    }
                    break;
                case 'x' : case 'X' :
                    if(!this.keyXCheck) {
                        this.keyXCheck = true;
                    }
                    break;
                case 'Shift' :
                    if(!this.keyShiftCheck) {
                        this.keyShiftCheck = true;
                    }
                    break;
                case ' ' :
                    if(!this.keySpaceCheck) {
                        this.keySpaceCheck = true;
                    }
                    break;
            }
        });
        document.addEventListener('keyup', e => {
            switch(e.key) {
                case 'ArrowLeft' :
                    if(this.keyLeftCheck) {
                        this.keyLeftCheck = false;
                    }
                    break;
                case 'ArrowRight' :
                    if(this.keyRightCheck) {
                        this.keyRightCheck = false;
                    }
                    break;
                case 'ArrowDown' :
                    if(this.keyDownCheck) {
                        this.keyDownCheck = false;
                    }
                    break;
                case 'z' : case 'Z' :
                    if(this.keyZCheck) {
                        this.keyZCheck = false;
                    }
                    break;
                case 'x' : case 'X' :
                    if(this.keyXCheck) {
                        this.keyXCheck = false;
                    }
                    break;
                case 'Shift' :
                    if(this.keyShiftCheck) {
                        this.keyShiftCheck = false;
                    }
                    break;
                case ' ' :
                    if(this.keySpaceCheck) {
                        this.keySpaceCheck = false;
                    }
                    break;
            }
        })
    }
}