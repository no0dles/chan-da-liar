import { Component } from '@angular/core';
import { OpenAiService } from 'src/app/states/open-ai.service';
import { FirebaseService } from 'src/app/states/firebase.service';

@Component({
  selector: 'app-status',
  templateUrl: './app-status.component.html',
  styleUrls: ['./app-status.component.scss'],
})
export class AppStatusComponent {
  cost: string = '?';
  loginState = this.firebase.loginState;
  firebaseState = this.firebase.state$;
  tokens$ = this.openAI.tokens$;

  constructor(private openAI: OpenAiService, private firebase: FirebaseService) {
    this.openAI.totalCost.subscribe((cost) => {
      if (cost !== null) this.cost = cost.toFixed(2);
    });
  }
}
