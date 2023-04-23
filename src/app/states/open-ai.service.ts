import { Injectable } from '@angular/core';
import { Configuration, Model, OpenAIApi } from 'openai';
import { ConfigService } from '../config.service';
import {
  combineLatest,
  firstValueFrom,
  mergeMap,
  Observable,
  of,
  share,
  shareReplay,
  take,
} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { Cache } from '../utils/cache';
import { ChatCompletionRequestMessage } from 'openai/api';
import { OngoingRecogniztion } from '../components/microphone-lane/microphone-lane.component';

export interface OpenAISettings {
  apiKey: string;
}

export interface OpenAIState {
  settings: OpenAISettings | null;

  rolePlayScript: string | null;
  openai: OpenAIApi | null;
  models: Model[];
  selectedModel: Model | null;
  ready: boolean;
  error: string | null;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class OpenAiService {
  private configApiKey = 'openai-api';
  private configRolePlayKey = 'openai-roleplay';
  private configModelKey = 'openai-model';

  private modalCache = new Cache<Model[]>();
  private apiCache = new Cache<OpenAIApi>();

  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey),
    this.config.watch<string>(this.configRolePlayKey),
    this.config.watch<string>(this.configModelKey),
  ]).pipe(
    mergeMap(([api, rolePlay, model]) =>
      fromPromise(this.mapState(api, rolePlay, model)),
    ),
    shareReplay(),
  );

  constructor(private config: ConfigService) {}

  async prompt(
    messages: PromptMessage[],
  ): Promise<OngoingRecogniztion | null> {
    const openAiState = await firstValueFrom(this.state$);
    if (!openAiState.settings || !openAiState.selectedModel) {
      return null;
    }

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions', {
        method: 'post',
        headers: new Headers({
          // https://platform.openai.com/account/usage
          'Authorization': `Bearer ${openAiState.settings.apiKey}`,
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          model: openAiState.selectedModel,
          messages: messages,
          stream: true,
        }),
      });
    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (!reader) {
      return null;
    }
    let content = '';
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      for (const line of value.split(/\n\n/g)) {
        console.log(line)
        if (!line.startsWith('data: ')) continue;
        const data = line.replace(/^data: /, '');
        if (data !== '[DONE]') {
          const d = JSON.parse(data);
          const delta = d.choices[0].delta.content;
          if (delta) {
            // console.info('chatgpt partial:', Date.now() - t0, delta);
            console.log('delta', delta)
            content += delta;
          }
        }
      }
    }

    return null;
  }

  async getModels(openai: OpenAIApi) {
    const result = await openai.listModels();
    return result.data.data.filter((d) => d.owned_by === 'openai');
  }

  setKey(key: string) {
    this.config.save(this.configApiKey, key);
  }

  setModel(model: string) {
    this.config.save(this.configModelKey, model);
  }

  setRolePlay(script: string) {
    this.config.save(this.configRolePlayKey, script);
  }

  async mapState(
    key: string | null,
    rolePlay: string | null,
    selectedModel: string | null,
  ): Promise<OpenAIState> {
    if (!key) {
      return {
        ready: false,
        models: [],
        selectedModel: null,
        rolePlayScript: null,
        settings: null,
        openai: null,
        error: null,
      };
    }

    const openai = await this.apiCache.getOrCreate(key, () => {
      const configuration = new Configuration({
        apiKey: key,
      });
      return new OpenAIApi(configuration);
    });

    let error = '';
    const models = await this.modalCache.getOrCreate(key, () =>
      this.getModels(openai).catch((err) => {
        if (err.message === 'Request failed with status code 401') {
          error = 'Invalid api key or no permission/quota';
        } else {
          error = 'Failed to load OpenAI models';
        }
        return [];
      }),
    );
    const model = models.find((m) => m.id === selectedModel) ?? null;
    console.log('openai')

    return {
      ready: model !== null,
      selectedModel: model,
      settings: { apiKey: key },
      rolePlayScript: rolePlay,
      openai,
      error,
      models,
    };
  }
}
