import Game from './core/Game';

const startGameButton = document.querySelector('.button-wrapper');

Game.load();

startGameButton.addEventListener('click', () => {
    Game.startGame();
    startGameButton.style.display = 'none';
});
