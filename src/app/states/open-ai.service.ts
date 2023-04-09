import { Injectable } from '@angular/core';
import { Configuration, Model, OpenAIApi } from 'openai';
import { ConfigService } from '../config.service';
import {
  combineLatest,
  firstValueFrom,
  mergeMap,
  share,
  shareReplay,
} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { Cache } from '../utils/cache';
import { ChatCompletionRequestMessage } from 'openai/api';

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
  error: string | null
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

  private conversation: ChatCompletionRequestMessage[] = [];

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

  async push(deviceName: string, text: string) {
    this.conversation.push({
      content: `${deviceName}: ${text}`,
      name: deviceName,
      role: 'user',
    });
    return await this.prompt();
  }

  async prompt() {
    const state = await firstValueFrom(this.state$);
    if (!state.openai || !state.selectedModel) {
      return;
    }
    const result = await state.openai.createChatCompletion({
      messages: this.conversation,
      model: state.selectedModel.id,
    });
    const responseMessage = result.data.choices[0].message;
    if (!responseMessage) {
      return;
    }

    this.conversation.push({
      content: responseMessage.content,
      role: responseMessage.role,
      name: 'ChanDaLiar',
    });

    return responseMessage.content;
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

    let error = ''
    const models = await this.modalCache.getOrCreate(key, () =>
      this.getModels(openai).catch(err => {
        if (err.message === 'Request failed with status code 401') {
          error = 'Invalid api key or no permission/quota'
        } else {
          error = 'Failed to load OpenAI models';
        }
        return [];
      }),
    );
    const model = models.find((m) => m.id === selectedModel) ?? null;
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
