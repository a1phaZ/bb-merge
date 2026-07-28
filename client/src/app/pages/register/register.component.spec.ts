import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { RegisterComponent } from './register.component';
import { provideHttpClient } from '@angular/common/http';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), provideHttpClient(), provideTranslateService()],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  it('should render register card', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('.register-card')).toBeTruthy();
  });
});
