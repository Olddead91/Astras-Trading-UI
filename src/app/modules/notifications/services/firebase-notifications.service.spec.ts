import { TestBed } from '@angular/core/testing';

import { FirebaseNotificationsService } from './firebase-notifications.service';
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { AngularFireMessaging } from "@angular/fire/compat/messaging";
import { of } from "rxjs";
import { AuthService } from "../../../shared/services/auth.service";
import { Store } from "@ngrx/store";
import { ErrorHandlerService } from "../../../shared/services/handle-error/error-handler.service";

describe('FirebaseNotificationsService', () => {
  let service: FirebaseNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ],
      providers: [
        {
          provide: AngularFireMessaging,
          useValue: {
            requestToken: of('testToken')
          }
        },
        {
          provide: AuthService,
          useValue: {
            currentUser$: of({ refreshToken: 'testRefreshToken' })
          }
        },
        {
          provide: Store,
          useValue: {
            select: jasmine.createSpy('select').and.returnValue(of({})),
          }
        },
        {
          provide: ErrorHandlerService,
          useValue: {}
        }
      ]
    });
    service = TestBed.inject(FirebaseNotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
