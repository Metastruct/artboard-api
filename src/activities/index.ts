import BaseActivity from './BaseActivity';
import FrameRenderActivity from './FrameRenderActivity';
import ResetActivity from './ResetActivity';

export default interface Activities {
  [key: string]: BaseActivity | undefined;
  FrameRenderActivity?: FrameRenderActivity;
  ResetActivity?: ResetActivity;
}