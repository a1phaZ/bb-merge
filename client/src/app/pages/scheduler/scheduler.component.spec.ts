import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchedulerComponent } from './scheduler.component';

describe('SchedulerComponent', () => {
  let fixture: ComponentFixture<SchedulerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchedulerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SchedulerComponent);
    fixture.detectChanges();
  });

  it('should render empty state', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('app-empty-state')).toBeTruthy();
    expect(el.textContent).toContain('Scheduled Tasks');
  });
});
