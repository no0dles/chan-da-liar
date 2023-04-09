import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-open-ai-chat-preview',
  templateUrl: './open-ai-chat-preview.component.html',
  styleUrls: ['./open-ai-chat-preview.component.scss'],
})
export class OpenAiChatPreviewComponent {
  @Input()
  value: string = '';
}
