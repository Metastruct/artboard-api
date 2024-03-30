/* eslint-disable @typescript-eslint/no-empty-function */
import { EventEmitter } from 'events';

import Application from '../Application';
import { assertConfiguration } from '../utilities';

export class BaseStructure extends EventEmitter {
  public readonly application: Application;

  constructor(
    application: Application,
    requiredConfigValues: Record<string, string>
  ) {
    super();

    this.application = application;
    assertConfiguration(requiredConfigValues, this.config);
  }

  public onCleanup() {}
  public onImportDone() {}

  public get structures() {
    return this.application.structures;
  }

  public get config() {
    return this.application.config;
  }

  public static create(
    _application: Application
  ): BaseStructure | Promise<BaseStructure> {
    throw new Error('not implemented');
  }
}
