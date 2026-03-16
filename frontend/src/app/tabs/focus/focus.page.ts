import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  checkmarkCircle,
  ellipseOutline,
  pauseCircle,
  playCircle,
  refreshOutline,
  addOutline,
  closeOutline,
  trophyOutline,
  flameOutline,
} from 'ionicons/icons';

interface DailyGoal {
  id: string;
  text: string;
  completed: boolean;
  subject?: string;
}

interface StudySession {
  id: string;
  subject: string;
  duration: number;
  completedAt: Date;
}

type TimerState = 'idle' | 'running' | 'paused' | 'break';

@Component({
  selector: 'app-focus',
  templateUrl: './focus.page.html',
  styleUrls: ['./focus.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],  // ← FormsModule!
})
export class FocusPage implements OnInit, OnDestroy {
  // === TIMER ===
  timerState: TimerState = 'idle';
  pomodoroMinutes = 25;
  breakMinutes = 5;
  timeLeft = 25 * 60;
  totalTime = 25 * 60;
  completedPomodoros = 0;
  currentSessionSubject = '';

  // === GOALS ===
  goals: DailyGoal[] = [];
  showAddGoal = false;
  newGoalText = '';
  newGoalSubject = '';

  // === SESSIONS ===
  todaySessions: StudySession[] = [];
  totalStudyMinutes = 0;

  // === PROGRESS ===
  dailyTargetMinutes = 120;

  // === DATE (public per il template!) ===
  todayDateLabel = '';

  private timerInterval: any = null;

  constructor(private readonly router: Router) {
    addIcons({
      'arrow-back': arrowBack,
      'checkmark-circle': checkmarkCircle,
      'ellipse-outline': ellipseOutline,
      'pause-circle': pauseCircle,
      'play-circle': playCircle,
      'refresh-outline': refreshOutline,
      'add-outline': addOutline,
      'close-outline': closeOutline,
      'trophy-outline': trophyOutline,
      'flame-outline': flameOutline,
    });
  }

  ngOnInit(): void {
    this.todayDateLabel = this.formatTodayLabel();
    this.loadGoals();
    this.loadSessions();
    this.loadPomodoros();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // ═══════════════════════════
  //   TIMER
  // ═══════════════════════════

  get timerDisplay(): string {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  get timerProgress(): number {
    if (this.totalTime === 0) return 0;
    return ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
  }

  get timerStrokeDasharray(): string {
    return `${this.timerProgress}, 100`;
  }

  get isBreak(): boolean {
    return this.timerState === 'break';
  }

  startTimer(): void {
    if (this.timerState === 'idle' || this.timerState === 'paused') {
      this.timerState = 'running';
      this.timerInterval = setInterval(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        } else {
          this.onTimerComplete();
        }
      }, 1000);
    }
  }

  pauseTimer(): void {
    this.timerState = 'paused';
    this.clearTimer();
  }

  resetTimer(): void {
    this.clearTimer();
    this.timerState = 'idle';
    this.timeLeft = this.pomodoroMinutes * 60;
    this.totalTime = this.pomodoroMinutes * 60;
  }

  private onTimerComplete(): void {
    this.clearTimer();

    if (this.timerState === 'running') {
      this.completedPomodoros++;
      this.savePomodoros();
      this.addSession(this.pomodoroMinutes);

      this.timerState = 'break';
      this.timeLeft = this.breakMinutes * 60;
      this.totalTime = this.breakMinutes * 60;

      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } else if (this.timerState === 'break') {
      this.timerState = 'idle';
      this.timeLeft = this.pomodoroMinutes * 60;
      this.totalTime = this.pomodoroMinutes * 60;

      if (navigator.vibrate) {
        navigator.vibrate(300);
      }
    }
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ═══════════════════════════
  //   GOALS
  // ═══════════════════════════

  get completedGoals(): number {
    return this.goals.filter((g) => g.completed).length;
  }

  get goalsProgress(): number {
    if (this.goals.length === 0) return 0;
    return Math.round((this.completedGoals / this.goals.length) * 100);
  }

  toggleGoal(goal: DailyGoal): void {
    goal.completed = !goal.completed;
    this.saveGoals();
    this.updateDailyProgress();
  }

  openAddGoal(): void {
    this.showAddGoal = true;
    this.newGoalText = '';
    this.newGoalSubject = '';
  }

  cancelAddGoal(): void {
    this.showAddGoal = false;
  }

  addGoal(): void {
    const text = this.newGoalText.trim();
    if (!text) return;

    this.goals.push({
      id: Date.now().toString(),
      text,
      completed: false,
      subject: this.newGoalSubject.trim() || undefined,
    });

    this.saveGoals();
    this.showAddGoal = false;
    this.newGoalText = '';
    this.newGoalSubject = '';
  }

  removeGoal(goal: DailyGoal): void {
    this.goals = this.goals.filter((g) => g.id !== goal.id);
    this.saveGoals();
    this.updateDailyProgress();
  }

  // ═══════════════════════════
  //   SESSIONS
  // ═══════════════════════════

  get studyProgress(): number {
    return Math.min(
      Math.round((this.totalStudyMinutes / this.dailyTargetMinutes) * 100),
      100
    );
  }

  get studyProgressLabel(): string {
    const hours = Math.floor(this.totalStudyMinutes / 60);
    const mins = this.totalStudyMinutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }

  get targetLabel(): string {
    const hours = Math.floor(this.dailyTargetMinutes / 60);
    return `${hours}h`;
  }

  formatSessionTime(date: Date): string {
    return new Date(date).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  goBack(): void {
    this.router.navigate(['/tabs/home']);
  }

  // ═══════════════════════════
  //   PRIVATE HELPERS
  // ═══════════════════════════

  private addSession(minutes: number): void {
    this.todaySessions.push({
      id: Date.now().toString(),
      subject: this.currentSessionSubject || 'Studio',
      duration: minutes,
      completedAt: new Date(),
    });
    this.totalStudyMinutes += minutes;
    this.saveSessions();
    this.updateDailyProgress();
  }

  private formatTodayLabel(): string {
    const now = new Date();
    const formatted = now.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  private saveGoals(): void {
    localStorage.setItem(
      `focus_goals_${this.getTodayKey()}`,
      JSON.stringify(this.goals)
    );
  }

  private loadGoals(): void {
    const raw = localStorage.getItem(`focus_goals_${this.getTodayKey()}`);
    if (raw) {
      try {
        this.goals = JSON.parse(raw);
      } catch {
        this.goals = [];
      }
    }
  }

  private saveSessions(): void {
    localStorage.setItem(
      `focus_sessions_${this.getTodayKey()}`,
      JSON.stringify(this.todaySessions)
    );
  }

  private loadSessions(): void {
    const raw = localStorage.getItem(`focus_sessions_${this.getTodayKey()}`);
    if (raw) {
      try {
        this.todaySessions = JSON.parse(raw);
        this.totalStudyMinutes = this.todaySessions.reduce(
          (sum, s) => sum + s.duration,
          0
        );
      } catch {
        this.todaySessions = [];
        this.totalStudyMinutes = 0;
      }
    }
  }

  private savePomodoros(): void {
    localStorage.setItem(
      `focus_pomodoros_${this.getTodayKey()}`,
      this.completedPomodoros.toString()
    );
  }

  private loadPomodoros(): void {
    const raw = localStorage.getItem(`focus_pomodoros_${this.getTodayKey()}`);
    this.completedPomodoros = raw ? parseInt(raw, 10) || 0 : 0;
  }

  private updateDailyProgress(): void {
    const goalsPart = this.goalsProgress * 0.5;
    const studyPart = this.studyProgress * 0.5;
    const total = Math.round(goalsPart + studyPart);
    localStorage.setItem('daily_progress', total.toString());
  }
}