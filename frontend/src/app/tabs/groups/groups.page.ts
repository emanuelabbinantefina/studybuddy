import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { GroupQuestion, GroupSession, GroupTopic, Gruppo } from '../../core/interfaces/models';
import { NewGroupModalComponent } from './new-group-modal/new-group-modal.component';

type GroupsFilter = 'all' | 'my' | 'public';
type GroupTab = 'programma' | 'sessioni' | 'domande';

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GroupsPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content?: IonContent;

  query = '';
  activeFilter: GroupsFilter = 'all';
  loadingList = false;
  loadingWorkspace = false;

  gruppi: Gruppo[] = [];
  selectedGroup: Gruppo | null = null;
  activeTab: GroupTab = 'programma';

  topics: GroupTopic[] = [];
  sessions: GroupSession[] = [];
  questions: GroupQuestion[] = [];

  newTopicTitle = '';
  newSessionTitle = '';
  newSessionDate = '';
  newSessionNotes = '';
  newQuestionText = '';
  newQuestionAnswer = '';

  savingTopic = false;
  savingSession = false;
  savingQuestion = false;

  private currentUserId = 0;

  constructor(
    private modalCtrl: ModalController,
    private apiService: ApiService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.currentUserId = this.readSessionUserId();
    this.loadGroups();
  }

  ionViewWillEnter() {
    if (!this.selectedGroup) {
      this.loadGroups();
    }
  }

  setFilter(filter: GroupsFilter) {
    this.activeFilter = filter;
    this.loadGroups();
  }

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.query = target?.value || '';
    this.loadGroups();
  }

  async onCreateGroup() {
    const modal = await this.modalCtrl.create({
      component: NewGroupModalComponent,
      breakpoints: [0, 0.94],
      initialBreakpoint: 0.94,
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.loadGroups();
    }
  }

  async openGroup(group: Gruppo) {
    if (!group.isMember) {
      try {
        await firstValueFrom(this.apiService.joinPublicGroup(group.id));
      } catch (err: any) {
        await this.showToast(err?.error?.message || 'Impossibile entrare nel gruppo', 'danger');
        return;
      }
    }

    this.selectedGroup = group;
    this.activeTab = 'programma';
    this.newTopicTitle = '';
    this.newSessionTitle = '';
    this.newSessionDate = '';
    this.newSessionNotes = '';
    this.newQuestionText = '';
    this.newQuestionAnswer = '';

    this.scrollToTopSoon();
    this.loadWorkspace(group.id);
  }

  closeGroup() {
    this.selectedGroup = null;
    this.topics = [];
    this.sessions = [];
    this.questions = [];
    this.scrollToTopSoon();
    this.loadGroups();
  }

  setTab(tab: GroupTab) {
    this.activeTab = tab;
  }

  isMineTopic(topic: GroupTopic): boolean {
    return Number(topic.assignedUserId || 0) === this.currentUserId;
  }

  canToggleDone(topic: GroupTopic): boolean {
    if (!this.selectedGroup?.isMember) return false;
    if (this.selectedGroup?.currentRole === 'owner') return true;
    return this.isMineTopic(topic);
  }

  async onReserveTopic(topic: GroupTopic) {
    if (!this.selectedGroup?.id) return;

    try {
      if (topic.assignedUserId && !this.isMineTopic(topic)) {
        await this.showToast('Argomento gia prenotato da un altro membro', 'warning');
        return;
      }

      if (this.isMineTopic(topic)) {
        await firstValueFrom(this.apiService.releaseGroupTopic(this.selectedGroup.id, topic.id));
      } else {
        await firstValueFrom(this.apiService.reserveGroupTopic(this.selectedGroup.id, topic.id));
      }

      await this.reloadTopics();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore prenotazione argomento', 'danger');
    }
  }

  async onToggleTopicDone(topic: GroupTopic) {
    if (!this.selectedGroup?.id || !this.canToggleDone(topic)) return;

    try {
      await firstValueFrom(this.apiService.toggleGroupTopicDone(this.selectedGroup.id, topic.id));
      await this.reloadTopics();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore aggiornamento argomento', 'danger');
    }
  }

  async onAddTopic() {
    if (!this.selectedGroup?.id || this.savingTopic) return;
    const title = this.newTopicTitle.trim();
    if (!title) return;

    this.savingTopic = true;
    try {
      await firstValueFrom(this.apiService.addGroupTopic(this.selectedGroup.id, title));
      this.newTopicTitle = '';
      await this.reloadTopics();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore aggiunta argomento', 'danger');
    } finally {
      this.savingTopic = false;
    }
  }

  async onAddSession() {
    if (!this.selectedGroup?.id || this.savingSession) return;
    const title = this.newSessionTitle.trim();
    if (!title) return;

    this.savingSession = true;
    try {
      await firstValueFrom(this.apiService.addGroupSession(this.selectedGroup.id, {
        title,
        startsAt: this.newSessionDate || undefined,
        notes: this.newSessionNotes.trim() || undefined,
      }));
      this.newSessionTitle = '';
      this.newSessionDate = '';
      this.newSessionNotes = '';
      this.reloadSessions();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore creazione sessione', 'danger');
    } finally {
      this.savingSession = false;
    }
  }

  async onAddQuestion() {
    if (!this.selectedGroup?.id || this.savingQuestion) return;
    const question = this.newQuestionText.trim();
    if (!question) return;

    this.savingQuestion = true;
    try {
      await firstValueFrom(this.apiService.addGroupQuestion(this.selectedGroup.id, {
        question,
        answer: this.newQuestionAnswer.trim() || undefined,
      }));
      this.newQuestionText = '';
      this.newQuestionAnswer = '';
      this.reloadQuestions();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore inserimento domanda', 'danger');
    } finally {
      this.savingQuestion = false;
    }
  }

  formatDateLabel(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTimeLabel(value?: string | null): string {
    if (!value) return 'Da pianificare';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private loadGroups() {
    if (this.activeFilter !== 'all') {
      this.loadingList = false;
      this.gruppi = [];
      return;
    }

    this.loadingList = true;

    this.apiService.getGruppi('all', this.query).subscribe({
      next: (rows) => {
        const mapped = (rows || []).map((g) => ({
          ...g,
          colorClass: g.colorClass || this.resolveGroupColor(g.materia),
        }));

        this.gruppi = mapped;
        this.loadingList = false;
      },
      error: async (err) => {
        this.loadingList = false;
        this.gruppi = [];
        await this.showToast(err?.error?.message || 'Errore caricamento gruppi', 'danger');
      },
    });
  }

  private loadWorkspace(groupId: number) {
    this.loadingWorkspace = true;

    forkJoin({
      detail: this.apiService.getGroupDetail(groupId).pipe(catchError(() => of(this.selectedGroup as Gruppo))),
      topics: this.apiService.getGroupTopics(groupId).pipe(catchError(() => of([] as GroupTopic[]))),
      sessions: this.apiService.getGroupSessions(groupId).pipe(catchError(() => of([] as GroupSession[]))),
      questions: this.apiService.getGroupQuestions(groupId).pipe(catchError(() => of([] as GroupQuestion[]))),
    }).subscribe({
      next: ({ detail, topics, sessions, questions }) => {
        this.selectedGroup = {
          ...detail,
          colorClass: detail?.colorClass || this.selectedGroup?.colorClass || 'bg-blue',
        };
        this.topics = topics;
        this.sessions = sessions;
        this.questions = questions;
        this.loadingWorkspace = false;
      },
      error: async (err) => {
        this.loadingWorkspace = false;
        await this.showToast(err?.error?.message || 'Errore apertura gruppo', 'danger');
      },
    });
  }

  private reloadTopics() {
    if (!this.selectedGroup?.id) return Promise.resolve();
    return firstValueFrom(this.apiService.getGroupTopics(this.selectedGroup.id)).then((rows) => {
      this.topics = rows || [];
      return firstValueFrom(this.apiService.getGroupDetail(this.selectedGroup!.id)).then((detail) => {
        this.selectedGroup = { ...detail, colorClass: this.selectedGroup?.colorClass || detail.colorClass };
      });
    });
  }

  private reloadSessions() {
    if (!this.selectedGroup?.id) return;
    this.apiService.getGroupSessions(this.selectedGroup.id).subscribe({
      next: (rows) => (this.sessions = rows || []),
    });
  }

  private reloadQuestions() {
    if (!this.selectedGroup?.id) return;
    this.apiService.getGroupQuestions(this.selectedGroup.id).subscribe({
      next: (rows) => (this.questions = rows || []),
    });
  }

  private resolveGroupColor(materia: string): string {
    const value = (materia || '').toLowerCase();
    if (value.includes('analisi') || value.includes('matematica')) return 'bg-blue';
    if (value.includes('diritto') || value.includes('lettere')) return 'bg-pink';
    if (value.includes('sistemi') || value.includes('informatica')) return 'bg-teal';
    if (value.includes('economia')) return 'bg-orange';
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

  private async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  private scrollToTop(duration = 180) {
    this.content
      ?.scrollToTop(duration)
      .catch(() => undefined);
  }

  private scrollToTopSoon() {
    this.scrollToTop(120);
    setTimeout(() => this.scrollToTop(220), 30);
  }
}
