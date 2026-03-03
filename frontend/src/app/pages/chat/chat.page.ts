import { Component, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, IonContent, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircle, arrowBack, ellipsisHorizontal, send } from 'ionicons/icons';
import { ChatService, GroupMessage } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content?: IonContent;

  newMessage = '';
  groupId = 0;
  groupName = 'Gruppo';
  groupColorClass = 'bg-blue';
  currentUserId = 0;
  messages: GroupMessage[] = [];
  sending = false;

  private pollingInterval: any;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      'add-circle': addCircle,
      'send': send,
      'arrow-back': arrowBack,
      'ellipsis-horizontal': ellipsisHorizontal
    });
  }

  ngOnInit() {
    this.currentUserId = Number(this.readSessionUserId() || 0);

    const idParam = this.route.snapshot.paramMap.get('id');
    const nameParam = this.route.snapshot.queryParamMap.get('nome');
    const colorParam = this.route.snapshot.queryParamMap.get('colorClass');

    if (nameParam) this.groupName = nameParam;
    if (colorParam) this.groupColorClass = this.normalizeColorClass(colorParam);

    if (!idParam) return;
    this.groupId = Number(idParam);
    if (!nameParam) this.groupName = `Gruppo ${this.groupId}`;

    this.loadMessages(true);
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  loadMessages(isFirstLoad = false) {
    this.chatService.getMessages(this.groupId).subscribe({
      next: (data) => {
        this.messages = [...data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        if (isFirstLoad) {
          setTimeout(() => this.scrollToBottom(), 80);
        }
      },
      error: async (err) => {
        const code = err?.status;
        const message = code === 403
          ? 'Devi unirti al gruppo prima di leggere la chat'
          : 'Errore caricamento chat';
        const toast = await this.toastCtrl.create({
          message,
          duration: 1800,
          color: 'warning',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  sendMessage() {
    const textToSend = this.newMessage.trim();
    if (!textToSend || this.sending) return;

    this.sending = true;
    this.newMessage = '';

    this.chatService.sendMessage(this.groupId, textToSend).subscribe({
      next: () => {
        this.sending = false;
        this.loadMessages(false);
        setTimeout(() => this.scrollToBottom(), 80);
      },
      error: async (err) => {
        this.sending = false;
        this.newMessage = textToSend;
        const toast = await this.toastCtrl.create({
          message: err?.error?.message || 'Errore invio messaggio',
          duration: 1800,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  isMine(message: GroupMessage): boolean {
    return Number(message.userId) === this.currentUserId;
  }

  senderInitial(message: GroupMessage): string {
    const source = (message.userName || 'U').trim();
    return source.charAt(0).toUpperCase();
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private startPolling() {
    this.pollingInterval = setInterval(() => {
      this.loadMessages(false);
    }, 3000);
  }

  private stopPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  private scrollToBottom() {
    this.content?.scrollToBottom(250);
  }

  private readSessionUserId(): number | null {
    try {
      const raw = localStorage.getItem('user_data');
      if (!raw) return null;
      const session = JSON.parse(raw);
      return Number(session?.id || 0) || null;
    } catch {
      return null;
    }
  }

  private normalizeColorClass(colorClass: string): string {
    const allowed = new Set(['bg-blue', 'bg-orange', 'bg-green', 'bg-purple']);
    return allowed.has(colorClass) ? colorClass : 'bg-blue';
  }
}
