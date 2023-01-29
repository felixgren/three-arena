<p align="center"><a href="https://youtu.be/8coHwAm-LyI" target="_blank"><img src="https://user-images.githubusercontent.com/33127919/151162659-27c74ceb-8323-48de-a760-cfe0000f8706.png" width="100%"></a></p>

## Three Arena
Join now on <strong> *[three-arena.vercel.app](https://three-arena.vercel.app/)* </strong>

An arena shooter created in three.js. Shoot your friends in this socket.io multiplayer game. You can open chat by pressing t.

It features a vanilla built movement system, collisions (with the help of octrees), chat & shooting. Backend is an express socket.io server which gathers and sends out all player data (movement, directions, chat, rocket fire events) to the clients. The clients then react by generating and updating the players & events, the client is completely trusted. Best part is that it's all in one file... but would be very easy to break out & expand upon if you have some time.

If you've found this repo valuable, do give it a star.

This game was created using the following technologies:

-   [three.js](https://threejs.org/)
-   [Socket.IO](https://socket.io/)
-   [webpack](https://webpack.js.org/)

## Installation

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

```js
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
-   [#14 - Update node server host](https://github.com/felixgren/three-arena/pull/14/)
