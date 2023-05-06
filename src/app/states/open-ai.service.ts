import { Injectable } from '@angular/core';
import { Configuration, Model, OpenAIApi } from 'openai';
import { ConfigService } from '../config.service';
import {
  combineLatest,
  first,
  firstValueFrom,
  lastValueFrom,
  mergeMap,
  shareReplay,
} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { Cache } from '../utils/cache';
import {
  createOngoingRecognizer,
  OngoingRecognition,
} from './ongoing-recognizer';
import { FirebaseService, LoginState } from './firebase.service';

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
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class OpenAiService {
  private configApiKey = 'openai-api';
  private configRolePlayKey = 'openai-roleplay';
  private configModelKey = 'openai-model';
  private totalCostKey = 'openai-total-cost';

  private modalCache = new Cache<Model[]>();
  private apiCache = new Cache<OpenAIApi>();

  totalCost = this.config.watch<number>(this.totalCostKey, 0);

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

  constructor(private config: ConfigService, private firebase: FirebaseService) {
    this.firebase.loginState.subscribe(async (loginState: LoginState) => {
      if (loginState === 'success') {
        const firebaseTotalCost = await this.firebase.getTotalCost();
        const totalCost = this.config.get<number>(this.totalCostKey) ?? 0;
        if (firebaseTotalCost) {
          this.config.save(
            this.totalCostKey,
            Math.max(totalCost, firebaseTotalCost));
        }
      }
    })
  }

  async prompt(messages: PromptMessage[]): Promise<OngoingRecognition> {
    const recognizer = createOngoingRecognizer({
      role: 'assistant',
      textPrefix: undefined,
    });

    const openAiState = await firstValueFrom(this.state$);
    if (!openAiState.settings || !openAiState.selectedModel) {
      console.warn('no model/apiKey');
      recognizer.complete();
      return recognizer.recogniztion();
    }

    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post',
      headers: new Headers({
        // https://platform.openai.com/account/usage
        Authorization: `Bearer ${openAiState.settings.apiKey}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        model: openAiState.selectedModel.id,
        messages: messages,
        stream: true,
      }),
    }).then(async (response) => {
      if (!response.body) {
        console.warn('empty body');
        recognizer.complete();
        return;
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      if (!reader) {
        console.warn('empty reader');
        recognizer.complete();
        return;
      }

      let done = false;

      do {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of value.split(/\n\n/g)) {
          if (!line.startsWith('data: ')) continue;
          const data = line.replace(/^data: /, '');
          if (data !== '[DONE]') {
            const d = JSON.parse(data);
            const delta = d.choices[0].delta.content;
            if (delta) {
              recognizer.append(delta);
            }
          }
        }
      } while (!done);

      recognizer.complete();

      const completion = await firstValueFrom(recognizer.recogniztion().text$);
      const oldCost = this.config.get<number>(this.totalCostKey) ?? 0;
      const cost = await this.getCost(JSON.stringify(messages), completion);
      this.firebase.addCost(cost, 'openai');
      this.config.save(this.totalCostKey, oldCost + cost);
    });

    return recognizer.recogniztion();
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

  async getCost(prompt: string, completion: string): Promise<number> {
    const promptWords = prompt.split(/\s+/g).length;
    const completionWords = completion.split(/\s+/g).length;
    // https://openai.com/pricing
    const model = (await firstValueFrom(this.state$)).selectedModel?.id ?? '';
    if (model.startsWith('gpt-4')) {
      return 0.03 * promptWords / 1000 + 0.06 * completionWords / 1000;
    }
    return 0.002 * promptWords / 1000 + 0.002 * completionWords / 1000;
  }

  async mapState(
    key: string | null,
    rolePlay: string | null,
    selectedModel: string | null,
  ): Promise<OpenAIState> {
    console.log('map openai')
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
    console.log('openai');

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
