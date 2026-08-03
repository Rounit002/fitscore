# TrailForge

TrailForge is an original 2D endless physics driving game built with TypeScript, Vite, Matter.js, Canvas, Web Audio, and LocalStorage. Vehicle motion is driven by separate rigid bodies for the chassis and both wheels, spring constraints for suspension, wheel torque, gravity, friction, and terrain collisions.

## Run

```bash
npm install
npm run dev
```

Open the URL shown by Vite. Desktop controls are `D`/Right Arrow for gas, `A`/Left Arrow for brake/reverse, `Escape` to pause, and `F3` to toggle physics debug rendering. Touch controls support independent simultaneous pointers.

## Verify

```bash
npm test
npm run build
```

Progress is stored under `trailforge.save.v1` in LocalStorage. Use the Reset Progress action in Settings to clear it.
