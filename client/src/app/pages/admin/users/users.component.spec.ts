import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersComponent } from './users.component';

describe('UsersComponent', () => {
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
  });

  it('should render empty state', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('app-empty-state')).toBeTruthy();
    expect(el.textContent).toContain('User Management');
  });
});
