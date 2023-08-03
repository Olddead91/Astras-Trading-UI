import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopOrderFormComponent } from './stop-order-form.component';

describe('StopOrderFormComponent', () => {
  let component: StopOrderFormComponent;
  let fixture: ComponentFixture<StopOrderFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StopOrderFormComponent]
    });
    fixture = TestBed.createComponent(StopOrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
