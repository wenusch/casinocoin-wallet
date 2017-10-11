import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceiveCoinsComponent } from './receive-coins.component';

describe('ReceiveCoinsComponent', () => {
  let component: ReceiveCoinsComponent;
  let fixture: ComponentFixture<ReceiveCoinsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReceiveCoinsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReceiveCoinsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
