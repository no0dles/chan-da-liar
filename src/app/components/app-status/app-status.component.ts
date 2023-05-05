import { Component } from '@angular/core';
import { OpenAiService } from 'src/app/states/open-ai.service';

@Component({
  selector: 'app-status',
  templateUrl: './app-status.component.html',
  styleUrls: ['./app-status.component.scss'],
})
export class AppStatusComponent {
  cost: string = '?';

  constructor(private openAI: OpenAiService) {
    this.openAI.totalCost.subscribe((cost) => {
      if (cost !== null) this.cost = cost.toFixed(2);
    });
  }
}
