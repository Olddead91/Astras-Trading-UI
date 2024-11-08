import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RisksComponent } from './risks.component';
import { InfoService } from "../../../services/info.service";
import {
  of,
  Subject
} from "rxjs";
import { DashboardContextService } from "../../../../../shared/services/dashboard-context.service";
import { LetDirective } from "@ngrx/component";
import { ComponentHelpers } from "../../../../../shared/utils/testing/component-helpers";
import { TranslocoTestsModule } from "../../../../../shared/utils/testing/translocoTestsModule";

describe('RisksComponent', () => {
  let component: RisksComponent;
  let fixture: ComponentFixture<RisksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        RisksComponent,
        ComponentHelpers.mockComponent({
          selector: 'ats-loading-indicator',
          inputs: ['isLoading']
        })
      ],
      imports: [
        TranslocoTestsModule.getModule(),
        LetDirective
      ],
      providers: [
        {
          provide: InfoService,
          useValue: {
            getRisksInfo: jasmine.createSpy('getRisksInfo').and.returnValue(of({}))
          }
        },
        {
          provide: DashboardContextService,
          useValue: {
            selectedPortfolio$: new Subject()
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RisksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
