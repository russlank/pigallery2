import {AuthenticationMWs} from '../middlewares/user/AuthenticationMWs';
import {UserRoles} from '../../common/entities/UserDTO';
import {RenderingMWs} from '../middlewares/RenderingMWs';
import {AdminMWs} from '../middlewares/AdminMWs';

export class AdminRouter {
  public static route(app: any) {

    this.addIndexGallery(app);
    this.addSettings(app);
  }


  private static addIndexGallery(app) {
    app.get('/api/admin/indexes/job/progress',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.getIndexingProgress,
      RenderingMWs.renderResult
    );
    app.put('/api/admin/indexes/job',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.startIndexing,
      RenderingMWs.renderResult
    );
    app.delete('/api/admin/indexes/job',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.cancelIndexing,
      RenderingMWs.renderResult
    );
    app.delete('/api/admin/indexes',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.resetIndexes,
      RenderingMWs.renderResult
    );
  }

  private static addSettings(app) {
    app.get('/api/settings',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      RenderingMWs.renderConfig
    );


    app.put('/api/settings/database',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateDatabaseSettings,
      RenderingMWs.renderOK
    );

    app.put('/api/settings/map',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateMapSettings,
      RenderingMWs.renderOK
    );

    app.put('/api/settings/authentication',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateAuthenticationSettings,
      RenderingMWs.renderOK
    );
    app.put('/api/settings/thumbnail',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateThumbnailSettings,
      RenderingMWs.renderOK
    );
    app.put('/api/settings/search',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateSearchSettings,
      RenderingMWs.renderOK
    );
    app.put('/api/settings/share',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateShareSettings,
      RenderingMWs.renderOK
    );
    app.put('/api/settings/randomPhoto',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateRandomPhotoSettings,
      RenderingMWs.renderOK
    );
    app.put('/api/settings/basic',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateBasicSettings,
      RenderingMWs.renderOK
    );
    app.put('/api/settings/other',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateOtherSettings,
      RenderingMWs.renderOK
    );
    app.put('/api/settings/indexing',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Admin),
      AdminMWs.updateIndexingSettings,
      RenderingMWs.renderOK
    );
  }


}
