import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ActionSheetController, IonContent } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

import { ChatService, Message } from '../../core/services/chat.service';

import { addIcons } from 'ionicons';
import { 
  addCircle, send, camera, image, document, 
  close, arrowBack, ellipsisHorizontal, documentText 
} from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;
  
  newMessage: string = '';
  groupId: number = 0;
  messages: Message[] = [];
  
  private pollingInterval: any;

  constructor(
    private actionSheetCtrl: ActionSheetController,
    private route: ActivatedRoute,
    private chatService: ChatService
  ) {
    addIcons({ 
      'add-circle': addCircle, 
      'send': send, 
      'camera': camera, 
      'image': image, 
      'document': document, 
      'close': close,
      'arrow-back': arrowBack,
      'ellipsis-horizontal': ellipsisHorizontal,
      'document-text': documentText
    });
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam) {
      this.groupId = +idParam; 
      this.loadMessages(true); 
      
      this.startPolling();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }


  loadMessages(isFirstLoad: boolean = false) {
    this.chatService.getMessages(this.groupId).subscribe({
      next: (data) => {
        this.messages = data;
        if (isFirstLoad) {
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: (err) => console.error('Errore caricamento chat:', err)
    });
  }

  startPolling() {
    this.pollingInterval = setInterval(() => {
      this.loadMessages(false); 
    }, 5000); 
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }


  sendMessage() {
    if (!this.newMessage.trim()) return;

    const textToSend = this.newMessage;
    this.newMessage = '';

    this.chatService.sendMessage(this.groupId, textToSend).subscribe({
      next: (savedMsg) => {
        this.messages.push(savedMsg);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Errore invio:', err);
        this.newMessage = textToSend;
        alert('Errore di connessione. Riprova.');
      }
    });
  }

  scrollToBottom() {
    this.content.scrollToBottom(300);
  }


  async presentActionSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Allega file',
      buttons: [
        {
          text: 'Fotocamera',
          icon: 'camera',
          handler: () => { this.handleAttachmentSelection('foto'); }
        },
        {
          text: 'Galleria',
          icon: 'image',
          handler: () => { this.handleAttachmentSelection('gallery'); }
        },
        {
          text: 'Documento',
          icon: 'document',
          handler: () => { this.handleAttachmentSelection('doc'); }
        },
        {
          text: 'Annulla',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  handleAttachmentSelection(type: string) {
    console.log('Utente vuole allegare:', type);
    alert(`Funzione ${type} pronta per essere collegata al plugin nativo!`);
  }
}