import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { IonContent, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { ApiService } from '../../core/services/api.service';
import { Appunto, GroupBoardMessage, GroupQuestion, Gruppo } from '../../core/interfaces/models';
import { NewGroupModalComponent } from './new-group-modal/new-group-modal.component';

type GroupTab = 'appunti' | 'bacheca' | 'domande';

interface ThreadedBoardMessage extends GroupBoardMessage {
  depth: number;
  rootId: number;
  childCount: number;
}

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GroupsPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content?: IonContent;
  @ViewChild('groupFileInput', { static: false }) groupFileInput?: ElementRef<HTMLInputElement>;

  private readonly fileSizeLimits = {
    pdf: 10 * 1024 * 1024,
    doc: 8 * 1024 * 1024,
    jpg: 8 * 1024 * 1024,
    png: 4 * 1024 * 1024,
  } as const;

  loadingList = false;
  loadingWorkspace = false;
  uploadingNote = false;
  sendingBoardMessage = false;
  savingQuestion = false;
  readonly minQuestionYear = 2000;
  readonly maxQuestionYear = new Date().getFullYear();
  readonly questionSessionOptions = [
    'Sessione invernale',
    'Sessione primaverile',
    'Sessione estiva',
    'Sessione autunnale',
  ];

  gruppi: Gruppo[] = [];
  selectedGroup: Gruppo | null = null;
  activeTab: GroupTab = 'appunti';

  groupNotes: Appunto[] = [];
  boardMessages: GroupBoardMessage[] = [];
  threadedBoardMessages: ThreadedBoardMessage[] = [];
  questions: GroupQuestion[] = [];

  showBoardComposer = false;
  showQuestionComposer = false;
  boardDraft = '';
  replyDraft = '';
  replyTargetId: number | null = null;
  questionDraft = '';
  questionSessionDraft = '';
  questionYearDraft = '';

  private currentUserId = 0;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly apiService: ApiService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.readSessionUserId();
    this.loadGroups();
  }

  ionViewWillEnter(): void {
    if (!this.selectedGroup) {
      this.loadGroups();
    }
  }

  async onCreateGroup(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NewGroupModalComponent,
      cssClass: 'create-group-modal',
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92,
      expandToScroll: false,
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.loadGroups();
    }
  }

  async openGroup(group: Gruppo): Promise<void> {
    if (!group.isMember) {
      try {
        await firstValueFrom(this.apiService.joinPublicGroup(group.id));
      } catch (err: any) {
        await this.showToast(err?.error?.message || 'Impossibile entrare nel gruppo', 'danger');
        return;
      }
    }

    this.selectedGroup = { ...group, isMember: true };
    this.activeTab = 'appunti';
    this.resetWorkspaceForms();
    this.scrollToTopSoon();
    this.loadWorkspace(group.id);
  }

  closeGroup(): void {
    this.selectedGroup = null;
    this.groupNotes = [];
    this.boardMessages = [];
    this.threadedBoardMessages = [];
    this.questions = [];
    this.resetWorkspaceForms();
    this.scrollToTopSoon();
    this.loadGroups();
  }

  setTab(tab: GroupTab): void {
    this.activeTab = tab;
  }

  triggerGroupNoteUpload(): void {
    if (!this.selectedGroup?.isMember || this.uploadingNote) return;
    this.groupFileInput?.nativeElement.click();
  }

  onGroupNoteSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) || null;
    if (!file) return;
    void this.uploadGroupNote(file);
  }

  async uploadGroupNote(file: File): Promise<void> {
    if (!this.selectedGroup?.id || this.uploadingNote) return;

    if (!this.isAcceptedFile(file)) {
      await this.showToast('Formato non supportato. Usa PDF, DOC, DOCX, JPG o PNG', 'warning');
      this.resetGroupFileInput();
      return;
    }

    const maxBytes = this.getMaxFileBytes(file);
    if (file.size > maxBytes) {
      await this.showToast(
        `${this.getUploadTypeLabel(file)} troppo grande. Massimo ${this.formatLimit(maxBytes)}`,
        'warning'
      );
      this.resetGroupFileInput();
      return;
    }

    this.uploadingNote = true;
    try {
      const fileData = await this.readFileAsDataUrl(file);
      await firstValueFrom(
        this.apiService.uploadAppunto({
          titolo: this.buildTitleFromFileName(file.name),
          materia: this.selectedGroup.materia,
          tipoFile: this.resolveTipoFile(file),
          fileName: file.name,
          mimeType: file.type || undefined,
          sizeBytes: file.size,
          fileData,
          groupId: this.selectedGroup.id,
        })
      );

      await this.showToast('Appunto caricato nel gruppo', 'success');
      await this.reloadNotes();
      await this.reloadGroupDetail();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore caricamento appunto', 'danger');
    } finally {
      this.uploadingNote = false;
      this.resetGroupFileInput();
    }
  }

  async downloadGroupNote(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();

    try {
      const response = await firstValueFrom(this.apiService.downloadAppunto(note.id));
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
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Impossibile scaricare il file', 'danger');
    }
  }

  async deleteGroupNote(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!note.canDelete) return;

    try {
      await firstValueFrom(this.apiService.deleteAppunto(note.id));
      await this.showToast('Appunto eliminato dal gruppo', 'success');
      await this.reloadNotes();
      await this.reloadGroupDetail();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Impossibile eliminare il file', 'danger');
    }
  }

  toggleBoardComposer(): void {
    this.showBoardComposer = !this.showBoardComposer;
    if (this.showBoardComposer) {
      this.replyTargetId = null;
      this.replyDraft = '';
    } else {
      this.boardDraft = '';
    }
  }

  async submitBoardMessage(): Promise<void> {
    if (!this.selectedGroup?.id || this.sendingBoardMessage) return;
    const text = this.boardDraft.trim();
    if (!text) return;

    this.sendingBoardMessage = true;
    try {
      await firstValueFrom(this.apiService.addGroupMessage(this.selectedGroup.id, text));
      this.boardDraft = '';
      this.showBoardComposer = false;
      await this.reloadMessages();
      await this.reloadGroupDetail();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore invio messaggio', 'danger');
    } finally {
      this.sendingBoardMessage = false;
    }
  }

  openReplyComposer(message: ThreadedBoardMessage): void {
    if (this.replyTargetId === message.id) {
      this.cancelReplyComposer();
      return;
    }

    this.replyTargetId = message.id;
    this.replyDraft = '';
    this.showBoardComposer = false;
    this.boardDraft = '';
  }

  cancelReplyComposer(): void {
    this.replyTargetId = null;
    this.replyDraft = '';
  }

  isReplyComposerOpen(message: ThreadedBoardMessage): boolean {
    return this.replyTargetId === message.id;
  }

  async submitReply(message: ThreadedBoardMessage): Promise<void> {
    if (!this.selectedGroup?.id || this.sendingBoardMessage) return;
    const text = this.replyDraft.trim();
    if (!text) return;

    this.sendingBoardMessage = true;
    try {
      await firstValueFrom(this.apiService.addGroupMessage(this.selectedGroup.id, text, message.id));
      this.replyDraft = '';
      this.replyTargetId = null;
      await this.reloadMessages();
      await this.reloadGroupDetail();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore invio risposta', 'danger');
    } finally {
      this.sendingBoardMessage = false;
    }
  }

  toggleQuestionComposer(): void {
    this.showQuestionComposer = !this.showQuestionComposer;
    if (!this.showQuestionComposer) {
      this.questionDraft = '';
      this.questionSessionDraft = '';
      this.questionYearDraft = '';
    }
  }

  async submitQuestion(): Promise<void> {
    if (!this.selectedGroup?.id || this.savingQuestion) return;
    const question = this.questionDraft.trim();
    if (!question) return;
    const session = this.normalizeQuestionSession(this.questionSessionDraft);
    const year = this.normalizeQuestionYear(this.questionYearDraft);
    const hasAnyMeta = !!this.questionSessionDraft.trim() || !!this.questionYearDraft.trim();
    if (hasAnyMeta && (!session || !year)) {
      await this.showToast(
        `Se specifichi i dettagli d esame, inserisci sia sessione sia anno valido fino al ${this.maxQuestionYear}`,
        'warning'
      );
      return;
    }

    this.savingQuestion = true;
    try {
      await firstValueFrom(this.apiService.addGroupQuestion(this.selectedGroup.id, {
        question,
        session: session || undefined,
        year: year || undefined,
      }));
      this.questionDraft = '';
      this.questionSessionDraft = '';
      this.questionYearDraft = '';
      this.showQuestionComposer = false;
      await this.reloadQuestions();
      await this.reloadGroupDetail();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore inserimento domanda', 'danger');
    } finally {
      this.savingQuestion = false;
    }
  }

  onQuestionYearChange(value: string): void {
    this.questionYearDraft = String(value || '').replace(/\D+/g, '').slice(0, 4);
  }

  daysToExam(value?: string | null): number | null {
    if (!value) return null;
    const examDate = new Date(value);
    if (Number.isNaN(examDate.getTime())) return null;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfExam = new Date(examDate);
    startOfExam.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((startOfExam.getTime() - startOfToday.getTime()) / 86400000);
    return diffDays < 0 ? 0 : diffDays;
  }

  noteBadgeLabel(note: Appunto): string {
    if (note.tipoFile === 'pdf') return 'PDF';
    if (note.tipoFile === 'doc') return 'DOC';
    return 'IMG';
  }

  groupColorClass(group: Gruppo): string {
    return group.colorClass || 'bg-blue';
  }

  openLinkClass(group: Gruppo): string {
    return this.groupColorClass(group).replace('bg-', 'accent-');
  }

  questionSessionLabel(question: GroupQuestion): string {
    const meta = this.resolveQuestionMeta(question);
    if (meta.session && meta.year) return `${meta.session} ${meta.year}`;
    if (meta.session) return meta.session;
    if (meta.year) return meta.year;
    return '';
  }

  noteAuthorLabel(note: Appunto): string {
    if (note.canDelete) return 'Tu';
    return String(note.autoreNome || 'Studente').trim() || 'Studente';
  }

  boardAuthorLabel(message: GroupBoardMessage): string {
    return this.isMyMessage(message) ? 'Tu' : (message.userName || 'Studente');
  }

  replyAuthorLabel(message: ThreadedBoardMessage): string {
    if (message.parentUserId && Number(message.parentUserId) === this.currentUserId) {
      return 'te';
    }
    return String(message.parentUserName || 'utente').trim();
  }

  replyContextText(message: ThreadedBoardMessage): string {
    const text = String(message.parentText || '').trim().replace(/\s+/g, ' ');
    if (!text) return '';
    return text.length > 88 ? `${text.slice(0, 88)}...` : text;
  }

  threadIndentStyle(message: ThreadedBoardMessage): string {
    const depth = Math.max(0, Math.min(message.depth, 3));
    return `${depth * 18}px`;
  }

  boardInitial(message: GroupBoardMessage): string {
    const source = this.boardAuthorLabel(message).trim();
    return source.charAt(0).toUpperCase() || 'S';
  }

  isMyMessage(message: GroupBoardMessage): boolean {
    return Number(message.userId || 0) === this.currentUserId;
  }

  canDeleteBoardMessage(message: GroupBoardMessage): boolean {
    return this.isMyMessage(message);
  }

  async deleteBoardMessage(message: ThreadedBoardMessage, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!this.selectedGroup?.id || !this.canDeleteBoardMessage(message) || this.sendingBoardMessage) return;

    const confirmed = window.confirm('Vuoi eliminare questo messaggio?');
    if (!confirmed) return;

    this.sendingBoardMessage = true;
    try {
      await firstValueFrom(this.apiService.deleteGroupMessage(this.selectedGroup.id, message.id));
      if (this.replyTargetId === message.id) {
        this.cancelReplyComposer();
      }
      await this.reloadMessages();
      await this.reloadGroupDetail();
      await this.showToast('Messaggio eliminato', 'success');
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Impossibile eliminare il messaggio', 'danger');
    } finally {
      this.sendingBoardMessage = false;
    }
  }

  formatBoardTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const sameYear = date.getFullYear() === now.getFullYear();
    const dateLabel = date.toLocaleDateString(
      'it-IT',
      sameYear
        ? { day: '2-digit', month: 'short' }
        : { day: '2-digit', month: 'short', year: 'numeric' }
    );
    const timeLabel = date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${dateLabel} - ${timeLabel}`;
  }

  formatFileSize(sizeBytes?: number): string {
    const size = Number(sizeBytes || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private loadGroups(): void {
    this.loadingList = true;

    this.apiService.getGruppi('all').subscribe({
      next: (rows) => {
        this.gruppi = (rows || []).map((group) => ({
          ...group,
          colorClass: group.colorClass || this.resolveGroupColor(group.materia),
        }));
        this.loadingList = false;
      },
      error: async (err) => {
        this.gruppi = [];
        this.loadingList = false;
        await this.showToast(err?.error?.message || 'Errore caricamento gruppi', 'danger');
      },
    });
  }

  private loadWorkspace(groupId: number): void {
    this.loadingWorkspace = true;

    forkJoin({
      detail: this.apiService.getGroupDetail(groupId).pipe(catchError(() => of(this.selectedGroup as Gruppo))),
      notes: this.apiService.getGroupAppunti(groupId).pipe(catchError(() => of([] as Appunto[]))),
      messages: this.apiService.getGroupMessages(groupId).pipe(catchError(() => of([] as GroupBoardMessage[]))),
      questions: this.apiService.getGroupQuestions(groupId).pipe(catchError(() => of([] as GroupQuestion[]))),
    }).subscribe({
      next: ({ detail, notes, messages, questions }) => {
        this.selectedGroup = {
          ...detail,
          colorClass: detail?.colorClass || this.selectedGroup?.colorClass || 'bg-blue',
        };
        this.groupNotes = [...(notes || [])].sort((a, b) => this.sortByDateDesc(a.createdAt, b.createdAt));
        this.boardMessages = [...(messages || [])];
        this.rebuildBoardThread();
        this.questions = [...(questions || [])].sort((a, b) => this.sortByDateDesc(a.createdAt, b.createdAt));
        this.loadingWorkspace = false;
      },
      error: async (err) => {
        this.loadingWorkspace = false;
        await this.showToast(err?.error?.message || 'Errore apertura gruppo', 'danger');
      },
    });
  }

  private async reloadNotes(): Promise<void> {
    if (!this.selectedGroup?.id) return;
    const rows = await firstValueFrom(this.apiService.getGroupAppunti(this.selectedGroup.id));
    this.groupNotes = [...(rows || [])].sort((a, b) => this.sortByDateDesc(a.createdAt, b.createdAt));
  }

  private async reloadMessages(): Promise<void> {
    if (!this.selectedGroup?.id) return;
    const rows = await firstValueFrom(this.apiService.getGroupMessages(this.selectedGroup.id));
    this.boardMessages = [...(rows || [])];
    this.rebuildBoardThread();
  }

  private async reloadQuestions(): Promise<void> {
    if (!this.selectedGroup?.id) return;
    const rows = await firstValueFrom(this.apiService.getGroupQuestions(this.selectedGroup.id));
    this.questions = [...(rows || [])].sort((a, b) => this.sortByDateDesc(a.createdAt, b.createdAt));
  }

  private async reloadGroupDetail(): Promise<void> {
    if (!this.selectedGroup?.id) return;
    const detail = await firstValueFrom(this.apiService.getGroupDetail(this.selectedGroup.id));
    this.selectedGroup = {
      ...detail,
      colorClass: this.selectedGroup?.colorClass || detail.colorClass || 'bg-blue',
    };
  }

  private sortByDateDesc(a?: string | null, b?: string | null): number {
    return new Date(b || 0).getTime() - new Date(a || 0).getTime();
  }

  private resetWorkspaceForms(): void {
    this.showBoardComposer = false;
    this.showQuestionComposer = false;
    this.boardDraft = '';
    this.replyDraft = '';
    this.replyTargetId = null;
    this.questionDraft = '';
    this.questionSessionDraft = '';
    this.questionYearDraft = '';
    this.resetGroupFileInput();
  }

  private resetGroupFileInput(): void {
    if (this.groupFileInput?.nativeElement) {
      this.groupFileInput.nativeElement.value = '';
    }
  }

  private buildTitleFromFileName(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
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

  private extractFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;

    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }

    const plainMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
    return plainMatch?.[1] || null;
  }

  private buildFallbackFileName(note: Appunto): string {
    const safeTitle = (note.titolo || 'appunto').replace(/[^\w\-]+/g, '_');
    if (note.tipoFile === 'pdf') return `${safeTitle}.pdf`;
    if (note.tipoFile === 'doc') return `${safeTitle}.docx`;
    return `${safeTitle}.png`;
  }

  private resolveGroupColor(materia: string): string {
    const value = (materia || '').toLowerCase();
    if (value.includes('analisi') || value.includes('matematica')) return 'bg-blue';
    if (value.includes('diritto') || value.includes('lettere')) return 'bg-pink';
    if (value.includes('fisica') || value.includes('chimica')) return 'bg-orange';
    if (value.includes('sistemi') || value.includes('informatica')) return 'bg-teal';
    return 'bg-green';
  }

  private readSessionUserId(): number {
    try {
      const raw = localStorage.getItem('user_data');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Number(parsed?.id || 0) || 0;
    } catch {
      return 0;
    }
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  private scrollToTop(duration = 180): void {
    this.content?.scrollToTop(duration).catch(() => undefined);
  }

  private scrollToTopSoon(): void {
    this.scrollToTop(120);
    setTimeout(() => this.scrollToTop(220), 30);
  }

  private normalizeQuestionSession(value: string | null | undefined): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';

    const match = this.questionSessionOptions.find((item) => item.toLowerCase() === raw);
    return match || '';
  }

  private normalizeQuestionYear(value: string | null | undefined): string {
    const raw = String(value || '').replace(/\D+/g, '').slice(0, 4);
    if (raw.length !== 4) return '';

    const year = Number(raw);
    if (!Number.isFinite(year) || year < this.minQuestionYear || year > this.maxQuestionYear) return '';
    return String(year);
  }

  private normalizeLegacyQuestionYear(value: string | null | undefined): string {
    const raw = String(value || '').replace(/\D+/g, '').slice(0, 4);
    if (raw.length !== 4) return '';

    const year = Number(raw);
    const maxYear = new Date().getFullYear();
    if (!Number.isFinite(year) || year < 2000 || year > maxYear) return '';
    return String(year);
  }

  private resolveQuestionMeta(question: Pick<GroupQuestion, 'answer' | 'session' | 'year'>): { session: string; year: string } {
    const session = this.normalizeQuestionSession(question.session);
    const year = this.normalizeQuestionYear(question.year);
    if (session || year) {
      return { session, year };
    }

    return this.parseQuestionMeta(question.answer);
  }

  private parseQuestionMeta(value: string | null | undefined): { session: string; year: string } {
    const answer = String(value || '').trim();
    if (!answer) return { session: '', year: '' };

    const sessionOnly = this.normalizeQuestionSession(answer);
    if (sessionOnly) return { session: sessionOnly, year: '' };

    const lowered = answer.toLowerCase();
    for (const session of this.questionSessionOptions) {
      const sessionKey = session.toLowerCase();
      if (!lowered.startsWith(sessionKey)) continue;

      const rest = answer.slice(session.length).replace(/^[\s,\-–/]+/, '').trim();
      return {
        session,
        year: this.normalizeQuestionYear(rest),
      };
    }

    const legacyYear = this.normalizeLegacyQuestionYear(answer.replace(/^Anno\s+/i, ''));
    if (legacyYear) return { session: '', year: legacyYear };

    return { session: '', year: '' };
  }

  private rebuildBoardThread(): void {
    const rows = [...(this.boardMessages || [])];
    const ids = new Set(rows.map((message) => Number(message.id)));
    const childMap = new Map<number, GroupBoardMessage[]>();
    const roots: GroupBoardMessage[] = [];

    rows.forEach((message) => {
      const parentId = Number(message.parentMessageId || 0) || null;
      if (parentId && ids.has(parentId)) {
        const bucket = childMap.get(parentId) || [];
        bucket.push(message);
        childMap.set(parentId, bucket);
        return;
      }

      roots.push({ ...message, parentMessageId: null });
    });

    const sortAsc = (left: GroupBoardMessage, right: GroupBoardMessage) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    const sortDesc = (left: GroupBoardMessage, right: GroupBoardMessage) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

    childMap.forEach((bucket, key) => {
      childMap.set(key, [...bucket].sort(sortAsc));
    });

    const flattened: ThreadedBoardMessage[] = [];
    const walk = (message: GroupBoardMessage, depth: number, rootId: number) => {
      const children = childMap.get(message.id) || [];
      flattened.push({
        ...message,
        depth,
        rootId,
        childCount: children.length,
      });

      children.forEach((child) => walk(child, Math.min(depth + 1, 3), rootId));
    };

    roots.sort(sortDesc).forEach((root) => walk(root, 0, root.id));
    this.threadedBoardMessages = flattened;

    if (this.replyTargetId && !rows.some((message) => message.id === this.replyTargetId)) {
      this.replyTargetId = null;
      this.replyDraft = '';
    }
  }
}
