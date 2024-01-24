import { Injectable } from "@angular/core";
import OpenAI from "openai";
import { Recording } from "./prerecording.service";
import { SpeakResult } from "./azure-cognitive.service";
import { ConfigService } from "../config.service";

@Injectable({
  providedIn: "root"
})
export class ThreadService {
  private threadId: string | null = null;
  private recorder :MediaRecorder | null = null;
  private chunks: Blob[] = [];

  key = this.config.get<string>('openai-api')!;
  openai = new OpenAI({
    apiKey: this.key,
    dangerouslyAllowBrowser: true
  });

  constructor(private config: ConfigService) {
  }

  toggle() {
    if(this.recorder) {
      this.stopRecording()
    } else {
      this.startRecording();
    }
  }

  async startRecording() {
    const stream = await navigator.mediaDevices
      .getUserMedia(
        // constraints - only audio needed for this app
        {
          audio: true,
        },
      );
    console.log('media rec')
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      this.chunks.push(e.data);
      console.log('received chunk')
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(this.chunks, {type: "audio/ogg; codecs=opus"});
      const file = new File([blob], "recorded_audio.ogg",{type:"audio/ogg", lastModified:new Date().getTime()});
      this.chunks = [];

      const formData = new FormData()
      formData.set('language', 'de')
      formData.set('model', 'whisper-1')
      formData.set('response_format', 'text')
      formData.set('file', file)

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        headers: {
          Authorization: `Bearer ${this.key}`,
        },
        method: 'POST',
        body: formData,
      })
      this.sendMessage(await response.text());
    }

    mediaRecorder.start();

    this.recorder = mediaRecorder;
  }

  stopRecording() {
    this.recorder?.stop();
  }


  async sendMessage(content: string) {
    if (!this.threadId) {
      const response = await fetch('https://api.openai.com/v1/threads/runs', {
        headers: {
          Authorization: `Bearer ${this.key}`,
          'OpenAI-Beta': 'assistants=v1',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          assistant_id: "asst_KU6oNjiAE4rUc3hzWjOjfTEb",
          thread: {
            messages: [{
              content,
              role: "user"
            }]
          }
        }),
      });
      const data = await response.json()
      this.threadId = data.thread_id;
      console.log(data);
      this.pollRun(data.thread_id, data.id);
    } else {
      const result = await this.openai.beta.threads.messages.create(this.threadId, {
        content,
        role: "user"
      });
      console.log(result);
    }
  }

  private async pollRun(threadId: string, runId: string) {
    do {
      const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}/steps`, {
        headers: {
          Authorization: `Bearer ${this.key}`,
          'OpenAI-Beta': 'assistants=v1',
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });
      const data = await response.json()
      const messageStep = data.data.filter((d:any) => d.type === 'message_creation' && d.status === 'completed')[0]
      if (messageStep) {
        const messageId = messageStep.step_details.message_creation.message_id;
        this.appendMessage(threadId, runId, messageId)
        return;
      }
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } while (true);
  }

  private async appendMessage(threadId: string, runId: string, messageId: string) {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${this.key}`,
        'OpenAI-Beta': 'assistants=v1',
        'Content-Type': 'application/json',
      },
      method: 'GET',
    });
    const data = await response.json()
    console.log(data);
    for (const content of data.content) {
      if (content.type === 'text') {
        await this.speak({content: content.text.value});
      }
    }
  }


  async speak(rec: Recording) {

    const AudioContext = window.AudioContext;
    const audioContext = new AudioContext({});

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'post',
      headers: new Headers({
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        "model": "tts-1",
        "input": rec.content,
        "voice": "onyx",
        stream: true,
        response_format: 'opus',
      }),
    })
    console.log(response)

    const source = audioContext.createBufferSource();
    source.connect(audioContext.destination);

    const data = await response.arrayBuffer(); //.body!.getReader();
    console.log(data)

    await new Promise<SpeakResult>(resolve => {
      audioContext.decodeAudioData(data, s => {

        source.buffer = s;
        source.start();
        resolve({
          duration: s.duration,
          visums: [],
        })
      }, console.error);
    })
  }
}
