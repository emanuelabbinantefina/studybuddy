import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { UserProfile } from '../../core/interfaces/models';
import { ProfileEditorComponent } from '../../shared/profile-editor/profile-editor.component';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  imports: [IonicModule, CommonModule, ProfileEditorComponent]
})
export class CompleteProfilePage {
  constructor(private readonly navCtrl: NavController) {}

  onSaved(_profile: UserProfile): void {
    this.navCtrl.navigateRoot('/tabs/home');
  }
}
