import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import {
  Appunto,
  GroupBoardMessage,
  GroupQuestion,
  Gruppo,
} from '../../../core/interfaces/models';

interface ThreadReply extends GroupBoardMessage {
  isOwn: boolean;
  authorInitial: string;
}

interface ThreadMessage extends GroupBoardMessage {
  isOwn: boolean;
  authorInitial: string;
  replies: ThreadReply[];
}

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.page.html',
  styleUrls: ['./group-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GroupDetailPage implements OnInit {
  @ViewChild('groupNoteInput') groupNoteInput?: ElementRef<HTMLInputElement>;

  readonly questionSessionOptions = [
    'Sessione invernale',
    'Sessione primaverile',
    'Sessione estiva',
    'Sessione autunnale',
  ];
  readonly minQuestionYear = 2000;
  readonly maxQuestionYear = new Date().getFullYear();
  readonly groupUploadAccept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

  gruppo: Gruppo | null = null;
  appunti: Appunto[] = [];
  messaggi: GroupBoardMessage[] = [];
  domande: GroupQuestion[] = [];
  members: any[] = [];
  showMembers = false;
  isBuddyPro = false;

  threadMessages: ThreadMessage[] = [];

  loading = true;
  loadingMessages = false;
  loadingQuestions = false;
  sendingMessage = false;
  sendingQuestion = false;
  leavingGroup = false;
  deletingMessageId: number | null = null;
  pinningMessageId: number | null = null;
  uploadingGroupNote = false;

  showMessageComposer = false;
  showQuestionComposer = false;

  currentTab: 'appunti' | 'bacheca' | 'domande' = 'appunti';

  boardDraft = '';
  questionDraft = '';
  questionSessionDraft = '';
  questionYearDraft = '';
  replyingTo: GroupBoardMessage | null = null;
  currentUserId = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apiService: ApiService,
    private readonly userService: UserService,
    private readonly toastCtrl: ToastController,
    private readonly alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.currentUserId = this.readSessionUserId();
    this.userService.getProfile().subscribe((profile) => {
      this.isBuddyPro = !!profile?.isSpecialUser;
    });
    const paramId = this.route.snapshot.paramMap.get('id');
    const id = Number(paramId);
    if (Number.isFinite(id) && id > 0) {
      this.loadGroupDetails(id);
    }
  }

  goBack(): void {
    this.router.navigate(['/tabs/groups']);
  }

  toggleMembers(): void {
    this.showMembers = !this.showMembers;
  }

  async confirmLeaveGroup(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Abbandona gruppo',
      message: `Vuoi davvero abbandonare "${this.gruppo?.nome}"? Potrai rientrare in qualsiasi momento.`,
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
        },
        {
          text: 'Abbandona',
          cssClass: 'alert-danger-btn',
          handler: () => {
            this.leaveGroup();
          },
        },
      ],
    });

    await alert.present();
  }

  async leaveGroup(): Promise<void> {
    const groupId = Number(this.gruppo?.id || 0);
    if (!groupId || this.leavingGroup) return;

    try {
      this.leavingGroup = true;
      await firstValueFrom(this.apiService.leaveGroup(groupId));
      await this.presentToast('Hai abbandonato il gruppo', 'success');
      this.router.navigate(['/tabs/groups'], {
        state: {
          leftGroupId: groupId,
          leftGroupAt: Date.now(),
        },
      });
    } catch (err: any) {
      await this.presentToast(
        err?.error?.message || 'Impossibile abbandonare il gruppo',
        'danger'
      );
    } finally {
      this.leavingGroup = false;
    }
  }

  loadGroupDetails(id: number) {
    this.loading = true;
    this.apiService.getGroupDetail(id).subscribe({
      next: (data: Gruppo) => {
        this.gruppo = data;
        this.loadAppunti(id);
        this.loadBacheca(id);
        this.loadDomande(id);
        this.loadMembers(id);
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      },
    });
  }

  loadAppunti(groupId: number) {
    this.apiService.getGroupAppunti(groupId).subscribe({
      next: (res: Appunto[]) => {
        this.appunti = Array.isArray(res) ? res : [];
      },
      error: (err: any) => {
        console.error(err);
        this.appunti = [];
      },
    });
  }

  loadBacheca(groupId: number) {
    this.loadingMessages = true;
    this.apiService.getGroupMessages(groupId).subscribe({
      next: (res: GroupBoardMessage[]) => {
        this.messaggi = Array.isArray(res) ? res : [];
        this.threadMessages = this.buildMessageThreads(this.messaggi);
        this.loadingMessages = false;
      },
      error: (err: any) => {
        console.error(err);
        this.messaggi = [];
        this.threadMessages = [];
        this.loadingMessages = false;
      },
    });
  }

  loadDomande(groupId: number) {
    this.loadingQuestions = true;
    this.apiService.getGroupQuestions(groupId).subscribe({
      next: (res: GroupQuestion[]) => {
        this.domande = Array.isArray(res) ? res : [];
        this.loadingQuestions = false;
      },
      error: (err: any) => {
        console.error(err);
        this.domande = [];
        this.loadingQuestions = false;
      },
    });
  }

  loadMembers(groupId: number) {
    this.apiService.getGroupMembers(groupId).subscribe({
      next: (res: any[]) => {
        this.members = Array.isArray(res) ? res : [];
      },
      error: (err: any) => {
        console.error(err);
        this.members = [];
      },
    });
  }

  scaricaFile(id: number) {
    this.apiService.downloadAppunto(id).subscribe({
      next: (response: any) => {
        const url = window.URL.createObjectURL(new Blob([response.body]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `documento-${id}`;
        link.click();
      },
      error: (err: any) => console.error('Errore download:', err),
    });
  }

  openGroupUploadPicker(): void {
    if (this.uploadingGroupNote || !this.gruppo?.isMember) return;
    this.groupNoteInput?.nativeElement.click();
  }

  async onGroupNoteSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) || null;
    if (!file) return;

    if (!this.isAcceptedGroupFile(file)) {
      await this.presentToast(
        'Formato non supportato. Usa PDF, DOC, DOCX, JPG o PNG',
        'warning'
      );
      if (input) input.value = '';
      return;
    }

    const maxSizeBytes = this.getMaxGroupFileBytes(file);
    if (file.size > maxSizeBytes) {
      await this.presentToast(
        `${this.getGroupUploadTypeLabel(file)} troppo grande. Massimo ${this.formatGroupFileLimit(maxSizeBytes)}`,
        'warning'
      );
      if (input) input.value = '';
      return;
    }

    const defaultTitle = this.buildDefaultFileTitle(file.name);
    const alert = await this.alertCtrl.create({
      header: 'Carica appunto nel gruppo',
      message: 'Scegli un titolo per il file da condividere.',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Titolo appunto',
          value: defaultTitle,
        },
      ],
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
          handler: () => {
            if (input) input.value = '';
          },
        },
        {
          text: 'Carica',
          handler: async (value: { title?: string } | undefined) => {
            const title = String(value?.title || '').trim();
            if (!title) {
              await this.presentToast('Titolo obbligatorio', 'warning');
              if (input) input.value = '';
              return false;
            }

            await this.uploadGroupNote(file, title);
            if (input) input.value = '';
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  setTab(tab: 'appunti' | 'bacheca' | 'domande') {
    this.currentTab = tab;
    if (tab !== 'bacheca') this.closeMessageComposer();
    if (tab !== 'domande') this.closeQuestionComposer();
  }

  openMessageComposer(): void {
    this.showMessageComposer = true;
  }

  get canPinMessages(): boolean {
    return this.isBuddyPro && !!this.gruppo?.isMember;
  }

  get pinnedMessages(): GroupBoardMessage[] {
    return [...this.messaggi]
      .filter((message) => !!message.isPinned)
      .sort((left, right) => {
        const leftTime = new Date(left.pinnedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.pinnedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }

  closeMessageComposer(): void {
    if (this.sendingMessage) return;
    this.showMessageComposer = false;
    this.boardDraft = '';
    this.replyingTo = null;
  }

  startReply(message: GroupBoardMessage): void {
    this.replyingTo = message;
    this.showMessageComposer = true;
  }

  cancelReply(): void {
    if (this.sendingMessage) return;
    this.replyingTo = null;
  }

  async submitMessage(): Promise<void> {
    const groupId = Number(this.gruppo?.id || 0);
    const text = this.boardDraft.trim();
    if (!groupId || !text || this.sendingMessage) return;

    try {
      this.sendingMessage = true;
      await firstValueFrom(
        this.apiService.addGroupMessage(groupId, text, this.replyingTo?.id || null)
      );
      this.boardDraft = '';
      this.replyingTo = null;
      this.showMessageComposer = false;
      this.loadBacheca(groupId);
    } catch (err: any) {
      await this.presentToast(
        err?.error?.message || 'Impossibile pubblicare il messaggio',
        'danger'
      );
    } finally {
      this.sendingMessage = false;
    }
  }

  async deleteMessage(message: GroupBoardMessage): Promise<void> {
    const groupId = Number(this.gruppo?.id || 0);
    if (!groupId || !message?.id || this.deletingMessageId) return;

    const alert = await this.alertCtrl.create({
      header: 'Elimina messaggio',
      message: 'Vuoi eliminare questo messaggio?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
        },
        {
          text: 'Elimina',
          handler: async () => {
            try {
              this.deletingMessageId = message.id;
              await firstValueFrom(
                this.apiService.deleteGroupMessage(groupId, message.id)
              );
              if (this.replyingTo?.id === message.id) {
                this.replyingTo = null;
              }
              await this.presentToast('Messaggio eliminato', 'success');
              this.loadBacheca(groupId);
            } catch (err: any) {
              await this.presentToast(
                err?.error?.message || 'Impossibile eliminare il messaggio',
                'danger'
              );
            } finally {
              this.deletingMessageId = null;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async togglePinned(message: GroupBoardMessage, event?: Event): Promise<void> {
    event?.stopPropagation();
    const groupId = Number(this.gruppo?.id || 0);
    if (!groupId || !message?.id || !this.canPinMessages || this.pinningMessageId) return;

    try {
      this.pinningMessageId = message.id;
      await firstValueFrom(
        this.apiService.setGroupMessagePinned(groupId, message.id, !message.isPinned)
      );
      await this.presentToast(
        message.isPinned ? 'Messaggio rimosso dai pin' : 'Messaggio pinnato',
        'success'
      );
      this.loadBacheca(groupId);
    } catch (err: any) {
      await this.presentToast(
        err?.error?.message || 'Impossibile aggiornare il pin del messaggio',
        'danger'
      );
    } finally {
      this.pinningMessageId = null;
    }
  }

  openQuestionComposer(): void {
    this.showQuestionComposer = true;
  }

  closeQuestionComposer(): void {
    if (this.sendingQuestion) return;
    this.showQuestionComposer = false;
    this.questionDraft = '';
    this.questionSessionDraft = '';
    this.questionYearDraft = '';
  }

  onQuestionYearChange(value: string): void {
    this.questionYearDraft = String(value || '')
      .replace(/\D+/g, '')
      .slice(0, 4);
  }

  async submitQuestion(): Promise<void> {
    const groupId = Number(this.gruppo?.id || 0);
    const question = this.questionDraft.trim();
    const session = this.normalizeQuestionSession(this.questionSessionDraft);
    const year = this.normalizeQuestionYear(this.questionYearDraft);
    const hasAnyMeta =
      !!this.questionSessionDraft.trim() || !!this.questionYearDraft.trim();

    if (!groupId || !question || this.sendingQuestion) return;

    if (hasAnyMeta && (!session || !year)) {
      await this.presentToast(
        `Se indichi la sessione, inserisci anche un anno valido fino al ${this.maxQuestionYear}`,
        'warning'
      );
      return;
    }

    try {
      this.sendingQuestion = true;
      await firstValueFrom(
        this.apiService.addGroupQuestion(groupId, {
          question,
          session: session || undefined,
          year: year || undefined,
        })
      );

      this.showQuestionComposer = false;
      this.questionDraft = '';
      this.questionSessionDraft = '';
      this.questionYearDraft = '';
      this.loadDomande(groupId);
    } catch (err: any) {
      await this.presentToast(
        err?.error?.message || 'Impossibile aggiungere la domanda',
        'danger'
      );
    } finally {
      this.sendingQuestion = false;
    }
  }

  displayMessageAuthor(message: GroupBoardMessage): string {
    return Number(message.userId) === this.currentUserId
      ? 'Tu'
      : message.userName || 'Studente';
  }

  questionMetaLabel(question: GroupQuestion): string {
    const parts = [
      question.session,
      question.year ? `Anno ${question.year}` : '',
    ].filter(Boolean);
    return parts.join(' | ');
  }

  formatExamDateLabel(value?: string | null): string {
    if (!value) return 'Nessuna data esame impostata';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Data esame non valida';

    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  }

  examCountdownLabel(value?: string | null): string {
    if (!value) return '';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((parsed.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) return 'Esame già passato';
    if (diffDays === 0) return 'È oggi!';
    if (diffDays === 1) return 'È domani!';
    return `Mancano ${diffDays} giorni`;
  }

  formatRelativeDate(value?: string | null): string {
    if (!value) return 'adesso';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'adesso';

    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'adesso';
    if (diffHours < 24) return `${diffHours} h fa`;
    if (diffDays === 1) return 'ieri';
    if (diffDays < 7) return `${diffDays} gg fa`;

    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private buildMessageThreads(messages: GroupBoardMessage[]): ThreadMessage[] {
    const sorted = [...messages].sort(
      (left, right) =>
        new Date(left.createdAt || 0).getTime() -
        new Date(right.createdAt || 0).getTime()
    );

    const byId = new Map<number, GroupBoardMessage>();
    sorted.forEach((message) => byId.set(message.id, message));

    const rootMap = new Map<number, ThreadMessage>();
    const roots: ThreadMessage[] = [];

    sorted.forEach((message) => {
      const decorated = {
        ...message,
        isOwn: Number(message.userId) === this.currentUserId,
        authorInitial: this.extractInitial(message.userName),
      };

      const rootId = this.findRootMessageId(message, byId);
      if (rootId === message.id || !rootMap.has(rootId)) {
        const rootMessage: ThreadMessage = {
          ...decorated,
          replies: [],
        };
        rootMap.set(message.id, rootMessage);
        roots.push(rootMessage);
        return;
      }

      rootMap.get(rootId)?.replies.push(decorated);
    });

    roots.sort(
      (left, right) =>
        new Date(right.createdAt || 0).getTime() -
        new Date(left.createdAt || 0).getTime()
    );

    roots.forEach((root) => {
      root.replies.sort(
        (left, right) =>
          new Date(left.createdAt || 0).getTime() -
          new Date(right.createdAt || 0).getTime()
      );
    });

    return roots;
  }

  private findRootMessageId(
    message: GroupBoardMessage,
    byId: Map<number, GroupBoardMessage>
  ): number {
    let current = message;
    while (current.parentMessageId && byId.has(current.parentMessageId)) {
      const parent = byId.get(current.parentMessageId);
      if (!parent) break;
      current = parent;
    }
    return current.id;
  }

  private extractInitial(name?: string | null): string {
    const clean = String(name || '').trim();
    return clean ? clean.charAt(0).toUpperCase() : 'S';
  }

  private async uploadGroupNote(file: File, title: string): Promise<void> {
    const groupId = Number(this.gruppo?.id || 0);
    if (!groupId || this.uploadingGroupNote) return;

    try {
      this.uploadingGroupNote = true;
      const fileData = await this.readFileAsDataUrl(file);

      await firstValueFrom(
        this.apiService.uploadAppunto({
          titolo: title.trim(),
          materia: String(this.gruppo?.materia || '').trim(),
          tipoFile: this.resolveGroupTipoFile(file),
          fileName: file.name,
          mimeType: file.type || undefined,
          sizeBytes: file.size,
          fileData,
          groupId,
        })
      );

      this.loadAppunti(groupId);
      await this.presentToast('Appunto caricato nel gruppo', 'success');
    } catch (err: any) {
      await this.presentToast(
        err?.error?.message || 'Impossibile caricare l appunto nel gruppo',
        'danger'
      );
    } finally {
      this.uploadingGroupNote = false;
    }
  }

  private isAcceptedGroupFile(file: File): boolean {
    const ext = this.getGroupFileExtension(file.name);
    return ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext);
  }

  private resolveGroupTipoFile(file: File): 'pdf' | 'doc' | 'img' {
    const ext = this.getGroupFileExtension(file.name);
    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx') return 'doc';
    return 'img';
  }

  private getMaxGroupFileBytes(file: File): number {
    const ext = this.getGroupFileExtension(file.name);
    if (ext === 'pdf') return 10 * 1024 * 1024;
    if (ext === 'doc' || ext === 'docx') return 8 * 1024 * 1024;
    if (ext === 'jpg' || ext === 'jpeg') return 8 * 1024 * 1024;
    return 4 * 1024 * 1024;
  }

  private getGroupUploadTypeLabel(file: File): string {
    const ext = this.getGroupFileExtension(file.name);
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx') return 'DOC/DOCX';
    if (ext === 'jpg' || ext === 'jpeg') return 'JPG/JPEG';
    return 'PNG';
  }

  private formatGroupFileLimit(sizeBytes: number): string {
    return `${Math.round(sizeBytes / (1024 * 1024))} MB`;
  }

  private getGroupFileExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
  }

  private buildDefaultFileTitle(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Lettura file fallita'));
      reader.readAsDataURL(file);
    });
  }

  private normalizeQuestionSession(value: string | null | undefined): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    const match = this.questionSessionOptions.find(
      (item) => item.toLowerCase() === raw
    );
    return match || '';
  }

  private normalizeQuestionYear(value: string | null | undefined): string {
    const raw = String(value || '')
      .replace(/\D+/g, '')
      .slice(0, 4);
    if (raw.length !== 4) return '';

    const year = Number(raw);
    if (
      !Number.isFinite(year) ||
      year < this.minQuestionYear ||
      year > this.maxQuestionYear
    ) {
      return '';
    }
    return String(year);
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

  private async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
