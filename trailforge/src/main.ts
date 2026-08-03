import './styles.css';
import { Game } from './game/Game';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('TrailForge could not find its application root.');

new Game(root);
