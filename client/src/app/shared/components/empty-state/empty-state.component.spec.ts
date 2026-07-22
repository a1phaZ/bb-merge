import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  async function setup(inputs?: { icon?: string; title?: string; description?: string }) {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();
    return { fixture };
  }

  it('should render with default values', async () => {
    const { fixture } = await setup();
    const el = fixture.nativeElement;
    expect(el.querySelector('.empty-state')).toBeTruthy();
    expect(el.querySelector('mat-icon')!.textContent).toContain('inbox');
    expect(el.querySelector('h3')!.textContent).toContain('Nothing here');
  });

  it('should render custom icon, title and description via host component', async () => {
    @Component({
      standalone: true,
      imports: [EmptyStateComponent],
      template: `
        <app-empty-state icon="cloud" title="No providers" description="Add a provider to get started" />
      `,
    })
    class TestHost {}

    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const el = fixture.nativeElement;

    expect(el.querySelector('mat-icon')!.textContent).toContain('cloud');
    expect(el.querySelector('h3')!.textContent).toContain('No providers');
    expect(el.querySelector('p')!.textContent).toContain('Add a provider to get started');
  });

  it('should project ng-content', async () => {
    @Component({
      standalone: true,
      imports: [EmptyStateComponent],
      template: `
        <app-empty-state icon="cloud" title="Test">
          <button class="projected-btn">Click me</button>
        </app-empty-state>
      `,
    })
    class TestHostComponent {}

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('.projected-btn'));
    expect(btn).toBeTruthy();
    expect(btn.nativeElement.textContent).toContain('Click me');
  });

  it('should have correct CSS classes and structure', async () => {
    @Component({
      standalone: true,
      imports: [EmptyStateComponent],
      template: `<app-empty-state icon="history" title="Empty" description="No items" />`,
    })
    class TestHost {}

    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const el = fixture.nativeElement;
    const container = el.querySelector('.empty-state');
    expect(container).toBeTruthy();
    expect(container.querySelector('mat-icon')).toBeTruthy();
    expect(container.querySelector('h3')).toBeTruthy();
    expect(container.querySelector('p')).toBeTruthy();
  });
});
