import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtdDashboardComponent } from './atd-dashboard.component';

describe('AtdDashboardComponent', () => {
  let component: AtdDashboardComponent;
  let fixture: ComponentFixture<AtdDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtdDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtdDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
