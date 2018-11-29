import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportpaperwalletComponent } from './importpaperwallet.component';

describe('ImportpaperwalletComponent', () => {
  let component: ImportpaperwalletComponent;
  let fixture: ComponentFixture<ImportpaperwalletComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportpaperwalletComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportpaperwalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
