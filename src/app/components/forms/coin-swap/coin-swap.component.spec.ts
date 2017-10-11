import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CoinSwapComponent } from './coin-swap.component';

describe('CoinSwapComponent', () => {
  let component: CoinSwapComponent;
  let fixture: ComponentFixture<CoinSwapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CoinSwapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoinSwapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
