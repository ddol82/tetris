import Tetris from './main.js';

const tetris = new Tetris();

tetris.init();

document.querySelector('.restart').addEventListener('click', ()=>tetris.start());