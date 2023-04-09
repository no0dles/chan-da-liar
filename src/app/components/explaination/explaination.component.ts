import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-explaination',
  templateUrl: './explaination.component.html',
  styleUrls: ['./explaination.component.scss']
})
export class ExplainationComponent {
  @Input()
  heading!: string

  @Input()
  description!: string

}
