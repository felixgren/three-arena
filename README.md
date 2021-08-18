<p align="center"><a href="https://youtu.be/8coHwAm-LyI" target="_blank"><img src="https://media1.tenor.com/images/938582dc0c728dd274bbc56a49b886de/tenor.gif" width="75%"></a></p>

# Three Arena

An arena shooter created in three.js. Shoot your friends in this simple socket.io multiplayer game.

<strong> Join now at: https://three-arena.vercel.app/ </strong>

This game was created using the following technologies:

-   [three.js](https://threejs.org/)
-   [Socket.IO](https://socket.io/)
-   [webpack](https://webpack.js.org/)

# Installation

**Prerequisites**

-   [UNIX based OS (Mac, Linux or WSL2 for Windows)](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
-   node
-   npm

### Setting up project

```
git clone https://github.com/felixgren/three-arena.git
cd three-arena
npm install
cd server
npm install
```

### Run project

```
// Start client
npm run dev

// Start server
npm run server
```

> In case of errors, verify that socket.io client in `game.js` is targeted at matching localhost port inside `/server/main.js`.

# Changelog

-   [#1 - Initial setup](https://github.com/felixgren/level-up/pull/1)
-   [#2 - Shadows ](https://github.com/felixgren/level-up/pull/2)
-   [#3 - Basic skybox & model, FPS counter](https://github.com/felixgren/level-up/pull/3)
-   [#4 - Drawcalls to debug GUI](https://github.com/felixgren/level-up/pull/4/)
-   [#5 - Movement and collisions.](https://github.com/felixgren/level-up/pull/5/)
-   [#6 - Rockets.](https://github.com/felixgren/level-up/pull/6/)
-   [#7 - World terrain, heightmap, model, skybox](https://github.com/felixgren/level-up/pull/7/)
-   [#8 - Refactored entire project](https://github.com/felixgren/level-up/pull/8/)
-   [#9 - Code Review](https://github.com/felixgren/three-arena/pull/9)
-   [#10 - Core Features 1 (Multiplayer, Chat, Explosions, etc)](https://github.com/felixgren/three-arena/pull/10/)
-   [#11 - Environment 2 (New Map)](https://github.com/felixgren/three-arena/pull/11/)
-   [#12 - Core Features 2 (Respawn, UI, Chat types)](https://github.com/felixgren/three-arena/pull/12/)
-   [#13 - Core Features 3 (General improvements)](https://github.com/felixgren/three-arena/pull/13/)

# Code Review

1. `Game.js:8,11-12` - Gets imported but isn't used.
2. `Game.js:82` - console.log() :)
3. `Game.js:75` - Remove code that isn't in use.
4. `Game.js` - For better readabilty you can split game.js into multiple files.
5. `Game.js:423-46` - For better performent we would suggest a switch-statement instead.
6. `Game.js:` - Existing descriptions could be more informative :)
7. `Game.js` - Unclear what controls that we are supposed to use. "Open / Close Controls" doesnt work.
8. Instructions how to play.
9. We dont really understand the game :)
10. Gives warnings when running "npm run build".

# Testers

Tested by the following people:

1. Jane Doe
2. John Doe
3. Jane Doe
4. John Doe

Tested by the following muggles (non-coders):

1. Jane Doe
2. John Doe
3. Jane Doe
4. John Doe
