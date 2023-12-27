import { Component } from '@angular/core';
import { OpenAiService } from 'src/app/states/open-ai.service';
import { FirebaseService } from 'src/app/states/firebase.service';
import { ConversationService } from 'src/app/states/conversation.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-status',
  templateUrl: './app-status.component.html',
  styleUrls: ['./app-status.component.scss'],
})
export class AppStatusComponent {
  loginState = this.firebase.loginState;
  firebaseState = this.firebase.state$;
  tokens$ = this.conversation.tokens$;
  cost$ = this.openAI.totalCost.pipe(map(cost => cost ? cost.toFixed(2) : '?'));

  constructor(
    private openAI: OpenAiService,
    private firebase: FirebaseService,
    private conversation: ConversationService) {
  }
}
