import {inject, TestBed} from '@angular/core/testing';
import {UserService} from './user.service';
import {UserDTO} from '../../../../common/entities/UserDTO';
import {LoginCredential} from '../../../../common/entities/LoginCredential';
import {AuthenticationService} from './authentication.service';
import {NetworkService} from './network.service';
import {ErrorDTO} from '../../../../common/entities/Error';

class MockUserService {
  public login(credential: LoginCredential): Promise<UserDTO> {
    return Promise.resolve(<UserDTO>{name: 'testUserName'});
  }

  public async getSessionUser() {
    return null;
  }
}

class MockNetworkService {
  addGlobalErrorHandler(fn: (error: ErrorDTO) => boolean) {
  }
}

describe('AuthenticationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: NetworkService, useClass: MockNetworkService},
        {provide: UserService, useClass: MockUserService},
        AuthenticationService,
      ]
    });
  });


  it('should call UserDTO service login', inject([AuthenticationService, UserService],
    async (authService, userService) => {
      spyOn(userService, 'login').and.callThrough();

      expect(userService.login).not.toHaveBeenCalled();
      await  authService.login();
      expect(userService.login).toHaveBeenCalled();
    }));

  it('should have NO Authenticated use', inject([AuthenticationService],
    (authService: AuthenticationService) => {
      expect(authService.user.value).toBe(null);
      expect(authService.isAuthenticated()).toBe(false);
    }));


  it('should have Authenticated use', (done) => inject([AuthenticationService],
    (authService: AuthenticationService) => {
      spyOn(authService.user, 'next').and.callThrough();
      authService.user.subscribe((user) => {
        if (user == null) {
          return;
        }
        expect(authService.user.next).toHaveBeenCalled();
        expect(authService.user.value).not.toBe(null);
        expect(authService.isAuthenticated()).toBe(true);
        done();
      });
      authService.login(<any>{});
    })());

});
