import Game from './core/Game';

const startGameButton = document.querySelector('.start-button-wrapper');
const respawnGameButton = document.querySelector('.respawn-button-wrapper');

Game.load();

startGameButton.addEventListener('click', () => {
    Game.startGame();
    startGameButton.style.display = 'none';
});

respawnGameButton.addEventListener('click', () => {
    Game.triggerRespawn();
    Game.activatePointerLock();
    respawnGameButton.style.display = 'none';
});
