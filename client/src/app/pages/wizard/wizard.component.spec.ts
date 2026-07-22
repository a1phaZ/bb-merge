import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WizardComponent } from './wizard.component';

describe('WizardComponent', () => {
  let fixture: ComponentFixture<WizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WizardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WizardComponent);
    fixture.detectChanges();
  });

  it('should render wizard card', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('.wizard-card')).toBeTruthy();
    expect(el.textContent).toContain('Setup Wizard');
  });
});
