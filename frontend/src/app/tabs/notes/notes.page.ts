import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Appunto } from '../../core/interfaces/models';
import { UserService } from '../../core/services/user.service';

type NoteTab = 'all' | 'mine' | 'saved';
type FileFilter = '' | 'pdf' | 'doc' | 'img';
type SortMode = 'newest' | 'oldest';
type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-notes',
  standalone: true,
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class NotesPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private notesRequestId = 0;
  private uploadSubjectsRequestId = 0;
  private browseFiltersRequestId = 0;
  private readonly destroy$ = new Subject<void>();
  private lastProfileFaculty = '';
  private lastProfileCourse = '';

  private readonly fileSizeLimits = {
    pdf: 10 * 1024 * 1024,
    doc: 8 * 1024 * 1024,
    jpg: 8 * 1024 * 1024,
    png: 4 * 1024 * 1024,
  } as const;

  query = '';
  activeTab: NoteTab = 'all';
  activeFileFilter: FileFilter = '';
  activeSubjectFilter = '';
  sortMode: SortMode = 'newest';
  viewMode: ViewMode = 'grid';
  showFilters = false;
  activeFacultyFilter = '';

  sessionUserName = 'Utente';
  myFacultyLabel = '';
  myCourseLabel = '';
  showAllFaculties = true;

  loading = false;
  downloadingNoteId: number | null = null;
  deletingNoteId: number | null = null;
  savingNoteId: number | null = null;

  showUploadPanel = false;
  uploading = false;
  dragActive = false;
  selectedFile: File | null = null;
  uploadTitle = '';
  uploadSubject = '';

  allNotes: Appunto[] = [];
  filteredNotes: Appunto[] = [];
  selectedNote: Appunto | null = null;

  uploadSubjectOptions: string[] = [];
  browseSubjectOptions: string[] = [];
  facultyOptions: string[] = [];
  readonly fileAccept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
  readonly uploadExtensions = [
    'PDF 10MB',
    'DOC 8MB',
    'DOCX 8MB',
    'JPG/JPEG 8MB',
    'PNG 4MB',
  ];

  totalUploaded = 0;
  totalSaved = 0;

  private pendingNoteId: number | null = null;

  constructor(
    private apiService: ApiService,
    private toastCtrl: ToastController,
    private userService: UserService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.sessionUserName = this.readSessionUserName();
    this.loadStats();
    this.bindProfileSync();
    this.loadNoteContext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 ionViewWillEnter() {
  this.activeTab = 'all';
  this.activeFileFilter = '';
  this.activeSubjectFilter = '';
  this.activeFacultyFilter = '';
  this.sortMode = 'newest';
  this.query = '';
  this.selectedNote = null;
  this.showFilters = false;
  this.showAllFaculties = true;

  const noteId = this.route.snapshot.queryParamMap.get('noteId');
  this.pendingNoteId = noteId ? Number(noteId) : null;

  this.loadStats();
  this.loadNoteContext();
}
  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.query = target?.value || '';
    this.eseguiRicerca();
  }

  setTab(tab: NoteTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.applyNoteFilters();
  }

  setFileFilter(filter: FileFilter): void {
    this.activeFileFilter = this.activeFileFilter === filter ? '' : filter;
    this.applyNoteFilters();
  }

  setSubjectFilter(subject: string): void {
    if (!this.canFilterBySubject) return;
    this.activeSubjectFilter =
      this.activeSubjectFilter === subject ? '' : subject;
    this.eseguiRicerca();
  }

  setFacultyFilter(faculty: string): void {
    const nextValue = this.activeFacultyFilter === faculty ? '' : faculty;
    this.activeFacultyFilter = nextValue;
    this.activeSubjectFilter = '';
    this.refreshBrowseFiltersAndNotes();
  }

  setSortMode(mode: SortMode): void {
    this.sortMode = mode;
    this.applyNoteFilters();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.activeFileFilter) count++;
    if (this.sortMode !== 'newest') count++;
    return count;
  }

  clearAllFilters(): void {
    this.activeFileFilter = '';
    this.sortMode = 'newest';
    this.refreshBrowseFiltersAndNotes();
  }

  onFacultyScopeChange(showAll: boolean): void {
    if (!this.myFacultyLabel) return;
    if (this.showAllFaculties === showAll) return;
    this.showAllFaculties = showAll;
    this.activeSubjectFilter = '';
    if (!showAll) {
      this.activeFacultyFilter = '';
    }
    this.allNotes = [];
    this.filteredNotes = [];
    this.refreshBrowseFiltersAndNotes();
  }

  get facultyScopeTitle(): string {
    if (!this.myFacultyLabel || this.showAllFaculties) {
      return 'Tutte le facoltà';
    }
    return `Solo ${this.myFacultyLabel}`;
  }

  get facultyScopeDescription(): string {
    const count = this.filteredNotes.length;
    const label = count === 1 ? 'appunto' : 'appunti';
    if (!this.myFacultyLabel || this.showAllFaculties) {
      return `${count} ${label} da tutte le facoltà`;
    }
    return `${count} ${label} della tua facoltà`;
  }

  get canFilterBySubject(): boolean {
    return this.currentScope === 'faculty' && this.browseSubjectOptions.length > 0;
  }

  get resultCountLabel(): string {
    const count = this.filteredNotes.length;
    if (count === 0) return 'Nessun risultato';
    if (count === 1) return '1 appunto trovato';
    return `${count} appunti trovati`;
  }

  onRefresh(event: any): void {
    this.loadNoteContext();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  openNoteDetail(note: Appunto) {
    this.selectedNote = note;
  }

  closeNoteDetail() {
    this.selectedNote = null;
  }

  getFileLabel(tipo: Appunto['tipoFile']): string {
    if (tipo === 'pdf') return 'PDF';
    if (tipo === 'doc') return 'DOC';
    return 'IMG';
  }

  getNoteAccent(tipo: Appunto['tipoFile']): string {
    if (tipo === 'pdf') return 'note-pdf';
    if (tipo === 'doc') return 'note-doc';
    return 'note-img';
  }

  getUploaderName(note: Appunto): string {
    const raw =
      note.autoreNome ||
      (note as any).autore ||
      (note as any).authorName ||
      (note as any).uploaderName;
    const normalized = String(raw || '').trim();
    if (normalized) return normalized;
    if (note.canDelete) return this.sessionUserName;
    return 'Utente';
  }

  getNoteFaculty(note: Appunto | null | undefined): string | null {
    const value = String(note?.facolta || '').trim();
    if (value) return value;
    if (note?.canDelete && this.myFacultyLabel) {
      return this.myFacultyLabel;
    }
    return null;
  }

  toggleUploadPanel(): void {
    if (this.showUploadPanel) {
      this.closeUploadModal();
      return;
    }

    this.openUploadModal();
  }

  openUploadModal(): void {
    this.showUploadPanel = true;
    this.syncDefaultUploadSubject();
  }

  closeUploadModal(force = false): void {
    if (this.uploading && !force) return;
    this.resetUploadState();
    this.showUploadPanel = false;
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) || null;
    if (!file) return;
    this.handleSelectedFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
    const file = event.dataTransfer?.files?.item(0) || null;
    if (!file) return;
    this.handleSelectedFile(file);
  }

  resetUploadForm(): void {
    this.closeUploadModal();
  }

  async submitUpload(): Promise<void> {
    if (this.uploading) return;
    if (!this.uploadSubjectOptions.length) {
      await this.showToast(
        'Completa il corso di laurea triennale nel profilo per scegliere una materia valida',
        'warning'
      );
      return;
    }
    if (!this.selectedFile) {
      await this.showToast('Seleziona un file prima di caricare', 'warning');
      return;
    }

    const titolo = this.uploadTitle.trim();
    const materia = this.uploadSubject.trim();
    if (!titolo || !materia) {
      await this.showToast('Titolo e materia sono obbligatori', 'warning');
      return;
    }
    if (!this.uploadSubjectOptions.includes(materia)) {
      await this.showToast('Seleziona una materia valida per il tuo corso', 'warning');
      return;
    }

    try {
      this.uploading = true;
      const fileData = await this.readFileAsDataUrl(this.selectedFile);

      await firstValueFrom(
        this.apiService.uploadAppunto({
          titolo,
          materia,
          tipoFile: this.resolveTipoFile(this.selectedFile),
          fileName: this.selectedFile.name,
          mimeType: this.selectedFile.type || undefined,
          sizeBytes: this.selectedFile.size,
          fileData,
        })
      );

      this.incrementStat('uploaded');
      await this.showToast('Appunto caricato con successo', 'success');
      this.closeUploadModal(true);
      this.query = '';
      this.loadNoteContext();
    } catch (err: any) {
      const message =
        err?.error?.message || 'Errore durante il caricamento appunto';
      await this.showToast(message, 'danger');
    } finally {
      this.uploading = false;
    }
  }

  formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024)
      return `${Math.round(sizeBytes / 1024)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async downloadNote(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.downloadingNoteId) return;

    try {
      this.downloadingNoteId = note.id;
      const response = await firstValueFrom(
        this.apiService.downloadAppunto(note.id)
      );
      const blob = response.body;
      if (!blob) throw new Error('contenuto vuoto');

      const fileName =
        this.extractFileName(response.headers.get('content-disposition')) ||
        this.buildFallbackFileName(note);
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();

      URL.revokeObjectURL(url);
      // stat download rimossa
    } catch (err: any) {
      const message =
        err?.error?.message || 'Impossibile scaricare il file';
      await this.showToast(message, 'danger');
    } finally {
      this.downloadingNoteId = null;
    }
  }

  async deleteNote(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!note.canDelete || this.deletingNoteId) return;

    try {
      this.deletingNoteId = note.id;
      await firstValueFrom(this.apiService.deleteAppunto(note.id));
      await this.showToast('Appunto eliminato', 'success');
      if (this.selectedNote?.id === note.id) {
        this.selectedNote = null;
      }
      this.eseguiRicerca();
    } catch (err: any) {
      const message =
        err?.error?.message || 'Impossibile eliminare appunto';
      await this.showToast(message, 'danger');
    } finally {
      this.deletingNoteId = null;
    }
  }

  async toggleBookmark(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (note.canDelete || this.savingNoteId) return;

    const nextState = !note.isSaved;

    try {
      this.savingNoteId = note.id;
      if (nextState) {
        await firstValueFrom(this.apiService.saveAppunto(note.id));
        this.incrementStat('saved');
      } else {
        await firstValueFrom(this.apiService.unsaveAppunto(note.id));
        this.decrementStat('saved');
      }
      note.isSaved = nextState;
      if (this.selectedNote?.id === note.id) {
        this.selectedNote.isSaved = nextState;
      }

      if (this.activeTab === 'saved') {
        this.applyNoteFilters();
      }

      await this.showToast(
        nextState
          ? 'Appunto salvato nei bookmark'
          : 'Appunto rimosso dai bookmark',
        'success'
      );
    } catch (err: any) {
      const message =
        err?.error?.message || 'Impossibile aggiornare i bookmark';
      await this.showToast(message, 'danger');
    } finally {
      this.savingNoteId = null;
    }
  }

  private handleSelectedFile(file: File): void {
    if (!this.isAcceptedFile(file)) {
      void this.showToast(
        'Formato non supportato. Usa PDF, DOC, DOCX, JPG o PNG',
        'warning'
      );
      return;
    }

    const maxFileBytes = this.getMaxFileBytes(file);
    if (file.size > maxFileBytes) {
      void this.showToast(
        `${this.getUploadTypeLabel(file)} troppo grande. Massimo ${this.formatLimit(maxFileBytes)}`,
        'warning'
      );
      return;
    }

    this.selectedFile = file;
    this.showUploadPanel = true;

    if (!this.uploadTitle) {
      const dotIndex = file.name.lastIndexOf('.');
      this.uploadTitle =
        dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
    }
  }

  private isAcceptedFile(file: File): boolean {
    const ext = this.getFileExtension(file.name);
    return ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext);
  }

  private resolveTipoFile(file: File): 'pdf' | 'doc' | 'img' {
    const ext = this.getFileExtension(file.name);
    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx') return 'doc';
    return 'img';
  }

  private getMaxFileBytes(file: File): number {
    const ext = this.getFileExtension(file.name);
    if (ext === 'pdf') return this.fileSizeLimits.pdf;
    if (ext === 'doc' || ext === 'docx') return this.fileSizeLimits.doc;
    if (ext === 'jpg' || ext === 'jpeg') return this.fileSizeLimits.jpg;
    return this.fileSizeLimits.png;
  }

  private getUploadTypeLabel(file: File): string {
    const ext = this.getFileExtension(file.name);
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx') return 'DOC/DOCX';
    if (ext === 'jpg' || ext === 'jpeg') return 'JPG/JPEG';
    return 'PNG';
  }

  private formatLimit(sizeBytes: number): string {
    return `${Math.round(sizeBytes / (1024 * 1024))} MB`;
  }

  private getFileExtension(fileName: string): string {
    const idx = fileName.lastIndexOf('.');
    return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : '';
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Lettura file fallita'));
      reader.readAsDataURL(file);
    });
  }

  private extractFileName(
    contentDisposition: string | null
  ): string | null {
    if (!contentDisposition) return null;
    const utfMatch = contentDisposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );
    if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
    const plainMatch = contentDisposition.match(
      /filename=\"?([^\";]+)\"?/i
    );
    return plainMatch?.[1] || null;
  }

  private buildFallbackFileName(note: Appunto): string {
    const safeTitle = (note.titolo || 'appunto').replace(/[^\w\-]+/g, '_');
    if (note.tipoFile === 'pdf') return `${safeTitle}.pdf`;
    if (note.tipoFile === 'doc') return `${safeTitle}.docx`;
    return `${safeTitle}.png`;
  }

  eseguiRicerca() {
    const requestId = ++this.notesRequestId;
    const scope = this.currentScope;
    const subjectFilter = scope === 'faculty' ? this.activeSubjectFilter : '';
    this.loading = true;

    this.apiService
      .getAppunti(
        this.query,
        subjectFilter,
        scope,
        this.currentBrowseFacultyFilter
      )
      .subscribe({
      next: (res) => {
        if (requestId !== this.notesRequestId) return;
        this.allNotes = Array.isArray(res) ? res : [];
        this.applyNoteFilters();
        this.loading = false;
        if (this.pendingNoteId !== null) {
          const note = this.allNotes.find((n) => n.id === this.pendingNoteId);
          if (note) this.selectedNote = note;
          this.pendingNoteId = null;
        }
      },
      error: () => {
        if (requestId !== this.notesRequestId) return;
        this.allNotes = [];
        this.applyNoteFilters();
        this.loading = false;
      },
      });
  }

  private applyNoteFilters(): void {
    const source = Array.isArray(this.allNotes) ? this.allNotes : [];
    const query = this.normalizeText(this.query);

    let filtered = source;

    if (this.activeTab === 'mine') {
      filtered = filtered.filter((n) => n.canDelete);
    } else if (this.activeTab === 'saved') {
      filtered = filtered.filter((n) => n.isSaved);
    }

    if (this.activeFileFilter) {
      filtered = filtered.filter(
        (n) => n.tipoFile === this.activeFileFilter
      );
    }

    if (this.currentBrowseFacultyFilter) {
      filtered = filtered.filter(
        (n) => this.normalizeText(this.getNoteFaculty(n)) === this.normalizeText(this.currentBrowseFacultyFilter)
      );
    }

    if (this.activeSubjectFilter) {
      filtered = filtered.filter(
        (n) => n.materia === this.activeSubjectFilter
      );
    }

    if (query) {
      filtered = filtered.filter((n) => {
        const searchableValues = [
          n.titolo,
          n.materia,
          n.autoreNome,
          this.getNoteFaculty(n),
        ];
        return searchableValues.some((value) =>
          this.normalizeText(value).includes(query)
        );
      });
    }

    if (this.sortMode === 'oldest') {
      filtered = [...filtered].reverse();
    }

    this.filteredNotes = filtered;

    if (!this.selectedNote) return;
    const nextSelectedNote =
      filtered.find((n) => n.id === this.selectedNote?.id) || null;
    this.selectedNote = nextSelectedNote;
  }

  private get currentScope(): 'all' | 'faculty' {
    return this.myFacultyLabel && !this.showAllFaculties ? 'faculty' : 'all';
  }

  private get currentBrowseFacultyFilter(): string {
    if (this.currentScope !== 'all') return '';
    return String(this.activeFacultyFilter || '').trim();
  }

  private normalizeText(value: unknown): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private bindProfileSync(): void {
    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        const nextName =
          String(profile?.displayName || profile?.nome || '').trim() ||
          this.readSessionUserName();
        this.sessionUserName = nextName || 'Utente';

        const nextFaculty = String(profile?.facolta || '').trim();
        const nextCourse = String(profile?.corso || '').trim();
        const hasAcademicChange =
          nextFaculty !== this.lastProfileFaculty ||
          nextCourse !== this.lastProfileCourse;

        this.lastProfileFaculty = nextFaculty;
        this.lastProfileCourse = nextCourse;

        if (hasAcademicChange) {
          this.loadNoteContext();
        }
      });
  }

  private loadNoteContext(): void {
    this.loadUploadSubjects();
  }

  private loadUploadSubjects(): void {
    const requestId = ++this.uploadSubjectsRequestId;

    this.apiService.getNoteSubjects('faculty', 'upload').subscribe({
      next: (result) => {
        if (requestId !== this.uploadSubjectsRequestId) return;
        const subjects = Array.isArray(result?.subjects) ? result.subjects : [];
        this.uploadSubjectOptions = subjects;
        if (
          this.uploadSubject &&
          !subjects.includes(this.uploadSubject)
        ) {
          this.uploadSubject = '';
        }
        this.syncDefaultUploadSubject();
        this.myFacultyLabel = String(result?.faculty || '').trim();
        this.myCourseLabel = String(result?.course || '').trim();
        if (!this.myFacultyLabel) {
          this.showAllFaculties = true;
        }
        this.refreshBrowseFiltersAndNotes();
      },
      error: () => {
        if (requestId !== this.uploadSubjectsRequestId) return;
        this.uploadSubjectOptions = [];
        this.myFacultyLabel = '';
        this.myCourseLabel = '';
        this.showAllFaculties = true;
        this.refreshBrowseFiltersAndNotes();
      },
    });
  }

  private refreshBrowseFiltersAndNotes(): void {
    const requestId = ++this.browseFiltersRequestId;
    const scope = this.currentScope;
    const selectedFaculty = this.currentBrowseFacultyFilter;

    this.apiService.getNoteSubjects(scope, 'browse', selectedFaculty).subscribe({
      next: (result) => {
        if (requestId !== this.browseFiltersRequestId) return;

        const nextFaculties = Array.isArray(result?.faculties)
          ? result.faculties
          : [];
        const nextSubjects = Array.isArray(result?.subjects)
          ? result.subjects
          : [];

        this.facultyOptions = nextFaculties;
        this.browseSubjectOptions = nextSubjects;

        if (
          this.activeFacultyFilter &&
          this.currentScope === 'all' &&
          !nextFaculties.includes(this.activeFacultyFilter)
        ) {
          this.activeFacultyFilter = '';
          this.refreshBrowseFiltersAndNotes();
          return;
        }

        if (
          this.activeSubjectFilter &&
          !nextSubjects.includes(this.activeSubjectFilter)
        ) {
          this.activeSubjectFilter = '';
        }

        this.eseguiRicerca();
      },
      error: () => {
        if (requestId !== this.browseFiltersRequestId) return;
        this.facultyOptions = [];
        this.browseSubjectOptions = [];
        if (this.activeFacultyFilter) {
          this.activeFacultyFilter = '';
        }
        if (this.activeSubjectFilter) {
          this.activeSubjectFilter = '';
        }
        this.eseguiRicerca();
      },
    });
  }

  private readSessionUserName(): string {
    const fromSession = localStorage.getItem('user_data');
    if (fromSession) {
      try {
        const parsed = JSON.parse(fromSession);
        const userId = Number(parsed?.id || 0) || null;
        const profileKey = userId ? `user_profile_${userId}` : null;
        if (profileKey) {
          const fromProfile = localStorage.getItem(profileKey);
          if (fromProfile) {
            const savedProfile = JSON.parse(fromProfile);
            const savedName = String(
              savedProfile?.nome || savedProfile?.nickname || ''
            ).trim();
            if (savedName) return savedName;
          }
        }
        const name = String(
          parsed?.name || parsed?.nickname || ''
        ).trim();
        if (name) return name;
      } catch {
        // ignore
      }
    }
    return 'Utente';
  }

  private loadStats(): void {
    this.totalUploaded =
      parseInt(localStorage.getItem('notes_stat_uploaded') || '0', 10) || 0;
    this.totalSaved =
      parseInt(localStorage.getItem('notes_stat_saved') || '0', 10) || 0;
  }

  private incrementStat(key: 'uploaded' | 'saved'): void {
    const storageKey = `notes_stat_${key}`;
    const current =
      parseInt(localStorage.getItem(storageKey) || '0', 10) || 0;
    const next = current + 1;
    localStorage.setItem(storageKey, next.toString());

    if (key === 'uploaded') this.totalUploaded = next;
    if (key === 'saved') this.totalSaved = next;
  }

  private resetUploadState(): void {
    this.selectedFile = null;
    this.uploadTitle = '';
    this.uploadSubject = '';
    this.dragActive = false;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private syncDefaultUploadSubject(): void {
    if (!this.uploadSubject && this.uploadSubjectOptions.length === 1) {
      this.uploadSubject = this.uploadSubjectOptions[0];
    }
  }

  private decrementStat(key: 'saved'): void {
    const storageKey = `notes_stat_${key}`;
    const current =
      parseInt(localStorage.getItem(storageKey) || '0', 10) || 0;
    const next = Math.max(0, current - 1);
    localStorage.setItem(storageKey, next.toString());
    this.totalSaved = next;
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1700,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
