import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { OrdersGroupModalWidgetComponent } from './orders-group-modal-widget.component';
import { BlotterService } from "../../services/blotter.service";
import { BehaviorSubject } from "rxjs";
import { ngZorroMockComponents } from "../../../../shared/utils/testing/ng-zorro-component-mocks";
import { TranslocoTestsModule } from "../../../../shared/utils/testing/translocoTestsModule";

describe('OrdersGroupModalWidgetComponent', () => {
  let component: OrdersGroupModalWidgetComponent;
  let fixture: ComponentFixture<OrdersGroupModalWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        OrdersGroupModalWidgetComponent,
        ...ngZorroMockComponents
      ],
      imports: [TranslocoTestsModule.getModule()],
      providers: [
        {
          provide: BlotterService,
          useValue: {
            shouldShowOrderGroupModal$: new BehaviorSubject(false),
            orderGroupParams$: new BehaviorSubject(null),
            closeOrderGroupModal: jasmine.createSpy('closeOrderGroupModal').and.callThrough()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersGroupModalWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
