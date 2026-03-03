import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Gruppo, Appunto, Evento } from '../../core/interfaces/models';

@Component({
  selector: 'app-search',
  standalone: true,
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class SearchPage implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  tab: 'notes' | 'groups' | 'exams' = 'notes';
  query = '';
  joiningGroupId: number | null = null;
  downloadingNoteId: number | null = null;
  deletingNoteId: number | null = null;
  showUploadPanel = false;
  uploading = false;
  dragActive = false;
  selectedFile: File | null = null;
  uploadTitle = '';
  uploadSubject = '';

  filteredNotes: Appunto[] = [];
  filteredGroups: Gruppo[] = [];
  filteredExams: Evento[] = [];

  readonly fileAccept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
  readonly uploadExtensions = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'];
  private readonly maxFileBytes = 5 * 1024 * 1024;

  constructor(
    private apiService: ApiService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.eseguiRicerca();
  }

  ionViewWillEnter() {
    this.eseguiRicerca();
  }

  changeTab(t: 'notes' | 'groups' | 'exams') {
    this.tab = t;
    if (t === 'groups') {
      this.query = '';
    }
    if (t !== 'notes') {
      this.showUploadPanel = false;
    }
    this.eseguiRicerca();
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.query = target?.value || '';
    this.eseguiRicerca();
  }

  eseguiRicerca() {
    if (this.tab === 'notes') {
      this.apiService.getAppunti(this.query).subscribe(res => this.filteredNotes = res);
    } 
    else if (this.tab === 'groups') {
      this.apiService.getPublicGroups(this.query).subscribe({
        next: (res) => {
          this.filteredGroups = res;
        },
        error: async (err) => {
          this.filteredGroups = [];
          const toast = await this.toastCtrl.create({
            message: 'Sessione scaduta o errore nel caricamento gruppi',
            duration: 1800,
            color: 'warning',
            position: 'bottom'
          });
          await toast.present();
          console.error('Errore gruppi pubblici', err);
        }
      });
    }
    // exams: al momento non collegati
  }

  async joinGroup(group: Gruppo) {
    if (group.isMember || this.joiningGroupId) return;

    this.joiningGroupId = group.id;
    this.apiService.joinPublicGroup(group.id).subscribe({
      next: async () => {
        this.filteredGroups = this.filteredGroups.filter(g => g.id !== group.id);

        const toast = await this.toastCtrl.create({
          message: `Entrato in "${group.nome}"`,
          duration: 1400,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
        this.joiningGroupId = null;
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({
          message: err?.error?.message || 'Impossibile unirsi al gruppo',
          duration: 1800,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
        this.joiningGroupId = null;
      }
    });
  }
  
  getIconColor(tipo: string): string {
    if (tipo === 'pdf') return 'red-pdf';
    return 'bg-blue';
  }

  toggleUploadPanel(): void {
    this.showUploadPanel = !this.showUploadPanel;
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
    this.selectedFile = null;
    this.uploadTitle = '';
    this.uploadSubject = '';
    this.dragActive = false;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.showUploadPanel = false;
  }

  async submitUpload(): Promise<void> {
    if (this.uploading) return;
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

      await this.showToast('Appunto caricato con successo', 'success');
      this.resetUploadForm();
      this.query = '';
      this.eseguiRicerca();
    } catch (err: any) {
      const message = err?.error?.message || 'Errore durante il caricamento appunto';
      await this.showToast(message, 'danger');
    } finally {
      this.uploading = false;
    }
  }

  formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async downloadNote(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.downloadingNoteId) return;

    try {
      this.downloadingNoteId = note.id;
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
      const message = err?.error?.message || 'Impossibile scaricare il file';
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
      this.eseguiRicerca();
    } catch (err: any) {
      const message = err?.error?.message || 'Impossibile eliminare appunto';
      await this.showToast(message, 'danger');
    } finally {
      this.deletingNoteId = null;
    }
  }

  private handleSelectedFile(file: File): void {
    if (!this.isAcceptedFile(file)) {
      void this.showToast('Formato non supportato. Usa PDF, DOC, DOCX, JPG o PNG', 'warning');
      return;
    }
    if (file.size > this.maxFileBytes) {
      void this.showToast('File troppo grande. Massimo 5MB', 'warning');
      return;
    }

    this.selectedFile = file;
    this.showUploadPanel = true;

    if (!this.uploadTitle) {
      const dotIndex = file.name.lastIndexOf('.');
      this.uploadTitle = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
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

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1700,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
