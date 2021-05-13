import Game from './core/Game';

const startGameButton = document.querySelector('.start-button');

Game.load();

startGameButton.addEventListener('click', () => {
    Game.startGame();
    startGameButton.style.display = 'none';
});
