import {DiskMangerWorker} from './DiskMangerWorker';
import {Logger} from '../../Logger';
import {RendererInput, ThumbnailWorker} from './ThumbnailWorker';
import {ThumbnailProcessingLib} from '../../../common/config/private/IPrivateConfig';

export class Worker {


  public static process() {
    Logger.debug('Worker is waiting for tasks');
    process.on('message', async (task: WorkerTask) => {
      try {
        let result = null;
        switch (task.type) {
          case WorkerTaskTypes.diskManager:
            result = await DiskMangerWorker.scanDirectory((<DiskManagerTask>task).relativeDirectoryName);
            if (global.gc) {
              global.gc();
            }
            break;
          case WorkerTaskTypes.thumbnail:
            result = await ThumbnailWorker.render((<ThumbnailTask>task).input, (<ThumbnailTask>task).renderer);
            break;
          default:
            Logger.error('Unknown worker task type');
            throw new Error('Unknown worker task type');
        }
        process.send(<WorkerMessage>{
          error: null,
          result: result
        });
      } catch (err) {
        process.send({error: err, result: null});
      }
    });
  }
}


export enum WorkerTaskTypes {
  thumbnail = 1, diskManager = 2
}

export interface WorkerTask {
  type: WorkerTaskTypes;
}

export interface DiskManagerTask extends WorkerTask {
  relativeDirectoryName: string;
}

export interface ThumbnailTask extends WorkerTask {
  input: RendererInput;
  renderer: ThumbnailProcessingLib;
}

export interface WorkerMessage {
  error: any;
  result: any;
}
