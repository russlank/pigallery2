import * as path from 'path';
import * as fs from 'fs';
import {NextFunction, Request, Response} from 'express';
import {ErrorCodes, ErrorDTO} from '../../common/entities/Error';
import {DirectoryDTO} from '../../common/entities/DirectoryDTO';
import {ObjectManagerRepository} from '../model/ObjectManagerRepository';
import {SearchTypes} from '../../common/entities/AutoCompleteItem';
import {ContentWrapper} from '../../common/entities/ConentWrapper';
import {PhotoDTO} from '../../common/entities/PhotoDTO';
import {ProjectPath} from '../ProjectPath';
import {Config} from '../../common/config/private/Config';
import {UserDTO} from '../../common/entities/UserDTO';
import {RandomQuery} from '../model/interfaces/IGalleryManager';


const LOG_TAG = '[GalleryMWs]';

export class GalleryMWs {


  public static async listDirectory(req: Request, res: Response, next: NextFunction) {
    const directoryName = req.params.directory || '/';
    const absoluteDirectoryName = path.join(ProjectPath.ImageFolder, directoryName);

    if (!fs.existsSync(absoluteDirectoryName) ||
      !fs.statSync(absoluteDirectoryName).isDirectory()) {
      return next();
    }

    try {
      const directory = await ObjectManagerRepository.getInstance()
        .GalleryManager.listDirectory(directoryName, req.query.knownLastModified, req.query.knownLastScanned);

      if (directory == null) {
        req.resultPipe = new ContentWrapper(null, null, true);
        return next();
      }
      if (req.session.user.permissions &&
        req.session.user.permissions.length > 0 &&
        req.session.user.permissions[0] !== '/*') {
        (<DirectoryDTO>directory).directories = (<DirectoryDTO>directory).directories.filter(d =>
          UserDTO.isDirectoryAvailable(d, req.session.user.permissions));
      }
      req.resultPipe = new ContentWrapper(directory, null);
      return next();

    } catch (err) {
      return next(new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'Error during listing the directory', err));
    }
  }


  public static removeCyclicDirectoryReferences(req: Request, res: Response, next: NextFunction) {
    if (!req.resultPipe) {
      return next();
    }

    const cw: ContentWrapper = req.resultPipe;
    if (cw.notModified === true) {
      return next();
    }
    const removeDirs = (dir) => {
      dir.photos.forEach((photo: PhotoDTO) => {
        photo.directory = null;
      });

      dir.directories.forEach((directory: DirectoryDTO) => {
        removeDirs(directory);
        directory.parent = null;
      });

    };

    if (cw.directory) {
      removeDirs(cw.directory);
    }


    return next();
  }


  public static async getRandomImage(req: Request, res: Response, next: NextFunction) {
    if (Config.Client.RandomPhoto.enabled === false) {
      return next();
    }
    const query: RandomQuery = {};
    if (req.query.directory) {
      query.directory = req.query.directory;
    }
    if (req.query.recursive === 'true') {
      query.recursive = true;
    }
    if (req.query.orientation) {
      query.orientation = parseInt(req.query.orientation.toString(), 10);
    }
    if (req.query.maxResolution) {
      query.maxResolution = parseFloat(req.query.maxResolution.toString());
    }
    if (req.query.minResolution) {
      query.minResolution = parseFloat(req.query.minResolution.toString());
    }
    if (req.query.fromDate) {
      query.fromDate = new Date(req.query.fromDate);
    }
    if (req.query.toDate) {
      query.toDate = new Date(req.query.toDate);
    }
    if (query.minResolution && query.maxResolution && query.maxResolution < query.minResolution) {
      return next(new ErrorDTO(ErrorCodes.INPUT_ERROR, 'Input error: min resolution is greater than the max resolution'));
    }
    if (query.toDate && query.fromDate && query.toDate.getTime() < query.fromDate.getTime()) {
      return next(new ErrorDTO(ErrorCodes.INPUT_ERROR, 'Input error: to date is earlier than from date'));
    }

    const photo = await ObjectManagerRepository.getInstance()
      .GalleryManager.getRandomPhoto(query);
    if (!photo) {
      return next(new ErrorDTO(ErrorCodes.INPUT_ERROR, 'No photo found'));
    }

    req.params.imagePath = path.join(photo.directory.path, photo.directory.name, photo.name);

    return next();
  }

  public static loadImage(req: Request, res: Response, next: NextFunction) {
    if (!(req.params.imagePath)) {
      return next();
    }

    const fullImagePath = path.join(ProjectPath.ImageFolder, req.params.imagePath);

    // check if thumbnail already exist
    if (fs.existsSync(fullImagePath) === false) {
      return next(new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'no such file:' + fullImagePath));
    }
    if (fs.statSync(fullImagePath).isDirectory()) {
      return next();
    }


    req.resultPipe = fullImagePath;
    return next();
  }


  public static async search(req: Request, res: Response, next: NextFunction) {
    if (Config.Client.Search.enabled === false) {
      return next();
    }

    if (!(req.params.text)) {
      return next();
    }

    let type: SearchTypes;
    if (req.query.type) {
      type = parseInt(req.query.type, 10);
    }
    try {
      const result = await ObjectManagerRepository.getInstance().SearchManager.search(req.params.text, type);

      result.directories.forEach(dir => dir.photos = dir.photos || []);
      req.resultPipe = new ContentWrapper(null, result);
      return next();
    } catch (err) {
      return next(new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'Error during searching', err));
    }
  }

  public static async instantSearch(req: Request, res: Response, next: NextFunction) {
    if (Config.Client.Search.instantSearchEnabled === false) {
      return next();
    }

    if (!(req.params.text)) {
      return next();
    }

    try {
      const result = await ObjectManagerRepository.getInstance().SearchManager.instantSearch(req.params.text);

      result.directories.forEach(dir => dir.photos = dir.photos || []);
      req.resultPipe = new ContentWrapper(null, result);
      return next();
    } catch (err) {
      return next(new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'Error during searching', err));
    }
  }

  public static async autocomplete(req: Request, res: Response, next: NextFunction) {
    if (Config.Client.Search.autocompleteEnabled === false) {
      return next();
    }
    if (!(req.params.text)) {
      return next();
    }

    try {
      req.resultPipe = await ObjectManagerRepository.getInstance().SearchManager.autocomplete(req.params.text);
      return next();
    } catch (err) {
      return next(new ErrorDTO(ErrorCodes.GENERAL_ERROR, 'Error during searching', err));
    }

  }


}
