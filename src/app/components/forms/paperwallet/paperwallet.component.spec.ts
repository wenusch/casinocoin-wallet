import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PaperwalletComponent } from './paperwallet.component';

describe('PaperwalletComponent', () => {
  let component: PaperwalletComponent;
  let fixture: ComponentFixture<PaperwalletComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PaperwalletComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaperwalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
