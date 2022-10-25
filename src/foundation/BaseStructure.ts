/* eslint-disable @typescript-eslint/no-empty-function */
import { EventEmitter } from 'events';

import Application from '../Application';
import { assertConfiguration } from '../utilities';

export class BaseStructure {
  public readonly application: Application;

  constructor(
    application: Application,
    requiredConfigValues: Record<string, string>
  ) {
    this.application = application;
    assertConfiguration(requiredConfigValues, this.application.config);
  }

  public onCleanup() {}
  public onImportDone() {}
}

export class BaseEventEmitterStructure extends EventEmitter {
  public readonly application: Application;

  constructor(
    application: Application,
    requiredConfigValues: Record<string, string>
  ) {
    super();

    this.application = application;
    assertConfiguration(requiredConfigValues, this.application.config);
  }

  public onCleanup() {}
  public onImportDone() {}
}
