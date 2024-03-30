import ActivityContainer from './ActivityContainer';
import { BaseStructure } from './BaseStructure';
import Game from './Game';
import Renderer from './Renderer';
import Web from './Web';

export default interface AppStructures {
  [key: string]: BaseStructure | undefined;
  ActivityContainer?: ActivityContainer;
  Game?: Game;
  Renderer?: Renderer;
  Web?: Web;
}