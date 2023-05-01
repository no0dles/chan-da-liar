import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { PrerecodingLaneComponent } from './components/prerecoding-lane/prerecoding-lane.component';
import { OverrideLaneComponent } from './components/override-lane/override-lane.component';
import { OutputQueueComponent } from './components/output-queue/output-queue.component';
import { MicrophoneLaneComponent } from './components/microphone-lane/microphone-lane.component';
import { ToggleComponent } from './components/toggle/toggle.component';
import { ButtonComponent } from './components/button/button.component';
import { VoiceProcessorComponent } from './components/voice-processor/voice-processor.component';
import { TranscriptComponent } from './components/transcript/transcript.component';
import { ConfigurationSidebarComponent } from './components/configuration-sidebar/configuration-sidebar.component';
import { ConfigurationPrerecordingSidebarComponent } from './components/configuration-prerecording-sidebar/configuration-prerecording-sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BoxContainerComponent } from './components/box-container/box-container.component';
import { ExplainationComponent } from './components/explaination/explaination.component';
import { OutputQueueItemComponent } from './components/output-queue-item/output-queue-item.component';
import { ModalModule } from './modules/modal/modal.module';
import { InputComponent } from './components/input/input.component';
import { TextareaComponent } from './components/textarea/textarea.component';
import { SubheaderComponent } from './components/subheader/subheader.component';
import { FormsModule } from '@angular/forms';
import { ConfigurationOpenaiSidebarComponent } from './components/configuration-openai-sidebar/configuration-openai-sidebar.component';
import { ConfigurationAzureCognitiveSidebarComponent } from './components/configuration-azure-cognitive-sidebar/configuration-azure-cognitive-sidebar.component';
import { ConfigurationDeviceSidebarComponent } from './components/configuration-device-sidebar/configuration-device-sidebar.component';
import { ConfigurationItemComponent } from './components/configuration-item/configuration-item.component';
import { ConfigurationPrerecordingListSidebarComponent } from './components/configuration-prerecording-list-sidebar/configuration-prerecording-list-sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    PrerecodingLaneComponent,
    OverrideLaneComponent,
    OutputQueueComponent,
    MicrophoneLaneComponent,
    ToggleComponent,
    ButtonComponent,
    VoiceProcessorComponent,
    TranscriptComponent,
    ConfigurationSidebarComponent,
    ConfigurationPrerecordingSidebarComponent,
    HeaderComponent,
    BoxContainerComponent,
    ExplainationComponent,
    OutputQueueItemComponent,
    InputComponent,
    TextareaComponent,
    SubheaderComponent,
    ConfigurationOpenaiSidebarComponent,
    ConfigurationAzureCognitiveSidebarComponent,
    ConfigurationDeviceSidebarComponent,
    ConfigurationItemComponent,
    ConfigurationPrerecordingListSidebarComponent,
  ],
  imports: [
    BrowserModule,
    FontAwesomeModule,
    ModalModule.forRoot(),
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
