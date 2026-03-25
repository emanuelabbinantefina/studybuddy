import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotesPage } from './notes.page';

describe('NotesPage', () => {
  let component: NotesPage;
  let fixture: ComponentFixture<NotesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(NotesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open the upload modal when requested', () => {
    component.openUploadModal();

    expect(component.showUploadPanel).toBeTrue();
  });
});
