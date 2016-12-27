import {IGalleryManager} from "../interfaces/IGalleryManager";
import {DirectoryDTO} from "../../../common/entities/DirectoryDTO";
import * as path from "path";
import {DirectoryEnitity} from "./enitites/DirectoryEntity";
import {MySQLConnection} from "./MySQLConnection";
import {DiskManager} from "../DiskManger";
import {PhotoEntity} from "./enitites/PhotoEntity";
import {Utils} from "../../../common/Utils";

export class GalleryManager implements IGalleryManager {


    public listDirectory(relativeDirectoryName, cb: (error: any, result: DirectoryDTO) => void) {
        let directoryName = path.normalize(path.basename(relativeDirectoryName));
        let directoryParent = path.normalize(path.join(path.dirname(relativeDirectoryName), "/"));
        console.log("GalleryManager:listDirectory");
        console.log(directoryName, directoryParent, path.dirname(relativeDirectoryName), path.join(path.dirname(relativeDirectoryName), "/"));
        MySQLConnection.getConnection().then(async connection => {

            let dir = await connection
                .getRepository(DirectoryEnitity)
                .createQueryBuilder("directory_entity")
                .where("directory_entity.name = :name AND directory_entity.path = :path", {
                    name: directoryName,
                    path: directoryParent
                })
                .innerJoinAndSelect("directory_entity.directories", "directories")
                .innerJoinAndSelect("directory_entity.photos", "photos")
                .getOne();


            console.log(dir);
            if (dir) {
                for (let i = 0; i < dir.photos.length; i++) {
                    dir.photos[i].directory = dir;
                    dir.photos[i].metadata.keywords = <any>JSON.parse(<any>dir.photos[i].metadata.keywords);
                    dir.photos[i].metadata.cameraData = <any>JSON.parse(<any>dir.photos[i].metadata.cameraData);
                    dir.photos[i].metadata.positionData = <any>JSON.parse(<any>dir.photos[i].metadata.positionData);
                    dir.photos[i].metadata.size = <any>JSON.parse(<any>dir.photos[i].metadata.size);
                }
                return cb(null, dir);
            }
            return this.indexDirectory(relativeDirectoryName, cb);


        }).catch((error) => {
            return cb(error, null);
        });


    }

    public indexDirectory(relativeDirectoryName, cb: (error: any, result: DirectoryDTO) => void) {
        DiskManager.scanDirectory(relativeDirectoryName, (err, scannedDirectory) => {
            MySQLConnection.getConnection().then(async connection => {

                let directoryRepository = connection.getRepository(DirectoryEnitity);
                let photosRepository = connection.getRepository(PhotoEntity);

                let parentDir = await directoryRepository.persist(scannedDirectory);

                for (let i = 0; i < scannedDirectory.directories.length; i++) {
                    scannedDirectory.directories[i].parent = parentDir;
                    await directoryRepository.persist(scannedDirectory.directories[i]);
                }

                for (let i = 0; i < scannedDirectory.photos.length; i++) {

                    //typeorm not supports recursive embended: TODO:fix it
                    scannedDirectory.photos[i].directory = null;
                    let photo = Utils.clone(scannedDirectory.photos[i]);
                    scannedDirectory.photos[i].directory = scannedDirectory;
                    photo.directory = parentDir;
                    photo.metadata.keywords = <any>JSON.stringify(photo.metadata.keywords);
                    photo.metadata.cameraData = <any>JSON.stringify(photo.metadata.cameraData);
                    photo.metadata.positionData = <any>JSON.stringify(photo.metadata.positionData);
                    photo.metadata.size = <any>JSON.stringify(photo.metadata.size);
                    await photosRepository.persist(photo);
                }


                return cb(null, parentDir);


            }).catch((error) => {
                return cb(error, null);
            });
        });
    }

}