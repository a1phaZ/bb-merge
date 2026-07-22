import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('should render login card', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('.login-card')).toBeTruthy();
    expect(el.textContent).toContain('Merge Request Creator');
    expect(el.textContent).toContain('Login page');
  });
});
